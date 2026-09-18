import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { verifyPackage } = require("./verify-package.cjs");
const forgeConfig = require("../forge.config.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist", "web");

const assets = verifyPackage(root, forgeConfig.packagerConfig.ignore);
await fs.rm(output, { recursive: true, force: true });

for (const relative of assets) {
  const source = path.join(root, relative);
  const target = path.join(output, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

await fs.writeFile(path.join(output, ".nojekyll"), "");
verifyPackage(output);

const sizes = await Promise.all(assets.map(async (relative) => (await fs.stat(path.join(output, relative))).size));
const bytes = sizes.reduce((total, size) => total + size, 0);
console.log(`Web release staged: ${assets.length} assets, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
