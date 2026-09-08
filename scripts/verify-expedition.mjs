import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const roguelikeSource = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const directorSource = fs.readFileSync(new URL("../src/director.js", import.meta.url), "utf8");
const expeditionSource = fs.readFileSync(new URL("../src/expedition.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(roguelikeSource, sandbox, { filename: "src/roguelike.js" });
vm.runInNewContext(directorSource, sandbox, { filename: "src/director.js" });
vm.runInNewContext(expeditionSource, sandbox, { filename: "src/expedition.js" });

const expedition = sandbox.window.SpaceExpedition;
const { createRng } = sandbox.window.SpaceRoguelike;
const { BIOMES, HULL_MODULES, MOVEMENT_MODULES, WEAPON_MODULES, CORE_MODULES, AI_MODULES, PAYLOAD_MODULES, PATH_PROTOCOLS, ENCOUNTER_PROTOCOLS } = expedition;

assert.equal(BIOMES.length, 9, "v0.9 must ship nine ecosystems");
assert.equal(new Set(BIOMES.map((biome) => biome.id)).size, 9, "ecosystem IDs must be unique");
for (let stageIndex = 0; stageIndex < 3; stageIndex += 1) {
  assert.equal(BIOMES.filter((biome) => biome.stageIndex === stageIndex).length, 3, `stage ${stageIndex + 1} must have three ecosystem variants`);
}
for (const biome of BIOMES) {
  assert.match(biome.nameKey, /^biome\.[^.]+\.name$/);
  assert.match(biome.descriptionKey, /^biome\.[^.]+\.description$/);
  for (const color of [biome.sky, biome.haze, biome.grid, biome.star, biome.accent, biome.secondary]) assert.match(color, /^#[0-9a-f]{6}$/i);
  for (const value of [biome.enemyHp, biome.spawnRate, biome.bulletSpeed, biome.bpmOffset, biome.musicShift]) assert.ok(Number.isFinite(value));
  assert.ok(HULL_MODULES.some((hull) => hull.id === biome.speciesId && hull.nativeBiome === biome.id), `${biome.id} needs a dedicated native species`);
  assert.ok(WEAPON_MODULES.some((weapon) => weapon.id === biome.preferredWeapon), `${biome.id} needs a valid signature weapon`);
}

assert.deepEqual([...expedition.generateRoute(20260827)].map((biome) => biome.id), [...expedition.generateRoute(20260827)].map((biome) => biome.id), "same seed must reproduce the ecosystem route");
assert.notDeepEqual([...expedition.generateRoute(20260826)].map((biome) => biome.id), [...expedition.generateRoute(20260827)].map((biome) => biome.id), "different seeds should produce different ecosystem routes");
for (const [stageIndex, biome] of [...expedition.generateRoute(42)].entries()) assert.equal(biome.stageIndex, stageIndex, "route ecosystems must match their stage slot");

assert.equal(PATH_PROTOCOLS.length, 7, "v0.10 must ship seven branch protocols");
assert.equal(new Set(PATH_PROTOCOLS.map((path) => path.id)).size, PATH_PROTOCOLS.length, "path IDs must be unique");
for (const path of PATH_PROTOCOLS) {
  assert.ok(["support", "offense", "hazard"].includes(path.group));
  assert.match(path.color, /^#[0-9a-f]{6}$/i);
  assert.match(path.nameKey, /^path\.[^.]+\.name$/);
  assert.match(path.descriptionKey, /^path\.[^.]+\.description$/);
  assert.match(path.riskKey, /^path\.[^.]+\.risk$/);
  assert.match(path.rewardKey, /^path\.[^.]+\.reward$/);
  for (const value of [path.enemyHp, path.spawnRate, path.bulletSpeed, path.score, path.bpmOffset, path.musicShift]) assert.ok(Number.isFinite(value));
  assert.ok(Object.keys(path.reward).length > 0, `${path.id} must grant a tangible reward`);
}
const branchIds = (seed) => [...expedition.generateBranchSets(seed)].map((set) => set.map((path) => path.id));
assert.deepEqual(branchIds(20260827), branchIds(20260827), "same seed must reproduce all branch gates");
assert.notDeepEqual(branchIds(20260826), branchIds(20260827), "different seeds should rearrange branch gates");
for (const options of expedition.generateBranchSets(20260827)) {
  assert.equal(options.length, 3);
  assert.equal(new Set(options.map((path) => path.id)).size, 3, "a gate set must not repeat paths");
  assert.deepEqual(new Set(options.map((path) => path.group)), new Set(["support", "offense", "hazard"]), "every gate set must offer support, offense, and hazard choices");
}
assert.deepEqual({ ...expedition.evaluateGateChoice([82, 96]) }, { selectedIndex: 0, converged: true });
assert.deepEqual({ ...expedition.evaluateGateChoice([225, 252]) }, { selectedIndex: 1, converged: true });
assert.deepEqual({ ...expedition.evaluateGateChoice([185, 295]) }, { selectedIndex: 1, converged: false });
assert.deepEqual({ ...expedition.evaluateGateChoice([88, 392]) }, { selectedIndex: 1, converged: false });
assert.deepEqual({ ...expedition.evaluateGateChoice([]) }, { selectedIndex: 1, converged: false });

assert.equal(ENCOUNTER_PROTOCOLS.length, 5, "v0.11 must ship five dynamic encounter types");
assert.equal(new Set(ENCOUNTER_PROTOCOLS.map((encounter) => encounter.id)).size, 5, "encounter IDs must be unique");
assert.equal(new Set(ENCOUNTER_PROTOCOLS.map((encounter) => encounter.kind)).size, 5, "every encounter must have distinct play rules");
for (const encounter of ENCOUNTER_PROTOCOLS) {
  assert.match(encounter.color, /^#[0-9a-f]{6}$/i);
  assert.match(encounter.nameKey, /^encounter\.[^.]+\.name$/);
  assert.match(encounter.descriptionKey, /^encounter\.[^.]+\.description$/);
  assert.match(encounter.objectiveKey, /^encounter\.[^.]+\.objective$/);
  assert.match(encounter.rewardKey, /^encounter\.[^.]+\.reward$/);
  assert.ok(encounter.duration > 0 && encounter.goal > 0 && encounter.spawnRate > 0);
  assert.ok(Number.isInteger(encounter.minStage) && encounter.minStage >= 0 && encounter.minStage <= 2);
  assert.ok(Object.keys(encounter.reward).length > 0, `${encounter.id} must grant a tangible reward`);
}
const encounterSignatures = (seed) => [...expedition.generateEncounterPlans(seed)].map((plan) => plan.map((encounter) => encounter.signature));
assert.deepEqual(encounterSignatures(20260827), encounterSignatures(20260827), "same seed must reproduce dynamic encounters");
assert.notDeepEqual(encounterSignatures(20260826), encounterSignatures(20260827), "different seeds should alter encounter plans");
for (const [stageIndex, plan] of [...expedition.generateEncounterPlans(20260827)].entries()) {
  assert.equal(plan.length, 4, "every stage must contain four dynamic encounters");
  assert.notEqual(plan[0].id, plan[1].id, "encounter types cannot immediately repeat");
  assert.notEqual(plan[1].id, plan[2].id, "encounter types cannot immediately repeat");
  assert.notEqual(plan[2].id, plan[3].id, "encounter types cannot immediately repeat");
  assert.ok(new Set(plan.map((encounter) => encounter.lane)).size >= 2, "encounters must move the objective lane");
  for (let slot = 1; slot < plan.length; slot += 1) assert.notEqual(plan[slot - 1].lane, plan[slot].lane, "consecutive encounters must change lane");
  plan.forEach((encounter, slot) => {
    assert.equal(encounter.stageIndex, stageIndex);
    assert.equal(encounter.slot, slot);
    assert.equal(encounter.at, [.14, .34, .58, .79][slot]);
    assert.ok(encounter.minStage <= stageIndex);
  });
}
for (const encounter of expedition.generateEncounterPlans(20260827)[0]) {
  assert.ok(!["survive", "siege"].includes(encounter.kind), "chapter one must only use non-damaging learning encounters");
  assert.ok(encounter.spawnRate <= 1, "chapter one encounters cannot increase enemy density");
}
const relayEncounter = ENCOUNTER_PROTOCOLS.find((encounter) => encounter.id === "relay");
const meteorEncounter = ENCOUNTER_PROTOCOLS.find((encounter) => encounter.id === "meteor");
assert.equal(expedition.evaluateEncounter(relayEncounter, { progress: 2, timeRemaining: 2 }), "pending");
assert.equal(expedition.evaluateEncounter(relayEncounter, { progress: relayEncounter.goal, timeRemaining: 2 }), "success");
assert.equal(expedition.evaluateEncounter(relayEncounter, { progress: 2, timeRemaining: 0 }), "failed");
assert.equal(expedition.evaluateEncounter(meteorEncounter, { hits: 8, timeRemaining: 1 }), "pending");
assert.equal(expedition.evaluateEncounter(meteorEncounter, { hits: 1, timeRemaining: 0 }), "success");
assert.equal(expedition.evaluateEncounter(meteorEncounter, { hits: 2, timeRemaining: 0 }), "failed");

assert.equal(MOVEMENT_MODULES.length, 4);
assert.equal(WEAPON_MODULES.length, 7, "laser, seeker and blast weapons must join the four ballistic families");
assert.equal(CORE_MODULES.length, 4);
assert.equal(AI_MODULES.length, 6, "pack and ambusher minds must join the four baseline brains");
assert.equal(PAYLOAD_MODULES.length, 4);
assert.equal(HULL_MODULES.length, 16, "the integrated foundry must ship seven general chassis and nine native species");
assert.equal(new Set(HULL_MODULES.map((hull) => hull.role)).size, 7, "every chassis family needs a distinct combat role");
assert.deepEqual([...HULL_MODULES.slice(0, 7)].map((hull) => hull.hp), [8, 7, 30, 16, 14, 15, 32], "baseline chassis durability must stay above the retired paper-target values");
const retiredHullRadii = [8, 7, 12, 9, 8, 8.5, 11, 9, 11, 10, 10, 13, 11, 10.5, 11.5, 12];
const compactHullRadii = [7.4, 6.4, 11, 8.3, 7.4, 7.8, 10.1, 8.3, 10.1, 9.2, 9.2, 12, 10.1, 9.7, 10.6, 11];
assert.deepEqual([...HULL_MODULES].map((hull) => hull.radius), compactHullRadii, "all sixteen hulls must use the compact battlefield footprint");
HULL_MODULES.forEach((hull, index) => {
  const ratio = hull.radius / retiredHullRadii[index];
  assert.ok(ratio >= .91 && ratio <= .93, `${hull.id} radius must stay near the 0.92 compacting target`);
});
const generalRadii = HULL_MODULES.slice(0, 7).map((hull) => hull.radius);
const nativeRadii = HULL_MODULES.slice(7).map((hull) => hull.radius);
assert.deepEqual([Math.min(...generalRadii), Math.max(...generalRadii)], [6.4, 11], "general hulls must retain a readable light-to-heavy size range");
assert.deepEqual([Math.min(...nativeRadii), Math.max(...nativeRadii)], [8.3, 12], "native species must retain a readable hunter-to-bulwark size range");
const radiusOf = (id) => HULL_MODULES.find((hull) => hull.id === id).radius;
assert.ok(radiusOf("dart") < radiusOf("scout") && radiusOf("scout") < radiusOf("spinner") && radiusOf("spinner") < radiusOf("tank"), "general hull size hierarchy must survive footprint compacting");
assert.ok(radiusOf("nectarMoth") < radiusOf("cometRammer") && radiusOf("cometRammer") < radiusOf("prismRay") && radiusOf("prismRay") < radiusOf("railBeetle"), "native hull size hierarchy must survive footprint compacting");
assert.ok(HULL_MODULES.slice(7).every((hull) => hull.hp >= 10 && hull.speciesPattern && hull.deathrattle), "native species need durable bodies, signature attacks and deathrattles");
for (const module of [...HULL_MODULES, ...MOVEMENT_MODULES, ...WEAPON_MODULES, ...CORE_MODULES, ...AI_MODULES, ...PAYLOAD_MODULES]) {
  assert.equal(i18nSource.split(`"${module.nameKey}"`).length - 1, 2, `${module.id} must be named in both locales`);
}
const builds = [];
for (const hull of HULL_MODULES) {
  for (const movement of MOVEMENT_MODULES) {
    for (const weapon of WEAPON_MODULES) {
      for (const core of CORE_MODULES) {
        for (const ai of AI_MODULES) {
          for (const payload of PAYLOAD_MODULES) {
            const build = expedition.build(movement.id, weapon.id, core.id, ai.id, payload.id, 2, hull.id);
            builds.push(build);
            assert.equal(build.hullId, hull.id);
            assert.ok(build.speed > 0 && build.hp > 0 && build.scale > 0 && build.score > 0);
            assert.ok(build.bulletSpeed > 0 && build.cooldown > 0 && build.spread > 0);
            assert.ok(["nearest", "weakest", "isolated", "leading"].includes(build.targeting));
            assert.equal(build.debuff, payload.debuff);
            for (const value of Object.values(build)) if (typeof value === "number") assert.ok(Number.isFinite(value), `${build.signature} contains a non-finite value`);
          }
        }
      }
    }
  }
}
const expectedBuildCount = HULL_MODULES.length * MOVEMENT_MODULES.length * WEAPON_MODULES.length * CORE_MODULES.length * AI_MODULES.length * PAYLOAD_MODULES.length;
assert.equal(builds.length, 43008, "sixteen hulls and expanded weapon/AI organs must produce 43008 complete builds");
assert.equal(new Set(builds.map((build) => build.signature)).size, expectedBuildCount, "all integrated modular build signatures must be unique");

for (const biome of BIOMES.filter((entry) => entry.stageIndex === 0)) {
  assert.ok(biome.enemyHp <= 1.02, `${biome.id} violates early HP safety`);
  assert.ok(biome.spawnRate <= 1, `${biome.id} violates early density safety`);
  assert.ok(biome.bulletSpeed <= 1.04, `${biome.id} violates chapter-one projectile bounds`);
  for (let i = 0; i < 100; i += 1) {
    const random = createRng(i + 1);
    assert.equal(expedition.chooseEnemyHull({ stageIndex: 0, progress: .04, biome, random }), "scout");
    assert.equal(expedition.assembleEnemy({ stageIndex: 0, progress: .04, biome, branch: PATH_PROTOCOLS[i % PATH_PROTOCOLS.length], hullId: "scout", random }).signature, "scout.standard.pulse.light.sentry.clean");
  }
  for (let i = 0; i < 100; i += 1) {
    const hull = expedition.chooseEnemyHull({ stageIndex: 0, progress: .249, biome, random: createRng(2000 + i) });
    assert.notEqual(hull, biome.speciesId, `${biome.id} native species must wait until the first strategy draft`);
  }
}

for (let i = 0; i < 120; i += 1) {
  const biome = BIOMES[i % 3];
  const build = expedition.assembleEnemy({ stageIndex: 0, progress: .249, biome, branch: PATH_PROTOCOLS[i % PATH_PROTOCOLS.length], hullId: "scout", random: createRng(3000 + i) });
  assert.equal(build.weaponId, "pulse", "chapter one must defer random weapon organs until the first strategy draft");
}

const chapterOneVariants = new Set();
const chapterOneRandom = createRng(500);
for (let i = 0; i < 200; i += 1) {
  const biome = BIOMES[i % 3];
  const hullId = expedition.chooseEnemyHull({ stageIndex: 0, progress: .32, biome, random: chapterOneRandom });
  const build = expedition.assembleEnemy({ stageIndex: 0, progress: .32, biome, branch: PATH_PROTOCOLS[i % PATH_PROTOCOLS.length], hullId, random: chapterOneRandom });
  chapterOneVariants.add(build.signature);
  assert.equal(build.payloadId, "clean", "chapter one may teach tactics but must not add status payloads");
}
assert.ok(chapterOneVariants.size >= 18, "chapter one must introduce meaningful movement and weapon variety after the opening beat");
for (const biome of BIOMES) {
  const native = HULL_MODULES.find((hull) => hull.id === biome.speciesId);
  const nativeBuild = expedition.assembleEnemy({ stageIndex: biome.stageIndex, progress: .72, biome, hullId: native.id, random: createRng(770 + biome.stageIndex) });
  assert.equal(nativeBuild.nativeBiome, biome.id);
  assert.ok(nativeBuild.speciesPattern && nativeBuild.deathrattle, `${native.id} must have a signature attack and deathrattle`);
}
const crystalOrchard = BIOMES.find((biome) => biome.id === "crystalOrchard");
let naturalPrismOracles = 0;
for (let i = 0; i < 300; i += 1) {
  const build = expedition.assembleEnemy({ stageIndex: 0, progress: .82, biome: crystalOrchard, hullId: "prismRay", random: createRng(9100 + i) });
  if (build.aiId === "oracle") naturalPrismOracles += 1;
}
assert.ok(naturalPrismOracles > 120, "crystal-orchard prism rays must naturally reach their oracle doctrine late in chapter one");

const laterSignatures = new Set();
const laterHulls = new Set();
const laterBiome = BIOMES.find((biome) => biome.stageIndex === 2);
const laterRandom = createRng(9001);
for (let i = 0; i < 400; i += 1) {
  const hullId = expedition.chooseEnemyHull({ stageIndex: 2, progress: .85, biome: laterBiome, random: laterRandom });
  laterHulls.add(hullId);
  laterSignatures.add(expedition.assembleEnemy({ stageIndex: 2, progress: .85, biome: laterBiome, hullId, random: laterRandom }).signature);
}
assert.ok(laterSignatures.size >= 80, "late game must expose broad five-slot modular variety");
assert.ok(laterHulls.size >= 6, "late game must expose broad hull variety");
for (let i = 0; i < 100; i += 1) {
  const elite = expedition.assembleEnemy({ stageIndex: 2, progress: .8, biome: laterBiome, hullId: "carrier", elite: true, random: createRng(i + 300) });
  assert.ok(["plated", "barrier"].includes(elite.coreId), "elite cores must remain readable defensive variants");
}

const rushPath = PATH_PROTOCOLS.find((path) => path.id === "overdrive");
const rushRandom = createRng(7331);
let rushBuilds = 0;
for (let i = 0; i < 400; i += 1) {
  const build = expedition.assembleEnemy({ stageIndex: 2, progress: .85, biome: laterBiome, branch: rushPath, hullId: "lancer", random: rushRandom });
  if (build.movementId === "rush") rushBuilds += 1;
}
assert.ok(rushBuilds > 190, "selected branches must materially bias modular assembly");

const weaponPaths = ["arsenal", "resonance", "prism"].map((id) => PATH_PROTOCOLS.find((path) => path.id === id));
const expectedRouteWeapons = ["twin", "orbit", "sniper"];
const routeWeaponCounts = weaponPaths.map((branch) => {
  const counts = Object.fromEntries(expectedRouteWeapons.map((weapon) => [weapon, 0]));
  for (let i = 0; i < 600; i += 1) {
    const build = expedition.assembleEnemy({ stageIndex: 2, progress: .85, biome: laterBiome, branch, hullId: "scout", random: createRng(12000 + i) });
    if (build.weaponId in counts) counts[build.weaponId] += 1;
  }
  return counts;
});
routeWeaponCounts.forEach((counts, branchIndex) => {
  const preferred = expectedRouteWeapons[branchIndex];
  const offRoutePeak = Math.max(...routeWeaponCounts.filter((_, index) => index !== branchIndex).map((entry) => entry[preferred]));
  assert.ok(counts[preferred] > 130 && counts[preferred] > offRoutePeak * 1.8, `route ${weaponPaths[branchIndex].id} must materially bias ${preferred}: ${JSON.stringify(routeWeaponCounts)}`);
});

assert.match(gameSource, /SpaceExpedition\.generateRoute/);
assert.match(gameSource, /SpaceExpedition\.generateBranchSets/);
assert.match(gameSource, /SpaceExpedition\.generateEncounterPlans/);
assert.match(gameSource, /SpaceExpedition\.evaluateEncounter/);
assert.match(gameSource, /SpaceExpedition\.chooseEnemyHull/);
assert.match(gameSource, /SpaceExpedition\.assembleEnemy/);
assert.match(gameSource, /stage\.biome\?\.spawnRate/);
assert.match(gameSource, /function updateRouteChoice\(dt\)/);
assert.match(gameSource, /world\.gameMode === "solo" && player\.index === 1/);
assert.match(gameSource, /Math\.min\(1, world\.activeBranch\?\.bulletSpeed/);
assert.match(gameSource, /Math\.min\(1, stage\.biome\?\.bulletSpeed/, "the opening beat must clamp ecosystem projectile multipliers");
assert.match(gameSource, /Math\.min\(1, world\.activeBranch\?\.spawnRate/);
assert.match(gameSource, /Math\.min\(1, world\.activeEncounter\?\.spawnRate/);
assert.match(gameSource, /function startEncounter\(plan\)/);
assert.match(gameSource, /function updateEncounter\(dt\)/);
assert.match(gameSource, /function finishEncounter\(success\)/);
assert.match(gameSource, /const REQUESTED_QA_ENCOUNTER = LOCAL_QA_HOST/);
assert.match(gameSource, /object\.type === "meteor"/);
assert.match(gameSource, /encounter\?\.kind === "siege"/);
assert.match(rendererSource, /enemy\.movementModule/);
assert.match(rendererSource, /enemy\.weaponModule/);
assert.match(rendererSource, /enemy\.coreModule/);
assert.match(rendererSource, /enemy\.aiModule/);
assert.match(rendererSource, /enemy\.payloadModule/);
assert.match(rendererSource, /drawEnemyChassis\(enemy, base, palette\)/);
assert.match(rendererSource, /drawIntegratedEnemyModules\(enemy, base, palette, moduleColor\)/);
assert.match(gameSource, /function updateEnemyIntelligence\(enemy, dt\)/);
assert.match(gameSource, /function applyEnemyDebuff\(player, bullet\)/);
assert.match(gameSource, /stage === 0 && progress < \.25 \? null : activeStage\(stage\)\.biome\?\.speciesId/, "chapter-one scripted natives must wait until the first strategy draft");
assert.match(gameSource, /world\.stageIndex === 0 && progress < \.42 \? "" : build\.deathrattle/, "chapter one must teach signature attacks before deathrattles");
assert.match(gameSource, /elite \? \(QA_FORCE_ELITE \? 20 : 4\.8\) : 1/, "ambient elites must retain the designed 4.8x durability outside the QA pursuit harness");
assert.match(rendererSource, /drawBiomeFeatures\(biome\)/);
assert.match(rendererSource, /drawRouteGates\(choice\)/);
assert.match(rendererSource, /drawEncounter\(encounter\)/);
assert.match(rendererSource, /drawEncounterObject\(object\)/);

console.log(`Expedition verified: ${BIOMES.length} ecosystems, ${PATH_PROTOCOLS.length} branch protocols, ${ENCOUNTER_PROTOCOLS.length} dynamic encounter types across twelve seeded objectives, three gate choices per stage, ${HULL_MODULES.length} organic chassis families and ${builds.length} integrated modular builds, early safety, branch bias, late-game diversity, and 3D integration.`);
