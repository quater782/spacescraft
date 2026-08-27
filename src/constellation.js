(() => {
  "use strict";

  const TALENT_NODES = [
    { id: "vectorThrusters", branch: "mobility", tier: 1, cost: 80, requires: null, nameKey: "talent.vectorThrusters.name", descriptionKey: "talent.vectorThrusters.description" },
    { id: "kineticDrift", branch: "mobility", tier: 2, cost: 140, requires: "vectorThrusters", nameKey: "talent.kineticDrift.name", descriptionKey: "talent.kineticDrift.description" },
    { id: "phaseAnchor", branch: "mobility", tier: 3, cost: 240, requires: "kineticDrift", nameKey: "talent.phaseAnchor.name", descriptionKey: "talent.phaseAnchor.description" },
    { id: "pulseTuning", branch: "armament", tier: 1, cost: 80, requires: null, nameKey: "talent.pulseTuning.name", descriptionKey: "talent.pulseTuning.description" },
    { id: "autoLoader", branch: "armament", tier: 2, cost: 140, requires: "pulseTuning", nameKey: "talent.autoLoader.name", descriptionKey: "talent.autoLoader.description" },
    { id: "novaMatrix", branch: "armament", tier: 3, cost: 240, requires: "autoLoader", nameKey: "talent.novaMatrix.name", descriptionKey: "talent.novaMatrix.description" },
    { id: "linkCoils", branch: "resonance", tier: 1, cost: 80, requires: null, nameKey: "talent.linkCoils.name", descriptionKey: "talent.linkCoils.description" },
    { id: "harmonicWeave", branch: "resonance", tier: 2, cost: 140, requires: "linkCoils", nameKey: "talent.harmonicWeave.name", descriptionKey: "talent.harmonicWeave.description" },
    { id: "twinAegis", branch: "resonance", tier: 3, cost: 240, requires: "harmonicWeave", nameKey: "talent.twinAegis.name", descriptionKey: "talent.twinAegis.description" },
  ].map((node) => Object.freeze(node));

  const NODE_BY_ID = new Map(TALENT_NODES.map((node) => [node.id, node]));

  function sanitizeUnlocks(unlocks) {
    const requested = new Set(Array.isArray(unlocks) ? unlocks : []);
    const valid = [];
    for (let tier = 1; tier <= 3; tier += 1) {
      for (const node of TALENT_NODES.filter((entry) => entry.tier === tier)) {
        if (requested.has(node.id) && (!node.requires || valid.includes(node.requires))) valid.push(node.id);
      }
    }
    return valid;
  }

  function canUnlock(id, unlocks, balance) {
    const node = NODE_BY_ID.get(id);
    const valid = sanitizeUnlocks(unlocks);
    if (!node) return Object.freeze({ ok: false, reason: "unknown" });
    if (valid.includes(id)) return Object.freeze({ ok: false, reason: "owned", node });
    if (node.requires && !valid.includes(node.requires)) return Object.freeze({ ok: false, reason: "prerequisite", node });
    if ((Number(balance) || 0) < node.cost) return Object.freeze({ ok: false, reason: "stardust", node });
    return Object.freeze({ ok: true, reason: "available", node });
  }

  function calculateEffects(unlocks) {
    const owned = new Set(sanitizeUnlocks(unlocks));
    return Object.freeze({
      speed: owned.has("vectorThrusters") ? 1.06 : 1,
      handling: owned.has("kineticDrift") ? 1.16 : 1,
      pickupMagnet: owned.has("kineticDrift") ? 24 : 0,
      radius: owned.has("phaseAnchor") ? .92 : 1,
      invulnerability: owned.has("phaseAnchor") ? .22 : 0,
      damage: owned.has("pulseTuning") ? 1.07 : 1,
      fireRate: owned.has("autoLoader") ? 1.09 : 1,
      projectileSpeed: owned.has("autoLoader") ? 1.06 : 1,
      energyGain: owned.has("novaMatrix") ? 1.1 : 1,
      novaDamage: owned.has("novaMatrix") ? 1.24 : 1,
      linkRange: owned.has("linkCoils") ? 14 : 0,
      beamDamage: owned.has("harmonicWeave") ? 1.2 : 1,
      reviveSpeed: owned.has("harmonicWeave") ? 1.28 : 1,
      maxShield: owned.has("twinAegis") ? 1 : 0,
      startShield: owned.has("twinAegis") ? 1 : 0,
    });
  }

  function applyToPlayer(player, unlocks) {
    const effect = calculateEffects(unlocks);
    player.speed *= effect.speed;
    player.handling *= effect.handling;
    player.pickupMagnetRadius += effect.pickupMagnet;
    player.r *= effect.radius;
    player.hitInvulnerability += effect.invulnerability;
    player.damage *= effect.damage;
    player.fireRate *= effect.fireRate;
    player.projectileSpeed *= effect.projectileSpeed;
    player.energyGain *= effect.energyGain;
    player.novaDamage *= effect.novaDamage;
    player.linkRange += effect.linkRange;
    player.beamDamage *= effect.beamDamage;
    player.reviveSpeed *= effect.reviveSpeed;
    player.maxShield += effect.maxShield;
    player.shield = Math.min(player.maxShield, player.shield + effect.startShield);
    return player;
  }

  window.SpaceConstellation = Object.freeze({
    TALENT_NODES: Object.freeze(TALENT_NODES),
    sanitizeUnlocks,
    canUnlock,
    calculateEffects,
    applyToPlayer,
  });
})();
