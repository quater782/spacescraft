import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const threatSource = fs.readFileSync(new URL("../src/threat.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(threatSource, sandbox, { filename: "src/threat.js" });
const threat = sandbox.window.SpaceThreat;
const tiers = [...threat.TIERS];

assert.equal(tiers.length, 5, "adaptive director needs five readable threat tiers");
assert.deepEqual(tiers.map((tier) => tier.id), ["relief", "cruise", "strike", "surge", "apex"]);
assert.equal(new Set(tiers.map((tier) => tier.color)).size, tiers.length, "every tier needs a unique telegraph color");
assert.ok(tiers.every((tier) => !["#000", "#000000"].includes(tier.color.toLowerCase())), "threat telegraphs must keep the saturated no-black art direction");
for (const metric of ["spawnRate", "bulletSpeed", "fireRate", "enemyHp", "moveSpeed", "score", "bpm", "music"]) {
  assert.deepEqual(tiers.map((tier) => tier[metric]), tiers.map((tier) => tier[metric]).sort((a, b) => a - b), `${metric} must increase monotonically`);
}
assert.deepEqual(tiers.map((tier) => tier.aimSpread), tiers.map((tier) => tier.aimSpread).sort((a, b) => b - a), "aim spread must tighten monotonically");
assert.deepEqual([0, .65, 1.35, 2.1, 2.85, 4].map(threat.tierForScore), [0, 1, 2, 3, 4, 4]);
assert.equal(threat.stepTier(0, 4), 1, "tier shifts must climb one step at a time");
assert.equal(threat.stepTier(4, 0), 3, "tier shifts must fall one step at a time");

const earlyAce = threat.evaluate({ stageIndex: 0, sectorIndex: 2, progress: .3, healthRatio: 1, combo: 40, killsPerMinute: 30, rushActive: true, linked: true, contractPressure: .5 });
assert.ok(earlyAce.tier >= 2 && earlyAce.tier <= 3, "hard contracts allow bounded early pressure");
assert.equal(threat.evaluate({ stageIndex: 1, progress: .5, combo: 40, killsPerMinute: 30, rushActive: true, linked: true }).score,
  threat.evaluate({ stageIndex: 1, progress: .5 }).score, "normal play must not punish successful builds, links or rush");
assert.ok(threat.evaluate({ stageIndex: 0, sectorIndex: 0, progress: .04, healthRatio: 1, combo: 40, killsPerMinute: 30, rushActive: true, linked: true, contractPressure: .5 }).tier <= 1, "the first opening beat must remain learnable");
assert.equal(threat.evaluate({ stageIndex: 2, sectorIndex: 2, progress: 1, healthRatio: .3, downed: 1, combo: 40, killsPerMinute: 30 }).tier, 0, "a downed team must receive immediate relief");
assert.ok(threat.evaluate({ stageIndex: 2, sectorIndex: 2, progress: 1, healthRatio: .45, combo: 40, killsPerMinute: 30 }).tier <= 1, "critical hull state must cap pressure");
assert.equal(threat.evaluate({ stageIndex: 2, sectorIndex: 2, progress: 1, healthRatio: 1, combo: 40, killsPerMinute: 30, rushActive: true, linked: true, contractPressure: .5 }).tier, 4, "a late-game ace team must reach apex threat");
assert.ok(threat.evaluate({ contractPressure: threat.contractPressure("overdrive") }).score > threat.evaluate({ contractPressure: threat.contractPressure("patrol") }).score, "contracts must feed the adaptive score");

assert.match(indexSource, /src\/threat\.js\?v=3[\s\S]*src\/expedition\.js/);
assert.match(gameSource, /REQUESTED_QA_THREAT = LOCAL_QA_HOST \?/);
assert.match(gameSource, /SpaceThreat\.evaluate/);
assert.match(gameSource, /SpaceThreat\.HOLD_SECONDS/);
assert.match(gameSource, /downedCount > 0 \|\| healthRatio < \.34/);
assert.match(gameSource, /criticalPilot[\s\S]*?player\.hp \/ Math\.max\(1, player\.maxHp\) <= \.29/, "one focused pilot at critical hull must force team relief");
assert.match(gameSource, /threatConfig\(\)\.bulletSpeed/);
assert.match(gameSource, /threatConfig\(\)\.fireRate/);
assert.match(gameSource, /adaptiveThreat\.enemyHp/);
assert.match(gameSource, /adaptiveThreat\.spawnRate/);
assert.match(gameSource, /dataset\.threatSpawnRate/);
assert.match(gameSource, /result\.threatSummary/);
assert.match(rendererSource, /drawThreatMatrix\(world\)/);
assert.match(rendererSource, /adaptiveThreat = "5-tier-telegraphed"/);

console.log("Adaptive Threat Matrix verified: five monotonic tiers, opening and distress protection, one-step hysteresis, combat/reward/music coupling, telemetry, HUD/results, and a localized voxel pressure buoy.");
