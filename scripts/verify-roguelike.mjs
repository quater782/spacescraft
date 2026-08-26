import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/roguelike.js" });

const { UPGRADE_DEFS, createRng, rollDraftOptions, applyUpgradeToPlayer } = sandbox.window.SpaceRoguelike;
const categories = ["armament", "mobility", "system"];
const rarities = ["common", "rare", "legendary"];

assert.equal(UPGRADE_DEFS.length, 15, "the v0.8 pool must contain 15 upgrades");
assert.equal(new Set(UPGRADE_DEFS.map((upgrade) => upgrade.id)).size, UPGRADE_DEFS.length, "upgrade IDs must be unique");
for (const upgrade of UPGRADE_DEFS) {
  assert.ok(categories.includes(upgrade.category), `${upgrade.id} has an invalid category`);
  assert.ok(rarities.includes(upgrade.rarity), `${upgrade.id} has an invalid rarity`);
  assert.ok(Number.isInteger(upgrade.max) && upgrade.max >= 1, `${upgrade.id} has an invalid max level`);
  assert.match(upgrade.nameKey, /^upgrade\.[^.]+\.name$/);
  assert.match(upgrade.descriptionKey, /^upgrade\.[^.]+\.description$/);
}

const sequenceFor = (seed) => {
  const random = createRng(seed);
  const levels = {};
  return Array.from({ length: 8 }, (_, stageIndex) => {
    const options = rollDraftOptions({ levels, stageIndex: stageIndex % 3, random });
    const selected = options[stageIndex % options.length];
    levels[selected.id] = (levels[selected.id] || 0) + 1;
    return options.map((upgrade) => upgrade.id).join(",");
  });
};

assert.deepEqual(sequenceFor(20260826), sequenceFor(20260826), "same seed must reproduce the same draft sequence");
assert.notDeepEqual(sequenceFor(20260826), sequenceFor(20260827), "different seeds should produce a different draft sequence");

const standardOptions = rollDraftOptions({ levels: {}, stageIndex: 0, random: createRng(8080) });
assert.equal(standardOptions.length, 3);
assert.deepEqual([...standardOptions].map((upgrade) => upgrade.category), categories, "a normal draft must offer one option per category");
assert.equal(new Set(standardOptions.map((upgrade) => upgrade.id)).size, 3, "draft options must not repeat");

const cappedLevels = Object.fromEntries(UPGRADE_DEFS.filter((upgrade) => upgrade.category === "armament").map((upgrade) => [upgrade.id, upgrade.max]));
const fallbackOptions = rollDraftOptions({ levels: cappedLevels, stageIndex: 2, random: createRng(42) });
assert.equal(fallbackOptions.length, 3, "fallback draft must remain full when one category is exhausted");
assert.ok(fallbackOptions.every((upgrade) => (cappedLevels[upgrade.id] || 0) < upgrade.max), "maxed upgrades must be excluded");
assert.equal(new Set(fallbackOptions.map((upgrade) => upgrade.id)).size, 3, "fallback options must remain unique");

const rarityCounts = { common: 0, rare: 0, legendary: 0 };
const distributionRng = createRng(777);
for (let i = 0; i < 20_000; i += 1) {
  const [armament] = rollDraftOptions({ levels: {}, stageIndex: 0, random: distributionRng });
  rarityCounts[armament.rarity] += 1;
}
assert.ok(rarityCounts.common > rarityCounts.rare && rarityCounts.rare > rarityCounts.legendary, "early rarity weighting must preserve common > rare > legendary");

const freshPlayer = () => ({
  fireRate: 1,
  damage: 1,
  projectileSpeed: 180,
  weaponFloor: 0,
  weapon: 1,
  pierce: 0,
  droneLevel: 0,
  chainDamage: 0,
  speed: 90,
  handling: 18,
  r: 6,
  hitInvulnerability: 1.8,
  shieldRegenInterval: 0,
  shieldRegenTimer: Number.POSITIVE_INFINITY,
  maxHp: 7,
  hp: 5,
  energyGain: 1,
  novaDamage: 1,
  linkRange: 105,
  beamDamage: 1,
  pickupMagnetRadius: 0,
});

for (const upgrade of UPGRADE_DEFS) {
  const player = freshPlayer();
  const before = { ...player };
  applyUpgradeToPlayer(player, upgrade.id, 1);
  assert.notDeepEqual(player, before, `${upgrade.id} must change at least one player property`);
  for (const [key, value] of Object.entries(player)) {
    if (typeof value === "number") assert.ok(!Number.isNaN(value), `${upgrade.id} produced NaN in ${key}`);
  }
}
const stackedPlayer = freshPlayer();
applyUpgradeToPlayer(stackedPlayer, "overclock", 1);
applyUpgradeToPlayer(stackedPlayer, "overclock", 2);
assert.ok(Math.abs(stackedPlayer.fireRate - 1.16 ** 2) < 1e-10, "multiplicative upgrades must stack");
applyUpgradeToPlayer(stackedPlayer, "magnet", 1);
applyUpgradeToPlayer(stackedPlayer, "magnet", 2);
assert.equal(stackedPlayer.pickupMagnetRadius, 105, "tractor range must use diminishing stacking");
assert.throws(() => applyUpgradeToPlayer(stackedPlayer, "missing", 1), /Unknown upgrade/);

assert.match(gameSource, /visualRandom = SpaceRoguelike\.createRng/);
assert.match(gameSource, /function makeStars\(\)[\s\S]*?visualRand/);
assert.match(gameSource, /function burst\([\s\S]*?visualRand/);
assert.match(gameSource, /SpaceRoguelike\.rollDraftOptions/);
assert.match(gameSource, /SpaceRoguelike\.applyUpgradeToPlayer/);

console.log(`Roguelike verified: ${UPGRADE_DEFS.length} upgrade effects, deterministic drafts, max-level filtering, category coverage, rarity weighting, isolated visual RNG.`);
