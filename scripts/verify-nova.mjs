import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const rushSource = fs.readFileSync(new URL("../src/rush.js", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const roguelike = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(rushSource, sandbox, { filename: "src/rush.js" });

const nova = sandbox.window.SpaceRush.NOVA_CONFIG;
assert.equal(nova.threshold, 120, "the shared reactor must not inherit the former 100-point cadence");
assert.equal(nova.cooldown, 14, "Nova must leave a meaningful gap between purges");
assert.ok(nova.passiveChargePerSecond <= 1.2, "an unbuilt reactor must take at least 100 seconds to fill passively");
assert.ok(nova.hitCharge >= .5 && nova.hitChargePerSecond >= 4, "real hits must provide a useful defensive cadence");
assert.ok(nova.hitChargePerSecond <= 5, "rapid weapons must share a bounded base charge budget");
assert.ok(nova.clearRadius >= 60 && nova.clearRadius <= 80, "baseline purge must remain local");
assert.ok(nova.damageRadius > nova.clearRadius && nova.damageRadius <= 100, "damage may read beyond the purge but remain local");

assert.doesNotMatch(game, /player\.energy\s*>=\s*100/, "pilots must not own independent Nova triggers");
assert.match(game, /world\.novaCharge\s*=\s*0;/, "one activation must discharge the shared reactor once");
assert.match(game, /for \(const player of world\.players\) player\.energy = world\.novaCharge/, "both pilot meters must mirror one shared value");
assert.match(game, /if \(type === "nova"\)/, "Nova-sourced kills must be rejected as charge sources");

const useNova = game.slice(game.indexOf("function useNova()"), game.indexOf("function updateNova(dt)"));
assert.match(useNova, /const clearAll = world\.players\.some\(\(player\) => player\.novaClearAll\)/, "full-screen purge must be card-gated");
assert.match(useNova, /!clearAll && !pilots\.some/, "baseline purge must test distance to a living pilot");
assert.doesNotMatch(useNova, /enemyBeams[^\n]*dead\s*=\s*true/, "Nova must not erase persistent laser beams");
assert.match(useNova, /NOVA_CONFIG\.bossDamage/, "boss damage must use its own restrained value");
assert.match(useNova, /suppressDeathrattle: true/, "Nova kills must not repopulate the freshly purged area with deathrattles");

const updateNova = game.slice(game.indexOf("function updateNova(dt)"), game.indexOf("function damagePlayer("));
assert.match(updateNova, /world\.novaCooldown = Math\.max\(0, world\.novaCooldown - dt\)/);
assert.match(updateNova, /eligible && world\.novaCharge >= NOVA_CONFIG\.threshold/, "travel cannot consume a ready reactor");
assert.match(updateNova, /qaReady && immediateDanger/, "a local purge must wait for a nearby target");
assert.doesNotMatch(game, /addNovaCharge\("kill"/, "takedowns must not pay charge again after the killing hit");
assert.match(game, /\(damage\.hull > 0 \|\| damage\.barrier > 0\) && firstHit/, "blocked hits and repeated piercing hits must not grant energy");
assert.match(roguelike, /upgradeId === "novaPurifier"/);
assert.match(roguelike, /player\.novaClearAll = true/);
assert.match(roguelike, /player\.novaDamage \*= \.85/);
assert.match(roguelike, /upgradeId === "novaHarvester"/);
assert.match(roguelike, /upgradeId === "novaAegis"/);

const updateObjects = game.slice(game.indexOf("function updateObjects(dt)"), game.indexOf("function updateStars("));
assert.match(updateObjects, /for \(const bullet of world\.enemyBullets\) \{\s*if \(bullet\.dead\) continue;/, "cleared mines and blast seeds must not detonate later in the same frame");
assert.match(game, /qaNovaHazardFragments/, "the runtime gate must expose forbidden post-purge hazard fragments");
assert.match(game, /novaSuppressedDeathrattles/, "the runtime gate must prove a Nova-killed deathrattle was suppressed");

const damagePlayer = game.slice(game.indexOf("function damagePlayer("), game.indexOf("function revivePlayer("));
assert.match(damagePlayer, /player\.invulnerability = remaining > 0 \? 0 : \.22/, "a shield block needs only a short contact debounce");
assert.match(roguelike, /Math\.min\(\.94, player\.hitInvulnerability \+ stats\.invulnerability/, "Phase Hull must not restore long invulnerability chains");
assert.match(html, /src="\.\/src\/rush\.js/);

console.log("Shared Nova verified: 120-point hit-driven team reactor, 14-second cadence floor, local purge, beam persistence and no kill feedback loop.");
