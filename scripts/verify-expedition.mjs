import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const roguelikeSource = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const expeditionSource = fs.readFileSync(new URL("../src/expedition.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(roguelikeSource, sandbox, { filename: "src/roguelike.js" });
vm.runInNewContext(expeditionSource, sandbox, { filename: "src/expedition.js" });

const expedition = sandbox.window.SpaceExpedition;
const { createRng } = sandbox.window.SpaceRoguelike;
const { BIOMES, MOVEMENT_MODULES, WEAPON_MODULES, CORE_MODULES } = expedition;

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
}

assert.deepEqual([...expedition.generateRoute(20260827)].map((biome) => biome.id), [...expedition.generateRoute(20260827)].map((biome) => biome.id), "same seed must reproduce the ecosystem route");
assert.notDeepEqual([...expedition.generateRoute(20260826)].map((biome) => biome.id), [...expedition.generateRoute(20260827)].map((biome) => biome.id), "different seeds should produce different ecosystem routes");
for (const [stageIndex, biome] of [...expedition.generateRoute(42)].entries()) assert.equal(biome.stageIndex, stageIndex, "route ecosystems must match their stage slot");

assert.equal(MOVEMENT_MODULES.length, 4);
assert.equal(WEAPON_MODULES.length, 4);
assert.equal(CORE_MODULES.length, 4);
const builds = [];
for (const movement of MOVEMENT_MODULES) {
  for (const weapon of WEAPON_MODULES) {
    for (const core of CORE_MODULES) {
      const build = expedition.build(movement.id, weapon.id, core.id, 2);
      builds.push(build);
      assert.ok(build.speed > 0 && build.hp > 0 && build.scale > 0 && build.score > 0);
      assert.ok(build.bulletSpeed > 0 && build.cooldown > 0 && build.spread > 0);
      for (const value of Object.values(build)) if (typeof value === "number") assert.ok(Number.isFinite(value), `${build.signature} contains a non-finite value`);
    }
  }
}
assert.equal(builds.length, 64, "four modules per slot must produce 64 complete builds");
assert.equal(new Set(builds.map((build) => build.signature)).size, 64, "all modular build signatures must be unique");

for (const biome of BIOMES.filter((entry) => entry.stageIndex === 0)) {
  assert.ok(biome.enemyHp <= 1.02, `${biome.id} violates early HP safety`);
  assert.ok(biome.spawnRate <= 1, `${biome.id} violates early density safety`);
  assert.ok(biome.bulletSpeed <= 1, `${biome.id} violates early projectile safety`);
  for (let i = 0; i < 100; i += 1) {
    const random = createRng(i + 1);
    assert.equal(expedition.chooseEnemyHull({ stageIndex: 0, progress: .25, biome, random }), "scout");
    assert.equal(expedition.assembleEnemy({ stageIndex: 0, progress: .25, biome, random }).signature, "standard.pulse.light");
  }
}

const laterSignatures = new Set();
const laterHulls = new Set();
const laterBiome = BIOMES.find((biome) => biome.stageIndex === 2);
const laterRandom = createRng(9001);
for (let i = 0; i < 400; i += 1) {
  laterSignatures.add(expedition.assembleEnemy({ stageIndex: 2, progress: .85, biome: laterBiome, random: laterRandom }).signature);
  laterHulls.add(expedition.chooseEnemyHull({ stageIndex: 2, progress: .85, biome: laterBiome, random: laterRandom }));
}
assert.ok(laterSignatures.size >= 24, "late game must expose broad modular variety");
assert.ok(laterHulls.size >= 4, "late game must expose broad hull variety");
for (let i = 0; i < 100; i += 1) {
  const elite = expedition.assembleEnemy({ stageIndex: 2, progress: .8, biome: laterBiome, elite: true, random: createRng(i + 300) });
  assert.ok(["plated", "barrier"].includes(elite.coreId), "elite cores must remain readable defensive variants");
}

assert.match(gameSource, /SpaceExpedition\.generateRoute/);
assert.match(gameSource, /SpaceExpedition\.chooseEnemyHull/);
assert.match(gameSource, /SpaceExpedition\.assembleEnemy/);
assert.match(gameSource, /stage\.biome\?\.spawnRate/);
assert.match(rendererSource, /enemy\.movementModule/);
assert.match(rendererSource, /enemy\.weaponModule/);
assert.match(rendererSource, /enemy\.coreModule/);
assert.match(rendererSource, /drawBiomeFeatures\(biome\)/);

console.log(`Expedition verified: ${BIOMES.length} ecosystems, ${builds.length} modular builds, seeded routes, early safety envelope, late-game diversity, and 3D module integration.`);
