import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const source = join(projectRoot, "favicon.svg");
const assetDirectory = join(projectRoot, "assets");
const workingDirectory = mkdtempSync(join(tmpdir(), "spacecraft-icon-"));
const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const renderSizes = [...new Set([...icoSizes, 512, 1024])];

mkdirSync(assetDirectory, { recursive: true });

try {
  const renderedPngs = new Map();
  renderSizes.forEach((size) => {
    const outputDirectory = join(workingDirectory, `render-${size}`);
    mkdirSync(outputDirectory);
    execFileSync("qlmanage", ["-t", "-s", String(size), "-o", outputDirectory, source], { stdio: "ignore" });
    renderedPngs.set(size, readFileSync(join(outputDirectory, "favicon.svg.png")));
  });

  const images = icoSizes.map((size) => ({ size, data: renderedPngs.get(size) }));

  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = headerSize;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, entry);
    header.writeUInt8(size === 256 ? 0 : size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });

  writeFileSync(join(assetDirectory, "icon.ico"), Buffer.concat([header, ...images.map(({ data }) => data)]));
  writeFileSync(join(assetDirectory, "icon-256.png"), renderedPngs.get(256));

  const iconset = join(workingDirectory, "icon.iconset");
  mkdirSync(iconset);
  const icnsEntries = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024]
  ];
  icnsEntries.forEach(([filename, size]) => writeFileSync(join(iconset, filename), renderedPngs.get(size)));
  execFileSync("iconutil", ["-c", "icns", "-o", join(assetDirectory, "icon.icns"), iconset], { stdio: "ignore" });

  console.log(`Generated ${images.length}-resolution ICO, 256px PNG, and ICNS from ${source}`);
} finally {
  rmSync(workingDirectory, { recursive: true, force: true });
}
