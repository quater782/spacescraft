import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/constellation.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/constellation.js" });

const api = sandbox.window.SpaceConstellation;
const nodes = api.TALENT_NODES;
assert.equal(nodes.length, 9, "constellation must provide nine permanent talents");
assert.equal(new Set(nodes.map((node) => node.id)).size, nodes.length, "talent IDs must be unique");
for (const branch of ["mobility", "armament", "resonance"]) {
  const branchNodes = nodes.filter((node) => node.branch === branch);
  assert.deepEqual([...branchNodes].map((node) => node.tier), [1, 2, 3], `${branch} must have three ordered tiers`);
  assert.equal(branchNodes[0].requires, null);
  assert.equal(branchNodes[1].requires, branchNodes[0].id);
  assert.equal(branchNodes[2].requires, branchNodes[1].id);
}

assert.deepEqual([...api.sanitizeUnlocks(["phaseAnchor", "vectorThrusters", "missing"])], ["vectorThrusters"], "orphan and unknown talents must be removed");
assert.equal(api.canUnlock("phaseAnchor", ["vectorThrusters"], 999).reason, "prerequisite");
assert.equal(api.canUnlock("kineticDrift", ["vectorThrusters"], 10).reason, "stardust");
assert.equal(api.canUnlock("kineticDrift", ["vectorThrusters"], 140).ok, true);

const all = nodes.map((node) => node.id);
const effect = api.calculateEffects(all);
for (const [key, value] of Object.entries(effect)) assert.ok(Number.isFinite(value) && value > 0, `${key} must be a positive finite effect`);
const player = {
  speed: 90, handling: 18, pickupMagnetRadius: 0, r: 6, hitInvulnerability: 1.8,
  damage: 1, fireRate: 1, projectileSpeed: 180, energyGain: 1, novaDamage: 1,
  linkRange: 105, beamDamage: 1, reviveSpeed: 1, maxShield: 3, shield: 0,
};
const before = { ...player };
api.applyToPlayer(player, all);
for (const key of Object.keys(player)) assert.notEqual(player[key], before[key], `${key} must receive a permanent talent effect`);
assert.ok(player.shield <= player.maxShield, "starting shield must respect the cap");

assert.match(game, /SpaceConstellation\.sanitizeUnlocks/);
assert.match(game, /SpaceConstellation\.applyToPlayer/);
assert.match(game, /version: 6/);
assert.match(game, /talents: \[\]/);
assert.match(game, /function unlockTalent/);
assert.match(game, /data-talent-id/);
assert.match(game, /dataset\.talentCount/);
assert.match(html, /id="talentOptions"/);
assert.match(html, /src="\.\/src\/constellation\.js/);

console.log(`Constellation verified: ${nodes.length} prerequisite talents, save sanitization, purchase gates, all combat effects, and hangar integration.`);
