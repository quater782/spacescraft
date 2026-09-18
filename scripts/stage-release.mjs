import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const { version } = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const [platform, arch] = process.argv.slice(2);
if (![["windows", "x64"], ["macOS", "arm64"]].some(([p, a]) => p === platform && a === arch)) {
  throw new Error("Usage: node scripts/stage-release.mjs windows x64 | macOS arm64");
}

const makeRoot = path.join(root, "out", "make");
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.isFile()) files.push(target);
  }
}
walk(makeRoot);

const wanted = platform === "windows"
  ? [
      { suffix: "-Setup.exe", match: (file) => /Setup\.exe$/i.test(file) },
      { suffix: "-portable.zip", match: (file) => file.toLowerCase().endsWith(".zip") },
    ]
  : [
      { suffix: ".dmg", match: (file) => file.toLowerCase().endsWith(".dmg") },
    ];

const output = path.join(root, "release", `${platform}-${arch}`);
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const checksums = [];
for (const artifact of wanted) {
  const matches = files.filter(artifact.match).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!matches.length) throw new Error(`No ${artifact.suffix} artifact found under ${makeRoot}`);
  const filename = `SPACECRAFT-${version}-${platform}-${arch}${artifact.suffix}`;
  const destination = path.join(output, filename);
  fs.copyFileSync(matches[0], destination);
  const hash = crypto.createHash("sha256").update(fs.readFileSync(destination)).digest("hex");
  checksums.push(`${hash}  ${filename}`);
}
fs.writeFileSync(path.join(output, `SHA256SUMS-${platform}-${arch}.txt`), `${checksums.join("\n")}\n`);
console.log(JSON.stringify({ platform, arch, output, files: checksums }, null, 2));
