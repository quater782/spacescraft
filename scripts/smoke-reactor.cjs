const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(os.tmpdir(), "spacescraft-reactor-gates");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-reactor-smoke-${process.pid}`));

async function startRun(window, url) {
  await window.loadURL(url);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
}

async function stateOf(window) {
  return window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    const scene = document.querySelector('#scene');
    const pair = (value) => String(value || '').split('|').map(Number);
    return {
      mode: game.dataset.mode,
      qa: game.dataset.qa,
      stage: Number(game.dataset.stage),
      stageTime: Number(game.dataset.stageTime),
      bullets: Number(game.dataset.enemyBullets),
      beams: Number(game.dataset.enemyBeams),
      playerEnergy: pair(game.dataset.novaSharedMirrors),
      teamNovaCharge: Number(game.dataset.teamNovaCharge),
      novaCount: Number(game.dataset.novaCount),
      novaCooldown: Number(game.dataset.novaCooldown),
      novaMinInterval: Number(game.dataset.novaMinInterval),
      novaLocalClears: Number(game.dataset.novaLocalClears),
      novaFullClears: Number(game.dataset.novaFullClears),
      novaOutsideSurvivors: Number(game.dataset.novaOutsideSurvivors),
      novaBeamsAtTrigger: Number(game.dataset.novaBeamsAtTrigger),
      novaBeamsCleared: Number(game.dataset.novaBeamsCleared),
      novaSelfChargeRejected: Number(game.dataset.novaSelfChargeRejected),
      novaSuppressedDeathrattles: Number(game.dataset.novaSuppressedDeathrattles),
      novaHazardFragments: Number(game.dataset.novaHazardFragments),
      novaLastRadius: Number(game.dataset.novaLastRadius),
      rushCharge: Number(game.dataset.rushCharge),
      rushActive: game.dataset.rushActive === 'true',
      rushTimer: Number(game.dataset.rushTimer),
      rushCooldown: Number(game.dataset.rushCooldown),
      rushCount: Number(game.dataset.rushCount),
      rushStartClears: Number(game.dataset.rushStartClears),
      rushGuardClears: Number(game.dataset.rushGuardClears),
      rushGuardLimit: Number(game.dataset.rushGuardLimit),
      rushMoveSpeed: Number(game.dataset.rushMoveSpeed),
      rushHandling: Number(game.dataset.rushHandling),
      rushFireRate: Number(game.dataset.rushFireRate),
      rushDamage: Number(game.dataset.rushDamage),
      upgrades: game.dataset.upgrades,
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
}

function requireFiniteDiagnostics(state, names, scenario) {
  const missing = names.filter((name) => !Number.isFinite(state[name]));
  if (missing.length) throw new Error(`${scenario} diagnostics missing or non-finite: ${missing.join(", ")}`);
}

function assertRenderer(state, scenario) {
  if (!state?.webgl || state.renderer !== "three-r185-instanced-voxel" || state.fps < 40) {
    throw new Error(`${scenario} renderer contract failed: ${JSON.stringify(state)}`);
  }
}

async function sampleNova(window, port, errors) {
  errors.splice(0);
  const url = `http://127.0.0.1:${port}/?qa-fast&qa-voxel&qa-nova&qa-boss-state&qa-boss-phase=3&qa-combat-stage=2&qa-combat-progress=0.95&qa-path=1&seed=3401`;
  await startRun(window, url);
  const summary = {
    maxCountJump: 0,
    minimumPostTriggerCharge: Number.POSITIVE_INFINITY,
    maxBullets: 0,
    maxBeams: 0,
    mirrorDrift: 0,
    screenshot: path.join(outputDirectory, "shared-nova-local-purge.png"),
  };
  let previousCount = 0;
  let captured = false;
  let state = null;
  for (let sample = 0; sample < 500; sample += 1) {
    await delay(100);
    state = await stateOf(window);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets || 0);
    summary.maxBeams = Math.max(summary.maxBeams, state.beams || 0);
    if (state.playerEnergy.length === 2 && state.playerEnergy.every(Number.isFinite)) {
      summary.mirrorDrift = Math.max(summary.mirrorDrift, Math.abs(state.playerEnergy[0] - state.playerEnergy[1]), Math.abs(state.playerEnergy[0] - state.teamNovaCharge));
    }
    if (state.novaCount > previousCount) {
      summary.maxCountJump = Math.max(summary.maxCountJump, state.novaCount - previousCount);
      summary.minimumPostTriggerCharge = Math.min(summary.minimumPostTriggerCharge, state.teamNovaCharge);
      previousCount = state.novaCount;
    }
    if (!captured && state.novaCount >= 1 && state.novaOutsideSurvivors > 0 && state.novaBeamsAtTrigger > 0) {
      fs.writeFileSync(summary.screenshot, (await window.webContents.capturePage()).toPNG());
      captured = true;
    }
    if (state.novaCount >= 2 && state.novaMinInterval >= 14 && state.novaSelfChargeRejected > 0) break;
    if (state.mode !== "playing") break;
  }
  requireFiniteDiagnostics(state, [
    "teamNovaCharge", "novaCount", "novaCooldown", "novaMinInterval", "novaLocalClears", "novaFullClears",
    "novaOutsideSurvivors", "novaBeamsAtTrigger", "novaBeamsCleared", "novaSelfChargeRejected", "novaSuppressedDeathrattles", "novaHazardFragments", "novaLastRadius",
  ], "shared Nova");
  if (!state.qa.includes("nova") || state.stage !== 2) throw new Error(`shared Nova QA did not settle: ${JSON.stringify(state)}`);
  if (state.playerEnergy.length !== 2 || !state.playerEnergy.every(Number.isFinite)) throw new Error(`shared Nova did not publish exactly two pilot mirrors: ${JSON.stringify(state)}`);
  if (summary.mirrorDrift > .02) throw new Error(`pilot energy mirrors diverged from the one team reactor: ${JSON.stringify({ state, summary })}`);
  if (summary.maxCountJump !== 1 || state.novaCount < 2) throw new Error(`one full reactor produced anything other than one Nova per cooldown: ${JSON.stringify({ state, summary })}`);
  if (state.novaMinInterval < 14 || state.novaCooldown < 0) throw new Error(`Nova bypassed its 14 second cadence floor: ${JSON.stringify({ state, summary })}`);
  if (state.novaLocalClears < 1 || state.novaFullClears !== 0 || state.novaOutsideSurvivors < 1) throw new Error(`baseline Nova was not a local purge with distant survivors: ${JSON.stringify({ state, summary })}`);
  if (state.novaBeamsAtTrigger < 1 || state.novaBeamsCleared !== 0) throw new Error(`baseline Nova cleared a persistent laser or never met one: ${JSON.stringify({ state, summary })}`);
  if (state.novaSelfChargeRejected < 1) throw new Error(`Nova kill energy was not rejected by the reactor: ${JSON.stringify({ state, summary })}`);
  if (state.novaSuppressedDeathrattles < 1 || state.novaHazardFragments !== 0) throw new Error(`Nova purge allowed a cleared mine, blast seed, or killed enemy to repopulate its safe pocket: ${JSON.stringify({ state, summary })}`);
  if (state.novaLastRadius < 60 || state.novaLastRadius > 100) throw new Error(`baseline Nova radius is not local: ${JSON.stringify({ state, summary })}`);
  if (summary.minimumPostTriggerCharge > 5) throw new Error(`shared charge did not discharge once when Nova fired: ${JSON.stringify({ state, summary })}`);
  if (summary.maxBullets < 5 || summary.maxBeams < 1) throw new Error(`Nova gate never exercised mixed projectile pressure: ${JSON.stringify({ state, summary })}`);
  if (!captured) fs.writeFileSync(summary.screenshot, (await window.webContents.capturePage()).toPNG());
  assertRenderer(state, "shared Nova");
  if (errors.length) throw new Error(`console errors during shared Nova: ${errors.join(" | ")}`);
  return { ...state, ...summary };
}

async function sampleRush(window, port, errors) {
  errors.splice(0);
  const url = `http://127.0.0.1:${port}/?qa-fast&qa-voxel&qa-rush&qa-boss-state&qa-boss-phase=2&qa-combat-stage=2&qa-combat-progress=0.95&qa-path=1&seed=3402`;
  await startRun(window, url);
  const summary = {
    sawActive: false,
    sawEnd: false,
    sawCooldownEnd: false,
    maxTimer: 0,
    maxCooldown: 0,
    maxBulletsDuringRush: 0,
    screenshot: path.join(outputDirectory, "baseline-rush-under-fire.png"),
  };
  let captured = false;
  let state = null;
  for (let sample = 0; sample < 230; sample += 1) {
    await delay(100);
    state = await stateOf(window);
    summary.sawActive ||= state.rushActive;
    summary.maxTimer = Math.max(summary.maxTimer, state.rushTimer || 0);
    summary.maxCooldown = Math.max(summary.maxCooldown, state.rushCooldown || 0);
    if (state.rushActive) summary.maxBulletsDuringRush = Math.max(summary.maxBulletsDuringRush, state.bullets || 0);
    if (summary.sawActive && !state.rushActive && state.rushCooldown > 0) summary.sawEnd = true;
    if (summary.sawEnd && state.rushCooldown <= .05) summary.sawCooldownEnd = true;
    if (!captured && state.rushActive && state.bullets > 0) {
      fs.writeFileSync(summary.screenshot, (await window.webContents.capturePage()).toPNG());
      captured = true;
    }
    if (summary.sawCooldownEnd) break;
    if (state.mode !== "playing") break;
  }
  requireFiniteDiagnostics(state, [
    "rushCharge", "rushTimer", "rushCooldown", "rushCount", "rushStartClears", "rushGuardClears", "rushGuardLimit",
    "rushMoveSpeed", "rushHandling", "rushFireRate", "rushDamage",
  ], "baseline Rush");
  if (!state.qa.includes("rush") || state.stage !== 2) throw new Error(`baseline Rush QA did not settle: ${JSON.stringify(state)}`);
  if (!summary.sawActive || !summary.sawEnd || !summary.sawCooldownEnd || state.rushCount !== 1) throw new Error(`baseline Rush duration/cooldown loop was incomplete: ${JSON.stringify({ state, summary })}`);
  if (summary.maxTimer < 5.4 || summary.maxTimer > 6.05 || summary.maxCooldown < 8.5) throw new Error(`baseline Rush timing escaped its six-second burst and nine-second cooldown: ${JSON.stringify({ state, summary })}`);
  if (state.rushStartClears !== 0 || state.rushGuardClears !== 0) throw new Error(`unbuilt Rush erased hostile fire: ${JSON.stringify({ state, summary })}`);
  if (summary.maxBulletsDuringRush < 1) throw new Error(`Rush clear diagnostics were not tested under enemy fire: ${JSON.stringify({ state, summary })}`);
  if (state.upgrades && state.upgrades.includes("rushGuard")) throw new Error(`baseline Rush smoke accidentally equipped a guard build: ${JSON.stringify(state)}`);
  if (Math.abs(state.rushMoveSpeed - 1.12) > .001 || Math.abs(state.rushHandling - 1.18) > .001) throw new Error(`baseline Rush lost its movement identity: ${JSON.stringify(state)}`);
  if (Math.abs(state.rushFireRate - 1) > .001 || Math.abs(state.rushDamage - 1) > .001) throw new Error(`baseline Rush retained combat output without a build card: ${JSON.stringify(state)}`);
  if (!captured) fs.writeFileSync(summary.screenshot, (await window.webContents.capturePage()).toPNG());
  assertRenderer(state, "baseline Rush");
  if (errors.length) throw new Error(`console errors during baseline Rush: ${errors.join(" | ")}`);
  return { ...state, ...summary };
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputDirectory, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const nova = await sampleNova(window, port, errors);
  const rush = await sampleRush(window, port, errors);
  process.stdout.write(`${JSON.stringify({ nova, rush, consoleErrors: errors.length, outputDirectory })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
