import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/roguelike.js" });

const api = sandbox.window.SpaceRoguelike;
const { PATHS, OPENING_SURVIVAL_IDS, UPGRADE_DEFS, createRng, createRngStreams, rollDraftOptions, applyUpgradeToPlayer, growthScore } = api;
const originalIds = ["overclock", "rail", "prism", "piercing", "drone", "chain", "turbo", "gyro", "phase", "aegisCycle", "nanites", "capacitor", "novaCore", "resonanceArray", "magnet"];
const newIds = ["novaHarvester", "novaAegis", "novaPurifier", "rushRelay", "rushSalvage", "rushOverdrive", "rushGuard", "novaEcho"];
const schedule = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2];

assert.equal(UPGRADE_DEFS.length, 23, "the controlled-build pool must contain 23 upgrades");
assert.deepEqual([...PATHS], ["armament", "mobility", "nova", "rush"]);
assert.ok([...originalIds, ...newIds].every((id) => UPGRADE_DEFS.some((upgrade) => upgrade.id === id)), "all stable and new IDs must exist");
assert.equal(new Set(UPGRADE_DEFS.map((upgrade) => upgrade.id)).size, UPGRADE_DEFS.length);
for (const [id, definition] of Object.entries(api.TASKS)) {
  const card = UPGRADE_DEFS.find(card => card.id === id);
  assert.equal(card.max, 1, "auto-evolution must not cost a second pick");
  assert.equal(api.eligibleUpgrade(card, {}, 2), false, "no new mission cards in the final chapter");
  assert.equal(api.eligibleUpgrade(card, {}, 0, { a: { complete: false }, b: { complete: false } }), false);
  const task = { progress: 0, complete: false, lastToken: null };
  assert.equal(api.advanceTask(task, definition, "unrelated", 1), false);
  for (let token = 1; token <= definition.goal; token++) {
    assert.equal(api.advanceTask(task, definition, definition.event, token), token === definition.goal);
    assert.equal(api.advanceTask(task, definition, definition.event, token), false);
    assert.equal(task.progress, token);
  }
  assert.equal(api.advanceTask(task, definition, definition.event, 100), false);
  assert.equal(task.progress, definition.goal);
}
for (const upgrade of UPGRADE_DEFS) {
  assert.ok(PATHS.includes(upgrade.path), `${upgrade.id} has an invalid build path`);
  assert.ok(["armament", "mobility", "system"].includes(upgrade.category), `${upgrade.id} has an invalid display category`);
  assert.ok(["common", "rare", "legendary"].includes(upgrade.rarity), `${upgrade.id} has an invalid rarity`);
  assert.ok(Number.isInteger(upgrade.max) && upgrade.max >= 1, `${upgrade.id} has an invalid max level`);
  assert.match(upgrade.nameKey, /^upgrade\.[^.]+\.name$/);
  assert.match(upgrade.descriptionKey, /^upgrade\.[^.]+\.description$/);
}

function simulate(seed, policy = "random", combatNoise = 0) {
  const streams = createRngStreams(seed);
  const levels = {};
  const offers = [];
  const picks = [];
  for (let draftIndex = 0; draftIndex < schedule.length; draftIndex += 1) {
    for (let noise = 0; noise < combatNoise + draftIndex; noise += 1) streams.combat();
    const options = rollDraftOptions({ levels, stageIndex: schedule[draftIndex], draftIndex, offerHistory: offers, pickHistory: picks, random: streams.draft });
    assert.equal(options.length, 3, `seed ${seed} draft ${draftIndex} must remain a full three-choice offer`);
    assert.equal(new Set(options.map((upgrade) => upgrade.id)).size, 3, `seed ${seed} draft ${draftIndex} must be unique`);
    assert.ok(options.every((upgrade) => (levels[upgrade.id] || 0) < upgrade.max), `seed ${seed} draft ${draftIndex} offered a maxed card`);
    assert.ok(options.every((upgrade) => api.eligibleUpgrade(upgrade, levels)), 'prerequisite cards must not appear before their core');
    offers.push(options.map((upgrade) => upgrade.id));
    let choice;
    if (policy === "focus") {
      const focus = picks.length ? api.focusPath(picks) : options[0].path;
      choice = options.find((upgrade) => upgrade.path === focus) || options[0];
    } else if (policy === "rarity") {
      const rank = { common: 1, rare: 2, legendary: 3 };
      choice = options.reduce((best, upgrade) => rank[upgrade.rarity] > rank[best.rarity] ? upgrade : best);
    } else {
      choice = options[Math.floor(streams.loot() * options.length)];
    }
    levels[choice.id] = (levels[choice.id] || 0) + 1;
    picks.push(choice.id);
  }
  return { levels, offers, picks, score: growthScore(levels) };
}

const reproducible = simulate(20260902, "focus");
assert.deepEqual(simulate(20260902, "focus"), reproducible, "same seed and decisions must reproduce the full build");
assert.notDeepEqual(simulate(20260903, "focus").offers, reproducible.offers, "different seeds should retain discovery variation");
const noisy = simulate(20260902, "focus", 8000);
assert.deepEqual(noisy.offers, reproducible.offers, "combat RNG noise must not perturb the isolated draft stream");
assert.deepEqual(noisy.picks, reproducible.picks, "combat RNG noise must not perturb build decisions");

for (let seed = 1; seed <= 2000; seed += 1) {
  const result = simulate(seed, "focus");
  const openingPaths = new Set(result.offers.slice(0, 2).flat().map((id) => UPGRADE_DEFS.find((upgrade) => upgrade.id === id).path));
  assert.equal(openingPaths.size, 4, `seed ${seed} must expose all four paths in the opening two drafts`);
  assert.ok(result.offers[0].some((id) => OPENING_SURVIVAL_IDS.includes(id)), `seed ${seed} first draft must include direct sustain or damage avoidance`);
  for (let pair = 0; pair < schedule.length; pair += 2) {
    const pairUpgrades = result.offers.slice(pair, pair + 2).flat().map((id) => UPGRADE_DEFS.find((upgrade) => upgrade.id === id));
    assert.ok(pairUpgrades.some((upgrade) => upgrade.rarity !== "common"), `seed ${seed} drafts ${pair + 1}-${pair + 2} need a rare-or-better offer`);
  }
  const firstSeven = result.offers.slice(4, 7).flat().map((id) => UPGRADE_DEFS.find((upgrade) => upgrade.id === id));
  assert.ok(firstSeven.some((upgrade) => upgrade.rarity !== "common"), `seed ${seed} needs a usable rare evolution offer during drafts 5-7`);
  for (let draft = 1; draft < result.offers.length; draft += 1) {
    assert.notEqual(result.offers[draft][2], result.offers[draft - 1][2], `seed ${seed} repeated the discovery slot`);
    const focus = api.focusPath(result.picks.slice(0, draft));
    assert.ok(result.offers[draft].some((id) => UPGRADE_DEFS.find((upgrade) => upgrade.id === id).path === focus), `seed ${seed} lost its focus continuation`);
  }
}

const percentile = (sorted, fraction) => sorted[Math.floor((sorted.length - 1) * fraction)];
for (const policy of ["random", "focus", "rarity"]) {
  const scores = [];
  for (let seed = 1; seed <= 2000; seed += 1) scores.push(simulate(seed, policy).score);
  scores.sort((a, b) => a - b);
  const p10 = percentile(scores, .1);
  const p90 = percentile(scores, .9);
  assert.ok(p90 / p10 <= 1.12, `${policy} seed variance exceeded the P90/P10 fairness ceiling: ${p10} -> ${p90}`);
}

const freshPlayer = () => ({
  fireRate: 1, damage: 1, projectileSpeed: 180, weaponFloor: 0, weapon: 1, pierce: 0,
  droneLevel: 0, droneVolley: 0, chainDamage: 0, burstCadence: 0, prismEcho: 0,
  speed: 90, handling: 18, r: 6, hitInvulnerability: .65, shieldRegenInterval: 0,
  shieldRegenTimer: Number.POSITIVE_INFINITY, maxShield: 3, shield: 0, maxHp: 7, hp: 5,
  novaChargeRate: 1, novaDamage: 1, novaRadiusBonus: 0, linkRange: 105,
  rushLinkedChargeRate: 1, rushFireRate: 1, rushDamage: 1, pickupMagnetRadius: 0,
});
for (const upgrade of UPGRADE_DEFS) {
  const player = freshPlayer();
  const before = { ...player };
  applyUpgradeToPlayer(player, upgrade.id, 1);
  assert.notDeepEqual(player, before, `${upgrade.id} must change the player build`);
  assert.ok(Object.values(player).every((value) => typeof value !== "number" || !Number.isNaN(value)), `${upgrade.id} produced NaN`);
  for (let rank = 2; rank <= upgrade.max; rank += 1) applyUpgradeToPlayer(player, upgrade.id, rank);
  const maxed = structuredClone(player);
  applyUpgradeToPlayer(player, upgrade.id, upgrade.max);
  assert.deepEqual(structuredClone(player), maxed, `${upgrade.id} repeated application must be idempotent`);
  assert.ok(Object.values(api.tierStats(upgrade.id, upgrade.max)).every(Number.isFinite), `${upgrade.id} needs finite shared display/execution parameters`);
}

const ceilings = freshPlayer();
for (let level = 1; level <= 3; level += 1) applyUpgradeToPlayer(ceilings, "overclock", level);
for (let level = 1; level <= 3; level += 1) applyUpgradeToPlayer(ceilings, "rail", level);
for (let level = 1; level <= 2; level += 1) applyUpgradeToPlayer(ceilings, "phase", level);
for (let level = 1; level <= 3; level += 1) applyUpgradeToPlayer(ceilings, "capacitor", level);
for (let level = 1; level <= 3; level += 1) applyUpgradeToPlayer(ceilings, "novaCore", level);
for (let level = 1; level <= 3; level += 1) applyUpgradeToPlayer(ceilings, "resonanceArray", level);
assert.ok(ceilings.primaryRateBonus === .3 && ceilings.damage === 1 && ceilings.heavyDamage === 2.4, "ordinary fire growth exceeded its ceiling");
assert.ok(ceilings.hitInvulnerability <= .79 + 1e-9, "run upgrades exceeded their invulnerability budget");
assert.ok(Math.abs(ceilings.novaChargeRate - 1.45) < 1e-9 && ceilings.novaDamage <= 1.45 + 1e-9, "capacitor must strengthen charging without inflating Nova damage");
assert.equal(ceilings.novaRadiusBonus, 36, "each core level must widen both local radii");
assert.ok(ceilings.rushLinkedChargeRate <= 1.6 + 1e-9, "rush charge growth exceeded its ceiling");
assert.throws(() => applyUpgradeToPlayer(ceilings, "missing", 1), /Unknown upgrade/);

assert.match(gameSource, /SpaceRoguelike\.rollDraftOptions/);
assert.match(gameSource, /SpaceRoguelike\.applyUpgradeToPlayer/);
assert.doesNotMatch(gameSource, /Math\.min\(4, player\.weapon/, "all rewards must preserve the three-way volley ceiling");

console.log("Roguelike verified: 23 stable-path cards, four-path opening coverage, focus continuation, rarity/legendary pity, isolated RNG streams, bounded effects, and 2k-seed P90/P10 fairness.");
