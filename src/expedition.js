(() => {
  "use strict";

  const freezeAll = (items) => Object.freeze(items.map((item) => Object.freeze(item)));

  const BIOMES = freezeAll([
    { id: "sugarBloom", stageIndex: 0, nameKey: "biome.sugarBloom.name", descriptionKey: "biome.sugarBloom.description", landmark: "bloom", sky: "#0b0b28", haze: "#51245f", grid: "#6b3c7b", star: "#ffc3e5", accent: "#ff78aa", secondary: "#ffcf6e", enemyHp: .96, spawnRate: .96, bulletSpeed: .92, bpmOffset: -4, musicShift: 0, typeBias: "scout", preferredMove: "weave" },
    { id: "crystalOrchard", stageIndex: 0, nameKey: "biome.crystalOrchard.name", descriptionKey: "biome.crystalOrchard.description", landmark: "crystals", sky: "#100b2e", haze: "#45266e", grid: "#6850a2", star: "#d9c4ff", accent: "#bd8cff", secondary: "#7fffe2", enemyHp: 1.02, spawnRate: .94, bulletSpeed: .96, bpmOffset: 2, musicShift: 2, typeBias: "spinner", preferredMove: "drift" },
    { id: "cometTide", stageIndex: 0, nameKey: "biome.cometTide.name", descriptionKey: "biome.cometTide.description", landmark: "comets", sky: "#07172d", haze: "#193f68", grid: "#2c6791", star: "#b5efff", accent: "#68d9ff", secondary: "#ff9acb", enemyHp: .94, spawnRate: 1, bulletSpeed: 1, bpmOffset: 5, musicShift: -2, typeBias: "dart", preferredMove: "rush" },
    { id: "auroraFoundry", stageIndex: 1, nameKey: "biome.auroraFoundry.name", descriptionKey: "biome.auroraFoundry.description", landmark: "aurora", sky: "#061d27", haze: "#165265", grid: "#2e7c7b", star: "#b5fff0", accent: "#68f4df", secondary: "#ffe16c", enemyHp: 1, spawnRate: .98, bulletSpeed: .97, bpmOffset: -3, musicShift: 0, typeBias: "spinner", preferredMove: "weave" },
    { id: "thunderWorks", stageIndex: 1, nameKey: "biome.thunderWorks.name", descriptionKey: "biome.thunderWorks.description", landmark: "gears", sky: "#101827", haze: "#3b4a58", grid: "#6e735f", star: "#fff1ad", accent: "#f9d65c", secondary: "#79d9ff", enemyHp: 1.04, spawnRate: 1.02, bulletSpeed: 1, bpmOffset: 6, musicShift: -1, typeBias: "tank", preferredMove: "rush" },
    { id: "cloudReef", stageIndex: 1, nameKey: "biome.cloudReef.name", descriptionKey: "biome.cloudReef.description", landmark: "reef", sky: "#092338", haze: "#25566d", grid: "#39849a", star: "#c8f5ff", accent: "#72d5e8", secondary: "#ffb36a", enemyHp: 1.08, spawnRate: .94, bulletSpeed: .93, bpmOffset: -6, musicShift: 2, typeBias: "mine", preferredMove: "drift" },
    { id: "eclipseCarnival", stageIndex: 2, nameKey: "biome.eclipseCarnival.name", descriptionKey: "biome.eclipseCarnival.description", landmark: "eclipse", sky: "#12071d", haze: "#461345", grid: "#6c255a", star: "#ffb2d2", accent: "#ff5d78", secondary: "#c183ff", enemyHp: 1.04, spawnRate: 1.02, bulletSpeed: 1, bpmOffset: 2, musicShift: 0, typeBias: "dart", preferredMove: "rush" },
    { id: "prismGrave", stageIndex: 2, nameKey: "biome.prismGrave.name", descriptionKey: "biome.prismGrave.description", landmark: "prisms", sky: "#0e0a25", haze: "#351b58", grid: "#5a3a84", star: "#e1cdff", accent: "#b57dff", secondary: "#71f5e2", enemyHp: 1.08, spawnRate: .98, bulletSpeed: 1.02, bpmOffset: 7, musicShift: 3, typeBias: "spinner", preferredMove: "weave" },
    { id: "voidGarden", stageIndex: 2, nameKey: "biome.voidGarden.name", descriptionKey: "biome.voidGarden.description", landmark: "garden", sky: "#07151b", haze: "#183d3b", grid: "#2f655a", star: "#b7ffe0", accent: "#63e6a8", secondary: "#ff6c94", enemyHp: .98, spawnRate: 1.06, bulletSpeed: .96, bpmOffset: -2, musicShift: -3, typeBias: "mine", preferredMove: "drift" },
  ]);

  const MOVEMENT_MODULES = freezeAll([
    { id: "standard", nameKey: "enemyModule.standard", speed: 1, sway: 1, drift: 0 },
    { id: "weave", nameKey: "enemyModule.weave", speed: 1, sway: 1.45, drift: 0 },
    { id: "rush", nameKey: "enemyModule.rush", speed: 1.12, sway: .82, drift: 0 },
    { id: "drift", nameKey: "enemyModule.drift", speed: .92, sway: 1.15, drift: 18 },
  ]);

  const WEAPON_MODULES = freezeAll([
    { id: "pulse", nameKey: "enemyModule.pulse", bulletSpeed: 1, extraShots: 0, ringBonus: 0, cooldown: 1, spread: 1 },
    { id: "twin", nameKey: "enemyModule.twin", bulletSpeed: .92, extraShots: 1, ringBonus: 0, cooldown: 1.16, spread: 1.08 },
    { id: "sniper", nameKey: "enemyModule.sniper", bulletSpeed: 1.15, extraShots: 0, ringBonus: 0, cooldown: 1.28, spread: .48 },
    { id: "orbit", nameKey: "enemyModule.orbit", bulletSpeed: .88, extraShots: 0, ringBonus: 2, cooldown: 1.18, spread: 1 },
  ]);

  const CORE_MODULES = freezeAll([
    { id: "light", nameKey: "enemyModule.light", hp: 1, speed: 1, scale: 1, score: 1, barrier: 0, volatileRadius: 0 },
    { id: "plated", nameKey: "enemyModule.plated", hp: 1.32, speed: .88, scale: 1.1, score: 1.35, barrier: 0, volatileRadius: 0 },
    { id: "barrier", nameKey: "enemyModule.barrier", hp: 1.08, speed: .96, scale: 1.05, score: 1.3, barrier: 4, volatileRadius: 0 },
    { id: "volatile", nameKey: "enemyModule.volatile", hp: .86, speed: 1.08, scale: .95, score: 1.22, barrier: 0, volatileRadius: 44 },
  ]);

  const PATH_PROTOCOLS = freezeAll([
    { id: "arsenal", group: "offense", nameKey: "path.arsenal.name", descriptionKey: "path.arsenal.description", riskKey: "path.arsenal.risk", rewardKey: "path.arsenal.reward", color: "#ffcf6e", enemyHp: 1.02, spawnRate: 1, bulletSpeed: .98, score: 1.1, bpmOffset: 3, musicShift: 0, preferredWeapon: "twin", reward: { weapon: 1 } },
    { id: "resonance", group: "offense", nameKey: "path.resonance.name", descriptionKey: "path.resonance.description", riskKey: "path.resonance.risk", rewardKey: "path.resonance.reward", color: "#68d9ff", enemyHp: 1.03, spawnRate: 1, bulletSpeed: .95, score: 1.12, bpmOffset: -2, musicShift: 2, preferredWeapon: "orbit", reward: { energy: 24, link: 1.12 } },
    { id: "sanctuary", group: "support", nameKey: "path.sanctuary.name", descriptionKey: "path.sanctuary.description", riskKey: "path.sanctuary.risk", rewardKey: "path.sanctuary.reward", color: "#7fffe2", enemyHp: 1.06, spawnRate: .88, bulletSpeed: .9, score: .96, bpmOffset: -6, musicShift: 0, preferredCore: "barrier", reward: { repair: 2, shield: 1 } },
    { id: "salvage", group: "support", nameKey: "path.salvage.name", descriptionKey: "path.salvage.description", riskKey: "path.salvage.risk", rewardKey: "path.salvage.reward", color: "#ffe16c", enemyHp: 1.08, spawnRate: .92, bulletSpeed: .94, score: 1.06, bpmOffset: -4, musicShift: -2, preferredCore: "plated", reward: { repair: 1, energy: 18 } },
    { id: "overdrive", group: "hazard", nameKey: "path.overdrive.name", descriptionKey: "path.overdrive.description", riskKey: "path.overdrive.risk", rewardKey: "path.overdrive.reward", color: "#ff6c94", enemyHp: .96, spawnRate: 1.12, bulletSpeed: 1.02, score: 1.18, bpmOffset: 8, musicShift: 1, preferredMove: "rush", reward: { energy: 32 } },
    { id: "prism", group: "hazard", nameKey: "path.prism.name", descriptionKey: "path.prism.description", riskKey: "path.prism.risk", rewardKey: "path.prism.reward", color: "#bd8cff", enemyHp: 1, spawnRate: .98, bulletSpeed: 1.06, score: 1.16, bpmOffset: 5, musicShift: 3, preferredWeapon: "sniper", reward: { damage: 1.08 } },
    { id: "anomaly", group: "hazard", nameKey: "path.anomaly.name", descriptionKey: "path.anomaly.description", riskKey: "path.anomaly.risk", rewardKey: "path.anomaly.reward", color: "#63e6a8", enemyHp: .92, spawnRate: 1.08, bulletSpeed: .97, score: 1.2, bpmOffset: 2, musicShift: -3, preferredCore: "volatile", reward: { energy: 22, shield: 1 } },
  ].map((protocol) => ({ ...protocol, reward: Object.freeze(protocol.reward) })));

  const byId = (items, id) => items.find((item) => item.id === id) || items[0];
  const pick = (items, random) => items[Math.floor(random() * items.length)];
  const biasedPick = (items, preferredId, random) => {
    const preferred = items.find((item) => item.id === preferredId);
    if (preferred && random() < .46) return preferred;
    return pick(items, random);
  };

  function generateRoute(seed) {
    const random = window.SpaceRoguelike.createRng((Number(seed) ^ 0xa511e9b3) >>> 0);
    return Object.freeze([0, 1, 2].map((stageIndex) => pick(BIOMES.filter((biome) => biome.stageIndex === stageIndex), random)));
  }

  function generateBranchSets(seed) {
    const random = window.SpaceRoguelike.createRng((Number(seed) ^ 0x71d3a9c5) >>> 0);
    const groups = ["support", "offense", "hazard"];
    return Object.freeze([0, 1, 2].map(() => {
      const options = groups.map((group) => pick(PATH_PROTOCOLS.filter((protocol) => protocol.group === group), random));
      for (let index = options.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [options[index], options[swapIndex]] = [options[swapIndex], options[index]];
      }
      return Object.freeze(options);
    }));
  }

  function evaluateGateChoice(positions, width = 480, tolerance = 42) {
    const valid = positions.filter(Number.isFinite);
    const centers = [width * .19, width * .5, width * .81];
    const laneForX = (x) => (x < width / 3 ? 0 : x > width * 2 / 3 ? 2 : 1);
    const averageX = valid.length ? valid.reduce((sum, x) => sum + x, 0) / valid.length : centers[1];
    const selectedIndex = laneForX(averageX);
    const lanes = valid.map(laneForX);
    const converged = lanes.length > 0
      && lanes.every((lane) => lane === lanes[0])
      && valid.every((x) => Math.abs(x - centers[lanes[0]]) < tolerance);
    return Object.freeze({ selectedIndex: converged ? lanes[0] : selectedIndex, converged });
  }

  function weightedHull(items, bias, random) {
    const weighted = items.map(([id, weight]) => [id, weight * (id === bias ? 1.65 : 1)]);
    let roll = random() * weighted.reduce((sum, entry) => sum + entry[1], 0);
    for (const [id, weight] of weighted) {
      roll -= weight;
      if (roll <= 0) return id;
    }
    return weighted[weighted.length - 1][0];
  }

  function chooseEnemyHull({ stageIndex, progress, biome, random }) {
    if (stageIndex === 0 && progress < .36) return "scout";
    const tables = stageIndex === 0
      ? [["scout", 48], ["dart", 32], ["spinner", progress > .56 ? 10 : 3], ["tank", progress > .7 ? 10 : 0]]
      : stageIndex === 1
        ? [["scout", 20], ["dart", 26], ["spinner", 29], ["tank", 17], ["mine", 8]]
        : [["scout", 8], ["dart", 29], ["spinner", 25], ["tank", 18], ["mine", 20]];
    return weightedHull(tables.filter((entry) => entry[1] > 0), biome?.typeBias, random);
  }

  function assembleEnemy({ stageIndex, progress, biome, branch, elite = false, random }) {
    const earlySafety = stageIndex === 0 && progress < .4 && !elite;
    if (earlySafety) return build("standard", "pulse", "light", stageIndex);

    const budget = Math.min(3, stageIndex + (progress >= .42 ? 1 : 0) + (progress >= .76 ? 1 : 0) + (elite ? 1 : 0));
    const movementPool = budget >= 1 ? MOVEMENT_MODULES : MOVEMENT_MODULES.slice(0, 1);
    const movement = biasedPick(movementPool, branch?.preferredMove || biome?.preferredMove, random);
    let weapon = WEAPON_MODULES[0];
    if (budget >= 2) {
      const weaponPool = stageIndex === 0 ? WEAPON_MODULES.slice(0, 2) : WEAPON_MODULES;
      weapon = biasedPick(weaponPool, branch?.preferredWeapon, random);
    }
    let core = CORE_MODULES[0];
    if (elite) core = pick(CORE_MODULES.slice(1, 3), random);
    else if (budget >= 3) core = biasedPick(CORE_MODULES, branch?.preferredCore, random);
    return build(movement.id, weapon.id, core.id, stageIndex);
  }

  function build(movementId, weaponId, coreId, stageIndex = 0) {
    const movement = byId(MOVEMENT_MODULES, movementId);
    const weapon = byId(WEAPON_MODULES, weaponId);
    const core = byId(CORE_MODULES, coreId);
    return Object.freeze({
      movementId: movement.id,
      movementNameKey: movement.nameKey,
      weaponId: weapon.id,
      weaponNameKey: weapon.nameKey,
      coreId: core.id,
      coreNameKey: core.nameKey,
      speed: movement.speed * core.speed,
      sway: movement.sway,
      drift: movement.drift,
      bulletSpeed: weapon.bulletSpeed,
      extraShots: weapon.extraShots,
      ringBonus: weapon.ringBonus,
      cooldown: weapon.cooldown,
      spread: weapon.spread,
      hp: core.hp,
      scale: core.scale,
      score: core.score,
      barrier: core.barrier ? core.barrier + stageIndex * 1.5 : 0,
      volatileRadius: core.volatileRadius,
      signature: `${movement.id}.${weapon.id}.${core.id}`,
    });
  }

  window.SpaceExpedition = Object.freeze({
    BIOMES,
    MOVEMENT_MODULES,
    WEAPON_MODULES,
    CORE_MODULES,
    PATH_PROTOCOLS,
    generateRoute,
    generateBranchSets,
    evaluateGateChoice,
    chooseEnemyHull,
    assembleEnemy,
    build,
  });
})();
