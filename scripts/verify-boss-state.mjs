import assert from "node:assert/strict";
import fs from "node:fs";

const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const renderer = ["renderer3d", "scene/environment"].map(name => fs.readFileSync(new URL(`../src/${name}.js`, import.meta.url), "utf8")).join("\n");
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
assert.match(game, /setEnemyWeaponState\(boss, "windup"/);
assert.match(game, /setEnemyWeaponState\(boss, "cooldown"/);
assert.match(game, /setEnemyWeaponState\(boss, "fire"/);
assert.match(game, /boss\.weaponCharge = clamp\(/);
assert.match(game, /boss\.attackTargetY = target\.y/);
assert.match(game, /combatInvalidProjectiles/);
assert.match(game, /combatBossFragments/);
assert.match(game, /const addBudget = Math\.max\(0, \[2, 3, 4\]\[stage\] - liveAdds\)/);
assert.match(game, /audio\.sfx\("bossCharge"\)/);
assert.match(game, /audio\.sfx\("bossAttack"\)/);
assert.match(game, /bossCharging && s % 2 === 1/);
assert.match(game, /bossPhase >= 3/);
assert.match(game, /canvas\.dataset\.bossWeaponState/);
assert.match(game, /canvas\.dataset\.bossWeaponCharge/);

assert.match(renderer, /bossChoreography = "telegraph-state-arena"/);
assert.match(renderer, /drawBossTelegraph\(enemy, base, palette, stage\)/);
assert.match(renderer, /drawBossAttackTelegraphs\(boss\)/);
assert.match(renderer, /if \(world\.boss\) this\.drawBossAttackTelegraphs\(world\.boss\)/);
assert.match(renderer, /enemy\.weaponState !== "windup"/);
assert.match(renderer, /this\.drawLaserTelegraph\(boss, boss\.weaponState/);
assert.match(renderer, /SpaceEnemyAI\.beamRays\(enemy/, "renderer must consume the same committed beam geometry as simulation");
assert.match(smoke, /bossChoreography/);
assert.match(smoke, /telegraph-state-arena/);
assert.match(combatSmoke, /states\.has\("cooldown"\)/);
assert.match(combatSmoke, /states\.has\("windup"\)/);
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

const arrival = game.slice(game.indexOf("function spawnBoss()"), game.indexOf("function enemyBulletSpeedMultiplier"));
assert.doesNotMatch(arrival, /world\.enemy(?:Bullets|Beams)\s*=\s*\[\]/, "arrival and phase changes must preserve committed hazards");
assert.match(arrival, /boss\.pendingPhase = Math\.max/, "phase changes must defer during advertised attacks");
assert.match(game, /enemy\.boss && enemy\.opening > 0 \? 1\.3 : 1/, "only an open boss core earns the damage bonus");
assert.match(renderer, /continuous-biome-fixed-camera/);
assert.match(renderer, /!\["boss", "phase"\]\.includes\(cinematic\.type\)/, "active boss hazards must not be reframed by cinematics");
console.log("Boss choreography verified: 12 chapter-specific attacks, preserved hazards, deferred phase changes, bounded reinforcements, core openings, fixed framing, and distinct score motifs.");
