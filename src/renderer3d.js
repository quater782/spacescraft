import * as THREE from "three";
import { EffectComposer } from "../node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "../node_modules/three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "../node_modules/three/examples/jsm/postprocessing/OutputPass.js";

const TAU = Math.PI * 2;
const MAX_SOLID_PER_COLOR = 512;
const MAX_EMISSIVE_PER_COLOR = 512;
const MAX_GLOW_PER_COLOR = 512;
const MIN_PIXEL_EDGE = .12;
const PIXEL_SCALE_STEP = .04;
const ECOLOGY_ANCHORS = Object.freeze({
  sugarBloom: [-15.2, 1.8, -24],
  crystalOrchard: [14, -.6, -24],
  cometTide: [-14.2, 2.6, -23],
  auroraFoundry: [14.2, 0, -24],
  thunderWorks: [-14, -.2, -24],
  cloudReef: [14, 1, -24],
  eclipseCarnival: [0, -.8, -28],
  prismGrave: [-14, -1, -24],
  voidGarden: [14, .2, -25],
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const quantizePixelEdge = (value) => Math.max(MIN_PIXEL_EDGE, Math.round(Math.abs(value) / PIXEL_SCALE_STEP) * PIXEL_SCALE_STEP);

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
    this.renderer.toneMappingExposure = .9;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#030510");
    this.scene.fog = new THREE.FogExp2("#030510", .012);
    this.camera = new THREE.PerspectiveCamera(52, 16 / 9, .1, 96);
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    // The bloom threshold deliberately sits above display white. Only HDR energy
    // materials cross it; ceramic hulls and ordinary scenery stay crisp.
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1280, 720), .3, .1, 1.03);
    this.smaaPass = new SMAAPass();
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.outputPass);

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

    this.starLayers = [
      this.createStars(360, .055, 90210, 1),
      this.createStars(210, .085, 37191, .72),
      this.createStars(96, .13, 72031, .42),
    ];
    this.starLayers.forEach((stars) => this.scene.add(stars));
    this.nebulaTexture = this.createNebulaTexture();
    this.nebulaLayers = [
      this.createNebulaCloud(118, 2.45, 44127, .1),
      this.createNebulaCloud(76, 3.8, 77321, .065),
    ];
    this.nebulaLayers.forEach((cloud) => this.scene.add(cloud));
    this.fillLight = new THREE.AmbientLight("#dce8ff", .16);
    this.hemisphere = new THREE.HemisphereLight("#c8dcf2", "#29183d", .64);
    this.keyLight = new THREE.DirectionalLight("#e5eff5", 1.08);
    this.keyLight.position.set(-7, 12, 8);
    this.keyLight.castShadow = false;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    Object.assign(this.keyLight.shadow.camera, { left: -15, right: 15, top: 14, bottom: -14, near: 1, far: 42 });
    this.keyLight.shadow.bias = .0005;
    this.keyLight.shadow.normalBias = .025;
    this.rimLight = new THREE.PointLight("#7fffe2", 1.35, 28, 2);
    this.rimLight.position.set(0, 4, -8);
    this.playerLights = [new THREE.PointLight("#66f6e5", .24, 3.2, 2), new THREE.PointLight("#ff8a70", .24, 3.2, 2)];
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
    this.canvas.dataset.sectorAnomalies = "9-seeded-gameplay-fields";
    this.canvas.dataset.pixelGrammar = "coarse-emissive-012";
    this.canvas.dataset.spaceComposition = "open-celestial-parallax";
    this.canvas.dataset.ecosystemComposition = "9-macro-mid-sparse";
    this.canvas.dataset.combatNegativeSpace = "center-55-clear";
    this.canvas.dataset.nebulaParallax = "3d-additive-dust";
    this.canvas.dataset.skyAtmosphere = "layered-soft-voxel-nebula";
    this.canvas.dataset.energyBloom = "unreal-selective-5mip";
    this.canvas.dataset.edgeAA = "native-smaa";
    this.canvas.dataset.enemyModuleLanguage = "surface-organs";
    this.canvas.dataset.playerMaterialSeparation = "ceramic-core-engine";
    this.canvas.dataset.hullExposure = "matte-ceramic-no-bloom";
    this.canvas.dataset.groundPlane = "none-open-space";
    this.canvas.dataset.depthScaffolding = "macro-mid-distant";
    this.canvas.dataset.shieldLanguage = "four-hugging-plates";
    this.canvas.dataset.bossGalleryView = "neutral-silhouette";
    this.canvas.dataset.macroLayout = "alternating-edge-anchors";
    this.canvas.dataset.celestialScaffolding = "opposed-biome-horizon-bodies";
    this.canvas.dataset.projectileReadability = "dim-friendly-hot-hostile";
    this.canvas.dataset.ringGrammar = "continuous-segmented-arcs";
    this.canvas.dataset.factionLanguage = "human-kites-vs-void-organisms";
    this.canvas.dataset.playerModules = "4-integrated-silhouette-parts";
  }

  createStars(count, size, seed, parallax = 1) {
    const positions = new Float32Array(count * 3);
    let state = seed >>> 0;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - .5) * (48 + parallax * 12);
      positions[index * 3 + 1] = -18 + random() * 42;
      positions[index * 3 + 2] = -46 + random() * 54;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: "#dfe8ff", size, sizeAttenuation: true, transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
    return new THREE.Points(geometry, material);
  }

  createNebulaTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 3, 32, 32, 31);
    gradient.addColorStop(0, "rgba(255,255,255,.78)");
    gradient.addColorStop(.28, "rgba(255,255,255,.28)");
    gradient.addColorStop(.7, "rgba(255,255,255,.07)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  createNebulaCloud(count, size, seed, opacity) {
    const positions = new Float32Array(count * 3);
    let state = seed >>> 0;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const centers = [[-15, -4], [-2, 1], [13.5, -5]];
    for (let index = 0; index < count; index += 1) {
      const center = centers[index % centers.length];
      const angle = random() * TAU;
      const radius = 1.2 + Math.pow(random(), .68) * 7.6;
      positions[index * 3] = center[0] + Math.cos(angle) * radius;
      positions[index * 3 + 1] = center[1] + Math.sin(angle) * radius * .44 + (random() - .5) * 1.2;
      positions[index * 3 + 2] = -52 + random() * 19;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: "#49506c",
      size,
      sizeAttenuation: true,
      transparent: true,
      opacity,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      map: this.nebulaTexture,
      alphaMap: this.nebulaTexture,
    });
    const cloud = new THREE.Points(geometry, material);
    cloud.renderOrder = -10;
    return cloud;
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const nativeRatio = Math.min(1.5, window.devicePixelRatio || 1);
    const pixelRatio = this.quality === "low" ? .72 : this.quality === "balanced" ? 1 : nativeRatio;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false);
    this.composer.setPixelRatio(Math.min(1.25, pixelRatio));
    this.composer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height));
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
    this.composer.render();
  }

  colorKey(color) {
    if (typeof color === "string") return color.replace("#", "").toLowerCase();
    return new THREE.Color(color).getHexString();
  }

  mixColor(color, target = "#172039", amount = .55) {
    return `#${new THREE.Color(color).lerp(new THREE.Color(target), amount).getHexString()}`;
  }

  toonBatchFor(color) {
    const key = this.colorKey(color);
    if (this.toonBatches.has(key)) return this.toonBatches.get(key);
    const material = new THREE.MeshToonMaterial({ color: `#${key}`, gradientMap: this.toonGradient });
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * 0.16;",
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
      opacity: .038,
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
    material.color.multiplyScalar(1.65);
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
    const glow = Math.max(.28, emissive);
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
      const size = 1.085 + Math.min(.075, glow * .065);
      this.tempShell.copy(matrix).scale(this.shellScale.set(size, size, size));
      glowBatch.setMatrixAt(glowCursor, this.tempShell);
      glowBatch.userData.cursor += 1;
    }
  }

  voxel(base, position, scale, color, emissive = 0, rotation = [0, 0, 0]) {
    const pixelScale = scale.map(quantizePixelEdge);
    this.pushVoxel(multiply(base, compose(position, rotation, pixelScale)), color, emissive);
  }

  voxelHalo(base, radius, height, color, count = 8, speed = 1, phase = 0, size = .1) {
    for (let index = 0; index < count; index += 1) {
      const angle = phase + this.time * speed + index / count * TAU;
      this.voxel(base, [Math.cos(angle) * radius, height + Math.sin(angle * 2) * .05, Math.sin(angle) * radius], [size, size, size], color, 1, [angle, angle * .7, 0]);
    }
  }

  voxelRing(base, radius, height, color, count = 18, speed = 0, phase = 0, thickness = .16, emissive = .86, coverage = 1) {
    const segmentLength = Math.max(thickness, TAU * radius / count * .74);
    const visibleSegments = Math.max(3, Math.round(count * clamp(coverage, .18, 1)));
    for (let index = 0; index < visibleSegments; index += 1) {
      const angle = phase + this.time * speed + index / count * TAU;
      this.voxel(
        base,
        [Math.cos(angle) * radius, height + Math.sin(angle * 3 + phase) * thickness * .12, Math.sin(angle) * radius],
        [thickness, thickness, segmentLength],
        color,
        emissive,
        [0, -angle, 0],
      );
    }
  }

  voxelSegment(base, start, end, width, color, emissive = .45) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const horizontal = Math.hypot(dx, dz);
    const length = Math.hypot(horizontal, dy);
    if (length < .001) return;
    this.voxel(
      base,
      [(start[0] + end[0]) * .5, (start[1] + end[1]) * .5, (start[2] + end[2]) * .5],
      [width, width, length],
      color,
      emissive,
      [-Math.atan2(dy, Math.max(.001, horizontal)), Math.atan2(dx, dz), 0],
    );
  }

  voxelPolyline(base, points, width, color, emissive = .45, taper = .08) {
    for (let index = 1; index < points.length; index += 1) {
      const segmentWidth = Math.max(MIN_PIXEL_EDGE, width * (1 - (index - 1) * taper));
      this.voxelSegment(base, points[index - 1], points[index], segmentWidth, color, emissive);
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
          if (distance > 2.45) continue;
          const litFace = x >= 1 && y >= -1 && z <= 1;
          this.voxel(base, [x * unit, y * unit, z * unit], [unit * .96, unit * .96, unit * .96], litFace ? accent : color, litFace ? .5 : .24);
        }
      }
    }
  }

  streamZ(slot, spacing = 5.2, speed = 2.8, far = -30, count = 9) {
    const span = spacing * count;
    return far + ((slot * spacing + this.time * speed) % span);
  }

  distantEcologyZ(slot, spacing = 7.4, speed = .2, far = -48) {
    const depthBand = 30;
    return far + ((slot * spacing + this.time * speed) % depthBand);
  }

  drawFlightCorridor(biome) {
    const accent = this.mixColor(biome?.accent || "#7fffe2", "#718399", .82);
    for (let slot = 0; slot < 2; slot += 1) {
      const z = this.streamZ(slot, 27, .52, -52, 2);
      const side = slot % 2 ? 1 : -1;
      const x = side * (9.2 + slot * .7);
      const y = 2.1 + slot * 1.7;
      const base = compose([x, y, z], [slot * .08, slot * .52, side * .12]);
      this.voxel(base, [0, 0, 0], [.5, .54, .82], "#27344d", .22);
      this.voxel(base, [side * -.48, .08, .12], [.76, .16, .34], "#46556d", .26, [0, side * .42, 0]);
      this.voxel(base, [side * -.76, .14, .18], [.18, .18, .2], accent, .78, [0, side * .62, 0]);
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

  voxelThruster(base, x, z, color, flame, scale = 1, housing = "#34445d") {
    this.voxel(base, [x, .04, z], [.3 * scale, .24 * scale, .38], housing, .28);
    this.voxel(base, [x, .04, z + .34 + flame * .05], [.18 * scale, .18 * scale, .3 + flame * .2], color, .92);
  }

  fighterNose(base, palette, length = 1, canopy = "#dffcff") {
    const [, , light] = palette;
    this.voxel(base, [0, .07, -.48 * length], [.5, .24, .64 * length], light, .24);
    this.voxel(base, [0, .06, -.88 * length], [.36, .2, .42 * length], light, .24);
    this.voxel(base, [0, .04, -1.16 * length], [.2, .14, .24 * length], light, .22);
    this.voxel(base, [0, .22, -.48 * length], [.28, .16, .48 * length], canopy, .3);
  }

  sweptWing(base, side, palette, width = 1, rear = .55, armored = false) {
    const [dark, bright, light] = palette;
    const sweep = side * (.22 + rear * .08);
    this.voxel(base, [side * .46 * width, .03, .08], [.72 * width, .14, .6], light, .25, [0, sweep, 0]);
    this.voxel(base, [side * .88 * width, .025, .3], [.56 * width, .12, .38], armored ? light : dark, .25, [0, side * (.42 + rear * .1), 0]);
    this.voxel(base, [side * 1.22 * width, .035, .5], [.34 * width, .1, .22], dark, .24, [0, side * (.58 + rear * .08), 0]);
    this.voxel(base, [side * 1.4 * width, .07, .58], [.12, .08, .14], bright, .84, [0, side * .62, 0]);
  }

  tailFins(base, palette, spread = .4, height = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * spread, .22 * height, .68], [.14, .34 * height, .38], dark, .28, [side * -.18, 0, 0]);
      this.voxel(base, [side * spread, .39 * height, .63], [.1, .1, .16], side > 0 ? bright : light, side > 0 ? .84 : .28, [side * -.18, 0, 0]);
    }
  }

  drawPlayerShield(base, profile, pulse = 1) {
    const radius = profile.span * .55;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * radius, .16, -.38], [.12 * pulse, .12, .44], "#71c8d3", .74, [0, side * .18, 0]);
      this.voxel(base, [side * radius * 1.08, .14, .28], [.12 * pulse, .1, .34], "#4f899d", .62, [0, side * .28, 0]);
    }
  }

  drawPlayerModules(player, base, palette, profile) {
    const flash = 1 + clamp(player.buffFlash || 0, 0, .48) * .35;
    const span = profile.span;
    const moduleLights = { flux: "#a879ff", aegis: "#62dcff", repair: "#74df91", resonance: "#e6c75d" };
    const moduleLight = moduleLights[player.moduleId];
    if (player.moduleId === "flux") {
      this.voxel(base, [0, .32, .3], [.4 * flash, .14, .68], palette[0], .34);
    } else if (player.moduleId === "aegis") {
      for (const side of [-1, 1]) this.voxel(base, [side * span * .58, .14, .28], [.3, .14, .76], palette[0], .32, [0, side * .22, 0]);
    } else if (player.moduleId === "repair") {
      this.voxel(base, [0, .33, .32], [.44, .14, .56], palette[0], .32);
    } else if (player.moduleId === "resonance") {
      this.voxel(base, [0, .3, .25], [.88, .14, .26], palette[0], .34);
    }
    if (moduleLight) this.voxel(base, [0, .43, .08], [.16, .08, .34], moduleLight, .9);
    if ((player.buffs?.arsenal || 0) > 0) {
      for (const side of [-1, 1]) {
        this.voxel(base, [side * span * .38, .16, -.28], [.28, .16, .54], palette[0], .38, [0, side * .08, 0]);
        this.voxel(base, [side * span * .38, .19, -.6], [.14 * flash, .12 * flash, .2], "#ffd45f", .96, [0, side * .08, 0]);
      }
    }
    if ((player.buffs?.nanobloom || 0) > 0) {
      this.voxel(base, [0, .38, .48], [.34, .18, .5], palette[2], .42);
      this.voxel(base, [0, .5, .4], [.14, .12, .24], "#76e39a", .94);
    }
    if ((player.buffs?.aegis || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 8) * .05;
      for (const side of [-1, 1]) {
        this.voxel(base, [side * span * .66, .14, .24], [.16 * pulse, .14, .52], "#67dff0", .82, [0, side * .24, 0]);
      }
    }
    if ((player.buffs?.flux || 0) > 0) {
      const pulse = 1 + Math.sin(this.time * 10) * .12;
      this.voxel(base, [0, .4, .02], [.3 * pulse, .18, .46], palette[0], .48);
      this.voxel(base, [0, .52, -.02], [.14 * pulse, .12, .24], "#a879ff", .96);
    }
    const debuffs = [["chill", "#70eaff"], ["jam", "#ff83d7"], ["fracture", "#ffb45f"]].filter(([id]) => (player.debuffs?.[id] || 0) > 0);
    const statusScale = 1 + clamp(player.statusFlash || 0, 0, .44) * .5;
    debuffs.forEach(([, color], statusIndex) => {
      const bandZ = .18 + statusIndex * .28;
      this.voxel(base, [0, .26 + statusIndex * .05, bandZ], [profile.bodyWidth * 1.1, .12 * statusScale, .16], color, .9);
    });
  }

  drawShip(player, colors, demo = false) {
    const position = demo ? [player.x, .4 + Math.sin(this.time * 1.4 + player.index) * .08, player.z] : this.toWorld(player.x, player.y, .32);
    const roll = demo ? Math.sin(this.time + player.index) * .12 : clamp(-player.vx * .006, -.3, .3);
    const pitch = demo ? -.08 : clamp(player.vy * .0018, -.11, .11);
    const frameId = player.frameId || "comet";
    const profiles = {
      comet: { scale: 1.04, bodyWidth: .56, bodyLength: 1.7, nose: 1.16, span: 1.3, wing: .98, armored: false, engines: [-.3, .3], tail: .34 },
      bulwark: { scale: 1, bodyWidth: .72, bodyLength: 1.86, nose: 1.04, span: 1.52, wing: 1.12, armored: true, engines: [-.44, .44], tail: .44 },
      pulse: { scale: 1.02, bodyWidth: .44, bodyLength: 2, nose: 1.3, span: 1.04, wing: .78, armored: false, engines: [0], tail: .22 },
    };
    const profile = profiles[frameId] || profiles.comet;
    const base = compose(position, [pitch, player.galleryYaw || 0, roll], [profile.scale, profile.scale, profile.scale]);
    const pilotPalettes = [
      ["#203e5b", "#39d8d5", "#a9bdc0"],
      ["#513344", "#ed765f", "#c8b7ae"],
    ];
    const palette = pilotPalettes[player.index] || [colors.color, colors.light, "#8f72ff"];
    const flame = .52 + Math.sin(this.time * 28 + player.index) * .16;

    this.voxel(base, [0, .07, .42], [profile.bodyWidth * 1.04, .28 + (profile.armored ? .06 : 0), .72], palette[2], .24);
    this.voxel(base, [0, .07, -.12], [profile.bodyWidth, .26 + (profile.armored ? .04 : 0), .66], palette[2], .24);
    this.voxel(base, [0, .2, .2], [profile.bodyWidth * .48, .16, profile.bodyLength * .74], palette[0], .3);
    this.fighterNose(base, palette, profile.nose, palette[0]);
    this.voxel(base, [0, .32, -.56 * profile.nose], [.12, .07, .22], palette[1], .84);
    for (const side of [-1, 1]) this.sweptWing(base, side, palette, profile.wing, frameId === "pulse" ? .96 : .78, profile.armored);
    this.tailFins(base, palette, profile.tail, frameId === "bulwark" ? .94 : frameId === "pulse" ? .8 : .88);
    for (const engineX of profile.engines) this.voxelThruster(base, engineX, .92, palette[1], flame, frameId === "bulwark" ? .7 : .64, palette[0]);
    if (!demo && player.shield > 0) {
      const shieldPulse = 1 + Math.sin(this.time * 8) * .08;
      this.drawPlayerShield(base, profile, shieldPulse);
    }
    this.drawPlayerModules(player, base, palette, profile);
  }

  alienCrescent(base, palette, span = 1, rake = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      const points = [
        [side * .18 * span, .08, -.18],
        [side * .72 * span, .11, -.02],
        [side * 1.24 * span, .14, .3 * rake],
        [side * 1.65 * span, .2, .76 * rake],
      ];
      for (let segment = 1; segment < points.length; segment += 1) {
        this.voxelSegment(base, points[segment - 1], points[segment], (.42 - segment * .07) * span, segment % 2 ? bright : dark, .34 + segment * .06);
      }
      this.voxel(base, points.at(-1), [.22 * span, .22, .28], light, .68);
    }
  }

  alienTendril(base, side, palette, x = .5, z = .55, curl = 1, glow = null) {
    const handed = side || 1;
    const points = [
      [handed * x, .08, z],
      [handed * (x + .22 * curl), .12, z + .42],
      [handed * (x + .48 * curl), .2, z + .8],
      [handed * (x + .62 * curl), .3, z + 1.18],
    ];
    for (let segment = 1; segment < points.length; segment += 1) {
      const color = glow && segment === points.length - 1 ? glow : palette[(segment - 1) % 2];
      this.voxelSegment(base, points[segment - 1], points[segment], .31 - segment * .055, color, segment === points.length - 1 ? .72 : .3);
    }
  }

  alienEye(base, x, z, color, scale = 1) {
    this.voxel(base, [x, .32 * scale, z], [.38 * scale, .24 * scale, .42 * scale], "#6f3f9f", .38);
    this.voxel(base, [x, .48 * scale, z - .08], [.2 * scale, .16 * scale, .24 * scale], color, 1);
  }

  drawEnemyChassis(enemy, base, palette) {
    const type = enemy.type;
    const handed = Math.sin(Number(enemy.seed) || 1) >= 0 ? 1 : -1;
    if (type === "dart") {
      this.voxel(base, [0, .14, -.08], [.42, .36, 2.05], palette[0], .3);
      this.voxel(base, [handed * .08, .34, -.62], [.26, .22, .98], palette[1], .46);
      for (const side of [-1, 1]) {
        this.voxelSegment(base, [side * .2, .12, .15], [side * .66, .15, .48 + side * handed * .06], .3, side === handed ? palette[1] : palette[0], .34);
        this.voxelSegment(base, [side * .66, .15, .48], [side * 1.05, .22, .92], .22, palette[1], .42);
      }
      this.alienEye(base, handed * .12, -.74, palette[2], .86);
    } else if (type === "tank") {
      this.voxel(base, [0, .18, .08], [1.02, .52, 1.46], palette[0], .3);
      this.voxel(base, [0, .48, -.16], [.7, .26, .9], palette[1], .42);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .68, .2, .12], [.62, .4, 1.14], palette[0], .3, [0, side * .12, 0]);
        this.voxelSegment(base, [side * .76, .1, -.35], [side * 1.26, .02, -.72], .24, palette[1], .38);
        this.voxelSegment(base, [side * .78, .1, .44], [side * 1.3, .02, .78], .22, palette[1], .36);
        this.voxel(base, [side * .44, .42, -.5], [.34, .2, .5], palette[1], .46, [0, side * .14, 0]);
      }
      this.alienEye(base, handed * .26, -.52, palette[2], 1.02);
    } else if (type === "spinner") {
      this.voxel(base, [0, .16, 0], [.66, .42, .82], palette[0], .34);
      for (let arm = 0; arm < 4; arm += 1) {
        const angle = arm * Math.PI / 2 + handed * .16;
        this.voxel(base, [Math.sin(angle) * .68, .12, Math.cos(angle) * .68], [.34, .28, 1.18], arm % 2 ? palette[0] : palette[1], .34, [0, angle, handed * .08]);
        this.voxel(base, [Math.sin(angle) * 1.24, .18, Math.cos(angle) * 1.24], [.28, .3, .54], palette[1], .46, [0, angle + handed * .35, 0]);
        if (arm % 2 === 0) this.voxel(base, [Math.sin(angle) * 1.48, .24, Math.cos(angle) * 1.48], [.16, .16, .2], palette[2], .96, [0, angle, 0]);
      }
      this.alienEye(base, 0, -.24, palette[2], .96);
    } else if (type === "mine") {
      this.voxel(base, [0, .18, -.12], [.78, .48, .92], palette[0], .34);
      this.voxel(base, [handed * .18, .46, -.28], [.42, .3, .5], palette[1], .52);
      this.alienCrescent(base, palette, .68, 1.2);
      for (const side of [-1, 1]) {
        this.alienTendril(base, side, palette, .42 + (side === handed ? .1 : 0), .46, side === handed ? 1.25 : .76, palette[2]);
      }
      this.alienEye(base, handed * .16, -.46, palette[2], .94);
    } else if (type === "lancer") {
      this.voxel(base, [handed * .08, .16, .2], [.58, .42, 1.08], palette[0], .32, [0, handed * .08, 0]);
      this.voxel(base, [-handed * .16, .42, -.18], [.38, .24, .56], palette[1], .46, [0, -handed * .12, 0]);
      for (const side of [-1, 1]) {
        const jaw = [
          [side * .24, .12, .08],
          [side * .52, .16, -.52],
          [side * .42, .2, -1.22],
          [side * .66, .26, -1.86],
        ];
        for (let segment = 1; segment < jaw.length; segment += 1) this.voxelSegment(base, jaw[segment - 1], jaw[segment], .3 - segment * .055, segment % 2 ? palette[1] : palette[0], .34 + segment * .07);
        this.voxel(base, jaw.at(-1), [.16, .16, .28], palette[2], .72);
      }
      this.alienTendril(base, -handed, palette, .32, .48, .9, null);
      this.alienEye(base, handed * .16, -.42, palette[2], .88);
    } else if (type === "carrier") {
      this.voxel(base, [0, .2, .06], [.66, .46, 1.56], palette[0], .34);
      this.voxel(base, [handed * .12, .48, -.34], [.46, .26, .72], palette[1], .46);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .64, .22, .08 + side * handed * .08], [.58, .42, 1.14], palette[1], .36, [0, side * .12, 0]);
        this.voxel(base, [side * 1.13, .18, .34], [.5, .34, .82], palette[0], .32, [0, side * .28, 0]);
        this.alienTendril(base, side, palette, .78, .52, side === handed ? 1.25 : .9, palette[2]);
        this.voxel(base, [side * .92, .44, .12], [.32, .26, .46], side === handed ? palette[1] : palette[0], .4, [0, side * .2, 0]);
      }
      this.alienEye(base, handed * .26, -.5, palette[2], 1.08);
    } else {
      this.voxel(base, [0, .16, -.04], [.62, .38, 1.18], palette[0], .3);
      this.voxel(base, [0, .38, -.4], [.44, .28, .64], palette[1], .44);
      this.alienCrescent(base, palette, .82, 1);
      this.alienEye(base, handed * .1, -.54, palette[2], .92);
    }
  }

  drawIntegratedEnemyModules(enemy, base, palette, moduleColor) {
    const flame = .38 + Math.sin(this.time * 18 + enemy.seed) * .1;
    const handed = Math.sin(Number(enemy.seed) || 1) >= 0 ? 1 : -1;
    if (enemy.movementModule === "weave") {
      for (const side of [-1, 1]) {
        this.voxelSegment(base, [side * .34, .08, .4], [side * .82, .12, .9], .18, side === handed ? palette[1] : palette[0], .3);
        this.voxel(base, [side * .86, .14, .94], [.14, .12, .2], moduleColor, .68);
      }
    } else if (enemy.movementModule === "rush") {
      this.voxel(base, [0, .1, .7], [.4, .2, .72], palette[0], .24);
      for (const side of [-1, 1]) this.voxel(base, [side * .23, .1, 1.03 + flame * .04], [.14, .12, .36], moduleColor, .86);
    } else if (enemy.movementModule === "drift") {
      this.voxelSegment(base, [handed * .24, .08, .32], [handed * .92, .12, .9], .2, palette[0], .28);
      this.voxel(base, [handed * .97, .14, .96], [.16, .12, .28], moduleColor, .76);
    } else {
      for (const side of [-1, 1]) this.voxel(base, [side * .24, .08, .72], [.16, .14, .5], palette[0], .24, [0, side * .1, 0]);
      this.voxel(base, [0, .12, 1.02], [.16, .12, .24 + flame * .08], moduleColor, .8);
    }

    if (enemy.weaponModule === "twin") {
      for (const side of [-1, 1]) {
        this.voxelSegment(base, [side * .26, .12, -.4], [side * .38, .14, -1.3], .17, palette[1], .32);
        this.voxel(base, [side * .39, .16, -1.38], [.12, .1, .24], moduleColor, .88);
      }
    } else if (enemy.weaponModule === "sniper") {
      this.voxelSegment(base, [0, .12, -.42], [0, .16, -1.66], .2, palette[1], .34);
      this.voxel(base, [0, .18, -1.78], [.12, .1, .28], moduleColor, .92);
    } else if (enemy.weaponModule === "orbit") {
      for (const side of [-1, 1]) {
        this.voxelSegment(base, [side * .28, .12, -.26], [side * .82, .16, -.48], .16, palette[0], .28);
        this.voxel(base, [side * .88, .18, -.52], [.16, .12, .18], side === handed ? moduleColor : palette[2], .78);
      }
    } else {
      this.voxel(base, [0, .12, -.82], [.2, .16, .72], palette[1], .3);
      this.voxel(base, [0, .16, -1.22], [.12, .1, .2], moduleColor, .88);
    }

    if (enemy.coreModule === "plated") {
      for (const side of [-1, 1]) this.voxel(base, [side * .28, .28, .04], [.36, .14, .72], side === handed ? palette[1] : palette[0], .26, [0, side * .1, 0]);
    } else if (enemy.coreModule === "barrier") {
      for (const side of [-1, 1]) this.voxel(base, [side * .42, .24, .02], [.14, .12, .86], palette[2], .62, [0, side * .12, 0]);
      if (enemy.moduleBarrier > 0) {
        const pulse = 1 + Math.sin(this.time * 9 + enemy.seed) * .04;
        this.voxel(base, [0, .43, -.24], [1.02 * pulse, .08, .14], moduleColor, 1);
      }
    } else if (enemy.coreModule === "volatile") {
      const pulse = 1 + Math.sin(this.time * 10 + enemy.seed) * .12;
      this.voxel(base, [0, .29, .02], [.32 * pulse, .14, .46], palette[1], .34);
      this.voxel(base, [0, .4, -.02], [.14 * pulse, .08, .26], moduleColor, .88);
    } else {
      this.voxel(base, [0, .3, -.02], [.24, .1, .38], palette[1], .42);
    }

    if (enemy.aiModule === "hunter") {
      for (const side of [-1, 1]) this.alienEye(base, side * .2, -.48, palette[2], .62);
    } else if (enemy.aiModule === "flanker") {
      this.alienEye(base, handed * .34, -.4, palette[2], .7);
      this.voxel(base, [handed * .62, .18, -.14], [.42, .12, .34], palette[1], .46, [0, handed * .28, 0]);
    } else if (enemy.aiModule === "oracle") {
      this.voxel(base, [0, .36, -.14], [.46, .14, .5], palette[0], .3);
      this.voxel(base, [0, .47, -.34], [.22, .08, .2], palette[2], .94);
    } else {
      this.alienEye(base, handed * .07, -.42, palette[2], .58);
    }

    if (enemy.payloadModule === "cryo") {
      this.voxel(base, [handed * .36, .2, .44], [.14, .1, .54], "#70eaff", .68, [0, handed * .14, 0]);
    } else if (enemy.payloadModule === "glitch") {
      const color = Math.floor(this.time * 14 + enemy.seed) % 2 ? "#ff83d7" : "#7f8cff";
      this.voxel(base, [handed * .18, .2, .48], [.58, .1, .14], color, .76, [0, handed * .14, 0]);
    } else if (enemy.payloadModule === "fracture") {
      this.voxel(base, [handed * .42, .2, .38], [.14, .1, .46], "#ff9d4f", .72, [0, handed * .2, 0]);
    }
  }

  drawEnemy(enemy) {
    const position = this.toWorld(enemy.x, enemy.y, .32);
    const perspectiveBoost = 1 + clamp((this.height * .48 - enemy.y) / this.height, 0, .14);
    const enemyScale = (enemy.elite ? 1.5 : 1.26) * perspectiveBoost * (enemy.moduleScale || 1);
    const spin = enemy.type === "spinner" ? Math.sin(enemy.age * 2) * .08 : 0;
    const galleryScale = enemy.galleryScale || 1;
    const base = compose(position, [0, Math.PI + spin + (enemy.galleryYaw || 0), Math.sin(enemy.age * 2 + enemy.seed) * .04], [enemyScale * galleryScale, enemyScale * galleryScale, enemyScale * galleryScale]);
    if (enemy.boss) {
      this.drawBoss(enemy, base);
      return;
    }
    const palettes = {
      scout: ["#372354", "#94365d", "#d6ff6b"],
      dart: ["#421b3d", "#c74345", "#ffdf68"],
      tank: ["#34304f", "#81506d", "#a8ff66"],
      spinner: ["#32204d", "#bd2f73", "#b8ff5a"],
      mine: ["#3d1e4d", "#a84183", "#dcff69"],
      lancer: ["#342342", "#b8334d", "#fff070"],
      carrier: ["#322b49", "#7f3c62", "#a8e85d"],
    };
    const palette = palettes[enemy.type] || palettes.scout;
    const moduleColor = enemy.elite ? "#e6c75d" : "#b33b51";
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
    this.voxel(base, [0, .12, .05], [.82, .38, 1.72], palette[0], .18);
    this.voxel(base, [0, .3, -.38], [.54, .2, .9], palette[1], .26);
    const petalAngles = [-1.28, -.8, -.32, .32, .8, 1.28];
    petalAngles.forEach((angle, index) => {
      const x = Math.sin(angle) * 1.35;
      const z = Math.cos(angle) * 1.08 + .18;
      this.voxel(base, [x, .08 + (index % 2) * .04, z], [.72, .16, 1.2], index % 2 ? palette[0] : palette[1], .2, [0, angle, 0]);
      this.voxel(base, [Math.sin(angle) * 2.08, .1, Math.cos(angle) * 1.72 + .3], [.48, .14, .58], palette[2], .46, [0, angle, 0]);
      if (phase >= 2) this.voxel(base, [Math.sin(angle) * 1.62, .3, Math.cos(angle) * 1.28 + .12], [.38, .28, .52], index % 2 ? "#bd4f76" : palette[2], .5, [0, angle, angle * .08]);
    });
    if (phase >= 3) {
      for (const side of [-1, 0, 1]) this.voxel(base, [side * .72, .42, .72 + Math.abs(side) * .18], [.28, .58, .5], "#ff6fba", .6, [side * -.18, side * .22, 0]);
    }
    this.voxel(base, [0, .44, -.34], [.62 * pulse, .24, .62], palette[2], .7);
    this.alienEye(base, 0, -.72, "#fff08a", 1.28);
  }

  drawBossForge(enemy, base, palette) {
    const phase = enemy.phaseLevel || 1;
    const pulse = 1 + Math.sin(this.time * 7.5) * .07;
    this.voxel(base, [0, .1, -.08], [.72, .36, 3.12], palette[0], .18);
    this.voxel(base, [0, .24, -1.24], [.34, .2, 1.18], palette[2], .48);
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .72, .12, .08], [.58, .3, 1.92], palette[1], .2, [0, side * .1, 0]);
      this.voxel(base, [side * 1.28, .16, .32], [.68, .26, .9], palette[0], .18, [0, side * .36, 0]);
      this.voxel(base, [side * 1.72, .22, -.28], [.66, .24, .54], palette[2], .52, [0, side * .62, 0]);
      this.voxel(base, [side * .84, .54, .18], [.34, .82, .72], phase >= 2 ? "#b7a24e" : palette[1], phase >= 2 ? .5 : .24, [side * -.16, side * .12, 0]);
      if (phase >= 3) this.voxel(base, [side * 1.62, .38, .62], [.46, .54, .68], "#c54f55", .56, [side * -.14, side * .42, 0]);
      this.voxel(base, [side * .54, .08, 1.56], [.24, .2, .46 + pulse * .05], palette[2], .84);
    }
    this.voxel(base, [0, .48, -.42], [.58 * pulse, .24, .72], "#d6bd54", .72);
    this.alienEye(base, 0, -.98, "#fff7c2", 1.42);
  }

  drawBossVoid(enemy, base, palette) {
    const phase = enemy.phaseLevel || 1;
    const pulse = 1 + Math.sin(this.time * 8.5) * .09;
    for (const side of [-1, 1]) {
      this.voxel(base, [side * .62, .12, -.26], [.52, .34, 2.42], palette[0], .2, [0, side * .08, 0]);
      this.voxel(base, [side * .52, .25, -1.28], [.28, .22, .92], palette[1], .28, [0, side * .08, 0]);
      const sickle = [[side * .72, .1, -.12], [side * 1.46, .14, -.56], [side * 2.08, .18, -.08], [side * 2.46, .22, .66]];
      for (let segment = 1; segment < sickle.length; segment += 1) this.voxelSegment(base, sickle[segment - 1], sickle[segment], .42 - segment * .07, segment % 2 ? palette[1] : palette[0], .24 + segment * .08);
      this.voxel(base, sickle.at(-1), [.38, .2, .46], palette[2], .58, [0, side * .72, 0]);
      if (phase >= 2) this.voxel(base, [side * 1.06, .46, -.42], [.42, .58, .68], "#9e68c6", .52, [side * -.18, side * .18, 0]);
      if (phase >= 3) this.voxel(base, [side * 1.72, .36, -.46], [.62, .24, .56], "#cd4969", .62, [0, side * .58, side * -.08]);
      this.voxel(base, [side * .48, .08, 1.46], [.24, .2, .52 + pulse * .05], palette[2], .84);
    }
    this.voxel(base, [0, .34, -.16], [.26, .5, 1.5], "#6f4f8f", .52);
    this.voxel(base, [0, .56, -.58], [.56 * pulse, .22, .62], palette[2], .78);
    this.alienEye(base, 0, -.98, "#ffd3f2", 1.48);
  }

  drawBossTelegraph(enemy, base, palette, stage) {
    if (enemy.attackState !== "telegraph") return;
    const charge = clamp(enemy.attackCharge || 0, 0, 1);
    const phase = enemy.phaseLevel || 1;
    const color = ["#ffca58", "#ffd45f", "#c98aff"][stage];
    const pulse = .82 + charge * .48 + Math.sin(this.time * (10 + phase * 2)) * .08;
    this.voxelHalo(base, 1.7 + charge * .56, .34, color, 6 + phase * 2, 1.25 + stage * .24, stage * .7, .1 + charge * .06);
    this.voxel(base, [0, .7, -.42], [.42 * pulse, .14 * pulse, .5 * pulse], color, .88);
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
    const palettes = enemy.hitFlash > 0 ? ["#4f7991", "#b74373", "#ffe15d"] : [["#2b1745", "#87325e", "#c99f42"], ["#202b48", "#2e7777", "#b99e3f"], ["#26163d", "#783052", "#b84658"]][stage];
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
      const base = compose(this.toWorld(x, y, .34), [0, Math.PI + yaw, 0], [1.3, 1.3, 1.3]);
      const attackIds = [["petalBurst", "seedSpiral", "twinBloom"], ["railWall", "forgeCross", "doubleRail"], ["spiralCrown", "eclipseTwin", "tripleEclipse"]];
      this.drawBoss({ phaseLevel, phaseShield: 0, hitFlash: 0, seed: stage + 1, attackState: "recover", attackCharge: 0, attackId: attackIds[stage][phaseLevel - 1] }, base, stage);
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
        moduleId: ["flux", "aegis", "resonance"][index],
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
    const layout = [[76, 42], [185, 42], [295, 42], [404, 42], [130, 130], [240, 130], [350, 130]];
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
        galleryScale: 1.15,
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
    const accent = this.mixColor(stage.biome?.accent || stage.accent, "#29354e", .7);
    const secondary = this.mixColor(stage.biome?.secondary || stage.star, "#303047", .72);
    if ((world.sectorFlashTimer || 0) > 0) {
      const remaining = clamp(world.sectorFlashTimer / 1.45, 0, 1);
      const approach = 1 - remaining;
      const portal = compose([0, 1.1, lerp(-18, -2.2, approach)], [Math.PI / 2, 0, 0]);
      const pulse = 1 + Math.sin(this.time * 18) * .08;
      this.voxelHalo(portal, 4.2 + sector * .36, 0, accent, 14, .22, sector * .7, .22 * pulse);
      this.voxelHalo(portal, 3.5 + sector * .3, 0, secondary, 10, -.18, sector, .18 * pulse);
      this.voxel(portal, [0, 0, 0], [.52 * pulse, .52 * pulse, .52], "#ffffff", 1);
    }
  }

  drawThreatMatrix(world) {
    const colors = ["#68f4df", "#76dbff", "#ffe16c", "#ff936b", "#ff67d4"];
    const tier = clamp(Number(world.threatTier) || 0, 0, 4);
    const color = colors[tier];
    const pulseTimer = clamp(Number(world.threatPulseTimer) || 0, 0, 1.1);
    const pulse = 1 + pulseTimer * .12 + Math.sin(this.time * 12) * .025;
    const base = compose([10.8, 6.1, -25], [0, -.28, .08]);
    this.voxel(base, [0, 0, 0], [.42, .34, .5], "#25314d", .2);
    this.voxel(base, [.34, .03, -.06], [.22, .22, .26], color, .72);
    for (let pip = 0; pip < 5; pip += 1) {
      const active = pip <= tier;
      this.voxel(base, [-.36 + pip * .18, .32, 0], [.12 * pulse, .12 * pulse, .12], active ? color : "#46516d", active ? .88 : .12);
    }
    if (tier >= 3) {
      this.voxelHalo(base, .72 + tier * .05, .1, color, 8, .18, tier * .4, .1 * pulse);
    }
    this.canvas.dataset.threatTier = String(tier);
    this.canvas.dataset.threatColor = color;
    this.canvas.dataset.threatPulse = pulseTimer.toFixed(2);
  }

  drawAnomalyField(world) {
    const anomaly = world.activeAnomaly;
    if (!anomaly) {
      this.canvas.dataset.anomalyId = "off";
      return;
    }
    const color = anomaly.color || "#76e9ff";
    const secondary = anomaly.secondary || "#ff9bd5";
    const bodyColor = this.mixColor(color, "#17233d", .62);
    const rimColor = this.mixColor(secondary, "#211d38", .68);
    const intensity = clamp(Number(anomaly.intensity) || .7, .55, 1);
    const polarity = anomaly.polarity > 0 ? 1 : -1;
    const pulse = 1 + Math.sin(this.time * (1.15 + anomaly.tier * .2) + anomaly.phase) * .1 * intensity;

    if (anomaly.kind === "crystal") {
      for (let crystal = 0; crystal < 4; crystal += 1) {
        const side = crystal % 2 ? 1 : -1;
        const z = this.streamZ(crystal, 11.5, .72, -40, 4);
        const base = compose([side * (6.8 + crystal % 2 * 1.1), .45 + crystal % 3 * 1.15, z], [0, this.time * .04 * polarity + crystal, side * .1]);
        this.voxel(base, [0, .72, 0], [.46 * pulse, 1.44, .42], bodyColor, .42, [0, .34, 0]);
        this.voxel(base, [side * -.28, 1.46, -.08], [.22, .52, .24], color, .82, [0, -.38, 0]);
      }
    } else if (anomaly.kind === "bloom") {
      for (let bloom = 0; bloom < 4; bloom += 1) {
        const side = bloom % 2 ? 1 : -1;
        const z = this.streamZ(bloom, 12, .74, -41, 4);
        const base = compose([side * (6.6 + bloom % 2 * 1.25), .2 + bloom % 3 * 1.18, z]);
        const rise = .58 + ((this.time * .32 + bloom * .17) % 1) * 1.15;
        this.voxel(base, [0, .62, 0], [.24, 1.2, .24], bodyColor, .3);
        for (let petal = 0; petal < 4; petal += 1) {
          const angle = petal / 4 * TAU + this.time * .28 * polarity;
          this.voxel(base, [Math.cos(angle) * .44, 1.23, Math.sin(angle) * .44], [.38, .16, .28], petal % 2 ? rimColor : bodyColor, .5, [0, angle, 0]);
        }
        this.voxel(base, [0, rise, 0], [.16 * pulse, .16 * pulse, .16], color, .92);
      }
    } else if (anomaly.kind === "draft") {
      for (let stream = 0; stream < 5; stream += 1) {
        const z = this.streamZ(stream, 9.2, 1.5, -40, 5);
        const x = polarity * (-7.7 + ((this.time * .82 + stream * 3.7) % 15.4));
        const base = compose([x, 1.1 + (stream * 7 % 4) * 1.15, z], [0, polarity * .34, polarity * .1]);
        this.voxel(base, [0, 0, 0], [.72 + intensity * .24, .14, .22], stream % 2 ? bodyColor : rimColor, .48);
        this.voxel(base, [-polarity * .66, .04, 0], [.22, .12, .16], stream % 2 ? color : secondary, .82);
      }
    } else if (anomaly.kind === "aurora") {
      for (let ribbon = 0; ribbon < 2; ribbon += 1) {
        const z = -30 - ribbon * 5.5;
        for (let block = -4; block <= 4; block += 1) {
          const wave = Math.sin(this.time * .32 * polarity + block * .7 + ribbon) * .54;
          const base = compose([block * 2.2 + ribbon * 1.1, 6.2 + ribbon * .62 + wave, z]);
          this.voxel(base, [0, 0, 0], [1.72, .18 * pulse, .28], (block + ribbon) % 2 ? bodyColor : rimColor, .4, [0, .08 * polarity, wave * .1]);
        }
      }
    } else if (anomaly.kind === "gravity") {
      const lens = compose([polarity * 7.2, 5.1, -25], [Math.PI / 2, 0, 0]);
      this.voxelHalo(lens, 2.5, 0, bodyColor, 16, polarity * .08, anomaly.phase, .18 * pulse);
      this.voxelHalo(lens, 1.78, 0, rimColor, 12, polarity * -.12, anomaly.phase, .14 * pulse);
      this.voxel(lens, [0, 0, 0], [.42 * pulse, .42 * pulse, .42 * pulse], color, .92);
    } else if (anomaly.kind === "prism") {
      for (let prism = 0; prism < 4; prism += 1) {
        const side = prism % 2 ? 1 : -1;
        const z = this.streamZ(prism, 12, .7, -41, 4);
        const base = compose([side * (6.5 + prism % 2 * 1.35), .5 + prism % 3 * 1.2, z], [0, this.time * .08 * polarity + prism, side * .12]);
        this.voxel(base, [0, 1.05, 0], [.5 * pulse, 2.1, .46], prism % 2 ? bodyColor : rimColor, .46, [0, .38, 0]);
        this.voxel(base, [side * -.26, 2.14, -.06], [.24, .5, .24], prism % 2 ? color : secondary, .88, [0, -.38, 0]);
      }
    } else if (anomaly.kind === "magnetar") {
      const magnet = compose([polarity * 6.8, 4.7, -24], [0, polarity * .18, polarity * .08]);
      this.voxel(magnet, [0, 0, 0], [.78, 2.8, .82], bodyColor, .42);
      this.voxel(magnet, [-polarity * .82, 1.15, 0], [1.5, .42, .7], rimColor, .52, [0, 0, polarity * .42]);
      this.voxelHalo(magnet, 2.4, .4, color, 14, polarity * .12, anomaly.phase, .16 * pulse);
      for (let flux = 0; flux < 6; flux += 1) {
        const phase = flux / 6 * TAU + this.time * .16 * polarity;
        this.pushVoxel(compose([polarity * 6.8 + Math.cos(phase) * 3.1, 4.7 + Math.sin(phase) * 1.5, -24], [phase, phase, 0], [.14, .14, .14]), flux % 2 ? color : secondary, 1);
      }
    } else if (anomaly.kind === "chrono") {
      const dial = compose([-polarity * 7.1, 5.2, -25], [0, anomaly.phase * .08, 0]);
      const radius = 2.45;
      for (let tick = 0; tick < 12; tick += 1) {
        const angle = tick / 12 * TAU;
        this.voxel(dial, [Math.cos(angle) * radius, Math.sin(angle) * radius, 0], [.2 * pulse, .2 * pulse, .28], tick % 3 ? bodyColor : rimColor, .58, [0, 0, angle]);
      }
      this.voxel(dial, [0, 0, 0], [.18, radius * .7, .18], color, .9, [0, 0, this.time * .42 * polarity]);
      this.voxel(dial, [0, 0, 0], [radius * .44, .16, .16], secondary, .86, [0, 0, -this.time * .26 * polarity]);
    } else if (anomaly.kind === "surge") {
      for (let wave = 0; wave < 2; wave += 1) {
        const cycle = (this.time * .22 + wave * .5 + anomaly.phase / TAU) % 1;
        const radius = 1.1 + cycle * 3.1;
        const side = wave ? 1 : -1;
        const base = compose([side * 6.9, 4.6 - wave * .8, -23 - wave * 7], [Math.PI / 2, 0, 0]);
        this.voxelHalo(base, radius, 0, wave ? bodyColor : rimColor, 18, polarity * .05, anomaly.phase, .18 * pulse);
        this.voxel(base, [0, 0, 0], [.28 * pulse, .28 * pulse, .28], wave ? color : secondary, .96);
      }
    }

    this.canvas.dataset.anomalyId = anomaly.id;
    this.canvas.dataset.anomalyKind = anomaly.kind;
    this.canvas.dataset.anomalyColor = color;
    this.canvas.dataset.anomalySecondary = secondary;
    this.canvas.dataset.anomalyIntensity = intensity.toFixed(3);
    this.canvas.dataset.anomalyPolarity = String(polarity);
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
        const island = compose([side * (5.1 + index % 3 * 1.05), .35 + index % 4 * .9, this.streamZ(index, 7.2, 1.45, -39, 8)], [0, index * .42, side * .08]);
        this.voxel(island, [0, 0, 0], [.9, .42, .82], "#6a5aa8", .32);
        this.voxelFlower(island, accent, secondary, .82 + index % 3 * .2);
      }
    } else if (biome.id === "crystalOrchard") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        this.voxelCrystal(compose([side * (5.4 + index % 3 * 1.08), .2 + index % 4 * .78, this.streamZ(index, 7, 1.6, -40, 8)], [index * .08, side * .18, side * .06]), index % 3 ? accent : secondary, index % 3 ? secondary : accent, 1.45 + index % 4 * .5);
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
        const base = compose([side * (6.4 + index * .72), .55 + index * .82, -11 - index * 9], [0, side * .16, side * .08]);
        this.voxel(base, [0, 0, 0], [.52, 2.1, .64], secondary, .36);
        this.voxel(base, [side * -.58, 1.04, 0], [1.16, .26, .7], accent, .78);
      }
    } else if (biome.id === "thunderWorks") {
      for (let gear = 0; gear < 5; gear += 1) {
        const side = gear % 2 ? 1 : -1;
        const base = compose([side * (6.5 + gear % 2), 1.2 + gear % 3 * .75, this.streamZ(gear, 8, 1.65, -34, 5)], [Math.PI / 2, 0, 0]);
        this.voxel(base, [0, 0, 0], [.35, .35, .5], secondary, .46);
        this.voxelHalo(base, 1.05 + gear % 3 * .25, 0, accent, 10, side * .32, gear, .18);
      }
      for (let index = 0; index < 5; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.2 + index % 3 * 1.1), .4 + index % 3 * 1.05, -12 - index * 6.4], [index * .18, side * .24, 0]);
        this.voxel(base, [0, 0, 0], [.68, 1.18, .72], secondary, .36);
        this.voxel(base, [0, .72, 0], [.94, .24, .9], accent, .82);
      }
    } else if (biome.id === "cloudReef") {
      for (let index = 0; index < 9; index += 1) {
        const side = index % 2 ? 1 : -1;
        const scale = .72 + index % 3 * .2;
        const base = compose([side * (5.2 + index % 3 * 1.05), .35 + index % 4 * .86, this.streamZ(index, 7.1, 1.4, -40, 9)], [0, index * .24, side * .08]);
        this.voxel(base, [0, 0, 0], [1.38 * scale, .46, 1.08 * scale], "#b9f2ff", .42);
        this.voxelCoral(base, accent, secondary, scale);
      }
    } else if (biome.id === "eclipseCarnival") {
      const eclipse = compose([-7.4, 5.5, -23], [0, this.time * .035, 0]);
      this.voxelOrb(eclipse, 2.7, "#784fd0", "#ff5d78");
      this.voxelHalo(eclipse, 3.45, 0, secondary, 20, .06, 0, .16);
      for (let gate = 0; gate < 4; gate += 1) {
        const side = gate % 2 ? 1 : -1;
        const z = this.streamZ(gate, 12.2, 1.55, -41, 4);
        const base = compose([side * (6.4 + gate % 2 * 1.2), .7 + gate % 3 * 1.2, z], [0, side * .22, side * .08]);
        this.voxel(base, [0, 0, 0], [.42, 2.5, .56], gate % 2 ? accent : secondary, .46);
        this.voxel(base, [side * -.72, 1.1, 0], [1.28, .28, .56], gate % 2 ? secondary : accent, .82);
      }
    } else if (biome.id === "prismGrave") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (5.3 + index % 3 * 1.12), .4 + index % 4 * .82, this.streamZ(index, 7.4, 1.48, -40, 8)], [0, side * .2, side * .1]);
        this.voxel(base, [0, .82 + index % 3 * .32, 0], [.62, 1.9 + index % 3 * .62, .62], index % 2 ? accent : secondary, .58);
        this.voxel(base, [side * -.5, 1.6 + index % 3 * .3, 0], [.86, .22, .78], index % 2 ? secondary : accent, .84, [0, 0, side * .58]);
      }
    } else if (biome.id === "voidGarden") {
      for (let index = 0; index < 8; index += 1) {
        const side = index % 2 ? 1 : -1;
        const island = compose([side * (5.2 + index % 3 * 1.18), .35 + index % 4 * .9, this.streamZ(index, 7.6, 1.32, -41, 8)], [0, side * .26, side * .08]);
        this.voxel(island, [0, 0, 0], [.92, .48, .88], "#655497", .34);
        this.voxelTree(island, accent, secondary, .82 + index % 3 * .22);
      }
      for (let mote = 0; mote < 10; mote += 1) {
        const phase = mote / 10 * TAU + this.time * .22;
        this.pushVoxel(compose([Math.cos(phase) * (6.5 + mote % 3), 2.3 + Math.sin(phase * 2) * 1.2, -15 - mote % 4 * 3.2], [phase, phase, 0], [.1, .1, .1]), mote % 2 ? accent : secondary, 1);
      }
    }
  }

  voxelRock(base, body, rim, scale = 1) {
    this.voxel(base, [0, 0, 0], [.9 * scale, .64 * scale, 1.02 * scale], body, .2);
    this.voxel(base, [.38 * scale, .24 * scale, -.24 * scale], [.48 * scale, .4 * scale, .58 * scale], rim, .28);
    this.voxel(base, [-.32 * scale, -.18 * scale, .28 * scale], [.42 * scale, .34 * scale, .5 * scale], body, .2);
  }

  drawCosmicBiomeFeatures(biome) {
    if (!biome) return;
    const sourceAccent = biome.accent || "#7fffe2";
    const sourceSecondary = biome.secondary || sourceAccent;
    const accent = this.mixColor(sourceAccent, "#18243c", .76);
    const secondary = this.mixColor(sourceSecondary, "#211f3d", .78);
    const coldRock = "#26324d";

    if (biome.id === "sugarBloom") {
      for (let index = 0; index < 3; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.4 + index % 2 * 1.4), 1.5 + index % 3 * 1.7, this.distantEcologyZ(index, 9.2, .16, -47)], [index * .18, side * .28, 0]);
        this.voxelRock(base, coldRock, secondary, 1.25 + index % 2 * .35);
        this.voxel(base, [side * .38, .18, -.18], [.24, .22, .28], "#b88958", .7);
      }
    } else if (biome.id === "crystalOrchard") {
      for (let index = 0; index < 6; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (5.8 + index % 3 * 1.08), .8 + index % 4 * 1.2, this.distantEcologyZ(index, 5.1, .18, -48)], [side * .2, index * .5, side * .12]);
        this.voxel(base, [0, 0, 0], [.62, 1.65 + index % 3 * .42, .58], index % 2 ? accent : secondary, .38, [0, .38, .12]);
        this.voxel(base, [0, .92, 0], [.3, .48, .3], sourceAccent, .68, [0, -.38, 0]);
      }
    } else if (biome.id === "cometTide") {
      for (let index = 0; index < 5; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (4.9 + index % 3 * 1.4), 2 + index % 3 * 1.35, this.distantEcologyZ(index, 6.2, .32, -48)], [0, side * .68, 0]);
        this.voxel(base, [0, 0, 0], [.54, .48, .82], coldRock, .38);
        this.voxel(base, [0, .08, -.36], [.22, .18, .3], sourceAccent, .72);
        for (let tail = 1; tail <= 2; tail += 1) this.voxel(base, [0, 0, -tail * .78], [.24, .2, .58], tail === 1 ? accent : secondary, .52 - tail * .1);
      }
    } else if (biome.id === "auroraFoundry") {
      for (let ribbon = 0; ribbon < 2; ribbon += 1) {
        for (let segment = 0; segment < 8; segment += 1) {
          const wave = Math.sin(segment * .78 + ribbon + this.time * .28) * .72;
          this.voxel(compose([0, 0, 0]), [-9 + segment * 2.55, 5.5 + ribbon * 1.05 + wave, -25 - ribbon * 5], [2.05, .18, .26], ribbon ? secondary : accent, .42, [0, .06, wave * .08]);
        }
      }
    } else if (biome.id === "thunderWorks") {
      for (let index = 0; index < 3; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.6 + index * .8), 2.4 + index * 1.35, this.distantEcologyZ(index, 9.4, .16, -47)], [Math.PI / 2, 0, 0]);
        this.voxelRing(base, 1.25 + index * .26, 0, index % 2 ? accent : secondary, 16, side * .012, index * .4, .16, .72, .7);
        this.voxel(base, [0, 0, 0], [.58, .58, .68], coldRock, .28);
        this.voxel(base, [0, 0, 0], [.26, .26, .32], "#d3bc65", .72);
      }
    } else if (biome.id === "cloudReef") {
      for (let index = 0; index < 4; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.2 + index % 2 * 1.5), 1.2 + index % 3 * 1.45, this.distantEcologyZ(index, 7.8, .14, -47)], [0, index * .35, 0]);
        this.voxel(base, [0, 0, 0], [1.55, .58, 1.18], "#34445e", .2);
        this.voxel(base, [side * .72, .2, -.22], [1.12, .5, .9], accent, .3);
        this.voxel(base, [side * -.58, -.12, .34], [.92, .44, .82], secondary, .26);
      }
    } else if (biome.id === "eclipseCarnival") {
      for (let index = 0; index < 3; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.2 + index * .75), 1.2 + index * 1.25, this.distantEcologyZ(index, 8.4, .12, -46)], [index * .4, side * .22, .1]);
        this.voxelRock(base, coldRock, secondary, .8 + index * .16);
      }
    } else if (biome.id === "prismGrave") {
      for (let index = 0; index < 5; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (5.9 + index % 3 * 1.15), 1 + index % 3 * 1.4, this.distantEcologyZ(index, 6.3, .15, -48)], [0, side * .22, side * .12]);
        this.voxel(base, [0, 0, 0], [.72, 2.2 + index % 2 * .6, .68], index % 2 ? accent : secondary, .34, [0, .34, .12]);
        this.voxel(base, [side * -.52, .72, 0], [.9, .24, .76], coldRock, .26, [0, 0, side * .58]);
      }
    } else if (biome.id === "voidGarden") {
      for (let index = 0; index < 4; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.2 + index % 2 * 1.45), 1.2 + index % 3 * 1.55, this.distantEcologyZ(index, 7.7, .13, -47)], [0, side * .34, side * .1]);
        this.voxel(base, [0, 0, 0], [.5, 1.8, .52], "#302945", .24, [0, 0, side * .18]);
        this.voxel(base, [side * .72, .68, 0], [1.25, .28, .42], secondary, .32, [0, 0, side * .5]);
        this.voxel(base, [side * 1.18, 1.08, 0], [.34, .58, .38], accent, .46);
        this.voxel(base, [side * -.48, -.42, .3], [.86, .28, .5], "#3a304d", .26, [0, side * .48, side * -.35]);
      }
    }
  }

  voxelSeedPod(base, body, seam, core, scale = 1) {
    const left = multiply(base, compose([-.48 * scale, 0, .08 * scale], [0, -.16, -.08], [1, .68, 1.18]));
    const right = multiply(base, compose([.48 * scale, -.04 * scale, .12 * scale], [0, .16, .08], [1, .68, 1.18]));
    this.voxelOrb(left, .72 * scale, "#2b3b55", body);
    this.voxelOrb(right, .72 * scale, body, seam);
    this.voxel(base, [0, -.06 * scale, -.72 * scale], [.74 * scale, .42 * scale, .48 * scale], "#374961", .22, [0, .08, 0]);
    for (const side of [-1, 0, 1]) {
      this.voxel(base, [side * .38 * scale, .4 * scale, -.22 * scale], [.28 * scale, .14 * scale, .66 * scale], side === 0 ? core : seam, side === 0 ? .92 : .58, [0, side * .12, 0]);
    }
    this.voxel(base, [0, .48 * scale, -.68 * scale], [.32 * scale, .22 * scale, .3 * scale], core, .96);
  }

  voxelShardCluster(base, rock, crystal, core, scale = 1) {
    this.voxelRock(base, rock, "#52617b", .86 * scale);
    this.voxel(base, [0, 1.08 * scale, 0], [.58 * scale, 2.18 * scale, .62 * scale], crystal, .4, [0, .32, .12]);
    this.voxel(base, [-.68 * scale, .62 * scale, .18 * scale], [.34 * scale, 1.28 * scale, .38 * scale], "#4b5a76", .3, [0, -.34, -.28]);
    this.voxel(base, [.7 * scale, .48 * scale, -.22 * scale], [.3 * scale, 1.02 * scale, .34 * scale], crystal, .34, [0, .42, .3]);
    this.voxel(base, [.08 * scale, 1.7 * scale, -.18 * scale], [.22 * scale, .48 * scale, .24 * scale], core, .9, [0, -.28, 0]);
  }

  voxelNebulaCell(base, body, rim, core, scale = 1) {
    this.voxel(base, [0, 0, 0], [1.06 * scale, .86 * scale, 1.02 * scale], body, .2, [0, .18, 0]);
    this.voxel(base, [-.62 * scale, .12 * scale, .12 * scale], [.78 * scale, .66 * scale, .76 * scale], "#3c506d", .22, [0, -.22, .08]);
    this.voxel(base, [.6 * scale, -.1 * scale, -.16 * scale], [.74 * scale, .62 * scale, .7 * scale], body, .2, [0, .28, -.06]);
    this.voxel(base, [.08 * scale, .48 * scale, -.12 * scale], [.72 * scale, .5 * scale, .66 * scale], rim, .4, [0, -.14, 0]);
    this.voxel(base, [-.12 * scale, -.42 * scale, .16 * scale], [.64 * scale, .42 * scale, .58 * scale], "#4e6179", .28, [0, .16, 0]);
    this.voxel(base, [-.12 * scale, .6 * scale, -.42 * scale], [.22 * scale, .18 * scale, .24 * scale], core, .8);
    const membrane = multiply(base, compose([0, .08 * scale, 0]));
    this.voxelRing(membrane, .96 * scale, 0, rim, 16, .012, .25, .12 * scale, .74, .62);
  }

  voxelRelicPylon(base, body, trim, light, scale = 1, handed = 1) {
    this.voxel(base, [0, .9 * scale, 0], [.54 * scale, 1.8 * scale, .7 * scale], body, .22, [0, 0, handed * .08]);
    this.voxel(base, [handed * .62 * scale, 1.08 * scale, .04], [1.18 * scale, .24 * scale, .58 * scale], trim, .32, [0, 0, handed * .38]);
    this.voxel(base, [0, .12 * scale, .12 * scale], [.94 * scale, .3 * scale, .92 * scale], "#33455f", .2, [0, handed * .18, 0]);
    this.voxel(base, [-handed * .18 * scale, 1.18 * scale, -.38 * scale], [.18 * scale, 1.16 * scale, .18 * scale], light, .82);
    this.voxel(base, [handed * .1 * scale, 2.02 * scale, -.08 * scale], [.34 * scale, .34 * scale, .36 * scale], light, .92);
  }

  voxelCometMass(base, rock, wake, core, scale = 1) {
    const nucleus = multiply(base, compose([0, 0, 0], [0, .08, -.04], [1, .74, 1.12]));
    this.voxelOrb(nucleus, .78 * scale, rock, "#5a6983");
    this.voxel(base, [0, .12 * scale, -.78 * scale], [.34 * scale, .28 * scale, .46 * scale], core, .82);
    for (let tail = 1; tail <= 3; tail += 1) {
      const taper = 1 - tail * .18;
      this.voxel(base, [0, 0, tail * 1.08 * scale], [.4 * taper * scale, .3 * taper * scale, .82 * scale], tail === 1 ? wake : "#435b77", .52 - tail * .08);
    }
  }

  voxelVoidBranch(base, body, vein, tip, scale = 1, handed = 1) {
    this.voxel(base, [0, .86 * scale, 0], [.48 * scale, 1.72 * scale, .52 * scale], body, .24, [0, 0, handed * .16]);
    this.voxel(base, [handed * .64 * scale, 1.32 * scale, 0], [1.12 * scale, .3 * scale, .42 * scale], vein, .34, [0, 0, handed * .48]);
    this.voxel(base, [handed * 1.16 * scale, 1.7 * scale, -.08 * scale], [.38 * scale, .8 * scale, .4 * scale], body, .26, [0, 0, handed * .26]);
    this.voxel(base, [-handed * .46 * scale, .42 * scale, .26 * scale], [.82 * scale, .26 * scale, .46 * scale], "#3a435d", .22, [0, handed * .4, -handed * .3]);
    this.voxel(base, [handed * 1.34 * scale, 2.12 * scale, -.12 * scale], [.24 * scale, .3 * scale, .26 * scale], tip, .76);
  }

  drawSpaceEcology(biome) {
    if (!biome) return;
    const sourceAccent = biome.accent || "#7fffe2";
    const sourceSecondary = biome.secondary || sourceAccent;
    const accent = this.mixColor(sourceAccent, "#263b55", .46);
    const secondary = this.mixColor(sourceSecondary, "#35314c", .5);
    const rock = "#31425e";
    const metal = "#586a84";
    const pale = this.mixColor(sourceAccent, "#d5e4e7", .62);
    const macro = ECOLOGY_ANCHORS[biome.id] || [-15, 2, -23];

    if (biome.id === "sugarBloom") {
      const nursery = compose(macro, [.04, -.32, -.12]);
      this.voxelSeedPod(nursery, rock, "#9d734f", "#ffc66d", 3.45);
      this.voxelPolyline(nursery, [[-3.7, -.4, .3], [-4.55, .45, .1], [-4.15, 1.65, -.4], [-3.15, 2.45, -.8]], .28, "#c28b58", .56, .1);
      this.voxelPolyline(nursery, [[3.55, -.25, .5], [4.35, .55, .2], [4.05, 1.55, -.2], [3.25, 2.15, -.65]], .24, "#8a6953", .46, .1);
      for (let mote = 0; mote < 8; mote += 1) {
        const angle = mote / 8 * TAU + .3;
        this.voxel(nursery, [Math.cos(angle) * 4.95, 1.2 + Math.sin(angle * 2) * 1.45, Math.sin(angle) * 1.7], [.18, .18, .22], mote % 3 ? "#9b7656" : "#ffd27c", mote % 3 ? .56 : .86);
      }
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.8 + index * .7), 1.1 + index * 1.35, this.streamZ(index, 17, .46, -48, 3)], [index * .16, side * .38, side * .1]);
        this.voxelSeedPod(base, rock, "#87664e", "#e4a95d", .76 + index * .12);
      }
    } else if (biome.id === "crystalOrchard") {
      const crown = compose(macro, [.12, .22, -.18]);
      this.voxelRock(crown, rock, "#4b5870", 2.65);
      const crownShards = [
        [-2.7, 1.25, .35, .62, 2.5, .62, -.46, secondary],
        [-1.35, 2.05, -.1, .76, 4.1, .72, -.22, "#526a92"],
        [0, 2.65, -.4, .92, 5.3, .84, .06, accent],
        [1.45, 1.9, .05, .7, 3.8, .68, .3, "#5d5478"],
        [2.75, 1.12, .4, .54, 2.24, .56, .5, secondary],
      ];
      for (const [x, y, z, width, height, depth, tilt, color] of crownShards) {
        this.voxel(crown, [x, y, z], [width, height, depth], color, .34, [0, tilt * .42, tilt]);
        this.voxel(crown, [x + Math.sin(tilt) * height * .46, y + height * .52, z - .08], [width * .58, .42, depth * .58], pale, .86, [0, tilt * .42, tilt]);
      }
      this.voxelPolyline(crown, [[-3.65, -.2, .45], [-2.7, .2, .2], [-1.5, -.05, -.05], [0, .35, -.2], [1.5, -.02, 0], [2.75, .25, .22], [3.65, -.16, .5]], .24, "#455a76", .48, .02);
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.6 + index % 2 * 1.3), .65 + index % 3 * 1.4, this.streamZ(index, 12.5, .52, -47, 4)], [side * .18, index * .42, side * .1]);
        this.voxelShardCluster(base, rock, index % 2 ? accent : secondary, pale, .58 + index % 2 * .14);
      }
    } else if (biome.id === "cometTide") {
      const leviathan = compose(macro, [.08, .72, -.16]);
      this.voxelCometMass(leviathan, rock, accent, pale, 3.4);
      this.voxelPolyline(leviathan, [[-1.5, .6, 2.2], [-1.9, .85, 4.2], [-1.15, .45, 6.3], [-2.15, .15, 8.55]], .48, "#5b7796", .5, .12);
      this.voxelPolyline(leviathan, [[.1, .1, 2.35], [.55, -.35, 4.7], [.05, -.72, 7.25], [.9, -.5, 10.1]], .38, accent, .74, .12);
      this.voxelPolyline(leviathan, [[1.45, -.45, 2.15], [1.9, -.8, 4.05], [1.35, -1.2, 6.1], [2.25, -1.45, 8.25]], .26, pale, .84, .12);
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (7.1 + index * .55), 1.4 + index * 1.45, this.streamZ(index, 16, 1.18, -49, 3)], [0, side * (.58 + index * .08), side * .1]);
        this.voxelCometMass(base, rock, secondary, pale, .62 + index * .12);
      }
    } else if (biome.id === "auroraFoundry") {
      const foundry = compose(macro, [.08, -.18, -.12]);
      this.voxelPolyline(foundry, [[-4.8, 0, .45], [0, 3.45, 0], [4.8, 0, -.45], [0, -3.45, 0], [-4.8, 0, .45]], .38, metal, .34, 0);
      this.voxelPolyline(foundry, [[-3.45, 0, .2], [0, 2.38, 0], [3.45, 0, -.2]], .2, accent, .76, 0);
      this.voxelPolyline(foundry, [[-3.45, -.2, .2], [0, -2.38, 0], [3.45, -.2, -.2]], .18, secondary, .68, 0);
      this.voxel(foundry, [0, 0, 0], [1.9, 1.55, 1.9], rock, .3, [0, .28, 0]);
      this.voxel(foundry, [0, .15, -.86], [.72, .72, .5], pale, .94, [0, .28, 0]);
      for (const side of [-1, 1]) {
        this.voxel(foundry, [side * 2.55, 0, 0], [2.2, .34, .52], metal, .34, [0, 0, side * .14]);
        this.voxel(foundry, [side * 4.6, 0, 0], [.62, 1.18, .72], "#41536c", .3, [0, 0, side * .3]);
      }
      this.voxelPolyline(foundry, [[-5.4, -1.55, .5], [-3.4, -2.25, .25], [-1.25, -1.75, .05], [1.05, -2.45, -.1], [3.35, -1.9, -.3], [5.35, -2.55, -.5]], .22, secondary, .78, .03);
      this.voxelPolyline(foundry, [[-5.15, 1.65, -.4], [-3.05, 2.2, -.2], [-.9, 1.7, 0], [1.4, 2.38, .18], [3.7, 1.82, .4]], .18, pale, .84, .03);
      for (let index = 0; index < 2; index += 1) {
        const side = index ? 1 : -1;
        this.voxelRelicPylon(compose([side * 7.4, .3 + index * 1.4, -17 - index * 13], [0, side * .3, side * .08]), rock, metal, pale, .82, side);
      }
    } else if (biome.id === "thunderWorks") {
      const coil = compose(macro, [Math.PI / 2, -.08, -.16]);
      this.voxelRing(coil, 4.72, 0, "#626c80", 26, .022, .2, .3, .4, .84);
      this.voxelRing(coil, 3.35, 0, accent, 20, -.052, 1.1, .18, .92, .7);
      this.voxel(coil, [0, 0, 0], [1.7, 1.7, 1.8], rock, .3);
      this.voxel(coil, [0, 0, 0], [.58, .58, .62], "#ffe68b", .92);
      const spark = Math.sin(this.time * 4.8) > -.25 ? "#fff3ae" : accent;
      this.voxelPolyline(coil, [[-5.5, -1.9, .3], [-4.1, -.8, .12], [-2.7, -1.35, -.05], [-1.35, -.35, .12], [0, -.8, -.15]], .2, spark, .94, .08);
      this.voxelPolyline(coil, [[.2, .75, -.12], [1.45, 1.55, .12], [2.6, .8, -.08], [3.85, 1.75, .15], [5.25, 1.1, -.12]], .18, accent, .9, .08);
      for (let index = 0; index < 2; index += 1) {
        const side = index ? 1 : -1;
        this.voxelRelicPylon(compose([side * 7.2, .2 + index * 1.5, -18 - index * 14], [0, side * .22, 0]), rock, metal, index ? pale : "#c4ad69", .86, side);
      }
    } else if (biome.id === "cloudReef") {
      const reef = compose(macro, [0, .18, .08]);
      const cloudOffsets = [[0, 0, 0], [-3.1, .75, .4], [3.05, -.3, -.45], [-1.45, 2.35, -.72], [2.1, 2.05, .52]];
      for (const [index, offset] of cloudOffsets.entries()) {
        const cell = multiply(reef, compose(offset));
        this.voxelNebulaCell(cell, index % 2 ? "#3b526e" : rock, secondary, pale, 1.18 + index % 3 * .16);
      }
      this.voxelPolyline(reef, [[-5.15, .9, -.8], [-3.35, 1.75, -.45], [-1.2, 1.35, -.15], [.8, 2.15, .18], [3.2, 1.55, .5], [5.25, 2.3, .75]], .2, pale, .84, .04);
      this.voxelPolyline(reef, [[-4.6, -.35, .45], [-2.8, .25, .2], [-.7, -.15, 0], [1.4, .5, -.18], [3.75, .05, -.45]], .26, accent, .68, .05);
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.8 + index * .6), .8 + index * 1.35, this.streamZ(index, 17, .42, -49, 3)], [0, side * .26, 0]);
        this.voxelNebulaCell(base, rock, index % 2 ? accent : secondary, pale, .76 + index * .1);
      }
    } else if (biome.id === "eclipseCarnival") {
      const eclipse = compose(macro, [.18, this.time * .008, -.12]);
      this.voxelOrb(eclipse, 3.55, "#171b2c", "#3f3347");
      this.voxelRing(eclipse, 4.45, 0, "#c36268", 28, .01, .2, .18, .88, .86);
      this.voxelRing(eclipse, 5.28, 0, "#684c68", 30, -.008, .8, .14, .54, .62);
      this.voxelPolyline(eclipse, [[-5.6, -2.2, .5], [-4.3, -1.15, .28], [-3.25, -1.55, .05]], .22, "#814e61", .54, .1);
      this.voxelPolyline(eclipse, [[3.25, 1.4, -.05], [4.45, 2.15, -.3], [5.45, 1.35, -.55]], .18, pale, .82, .1);
      for (let index = 0; index < 2; index += 1) {
        const side = index ? 1 : -1;
        const wreck = compose([side * 7.4, .5 + index * 1.6, -18 - index * 14], [index * .3, side * .42, side * .12]);
        this.voxelRelicPylon(wreck, rock, "#68546b", index ? "#c66b70" : pale, .82, side);
        this.voxel(wreck, [side * 1.1, 1.6, .2], [.7, .2, .5], "#2b3147", .24, [0, side * .4, side * .52]);
      }
    } else if (biome.id === "prismGrave") {
      const monument = compose(macro, [.08, -.18, .14]);
      this.voxel(monument, [0, 2.25, 0], [1.04, 4.5, 1.02], "#4a4262", .3, [0, .08, .04]);
      this.voxel(monument, [0, 4.72, -.08], [.7, .56, .72], pale, .84, [0, .22, .12]);
      this.voxel(monument, [-2.65, 1.55, .42], [.9, 3.1, .84], "#403c59", .3, [0, -.24, -.32]);
      this.voxel(monument, [2.55, 1.18, -.38], [.82, 2.36, .8], "#594563", .32, [0, .32, .42]);
      this.voxel(monument, [-2.65, 3.32, .35], [.5, .44, .52], secondary, .68, [0, -.2, 0]);
      this.voxel(monument, [2.55, 2.55, -.42], [.46, .38, .48], accent, .72, [0, .28, 0]);
      this.voxelPolyline(monument, [[-4.3, -.15, .5], [-4.15, 1.55, .35], [-3.35, 3.05, .2], [-2.1, 4.15, .05], [-.72, 4.72, -.1]], .34, secondary, .48, .08);
      this.voxelPolyline(monument, [[4.3, -.15, -.5], [4.15, 1.55, -.35], [3.35, 3.05, -.2], [2.1, 4.15, -.05], [.72, 4.72, .1]], .3, "#4d6178", .4, .08);
      this.voxel(monument, [-.36, 4.82, 0], [.34, .26, .42], pale, .88, [0, -.3, .18]);
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.7 + index * .7), .45 + index * 1.25, this.streamZ(index, 16, .38, -49, 3)], [0, side * .24, side * .1]);
        this.voxelShardCluster(base, rock, index % 2 ? accent : secondary, pale, .62 + index * .1);
      }
    } else if (biome.id === "voidGarden") {
      const singularity = compose(macro, [Math.PI / 2, 0, -.14]);
      this.voxel(singularity, [0, 0, 0], [2.25, 2.25, 2.34], "#17182a", .22);
      this.voxelRing(singularity, 4.12, 0, "#62456d", 28, .02, .2, .26, .5, .78);
      this.voxelRing(singularity, 5.18, 0, accent, 30, -.012, 1.1, .16, .9, .68);
      const garden = compose([macro[0], macro[1] - .5, macro[2] - 1], [0, -.05, -.08]);
      this.voxelPolyline(garden, [[-1.3, .1, .4], [-2.5, 1.15, .15], [-3.7, 1.55, -.2], [-4.7, 2.75, -.4]], .38, "#343853", .36, .1);
      this.voxelPolyline(garden, [[1.15, .2, .3], [2.15, -.55, .05], [3.25, -.15, -.25], [4.35, -1.15, -.5]], .34, secondary, .5, .1);
      this.voxelPolyline(garden, [[-.55, .35, .2], [-.9, 1.65, 0], [-.35, 2.75, -.25], [-.75, 3.85, -.55]], .24, accent, .74, .1);
      for (const side of [-1, 1]) this.voxelVoidBranch(compose([macro[0] + side * 4.25, macro[1] - .5, macro[2] - 1 + side * 1.2], [0, -side * .28, -side * .08]), "#30344e", secondary, pale, 1.6, -side);
      for (let index = 0; index < 2; index += 1) {
        const side = index % 2 ? 1 : -1;
        const base = compose([side * (6.8 + index * .7), .35 + index * 1.4, this.streamZ(index, 17, .34, -50, 3)], [0, side * .34, side * .1]);
        this.voxelVoidBranch(base, "#343951", secondary, pale, .66 + index * .1, side);
      }
    }
  }

  drawDistantCelestial(biome) {
    if (!biome) return;
    const macro = ECOLOGY_ANCHORS[biome.id] || [-14, 1, -24];
    const side = macro[0] > 2 ? -1 : 1;
    const base = compose([side * 17.2, -1.25, -44], [.12, side * .18 + this.time * .004, side * .08]);
    const accent = this.mixColor(biome.accent || "#7fffe2", "#35445f", .72);
    const secondary = this.mixColor(biome.secondary || biome.accent || "#7fffe2", "#4a405b", .7);

    if (biome.id === "sugarBloom") {
      this.voxelOrb(base, 3.05, "#1d2a42", "#5d4d42");
      this.voxelRing(base, 3.82, 0, "#705842", 24, .003, .2, .16, .42, .72);
    } else if (biome.id === "crystalOrchard") {
      this.voxelOrb(base, 2.65, "#17243b", "#334765");
      for (const [index, offset] of [[0, [-3.4, .8, .4]], [1, [3.25, -1.1, -.3]], [2, [2.5, 2.5, -.5]]]) {
        this.voxelShardCluster(multiply(base, compose(offset, [0, index * .4, side * .12])), "#26344d", accent, "#afc9d8", .34 + index * .05);
      }
    } else if (biome.id === "cometTide") {
      this.voxelCometMass(multiply(base, compose([0, 0, 0], [0, side * .82, .06])), "#202e47", accent, "#8fb0c5", 2.2);
    } else if (biome.id === "auroraFoundry") {
      this.voxelOrb(base, 2.78, "#172a3c", "#294b53");
      for (let band = -1; band <= 1; band += 1) {
        this.voxelPolyline(base, [[-2.45, band * .62, -2.25], [-.8, band * .52 + .2, -2.62], [.8, band * .58 - .15, -2.6], [2.38, band * .5 + .12, -2.18]], .14, band === 0 ? accent : secondary, .62, .04);
      }
    } else if (biome.id === "thunderWorks") {
      this.voxelOrb(base, 2.92, "#202a3f", "#5b5141");
      for (let band = -1; band <= 1; band += 1) {
        this.voxelSegment(base, [-2.55, band * .72, -2.3], [2.5, band * .58 + .16, -2.3], .18, band === 0 ? "#9a7e48" : secondary, .56);
      }
    } else if (biome.id === "cloudReef") {
      for (const [index, offset] of [[0, [0, 0, 0]], [1, [-2.35, .65, .35]], [2, [2.1, -.55, -.45]]]) {
        this.voxelNebulaCell(multiply(base, compose(offset, [0, index * .35, 0])), "#25364f", index === 1 ? secondary : accent, "#8ca8b1", 1.15 + index * .12);
      }
    } else if (biome.id === "eclipseCarnival") {
      for (let index = 0; index < 5; index += 1) {
        const angle = index / 5 * TAU + .35;
        this.voxelRock(multiply(base, compose([Math.cos(angle) * 2.8, Math.sin(angle) * 1.65, Math.sin(angle) * .7], [angle, angle * .6, 0])), "#24283c", index % 2 ? secondary : accent, .46 + index % 2 * .12);
      }
    } else if (biome.id === "prismGrave") {
      this.voxelOrb(base, 2.05, "#20243b", "#44405e");
      for (let index = 0; index < 4; index += 1) {
        const angle = index / 4 * TAU + .5;
        this.voxel(multiply(base, compose([Math.cos(angle) * 3, Math.sin(angle) * 2.15, Math.sin(angle) * .5], [angle, angle * .4, 0])), [0, 0, 0], [.5, .78 + index * .12, .48], index % 2 ? accent : secondary, .36, [0, .3, angle]);
      }
    } else if (biome.id === "voidGarden") {
      this.voxel(base, [0, 0, 0], [2.2, 2.2, 2.2], "#17192c", .2);
      this.voxelRing(base, 3.35, 0, accent, 22, -.004, .3, .16, .5, .58);
      this.voxelRing(base, 2.65, 0, secondary, 20, .005, 1.1, .14, .4, .42);
    }
  }

  drawLandmark(stageIndex, biome) {
    this.drawDistantCelestial(biome);
    this.drawFlightCorridor(biome);
    this.drawCosmicBiomeFeatures(biome);
    this.drawSpaceEcology(biome);
  }

  projectileTrail(base, color, width, length, segments = 3, offsetX = 0) {
    const count = this.quality === "low" ? 1 : Math.min(2, segments);
    for (let segment = 0; segment < count; segment += 1) {
      const falloff = 1 - segment * .22;
      this.voxel(base, [offsetX, 0, -length * (.55 + segment * .58)], [width * falloff, width * falloff, length * .32], color, .84 - segment * .16);
    }
  }

  drawProjectile(bullet, enemy = false) {
    const position = this.toWorld(bullet.x, bullet.y, enemy ? .42 : .52);
    if (!enemy) position[0] += Math.sin((bullet.y || 0) * .11 + (bullet.owner || 0) * 2.4) * .055;
    const travelAngle = Math.atan2(bullet.vx, bullet.vy);
    const rotation = [0, travelAngle, 0];
    if (enemy) {
      const size = .11 + bullet.r * .026;
      const color = this.highContrastBullets ? "#fff06a" : "#ff5d88";
      const hostileEdge = this.highContrastBullets ? "#ff7a58" : "#9b4bc2";
      const hostileCore = this.highContrastBullets ? "#ffffff" : (bullet.payloadColor || "#dfff68");
      const base = compose(position, rotation);
      if (bullet.bossStage === 0) {
        const opening = 1 + (bullet.bossPhase || 1) * .12;
        this.voxel(base, [0, 0, 0], [size * 2.4 * opening, size * .78, size * 1.25], color, 1, [0, .38, 0]);
        this.voxel(base, [0, 0, 0], [size * 2.4 * opening, size * .78, size * 1.25], hostileCore, .9, [0, -.38, 0]);
        this.projectileTrail(base, hostileEdge, size * .62, size * 1.7, 3);
      } else if (bullet.bossStage === 1) {
        this.voxel(base, [0, 0, 0], [size * 1.3, size * 1.05, size * 4.4], color, 1);
        for (const side of [-1, 1]) this.voxel(base, [side * size * 1.25, 0, size * .25], [size * 1.1, size * .62, size * 1.8], "#ffe45c", .78, [0, side * .32, 0]);
        this.projectileTrail(base, hostileEdge, size * .55, size * 2.4, 3);
      } else if (bullet.bossStage === 2) {
        const spin = bullet.age * 4.6;
        for (let arm = 0; arm < 3; arm += 1) this.voxel(base, [0, 0, 0], [size * 2.7, size * .8, size * 1.25], arm === 1 ? "#ff6680" : color, 1, [0, spin + arm * TAU / 3, 0]);
        this.projectileTrail(base, hostileCore, size * .66, size * 1.7, 3);
      } else if (bullet.weaponModule === "sniper") {
        this.voxel(base, [0, 0, 0], [size, size, size * 4.4], color, 1);
        this.voxel(base, [0, 0, size * 2.35], [size * .7, size * .7, size * 1.8], hostileCore, .94);
        for (const side of [-1, 1]) this.voxel(base, [side * size * 1.1, 0, size * .4], [size * 1.4, size * .72, size * .62], hostileEdge, .8, [0, side * .55, 0]);
        this.projectileTrail(base, hostileEdge, size * .38, size * 2.2, 3);
      } else if (bullet.weaponModule === "orbit") {
        this.voxel(base, [0, 0, 0], [size * 2.8, size, size], color, 1, [0, bullet.age * 5, 0]);
        this.voxel(base, [0, 0, 0], [size, size, size * 2.8], hostileEdge, 1, [0, bullet.age * 5, 0]);
        this.voxel(base, [0, .04, 0], [size, size, size], hostileCore, 1);
        this.projectileTrail(base, hostileEdge, size * .56, size * 1.6, 2);
      } else if (bullet.weaponModule === "twin") {
        this.voxel(base, [-size * 1.15, 0, 0], [size, size, size * 2.1], color, 1);
        this.voxel(base, [size * 1.15, 0, 0], [size, size, size * 2.1], color, 1);
        this.voxel(base, [0, .04, size * .18], [size * 2.8, size * .72, size * .72], hostileCore, .9);
        this.projectileTrail(base, hostileEdge, size * .48, size * 1.4, 2, -size);
        this.projectileTrail(base, hostileEdge, size * .48, size * 1.4, 2, size);
      } else {
        this.voxel(base, [0, 0, 0], [size * 1.3, size * 1.1, size * 1.9], color, 1);
        for (const side of [-1, 1]) this.voxel(base, [side * size, 0, size * .28], [size * 1.2, size * .72, size * .6], hostileEdge, .82, [0, side * .58, 0]);
        this.voxel(base, [0, .05, -size * .15], [size * .72, size * .72, size], hostileCore, 1);
        this.projectileTrail(base, hostileEdge, size * .52, size * 1.4, 2);
      }
      if (bullet.payloadModule !== "clean") {
        this.voxel(base, [0, 0, size * 1.45], [size * .86, size * .86, size * .86], hostileCore, .94);
      }
    } else {
      const base = compose(position, rotation);
      if (bullet.phaseBarrier) {
        this.voxel(base, [0, 0, 0], [.18, .16, .54], "#e9ffff", 1);
        this.voxel(base, [0, .03, -.25], [.3, .14, .2], "#58dfff", .92);
        this.projectileTrail(base, "#58dfff", .12, .32, 2);
      } else if ((bullet.seeker || 0) > 0) {
        this.voxel(base, [0, 0, -.04], [.16, .16, .4], "#e9ffff", 1);
        this.voxel(base, [0, .02, .22], [.32, .14, .2], "#a96cff", .9);
        this.projectileTrail(base, "#a96cff", .12, .26, 2);
      } else if ((bullet.r || 0) > 2.35) {
        this.voxel(base, [0, 0, 0], [.2, .2, .44], "#e9ffff", 1);
        this.voxel(base, [0, .03, -.24], [.16, .16, .2], "#ffd454", .94);
        this.projectileTrail(base, "#ffd454", .12, .3, 2);
      } else {
        this.voxel(base, [0, 0, 0], [.14, .12, .48], bullet.color, .72);
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
    const base = compose(middle, [0, Math.atan2(dx, dz), 0]);
    const beamSegments = clamp(Math.ceil(length / .72), 3, 8);
    const segmentLength = length / beamSegments * .58;
    for (let segment = 0; segment < beamSegments; segment += 1) {
      const z = -length / 2 + (segment + .5) * length / beamSegments;
      this.voxel(base, [0, 0, z], [.12, .12, segmentLength], segment % 3 === 1 ? "#bde9e6" : "#55beba", .84);
    }
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
    this.scene.fog.density = this.quality === "low" ? .009 : .011;
    this.starLayers[0].material.color.set(stage.star);
    this.starLayers[1].material.color.set(stage.biome?.secondary || stage.star);
    this.starLayers[2].material.color.set(stage.biome?.accent || stage.star);
    this.starLayers[0].position.z = (this.time * .46) % 24;
    this.starLayers[1].position.z = ((this.time * .28) % 24) - 12;
    this.starLayers[2].position.z = ((this.time * .12) % 24) - 18;
    this.nebulaLayers[0].material.color.set(this.mixColor(stage.biome?.secondary || stage.star, "#303650", .46));
    this.nebulaLayers[1].material.color.set(this.mixColor(stage.biome?.accent || stage.star, "#1d2942", .54));
    this.nebulaLayers[0].position.z = ((this.time * .045) % 10) - 5;
    this.nebulaLayers[1].position.z = ((this.time * .028) % 12) - 6;
    this.rimLight.color.set(world.activeAnomaly?.color || stage.biome?.accent || stage.grid);
    this.rimLight.intensity = (this.quality === "low" ? .9 : 1.2) + (world.sectorIndex || 0) * .14 + (world.threatTier || 0) * .08 + (world.activeAnomaly?.tier || 0) * .1;
    this.renderer.shadowMap.enabled = false;
    for (const batch of this.toonBatches.values()) batch.castShadow = false;
    this.playerLights.forEach((light, index) => {
      const player = world.players?.[index];
      light.visible = Boolean(player && world.mode !== "menu" && !world.modelGallery);
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
    this.drawAnomalyField(world);
    this.drawThreatMatrix(world);
    if (world.boss) this.drawBossArena(world.boss);
    if (world.mode === "menu") {
      this.drawShip({ index: 0, frameId: world.loadoutFrame, moduleId: world.loadoutModule, x: 4.8 + Math.sin(this.time * .6) * .4, z: -.5 + Math.cos(this.time) * .25 }, playerConfigs[0], true);
      this.drawShip({ index: 1, frameId: world.loadoutFrame, moduleId: world.loadoutModule, x: 7.2 + Math.sin(this.time * .7) * .5, z: 1.1 + Math.cos(this.time * .8) * .25 }, playerConfigs[1], true);
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
