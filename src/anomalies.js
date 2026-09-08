(() => {
  "use strict";

  const freezeAll = (items) => Object.freeze(items.map((item) => Object.freeze(item)));
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;

  const ANOMALIES = freezeAll([
    {
      id: "crystalHush",
      tier: 0,
      kind: "crystal",
      nameKey: "anomaly.crystalHush.name",
      descriptionKey: "anomaly.crystalHush.description",
      effectKey: "anomaly.crystalHush.effect",
      color: "#77e8ff",
      secondary: "#d9b8ff",
      hostile: { spawnRate: -.08, enemyBulletSpeed: -.16, enemyMoveSpeed: -.09, enemyFireRate: -.12 },
      friendly: { dropRate: .08, playerSpeed: .02, playerFireRate: 0, energyRate: .12, pickupMagnet: 8, pickupPull: .08 },
      score: -.02,
      force: 0,
      bulletFlow: 0,
      bpm: -7,
      musicShift: 0,
    },
    {
      id: "ionBloom",
      tier: 0,
      kind: "bloom",
      nameKey: "anomaly.ionBloom.name",
      descriptionKey: "anomaly.ionBloom.description",
      effectKey: "anomaly.ionBloom.effect",
      color: "#69f7b7",
      secondary: "#ffe66d",
      hostile: { spawnRate: -.05, enemyBulletSpeed: -.08, enemyMoveSpeed: -.04, enemyFireRate: -.05 },
      friendly: { dropRate: .22, playerSpeed: 0, playerFireRate: .03, energyRate: .38, pickupMagnet: 20, pickupPull: .2 },
      score: 0,
      force: 0,
      bulletFlow: 0,
      bpm: 2,
      musicShift: 2,
    },
    {
      id: "cometDraft",
      tier: 0,
      kind: "draft",
      nameKey: "anomaly.cometDraft.name",
      descriptionKey: "anomaly.cometDraft.description",
      effectKey: "anomaly.cometDraft.effect",
      color: "#69c8ff",
      secondary: "#ff9bd5",
      hostile: { spawnRate: -.04, enemyBulletSpeed: -.06, enemyMoveSpeed: -.03, enemyFireRate: -.04 },
      friendly: { dropRate: .06, playerSpeed: .06, playerFireRate: .03, energyRate: .08, pickupMagnet: 10, pickupPull: .1 },
      score: .02,
      force: 5,
      bulletFlow: 2.4,
      bpm: 5,
      musicShift: -2,
    },
    {
      id: "auroraCurrent",
      tier: 1,
      kind: "aurora",
      nameKey: "anomaly.auroraCurrent.name",
      descriptionKey: "anomaly.auroraCurrent.description",
      effectKey: "anomaly.auroraCurrent.effect",
      color: "#61f4dc",
      secondary: "#8f9bff",
      hostile: { spawnRate: .02, enemyBulletSpeed: -.03, enemyMoveSpeed: .04, enemyFireRate: .02 },
      friendly: { dropRate: .12, playerSpeed: .08, playerFireRate: .04, energyRate: .12, pickupMagnet: 14, pickupPull: .12 },
      score: .08,
      force: 12,
      bulletFlow: 5,
      bpm: 4,
      musicShift: 0,
    },
    {
      id: "gravityLens",
      tier: 1,
      kind: "gravity",
      nameKey: "anomaly.gravityLens.name",
      descriptionKey: "anomaly.gravityLens.description",
      effectKey: "anomaly.gravityLens.effect",
      color: "#bd8cff",
      secondary: "#76e9ff",
      hostile: { spawnRate: -.03, enemyBulletSpeed: -.04, enemyMoveSpeed: .02, enemyFireRate: -.03 },
      friendly: { dropRate: .14, playerSpeed: .03, playerFireRate: .02, energyRate: .16, pickupMagnet: 34, pickupPull: .34 },
      score: .1,
      force: 14,
      bulletFlow: 8,
      bpm: -3,
      musicShift: -3,
    },
    {
      id: "prismStorm",
      tier: 1,
      kind: "prism",
      nameKey: "anomaly.prismStorm.name",
      descriptionKey: "anomaly.prismStorm.description",
      effectKey: "anomaly.prismStorm.effect",
      color: "#ff77d4",
      secondary: "#77efff",
      hostile: { spawnRate: .05, enemyBulletSpeed: .03, enemyMoveSpeed: .03, enemyFireRate: .05 },
      friendly: { dropRate: .24, playerSpeed: .05, playerFireRate: .08, energyRate: .1, pickupMagnet: 18, pickupPull: .18 },
      score: .14,
      force: 8,
      bulletFlow: 10,
      bpm: 8,
      musicShift: 3,
    },
    {
      id: "magnetarTide",
      tier: 2,
      kind: "magnetar",
      nameKey: "anomaly.magnetarTide.name",
      descriptionKey: "anomaly.magnetarTide.description",
      effectKey: "anomaly.magnetarTide.effect",
      color: "#ffca61",
      secondary: "#69ddff",
      hostile: { spawnRate: .06, enemyBulletSpeed: .04, enemyMoveSpeed: .05, enemyFireRate: .06 },
      friendly: { dropRate: .2, playerSpeed: .08, playerFireRate: .07, energyRate: .14, pickupMagnet: 42, pickupPull: .46 },
      score: .18,
      force: 16,
      bulletFlow: 12,
      bpm: 9,
      musicShift: 1,
    },
    {
      id: "chronoRift",
      tier: 2,
      kind: "chrono",
      nameKey: "anomaly.chronoRift.name",
      descriptionKey: "anomaly.chronoRift.description",
      effectKey: "anomaly.chronoRift.effect",
      color: "#9c86ff",
      secondary: "#71f5de",
      hostile: { spawnRate: .08, enemyBulletSpeed: .06, enemyMoveSpeed: .08, enemyFireRate: .09 },
      friendly: { dropRate: .16, playerSpeed: .1, playerFireRate: .16, energyRate: .18, pickupMagnet: 24, pickupPull: .24 },
      score: .2,
      force: 14,
      bulletFlow: 13,
      bpm: 13,
      musicShift: 4,
    },
    {
      id: "voidSurge",
      tier: 2,
      kind: "surge",
      nameKey: "anomaly.voidSurge.name",
      descriptionKey: "anomaly.voidSurge.description",
      effectKey: "anomaly.voidSurge.effect",
      color: "#ff657e",
      secondary: "#c58cff",
      hostile: { spawnRate: .12, enemyBulletSpeed: .08, enemyMoveSpeed: .1, enemyFireRate: .12 },
      friendly: { dropRate: .28, playerSpeed: .12, playerFireRate: .12, energyRate: .2, pickupMagnet: 30, pickupPull: .32 },
      score: .28,
      force: 18,
      bulletFlow: 15,
      bpm: 16,
      musicShift: -4,
    },
  ].map((anomaly) => ({
    ...anomaly,
    hostile: Object.freeze(anomaly.hostile),
    friendly: Object.freeze(anomaly.friendly),
  })));

  const byId = (id) => ANOMALIES.find((anomaly) => anomaly.id === id) || ANOMALIES[0];

  function multipliers(entry) {
    const definition = byId(entry?.id);
    const intensity = clamp(Number(entry?.intensity) || .8, .55, 1);
    return Object.freeze({
      spawnRate: 1 + definition.hostile.spawnRate * intensity,
      enemyBulletSpeed: 1 + definition.hostile.enemyBulletSpeed * intensity,
      enemyMoveSpeed: 1 + definition.hostile.enemyMoveSpeed * intensity,
      enemyFireRate: 1 + definition.hostile.enemyFireRate * intensity,
      dropRate: 1 + definition.friendly.dropRate * intensity,
      playerSpeed: 1 + definition.friendly.playerSpeed * intensity,
      playerFireRate: 1 + definition.friendly.playerFireRate * intensity,
      energyRate: definition.friendly.energyRate * intensity,
      pickupMagnet: definition.friendly.pickupMagnet * intensity,
      pickupPull: 1 + definition.friendly.pickupPull * intensity,
      score: 1 + definition.score * intensity,
      force: definition.force * intensity,
      bulletFlow: definition.bulletFlow * intensity,
      bpm: Math.round(definition.bpm * intensity),
      musicShift: Math.round(definition.musicShift * intensity),
    });
  }

  function makeEntry(definition, random, stageIndex, sectorIndex, overrides = {}) {
    const safeTier = stageIndex === 0;
    const baseIntensity = safeTier ? lerp(.62, .82, random()) : stageIndex === 1 ? lerp(.7, .92, random()) : lerp(.78, 1, random());
    const intensity = clamp(Number(overrides.intensity) || baseIntensity, .55, 1);
    const polarity = overrides.polarity === -1 || overrides.polarity === 1
      ? overrides.polarity
      : random() < .5 ? -1 : 1;
    const phase = Number.isFinite(overrides.phase) ? overrides.phase : random() * Math.PI * 2;
    const globalSector = stageIndex * 3 + sectorIndex + 1;
    const entry = {
      id: definition.id,
      tier: definition.tier,
      kind: definition.kind,
      nameKey: definition.nameKey,
      descriptionKey: definition.descriptionKey,
      effectKey: definition.effectKey,
      color: definition.color,
      secondary: definition.secondary,
      stageIndex,
      sectorIndex,
      globalSector,
      intensity,
      polarity,
      phase,
      signature: `${definition.id}:${polarity > 0 ? "+" : "-"}:${Math.round(intensity * 100)}`,
    };
    entry.multipliers = multipliers(entry);
    return Object.freeze(entry);
  }

  function shuffle(items, random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function generatePlan(seed) {
    const random = window.SpaceRoguelike.createRng((Number(seed) ^ 0x6a09e667) >>> 0);
    return Object.freeze([0, 1, 2].map((stageIndex) => Object.freeze(
      shuffle(ANOMALIES.filter((anomaly) => anomaly.tier === stageIndex), random)
        .map((anomaly, sectorIndex) => makeEntry(anomaly, random, stageIndex, sectorIndex)),
    )));
  }

  function forceFirst(plan, anomalyId, seed = 1) {
    if (!ANOMALIES.some((anomaly) => anomaly.id === anomalyId)) return plan;
    const random = window.SpaceRoguelike.createRng((Number(seed) ^ 0xbb67ae85) >>> 0);
    const copy = plan.map((stage) => [...stage]);
    copy[0][0] = makeEntry(byId(anomalyId), random, 0, 0, { intensity: .9 });
    return Object.freeze(copy.map((stage) => Object.freeze(stage)));
  }

  function entryFor(plan, stageIndex, sectorIndex) {
    return plan?.[stageIndex]?.[sectorIndex] || plan?.[0]?.[0] || makeEntry(ANOMALIES[0], () => .5, 0, 0);
  }

  function playerForce(entry, time, x, y, width = 480, height = 270) {
    if (!entry) return Object.freeze({ x: 0, y: 0 });
    const strength = multipliers(entry).force;
    const phase = entry.phase + time;
    const polarity = entry.polarity || 1;
    const nx = clamp((x - width * .5) / Math.max(1, width * .5), -1, 1);
    const ny = clamp((y - height * .58) / Math.max(1, height * .5), -1, 1);
    let forceX = 0;
    let forceY = 0;
    if (entry.id === "cometDraft") forceX = polarity * strength;
    else if (entry.id === "auroraCurrent") {
      forceX = Math.sin(phase * .82 + y / height * Math.PI * 2) * strength * polarity;
      forceY = Math.cos(phase * .47 + x / width * Math.PI) * strength * .22;
    } else if (entry.id === "gravityLens") {
      forceX = -nx * strength;
      forceY = -ny * strength * .48;
    } else if (entry.id === "prismStorm") {
      forceX = Math.sin(phase * 1.25 + ny * 2.2) * strength;
      forceY = Math.cos(phase * .94 + nx * 2.4) * strength * .36;
    } else if (entry.id === "magnetarTide") {
      forceX = Math.sin(phase * .66) * strength * polarity;
      forceY = Math.sin(phase * 1.18 + nx * 2.8) * strength * .28;
    } else if (entry.id === "chronoRift") {
      const pulse = .45 + .55 * Math.sin(phase * 1.7) ** 2;
      forceX = Math.cos(phase + ny * 2) * strength * pulse * polarity;
      forceY = Math.sin(phase * 1.23 + nx * 2) * strength * .36 * pulse;
    } else if (entry.id === "voidSurge") {
      const pulse = .28 + .72 * Math.sin(phase * .74) ** 2;
      const range = Math.max(.25, Math.hypot(nx, ny));
      forceX = nx / range * strength * pulse;
      forceY = ny / range * strength * .5 * pulse;
    }
    return Object.freeze({ x: forceX, y: forceY });
  }

  function bulletFlow(entry, time, bullet, width = 480, height = 270, enemy = true) {
    if (!entry || !bullet) return Object.freeze({ x: 0, y: 0 });
    const strength = multipliers(entry).bulletFlow * (enemy ? 1 : .34);
    const phase = entry.phase + time;
    const polarity = entry.polarity || 1;
    const nx = clamp((bullet.x - width * .5) / Math.max(1, width * .5), -1, 1);
    const ny = clamp((bullet.y - height * .52) / Math.max(1, height * .5), -1, 1);
    let flowX = 0;
    let flowY = 0;
    if (entry.id === "cometDraft") flowX = polarity * strength;
    else if (entry.id === "auroraCurrent") flowX = Math.sin(phase * .9 + bullet.y * .025) * strength * polarity;
    else if (entry.id === "gravityLens") {
      flowX = -nx * strength;
      flowY = -ny * strength * .42;
    } else if (entry.id === "prismStorm") {
      flowX = Math.sin(phase * 1.55 + bullet.y * .055) * strength;
      flowY = Math.cos(phase + bullet.x * .035) * strength * .18;
    } else if (entry.id === "magnetarTide") {
      flowX = Math.sin(phase * .72 + bullet.y * .02) * strength * polarity;
      flowY = Math.cos(phase * 1.1 + bullet.x * .018) * strength * .24;
    } else if (entry.id === "chronoRift") {
      const pulse = .25 + .75 * Math.sin(phase * 1.9 + bullet.y * .03) ** 2;
      flowX = Math.cos(phase + ny * 2) * strength * pulse * polarity;
      flowY = Math.sin(phase * 1.4 + nx * 2) * strength * .35 * pulse;
    } else if (entry.id === "voidSurge") {
      const pulse = .25 + .75 * Math.sin(phase * .82) ** 2;
      const range = Math.max(.25, Math.hypot(nx, ny));
      flowX = nx / range * strength * pulse;
      flowY = ny / range * strength * .5 * pulse;
    }
    return Object.freeze({ x: flowX, y: flowY });
  }

  window.SpaceAnomalies = Object.freeze({
    ANOMALIES,
    generatePlan,
    forceFirst,
    entryFor,
    multipliers,
    playerForce,
    bulletFlow,
  });
})();
