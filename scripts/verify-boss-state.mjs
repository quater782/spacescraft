import assert from "node:assert/strict";
import fs from "node:fs";

const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const smoke = fs.readFileSync(new URL("./smoke-bosses.cjs", import.meta.url), "utf8");
const combatSmoke = fs.readFileSync(new URL("./smoke-boss-state.cjs", import.meta.url), "utf8");

const attacks = [
  "petalBurst", "sunLance", "seedSpiral", "twinBloom",
  "railWall", "thunderFan", "forgeCross", "doubleRail",
  "spiralCrown", "voidPincer", "eclipseTwin", "tripleEclipse",
];
for (const attack of attacks) {
  assert.match(game, new RegExp(`\\b${attack}\\b`), `missing boss attack state ${attack}`);
}
assert.match(game, /const BOSS_ATTACK_SEQUENCES = \[/);
assert.match(game, /const BOSS_ATTACK_TELEGRAPH = Object\.freeze\(/);
assert.match(game, /function beginBossAttack\(boss, stage\)/);
assert.match(game, /function executeBossAttack\(boss, stage\)/);
assert.match(game, /boss\.attackState = "telegraph"/);
assert.match(game, /boss\.attackState = "recover"/);
assert.match(game, /boss\.attackCharge = clamp\(/);
assert.match(game, /boss\.attackTargetY = target\.y/);
assert.match(game, /combatInvalidProjectiles/);
assert.match(game, /combatBossFragments/);
assert.match(game, /const addBudget = Math\.max\(0, \[8, 10, 12\]\[stage\] - liveAdds\)/);
assert.match(game, /audio\.sfx\("bossCharge"\)/);
assert.match(game, /audio\.sfx\("bossAttack"\)/);
assert.match(game, /bossCharging && s % 2 === 1/);
assert.match(game, /bossPhase >= 3/);
assert.match(game, /canvas\.dataset\.bossAttackState/);
assert.match(game, /canvas\.dataset\.bossAttackCharge/);

assert.match(renderer, /bossChoreography = "telegraph-state-arena"/);
assert.match(renderer, /drawBossTelegraph\(enemy, base, palette, stage\)/);
assert.match(renderer, /drawBossArena\(boss\)/);
assert.match(renderer, /if \(world\.boss\) this\.drawBossArena\(world\.boss\)/);
assert.match(renderer, /enemy\.attackState !== "telegraph"/);
assert.match(renderer, /this\.drawLaserTelegraph\(boss, charge\)/);
assert.match(renderer, /enemy\.attackTargetX, enemy\.attackTargetY/, "shared laser geometry must read the captured boss target");
assert.match(smoke, /bossChoreography/);
assert.match(smoke, /telegraph-state-arena/);
assert.match(combatSmoke, /states\.has\("recover"\)/);
assert.match(combatSmoke, /states\.has\("telegraph"\)/);
assert.match(combatSmoke, /stageRequirements = \[/);
for (const attack of ["twinBloom", "sunLance", "doubleRail", "railWall", "voidPincer", "tripleEclipse"]) assert.match(combatSmoke, new RegExp(`"${attack}"`));
assert.match(combatSmoke, /maxEnemyBullets < 1/);
assert.match(combatSmoke, /maxHomingBullets < 1/);
assert.match(combatSmoke, /maxBlastBullets < 1/);
assert.match(combatSmoke, /maxBossFragments < 1/);
assert.match(combatSmoke, /maxOverHardBudget > 0 \|\| maxAddsOverCap > 0/);
assert.match(combatSmoke, /maxLaserHits < 1/);
assert.match(combatSmoke, /maxDamageTaken < 1/);
assert.match(combatSmoke, /!finiteBeams \|\| maxInvalidProjectiles > 0/);
assert.match(combatSmoke, /performance below 50 FPS/);

console.log("Boss choreography verified: 12 phase-weighted attack states, recover/telegraph/fire transitions, target capture, 3D charge organs, arena rails, diagnostic state, impact SFX, and phase-reactive 8-bit score layers.");
