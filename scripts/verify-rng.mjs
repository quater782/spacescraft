import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/rng.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/rng.js" });
const rng = sandbox.window.SpaceRng;

assert.deepEqual(Object.keys(rng.STREAM_SALTS).sort(), ["combat", "cosmetic", "draft", "loot", "route"]);
assert.equal(new Set(Object.values(rng.STREAM_SALTS)).size, 5);
assert.notEqual(rng.deriveSeed(1234, rng.STREAM_SALTS.combat), rng.deriveSeed(1234, rng.STREAM_SALTS.draft));

const first = rng.createStreams(260901);
const second = rng.createStreams(260901);
const expectedDraft = Array.from({ length: 24 }, () => first.draft());
for (let index = 0; index < 50000; index += 1) second.combat();
for (let index = 0; index < 900; index += 1) second.loot();
for (let index = 0; index < 120; index += 1) second.route();
assert.deepEqual(Array.from({ length: 24 }, () => second.draft()), expectedDraft, "combat, loot and route noise must not advance the draft stream");

const replayA = rng.createStreams(42);
const replayB = rng.createStreams(42);
for (const name of Object.keys(rng.STREAM_SALTS)) {
  assert.deepEqual(Array.from({ length: 32 }, () => replayA[name]()), Array.from({ length: 32 }, () => replayB[name]()), `${name} stream must replay exactly`);
}

console.log("Run RNG verified: combat, draft, loot, route and cosmetic streams are deterministic and isolated.");
