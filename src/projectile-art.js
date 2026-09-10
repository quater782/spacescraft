import * as THREE from "three";

// Hand-authored pixel silhouettes, extruded into real 3D cells. Row zero is the nose.
// b = body, d = dark cut/edge, h = inset payload/highlight. No rounded lenses or bloom shells.
const STAMPS = Object.freeze({
  bolt: [".b.", "bhb", ".b.", ".d."],
  phase: [".h.", ".b.", "bhb", "bdb", "b.b", ".d."],
  drone: ["..b..", ".bhb.", "dbbbd", "d.b.d", "..d.."],
  heavy: [".bbb.", "bbhbb", "bbdbb", ".bbb.", ".d.d."],
  seed: ["..b..", ".bbb.", "dbhbd", ".bbb.", "d...d"],
  twin: ["b...b", "hb.bh", "bbdbb", ".bbb.", ".d.d."],
  shard: ["...b.", "..bb.", ".bhb.", "bbbd.", "bdd.."],
  wall: ["bbbbb", "bhhhb", "dbbbd", ".d.d."],
  needle: ["..h..", "..b..", "..b..", ".bhb.", ".bdb.", "dbbbd", "d.b.d", "..d.."],
  orbit: ["..bb.", "d.hb.", "bhbhb", ".bh.d", ".bb.."],
  seeker: ["..b..", ".bhb.", ".bbb.", "bbdbb", "d.b.d", "d...d"],
  seekerSpent: ["..b..", ".bdb.", ".bbb.", ".bdb.", ".dbd.", "..d.."],
  mine: ["d...d", ".bbb.", ".bhb.", ".bbb.", "d...d"],
  mineArmed: ["d...d", ".b.b.", ".hhh.", ".b.b.", "d...d"],
  blast: ["..bbb..", ".bbdbb.", "bbbhbbb", ".bbdbb.", "..bbb.."],
  blastArmed: ["..b.b..", ".bbhbb.", "bbhhhbb", ".bbhbb.", "..b.b.."],
  bloom: ["b...b", "bb.bb", ".bhb.", ".bdb.", "..d.."],
  forge: ["..h..", ".bbb.", "dbbbd", "dbhbd", ".bbb.", ".d.d."],
  void: ["...bb", "b..b.", "bbhbb", ".b..b", "bb..."],
});
const CAPACITY = 512;

export class PixelProjectileArt {
  constructor(scene) {
    this.scene = scene;
    this.batches = new Map();
    this.material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.matrix = new THREE.Matrix4();
    this.rotation = new THREE.Quaternion();
    this.euler = new THREE.Euler();
    this.position = new THREE.Vector3();
    this.scale = new THREE.Vector3();
    this.dropped = 0;
  }

  begin() {
    this.dropped = 0;
    for (const mesh of this.batches.values()) mesh.count = 0;
  }

  batch(shape, palette) {
    const key = shape + ':' + palette.join(':');
    if (this.batches.has(key)) return this.batches.get(key);
    const rows = STAMPS[shape];
    const positions = [], colors = [];
    const swatches = palette.map((color) => new THREE.Color(color));
    // Merge cells once; each subsequent shot is a single instance of the shared mesh.
    const cell = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    const p = cell.attributes.position, n = cell.attributes.normal;
    for (let z = 0; z < rows.length; z += 1) {
      for (let x = 0; x < rows[z].length; x += 1) {
        const ink = rows[z][x];
        if (ink === '.') continue;
        const swatch = swatches[ink === 'h' ? 2 : ink === 'd' ? 1 : 0];
        const thickness = ink === 'h' ? 1.2 : ink === 'd' ? .7 : 1;
        for (let v = 0; v < p.count; v += 1) {
          positions.push(p.getX(v) + x - (rows[z].length - 1) / 2,
            p.getY(v) * thickness + (thickness - 1) / 2,
            p.getZ(v) + (rows.length - 1) / 2 - z);
          const shade = n.getY(v) > 0 ? 1 : n.getY(v) < 0 ? .42 : n.getX(v) < 0 ? .66 : .82;
          colors.push(swatch.r * shade, swatch.g * shade, swatch.b * shade);
        }
      }
    }
    cell.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const mesh = new THREE.InstancedMesh(geometry, this.material, CAPACITY);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.batches.set(key, mesh);
    this.scene.add(mesh);
    return mesh;
  }

  draw(shape, palette, position, angle, unit) {
    const mesh = this.batch(shape, palette);
    if (mesh.count >= CAPACITY) { this.dropped += 1; return; }
    this.rotation.setFromEuler(this.euler.set(0, angle, 0));
    this.matrix.compose(this.position.set(...position), this.rotation, this.scale.setScalar(unit));
    mesh.setMatrixAt(mesh.count++, this.matrix);
  }

  end() {
    for (const mesh of this.batches.values()) mesh.instanceMatrix.needsUpdate = true;
  }
}
