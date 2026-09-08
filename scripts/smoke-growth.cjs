const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-growth-doctrine");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-growth-smoke-${process.pid}`));

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
    return {
      mode: game.dataset.mode,
      stage: Number(game.dataset.stage),
      stageTime: Number(game.dataset.stageTime),
      qaGrowth: game.dataset.qaGrowth,
      qaCombat: game.dataset.qaCombat,
      growth: Number(game.dataset.runGrowth),
      upgradeCount: Number(game.dataset.upgradeCount),
      upgrades: game.dataset.upgrades,
      protocols: game.dataset.protocols,
      fireRate: game.dataset.playerFireRate.split(',').map(Number),
      shots: game.dataset.playerShots.split(',').map(Number),
      projectiles: Number(game.dataset.playerProjectiles),
      capstones: game.dataset.growthCapstones,
      capstoneProcs: game.dataset.growthCapstoneProcs,
      kills: Number(game.dataset.kills),
      hp: game.dataset.playerHp.split(',').map(Number),
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      playerProjectileDensity: scene.dataset.playerProjectileDensity,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
}

const procTriples = (value) => value.split(",").map((entry) => entry.split("|").map(Number));

async function sampleGrowth(window, port, errors, growthMode) {
  const growth = growthMode === "baseline" ? "" : `&qa-growth=${growthMode}`;
  await startRun(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=1&qa-threat=2&qa-combat-stage=2&qa-combat-progress=0.5${growth}&seed=2701`);
  let ready = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(100);
    ready = await stateOf(window);
    if (ready.mode === "playing" && ready.stage === 2 && ready.qaCombat.startsWith("2:") && ready.fps >= 40 && ready.shots.every((value) => value > 0)) break;
  }
  if (!ready || ready.mode !== "playing" || ready.stage !== 2 || !ready.qaCombat.startsWith("2:")) throw new Error(`${growthMode} growth sample failed to start: ${JSON.stringify(ready)}`);
  const initialShots = [...ready.shots];
  const summary = { maxProjectiles: ready.projectiles, maxKills: ready.kills, minHp: Math.min(...ready.hp), maxProcs: procTriples(ready.capstoneProcs) };
  const directions = ["A", "W", "D", "S"];
  let held = "";
  let state = ready;
  let captured = false;
  const screenshot = path.join(outputRoot, `${growthMode}.png`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (attempt % 10 === 0) {
      if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
      held = directions[(attempt / 10) % directions.length];
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
    }
    await delay(100);
    state = await stateOf(window);
    summary.maxProjectiles = Math.max(summary.maxProjectiles, state.projectiles);
    summary.maxKills = Math.max(summary.maxKills, state.kills);
    summary.minHp = Math.min(summary.minHp, ...state.hp);
    const procs = procTriples(state.capstoneProcs);
    summary.maxProcs = summary.maxProcs.map((triple, player) => triple.map((value, index) => Math.max(value, procs[player][index])));
    if (!captured && growthMode === "capstone" && attempt >= 30 && state.projectiles >= 18 && summary.maxProcs[0].every((value) => value > 0)) {
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
      captured = true;
    }
    if (state.mode !== "playing") break;
  }
  if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
  if (state.mode !== "playing" || summary.minHp <= 0 || state.fps < 40 || !state.webgl || state.renderer !== "three-r185-instanced-voxel" || state.playerProjectileDensity !== "capstone-low-bloom") throw new Error(`${growthMode} growth sample lost its gameplay contract: ${JSON.stringify({ state, summary })}`);
  if (growthMode === "capstone" && !captured) throw new Error(`capstone projectile pattern was never dense enough to capture: ${JSON.stringify({ state, summary })}`);
  if (errors.length) throw new Error(`console errors during ${growthMode} growth sample: ${errors.join(" | ")}`);
  return {
    ...state,
    shotDelta: state.shots.map((value, index) => value - initialShots[index]),
    ...summary,
    screenshot: captured ? screenshot : "",
  };
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const baseline = await sampleGrowth(window, port, errors, "baseline");
  const mid = await sampleGrowth(window, port, errors, "mid");
  const capstone = await sampleGrowth(window, port, errors, "capstone");

  if (baseline.qaGrowth !== "off" || baseline.growth !== 0 || baseline.upgradeCount !== 0 || baseline.capstones !== "0|0|0,0|0|0") throw new Error(`baseline growth isolation failed: ${JSON.stringify(baseline)}`);
  if (mid.qaGrowth !== "mid" || mid.upgradeCount !== 4 || !(mid.growth > baseline.growth) || mid.capstones !== "0|0|0,0|0|0") throw new Error(`mid growth plan failed: ${JSON.stringify(mid)}`);
  if (capstone.qaGrowth !== "capstone" || capstone.upgradeCount !== 8 || !(capstone.growth > mid.growth) || capstone.capstones !== "1|1|1,1|1|1") throw new Error(`capstone growth plan failed: ${JSON.stringify(capstone)}`);
  if (!mid.protocols.split(",").includes("prismChoir") || !capstone.protocols.split(",").includes("prismChoir")) throw new Error(`growth synergy protocol missing: ${JSON.stringify({ mid: mid.protocols, capstone: capstone.protocols })}`);
  if (!(mid.fireRate[0] >= baseline.fireRate[0] * 1.11 && mid.fireRate[0] <= baseline.fireRate[0] * 1.13
    && capstone.fireRate[0] >= baseline.fireRate[0] * 1.18 && capstone.fireRate[0] <= baseline.fireRate[0] * 1.2)) throw new Error(`restrained nonlinear fire-rate targets were not visible in runtime: ${JSON.stringify({ baseline: baseline.fireRate, mid: mid.fireRate, capstone: capstone.fireRate })}`);
  if (!(mid.shotDelta[0] > baseline.shotDelta[0] * 1.08 && capstone.shotDelta[0] > mid.shotDelta[0] * 1.06)) throw new Error(`restrained volley cadence was not visible in runtime: ${JSON.stringify({ baseline: baseline.shotDelta, mid: mid.shotDelta, capstone: capstone.shotDelta })}`);
  if (!(capstone.maxProjectiles > baseline.maxProjectiles * 1.5) || !capstone.maxProcs.every((triple) => triple.every((value) => value > 0))) throw new Error(`capstone projectile grammar did not activate: ${JSON.stringify({ baseline: baseline.maxProjectiles, capstone: capstone.maxProjectiles, procs: capstone.maxProcs })}`);
  if (mid.fireRate[0] > baseline.fireRate[0] * 1.22 || capstone.fireRate[0] > baseline.fireRate[0] * 1.38) throw new Error(`fire-rate growth exceeded the restrained design ceiling: ${JSON.stringify({ baseline: baseline.fireRate, mid: mid.fireRate, capstone: capstone.fireRate })}`);
  if (capstone.shotDelta[0] > baseline.shotDelta[0] * 1.75 || capstone.maxProjectiles > 140) throw new Error(`capstone projectile economy exceeded its readability ceiling: ${JSON.stringify({ baselineShots: baseline.shotDelta, capstoneShots: capstone.shotDelta, maxProjectiles: capstone.maxProjectiles })}`);
  if (capstone.maxKills > Math.max(12, baseline.maxKills * 2.75)) throw new Error(`eight-choice build compressed enemy TTK beyond the intended ceiling: ${JSON.stringify({ baseline: baseline.maxKills, capstone: capstone.maxKills })}`);

  process.stdout.write(`${JSON.stringify({ baseline, mid, capstone, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
