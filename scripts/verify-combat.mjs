import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const combatSource = fs.readFileSync(new URL("../src/combat.js", import.meta.url), "utf8");
const roguelikeSource = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(roguelikeSource, sandbox, { filename: "src/roguelike.js" });
vm.runInNewContext(combatSource, sandbox, { filename: "src/combat.js" });

const combat = sandbox.window.SpaceCombat;
assert.deepEqual([...combat.BEATS].map((beat) => beat.id), ["breach", "engage", "killzone", "release"]);
assert.deepEqual([...combat.CHAPTER_PROFILES].map((profile) => profile.id), ["academy", "crossfire", "predator"]);
assert.notDeepEqual([...combat.CHAPTER_PROFILES[0].bounds], [...combat.CHAPTER_PROFILES[1].bounds], "chapters need different beat widths");
assert.notDeepEqual([...combat.CHAPTER_PROFILES[1].bounds], [...combat.CHAPTER_PROFILES[2].bounds], "late combat cannot reuse the same rhythm window");
assert.equal(Object.keys(combat.ROLE_DOCTRINES).length, 7, "all seven hull roles need a doctrine");
assert.equal(combat.FORMATIONS.length, 6, "the tactical director needs six readable formation families");
for (const beat of combat.BEATS) {
  assert.match(beat.nameKey, /^combatBeat\./);
  assert.ok(beat.start >= 0 && beat.end <= 1 && beat.end > beat.start);
  assert.equal(i18nSource.split(`"${beat.nameKey}"`).length - 1, 2, `${beat.id} must be bilingual`);
}

const localProgress = (beatFraction) => (4 + beatFraction) / 9;
const breach = combat.curveFor(1, localProgress(.08));
const engage = combat.curveFor(1, localProgress(.3));
const killzone = combat.curveFor(1, localProgress(.68));
const release = combat.curveFor(1, localProgress(.9));
assert.equal(breach.beat.id, "breach");
assert.equal(engage.beat.id, "engage");
assert.equal(killzone.beat.id, "killzone");
assert.equal(release.beat.id, "release");
assert.ok(killzone.spawnRate > engage.spawnRate && engage.spawnRate > release.spawnRate, "each combat beat needs a pressure peak and release");
assert.ok(killzone.fireRate > breach.fireRate && killzone.bulletCap > release.bulletCap, "kill zones must intensify patterns within a bounded bullet budget");
assert.ok(combat.curveFor(2, .5).pressure > combat.curveFor(1, .5).pressure);
assert.ok(combat.curveFor(1, .5).pressure > combat.curveFor(0, .5).pressure, "chapter pressure must rise globally");
assert.ok(combat.curveFor(0, .02).spawnRate < combat.curveFor(0, .2).spawnRate, "the first seconds must retain a learnable ramp");
assert.ok(combat.curveFor(2, .99).bulletCap <= 130, "bullet grammar must stay under the ordinary-enemy performance budget");
const chapterVectors = [0, 1, 2].map((stage) => [.08, .34, .68, .9].map((fraction) => combat.curveFor(stage, localProgress(fraction)).pressure));
const ratioSpan = (later, earlier) => {
  const ratios = later.map((value, index) => value / earlier[index]);
  return Math.max(...ratios) - Math.min(...ratios);
};
assert.ok(ratioSpan(chapterVectors[1], chapterVectors[0]) > .08, "chapter two must reshape rather than proportionally scale chapter one");
assert.ok(ratioSpan(chapterVectors[2], chapterVectors[1]) > .045, "chapter three must reshape rather than proportionally scale chapter two");
assert.equal(combat.beatForProgress(localProgress(.2), 0).id, "breach");
assert.equal(combat.beatForProgress(localProgress(.2), 1).id, "engage");
assert.equal(combat.beatForProgress(localProgress(.8), 1).id, "release");
assert.equal(combat.beatForProgress(localProgress(.8), 2).id, "release", "chapter three needs a real recovery window");
assert.ok((combat.CHAPTER_PROFILES[2].bounds[2] - combat.CHAPTER_PROFILES[2].bounds[1]) * 70 <= 22, "late continuous peaks must not exceed 22 seconds");
assert.equal(combat.ambientEliteChance({ stageIndex: 0, progress: .249, beatId: "engage" }), 0, "chapter one must stay free of random elites until the first strategy draft");
assert.ok(combat.ambientEliteChance({ stageIndex: 0, progress: .25, beatId: "engage" }) >= .014, "ambient elites must begin appearing once the crew owns its first build card");
assert.ok(combat.ambientEliteChance({ stageIndex: 0, progress: .8, threatTier: 2, beatId: "killzone" }) <= .045, "academy random elites must remain rare beside three scripted elite events");
assert.ok(combat.ambientEliteChance({ stageIndex: 2, progress: .8, threatTier: 2, beatId: "killzone" }) >= .21, "late kill zones need a materially higher elite frequency");
assert.ok(combat.ambientEliteChance({ stageIndex: 2, progress: 1, threatTier: 2, beatId: "killzone" }) <= .24, "elite probability needs a bounded concurrency-safe ceiling");

for (const [role, doctrine] of Object.entries(combat.ROLE_DOCTRINES)) {
  for (const key of ["stationY", "engagementRange", "rangeBand", "entrySpeed", "lateral", "telegraph", "attack", "recover", "breakaway"]) assert.ok(doctrine[key] > 0, `${role}.${key} must be positive`);
  assert.ok(doctrine.engagementRange > doctrine.rangeBand * 3, `${role} needs a meaningful live-target standoff distance`);
  let state = "entry";
  const visited = new Set([state]);
  for (let step = 0; step < 8; step += 1) {
    state = combat.nextState(role, state);
    visited.add(state);
  }
  assert.ok(visited.has("position") && visited.has("telegraph") && visited.has("attack"), `${role} must enter telegraphed attacks`);
}

const patterns = new Set();
for (const role of Object.keys(combat.ROLE_DOCTRINES)) {
  for (const weaponId of ["pulse", "twin", "sniper", "orbit", "laser", "seeker", "bomb"]) {
    const weaponPattern = { laser: "laserLance", seeker: "hunterSeeker", bomb: "blastSeed" }[weaponId] || "";
    for (let tier = 0; tier <= 5; tier += 1) patterns.add(combat.patternFor({ role, weaponId, weaponPattern, patternTier: tier, cycle: tier }));
  }
}
for (const speciesPattern of ["laserSweep", "ramCharge", "proximityBloom"]) patterns.add(combat.patternFor({ role: "striker", weaponId: "pulse", speciesPattern, patternTier: 4, cycle: 0 }));
for (const required of ["snapBurst", "predictiveFan", "lance", "laneWall", "counterSpiral", "seedCluster", "pincer", "commandCross", "laserLance", "hunterSeeker", "blastSeed", "laserSweep", "ramCharge", "proximityBloom"]) assert.ok(patterns.has(required), `missing barrage grammar ${required}`);

const rng = sandbox.window.SpaceRoguelike.createRng(2501);
const lateFormations = new Set(Array.from({ length: 80 }, () => combat.chooseFormation({ stageIndex: 2, patternTier: 5, random: rng }).id));
assert.ok(lateFormations.size >= 5, "late combat must rotate through broad tactical formations");
for (const formation of combat.FORMATIONS) {
  assert.ok(formation.members.length >= 3);
  assert.equal(new Set(formation.members.map((member) => member.join(":"))).size, formation.members.length);
}

assert.match(indexSource, /src\/combat\.js\?v=2[\s\S]*src\/anomalies\.js/);
assert.match(gameSource, /COMBAT\.curveFor/);
assert.match(gameSource, /REQUESTED_QA_COMBAT_STAGE = LOCAL_QA_HOST \?/);
assert.match(gameSource, /REQUESTED_QA_COMBAT_PROGRESS = LOCAL_QA_HOST \?/);
assert.match(gameSource, /COMBAT\.nextState/);
assert.match(gameSource, /function leastCrowdedFormationCenter/);
assert.match(gameSource, /COMBAT\.ambientEliteChance/, "ambient elite frequency must use the tested combat curve");
assert.match(gameSource, /const baseHealth = \[420, 640, 920\]/, "boss durability must match the predator ecology baseline");
assert.match(gameSource, /stationYBias/);
assert.match(gameSource, /stationYBias: \(enemyId % 3 - 1\) \* 20/, "formation members must occupy three readable depth bands");
assert.match(gameSource, /enemy\.formationId \? \.34 : \.68/, "formations must follow the live target without collapsing onto one coordinate");
assert.match(gameSource, /target\.y - doctrine\.engagementRange \+ enemy\.stationYBias/, "enemy roles must pursue the live target while keeping their own standoff range");
assert.match(gameSource, /currentRange < doctrine\.engagementRange - doctrine\.rangeBand/, "enemy roles must back away when the player breaches their safe band");
assert.match(gameSource, /threatConfig\(\)\.fireRate \* anomalyConfig\(\)\.enemyFireRate \* combat\.fireRate/, "combat beats must change real attack cadence");
assert.match(gameSource, /function executeEnemyPattern/);
assert.match(gameSource, /behavior === "mine"/);
assert.match(gameSource, /behavior === "brake"/);
assert.match(gameSource, /behavior === "homing"/);
assert.match(gameSource, /behavior === "blast"/);
assert.match(gameSource, /function enemyBeam/);
assert.match(gameSource, /debuff: source\.debuff \|\| ""/, "laser beams must carry modular payloads");
assert.match(gameSource, /const angleDelta = Math\.atan2\(Math\.sin\(targetAngle - currentAngle\)/, "seekers must steer by angle without losing speed");
assert.match(gameSource, /const guidanceScale = lerp\(1, \.32, guidanceProgress \* guidanceProgress\)/, "seekers need a readable terminal juke window");
assert.match(gameSource, /targetedHoming[\s\S]*?perpendicularX[\s\S]*?dodgeSide/, "the solo wingmate must cut across targeted seekers instead of fleeing their turn arc");
assert.match(gameSource, /const academy = world\.stageIndex === 0;[\s\S]*?academy \? \(cluster \? 2 : 1\)[\s\S]*?homingDuration: academy \? \(cluster \? 1\.45 : 1\.7\)/, "chapter one must teach a bounded single-seeker dodge before later multi-locks");
assert.match(gameSource, /targetIndex: target\.index, pattern, behavior: tier >= 3 \? "homing"/, "every homing branch must preserve the player locked during telegraph");
assert.match(gameSource, /function telegraphedBeamSegments[\s\S]*?for \(const beam of world\.enemyBeams\) avoidBeamLine/, "the solo wingmate must evade both beam telegraphs and live laser geometry");
assert.match(gameSource, /enemy\.attackPattern === "laserLance"[\s\S]*?1\.12/, "single lasers need a longer readable warning floor");
assert.match(gameSource, /enemy\.attackPattern === "laserSweep"[\s\S]*?1\.28/, "sweeping lasers need the longest ordinary-enemy warning floor");
assert.match(gameSource, /enemy\.attackEndX = clamp[\s\S]*?enemy\.attackTargetX \+ dx \/ range \* 48/, "rammers must commit through the sampled lane instead of homing onto the pilot point");
assert.match(gameSource, /projectile\.triggerAge = clamp\(\(travelDistance - blastRadius \* \.58\) \/ Math\.max\(1, projectile\.baseSpeed\)/, "blast fuses must use their real post-multiplier travel speed");
assert.match(gameSource, /const blastProximity = bullet\.behavior === "blast"[\s\S]*?bullet\.blastRadius \* \.78/, "blast seeds need a reliable proximity fuse before direct-contact collapse");
assert.match(gameSource, /const blastProximity = bullet\.behavior === "blast" && !bullet\.anchored/, "anchored death blasts must preserve their full warning window");
assert.match(gameSource, /function triggerEnemyDeathrattle/);
assert.match(gameSource, /pattern: "death:blast"[\s\S]*?triggerAge: \.68[\s\S]*?anchored: true/, "collision species must leave a delayed local blast warning instead of dealing invisible instant death damage");
assert.match(gameSource, /pattern: "death:volatile"[\s\S]*?triggerAge: \.72[\s\S]*?anchored: true/, "volatile cores must expose a delayed danger zone");
assert.match(gameSource, /Math\.max\(3, enemy\.collisionDamage/, "body collisions must inflict major hull damage");
assert.match(gameSource, /const playerDamaged = damagePlayer\(player, impactDamage\)[\s\S]*?if \(playerDamaged && !enemy\.boss\)/, "invulnerable pilots must not gain free collision damage");
assert.match(gameSource, /budgetClass === "boss" \? 34 : budgetClass === "deathrattle" \? 12 : 0/, "boss fragments and deathrattles need bounded reserved projectile budgets");
assert.match(gameSource, /const hardCap = world\.combatBulletCap \+ Math\.max\(0, spawned\.budgetBonus \|\| 0\)/, "split projectiles must retain their source budget instead of collapsing to the ordinary cap");
assert.doesNotMatch(gameSource, /enemy\.attackCycle\s*>?=\s*3[^\n]*retreat/, "surviving enemies must not auto-retreat after a fixed attack count");
const spawnBossBody = gameSource.slice(gameSource.indexOf("function spawnBoss()"), gameSource.indexOf("function enterBossPhase"));
assert.doesNotMatch(spawnBossBody, /world\.enemies\s*=\s*\[\]/, "boss arrival must not erase surviving pursuers");
assert.match(gameSource, /const addBudget = Math\.max\(0, \[8, 10, 12\]\[stage\] - liveAdds\)/, "boss reinforcements need a hard concurrent cap while survivors remain active");
assert.match(gameSource, /updateStage\(dt\);[\s\S]*?if \(world\.clearTimer > 0\)[\s\S]*?input\.endFrame\(\);[\s\S]*?return;/, "stage-clear cinematics must freeze residual enemy damage after the boss is defeated");
assert.match(gameSource, /weaveAmplitude[\s\S]*enemy\.moveSway/, "weave movement must change real flight paths");
assert.match(gameSource, /other\.packId === enemy\.packId/, "pack AI must coordinate inside cohorts rather than across the entire battlefield");
assert.match(gameSource, /dataset\.combatStateTransitions/);
assert.match(gameSource, /dataset\.aiIntent/);
assert.match(gameSource, /player\.aiIntent = "resupply"/, "solo wing AI must recognize reachable sustain pickups");
assert.match(gameSource, /healthRatio <= \.72/, "low-health crews must receive deterministic resupply priority");
assert.match(gameSource, /dataset\.enemyOverlapPairs/);
assert.match(gameSource, /dataset\.enemyClosePairs/);
assert.match(gameSource, /dataset\.enemyMinClearance/);
assert.match(gameSource, /dataset\.enemySpread/);
assert.match(gameSource, /dataset\.enemyStandoffError/);
assert.match(gameSource, /dataset\.enemyTelegraphPatterns/);
assert.match(gameSource, /dataset\.enemyTelegraphTargets/);
assert.match(gameSource, /dataset\.playerMaxHp/);
assert.match(gameSource, /dataset\.playerPosition/);
assert.match(gameSource, /dataset\.playerDamageTaken/);
assert.match(gameSource, /dataset\.playerDowned/);
assert.match(gameSource, /dataset\.playerDownCount/);
assert.match(gameSource, /dataset\.playerRescueCount/);
for (const diagnostic of ["enemyBeams", "enemyHomingBullets", "enemyBlastBullets", "enemyHomingSpeed", "enemyBeamFinite", "combatLaserHits", "combatHomingHits", "combatBlastHits", "combatDeathrattles", "combatBodyCollisions", "combatInvalidProjectiles", "combatBossFragments", "combatHardBulletCap", "bossAddCap", "bossAdds", "ambientEliteSpawns", "enemySpecies", "enemyNativeCount", "enemyMaxCycles", "enemyAiDoctrines"]) assert.match(gameSource, new RegExp(`dataset\\.${diagnostic}`), `missing combat diagnostic ${diagnostic}`);
assert.match(gameSource, /enemy\.aiModule === "pack"/);
assert.match(gameSource, /enemy\.aiModule === "ambusher"/);
assert.match(gameSource, /dataset\.enemyScanLayout = "edge-compact"/, "variant discovery must stay outside the central fire lane");
assert.match(gameSource, /dataset\.enemyScanBounds = "8,64,158,34"/, "enemy scan diagnostics must preserve the compact edge bounds");
assert.match(rendererSource, /drawEnemyTelegraph/);
const ordinaryTelegraph = rendererSource.slice(rendererSource.indexOf("  drawEnemyTelegraph("), rendererSource.indexOf("  drawEnemy("));
assert.doesNotMatch(ordinaryTelegraph, /attackTargetX[\s\S]*?voxelSegment/, "ordinary telegraphs must not draw a tether from every enemy to the player");
assert.match(rendererSource, /laserTelegraphRays\(enemy\)/);
assert.match(rendererSource, /drawLaserTelegraph\(enemy, charge\)/);
assert.match(rendererSource, /drawRamTelegraph\(enemy, charge\)/);
assert.match(rendererSource, /voxelEllipse\(warningBase, radiusX, radiusZ/, "blast fuses must show their actual local danger footprint");
assert.match(rendererSource, /laserVfx = "layered-core-edge-packets"/);
assert.match(rendererSource, /warningGrammar = "local-charge-laser-sight-ram-chevrons-blast-rings"/);
assert.match(rendererSource, /enemySpacing = "live-target-standoff"/);
assert.match(rendererSource, /enemyTactics = "role-doctrine-6-state"/);
assert.match(rendererSource, /bulletGrammar = "locked-safe-lanes-curves-mines-lasers-seekers-blasts"/);

console.log(`Combat doctrine verified: four-beat pressure waves, seven live-target standoff roles, ${patterns.size} barrage patterns, six formations, laser-only sights, local ram/blast warnings, bounded bullet budgets, and layered WebGL beams.`);
