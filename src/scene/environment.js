import * as THREE from "three";
import { TAU, clamp, lerp, mixColor } from "../render-math.js";
import { SCENE_SETTINGS, qualitySettings, resolveScene } from "./settings.js";
import { SpaceScenery } from "./scenery.js";
import { SceneEvents } from "./events.js";

// Sole owner of environmental resources, camera, light and layer order.
// paint is an explicit geometry interface, never the renderer prototype/world owner.
export class SpaceEnvironment {
  constructor(scene, camera, paint, canvas) {
    this.scene = scene;
    this.camera = camera;
    this.paint = paint;
    this.canvas = canvas;
    this.scenery = new SpaceScenery(scene, paint);
    this.events = new SceneEvents(paint, canvas);
    this.starLayers = SCENE_SETTINGS.stars.map(s => this.createStars(s.count, s.size, s.seed, s.parallax));
    this.nebulaTexture = this.createNebulaTexture();
    this.nebulaLayers = SCENE_SETTINGS.nebula.map(s => this.createNebulaCloud(s.count, s.size, s.seed, s.opacity));
    const lighting = SCENE_SETTINGS.lights;
    this.fillLight = new THREE.AmbientLight(...lighting.ambient);
    this.hemisphere = new THREE.HemisphereLight(...lighting.sky);
    this.keyLight = new THREE.DirectionalLight(...lighting.key);
    this.keyLight.position.fromArray(lighting.keyPosition);
    this.rimLight = new THREE.PointLight("#7fffe2", lighting.rim.intensity, lighting.rim.range, 2);
    this.rimLight.position.fromArray(lighting.rim.position);
    this.playerLights = lighting.player.colors.map(color => new THREE.PointLight(color, lighting.player.intensity, lighting.player.range, 2));
    scene.add(...this.starLayers, ...this.nebulaLayers, this.fillLight, this.hemisphere, this.keyLight, this.rimLight, ...this.playerLights);
    this.lastTime = null;
  }

  update(stage, world, settings) {
    const biome = resolveScene(stage, world.stageIndex);
    const quality = settings.quality || "high", budget = qualitySettings(quality);
    const dt = this.lastTime === null || world.time < this.lastTime ? 1 : clamp(world.time - this.lastTime, 0, .25);
    this.lastTime = world.time;
    const blend = dt === 1 ? 1 : 1 - Math.exp(-dt * 2.4);
    this.biome = biome;
    const artSide = biome.anchor[0] > 0 ? -1 : 1;
    this.scene.background.lerp(new THREE.Color(biome.sky), blend);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density = SCENE_SETTINGS.fog;
    this.starLayers.forEach((stars, i) => {
      const config = SCENE_SETTINGS.stars[i];
      stars.material.color.set([biome.star, biome.secondary, biome.accent][i]);
      stars.geometry.setDrawRange(0, Math.round(config.count * budget.stars));
      stars.position.z = (world.time * config.speed) % 24 + config.offset;
    });
    this.nebulaLayers.forEach((cloud, i) => {
      const config = SCENE_SETTINGS.nebula[i];
      cloud.material.color.set(mixColor(i ? biome.accent : biome.secondary, i ? "#1d2942" : "#303650", .4));
      const atmosphere = SCENE_SETTINGS.atmosphere;
      const breath = world.time * TAU / atmosphere.period + i * 2.1 + biome.index * .7;
      cloud.scale.x = artSide;
      cloud.position.x = Math.sin(breath) * atmosphere.drift;
      cloud.rotation.z = Math.sin(breath * .7) * atmosphere.tilt;
      cloud.material.opacity = config.opacity * (1 + Math.sin(breath) * atmosphere.breathe);
      cloud.geometry.setDrawRange(0, Math.round(config.count * budget.nebula));
      cloud.position.z = (world.time * config.speed) % config.span - config.span / 2;
    });
    this.rimLight.color.set(world.activeAnomaly?.color || biome.accent);
    this.rimLight.intensity = SCENE_SETTINGS.lights.rim.intensity + (world.activeAnomaly ? SCENE_SETTINGS.lights.rim.anomalyBoost : 0);
    this.playerLights.forEach((light, index) => {
      const player = world.players?.[index];
      light.visible = Boolean(player && world.mode !== "menu" && !player.downed && !world.modelGallery && !world.bossGallery);
      if (player) light.position.fromArray(this.paint.toWorld(player.x, player.y, .85));
    });
    this.updateCamera(world, settings);
    const view = { time: world.time, quality };
    this.scenery.begin(view);
    this.events.begin(view);
    this.canvas.dataset.sceneProfile = biome.id;
    this.canvas.dataset.sceneQuality = quality;
    this.canvas.dataset.anomalyPresentation = "environment-light-and-hud";
    this.canvas.dataset.sceneLayers = world.modelGallery || world.bossGallery ? "atmosphere-gallery" : "atmosphere-main-landmark-transitions-objectives";
    this.canvas.dataset.sceneMotion = "anchored-slow-cycles";
    this.canvas.dataset.sceneMotionPhase = ((world.time / biome.motion.period) % 1).toFixed(4);
    this.canvas.dataset.sceneConfig = "centralized-scene-settings";
  }

  updateCamera(world, settings) {
    const config = SCENE_SETTINGS.camera;
    let follow = 0;
    if (world.players?.length && world.mode !== "menu") follow = world.players.reduce((sum, p) => sum + this.paint.toWorld(p.x, p.y)[0], 0) / world.players.length * config.follow;
    const shakeStrength = Number.isFinite(settings.shake) ? settings.shake : 1;
    const shake = world.shake > 0 ? (Math.random() - .5) * world.shake * config.shake * shakeStrength : 0;
    const cinematic = world.cinematic;
    const progress = cinematic ? clamp(1 - cinematic.timer / cinematic.total, 0, 1) : 0;
    const amount = cinematic && !["boss", "phase"].includes(cinematic.type) ? Math.sin(progress * Math.PI) : 0;
    const eye = [config.eye[0] + follow + shake, config.eye[1] + shake - amount * .65, config.eye[2] - amount * 1.35];
    const target = [config.target[0] + follow * .25, config.target[1], config.target[2]];
    if (cinematic?.type === "encounter" && world.activeEncounter) {
      const position = this.paint.toWorld(world.activeEncounter.x, world.activeEncounter.y, .3);
      target[0] = lerp(target[0], position[0], amount * .42);
      target[2] = lerp(target[2], position[2], amount * .3);
    }
    this.camera.position.fromArray(eye);
    this.camera.lookAt(...target);
  }

  drawBackground(world) {
    this.scenery.draw(this.biome);
    this.events.drawBackground(world, this.biome);
    this.canvas.dataset.scenePlanetCache = String(this.scenery.sceneryPlanets.size);
  }

  drawObjectives(world) { this.events.drawObjectives(world); }

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
    const material = new THREE.PointsMaterial({ color: "#dfe8ff", size, sizeAttenuation: true, transparent: true, opacity: .62, depthWrite: false, toneMapped: false });
    return new THREE.Points(geometry, material);
  }

  createNebulaTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const u = (x - 31.5) / 31.5, v = (y - 31.5) / 31.5;
      const envelope = Math.max(0, 1 - u * u - v * v) ** 2;
      const cellX = Math.floor(x / 3), cellY = Math.floor(y / 3);
      const vein = .48 + .26 * Math.sin(cellX * .7 + Math.sin(cellY * .6) * 2) + .18 * Math.cos(cellY * .9 - cellX * .24);
      const i = (y * 64 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = Math.round(255 * envelope * Math.max(0, vein));
    }
    context.putImageData(pixels, 0, 0);
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
    const centers = [[-24, -3], [-12, .2], [1, 2.4], [15, .2]];
    for (let index = 0; index < count; index += 1) {
      const center = centers[index % centers.length];
      const angle = random() * TAU;
      const radius = 1.2 + Math.pow(random(), .68) * 7.6;
      positions[index * 3] = center[0] + Math.cos(angle) * radius;
      positions[index * 3 + 1] = center[1] + Math.sin(angle) * radius * .44 + (random() - .5) * 1.2;
      positions[index * 3 + 2] = -56 + random() * 10;
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
      depthTest: true,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      map: this.nebulaTexture,
    });
    const cloud = new THREE.Points(geometry, material);
    cloud.renderOrder = -10;
    return cloud;
  }
}
