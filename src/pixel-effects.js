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
    for (const [name, width] of [['position', 3], ['color', 3], ['sparkSize', 1], ['sparkAlpha', 1]]) {
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
        uniform float projectionScale;
        varying vec3 tint;
        varying float opacity;
        void main() {
          vec4 p = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * p;
          gl_PointSize = clamp(sparkSize * projectionScale / max(0.1, -p.z), 1.0, 36.0);
          tint = color; opacity = sparkAlpha;
        }`,
      fragmentShader: `
        varying vec3 tint;
        varying float opacity;
        void main() {
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

  spark(base, position, size, color, alpha = 1) {
    if (alpha <= .005) return;
    if (this.count >= this.capacity) { this.dropped += 1; return; }
    this.position.set(...position);
    if (base) this.position.applyMatrix4(base);
    if (![this.position.x, this.position.y, this.position.z, size, alpha].every(Number.isFinite)) return;
    this.color.set(color);
    this.position.toArray(this.geometry.attributes.position.array, this.count * 3);
    this.color.toArray(this.geometry.attributes.color.array, this.count * 3);
    this.geometry.attributes.sparkSize.array[this.count] = size;
    this.geometry.attributes.sparkAlpha.array[this.count++] = alpha;
  }

  end() {
    this.geometry.setDrawRange(0, this.count);
    for (const attribute of Object.values(this.geometry.attributes)) attribute.needsUpdate = true;
  }
}
