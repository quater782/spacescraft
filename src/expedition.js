(() => {
  "use strict";

  const freezeAll = (items) => Object.freeze(items.map((item) => Object.freeze(item)));

  const BIOMES = freezeAll([
    { id: "sugarBloom", stageIndex: 0, nameKey: "biome.sugarBloom.name", descriptionKey: "biome.sugarBloom.description", landmark: "bloom", sky: "#0b0b28", haze: "#51245f", grid: "#6b3c7b", star: "#ffc3e5", accent: "#ff78aa", secondary: "#ffcf6e", enemyHp: .96, spawnRate: .96, bulletSpeed: .96, bpmOffset: -4, musicShift: 0, typeBias: "scout", preferredMove: "weave", speciesId: "nectarMoth", preferredWeapon: "seeker", preferredAi: "pack" },
    { id: "crystalOrchard", stageIndex: 0, nameKey: "biome.crystalOrchard.name", descriptionKey: "biome.crystalOrchard.description", landmark: "crystals", sky: "#100b2e", haze: "#45266e", grid: "#6850a2", star: "#d9c4ff", accent: "#bd8cff", secondary: "#7fffe2", enemyHp: 1.02, spawnRate: .94, bulletSpeed: 1, bpmOffset: 2, musicShift: 2, typeBias: "spinner", preferredMove: "drift", speciesId: "prismRay", preferredWeapon: "laser", preferredAi: "oracle" },
    { id: "cometTide", stageIndex: 0, nameKey: "biome.cometTide.name", descriptionKey: "biome.cometTide.description", landmark: "comets", sky: "#07172d", haze: "#193f68", grid: "#2c6791", star: "#b5efff", accent: "#68d9ff", secondary: "#ff9acb", enemyHp: .98, spawnRate: 1, bulletSpeed: 1.04, bpmOffset: 5, musicShift: -2, typeBias: "dart", preferredMove: "rush", speciesId: "cometRammer", preferredWeapon: "pulse", preferredAi: "ambusher" },
    { id: "auroraFoundry", stageIndex: 1, nameKey: "biome.auroraFoundry.name", descriptionKey: "biome.auroraFoundry.description", landmark: "aurora", sky: "#061d27", haze: "#165265", grid: "#2e7c7b", star: "#b5fff0", accent: "#68f4df", secondary: "#ffe16c", enemyHp: 1.04, spawnRate: .98, bulletSpeed: 1.04, bpmOffset: -3, musicShift: 0, typeBias: "spinner", preferredMove: "weave", speciesId: "auroraLeech", preferredWeapon: "laser", preferredAi: "hunter" },
    { id: "thunderWorks", stageIndex: 1, nameKey: "biome.thunderWorks.name", descriptionKey: "biome.thunderWorks.description", landmark: "gears", sky: "#101827", haze: "#3b4a58", grid: "#6e735f", star: "#fff1ad", accent: "#f9d65c", secondary: "#79d9ff", enemyHp: 1.08, spawnRate: 1.02, bulletSpeed: 1.08, bpmOffset: 6, musicShift: -1, typeBias: "tank", preferredMove: "rush", speciesId: "railBeetle", preferredWeapon: "bomb", preferredAi: "pack" },
    { id: "cloudReef", stageIndex: 1, nameKey: "biome.cloudReef.name", descriptionKey: "biome.cloudReef.description", landmark: "reef", sky: "#092338", haze: "#25566d", grid: "#39849a", star: "#c8f5ff", accent: "#72d5e8", secondary: "#ffb36a", enemyHp: 1.1, spawnRate: .94, bulletSpeed: 1, bpmOffset: -6, musicShift: 2, typeBias: "mine", preferredMove: "drift", speciesId: "reefMedusa", preferredWeapon: "bomb", preferredAi: "flanker" },
    { id: "eclipseCarnival", stageIndex: 2, nameKey: "biome.eclipseCarnival.name", descriptionKey: "biome.eclipseCarnival.description", landmark: "eclipse", sky: "#12071d", haze: "#461345", grid: "#6c255a", star: "#ffb2d2", accent: "#ff5d78", secondary: "#c183ff", enemyHp: 1.1, spawnRate: 1.02, bulletSpeed: 1.1, bpmOffset: 2, musicShift: 0, typeBias: "dart", preferredMove: "rush", speciesId: "eclipseReaper", preferredWeapon: "seeker", preferredAi: "ambusher" },
    { id: "prismGrave", stageIndex: 2, nameKey: "biome.prismGrave.name", descriptionKey: "biome.prismGrave.description", landmark: "prisms", sky: "#0e0a25", haze: "#351b58", grid: "#5a3a84", star: "#e1cdff", accent: "#b57dff", secondary: "#71f5e2", enemyHp: 1.14, spawnRate: .98, bulletSpeed: 1.12, bpmOffset: 7, musicShift: 3, typeBias: "spinner", preferredMove: "weave", speciesId: "graveMirror", preferredWeapon: "laser", preferredAi: "oracle" },
    { id: "voidGarden", stageIndex: 2, nameKey: "biome.voidGarden.name", descriptionKey: "biome.voidGarden.description", landmark: "garden", sky: "#07151b", haze: "#183d3b", grid: "#2f655a", star: "#b7ffe0", accent: "#63e6a8", secondary: "#ff6c94", enemyHp: 1.08, spawnRate: 1.06, bulletSpeed: 1.04, bpmOffset: -2, musicShift: -3, typeBias: "mine", preferredMove: "drift", speciesId: "gardenSpore", preferredWeapon: "bomb", preferredAi: "pack" },
  ]);

  const HULL_MODULES = freezeAll([
    { id: "scout", nameKey: "enemyHull.scout", role: "interceptor", hp: 8, radius: 7.4, score: 150, minStage: 0 },
    { id: "dart", nameKey: "enemyHull.dart", role: "striker", hp: 7, radius: 6.4, score: 180, minStage: 0 },
    { id: "tank", nameKey: "enemyHull.tank", role: "bulwark", hp: 30, radius: 11, score: 440, minStage: 0 },
    { id: "spinner", nameKey: "enemyHull.spinner", role: "artillery", hp: 16, radius: 8.3, score: 300, minStage: 0 },
    { id: "mine", nameKey: "enemyHull.mine", role: "denial", hp: 14, radius: 7.4, score: 230, minStage: 1 },
    { id: "lancer", nameKey: "enemyHull.lancer", role: "flanker", hp: 15, radius: 7.8, score: 285, minStage: 1 },
    { id: "carrier", nameKey: "enemyHull.carrier", role: "command", hp: 32, radius: 10.1, score: 420, minStage: 2 },
    { id: "nectarMoth", nameKey: "enemyHull.nectarMoth", role: "interceptor", hp: 10, radius: 8.3, score: 210, minStage: 0, nativeBiome: "sugarBloom", preferredWeapon: "seeker", preferredAi: "pack", speciesPattern: "hunterSeeker", deathrattle: "seekerBurst", collisionDamage: 2 },
    { id: "prismRay", nameKey: "enemyHull.prismRay", role: "artillery", hp: 18, radius: 10.1, score: 330, minStage: 0, nativeBiome: "crystalOrchard", preferredWeapon: "laser", preferredAi: "oracle", speciesPattern: "laserSweep", deathrattle: "shardFan", collisionDamage: 3 },
    { id: "cometRammer", nameKey: "enemyHull.cometRammer", role: "striker", hp: 17, radius: 9.2, score: 300, minStage: 0, nativeBiome: "cometTide", preferredWeapon: "pulse", preferredAi: "ambusher", speciesPattern: "ramCharge", deathrattle: "blast", collisionDamage: 4 },
    { id: "auroraLeech", nameKey: "enemyHull.auroraLeech", role: "flanker", hp: 21, radius: 9.2, score: 350, minStage: 1, nativeBiome: "auroraFoundry", preferredWeapon: "laser", preferredAi: "hunter", speciesPattern: "laserLance", deathrattle: "arcCross", collisionDamage: 3 },
    { id: "railBeetle", nameKey: "enemyHull.railBeetle", role: "bulwark", hp: 36, radius: 12, score: 520, minStage: 1, nativeBiome: "thunderWorks", preferredWeapon: "bomb", preferredAi: "pack", speciesPattern: "blastSeed", deathrattle: "blast", collisionDamage: 4 },
    { id: "reefMedusa", nameKey: "enemyHull.reefMedusa", role: "denial", hp: 24, radius: 10.1, score: 390, minStage: 1, nativeBiome: "cloudReef", preferredWeapon: "bomb", preferredAi: "flanker", speciesPattern: "proximityBloom", deathrattle: "mineRing", collisionDamage: 3 },
    { id: "eclipseReaper", nameKey: "enemyHull.eclipseReaper", role: "flanker", hp: 24, radius: 9.7, score: 410, minStage: 2, nativeBiome: "eclipseCarnival", preferredWeapon: "seeker", preferredAi: "ambusher", speciesPattern: "hunterSeeker", deathrattle: "crossBurst", collisionDamage: 4 },
    { id: "graveMirror", nameKey: "enemyHull.graveMirror", role: "artillery", hp: 28, radius: 10.6, score: 460, minStage: 2, nativeBiome: "prismGrave", preferredWeapon: "laser", preferredAi: "oracle", speciesPattern: "laserSweep", deathrattle: "shardFan", collisionDamage: 3 },
    { id: "gardenSpore", nameKey: "enemyHull.gardenSpore", role: "command", hp: 34, radius: 11, score: 490, minStage: 2, nativeBiome: "voidGarden", preferredWeapon: "bomb", preferredAi: "pack", speciesPattern: "proximityBloom", deathrattle: "seedBurst", collisionDamage: 3 },
  ]);

  const MOVEMENT_MODULES = freezeAll([
    { id: "standard", nameKey: "enemyModule.standard", speed: 1, sway: 1, drift: 0 },
    { id: "weave", nameKey: "enemyModule.weave", speed: 1.04, sway: 1.55, drift: 0 },
    { id: "rush", nameKey: "enemyModule.rush", speed: 1.18, sway: .88, drift: 0 },
    { id: "drift", nameKey: "enemyModule.drift", speed: .96, sway: 1.2, drift: 24 },
  ]);

  const WEAPON_MODULES = freezeAll([
    { id: "pulse", nameKey: "enemyModule.pulse", bulletSpeed: 1, extraShots: 0, ringBonus: 0, cooldown: 1, spread: 1 },
    { id: "twin", nameKey: "enemyModule.twin", bulletSpeed: .96, extraShots: 1, ringBonus: 0, cooldown: 1.08, spread: 1.06 },
    { id: "sniper", nameKey: "enemyModule.sniper", bulletSpeed: 1.28, extraShots: 0, ringBonus: 0, cooldown: 1.2, spread: .42 },
    { id: "orbit", nameKey: "enemyModule.orbit", bulletSpeed: .92, extraShots: 0, ringBonus: 2, cooldown: 1.1, spread: 1 },
    { id: "laser", nameKey: "enemyModule.laser", bulletSpeed: 1, extraShots: 0, ringBonus: 0, cooldown: 1.24, spread: .3, pattern: "laserLance" },
    { id: "seeker", nameKey: "enemyModule.seeker", bulletSpeed: 1.1, extraShots: 0, ringBonus: 0, cooldown: .94, spread: .72, pattern: "hunterSeeker" },
    { id: "bomb", nameKey: "enemyModule.bomb", bulletSpeed: .9, extraShots: 0, ringBonus: 0, cooldown: 1.18, spread: .8, pattern: "blastSeed" },
  ]);

  const CORE_MODULES = freezeAll([
    { id: "light", nameKey: "enemyModule.light", hp: 1, speed: 1, scale: 1, score: 1, barrier: 0, volatileRadius: 0 },
    { id: "plated", nameKey: "enemyModule.plated", hp: 1.32, speed: .88, scale: 1.1, score: 1.35, barrier: 0, volatileRadius: 0 },
    { id: "barrier", nameKey: "enemyModule.barrier", hp: 1.08, speed: .96, scale: 1.05, score: 1.3, barrier: 4, volatileRadius: 0 },
    { id: "volatile", nameKey: "enemyModule.volatile", hp: .86, speed: 1.08, scale: .95, score: 1.22, barrier: 0, volatileRadius: 44 },
  ]);

  const AI_MODULES = freezeAll([
    { id: "sentry", nameKey: "enemyModule.sentry", targeting: "nearest", steer: 0, flank: 0, lead: 0, evasion: 0, cooldown: 1 },
    { id: "hunter", nameKey: "enemyModule.hunter", targeting: "weakest", steer: .56, flank: 0, lead: .16, evasion: .16, cooldown: .96 },
    { id: "flanker", nameKey: "enemyModule.flanker", targeting: "isolated", steer: .48, flank: 62, lead: .22, evasion: .24, cooldown: .94 },
    { id: "oracle", nameKey: "enemyModule.oracle", targeting: "leading", steer: .34, flank: 0, lead: .48, evasion: .34, cooldown: .9 },
    { id: "pack", nameKey: "enemyModule.pack", targeting: "weakest", steer: .72, flank: 36, lead: .24, evasion: .28, cooldown: .88 },
    { id: "ambusher", nameKey: "enemyModule.ambusher", targeting: "isolated", steer: .68, flank: 94, lead: .32, evasion: .44, cooldown: .86 },
  ]);

  const PAYLOAD_MODULES = freezeAll([
    { id: "clean", nameKey: "enemyModule.clean", debuff: "", duration: 0, intensity: 0, color: "#ff8aa3", score: 1 },
    { id: "cryo", nameKey: "enemyModule.cryo", debuff: "chill", duration: 1.25, intensity: .18, color: "#70eaff", score: 1.12 },
    { id: "glitch", nameKey: "enemyModule.glitch", debuff: "jam", duration: 1, intensity: .16, color: "#ff83d7", score: 1.14 },
    { id: "fracture", nameKey: "enemyModule.fracture", debuff: "fracture", duration: 1.4, intensity: .12, color: "#ffb45f", score: 1.16 },
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

  const ENCOUNTER_PROTOCOLS = freezeAll([
    { id: "relay", kind: "hold", nameKey: "encounter.relay.name", descriptionKey: "encounter.relay.description", objectiveKey: "encounter.relay.objective", rewardKey: "encounter.relay.reward", color: "#68f4df", duration: 8.5, goal: 4.6, minStage: 0, spawnRate: .86, bpmOffset: 4, musicShift: 0, reward: { energy: 22, score: 650 } },
    { id: "salvage", kind: "collect", nameKey: "encounter.salvage.name", descriptionKey: "encounter.salvage.description", objectiveKey: "encounter.salvage.objective", rewardKey: "encounter.salvage.reward", color: "#ffe16c", duration: 10, goal: 5, itemCount: 7, minStage: 0, spawnRate: .78, bpmOffset: -3, musicShift: 2, reward: { weapon: 1, score: 720 } },
    { id: "courier", kind: "escort", nameKey: "encounter.courier.name", descriptionKey: "encounter.courier.description", objectiveKey: "encounter.courier.objective", rewardKey: "encounter.courier.reward", color: "#76dbff", duration: 9.5, goal: 5.2, minStage: 0, spawnRate: .9, bpmOffset: 2, musicShift: -2, reward: { repair: 1, shield: 1, score: 780 } },
    { id: "meteor", kind: "survive", nameKey: "encounter.meteor.name", descriptionKey: "encounter.meteor.description", objectiveKey: "encounter.meteor.objective", rewardKey: "encounter.meteor.reward", color: "#ff936b", duration: 8.5, goal: 1, minStage: 1, spawnRate: .55, bpmOffset: 9, musicShift: 1, reward: { shield: 1, energy: 18, score: 900 } },
    { id: "rift", kind: "siege", nameKey: "encounter.rift.name", descriptionKey: "encounter.rift.description", objectiveKey: "encounter.rift.objective", rewardKey: "encounter.rift.reward", color: "#bd8cff", duration: 9.5, goal: 34, minStage: 1, spawnRate: 1.06, bpmOffset: 7, musicShift: 3, reward: { energy: 28, score: 1050 } },
  ].map((protocol) => ({ ...protocol, reward: Object.freeze(protocol.reward) })));

  const byId = (items, id) => items.find((item) => item.id === id) || items[0];
  const pick = (items, random) => items[Math.floor(random() * items.length)];
  const biasedPick = (items, preferredId, random) => {
    const preferred = items.find((item) => item.id === preferredId);
    if (preferred && random() < .46) return preferred;
    return pick(items, random);
  };
  const biasedPickMany = (items, preferences, random) => {
    const weighted = items.map((item) => [item, 1 + preferences.reduce((sum, preference) => sum + (preference.id === item.id ? preference.weight : 0), 0)]);
    let roll = random() * weighted.reduce((sum, entry) => sum + entry[1], 0);
    for (const [item, weight] of weighted) {
      roll -= weight;
      if (roll <= 0) return item;
    }
    return weighted[weighted.length - 1][0];
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

  function generateEncounterPlans(seed) {
    const random = window.SpaceRoguelike.createRng((Number(seed) ^ 0xc41f2d87) >>> 0);
    const triggerPoints = window.SpaceDirector.ENCOUNTER_POINTS;
    return Object.freeze([0, 1, 2].map((stageIndex) => {
      const pool = ENCOUNTER_PROTOCOLS.filter((encounter) => encounter.minStage <= stageIndex);
      const chosen = [];
      while (chosen.length < triggerPoints.length) {
        const unused = pool.filter((encounter) => !chosen.some((entry) => entry.id === encounter.id));
        const previousId = chosen.at(-1)?.id;
        const candidates = (unused.length ? unused : pool).filter((encounter) => encounter.id !== previousId);
        chosen.push(pick(candidates.length ? candidates : pool, random));
      }
      let previousLane = -1;
      return Object.freeze(chosen.map((encounter, slot) => {
        let lane = Math.floor(random() * 3);
        if (lane === previousLane) lane = (lane + 1 + Math.floor(random() * 2)) % 3;
        previousLane = lane;
        const variant = Math.floor(random() * 4);
        return Object.freeze({
          ...encounter,
          stageIndex,
          slot,
          at: triggerPoints[slot],
          lane,
          variant,
          intensity: 1 + stageIndex * .14 + slot * .04,
          signature: `${encounter.id}:${lane}:${variant}`,
        });
      }));
    }));
  }

  function evaluateEncounter(encounter, state = {}) {
    const timeRemaining = Number.isFinite(state.timeRemaining) ? state.timeRemaining : encounter.duration;
    const progress = Number.isFinite(state.progress) ? state.progress : 0;
    const hits = Number.isFinite(state.hits) ? state.hits : 0;
    if (encounter.kind === "survive") {
      if (timeRemaining > 0) return "pending";
      return hits <= encounter.goal ? "success" : "failed";
    }
    if (progress >= encounter.goal) return "success";
    return timeRemaining <= 0 ? "failed" : "pending";
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
    if (stageIndex === 0 && progress < .08) return "scout";
    const table = stageIndex === 0
      ? [["scout", 48], ["dart", 32], ["spinner", progress > .56 ? 10 : 3], ["tank", progress > .7 ? 10 : 0]]
      : stageIndex === 1
        ? [["scout", 16], ["dart", 22], ["spinner", 24], ["tank", 15], ["mine", 8], ["lancer", 15]]
        : [["scout", 6], ["dart", 18], ["spinner", 18], ["tank", 15], ["mine", 14], ["lancer", 18], ["carrier", 11]];
    if (biome?.speciesId && !(stageIndex === 0 && progress < .25)) table.push([biome.speciesId, stageIndex === 0 ? 14 : stageIndex === 1 ? 44 : 50]);
    return weightedHull(table.filter((entry) => entry[1] > 0), biome?.speciesId || biome?.typeBias, random);
  }

  function assembleEnemy({ stageIndex, progress, biome, branch, hullId = "scout", elite = false, random }) {
    const earlySafety = stageIndex === 0 && progress < .08 && !elite;
    if (earlySafety) return build("standard", "pulse", "light", "sentry", "clean", stageIndex, hullId);

    const budget = Math.min(5,
      (stageIndex === 0 && progress >= .08 ? 1 : stageIndex)
      + (progress >= (stageIndex === 0 ? .25 : .18) ? 1 : 0)
      + (progress >= .42 ? 1 : 0)
      + (progress >= .68 ? 1 : 0)
      + (stageIndex >= 2 ? 1 : 0)
      + (elite ? 1 : 0));
    const hull = byId(HULL_MODULES, hullId);
    const movementPool = budget >= 1 ? MOVEMENT_MODULES : MOVEMENT_MODULES.slice(0, 1);
    const movement = biasedPick(movementPool, branch?.preferredMove || biome?.preferredMove, random);
    let weapon = WEAPON_MODULES[0];
    if (budget >= 2) {
      const weaponPool = stageIndex === 0 && progress < .58 ? WEAPON_MODULES.filter((entry) => !["bomb"].includes(entry.id)) : WEAPON_MODULES;
      weapon = biasedPickMany(weaponPool, [
        { id: hull.preferredWeapon, weight: 2.6 },
        { id: biome?.preferredWeapon, weight: 1.8 },
        { id: branch?.preferredWeapon, weight: 2.2 },
      ].filter((preference) => preference.id), random);
    }
    let core = CORE_MODULES[0];
    if (elite) core = pick(CORE_MODULES.slice(1, 3), random);
    else if (budget >= 3) core = biasedPick(CORE_MODULES, branch?.preferredCore, random);
    const aiPool = stageIndex === 0 && progress < .72
      ? AI_MODULES.filter((entry) => entry.id !== "oracle")
      : AI_MODULES;
    const ai = budget >= 4 ? biasedPick(aiPool, hull.preferredAi || biome?.preferredAi, random) : AI_MODULES[0];
    const payload = stageIndex >= 2 && budget >= 5 ? pick(PAYLOAD_MODULES, random) : PAYLOAD_MODULES[0];
    return build(movement.id, weapon.id, core.id, ai.id, payload.id, stageIndex, hullId);
  }

  function build(movementId, weaponId, coreId, aiId = "sentry", payloadId = "clean", stageIndex = 0, hullId = "scout") {
    const hull = byId(HULL_MODULES, hullId);
    const movement = byId(MOVEMENT_MODULES, movementId);
    const weapon = byId(WEAPON_MODULES, weaponId);
    const core = byId(CORE_MODULES, coreId);
    const ai = byId(AI_MODULES, aiId);
    const payload = byId(PAYLOAD_MODULES, payloadId);
    return Object.freeze({
      hullId: hull.id,
      hullNameKey: hull.nameKey,
      hullRole: hull.role,
      movementId: movement.id,
      movementNameKey: movement.nameKey,
      weaponId: weapon.id,
      weaponNameKey: weapon.nameKey,
      weaponPattern: weapon.pattern || "",
      coreId: core.id,
      coreNameKey: core.nameKey,
      aiId: ai.id,
      aiNameKey: ai.nameKey,
      payloadId: payload.id,
      payloadNameKey: payload.nameKey,
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
      score: core.score * payload.score,
      barrier: core.barrier ? core.barrier + stageIndex * 1.5 : 0,
      volatileRadius: core.volatileRadius,
      speciesPattern: hull.speciesPattern || "",
      deathrattle: hull.deathrattle || "",
      nativeBiome: hull.nativeBiome || "",
      collisionDamage: hull.collisionDamage || 2,
      targeting: ai.targeting,
      aiSteer: ai.steer,
      aiFlank: ai.flank,
      aiLead: ai.lead,
      aiEvasion: ai.evasion,
      aiCooldown: ai.cooldown,
      debuff: payload.debuff,
      debuffDuration: payload.duration,
      debuffIntensity: payload.intensity,
      payloadColor: payload.color,
      moduleSignature: `${movement.id}.${weapon.id}.${core.id}.${ai.id}.${payload.id}`,
      signature: `${hull.id}.${movement.id}.${weapon.id}.${core.id}.${ai.id}.${payload.id}`,
    });
  }

  window.SpaceExpedition = Object.freeze({
    BIOMES,
    HULL_MODULES,
    MOVEMENT_MODULES,
    WEAPON_MODULES,
    CORE_MODULES,
    AI_MODULES,
    PAYLOAD_MODULES,
    PATH_PROTOCOLS,
    ENCOUNTER_PROTOCOLS,
    generateRoute,
    generateBranchSets,
    generateEncounterPlans,
    evaluateGateChoice,
    evaluateEncounter,
    chooseEnemyHull,
    assembleEnemy,
    build,
  });
})();
