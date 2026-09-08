(() => {
  "use strict";

  const LOOT_TYPES = Object.freeze(["weapon", "repair", "shield", "energy"]);
  const ORDINARY_MIN_GAIN = .08;
  const ORDINARY_GAIN_SPREAD = .025;
  const TANK_BONUS = .1;

  function clampUnit(value) {
    return Math.max(0, Math.min(.999999999, Number(value) || 0));
  }

  function budgetGain(enemyType, randomValue) {
    return ORDINARY_MIN_GAIN + clampUnit(randomValue) * ORDINARY_GAIN_SPREAD + (enemyType === "tank" ? TANK_BONUS : 0);
  }

  function advanceBudget(current, enemyType, randomValue) {
    const budget = Math.max(0, Number(current) || 0) + budgetGain(enemyType, randomValue);
    const drops = Math.floor(budget + 1e-9);
    return Object.freeze({ budget: budget - drops, drops });
  }

  function refillBag(random) {
    if (typeof random !== "function") throw new TypeError("refillBag requires a random function");
    const bag = [...LOOT_TYPES];
    for (let index = bag.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(clampUnit(random()) * (index + 1));
      [bag[index], bag[swap]] = [bag[swap], bag[index]];
    }
    // Preserve the four-type shuffle while preventing an opening pair of pure
    // offence/energy. The shuffled order still decides which sustain pickup is
    // promoted, so this guard consumes no extra RNG and remains deterministic.
    if (!bag.slice(0, 2).some(type => type === "repair" || type === "shield")) {
      const sustainIndex = bag.findIndex(type => type === "repair" || type === "shield");
      [bag[1], bag[sustainIndex]] = [bag[sustainIndex], bag[1]];
    }
    return bag;
  }

  function drawType(bag, random) {
    const nextBag = Array.isArray(bag) ? [...bag] : [];
    if (!nextBag.length) nextBag.push(...refillBag(random));
    const type = nextBag.shift();
    return Object.freeze({ type, bag: Object.freeze(nextBag) });
  }

  function drawTypes(bag, count, random) {
    const types = [];
    let nextBag = Array.isArray(bag) ? [...bag] : [];
    for (let index = 0; index < Math.max(0, Math.floor(Number(count) || 0)); index += 1) {
      const draw = drawType(nextBag, random);
      types.push(draw.type);
      nextBag = [...draw.bag];
    }
    return Object.freeze({ types: Object.freeze(types), bag: Object.freeze(nextBag) });
  }

  window.SpaceLoot = Object.freeze({
    LOOT_TYPES,
    ORDINARY_MIN_GAIN,
    ORDINARY_GAIN_SPREAD,
    TANK_BONUS,
    budgetGain,
    advanceBudget,
    refillBag,
    drawType,
    drawTypes,
  });
})();
