import * as THREE from "three";
import { compose, multiply, mixColor, TAU } from "../render-math.js";

export class SpaceScenery {
  constructor(scene, paint) {
    this.scene = scene;
    this.paint = paint;
    this.sceneryPlanets = new Map();
  }

  begin(view) {
    this.time = view.time;
    for (const planet of this.sceneryPlanets.values()) planet.visible = false;
  }

  draw(biome) {
    this.cycle = this.time * TAU / biome.motion.period;
    this.drawDistantCelestial(biome);
    this.drawSpaceEcology(biome);
  }

  // Attached luminous inlays, not independent objects. Smooth, slow pulses use
  // per-instance color in the shared surface batch (no per-frame materials).
  insetLight(base, position, scale, color, offset = 0, rotation = [0, 0, 0]) {
    const charge = (.5 + .5 * Math.cos(this.cycle - offset)) ** 2;
    this.paint.surfaces.solid(base, position, scale, mixColor("#192737", color, .08 + charge * .92), "energy", "plate", rotation);
  }

  createPlanetClouds(biome) {
    // One cached, stepped shell follows the curved surface. Open gaps expose
    // the terrain; differential rotation gives depth without detached debris.
    const source = new THREE.BoxGeometry(1, 1, 1);
    const cube = source.toNonIndexed();
    source.dispose();
    const positions = [], normals = [];
    const step = .105;
    for (let lat = -7; lat <= 7; lat++) for (let lon = 0; lon < 56; lon++) {
      const a = lon / 56 * TAU, b = lat * .1;
      const curl = Math.sin(a * 3 + Math.sin(b * 5) + biome.index) + .55 * Math.sin(a * 7 - b * 4);
      if (curl < .65 || Math.sin(b * 11 + Math.sin(a * 2) * 1.2) < .15) continue;
      const radius = 1.035;
      const center = [Math.cos(a) * Math.cos(b) * radius, Math.sin(b) * radius, Math.sin(a) * Math.cos(b) * radius];
      for (let v = 0; v < cube.attributes.position.count; v++) {
        positions.push(center[0] + cube.attributes.position.getX(v) * step, center[1] + cube.attributes.position.getY(v) * step * .55, center[2] + cube.attributes.position.getZ(v) * step);
        normals.push(cube.attributes.normal.getX(v), cube.attributes.normal.getY(v), cube.attributes.normal.getZ(v));
      }
    }
    cube.dispose();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ color: "#8aabbb", gradientMap: this.paint.gradient, transparent: true, opacity: biome.motion.cloudOpacity, depthWrite: false }));
  }

  voxelRock(base, body, rim, scale = 1) {
    // Interlocking strata have real recesses; smaller pieces share the same silhouette.
    const rock = multiply(base, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    const layers = [[0, -.3, .06, .64, .22, .76], [-.08, -.08, .02, 1.06, .26, .94],
      [.04, .17, -.08, .88, .22, .86], [.15, .35, -.16, .5, .14, .56]];
    for (const [x, y, z, w, h, d] of layers) this.paint.surfaces.solid(rock, [x, y, z], [w, h, d], y > .1 ? rim : body, "shell");
    for (let i = 0; i < 4; i += 1) {
      this.paint.surfaces.solid(rock, [-.35 + i * .2, .24 + i % 2 * .12, .27 - i % 2 * .13], [.16, .14, .22], i % 2 ? body : rim, "shell");
    }
  }

  drawSceneryPlanet(biome, position, radius) {
    // Bake only exposed voxel faces once per biome. This is real, lit 3D geometry,
    // with a fixed cell grid and terrain palette, independent of combat RNG.
    let mesh = this.sceneryPlanets.get(biome.id);
    if (!mesh) {
      const positions = [], normals = [], colors = [];
      const source = new THREE.BoxGeometry(1, 1, 1);
      const cube = source.toNonIndexed();
      source.dispose();
      const n = 9, step = 1 / n;
      const inside = (x, y, z) => x * x + y * y + z * z <= n * n;
      const ocean = new THREE.Color(biome.planet.ocean);
      const land = new THREE.Color(biome.planet.land).lerp(new THREE.Color("#64748c"), biome.hero === "eclipse" ? .08 : .55);
      const cloud = new THREE.Color("#8695a8");
      const tint = new THREE.Color();
      const seed = biome.index * .71;
      for (let x = -n; x <= n; x++) for (let y = -n; y <= n; y++) for (let z = -n; z <= n; z++) {
        if (!inside(x, y, z)) continue;
        const terrain = Math.sin(x * .51 + seed) + Math.cos(z * .62 - y * .35) + Math.sin(y * .81 + z * .3);
        const band = Math.sin(y * .82 + x * .18 + seed);
        tint.copy(terrain > .42 ? land : ocean);
        if (biome.hero !== "eclipse" && band > .91 && terrain > -.2) tint.lerp(cloud, .5);
        if (biome.hero !== "eclipse" && Math.abs(y) > 7) tint.lerp(cloud, .5);
        // Painted terminator and discrete mineral strata complement actual lighting.
        tint.multiplyScalar((x * -.5 + y * .7 + z * .3 > -1 ? 1.12 : .58) * (1 + ((x + y * 3 + z * 7 + 90) % 5) * .035));
        for (let face = 0; face < 6; face++) {
          const offset = face * 6;
          const nx = cube.attributes.normal.getX(offset), ny = cube.attributes.normal.getY(offset), nz = cube.attributes.normal.getZ(offset);
          if (inside(x + nx, y + ny, z + nz)) continue;
          for (let v = offset; v < offset + 6; v++) {
            positions.push((x + cube.attributes.position.getX(v)) * step,
              (y + cube.attributes.position.getY(v)) * step, (z + cube.attributes.position.getZ(v)) * step);
            normals.push(nx, ny, nz); colors.push(tint.r, tint.g, tint.b);
          }
        }
      }
      cube.dispose();
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeBoundingSphere();
      const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: this.paint.gradient });
      mesh = new THREE.Mesh(geometry, material);
      if (biome.hero !== "eclipse") {
        const clouds = this.createPlanetClouds(biome);
        mesh.add(clouds);
        mesh.userData.clouds = clouds;
      }
      this.sceneryPlanets.set(biome.id, mesh);
      this.scene.add(mesh);
    }
    mesh.visible = true;
    mesh.position.fromArray(position);
    mesh.scale.setScalar(radius);
    mesh.rotation.set(.13, this.time * biome.motion.rotation, -.18);
    if (mesh.userData.clouds) mesh.userData.clouds.rotation.y = this.time * biome.motion.cloudSpin;
  }

  drawOrbitalSalvage(biome) {
    const config = biome.salvage;
    const side = config.side;
    const tint = mixColor(biome.accent, "#71829b", .68);
    // A single off-axis wreck explains scale, never a pair of corridor walls.
    const base = compose([config.position[0], config.position[1], config.position[2] + Math.sin(this.time * .035) * 1.4], [.22, side * .45, side * -.32 + this.time * biome.motion.rotation]);
    const plate = (p, size, color = "#3b4c66", finish = "metal", rotation) => this.paint.surfaces.solid(base, p, size, color, finish, "plate", rotation);
    const radius = config.radius;
    for (let segment = 0; segment < config.segments; segment++) {
      const angle = -.5 + segment * .27;
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      const rot = [0, 0, angle];
      plate([x, y, 0], [.58, .94, .74], "#28384f", "metal", rot);
      plate([x, y, .44], [.72, .79, .18], segment % 3 ? "#52647d" : tint, "ceramic", rot);
      plate([x, y, -.45], [.46, .7, .16], "#66758a", "metal", rot);
      plate([x * .91, y * .91, .55], [.13, .42, .1], tint, "glass", rot);
      this.insetLight(base, [x * .91, y * .91, .62], [.12, .36, .035], biome.accent, segment * .43, rot);
      if (segment % 3 === 0) {
        plate([x, y, .57], [.32, .13, .08], "#b3a386", "ceramic", rot);
        for (let vent = -1; vent <= 1; vent++) plate([x + Math.cos(angle) * vent * .13, y + Math.sin(angle) * vent * .13, .56], [.06, .3, .06], "#25374e", "metal", rot);
      }
    }
    // Broken spoke, inner dock and inset service windows.
    plate([-.9, -.3, 0], [3.1, .42, .56]);
    plate([-2.1, -.3, .38], [1.12, 1.3, .52], "#64748a", "ceramic");
    plate([-2.1, -.3, .68], [.74, .85, .12], "#25354e");
    for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
      this.insetLight(base, [-2.32 + col * .4, -.55 + row * .25, .77], [.18, .08, .06], biome.secondary, row * .7 + col);
    }
    // Hinged panels turn together around their support, with cell lines attached.
    for (const wing of [-1, 1]) {
      plate([-2.25, wing * 2.2, -.22], [.18, 2.9, .18]);
      const hinge = Math.sin(this.cycle * .5 + wing * .4) * biome.motion.panelAngle;
      for (let panel = 0; panel < 3; panel++) {
        const y = wing * (1.3 + panel * .75);
        const panelBase = multiply(base, compose([-2.25, y, -.15], [0, hinge, 0]));
        this.paint.surfaces.solid(panelBase, [0, 0, 0], [1.9, .66, .14], "#354f70", "glass");
        for (let cell = -2; cell <= 2; cell++) this.paint.surfaces.solid(panelBase, [cell * .34, 0, .1], [.05, .62, .04], "#65768c", "metal");
      }
    }
    const spindle = multiply(base, compose([-2.1, -.3, .84], [0, 0, this.cycle * .22]));
    this.paint.surfaces.solid(spindle, [0, 0, 0], [.62, .08, .08], "#829399", "metal");
    const endpoint = [Math.cos(-.5) * radius, Math.sin(-.5) * radius, .55];
    this.paint.pixelEffects.spark(base, endpoint, .16, biome.accent, .5, .8);
  }

  voxelVoidBranch(base, body, vein, tip, scale = 1, handed = 1) {
    this.paint.voxel(base, [0, .86 * scale, 0], [.48 * scale, 1.72 * scale, .52 * scale], body, .24, [0, 0, handed * .16]);
    this.paint.voxel(base, [handed * .64 * scale, 1.32 * scale, 0], [1.12 * scale, .3 * scale, .42 * scale], vein, .34, [0, 0, handed * .48]);
    this.paint.voxel(base, [handed * 1.16 * scale, 1.7 * scale, -.08 * scale], [.38 * scale, .8 * scale, .4 * scale], body, .26, [0, 0, handed * .26]);
    this.paint.voxel(base, [-handed * .46 * scale, .42 * scale, .26 * scale], [.82 * scale, .26 * scale, .46 * scale], "#3a435d", .22, [0, handed * .4, -handed * .3]);
    this.paint.voxel(base, [handed * 1.34 * scale, 2.12 * scale, -.12 * scale], [.24 * scale, .3 * scale, .26 * scale], tip, .76);
  }

  drawSpaceEcology(biome) {
    if (biome.hero === "planet") return;
    const sourceAccent = biome.accent || "#7fffe2";
    const sourceSecondary = biome.secondary || sourceAccent;
    const accent = mixColor(sourceAccent, "#263b55", .46);
    const secondary = mixColor(sourceSecondary, "#35314c", .5);
    const rock = "#31425e";
    const metal = "#586a84";
    const pale = mixColor(sourceAccent, "#d5e4e7", .62);
    const macro = biome.anchor;
    // Discrete collars reveal thickness on the energy machinery without increasing bloom.
    if (["thunderWorks", "voidGarden"].includes(biome.id)) {
      const machine = compose(macro, [Math.PI / 2, -.08, -.16], [biome.heroScale, biome.heroScale, biome.heroScale]);
      const r = biome.id === "thunderWorks" ? 4.72 : 4.12;
      for (let lug = 0; lug < 10; lug++) {
        const a = .3 + lug * .43;
        const joint = multiply(machine, compose([Math.cos(a) * r, 0, Math.sin(a) * r], [0, -a, 0]));
        this.paint.surfaces.solid(joint, [0, 0, 0], [.58, .66, .52], rock, "metal");
        this.paint.surfaces.solid(joint, [.05, .38, 0], [.62, .12, .38], metal, "ceramic");
        this.paint.surfaces.solid(joint, [.05, .46, 0], [.2, .08, .26], accent, "glass");
        for (const end of [-1, 1]) this.paint.surfaces.solid(joint, [end * .21, .48, 0], [.06, .04, .24], "#9c8da8", "metal");
      }
    }

    if (biome.id === "sugarBloom") {
      const ark = compose(macro, [.08, .72 + Math.sin(this.cycle * .5) * biome.motion.rock, -.16 + Math.sin(this.cycle * .5) * .09], [2.2, 2.2, 2.2]);
      const widths = [.35, .7, 1.08, 1.28, 1.3, 1.16, .9, .54, .24];
      // Two tapered shells surround a recessed amber channel: one strong split silhouette.
      for (const side of [-1, 1]) for (let slice = 0; slice < widths.length; slice++) {
        const w = widths[slice], z = -2.4 + slice * .6;
        const x = side * (.19 + w * .5);
        const arch = Math.sin(slice / (widths.length - 1) * Math.PI);
        this.paint.surfaces.solid(ark, [x, arch * .22, z], [w, .48 + arch * .3, .62], "#2d3d54", "shell");
        this.paint.surfaces.solid(ark, [x, .38 + arch * .22, z], [w * .86, .18, .54], slice % 3 === 0 ? "#697582" : "#485970", "metal");
        this.paint.surfaces.solid(ark, [side * (.18 + w), .21 + arch * .25, z], [.1, .18, .5], "#9c8766", "ceramic");
        if (slice > 1 && slice < 7) {
          this.paint.surfaces.solid(ark, [side * .24, .26, z], [.1, .12, .32], "#b59560", "glass");
          this.insetLight(ark, [side * .24, .34, z], [.09, .035, .3], "#dfb67a", slice * .65);
          this.paint.surfaces.solid(ark, [x, .5 + arch * .22, z], [w * .45, .04, .22], "#26384c", "metal");
          this.insetLight(ark, [x, .53 + arch * .22, z], [w * .34, .025, .065], "#80afae", slice * .65 + side * .3);
        }
      }
      for (const z of [-1.8, 1.8]) this.paint.surfaces.solid(ark, [0, -.1, z], [1.65, .24, .24], "#3e4e63", "metal");
      this.paint.surfaces.solid(ark, [0, .02, -.2], [.17, .1, 2.8], "#c69b59", "glass");
      this.paint.pixelEffects.spark(ark, [0, .18, -.65], .16, "#dfb67a", .5, .65);
    } else if (biome.id === "crystalOrchard") {
      const crown = compose(macro, [.12, .22 + Math.sin(this.cycle * .5) * biome.motion.rock, -.18], [biome.heroScale, biome.heroScale, biome.heroScale]);
      this.voxelRock(crown, rock, "#4b5870", 2.65);
      const crownShards = [
        [-2.7, 1.25, .35, .62, 2.5, .62, -.46, secondary],
        [-1.35, 2.05, -.1, .76, 4.1, .72, -.22, "#526a92"],
        [0, 2.65, -.4, .92, 5.3, .84, .06, accent],
        [1.45, 1.9, .05, .7, 3.8, .68, .3, "#5d5478"],
        [2.75, 1.12, .4, .54, 2.24, .56, .5, secondary],
      ];
      for (const [x, y, z, width, height, depth, tilt, color] of crownShards) {
        this.paint.voxel(crown, [x, y, z], [width, height, depth], color, .34, [0, tilt * .42, tilt]);
        const shard = multiply(crown, compose([x, y, z], [0, tilt * .42, tilt]));
        this.paint.surfaces.solid(shard, [-width * .3, 0, depth * .51], [width * .24, height * .84, .1], "#8795a9", "glass");
        for (let facet = 0; facet < 5; facet++) this.insetLight(shard, [-width * .3, (facet / 5 - .4) * height, depth * .58], [width * .3, height * .14, .035], "#a9c6d4", facet * .65 + x * .4);
        for (let band = 0; band < 3; band++) {
          this.paint.surfaces.solid(shard, [0, -height * .35 + band * height * .18, 0], [width * 1.14, .16, depth * 1.14], rock, "metal");
          this.paint.surfaces.solid(shard, [width * .25, -height * .35 + band * height * .18, depth * .61], [.12, .1, .06], pale, "glass");
        }
        this.paint.voxel(crown, [x + Math.sin(tilt) * height * .46, y + height * .52, z - .08], [width * .58, .42, depth * .58], pale, .72, [0, tilt * .42, tilt]);
      }
      this.paint.voxelPolyline(crown, [[-3.65, -.2, .45], [-2.7, .2, .2], [-1.5, -.05, -.05], [0, .35, -.2], [1.5, -.02, 0], [2.75, .25, .22], [3.65, -.16, .5]], .24, "#455a76", .48, .02);
    } else if (biome.id === "auroraFoundry") {
      this.drawOrbitalSalvage(biome);
    } else if (biome.id === "thunderWorks") {
      const coil = compose(macro, [Math.PI / 2, -.08, -.16], [biome.heroScale, biome.heroScale, biome.heroScale]);
      this.paint.voxelRing(coil, 4.72, 0, "#626c80", 26, biome.motion.rotation, .2, .3, .4, .72);
      this.paint.voxelRing(coil, 3.35, 0, accent, 20, -biome.motion.rotation * 1.4, 1.1, .18, .92, .7);
      this.paint.voxel(coil, [0, 0, 0], [1.7, 1.7, 1.8], rock, .3);
      this.paint.voxel(coil, [0, 0, 0], [.58, .58, .62], "#bba465", .52);
      for (let i = 0; i < 14; i++) {
        const a = 1.1 - this.time * biome.motion.rotation * 1.4 + i / 20 * TAU;
        this.insetLight(coil, [Math.cos(a) * 3.35, .12, Math.sin(a) * 3.35], [.12, .04, .55], "#d7bd7c", i * .52, [0, -a, 0]);
      }
      const spark = accent;
      this.paint.voxelPolyline(coil, [[-5.5, -1.9, .3], [-4.1, -.8, .12], [-2.7, -1.35, -.05], [-1.35, -.35, .12], [0, -.8, -.15]], .2, spark, .94, .08);
      this.paint.voxelPolyline(coil, [[.2, .75, -.12], [1.45, 1.55, .12], [2.6, .8, -.08], [3.85, 1.75, .15], [5.25, 1.1, -.12]], .18, accent, .9, .08);
    } else if (biome.id === "eclipseCarnival") {
      const eclipse = compose(biome.planet.position, [.32, .15, -.18]);
      this.paint.voxelRing(eclipse, 7.1, 0, "#a15f72", 48, biome.motion.rotation, .1, .12, .72, .88);
      for (let i = 0; i < 32; i++) {
        const a = .1 + this.time * biome.motion.rotation + i / 32 * TAU;
        const r = 7.15 + Math.sin(a * 3 + this.cycle) * .08;
        this.insetLight(eclipse, [Math.cos(a) * r, .09, Math.sin(a) * r], [.16, .05, .8], "#c18396", a - this.cycle * .3, [0, -a, 0]);
      }
    } else if (biome.id === "prismGrave") {
      const monument = compose(macro, [.08, -.18 + Math.sin(this.cycle * .5) * biome.motion.rock, .14], [biome.heroScale, biome.heroScale, biome.heroScale]);
      this.paint.voxel(monument, [0, 2.25, 0], [1.04, 4.5, 1.02], "#4a4262", .3, [0, .08, .04]);
      for (let mark = 0; mark < 7; mark++) {
        this.paint.surfaces.solid(monument, [0, .55 + mark * .54, .54], [.62, .18, .05], "#263046", "metal");
        this.insetLight(monument, [0, .55 + mark * .54, .58], [.36 + mark % 2 * .12, .08, .025], "#92bcb6", mark * .63);
      }
      this.paint.voxel(monument, [0, 4.72, -.08], [.7, .56, .72], pale, .72, [0, .22, .12]);
      this.paint.voxel(monument, [-2.65, 1.55, .42], [.9, 3.1, .84], "#403c59", .3, [0, -.24, -.32]);
      this.paint.voxel(monument, [2.55, 1.18, -.38], [.82, 2.36, .8], "#594563", .32, [0, .32, .42]);
      this.paint.voxel(monument, [-2.65, 3.32, .35], [.5, .44, .52], secondary, .68, [0, -.2, 0]);
      this.paint.voxel(monument, [2.55, 2.55, -.42], [.46, .38, .48], accent, .72, [0, .28, 0]);
      this.paint.voxelPolyline(monument, [[-4.3, -.15, .5], [-4.15, 1.55, .35], [-3.35, 3.05, .2], [-2.1, 4.15, .05], [-.72, 4.72, -.1]], .34, secondary, .48, .08);
      this.paint.voxelPolyline(monument, [[4.3, -.15, -.5], [4.15, 1.55, -.35], [3.35, 3.05, -.2], [2.1, 4.15, -.05], [.72, 4.72, .1]], .3, "#4d6178", .4, .08);
      this.paint.voxel(monument, [-.36, 4.82, 0], [.34, .26, .42], pale, .72, [0, -.3, .18]);
    } else if (biome.id === "voidGarden") {
      const singularity = compose(macro, [Math.PI / 2, 0, -.14], [biome.heroScale, biome.heroScale, biome.heroScale]);
      this.paint.voxel(singularity, [0, 0, 0], [2.25, 2.25, 2.34], "#17182a", .22);
      for (let rib = 0; rib < 10; rib++) {
        const a = .3 + rib * .43;
        this.insetLight(singularity, [Math.cos(a) * 4.12, .5, Math.sin(a) * 4.12], [.18, .06, .36], "#83b39c", rib * .6, [0, -a, 0]);
      }
      this.paint.voxelRing(singularity, 4.12, 0, "#62456d", 28, biome.motion.rotation, .2, .26, .5, .78);
      this.paint.voxelRing(singularity, 5.18, 0, accent, 30, -biome.motion.rotation * .8, 1.1, .16, .9, .68);
      const garden = compose([macro[0], macro[1] - .5, macro[2] - 1], [0, -.05, -.08]);
      this.paint.voxelPolyline(garden, [[-1.3, .1, .4], [-2.5, 1.15, .15], [-3.7, 1.55, -.2], [-4.7, 2.75, -.4]], .38, "#343853", .36, .1);
      this.paint.voxelPolyline(garden, [[1.15, .2, .3], [2.15, -.55, .05], [3.25, -.15, -.25], [4.35, -1.15, -.5]], .34, secondary, .5, .1);
      this.paint.voxelPolyline(garden, [[-.55, .35, .2], [-.9, 1.65, 0], [-.35, 2.75, -.25], [-.75, 3.85, -.55]], .24, accent, .74, .1);
      for (const side of [-1, 1]) this.voxelVoidBranch(compose([macro[0] + side * 4.25, macro[1] - .5, macro[2] - 1 + side * 1.2], [0, -side * .28, -side * .08]), "#30344e", secondary, pale, 1.6, -side);
    }
  }

  drawDistantCelestial(biome) {
    if (!["planet", "eclipse"].includes(biome.hero)) return;
    this.drawSceneryPlanet(biome, biome.planet.position, biome.planet.radius);
    if (biome.id === "cometTide") {
      const base = compose(biome.planet.position, [.25, .1, -.2]);
      this.paint.voxelRing(base, biome.planet.radius * 1.22, 0, mixColor(biome.secondary, "#3b4b66", .6),
        32, -biome.motion.rotation * .6, .2, .13, .48, .72);
    }
  }

}
