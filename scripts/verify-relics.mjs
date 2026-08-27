import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const relicSource = fs.readFileSync(new URL("../src/relics.js", import.meta.url), "utf8");
const roguelikeSource = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const gameSource = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const rendererSource = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(roguelikeSource, sandbox, { filename: "src/roguelike.js" });
vm.runInNewContext(relicSource, sandbox, { filename: "src/relics.js" });

const api = sandbox.window.SpaceRelics;
const upgrades = sandbox.window.SpaceRoguelike.UPGRADE_DEFS;
assert.equal(api.PROTOCOLS.length, 7, "v0.14 must ship seven relic protocols");
assert.equal(new Set(api.PROTOCOLS.map((protocol) => protocol.id)).size, 7, "protocol IDs must be unique");
for (const protocol of api.PROTOCOLS) {
  assert.equal(protocol.required.length, 2, `${protocol.id} must require an exact two-piece build`);
  assert.equal(new Set(protocol.required).size, 2, `${protocol.id} requirements must be unique`);
  assert.ok(protocol.required.every((id) => upgrades.some((upgrade) => upgrade.id === id)), `${protocol.id} references a missing upgrade`);
  assert.match(protocol.nameKey, /^protocol\.[^.]+\.name$/);
  assert.match(protocol.descriptionKey, /^protocol\.[^.]+\.description$/);
  assert.equal(i18nSource.split(`"${protocol.nameKey}"`).length - 1, 2, `${protocol.id} needs zh/en names`);
  assert.equal(i18nSource.split(`"${protocol.descriptionKey}"`).length - 1, 2, `${protocol.id} needs zh/en descriptions`);
  assert.ok(gameSource.includes(`markProtocolProc("${protocol.id}"`), `${protocol.id} needs a runtime proc hook`);
}

const railLevels = { rail: 1 };
const phaseProtocol = api.protocolUnlockedByChoice(railLevels, "phase");
assert.equal(phaseProtocol.id, "phaseLance");
assert.equal(api.activeProtocols(railLevels).length, 0);
assert.deepEqual([...api.activeProtocols({ rail: 1, phase: 1 })].map((protocol) => protocol.id), ["phaseLance"]);
assert.equal(api.eligibleMates(railLevels, upgrades).some(({ upgrade }) => upgrade.id === "phase"), true);

const baseChoices = ["overclock", "gyro", "nanites"].map((id) => upgrades.find((upgrade) => upgrade.id === id));
const injected = api.injectProtocolChoice({ choices: baseChoices, levels: railLevels, upgrades, random: () => 0 });
assert.equal(injected.length, 3);
assert.equal(new Set(injected.map((upgrade) => upgrade.id)).size, 3);
assert.equal(injected.some((upgrade) => upgrade.id === "phase"), true, "second draft must expose a deterministic protocol mate");

const neutral = api.combatBonuses({});
assert.equal(neutral.movingFireRate, 1);
assert.equal(neutral.chainTargets, 0);
assert.equal(neutral.pickupRush, 0);
const full = api.combatBonuses(Object.fromEntries(upgrades.map((upgrade) => [upgrade.id, 1])));
assert.ok(full.movingFireRate > 1 && full.phaseDamage > 1 && full.seekerTurn > 0);
assert.ok(full.chainDamage > 1 && full.chainTargets === 1 && full.pickupEnergy > 0);
assert.ok(full.linkedCharge > 1 && full.beamDamage > 1 && full.beamRadius > 0);

assert.match(gameSource, /SpaceRelics\.injectProtocolChoice/);
assert.match(gameSource, /SpaceRelics\.combatBonuses/);
assert.match(gameSource, /dataset\.protocols/);
assert.match(gameSource, /QA_PROTOCOL_ID/);
assert.match(rendererSource, /drawProtocols\(world\)/);
assert.match(htmlSource, /src="\.\/src\/relics\.js/);
assert.doesNotMatch(relicSource, /enemyHp|spawnRate|bulletSpeed/, "protocol rules must not raise first-chapter enemy pressure");

console.log("Relic protocols verified: 7 exact pairs, deterministic mate injection, automatic combat bonuses, QA diagnostics, and 3D integration.");
