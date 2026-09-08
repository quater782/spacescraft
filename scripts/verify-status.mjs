import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const statusSource = fs.readFileSync(new URL("../src/status.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(statusSource, sandbox, { filename: "src/status.js" });

const status = sandbox.window.SpaceStatus;
assert.equal(status.BUFF_MODULES.length, 4, "four pickup-driven buff modules are required");
assert.equal(status.DEBUFF_MODULES.length, 3, "three readable enemy status modules are required");
assert.equal(new Set(status.BUFF_MODULES.map((buff) => buff.pickupType)).size, 4, "every pickup must map to a distinct buff");
assert.equal(new Set(status.DEBUFF_MODULES.map((debuff) => debuff.id)).size, 3, "debuff IDs must be unique");
for (const module of [...status.BUFF_MODULES, ...status.DEBUFF_MODULES]) {
  assert.match(module.color, /^#[0-9a-f]{6}$/i);
  assert.equal(i18nSource.split(`"${module.nameKey}"`).length - 1, 2, `${module.id} name must exist in both locales`);
  assert.equal(i18nSource.split(`"${module.descriptionKey}"`).length - 1, 2, `${module.id} description must exist in both locales`);
}
for (const buff of status.BUFF_MODULES) assert.equal(status.buffForPickup(buff.pickupType).id, buff.id);

const neutral = status.combatBonuses({}, {});
assert.equal(neutral.damage, 1);
assert.equal(neutral.fireRate, 1);
assert.equal(neutral.speed, 1);
assert.equal(neutral.energyGain, 1);
assert.equal(neutral.sharedCharge, 1);
assert.equal(neutral.pickupMagnet, 0);
assert.equal(neutral.statusResistance, 1);
const active = status.combatBonuses({ arsenal: 1, nanobloom: 1, aegis: 1, flux: 1 }, { chill: 1, jam: 1, fracture: 1 });
assert.equal(active.damage, 1.06);
assert.equal(active.sharedCharge, 1.15, "flux must strengthen the shared charge economy rather than duplicate per-pilot energy");
assert.ok(active.pickupMagnet >= 70 && active.beamDamage > 1);
assert.ok(active.fireRate < 1.12 && active.speed < 1.12 && active.energyGain === .72, "debuffs must counter matching buffs without disabling controls");
assert.equal(active.statusResistance, .5);
for (const buff of status.BUFF_MODULES) {
  assert.equal(status.refreshBuffDuration(0, buff), buff.duration, `${buff.id} first pickup must use its base duration`);
  assert.equal(status.refreshBuffDuration(1, buff), buff.duration + 1, `${buff.id} repeat must refresh with only one bonus second`);
  assert.equal(status.refreshBuffDuration(999, buff), buff.duration + 1, `${buff.id} duration must never stack past base plus one second`);
}

assert.match(gameSource, /function grantBuff\(player, pickupType\)/);
assert.match(gameSource, /function updatePlayerStatus\(player, dt\)/);
assert.match(gameSource, /grantBuff\(player, pickup\.type\)/);
assert.match(gameSource, /applyEnemyDebuff\(player, bullet\)/);
assert.match(gameSource, /statusBonuses\(player\)\.pickupMagnet/);
assert.match(gameSource, /canvas\.dataset\.playerBuffs/);
assert.match(gameSource, /canvas\.dataset\.playerDebuffs/);
assert.match(rendererSource, /drawPlayerModules\(player, base, palette, profile\)/);
assert.match(rendererSource, /voxelCage\(base, radius, color/);
assert.match(rendererSource, /player\.buffs\?\.arsenal/);
assert.match(rendererSource, /player\.buffs\?\.nanobloom/);
assert.match(rendererSource, /player\.buffs\?\.aegis/);
assert.match(rendererSource, /player\.buffs\?\.flux/);
assert.match(rendererSource, /bullet\.payloadModule/);
assert.doesNotMatch(statusSource, /keydown|keyup|gamepad|button/i, "status modules must remain automatic");

console.log("Status modules verified: 4 automatic buffs, 3 readable debuffs, opposing combat multipliers, integrated airframe structures, audio/HUD diagnostics, and direction-only input.");
