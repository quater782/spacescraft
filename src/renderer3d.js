import { compose, multiply, TAU, clamp, lerp } from "./render-math.js";
import { SpaceEnvironment } from "./scene/environment.js";
import { SCENE_SETTINGS, qualitySettings } from "./scene/settings.js";
import * as THREE from "three";
import { RenderSurfaces } from "./render-surfaces.js";
import { PixelProjectileArt } from "./projectile-art.js";
import { PixelEffects } from "./pixel-effects.js?v=2";
import { EffectComposer } from "../node_modules/three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "../node_modules/three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "../node_modules/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { SMAAPass } from "../node_modules/three/examples/jsm/postprocessing/SMAAPass.js";
import { OutputPass } from "../node_modules/three/examples/jsm/postprocessing/OutputPass.js";

const MAX_SOLID_PER_COLOR = 512;
const MAX_EMISSIVE_PER_COLOR = 512;
const MAX_GLOW_PER_COLOR = 512;
const MIN_PIXEL_EDGE = .12;
const PIXEL_SCALE_STEP = .04;
const CAMERA_FOV = SCENE_SETTINGS.camera.fov;
const PLAYER_MODEL_SCALE = .82;
const PLAYER_DEMO_SCALE = .9;
const REGULAR_ENEMY_SCALE = 1.18;
const ELITE_ENEMY_SCALE = 1.4;
const BOSS_MODEL_SCALE = 1.62;
const REGULAR_TELEGRAPH_SCALE = 1.26;
const ELITE_TELEGRAPH_SCALE = 1.5;
const BOSS_TELEGRAPH_SCALE = 1.62;
const HOSTILE_PROJECTILE_SCALE = 1.05;
const quantizePixelEdge = (value) => Math.max(MIN_PIXEL_EDGE, Math.round(Math.abs(value) / PIXEL_SCALE_STEP) * PIXEL_SCALE_STEP);


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
    this.renderer.toneMappingExposure = SCENE_SETTINGS.post.exposure;
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_SETTINGS.background);
    this.scene.fog = new THREE.FogExp2(SCENE_SETTINGS.background, SCENE_SETTINGS.fog);
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 16 / 9, SCENE_SETTINGS.camera.near, SCENE_SETTINGS.camera.far);
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    // The bloom threshold deliberately sits above display white. Only HDR energy
    // materials cross it; ceramic hulls and ordinary scenery stay crisp.
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(1280, 720), SCENE_SETTINGS.post.bloom, SCENE_SETTINGS.post.radius, SCENE_SETTINGS.post.threshold);
    this.smaaPass = new SMAAPass();
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.smaaPass);
    this.composer.addPass(this.outputPass);

    this.surfaces = new RenderSurfaces(this.scene);
    this.projectileArt = new PixelProjectileArt(this.scene);
    this.pixelEffects = new PixelEffects(this.scene);
    this.ramTrails = new WeakMap();
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

    this.tempShell = new THREE.Matrix4();
    this.shellScale = new THREE.Vector3();
    this.environment = new SpaceEnvironment(this.scene, this.camera, {
      surfaces: this.surfaces, pixelEffects: this.pixelEffects, gradient: this.toonGradient,
      voxel: this.voxel.bind(this), pushVoxel: this.pushVoxel.bind(this),
      voxelHalo: this.voxelHalo.bind(this), voxelRing: this.voxelRing.bind(this),
      voxelPolyline: this.voxelPolyline.bind(this), voxelSegment: this.voxelSegment.bind(this),
      voxelOrb: this.voxelOrb.bind(this), toWorld: this.toWorld.bind(this),
      fighterNose: this.fighterNose.bind(this), sweptWing: this.sweptWing.bind(this),
      voxelThruster: this.voxelThruster.bind(this),
    }, this.canvas);
    this.ready = true;
    this.canvas.dataset.renderer = "three-r185-instanced-voxel";
    this.canvas.dataset.artStyle = "toon-glow-light-blocks";
    this.canvas.dataset.modelPalette = "saturated-no-black";
    this.canvas.dataset.worldDepthLayers = "3";
    this.canvas.dataset.biomeDioramas = "9";
    this.canvas.dataset.projectileVfx = "segmented-toon-trails";
    this.canvas.dataset.modelFamilies = "3-player-16-alien";
    this.canvas.dataset.moduleAnatomy = "integrated-large-form";
    this.canvas.dataset.bossFamilies = "3-organic-phase-forms";
    this.canvas.dataset.bossBattlefield = "continuous-biome-fixed-camera";
    this.canvas.dataset.bossChoreography = "telegraph-state-arena";
    this.canvas.dataset.expeditionSectors = "9-progressive-voxel-gates";
    this.canvas.dataset.adaptiveThreat = "5-tier-telegraphed";
    this.canvas.dataset.enemyTactics = "event-tactics-continuous-flight";
    this.canvas.dataset.enemyOrientation = "target-facing-omnidirectional-thrust";
    this.canvas.dataset.enemyChip = "adaptive-dorsal-circuit";
    this.canvas.dataset.enemySpacing = "predictive-separation-arrival";
    this.canvas.dataset.warningGrammar = "muzzle-charge-committed-lasers-ram-corridors-blast-rings";
    this.canvas.dataset.laserVfx = "layered-core-edge-packets";
    this.canvas.dataset.bulletGrammar = "locked-safe-lanes-curves-mines-lasers-seekers-blasts";
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
    this.canvas.dataset.enemyArtDirection = "pixel-solid-curved-combustion";
    this.canvas.dataset.energyGeometry = "curved-flame-native-lines-round-beams";
    this.canvas.dataset.solidMaterial = "four-pixel-toon-ramps";
    this.canvas.dataset.moduleIdentity = "fixed-six-slot-hardpoints";
    this.canvas.dataset.enemyAnimation = "articulated-state-driven";
    this.canvas.dataset.impactGrammar = "hot-chip-cooling-debris";
    this.canvas.dataset.playerMaterialSeparation = "ceramic-core-engine";
    this.canvas.dataset.hullExposure = "matte-ceramic-no-bloom";
    this.canvas.dataset.groundPlane = "none-open-space";
    this.canvas.dataset.depthScaffolding = "macro-mid-distant";
    this.canvas.dataset.shieldLanguage = "segmented-shell-hit-break";
    this.canvas.dataset.shieldFeedback = "pixel-impact-shatter-reform";
    this.canvas.dataset.hullDamageLanguage = "scorch-cracks-smoke-60-30";
    this.canvas.dataset.bossGalleryView = "neutral-silhouette";
    this.canvas.dataset.macroLayout = "alternating-edge-anchors";
    this.canvas.dataset.celestialScaffolding = "opposed-biome-horizon-bodies";
    this.canvas.dataset.projectileReadability = "dim-friendly-hot-hostile";
    this.canvas.dataset.playerProjectileDensity = "capstone-low-bloom";
    this.canvas.dataset.ringGrammar = "continuous-segmented-arcs";
    this.canvas.dataset.factionLanguage = "human-kites-vs-void-organisms";
    this.canvas.dataset.playerModules = "4-integrated-silhouette-parts";
    this.canvas.dataset.sceneryDetail = "voxel-strata-orbital-salvage";
    this.canvas.dataset.hullDetail = "layered-armor-recessed-machinery";
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const quality = qualitySettings(this.quality);
    const pixelRatio = Math.min(quality.maxDpr, window.devicePixelRatio || 1) * quality.resolution;
    const width = Math.max(1, Math.round(bounds.width)), height = Math.max(1, Math.round(bounds.height));
    const key = `${width}:${height}:${pixelRatio}`;
    if (this.viewportKey === key) return;
    this.viewportKey = key;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(Math.min(SCENE_SETTINGS.post.maxDpr, pixelRatio));
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  beginFrame() {
    this.surfaces.begin(this.time);
    this.projectileArt.begin();
    this.pixelEffects.begin(this.renderer.domElement.height, this.camera.fov);
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
    this.surfaces.end();
    this.projectileArt.end();
    this.pixelEffects.end();
    this.canvas.dataset.combatEffects = "pixel-sparks-directional-shields-flow-link";
    this.canvas.dataset.effectWaves = String(this.pixelEffects.waveCount);
    this.canvas.dataset.effectBeams = String(this.pixelEffects.beamCount);
    this.canvas.dataset.effectFlecks = String(this.pixelEffects.fleckCount);
    this.canvas.dataset.combatMaterialStyle = "faceted-chips-local-hotspots";
    this.canvas.dataset.effectParticleShape = "rectangular-chips-square-hotspots";
    this.canvas.dataset.shieldFieldMotion = "perimeter-signed-wave-superposition";
    this.canvas.dataset.effectParticles = String(this.pixelEffects.count);
    this.canvas.dataset.effectDropped = String(this.pixelEffects.dropped);
    this.canvas.dataset.projectileArt = "extruded-pixel-stamps";
    this.canvas.dataset.projectileBatches = String(this.projectileArt.batches.size);
    this.canvas.dataset.projectileDropped = String(this.projectileArt.dropped);
    this.canvas.dataset.surfaceBatches = String(this.surfaces.batches.size);
    this.canvas.dataset.renderedLineVertices = String(this.surfaces.lineCursor);
    this.canvas.dataset.surfaceDropped = String(this.surfaces.dropped);
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

  voxelEllipse(base, radiusX, radiusZ, height, color, count = 16, phase = 0, emissive = .62, coverage = .75) {
    const visibleSegments = Math.max(4, Math.round(count * clamp(coverage, .25, 1)));
    for (let index = 0; index < visibleSegments; index += 1) {
      const angle = phase + index / count * TAU;
      const next = angle + TAU / count * .68;
      this.voxelSegment(
        base,
        [Math.cos(angle) * radiusX, height, Math.sin(angle) * radiusZ],
        [Math.cos(next) * radiusX, height, Math.sin(next) * radiusZ],
        .08,
        color,
        emissive,
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

  voxelThruster(base, x, z, color, flame, scale = 1, housing = "#34445d") {
    this.surfaces.solid(base, [x, .04, z], [.32 * scale, .28 * scale, .34], housing, "metal");
    this.surfaces.solid(base, [x, .04, z + .18], [.3 * scale, .3 * scale, .16], "#90a5b9", "metal", "ring");
    this.surfaces.solid(base, [x, .04, z + .22], [.2 * scale, .2 * scale, .1], color, "energy", "orb");
    this.surfaces.solid(base, [x, .04, z + .24], [.56 * scale, .46 * scale, .64 + flame * .4], color, "flame", "flame");
  }

  fighterNose(base, palette, length = 1, canopy = "#dffcff") {
    const [, , light] = palette;
    this.surfaces.solid(base, [0, .07, -.48 * length], [.5, .24, .64 * length], light, "ceramic");
    this.surfaces.solid(base, [0, .06, -.88 * length], [.36, .2, .42 * length], light, "ceramic");
    this.surfaces.solid(base, [0, .04, -1.16 * length], [.2, .14, .24 * length], light, "ceramic");
    this.surfaces.solid(base, [0, .22, -.48 * length], [.28, .16, .48 * length], canopy, "glass");
  }

  sweptWing(base, side, palette, width = 1, rear = .55, armored = false) {
    const [dark, bright, light] = palette;
    const sweep = side * (.22 + rear * .08);
    this.surfaces.solid(base, [side * .46 * width, .03, .08], [.72 * width, .14, .6], light, "ceramic", "plate", [0, sweep, 0]);
    this.surfaces.solid(base, [side * .88 * width, .025, .3], [.56 * width, .12, .38], armored ? light : dark, "ceramic", "plate", [0, side * (.42 + rear * .1), 0]);
    this.surfaces.solid(base, [side * 1.22 * width, .035, .5], [.34 * width, .1, .22], dark, "ceramic", "plate", [0, side * (.58 + rear * .08), 0]);
    this.surfaces.solid(base, [side * 1.4 * width, .07, .58], [.12, .08, .14], bright, "ceramic", "plate", [0, side * .62, 0]);
  }

  tailFins(base, palette, spread = .4, height = 1) {
    const [dark, bright, light] = palette;
    for (const side of [-1, 1]) {
      this.surfaces.solid(base, [side * spread, .22 * height, .68], [.14, .34 * height, .38], dark, "ceramic", "plate", [side * -.18, 0, 0]);
      this.surfaces.solid(base, [side * spread, .39 * height, .63], [.1, .1, .16], side > 0 ? bright : light, "ceramic", "plate", [side * -.18, 0, 0]);
    }
  }

  shieldContact(base, profile, player) {
    const radii = new THREE.Vector3(profile.span + .2, .8, profile.bodyLength * .78 + .2);
    const inverse = new THREE.Matrix3().setFromMatrix4(base.clone().invert());
    const origin = new THREE.Vector3((player.shieldImpactOffsetX || player.shieldImpactX || 0) / 21.5, 0,
      (player.shieldImpactOffsetY || player.shieldImpactY || 0) / 13.3).applyMatrix3(inverse);
    let direction = new THREE.Vector3((player.shieldIncomingX || 0) / 21.5, 0, (player.shieldIncomingY || 0) / 13.3).applyMatrix3(inverse);
    if (direction.lengthSq() < 1e-8) direction.copy(origin).negate();
    if (direction.lengthSq() < 1e-8) direction.set(0, 0, 1);
    direction.normalize();
    const o = origin.clone().divide(radii), d = direction.clone().divide(radii);
    const a = d.dot(d), b = 2 * o.dot(d), c = o.dot(o) - 1;
    const discriminant = b * b - 4 * a * c;
    let point;
    if (discriminant >= 0) {
      // Entry root also works when collision reports a projectile already inside the shell.
      point = origin.clone().addScaledVector(direction, (-b - Math.sqrt(discriminant)) / (2 * a));
    } else {
      // Wide beam / collision tolerance: project the nearest point onto the visible surface.
      const closest = o.clone().addScaledVector(d, -o.dot(d) / a);
      if (closest.lengthSq() < 1e-8) closest.copy(d).negate();
      point = closest.normalize().multiply(radii);
    }
    const normal = point.clone().divide(radii).divide(radii).normalize();
    const incidence = clamp(-direction.dot(normal), 0, 1);
    const tangent = direction.clone().addScaledVector(normal, incidence);
    if (tangent.lengthSq() < 1e-8) tangent.set(-normal.z, 0, normal.x);
    tangent.normalize();
    const reflection = direction.clone().addScaledVector(normal, 2 * incidence).normalize();
    const angle = Math.atan2(point.z / radii.z, point.x / radii.x);
    const unit = point.clone().divide(radii).normalize();
    point.y += .18;
    return { point, normal, tangent, reflection, incidence, angle, unit };
  }

  shieldRingImpulse(angle, pulse) {
    const { contact, age } = pulse;
    const damage = clamp(pulse.damage, 1, 5);
    const power = clamp(pulse.load ?? (damage - 1) / 4, 0, 1);
    const amplitude = .14 + .90 * power ** 1.35;
    const delta = Math.atan2(Math.sin(angle - contact.angle), Math.cos(angle - contact.angle));
    // A narrow impulse can fall between sparse low-quality motes. Move a material patch.
    const width = .24 + power * .32;
    const local = Math.exp(-((delta / width) ** 2));
    const attack = 1 - Math.exp(-age * 100);
    const fade = (1 - clamp(age / .8, 0, 1)) ** .5;
    const decay = Math.exp(-age * 4.2) * fade;
    const glance = Math.sqrt(Math.max(0, 1 - contact.incidence ** 2));
    const tangentSign = Math.sign(-Math.sin(contact.angle) * contact.tangent.x + Math.cos(contact.angle) * contact.tangent.z) || 1;
    const dent = -Math.sin(age * 21) * amplitude * local * (.45 + contact.incidence * .55);
    let traveling = 0;
    // Two signed packets travel on ONE periodic perimeter at the same material wave speed.
    // Periodic images let them meet, interfere and pass through without creating new rings.
    for (const side of [-1, 1]) for (let winding = -1; winding <= 1; winding += 1) {
      const phase = (delta + winding * TAU - side * age * 9.5) / width;
      if (Math.abs(phase) > 4) continue;
      const weight = side === tangentSign ? 1 + glance * .45 : 1 - glance * .65;
      traveling += (1 - phase * phase) * Math.exp(-phase * phase * .5) * weight;
    }
    const displacement = dent * attack * decay + traveling * amplitude * .65 * attack * Math.exp(-age * 2.2) * fade;
    const shear = tangentSign * glance * local * amplitude * Math.sin(age * 15) * attack * decay;
    return { displacement, shear, energy: Math.abs(displacement) + Math.abs(shear) * .5 };
  }

  shieldRingResponse(angle, pulses) {
    let displacement = 0, shear = 0, energy = 0, red = 0, green = 0, blue = 0;
    for (const pulse of pulses) {
      const response = this.shieldRingImpulse(angle, pulse);
      displacement += response.displacement;
      shear += response.shear;
      energy += response.energy;
      red += pulse.color.r * response.energy;
      green += pulse.color.g * response.energy;
      blue += pulse.color.b * response.energy;
    }
    // Add signed deformation BEFORE limiting it, so ordering cannot replace or bias a hit.
    const color = new THREE.Color("#6edfff");
    if (energy > .00001) color.lerp(new THREE.Color(red / energy, green / energy, blue / energy), Math.min(.9, energy * 14));
    return { radial: 1 + .43 * Math.tanh(displacement / .43), shear: .22 * Math.tanh(shear / .22),
      stress: clamp(energy * 9, 0, 1), displacement, color };
  }

  drawPlayerShield(base, profile, player) {
    const radiusX = profile.span + .2, radiusZ = profile.bodyLength * .78 + .2;
    const breaking = player.shield <= 0;
    const breakAge = .8 - clamp(player.shieldBreakTimer || 0, 0, .8);
    const reform = clamp((player.shieldReformTimer || 0) / .72, 0, 1);
    const random = index => { const n = Math.sin((index + 1) * 127.1 + player.index * 311.7) * 43758.5453; return n - Math.floor(n); };
    let events = player.shieldImpacts || [];
    // Retain support for old inspection snapshots that only carry the last-hit fields.
    if (!events.length && player.shieldHitTimer > 0) events = [{ ...player, age: .48 - player.shieldHitTimer, duration: .8 }];
    const pulses = events.filter(event => event.age < event.duration).map(event => ({
      contact: this.shieldContact(base, profile, event), age: event.age,
      damage: event.shieldImpactIncoming || event.shieldImpactDamage || 1,
      load: event.shieldImpactLoad ?? (event.shieldImpactDamage || 1) / Math.max(1, player.maxShield || 3),
      color: new THREE.Color(event.shieldImpactColor || "#8deaff"),
    }));
    const response = angle => this.shieldRingResponse(angle, pulses);
    const point = (angle, field, radius = 1, height = 0) => [
      Math.cos(angle + field.shear) * radiusX * field.radial * radius,
      .18 + height,
      Math.sin(angle + field.shear) * radiusZ * field.radial * radius,
    ];
    const count = this.quality === "low" ? 30 : 48;
    // The existing perimeter motes carry the deformation and travelling light themselves.
    // No circles around a contact, no extra wave geometry or orbiting layer.
    for (let index = 0; index < count; index += 1) {
      const seed = random(index), drift = random(index + 71);
      const life = (this.time * (.35 + seed * .45) + seed) % 1;
      const pulse = Math.sin(life * Math.PI);
      const docking = reform ? clamp(((1 - reform) * .72 - seed * .19) / (.27 + drift * .24), 0, 1) : 1;
      const loose = (1 - docking) ** 3;
      const angle = (index + (seed - .5) * .68) / count * TAU + Math.sin(this.time * .3 + seed * TAU) * .025 + loose * (drift - .5) * 2.8;
      const field = response(angle);
      const nearest = pulses.length ? Math.min(...pulses.map(p => Math.abs(Math.atan2(Math.sin(angle - p.contact.angle), Math.cos(angle - p.contact.angle))))) : Math.PI;
      // Let the dent register before fracture reaches and releases each perimeter patch.
      const release = breaking ? Math.max(0, breakAge - .11 - nearest / 9.5 - seed * .025) : 0;
      const radius = 1 + loose * (seed < .22 ? -.55 : .45 + drift * .95) + release * (.8 + seed * 1.8);
      const height = (drift - .5) * .16 + loose * (seed - .5) * 1.3 + release * (seed - .5) * .6;
      const large = seed > .87;
      this.pixelEffects.spark(base, point(angle, field, radius, height),
        (large ? .30 : .085 + seed * .12) * (.65 + pulse * .35 + field.stress * .7), field.stress > .01 ? field.color : large ? "#8deaff" : "#46b3df",
        (breaking ? 1 - breakAge / .8 : .18 + pulse * .3 + field.stress * .55) * (reform ? Math.min(1, docking * 5) : 1),
        large ? 1.5 : .65, index % 3 ? 1.35 : 1, loose * (seed - .5));
    }
    for (const pulse of pulses) {
      const { contact, age, color } = pulse;
      const power = clamp(pulse.load, 0, 1);
      const glance = Math.sqrt(Math.max(0, 1 - contact.incidence ** 2));
      const origin = new THREE.Vector3().fromArray(point(contact.angle, response(contact.angle)));
      const flash = Math.max(0, 1 - age / .16);
      this.pixelEffects.spark(base, origin.toArray(), (.35 + power * .45) * (.6 + flash * .4), color,
        flash * .7, 1.2 + power * .5, 1 + glance, contact.angle);
      const fragments = (this.quality === "low" ? 5 : 8) + Math.round(power * 12);
      for (let index = 0; index < fragments; index += 1) {
        const seed = random(index + 213);
        const t = clamp(age / (.22 + seed * .3), 0, 1);
        const position = origin.clone().addScaledVector(contact.reflection, t * (.22 + seed * .6) * (1 + power))
          .addScaledVector(contact.tangent, t * (Math.sin(index * 2.4) * .2 + glance * .45));
        position.y += Math.sin(index * 1.7) * t * .22 - t * t * .1;
        this.pixelEffects.spark(base, position.toArray(), (index % 5 ? .07 + seed * .1 : .22 + power * .2) * (1 - t * .6),
          index % 3 ? "#65d5ff" : color, (1 - t) ** 1.5 * Math.min(1, age * 35) * .8, .75, 1 + glance, index + t * 2);
      }
    }
  }

  drawPlayerDamage(player, base, profile) {
    const ratio = player.maxHp > 0 ? player.hp / player.maxHp : 1;
    const hit = (player.hullHitTimer || 0) > 0;
    if (ratio > .6 && !hit) return;
    for (const side of [-1, 1]) {
      const x = side * profile.span * .55;
      this.voxel(base, [x, .24, .2], [.34, .12, .4], hit ? "#edb993" : "#483f48", .3, [0, side * .24, 0]);
      this.voxelSegment(base, [x - .1, .32, .04], [x + .1, .32, .3], .12, hit ? "#ffcf8e" : ratio <= .3 ? "#ea7853" : "#a98060", ratio <= .3 || hit ? .86 : .4);
    }
    if (ratio <= .3) {
      this.voxel(base, [0, .4, .46], [.18, .14, .32], "#ff9564", .85);
      this.voxel(base, [0, .19, .78], [.32, .12, .26], "#4d3541", .3);
    }
  }

  drawPlayerModules(player, base, palette, profile) {
    const flash = 1 + clamp(player.buffFlash || 0, 0, .48) * .35;
    const span = profile.span;
    const moduleLights = { flux: "#a879ff", aegis: "#62dcff", repair: "#74df91", resonance: "#e6c75d" };
    const moduleLight = moduleLights[player.moduleId];
    if (player.moduleId === "flux") {
      this.surfaces.solid(base, [0, .36, .3], [.36, .28, .6], palette[0], "metal");
      for (let coil = 0; coil < 3; coil += 1) this.surfaces.solid(base, [0, .4, .12 + coil * .18], [.28, .28, .12], moduleLight, "metal", "ring");
      this.surfaces.segment(base, [0, .4, .04], [0, .4, .59], .075, moduleLight);
    } else if (player.moduleId === "aegis") {
      for (const side of [-1, 1]) {
        this.surfaces.solid(base, [side * span * .58, .2, .28], [.3, .23, .62], palette[0], "metal");
        this.surfaces.solid(base, [side * span * .58, .3, .22], [.23, .18, .38], moduleLight, "glass", "orb");
      }
    } else if (player.moduleId === "repair") {
      this.surfaces.solid(base, [0, .38, .32], [.48, .2, .55], palette[0], "metal");
      for (const side of [-1, 1]) {
        this.surfaces.solid(base, [side * .14, .51, .32], [.19, .12, .32], palette[2], "ceramic");
        this.surfaces.line(base, [side * .14, .58, .22], [side * .14, .58, .4], moduleLight);
      }
    } else if (player.moduleId === "resonance") {
      this.surfaces.solid(base, [0, .36, .25], [.7, .12, .22], palette[0], "metal");
      for (const side of [-1, 1]) this.surfaces.solid(base, [side * .29, .48, .25], [.32, .32, .12], moduleLight, "metal", "ring", [0, side * .35, 0]);
      this.surfaces.solid(base, [0, .49, .25], [.15, .15, .2], moduleLight, "energy", "orb");
    }
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
    const presentationScale = demo ? PLAYER_DEMO_SCALE : PLAYER_MODEL_SCALE;
    const modelScale = profile.scale * presentationScale;
    const base = compose(position, [pitch, player.galleryYaw || 0, roll], [modelScale, modelScale, modelScale]);
    const pilotPalettes = [
      ["#203e5b", "#39d8d5", "#a9bdc0"],
      ["#513344", "#ed765f", "#c8b7ae"],
    ];
    const palette = pilotPalettes[player.index] || [colors.color, colors.light, "#8f72ff"];
    const flame = .52 + Math.sin(this.time * 28 + player.index) * .16;

    this.surfaces.solid(base, [0, .07, .42], [profile.bodyWidth * 1.04, .28 + (profile.armored ? .06 : 0), .72], palette[2], "ceramic");
    this.surfaces.solid(base, [0, .07, -.12], [profile.bodyWidth, .26 + (profile.armored ? .04 : 0), .66], palette[2], "ceramic");
    this.surfaces.solid(base, [0, .2, .2], [profile.bodyWidth * .48, .16, profile.bodyLength * .74], palette[0], "metal");
    this.fighterNose(base, palette, profile.nose, palette[0]);
    this.voxel(base, [0, .32, -.56 * profile.nose], [.12, .07, .22], palette[1], .84);
    for (const side of [-1, 1]) this.sweptWing(base, side, palette, profile.wing, frameId === "pulse" ? .96 : .78, profile.armored);
    this.tailFins(base, palette, profile.tail, frameId === "bulwark" ? .94 : frameId === "pulse" ? .8 : .88);
    for (const engineX of profile.engines) this.voxelThruster(base, engineX, .92, palette[1], flame, frameId === "bulwark" ? .7 : .64, palette[0]);
    if (!demo && (player.shield > 0 || player.shieldBreakTimer > 0)) this.drawPlayerShield(base, profile, player);
    this.drawPlayerModules(player, base, palette, profile);
    this.drawHullFinish(base, palette, profile);
    if (!demo) this.drawPlayerDamage(player, base, profile);
  }

  drawHullFinish(base, palette, profile) {
    this.surfaces.solid(base, [0, .29, -.53 * profile.nose], [.31, .22, .64], "#263f57", "glass", "orb");
    this.surfaces.line(base, [-.08, .39, -.67], [-.08, .36, -.38], "#87b8c9", .65);
    for (const side of [-1, 1]) {
      this.surfaces.solid(base, [side * .19, .3, -.5 * profile.nose], [.06, .16, .57], palette[2], "ceramic");
      this.surfaces.solid(base, [side * .3, .16, -.87 * profile.nose], [.08, .08, .28], palette[0], "metal");
      this.surfaces.solid(base, [side * .7 * profile.wing, .115, .15], [.38, .06, .22], palette[2], "ceramic", "plate", [0, side * .4, 0]);
      this.surfaces.solid(base, [side * .84 * profile.wing, .075, .47], [.32, .08, .15], "#718396", "metal", "plate", [0, side * .45, 0]);
      for (let mark = 0; mark < 3; mark++) this.surfaces.solid(base, [side * (.62 + mark * .12) * profile.wing, .17, .15 + mark * .06], [.06, .04, .14], palette[1], "ceramic");
      // Exposed dark engine bed and stepped intake lip retain the original footprint.
      this.surfaces.solid(base, [side * .31, .14, .71], [.22, .14, .48], palette[0], "metal");
      this.surfaces.solid(base, [side * .31, .24, .57], [.24, .06, .16], palette[2], "ceramic");
    }
    this.surfaces.solid(base, [0, .4, -.35 * profile.nose], [.3, .04, .06], palette[0], "metal");
    for (const side of [-1, 1]) {
      this.surfaces.line(base, [side * .4, .12, -.12], [side * 1.05 * profile.wing, .12, .38], palette[0], .8);
      this.surfaces.solid(base, [side * .44, .18, .42], [.22, .1, .46], palette[0], "metal");
      for (let fin = 0; fin < 3; fin += 1) this.surfaces.solid(base, [side * .44, .245, .28 + fin * .12], [.16, .03, .035], "#82939f", "metal");
      this.surfaces.solid(base, [side * .73 * profile.wing, .13, .24], [.06, .025, .23], palette[1], "ceramic");
    }
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
    const sway = Math.sin(this.time * 3.6 + x * 2 + z + handed) * .16;
    const points = [
      [handed * x, .08, z],
      [handed * (x + .22 * curl), .12, z + .42],
      [handed * (x + .48 * curl) + sway * .5, .2 + sway * .3, z + .8],
      [handed * (x + .62 * curl) + sway, .3 + sway * .6, z + 1.18],
    ];
    for (let segment = 1; segment < points.length; segment += 1) {
      const color = glow && segment === points.length - 1 ? glow : palette[(segment - 1) % 2];
      this.voxelSegment(base, points[segment - 1], points[segment], .31 - segment * .055, color, segment === points.length - 1 ? .72 : .3);
    }
  }

  alienEye(base, x, z, color, scale = 1) {
    this.surfaces.solid(base, [x, .32 * scale, z], [.4 * scale, .26 * scale, .44 * scale], "#58355f", "shell", "orb");
    this.surfaces.solid(base, [x, .43 * scale, z - .08], [.24 * scale, .19 * scale, .26 * scale], color, "glass", "orb");
    this.surfaces.solid(base, [x, .51 * scale, z - .1], [.07 * scale, .04 * scale, .15 * scale], color, "energy", "orb");
  }

  drawEnemyChassis(enemy, base, palette) {
    const type = enemy.type;
    const pose = this.enemyArtPose(enemy);
    const wingBeat = Math.sin(pose.clock * 5 + (enemy.seed || 0)) * .32;
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
        const angle = arm * Math.PI / 2 + handed * .16 + pose.clock * (pose.charge > 0 ? .7 : .25);
        this.voxel(base, [Math.sin(angle) * .68, .12, Math.cos(angle) * .68], [.34, .28, 1.18], arm % 2 ? palette[0] : palette[1], .34, [0, angle, handed * .08]);
        this.voxel(base, [Math.sin(angle) * 1.24, .18, Math.cos(angle) * 1.24], [.28, .3, .54], palette[1], .46, [0, angle + handed * .35, 0]);
        if (arm % 2 === 0) this.voxel(base, [Math.sin(angle) * 1.48, .24, Math.cos(angle) * 1.48], [.16, .16, .2], palette[2], .96, [0, angle, 0]);
      }
      this.alienEye(base, 0, -.24, palette[2], .96);
    } else if (type === "mine") {
      this.voxel(base, [0, .18, -.12], [.78, .48, .92], palette[0], .34);
      this.voxel(base, [handed * .18, .46, -.28], [.42, .3, .5], palette[1], .52);
      this.voxel(base, [0, -.08, .12], [.92, .3, .82], palette[1], .32);
      this.voxel(base, [0, -.3, .18], [.58, .2, .54], palette[0], .28);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * (.5 + pose.charge * .12), .16, -.1], [.24, .4, .7], palette[0], .3);
        this.voxel(base, [side * .34, -.2, .32], [.16, .16, .24], palette[2], pose.charge > .6 ? .86 : .5);
      }
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
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .76, .46, .12], [.42, .16, .76], palette[0], .28);
        for (let cell = 0; cell < 2; cell += 1) {
          this.voxel(base, [side * .76, .56, -.1 + cell * .38], [.22, .12, .22], palette[1], .36);
          this.voxel(base, [side * (.99 + pose.charge * .1), .47, -.1 + cell * .38], [.16, .16, .24], palette[2], .55);
        }
      }
      this.alienEye(base, handed * .26, -.5, palette[2], 1.08);
    } else if (type === "nectarMoth") {
      this.voxel(base, [0, .16, -.08], [.48, .36, 1.12], palette[0], .3);
      this.voxel(base, [handed * .12, .42, -.42], [.34, .2, .54], palette[1], .48);
      for (const side of [-1, 1]) {
        const wing = multiply(base, compose([side * .2, .16, -.08], [0, side * .15, side * wingBeat]));
        this.voxel(wing, [side * .48, 0, .14], [.84, .18, .74], palette[0], .28);
        this.voxel(wing, [side * 1.02, 0, .3], [.48, .14, 1.06], palette[1], .32);
        this.voxel(wing, [side * 1.36, 0, .48], [.24, .12, .68], palette[0], .28);
        this.voxel(wing, [side * .78, .12, .12], [.36, .12, .3], palette[0], .3);
        this.voxel(wing, [side * .78, .2, .12], [.16, .12, .16], palette[2], .65);
        this.voxelSegment(base, [side * .12, .24, -.48], [side * .46, .34, -1.18], .12, palette[1], .35);
      }
      this.alienEye(base, handed * .12, -.5, palette[2], .76);
    } else if (type === "prismRay") {
      this.voxel(base, [0, .15, -.04], [.52, .3, 1.5], palette[0], .3);
      this.voxel(base, [0, .38, -.48], [.32, .24, .64], palette[1], .52, [0, Math.PI / 4, 0]);
      for (const side of [-1, 1]) {
        this.voxelSegment(base, [side * .18, .1, -.08], [side * 1.58, .13, .42], .3, palette[1], .4);
        this.voxel(base, [side * 1.08, .15, .18], [1.12, .12, .78], palette[0], .34, [0, side * .66, 0]);
        this.voxel(base, [side * 1.68, .2, .55], [.28, .18, .44], palette[2], .76, [0, side * .78, 0]);
      }
      this.alienEye(base, 0, -.66, palette[2], .82);
    } else if (type === "cometRammer") {
      this.voxel(base, [0, .17, .12], [.72, .48, 1.48], palette[0], .32);
      this.voxelSegment(base, [0, .18, -.44], [0, .2, -2.05], .3, palette[1], .5);
      this.voxel(base, [0, .22, -2.14], [.16, .16, .48], palette[2], .9);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .65, .15, .4], [.72, .22, 1.02], palette[1], .36, [0, side * .44, 0]);
        this.voxelSegment(base, [side * .42, .1, .48], [side * 1.22, .13, 1.24], .22, palette[0], .3);
      }
      this.alienEye(base, handed * .24, -.46, palette[2], .76);
    } else if (type === "auroraLeech") {
      this.voxel(base, [0, .17, -.02], [.64, .4, 1.36], palette[0], .32);
      this.voxel(base, [handed * .16, .43, -.38], [.42, .2, .5], palette[1], .5);
      for (const side of [-1, 1]) {
        this.alienTendril(base, side, palette, .36, .1, 1.55, palette[2]);
        this.alienTendril(base, side, palette, .56, .38, .82, side === handed ? palette[2] : null);
        this.voxelSegment(base, [side * .18, .12, -.44], [side * .42, .24, -1.42], .16, palette[1], .46);
      }
      this.alienEye(base, handed * .17, -.58, palette[2], .88);
    } else if (type === "railBeetle") {
      this.voxel(base, [0, .18, .08], [1.1, .58, 1.52], palette[0], .3);
      this.voxel(base, [0, .52, -.18], [.68, .26, .96], palette[1], .48);
      for (const side of [-1, 1]) {
        for (let leg = -1; leg <= 1; leg += 1) {
          this.voxelSegment(base, [side * .66, .06, leg * .45], [side * 1.36, -.02, leg * .68 + .18], .2, leg === 0 ? palette[1] : palette[0], .34);
        }
        this.voxel(base, [side * .72, .28, .12], [.5, .32, 1.22], palette[1], .36, [0, side * .12, 0]);
      }
      // This species launches explosive seeds: a recessed mortar, never a laser lance.
      this.voxel(base, [0, .62, -.28], [.52, .24, .64], palette[0], .28);
      this.voxel(base, [0, .76, -.3], [.28, .12, .36], palette[1], .4);
      this.voxel(base, [0, .84, -.3], [.16, .12, .2], palette[2], pose.charge > .5 ? .9 : .55);
      this.alienEye(base, handed * .3, -.58, palette[2], .88);
    } else if (type === "reefMedusa") {
      const bell = 1 + Math.sin(pose.clock * 3.4) * .07 + pose.charge * .08;
      this.voxel(base, [0, .18, -.1], [1.76 * bell, .24, 1.24], palette[0], .28);
      this.voxel(base, [0, .4, -.16], [1.32 * bell, .24, 1.02], palette[1], .32);
      this.voxel(base, [0, .6, -.2], [.84, .2, .7], palette[0], .28);
      this.voxel(base, [0, .74, -.2], [.4, .12, .38], palette[1], .35);
      for (const side of [-1, -.34, .34, 1]) {
        const bend = side < 0 ? -1 : 1;
        this.voxelSegment(base, [side * .66, .08, .38], [side * .78 + bend * .2, -.2, 1.12], .16, palette[1], .42);
        this.voxelSegment(base, [side * .78 + bend * .2, -.2, 1.12], [side * .5 + Math.sin(pose.clock * 3 + side * 2) * .22, -.06, 1.68], .14, palette[1], .38);
      }
      this.alienEye(base, handed * .2, -.5, palette[2], .94);
    } else if (type === "eclipseReaper") {
      this.voxel(base, [0, .18, -.02], [.62, .38, 1.3], palette[0], .32);
      this.voxel(base, [handed * .14, .44, -.42], [.38, .22, .56], palette[1], .5);
      for (const side of [-1, 1]) {
        const points = [[side * .2, .12, .08], [side * .8, .16, -.3], [side * 1.38, .22, -.82], [side * 1.06, .3, -1.55]];
        for (let segment = 1; segment < points.length; segment += 1) this.voxelSegment(base, points[segment - 1], points[segment], .28 - segment * .05, segment % 2 ? palette[1] : palette[0], .4);
        this.voxel(base, points.at(-1), [.14, .16, .42], palette[2], .82, [0, side * -.45, 0]);
      }
      this.alienEye(base, handed * .12, -.55, palette[2], .88);
    } else if (type === "graveMirror") {
      this.voxel(base, [0, .15, .02], [.42, .3, 1.32], palette[0], .3);
      for (const side of [-1, 1]) {
        this.voxel(base, [side * .68, .2, -.06], [.72, .18, 1.32], side === handed ? palette[1] : palette[0], .42, [0, side * Math.PI / 4, 0]);
        this.voxel(base, [side * 1.26, .24, .34], [.46, .14, .72], side === handed ? palette[0] : palette[1], .4, [0, -side * Math.PI / 4, 0]);
        this.voxelSegment(base, [side * .12, .14, -.48], [side * .48, .18, -1.46], .14, palette[2], .72);
      }
      this.alienEye(base, handed * .14, -.62, palette[2], .82);
    } else if (type === "gardenSpore") {
      this.voxel(base, [0, .2, .04], [1.04, .54, 1.18], palette[0], .32);
      for (let pod = 0; pod < 5; pod += 1) {
        const angle = pod / 5 * Math.PI * 2;
        const hatch = Math.sin(pose.clock * 2.8 + pod * .8) * .06 + pose.charge * .16;
        this.voxel(base, [Math.sin(angle) * (.72 + hatch), .48 + (pod % 2) * .12, Math.cos(angle) * (.62 + hatch)], [.42, .38, .5], pod % 2 ? palette[1] : palette[0], .44, [0, angle, 0]);
        this.voxel(base, [Math.sin(angle) * (.76 + hatch), .7 + (pod % 2) * .12, Math.cos(angle) * (.62 + hatch)], [.14, .1, .18], palette[2], .84);
      }
      for (const side of [-1, 1]) this.alienTendril(base, side, palette, .58, .42, 1.12, palette[2]);
      this.alienEye(base, handed * .2, -.5, palette[2], .9);
    } else {
      this.voxel(base, [0, .16, -.04], [.62, .38, 1.18], palette[0], .3);
      this.voxel(base, [0, .38, -.4], [.44, .28, .64], palette[1], .44);
      this.alienCrescent(base, palette, .82, 1);
      this.alienEye(base, handed * .1, -.54, palette[2], .92);
    }
  }

  enemyArtPose(enemy) {
    const charge = enemy.weaponState === "windup" ? clamp(enemy.weaponCharge || 0, 0, 1) : 0;
    const firing = enemy.weaponState === "fire";
    const recovery = enemy.weaponState === "cooldown" ? Math.max(0, 1 - (enemy.weaponAge || 0) / .28) : 0;
    return { charge, firing, recoil: firing ? .18 : recovery * .12, clock: Math.floor(this.time * 12) / 12 };
  }

  drawEnemyArmor(enemy, base, palette) {
    const pose = this.enemyArtPose(enemy);
    const heavy = ["tank", "railBeetle", "carrier", "gardenSpore"].includes(enemy.type);
    const width = heavy ? .62 : .3;
    // Broad paired scutes leave a dark spinal seam. No noise or new color batches.
    for (let plate = 0; plate < 3; plate += 1) {
      const z = -.36 + plate * .36;
      for (const side of [-1, 1]) {
        const opening = pose.charge * (heavy ? .1 : .05);
        this.surfaces.solid(base, [side * (width * .52 + opening), (heavy ? .58 : .42) - plate * .06, z],
          [width * .88, .16, .28], plate === 0 ? palette[1] : palette[0], "shell", "plate", [0, side * .08, side * opening]);
      }
    }
    if (this.quality !== "low") {
      for (const side of [-1, 1]) {
        // Two thick cooling slots, recessed into the rear armor.
        this.surfaces.solid(base, [side * width * .65, heavy ? .55 : .4, .46], [.12, .12, .28], palette[1], "metal");
      }
    }
  }

  enemyHardpoints(enemy) {
    return window.SpaceEnemyAI.hardpoints[enemy.type] || window.SpaceEnemyAI.hardpoints.scout;
  }

  drawIntegratedEnemyModules(enemy, base, palette, moduleColor) {
    const [nose, rear, dorsal, flank] = this.enemyHardpoints(enemy);
    for (const side of [-1, 1]) {
      for (let rib = 0; rib < 3; rib++) {
        const z = -.18 + rib * .23;
        const x = side * (flank * .64 + Math.sin(rib * 1.3) * .06);
        this.surfaces.solid(base, [x, dorsal * .6 + .06, z], [.28, .14, .19], rib % 2 ? palette[0] : palette[1], "shell", "plate", [0, side * -.23, side * -.2]);
        this.surfaces.solid(base, [x, dorsal * .6 + .15, z], [.16, .04, .07], "#96728f", "shell");
      }
      this.surfaces.solid(base, [side * flank * .72, dorsal * .46, .53], [.23, .24, .13], palette[0], "metal", "ring");
    }
    const pose = this.enemyArtPose(enemy);
    const body = (p, size, color = palette[0], finish = "shell", shape = "plate", rotation) => this.surfaces.solid(base, p, size, color, finish, shape, rotation);
    const wire = (a, b, color = palette[1]) => this.surfaces.segment(base, a, b, .035, color, "metal");
    // Drive slot: aft paired verniers / flexible vanes / large booster / lateral vector nozzles.
    for (const side of [-1, 1]) {
      const x = side * (enemy.movementModule === "drift" ? flank : .26);
      body([x, .1, rear], [.23, .23, .35], palette[0], "metal");
      body([x, .1, rear + .19], [.22, .22, .1], palette[1], "metal", "ring");
      const length = (enemy.movementModule === "rush" ? .95 : .43) * (.08 + (enemy.forwardThrust ?? .55) * 1.1 + (enemy.attackPattern === "ramCharge" ? pose.charge * .55 : 0));
      this.surfaces.solid(base, [x, .1, rear + .22], [.28, .28, length], moduleColor, "flame", "flame", [0, enemy.movementModule === "drift" ? side * -.6 : 0, 0]);
      if (enemy.movementModule === "weave") body([side * .48, .2, rear], [.42, .1, .38], palette[1], "shell", "plate", [0, side * .4, Math.sin(pose.clock * 5) * .25]);
    }
    if (Math.abs(enemy.sideThrust || 0) > .08) {
      const side = Math.sign(enemy.sideThrust);
      this.surfaces.solid(base, [-side * flank, .1, .12], [.2, .18, .25 + Math.abs(enemy.sideThrust) * .35], moduleColor, "flame", "flame", [0, side * Math.PI / 2, 0]);
    }
    if ((enemy.reverseThrust || 0) > .08) {
      for (const side of [-1, 1]) {
        body([side * flank * .58, .1, nose + .25], [.18, .16, .2], palette[1], "metal");
        this.surfaces.solid(base, [side * flank * .58, .1, nose + .12], [.17, .17, .18 + enemy.reverseThrust * .35], moduleColor, "flame", "flame", [0, Math.PI, 0]);
      }
    }
    if (enemy.movementModule === "rush") body([0, .22, rear - .08], [.6, .28, .42], palette[1], "metal");

    // Installed weapon identity is stable. Species abilities live in the chassis;
    // a different attack pattern must not replace the installed module mid-cycle.
    const weapon = enemy.weaponModule || "pulse";
    const mount = multiply(base, compose([0, .23, nose + pose.recoil], [0, enemy.weaponYaw || 0, 0]));
    if (Math.abs(enemy.weaponYaw || 0) > .02) body([0, .23, nose], [.44, .14, .44], palette[1], "metal", "ring", [Math.PI / 2, 0, 0]);
    const part = (p, size, color = palette[1], finish = "shell", shape = "plate", rotation) => this.surfaces.solid(mount, p, size, color, finish, shape, rotation);
    part([0, 0, .13], [.48, .2, .42], palette[0], "metal");
    if (weapon === "laser" || weapon === "sniper") {
      const spread = weapon === "laser" ? .2 + pose.charge * .1 : .12;
      for (const side of [-1, 1]) {
        part([side * spread, .04, -.32], [.12, .18, .86], palette[1], "metal");
        if (weapon === "laser") this.surfaces.segment(mount, [side * spread, .14, -.04], [side * spread, .14, -.68], .045, palette[2]);
      }
      part([0, .03, -.64], [.22, .22, .16], palette[0], "metal", "ring");
      part([0, .03, -.73], [.12, .12, .1], palette[2], pose.charge > .5 || pose.firing ? "energy" : "glass", "orb");
    } else if (weapon === "seeker") {
      for (const side of [-1, 1]) {
        part([side * .24, .08, -.2], [.34, .28, .68], palette[0]);
        for (let tube = 0; tube < 2; tube += 1) {
          part([side * .24, .04 + tube * .15, -.56], [.14, .14, .08], palette[1], "metal", "ring");
          part([side * .24, .04 + tube * .15, -.6], [.08, .08, .1], palette[2], "glass", "orb");
        }
      }
    } else if (weapon === "bomb") {
      part([0, .1, -.16], [.57, .5, .67], palette[1], "glass", "orb");
      for (const side of [-1, 1]) part([side * (.24 + pose.charge * .12), .18, -.16], [.2, .35, .55], palette[0], "shell", "plate", [0, side * pose.charge * .35, 0]);
      part([0, .1, -.5], [.3, .3, .12], palette[0], "metal", "ring");
      part([0, .1, -.57], [.16, .16, .12], "#ffbb68", pose.charge > .5 ? "energy" : "glass", "orb");
    } else if (weapon === "orbit") {
      part([0, .1, -.08], [.68, .68, .14], palette[1], "metal", "ring", [Math.PI / 2, 0, 0]);
      for (let port = 0; port < 4; port += 1) {
        const a = port * Math.PI / 2 + pose.clock * .8;
        part([Math.cos(a) * .3, .18, -.08 + Math.sin(a) * .3], [.13, .13, .16], palette[2], "glass", "orb");
      }
    } else {
      for (const x of weapon === "twin" ? [-.2, .2] : [0]) {
        part([x, .02, -.24], [.23, .24, .62], palette[1], "metal");
        part([x, .02, -.55], [.24, .24, .1], palette[0], "metal", "ring");
        part([x, .02, -.62], [.11, .11, .08], palette[2], pose.firing ? "energy" : "glass", "orb");
      }
    }

    // Core slot is on the back; it never covers the forward weapon or side payload.
    body([0, dorsal, .16], [.46, .12, .48], palette[0], "metal");
    if (enemy.coreModule === "plated") {
      for (const side of [-1, 1]) body([side * .24, dorsal + .1, .16], [.29, .2, .56], palette[1], "shell");
    } else if (enemy.coreModule === "barrier") {
      body([0, dorsal + .18, .16], [.46, .46, .13], palette[1], "metal", "ring", [Math.PI / 2, 0, 0]);
      body([0, dorsal + .2, .16], [.25, .25, .3], enemy.moduleBarrier > 0 ? "#77dcf0" : palette[0], enemy.moduleBarrier > 0 ? "energy" : "metal", "orb");
    } else if (enemy.coreModule === "volatile") {
      body([0, dorsal + .2, .16], [.36, .3, .4], "#d56d45", "glass", "orb");
      for (const x of [-.18, .18]) body([x, dorsal + .22, .16], [.07, .32, .46], palette[0], "metal");
    } else body([0, dorsal + .1, .16], [.25, .16, .3], palette[1], "shell");

    // AI slot: single sentry, paired hunter, lateral flanker, dish oracle,
    // linked three-lens pack, and hooded ambusher all have independent silhouettes.
    const sensor = multiply(base, compose([0, dorsal - .08, -.42]));
    const lenses = enemy.aiModule === "pack" ? [-.2, 0, .2] : enemy.aiModule === "hunter" ? [-.15, .15] : enemy.aiModule === "flanker" ? [.3] : [0];
    for (const x of lenses) {
      this.surfaces.solid(sensor, [x, .08, 0], [.18, .17, .24], palette[0], "metal", "orb");
      this.surfaces.solid(sensor, [x, .15, -.06], [.1, .09, .13], palette[2], "glass", "orb");
    }
    if (enemy.aiModule === "oracle") this.surfaces.solid(sensor, [0, .16, 0], [.4, .32, .12], palette[1], "metal", "ring", [.3, 0, 0]);
    if (enemy.aiModule === "ambusher") this.surfaces.solid(sensor, [0, .2, .03], [.34, .12, .34], palette[0], "shell");
    if (enemy.aiModule === "flanker") wire([.22, dorsal, -.4], [.44, dorsal + .12, -.34]);
    if (enemy.aiModule === "pack") wire([-.25, dorsal + .08, -.38], [.25, dorsal + .08, -.38]);
    if (enemy.chipId === "adaptive") {
      // Permanent wing rails distinguish the upgrade; light position and color expose actual intent.
      const defending = enemy.stateReason === "defensive-withdrawal" && enemy.tacticState === "disengage";
      const evading = enemy.tacticState === "evade";
      const attacking = ["align", "windup", "fire"].includes(enemy.weaponState);
      const signal = defending ? "#70eaff" : evading ? "#fff0a0" : attacking ? "#ff765e" : "#ff7edb";
      for (const side of [-1, 1]) {
        body([side * (flank + .12), dorsal + .12, -.12], [.16, .16, .95], "#582a63", "metal");
        body([side * (flank + .12), dorsal + .23, attacking ? -.43 : defending ? .18 : -.12], [.19, .12, evading ? .72 : .28], signal, "energy");
      }
      body([0, dorsal + .32, -.4], [.5, .12, .36], "#582a63", "metal");
      body([0, dorsal + .41, -.4], [.36, .13, .3], signal, "energy");
      for (const side of [-1, 1]) {
        body([side * .3, dorsal + .36, -.4], [.12, .12, .3], "#ffe8f7", "metal");
        wire([side * .13, dorsal + .4, -.4], [side * .32, dorsal + .4, -.4], "#ff7edb");
      }
    }

    // Payload cartridge: a cooling cell, split jammer, or three-tooth penetrator.
    if (enemy.payloadModule && enemy.payloadModule !== "clean") {
      const x = flank * 1.08;
      const socketY = dorsal * .65;
      const color = enemy.payloadModule === "cryo" ? "#70eaff" : enemy.payloadModule === "glitch" ? "#d176da" : "#ffb45f";
      body([x, socketY, .24], [.25, .24, .5], palette[0], "metal");
      if (enemy.payloadModule === "cryo") body([x, socketY + .15, .24], [.21, .2, .4], color, "glass", "orb");
      else for (let cell = 0; cell < (enemy.payloadModule === "glitch" ? 2 : 3); cell += 1) body([x, socketY + .18, .09 + cell * .13], [.23, .15, .085], color, "metal");
      wire([x, socketY + .04, .02], [.24, .24, nose + .2], color);
    }
  }

  laserTelegraphRays(enemy) {
    return window.SpaceEnemyAI.beamRays(enemy, this.width, this.height).map(ray => ({
      start: this.toWorld(ray.x1, ray.y1, .48), end: this.toWorld(ray.x2, ray.y2, .48), color: ray.color || "#ff5964",
    }));
  }

  warningFlash(enemy, charge) {
    // Integral of a rising 1.1–7.1 Hz rate: no clock-reset jitter as charge changes.
    const duration = Math.max(.1, enemy.weaponDuration || 1.28);
    const phase = duration * (1.1 * charge + 2 * charge ** 3);
    return phase % 1 < .42 ? 1 : .18;
  }

  drawLaserTelegraph(enemy, charge) {
    const flash = this.warningFlash(enemy, charge);
    for (const ray of this.laserTelegraphRays(enemy)) {
      this.surfaces.line(compose(), ray.start, ray.end, "#fb394e", .16 + flash * .65);
      for (let index = 0; index < 16; index += 1) {
        const t = index / 16;
        this.pixelEffects.spark(null, ray.start.map((value, axis) => lerp(value, ray.end[axis], t)), .09 + charge * .05, "#ff4a60", flash * (.2 + charge * .6));
      }
    }
  }

  drawRamTelegraph(enemy, charge) {
    const targetX = Number.isFinite(enemy.attackEndX) ? enemy.attackEndX : enemy.attackTargetX;
    const targetY = Number.isFinite(enemy.attackEndY) ? enemy.attackEndY : enemy.attackTargetY;
    const origin = enemy.attackCommit?.ram || enemy;
    const a = this.toWorld(origin.x, origin.y, .24);
    const b = this.toWorld(targetX, targetY, .24);
    const dx = targetX - origin.x, dy = targetY - origin.y, length = Math.max(1, Math.hypot(dx, dy));
    const radius = enemy.bodyRadius || enemy.r * .8;
    for (const side of [-1, 1]) {
      const ox = -dy / length * radius * side, oy = dx / length * radius * side;
      this.surfaces.line(compose(), this.toWorld(origin.x + ox, origin.y + oy, .24), this.toWorld(targetX + ox, targetY + oy, .24), "#e64b56", .22);
    }
    const flash = this.warningFlash(enemy, charge);
    this.surfaces.line(compose(), a, b, "#ff4257", .12 + flash * .7);
    for (let index = 0; index < 12; index += 1) {
      const t = index / 12;
      this.pixelEffects.spark(null, a.map((value, axis) => lerp(value, b[axis], t)), .11, "#ff5964", flash * .6);
    }
  }

  drawRamWake(enemy) {
    let trail = this.ramTrails.get(enemy);
    const attacking = enemy.weaponState === "fire" && enemy.attackPattern === "ramCharge";
    if (!trail && !attacking) return;
    if (!trail) { trail = []; this.ramTrails.set(enemy, trail); }
    if (attacking && (!trail.length || this.time - trail[trail.length - 1].time >= 1 / 65)) {
      trail.push({ x: enemy.x, y: enemy.y, time: this.time });
    }
    while (trail.length && (this.time - trail[0].time > .38 || trail.length > 28)) trail.shift();
    // History follows the path actually travelled, including turn/stop transitions.
    for (let index = 0; index < trail.length; index += 1) {
      const sample = trail[index], age = this.time - sample.time, life = 1 - age / .38;
      for (let mote = 0; mote < (this.quality === "low" ? 2 : 4); mote += 1) {
        const spread = .1 + age * 1.2;
        const p = this.toWorld(sample.x, sample.y, .28);
        p[0] += Math.sin(index * 3.8 + mote * 2.4) * spread;
        p[1] += Math.cos(index * 2.3 + mote) * spread * .5;
        p[2] += Math.sin(mote * 4.2 + index) * spread;
        this.pixelEffects.spark(null, p, .14 + life * .2, mote === 0 ? "#ffba87" : "#f83d62", life * .7);
      }
    }
  }

  drawEnemyTelegraph(enemy, base) {
    if (enemy.weaponState !== "windup") return;
    const charge = clamp(enemy.weaponCharge || 0, 0, 1);
    if (enemy.attackPattern === "ramCharge") { this.drawRamTelegraph(enemy, charge); return; }
    if (["laserLance", "laserSweep"].includes(enemy.attackPattern)) this.drawLaserTelegraph(enemy, charge);
    const origin = window.SpaceEnemyAI.muzzle(enemy);
    const point = this.toWorld(origin.x, origin.y, origin.height);
    // Small local muzzle heat; movement has no gathering field or full-body charge halo.
    this.pixelEffects.spark(null, point, .14 + charge * .16, "#ff8961", .2 + charge * .45, .7);
  }

  drawEnemyMuzzleBurst(enemy) {
    // One brief burst on the real fire phase; lasers already own their ignition effect.
    const age = enemy.weaponAge || 0;
    if (enemy.weaponState !== "fire" || age >= .18 || enemy.boss ||
        ["ramCharge", "laserLance", "laserSweep"].includes(enemy.attackPattern)) return;
    const origin = enemy.attackCommit?.origin || window.SpaceEnemyAI.muzzle(enemy);
    const angle = enemy.attackCommit?.angle ?? enemy.weaponAim ?? enemy.heading ?? Math.PI / 2;
    const t = age / .18, fade = (1 - t) ** 2;
    const nodes = enemy.remoteEmitters?.length ? enemy.remoteEmitters : [origin];
    for (const node of nodes) {
      const base = compose(this.toWorld(node.x, node.y, origin.height || .48));
      this.pixelEffects.spark(base, [0, 0, 0], .28 * (1 - t * .5), "#ffd49a", fade * .7, .6);
      const count = this.quality === "low" ? 3 : 6;
      for (let i = 0; i < count; i += 1) {
        const direction = angle + (i / Math.max(1, count - 1) - .5) * 1.4;
        const reach = (2 + t * 9) * (.65 + i % 3 * .15);
        this.pixelEffects.spark(base, [Math.cos(direction) * reach / 21.5, .02, Math.sin(direction) * reach / 13.3],
          .13 * (1 - t * .55), i % 3 ? "#ff785a" : "#ffd49a", fade * .55, .35);
      }
    }
  }

  drawEnemyEmitters(enemy) {
    if (!SpaceEnemyAI.committed(enemy)) return;
    for (const node of enemy.remoteEmitters || []) {
      const base = compose(this.toWorld(node.x, node.y, .35));
      const laser = node.kind === "laser";
      const color = laser && enemy.laserPlan?.mode === "corridor" ? "#e88dff" : "#ffb469";
      this.voxel(base, [0, 0, 0], laser ? [.48, .2, .48] : [.3, .12, .3], "#732941", .15);
      if (laser) this.voxel(base, [0, .12, 0], [.2, .12, .2], color, .65);
      for (const side of [-1, 1]) this.voxel(base, [side * .2, .04, 0], [.07, .08, .36], "#ff6b8c", .6);
    }
    if (enemy.boss) for (const ray of window.SpaceEnemyAI.beamRays(enemy, this.width, this.height)) {
      const origin = this.toWorld(ray.x1, ray.y1, .48);
      const dx = ray.x2 - ray.x1, dy = ray.y2 - ray.y1, length = Math.hypot(dx, dy);
      const nose = this.toWorld(ray.x1 + dx / length * 6, ray.y1 + dy / length * 6, .48);
      this.surfaces.segment(compose(), origin, nose, .13, "#ad5b68", "metal");
      this.pixelEffects.spark(null, nose, .18, "#ffbf74", .55);
    }
  }

  drawEnemy(enemy) {
    const position = this.toWorld(enemy.x, enemy.y, .32);
    const bodyYaw = Number.isFinite(enemy.heading) ? window.SpaceEnemyAI.yaw(enemy.heading) : Math.PI;
    const galleryScale = enemy.galleryScale || 1;
    const rotation = [enemy.pitch || 0, bodyYaw + (enemy.galleryYaw || 0), enemy.bank || 0];
    const moduleScale = enemy.moduleScale || 1;
    const modelScale = (enemy.boss ? BOSS_MODEL_SCALE : enemy.elite ? ELITE_ENEMY_SCALE : REGULAR_ENEMY_SCALE) * moduleScale * galleryScale;
    const telegraphScale = (enemy.boss ? BOSS_TELEGRAPH_SCALE : enemy.elite ? ELITE_TELEGRAPH_SCALE : REGULAR_TELEGRAPH_SCALE) * moduleScale * galleryScale;
    const base = compose(position, rotation, [modelScale, modelScale, modelScale]);
    const telegraphBase = compose(position, rotation, [telegraphScale, telegraphScale, telegraphScale]);
    this.drawEnemyEmitters(enemy);
    this.drawEnemyMuzzleBurst(enemy);
    if (enemy.boss) {
      this.drawBoss(enemy, base, this.stageIndex, telegraphBase);
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
      nectarMoth: ["#3f214e", "#d34f83", "#ffe16c"],
      prismRay: ["#291d55", "#8d5ad8", "#7fffe2"],
      cometRammer: ["#183d5c", "#3094bc", "#ff9acb"],
      auroraLeech: ["#143f4e", "#27a99b", "#ffe16c"],
      railBeetle: ["#3b3442", "#9b7b3e", "#ffe45c"],
      reefMedusa: ["#163c58", "#3f9db2", "#ffb36a"],
      eclipseReaper: ["#411632", "#c1325d", "#c183ff"],
      graveMirror: ["#2e1a56", "#8653ba", "#71f5e2"],
      gardenSpore: ["#163d38", "#3f9b72", "#ff6c94"],
    };
    const palette = palettes[enemy.type] || palettes.scout;
    const moduleColor = enemy.elite ? "#e6c75d" : "#b33b51";
    this.drawEnemyChassis(enemy, base, palette);
    this.drawEnemyArmor(enemy, base, palette);
    this.drawIntegratedEnemyModules(enemy, base, palette, moduleColor);
    if (!enemy.galleryScale) this.drawEnemyTelegraph(enemy, telegraphBase);
    this.drawRamWake(enemy);
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

  bossOpeningAmount(enemy) {
    if (!(enemy.opening > 0)) return 0;
    const elapsed = Math.max(0, (enemy.weaponDuration || 0) - (enemy.weaponTimer || 0));
    const t = clamp(Math.min(elapsed / .2, enemy.opening / .3), 0, 1);
    return t * t * (3 - 2 * t);
  }

  bossPhaseGrowth(enemy, level) {
    if ((enemy.phaseLevel || 1) < level) return 0;
    if (enemy.phaseLevel > level) return 1;
    const t = clamp(1 - (enemy.phaseMorph || 0) / 1.4, 0, 1);
    return t * t * (3 - 2 * t);
  }

  bossActuation(enemy) {
    const charge = enemy.weaponState === "windup" ? clamp(enemy.weaponCharge || 0, 0, 1) : 0;
    const recoil = enemy.weaponState === "fire" ? Math.max(0, 1 - (enemy.salvoAge || 0) / .32) : 0;
    return { charge, recoil, open: this.bossOpeningAmount(enemy) };
  }

  // Armor is built in connected, stepped layers; light sits inside sockets rather than covering the hull.
  bossArmor(base, position, size, shell, trim, rotation = [0, 0, 0]) {
    const plate = multiply(base, compose(position, rotation));
    const [w, h, d] = size;
    // Interlocking strips leave stepped corners and real seams, even in low quality.
    this.surfaces.solid(plate, [0, 0, 0], [w * .76, h, d], shell, "metal");
    this.surfaces.solid(plate, [0, 0, 0], [w, h * .86, d * .72], shell, "metal");
    this.surfaces.solid(plate, [0, h * .45, 0], [w * .8, .12, d * .82], "#252333", "metal");
    for (const side of [-1, 1]) {
      this.surfaces.solid(plate, [side * w * .205, h * .55, -d * .035], [w * .36, .12, d * .69], trim, "ceramic");
      this.surfaces.solid(plate, [side * w * .43, h * .05, 0], [.08, h * .6, d * .58], trim, "metal");
      for (const end of [-1, 1]) this.surfaces.solid(plate, [side * w * .25, h * .65, end * d * .22], [.08, .06, .08], "#e2cba6", "metal");
    }
    for (let vent = -1; vent <= 1; vent++) this.surfaces.solid(plate, [vent * w * .19, h * .61, d * .21], [w * .11, .06, d * .18], shell, "metal");
    this.surfaces.solid(plate, [0, h * .61, -d * .12], [.06, .06, d * .22], "#e0bc8b", "metal");
  }

  bossJoint(base, position, radius, accent, rotation = [0, 0, 0]) {
    const joint = multiply(base, compose(position, rotation));
    this.surfaces.solid(joint, [0, 0, 0], [radius, radius, .24], "#232638", "metal", "ring");
    this.surfaces.solid(joint, [0, 0, -.05], [radius * .58, radius * .58, .18], accent, "metal", "orb");
    this.surfaces.solid(joint, [0, 0, -.16], [.12, radius * .24, .04], accent, "energy");
  }

  bossSpire(base, position, height, color, rotation = [0, 0, 0]) {
    const spire = multiply(base, compose(position, rotation));
    for (let tier = 0; tier < 4; tier++) this.surfaces.solid(spire, [0, height * tier * .2, 0],
      [.34 - tier * .07, height * .3, .48 - tier * .1], color, tier % 2 ? "metal" : "ceramic");
  }

  drawBossBloom(enemy, base, palette) {
    const { charge, recoil, open } = this.bossActuation(enemy);
    const growth = this.bossPhaseGrowth(enemy, 2), crown = this.bossPhaseGrowth(enemy, 3);
    const time = enemy.age || 0;
    // Deep seed pod and six articulated, three-segment armored petals.
    this.voxel(base, [0, -.18, 0], [1.8, .66, 2.05], "#291d39", .06);
    this.voxel(base, [0, .18, .14], [1.48, .62, 1.64], "#63364d", .12);
    for (let i = 0; i < 6; i++) {
      const angle = i * TAU / 6 + Math.PI / 6;
      const lift = .12 * Math.sin(time * 1.3 + i) + charge * .16 - recoil * .1;
      const arm = multiply(base, compose([Math.sin(angle) * open * .35, lift, Math.cos(angle) * open * .35], [0, angle, charge * .035]));
      this.voxelSegment(arm, [0, .05, .55], [0, .14, 2.58], .34, "#463046", .1);
      this.bossArmor(arm, [0, .12, 1.22], [1.02, .46, 1.24], "#823c62", "#d4708b", [0, 0, .08]);
      this.bossArmor(arm, [0, .24, 2.12], [.82, .34, .95], "#63314f", "#e39b91", [.12, 0, 0]);
      this.bossArmor(arm, [0, .28, 2.72], [.48, .24, .62], "#ae674e", "#e6bb71", [.28, 0, 0]);
      this.voxel(arm, [0, .49, 1.83], [.12, .12, .64], "#ffbc72", .86);
      this.bossJoint(arm, [0, .24, .77], .46, "#dcaa79", [Math.PI / 2, 0, 0]);
      for (const edge of [-1, 1]) {
        this.surfaces.segment(arm, [edge * .28, .18, .65], [edge * .34, .26, 1.39], .1, "#a77783", "metal");
        for (let rib = 0; rib < 3; rib++) this.surfaces.solid(arm, [edge * .3, .46, 1.05 + rib * .24], [.16, .07, .09], "#edc3a0", "ceramic", "plate", [0, edge * .35, 0]);
      }
      for (const side of [-1, 1]) this.voxel(arm, [side * .42, .08, 1.43], [.18, .25, .7], "#352740", .08, [0, side * .35, 0]);
      if (growth > .02) this.bossSpire(arm, [0, .64, 1.1], .82 * growth, "#cf9566", [.4, 0, 0]);
      if (crown > .02) this.bossSpire(arm, [0, .42, 2.39], .52 * crown, "#eac391", [.6, 0, 0]);
    }
    // An octagonal iris with a recessed faceted reactor and rising pistils.
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8, r = .68 + open * .28 + charge * .07;
      this.voxel(base, [Math.sin(a) * r, .65, Math.cos(a) * r], [.38, .4, .38], i % 2 ? "#b36b69" : "#e8bb87", .18, [0, a, 0]);
      this.voxel(base, [Math.sin(a) * .52, .85, Math.cos(a) * .52], [.14, .3 + charge * .32, .14], "#e7b259", .4 + charge * .35);
    }
    this.surfaces.solid(base, [0, .65, 0], [.85, .8, .85], "#8c3a53", "glass", "orb", [0, time * .12, 0]);
    this.surfaces.solid(base, [0, .91, 0], [.48, .52, .48], open ? "#bbf2d2" : "#ffe39e", "energy", "orb", [.2, -time * .18, .2]);
    for (const side of [-1, 1]) {
      this.bossArmor(base, [side * .46, .27, -1.03], [.52, .4, .72], "#69344e", "#da8990", [0, side * .22, 0]);
      this.voxel(base, [side * .38, .53, -1.33], [.27, .13, .19], "#ffe7ab", .65);
    }
  }

  drawBossForge(enemy, base, palette) {
    const { charge, recoil, open } = this.bossActuation(enemy);
    const growth = this.bossPhaseGrowth(enemy, 2), crown = this.bossPhaseGrowth(enemy, 3);
    this.bossArmor(base, [0, .05, .24], [1.58, .76, 3.05], "#243341", "#687c87");
    this.bossArmor(base, [0, .43, -.96], [1.1, .6, 1.32], "#354b58", "#91a6a2", [.13, 0, 0]);
    // Broad bridge, riveted pauldrons, independent sliding rail carriages.
    this.voxel(base, [0, .08, .62], [4.5, .44, 1.1], "#202c3c", .07);
    for (const side of [-1, 1]) {
      const shoulder = multiply(base, compose([side * (1.95 + open * .32), .12, .1 + recoil * .24]));
      this.bossArmor(shoulder, [0, .25, .28], [1.44, .86, 2.02], "#294951", "#6a9991", [0, side * -.07, 0]);
      this.bossArmor(shoulder, [side * .53, .06, .58], [.55, .6, 1.55], "#9a7442", "#dbc18a");
      this.voxel(shoulder, [0, .37, -1.12], [.86, .6, 1.85], "#172633", .06);
      for (const rail of [-1, 1]) {
        this.voxel(shoulder, [rail * .31, .52, -1.4], [.22, .3, 2.15], "#729895", .2);
        this.voxel(shoulder, [rail * .31, .72, -1.4], [.12, .12, 1.84], "#88e4d8", .35 + charge * .35);
      }
      this.bossJoint(shoulder, [0, .43, -2.14], .65, "#85c9c3");
      this.voxel(shoulder, [0, .43, -2.26 + recoil * .2], [.18, .14, .16], "#b9f6e5", .88);
      for (let band = 0; band < 5; band++) {
        this.surfaces.solid(shoulder, [0, .38, -1.8 + band * .28], [.76, .12, .1], "#415963", "metal");
        this.surfaces.solid(shoulder, [side * .54, .62, -.5 + band * .27], [.18, .08, .08], band % 2 ? "#d0ac67" : "#202e3c", "ceramic");
      }
      this.surfaces.segment(shoulder, [side * .47, .43, -.76], [side * .47, .43, .86], .12, "#859d97", "metal");
      this.bossJoint(base, [side * 1.06, .35, -.5], .52, "#c0b18a", [0, side * Math.PI / 2, 0]);
      for (let cell = 0; cell < 3; cell++) {
        const lit = charge >= cell / 3;
        this.voxel(shoulder, [0, .79, -.12 + cell * .47], [.66, .13, .26], lit ? "#a6e3c6" : "#b29154", lit ? .5 : .2);
        this.voxel(shoulder, [side * .66, .3, -.2 + cell * .48], [.14, .27, .17], "#172734", .05);
      }
      for (let fin = 0; fin < 3; fin++) this.voxel(base, [side * (1.35 + fin * .52), .3, 1.67 + fin * .18], [.3, .44, .76], "#657a81", .12, [.22, 0, 0]);
      this.bossJoint(base, [side * 1.75, .1, 1.83], .7, "#c4a471");
      this.surfaces.solid(base, [side * 1.75, .1, 1.94], [.42, .36, .65 + charge * .2], "#74c6d5", "flame", "flame");
      if (growth > .02) this.bossArmor(base, [side * .65, .8, .45], [.4, .85 * growth, .8], "#29464e", "#c4ac74", [0, 0, side * -.12]);
      if (crown > .02) this.bossSpire(base, [side * 2.7, .8, .67], 1.05 * crown, "#d6b57c", [0, 0, side * -.18]);
    }
    for (let i = 0; i < 4; i++) this.voxel(base, [0, .62, -.2 + i * .44], [.58, .24, .22], "#c3a466", .3);
    this.voxel(base, [0, .76, -.94], [.58, .13, .25], open ? "#b9efcd" : "#ffe3a2", .86);
    this.bossJoint(base, [0, .9, .6], .62, "#a9d9bd", [Math.PI / 2, 0, 0]);
    for (const side of [-1, 1]) for (let i = 0; i < 4; i++) this.surfaces.solid(base, [side * .63, .56, -.24 + i * .36], [.12, .12, .2], "#192c36", "metal");
    this.voxel(base, [0, .34, -1.79], [.63, .32, .32], "#182733", .1);
  }

  drawBossVoid(enemy, base, palette) {
    const { charge, recoil, open } = this.bossActuation(enemy);
    const growth = this.bossPhaseGrowth(enemy, 2), crown = this.bossPhaseGrowth(enemy, 3);
    const time = enemy.age || 0;
    // Two ribbed crescent hulls frame an actual gap; a suspended heart bridges their backs.
    for (const side of [-1, 1]) {
      const half = multiply(base, compose([side * (open * .32 + recoil * .12), .06 * Math.sin(time * 1.4 + side), 0], [0, side * charge * .045, 0]));
      this.bossArmor(half, [side * .86, .16, .3], [.9, .62, 2.76], "#322f50", "#8e88aa", [0, side * .12, 0]);
      const points = [[side * .9, .24, .92], [side * 1.95, .31, .8], [side * 2.72, .27, .13], [side * 3.15, .22, -.85], [side * 2.92, .16, -1.77], [side * 2.46, .12, -2.33]];
      for (let i = 1; i < points.length; i++) {
        this.voxelSegment(half, points[i - 1], points[i], .65 - i * .07, "#544969", .12);
        this.bossArmor(half, points[i], [.6 - i * .045, .32, .78], "#5e5779", i % 2 ? "#b1a2b8" : "#8a81a4", [0, side * (i * .43 - .5), 0]);
        this.voxel(half, [points[i][0] - side * .15, points[i][1] + .24, points[i][2]], [.14, .12, .35], "#dc91b8", .32 + charge * .38, [0, side * i * .25, 0]);
      }
      for (let rib = 0; rib < 4; rib++) {
        this.voxel(half, [side * (1.12 + rib * .22), .39, .82 - rib * .46], [.62, .2, .24], "#b0a2b6", .12, [0, side * -.45, .1]);
      }
      this.voxel(half, [side * .71, .35, -1.03], [.12, .18, .62], "#dd689d", .86);
      for (let facet = 0; facet < 5; facet++) {
        this.surfaces.solid(half, [side * .88, .57, -.7 + facet * .38], [.66, .12, .17], facet % 2 ? "#796b99" : "#c0a9c3", "ceramic", "plate", [.12, side * .14, 0]);
        this.surfaces.solid(half, [side * 1.27, .25, -.64 + facet * .37], [.1, .24, .12], "#c09ed2", "metal");
      }
      this.bossJoint(half, [side * 1.62, .41, .53], .46, "#dca2c1", [Math.PI / 2, 0, 0]);
      this.voxel(half, [side * .82, .08, 1.83], [.4, .28, .64], "#a896e3", .65);
      if (growth > .02) this.bossSpire(half, [side * 1.55, .76, .65], 1.08 * growth, "#a399c2", [.3, 0, side * -.3]);
      if (crown > .02) this.bossSpire(half, [side * 2.2, .68, .5], .83 * crown, "#eab4ce", [.2, 0, side * -.45]);
      this.voxelSegment(base, [side * .76, .47, .8], [side * .35, 1.03, .35], .2, "#807194", .2);
    }
    this.voxel(base, [0, .8, .53], [.68, .64, .8], "#272438", .08, [0, Math.PI / 4, 0]);
    this.surfaces.solid(base, [0, 1.19, .53], [.5, .54, .5], open ? "#84b8a3" : "#936ca7", "glass", "orb", [0, -time * .16, .12]);
    this.voxel(base, [0, 1.3, .32], [.16, .18, .16], open ? "#9cd8b7" : "#d6a5d9", .84);
    this.surfaces.solid(base, [0, 1.17, .53], [.91, .91, .46], "#a597c0", "metal", "ring", [.24, time * .12, .3]);
    for (let i = 0; i < 3; i++) this.voxel(base, [(i - 1) * .32, 1.03 + (i === 1 ? .36 : .12), 1.05], [.17, .62, .3], "#afa1c4", .2, [.15, 0, (i - 1) * -.22]);
  }

  drawBossTelegraph(enemy, base, palette, stage) {
    if (enemy.weaponState !== "windup") return;
    const charge = clamp(enemy.weaponCharge || 0, 0, 1);
    const pulse = .85 + charge * .35;
    if (stage === 0) {
      // Charge travels through the six petal tips, leaving the body readable.
      for (let i = 0; i < 6; i++) {
        const angle = -.95 + i * .38;
        const lit = charge >= i / 7;
        this.voxel(base, [Math.sin(angle) * 1.8, .38, Math.cos(angle) * 1.45],
          [.16, .08, .3 * pulse], lit ? "#edb976" : palette[1], lit ? .55 : .2, [0, angle, 0]);
      }
    } else if (stage === 1) {
      // Two shoulder capacitors fill lengthwise; no shared radial halo.
      for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
        const lit = charge >= i / 4;
        this.voxel(base, [side * .9, .58, -.85 + i * .38], [.32, .09, .13],
          lit ? "#b7e8df" : palette[1], lit ? .55 : .2);
      }
    } else {
      // The crown answers left then right across the split silhouette.
      for (const side of [-1, 1]) {
        const fill = clamp(charge * 1.6 - (side > 0 ? .3 : 0), 0, 1);
        this.voxel(base, [side * (1.8 + fill * .18), .4, .48], [.16, .12, .46 * pulse],
          side < 0 ? "#bc92d9" : "#dc8395", .28 + fill * .3, [0, side * .72, 0]);
      }
    }
  }

  drawBossAttackTelegraphs(boss) {
    const charge = boss.weaponState === "windup" ? clamp(boss.weaponCharge || 0, 0, 1) : 0;
    if ((boss.weaponState === "windup" || (boss.weaponState === "fire" && boss.salvoIndex + 1 < boss.salvoCount)) && ["sunLance", "railWall", "doubleRail"].includes(boss.attackId)) this.drawLaserTelegraph(boss, boss.weaponState === "fire" ? 1 : charge);
  }

  drawBoss(enemy, base, stageOverride = this.stageIndex, telegraphBase = base) {
    const stage = clamp(stageOverride, 0, 2);
    const palettes = enemy.hitFlash > 0 ? ["#4f7991", "#b74373", "#ffe15d"] : [["#2b1745", "#87325e", "#c99f42"], ["#202b48", "#2e7777", "#b99e3f"], ["#26163d", "#783052", "#b84658"]][stage];
    const scale = [1.08, 1.12, 1.16][stage];
    const bossBase = multiply(base, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    const bossTelegraphBase = multiply(telegraphBase, compose([0, 0, 0], [0, 0, 0], [scale, scale, scale]));
    if (stage === 0) this.drawBossBloom(enemy, bossBase, palettes);
    else if (stage === 1) this.drawBossForge(enemy, bossBase, palettes);
    else this.drawBossVoid(enemy, bossBase, palettes);
    this.drawBossTelegraph(enemy, bossTelegraphBase, palettes, stage);
    if (enemy.weaponState === "fire" && (enemy.salvoAge || 0) < .38) {
      const age = enemy.salvoAge || 0, fade = 1 - age / .38;
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12, radius = .8 + age * 4;
        this.voxel(bossBase, [Math.cos(a) * radius, .6 + age * .4, Math.sin(a) * radius],
          [.13, .12, .34 * fade], palettes[2], .38 * fade, [0, -a, 0]);
      }
    }
    if (enemy.phaseMorph > 0) {
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, travel = (1.4 - enemy.phaseMorph) * .8;
        this.voxel(bossBase, [Math.cos(a) * (1.5 + travel), .3 + travel * .3, Math.sin(a) * (1.5 + travel)],
          [.18, .1, .24], palettes[1], .3, [a, travel, 0]);
      }
    }
    if (enemy.phaseShield > 0) this.voxelCage(bossBase, 2.45 + Math.sin(this.time * 12) * .04, palettes[2], 1.15);
  }

  drawBossGallery(world) {
    const phaseLevel = world.bossGalleryPhase || 3;
    const layout = [[100, 106, -.12], [240, 99, 0], [380, 106, .12]];
    layout.forEach(([x, y, yaw], stage) => {
      const base = compose(this.toWorld(x, y, .34), [0, Math.PI + yaw, 0], [1.3, 1.3, 1.3]);
      const attackIds = [["petalBurst", "seedSpiral", "twinBloom"], ["railWall", "forgeCross", "doubleRail"], ["spiralCrown", "eclipseTwin", "tripleEclipse"]];
      this.drawBoss({ phaseLevel, phaseShield: 0, hitFlash: 0, seed: stage + 1, weaponState: "cooldown", weaponCharge: 0, attackId: attackIds[stage][phaseLevel - 1] }, base, stage);
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
      ["nectarMoth", "weave", "seeker", "light", "pack", "clean"],
      ["prismRay", "drift", "laser", "barrier", "oracle", "clean"],
      ["cometRammer", "rush", "pulse", "volatile", "ambusher", "clean"],
      ["auroraLeech", "weave", "laser", "light", "hunter", "cryo"],
      ["railBeetle", "rush", "bomb", "plated", "pack", "fracture"],
      ["reefMedusa", "drift", "bomb", "barrier", "flanker", "cryo"],
      ["eclipseReaper", "rush", "seeker", "volatile", "ambusher", "glitch"],
      ["graveMirror", "weave", "laser", "barrier", "oracle", "glitch"],
      ["gardenSpore", "drift", "bomb", "plated", "pack", "fracture"],
    ];
    const moduleColors = ["#ffd454", "#ff6b60", "#70eaff", "#a96cff", "#ff83d7", "#ffb45f", "#63e6a8", "#ffca58", "#7fffe2", "#ff9a6c", "#68f4df", "#ffe16c", "#72d5e8", "#ff5d78", "#b57dff", "#63e6a8"];
    const layout = Array.from({ length: 16 }, (_, index) => [62 + index % 4 * 119, 30 + Math.floor(index / 4) * 62]);
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
        weaponState: "windup",
        weaponCharge: (Math.sin(this.time * 2 + index) + 1) * .5,
        moduleColor: moduleColors[index],
        moduleBarrier: coreModule === "barrier" ? 4 : 0,
        seed: index + 1,
        age: this.time * .25,
        moduleScale: 1,
        galleryScale: .84,
        galleryYaw: (index % 4 - 1.5) * .1,
        hitFlash: 0,
        elite: false,
        boss: false,
      });
    });
    this.canvas.dataset.modelGallery = "active";
  }

  projectileTrail(base, color, width, length, segments = 3, offsetX = 0) {
    // Discrete exhaust cells: a short wake, never a second projectile silhouette.
    const count = this.quality === "low" ? 2 : segments;
    for (let i = 0; i < count; i += 1) {
      const t = (i + 1) / count;
      this.pixelEffects.fleck(base, [offsetX, .01, -length * (.6 + t * 1.4)],
        width * (2.2 - t), color, (1 - t * .75) * .52, 0, 1.4, Math.PI / 2);
    }
  }

  drawHostileProjectileSparks(bullet, base, position, size, color, core) {
    const age = bullet.age || 0;
    const explosive = bullet.behavior === "mine" || bullet.behavior === "blast";
    if (explosive) {
      const fuse = clamp(age / Math.max(.01, bullet.triggerAge || 1), 0, 1);
      // Fuse heat stays on the seed: no detached countdown or danger circle.
      const pulse = .5 + .5 * Math.sin(TAU * (age * 2 + fuse * fuse * 2));
      this.pixelEffects.spark(null, [position[0], position[1] + .08, position[2]], size * (1 + fuse * .7),
        this.highContrastBullets ? "#ffffff" : "#ffcf79", .25 + fuse * .25 + fuse * pulse * .35, .45);
      return;
    }
    // Dense walls keep only their solid heads. Other rounds have a dim two-cell wake.
    if (bullet.behavior !== "homing" && bullet.weaponModule !== "sniper" &&
        !["laneWall", "commandCross", "lance", "twinLance"].includes(bullet.pattern)) {
      this.projectileTrail(base, color, size * .42, size * 1.25, 2);
    }
    // A tiny hot centre preserves payload ink and never becomes a detached hitbox.
    if (bullet.bossStage != null) this.pixelEffects.spark(null, [position[0], position[1] + .06, position[2]],
      size * .6, core, .25, .25);
  }

  drawProjectile(bullet, enemy = false) {
    const position = this.toWorld(bullet.x, bullet.y, enemy ? .42 : .52);
    const travelAngle = Math.atan2(bullet.vx, bullet.vy);
    const base = compose(position, [0, travelAngle, 0]);
    if (enemy) {
      const size = (.11 + bullet.r * .026) * HOSTILE_PROJECTILE_SCALE;
      const age = bullet.age || 0;
      const tick = Math.floor(age * 12) / 12;
      const fuse = clamp(age / Math.max(.01, bullet.triggerAge || 1), 0, 1);
      const loaded = bullet.payloadModule && bullet.payloadModule !== "clean";
      const payload = { cryo: "#70eaff", glitch: "#ff83d7", fracture: "#ffb45f" };
      const color = this.highContrastBullets ? "#fff06a" : "#fa6788";
      const edge = this.highContrastBullets ? "#b34b42" : "#803e72";
      const core = this.highContrastBullets ? "#ffffff" : loaded ? (payload[bullet.payloadModule] || "#dfff68") : "#ffbf98";
      let shape = "seed", angle = travelAngle, unit = size * .62;
      if (bullet.behavior === "mine") {
        shape = fuse >= .65 ? "mineArmed" : "mine";
        angle += tick * 1.8;
        unit = size * .72;
      } else if (bullet.behavior === "blast") {
        shape = fuse >= .65 ? "blastArmed" : "blast";
        unit = size * .6;
      } else if (bullet.behavior === "homing") {
        shape = age <= (bullet.homingDuration || 0) ? "seeker" : "seekerSpent";
        const tracking = age <= (bullet.homingDuration || 0);
        this.projectileTrail(base, tracking ? color : edge, size * (tracking ? .72 : .45), size * (tracking ? 2.4 : 1.4));
      } else if (["laneWall", "commandCross"].includes(bullet.pattern)) {
        shape = "wall";
      } else if (["pincer", "predictiveFan", "sweep"].includes(bullet.pattern)) {
        shape = "shard";
      } else if (bullet.bossStage === 0) {
        shape = "bloom";
      } else if (bullet.bossStage === 1) {
        shape = "forge";
      } else if (bullet.bossStage === 2) {
        shape = "void";
        angle += tick * 4.6;
      } else if (bullet.weaponModule === "sniper" || ["lance", "twinLance"].includes(bullet.pattern)) {
        shape = "needle";
        this.projectileTrail(base, edge, size, size * 3);
      } else if (bullet.weaponModule === "orbit" || ["spiral", "counterSpiral"].includes(bullet.pattern)) {
        shape = "orbit";
        angle += tick * (bullet.curve < 0 ? -4.6 : 4.6);
      } else if (bullet.weaponModule === "twin") {
        shape = "twin";
      }
      this.drawHostileProjectileSparks(bullet, base, position, size, color, core);
      // Inset payload ink stays inside the projectile, rather than a detached false hitbox.
      this.projectileArt.draw(shape, [color, edge, core], position, angle, unit);
    } else {
      let shape = "bolt", unit = .09;
      let palette = bullet.owner === 1 ? ["#e47d69", "#8b435c", "#f1b58e"] : ["#46cdbb", "#246b77", "#85e3cf"];
      if (bullet.phaseBarrier) {
        shape = "phase"; unit = .1;
        palette = ["#61cede", "#32668a", "#c3e8eb"];
        this.projectileTrail(base, palette[0], .1, .3);
      } else if ((bullet.seeker || 0) > 0) {
        shape = "drone"; unit = .085;
        palette = ["#a382d3", "#514574", "#d1b5eb"];
        this.projectileTrail(base, palette[0], .1, .25);
      } else if ((bullet.r || 0) > 2.35) {
        shape = "heavy"; unit = .1;
        palette = ["#dfac58", "#936045", "#f3d697"];
      }
      const tier = Math.min(3, Math.max(0, bullet.tier || 0));
      if (bullet.source === "heavy") { shape = tier >= 3 ? "heavy3" : tier === 2 ? "heavy2" : "heavy"; unit = .095; }
      else if (bullet.source === "fan") { shape = `fan${Math.max(1, tier)}`; unit = .075; palette = ["#59d8c9", "#3b6998", "#a3eee3"]; }
      else if (bullet.source === "seeker") { shape = tier >= 3 ? "drone3" : tier === 2 ? "drone2" : "drone"; unit = .085; }
      else if (bullet.source === "overloadPulse") { shape = tier >= 2 ? "overload2" : "overload1"; unit = .095; palette = ["#bc8df0", "#695da8", "#e3c8fb"]; }
      else if (bullet.source === "linkReturn") { shape = "phase"; unit = .085; palette = ["#87ffee", "#428fb6", "#d1f5ff"]; this.projectileTrail(base, palette[0], .08, .38); }
      else if (bullet.source === "primary" && tier) { shape = tier >= 2 ? "bolt3" : "bolt2"; unit = .075; }
      const spent = (bullet.hitIds?.length || 0) > 0;
      if (spent) unit *= .78;
      this.projectileArt.draw(shape, palette, position, travelAngle, unit);
      // All friendly rounds get a readable, tapered wake; special ammo keeps its hue.
      if (!bullet.phaseBarrier && !(bullet.seeker > 0) && bullet.source !== "linkReturn") {
        this.projectileTrail(base, palette[0], spent ? .055 : .085, shape.startsWith("heavy") ? .36 : .24);
      }
      const maxed = tier >= (bullet.source === "overloadPulse" || bullet.source === "primary" ? 2 : 3);
      if (maxed && !spent) {
        const step = Math.floor((bullet.age || 0) * 18) % 3;
        for (const side of [-1, 1]) {
          this.pixelEffects.spark(base, [side * .16, .02, -.32 - step * .08], .11, palette[0], .4, .55);
          this.pixelEffects.spark(base, [side * .11, .02, -.58 - step * .06], .07, palette[2], .22);
        }
      }
    }
  }

  drawRadialShockwave(effect, base) {
    const progress = clamp(effect.age / effect.duration, 0, 1);
    const rx = effect.radius / 21.5, rz = effect.radius / 13.3;
    const seed = (effect.x * .13 + effect.y * .07) % 19;
    this.pixelEffects.shockwave(base, effect.radius, progress, effect.color, seed);
    // Sparse, unequal radial splinters: a fast impulse followed by cooling debris.
    const count = this.quality === "low" ? 8 : 14;
    for (let i = 0; i < count; i += 1) {
      const random = (i * .61803398875 + seed * .1) % 1;
      const delay = random * .09;
      const age = Math.max(0, progress - delay);
      if (age <= 0) continue;
      const angle = i * TAU / count + random * .3;
      const reach = (.15 + (1 - Math.exp(-age * 5)) * .7) * (.7 + random * .3);
      const fade = Math.max(0, 1 - age / .75) ** 2;
      const point = [Math.cos(angle) * rx * reach, random * .09, Math.sin(angle) * rz * reach];
      this.pixelEffects.fleck(base, point, .10 + random * .09, effect.color, fade * .48, 0, 1.6, angle);
      if (i % 3 === 0 && age < .3) {
        this.pixelEffects.spark(base, [point[0] * .92, point[1], point[2] * .92], .045, effect.color, fade * .2);
      }
    }
    const flash = Math.max(0, 1 - effect.age / .065);
    this.pixelEffects.spark(base, [0, .03, 0], .24, effect.color, flash * .5, .15);
  }

  drawPowerEffects(world) {
    for (const effect of world.power?.effects || []) {
      const progress = clamp(effect.age / effect.duration, 0, 1);
      const base = compose(this.toWorld(effect.x, effect.y, .48));
      if (effect.kind === "nova" || effect.kind === "blast") {
        this.drawRadialShockwave(effect, base);
        continue;
      }
      if (effect.kind === "intercept") {
        const fade = (1 - progress) ** 2;
        this.pixelEffects.spark(base, [0,0,0], .22, effect.color, Math.max(0,1-progress*5)*.55, .15);
        for (let mote = 0; mote < 9; mote += 1) {
          const seed = (mote * .618034) % 1;
          const angle = mote * 2.39996;
          const reach = (.12 + Math.sqrt(progress) * .52) * (.45 + seed * .55);
          this.pixelEffects.fleck(base, [Math.cos(angle)*reach, Math.sin(mote*2.4)*progress*.12, Math.sin(angle)*reach],
            (.09+seed*.13)*(1-progress*.6), effect.color, fade*.75, 0, 1+seed, angle+progress);
        }
        continue;
      }
      if (effect.kind === "arc" && effect.target) {
        const a = this.toWorld(effect.x, effect.y, .5), b = this.toWorld(effect.target.x, effect.target.y, .5);
        const dx = b[0]-a[0], dz = b[2]-a[2], length = Math.max(.01,Math.hypot(dx,dz));
        const frame = Math.floor(effect.age*24);
        const fade = (1-progress)**2;
        let previous = [0,0,0];
        for (let i = 1; i <= 9; i += 1) {
          const t=i/9;
          const kink=i===9?0:Math.sin(i*8.3+frame*2.7)*.15*Math.sin(t*Math.PI);
          const next=[dx*t-dz/length*kink,0,dz*t+dx/length*kink];
          this.surfaces.line(base,previous,next,effect.color,fade*.7);
          if (i%3===0 && i<9) {
            this.surfaces.line(base,next,[next[0]-dz/length*.16,next[1],next[2]+dx/length*.16],effect.color,fade*.22);
            this.pixelEffects.fleck(base,next,.11,effect.color,fade*.6,0,1.5,i);
          }
          previous=next;
        }
        continue;
      }
      if (["linkPulse", "novaEcho"].includes(effect.kind)) {
        this.drawRadialShockwave(effect, base);
        continue;
      }
      const radius = effect.radius || 5;
      const muzzle = effect.kind === "muzzle";
      const fade = (1 - progress) ** 2;
      const expansion = 1 - (1 - progress) ** 3;
      const count = this.quality === "low" ? 6 : muzzle ? 7 : 11;
      const flash = Math.max(0, 1 - progress / .22);
      this.pixelEffects.spark(base, [0, .03, 0], muzzle ? .18 : .26,
        effect.color, flash * .55, .2);
      for (let i = 0; i < count; i += 1) {
        const seed = (i * .61803398875) % 1;
        const angle = i * 2.39996 + (muzzle ? Math.PI / 4 : .12);
        const reach = radius * expansion * (.3 + seed * .65);
        const x = Math.round(Math.cos(angle) * reach / 21.5 / .035) * .035;
        const z = Math.round(Math.sin(angle) * reach / 13.3 / .035) * .035;
        const size = (muzzle ? .13 : .16 + seed * .14) * (1 - progress * .6);
        this.pixelEffects.fleck(base, [x, Math.sin(i * 2.4) * progress * .18, z], size,
          effect.color, fade * (.45 + seed * .35), 0, 1 + seed, angle + progress * 2);
      }
    }
    const support = world.power?.link;
    if (support && (support.connected || support.linger > 0)) {
      for (const player of world.players.filter(p => !p.downed)) {
        const base = compose(this.toWorld(player.x, player.y, .55));
        const ready = support.ready && (support.stable >= .5 || !support.connected);
        for (const side of [-1, 1]) this.pixelEffects.spark(base, [side * .65, 0, .12],
          ready ? .2 : .1, ready ? "#87ffee" : "#416a80", support.connected ? .6 : support.linger * .5);
      }
    }
    if (world.linked && world.upgrades?.rushGuard) {
      const [a, b] = world.players;
      for (let index = 0; index < 3; index += 1) {
        const fraction = (index + 1) / 4;
        const base = compose(this.toWorld(lerp(a.x, b.x, fraction), lerp(a.y, b.y, fraction), .65));
        const full = index < (world.power?.guardNodes || 0);
        const color = full ? (support?.tasks.rushGuard?.complete ? "#ffe698" : "#a6e5ff") : "#415374";
        this.pixelEffects.spark(base, [0, 0, 0], full ? .3 : .14, color, full ? .9 : .22);
        if (full) for (let mote = 0; mote < 2; mote += 1) {
          const angle = mote * Math.PI + this.time * .65;
          this.pixelEffects.fleck(base, [Math.cos(angle) * .16, 0, Math.sin(angle) * .16], .09, color, .4);
        }
      }
    }
  }

  drawWeaponPods(player) {
    if (player.downed) return;
    const base = compose(this.toWorld(player.x, player.y, .64), [0, Math.PI, 0], [PLAYER_MODEL_SCALE, PLAYER_MODEL_SCALE, PLAYER_MODEL_SCALE]);
    const levels = player.upgradeRanks || {};
    for (const [id, offset, color] of [["rail", .2, "#e8b867"], ["prism", .63, "#66d9cb"], ["drone", .9, "#af91e9"]]) {
      if (!levels[id]) continue;
      for (const side of [-1, 1]) {
        this.voxel(base, [side * offset, .04, .22], [.14, .12, .3 + levels[id] * .035], "#526a84", .06);
        this.voxel(base, [side * offset, .12, .4], [.09, .08, .16], color, .35);
        if (levels[id] === 3) this.voxel(base, [side * (offset + .09), .08, .31], [.07, .07, .22], color, .28);
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
    const size = (.035 + particle.size * .025) * (.55 + alpha * .45);
    const speed = Math.hypot(particle.vx || 0, particle.vy || 0);
    const angle = Math.atan2(particle.vx || 0, particle.vy || 1);
    // Simulation owns motion; the renderer only adds a cooling, stepped light envelope.
    const cooling = alpha < .3;
    const base = compose(position, [0, angle, particle.life * 3.2]);
    this.voxel(base, [0, 0, 0], [size, size, size * 1.25], cooling ? "#483f48" : particle.color, alpha > .65 ? .65 : .16);
    if (!cooling) this.pixelEffects.fleck(null, position, size * 1.6, particle.color,
      alpha * .55, .6, 1, Math.floor(particle.life * 12) * Math.PI / 4);
    if (speed > 45 && alpha > .35 && this.quality !== "low") {
      const wake = this.toWorld(particle.x - particle.vx * .012, particle.y - particle.vy * .012, .25 + particle.size * .08);
      this.pixelEffects.fleck(null, wake, size * 1.1, particle.color, alpha * .28);
    }
  }

  drawBeam(playerA, playerB, world = {}) {
    const a = this.toWorld(playerA.x, playerA.y, .42);
    const b = this.toWorld(playerB.x, playerB.y, .42);
    const overloaded = (world.rushTimer || 0) > 0;
    const charge = clamp((world.rushCharge || 0) / 100, 0, 1);
    const cooling = (world.rushCooldown || 0) > 0;
    const color = overloaded ? "#b69aff" : "#5ccfc8";
    const speed = overloaded ? 1.8 : cooling ? .28 : .55 + charge * .4;
    this.surfaces.line(compose(), a, b, color, overloaded ? .35 : .15);
    const distance = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const count = Math.max(10, Math.min(this.quality === "low" ? 18 : overloaded ? 28 : 18, Math.ceil(distance * (overloaded ? 7 : 4))));
    // Two streams converge on the actual link; no solid cable or lateral fake hit lane.
    for (let index = 0; index < count; index += 1) {
      const flow = (index / count + this.time * speed) % 1;
      const t = index % 2 ? 1 - flow * .5 : flow * .5;
      const p = a.map((value, axis) => lerp(value, b[axis], t));
      p[1] += Math.sin(index * 2.4 + this.time * 3) * .065 * Math.sin(t * Math.PI);
      const packet = (flow * 3) % 1;
      if (packet > .58) continue;
      this.pixelEffects.fleck(null, p, (overloaded ? .16 : .11) * (1 - packet*.6),
        color, cooling ? .18 : .38 + (1-packet)*.2, 0, 1.4, .4);
    }
    for (const point of [a, b]) this.pixelEffects.spark(null, point, .13, color, overloaded ? .35 : .2, .15);
  }

  drawEnemyBeam(beam) {
    const a = this.toWorld(beam.x1, beam.y1, .48);
    const b = this.toWorld(beam.x2, beam.y2, .48);
    const phase = clamp(beam.age / Math.max(.01, beam.duration), 0, 1);
    const alpha = .45 + Math.sin(Math.PI * phase) * .55;
    const dx = beam.x2 - beam.x1, dy = beam.y2 - beam.y1;
    const length = Math.max(.001, Math.hypot(dx, dy));
    // Compute transverse offsets in logical collision space before projecting to 3D.
    const nx = -dy / length * (beam.width || 5) / 21.5;
    const nz = dx / length * (beam.width || 5) / 13.3;
    this.pixelEffects.beam(a, b, nx, nz, length, beam.age, alpha, beam);
    const tint = beam.debuff && beam.payloadColor ? beam.payloadColor : beam.color || "#ffe070";
    // The continuous energy ribbon carries the silhouette; sparse sparks carry motion.
    const count = Math.min(this.quality === "low" ? 40 : 72, Math.max(24, Math.ceil(length * .2)));
    for (let index = 0; index < count; index += 1) {
      const seed = (index * .618034) % 1;
      const life = (beam.age * (2.8 + seed * 2.2) + seed) % 1;
      const t = (seed + beam.age * (1.7 + (index % 3) * .45)) % 1;
      const offset = Math.sin(index * 2.4) * (.45 + life * .8);
      const p = [lerp(a[0], b[0], t) + nx * offset, .49 + Math.sin(index * 1.7) * life * .06, lerp(a[2], b[2], t) + nz * offset];
      this.pixelEffects.fleck(null, p, (.075 + seed * .17) * (1 - life * .55),
        life < .3 ? "#fff0c9" : tint, alpha * (1 - life) * .5, .85, 1.4, index + life * 2);
    }
    const power = clamp(((beam.damage || 1) - 1) / 4, 0, 1);
    const ignition = Math.max(0, 1 - beam.age / .18);
    this.pixelEffects.spark(null, a, .22 + ignition * (.2 + power * .15), tint, alpha * (.35 + ignition * .3), .35 + power * .2);
    // A one-shot, forward fan follows the beam direction, independent of screen orientation.
    const worldLength = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const forwardX = (b[0] - a[0]) / Math.max(.001, worldLength), forwardZ = (b[2] - a[2]) / Math.max(.001, worldLength);
    const sparks = (this.quality === "low" ? 16 : 28) + Math.round(power * 12);
    for (let index = 0; index < sparks; index += 1) {
      const seed = (index * .618034) % 1;
      const age = beam.age - (index % 5) * .008;
      const life = age / (.14 + seed * .16);
      if (life < 0 || life >= 1) continue;
      const travel = life * (.28 + seed * .65) * (1 + power * .5);
      const fan = Math.sin(index * 2.4) * travel * .65;
      this.pixelEffects.fleck(null, [a[0] + forwardX * travel - forwardZ * fan, a[1] + Math.cos(index * 1.7) * travel * .28, a[2] + forwardZ * travel + forwardX * fan],
        (index % 6 ? .09 + seed * .13 : .35) * (1 - life * .7) * (1 + power * .4), index % 6 ? tint : "#ffebc4",
        (1 - life) ** 1.4 * (.65 + power * .2), index % 6 ? .8 : 1.7, 1.3, index + life);
    }
  }

  drawRush(world) {
    for (const player of world.players.filter((entry) => !entry.downed)) {
      const base = compose(this.toWorld(player.x, player.y, .28), [0, 0, 0], [PLAYER_MODEL_SCALE, PLAYER_MODEL_SCALE, PLAYER_MODEL_SCALE]);
      for (let index = 0; index < 24; index += 1) {
        const t = (index / 24 + this.time * 1.3) % 1;
        const side = index % 2 ? -1 : 1;
        this.pixelEffects.fleck(base, [side * (.72 + t * .22), .1 + Math.sin(index * 2.4) * .18, .2 + t * 1.4],
          .12 + (1 - t) * .1, index % 5 ? "#a388f4" : "#b7f4ef", (1 - t) * .6);
      }
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

  render(world, stages, playerConfigs, settings = {}) {
    if (!this.ready) return false;
    this.quality = settings.quality || "high";
    this.highContrastBullets = settings.bulletContrast === "high";
    this.resize();
    this.time = world.time;
    this.stageIndex = world.stageIndex || 0;
    const stage = stages[this.stageIndex];
    this.environment.update(stage, world, settings);
    this.beginFrame();
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
    this.environment.drawBackground(world);
    if (world.boss) this.drawBossAttackTelegraphs(world.boss);
    if (world.mode === "menu") {
      this.drawShip({ index: 0, frameId: world.loadoutFrame, moduleId: world.loadoutModule, x: 4.8 + Math.sin(this.time * .6) * .4, z: -.5 + Math.cos(this.time) * .25 }, playerConfigs[0], true);
      this.drawShip({ index: 1, frameId: world.loadoutFrame, moduleId: world.loadoutModule, x: 7.2 + Math.sin(this.time * .7) * .5, z: 1.1 + Math.cos(this.time * .8) * .25 }, playerConfigs[1], true);
      this.endFrame();
      return true;
    }
    this.environment.drawObjectives(world);
    for (const pickup of world.pickups) this.drawPickup(pickup);
    for (const enemy of world.enemies) this.drawEnemy(enemy);
    for (const bullet of world.bullets) this.drawProjectile(bullet, false);
    for (const bullet of world.enemyBullets) this.drawProjectile(bullet, true);
    for (const beam of world.enemyBeams || []) this.drawEnemyBeam(beam);
    this.drawPowerEffects(world);
    if (world.linked) this.drawBeam(world.players[0], world.players[1], world);
    if (world.rushTimer > 0) this.drawRush(world);
    if (world.activeProtocols?.length) this.drawProtocols(world);
    for (const player of world.players) {
      this.drawWeaponPods(player);
      if (!player.downed) this.drawShip(player, playerConfigs[player.index]);
      else if (player.downed) this.drawShip({ ...player, vx: Math.sin(this.time * 5) * 20, vy: 0 }, { ...playerConfigs[player.index], color: playerConfigs[player.index].dark });
    }
    for (const particle of world.particles.slice(-180)) this.drawParticle(particle);
    this.canvas.dataset.novaRangeStyle = "eroded-wave-sparse-splinters";
    this.canvas.dataset.fuseTimerStyle = "body-heat-no-ring";
    this.canvas.dataset.hostileParticleStyle = "muzzle-burst-tracking-fuse-ticks";
    this.canvas.dataset.particleStyle = "stepped-pixel-wakes-burst-cooling";
    this.canvas.dataset.powerVfx = "ranked-pixel-ammo-exact-blast-radius";
    this.endFrame();
    return true;
  }
}

window.SpaceRenderer3D = SpaceRenderer3D;
