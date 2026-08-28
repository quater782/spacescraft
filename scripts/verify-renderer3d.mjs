import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const smoke = fs.readFileSync(new URL("./smoke-electron.cjs", import.meta.url), "utf8");
const biomeSmoke = fs.readFileSync(new URL("./smoke-biomes.cjs", import.meta.url), "utf8");
const modelSmoke = fs.readFileSync(new URL("./smoke-models.cjs", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const forge = fs.readFileSync(new URL("../forge.config.cjs", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.equal(packageJson.dependencies?.three, "0.185.1", "Three.js must be an exact production dependency");
assert.equal(packageJson.version, "0.19.0", "package metadata must match the Organic Silhouette Forge release");
assert.match(html, /<script type="module" src="\.\/src\/renderer3d\.js\?v=17"><\/script>/);
assert.match(html, /<script type="module" src="\.\/src\/game\.js\?v=25"><\/script>/);
assert.match(html, /ORGANIC SILHOUETTE FORGE 0\.19\.0/);
assert.match(renderer, /import \* as THREE from "\.\.\/node_modules\/three\/build\/three\.module\.min\.js"/);
assert.match(renderer, /new THREE\.WebGLRenderer/);
assert.match(renderer, /new THREE\.InstancedMesh/);
assert.match(renderer, /new THREE\.BoxGeometry/);
assert.match(renderer, /new THREE\.MeshToonMaterial/);
assert.match(renderer, /new THREE\.MeshBasicMaterial/);
assert.match(renderer, /new THREE\.DataTexture\(toonBands, 3, 1, THREE\.RedFormat\)/);
assert.match(renderer, /THREE\.NearestFilter/);
assert.match(renderer, /toonBatchFor\(color\)/);
assert.match(renderer, /glowBatchFor\(color\)/);
assert.match(renderer, /new THREE\.GridHelper/);
assert.match(renderer, /new THREE\.PointLight/);
assert.match(renderer, /three-r185-instanced-voxel/);
assert.match(renderer, /toon-glow-light-blocks/);
assert.match(renderer, /saturated-no-black/);
assert.match(renderer, /worldDepthLayers = "3"/);
assert.match(renderer, /biomeDioramas = "9"/);
assert.match(renderer, /projectileVfx = "segmented-toon-trails"/);
assert.match(renderer, /modelFamilies = "3-player-7-alien"/);
assert.match(renderer, /moduleAnatomy = "integrated-large-form"/);
assert.match(renderer, /fighterNose\(base, palette/);
assert.match(renderer, /sweptWing\(base, side, palette/);
assert.match(renderer, /tailFins\(base, palette/);
assert.match(renderer, /drawPlayerModules\(player, base, palette, profile\)/);
assert.match(renderer, /bodyWidth: \.42, bodyLength: 1\.72/);
assert.match(renderer, /bodyWidth: \.49, bodyLength: 1\.94/);
assert.match(renderer, /bodyWidth: \.3, bodyLength: 2\.04/);
assert.match(renderer, /alienCrescent\(base, palette/);
assert.match(renderer, /alienTendril\(base, side, palette/);
assert.match(renderer, /alienEye\(base, x, z, color/);
assert.match(renderer, /drawEnemyChassis\(enemy, base, palette\)/);
assert.match(renderer, /drawIntegratedEnemyModules\(enemy, base, palette, moduleColor\)/);
for (const hull of ["scout", "dart", "tank", "spinner", "mine", "lancer", "carrier"]) assert.match(renderer, new RegExp(`${hull}: \\[`), `missing organic ${hull} palette`);
assert.match(renderer, /Math\.PI \+ spin/, "enemy craft must face the opposite direction from player craft");
assert.match(renderer, /const perspectiveBoost = 1 \+ clamp\(/, "distant enemies must retain a readable silhouette");
const alienSection = renderer.slice(renderer.indexOf("  drawEnemyChassis("), renderer.indexOf("  drawRouteGates("));
assert.doesNotMatch(alienSection, /fighterNose\(|sweptWing\(|tailFins\(/, "alien chassis and bosses must not reuse human fighter anatomy");
const modelSection = renderer.slice(renderer.indexOf("  voxelThruster("), renderer.indexOf("  drawRouteGates("));
const nearBlackModelColors = [...modelSection.matchAll(/"#([0-9a-f]{6})"/ig)]
  .map((match) => match[1])
  .filter((hex) => Math.max(...[0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16))) < 96);
assert.deepEqual(nearBlackModelColors, [], "player and enemy models must not use near-black block colors");

const methodBody = (name, nextName) => renderer.slice(renderer.indexOf(`  ${name}(`), renderer.indexOf(`  ${nextName}(`));
const voxelCallCount = (source) => [...source.matchAll(/this\.voxel\(/g)].length;
assert.ok(voxelCallCount(methodBody("fighterNose", "sweptWing")) <= 4, "fighter nose must follow the four-block Occam budget");
assert.ok(voxelCallCount(methodBody("sweptWing", "tailFins")) <= 4, "each wing must follow the four-block Occam budget");
assert.ok(voxelCallCount(methodBody("tailFins", "drawPlayerModules")) <= 2, "each tail side must follow the two-block Occam budget");
assert.ok(voxelCallCount(methodBody("alienCrescent", "alienTendril")) <= 3, "each alien crescent side must follow the three-block Occam budget");
assert.ok(voxelCallCount(methodBody("alienTendril", "alienEye")) <= 1, "alien tendril segments must share one organic block rule");
const moduleSection = methodBody("drawIntegratedEnemyModules", "drawEnemy");
for (const oldThinModule of ["[.05, .045, 1.2]", "[.055, .045, .24]", "[.07, .045, .66]", "[.08, .045, .5]"]) {
  assert.ok(!moduleSection.includes(oldThinModule), `enemy modules must not regress to detached thin rods: ${oldThinModule}`);
}
assert.match(renderer, /drawProjectile\(bullet, enemy = false\)/);
assert.match(renderer, /drawLandmark\(stageIndex, biome\)/);
assert.match(renderer, /drawFlightCorridor\(biome\)/);
assert.match(renderer, /streamZ\(slot, spacing/);
assert.match(renderer, /projectileTrail\(base, color/);
assert.match(renderer, /Math\.hypot\(particle\.vx/);
assert.match(renderer, /emissiveBatchFor\(color\)/);
for (const biome of ["sugarBloom", "crystalOrchard", "cometTide", "auroraFoundry", "thunderWorks", "cloudReef", "eclipseCarnival", "prismGrave", "voidGarden"]) {
  assert.match(renderer, new RegExp(`biome\\.id === "${biome}"`), `missing dedicated ${biome} diorama`);
  assert.ok(biomeSmoke.includes(`"${biome}"`), `biome matrix smoke is missing ${biome}`);
}
assert.match(game, /URL_PARAMS\.get\("qa-biome"\)/);
assert.match(game, /world\.biomes\[0\] = SpaceExpedition\.BIOMES\.find/);
assert.match(smoke, /three-r185-instanced-voxel/);
assert.match(smoke, /toon-glow-light-blocks/);
assert.match(smoke, /saturated-no-black/);
assert.match(smoke, /segmented-toon-trails/);
assert.match(biomeSmoke, /state\.fps < 45/);
assert.match(biomeSmoke, /consoleErrors/);
assert.match(modelSmoke, /model gallery performance below 50 FPS/);
assert.match(modelSmoke, /moduleAnatomy/);
assert.match(modelSmoke, /errors\.length/);
assert.match(smoke, /getContext\('webgl2'\)/);
assert.match(smoke, /spacescraft-airframe-showcase\.png/);
assert.match(forge, /node_modules\\\/three/, "packaging must exclude unused Three.js sources");
assert.ok(forge.includes("three\\.module\\.min\\.js"), "the runtime Three.js module must remain inside ASAR");

for (const forbidden of [
  /createShader\(/,
  /drawArrays\(/,
  /vertexAttribPointer\(/,
  /bufferData\(/,
  /PlaneGeometry/,
  /SphereGeometry/,
  /TorusGeometry/,
  /OctahedronGeometry/,
  /ConeGeometry/,
]) assert.doesNotMatch(renderer, forbidden, `renderer must not regress to raw face assembly or smooth primitive: ${forbidden}`);

console.log("Three.js renderer verified: nine moving neon dioramas, three depth layers, segmented projectile trails, volumetric particle shards, saturated Toon+Glow color batches, strict Occam block budgets, slim aviation profiles, seven organic alien chassis, and no raw face assembly.");
