(() => {
  "use strict";
  const integer = (value, max = 1000000) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(max, Math.floor(Number(value)))) : 0;
  const ROUTES = Object.freeze([
    { id: "exploration", nameKey: "research.exploration.name", descriptionKey: "research.exploration.description" },
    { id: "salvage", nameKey: "research.salvage.name", descriptionKey: "research.salvage.description" },
    { id: "assault", nameKey: "research.assault.name", descriptionKey: "research.assault.description" },
  ].map(Object.freeze));
  const BLUEPRINTS = Object.freeze([
    { id: "wayfinder", route: "exploration", nameKey: "research.wayfinder.name", descriptionKey: "research.wayfinder.description" },
    { id: "fieldMedic", route: "exploration", nameKey: "research.fieldMedic.name", descriptionKey: "research.fieldMedic.description" },
    { id: "reclaimer", route: "salvage", nameKey: "research.reclaimer.name", descriptionKey: "research.reclaimer.description" },
    { id: "fluxSalvage", route: "salvage", nameKey: "research.fluxSalvage.name", descriptionKey: "research.fluxSalvage.description" },
    { id: "breaker", route: "assault", nameKey: "research.breaker.name", descriptionKey: "research.breaker.description" },
    { id: "guardian", route: "assault", nameKey: "research.guardian.name", descriptionKey: "research.guardian.description" },
  ].map(Object.freeze));
  const COSTS = Object.freeze([80, 140, 240]);
  function sanitize(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      focus: ROUTES.some((route) => route.id === source.focus) ? source.focus : "exploration",
      ranks: Object.fromEntries(BLUEPRINTS.map((node) => [node.id, integer(source.ranks?.[node.id], 3)])),
      progress: integer(source.progress, 3),
      starterClaimed: source.starterClaimed === true,
    };
  }
  function purchase(research, id, balance) {
    const next = sanitize(research);
    if (!BLUEPRINTS.some((node) => node.id === id)) return { ok: false, reason: "unknown" };
    const rank = next.ranks[id];
    if (rank >= 3) return { ok: false, reason: "max" };
    const cost = COSTS[rank];
    if (integer(balance) < cost) return { ok: false, reason: "cost", cost };
    next.ranks[id] += 1;
    return { ok: true, cost, research: next };
  }
  function effects(research) {
    const rank = sanitize(research).ranks;
    return Object.freeze({
      sectorEnergy: rank.wayfinder * 4,
      encounterRepair: rank.fieldMedic * .5,
      pickupShieldEvery: rank.reclaimer ? 10 - rank.reclaimer * 2 : 0,
      pickupEnergy: rank.fluxSalvage ? rank.fluxSalvage + 1 : 0,
      markEvery: rank.breaker ? 9 - rank.breaker : 0,
      novaShieldEvery: rank.guardian ? 4 - rank.guardian : 0,
    });
  }
  // A separate, settlement-only stream: never consumes combat/draft/loot RNG.
  function randomFor(seed, run) {
    let state = ((Number(seed) >>> 0) ^ Math.imul(integer(run) + 1, 0x45d9f3b) ^ 0x52455345) >>> 0 || 1;
    state = Math.imul(state ^ (state >>> 16), 0x7feb352d);
    state = Math.imul(state ^ (state >>> 15), 0x846ca68b);
    state = (state ^ (state >>> 16)) >>> 0 || 1;
    return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) / 4294967296; };
  }
  function settle(stats = {}, research, seed, runs = 0) {
    const next = sanitize(research);
    const kills = integer(stats.kills);
    const sectors = integer(stats.sectors, 9);
    const bosses = integer(stats.bosses, 3);
    const encounters = integer(stats.encounters, 12);
    const pickups = integer(stats.pickups, 24);
    const elites = integer(stats.elites, 10);
    const qualified = kills >= 12 || encounters > 0 || bosses > 0;
    const starter = qualified && !next.starterClaimed;
    // No elapsed-time payout, uncapped kill farm or rewards for restarting idle.
    const milestones = sectors * 32 + bosses * 80 + encounters * 22 + (stats.victory ? 100 : 0);
    const combat = Math.min(60, kills * 2);
    const route = next.focus === "exploration" ? sectors * 12 + encounters * 6
      : next.focus === "salvage" ? pickups * 3 : elites * 6 + bosses * 20;
    const base = starter ? Math.max(80, milestones + combat + route) : milestones + combat + route;
    const multiplier = Number.isFinite(Number(stats.multiplier)) ? Math.max(1, Math.min(1.55, Number(stats.multiplier))) : 1;
    let dust = Math.round(base * multiplier);
    // Four objective data resolve a blueprint; incomplete progress survives defeat.
    // Repeated early kills alone cannot farm free permanent upgrades.
    const dataEarned = sectors + encounters + bosses * 2;
    const availableData = next.progress + dataEarned;
    const cacheCount = Math.floor(availableData / 4) + (starter ? 1 : 0);
    next.progress = availableData % 4;
    next.starterClaimed ||= starter;
    const random = randomFor(seed, runs);
    const discoveries = [];
    for (let i = 0; i < cacheCount; i += 1) {
      const eligible = BLUEPRINTS.filter((node) => next.ranks[node.id] < 3);
      const focused = eligible.filter((node) => node.route === next.focus);
      // First cache always targets the selected route when it has room.
      let pool = focused.length && (i === 0 || random() < .65) ? focused : eligible;
      const unknown = pool.filter((node) => next.ranks[node.id] === 0);
      if (unknown.length) pool = unknown;
      if (!pool.length) { dust += 40; discoveries.push({ id: "dust", amount: 40 }); continue; }
      const node = pool[Math.floor(random() * pool.length)];
      next.ranks[node.id] += 1;
      discoveries.push({ id: node.id, rank: next.ranks[node.id] });
    }
    return { dust, research: next, discoveries, cacheCount, qualified, dataEarned, breakdown: { milestones, combat, route, floor: Math.max(0, base - milestones - combat - route), multiplier } };
  }
  window.SpaceResearch = Object.freeze({ ROUTES, BLUEPRINTS, COSTS, sanitize, purchase, effects, settle });
})();
