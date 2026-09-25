import { compose, TAU, clamp } from "../render-math.js";
import { SCENE_SETTINGS } from "./settings.js";

// Visuals read authoritative event state; all triggers, radii and rewards stay in game.js.
export class SceneEvents {
  constructor(paint, canvas) {
    this.paint = paint;
    this.canvas = canvas;
    this.width = 480;
    this.height = 270;
  }

  begin(view) { this.time = view.time; }

  drawBackground(world, biome) {
    this.drawSectorArchitecture(world, biome);
    this.syncAnomalyState(world);
    this.syncThreatState(world);
  }

  drawObjectives(world) {
    if (world.routeChoice) this.drawRouteGates(world.routeChoice);
    if (world.activeEncounter) this.drawEncounter(world.activeEncounter);
    for (const object of world.encounterObjects || []) this.drawEncounterObject(object);
  }

  drawRouteGates(choice) {
    const laneCenters = [this.width * .19, this.width * .5, this.width * .81];
    choice.options.forEach((path, index) => {
      const position = this.paint.toWorld(laneCenters[index], this.height - 63, .12);
      const selected = index === choice.selectedIndex;
      const charge = selected ? clamp(choice.hold / .68, 0, 1) : 0;
      const base = compose(position);
      for (const side of [-1, 1]) {
        this.paint.voxel(base, [side * .82, .72, 0], [.18, 1.55, .24], selected ? path.color : "#353055", selected ? .8 : .15);
        this.paint.voxel(base, [side * .82, 1.52, 0], [.32, .16, .28], path.color, selected ? 1 : .28);
      }
      this.paint.voxel(base, [0, 1.5, 0], [1.5, .18, .24], path.color, selected ? 1 : .3);
      this.paint.voxel(base, [0, .02, 0], [1.55, .08, .7], selected ? path.color : "#24213e", selected ? .45 : .1);
      for (let beacon = 0; beacon < 5; beacon += 1) {
        const phase = (beacon + Math.floor(this.time * 5)) % 5;
        this.paint.voxel(base, [0, .25 + phase * .24, .03], [.08 + charge * .03, .08 + charge * .03, .08], path.color, .7 + charge * .3);
      }
    });
  }

  drawSectorArchitecture(world, biome) {
    const remaining = clamp((world.sectorFlashTimer || 0) / SCENE_SETTINGS.transition.duration, 0, 1);
    if (!remaining) return;
    const progress = 1 - remaining;
    const count = SCENE_SETTINGS.transition.particleCount;
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const p = [side * (11 + progress * 3.5), -1 + i % 5 * 1.3, -21 + i * .6 + progress * 3];
      this.paint.pixelEffects.spark(null, p, .12 + remaining * .1, biome.accent, Math.sin(progress * Math.PI) * .45, .45);
    }
  }

  syncThreatState(world) {
    const colors = SCENE_SETTINGS.threatColors;
    const tier = clamp(Number(world.threatTier) || 0, 0, 4);
    const color = colors[tier];
    const pulseTimer = clamp(Number(world.threatPulseTimer) || 0, 0, 1.1);
    this.canvas.dataset.threatTier = String(tier);
    this.canvas.dataset.threatColor = color;
    this.canvas.dataset.threatPulse = pulseTimer.toFixed(2);
  }

  syncAnomalyState(world) {
    const anomaly = world.activeAnomaly;
    if (!anomaly) {
      this.canvas.dataset.anomalyId = "off";
      for (const key of ["anomalyKind", "anomalyColor", "anomalySecondary", "anomalyIntensity", "anomalyPolarity"]) delete this.canvas.dataset[key];
      return;
    }
    const color = anomaly.color || "#76e9ff";
    const secondary = anomaly.secondary || "#ff9bd5";
    const intensity = clamp(Number(anomaly.intensity) || .7, .55, 1);
    const polarity = anomaly.polarity > 0 ? 1 : -1;
    // Field rules remain in the simulation. Environment light and the HUD carry
    // their identity; decorative solids would imply collision or rewards.
    this.canvas.dataset.anomalyId = anomaly.id;
    this.canvas.dataset.anomalyKind = anomaly.kind;
    this.canvas.dataset.anomalyColor = color;
    this.canvas.dataset.anomalySecondary = secondary;
    this.canvas.dataset.anomalyIntensity = intensity.toFixed(3);
    this.canvas.dataset.anomalyPolarity = String(polarity);
  }

  drawEncounter(encounter) {
    if (!encounter) return;
    const position = this.paint.toWorld(encounter.x, encounter.y, encounter.kind === "siege" ? .55 : .12);
    const ratio = encounter.kind === "survive" ? 1 - clamp(encounter.timer / encounter.total, 0, 1) : clamp(encounter.progress / encounter.goal, 0, 1);
    const base = compose(position, [0, this.time * .18, 0]);
    if (encounter.kind === "hold") {
      this.paint.voxel(base, [0, .45, 0], [.28, .9, .28], "#18223c");
      this.paint.voxel(base, [0, .98, 0], [.42 + ratio * .12, .18, .42 + ratio * .12], encounter.color, 1);
      for (const side of [-1, 1]) this.paint.voxel(base, [side * .7, .12, 0], [.1, .3 + ratio * .5, .1], encounter.color, .7);
    } else if (encounter.kind === "escort") {
      const palette = ["#15243a", encounter.color, "#ffffff"];
      this.paint.voxel(base, [0, .08, .08], [.48, .28, .7], palette[0]);
      this.paint.fighterNose(base, palette, .7, "#ffffff");
      for (const side of [-1, 1]) this.paint.sweptWing(base, side, palette, .55, .7, false);
      this.paint.voxelThruster(base, 0, .5, encounter.color, .4, .65);
    } else if (encounter.kind === "siege") {
      const health = clamp(encounter.hp / encounter.maxHp, 0, 1);
      this.paint.voxel(base, [0, .15, 0], [.85, .85, .85], "#17162d");
      this.paint.voxel(base, [0, .15, 0], [.38 + health * .18, .38 + health * .18, .38 + health * .18], encounter.color, 1);
      for (let index = 0; index < 6; index += 1) {
        const angle = index / 6 * TAU + this.time * .45;
        this.paint.voxel(base, [Math.sin(angle) * 1.05, .15, Math.cos(angle) * 1.05], [.12, .12, .32], "#ffffff", .65, [0, angle, 0]);
      }
    } else if (encounter.kind === "collect") {
      this.paint.voxel(base, [0, .02, 0], [1.15, .06, 1.15], "#18233e");
      for (let index = 0; index < 8; index += 1) {
        const angle = index / 8 * TAU;
        this.paint.voxel(base, [Math.sin(angle) * .62, .08, Math.cos(angle) * .62], [.11, .12 + ratio * .22, .11], encounter.color, .75);
      }
    } else {
      this.paint.voxel(base, [0, .12, 0], [.52, .3, .7], "#301d3f");
      for (const side of [-1, 1]) this.paint.voxel(base, [side * .48, .12, .08], [.42, .12, .42], encounter.color, .65);
    }
  }

  drawEncounterObject(object) {
    const position = this.paint.toWorld(object.x, object.y, object.type === "meteor" ? .35 : .58 + Math.sin(object.age * 4) * .08);
    const base = compose(position, [object.rotation || object.age, object.age * .7, 0]);
    if (object.type === "salvage") {
      this.paint.voxel(base, [0, 0, 0], [.34, .34, .34], object.color, 1);
      for (const axis of [[.28, 0, 0], [-.28, 0, 0], [0, .28, 0], [0, -.28, 0]]) this.paint.voxel(base, axis, [.18, .18, .18], "#ffffff", .75);
    } else if (object.type === "meteor") {
      const scale = .34 + object.r * .018;
      this.paint.voxel(base, [0, 0, 0], [scale, scale, scale], "#6f4052");
      this.paint.voxel(base, [.28, .08, -.12], [scale * .55, scale * .45, scale * .5], "#9a5a55");
      this.paint.voxel(base, [-.23, -.11, .2], [scale * .48, scale * .42, scale * .52], object.color, .35);
    }
  }
}
