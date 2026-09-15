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

  }

  begin(height, fov) {
    this.beamCount = 0;
    this.count = 0;
    this.dropped = 0;
    this.material.uniforms.projectionScale.value = height / (2 * Math.tan(fov * Math.PI / 360));
  }

  spark(base, position, size, color, alpha = 1, glow = 0, stretch = 1, rotation = 0) {
    if (alpha <= .005) return;
    if (this.count >= this.capacity) { this.dropped += 1; return; }
    this.position.set(...position);
    if (base) this.position.applyMatrix4(base);
    if (![this.position.x, this.position.y, this.position.z, size, alpha, glow, stretch, rotation].every(Number.isFinite)) return;
    this.color.set(color);
    this.position.toArray(this.geometry.attributes.position.array, this.count * 3);
    this.color.toArray(this.geometry.attributes.color.array, this.count * 3);
    this.geometry.attributes.sparkSize.array[this.count] = size;
    this.geometry.attributes.sparkStyle.array.set([glow, stretch, rotation], this.count * 3);
    this.geometry.attributes.sparkAlpha.array[this.count++] = alpha;
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

  end() {
    this.beamGeometry.setDrawRange(0, this.beamCount * 6);
    for (const attribute of Object.values(this.beamGeometry.attributes)) attribute.needsUpdate = true;
    this.geometry.setDrawRange(0, this.count);
    for (const attribute of Object.values(this.geometry.attributes)) attribute.needsUpdate = true;
  }
}
