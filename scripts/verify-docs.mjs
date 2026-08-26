import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules", "out", "dist"]);
const requiredFiles = [
  "AGENTS.md",
  "src/AGENTS.md",
  "electron/AGENTS.md",
  "docs/AGENTS.md",
  "docs/README.md",
  "docs/ARCHITECTURE.md",
  "docs/CODEX-WORKFLOW.md",
  "docs/PROJECT-STATE.md",
];

async function collectMarkdown(directory) {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".github") continue;
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdown(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".md")) files.push(fullPath);
  }
  return files;
}

const failures = [];
for (const relativePath of requiredFiles) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    failures.push(`Missing required document: ${relativePath}`);
  }
}

const markdownFiles = await collectMarkdown(root);
let localLinkCount = 0;

for (const file of markdownFiles) {
  const contents = await readFile(file, "utf8");
  if (path.basename(file) === "AGENTS.md") {
    const details = await stat(file);
    if (details.size > 12_000) {
      failures.push(`${path.relative(root, file)} is ${details.size} bytes; keep Codex instructions below 12000 bytes`);
    }
  }

  const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
  for (const match of contents.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (/^(?:https?:|mailto:|tel:|#)/i.test(target)) continue;
    target = target.split("#", 1)[0].split("?", 1)[0];
    if (!target) continue;

    localLinkCount += 1;
    let decodedTarget;
    try {
      decodedTarget = decodeURIComponent(target);
    } catch {
      failures.push(`${path.relative(root, file)} has an invalid encoded link: ${target}`);
      continue;
    }

    const resolved = path.resolve(path.dirname(file), decodedTarget);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      failures.push(`${path.relative(root, file)} links outside the repository: ${target}`);
      continue;
    }
    try {
      await access(resolved);
    } catch {
      failures.push(`${path.relative(root, file)} has a broken local link: ${target}`);
    }
  }
}

if (failures.length) {
  console.error(`Documentation verification failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Documentation verified: ${markdownFiles.length} Markdown files, ${localLinkCount} local links.`);
}
