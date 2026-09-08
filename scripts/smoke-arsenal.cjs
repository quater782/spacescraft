const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(os.tmpdir(), "spacescraft-predator-arsenal");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-arsenal-${process.pid}`));

async function stateOf(window) {
  return window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    const scene = document.querySelector('#scene');
    return {
      mode: game.dataset.mode,
      qa: game.dataset.qa,
      stage: Number(game.dataset.stage),
      stageTime: Number(game.dataset.stageTime),
      patterns: game.dataset.combatPatterns,
      telegraphPatterns: game.dataset.enemyTelegraphPatterns,
      hulls: game.dataset.enemyHulls,
      weapons: game.dataset.enemyWeapons,
      species: game.dataset.enemySpecies,
      nativeCount: Number(game.dataset.enemyNativeCount),
      eliteSpawns: Number(game.dataset.ambientEliteSpawns),
      eliteCount: Number(game.dataset.enemyEliteCount),
      maxHp: Number(game.dataset.enemyMaxHp),
      maxAge: Number(game.dataset.enemyMaxAge),
      maxCycles: Number(game.dataset.enemyMaxCycles),
      enemyPositions: game.dataset.enemyPositions.split(',').filter(Boolean).map((entry) => {
        const [id, x, y, state] = entry.split('|');
        return { id: Number(id), x: Number(x), y: Number(y), state };
      }),
      standoffError: game.dataset.enemyStandoffError.split('|').map(Number),
      bullets: Number(game.dataset.enemyBullets),
      beams: Number(game.dataset.enemyBeams),
      homingBullets: Number(game.dataset.enemyHomingBullets),
      blastBullets: Number(game.dataset.enemyBlastBullets),
      bulletSpeed: game.dataset.enemyBulletSpeed.split('|').map(Number),
      homingSpeed: game.dataset.enemyHomingSpeed.split('|').map(Number),
      beamFinite: game.dataset.enemyBeamFinite,
      invalidProjectiles: Number(game.dataset.combatInvalidProjectiles),
      laserHits: Number(game.dataset.combatLaserHits),
      homingHits: Number(game.dataset.combatHomingHits),
      blastHits: Number(game.dataset.combatBlastHits),
      deathrattles: Number(game.dataset.combatDeathrattles),
      bodyCollisions: Number(game.dataset.combatBodyCollisions),
      friendlyCollisions: Number(game.dataset.combatFriendlyCollisions),
      damage: game.dataset.playerDamageTaken.split(',').map(Number),
      playerPosition: game.dataset.playerPosition.split(',').map((entry) => entry.split('|').map(Number)),
      debuffs: game.dataset.playerDebuffs,
      hp: game.dataset.playerHp.split(',').map(Number),
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      grammar: scene.dataset.bulletGrammar,
      enemySpacing: scene.dataset.enemySpacing,
      warningGrammar: scene.dataset.warningGrammar,
      laserVfx: scene.dataset.laserVfx,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
}

async function sample(window, port, errors, scenario) {
  const elite = scenario.elite ? "&qa-elite" : "";
  const url = `http://127.0.0.1:${port}/?qa-voxel${elite}&qa-path=1&qa-threat=${scenario.threat}&qa-combat-stage=${scenario.stage}&qa-combat-progress=${scenario.progress}&qa-biome=${scenario.biome}&qa-hull=${scenario.hull}&qa-enemy=${scenario.build}&seed=${scenario.seed}`;
  await window.loadURL(url);
  await window.webContents.executeJavaScript(`
    document.querySelector('.mode-button[data-mode="coop"]').click();
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  const summary = { patterns: new Set(), hulls: new Set(), weapons: new Set(), debuffs: new Set(), maxBullets: 0, maxBeams: 0, maxHomingBullets: 0, maxBlastBullets: 0, maxBulletSpeed: 0, minHomingSpeed: Number.POSITIVE_INFINITY, maxHomingSpeed: 0, minStandoffError: Number.POSITIVE_INFINITY, maxNative: 0, maxHp: 0, maxAge: 0, maxCycles: 0, maxElites: 0, maxInvalidProjectiles: 0, finiteBeams: true, laserHits: 0, homingHits: 0, blastHits: 0, deathrattles: 0, bodyCollisions: 0, friendlyCollisions: 0 };
  let state = null;
  let held = "";
  const screenshot = path.join(outputRoot, `${scenario.id}.png`);
  const warningScreenshot = path.join(outputRoot, `${scenario.id}-warning.png`);
  const fireScreenshot = path.join(outputRoot, `${scenario.id}-fire.png`);
  let warningCaptured = false;
  let fireCaptured = false;
  for (let attempt = 0; attempt < scenario.samples; attempt += 1) {
    if (scenario.chase && state?.enemyPositions[0] && state.playerPosition[0]) {
      const enemy = state.enemyPositions[0];
      const player = state.playerPosition[0];
      const dx = enemy.x - player[0];
      const dy = enemy.y - player[1];
      const next = Math.abs(dx) > Math.abs(dy) * .7 ? (dx < 0 ? "A" : "D") : (dy < 0 ? "W" : "S");
      if (held !== next) {
        if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
        held = next;
        window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
      }
    } else if (scenario.move && attempt % 14 === 0) {
      if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
      held = ["A", "D", "W", "S"][Math.floor(attempt / 14) % 4];
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
    }
    await delay(100);
    state = await stateOf(window);
    state.patterns.split(",").filter(Boolean).forEach((value) => summary.patterns.add(value));
    state.hulls.split(",").filter(Boolean).forEach((value) => summary.hulls.add(value));
    state.weapons.split(",").filter(Boolean).forEach((value) => summary.weapons.add(value));
    state.debuffs.split(",").flatMap((value) => value.split("|")).filter((value) => value && value !== "none").forEach((value) => summary.debuffs.add(value));
    summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
    summary.maxBeams = Math.max(summary.maxBeams, state.beams);
    summary.maxHomingBullets = Math.max(summary.maxHomingBullets, state.homingBullets);
    summary.maxBlastBullets = Math.max(summary.maxBlastBullets, state.blastBullets);
    summary.maxBulletSpeed = Math.max(summary.maxBulletSpeed, state.bulletSpeed[2] || 0);
    if (state.homingSpeed[0] > 0) summary.minHomingSpeed = Math.min(summary.minHomingSpeed, state.homingSpeed[0]);
    summary.maxHomingSpeed = Math.max(summary.maxHomingSpeed, state.homingSpeed[2] || 0);
    if (state.standoffError[0] > 0) summary.minStandoffError = Math.min(summary.minStandoffError, state.standoffError[0]);
    summary.maxNative = Math.max(summary.maxNative, state.nativeCount);
    summary.maxHp = Math.max(summary.maxHp, state.maxHp);
    summary.maxAge = Math.max(summary.maxAge, state.maxAge);
    summary.maxCycles = Math.max(summary.maxCycles, state.maxCycles);
    summary.maxElites = Math.max(summary.maxElites, state.eliteCount, state.eliteSpawns);
    summary.maxInvalidProjectiles = Math.max(summary.maxInvalidProjectiles, state.invalidProjectiles);
    summary.finiteBeams = summary.finiteBeams && state.beamFinite !== "false";
    for (const metric of ["laserHits", "homingHits", "blastHits", "deathrattles", "bodyCollisions", "friendlyCollisions"]) summary[metric] = Math.max(summary[metric], state[metric]);
    const warningReady = scenario.pattern === "blastSeed" ? state.blastBullets > 0 : state.telegraphPatterns.split(",").includes(scenario.pattern);
    if (!warningCaptured && warningReady) {
      await delay(320);
      fs.writeFileSync(warningScreenshot, (await window.webContents.capturePage()).toPNG());
      warningCaptured = true;
    }
    if (!fireCaptured && scenario.id === "laser" && state.beams > 0) {
      fs.writeFileSync(fireScreenshot, (await window.webContents.capturePage()).toPNG());
      fireCaptured = true;
    }
    if (state.mode !== "playing") break;
  }
  if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
  fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
  if (!state?.webgl || state.renderer !== "three-r185-instanced-voxel" || state.grammar !== "locked-safe-lanes-curves-mines-lasers-seekers-blasts" || state.enemySpacing !== "live-target-standoff" || state.warningGrammar !== "local-charge-laser-sight-ram-chevrons-blast-rings" || state.laserVfx !== "layered-core-edge-packets" || state.fps < 40) throw new Error(`${scenario.id} renderer contract failed: ${JSON.stringify(state)}`);
  if (!summary.hulls.has(scenario.hull) || !summary.weapons.has(scenario.weapon) || !summary.patterns.has(scenario.pattern) || summary.maxNative < 1) throw new Error(`${scenario.id} signature was not expressed: ${JSON.stringify({ ...summary, patterns: [...summary.patterns], hulls: [...summary.hulls], weapons: [...summary.weapons] })}`);
  if (summary.maxHp < scenario.minHp) throw new Error(`${scenario.id} enemy durability was too low: ${JSON.stringify(summary)}`);
  if (scenario.hitMetric && summary[scenario.hitMetric] < 1) throw new Error(`${scenario.id} never inflicted its designed consequence: ${JSON.stringify(summary)}`);
  if (scenario.debuff && !summary.debuffs.has(scenario.debuff)) throw new Error(`${scenario.id} payload never crossed its weapon delivery path: ${JSON.stringify({ ...summary, debuffs: [...summary.debuffs] })}`);
  if (!Number.isFinite(summary.minStandoffError) || summary.minStandoffError > 80) throw new Error(`${scenario.id} never converged on its live-target standoff band: ${JSON.stringify(summary)}`);
  if (!summary.finiteBeams || summary.maxInvalidProjectiles > 0) throw new Error(`${scenario.id} emitted invalid projectile geometry: ${JSON.stringify(summary)}`);
  if (errors.length) throw new Error(`console errors during ${scenario.id}: ${errors.join(" | ")}`);
  return { ...state, ...summary, minHomingSpeed: Number.isFinite(summary.minHomingSpeed) ? summary.minHomingSpeed : 0, minStandoffError: Number.isFinite(summary.minStandoffError) ? summary.minStandoffError : 0, patterns: [...summary.patterns], hulls: [...summary.hulls], weapons: [...summary.weapons], debuffs: [...summary.debuffs], screenshot, warningScreenshot: warningCaptured ? warningScreenshot : "", fireScreenshot: fireCaptured ? fireScreenshot : "" };
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const scenarios = [
    { id: "laser", stage: 1, progress: .42, threat: 1, biome: "crystalOrchard", hull: "prismRay", build: "drift.laser.plated.sentry.cryo", weapon: "laser", pattern: "laserSweep", minHp: 22, hitMetric: "laserHits", debuff: "chill", samples: 140, seed: 3101 },
    { id: "blast", stage: 2, progress: .62, threat: 2, biome: "thunderWorks", hull: "railBeetle", build: "rush.bomb.plated.pack.fracture", weapon: "bomb", pattern: "blastSeed", minHp: 42, hitMetric: "blastHits", debuff: "fracture", samples: 140, seed: 3102 },
    { id: "seeker", stage: 1, progress: .48, threat: 1, biome: "sugarBloom", hull: "nectarMoth", build: "weave.seeker.light.pack.clean", weapon: "seeker", pattern: "hunterSeeker", minHp: 8, hitMetric: "homingHits", samples: 120, seed: 3103, move: true },
    { id: "ram", stage: 1, progress: .52, threat: 1, biome: "cometTide", hull: "cometRammer", build: "rush.pulse.plated.ambusher.clean", weapon: "pulse", pattern: "ramCharge", minHp: 380, hitMetric: "bodyCollisions", samples: 100, seed: 3104, elite: true, chase: true },
    { id: "pursuit", stage: 1, progress: .52, threat: 1, biome: "cometTide", hull: "cometRammer", build: "rush.pulse.plated.ambusher.clean", weapon: "pulse", pattern: "ramCharge", minHp: 380, samples: 220, seed: 3104, elite: true },
  ];
  const results = {};
  for (const scenario of scenarios) results[scenario.id] = await sample(window, port, errors, scenario);
  for (const id of ["laser", "blast", "ram"]) if (!results[id].warningScreenshot) throw new Error(`${id} warning was never captured: ${JSON.stringify(results[id])}`);
  if (!results.laser.fireScreenshot) throw new Error(`laser fire frame was never captured: ${JSON.stringify(results.laser)}`);
  if (results.laser.maxBeams < 1 || results.blast.maxBlastBullets < 1 || results.seeker.maxHomingBullets < 1 || results.seeker.maxBulletSpeed < 60) throw new Error(`arsenal intensity missing: ${JSON.stringify(results)}`);
  if (results.seeker.minHomingSpeed < results.seeker.maxHomingSpeed * .9) throw new Error(`seeker projectile families diverged too far in nominal speed: ${JSON.stringify(results.seeker)}`);
  if (results.blast.deathrattles < 1 && results.seeker.deathrattles < 1) throw new Error(`native deathrattles were never exercised: ${JSON.stringify(results)}`);
  if (results.blast.maxElites < 1 || results.blast.maxAge < 4 || results.blast.maxCycles < 1) throw new Error(`elite persistence was not observed: ${JSON.stringify(results.blast)}`);
  if (results.pursuit.maxAge < 18 || results.pursuit.maxCycles < 5) throw new Error(`surviving pursuer did not remain active past the retired withdrawal threshold: ${JSON.stringify(results.pursuit)}`);
  if (Math.max(...results.ram.damage) < 4) throw new Error(`ram collision did not inflict major pilot damage: ${JSON.stringify(results.ram)}`);
  process.stdout.write(`${JSON.stringify({ results, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
