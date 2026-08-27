import * as THREE from "../node_modules/three/build/three.module.min.js";

const TAU = Math.PI * 2;
const MAX_SOLID_VOXELS = 4096;
const MAX_EMISSIVE_PER_COLOR = 512;
const MAX_GLOW_VOXELS = 2048;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;

const compose = (position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], "YXZ"));
  matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale));
  return matrix;
};
const multiply = (base, local) => new THREE.Matrix4().multiplyMatrices(base, local);

class SpaceRenderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.time = 0;
    this.width = 480;
    this.height = 270;
    this.quality = "high";
    this.highContrastBullets = false;
    this.ready = false;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (error) {
      console.error("Three.js renderer unavailable", error);
      return;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.42;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#070817");
    this.scene.fog = new THREE.FogExp2("#070817", .026);
    this.camera = new THREE.PerspectiveCamera(55.4, 16 / 9, .1, 80);

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.solidMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, flatShading: true, roughness: .62, metalness: .24 });
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      transparent: true,
      opacity: .16,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    this.solidBatch = new THREE.InstancedMesh(this.boxGeometry, this.solidMaterial, MAX_SOLID_VOXELS);
    this.glowBatch = new THREE.InstancedMesh(this.boxGeometry, this.glowMaterial, MAX_GLOW_VOXELS);
    this.solidBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.glowBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.solidBatch.frustumCulled = false;
    this.glowBatch.frustumCulled = false;
    this.solidBatch.castShadow = false;
    this.solidBatch.receiveShadow = false;
    this.glowBatch.renderOrder = 4;
    this.scene.add(this.solidBatch, this.glowBatch);
    this.emissiveBatches = new Map();

    this.floor = new THREE.Mesh(new THREE.BoxGeometry(28, .08, 38), new THREE.MeshStandardMaterial({ color: "#111634", roughness: .78, metalness: .18 }));
    this.floor.position.set(0, -.57, -5);
    this.floor.receiveShadow = false;
    this.scene.add(this.floor);
    this.grid = new THREE.GridHelper(38, 26, "#885cff", "#32285e");
    this.grid.position.set(0, -.51, -5);
    this.grid.material.transparent = true;
    this.grid.material.opacity = .55;
    this.grid.material.depthWrite = false;
    this.scene.add(this.grid);

    this.starLayers = [this.createStars(280, .058, 90210), this.createStars(150, .085, 37191)];
    this.starLayers.forEach((stars) => this.scene.add(stars));
    this.hemisphere = new THREE.HemisphereLight("#d8e7ff", "#2d1648", 3.2);
    this.keyLight = new THREE.DirectionalLight("#ffffff", 3.4);
    this.keyLight.position.set(-7, 12, 8);
    this.keyLight.castShadow = false;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.keyLight.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 42 });
    this.keyLight.shadow.bias = .0005;
    this.keyLight.shadow.normalBias = .025;
    this.rimLight = new THREE.PointLight("#7fffe2", 10, 25, 2);
    this.rimLight.position.set(0, 4, -8);
    this.playerLights = [new THREE.PointLight("#66f6e5", 4, 7, 2), new THREE.PointLight("#ff7aa8", 4, 7, 2)];
    this.scene.add(this.hemisphere, this.keyLight, this.rimLight, ...this.playerLights);

    this.solidCursor = 0;
    this.glowCursor = 0;
    this.tempColor = new THREE.Color();
    this.tempShell = new THREE.Matrix4();
    this.shellScale = new THREE.Vector3();
    this.ready = true;
    this.canvas.dataset.renderer = "three-r185-instanced-voxel";
  }

  createStars(count, size, seed) {
    const positions = new Float32Array(count * 3);
    let state = seed >>> 0;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - .5) * 42;
      positions[index * 3 + 1] = .8 + random() * 16;
      positions[index * 3 + 2] = -32 + random() * 45;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: "#dfe8ff", size, sizeAttenuation: true, transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
    return new THREE.Points(geometry, material);
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const nativeRatio = Math.min(1.5, window.devicePixelRatio || 1);
    const pixelRatio = this.quality === "low" ? .72 : this.quality === "balanced" ? 1 : nativeRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
    this.camera.aspect = Math.max(.1, bounds.width / Math.max(1, bounds.height));
    this.camera.updateProjectionMatrix();
  }

  beginFrame() {
    this.solidCursor = 0;
    this.glowCursor = 0;
    this.solidBatch.count = 0;
    this.glowBatch.count = 0;
    for (const batch of this.emissiveBatches.values()) {
      batch.userData.cursor = 0;
      batch.count = 0;
    }
  }

  endFrame() {
    this.solidBatch.count = this.solidCursor;
    this.glowBatch.count = this.glowCursor;
    this.solidBatch.instanceMatrix.needsUpdate = true;
    this.glowBatch.instanceMatrix.needsUpdate = true;
    if (this.solidBatch.instanceColor) this.solidBatch.instanceColor.needsUpdate = true;
    if (this.glowBatch.instanceColor) this.glowBatch.instanceColor.needsUpdate = true;
    for (const batch of this.emissiveBatches.values()) {
      batch.count = batch.userData.cursor;
      batch.instanceMatrix.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  emissiveBatchFor(color) {
    const key = new THREE.Color(color).getHexString();
    if (this.emissiveBatches.has(key)) return this.emissiveBatches.get(key);
    const material = new THREE.MeshBasicMaterial({ color: `#${key}`, toneMapped: false, fog: false });
    const batch = new THREE.InstancedMesh(this.boxGeometry, material, MAX_EMISSIVE_PER_COLOR);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.frustumCulled = false;
    batch.renderOrder = 2;
    batch.userData.cursor = 0;
    this.emissiveBatches.set(key, batch);
    this.scene.add(batch);
    return batch;
  }

  toWorld(x, y, height = 0) {
    return [(x - this.width / 2) / 21.5, height, (y - this.height * .52) / 13.3 - 2.65];
  }

  pushVoxel(matrix, color, emissive = 0) {
    const luminous = emissive >= .38;
    if (luminous) {
      const batch = this.emissiveBatchFor(color);
      const cursor = batch.userData.cursor;
      if (cursor < MAX_EMISSIVE_PER_COLOR) {
        batch.setMatrixAt(cursor, matrix);
        batch.userData.cursor += 1;
      }
    } else if (this.solidCursor < MAX_SOLID_VOXELS) {
      this.solidBatch.setMatrixAt(this.solidCursor, matrix);
      this.solidBatch.setColorAt(this.solidCursor, this.tempColor.set(color));
      this.solidCursor += 1;
    }
    if (emissive > .1 && this.glowCursor < MAX_GLOW_VOXELS) {
      const size = 1.08 + Math.min(.1, emissive * .045);
      this.tempShell.copy(matrix).scale(this.shellScale.set(size, size, size));
      this.glowBatch.setMatrixAt(this.glowCursor, this.tempShell);
      this.glowBatch.setColorAt(this.glowCursor, this.tempColor.set(color));
      this.glowCursor += 1;
    }
  }

  voxel(base, position, scale, color, emissive = 0, rotation = [0, 0, 0]) {
    this.pushVoxel(multiply(base, compose(position, rotation, scale)), color, emissive);
  }

  voxelHalo(base, radius, height, color, count = 8, speed = 1, phase = 0, size = .1) {
    for (let index = 0; index < count; index += 1) {
      const angle = phase + this.time * speed + index / count * TAU;
      this.voxel(base, [Math.cos(angle) * radius, height + Math.sin(angle * 2) * .05, Math.sin(angle) * radius], [size, size, size], color, 1, [angle, angle * .7, 0]);
    }
  }

  voxelCage(base, radius, color, pulse = 1) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) this.voxel(base, [x * radius, .16 + y * radius * .42, z * radius * .72], [.1 * pulse, .1 * pulse, .1 * pulse], color, 1);
  }

  voxelOrb(base, radius, color, accent = color) {
    const unit = radius / 2.45;
    for (let x = -2; x <= 2; x += 1) {
      for (let y = -2; y <= 2; y += 1) {
        for (let z = -2; z <= 2; z += 1) {
          const distance = Math.hypot(x, y, z);
          if (distance > 2.45 || distance < 1.35) continue;
          this.voxel(base, [x * unit, y * unit, z * unit], [unit * .96, unit * .96, unit * .96], (x + y + z) % 3 ? color : accent, .68);
        }
      }
    }
  }

  voxelThruster(base, x, z, color, flame, scale = 1) {
    this.voxel(base, [x, -.02, z], [.2 * scale, .2 * scale, .3], "#070b17");
    this.voxel(base, [x, -.02, z + .2], [.14 * scale, .14 * scale, .18 + flame * .14], "#fff6c4", 1);
    this.voxel(base, [x, -.02, z + .35 + flame * .07], [.09 * scale, .09 * scale, .14 + flame * .18], color, 1);
  }

  fighterNose(base, palette, length = 1, canopy = "#dffcff") {
    const [dark, bright, light] = palette;
    this.voxel(base, [0, .08, -.48 * length], [.62, .34, .62 * length], dark);
    this.voxel(base, [0, .1, -.88 * length], [.46, .28, .3 * length], bright);
    this.voxel(base, [0, .08, -1.14 * length], [.3, .22, .25 * length], bright);
    this.voxel(base, [0, .06, -1.34 * length], [.14, .14, .16 * length], light, .8);
    this.voxel(base, [0, .07, -1.48 * length], [.08, .08, .14 * length], "#ffffff", 1);
    this.voxel(base, [0, .35, -.63 * length], [.34, .2, .36 * length], canopy, .72);
    this.voxel(base, [0, .4, -.4 * length], [.42, .12, .16 * length], light, .25);
  }

  sweptWing(base, side, palette, width = 1, rear = .55, armored = false) {
    const [dark, bright, light] = palette;
    this.voxel(base, [side * .5 * width, .02, -.08], [.44 * width, .14, .42], bright);
    this.voxel(base, [side * .82 * width, 0, .15 + rear * .12], [.38 * width, .12, .34], dark);
    this.voxel(base, [side * 1.05 * width, -.02, .35 + rear * .25], [.5 * width, .1, .32], bright);
    this.voxel(base, [side * .82 * width, .13, .17], [.22 * width, .07, .24], light, .25);
    if (armored) this.voxel(base, [side * .66 * width, .2, .28], [.25 * width, .2, .38], dark);
  }

  tailFins(base, palette, spread = .4, height = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * spread, .24 * height, .68], [.12, .36 * height, .32], dark);
      this.voxel(base, [side * spread, .42 * height, .72], [.08, .18 * height, .2], bright);
      this.voxel(base, [side * spread, .5 * height, .66], [.05, .08, .08], light, .55);
    }
  }

  drawPlayerModules(player, base) {
    const flash = 1 + clamp(player.buffFlash || 0, 0, .48) * .35;
    if ((player.buffs?.arsenal || 0) > 0) {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .44, .19, -.43], [.1, .11, .58], "#41391e");
        this.voxel(base, [side * .44, .2, -.75], [.075 * flash, .08 * flash, .13], "#ffe36d", 1);
      }
    }
    if ((player.buffs?.nanobloom || 0) > 0) {
      for (const side of [-1, 0, 1]) {
        this.voxel(base, [side * .22, .34 + Math.abs(side) * .06, .78 + Math.abs(side) * .12], [.1 * flash, .1 * flash, .1], "#78f5aa", 1);
        this.voxel(base, [side * .22, .34 + Math.abs(side) * .06, .94 + Math.abs(side) * .12], [.07, .07, .13], "#d8ffe7", 1);
      }
    }
    if ((player.buffs?.aegis || 0) > 0) {
      this.voxel(base, [0, .53, -.26], [.18 * flash, .12 * flash, .2], "#76dbff", 1);
      for (const side of [-1, 1]) this.voxel(base, [side * .48, .2, .06], [.09, .09, .17], "#76dbff", .78);
    }
    if ((player.buffs?.flux || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 10) * .16;
      this.voxel(base, [0, .54, .08], [.18 * pulse, .16 * pulse, .24], "#bc86ff", 1);
      for (let index = 0; index < 3; index += 1) this.voxel(base, [0, .28 - index * .05, .42 + index * .18], [.08, .08, .08], "#bc86ff", .8 - index * .14);
    }
    const debuffs = [["chill", "#70eaff"], ["jam", "#ff83d7"], ["fracture", "#ffb45f"]].filter(([id]) => (player.debuffs?.[id] || 0) > 0);
    const statusScale = 1 + clamp(player.statusFlash || 0, 0, .44) * .7;
    debuffs.forEach(([, color], statusIndex) => {
      for (const side of [-1, 1]) {
        const jitter = Math.sin(this.time * (11 + statusIndex) + side) * .04;
        this.voxel(base, [side * (.52 + statusIndex * .12), .44 + jitter, .05 + statusIndex * .15], [.07 * statusScale, .14 * statusScale, .08], color, 1);
        this.voxel(base, [side * (.6 + statusIndex * .12), .31, .32 + statusIndex * .15], [.05, .05, .18], color, .6);
      }
    });
  }

  drawShip(player, colors, demo = false) {
    const position = demo ? [player.x, .4 + Math.sin(this.time * 1.4 + player.index) * .08, player.z] : this.toWorld(player.x, player.y, .32);
    const roll = demo ? Math.sin(this.time + player.index) * .12 : clamp(-player.vx * .006, -.3, .3);
    const pitch = demo ? -.08 : clamp(player.vy * .0018, -.11, .11);
    const frameId = player.frameId || "comet";
    const frameScale = frameId === "bulwark" ? 1.22 : frameId === "pulse" ? 1.16 : 1.2;
    const base = compose(position, [pitch, 0, roll], [frameScale, frameScale, frameScale]);
    const palette = [colors.dark, colors.color, colors.light];
    const flame = .5 + Math.sin(this.time * 28 + player.index) * .18;

    if (frameId === "bulwark") {
      this.voxel(base, [0, .08, .2], [.82, .46, 1.12], palette[0]);
      this.fighterNose(base, palette, 1.08, "#e8fbff");
      for (const side of [-1, 1]) this.sweptWing(base, side, palette, .82, .7, true);
      this.tailFins(base, palette, .46, 1.08);
      this.voxel(base, [0, .31, .2], [.58, .16, .56], palette[1]);
      for (const engineX of [-.72, -.25, .25, .72]) this.voxelThruster(base, engineX, .76, palette[1], flame, .78);
    } else if (frameId === "pulse") {
      this.voxel(base, [0, .08, .12], [.55, .38, 1.2], palette[0]);
      this.fighterNose(base, palette, 1.24, "#c8fbff");
      for (const side of [-1, 1]) {
        this.sweptWing(base, side, palette, .58, .76, false);
        this.voxel(base, [side * .46, .08, -.64], [.28, .08, .25], palette[2], .35);
      }
      this.tailFins(base, palette, .28, .92);
      this.voxelThruster(base, 0, .82, palette[1], flame, 1.15);
    } else {
      this.voxel(base, [0, .08, .12], [.68, .4, 1.02], palette[1]);
      this.fighterNose(base, palette, 1.14, "#ddffff");
      for (const side of [-1, 1]) this.sweptWing(base, side, palette, .72, .84, false);
      this.tailFins(base, palette, .38, 1);
      this.voxel(base, [0, .25, .24], [.46, .1, .52], palette[1]);
      this.voxelThruster(base, -.2, .76, palette[1], flame, .92);
      this.voxelThruster(base, .2, .76, palette[1], flame, .92);
    }
    if (!demo && player.shield > 0) {
      const shieldPulse = 1 + Math.sin(this.time * 8) * .08;
      for (const side of [-1, 1]) this.voxel(base, [side * .42, .35, -.28], [.09 * shieldPulse, .09 * shieldPulse, .13], "#86eaff", 1);
      this.voxel(base, [0, .49, -.7], [.2 * shieldPulse, .055, .16], "#baffff", .8);
    }
    if (!demo) this.drawPlayerModules(player, base);
  }

  drawEnemy(enemy) {
    const position = this.toWorld(enemy.x, enemy.y, .32);
    const enemyScale = (enemy.elite ? 1.42 : 1.18) * (enemy.moduleScale || 1);
    const spin = enemy.type === "spinner" ? Math.sin(enemy.age * 2) * .08 : 0;
    const base = compose(position, [0, Math.PI + spin, Math.sin(enemy.age * 2 + enemy.seed) * .045], [enemyScale, enemyScale, enemyScale]);
    if (enemy.boss) {
      this.drawBoss(enemy, base);
      return;
    }
    const palettes = {
      scout: ["#49336f", "#9d7bff", "#ffd968"],
      dart: ["#6b304a", "#ff816d", "#ffd173"],
      tank: ["#5a2945", "#f36770", "#fff19a"],
      spinner: ["#49376e", "#ab8cff", "#dff8ff"],
    };
    const palette = palettes[enemy.type] || ["#482038", "#ff4f70", "#ffd46c"];
    const armored = enemy.type === "tank";
    const length = enemy.type === "dart" ? 1.08 : enemy.type === "tank" ? .96 : .9;
    const width = enemy.type === "tank" ? 1.02 : enemy.type === "spinner" ? .82 : enemy.type === "dart" ? .88 : .76;
    this.voxel(base, [0, .05, .15], [armored ? .84 : .62, armored ? .42 : .32, armored ? 1.02 : .82], palette[1], .42);
    this.fighterNose(base, palette, length, palette[2]);
    for (const side of [-1, 1]) this.sweptWing(base, side, palette, width, enemy.type === "dart" ? .9 : .65, armored);
    this.tailFins(base, palette, armored ? .46 : .34, armored ? .92 : .72);
    const moduleColor = enemy.moduleColor || "#7fffe2";
    const flame = .36 + Math.sin(this.time * 18 + enemy.seed) * .11;
    if (enemy.movementModule === "standard") {
      this.voxelThruster(base, -.2, .72, moduleColor, flame, .65);
      this.voxelThruster(base, .2, .72, moduleColor, flame, .65);
    } else if (enemy.movementModule === "weave") {
      const offset = Math.sin(this.time * 7 + enemy.seed) * .06;
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .88, .15, .38 + side * offset], [.13, .25, .25], moduleColor, .65);
        this.voxelThruster(base, side * .88, .54, moduleColor, flame, .55);
      }
    } else if (enemy.movementModule === "rush") {
      this.voxelThruster(base, -.3, .78, moduleColor, .7 + flame, .95);
      this.voxelThruster(base, .3, .78, moduleColor, .7 + flame, .95);
    } else if (enemy.movementModule === "drift") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .72, .12, .48], [.2, .2, .38], "#16283c");
        this.voxel(base, [side * .72, .12, .7], [.12, .12, .2], moduleColor, 1);
      }
    }
    if (enemy.weaponModule === "pulse") {
      this.voxel(base, [0, .2, -.94], [.14, .14, .5], "#17132b");
      this.voxel(base, [0, .21, -1.22], [.1, .1, .14], moduleColor, 1);
    } else if (enemy.weaponModule === "twin") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .34, .18, -.8], [.11, .11, .48], "#17132b");
        this.voxel(base, [side * .34, .19, -1.08], [.08, .08, .14], moduleColor, 1);
      }
    } else if (enemy.weaponModule === "sniper") {
      this.voxel(base, [0, .23, -1.04], [.13, .13, .86], "#111326");
      this.voxel(base, [0, .24, -1.5], [.08, .08, .16], moduleColor, 1);
      this.voxel(base, [0, .24, -1.62], [.045, .045, .08], "#ffffff", 1);
    } else if (enemy.weaponModule === "orbit") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .48, .42, -.08], [.17, .16, .25], "#25203e");
        this.voxel(base, [side * .48, .46, -.25], [.1, .1, .14], moduleColor, 1);
      }
    }
    if (enemy.coreModule === "light") this.voxel(base, [0, .43, .08], [.3, .2, .32], moduleColor, .5);
    else if (enemy.coreModule === "plated") {
      for (const side of [-1, 1]) this.voxel(base, [side * .48, .27, .12], [.22, .28, .66], "#25263a");
      this.voxel(base, [0, .46, .12], [.52, .14, .46], moduleColor, .35);
    } else if (enemy.coreModule === "barrier" && enemy.moduleBarrier > 0) this.voxelCage(base, .94 + Math.sin(this.time * 9 + enemy.seed) * .025, moduleColor, 1);
    else if (enemy.coreModule === "volatile") {
      const pulse = 1 + Math.sin(this.time * 10 + enemy.seed) * .14;
      this.voxel(base, [0, .46, .1], [.24 * pulse, .24 * pulse, .24 * pulse], moduleColor, 1);
      for (const side of [-1, 1]) this.voxel(base, [side * .3, .42, .18], [.08, .08, .18], moduleColor, .7);
    }
    if (enemy.aiModule === "sentry") this.voxel(base, [0, .56, .3], [.07, .2, .07], "#fff5b5", .7);
    else if (enemy.aiModule === "hunter") {
      this.voxel(base, [-.17, .49, -.48], [.1, .11, .16], "#ff4f70", 1);
      this.voxel(base, [.17, .49, -.48], [.1, .11, .16], "#ff4f70", 1);
    } else if (enemy.aiModule === "flanker") for (const side of [-1, 1]) this.voxel(base, [side * .7, .3, .02], [.09, .25, .15], "#ffcf6e", 1);
    else if (enemy.aiModule === "oracle") {
      this.voxel(base, [0, .58, -.08], [.3, .08, .26], moduleColor, .75);
      for (const side of [-1, 0, 1]) this.voxel(base, [side * .14, .7 + Math.abs(side) * .04, -.08], [.06, .16, .06], "#ffffff", 1);
    }
    if (enemy.payloadModule === "cryo") for (const side of [-1, 1]) this.voxel(base, [side * .52, -.04, .45], [.16, .18, .3], "#70eaff", 1);
    else if (enemy.payloadModule === "glitch") {
      const offset = Math.floor(this.time * 18 + enemy.seed) % 2 ? .04 : -.04;
      this.voxel(base, [-.44 + offset, .36, .42], [.09, .22, .09], "#ff83d7", 1);
      this.voxel(base, [.44 - offset, .36, .42], [.09, .22, .09], "#ff83d7", 1);
    } else if (enemy.payloadModule === "fracture") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .5, .29, .4], [.14, .14, .28], "#ffb45f", 1);
        this.voxel(base, [side * .64, .19, .54], [.08, .08, .18], "#7b3b27", .4);
      }
    }
    if (enemy.elite) {
      for (const side of [-1, 1]) this.voxel(base, [side * 1.08, .3, .16], [.08, .45, .08], "#fff1a0", 1);
      this.voxel(base, [0, .72, .06], [.7, .06, .08], "#fff1a0", 1);
    }
    if (enemy.hitFlash > 0) {
      this.voxel(base, [0, .7, -.2], [.78, .05, .08], "#ffffff", 1);
      this.voxel(base, [0, .7, .25], [.5, .05, .08], "#ffffff", 1);
    }
  }

  drawBoss(enemy, base) {
    const stage = this.stageIndex;
    const pulse = .5 + Math.sin(this.time * 6) * .5;
    const palettes = enemy.hitFlash > 0 ? ["#eaffff", "#ffffff", "#ffffff"] : [["#551f4c", "#f26ba5", "#ffbd78"], ["#153d4b", "#56d3bd", "#f3c94f"], ["#361039", "#b84786", "#ff4b6e"]][stage];
    const scale = [1.12, 1.24, 1.36][stage];
    const bossBase = multiply(base, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    this.voxel(bossBase, [0, .12, .2], [1.25, .68, 1.8], palettes[0]);
    this.fighterNose(bossBase, palettes, 1.7, "#d8ffff");
    this.voxel(bossBase, [0, .54, -.1], [.72, .28, .9], palettes[1]);
    this.voxel(bossBase, [0, .73, -.48], [.42 + pulse * .04, .16, .32], palettes[2], 1);
    for (const side of [-1, 1]) {
      this.sweptWing(bossBase, side, palettes, 1.24, .95, true);
      this.voxel(bossBase, [side * 1.55, .22, .54], [.46, .4, .92], palettes[0]);
      this.voxel(bossBase, [side * 2.05, .08, .92], [.55, .22, .5], palettes[1]);
      this.voxelThruster(bossBase, side * 1.52, 1.05, palettes[2], .82 + pulse * .2, 1.3);
      this.voxelThruster(bossBase, side * .42, 1.08, palettes[2], .82 + pulse * .2, 1.15);
    }
    this.tailFins(bossBase, palettes, .66, 1.35);
    if (stage === 1) for (const side of [-1, 1]) this.voxel(bossBase, [side * 1.28, .58, -.2], [.18, .46, .7], palettes[2], .7);
    else if (stage === 2) for (const side of [-1, 1]) {
      this.voxel(bossBase, [side * 1.08, .62, -.42], [.22, .64, .44], "#c183ff", .8);
      this.voxel(bossBase, [side * 2.22, .26, .9], [.14, .48, .18], palettes[2], 1);
    }
    if (enemy.phaseShield > 0) this.voxelCage(bossBase, 2.3 + Math.sin(this.time * 12) * .04, palettes[2], 1.15);
  }

  drawRouteGates(choice) {
    const laneCenters = [this.width * .19, this.width * .5, this.width * .81];
    choice.options.forEach((path, index) => {
      const position = this.toWorld(laneCenters[index], this.height - 63, .12);
      const selected = index === choice.selectedIndex;
      const charge = selected ? clamp(choice.hold / .68, 0, 1) : 0;
      const base = compose(position);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .82, .72, 0], [.18, 1.55, .24], selected ? path.color : "#353055", selected ? .8 : .15);
        this.voxel(base, [side * .82, 1.52, 0], [.32, .16, .28], path.color, selected ? 1 : .28);
      }
      this.voxel(base, [0, 1.5, 0], [1.5, .18, .24], path.color, selected ? 1 : .3);
      this.voxel(base, [0, .02, 0], [1.55, .08, .7], selected ? path.color : "#24213e", selected ? .45 : .1);
      for (let beacon = 0; beacon < 5; beacon += 1) {
        const phase = (beacon + Math.floor(this.time * 5)) % 5;
        this.voxel(base, [0, .25 + phase * .24, .03], [.08 + charge * .03, .08 + charge * .03, .08], path.color, .7 + charge * .3);
      }
    });
  }

  drawEncounter(encounter) {
    if (!encounter) return;
    const position = this.toWorld(encounter.x, encounter.y, encounter.kind === "siege" ? .55 : .12);
    const ratio = encounter.kind === "survive" ? 1 - clamp(encounter.timer / encounter.total, 0, 1) : clamp(encounter.progress / encounter.goal, 0, 1);
    const base = compose(position, [0, this.time * .18, 0]);
    if (encounter.kind === "hold") {
      this.voxel(base, [0, .45, 0], [.28, .9, .28], "#18223c");
      this.voxel(base, [0, .98, 0], [.42 + ratio * .12, .18, .42 + ratio * .12], encounter.color, 1);
      for (const side of [-1, 1]) this.voxel(base, [side * .7, .12, 0], [.1, .3 + ratio * .5, .1], encounter.color, .7);
    } else if (encounter.kind === "escort") {
      const palette = ["#15243a", encounter.color, "#ffffff"];
      this.voxel(base, [0, .08, .08], [.48, .28, .7], palette[0]);
      this.fighterNose(base, palette, .7, "#ffffff");
      for (const side of [-1, 1]) this.sweptWing(base, side, palette, .55, .7, false);
      this.voxelThruster(base, 0, .5, encounter.color, .4, .65);
    } else if (encounter.kind === "siege") {
      const health = clamp(encounter.hp / encounter.maxHp, 0, 1);
      this.voxel(base, [0, .15, 0], [.85, .85, .85], "#17162d");
      this.voxel(base, [0, .15, 0], [.38 + health * .18, .38 + health * .18, .38 + health * .18], encounter.color, 1);
      for (let index = 0; index < 6; index += 1) {
        const angle = index / 6 * TAU + this.time * .45;
        this.voxel(base, [Math.sin(angle) * 1.05, .15, Math.cos(angle) * 1.05], [.12, .12, .32], "#ffffff", .65, [0, angle, 0]);
      }
    } else if (encounter.kind === "collect") {
      this.voxel(base, [0, .02, 0], [1.15, .06, 1.15], "#18233e");
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * TAU;
        this.voxel(base, [Math.sin(angle) * .62, .08, Math.cos(angle) * .62], [.11, .12 + ratio * .22, .11], encounter.color, .75);
      }
    } else {
      this.voxel(base, [0, .12, 0], [.52, .3, .7], "#301d3f");
      for (const side of [-1, 1]) this.voxel(base, [side * .48, .12, .08], [.42, .12, .42], encounter.color, .65);
    }
  }

  drawEncounterObject(object) {
    const position = this.toWorld(object.x, object.y, object.type === "meteor" ? .35 : .58 + Math.sin(object.age * 4) * .08);
    const base = compose(position, [object.rotation || object.age, object.age * .7, 0]);
    if (object.type === "salvage") {
      this.voxel(base, [0, 0, 0], [.34, .34, .34], object.color, 1);
      for (const axis of [[.28, 0, 0], [-.28, 0, 0], [0, .28, 0], [0, -.28, 0]]) this.voxel(base, axis, [.18, .18, .18], "#ffffff", .75);
    } else if (object.type === "meteor") {
      const scale = .34 + object.r * .018;
      this.voxel(base, [0, 0, 0], [scale, scale, scale], "#6f4052");
      this.voxel(base, [.28, .08, -.12], [scale * .55, scale * .45, scale * .5], "#9a5a55");
      this.voxel(base, [-.23, -.11, .2], [scale * .48, scale * .42, scale * .52], object.color, .35);
    }
  }

  drawBiomeFeatures(biome) {
    if (!biome) return;
    const accent = biome.accent || "#7fffe2";
    const secondary = biome.secondary || accent;
    const landmark = biome.landmark;
    if (landmark === "bloom" || landmark === "garden") {
      for (let index = 0; index < 7; index += 1) {
        const base = compose([-9 + index * 3, -.1, -15 - (index % 3) * 2.8]);
        this.voxel(base, [0, .5, 0], [.09, 1, .09], secondary, .25);
        this.voxel(base, [0, 1.08, 0], [.28, .28, .28], index % 2 ? accent : secondary, .7);
        for (const side of [-1, 1]) this.voxel(base, [side * .31, 1.08, 0], [.24, .16, .24], accent, .45);
      }
    } else if (landmark === "crystals" || landmark === "prisms") {
      for (let index = 0; index < 8; index += 1) {
        const height = 1.2 + (index % 3) * .65;
        const base = compose([-10 + index * 2.8, -.45, -17 - (index % 2) * 3]);
        this.voxel(base, [0, height * .38, 0], [.52, height * .76, .52], index % 2 ? accent : secondary, .45);
        this.voxel(base, [0, height * .82, 0], [.32, height * .24, .32], "#dffcff", .65);
      }
    } else if (landmark === "comets") {
      for (let index = 0; index < 6; index += 1) {
        const base = compose([-10 + index * 4.1, 2.6 + (index % 2), -17 - (index % 3) * 2.5]);
        this.voxel(base, [0, 0, 0], [.34, .34, .34], secondary, .8);
        for (let tail = 1; tail <= 4; tail += 1) this.voxel(base, [tail * .38, 0, tail * .15], [.28 / tail, .18 / tail, .48], accent, .55 / tail);
      }
    } else if (landmark === "aurora") {
      for (let strip = 0; strip < 4; strip += 1) for (let segment = 0; segment < 9; segment += 1) {
        const y = 4.8 + strip * .65 + Math.sin(segment * .7 + this.time * .25) * .35;
        this.pushVoxel(compose([-9 + segment * 2.2, y, -20 - strip], [0, .18, .08], [1.6, .12, .16]), strip % 2 ? accent : secondary, .7);
      }
    } else if (landmark === "gears") {
      for (let gear = 0; gear < 3; gear += 1) {
        const base = compose([-7 + gear * 6.5, 1.4 + gear, -18 - gear * 2], [Math.PI / 2, 0, 0]);
        this.voxelHalo(base, 1.2 + gear * .25, 0, gear % 2 ? accent : secondary, 12, .08 + gear * .025, gear, .18);
      }
    } else if (landmark === "reef") {
      for (let index = 0; index < 10; index += 1) {
        const size = .5 + (index % 4) * .22;
        const base = compose([-10 + index * 2.3, -.45, -17 - (index % 3) * 2.2]);
        for (let stack = 0; stack < 3; stack += 1) this.voxel(base, [0, size * (.3 + stack * .5), 0], [size * (1 - stack * .18), size * .45, size * (1 - stack * .18)], index % 2 ? accent : secondary, .25);
      }
    } else if (landmark === "eclipse") {
      const base = compose([-7.7, 5.7, -21]);
      this.voxelOrb(base, 3.1, "#080612", "#18102a");
      this.voxelHalo(base, 3.7, 0, accent, 24, .02, 0, .16);
    }
  }

  drawLandmark(stageIndex, biome) {
    if (stageIndex === 0) {
      const planet = compose([8.2, 5.3, -21], [0, this.time * .025, 0]);
      this.voxelOrb(planet, 2.42, "#c94788", "#ffad7a");
      this.voxelHalo(planet, 3.18, 0, "#f59ac7", 24, .02, 0, .14);
    } else if (stageIndex === 1) {
      for (let index = 0; index < 6; index += 1) {
        const base = compose([-9 + index * 3.7, 5.5 + (index % 2) * 1.2, -21 - (index % 3)]);
        for (let block = -2; block <= 2; block += 1) this.voxel(base, [block * .62, Math.abs(block) * -.12, 0], [.72, .48, .7], "#4fa9ad", .16);
      }
      const gear = compose([7.3, 6.7, -19], [Math.PI / 2, 0, 0]);
      this.voxelHalo(gear, 2.2, 0, "#e3be4d", 16, .12, 0, .24);
    } else {
      const base = compose([7.5, 3.5, -22]);
      this.voxel(base, [0, 2.8, 0], [4.2, 7.6, 2.8], "#2b123e");
      this.voxel(base, [0, 7, 0], [3.5, .8, 2.9], "#5f275b");
      for (let y = 0; y < 5; y += 1) for (let x = -1; x <= 1; x += 1) this.voxel(base, [x * 1.1, y * 1.15 + .2, -1.45], [.32, .32, .06], y === 4 ? "#ff466b" : "#8a427d", .7);
    }
    this.drawBiomeFeatures(biome);
  }

  drawProjectile(bullet, enemy = false) {
    const position = this.toWorld(bullet.x, bullet.y, enemy ? .42 : .52);
    const travelAngle = Math.atan2(bullet.vx, bullet.vy);
    const rotation = [0, travelAngle, 0];
    if (enemy) {
      const size = .08 + bullet.r * .023;
      const color = this.highContrastBullets ? "#fff06a" : bullet.color;
      const base = compose(position, rotation);
      if (bullet.weaponModule === "sniper") {
        this.voxel(base, [0, 0, 0], [size * .72, size * .72, size * 4.2], color, 1);
        this.voxel(base, [0, 0, size * 2.5], [size * .28, size * .28, size * 2.2], "#ffffff", .85);
      } else if (bullet.weaponModule === "orbit") {
        this.voxel(base, [0, 0, 0], [size * 2.4, size, size], color, 1, [0, bullet.age * 5, 0]);
        this.voxel(base, [0, 0, 0], [size, size, size * 2.4], color, 1, [0, bullet.age * 5, 0]);
      } else if (bullet.weaponModule === "twin") {
        this.voxel(base, [-size, 0, 0], [size * .75, size, size * 1.8], color, 1);
        this.voxel(base, [size, 0, 0], [size * .75, size, size * 1.8], color, 1);
      } else this.voxel(base, [0, 0, 0], [size, size, size * 1.55], color, 1);
      if (bullet.payloadModule !== "clean") {
        const payloadColor = bullet.payloadColor || color;
        this.voxel(base, [-size * 1.4, 0, size * .2], [size * .42, size * .42, size * .42], payloadColor, 1);
        this.voxel(base, [size * 1.4, 0, size * .2], [size * .42, size * .42, size * .42], payloadColor, 1);
      }
    } else {
      const base = compose(position, rotation);
      this.voxel(base, [0, 0, 0], [.055, .055, .36], bullet.color, 1);
      this.voxel(base, [0, 0, .27], [.028, .028, .22], "#ffffff", .7);
    }
  }

  drawPickup(pickup) {
    const position = this.toWorld(pickup.x, pickup.y, .65 + Math.sin(pickup.age * 5) * .12);
    const colors = { weapon: "#ffe36d", repair: "#78f5aa", shield: "#76dbff", energy: "#bc86ff" };
    const color = colors[pickup.type];
    const base = compose(position, [0, pickup.age * 1.2, 0]);
    this.voxel(base, [0, 0, 0], [.34, .34, .34], "#151b31");
    if (pickup.type === "weapon") for (const side of [-1, 1]) this.voxel(base, [side * .22, .08, -.08], [.1, .12, .48], color, 1);
    else if (pickup.type === "repair") {
      this.voxel(base, [0, .08, 0], [.14, .46, .14], color, 1);
      this.voxel(base, [0, .08, 0], [.46, .14, .14], color, 1);
    } else if (pickup.type === "shield") for (const side of [-1, 1]) {
      this.voxel(base, [side * .26, .08, 0], [.08, .52, .08], color, 1);
      this.voxel(base, [0, .08 + side * .26, 0], [.52, .08, .08], color, 1);
    } else {
      this.voxel(base, [-.12, .28, 0], [.16, .18, .16], color, 1);
      this.voxel(base, [0, .08, 0], [.16, .22, .16], color, 1);
      this.voxel(base, [.12, -.14, 0], [.16, .2, .16], color, 1);
    }
    this.voxelHalo(base, .55, 0, color, 8, .75, pickup.age, .055);
  }

  drawParticle(particle) {
    const position = this.toWorld(particle.x, particle.y, .25 + particle.size * .08);
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    const size = .035 + particle.size * .025;
    this.pushVoxel(compose(position, [particle.life * 4, 0, 0], [size, size, size]), particle.color, alpha > .55 ? .65 : .15);
  }

  drawBeam(playerA, playerB) {
    const a = this.toWorld(playerA.x, playerA.y, .34);
    const b = this.toWorld(playerB.x, playerB.y, .34);
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const length = Math.hypot(dx, dz);
    const middle = [(a[0] + b[0]) / 2, .34, (a[2] + b[2]) / 2];
    this.pushVoxel(compose(middle, [0, Math.atan2(dx, dz), 0], [.035, .035, length]), "#92fff0", 1);
  }

  drawRush(world) {
    const colors = ["#66f6e5", "#ff87ba"];
    const livePlayers = world.players.filter((player) => !player.downed);
    for (const player of livePlayers) {
      const base = compose(this.toWorld(player.x, player.y, .28));
      const color = colors[player.index] || colors[0];
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .94, .18, .22], [.08, .46, .08], color, 1);
        this.voxel(base, [side * .78, .5, -.18], [.36, .06, .08], "#fff4a8", 1);
      }
      for (let index = 0; index < 6; index += 1) {
        const angle = this.time * (2.2 + player.index * .25) + index / 6 * TAU;
        this.voxel(base, [Math.cos(angle) * .88, .48 + Math.sin(index * 2.1 + this.time * 3) * .12, Math.sin(angle) * .88], [.09, .09, .09], index % 2 ? color : "#fff4a8", 1);
      }
    }
    if (livePlayers.length === 2) {
      const a = this.toWorld(livePlayers[0].x, livePlayers[0].y, .38);
      const b = this.toWorld(livePlayers[1].x, livePlayers[1].y, .38);
      const midpoint = [(a[0] + b[0]) / 2, .56, (a[2] + b[2]) / 2];
      const pulse = .18 + Math.sin(this.time * 16) * .025;
      this.pushVoxel(compose(midpoint, [this.time * 2.8, this.time * 4.2, 0], [pulse, pulse, pulse]), "#fff4a8", 1);
    }
  }

  drawProtocols(world) {
    const protocols = world.activeProtocols || [];
    const players = world.players.filter((player) => !player.downed);
    if (!protocols.length || !players.length) return;
    const centerX = players.reduce((sum, player) => sum + player.x, 0) / players.length;
    const centerY = players.reduce((sum, player) => sum + player.y, 0) / players.length;
    const base = compose(this.toWorld(centerX, centerY, .82));
    const flash = clamp((world.protocolFlashTimer || 0) / .38, 0, 1);
    protocols.forEach((protocol, index) => {
      const angle = this.time * (1.2 + index * .12) + index * 1.9;
      const radius = .3 + index * .14;
      this.voxel(base, [Math.cos(angle) * radius, Math.sin(angle * 2) * .08, Math.sin(angle) * radius], [.1 + flash * .04, .1 + flash * .04, .1 + flash * .04], protocol.color, 1, [angle, angle, 0]);
    });
  }

  configureScene(stage, world) {
    this.scene.background.set(stage.sky);
    this.scene.fog.color.set(stage.sky);
    this.scene.fog.density = this.quality === "low" ? .014 : .018;
    this.grid.material.color.set(stage.grid);
    this.starLayers[0].material.color.set(stage.star);
    this.starLayers[1].material.color.set(stage.biome?.secondary || stage.star);
    this.starLayers[0].position.z = (this.time * .8) % 18;
    this.starLayers[1].position.z = ((this.time * .55) % 18) - 12;
    this.rimLight.color.set(stage.biome?.accent || stage.grid);
    this.rimLight.intensity = this.quality === "low" ? 5 : 9;
    this.renderer.shadowMap.enabled = false;
    this.solidBatch.castShadow = false;
    this.playerLights.forEach((light, index) => {
      const player = world.players?.[index];
      light.visible = Boolean(player && world.mode !== "menu");
      if (player) light.position.fromArray(this.toWorld(player.x, player.y, .85));
    });
  }

  render(world, stages, playerConfigs, settings = {}) {
    if (!this.ready) return false;
    this.quality = settings.quality || "high";
    this.highContrastBullets = settings.bulletContrast === "high";
    this.resize();
    this.time = world.time;
    this.stageIndex = world.stageIndex || 0;
    const stage = stages[this.stageIndex];
    this.configureScene(stage, world);
    this.beginFrame();
    let follow = 0;
    if (world.players?.length && world.mode !== "menu") follow = world.players.reduce((sum, player) => sum + this.toWorld(player.x, player.y)[0], 0) / world.players.length * .08;
    const shakeStrength = Number.isFinite(settings.shake) ? settings.shake : 1;
    const shake = world.shake > 0 ? (Math.random() - .5) * world.shake * .14 * shakeStrength : 0;
    const cinematic = world.cinematic;
    const progress = cinematic ? clamp(1 - cinematic.timer / cinematic.total, 0, 1) : 0;
    const cinematicAmount = cinematic ? Math.sin(progress * Math.PI) : 0;
    const eye = [follow + shake, 9.2 + shake - cinematicAmount * .65, 12.8 - cinematicAmount * 1.35];
    const target = [follow * .25, -.1, -3.8];
    if (cinematic && (cinematic.type === "boss" || cinematic.type === "phase") && world.boss) {
      const bossPosition = this.toWorld(world.boss.x, world.boss.y, .35);
      target[0] = lerp(target[0], bossPosition[0], cinematicAmount * .7);
      target[1] = lerp(target[1], .35, cinematicAmount * .45);
      target[2] = lerp(target[2], bossPosition[2], cinematicAmount * .5);
    } else if (cinematic?.type === "encounter" && world.activeEncounter) {
      const encounterPosition = this.toWorld(world.activeEncounter.x, world.activeEncounter.y, .3);
      target[0] = lerp(target[0], encounterPosition[0], cinematicAmount * .42);
      target[2] = lerp(target[2], encounterPosition[2], cinematicAmount * .3);
    }
    this.camera.position.fromArray(eye);
    this.camera.lookAt(...target);
    this.drawLandmark(this.stageIndex, stage.biome);
    if (world.mode === "menu") {
      this.drawShip({ index: 0, frameId: world.loadoutFrame, x: 4.8 + Math.sin(this.time * .6) * .4, z: -.5 + Math.cos(this.time) * .25 }, playerConfigs[0], true);
      this.drawShip({ index: 1, frameId: world.loadoutFrame, x: 7.2 + Math.sin(this.time * .7) * .5, z: 1.1 + Math.cos(this.time * .8) * .25 }, playerConfigs[1], true);
      this.endFrame();
      return true;
    }
    if (world.routeChoice) this.drawRouteGates(world.routeChoice);
    if (world.activeEncounter) this.drawEncounter(world.activeEncounter);
    for (const object of world.encounterObjects || []) this.drawEncounterObject(object);
    for (const pickup of world.pickups) this.drawPickup(pickup);
    for (const enemy of world.enemies) this.drawEnemy(enemy);
    for (const bullet of world.bullets) this.drawProjectile(bullet, false);
    for (const bullet of world.enemyBullets) this.drawProjectile(bullet, true);
    if (world.linked) this.drawBeam(world.players[0], world.players[1]);
    if (world.rushTimer > 0) this.drawRush(world);
    if (world.activeProtocols?.length) this.drawProtocols(world);
    for (const player of world.players) {
      if (!player.downed && !(player.invulnerability > 0 && Math.floor(world.time * 14) % 2 === 0)) this.drawShip(player, playerConfigs[player.index]);
      else if (player.downed) this.drawShip({ ...player, vx: Math.sin(this.time * 5) * 20, vy: 0 }, { ...playerConfigs[player.index], color: playerConfigs[player.index].dark });
    }
    for (const particle of world.particles.slice(-180)) this.drawParticle(particle);
    this.endFrame();
    return true;
  }
}

window.SpaceRenderer3D = SpaceRenderer3D;
