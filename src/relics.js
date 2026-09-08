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

  function completionIndex(protocol, history = []) {
    const picks = Array.isArray(history) ? history : [];
    const indices = protocol.required.map((upgradeId) => picks.indexOf(upgradeId));
    return indices.every((index) => index >= 0) ? Math.max(...indices) : -1;
  }

  function activeProtocols(levels = {}, history = []) {
    const completed = PROTOCOLS.filter((protocol) => protocol.required.every((upgradeId) => owns(levels, upgradeId)));
    // Completion order only affects presentation; every earned synergy stays active.
    return completed.sort((a, b) => completionIndex(b, history) - completionIndex(a, history));
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

  function injectProtocolChoice({ choices, levels = {}, upgrades = [], random, draftIndex, offerHistory = [], pickHistory = [] }) {
    if (!Array.isArray(choices)) return [];
    if (typeof random !== "function") throw new TypeError("injectProtocolChoice requires a random function");
    const options = [...choices];
    const index = Number.isInteger(draftIndex) ? draftIndex : pickHistory.length;
    if (!Array.isArray(pickHistory) || !pickHistory.length || index <= 0) return options;
    const definitions = new Map(upgrades.map((upgrade) => [upgrade.id, upgrade]));
    const candidates = [];
    for (let pickedAt = pickHistory.length - 1; pickedAt >= 0; pickedAt -= 1) {
      const componentId = pickHistory[pickedAt];
      const delta = index - pickedAt;
      if (delta < 1) continue;
      if (delta > 2) break;
      for (const protocol of PROTOCOLS.filter((entry) => entry.required.includes(componentId))) {
        const mateId = protocol.required.find((requiredId) => requiredId !== componentId);
        const mate = definitions.get(mateId);
        if (!mate || owns(levels, mateId) || (levels[mateId] || 0) >= mate.max) continue;
        const alreadyOffered = offerHistory.slice(pickedAt + 1, index).some((offer) => (
          Array.isArray(offer) && offer.some((item) => (typeof item === "string" ? item : item?.id) === mateId)
        ));
        if (alreadyOffered || options.some((upgrade) => upgrade.id === mateId)) return options;
        if (delta === 2) candidates.push({ protocol, upgrade: mate });
      }
    }
    if (!candidates.length) return options;
    const selected = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
    if (options.some((upgrade) => upgrade.id === selected.upgrade.id)) return options;
    const replaceIndex = options.length >= 3 ? 2 : options.findIndex((upgrade) => upgrade.category === selected.upgrade.category);
    if (replaceIndex >= 0) options[replaceIndex] = selected.upgrade;
    return options;
  }

  function combatBonuses(levels = {}, history = []) {
    const active = new Set(activeProtocols(levels, history).map((protocol) => protocol.id));
    return Object.freeze({
      cometDrive: active.has("cometDrive"),
      movingFireRate: active.has("cometDrive") ? 1.08 : 1,
      phaseLance: active.has("phaseLance"),
      phaseDamage: active.has("phaseLance") ? 1.06 : 1,
      prismChoir: active.has("prismChoir"),
      seekerTurn: active.has("prismChoir") ? 3.4 : 0,
      stormCircuit: active.has("stormCircuit"),
      chainDamage: active.has("stormCircuit") ? 1.2 : 1,
      chainTargets: active.has("stormCircuit") ? 1 : 0,
      aegisNova: active.has("aegisNova"),
      salvageReactor: active.has("salvageReactor"),
      pickupEnergy: active.has("salvageReactor") ? 8 : 0,
      pickupRush: active.has("salvageReactor") ? 3 : 0,
      resonantGyro: active.has("resonantGyro"),
      linkedCharge: active.has("resonantGyro") ? 1.2 : 1,
      beamDamage: active.has("resonantGyro") ? 1.12 : 1,
      beamRadius: active.has("resonantGyro") ? 2 : 0,
    });
  }

  window.SpaceRelics = Object.freeze({
    PROTOCOLS: Object.freeze(PROTOCOLS),
    activeProtocols,
    completionIndex,
    protocolUnlockedByChoice,
    eligibleMates,
    injectProtocolChoice,
    combatBonuses,
  });
})();
