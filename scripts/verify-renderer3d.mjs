import assert from "node:assert/strict";
import fs from "node:fs";

const renderer = fs.readFileSync(new URL("../src/renderer3d.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const smoke = fs.readFileSync(new URL("./smoke-electron.cjs", import.meta.url), "utf8");
const forge = fs.readFileSync(new URL("../forge.config.cjs", import.meta.url), "utf8");
const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));

assert.equal(packageJson.dependencies?.three, "0.185.1", "Three.js must be an exact production dependency");
assert.match(html, /<script type="module" src="\.\/src\/renderer3d\.js\?v=13"><\/script>/);
assert.match(html, /<script type="module" src="\.\/src\/game\.js\?v=22"><\/script>/);
assert.match(renderer, /import \* as THREE from "\.\.\/node_modules\/three\/build\/three\.module\.min\.js"/);
assert.match(renderer, /new THREE\.WebGLRenderer/);
assert.match(renderer, /new THREE\.InstancedMesh/);
assert.match(renderer, /new THREE\.BoxGeometry/);
assert.match(renderer, /new THREE\.MeshStandardMaterial/);
assert.match(renderer, /new THREE\.MeshBasicMaterial/);
assert.match(renderer, /new THREE\.GridHelper/);
assert.match(renderer, /new THREE\.PointLight/);
assert.match(renderer, /three-r185-instanced-voxel/);
assert.match(renderer, /fighterNose\(base, palette/);
assert.match(renderer, /sweptWing\(base, side, palette/);
assert.match(renderer, /tailFins\(base, palette/);
assert.match(renderer, /Math\.PI \+ spin/, "enemy craft must face the opposite direction from player craft");
assert.match(renderer, /drawProjectile\(bullet, enemy = false\)/);
assert.match(renderer, /drawLandmark\(stageIndex, biome\)/);
assert.match(renderer, /emissiveBatchFor\(color\)/);
assert.match(smoke, /three-r185-instanced-voxel/);
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

console.log("Three.js renderer verified: instanced BoxGeometry art, stable solid/emissive/glow depth layers, opposing fighter headings, voxel backgrounds/projectiles, and no raw face assembly.");
