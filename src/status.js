(() => {
  "use strict";

  const freezeAll = (items) => Object.freeze(items.map((item) => Object.freeze(item)));

  const BUFF_MODULES = freezeAll([
    { id: "arsenal", pickupType: "weapon", nameKey: "buff.arsenal.name", descriptionKey: "buff.arsenal.description", color: "#ffe36d", duration: 8 },
    { id: "nanobloom", pickupType: "repair", nameKey: "buff.nanobloom.name", descriptionKey: "buff.nanobloom.description", color: "#78f5aa", duration: 8 },
    { id: "aegis", pickupType: "shield", nameKey: "buff.aegis.name", descriptionKey: "buff.aegis.description", color: "#76dbff", duration: 9 },
    { id: "flux", pickupType: "energy", nameKey: "buff.flux.name", descriptionKey: "buff.flux.description", color: "#bc86ff", duration: 7 },
  ]);

  const DEBUFF_MODULES = freezeAll([
    { id: "chill", nameKey: "debuff.chill.name", descriptionKey: "debuff.chill.description", color: "#70eaff", speed: .82, fireRate: 1, energyGain: 1 },
    { id: "jam", nameKey: "debuff.jam.name", descriptionKey: "debuff.jam.description", color: "#ff83d7", speed: 1, fireRate: .84, energyGain: 1 },
    { id: "fracture", nameKey: "debuff.fracture.name", descriptionKey: "debuff.fracture.description", color: "#ffb45f", speed: 1, fireRate: 1, energyGain: .72 },
  ]);

  const byId = (items, id) => items.find((item) => item.id === id) || null;
  const buffForPickup = (pickupType) => BUFF_MODULES.find((buff) => buff.pickupType === pickupType) || BUFF_MODULES[0];
  const active = (items, timers = {}) => items.filter((item) => Number(timers[item.id]) > 0);

  function combatBonuses(buffTimers = {}, debuffTimers = {}) {
    const arsenal = Number(buffTimers.arsenal) > 0;
    const nanobloom = Number(buffTimers.nanobloom) > 0;
    const aegis = Number(buffTimers.aegis) > 0;
    const flux = Number(buffTimers.flux) > 0;
    const chill = Number(debuffTimers.chill) > 0;
    const jam = Number(debuffTimers.jam) > 0;
    const fracture = Number(debuffTimers.fracture) > 0;
    return Object.freeze({
      damage: arsenal ? 1.08 : 1,
      fireRate: (arsenal ? 1.24 : 1) * (jam ? .84 : 1),
      speed: (nanobloom ? 1.12 : 1) * (chill ? .82 : 1),
      energyGain: (flux ? 1.3 : 1) * (fracture ? .72 : 1),
      pickupMagnet: flux ? 70 : 0,
      beamDamage: flux ? 1.12 : 1,
      statusResistance: aegis ? .5 : 1,
      aegis,
      nanobloom,
    });
  }

  window.SpaceStatus = Object.freeze({
    BUFF_MODULES,
    DEBUFF_MODULES,
    buffForPickup,
    activeBuffs: (timers) => active(BUFF_MODULES, timers),
    activeDebuffs: (timers) => active(DEBUFF_MODULES, timers),
    combatBonuses,
    buffById: (id) => byId(BUFF_MODULES, id),
    debuffById: (id) => byId(DEBUFF_MODULES, id),
  });
})();
