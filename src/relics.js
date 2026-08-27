(() => {
  "use strict";

  const PROTOCOLS = [
    { id: "cometDrive", required: ["overclock", "turbo"], color: "#69f7e4", nameKey: "protocol.cometDrive.name", descriptionKey: "protocol.cometDrive.description" },
    { id: "phaseLance", required: ["rail", "phase"], color: "#9ed8ff", nameKey: "protocol.phaseLance.name", descriptionKey: "protocol.phaseLance.description" },
    { id: "prismChoir", required: ["prism", "drone"], color: "#ff8fd2", nameKey: "protocol.prismChoir.name", descriptionKey: "protocol.prismChoir.description" },
    { id: "stormCircuit", required: ["piercing", "chain"], color: "#ffe56d", nameKey: "protocol.stormCircuit.name", descriptionKey: "protocol.stormCircuit.description" },
    { id: "aegisNova", required: ["aegisCycle", "novaCore"], color: "#82b8ff", nameKey: "protocol.aegisNova.name", descriptionKey: "protocol.aegisNova.description" },
    { id: "salvageReactor", required: ["magnet", "capacitor"], color: "#91ff9d", nameKey: "protocol.salvageReactor.name", descriptionKey: "protocol.salvageReactor.description" },
    { id: "resonantGyro", required: ["resonanceArray", "gyro"], color: "#c993ff", nameKey: "protocol.resonantGyro.name", descriptionKey: "protocol.resonantGyro.description" },
  ].map((protocol) => Object.freeze({ ...protocol, required: Object.freeze(protocol.required) }));

  function owns(levels, upgradeId) {
    return (levels?.[upgradeId] || 0) > 0;
  }

  function activeProtocols(levels = {}) {
    return PROTOCOLS.filter((protocol) => protocol.required.every((upgradeId) => owns(levels, upgradeId)));
  }

  function protocolUnlockedByChoice(levels = {}, upgradeId) {
    return PROTOCOLS.find((protocol) => protocol.required.includes(upgradeId)
      && !protocol.required.every((requiredId) => owns(levels, requiredId))
      && protocol.required.every((requiredId) => requiredId === upgradeId || owns(levels, requiredId))) || null;
  }

  function eligibleMates(levels = {}, upgrades = []) {
    const definitions = new Map(upgrades.map((upgrade) => [upgrade.id, upgrade]));
    const mates = [];
    for (const protocol of PROTOCOLS) {
      const owned = protocol.required.filter((upgradeId) => owns(levels, upgradeId));
      if (owned.length !== 1) continue;
      const mateId = protocol.required.find((upgradeId) => upgradeId !== owned[0]);
      const mate = definitions.get(mateId);
      if (!mate || (levels[mateId] || 0) >= mate.max) continue;
      mates.push({ protocol, upgrade: mate });
    }
    return mates;
  }

  function injectProtocolChoice({ choices, levels = {}, upgrades = [], random }) {
    if (!Array.isArray(choices)) return [];
    if (typeof random !== "function") throw new TypeError("injectProtocolChoice requires a random function");
    const options = [...choices];
    const mates = eligibleMates(levels, upgrades);
    if (!mates.length) return options;
    const selected = mates[Math.min(mates.length - 1, Math.floor(random() * mates.length))];
    if (options.some((upgrade) => upgrade.id === selected.upgrade.id)) return options;
    const replaceIndex = options.findIndex((upgrade) => upgrade.category === selected.upgrade.category);
    if (replaceIndex >= 0) options[replaceIndex] = selected.upgrade;
    return options;
  }

  function combatBonuses(levels = {}) {
    const active = new Set(activeProtocols(levels).map((protocol) => protocol.id));
    return Object.freeze({
      cometDrive: active.has("cometDrive"),
      movingFireRate: active.has("cometDrive") ? 1.18 : 1,
      phaseLance: active.has("phaseLance"),
      phaseDamage: active.has("phaseLance") ? 1.12 : 1,
      prismChoir: active.has("prismChoir"),
      seekerTurn: active.has("prismChoir") ? 4.8 : 0,
      stormCircuit: active.has("stormCircuit"),
      chainDamage: active.has("stormCircuit") ? 1.45 : 1,
      chainTargets: active.has("stormCircuit") ? 1 : 0,
      aegisNova: active.has("aegisNova"),
      salvageReactor: active.has("salvageReactor"),
      pickupEnergy: active.has("salvageReactor") ? 18 : 0,
      pickupRush: active.has("salvageReactor") ? 8 : 0,
      resonantGyro: active.has("resonantGyro"),
      linkedCharge: active.has("resonantGyro") ? 1.8 : 1,
      beamDamage: active.has("resonantGyro") ? 1.25 : 1,
      beamRadius: active.has("resonantGyro") ? 5 : 0,
    });
  }

  window.SpaceRelics = Object.freeze({
    PROTOCOLS: Object.freeze(PROTOCOLS),
    activeProtocols,
    protocolUnlockedByChoice,
    eligibleMates,
    injectProtocolChoice,
    combatBonuses,
  });
})();
