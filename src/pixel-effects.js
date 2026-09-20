import * as THREE from "three";

// One bounded, reusable cloud of world-space square sparks, shared by combat effects.
export class PixelEffects {
  constructor(scene) {
    this.capacity = 4096;
    this.count = 0;
    this.dropped = 0;
    this.position = new THREE.Vector3();
    this.color = new THREE.Color();
    this.geometry = new THREE.BufferGeometry();
    for (const [name, width] of [['position', 3], ['color', 3], ['sparkSize', 1], ['sparkAlpha', 1], ['sparkStyle', 3]]) {
      this.geometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(this.capacity * width), width).setUsage(THREE.DynamicDrawUsage));
    }
    this.material = new THREE.ShaderMaterial({
      uniforms: { projectionScale: { value: 700 } },
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `
        attribute vec3 color;
        attribute float sparkSize;
        attribute float sparkAlpha;
        attribute vec3 sparkStyle;
        uniform float projectionScale;
        varying vec3 tint;
        varying float opacity;
        varying vec3 style;
        void main() {
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_PointSize = clamp(sparkSize * (1.0 + sparkStyle.x * 1.8) * projectionScale / max(0.1, -p.z), 1.0, 96.0);
          tint = color; opacity = sparkAlpha; style = sparkStyle;
        }`,
      fragmentShader: `
        varying vec3 tint;
        varying float opacity;
        varying vec3 style;
        void main() {
          if (style.x > 0.0) {
            // A hard, stepped pixel core lives inside its own larger luminous envelope.
            // Local halos work even at low quality, without raising global bloom.
            vec2 q = (gl_PointCoord - 0.5) * (1.0 + style.x * 1.8);
            float c = cos(style.z), s = sin(style.z);
            q = mat2(c, -s, s, c) * q;
            q.y *= style.y;
            vec2 pixel = floor(q * 12.0 + 0.5) / 12.0;
            float edge = max(abs(pixel.x), abs(pixel.y));
            float core = edge < 0.17 ? 1.0 : edge < 0.26 ? 0.34 : 0.0;
            float halo = exp(-length(q) * 3.8) * style.x * 0.24;
            float fade = 1.0 - smoothstep(0.38, 0.5, max(abs(gl_PointCoord.x - 0.5), abs(gl_PointCoord.y - 0.5)));
            gl_FragColor = vec4(tint * (1.0 + core * 0.85), opacity * (core + halo) * fade);
            return;
          }
          vec2 d = abs(gl_PointCoord - 0.5);
          float square = max(d.x, d.y);
          float band = square < 0.2 ? 1.0 : square < 0.34 ? 0.32 : 0.075;
          gl_FragColor = vec4(tint * (square < 0.2 ? 1.75 : 1.0), opacity * band);
        }`,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.geometry.setDrawRange(0, 0);
    scene.add(this.points);
    // Coloured chips use alpha blending and two value planes, independent of hot sparks.
    this.fleckGeometry = this.geometry.clone();
    this.fleckMaterial = new THREE.ShaderMaterial({
      uniforms: this.material.uniforms,
      transparent: true, depthWrite: false, depthTest: true,
      blending: THREE.NormalBlending, toneMapped: false,
      vertexShader: this.material.vertexShader,
      fragmentShader: `
        varying vec3 tint;
        varying float opacity;
        varying vec3 style;
        void main() {
          vec2 q = gl_PointCoord - 0.5;
          float c = cos(style.z), s = sin(style.z);
          q = mat2(c, -s, s, c) * q;
          q.y *= max(1.0, style.y);
          q = floor(q * 12.0 + 0.5) / 12.0;
          if (max(abs(q.x), abs(q.y)) > 0.34 || abs(q.x) + abs(q.y) > 0.53) discard;
          float face = q.x + q.y > 0.0 ? 0.95 : 0.48;
          gl_FragColor = vec4(tint * face, opacity);
        }`,
    });
    this.flecks = new THREE.Points(this.fleckGeometry, this.fleckMaterial);
    this.flecks.frustumCulled = false;
    this.flecks.renderOrder = 4;
    scene.add(this.flecks);
    this.beamCapacity = 64;
    this.beamCount = 0;
    this.beamGeometry = new THREE.BufferGeometry();
    for (const [name, width] of [['position', 3], ['beamUv', 2], ['beamState', 3], ['beamStyle', 3], ['beamTint', 3]]) {
      this.beamGeometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(this.beamCapacity * 6 * width), width).setUsage(THREE.DynamicDrawUsage));
    }
    this.beamMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, toneMapped: false,
      vertexShader: `
        attribute vec2 beamUv;
        attribute vec3 beamState;
        attribute vec3 beamStyle;
        attribute vec3 beamTint;
        varying vec2 uvBeam;
        varying vec3 state;
        varying vec3 style;
        varying vec3 tint;
        void main() {
          uvBeam = beamUv; state = beamState; style = beamStyle; tint = beamTint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 uvBeam;
        varying vec3 state;
        varying vec3 style;
        varying vec3 tint;
        void main() {
          // Axial cells travel forward, while stepped edges retain the pixel silhouette.
          float cell = floor((uvBeam.x - state.x * (150.0 + style.x * 100.0 + style.y * 60.0)) / 2.0);
          float flow = 0.5 + 0.5 * sin(cell * 0.73);
          float edge = floor(abs(uvBeam.y) * 24.0) / 24.0;
          float core = 1.0 - step(0.075 + style.x * 0.12 + flow * 0.025, edge);
          float body = 1.0 - step(0.55 + flow * 0.05, edge);
          float halo = pow(max(0.0, 1.0 - abs(uvBeam.y)), 2.0);
          vec3 color = tint * (0.75 + body * 0.35);
          color = mix(color, mix(tint, vec3(1.35), 0.6), core);
          float ripple = 0.9 + 0.1 * sin(cell * (style.y > 0.5 ? 1.2 : 0.3) - state.x * (12.0 + style.z * 8.0));
          float energy = core * (0.72 + style.x * 0.3) + body * (0.075 + flow * 0.055) + halo * (0.14 + style.x * 0.18);
          energy *= (0.8 + style.x * 0.5) * ripple;
          float cap = smoothstep(0.0, 2.0, min(uvBeam.x, state.z - uvBeam.x));
          gl_FragColor = vec4(color, state.y * energy * cap);
        }`,
    });
    this.beamMesh = new THREE.Mesh(this.beamGeometry, this.beamMaterial);
    this.beamMesh.frustumCulled = false;
    this.beamMesh.renderOrder = 3;
    this.beamGeometry.setDrawRange(0, 0);
    scene.add(this.beamMesh);

    // Normal-alpha wave sheets preserve colour and cap overlap brightness; no bloom halo.
    this.waveCapacity = 56;
    this.waveCount = 0;
    this.waveGeometry = new THREE.BufferGeometry();
    for (const [name, width] of [['position', 3], ['waveUv', 2], ['waveState', 3], ['waveTint', 3]]) {
      this.waveGeometry.setAttribute(name, new THREE.BufferAttribute(new Float32Array(this.waveCapacity * 6 * width), width).setUsage(THREE.DynamicDrawUsage));
    }
    this.waveMaterial = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide,
      blending: THREE.NormalBlending, toneMapped: false,
      vertexShader: `
        attribute vec2 waveUv;
        attribute vec3 waveState;
        attribute vec3 waveTint;
        varying vec2 uvWave;
        varying vec3 state;
        varying vec3 tint;
        void main() {
          uvWave = waveUv; state = waveState; tint = waveTint;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        varying vec2 uvWave;
        varying vec3 state;
        varying vec3 tint;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main() {
          // World-anchored coarse cells: tiny stair steps, not a necklace of billboard squares.
          float grid = max(20.0, state.y / 1.25);
          vec2 p = (floor(uvWave * grid) + 0.5) / grid;
          float r = length(p);
          if (r > 1.0) discard;
          float t = state.x;
          float expansion = 1.0 - pow(1.0 - min(t / 0.82, 1.0), 2.5);
          float angle = atan(p.y, p.x);
          float sector = floor((angle + 3.141593) * 5.09296);
          float seed = hash(vec2(sector, state.z));
          float scallop = sin(angle * 9.0 + state.z) * 0.008 + sin(angle * 17.0) * 0.006;
          float front = expansion * (0.985 + scallop);
          float distanceBehind = front - r;
          float width = mix(0.095, 0.028, t) * (0.5 + seed);
          float body = step(0.0, distanceBehind) * (1.0 - smoothstep(0.0, width, distanceBehind));
          float cutout = hash(floor(p * grid / 2.0) + state.z);
          float erosion = smoothstep(0.25, 0.95, t);
          body *= smoothstep(erosion * 0.8, erosion * 0.8 + 0.18, cutout);
          // Broken, darker secondary tongues trail the front at varied depths.
          float wake = max(0.0, 1.0 - abs(distanceBehind - width * 1.7) / (width * 0.65));
          wake *= step(0.6, seed) * step(0.45 + erosion * 0.4, cutout) * 0.18;
          float crest = (1.0 - smoothstep(0.0, 0.012, max(0.0, distanceBehind))) * step(0.0, distanceBehind);
          crest *= step(0.72, seed) * body;
          float fade = (1.0 - smoothstep(0.48, 1.0, t)) * smoothstep(0.0, 0.045, t);
          vec3 color = mix(tint * (0.4 + seed * 0.28), min(vec3(0.8), tint * 0.7 + 0.18), crest);
          float alpha = (body * (0.32 + seed * 0.24) + wake) * fade;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(color, alpha);
        }`,
    });
    this.waveMesh = new THREE.Mesh(this.waveGeometry, this.waveMaterial);
    this.waveMesh.frustumCulled = false;
    this.waveMesh.renderOrder = 3;
    this.waveGeometry.setDrawRange(0, 0);
    scene.add(this.waveMesh);

  }

  begin(height, fov) {
    this.waveCount = 0;
    this.sparkCount = 0;
    this.fleckCount = 0;
    this.beamCount = 0;
    this.count = 0;
    this.dropped = 0;
    this.material.uniforms.projectionScale.value = height / (2 * Math.tan(fov * Math.PI / 360));
  }

  spark(base, position, size, color, alpha = 1, glow = 0, stretch = 1, rotation = 0) {
    this.emit(false, base, position, size, color, alpha, glow, stretch, rotation);
  }

  fleck(base, position, size, color, alpha = 1, glow = 0, stretch = 1, rotation = 0) {
    this.emit(true, base, position, size, color, alpha, 0, stretch, rotation);
  }

  emit(flat, base, position, size, color, alpha, glow, stretch, rotation) {
    if (alpha <= .005) return;
    if (this.count >= this.capacity) { this.dropped += 1; return; }
    this.position.set(...position);
    if (base) this.position.applyMatrix4(base);
    if (![this.position.x, this.position.y, this.position.z, size, alpha, glow, stretch, rotation].every(Number.isFinite)) return;
    const attributes = (flat ? this.fleckGeometry : this.geometry).attributes;
    const index = flat ? this.fleckCount++ : this.sparkCount++;
    this.count += 1;
    this.color.set(color);
    this.position.toArray(attributes.position.array, index * 3);
    this.color.toArray(attributes.color.array, index * 3);
    attributes.sparkSize.array[index] = size;
    attributes.sparkStyle.array.set([glow, stretch, rotation], index * 3);
    attributes.sparkAlpha.array[index] = Math.min(1, alpha);
  }

  beam(a, b, nx, nz, length, age, alpha, source = {}) {
    if (this.beamCount >= this.beamCapacity) { this.dropped += 1; return; }
    // A ribbon in world XZ space: its bright edge matches the collision half-width.
    const attributes = this.beamGeometry.attributes;
    const first = this.beamCount++ * 6;
    const power = Math.min(1, Math.max(0, ((source.damage || 1) - 1) / 4));
    const sweep = source.pattern === "laserSweep" ? 1 : 0;
    const heavy = source.sourceElite || source.sourceBoss || source.bossStage != null ? 1 : 0;
    this.color.set(source.debuff && source.payloadColor ? source.payloadColor : source.color || "#ffe070");
    const corners = [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]];
    for (let index = 0; index < 6; index += 1) {
      const [end, side] = corners[index];
      const p = end ? b : a;
      attributes.position.setXYZ(first + index, p[0] + nx * side * 1.7, p[1], p[2] + nz * side * 1.7);
      attributes.beamUv.setXY(first + index, end * length, side);
      attributes.beamState.setXYZ(first + index, age, alpha, length);
      attributes.beamStyle.setXYZ(first + index, power, sweep, heavy);
      attributes.beamTint.setXYZ(first + index, this.color.r, this.color.g, this.color.b);
    }
  }

  shockwave(base, radius, progress, color, seed) {
    if (this.waveCount >= this.waveCapacity) { this.dropped += 1; return; }
    if (!(radius > 0) || progress >= 1) return;
    const first = this.waveCount++ * 6;
    const attributes = this.waveGeometry.attributes;
    this.color.set(color);
    const corners = [[-1,-1],[1,-1],[1,1],[-1,-1],[1,1],[-1,1]];
    for (let i = 0; i < 6; i += 1) {
      const [x,z] = corners[i];
      this.position.set(x * radius / 21.5, .035, z * radius / 13.3).applyMatrix4(base);
      attributes.position.setXYZ(first+i, this.position.x, this.position.y, this.position.z);
      attributes.waveUv.setXY(first+i, x, z);
      attributes.waveState.setXYZ(first+i, progress, radius, seed);
      attributes.waveTint.setXYZ(first+i, this.color.r, this.color.g, this.color.b);
    }
  }

  end() {
    this.waveGeometry.setDrawRange(0, this.waveCount * 6);
    for (const attribute of Object.values(this.waveGeometry.attributes)) attribute.needsUpdate = true;
    this.beamGeometry.setDrawRange(0, this.beamCount * 6);
    for (const attribute of Object.values(this.beamGeometry.attributes)) attribute.needsUpdate = true;
    this.fleckGeometry.setDrawRange(0, this.fleckCount);
    for (const attribute of Object.values(this.fleckGeometry.attributes)) attribute.needsUpdate = true;
    this.geometry.setDrawRange(0, this.sparkCount);
    for (const attribute of Object.values(this.geometry.attributes)) attribute.needsUpdate = true;
  }
}
