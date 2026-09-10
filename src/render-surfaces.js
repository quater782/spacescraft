import * as THREE from "three";

// Pixel-solid equipment, curved combustion and native GPU lines. No gameplay state here.
const CAPACITY = 1536;
const LINE_VERTICES = 16384;
export class RenderSurfaces {
  constructor(scene) {
    this.scene = scene;
    this.batches = new Map();
    this.time = { value: 0 };
    this.color = new THREE.Color();
    this.matrix = new THREE.Matrix4();
    this.local = new THREE.Matrix4();
    this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.up = new THREE.Vector3(0, 1, 0);
    this.start = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    const plate = new THREE.BoxGeometry(1, 1, 1);
    // A stepped 3D lens: nineteen coarse cells, no smooth sphere or beveled shell.
    const cube = new THREE.BoxGeometry(.32, .32, .32).toNonIndexed();
    const positions = [], normals = [], uvs = [];
    for (let x = -1; x <= 1; x += 1) for (let y = -1; y <= 1; y += 1) for (let z = -1; z <= 1; z += 1) {
      if (Math.abs(x) + Math.abs(y) + Math.abs(z) > 2) continue;
      for (let vertex = 0; vertex < cube.attributes.position.count; vertex += 1) {
        positions.push(cube.attributes.position.getX(vertex) + x * .32, cube.attributes.position.getY(vertex) + y * .32, cube.attributes.position.getZ(vertex) + z * .32);
        normals.push(cube.attributes.normal.getX(vertex), cube.attributes.normal.getY(vertex), cube.attributes.normal.getZ(vertex));
        uvs.push(cube.attributes.uv.getX(vertex), cube.attributes.uv.getY(vertex));
      }
    }
    cube.dispose();
    const lens = new THREE.BufferGeometry();
    lens.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    lens.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    lens.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    const outline = [[-.3, -.5], [.3, -.5], [.3, -.3], [.5, -.3], [.5, .3], [.3, .3], [.3, .5], [-.3, .5], [-.3, .3], [-.5, .3], [-.5, -.3], [-.3, -.3]];
    const ringShape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
    ringShape.holes.push(new THREE.Path(outline.slice().reverse().map(([x, y]) => new THREE.Vector2(x * .6, y * .6))));
    const ring = new THREE.ExtrudeGeometry(ringShape, { depth: .2, bevelEnabled: false, steps: 1 });
    ring.translate(0, 0, -.1);
    const toon = (bands) => {
      const map = new THREE.DataTexture(new Uint8Array(bands), bands.length, 1, THREE.RedFormat);
      map.minFilter = THREE.NearestFilter; map.magFilter = THREE.NearestFilter;
      map.generateMipmaps = false; map.needsUpdate = true;
      return new THREE.MeshToonMaterial({ gradientMap: map });
    };
    const flame = new THREE.LatheGeometry([
      new THREE.Vector2(.18, 0), new THREE.Vector2(.33, .12),
      new THREE.Vector2(.4, .3), new THREE.Vector2(.29, .58),
      new THREE.Vector2(.14, .84), new THREE.Vector2(0, 1),
    ], 12);
    flame.rotateX(Math.PI / 2); // Nozzle at z=0, taper flowing toward +z.
    this.geometry = {
      plate, orb: lens, ring,
      tube: new THREE.CylinderGeometry(.5, .5, 1, 10, 1), flame,
    };
    this.materials = {
      ceramic: toon([82, 158, 230]),
      metal: toon([58, 134, 210]),
      shell: toon([72, 152, 232]),
      glass: toon([46, 106, 218]),
      energy: new THREE.MeshBasicMaterial({ transparent: true, opacity: .72, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      flame: new THREE.ShaderMaterial({
        uniforms: { uTime: this.time }, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
        vertexShader: `
          uniform float uTime;
          varying vec3 vTint;
          varying vec3 vLocal;
          void main() {
            vec3 p = position;
            float phase = instanceMatrix[3].x * 2.7 + instanceMatrix[3].z;
            float wave = sin(p.z * 15.0 - uTime * 19.0 + phase);
            p.x += wave * .12 * p.z * p.z;
            p.y += cos(p.z * 11.0 - uTime * 14.0 + phase) * .075 * p.z;
            p.xy *= 1.0 + wave * .13 * p.z;
            vLocal = position;
            vTint = instanceColor;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vTint;
          varying vec3 vLocal;
          uniform float uTime;
          void main() {
            float z = vLocal.z;
            float ribs = .82 + .18 * sin(z * 35.0 - uTime * 22.0);
            float core = 1.0 - smoothstep(.04, .52, z);
            vec3 tint = mix(vTint, vec3(.8, .92, 1.0), core * .8);
            float alpha = (1.0 - smoothstep(.42, 1.0, z)) * ribs * .65;
            gl_FragColor = vec4(tint * (1.0 + core * .65), alpha);
          }`,
      }),
    };
    // Gentle color fill keeps equipment readable in space without bloom on solid parts.
    for (const finish of ["ceramic", "metal", "shell", "glass"]) {
      this.materials[finish].onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * 0.16;");
      };
      this.materials[finish].customProgramCacheKey = () => "pixel-material-fill-v2";
    }
    this.positions = new Float32Array(LINE_VERTICES * 3);
    this.colors = new Float32Array(LINE_VERTICES * 3);
    this.linesGeometry = new THREE.BufferGeometry();
    this.linesGeometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.linesGeometry.setAttribute("color", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.linesGeometry.setDrawRange(0, 0);
    this.lines = new THREE.LineSegments(this.linesGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .82, depthWrite: false, toneMapped: false }));
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 3;
    scene.add(this.lines);
    this.lineCursor = 0;
  }

  begin(time) {
    this.time.value = time;
    this.lineCursor = 0;
    this.dropped = 0;
    for (const batch of this.batches.values()) { batch.count = 0; batch.userData.cursor = 0; }
  }

  batch(shape, finish) {
    const key = shape + ':' + finish;
    if (!this.batches.has(key)) {
      const mesh = new THREE.InstancedMesh(this.geometry[shape], this.materials[finish], CAPACITY);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.setColorAt(0, this.color.set("#ffffff"));
      mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.userData.cursor = 0;
      this.batches.set(key, mesh);
      this.scene.add(mesh);
    }
    return this.batches.get(key);
  }

  put(shape, finish, matrix, color) {
    const mesh = this.batch(shape, finish);
    const index = mesh.userData.cursor;
    if (index >= CAPACITY) { this.dropped += 1; return; }
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, this.color.set(color));
    mesh.userData.cursor += 1;
  }

  solid(base, position, scale, color, finish = "ceramic", shape = "plate", rotation = [0, 0, 0]) {
    this.rotation.setFromEuler(new THREE.Euler(...rotation));
    const solid = finish !== "flame" && finish !== "energy";
    const pixel = (value) => Math.round(value / .02) * .02;
    const dimensions = solid ? scale.map((value) => Math.max(.04, Math.round(Math.abs(value) / .04) * .04)) : scale;
    this.local.compose(this.position.set(...(solid ? position.map(pixel) : position)), this.rotation, this.scale.set(...dimensions));
    this.matrix.multiplyMatrices(base, this.local);
    this.put(shape, finish, this.matrix, color);
  }

  segment(base, a, b, width, color, finish = "energy") {
    this.start.set(...a); this.direction.set(...b).sub(this.start);
    const length = this.direction.length();
    if (!Number.isFinite(length) || length < .0001) return;
    this.position.copy(this.start).addScaledVector(this.direction, .5);
    this.rotation.setFromUnitVectors(this.up, this.direction.divideScalar(length));
    this.local.compose(this.position, this.rotation, this.scale.set(width, length, width));
    this.matrix.multiplyMatrices(base, this.local);
    this.put("tube", finish, this.matrix, color);
  }

  line(base, a, b, color, brightness = 1) {
    if (![...a, ...b, brightness].every(Number.isFinite)) return;
    if (this.lineCursor + 2 > LINE_VERTICES) { this.dropped += 1; return; }
    this.color.set(color).multiplyScalar(brightness);
    for (const point of [a, b]) {
      this.position.set(...point).applyMatrix4(base);
      if (![this.position.x, this.position.y, this.position.z].every(Number.isFinite)) return;
      this.position.toArray(this.positions, this.lineCursor * 3);
      this.color.toArray(this.colors, this.lineCursor * 3);
      this.lineCursor += 1;
    }
  }

  end() {
    for (const mesh of this.batches.values()) {
      mesh.count = mesh.userData.cursor;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    }
    this.linesGeometry.setDrawRange(0, this.lineCursor);
    this.linesGeometry.attributes.position.needsUpdate = true;
    this.linesGeometry.attributes.color.needsUpdate = true;
  }
}
