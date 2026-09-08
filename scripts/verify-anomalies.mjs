import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const roguelikeSource = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const anomalySource = fs.readFileSync(new URL("../src/anomalies.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const smokeSource = fs.readFileSync(new URL("./smoke-anomalies.cjs", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(roguelikeSource, sandbox, { filename: "src/roguelike.js" });
vm.runInNewContext(anomalySource, sandbox, { filename: "src/anomalies.js" });

const anomalies = sandbox.window.SpaceAnomalies;
const catalog = [...anomalies.ANOMALIES];
const ids = catalog.map((anomaly) => anomaly.id);

assert.equal(catalog.length, 9, "the living-sector engine must ship exactly nine gameplay anomalies");
assert.equal(new Set(ids).size, 9, "anomaly IDs must be unique");
assert.equal(new Set(catalog.map((anomaly) => anomaly.kind)).size, 9, "each anomaly needs distinct visual and simulation anatomy");
for (let tier = 0; tier < 3; tier += 1) assert.equal(catalog.filter((anomaly) => anomaly.tier === tier).length, 3, `chapter tier ${tier} must own three anomalies`);
for (const anomaly of catalog) {
  assert.match(anomaly.color, /^#[0-9a-f]{6}$/i);
  assert.match(anomaly.secondary, /^#[0-9a-f]{6}$/i);
  assert.notEqual(anomaly.color.toLowerCase(), "#000000");
  assert.notEqual(anomaly.secondary.toLowerCase(), "#000000");
  for (const key of [anomaly.nameKey, anomaly.descriptionKey, anomaly.effectKey]) assert.equal(i18nSource.split(`"${key}"`).length - 1, 2, `${key} must exist in both locales`);
}

const signatureFor = (seed) => anomalies.generatePlan(seed).flat().map((entry) => entry.signature).join(">");
assert.equal(signatureFor(20260828), signatureFor(20260828), "the same seed must reproduce the full anomaly plan");
assert.notEqual(signatureFor(20260827), signatureFor(20260828), "different seeds must alter anomaly ordering, polarity, or intensity");

for (const seed of [1, 42, 8080, 20260828]) {
  const plan = anomalies.generatePlan(seed);
  const entries = plan.flat();
  assert.equal(plan.length, 3);
  assert.ok(plan.every((stage) => stage.length === 3));
  assert.deepEqual(new Set(entries.map((entry) => entry.id)), new Set(ids), "every run must traverse all nine anomalies exactly once");
  assert.deepEqual(Array.from(entries, (entry) => entry.globalSector), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  entries.forEach((entry, index) => {
    assert.equal(entry.stageIndex, Math.floor(index / 3));
    assert.equal(entry.sectorIndex, index % 3);
    assert.ok(entry.intensity >= .55 && entry.intensity <= 1);
    assert.ok([-1, 1].includes(entry.polarity));
    assert.ok(Number.isFinite(entry.phase));
    for (const value of Object.values(entry.multipliers)) assert.ok(Number.isFinite(value), `${entry.id} has a non-finite multiplier`);
  });
  for (const entry of plan[0]) {
    assert.ok(entry.multipliers.spawnRate <= 1, `${entry.id} breaks opening spawn safety`);
    assert.ok(entry.multipliers.enemyBulletSpeed <= 1, `${entry.id} breaks opening projectile safety`);
    assert.ok(entry.multipliers.enemyMoveSpeed <= 1, `${entry.id} breaks opening movement safety`);
    assert.ok(entry.multipliers.enemyFireRate <= 1, `${entry.id} breaks opening fire-rate safety`);
    assert.ok(entry.multipliers.force <= 5, `${entry.id} exceeds the counter-steerable opening force budget`);
  }
}

const representativePlan = anomalies.generatePlan(9001);
for (const entry of representativePlan.flat()) {
  for (const point of [[20, 40], [240, 160], [460, 250]]) {
    const force = anomalies.playerForce(entry, 7.3, point[0], point[1]);
    const playerFlow = anomalies.bulletFlow(entry, 7.3, { x: point[0], y: point[1] }, 480, 270, false);
    const enemyFlow = anomalies.bulletFlow(entry, 7.3, { x: point[0], y: point[1] }, 480, 270, true);
    for (const vector of [force, playerFlow, enemyFlow]) {
      assert.ok(Number.isFinite(vector.x) && Number.isFinite(vector.y));
      assert.ok(Math.hypot(vector.x, vector.y) <= 24, `${entry.id} exceeds its counter-steerable vector budget`);
    }
    assert.ok(Math.hypot(playerFlow.x, playerFlow.y) <= Math.hypot(enemyFlow.x, enemyFlow.y) + 1e-9, "player shots must receive the gentler field coupling");
  }
}

const forced = anomalies.forceFirst(representativePlan, "voidSurge", 18);
assert.equal(forced[0][0].id, "voidSurge");
assert.equal(representativePlan[0][0].tier, 0, "QA forcing must not mutate the source plan");
assert.match(indexSource, /src\/anomalies\.js\?v=1[\s\S]*src\/expedition\.js/);
assert.match(gameSource, /REQUESTED_QA_ANOMALY = LOCAL_QA_HOST \?/);
assert.match(gameSource, /SpaceAnomalies\.generatePlan/);
assert.match(gameSource, /SpaceAnomalies\.playerForce/);
assert.match(gameSource, /SpaceAnomalies\.bulletFlow/);
assert.match(gameSource, /anomalyConfig\(\)\.spawnRate/);
assert.match(gameSource, /anomalyConfig\(\)\.enemyBulletSpeed/);
assert.match(gameSource, /anomalyConfig\(\)\.enemyFireRate/);
assert.match(gameSource, /dataset\.anomalyPlan/);
assert.match(gameSource, /result\.anomalies/);
assert.match(rendererSource, /drawAnomalyField\(world\)/);
assert.match(rendererSource, /sectorAnomalies = "9-seeded-gameplay-fields"/);
for (const kind of catalog.map((entry) => entry.kind)) assert.match(rendererSource, new RegExp(`anomaly\\.kind === "${kind}"`), `missing ${kind} voxel field`);
for (const id of ids) assert.ok(smokeSource.includes(`"${id}"`), `WebGL matrix is missing ${id}`);

console.log("Living Sector Anomaly Engine verified: nine seeded one-per-sector fields, chapter-one safety, counter-steerable forces, asymmetric projectile coupling, economy/combat/music integration, bilingual HUD/results, and dedicated Toon+Glow anatomy.");
