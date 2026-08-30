import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const directorSource = fs.readFileSync(new URL("../src/director.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const expeditionSource = fs.readFileSync(new URL("../src/expedition.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(directorSource, sandbox, { filename: "src/director.js" });
const director = sandbox.window.SpaceDirector;

assert.deepEqual([...director.STAGE_DURATIONS], [570, 600, 630]);
assert.equal(director.BASE_RUN_SECONDS, 1800, "base combat route must last at least 30 minutes before bosses and decisions");
assert.equal(director.TOTAL_SECTORS, 9);
assert.equal(director.TOTAL_FORMATION_EVENTS, 27);
assert.equal(director.TOTAL_ENCOUNTERS, 12);
assert.equal(director.TOTAL_DRAFTS, 8);
assert.deepEqual([...director.EVENT_POINTS], [.08, .18, .28, .38, .48, .58, .68, .78, .88]);
assert.deepEqual([...director.ENCOUNTER_POINTS], [.14, .34, .58, .79]);
assert.deepEqual([...director.MID_DRAFT_POINTS], [.25, .72]);
for (const points of [director.EVENT_POINTS, director.ENCOUNTER_POINTS, director.MID_DRAFT_POINTS]) {
  assert.ok(points.every((point) => point > 0 && point < 1));
  assert.deepEqual([...points].sort((a, b) => a - b), [...points], "director thresholds must remain ordered");
}
assert.deepEqual([0, .2, .34, .66, .67, 1].map(director.sectorForProgress), [0, 0, 1, 1, 2, 2]);
assert.deepEqual([0, 1, 2].map((sector) => director.globalSector(2, sector)), [7, 8, 9]);
const timeline = director.buildEventTimeline([{ id: "a" }, { id: "b" }, { id: "c" }]);
assert.equal(timeline.length, 9);
assert.deepEqual([...timeline].map((event) => event.tier), [1, 1, 1, 2, 2, 2, 3, 3, 3]);
assert.deepEqual([...timeline].map((event) => event.id), ["a", "b", "c", "a", "b", "c", "a", "b", "c"]);
assert.equal(director.timeScale(), 1);
assert.equal(director.timeScale({ fast: true }), 90);
assert.equal(director.timeScale({ fast: true, voxel: true }), 1);
assert.equal(director.timeScale({ bossState: true }), 180);

assert.match(indexSource, /src\/director\.js\?v=1[\s\S]*src\/expedition\.js/);
assert.match(gameSource, /DIRECTOR\.STAGE_DURATIONS/);
assert.match(gameSource, /DIRECTOR\.buildEventTimeline/);
assert.match(gameSource, /beginUpgradeDraft\("mid-stage"\)/);
assert.match(gameSource, /nextEvent\.at \* stage\.duration/);
assert.match(gameSource, /DIRECTOR\.timeScale/);
assert.match(gameSource, /DIRECTOR\.intensityFor/);
assert.match(gameSource, /audio\.sfx\("anomalyShift"\)/, "sector transitions must retain a distinct audio cue through the active anomaly field");
assert.match(gameSource, /dataset\.runTargetSeconds/);
assert.match(expeditionSource, /SpaceDirector\.ENCOUNTER_POINTS/);
assert.match(rendererSource, /drawSectorArchitecture\(world, stage\)/);
assert.match(rendererSource, /expeditionSectors = "9-progressive-voxel-gates"/);

console.log("Odyssey Director verified: 1,800-second base route, nine sectors, 27 formation events, 12 encounters, eight drafts, progressive intensity, 90x QA acceleration, music lift, and voxel sector gates.");
