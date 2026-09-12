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
  }

  begin(height, fov) {
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

  end() {
    this.geometry.setDrawRange(0, this.count);
    for (const attribute of Object.values(this.geometry.attributes)) attribute.needsUpdate = true;
  }
}
