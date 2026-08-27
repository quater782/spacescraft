import * as THREE from "../node_modules/three/build/three.module.min.js";

const TAU = Math.PI * 2;
const MAX_SOLID_PER_COLOR = 512;
const MAX_EMISSIVE_PER_COLOR = 512;
const MAX_GLOW_PER_COLOR = 512;
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
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#070817");
    this.scene.fog = new THREE.FogExp2("#070817", .026);
    this.camera = new THREE.PerspectiveCamera(55.4, 16 / 9, .1, 80);

    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const toonBands = new Uint8Array([72, 152, 232]);
    this.toonGradient = new THREE.DataTexture(toonBands, 3, 1, THREE.RedFormat);
    this.toonGradient.colorSpace = THREE.NoColorSpace;
    this.toonGradient.minFilter = THREE.NearestFilter;
    this.toonGradient.magFilter = THREE.NearestFilter;
    this.toonGradient.generateMipmaps = false;
    this.toonGradient.needsUpdate = true;
    this.toonBatches = new Map();
    this.glowBatches = new Map();
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
    this.fillLight = new THREE.AmbientLight("#ffffff", .32);
    this.hemisphere = new THREE.HemisphereLight("#d8e7ff", "#2d1648", 1.05);
    this.keyLight = new THREE.DirectionalLight("#ffffff", 1.55);
    this.keyLight.position.set(-7, 12, 8);
    this.keyLight.castShadow = false;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.keyLight.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 42 });
    this.keyLight.shadow.bias = .0005;
    this.keyLight.shadow.normalBias = .025;
    this.rimLight = new THREE.PointLight("#7fffe2", 2.6, 25, 2);
    this.rimLight.position.set(0, 4, -8);
    this.playerLights = [new THREE.PointLight("#66f6e5", 1.25, 7, 2), new THREE.PointLight("#ff7aa8", 1.25, 7, 2)];
    this.scene.add(this.fillLight, this.hemisphere, this.keyLight, this.rimLight, ...this.playerLights);

    this.tempShell = new THREE.Matrix4();
    this.shellScale = new THREE.Vector3();
    this.ready = true;
    this.canvas.dataset.renderer = "three-r185-instanced-voxel";
    this.canvas.dataset.artStyle = "toon-glow-light-blocks";
    this.canvas.dataset.modelPalette = "saturated-no-black";
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
    for (const batch of [...this.toonBatches.values(), ...this.glowBatches.values(), ...this.emissiveBatches.values()]) {
      batch.userData.cursor = 0;
      batch.count = 0;
    }
  }

  endFrame() {
    for (const batch of [...this.toonBatches.values(), ...this.glowBatches.values(), ...this.emissiveBatches.values()]) {
      batch.count = batch.userData.cursor;
      batch.instanceMatrix.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
  }

  colorKey(color) {
    if (typeof color === "string") return color.replace("#", "").toLowerCase();
    return new THREE.Color(color).getHexString();
  }

  toonBatchFor(color) {
    const key = this.colorKey(color);
    if (this.toonBatches.has(key)) return this.toonBatches.get(key);
    const material = new THREE.MeshToonMaterial({ color: `#${key}`, gradientMap: this.toonGradient });
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.08;",
      );
    };
    material.customProgramCacheKey = () => "toon-color-fill-v2";
    const batch = new THREE.InstancedMesh(this.boxGeometry, material, MAX_SOLID_PER_COLOR);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.frustumCulled = false;
    batch.castShadow = false;
    batch.receiveShadow = false;
    batch.userData.cursor = 0;
    this.toonBatches.set(key, batch);
    this.scene.add(batch);
    return batch;
  }

  glowBatchFor(color) {
    const key = this.colorKey(color);
    if (this.glowBatches.has(key)) return this.glowBatches.get(key);
    const material = new THREE.MeshBasicMaterial({
      color: `#${key}`,
      transparent: true,
      opacity: .055,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    });
    const batch = new THREE.InstancedMesh(this.boxGeometry, material, MAX_GLOW_PER_COLOR);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.frustumCulled = false;
    batch.renderOrder = 4;
    batch.userData.cursor = 0;
    this.glowBatches.set(key, batch);
    this.scene.add(batch);
    return batch;
  }

  emissiveBatchFor(color) {
    const key = this.colorKey(color);
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
    const glow = Math.max(.13, emissive);
    const luminous = emissive >= .82;
    if (luminous) {
      const batch = this.emissiveBatchFor(color);
      const cursor = batch.userData.cursor;
      if (cursor < MAX_EMISSIVE_PER_COLOR) {
        batch.setMatrixAt(cursor, matrix);
        batch.userData.cursor += 1;
      }
    } else {
      const batch = this.toonBatchFor(color);
      const cursor = batch.userData.cursor;
      if (cursor < MAX_SOLID_PER_COLOR) {
        batch.setMatrixAt(cursor, matrix);
        batch.userData.cursor += 1;
      }
    }
    const glowBatch = this.glowBatchFor(color);
    const glowCursor = glowBatch.userData.cursor;
    if (glowCursor < MAX_GLOW_PER_COLOR) {
      const size = 1.045 + Math.min(.07, glow * .04);
      this.tempShell.copy(matrix).scale(this.shellScale.set(size, size, size));
      glowBatch.setMatrixAt(glowCursor, this.tempShell);
      glowBatch.userData.cursor += 1;
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
    this.voxel(base, [x, -.02, z], [.19 * scale, .17 * scale, .3], "#5268d8", .22);
    this.voxel(base, [x, -.02, z + .3 + flame * .05], [.1 * scale, .1 * scale, .3 + flame * .2], color, .9);
  }

  fighterNose(base, palette, length = 1, canopy = "#dffcff") {
    const [dark, bright, light] = palette;
    this.voxel(base, [0, .055, -.58 * length], [.46, .2, .96 * length], dark, .16);
    this.voxel(base, [0, .045, -1.14 * length], [.25, .13, .36 * length], bright, .18);
    this.voxel(base, [0, .025, -1.4 * length], [.09, .07, .16 * length], light, .24);
    this.voxel(base, [0, .205, -.51 * length], [.28, .13, .5 * length], canopy, .48);
  }

  sweptWing(base, side, palette, width = 1, rear = .55, armored = false) {
    const [dark, bright, light] = palette;
    const sweep = side * .055;
    this.voxel(base, [side * .48 * width, .02, .02], [.78 * width, .1, .44], bright, .18, [0, sweep, 0]);
    this.voxel(base, [side * 1.03 * width, 0, .28 + rear * .08], [.68 * width, .075, .32], dark, .16, [0, sweep, 0]);
    this.voxel(base, [side * 1.46 * width, -.012, .55 + rear * .08], [.32 * width, .055, .2], light, .24, [0, sweep, 0]);
    if (armored) this.voxel(base, [side * .53 * width, .1, .2], [.42 * width, .1, .48], light, .18);
  }

  tailFins(base, palette, spread = .4, height = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * spread, .25 * height, .72], [.075, .4 * height, .44], dark, .18, [side * -.16, 0, 0]);
      this.voxel(base, [side * spread, .48 * height, .75], [.045, .13 * height, .2], light, .34, [side * -.16, 0, 0]);
    }
  }

  drawPlayerModules(player, base, palette, profile) {
    const flash = 1 + clamp(player.buffFlash || 0, 0, .48) * .35;
    const span = profile.span;
    if ((player.buffs?.arsenal || 0) > 0) {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * span * .4, .11, -.48], [.1, .08, .86], "#ffd94a", .38);
        this.voxel(base, [side * span * .4, .13, -.95], [.055 * flash, .055 * flash, .15], "#ff8a4c", .88);
      }
    }
    if ((player.buffs?.nanobloom || 0) > 0) {
      this.voxel(base, [0, .25, .48], [.18, .07, .68], "#58e890", .5);
      this.voxel(base, [0, .29, .46], [.08, .035, .52], "#b8ff6a", .76);
    }
    if ((player.buffs?.aegis || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 8) * .05;
      for (const side of [-1, 1]) {
        this.voxel(base, [side * span * .63, .09, .08], [.05 * pulse, .04, 1.06], "#4edcff", .62, [0, side * .12, 0]);
      }
    }
    if ((player.buffs?.flux || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 10) * .12;
      this.voxel(base, [0, .32, .04], [.16 * pulse, .08, .72], "#a967ff", .58);
      this.voxel(base, [0, .37, -.02], [.07 * pulse, .035, .52], "#ff67d4", .82);
    }
    const debuffs = [["chill", "#70eaff"], ["jam", "#ff83d7"], ["fracture", "#ffb45f"]].filter(([id]) => (player.debuffs?.[id] || 0) > 0);
    const statusScale = 1 + clamp(player.statusFlash || 0, 0, .44) * .5;
    debuffs.forEach(([, color], statusIndex) => {
      const bandZ = .18 + statusIndex * .28;
      this.voxel(base, [0, .22 + statusIndex * .028, bandZ], [profile.bodyWidth * .9, .035 * statusScale, .08], color, .86);
    });
  }

  drawShip(player, colors, demo = false) {
    const position = demo ? [player.x, .4 + Math.sin(this.time * 1.4 + player.index) * .08, player.z] : this.toWorld(player.x, player.y, .32);
    const roll = demo ? Math.sin(this.time + player.index) * .12 : clamp(-player.vx * .006, -.3, .3);
    const pitch = demo ? -.08 : clamp(player.vy * .0018, -.11, .11);
    const frameId = player.frameId || "comet";
    const profiles = {
      comet: { scale: 1.14, bodyWidth: .46, bodyLength: 1.56, nose: 1.2, span: 1.38, wing: 1.04, armored: false, engines: [-.29, .29], tail: .31 },
      bulwark: { scale: 1.12, bodyWidth: .58, bodyLength: 1.72, nose: 1.16, span: 1.62, wing: 1.2, armored: true, engines: [-.46, .46], tail: .48 },
      pulse: { scale: 1.1, bodyWidth: .34, bodyLength: 1.86, nose: 1.34, span: 1.16, wing: .88, armored: false, engines: [0], tail: .18 },
    };
    const profile = profiles[frameId] || profiles.comet;
    const base = compose(position, [pitch, 0, roll], [profile.scale, profile.scale, profile.scale]);
    const pilotPalettes = [
      ["#3974e8", "#32d9c7", "#a66cff"],
      ["#b348c7", "#ff617d", "#ffb347"],
    ];
    const palette = pilotPalettes[player.index] || [colors.color, colors.light, "#8f72ff"];
    const flame = .52 + Math.sin(this.time * 28 + player.index) * .16;

    this.voxel(base, [0, .055, .24], [profile.bodyWidth, .21 + (profile.armored ? .035 : 0), profile.bodyLength * 1.08], palette[0], .18);
    this.voxel(base, [0, .145, -.04], [profile.bodyWidth * .68, .1, profile.bodyLength], palette[1], .2);
    this.fighterNose(base, palette, profile.nose, palette[2]);
    for (const side of [-1, 1]) this.sweptWing(base, side, palette, profile.wing, frameId === "pulse" ? .96 : .78, profile.armored);
    if (frameId === "bulwark") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .47, .075, .28], [.2, .18, 1.2], palette[2], .2);
      }
    } else if (frameId === "pulse") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .48, .06, -.5], [.34, .07, .82], palette[2], .26, [0, side * .2, 0]);
      }
    } else {
      for (const side of [-1, 1]) this.voxel(base, [side * .29, .07, .46], [.17, .16, 1], palette[2], .2);
    }
    this.tailFins(base, palette, profile.tail, frameId === "bulwark" ? .94 : frameId === "pulse" ? .8 : .88);
    for (const engineX of profile.engines) this.voxelThruster(base, engineX, 1.05, palette[1], flame, frameId === "bulwark" ? .72 : .68);
    if (!demo && player.shield > 0) {
      const shieldPulse = 1 + Math.sin(this.time * 8) * .08;
      this.voxelCage(base, profile.span * .64, "#86eaff", .55 * shieldPulse);
    }
    if (!demo) this.drawPlayerModules(player, base, palette, profile);
  }

  alienCrescent(base, palette, span = 1, rake = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .45 * span, .025, -.06], [.76 * span, .1, .3], bright, .18, [0, side * .26 * rake, 0]);
      this.voxel(base, [side * 1.02 * span, 0, .26], [.68 * span, .075, .22], dark, .16, [0, side * .48 * rake, 0]);
      this.voxel(base, [side * 1.46 * span, -.01, .57], [.42 * span, .055, .15], light, .26, [0, side * .68 * rake, 0]);
    }
  }

  alienTendril(base, side, palette, x = .5, z = .55, curl = 1, glow = null) {
    const handed = side || 1;
    for (let segment = 0; segment < 3; segment += 1) {
      const taper = 1 - segment * .22;
      const color = glow && segment === 2 ? glow : palette[segment % palette.length];
      this.voxel(base, [handed * (x + segment * .19 * curl), .02 + segment * .02, z + segment * .39], [.14 * taper, .105 * taper, .54], color, segment === 2 ? .34 : .17, [0, handed * -.2 * curl, 0]);
    }
  }

  alienEye(base, x, z, color, scale = 1) {
    this.voxel(base, [x, .25 * scale, z], [.24 * scale, .13 * scale, .3 * scale], "#5468d8", .2);
    this.voxel(base, [x, .325 * scale, z - .07], [.1 * scale, .045 * scale, .14 * scale], color, .88);
  }

  drawEnemyChassis(enemy, base, palette) {
    const type = enemy.type;
    const handed = Math.sin(Number(enemy.seed) || 1) >= 0 ? 1 : -1;
    if (type === "dart") {
      this.voxel(base, [0, .05, -.08], [.24, .17, 1.72], palette[0]);
      this.voxel(base, [0, .115, -.48], [.15, .1, 1.06], palette[1]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .22, .035, -.94], [.12, .12, .82], palette[1], 0, [0, side * .08, 0]);
        this.voxel(base, [side * .62, .005, .12 + side * handed * .08], [.78, .07, .22], side === handed ? palette[2] : palette[0], .08, [0, side * .42, 0]);
      }
      this.alienEye(base, handed * .09, -.7, palette[2], .72);
    } else if (type === "tank") {
      this.voxel(base, [0, .07, .04], [.66, .27, 1.16], palette[0]);
      this.voxel(base, [0, .21, -.08], [.48, .13, .76], palette[1]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .55, .08, .08], [.48, .2, .82], palette[0], 0, [0, side * .18, 0]);
        this.voxel(base, [side * .92, .035, .28], [.4, .13, .58], palette[1], 0, [0, side * .32, 0]);
        this.voxel(base, [side * .48, .16, -.44], [.34, .09, .42], palette[2], .18, [0, side * .16, 0]);
      }
      this.alienEye(base, handed * .22, -.47, palette[2], .9);
    } else if (type === "spinner") {
      this.voxel(base, [0, .07, 0], [.38, .22, .72], palette[0]);
      for (let arm = 0; arm < 4; arm += 1) {
        const angle = arm * Math.PI / 2 + handed * .16;
        this.voxel(base, [Math.sin(angle) * .55, .02, Math.cos(angle) * .55], [.17, .08, 1.02], arm % 2 ? palette[0] : palette[1], 0, [0, angle, 0]);
        this.voxel(base, [Math.sin(angle) * 1.02, .055, Math.cos(angle) * 1.02], [.09, .05, .48], palette[2], .36, [0, angle + handed * .35, 0]);
      }
      this.alienEye(base, 0, -.18, palette[2], .82);
    } else if (type === "mine") {
      this.voxel(base, [0, .08, -.18], [.48, .28, .82], palette[0]);
      this.voxel(base, [handed * .13, .22, -.3], [.24, .12, .42], palette[1]);
      this.alienCrescent(base, palette, .68, 1.2);
      for (const side of [-1, 1]) {
        this.alienTendril(base, side, palette, .34 + (side === handed ? .08 : 0), .38, side === handed ? 1.25 : .76, palette[2]);
      }
      this.alienEye(base, handed * .13, -.42, palette[2], .82);
    } else if (type === "lancer") {
      this.voxel(base, [0, .045, .22], [.2, .15, 1.18], palette[0]);
      for (const side of [-1, 1]) {
        const offset = side === handed ? .05 : -.04;
        this.voxel(base, [side * (.31 + offset), .035, -.72], [.13, .13, 1.64 + offset], palette[1], 0, [0, side * .035, 0]);
        this.voxel(base, [side * (.31 + offset), .045, -1.57], [.055, .055, .32], palette[2], .72);
        this.voxel(base, [side * .68, .005, .26], [.72, .065, .18], palette[0], 0, [0, side * .45, 0]);
      }
      this.alienEye(base, 0, -.42, palette[2], .76);
    } else if (type === "carrier") {
      this.voxel(base, [0, .04, .1], [.22, .17, 1.36], palette[1]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .53, .075, .03 + side * handed * .08], [.42, .2, 1.22], palette[0], 0, [0, side * .12, 0]);
        this.voxel(base, [side * .9, .025, .22], [.48, .1, .92], palette[1], 0, [0, side * .3, 0]);
        this.voxel(base, [side * 1.26, 0, .55], [.4, .065, .52], palette[0], 0, [0, side * .5, 0]);
        this.alienTendril(base, side, palette, .7, .54, side === handed ? 1.15 : .82, palette[2]);
      }
      this.voxel(base, [0, .19, -.34], [1.02, .055, .16], palette[2], .38);
      this.alienEye(base, handed * .22, -.45, palette[2], 1);
    } else {
      this.voxel(base, [0, .055, -.04], [.38, .2, 1.05], palette[0]);
      this.voxel(base, [0, .13, -.38], [.26, .1, .55], palette[1]);
      this.alienCrescent(base, palette, .82, 1);
      this.alienEye(base, handed * .08, -.5, palette[2], .78);
    }
  }

  drawIntegratedEnemyModules(enemy, base, palette, moduleColor) {
    const flame = .38 + Math.sin(this.time * 18 + enemy.seed) * .1;
    const handed = Math.sin(Number(enemy.seed) || 1) >= 0 ? 1 : -1;
    if (enemy.movementModule === "weave") {
      for (const side of [-1, 1]) this.alienTendril(base, side, palette, .42, .48, side === handed ? 1.08 : .78, moduleColor);
    } else if (enemy.movementModule === "rush") {
      this.voxel(base, [0, .08, .72], [.25, .13, .88], palette[2], .2);
      for (const side of [-1, 1]) this.voxelThruster(base, side * .2, 1.12, moduleColor, .7 + flame, .46);
    } else if (enemy.movementModule === "drift") {
      this.alienTendril(base, handed, palette, .52, .45, 1.28, moduleColor);
      this.voxelThruster(base, handed * .56, 1.2, moduleColor, flame, .5);
    } else {
      for (const side of [-1, 1]) this.voxelThruster(base, side * .24, .94, moduleColor, flame, .48);
    }

    if (enemy.weaponModule === "twin") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .3, .08, -.82], [.11, .11, 1.12], palette[1], .18, [0, side * .06, 0]);
        this.voxel(base, [side * .3, .11, -1.4], [.055, .045, .24], moduleColor, .86);
      }
    } else if (enemy.weaponModule === "sniper") {
      this.voxel(base, [0, .09, -1], [.14, .12, 1.58], palette[2], .22);
      this.voxel(base, [0, .12, -1.84], [.055, .045, .3], moduleColor, .9);
    } else if (enemy.weaponModule === "orbit") {
      for (const side of [-1, 1]) this.voxel(base, [side * .7, .1, -.24], [.88, .075, .17], side === handed ? moduleColor : palette[2], .34, [0, side * .35, 0]);
    } else {
      this.voxel(base, [0, .08, -.92], [.12, .1, .8], palette[1], .18);
      this.voxel(base, [0, .11, -1.36], [.055, .045, .16], moduleColor, .88);
    }

    if (enemy.coreModule === "plated") {
      for (const side of [-1, 1]) this.voxel(base, [side * .28, .2, .08], [.36, .11, .82], side === handed ? palette[2] : palette[0], .2, [0, side * .12, 0]);
    } else if (enemy.coreModule === "barrier") {
      for (const side of [-1, 1]) this.voxel(base, [side * .44, .17, .02], [.05, .045, 1.2], moduleColor, .68, [0, side * .13, 0]);
      if (enemy.moduleBarrier > 0) {
        const pulse = 1 + Math.sin(this.time * 9 + enemy.seed) * .04;
        this.voxel(base, [0, .44, -.26], [1.3 * pulse, .035, .07], moduleColor, 1);
      }
    } else if (enemy.coreModule === "volatile") {
      const pulse = 1 + Math.sin(this.time * 10 + enemy.seed) * .12;
      this.voxel(base, [0, .22, .08], [.4 * pulse, .15, .58], palette[2], .22);
      this.voxel(base, [0, .3, .04], [.2 * pulse, .06, .38], moduleColor, .86);
    } else {
      this.voxel(base, [0, .23, -.02], [.3, .11, .5], moduleColor, .48);
    }

    if (enemy.aiModule === "hunter") {
      for (const side of [-1, 1]) this.alienEye(base, side * .16, -.5, "#ff4f70", .58);
    } else if (enemy.aiModule === "flanker") {
      this.alienEye(base, handed * .38, -.38, "#ffcf6e", .75);
      this.voxel(base, [handed * .72, .13, -.14], [.5, .04, .42], "#ffcf6e", .72, [0, handed * .3, 0]);
    } else if (enemy.aiModule === "oracle") {
      this.voxel(base, [0, .35, -.14], [.46, .07, .56], palette[2], .24);
      this.voxel(base, [0, .4, -.35], [.3, .035, .22], moduleColor, .9);
    } else {
      this.alienEye(base, handed * .07, -.42, "#fff5b5", .62);
    }

    if (enemy.payloadModule === "cryo") {
      for (const side of [-1, 1]) this.voxel(base, [side * .42, .13, .57], [.07, .045, .66], "#70eaff", .74, [0, side * .14, 0]);
    } else if (enemy.payloadModule === "glitch") {
      const color = Math.floor(this.time * 14 + enemy.seed) % 2 ? "#ff83d7" : "#7f8cff";
      this.voxel(base, [handed * .14, .18, .55], [.82, .04, .08], color, .82, [0, handed * .14, 0]);
    } else if (enemy.payloadModule === "fracture") {
      for (const side of [-1, 1]) this.voxel(base, [side * .5, .15, .44], [.08, .045, .5], "#ff9d4f", .8, [0, side * .2, 0]);
    }
  }

  drawEnemy(enemy) {
    const position = this.toWorld(enemy.x, enemy.y, .32);
    const enemyScale = (enemy.elite ? 1.3 : 1.06) * (enemy.moduleScale || 1);
    const spin = enemy.type === "spinner" ? Math.sin(enemy.age * 2) * .08 : 0;
    const base = compose(position, [0, Math.PI + spin, Math.sin(enemy.age * 2 + enemy.seed) * .04], [enemyScale, enemyScale, enemyScale]);
    if (enemy.boss) {
      this.drawBoss(enemy, base);
      return;
    }
    const palettes = {
      scout: ["#6254d9", "#a86cff", "#ffd454"],
      dart: ["#cf4777", "#ff6b60", "#ffc857"],
      tank: ["#7b4bd7", "#e85a9f", "#ffb64f"],
      spinner: ["#477ddd", "#8d70ff", "#51e1ff"],
      mine: ["#9848d0", "#ef59c8", "#6ee7ff"],
      lancer: ["#2d89d0", "#3fe0d0", "#ffd64f"],
      carrier: ["#784fd0", "#e75d9e", "#ffcb55"],
    };
    const palette = palettes[enemy.type] || palettes.scout;
    const moduleColor = enemy.moduleColor || "#7fffe2";
    this.drawEnemyChassis(enemy, base, palette);
    this.drawIntegratedEnemyModules(enemy, base, palette, moduleColor);
    if (enemy.elite) {
      this.voxel(base, [0, .49, -.18], [1.45, .035, .07], "#fff1a0", 1);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .68, .24, .08], [.055, .34, .5], "#fff1a0", .82, [side * -.2, 0, 0]);
        this.voxel(base, [side * .96, .12, .32], [.3, .035, .28], "#fff1a0", .62, [0, side * .4, 0]);
      }
    }
    if (enemy.hitFlash > 0) {
      this.voxel(base, [0, .46, -.2], [.92, .035, .07], "#7fffe2", 1);
      this.voxel(base, [0, .46, .32], [.64, .03, .055], "#ff73bd", 1);
    }
  }

  drawBoss(enemy, base) {
    const stage = this.stageIndex;
    const pulse = .5 + Math.sin(this.time * 6) * .5;
    const palettes = enemy.hitFlash > 0 ? ["#72eaff", "#ff73bd", "#ffe15d"] : [["#824fcf", "#f261aa", "#ffbd58"], ["#327fd0", "#52d9b8", "#f3cf4f"], ["#7540c8", "#d94d9a", "#ff596f"]][stage];
    const scale = [1.12, 1.24, 1.36][stage];
    const bossBase = multiply(base, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    const handed = Math.sin(Number(enemy.seed) || 1) >= 0 ? 1 : -1;
    if (stage === 0) {
      this.voxel(bossBase, [0, .08, .02], [.7, .3, 2.1], palettes[0]);
      this.voxel(bossBase, [0, .27, -.34], [.48, .12, 1.05], palettes[1]);
      this.alienCrescent(bossBase, palettes, 1.48, 1.12);
      for (const side of [-1, 1]) {
        this.voxel(bossBase, [side * .5, .08, -1.18], [.15, .15, 1.08], palettes[1], 0, [0, side * .09, 0]);
        this.alienTendril(bossBase, side, palettes, .8, .7, side === handed ? 1.2 : .85, palettes[2]);
      }
    } else if (stage === 1) {
      this.voxel(bossBase, [0, .06, -.08], [.46, .22, 2.5], palettes[0]);
      this.alienCrescent(bossBase, palettes, 1.72, 1.34);
      for (const side of [-1, 1]) {
        this.voxel(bossBase, [side * .34, .08, -1.32], [.13, .13, 1.16], palettes[1], 0, [0, side * .12, 0]);
        this.voxel(bossBase, [side * 1.35, .2, .05], [.09, .38, 1.12], palettes[2], .58, [side * -.2, side * .18, 0]);
        this.alienTendril(bossBase, side, palettes, .62, .78, side === handed ? 1.35 : .72, palettes[2]);
      }
    } else {
      for (const side of [-1, 1]) {
        this.voxel(bossBase, [side * .48, .08, -.22], [.52, .28, 2.18], palettes[0], 0, [0, side * .1, 0]);
        this.voxel(bossBase, [side * .3, .14, -1.22], [.17, .14, 1.18], palettes[1], 0, [0, side * .08, 0]);
        this.voxel(bossBase, [side * 1.2, .02, .12], [1.12, .09, .24], palettes[1], 0, [0, side * .54, 0]);
        this.voxel(bossBase, [side * 1.86, .1, .52], [.7, .07, .16], palettes[2], .64, [0, side * .76, 0]);
        this.alienTendril(bossBase, side, palettes, .82, .7, side === handed ? 1.4 : .92, "#c183ff");
      }
      this.voxel(bossBase, [0, .32, -.15], [.16, .42, 1.52], "#c183ff", .72);
    }
    this.alienEye(bossBase, handed * .16, -.72, palettes[2], 1.35 + pulse * .08);
    this.voxel(bossBase, [0, .44, -.18], [.76 + pulse * .08, .055, .64], palettes[2], .85);
    for (const side of [-1, 1]) this.voxelThruster(bossBase, side * .42, 1.24, palettes[2], .72 + pulse * .2, .72);
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
        this.voxel(base, [0, 0, size * 2.5], [size * .28, size * .28, size * 2.2], bullet.payloadColor || "#ffd454", .76);
      } else if (bullet.weaponModule === "orbit") {
        this.voxel(base, [0, 0, 0], [size * 2.4, size, size], color, 1, [0, bullet.age * 5, 0]);
        this.voxel(base, [0, 0, 0], [size, size, size * 2.4], color, 1, [0, bullet.age * 5, 0]);
      } else if (bullet.weaponModule === "twin") {
        this.voxel(base, [-size, 0, 0], [size * .75, size, size * 1.8], color, 1);
        this.voxel(base, [size, 0, 0], [size * .75, size, size * 1.8], color, 1);
      } else this.voxel(base, [0, 0, 0], [size, size, size * 1.55], color, 1);
      if (bullet.payloadModule !== "clean") {
        const payloadColor = bullet.payloadColor || color;
        this.voxel(base, [0, 0, size * 1.35], [size * .7, size * .7, size * .7], payloadColor, .82);
      }
    } else {
      const base = compose(position, rotation);
      if (bullet.phaseBarrier) {
        this.voxel(base, [0, 0, 0], [.11, .08, .72], "#58dfff", 1);
        this.voxel(base, [0, .01, -.34], [.18, .06, .18], bullet.color, .85);
      } else if ((bullet.seeker || 0) > 0) {
        this.voxel(base, [0, 0, -.04], [.08, .08, .46], bullet.color, 1);
        this.voxel(base, [0, 0, .2], [.24, .05, .16], "#a96cff", .82);
      } else if ((bullet.r || 0) > 2.35) {
        this.voxel(base, [0, 0, 0], [.11, .11, .52], bullet.color, 1);
        this.voxel(base, [0, .01, -.32], [.065, .065, .2], "#ffd454", .82);
      } else {
        this.voxel(base, [0, 0, 0], [.07, .07, .42], bullet.color, 1);
        this.voxel(base, [0, 0, .26], [.12, .04, .13], "#8d70ff", .7);
      }
    }
  }

  drawPickup(pickup) {
    const position = this.toWorld(pickup.x, pickup.y, .65 + Math.sin(pickup.age * 5) * .12);
    const colors = { weapon: "#ffe36d", repair: "#78f5aa", shield: "#76dbff", energy: "#bc86ff" };
    const color = colors[pickup.type];
    const base = compose(position, [0, pickup.age * 1.2, 0]);
    this.voxel(base, [0, 0, 0], [.34, .34, .34], "#5865d8", .24);
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
    this.voxelHalo(base, .55, 0, color, 5, .75, pickup.age, .055);
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
    this.rimLight.intensity = this.quality === "low" ? 1.45 : 2.6;
    this.renderer.shadowMap.enabled = false;
    for (const batch of this.toonBatches.values()) batch.castShadow = false;
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
