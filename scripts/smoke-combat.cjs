const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-combat-doctrine");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-combat-smoke-${process.pid}`));

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
    const gl = scene.getContext('webgl2') || scene.getContext('webgl');
    return {
      mode: game.dataset.mode,
      stage: Number(game.dataset.stage),
      stageTime: Number(game.dataset.stageTime),
      qaCombat: game.dataset.qaCombat,
      beat: game.dataset.combatBeat,
      pressure: Number(game.dataset.combatPressure),
      patternTier: Number(game.dataset.combatPatternTier),
      bulletCap: Number(game.dataset.combatBulletCap),
      hardBulletCap: Number(game.dataset.combatHardBulletCap),
      enemies: Number(game.dataset.enemies),
      overlapPairs: Number(game.dataset.enemyOverlapPairs),
      closePairs: Number(game.dataset.enemyClosePairs),
      minClearance: Number(game.dataset.enemyMinClearance),
      enemySpread: game.dataset.enemySpread.split('|').map(Number),
      standoffError: game.dataset.enemyStandoffError.split('|').map(Number),
      bullets: Number(game.dataset.enemyBullets),
      transitions: Number(game.dataset.combatStateTransitions),
      telegraphs: Number(game.dataset.combatTelegraphs),
      patterns: game.dataset.combatPatterns,
      states: game.dataset.enemyAiStates,
      formations: Number(game.dataset.enemyFormations),
      lastFormation: game.dataset.lastFormation,
      enemyScanLayout: game.dataset.enemyScanLayout,
      enemyScanActive: game.dataset.enemyScanActive,
      enemyScanVisible: game.dataset.enemyScanVisible,
      enemyScanBounds: game.dataset.enemyScanBounds,
      hp: game.dataset.playerHp.split(',').map(Number),
      aiIntent: game.dataset.aiIntent,
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      enemyTactics: scene.dataset.enemyTactics,
      enemySpacing: scene.dataset.enemySpacing,
      warningGrammar: scene.dataset.warningGrammar,
      laserVfx: scene.dataset.laserVfx,
      bulletGrammar: scene.dataset.bulletGrammar,
      webgl: Boolean(gl),
    };
  })()`);
}

async function sampleOpening(window, port, errors) {
  await startRun(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=1&seed=2501`);
  const summary = { maxEnemies: 0, maxBullets: 0, maxTelegraphs: 0, maxTransitions: 0, minHp: Number.POSITIVE_INFINITY, patterns: new Set(), states: new Set() };
  let state = null;
  for (let attempt = 0; attempt < 240; attempt += 1) {
    await delay(100);
    state = await stateOf(window);
    summary.maxEnemies = Math.max(summary.maxEnemies, state.enemies);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    summary.maxTelegraphs = Math.max(summary.maxTelegraphs, state.telegraphs);
    summary.maxTransitions = Math.max(summary.maxTransitions, state.transitions);
    summary.minHp = Math.min(summary.minHp, ...state.hp);
    state.patterns.split(",").filter(Boolean).forEach((pattern) => summary.patterns.add(pattern));
    state.states.split(",").filter(Boolean).forEach((entry) => summary.states.add(entry));
    if (state.stageTime >= 20) break;
  }
  if (!state || state.stageTime < 20 || state.mode !== "playing") throw new Error(`opening combat did not remain live for 20 seconds: ${JSON.stringify(state)}`);
  if (summary.minHp <= 0) throw new Error(`opening combat downed a pilot: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states] })}`);
  if (summary.maxEnemies > 6 || summary.maxBullets > state.bulletCap) throw new Error(`opening safety budget regressed: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states], state })}`);
  if (summary.maxTelegraphs < 2 || summary.maxTransitions < 8 || summary.patterns.size < 1) throw new Error(`opening did not exercise the tactical state machine: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states] })}`);
  if (state.fps < 40 || !state.webgl || state.renderer !== "three-r185-instanced-voxel") throw new Error(`opening WebGL performance contract failed: ${JSON.stringify(state)}`);
  if (errors.length) throw new Error(`console errors during opening sample: ${errors.join(" | ")}`);
  return { ...state, ...summary, patterns: [...summary.patterns], states: [...summary.states] };
}

async function sampleKillzone(window, port, errors) {
  await startRun(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=1&qa-threat=4&qa-combat-stage=3&qa-combat-progress=0.74&seed=2502`);
  const summary = { maxEnemies: 0, maxBullets: 0, maxFormations: 0, maxTelegraphs: 0, maxTransitions: 0, maxPressure: 0, maxPatternTier: 0, maxBulletCap: 0, maxHardBulletCap: 0, maxOverBudget: 0, maxOverlapPairs: 0, maxClosePairs: 0, minClearance: Number.POSITIVE_INFINITY, minStandoffError: Number.POSITIVE_INFINITY, maxSpreadX: 0, maxSpreadY: 0, patterns: new Set(), states: new Set(), intents: new Set(), beats: new Set() };
  const screenshot = path.join(outputRoot, "chapter-3-killzone.png");
  const scanScreenshot = path.join(outputRoot, "enemy-scan-edge.png");
  let capturedKillzone = false;
  let capturedScan = false;
  const directions = ["A", "W", "D", "S"];
  let held = "";
  let state = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (attempt % 10 === 0) {
      if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
      held = directions[(attempt / 10) % directions.length];
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
    }
    await delay(100);
    state = await stateOf(window);
    summary.maxEnemies = Math.max(summary.maxEnemies, state.enemies);
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    summary.maxFormations = Math.max(summary.maxFormations, state.formations);
    summary.maxTelegraphs = Math.max(summary.maxTelegraphs, state.telegraphs);
    summary.maxTransitions = Math.max(summary.maxTransitions, state.transitions);
    summary.maxPressure = Math.max(summary.maxPressure, state.pressure);
    summary.maxPatternTier = Math.max(summary.maxPatternTier, state.patternTier);
    summary.maxBulletCap = Math.max(summary.maxBulletCap, state.bulletCap);
    summary.maxHardBulletCap = Math.max(summary.maxHardBulletCap, state.hardBulletCap);
    summary.maxOverBudget = Math.max(summary.maxOverBudget, state.bullets - state.hardBulletCap);
    summary.maxOverlapPairs = Math.max(summary.maxOverlapPairs, state.overlapPairs);
    summary.maxClosePairs = Math.max(summary.maxClosePairs, state.closePairs);
    summary.minClearance = Math.min(summary.minClearance, state.minClearance);
    if (state.standoffError[0] > 0) summary.minStandoffError = Math.min(summary.minStandoffError, state.standoffError[0]);
    summary.maxSpreadX = Math.max(summary.maxSpreadX, state.enemySpread[0]);
    summary.maxSpreadY = Math.max(summary.maxSpreadY, state.enemySpread[1]);
    state.patterns.split(",").filter(Boolean).forEach((pattern) => summary.patterns.add(pattern));
    state.states.split(",").filter(Boolean).forEach((entry) => summary.states.add(entry));
    if (state.aiIntent) summary.intents.add(state.aiIntent);
    if (state.beat) summary.beats.add(state.beat);
    if (!capturedKillzone && state.beat === "killzone" && state.bullets >= 60) {
      fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
      capturedKillzone = true;
    }
    if (!capturedScan && state.enemyScanVisible === "true") {
      await delay(260);
      fs.writeFileSync(scanScreenshot, (await window.webContents.capturePage()).toPNG());
      capturedScan = true;
    }
    if (state.mode !== "playing") break;
  }
  if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
  if (!state || state.mode !== "playing" || state.stage !== 3 || !state.qaCombat.startsWith("3:")) throw new Error(`forced kill zone failed to stay live: ${JSON.stringify(state)}`);
  if (!summary.beats.has("killzone") || summary.maxPatternTier !== 5 || summary.maxPressure < 1.6) throw new Error(`forced kill zone did not reach designed pressure: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states], intents: [...summary.intents], beats: [...summary.beats] })}`);
  if (summary.maxEnemies < 7 || summary.maxBullets < 12 || summary.maxFormations < 1) throw new Error(`forced kill zone lacked battlefield density: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states], intents: [...summary.intents], beats: [...summary.beats] })}`);
  if (summary.maxOverlapPairs > 5 || summary.maxClosePairs > 12) throw new Error(`forced kill zone collapsed into an unreadable enemy blob: ${JSON.stringify({ overlaps: summary.maxOverlapPairs, close: summary.maxClosePairs, spread: [summary.maxSpreadX, summary.maxSpreadY] })}`);
  if (!Number.isFinite(summary.minStandoffError) || summary.minStandoffError > 80) throw new Error(`enemy roles never converged on their live-target standoff bands: ${JSON.stringify({ minStandoffError: summary.minStandoffError, state })}`);
  if (summary.maxOverBudget > 0 || summary.maxBullets > summary.maxHardBulletCap) throw new Error(`forced kill zone exceeded its deathrattle-aware hard bullet budget: ${JSON.stringify({ max: summary.maxBullets, ordinaryCap: summary.maxBulletCap, hardCap: summary.maxHardBulletCap, over: summary.maxOverBudget })}`);
  if (summary.maxTelegraphs < 5 || summary.maxTransitions < 24 || summary.patterns.size < 3) throw new Error(`forced kill zone lacked tactical variety: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], states: [...summary.states] })}`);
  if (!summary.states.has("telegraph") || !summary.states.has("attack")) throw new Error(`state sampling missed telegraph/attack: ${JSON.stringify([...summary.states])}`);
  if (state.enemyTactics !== "role-doctrine-6-state" || state.enemySpacing !== "live-target-standoff" || state.warningGrammar !== "local-charge-laser-sight-ram-chevrons-blast-rings" || state.laserVfx !== "layered-core-edge-packets" || state.bulletGrammar !== "locked-safe-lanes-curves-mines-lasers-seekers-blasts" || state.enemyScanLayout !== "edge-compact" || state.enemyScanBounds !== "8,64,158,34" || !state.webgl || state.fps < 40) throw new Error(`combat renderer contract failed: ${JSON.stringify(state)}`);
  if (errors.length) throw new Error(`console errors during kill-zone sample: ${errors.join(" | ")}`);
  if (!capturedKillzone) fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
  if (!capturedScan) throw new Error("high-pressure sample never exposed the compact enemy scan notice");
  return { ...state, ...summary, patterns: [...summary.patterns], states: [...summary.states], intents: [...summary.intents], beats: [...summary.beats], screenshot, scanScreenshot };
}

async function sampleCurveMatrix(window, port, errors) {
  const samples = [
    { beat: "breach", progress: (7 + .08) / 9 },
    { beat: "engage", progress: (7 + .34) / 9 },
    { beat: "killzone", progress: (7 + .68) / 9 },
    { beat: "release", progress: (7 + .9) / 9 },
  ];
  const matrix = [];
  for (let stage = 1; stage <= 3; stage += 1) {
    for (const sample of samples) {
      await startRun(window, `http://127.0.0.1:${port}/?qa-voxel&qa-path=1&qa-threat=4&qa-combat-stage=${stage}&qa-combat-progress=${sample.progress.toFixed(5)}&seed=${2600 + stage * 10}`);
      let state = null;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        await delay(100);
        state = await stateOf(window);
        if (state.stage === stage && state.qaCombat.startsWith(`${stage}:`) && state.beat === sample.beat && state.pressure > 0 && state.fps >= 40) break;
      }
      if (!state || state.stage !== stage || state.beat !== sample.beat || state.pressure <= 0 || !state.qaCombat.startsWith(`${stage}:`)) {
        throw new Error(`combat curve matrix missed ${stage}:${sample.beat}: ${JSON.stringify(state)}`);
      }
      if (!state.webgl || state.renderer !== "three-r185-instanced-voxel" || state.fps < 40) {
        throw new Error(`combat curve matrix renderer failed ${stage}:${sample.beat}: ${JSON.stringify(state)}`);
      }
      matrix.push({ stage, beat: state.beat, pressure: state.pressure, patternTier: state.patternTier, bulletCap: state.bulletCap, fps: state.fps });
    }
  }
  for (const sample of samples) {
    const progression = matrix.filter((entry) => entry.beat === sample.beat);
    if (!(progression[0].pressure < progression[1].pressure && progression[1].pressure < progression[2].pressure)) {
      throw new Error(`chapter pressure did not rise for ${sample.beat}: ${JSON.stringify(progression)}`);
    }
    if (!(progression[0].bulletCap < progression[1].bulletCap && progression[1].bulletCap < progression[2].bulletCap)) {
      throw new Error(`chapter bullet budget did not rise for ${sample.beat}: ${JSON.stringify(progression)}`);
    }
  }
  for (let stage = 1; stage <= 3; stage += 1) {
    const chapter = matrix.filter((entry) => entry.stage === stage);
    const killzone = chapter.find((entry) => entry.beat === "killzone");
    const release = chapter.find((entry) => entry.beat === "release");
    if (!(killzone.pressure > release.pressure && killzone.bulletCap > release.bulletCap)) {
      throw new Error(`chapter ${stage} lost its pressure valley: ${JSON.stringify(chapter)}`);
    }
  }
  const pressureVector = (stage) => samples.map((sample) => matrix.find((entry) => entry.stage === stage && entry.beat === sample.beat).pressure);
  const ratioSpan = (later, earlier) => {
    const ratios = later.map((value, index) => value / earlier[index]);
    return Math.max(...ratios) - Math.min(...ratios);
  };
  const firstToSecondSpan = ratioSpan(pressureVector(2), pressureVector(1));
  const secondToThirdSpan = ratioSpan(pressureVector(3), pressureVector(2));
  if (firstToSecondSpan <= .08 || secondToThirdSpan <= .045) {
    throw new Error(`chapter curves collapsed into proportional copies: ${JSON.stringify({ firstToSecondSpan, secondToThirdSpan, matrix })}`);
  }
  if (matrix.find((entry) => entry.stage === 3 && entry.beat === "killzone")?.bulletCap !== 132) throw new Error(`final kill-zone cap drifted: ${JSON.stringify(matrix)}`);
  if (errors.length) throw new Error(`console errors during combat curve matrix: ${errors.join(" | ")}`);
  return matrix;
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const opening = await sampleOpening(window, port, errors);
  const killzone = await sampleKillzone(window, port, errors);
  const curveMatrix = await sampleCurveMatrix(window, port, errors);
  process.stdout.write(`${JSON.stringify({ opening, killzone, curveMatrix, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
