(() => {
  "use strict";

  const UPGRADE_DEFS = [
    { id: "overclock", category: "armament", rarity: "common", max: 3, nameKey: "upgrade.overclock.name", descriptionKey: "upgrade.overclock.description" },
    { id: "rail", category: "armament", rarity: "common", max: 3, nameKey: "upgrade.rail.name", descriptionKey: "upgrade.rail.description" },
    { id: "prism", category: "armament", rarity: "rare", max: 3, nameKey: "upgrade.prism.name", descriptionKey: "upgrade.prism.description" },
    { id: "piercing", category: "armament", rarity: "rare", max: 2, nameKey: "upgrade.piercing.name", descriptionKey: "upgrade.piercing.description" },
    { id: "drone", category: "armament", rarity: "legendary", max: 2, nameKey: "upgrade.drone.name", descriptionKey: "upgrade.drone.description" },
    { id: "chain", category: "armament", rarity: "legendary", max: 2, nameKey: "upgrade.chain.name", descriptionKey: "upgrade.chain.description" },
    { id: "turbo", category: "mobility", rarity: "common", max: 3, nameKey: "upgrade.turbo.name", descriptionKey: "upgrade.turbo.description" },
    { id: "gyro", category: "mobility", rarity: "common", max: 3, nameKey: "upgrade.gyro.name", descriptionKey: "upgrade.gyro.description" },
    { id: "phase", category: "mobility", rarity: "rare", max: 2, nameKey: "upgrade.phase.name", descriptionKey: "upgrade.phase.description" },
    { id: "aegisCycle", category: "system", rarity: "rare", max: 2, nameKey: "upgrade.aegisCycle.name", descriptionKey: "upgrade.aegisCycle.description" },
    { id: "nanites", category: "system", rarity: "common", max: 3, nameKey: "upgrade.nanites.name", descriptionKey: "upgrade.nanites.description" },
    { id: "capacitor", category: "system", rarity: "common", max: 3, nameKey: "upgrade.capacitor.name", descriptionKey: "upgrade.capacitor.description" },
    { id: "novaCore", category: "system", rarity: "rare", max: 3, nameKey: "upgrade.novaCore.name", descriptionKey: "upgrade.novaCore.description" },
    { id: "resonanceArray", category: "system", rarity: "rare", max: 3, nameKey: "upgrade.resonanceArray.name", descriptionKey: "upgrade.resonanceArray.description" },
    { id: "magnet", category: "system", rarity: "common", max: 3, nameKey: "upgrade.magnet.name", descriptionKey: "upgrade.magnet.description" },
  ].map((upgrade) => Object.freeze(upgrade));

  function createRng(seed) {
    let state = (Number(seed) >>> 0) || 0x6d2b79f5;
    return () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 4294967296;
    };
  }

  function rarityWeight(upgrade, stageIndex) {
    if (upgrade.rarity === "legendary") return .7 + stageIndex * 1.2;
    if (upgrade.rarity === "rare") return 3 + stageIndex * 1.5;
    return 8;
  }

  function weightedChoice(items, stageIndex, random) {
    const total = items.reduce((sum, item) => sum + rarityWeight(item, stageIndex), 0);
    let roll = random() * total;
    for (const item of items) {
      roll -= rarityWeight(item, stageIndex);
      if (roll <= 0) return item;
    }
    return items[items.length - 1];
  }

  function rollDraftOptions({ levels = {}, stageIndex = 0, random }) {
    if (typeof random !== "function") throw new TypeError("rollDraftOptions requires a random function");
    const choices = [];
    for (const category of ["armament", "mobility", "system"]) {
      const eligible = UPGRADE_DEFS.filter((upgrade) => upgrade.category === category && (levels[upgrade.id] || 0) < upgrade.max);
      if (eligible.length) choices.push(weightedChoice(eligible, stageIndex, random));
    }
    while (choices.length < 3) {
      const fallback = UPGRADE_DEFS.filter((upgrade) => (levels[upgrade.id] || 0) < upgrade.max && !choices.includes(upgrade));
      if (!fallback.length) break;
      choices.push(weightedChoice(fallback, stageIndex, random));
    }
    return choices;
  }

  function applyUpgradeToPlayer(player, upgradeId, level) {
    if (upgradeId === "overclock") player.fireRate *= 1.16;
    else if (upgradeId === "rail") { player.damage *= 1.2; player.projectileSpeed *= 1.12; }
    else if (upgradeId === "prism") { player.weaponFloor = Math.min(3, player.weaponFloor + 1); player.weapon = Math.min(4, Math.max(player.weapon, 1 + player.weaponFloor)); }
    else if (upgradeId === "piercing") player.pierce += 1;
    else if (upgradeId === "drone") player.droneLevel += 1;
    else if (upgradeId === "chain") player.chainDamage += 8;
    else if (upgradeId === "turbo") player.speed *= 1.14;
    else if (upgradeId === "gyro") player.handling *= 1.22;
    else if (upgradeId === "phase") { player.r *= .85; player.hitInvulnerability += .2; }
    else if (upgradeId === "aegisCycle") { player.shieldRegenInterval = Math.max(16, 30 - level * 6); player.shieldRegenTimer = Math.min(player.shieldRegenTimer, player.shieldRegenInterval); }
    else if (upgradeId === "nanites") { player.maxHp += 1; player.hp = Math.min(player.maxHp, player.hp + 2); }
    else if (upgradeId === "capacitor") player.energyGain *= 1.2;
    else if (upgradeId === "novaCore") player.novaDamage *= 1.3;
    else if (upgradeId === "resonanceArray") { player.linkRange += 16; player.beamDamage *= 1.22; }
    else if (upgradeId === "magnet") player.pickupMagnetRadius += level === 1 ? 70 : 35;
    else throw new RangeError(`Unknown upgrade: ${upgradeId}`);
    return player;
  }

  window.SpaceRoguelike = Object.freeze({
    UPGRADE_DEFS: Object.freeze(UPGRADE_DEFS),
    createRng,
    rollDraftOptions,
    applyUpgradeToPlayer,
  });
})();
