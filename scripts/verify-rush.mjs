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
assert.equal(api.RUSH_CONFIG.duration, 6, "baseline Rush must be a short positioning window");
assert.equal(api.RUSH_CONFIG.cooldown, 9, "Rush must have a visible recovery window");
assert.equal(api.RUSH_CONFIG.moveSpeed, 1.12);
assert.equal(api.RUSH_CONFIG.handling, 1.18);
assert.equal(api.RUSH_CONFIG.fireRate, 1, "baseline Rush must grant movement only; combat output belongs to build cards");
assert.equal(api.RUSH_CONFIG.damage, 1, "baseline Rush must not grant damage");
assert.equal(api.RUSH_CONFIG.linkDamage, 1, "baseline Rush must not amplify the link");
assert.deepEqual(Object.keys(api.EVENT_CHARGE).sort(), ["bossPhase", "elite", "encounter", "kill", "pickup", "rescue"].sort());
for (const type of Object.keys(api.EVENT_CHARGE)) {
  if (api.EVENT_CHARGE[type] > 0) assert.ok(api.chargeForEvent(type, true) > api.chargeForEvent(type, false), `${type} must reward linked play`);
  else assert.equal(api.chargeForEvent(type, true), 0, `${type} must remain locked behind a build card`);
}
assert.equal(api.chargeForEvent("kill", false, { rushKillCharge: .55 }), .55, "Hunter Relay must unlock kill charge");
assert.equal(api.chargeForEvent("pickup", false, { rushPickupCharge: 3 }), 3, "Stardust Circuit must unlock pickup charge");
assert.equal(api.clampCharge(-5), 0);
assert.equal(api.clampCharge(150), 100);
assert.ok(api.advanceCharge(20, 1, true) > 20, "linked formation must charge over time");
assert.ok(api.advanceCharge(20, 1, false) < 20, "unlinked formation must gently decay");
assert.equal(api.advanceCharge(20, 100, false, false), 20, "charge must freeze when the mode is ineligible");
assert.equal(api.addEventCharge(99, "rescue", true), 100);
assert.deepEqual({ ...api.combatMultipliers(false) }, {
  moveSpeed: 1, handling: 1, fireRate: 1, damage: 1,
  linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1,
});
assert.deepEqual({ ...api.combatMultipliers(true) }, {
  moveSpeed: 1.12, handling: 1.18, fireRate: 1, damage: 1,
  linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1,
});
assert.ok(api.combatMultipliers(true, { rushFireRate: 1.12, rushDamage: 1.08 }).fireRate > api.combatMultipliers(true).fireRate, "Rush Igniter must be the source of Rush fire-rate output");

const startRushSource = game.slice(game.indexOf("function startRush()"), game.indexOf("function finishRush()"));
assert.doesNotMatch(startRushSource, /enemyBullets|enemyBeams/, "starting baseline Rush must never erase hostile fire");
const finishRushSource = game.slice(game.indexOf("function finishRush()"), game.indexOf("function updateRush(dt)"));
assert.doesNotMatch(finishRushSource, /world\.score/, "baseline Rush must not award a hidden score multiplier");
const updateRushSource = game.slice(game.indexOf("function updateRush(dt)"), game.indexOf("function enemyTarget("));
assert.match(updateRushSource, /bonuses\.rushGuard/, "bullet deflection must remain gated by the Rush Guard card");
assert.match(updateRushSource, /rushGuardClearsThisRush < bonuses\.rushGuardLimit/, "Rush Guard must have a per-activation cap");
assert.match(updateRushSource, /world\.rushCooldown <= 0/, "Rush charge must respect the cooldown gate");

assert.match(game, /function startRush/);
assert.match(game, /function updateRush/);
assert.match(game, /SpaceRush\.addEventCharge/);
assert.match(game, /SpaceRush\.combatMultipliers/);
assert.match(game, /dataset\.rushActive/);
assert.match(game, /QA_RUSH_MODE/);
assert.match(renderer, /drawRush\(world\)/);
assert.match(html, /src="\.\/src\/rush\.js/);

console.log(`Rush verified: acceleration-first baseline, card-gated charge/combat/guard branches, six-second window, nine-second cooldown, QA diagnostics, and 3D integration.`);
