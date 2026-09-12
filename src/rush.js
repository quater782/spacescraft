(() => {
  "use strict";

  const RUSH_CONFIG = Object.freeze({
    threshold: 100,
    duration: 6,
    maximumDuration: 7.5,
    cooldown: 8,
    linkedChargePerSecond: 2,
    unlinkedDecayPerSecond: 0,
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

  const LINK_CONFIG = Object.freeze({ readyDelay: .5, recharge: 6, linger: 1, clears: 2, radius: 24, halfWidth: 10, combatRadius: 200,
    echoDelay: .45, echoRadius: 36, echoClears: 3, returnDamage: .6, returnLife: .8 });
  const createLinkState = () => ({ ready: true, recharge: 0, stable: 0, linger: 0, connected: false,
    pulses: 0, clears: 0, returns: 0, echoClears: 0, echoes: [], tasks: {}, flash: 0 });

  function reflectedVelocity(bullet, a, b) {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const speed = Math.max(60, Math.hypot(bullet.vx || 0, bullet.vy || 0));
    const nx = length > .01 ? -(b.y - a.y) / length : 0;
    const ny = length > .01 ? (b.x - a.x) / length : -1;
    const dot = (bullet.vx || 0) * nx + (bullet.vy || 0) * ny;
    let vx = (bullet.vx || 0) - 2 * dot * nx, vy = (bullet.vy || 0) - 2 * dot * ny;
    if (length <= .01 || Math.hypot(vx, vy) < .01 || Math.abs(dot) < speed * .15) {
      const side = (bullet.x - (a.x + b.x) / 2) * nx + (bullet.y - (a.y + b.y) / 2) * ny >= 0 ? 1 : -1;
      vx = nx * speed * side; vy = ny * speed * side;
    }
    return { vx, vy };
  }

  window.SpaceRush = Object.freeze({
    RUSH_CONFIG,
    EVENT_CHARGE,
    NOVA_CONFIG,
    LINK_CONFIG, createLinkState, reflectedVelocity,
    clampCharge,
    clampNovaCharge,
    chargeForEvent,
    addEventCharge,
    advanceCharge,
    combatMultipliers,
  });
})();
