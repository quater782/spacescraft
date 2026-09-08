import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/loot.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/loot.js" });
const loot = sandbox.window.SpaceLoot;

assert.deepEqual([...loot.LOOT_TYPES].sort(), ["energy", "repair", "shield", "weapon"]);
assert.equal(loot.budgetGain("scout", 0), .08);
assert.equal(loot.budgetGain("tank", 0), .18);
assert.ok(loot.budgetGain("scout", 1) < .106);

let budget = 0;
let drought = 0;
let maxDrought = 0;
let totalDrops = 0;
for (let kill = 0; kill < 260; kill += 1) {
  const result = loot.advanceBudget(budget, "scout", 0);
  budget = result.budget;
  drought += 1;
  if (result.drops) {
    totalDrops += result.drops;
    maxDrought = Math.max(maxDrought, drought);
    drought = 0;
  }
}
assert.ok(totalDrops >= 20 && totalDrops <= 21, "ordinary drops must follow a bounded accumulation budget");
assert.ok(maxDrought <= 13, `ordinary loot drought exceeded 13 kills: ${maxDrought}`);

let randomState = 7;
const random = () => ((randomState = (randomState * 48271) % 2147483647) / 2147483647);
let bag = [];
const sequence = [];
for (let index = 0; index < 40; index += 1) {
  const draw = loot.drawType(bag, random);
  sequence.push(draw.type);
  bag = [...draw.bag];
}
for (let index = 0; index < sequence.length; index += 4) {
  const supplyBag = sequence.slice(index, index + 4);
  assert.deepEqual(supplyBag.sort(), [...loot.LOOT_TYPES].sort(), "each four-drop bag must contain every pickup type exactly once");
  assert.ok(
    sequence.slice(index, index + 2).some(type => type === "repair" || type === "shield"),
    "each supply bag must surface repair or shield within its first two drops",
  );
}

// Exercise every coarse Fisher-Yates branch, including permutations that would
// otherwise open with weapon + energy, without coupling the test to one seed.
for (const first of [0, .25, .5, .75]) {
  for (const second of [0, 1 / 3, 2 / 3]) {
    for (const third of [0, .5]) {
      const values = [first, second, third];
      const supplyBag = loot.refillBag(() => values.shift());
      assert.deepEqual([...supplyBag].sort(), [...loot.LOOT_TYPES].sort(), "guarded bags must retain all four unique pickup types");
      assert.ok(
        supplyBag.slice(0, 2).some(type => type === "repair" || type === "shield"),
        `guarded bag opened without sustain: ${supplyBag.join(", ")}`,
      );
    }
  }
}
const eliteDraw = loot.drawTypes([], 2, random);
assert.equal(eliteDraw.types.length, 2);
assert.notEqual(eliteDraw.types[0], eliteDraw.types[1], "an elite double drop must draw two distinct bag entries");

console.log("Loot fairness verified: bounded accumulation, <=13-kill drought, four-type bags and sustain within each opening pair.");
