(() => {
  "use strict";

  const RUSH_CONFIG = Object.freeze({
    threshold: 100,
    duration: 7.5,
    maximumDuration: 10,
    cooldown: 4,
    linkedChargePerSecond: 1.8,
    unlinkedDecayPerSecond: .22,
    killExtension: .12,
    fireRate: 1.38,
    damage: 1.26,
    linkRate: 1.65,
    linkDamage: 1.42,
    pickupMagnet: 90,
    score: 1.5,
    bulletGuardRadius: 13,
  });

  const EVENT_CHARGE = Object.freeze({
    kill: 3.4,
    elite: 8,
    pickup: 6,
    encounter: 14,
    rescue: 18,
    bossPhase: 10,
  });

  function clampCharge(value) {
    return Math.max(0, Math.min(RUSH_CONFIG.threshold, Number(value) || 0));
  }

  function chargeForEvent(type, linked = false) {
    const base = EVENT_CHARGE[type] || 0;
    return base * (linked ? 1.35 : 1);
  }

  function addEventCharge(current, type, linked = false) {
    return clampCharge(current + chargeForEvent(type, linked));
  }

  function advanceCharge(current, dt, linked, eligible = true) {
    if (!eligible) return clampCharge(current);
    const delta = linked ? RUSH_CONFIG.linkedChargePerSecond : -RUSH_CONFIG.unlinkedDecayPerSecond;
    return clampCharge(current + delta * Math.max(0, Number(dt) || 0));
  }

  function combatMultipliers(active) {
    return Object.freeze(active ? {
      fireRate: RUSH_CONFIG.fireRate,
      damage: RUSH_CONFIG.damage,
      linkRate: RUSH_CONFIG.linkRate,
      linkDamage: RUSH_CONFIG.linkDamage,
      pickupMagnet: RUSH_CONFIG.pickupMagnet,
      score: RUSH_CONFIG.score,
    } : { fireRate: 1, damage: 1, linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1 });
  }

  window.SpaceRush = Object.freeze({
    RUSH_CONFIG,
    EVENT_CHARGE,
    clampCharge,
    chargeForEvent,
    addEventCharge,
    advanceCharge,
    combatMultipliers,
  });
})();
