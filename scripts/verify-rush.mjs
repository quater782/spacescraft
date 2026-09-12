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
assert.equal(api.RUSH_CONFIG.cooldown, 8, "Rush must have a visible recovery window");
assert.equal(api.RUSH_CONFIG.moveSpeed, 1.12);
assert.equal(api.RUSH_CONFIG.handling, 1.18);
assert.equal(api.RUSH_CONFIG.fireRate, 1.2, "baseline Overload must have readable primary fire output");
assert.equal(api.RUSH_CONFIG.damage, 1, "baseline Rush must not grant damage");
assert.equal(api.RUSH_CONFIG.linkDamage, 1, "baseline Rush must not amplify the link");
assert.deepEqual(Object.keys(api.EVENT_CHARGE).sort(), ["bossPhase", "elite", "encounter", "kill", "pickup", "rescue"].sort());
for (const type of Object.keys(api.EVENT_CHARGE)) {
  if (api.EVENT_CHARGE[type] > 0) assert.ok(api.chargeForEvent(type, true) === api.chargeForEvent(type, false), `${type} must have transparent event amounts`);
  else assert.equal(api.chargeForEvent(type, true), 0, `${type} must remain locked behind a build card`);
}
assert.equal(api.chargeForEvent("kill", false, { rushKillCharge: .55 }), .55, "Hunter Relay must unlock kill charge");
assert.equal(api.chargeForEvent("pickup", false, { rushPickupCharge: 3 }), 3, "Stardust Circuit must unlock pickup charge");
assert.equal(api.clampCharge(-5), 0);
assert.equal(api.clampCharge(150), 100);
assert.ok(api.advanceCharge(20, 1, true) > 20, "linked formation must charge over time");
assert.equal(api.advanceCharge(20, 1, false), 20, "splitting to dodge must preserve charge");
assert.equal(api.LINK_CONFIG.clears, 2);
assert.equal(api.LINK_CONFIG.readyDelay, .5);
assert.equal(api.LINK_CONFIG.recharge, 6);
assert.equal(api.LINK_CONFIG.linger, 1);
assert.equal(api.LINK_CONFIG.echoClears, 3);
const reflected = api.reflectedVelocity({ x: 20, y: 0, vx: 30, vy: 60 }, { x: 0, y: 0 }, { x: 40, y: 0 });
assert.equal(reflected.vx, 30);
assert.equal(reflected.vy, -60);
const fallback = api.reflectedVelocity({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 });
assert.ok(Number.isFinite(fallback.vx) && Number.isFinite(fallback.vy) && Math.hypot(fallback.vx, fallback.vy) >= 60);
assert.equal(api.advanceCharge(20, 100, false, false), 20, "charge must freeze when the mode is ineligible");
assert.equal(api.addEventCharge(99, "rescue", true), 100);
assert.deepEqual({ ...api.combatMultipliers(false) }, {
  moveSpeed: 1, handling: 1, fireRate: 1, damage: 1,
  linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1,
});
assert.deepEqual({ ...api.combatMultipliers(true) }, {
  moveSpeed: 1.12, handling: 1.18, fireRate: 1.2, damage: 1,
  linkRate: 1, linkDamage: 1, pickupMagnet: 0, score: 1,
});
assert.ok(api.combatMultipliers(true, { rushFireRate: 1.35, rushDamage: 1.08 }).fireRate > api.combatMultipliers(true).fireRate, "Rush Igniter must be the source of Rush fire-rate output");

const startRushSource = game.slice(game.indexOf("function startRush()"), game.indexOf("function finishRush()"));
assert.doesNotMatch(startRushSource, /enemyBullets|enemyBeams/, "starting baseline Rush must never erase hostile fire");
const finishRushSource = game.slice(game.indexOf("function finishRush()"), game.indexOf("function updateRush(dt)"));
assert.doesNotMatch(finishRushSource, /world\.score/, "baseline Rush must not award a hidden score multiplier");
const updateRushSource = game.slice(game.indexOf("function updateRush(dt)"), game.indexOf("function enemyTarget("));
assert.match(updateRushSource, /bonuses\.rushGuard/, "bullet deflection must remain gated by the Rush Guard card");
assert.match(updateRushSource, /state\.guardNodes > 0 && state\.guardCooldown <= 0/, "interception must consume a finite shared node and respect its debounce");
assert.match(updateRushSource, /world\.rushCooldown > 0/, "Rush charge must respect the cooldown gate");

assert.match(game, /function startRush/);
assert.match(game, /function updateRush/);
assert.match(game, /SpaceRush\.chargeForEvent/);
assert.match(game, /SpaceRush\.combatMultipliers/);
assert.match(game, /dataset\.rushActive/);
assert.match(game, /QA_RUSH_MODE/);
assert.match(renderer, /drawRush\(world\)/);
assert.match(html, /src="\.\/src\/rush\.js/);

console.log(`Rush verified: automatic primary overdrive, card-gated charge/combat/guard branches, six-second window, eight-second cooldown, QA diagnostics, and 3D integration.`);
