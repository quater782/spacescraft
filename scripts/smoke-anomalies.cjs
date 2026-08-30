const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-anomaly-matrix");
const anomalyIds = [
  "crystalHush",
  "ionBloom",
  "cometDraft",
  "auroraCurrent",
  "gravityLens",
  "prismStorm",
  "magnetarTide",
  "chronoRift",
  "voidSurge",
];
const openingIds = new Set(anomalyIds.slice(0, 3));
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end("not found");
    return;
  }
  response.setHeader("Content-Type", mime[path.extname(target)] || "application/octet-stream");
  response.end(fs.readFileSync(target));
});

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-anomaly-smoke-${process.pid}`));

async function launch(window, url) {
  await window.loadURL(url);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
}

async function readState(window) {
  return window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    const scene = document.querySelector('#scene');
    const gl = scene.getContext('webgl2') || scene.getContext('webgl');
    return {
      mode: game.dataset.mode,
      stageTime: Number(game.dataset.stageTime),
      fps: Number(game.dataset.fps),
      qa: game.dataset.qa,
      enemies: Number(game.dataset.enemies),
      bullets: Number(game.dataset.enemyBullets),
      hp: game.dataset.playerHp.split(',').map(Number),
      anomalyId: game.dataset.anomalyId,
      anomalyKind: game.dataset.anomalyKind,
      anomalyPlan: game.dataset.anomalyPlan,
      anomalyCount: Number(game.dataset.anomalyCount),
      anomalyIntensity: Number(game.dataset.anomalyIntensity),
      anomalyPolarity: Number(game.dataset.anomalyPolarity),
      anomalyForce: game.dataset.anomalyForce.split(',').map(Number),
      spawnRate: Number(game.dataset.anomalySpawnRate),
      bulletSpeed: Number(game.dataset.anomalyBulletSpeed),
      moveSpeed: Number(game.dataset.anomalyMoveSpeed),
      enemyFireRate: Number(game.dataset.anomalyEnemyFireRate),
      dropRate: Number(game.dataset.anomalyDropRate),
      playerSpeed: Number(game.dataset.anomalyPlayerSpeed),
      fireRate: Number(game.dataset.anomalyFireRate),
      energyRate: Number(game.dataset.anomalyEnergyRate),
      pickupMagnet: Number(game.dataset.anomalyPickupMagnet),
      score: Number(game.dataset.anomalyScore),
      renderer: scene.dataset.renderer,
      artStyle: scene.dataset.artStyle,
      palette: scene.dataset.modelPalette,
      sectorAnomalies: scene.dataset.sectorAnomalies,
      sceneAnomaly: scene.dataset.anomalyId,
      anomalyColor: scene.dataset.anomalyColor,
      anomalySecondary: scene.dataset.anomalySecondary,
      webgl: Boolean(gl),
    };
  })()`);
}

async function sampleAnomaly(window, port, anomalyId, index, errors) {
  await launch(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=0&qa-anomaly=${anomalyId}&seed=${2400 + index}`);
  let state = null;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await delay(100);
    state = await readState(window);
    if (state.mode === "playing" && state.stageTime >= 2.2 && state.fps >= 42) break;
  }
  if (!state || state.anomalyId !== anomalyId || state.sceneAnomaly !== anomalyId || !state.qa.includes(`anomaly-${anomalyId}`)) throw new Error(`anomaly override failed for ${anomalyId}: ${JSON.stringify(state)}`);
  if (!state.webgl || state.renderer !== "three-r185-instanced-voxel") throw new Error(`WebGL unavailable for ${anomalyId}: ${JSON.stringify(state)}`);
  if (state.artStyle !== "toon-glow-light-blocks" || state.palette !== "saturated-no-black" || state.sectorAnomalies !== "9-seeded-gameplay-fields") throw new Error(`anomaly rendering contract missing for ${anomalyId}: ${JSON.stringify(state)}`);
  if (state.anomalyCount !== 9 || state.anomalyPlan.split(/[>|]/).length !== 9) throw new Error(`nine-sector anomaly plan missing for ${anomalyId}: ${JSON.stringify(state)}`);
  if (!/^#[0-9a-f]{6}$/i.test(state.anomalyColor) || !/^#[0-9a-f]{6}$/i.test(state.anomalySecondary) || state.anomalyColor === "#000000" || state.anomalySecondary === "#000000") throw new Error(`saturated field colors missing for ${anomalyId}: ${JSON.stringify(state)}`);
  for (const metric of ["anomalyIntensity", "anomalyPolarity", "spawnRate", "bulletSpeed", "moveSpeed", "enemyFireRate", "dropRate", "playerSpeed", "fireRate", "energyRate", "pickupMagnet", "score"]) {
    if (!Number.isFinite(state[metric])) throw new Error(`${anomalyId} has non-finite ${metric}: ${JSON.stringify(state)}`);
  }
  if (state.fps < 42) throw new Error(`anomaly performance below 42 FPS for ${anomalyId}: ${state.fps}`);
  const hudScreenshot = path.join(outputRoot, `${String(index + 1).padStart(2, "0")}-${anomalyId}-hud.png`);
  fs.writeFileSync(hudScreenshot, (await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'hidden'; true");
  await delay(60);
  const screenshot = path.join(outputRoot, `${String(index + 1).padStart(2, "0")}-${anomalyId}.png`);
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
  await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = ''; true");
  if (errors.length) throw new Error(`console errors while sampling ${anomalyId}: ${errors.join(" | ")}`);
  return { ...state, hudScreenshot, screenshot };
}

async function sampleOpening(window, port, errors) {
  await launch(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=1&seed=2424`);
  const summary = { maxEnemies: 0, maxBullets: 0, maxBulletsBeforeSix: 0, minHp: Number.POSITIVE_INFINITY };
  let state = null;
  for (let attempt = 0; attempt < 260; attempt += 1) {
    await delay(100);
    state = await readState(window);
    summary.maxEnemies = Math.max(summary.maxEnemies, state.enemies);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    if (state.stageTime <= 6) summary.maxBulletsBeforeSix = Math.max(summary.maxBulletsBeforeSix, state.bullets);
    summary.minHp = Math.min(summary.minHp, ...state.hp);
    if (state.stageTime >= 20) break;
  }
  if (!state || state.stageTime < 20) throw new Error(`normal-speed anomaly opening did not reach 20 seconds: ${JSON.stringify(state)}`);
  if (!openingIds.has(state.anomalyId)) throw new Error(`opening used a late-game anomaly: ${JSON.stringify(state)}`);
  if (state.spawnRate > 1 || state.bulletSpeed > 1 || state.moveSpeed > 1 || state.enemyFireRate > 1) throw new Error(`opening anomaly broke hostile safety multipliers: ${JSON.stringify(state)}`);
  if (summary.maxBulletsBeforeSix !== 0) throw new Error(`opening six-second ceasefire regressed: ${JSON.stringify(summary)}`);
  if (summary.maxEnemies > 6) throw new Error(`opening enemy cap regressed: ${JSON.stringify(summary)}`);
  if (summary.minHp <= 0) throw new Error(`a pilot was downed during the anomaly opening: ${JSON.stringify(summary)}`);
  if (state.fps < 40) throw new Error(`normal-speed anomaly opening performance below 40 FPS: ${state.fps}`);
  if (errors.length) throw new Error(`console errors during anomaly opening: ${errors.join(" | ")}`);
  return { ...state, ...summary };
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const fields = [];
  for (const [index, anomalyId] of anomalyIds.entries()) fields.push(await sampleAnomaly(window, port, anomalyId, index, errors));
  const opening = await sampleOpening(window, port, errors);
  process.stdout.write(`${JSON.stringify({ fields, opening, consoleErrors: errors.length, outputRoot })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
