import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const game = fs.readFileSync(new URL("../src/game.js", import.meta.url), "utf8");
const roguelike = fs.readFileSync(new URL("../src/roguelike.js", import.meta.url), "utf8");
const expedition = fs.readFileSync(new URL("../src/expedition.js", import.meta.url), "utf8");
const i18nSource = fs.readFileSync(new URL("../src/i18n.js", import.meta.url), "utf8");

const keys = new Set([
  "pickup.weapon",
  "pickup.repair",
  "pickup.shield",
  "pickup.energy",
  "draft.category.armament",
  "draft.category.mobility",
  "draft.category.system",
  "draft.rarity.common",
  "draft.rarity.rare",
  "draft.rarity.legendary",
  "path.group.support",
  "path.group.offense",
  "path.group.hazard",
]);

for (const match of html.matchAll(/data-i18n(?:-aria-label)?="([^"]+)"/g)) keys.add(match[1]);
for (const match of game.matchAll(/\bt\("([^"]+)"/g)) keys.add(match[1]);
for (const match of game.matchAll(/(?:nameKey|descriptionKey|statsKey|unlockKey|codeKey|subtitleKey|bossKey):\s*"([^"]+)"/g)) keys.add(match[1]);
for (const match of roguelike.matchAll(/(?:nameKey|descriptionKey):\s*"([^"]+)"/g)) keys.add(match[1]);
for (const match of expedition.matchAll(/(?:nameKey|descriptionKey|objectiveKey|riskKey|rewardKey):\s*"([^"]+)"/g)) keys.add(match[1]);
for (const match of game.matchAll(/"(bossPhase\.\d\.\d)"/g)) keys.add(match[1]);

const document = {
  documentElement: { lang: "zh-CN" },
  querySelectorAll: () => [],
  querySelector: () => null,
};
const sandbox = { window: {}, document };
vm.runInNewContext(i18nSource, sandbox, { filename: "src/i18n.js" });

const missing = [];
for (const language of ["zh", "en"]) {
  sandbox.window.SpaceI18n.setLanguage(language);
  for (const key of keys) {
    if (sandbox.window.SpaceI18n.t(key) === key) missing.push(`${language}: ${key}`);
  }
}

if (missing.length) {
  console.error(`Localization verification failed:\n${missing.join("\n")}`);
  process.exit(1);
}

console.log(`Localization verified: ${keys.size} referenced keys × 2 languages.`);
