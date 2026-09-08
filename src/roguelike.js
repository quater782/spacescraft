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
  ].map((upgrade) => Object.freeze(upgrade));
  const UPGRADE_BY_ID = new Map(UPGRADE_DEFS.map((upgrade) => [upgrade.id, upgrade]));

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
    const eligible = UPGRADE_DEFS.filter((upgrade) => (levels[upgrade.id] || 0) < upgrade.max);
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
      addPath("armament", "common");
      addFrom(eligible.filter((upgrade) => OPENING_SURVIVAL_IDS.includes(upgrade.id)));
      addPath("nova", "common");
    } else if (index === 1) {
      addPath("rush");
      addPath(focus || "armament");
      const coverage = PATHS.filter((path) => path !== "rush" && path !== focus)
        .sort((a, b) => pathCounts[a] - pathCounts[b]);
      addPath(coverage[0] || "mobility");
    } else {
      addPath(focus || "armament");
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
      if (forceLegendary || inviteLegendary) addFrom(discoveryPool, "legendary");
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
    const tier = Math.max(1, Number(level) || 1);
    if (upgradeId === "overclock") {
      player.fireRate *= targetRatio([1.06, 1.12, 1.19], tier);
      if (tier >= 3) player.burstCadence = 8;
    } else if (upgradeId === "rail") {
      player.damage *= targetRatio([1.08, 1.17, 1.27], tier);
      player.projectileSpeed *= targetRatio([1.04, 1.09, 1.15], tier);
    } else if (upgradeId === "prism") {
      if (tier !== 2) player.weaponFloor = Math.min(2, player.weaponFloor + 1);
      player.weapon = Math.min(3, Math.max(player.weapon, 1 + player.weaponFloor));
      if (tier === 2) player.projectileSpeed *= 1.08;
      if (tier >= 3) player.prismEcho = 1;
    } else if (upgradeId === "piercing") {
      player.pierce += 1;
      player.damage *= .96;
    } else if (upgradeId === "drone") {
      player.droneLevel += 1;
      if (tier >= 2) player.droneVolley = 1;
    } else if (upgradeId === "chain") {
      player.chainDamage += tier >= 2 ? 4 : 5;
    } else if (upgradeId === "turbo") {
      player.speed *= targetRatio([1.06, 1.12, 1.19], tier);
    } else if (upgradeId === "gyro") {
      player.handling *= targetRatio([1.1, 1.22, 1.36], tier);
      if (tier >= 3) {
        player.hurtRadius = (Number(player.hurtRadius) || Number(player.r) || 3.2) * .96;
        player.r = player.hurtRadius;
      }
    } else if (upgradeId === "phase") {
      player.hurtRadius = (Number(player.hurtRadius) || Number(player.r) || 3.2) * .95;
      player.r = player.hurtRadius;
      player.hitInvulnerability = Math.min(.94, player.hitInvulnerability + .07);
    } else if (upgradeId === "aegisCycle") {
      player.shieldRegenInterval = tier >= 2 ? 27 : 34;
      player.shieldRegenTimer = Math.min(player.shieldRegenTimer, player.shieldRegenInterval);
      if (tier >= 2) { player.maxShield += 1; player.shield = Math.min(player.maxShield, player.shield + 1); }
    } else if (upgradeId === "nanites") {
      if (tier !== 2) player.maxHp += 1;
      player.hp = Math.min(player.maxHp, player.hp + 1);
    } else if (upgradeId === "magnet") {
      player.pickupMagnetRadius += [45, 35, 25][Math.min(2, tier - 1)];
    } else if (upgradeId === "capacitor") {
      player.novaChargeRate = (player.novaChargeRate || 1) * targetRatio([1.15, 1.35, 1.6], tier);
    } else if (upgradeId === "novaCore") {
      player.novaDamage *= targetRatio([1.12, 1.28, 1.48], tier);
      player.novaRadiusBonus = (player.novaRadiusBonus || 0) + 12;
    } else if (upgradeId === "novaHarvester") {
      player.novaHitChargeBonus = (player.novaHitChargeBonus || 0) + .2;
      player.novaHitBudgetBonus = (player.novaHitBudgetBonus || 0) + 1.2;
    } else if (upgradeId === "novaAegis") {
      player.novaShieldCharge = (player.novaShieldCharge || 0) + 3;
      player.novaRescueCharge = (player.novaRescueCharge || 0) + 8;
    } else if (upgradeId === "novaPurifier") {
      player.novaClearAll = true;
      player.novaDamage *= .85;
    } else if (upgradeId === "resonanceArray") {
      player.rushLinkedChargeRate = (player.rushLinkedChargeRate || 1) * targetRatio([1.12, 1.25, 1.4], tier);
      player.linkRange += 6;
    } else if (upgradeId === "rushRelay") {
      player.rushKillCharge = (player.rushKillCharge || 0) + (tier >= 2 ? .45 : .55);
      player.rushEliteCharge = (player.rushEliteCharge || 0) + 1.5;
    } else if (upgradeId === "rushSalvage") {
      player.rushPickupCharge = (player.rushPickupCharge || 0) + 3;
      player.rushEncounterCharge = (player.rushEncounterCharge || 0) + 4;
    } else if (upgradeId === "rushOverdrive") {
      player.rushFireRate = (player.rushFireRate || 1) * targetRatio([1.06, 1.12], tier);
      player.rushDamage = (player.rushDamage || 1) * targetRatio([1.04, 1.08], tier);
    } else if (upgradeId === "rushGuard") {
      player.rushGuard = true;
      player.rushGuardInterval = .28;
      player.rushGuardLimit = 20;
    } else throw new RangeError(`Unknown upgrade: ${upgradeId}`);
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
    growthScore,
  });
})();
