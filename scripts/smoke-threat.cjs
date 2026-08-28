const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-threat-matrix");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-threat-smoke-${process.pid}`));

async function sampleTier(window, port, tier, errors) {
  await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-path=0&qa-threat=${tier}&seed=${2300 + tier}`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  let state = null;
  for (let attempt = 0; attempt < 35; attempt += 1) {
    await delay(100);
    state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      const scene = document.querySelector('#scene');
      const gl = scene.getContext('webgl2') || scene.getContext('webgl');
      return {
        mode: game.dataset.mode,
        stageTime: game.dataset.stageTime,
        fps: Number(game.dataset.fps),
        tier: Number(game.dataset.threatTier),
        id: game.dataset.threatId,
        target: Number(game.dataset.threatTarget),
        spawnRate: Number(game.dataset.threatSpawnRate),
        bulletSpeed: Number(game.dataset.threatBulletSpeed),
        fireRate: Number(game.dataset.threatFireRate),
        enemyHp: Number(game.dataset.threatEnemyHp),
        aimSpread: Number(game.dataset.threatAimSpread),
        renderer: scene.dataset.renderer,
        adaptiveThreat: scene.dataset.adaptiveThreat,
        sceneTier: Number(scene.dataset.threatTier),
        threatColor: scene.dataset.threatColor,
        webgl: Boolean(gl),
      };
    })()`);
    if (state.mode === "playing" && Number(state.stageTime) >= 8 && state.tier === tier && state.fps >= 40) break;
  }
  if (state.tier !== tier || state.target !== tier || state.sceneTier !== tier) throw new Error(`forced tier ${tier} did not settle: ${JSON.stringify(state)}`);
  if (state.renderer !== "three-r185-instanced-voxel" || state.adaptiveThreat !== "5-tier-telegraphed" || !state.webgl) throw new Error(`adaptive WebGL contract missing at tier ${tier}: ${JSON.stringify(state)}`);
  if (state.fps < 40) throw new Error(`adaptive threat smoke performance below 40 FPS at tier ${tier}: ${state.fps}`);
  if (!state.threatColor || state.threatColor === "#000000") throw new Error(`tier ${tier} lacks a saturated corridor telegraph`);
  const screenshot = path.join(outputRoot, tier === 0 ? "relief.png" : "apex.png");
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
  if (errors.length) throw new Error(`console errors at tier ${tier}: ${errors.join(" | ")}`);
  return { ...state, screenshot };
}

async function sampleOpening(window, port, errors) {
  await window.loadURL(`http://127.0.0.1:${port}/?qa-voxel&qa-path=1&seed=2310`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  const summary = { maxTier: 0, maxEnemies: 0, maxBullets: 0, maxBulletsBeforeSix: 0, minHp: Number.POSITIVE_INFINITY };
  let state = null;
  for (let attempt = 0; attempt < 260; attempt += 1) {
    await delay(100);
    state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      return {
        mode: game.dataset.mode,
        stageTime: Number(game.dataset.stageTime),
        fps: Number(game.dataset.fps),
        tier: Number(game.dataset.threatTier),
        id: game.dataset.threatId,
        enemies: Number(game.dataset.enemies),
        bullets: Number(game.dataset.enemyBullets),
        hp: game.dataset.playerHp.split(',').map(Number),
      };
    })()`);
    summary.maxTier = Math.max(summary.maxTier, state.tier);
    summary.maxEnemies = Math.max(summary.maxEnemies, state.enemies);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    if (state.stageTime <= 6) summary.maxBulletsBeforeSix = Math.max(summary.maxBulletsBeforeSix, state.bullets);
    summary.minHp = Math.min(summary.minHp, ...state.hp);
    if (state.stageTime >= 20) break;
  }
  if (!state || state.stageTime < 20) throw new Error(`normal-speed opening did not reach 20 seconds: ${JSON.stringify(state)}`);
  if (summary.maxTier > 1) throw new Error(`opening safety envelope exceeded cruise: ${JSON.stringify(summary)}`);
  if (summary.maxBulletsBeforeSix !== 0) throw new Error(`opening ceasefire regressed: ${JSON.stringify(summary)}`);
  if (summary.maxEnemies > 6) throw new Error(`opening enemy cap regressed: ${JSON.stringify(summary)}`);
  if (summary.minHp <= 0) throw new Error(`a player was downed during the opening envelope: ${JSON.stringify(summary)}`);
  if (state.fps < 40) throw new Error(`normal-speed opening performance below 40 FPS: ${state.fps}`);
  if (errors.length) throw new Error(`console errors during normal-speed opening: ${errors.join(" | ")}`);
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
  const relief = await sampleTier(window, port, 0, errors);
  const apex = await sampleTier(window, port, 4, errors);
  const opening = await sampleOpening(window, port, errors);
  for (const metric of ["spawnRate", "bulletSpeed", "fireRate", "enemyHp"]) {
    if (!(apex[metric] > relief[metric])) throw new Error(`${metric} is not adaptive: ${JSON.stringify({ relief: relief[metric], apex: apex[metric] })}`);
  }
  if (!(apex.aimSpread < relief.aimSpread)) throw new Error(`aim spread did not tighten: ${JSON.stringify({ relief: relief.aimSpread, apex: apex.aimSpread })}`);
  process.stdout.write(`${JSON.stringify({ relief, apex, opening, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
