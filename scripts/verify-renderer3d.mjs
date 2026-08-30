import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const style = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const smoke = fs.readFileSync(new URL("./smoke-electron.cjs", import.meta.url), "utf8");
const biomeSmoke = fs.readFileSync(new URL("./smoke-biomes.cjs", import.meta.url), "utf8");
const modelSmoke = fs.readFileSync(new URL("./smoke-models.cjs", import.meta.url), "utf8");
const bossSmoke = fs.readFileSync(new URL("./smoke-bosses.cjs", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const forge = fs.readFileSync(new URL("../forge.config.cjs", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const methodBody = (name, nextName) => renderer.slice(renderer.indexOf(`  ${name}(`), renderer.indexOf(`  ${nextName}(`));

assert.equal(packageJson.dependencies?.three, "0.185.1", "Three.js must be an exact production dependency");
assert.equal(packageJson.version, "0.24.0", "package metadata must match the Living Sector Anomalies release");
assert.match(html, /<script type="importmap">\{"imports":\{"three":"\.\/node_modules\/three\/build\/three\.module\.min\.js"\}\}<\/script>/);
assert.match(html, /<script type="module" src="\.\/src\/renderer3d\.js\?v=26"><\/script>/);
assert.match(html, /<script type="module" src="\.\/src\/game\.js\?v=30"><\/script>/);
assert.match(html, /LIVING SECTOR ANOMALIES 0\.24\.0/);
assert.match(renderer, /import \* as THREE from "three"/);
assert.match(renderer, /UnrealBloomPass/);
assert.match(renderer, /SMAAPass/);
assert.match(renderer, /OutputPass/);
assert.match(renderer, /this\.composer\.render\(\)/);
assert.match(renderer, /new THREE\.WebGLRenderer/);
assert.match(renderer, /antialias: true/, "coarse voxel geometry must retain full-resolution edge smoothing");
assert.match(renderer, /new THREE\.InstancedMesh/);
assert.match(renderer, /new THREE\.BoxGeometry/);
assert.match(renderer, /new THREE\.MeshToonMaterial/);
assert.match(renderer, /new THREE\.MeshBasicMaterial/);
assert.match(renderer, /new THREE\.DataTexture\(toonBands, 3, 1, THREE\.RedFormat\)/);
assert.match(renderer, /THREE\.NearestFilter/);
assert.match(renderer, /toonBatchFor\(color\)/);
assert.match(renderer, /glowBatchFor\(color\)/);
assert.doesNotMatch(renderer, /new THREE\.GridHelper/, "open space must not retain a perspective ground grid");
assert.match(renderer, /new THREE\.PointLight/);
assert.match(renderer, /three-r185-instanced-voxel/);
assert.match(renderer, /toon-glow-light-blocks/);
assert.match(renderer, /saturated-no-black/);
assert.match(renderer, /worldDepthLayers = "3"/);
assert.match(renderer, /biomeDioramas = "9"/);
assert.match(renderer, /projectileVfx = "segmented-toon-trails"/);
assert.match(renderer, /modelFamilies = "3-player-7-alien"/);
assert.match(renderer, /moduleAnatomy = "integrated-large-form"/);
assert.match(renderer, /bossFamilies = "3-organic-phase-forms"/);
assert.match(renderer, /expeditionSectors = "9-progressive-voxel-gates"/);
assert.match(renderer, /sectorAnomalies = "9-seeded-gameplay-fields"/);
assert.match(renderer, /const MIN_PIXEL_EDGE = \.12/);
assert.match(renderer, /scale\.map\(quantizePixelEdge\)/);
assert.doesNotMatch(renderer, /this\.floor\s*=/, "the world must not retain a hidden or visible continuous floor");
assert.match(renderer, /const litFace = x >= 1 && y >= -1 && z <= 1/, "voxel planets need a side terminator instead of a cylinder-like bright cap");
assert.match(renderer, /pixelGrammar = "coarse-emissive-012"/);
assert.match(renderer, /spaceComposition = "open-celestial-parallax"/);
assert.match(renderer, /ecosystemComposition = "9-macro-mid-sparse"/);
assert.match(renderer, /combatNegativeSpace = "center-55-clear"/);
assert.match(renderer, /nebulaParallax = "3d-additive-dust"/);
assert.match(renderer, /skyAtmosphere = "layered-soft-voxel-nebula"/);
assert.match(renderer, /factionLanguage = "human-kites-vs-void-organisms"/);
assert.match(renderer, /playerModules = "4-integrated-silhouette-parts"/);
assert.match(renderer, /energyBloom = "unreal-selective-5mip"/);
assert.match(renderer, /edgeAA = "native-smaa"/);
assert.match(renderer, /enemyModuleLanguage = "surface-organs"/);
assert.match(renderer, /playerMaterialSeparation = "ceramic-core-engine"/);
assert.match(renderer, /hullExposure = "matte-ceramic-no-bloom"/);
assert.match(renderer, /groundPlane = "none-open-space"/);
assert.match(renderer, /depthScaffolding = "macro-mid-distant"/);
assert.match(renderer, /shieldLanguage = "four-hugging-plates"/);
assert.match(renderer, /bossGalleryView = "neutral-silhouette"/);
assert.match(renderer, /macroLayout = "alternating-edge-anchors"/);
assert.match(renderer, /celestialScaffolding = "opposed-biome-horizon-bodies"/);
assert.match(renderer, /const ECOLOGY_ANCHORS = Object\.freeze/);
for (const anchor of [
  /sugarBloom: \[-15\.2, 1\.8, -24\]/,
  /crystalOrchard: \[14, -\.6, -24\]/,
  /eclipseCarnival: \[0, -\.8, -28\]/,
  /voidGarden: \[14, \.2, -25\]/,
]) assert.match(renderer, anchor, "ecology macros must occupy distinct left/right/top anchors");
assert.match(renderer, /projectileReadability = "dim-friendly-hot-hostile"/);
assert.match(renderer, /ringGrammar = "continuous-segmented-arcs"/);
assert.match(style, /#scene\s*\{[^}]*image-rendering: auto/s);
assert.match(renderer, /const nativeRatio = Math\.min\(1\.5, window\.devicePixelRatio \|\| 1\)/);
assert.match(renderer, /fighterNose\(base, palette/);
assert.match(renderer, /sweptWing\(base, side, palette/);
assert.match(renderer, /tailFins\(base, palette/);
assert.match(renderer, /drawPlayerShield\(base, profile, shieldPulse\)/);
assert.match(renderer, /drawPlayerModules\(player, base, palette, profile\)/);
assert.match(renderer, /bodyWidth: \.56, bodyLength: 1\.7/);
assert.match(renderer, /bodyWidth: \.72, bodyLength: 1\.86/);
assert.match(renderer, /bodyWidth: \.44, bodyLength: 2/);
for (const moduleId of ["flux", "aegis", "repair", "resonance"]) assert.match(renderer, new RegExp(`player\\.moduleId === "${moduleId}"`), `missing integrated player module ${moduleId}`);
const playerModuleSection = methodBody("drawPlayerModules", "drawShip");
for (const oversizedBuffPart of ["[.28, .16, .96]", "[.38, .2, .82]", "[.24 * pulse, .16, 1.04]", "[.38 * pulse, .2, .82]"]) {
  assert.ok(!playerModuleSection.includes(oversizedBuffPart), `temporary buffs must not obscure the clean player silhouette: ${oversizedBuffPart}`);
}
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
assert.doesNotMatch(modelSection, /"#000000"/i, "model structure must remain readable instead of collapsing to pure black");
assert.match(modelSection, /\["#203e5b", "#39d8d5", "#a9bdc0"\]/, "P1 must use navy, cyan and matte ceramic");
assert.match(modelSection, /\["#513344", "#ed765f", "#c8b7ae"\]/, "P2 must use wine, coral and warm matte ceramic");
for (const shell of ["#372354", "#421b3d", "#34304f", "#32204d", "#3d1e4d", "#342342", "#322b49"]) assert.ok(modelSection.includes(shell), `missing readable deep-violet enemy shell ${shell}`);
const enemyChassis = methodBody("drawEnemyChassis", "drawIntegratedEnemyModules");
for (const forbiddenAcidPlate of ["[1.08, .26, .5], side === handed ? palette[2]", "[1.22, .22, .32], palette[2]"]) {
  assert.ok(!enemyChassis.includes(forbiddenAcidPlate), `acid color must stay on eyes and tips instead of large enemy plates: ${forbiddenAcidPlate}`);
}

const voxelCallCount = (source) => [...source.matchAll(/this\.voxel\(/g)].length;
assert.ok(voxelCallCount(methodBody("fighterNose", "sweptWing")) <= 4, "fighter nose must follow the four-block Occam budget");
assert.ok(voxelCallCount(methodBody("sweptWing", "tailFins")) <= 4, "each wing must follow the four-block Occam budget");
assert.ok(voxelCallCount(methodBody("tailFins", "drawPlayerShield")) <= 2, "each tail side must follow the two-block Occam budget");
assert.ok(voxelCallCount(methodBody("drawPlayerShield", "drawPlayerModules")) <= 2, "each player shield side must remain a two-plate surface treatment");
assert.ok(voxelCallCount(methodBody("alienCrescent", "alienTendril")) <= 3, "each alien crescent side must follow the three-block Occam budget");
assert.ok(voxelCallCount(methodBody("alienTendril", "alienEye")) <= 1, "alien tendril segments must share one organic block rule");
const moduleSection = methodBody("drawIntegratedEnemyModules", "drawEnemy");
for (const oldThinModule of ["[.05, .045, 1.2]", "[.055, .045, .24]", "[.07, .045, .66]", "[.08, .045, .5]"]) {
  assert.ok(!moduleSection.includes(oldThinModule), `enemy modules must not regress to detached thin rods: ${oldThinModule}`);
}
for (const bossBuilder of ["drawBossBloom", "drawBossForge", "drawBossVoid"]) assert.match(renderer, new RegExp(`${bossBuilder}\\(enemy, base, palette\\)`), `missing independent boss builder ${bossBuilder}`);
const bossSection = methodBody("drawBossBloom", "drawModelGallery");
assert.doesNotMatch(bossSection, /alienCrescent\(|alienTendril\(/, "bosses must not reuse ordinary alien appendages");
assert.doesNotMatch(bossSection, /voxelThruster\(/, "organic bosses must use energy glands instead of human thrusters");
assert.match(bossSection, /phase >= 2/);
assert.match(bossSection, /phase >= 3/);
for (const oldThinBossPart of ["[.09, .38, 1.12]", "[.7, .07, .16]", "[.16, .42, 1.52]"]) {
  assert.ok(!bossSection.includes(oldThinBossPart), `bosses must not regress to thin rods: ${oldThinBossPart}`);
}
assert.match(renderer, /drawProjectile\(bullet, enemy = false\)/);
for (const stage of [0, 1, 2]) assert.match(renderer, new RegExp(`bullet\\.bossStage === ${stage}`), `missing stage ${stage + 1} boss projectile form`);
assert.match(renderer, /drawLandmark\(stageIndex, biome\)/);
assert.match(renderer, /drawFlightCorridor\(biome\)/);
assert.match(renderer, /drawCosmicBiomeFeatures\(biome\)/);
assert.match(renderer, /drawSpaceEcology\(biome\)/);
assert.match(renderer, /drawDistantCelestial\(biome\)/);
assert.match(renderer, /createNebulaCloud\(count, size, seed, opacity\)/);
assert.match(renderer, /createNebulaTexture\(\)/);
assert.match(renderer, /new THREE\.CanvasTexture\(canvas\)/);
assert.match(renderer, /THREE\.AdditiveBlending/);
assert.match(renderer, /voxelRing\(base, radius/);
assert.match(renderer, /voxelPolyline\(base, points/);
assert.match(renderer, /new UnrealBloomPass\(new THREE\.Vector2\(1280, 720\), \.3, \.1, 1\.03\)/, "bloom must stay compact and above display white");
assert.match(renderer, /material\.color\.multiplyScalar\(1\.65\)/, "energy voxels must enter HDR without lifting ordinary hulls");
assert.doesNotMatch(methodBody("drawLandmark", "projectileTrail"), /drawBiomeFeatures\(/, "the live environment path must not restore the old tunnel-side prop stream");
assert.match(renderer, /this\.renderer\.toneMappingExposure = \.9/);
assert.match(renderer, /new THREE\.AmbientLight\("#dce8ff", \.16\)/);
assert.match(renderer, /new THREE\.HemisphereLight\("#c8dcf2", "#29183d", \.64\)/);
assert.match(renderer, /new THREE\.DirectionalLight\("#e5eff5", 1\.08\)/);
assert.match(renderer, /streamZ\(slot, spacing/);
assert.match(renderer, /distantEcologyZ\(slot, spacing/);
assert.match(renderer, /const depthBand = 30/, "background ecology must remain inside a bounded far-depth band");
assert.match(renderer, /projectileTrail\(base, color/);
assert.match(renderer, /const beamSegments = clamp\(Math\.ceil\(length \/ \.72\), 3, 8\)/, "the resonance link must remain a chunky segmented pixel beam");
assert.match(renderer, /Math\.hypot\(particle\.vx/);
assert.match(renderer, /emissiveBatchFor\(color\)/);
for (const biome of ["sugarBloom", "crystalOrchard", "cometTide", "auroraFoundry", "thunderWorks", "cloudReef", "eclipseCarnival", "prismGrave", "voidGarden"]) {
  assert.match(renderer, new RegExp(`biome\\.id === "${biome}"`), `missing dedicated ${biome} diorama`);
  assert.ok(biomeSmoke.includes(`"${biome}"`), `biome matrix smoke is missing ${biome}`);
}
assert.match(game, /URL_PARAMS\.get\("qa-biome"\)/);
assert.match(game, /URL_PARAMS\.has\("qa-boss-gallery"\)/);
assert.match(game, /bossStage: source\?\.boss \? world\.stageIndex : null/);
assert.match(game, /world\.biomes\[0\] = SpaceExpedition\.BIOMES\.find/);
assert.match(smoke, /three-r185-instanced-voxel/);
assert.match(smoke, /toon-glow-light-blocks/);
assert.match(smoke, /saturated-no-black/);
assert.match(smoke, /segmented-toon-trails/);
assert.match(smoke, /coarse-emissive-012/);
assert.match(smoke, /open-celestial-parallax/);
assert.match(smoke, /9-macro-mid-sparse/);
assert.match(smoke, /center-55-clear/);
assert.match(smoke, /3d-additive-dust/);
assert.match(smoke, /layered-soft-voxel-nebula/);
assert.match(smoke, /unreal-selective-5mip/);
assert.match(smoke, /native-smaa/);
assert.match(smoke, /surface-organs/);
assert.match(smoke, /ceramic-core-engine/);
assert.match(smoke, /dim-friendly-hot-hostile/);
assert.match(smoke, /continuous-segmented-arcs/);
assert.match(smoke, /matte-ceramic-no-bloom/);
assert.match(smoke, /none-open-space/);
assert.match(smoke, /macro-mid-distant/);
assert.match(smoke, /four-hugging-plates/);
assert.match(smoke, /alternating-edge-anchors/);
assert.match(smoke, /opposed-biome-horizon-bodies/);
assert.match(modelSmoke, /human-kites-vs-void-organisms/);
assert.match(modelSmoke, /4-integrated-silhouette-parts/);
assert.match(biomeSmoke, /state\.fps < 45/);
assert.match(biomeSmoke, /consoleErrors/);
assert.match(modelSmoke, /model gallery performance below 50 FPS/);
assert.match(modelSmoke, /moduleAnatomy/);
assert.match(modelSmoke, /errors\.length/);
assert.match(bossSmoke, /for \(const phase of \[1, 2, 3\]\)/);
assert.match(bossSmoke, /boss gallery performance below 50 FPS/);
assert.match(bossSmoke, /3-organic-phase-forms/);
assert.match(bossSmoke, /neutral-silhouette/);
assert.match(bossSmoke, /errors\.length/);
assert.match(smoke, /getContext\('webgl2'\)/);
assert.match(smoke, /spacescraft-airframe-showcase\.png/);
assert.match(forge, /node_modules\\\/three/, "packaging must exclude unused Three.js sources");
assert.ok(forge.includes("three\\.module\\.min\\.js"), "the runtime Three.js module must remain inside ASAR");
assert.ok(
  forge.includes("examples(?:$|\\/jsm(?:$|\\/(?:postprocessing|shaders)(?:$|\\/)))"),
  "packaging must retain the Three.js examples/jsm parent directories and the postprocessing/shaders runtime graph"
);

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

console.log("Three.js renderer verified: open celestial parallax, coarse 0.12-unit emissive voxels, simplified modular human kites, seven unified void organisms, distinct hostile seed bullets, nine floating dioramas and no raw face assembly.");
