const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-strategy-doctrine");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-strategy-smoke-${process.pid}`));

async function startRun(window, url) {
  await window.loadURL(url);
  await window.webContents.executeJavaScript(`
    document.querySelector('.mode-button[data-mode="coop"]').click();
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
      qaCombat: game.dataset.qaCombat,
      beat: game.dataset.combatBeat,
      bullets: Number(game.dataset.enemyBullets),
      beams: Number(game.dataset.enemyBeams),
      bulletCap: Number(game.dataset.combatBulletCap),
      telegraphs: Number(game.dataset.combatTelegraphs),
      telegraphPatterns: game.dataset.enemyTelegraphPatterns,
      telegraphTargets: game.dataset.enemyTelegraphTargets.split(',').filter(Boolean).map((entry) => {
        const [id, pattern, targetIndex, sourceX, sourceY, targetX, targetY, endX, endY] = entry.split('|');
        return { id: Number(id), pattern, targetIndex: Number(targetIndex), sourceX: Number(sourceX), sourceY: Number(sourceY), targetX: Number(targetX), targetY: Number(targetY), endX: Number(endX), endY: Number(endY) };
      }),
      hp: game.dataset.playerHp.split(',').map(Number),
      maxHp: game.dataset.playerMaxHp.split(',').map(Number),
      damageTaken: game.dataset.playerDamageTaken.split(',').map(Number),
      downed: game.dataset.playerDowned.split(',').map(Number),
      downCount: game.dataset.playerDownCount.split(',').map(Number),
      rescueCount: game.dataset.playerRescueCount.split(',').map(Number),
      positions: game.dataset.playerPosition.split(',').map((entry) => entry.split('|').map(Number)),
      aiIntent: game.dataset.aiIntent,
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      warningGrammar: scene.dataset.warningGrammar,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
}

async function sampleStrategy(window, port, errors, mode) {
  await startRun(window, `http://127.0.0.1:${port}/?qa-voxel&qa-elite&qa-path=1&qa-threat=1&qa-combat-stage=1&qa-combat-progress=0.42&qa-biome=crystalOrchard&qa-hull=prismRay&qa-enemy=drift.laser.plated.sentry.cryo&seed=2801`);
  let state = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await delay(100);
    state = await stateOf(window);
    if (state.mode === "playing" && state.stage === 1 && state.qaCombat.startsWith("1:") && state.fps >= 40) break;
  }
  if (!state || state.mode !== "playing" || state.stage !== 1 || !state.qaCombat.startsWith("1:")) throw new Error(`${mode} strategy sample failed to start: ${JSON.stringify(state)}`);
  const startDamage = [...state.damageTaken];
  const startDowns = [...state.downCount];
  const startRescues = [...state.rescueCount];
  const summary = {
    maxBullets: state.bullets,
    maxBeams: state.beams,
    minHp: [...state.hp],
    maxDowned: [...state.downed],
    intents: new Set(state.aiIntent ? [state.aiIntent] : []),
    minX: [...state.positions.map((position) => position[0])],
    maxX: [...state.positions.map((position) => position[0])],
    minY: [...state.positions.map((position) => position[1])],
    maxY: [...state.positions.map((position) => position[1])],
    actionableWarnings: 0,
  };
  const held = ["", ""];
  const heldUntil = [-1, -1];
  const dodgeDirections = ["D", "Right"];
  let previousActionable = false;
  const screenshot = path.join(outputRoot, `${mode}.png`);
  let captured = false;
  for (let attempt = 0; attempt < 160; attempt += 1) {
    const actionableTargets = state.telegraphTargets.filter((entry) => ["laserLance", "laserSweep", "ramCharge"].includes(entry.pattern) && entry.targetIndex >= 0 && entry.targetIndex < 2);
    const actionable = actionableTargets.length > 0;
    if (mode === "evasive" && actionable) {
      if (!previousActionable) summary.actionableWarnings += 1;
      for (const targetIndex of new Set(actionableTargets.map((entry) => entry.targetIndex))) {
        const x = state.positions[targetIndex][0];
        if (x > 410) dodgeDirections[targetIndex] = targetIndex === 0 ? "A" : "Left";
        else if (x < 70) dodgeDirections[targetIndex] = targetIndex === 0 ? "D" : "Right";
        if (held[targetIndex] !== dodgeDirections[targetIndex]) {
          if (held[targetIndex]) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held[targetIndex] });
          held[targetIndex] = dodgeDirections[targetIndex];
          window.webContents.sendInputEvent({ type: "keyDown", keyCode: held[targetIndex] });
        }
        heldUntil[targetIndex] = attempt + 3;
      }
    }
    previousActionable = actionable;
    for (let player = 0; player < held.length; player += 1) {
      const targeted = actionableTargets.some((entry) => entry.targetIndex === player);
      if (held[player] && !targeted && attempt >= heldUntil[player]) {
        window.webContents.sendInputEvent({ type: "keyUp", keyCode: held[player] });
        held[player] = "";
      }
    }
    await delay(100);
    state = await stateOf(window);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    summary.maxBeams = Math.max(summary.maxBeams, state.beams);
    state.hp.forEach((value, player) => { summary.minHp[player] = Math.min(summary.minHp[player], value); });
    state.downed.forEach((value, player) => { summary.maxDowned[player] = Math.max(summary.maxDowned[player], value); });
    state.positions.forEach(([x, y], player) => {
      summary.minX[player] = Math.min(summary.minX[player], x);
      summary.maxX[player] = Math.max(summary.maxX[player], x);
      summary.minY[player] = Math.min(summary.minY[player], y);
      summary.maxY[player] = Math.max(summary.maxY[player], y);
    });
    if (state.aiIntent) summary.intents.add(state.aiIntent);
    if (!captured && state.bullets >= 80) {
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
      captured = true;
    }
    if (state.mode !== "playing") break;
  }
  for (const keyCode of held) if (keyCode) window.webContents.sendInputEvent({ type: "keyUp", keyCode });
  if (!state.webgl || state.renderer !== "three-r185-instanced-voxel" || state.warningGrammar !== "local-charge-laser-sight-ram-chevrons-blast-rings" || state.fps < 40) throw new Error(`${mode} strategy renderer failed: ${JSON.stringify(state)}`);
  if (errors.length) throw new Error(`console errors during ${mode} strategy sample: ${errors.join(" | ")}`);
  if (!captured) fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
  return {
    ...state,
    damageDelta: state.damageTaken.map((value, player) => value - startDamage[player]),
    downDelta: state.downCount.map((value, player) => value - startDowns[player]),
    rescueDelta: state.rescueCount.map((value, player) => value - startRescues[player]),
    ...summary,
    intents: [...summary.intents],
    travelX: summary.maxX.map((value, player) => value - summary.minX[player]),
    travelY: summary.maxY.map((value, player) => value - summary.minY[player]),
    screenshot,
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
  const passive = await sampleStrategy(window, port, errors, "passive");
  const evasive = await sampleStrategy(window, port, errors, "evasive");
  if (passive.maxBeams < 1 || evasive.maxBeams < 1) throw new Error(`laser strategy samples never generated a damage beam: ${JSON.stringify({ passive: { bullets: passive.maxBullets, beams: passive.maxBeams }, evasive: { bullets: evasive.maxBullets, beams: evasive.maxBeams } })}`);
  if (passive.damageDelta.reduce((total, value) => total + value, 0) < 2) throw new Error(`zero-input flight was not punished by the isolated laser: ${JSON.stringify(passive)}`);
  if (evasive.actionableWarnings < 1) throw new Error(`strategy sample never exposed a directional laser or ram warning: ${JSON.stringify(evasive)}`);
  if (Math.max(...evasive.travelX) < 70) throw new Error(`targeted evasive pilot did not traverse tactical space: ${JSON.stringify(evasive)}`);
  const passiveLoss = passive.damageDelta.reduce((total, value) => total + value, 0) + passive.downDelta.reduce((total, value) => total + value, 0);
  const evasiveLoss = evasive.damageDelta.reduce((total, value) => total + value, 0) + evasive.downDelta.reduce((total, value) => total + value, 0);
  if (!(evasiveLoss < passiveLoss)) throw new Error(`directional evasion did not improve squad survival: ${JSON.stringify({ passive: { damage: passive.damageDelta, downs: passive.downDelta, loss: passiveLoss }, evasive: { damage: evasive.damageDelta, downs: evasive.downDelta, loss: evasiveLoss } })}`);
  if (evasive.mode !== "playing" || evasive.maxDowned.some(Boolean)) throw new Error(`both evasive pilots did not survive the strategy sample: ${JSON.stringify(evasive)}`);
  process.stdout.write(`${JSON.stringify({ passive, evasive, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
