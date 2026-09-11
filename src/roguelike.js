(() => {
  "use strict";

  const PATHS = Object.freeze(["armament", "mobility", "nova", "rush"]);
  const OPENING_SURVIVAL_IDS = Object.freeze(["nanites", "aegisCycle", "phase"]);
  const UPGRADE_DEFS = [
    { id: "overclock", category: "armament", path: "armament", rarity: "common", max: 3, nameKey: "upgrade.overclock.name", descriptionKey: "upgrade.overclock.description" },
    { id: "rail", category: "armament", path: "armament", rarity: "common", max: 3, nameKey: "upgrade.rail.name", descriptionKey: "upgrade.rail.description" },
    { id: "prism", category: "armament", path: "armament", rarity: "rare", max: 3, nameKey: "upgrade.prism.name", descriptionKey: "upgrade.prism.description" },
    { id: "piercing", category: "armament", path: "armament", rarity: "rare", max: 2, nameKey: "upgrade.piercing.name", descriptionKey: "upgrade.piercing.description" },
    { id: "drone", category: "armament", path: "armament", rarity: "legendary", max: 2, nameKey: "upgrade.drone.name", descriptionKey: "upgrade.drone.description" },
    { id: "chain", category: "armament", path: "armament", rarity: "legendary", max: 2, nameKey: "upgrade.chain.name", descriptionKey: "upgrade.chain.description" },
    { id: "turbo", category: "mobility", path: "mobility", rarity: "common", max: 3, nameKey: "upgrade.turbo.name", descriptionKey: "upgrade.turbo.description" },
    { id: "gyro", category: "mobility", path: "mobility", rarity: "common", max: 3, nameKey: "upgrade.gyro.name", descriptionKey: "upgrade.gyro.description" },
    { id: "phase", category: "mobility", path: "mobility", rarity: "rare", max: 2, nameKey: "upgrade.phase.name", descriptionKey: "upgrade.phase.description" },
    { id: "aegisCycle", category: "system", path: "mobility", rarity: "rare", max: 2, nameKey: "upgrade.aegisCycle.name", descriptionKey: "upgrade.aegisCycle.description" },
    { id: "nanites", category: "system", path: "mobility", rarity: "common", max: 3, nameKey: "upgrade.nanites.name", descriptionKey: "upgrade.nanites.description" },
    { id: "magnet", category: "system", path: "mobility", rarity: "common", max: 3, nameKey: "upgrade.magnet.name", descriptionKey: "upgrade.magnet.description" },
    { id: "capacitor", category: "system", path: "nova", rarity: "common", max: 3, nameKey: "upgrade.capacitor.name", descriptionKey: "upgrade.capacitor.description" },
    { id: "novaCore", category: "system", path: "nova", rarity: "rare", max: 3, nameKey: "upgrade.novaCore.name", descriptionKey: "upgrade.novaCore.description" },
    { id: "novaHarvester", category: "system", path: "nova", rarity: "common", max: 2, nameKey: "upgrade.novaHarvester.name", descriptionKey: "upgrade.novaHarvester.description" },
    { id: "novaAegis", category: "system", path: "nova", rarity: "rare", max: 2, nameKey: "upgrade.novaAegis.name", descriptionKey: "upgrade.novaAegis.description" },
    { id: "novaPurifier", category: "system", path: "nova", rarity: "legendary", max: 1, nameKey: "upgrade.novaPurifier.name", descriptionKey: "upgrade.novaPurifier.description" },
    { id: "resonanceArray", category: "system", path: "rush", rarity: "rare", max: 3, nameKey: "upgrade.resonanceArray.name", descriptionKey: "upgrade.resonanceArray.description" },
    { id: "rushRelay", category: "system", path: "rush", rarity: "common", max: 2, nameKey: "upgrade.rushRelay.name", descriptionKey: "upgrade.rushRelay.description" },
    { id: "rushSalvage", category: "system", path: "rush", rarity: "common", max: 2, nameKey: "upgrade.rushSalvage.name", descriptionKey: "upgrade.rushSalvage.description" },
    { id: "rushOverdrive", category: "system", path: "rush", rarity: "rare", max: 2, nameKey: "upgrade.rushOverdrive.name", descriptionKey: "upgrade.rushOverdrive.description" },
    { id: "rushGuard", category: "system", path: "rush", rarity: "legendary", max: 1, nameKey: "upgrade.rushGuard.name", descriptionKey: "upgrade.rushGuard.description" },
  ].map((upgrade) => Object.freeze({ ...upgrade,
    max: ({ overclock: 2, drone: 3, turbo: 2, gyro: 2, nanites: 2, rushGuard: 2 })[upgrade.id] || upgrade.max,
    rarity: ({ rail: "common", drone: "rare", chain: "rare", resonanceArray: "common", rushGuard: "rare" })[upgrade.id] || upgrade.rarity,
  }));
  const UPGRADE_BY_ID = new Map(UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade]));

  const TIERS = Object.freeze({
    overclock: [{ rate: 15 }, { rate: 30 }],
    rail: [{ interval: 1.4, damage: 2 }, { interval: 1.1, damage: 2 }, { interval: .9, damage: 2.4 }],
    prism: [{ interval: .55, damage: .35 }, { interval: .45, damage: .35 }, { interval: .35, damage: .35 }],
    piercing: [{ targets: 2, second: 55, third: 0 }, { targets: 3, second: 65, third: 40 }],
    drone: [{ interval: 1.6, damage: .75 }, { interval: 1.25, damage: .75 }, { interval: 1, damage: .75 }],
    chain: [{ hits: 4, damage: .6 }, { hits: 3, damage: .75 }],
    turbo: [{ speed: 10 }, { speed: 20 }], gyro: [{ handling: 20, rescue: 15 }, { handling: 40, rescue: 30 }],
    phase: [{ radius: 6, invulnerability: .07 }, { radius: 12, invulnerability: .14 }],
    aegisCycle: [{ interval: 24, capacity: 0 }, { interval: 18, capacity: 1 }],
    nanites: [{ hp: 1, repair: 2 }, { hp: 2, repair: 2 }],
    magnet: [{ radius: 45, energy: 0 }, { radius: 80, energy: 0 }, { radius: 105, energy: 2 }],
    capacitor: [{ charge: 15 }, { charge: 30 }, { charge: 45 }],
    novaCore: [{ radius: 12, damage: 15 }, { radius: 24, damage: 30 }, { radius: 36, damage: 45 }],
    novaHarvester: [{ hit: .2, budget: 1.2 }, { hit: .4, budget: 2.4 }],
    novaAegis: [{ shield: 3, rescue: 8 }, { shield: 5, rescue: 12 }], novaPurifier: [{ penalty: 15 }],
    resonanceArray: [{ radius: 12, charge: 20 }, { radius: 24, charge: 40 }, { radius: 36, charge: 60 }],
    rushRelay: [{ hit: .3, budget: .8 }, { hit: .5, budget: 1.4 }],
    rushSalvage: [{ pickup: 4, encounter: 4 }, { pickup: 7, encounter: 7 }],
    rushOverdrive: [{ rate: 35, interval: 1, damage: 4 }, { rate: 50, interval: .75, damage: 6 }],
    rushGuard: [{ interval: 5, nodes: 3 }, { interval: 3.5, nodes: 3 }],
  });
  for (const ranks of Object.values(TIERS)) { ranks.forEach(Object.freeze); Object.freeze(ranks); }
  const tierStats = (id, level) => TIERS[id]?.[Math.max(0, Math.min(TIERS[id].length - 1, level - 1))] || {};
  const eligibleUpgrade = (upgrade, levels) => (levels[upgrade.id] || 0) < upgrade.max
    && (upgrade.id !== "novaPurifier" || (levels.novaCore || 0) >= 1);

  function createRng(seed) {
    let state = (Number(seed) >>> 0) || 0x6d2b79f5;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function deriveSeed(seed, salt) {
    let value = ((Number(seed) >>> 0) ^ (Number(salt) >>> 0)) || 0x6d2b79f5;
    value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
    value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
    return (value ^ (value >>> 16)) >>> 0 || 0x6d2b79f5;
  }

  function createRngStreams(seed) {
    return Object.freeze({
      combat: createRng(deriveSeed(seed, 0x434f4d42)),
      draft: createRng(deriveSeed(seed, 0x44524146)),
      loot: createRng(deriveSeed(seed, 0x4c4f4f54)),
      cosmetic: createRng(deriveSeed(seed, 0x56495355)),
    });
  }

  function historyIds(entry) {
    if (!Array.isArray(entry)) return [];
    return entry.map((item) => typeof item === "string" ? item : item?.id).filter(Boolean);
  }

  function rarityWeight(upgrade, stageIndex) {
    if (upgrade.rarity === "legendary") return .55 + stageIndex * .75;
    if (upgrade.rarity === "rare") return 3 + stageIndex * 1.1;
    return 8;
  }

  function weightedChoice(items, stageIndex, random) {
    if (!items.length) return null;
    const total = items.reduce((sum, item) => sum + rarityWeight(item, stageIndex), 0);
    let roll = random() * total;
    for (const item of items) {
      roll -= rarityWeight(item, stageIndex);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }

  function focusPath(pickHistory = []) {
    const counts = Object.fromEntries(PATHS.map((path) => [path, 0]));
    let focus = null;
    let best = 0;
    for (const id of historyIds(pickHistory)) {
      const path = UPGRADE_BY_ID.get(id)?.path;
      if (!path) continue;
      counts[path] += 1;
      if (counts[path] >= best) {
        best = counts[path];
        focus = path;
      }
    }
    return focus;
  }

  function rollDraftOptions({ levels = {}, stageIndex = 0, draftIndex, offerHistory = [], pickHistory = [], random }) {
    if (typeof random !== "function") throw new TypeError("rollDraftOptions requires a random function");
    const index = Math.max(0, Number.isInteger(draftIndex) ? draftIndex : historyIds(pickHistory).length);
    const eligible = UPGRADE_DEFS.filter((upgrade) => eligibleUpgrade(upgrade, levels));
    const choices = [];
    const addFrom = (items, forcedRarity = null) => {
      const pool = items.filter((item) => !choices.includes(item) && (!forcedRarity || item.rarity === forcedRarity));
      const picked = weightedChoice(pool, stageIndex, random);
      if (picked) choices.push(picked);
      return picked;
    };
    const addPath = (path, forcedRarity = null) => addFrom(eligible.filter((upgrade) => upgrade.path === path), forcedRarity);
    const focus = focusPath(pickHistory);
    const pathCounts = Object.fromEntries(PATHS.map((path) => [path, 0]));
    for (const id of historyIds(pickHistory)) {
      const path = UPGRADE_BY_ID.get(id)?.path;
      if (path) pathCounts[path] += 1;
    }

    if (index === 0) {
      addFrom(eligible.filter((upgrade) => ["rail", "prism", "drone"].includes(upgrade.id)));
      addFrom(eligible.filter((upgrade) => OPENING_SURVIVAL_IDS.includes(upgrade.id)));
      addPath("nova", "common");
    } else if (index === 1) {
      addPath("rush");
      addFrom(eligible.filter((upgrade) => (levels[upgrade.id] || 0) > 0)) || addPath(focus || "armament");
      const coverage = PATHS.filter((path) => path !== "rush" && path !== focus)
        .sort((a, b) => pathCounts[a] - pathCounts[b]);
      addPath(coverage[0] || "mobility");
    } else {
      addFrom(eligible.filter((upgrade) => (levels[upgrade.id] || 0) > 0 && upgrade.path === focus)) || addPath(focus || "armament");
      const hedge = PATHS.filter((path) => path !== focus)
        .sort((a, b) => pathCounts[a] - pathCounts[b] || PATHS.indexOf(a) - PATHS.indexOf(b))[0];
      addPath(hedge || "mobility");

      const currentPairStart = index % 2 === 0 ? index : index - 1;
      const pairOffers = offerHistory.slice(currentPairStart, index).flatMap(historyIds).map((id) => UPGRADE_BY_ID.get(id));
      const needsRare = index % 2 === 1 && !pairOffers.some((upgrade) => upgrade?.rarity === "rare" || upgrade?.rarity === "legendary");
      const hasWindowLegendary = offerHistory.slice(4, index).flatMap(historyIds)
        .some((id) => UPGRADE_BY_ID.get(id)?.rarity === "legendary");
      const forceLegendary = index === 6 && !hasWindowLegendary;
      const inviteLegendary = index >= 4 && index <= 5 && !hasWindowLegendary && random() < (index === 4 ? .22 : .45);
      const lastDiscoveryId = historyIds(offerHistory[index - 1])[2];
      const discoveryPool = eligible.filter((upgrade) => upgrade.id !== lastDiscoveryId);
      if (forceLegendary || inviteLegendary) addFrom(discoveryPool, "legendary") || addFrom(discoveryPool.filter((upgrade) => upgrade.rarity === "rare"));
      else if (needsRare) addFrom(discoveryPool.filter((upgrade) => upgrade.rarity !== "common"));
      else addFrom(discoveryPool);
    }

    while (choices.length < Math.min(3, eligible.length)) addFrom(eligible);

    const pairOfferIds = offerHistory.slice(index % 2 === 0 ? index : index - 1, index).flatMap(historyIds);
    const pairUpgrades = [...pairOfferIds.map((id) => UPGRADE_BY_ID.get(id)), ...choices].filter(Boolean);
    if (index % 2 === 1 && !pairUpgrades.some((upgrade) => upgrade.rarity === "rare" || upgrade.rarity === "legendary")) {
      const rare = weightedChoice(eligible.filter((upgrade) => upgrade.rarity !== "common" && !choices.includes(upgrade)), stageIndex, random);
      if (rare) choices[Math.min(2, choices.length - 1)] = rare;
    }
    return choices;
  }

  const targetRatio = (targets, tier) => {
    const index = Math.min(targets.length - 1, Math.max(0, tier - 1));
    return targets[index] / (index > 0 ? targets[index - 1] : 1);
  };

  function applyUpgradeToPlayer(player, upgradeId, level) {
    const definition = UPGRADE_BY_ID.get(upgradeId);
    if (!definition) throw new RangeError(`Unknown upgrade: ${upgradeId}`);
    player.upgradeRanks ||= {};
    const before = player.upgradeRanks[upgradeId] || 0;
    const tier = Math.max(1, Math.min(definition.max, Math.floor(Number(level) || 1)));
    if (tier <= before) return player;
    const stats = tierStats(upgradeId, tier);
    const previous = before ? tierStats(upgradeId, before) : {};
    const scale = (field, key) => {
      player[field] = (Number(player[field]) || 1) * (1 + stats[key] / 100) / (1 + (previous[key] || 0) / 100);
    };
    const add = (field, key) => { player[field] = (Number(player[field]) || 0) + stats[key] - (previous[key] || 0); };
    if (upgradeId === "overclock") {
      player.primaryRateBonus = stats.rate / 100;
    } else if (upgradeId === "rail") {
      player.heavyInterval = stats.interval; player.heavyDamage = stats.damage;
      player.heavyTimer = Math.min(player.heavyTimer ?? stats.interval, stats.interval);
      player.burstCadence = tier === definition.max ? 1 : 0;
    } else if (upgradeId === "prism") {
      player.fanInterval = stats.interval;
      player.fanTimer = Math.min(player.fanTimer ?? stats.interval, stats.interval);
      player.prismEcho = tier;
    } else if (upgradeId === "piercing") {
      player.pierce = tier;
    } else if (upgradeId === "drone") {
      player.droneLevel = tier; player.droneVolley = tier === definition.max ? 1 : 0;
      player.seekerInterval = stats.interval;
      player.seekerTimer = Math.min(player.seekerTimer ?? stats.interval, stats.interval);
    } else if (upgradeId === "chain") {
      player.chainDamage = stats.damage; player.chainHits = stats.hits;
    } else if (upgradeId === "turbo") scale("speed", "speed");
    else if (upgradeId === "gyro") { scale("handling", "handling"); scale("reviveSpeed", "rescue"); }
    else if (upgradeId === "phase") {
      player.hurtRadius = (Number(player.hurtRadius) || Number(player.r) || 3.2) * (1 - stats.radius / 100) / (1 - (previous.radius || 0) / 100);
      player.r = player.hurtRadius;
      player.hitInvulnerability = Math.min(.94, player.hitInvulnerability + stats.invulnerability - (previous.invulnerability || 0));
    } else if (upgradeId === "aegisCycle") {
      player.shieldRegenInterval = stats.interval;
      player.shieldRegenTimer = Math.min(player.shieldRegenTimer, stats.interval);
      add("maxShield", "capacity");
      if (!player.downed) player.shield = Math.min(player.maxShield, player.shield + tier - before);
    } else if (upgradeId === "nanites") {
      add("maxHp", "hp");
      if (!player.downed) player.hp = Math.min(player.maxHp, player.hp + 2 * (tier - before));
    } else if (upgradeId === "magnet") { add("pickupMagnetRadius", "radius"); player.pickupNovaBonus = stats.energy; }
    else if (upgradeId === "capacitor") scale("novaChargeRate", "charge");
    else if (upgradeId === "novaCore") { scale("novaDamage", "damage"); add("novaRadiusBonus", "radius"); }
    else if (upgradeId === "novaHarvester") { player.novaHitChargeBonus = stats.hit; player.novaHitBudgetBonus = stats.budget; }
    else if (upgradeId === "novaAegis") { player.novaShieldCharge = stats.shield; player.novaRescueCharge = stats.rescue; }
    else if (upgradeId === "novaPurifier") { player.novaClearAll = true; player.novaDamage *= .85; }
    else if (upgradeId === "resonanceArray") { scale("rushLinkedChargeRate", "charge"); add("linkRange", "radius"); }
    else if (upgradeId === "rushRelay") { player.rushHitCharge = stats.hit; player.rushHitBudget = stats.budget; }
    else if (upgradeId === "rushSalvage") { player.rushPickupCharge = stats.pickup; player.rushEncounterCharge = stats.encounter; }
    else if (upgradeId === "rushOverdrive") { player.rushFireRate = 1 + stats.rate / 100; player.overloadInterval = stats.interval; player.overloadDamage = stats.damage; }
    else if (upgradeId === "rushGuard") { player.rushGuard = true; player.rushGuardInterval = stats.interval; player.rushGuardLimit = stats.nodes; }
    player.upgradeRanks[upgradeId] = tier;
    return player;
  }

  function growthScore(levels = {}) {
    return UPGRADE_DEFS.reduce((score, upgrade) => {
      const level = Math.max(0, Math.min(upgrade.max, Number(levels[upgrade.id]) || 0));
      const rarity = upgrade.rarity === "legendary" ? 1.08 : upgrade.rarity === "rare" ? 1.05 : 1;
      return score + level * rarity + (level === upgrade.max ? .08 : 0);
    }, 0);
  }

  window.SpaceRoguelike = Object.freeze({
    PATHS,
    OPENING_SURVIVAL_IDS,
    UPGRADE_DEFS: Object.freeze(UPGRADE_DEFS),
    createRng,
    deriveSeed,
    createRngStreams,
    focusPath,
    rollDraftOptions,
    applyUpgradeToPlayer,
    TIERS,
    tierStats,
    eligibleUpgrade,
    growthScore,
  });
})();
