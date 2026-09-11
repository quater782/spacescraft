(() => {
  "use strict";

  const RUSH_CONFIG = Object.freeze({
    threshold: 100,
    duration: 6,
    maximumDuration: 7.5,
    cooldown: 8,
    linkedChargePerSecond: 2,
    unlinkedDecayPerSecond: 1,
    linkedEventBonus: 1,
    killExtension: 0,
    moveSpeed: 1.12,
    handling: 1.18,
    fireRate: 1.2,
    damage: 1,
    linkRate: 1,
    linkDamage: 1,
    pickupMagnet: 0,
    score: 1,
    bulletGuardRadius: 0,
    guardInterval: 5,
    guardLimit: 3,
  });

  const EVENT_CHARGE = Object.freeze({
    kill: 0,
    elite: 0,
    pickup: 0,
    encounter: 5,
    rescue: 7,
    bossPhase: 5,
  });

  const EVENT_BONUS_FIELDS = Object.freeze({
    kill: "rushKillCharge",
    elite: "rushEliteCharge",
    pickup: "rushPickupCharge",
    encounter: "rushEncounterCharge",
  });

  const NOVA_CONFIG = Object.freeze({
    threshold: 120,
    cooldown: 14,
    passiveChargePerSecond: 1.2,
    hitCharge: .65,
    hitChargePerSecond: 4.8,
    energyPickupCharge: 12,
    encounterCharge: 8,
    routeRewardScale: .4,
    routeRewardCap: 12,
    clearRadius: 76,
    damageRadius: 96,
    damage: 30,
    bossDamage: 18,
    purifierDamage: .85,
  });

  function clampCharge(value) {
    return Math.max(0, Math.min(RUSH_CONFIG.threshold, Number(value) || 0));
  }

  function chargeForEvent(type, linked = false, bonuses = {}) {
    const bonusField = EVENT_BONUS_FIELDS[type];
    const base = (EVENT_CHARGE[type] || 0) + (bonusField ? Math.max(0, Number(bonuses[bonusField]) || 0) : 0);
    return base * (linked ? RUSH_CONFIG.linkedEventBonus : 1);
  }

  function addEventCharge(current, type, linked = false, bonuses = {}) {
    return clampCharge(current + chargeForEvent(type, linked, bonuses));
  }

  function advanceCharge(current, dt, linked, eligible = true, linkedRate = 1) {
    if (!eligible) return clampCharge(current);
    const delta = linked
      ? RUSH_CONFIG.linkedChargePerSecond * Math.max(0, Number(linkedRate) || 0)
      : -RUSH_CONFIG.unlinkedDecayPerSecond;
    return clampCharge(current + delta * Math.max(0, Number(dt) || 0));
  }

  function combatMultipliers(active, bonuses = {}) {
    return Object.freeze(active ? {
      moveSpeed: RUSH_CONFIG.moveSpeed,
      handling: RUSH_CONFIG.handling,
      fireRate: Math.max(RUSH_CONFIG.fireRate, Number(bonuses.rushFireRate) || 1),
      damage: RUSH_CONFIG.damage * Math.max(1, Number(bonuses.rushDamage) || 1),
      linkRate: 1,
      linkDamage: 1,
      pickupMagnet: RUSH_CONFIG.pickupMagnet,
      score: RUSH_CONFIG.score,
    } : { moveSpeed: 1, handling: 1, fireRate: 1, damage: 1, linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1 });
  }

  const clampNovaCharge = (value) => Math.max(0, Math.min(NOVA_CONFIG.threshold, Number(value) || 0));

  window.SpaceRush = Object.freeze({
    RUSH_CONFIG,
    EVENT_CHARGE,
    NOVA_CONFIG,
    clampCharge,
    clampNovaCharge,
    chargeForEvent,
    addEventCharge,
    advanceCharge,
    combatMultipliers,
  });
})();
