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
    this.canvas.dataset.worldDepthLayers = "3";
    this.canvas.dataset.biomeDioramas = "9";
    this.canvas.dataset.projectileVfx = "segmented-toon-trails";
    this.canvas.dataset.modelFamilies = "3-player-7-alien";
    this.canvas.dataset.moduleAnatomy = "integrated-large-form";
    this.canvas.dataset.bossFamilies = "3-organic-phase-forms";
    this.canvas.dataset.bossChoreography = "telegraph-state-arena";
    this.canvas.dataset.expeditionSectors = "9-progressive-voxel-gates";
    this.canvas.dataset.adaptiveThreat = "5-tier-telegraphed";
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

  streamZ(slot, spacing = 5.2, speed = 2.8, far = -30, count = 9) {
    const span = spacing * count;
    return far + ((slot * spacing + this.time * speed) % span);
  }

  drawFlightCorridor(biome) {
    const accent = biome?.accent || "#7fffe2";
    const secondary = biome?.secondary || "#ffcf6e";
    for (let slot = 0; slot < 9; slot += 1) {
      const z = this.streamZ(slot, 5.1, 3.05, -31, 9);
      for (const side of [-1, 1]) {
        const base = compose([side * 8.15, -.42, z]);
        this.voxel(base, [0, .34, 0], [.18, .74, .88], slot % 2 ? accent : secondary, .28);
        this.voxel(base, [side * -.32, .68, 0], [.58, .12, .44], secondary, .66);
        this.voxel(base, [side * -.62, .02, 0], [.76, .035, .13], accent, .74, [0, side * .42, 0]);
      }
      const marker = compose([0, -.47, z]);
      for (const side of [-1, 1]) this.voxel(marker, [side * 2.8, .02, 0], [.78, .025, .1], slot % 2 ? secondary : accent, .58, [0, side * .55, 0]);
    }
  }

  voxelFlower(base, accent, secondary, scale = 1) {
    this.voxel(base, [0, .45 * scale, 0], [.08 * scale, .9 * scale, .08 * scale], secondary, .25);
    this.voxel(base, [0, .98 * scale, 0], [.28 * scale, .24 * scale, .28 * scale], accent, .78);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .3 * scale, .98 * scale, 0], [.22 * scale, .14 * scale, .22 * scale], secondary, .55);
      this.voxel(base, [0, .98 * scale, side * .3 * scale], [.22 * scale, .14 * scale, .22 * scale], accent, .48);
    }
  }

  voxelCrystal(base, accent, secondary, height = 1.8) {
    this.voxel(base, [0, height * .36, 0], [.42, height * .72, .42], accent, .34, [0, .12, .08]);
    this.voxel(base, [-.42, height * .2, .18], [.24, height * .42, .24], secondary, .5, [0, -.22, -.12]);
    this.voxel(base, [.42, height * .16, -.12], [.2, height * .34, .2], "#dffcff", .72, [0, .28, .15]);
  }

  voxelCoral(base, accent, secondary, scale = 1) {
    this.voxel(base, [0, .34 * scale, 0], [.26 * scale, .68 * scale, .26 * scale], accent, .28);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .3 * scale, .58 * scale, 0], [.34 * scale, .16 * scale, .22 * scale], secondary, .44, [0, 0, side * .42]);
      this.voxel(base, [side * .5 * scale, .79 * scale, 0], [.12 * scale, .44 * scale, .12 * scale], accent, .62);
    }
  }

  voxelTree(base, accent, secondary, scale = 1) {
    this.voxel(base, [0, .66 * scale, 0], [.16 * scale, 1.32 * scale, .16 * scale], secondary, .24);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .42 * scale, 1.12 * scale, 0], [.72 * scale, .12 * scale, .18 * scale], secondary, .38, [0, 0, side * .42]);
      this.voxel(base, [side * .72 * scale, 1.38 * scale, 0], [.24 * scale, .42 * scale, .24 * scale], accent, .76);
    }
    this.voxel(base, [0, 1.66 * scale, 0], [.34 * scale, .34 * scale, .34 * scale], accent, .68);
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
        this.voxel(base, [side * span * .34, .105, -.32], [.18, .09, .72], "#ffd94a", .38, [0, side * .06, 0]);
        this.voxel(base, [side * span * .34, .115, -.72], [.09 * flash, .06 * flash, .22], "#ff8a4c", .88, [0, side * .06, 0]);
      }
    }
    if ((player.buffs?.nanobloom || 0) > 0) {
      this.voxel(base, [0, .25, .48], [.18, .07, .68], "#58e890", .5);
      this.voxel(base, [0, .29, .46], [.08, .035, .52], "#b8ff6a", .76);
    }
    if ((player.buffs?.aegis || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 8) * .05;
      for (const side of [-1, 1]) {
        this.voxel(base, [side * span * .57, .075, .18], [.14 * pulse, .055, .82], "#4edcff", .62, [0, side * .18, 0]);
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
      comet: { scale: 1.13, bodyWidth: .42, bodyLength: 1.72, nose: 1.27, span: 1.4, wing: 1.06, armored: false, engines: [-.27, .27], tail: .29 },
      bulwark: { scale: 1.1, bodyWidth: .49, bodyLength: 1.94, nose: 1.29, span: 1.58, wing: 1.18, armored: true, engines: [-.4, .4], tail: .42 },
      pulse: { scale: 1.08, bodyWidth: .3, bodyLength: 2.04, nose: 1.44, span: 1.14, wing: .86, armored: false, engines: [0], tail: .17 },
    };
    const profile = profiles[frameId] || profiles.comet;
    const base = compose(position, [pitch, player.galleryYaw || 0, roll], [profile.scale, profile.scale, profile.scale]);
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
        this.voxel(base, [side * .42, .07, .32], [.18, .15, 1.32], palette[2], .2);
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
      this.voxel(base, [handed * (x + segment * .22 * curl), .03 + segment * .025, z + segment * .36], [.2 * taper, .13 * taper, .62], color, segment === 2 ? .4 : .18, [0, handed * -.2 * curl, 0]);
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
      this.voxel(base, [0, .07, .02], [.52, .24, 1.46], palette[0]);
      this.voxel(base, [0, .2, -.18], [.4, .13, .88], palette[1]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .48, .075, .1], [.38, .18, 1.02], palette[0], 0, [0, side * .15, 0]);
        this.voxel(base, [side * .82, .035, .32], [.34, .12, .72], palette[1], 0, [0, side * .28, 0]);
        this.voxel(base, [side * .43, .15, -.52], [.3, .1, .5], palette[2], .2, [0, side * .14, 0]);
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
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .64, .055, .58], [.76, .15, .72], side === handed ? palette[2] : palette[0], .2, [0, side * .48, 0]);
        this.voxel(base, [side * 1.04, .07, .86], [.5, .11, .44], moduleColor, .56, [0, side * .66, 0]);
      }
    } else if (enemy.movementModule === "rush") {
      this.voxel(base, [0, .11, .66], [.46, .22, 1.02], palette[2], .22);
      for (const side of [-1, 1]) this.voxelThruster(base, side * .27, 1.08, moduleColor, .7 + flame, .7);
    } else if (enemy.movementModule === "drift") {
      this.voxel(base, [handed * .62, .08, .48], [.9, .17, .82], palette[2], .22, [0, handed * .5, 0]);
      this.voxel(base, [handed * 1.05, .09, .76], [.48, .12, .5], moduleColor, .56, [0, handed * .66, 0]);
      this.voxelThruster(base, handed * .64, 1.06, moduleColor, flame, .68);
    } else {
      this.voxel(base, [0, .06, .58], [.56, .16, .62], palette[0], .16);
      for (const side of [-1, 1]) this.voxelThruster(base, side * .28, .96, moduleColor, flame, .62);
    }

    if (enemy.weaponModule === "twin") {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .34, .1, -.74], [.22, .16, 1.18], palette[1], .2, [0, side * .07, 0]);
        this.voxel(base, [side * .35, .13, -1.38], [.12, .09, .28], moduleColor, .88);
      }
    } else if (enemy.weaponModule === "sniper") {
      this.voxel(base, [0, .1, -1], [.25, .17, 1.64], palette[2], .24);
      this.voxel(base, [0, .14, -1.88], [.13, .09, .34], moduleColor, .92);
    } else if (enemy.weaponModule === "orbit") {
      for (const side of [-1, 1]) this.voxel(base, [side * .7, .1, -.26], [.9, .14, .28], side === handed ? moduleColor : palette[2], .38, [0, side * .36, 0]);
    } else {
      this.voxel(base, [0, .1, -.88], [.24, .16, .88], palette[1], .2);
      this.voxel(base, [0, .14, -1.37], [.13, .09, .22], moduleColor, .9);
    }

    if (enemy.coreModule === "plated") {
      for (const side of [-1, 1]) this.voxel(base, [side * .3, .22, .08], [.42, .18, .94], side === handed ? palette[2] : palette[0], .22, [0, side * .12, 0]);
      this.voxel(base, [0, .31, -.18], [.34, .12, .72], palette[1], .28);
    } else if (enemy.coreModule === "barrier") {
      for (const side of [-1, 1]) this.voxel(base, [side * .46, .19, .02], [.18, .13, 1.16], moduleColor, .68, [0, side * .13, 0]);
      if (enemy.moduleBarrier > 0) {
        const pulse = 1 + Math.sin(this.time * 9 + enemy.seed) * .04;
        this.voxel(base, [0, .43, -.24], [1.18 * pulse, .09, .16], moduleColor, 1);
      }
    } else if (enemy.coreModule === "volatile") {
      const pulse = 1 + Math.sin(this.time * 10 + enemy.seed) * .12;
      this.voxel(base, [0, .22, .08], [.4 * pulse, .15, .58], palette[2], .22);
      this.voxel(base, [0, .3, .04], [.2 * pulse, .06, .38], moduleColor, .86);
    } else {
      this.voxel(base, [0, .23, -.02], [.3, .11, .5], moduleColor, .48);
    }

    if (enemy.aiModule === "hunter") {
      for (const side of [-1, 1]) this.alienEye(base, side * .2, -.5, "#ff4f70", .68);
    } else if (enemy.aiModule === "flanker") {
      this.alienEye(base, handed * .38, -.38, "#ffcf6e", .75);
      this.voxel(base, [handed * .7, .15, -.12], [.56, .13, .48], "#ffcf6e", .72, [0, handed * .3, 0]);
    } else if (enemy.aiModule === "oracle") {
      this.voxel(base, [0, .36, -.14], [.54, .15, .62], palette[2], .26);
      this.voxel(base, [0, .45, -.36], [.32, .08, .24], moduleColor, .9);
    } else {
      this.alienEye(base, handed * .07, -.42, "#fff5b5", .62);
    }

    if (enemy.payloadModule === "cryo") {
      for (const side of [-1, 1]) this.voxel(base, [side * .48, .14, .56], [.22, .13, .72], "#70eaff", .74, [0, side * .16, 0]);
    } else if (enemy.payloadModule === "glitch") {
      const color = Math.floor(this.time * 14 + enemy.seed) % 2 ? "#ff83d7" : "#7f8cff";
      this.voxel(base, [handed * .18, .19, .54], [.84, .13, .2], color, .82, [0, handed * .14, 0]);
    } else if (enemy.payloadModule === "fracture") {
      for (const side of [-1, 1]) this.voxel(base, [side * .52, .16, .42], [.24, .14, .56], "#ff9d4f", .8, [0, side * .22, 0]);
    }
  }

  drawEnemy(enemy) {
    const position = this.toWorld(enemy.x, enemy.y, .32);
    const perspectiveBoost = 1 + clamp((this.height * .48 - enemy.y) / this.height, 0, .14);
    const enemyScale = (enemy.elite ? 1.34 : 1.12) * perspectiveBoost * (enemy.moduleScale || 1);
    const spin = enemy.type === "spinner" ? Math.sin(enemy.age * 2) * .08 : 0;
    const galleryScale = enemy.galleryScale || 1;
    const base = compose(position, [0, Math.PI + spin + (enemy.galleryYaw || 0), Math.sin(enemy.age * 2 + enemy.seed) * .04], [enemyScale * galleryScale, enemyScale * galleryScale, enemyScale * galleryScale]);
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

  drawBossBloom(enemy, base, palette) {
    const phase = enemy.phaseLevel || 1;
    const pulse = 1 + Math.sin(this.time * 6) * .08;
    this.voxel(base, [0, .1, -.05], [.68, .3, 2.35], palette[0], .18);
    this.voxel(base, [0, .27, -.55], [.48, .16, 1.08], palette[1], .28);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .72, .06, -.08], [1.08, .18, .88], palette[1], .18, [0, side * .32, 0]);
      this.voxel(base, [side * 1.52, .04, .42], [.86, .14, .68], palette[0], .2, [0, side * .58, 0]);
      this.voxel(base, [side * 2.05, .07, .86], [.56, .12, .5], palette[2], .52, [0, side * .76, 0]);
      if (phase >= 2) this.voxel(base, [side * .94, .25, .42], [.64, .18, .92], palette[2], .42, [0, side * .34, side * -.08]);
      if (phase >= 3) this.voxel(base, [side * 1.58, .22, -.38], [.72, .16, .46], "#ff6fd4", .68, [0, side * .48, 0]);
      this.voxelThruster(base, side * .42, 1.32, palette[2], .72 + pulse * .18, .88);
    }
    this.voxel(base, [0, .42, -.26], [.72 * pulse, .22, .72], palette[2], .72);
    this.alienEye(base, 0, -.86, "#fff08a", 1.34);
  }

  drawBossForge(enemy, base, palette) {
    const phase = enemy.phaseLevel || 1;
    const pulse = 1 + Math.sin(this.time * 7.5) * .07;
    this.voxel(base, [0, .08, -.16], [.5, .28, 2.82], palette[0], .18);
    this.voxel(base, [0, .2, -1.28], [.28, .18, 1.24], palette[2], .5);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .62, .08, .08], [.78, .26, 2.06], palette[1], .2, [0, side * .16, 0]);
      this.voxel(base, [side * 1.16, .1, .48], [.62, .2, 1.36], palette[0], .18, [0, side * .34, 0]);
      this.voxel(base, [side * 1.62, .15, -.34], [.68, .18, .7], palette[2], .58, [0, side * .48, 0]);
      if (phase >= 2) this.voxel(base, [side * 1.18, .48, .14], [.32, .7, .86], "#ffe45c", .58, [side * -.16, side * .12, 0]);
      if (phase >= 3) this.voxel(base, [side * 1.84, .28, .5], [.54, .38, .78], "#ff6a70", .64, [side * -.12, side * .42, 0]);
      this.voxelThruster(base, side * .7, 1.35, palette[2], .75 + pulse * .18, .94);
    }
    this.voxel(base, [0, .45, -.34], [.68 * pulse, .24, .82], "#ffe45c", .78);
    this.alienEye(base, 0, -.98, "#fff7c2", 1.42);
  }

  drawBossVoid(enemy, base, palette) {
    const phase = enemy.phaseLevel || 1;
    const pulse = 1 + Math.sin(this.time * 8.5) * .09;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .54, .1, -.18], [.58, .3, 2.5], palette[0], .2, [0, side * .1, 0]);
      this.voxel(base, [side * .38, .2, -1.3], [.28, .2, 1.02], palette[1], .28, [0, side * .08, 0]);
      this.voxel(base, [side * 1.15, .07, .02], [1.18, .2, .48], palette[1], .22, [0, side * .52, 0]);
      this.voxel(base, [side * 1.92, .1, .52], [.76, .16, .42], palette[2], .6, [0, side * .72, 0]);
      if (phase >= 2) this.voxel(base, [side * .92, .43, -.34], [.46, .62, .78], "#c98aff", .62, [side * -.18, side * .18, 0]);
      if (phase >= 3) this.voxel(base, [side * 1.62, .34, -.46], [.72, .22, .62], "#ff5f86", .72, [0, side * .58, side * -.08]);
      this.voxelThruster(base, side * .5, 1.46, palette[2], .78 + pulse * .2, .98);
    }
    this.voxel(base, [0, .34, -.22], [.38, .52, 1.62], "#c98aff", .62);
    this.voxel(base, [0, .56, -.54], [.68 * pulse, .22, .7], palette[2], .82);
    this.alienEye(base, 0, -.98, "#ffd3f2", 1.48);
  }

  drawBossTelegraph(enemy, base, palette, stage) {
    if (enemy.attackState !== "telegraph") return;
    const charge = clamp(enemy.attackCharge || 0, 0, 1);
    const phase = enemy.phaseLevel || 1;
    const color = ["#ffca58", "#70eaff", "#c98aff"][stage];
    const pulse = .82 + charge * .48 + Math.sin(this.time * (10 + phase * 2)) * .08;
    this.voxelHalo(base, 1.7 + charge * .56, .34, color, 6 + phase * 2, 1.25 + stage * .24, stage * .7, .1 + charge * .06);
    this.voxel(base, [0, .7, -.42], [.62 * pulse, .2 * pulse, .72 * pulse], color, .92);
    const aimed = ["sunLance", "railWall", "thunderFan", "doubleRail", "voidPincer"].includes(enemy.attackId);
    const radial = ["petalBurst", "seedSpiral", "twinBloom", "forgeCross", "spiralCrown", "eclipseTwin", "tripleEclipse"].includes(enemy.attackId);
    if (aimed) {
      for (const side of [-1, 0, 1]) this.voxel(base, [side * (.42 + stage * .08), .4, -1.72], [.12 + charge * .08, .1 + charge * .06, 1.78], side ? palette[2] : color, .72 + charge * .24, [0, side * .1, 0]);
    }
    if (radial) {
      for (const side of [-1, 1]) this.voxel(base, [side * (1.2 + charge * .45), .34, -.28], [.78, .12 + charge * .06, .32], side > 0 ? color : palette[1], .7 + charge * .25, [0, side * (.48 + charge * .2), 0]);
    }
  }

  drawBossArena(boss) {
    const stage = this.stageIndex;
    const colors = [["#ff72ac", "#ffca58"], ["#70eaff", "#ffe45c"], ["#c183ff", "#ff6680"]][stage];
    const charge = boss.attackState === "telegraph" ? clamp(boss.attackCharge || 0, 0, 1) : 0;
    for (let row = 0; row < 6; row += 1) {
      const z = this.streamZ(row, 5.8, boss.attackState === "telegraph" ? 4.2 : 2.2, -30, 6);
      for (const side of [-1, 1]) {
        const base = compose([side * 7.65, -.45, z]);
        this.voxel(base, [0, .42, 0], [.2 + charge * .08, .84 + charge * .34, .58], colors[(row + stage) % 2], .34 + charge * .42);
        this.voxel(base, [side * -.34, .92, 0], [.58, .13 + charge * .05, .46], colors[(row + stage + 1) % 2], .62 + charge * .3);
      }
    }
    if (boss.attackState === "telegraph") {
      const target = this.toWorld(boss.attackTargetX || this.width / 2, this.height - 62, .16);
      for (let segment = 0; segment < 5; segment += 1) this.voxel(compose(target), [0, .04, -segment * 1.25], [.34 + charge * .18, .04, .72], colors[segment % 2], .58 + charge * .38);
    }
  }

  drawBoss(enemy, base, stageOverride = this.stageIndex) {
    const stage = clamp(stageOverride, 0, 2);
    const palettes = enemy.hitFlash > 0 ? ["#72eaff", "#ff73bd", "#ffe15d"] : [["#7b58d7", "#f05aa9", "#ffca58"], ["#357bd8", "#48d8c6", "#ffe45c"], ["#754ed0", "#d950a6", "#ff6680"]][stage];
    const scale = [1.08, 1.15, 1.22][stage];
    const bossBase = multiply(base, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    if (stage === 0) this.drawBossBloom(enemy, bossBase, palettes);
    else if (stage === 1) this.drawBossForge(enemy, bossBase, palettes);
    else this.drawBossVoid(enemy, bossBase, palettes);
    this.drawBossTelegraph(enemy, bossBase, palettes, stage);
    if (enemy.phaseShield > 0) this.voxelCage(bossBase, 2.45 + Math.sin(this.time * 12) * .04, palettes[2], 1.15);
  }

  drawBossGallery(world) {
    const phaseLevel = world.bossGalleryPhase || 3;
    const layout = [[100, 106, -.12], [240, 99, 0], [380, 106, .12]];
    layout.forEach(([x, y, yaw], stage) => {
      const base = compose(this.toWorld(x, y, .34), [0, Math.PI + yaw, 0], [1.18, 1.18, 1.18]);
      const attackIds = [["petalBurst", "seedSpiral", "twinBloom"], ["railWall", "forgeCross", "doubleRail"], ["spiralCrown", "eclipseTwin", "tripleEclipse"]];
      this.drawBoss({ phaseLevel, phaseShield: phaseLevel === 2 ? 1 : 0, hitFlash: 0, seed: stage + 1, attackState: "telegraph", attackCharge: .82, attackId: attackIds[stage][phaseLevel - 1] }, base, stage);
      this.drawProjectile({
        x,
        y: 181,
        vx: 0,
        vy: 42,
        r: 3.2,
        age: this.time,
        color: ["#ff72ac", "#70eaff", "#c183ff"][stage],
        payloadColor: ["#ffca58", "#ffe45c", "#ff6680"][stage],
        bossStage: stage,
        bossPhase: phaseLevel,
      }, true);
    });
    this.canvas.dataset.bossGallery = `phase-${phaseLevel}`;
  }

  drawModelGallery(world, playerConfigs) {
    const frames = ["comet", "bulwark", "pulse"];
    frames.forEach((frameId, index) => {
      this.drawShip({
        index: index % 2,
        frameId,
        x: -4.8 + index * 4.8,
        z: 3.25 + Math.abs(index - 1) * .25,
        galleryYaw: (index - 1) * .13,
      }, playerConfigs[index % 2], true);
    });
    const moduleSets = [
      ["scout", "standard", "pulse", "light", "sentry", "clean"],
      ["dart", "rush", "twin", "volatile", "hunter", "fracture"],
      ["tank", "drift", "pulse", "plated", "flanker", "cryo"],
      ["spinner", "weave", "orbit", "barrier", "oracle", "glitch"],
      ["mine", "drift", "orbit", "volatile", "flanker", "cryo"],
      ["lancer", "rush", "sniper", "light", "hunter", "fracture"],
      ["carrier", "weave", "twin", "plated", "oracle", "glitch"],
    ];
    const moduleColors = ["#ffd454", "#ff6b60", "#70eaff", "#a96cff", "#ff83d7", "#ffb45f", "#63e6a8"];
    const layout = [[76, 68], [185, 68], [295, 68], [404, 68], [130, 116], [240, 116], [350, 116]];
    moduleSets.forEach(([type, movementModule, weaponModule, coreModule, aiModule, payloadModule], index) => {
      const [x, y] = layout[index];
      this.drawEnemy({
        x,
        y,
        type,
        movementModule,
        weaponModule,
        coreModule,
        aiModule,
        payloadModule,
        moduleColor: moduleColors[index],
        moduleBarrier: coreModule === "barrier" ? 4 : 0,
        seed: index + 1,
        age: this.time * .25,
        moduleScale: 1,
        galleryScale: 1.24,
        galleryYaw: (index % 4 - 1.5) * .1,
        hitFlash: 0,
        elite: false,
        boss: false,
      });
    });
    this.canvas.dataset.modelGallery = "active";
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

  drawSectorArchitecture(world, stage) {
    const sector = clamp(world.sectorIndex || 0, 0, 2);
    const accent = stage.biome?.accent || stage.accent;
    const secondary = stage.biome?.secondary || stage.star;
    const speed = 2.45 + sector * .62;
    for (let gate = 0; gate < 3 + sector; gate += 1) {
      const z = this.streamZ(gate, 10.5 - sector * .7, speed, -36, 3 + sector);
      const color = (gate + sector) % 2 ? accent : secondary;
      const base = compose([0, -.46, z]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * 7.25, 1.2, 0], [.2 + sector * .035, 2.4, .38], color, .28 + sector * .1);
        this.voxel(base, [side * 5.55, 3.12, 0], [3.25, .18 + sector * .03, .38], color, .55 + sector * .1, [0, 0, side * .08]);
      }
      this.voxel(base, [0, 3.38, 0], [3.35, .14, .34], secondary, .48 + sector * .12);
    }
    if ((world.sectorFlashTimer || 0) > 0) {
      const remaining = clamp(world.sectorFlashTimer / 1.45, 0, 1);
      const approach = 1 - remaining;
      const portal = compose([0, -.46, lerp(-16, -1.2, approach)]);
      const pulse = 1 + Math.sin(this.time * 18) * .08;
      for (const side of [-1, 1]) {
        this.voxel(portal, [side * 5.7, 2.1, 0], [.26 * pulse, 4.2, .62], side > 0 ? accent : secondary, .92);
        this.voxel(portal, [side * 3.05, 4.02, 0], [5.4, .24 * pulse, .62], side > 0 ? secondary : accent, .95, [0, 0, side * .08]);
      }
      this.voxel(portal, [0, 4.32, 0], [1.1 + sector * .32, .18, .62], "#ffffff", 1);
    }
  }

  drawThreatMatrix(world) {
    const colors = ["#68f4df", "#76dbff", "#ffe16c", "#ff936b", "#ff67d4"];
    const tier = clamp(Number(world.threatTier) || 0, 0, 4);
    const color = colors[tier];
    const pulseTimer = clamp(Number(world.threatPulseTimer) || 0, 0, 1.1);
    const pulse = 1 + pulseTimer * .12 + Math.sin(this.time * 12) * .025;
    for (let marker = 0; marker < 4; marker += 1) {
      const z = this.streamZ(marker, 7.4, 3.25 + tier * .13, -34, 4);
      const base = compose([0, -.47, z]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * 6.45, .46, 0], [.12, .92, .18], color, .38 + tier * .1);
        for (let pip = 0; pip < 5; pip += 1) {
          const active = pip <= tier;
          this.voxel(base, [side * (6.3 - pip * .25), 1.02 + pip * .15, 0], [.1 * pulse, .1 * pulse, .1], active ? color : "#4a5278", active ? .94 : .12);
        }
      }
      if (tier >= 3) {
        this.voxel(base, [0, 3.02, 0], [1.25 + tier * .18, .09 * pulse, .2], color, .82);
        this.voxel(base, [0, 2.78, 0], [.12, .4, .12], color, 1);
      }
    }
    this.canvas.dataset.threatTier = String(tier);
    this.canvas.dataset.threatColor = color;
    this.canvas.dataset.threatPulse = pulseTimer.toFixed(2);
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
    if (biome.id === "sugarBloom") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        this.voxelFlower(compose([side * (6.4 + index % 3), -.48, this.streamZ(index, 5.8, 2.15, -32, 8)]), accent, secondary, .68 + index % 3 * .18);
      }
    } else if (biome.id === "crystalOrchard") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        this.voxelCrystal(compose([side * (6.7 + index % 3 * .65), -.48, this.streamZ(index, 5.6, 2.35, -32, 8)]), index % 3 ? accent : secondary, index % 3 ? secondary : accent, 1.25 + index % 4 * .44);
      }
    } else if (biome.id === "cometTide") {
      for (let index = 0; index < 7; index += 1) {
        const z = this.streamZ(index, 6.2, 4.4, -34, 7);
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (5.4 + index % 3), 2.2 + index % 3 * 1.15, z], [0, side * .72, 0]);
        this.voxel(base, [0, 0, 0], [.38, .38, .62], secondary, .92);
        for (let tail = 1; tail <= 3; tail += 1) this.voxel(base, [0, 0, -tail * .72], [.22 / tail, .18 / tail, .52], accent, .82 - tail * .12);
      }
    } else if (biome.id === "auroraFoundry") {
      for (let strip = 0; strip < 3; strip += 1) {
        for (let segment = 0; segment < 8; segment += 1) {
          const wave = Math.sin(segment * .72 + strip + this.time * .55) * .48;
          this.voxel(compose([0, 0, 0]), [-8.2 + segment * 2.35, 4.6 + strip * .8 + wave, -18.5 - strip * 2.4], [1.72, .11, .16], strip % 2 ? secondary : accent, .76, [0, .08, wave * .15]);
        }
      }
      for (const side of [-1, 1]) for (let index = 0; index < 3; index += 1) {
        const base = compose([side * 7.4, -.48, -10 - index * 8]);
        this.voxel(base, [0, 1.2, 0], [.34, 2.4, .34], secondary, .25);
        this.voxel(base, [side * -.45, 2.35, 0], [.9, .18, .56], accent, .7);
      }
    } else if (biome.id === "thunderWorks") {
      for (let gear = 0; gear < 5; gear += 1) {
        const side = gear % 2 ? 1 : -1;
        const base = compose([side * (6.5 + gear % 2), 1.2 + gear % 3 * .75, this.streamZ(gear, 8, 1.65, -34, 5)], [Math.PI / 2, 0, 0]);
        this.voxel(base, [0, 0, 0], [.35, .35, .5], secondary, .46);
        this.voxelHalo(base, 1.05 + gear % 3 * .25, 0, accent, 10, side * .32, gear, .18);
      }
      for (let index = 0; index < 5; index += 1) {
        const base = compose([index % 2 ? 8 : -8, -.46, -13 - index * 5]);
        this.voxel(base, [0, .55, 0], [.42, 1.1, .52], secondary, .28);
        this.voxel(base, [0, 1.22, 0], [.7, .16, .7], accent, .7);
      }
    } else if (biome.id === "cloudReef") {
      for (let index = 0; index < 9; index += 1) {
        const side = index % 2 ? 1 : -1;
        const scale = .72 + index % 3 * .2;
        const base = compose([side * (6.2 + index % 3 * .7), -.48, this.streamZ(index, 5.7, 2.05, -33, 9)]);
        this.voxel(base, [0, .1, 0], [1.28 * scale, .3, .92 * scale], "#b9f2ff", .3);
        this.voxelCoral(base, accent, secondary, scale);
      }
    } else if (biome.id === "eclipseCarnival") {
      const eclipse = compose([-7.4, 5.5, -23], [0, this.time * .035, 0]);
      this.voxelOrb(eclipse, 2.7, "#784fd0", "#ff5d78");
      this.voxelHalo(eclipse, 3.45, 0, secondary, 20, .06, 0, .16);
      for (let gate = 0; gate < 4; gate += 1) {
        const z = this.streamZ(gate, 10.5, 2.35, -34, 4);
        for (const side of [-1, 1]) {
          const base = compose([side * 7.1, -.48, z]);
          this.voxel(base, [0, 1.15, 0], [.22, 2.3, .42], gate % 2 ? accent : secondary, .38);
          this.voxel(base, [side * -.58, 2.18, 0], [1.05, .2, .42], gate % 2 ? secondary : accent, .72);
        }
      }
    } else if (biome.id === "prismGrave") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.4 + index % 3 * .72), -.48, this.streamZ(index, 5.8, 2.2, -34, 8)], [0, side * .14, side * .08]);
        this.voxel(base, [0, .9 + index % 3 * .3, 0], [.48, 1.8 + index % 3 * .6, .48], index % 2 ? accent : secondary, .46);
        this.voxel(base, [side * -.42, 1.65 + index % 3 * .3, 0], [.7, .14, .68], index % 2 ? secondary : accent, .72, [0, 0, side * .58]);
      }
    } else if (biome.id === "voidGarden") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        this.voxelTree(compose([side * (6.3 + index % 3 * .8), -.48, this.streamZ(index, 6, 1.95, -34, 8)]), accent, secondary, .72 + index % 3 * .2);
      }
      for (let mote = 0; mote < 10; mote += 1) {
        const phase = mote / 10 * TAU + this.time * .22;
        this.pushVoxel(compose([Math.cos(phase) * (6.5 + mote % 3), 2.3 + Math.sin(phase * 2) * 1.2, -15 - mote % 4 * 3.2], [phase, phase, 0], [.1, .1, .1]), mote % 2 ? accent : secondary, 1);
      }
    }
  }

  drawLandmark(stageIndex, biome) {
    const accent = biome?.accent || "#7fffe2";
    const secondary = biome?.secondary || "#ffcf6e";
    if (stageIndex === 0) {
      const planet = compose([8.2, 5.3, -21], [0, this.time * .025, 0]);
      this.voxelOrb(planet, 2.42, accent, secondary);
      this.voxelHalo(planet, 3.18, 0, secondary, 20, .02, 0, .14);
    } else if (stageIndex === 1) {
      for (let index = 0; index < 5; index += 1) {
        const base = compose([-8 + index * 4, 5.5 + (index % 2) * .9, -22 - (index % 3)]);
        for (let block = -2; block <= 2; block += 1) this.voxel(base, [block * .62, Math.abs(block) * -.12, 0], [.72, .42, .64], block % 2 ? accent : secondary, .32);
      }
      const gear = compose([7.3, 6.7, -19], [Math.PI / 2, 0, 0]);
      this.voxelHalo(gear, 2.2, 0, secondary, 16, .12, 0, .24);
    } else {
      const base = compose([7.5, -.42, -23]);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * 1.6, 2.9, 0], [1.15, 5.8, 2.1], side > 0 ? accent : secondary, .28, [0, 0, side * .04]);
        this.voxel(base, [side * 1.6, 6.25, 0], [.62, 1.15, 1.25], side > 0 ? secondary : accent, .65);
      }
      this.voxel(base, [0, 1.5, -.95], [.82, 3, .22], "#8f72ff", .54);
      for (let tier = 0; tier < 4; tier += 1) this.voxel(base, [0, .45 + tier * 1.1, -1.2], [.36 + tier * .06, .22, .08], tier % 2 ? accent : secondary, .84);
    }
    this.drawFlightCorridor(biome);
    this.drawBiomeFeatures(biome);
  }

  projectileTrail(base, color, width, length, segments = 3, offsetX = 0) {
    const count = this.quality === "low" ? 1 : Math.min(3, segments);
    for (let segment = 0; segment < count; segment += 1) {
      const falloff = 1 - segment * .22;
      this.voxel(base, [offsetX, 0, -length * (.75 + segment * .82)], [width * falloff, width * falloff, length * .48], color, .84 - segment * .13);
    }
  }

  drawProjectile(bullet, enemy = false) {
    const position = this.toWorld(bullet.x, bullet.y, enemy ? .42 : .52);
    const travelAngle = Math.atan2(bullet.vx, bullet.vy);
    const rotation = [0, travelAngle, 0];
    if (enemy) {
      const size = .08 + bullet.r * .023;
      const color = this.highContrastBullets ? "#fff06a" : bullet.color;
      const base = compose(position, rotation);
      if (bullet.bossStage === 0) {
        const opening = 1 + (bullet.bossPhase || 1) * .12;
        this.voxel(base, [0, 0, 0], [size * 2.4 * opening, size * .78, size * 1.25], color, 1, [0, .38, 0]);
        this.voxel(base, [0, 0, 0], [size * 2.4 * opening, size * .78, size * 1.25], bullet.payloadColor || "#ffca58", .84, [0, -.38, 0]);
        this.projectileTrail(base, color, size * .55, size * 1.7, 3);
      } else if (bullet.bossStage === 1) {
        this.voxel(base, [0, 0, 0], [size * 1.3, size * 1.05, size * 4.4], color, 1);
        for (const side of [-1, 1]) this.voxel(base, [side * size * 1.25, 0, size * .25], [size * 1.1, size * .62, size * 1.8], "#ffe45c", .78, [0, side * .32, 0]);
        this.projectileTrail(base, color, size * .48, size * 2.4, 3);
      } else if (bullet.bossStage === 2) {
        const spin = bullet.age * 4.6;
        for (let arm = 0; arm < 3; arm += 1) this.voxel(base, [0, 0, 0], [size * 2.7, size * .8, size * 1.25], arm === 1 ? "#ff6680" : color, 1, [0, spin + arm * TAU / 3, 0]);
        this.projectileTrail(base, bullet.payloadColor || color, size * .6, size * 1.7, 3);
      } else if (bullet.weaponModule === "sniper") {
        this.voxel(base, [0, 0, 0], [size * .72, size * .72, size * 4.2], color, 1);
        this.voxel(base, [0, 0, size * 2.5], [size * .28, size * .28, size * 2.2], bullet.payloadColor || "#ffd454", .76);
        this.projectileTrail(base, bullet.payloadColor || color, size * .24, size * 2.1, 3);
      } else if (bullet.weaponModule === "orbit") {
        this.voxel(base, [0, 0, 0], [size * 2.4, size, size], color, 1, [0, bullet.age * 5, 0]);
        this.voxel(base, [0, 0, 0], [size, size, size * 2.4], color, 1, [0, bullet.age * 5, 0]);
        this.projectileTrail(base, bullet.payloadColor || color, size * .48, size * 1.55, 2);
      } else if (bullet.weaponModule === "twin") {
        this.voxel(base, [-size, 0, 0], [size * .75, size, size * 1.8], color, 1);
        this.voxel(base, [size, 0, 0], [size * .75, size, size * 1.8], color, 1);
        this.projectileTrail(base, color, size * .38, size * 1.35, 2, -size);
        this.projectileTrail(base, color, size * .38, size * 1.35, 2, size);
      } else {
        this.voxel(base, [0, 0, 0], [size, size, size * 1.55], color, 1);
        this.projectileTrail(base, color, size * .42, size * 1.3, 2);
      }
      if (bullet.payloadModule !== "clean") {
        const payloadColor = bullet.payloadColor || color;
        this.voxel(base, [0, 0, size * 1.35], [size * .7, size * .7, size * .7], payloadColor, .82);
      }
    } else {
      const base = compose(position, rotation);
      if (bullet.phaseBarrier) {
        this.voxel(base, [0, 0, 0], [.11, .08, .72], "#58dfff", 1);
        this.voxel(base, [0, .01, -.34], [.18, .06, .18], bullet.color, .85);
        this.projectileTrail(base, "#58dfff", .075, .42, 3);
      } else if ((bullet.seeker || 0) > 0) {
        this.voxel(base, [0, 0, -.04], [.08, .08, .46], bullet.color, 1);
        this.voxel(base, [0, 0, .2], [.24, .05, .16], "#a96cff", .82);
        this.projectileTrail(base, "#a96cff", .065, .32, 2);
      } else if ((bullet.r || 0) > 2.35) {
        this.voxel(base, [0, 0, 0], [.11, .11, .52], bullet.color, 1);
        this.voxel(base, [0, .01, -.32], [.065, .065, .2], "#ffd454", .82);
        this.projectileTrail(base, "#ffd454", .075, .38, 3);
      } else {
        this.voxel(base, [0, 0, 0], [.07, .07, .42], bullet.color, 1);
        this.voxel(base, [0, 0, .26], [.12, .04, .13], "#8d70ff", .7);
        this.projectileTrail(base, bullet.color, .05, .3, 2);
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
    const speed = Math.hypot(particle.vx || 0, particle.vy || 0);
    const angle = Math.atan2(particle.vx || 0, particle.vy || 1);
    const length = size * (1.35 + Math.min(2.4, speed * .012)) * (.72 + alpha * .42);
    const base = compose(position, [0, angle, particle.life * 3.2]);
    this.voxel(base, [0, 0, 0], [size, size, length], particle.color, alpha > .42 ? .82 : .24);
    if (particle.size >= 2.4 && this.quality !== "low") {
      this.voxel(base, [0, 0, -length * .68], [size * .55, size * .55, length * .52], "#fff4b5", .72);
    }
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
    this.rimLight.intensity = (this.quality === "low" ? 1.45 : 2.6) + (world.sectorIndex || 0) * .28 + (world.threatTier || 0) * .12;
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
    if (world.bossGallery) {
      this.drawBossGallery(world);
      this.canvas.dataset.modelGallery = "off";
      this.endFrame();
      return true;
    }
    this.canvas.dataset.bossGallery = "off";
    if (world.modelGallery) {
      this.drawModelGallery(world, playerConfigs);
      this.endFrame();
      return true;
    }
    this.canvas.dataset.modelGallery = "off";
    this.drawLandmark(this.stageIndex, stage.biome);
    this.drawSectorArchitecture(world, stage);
    this.drawThreatMatrix(world);
    if (world.boss) this.drawBossArena(world.boss);
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
