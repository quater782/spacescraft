import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/rush.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const renderer = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/rush.js" });

const api = sandbox.window.SpaceRush;
assert.equal(api.RUSH_CONFIG.threshold, 100);
assert.ok(api.RUSH_CONFIG.duration >= 6 && api.RUSH_CONFIG.duration <= 10, "rush duration must remain readable and bounded");
assert.ok(api.RUSH_CONFIG.fireRate > 1 && api.RUSH_CONFIG.damage > 1 && api.RUSH_CONFIG.linkDamage > 1, "rush must materially improve automatic combat");
assert.deepEqual(Object.keys(api.EVENT_CHARGE).sort(), ["bossPhase", "elite", "encounter", "kill", "pickup", "rescue"].sort());
for (const type of Object.keys(api.EVENT_CHARGE)) {
  assert.ok(api.chargeForEvent(type, true) > api.chargeForEvent(type, false), `${type} must reward linked play`);
}
assert.equal(api.clampCharge(-5), 0);
assert.equal(api.clampCharge(150), 100);
assert.ok(api.advanceCharge(20, 1, true) > 20, "linked formation must charge over time");
assert.ok(api.advanceCharge(20, 1, false) < 20, "unlinked formation must gently decay");
assert.equal(api.advanceCharge(20, 100, false, false), 20, "charge must freeze when the mode is ineligible");
assert.equal(api.addEventCharge(99, "rescue", true), 100);
assert.deepEqual({ ...api.combatMultipliers(false) }, { fireRate: 1, damage: 1, linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1 });

assert.match(game, /function startRush/);
assert.match(game, /function updateRush/);
assert.match(game, /SpaceRush\.addEventCharge/);
assert.match(game, /SpaceRush\.combatMultipliers/);
assert.match(game, /dataset\.rushActive/);
assert.match(game, /QA_RUSH_MODE/);
assert.match(renderer, /drawRush\(world\)/);
assert.match(html, /src="\.\/src\/rush\.js/);

console.log(`Rush verified: ${Object.keys(api.EVENT_CHARGE).length} charge events, linked formation gain, bounded decay, automatic combat multipliers, QA diagnostics, and 3D integration.`);
