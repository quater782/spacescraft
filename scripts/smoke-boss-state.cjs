const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(os.tmpdir(), "spacescraft-boss-arsenal");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-boss-state-${process.pid}`));

async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  fs.mkdirSync(outputDirectory, { recursive: true });
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const stageRequirements = [
    { attacks: ["twinBloom", "sunLance"], beam: true, homing: false, blast: true, fragments: true, laserHit: true },
    { attacks: ["doubleRail", "railWall"], beam: true, homing: false, blast: false, fragments: false, laserHit: false },
    { attacks: ["voidPincer", "tripleEclipse"], beam: false, homing: true, blast: true, fragments: true, laserHit: false },
  ];
  const results = [];
  const port = server.address().port;
  for (let stage = 1; stage <= 3; stage += 1) {
    const requirement = stageRequirements[stage - 1];
    await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-boss-state&qa-boss-phase=3&qa-combat-stage=${stage}&qa-combat-progress=0.95&qa-path=1&seed=${700 + stage}`);
    await window.webContents.executeJavaScript(`
      document.querySelector('#startButton').click();
      if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
      true;
    `);
    const states = new Set();
    const attacks = new Set();
    let maxCharge = 0;
    let maxEnemyBullets = 0;
    let maxEnemyBeams = 0;
    let maxHomingBullets = 0;
    let maxBlastBullets = 0;
    let maxBossFragments = 0;
    let maxLaserHits = 0;
    let maxDamageTaken = 0;
    let maxInvalidProjectiles = 0;
    let finiteBeams = true;
    let maxOverHardBudget = 0;
    let maxAddsOverCap = 0;
    let captured = false;
    let finalState = null;
    for (let sample = 0; sample < 240; sample += 1) {
      await delay(100);
      const state = await window.webContents.executeJavaScript(`(() => {
        const game = document.querySelector('#game');
        const scene = document.querySelector('#scene');
        return {
          qa: game.dataset.qa,
          mode: game.dataset.mode,
          stage: game.dataset.stage,
          phase: game.dataset.bossPhase,
          attackState: game.dataset.bossAttackState,
          attack: game.dataset.bossAttack,
          charge: Number(game.dataset.bossAttackCharge),
          enemyBullets: Number(game.dataset.enemyBullets),
          enemyBeams: Number(game.dataset.enemyBeams),
          homingBullets: Number(game.dataset.enemyHomingBullets),
          blastBullets: Number(game.dataset.enemyBlastBullets),
          bossFragments: Number(game.dataset.combatBossFragments),
          hardBulletCap: Number(game.dataset.combatHardBulletCap),
          bossAdds: Number(game.dataset.bossAdds),
          bossAddCap: Number(game.dataset.bossAddCap),
          beamFinite: game.dataset.enemyBeamFinite,
          invalidProjectiles: Number(game.dataset.combatInvalidProjectiles),
          laserHits: Number(game.dataset.combatLaserHits),
          damageTaken: game.dataset.playerDamageTaken.split(',').reduce((sum, value) => sum + Number(value || 0), 0),
          hp: game.dataset.playerHp,
          fps: Number(game.dataset.fps),
          backend: scene.dataset.renderer,
          choreography: scene.dataset.bossChoreography,
          webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
        };
      })()`);
      finalState = state;
      if (state.attackState !== "off") states.add(state.attackState);
      if (state.attack) attacks.add(state.attack);
      maxCharge = Math.max(maxCharge, state.charge || 0);
      maxEnemyBullets = Math.max(maxEnemyBullets, state.enemyBullets || 0);
      maxEnemyBeams = Math.max(maxEnemyBeams, state.enemyBeams || 0);
      maxHomingBullets = Math.max(maxHomingBullets, state.homingBullets || 0);
      maxBlastBullets = Math.max(maxBlastBullets, state.blastBullets || 0);
      maxBossFragments = Math.max(maxBossFragments, state.bossFragments || 0);
      maxOverHardBudget = Math.max(maxOverHardBudget, state.enemyBullets - state.hardBulletCap);
      maxAddsOverCap = Math.max(maxAddsOverCap, state.bossAdds - state.bossAddCap);
      maxLaserHits = Math.max(maxLaserHits, state.laserHits || 0);
      maxDamageTaken = Math.max(maxDamageTaken, state.damageTaken || 0);
      maxInvalidProjectiles = Math.max(maxInvalidProjectiles, state.invalidProjectiles || 0);
      finiteBeams = finiteBeams && state.beamFinite !== "false";
      if (!captured && state.attackState === "telegraph" && state.charge >= .6) {
        await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'hidden'; true");
        await delay(50);
        fs.writeFileSync(path.join(outputDirectory, `boss-stage-${stage}.png`), (await window.webContents.capturePage()).toPNG());
        await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'visible'; true");
        captured = true;
      }
      const attacksReady = requirement.attacks.every((id) => attacks.has(id));
      const arsenalReady = (!requirement.beam || maxEnemyBeams > 0)
        && (!requirement.homing || maxHomingBullets > 0)
        && (!requirement.blast || maxBlastBullets > 0)
        && (!requirement.fragments || maxBossFragments > 0)
        && (!requirement.laserHit || maxLaserHits > 0);
      if (states.has("recover") && states.has("telegraph") && attacksReady && maxCharge >= .6 && maxEnemyBullets > 0 && arsenalReady && maxDamageTaken > 0) break;
    }
    const summary = { stage, states: [...states], attacks: [...attacks], maxCharge, maxEnemyBullets, maxEnemyBeams, maxHomingBullets, maxBlastBullets, maxBossFragments, maxLaserHits, maxDamageTaken, maxInvalidProjectiles, maxOverHardBudget, maxAddsOverCap, finiteBeams, finalState, screenshot: path.join(outputDirectory, `boss-stage-${stage}.png`) };
    if (!finalState?.qa.includes("boss-state") || !finalState.qa.includes(`combat-stage${stage}`) || finalState.stage !== String(stage) || finalState.phase !== "3") throw new Error(`boss stage ${stage} QA unavailable: ${JSON.stringify(summary)}`);
    if (!finalState.webgl || finalState.backend !== "three-r185-instanced-voxel" || finalState.choreography !== "telegraph-state-arena") throw new Error(`boss stage ${stage} renderer unavailable: ${JSON.stringify(summary)}`);
    if (!states.has("recover") || !states.has("telegraph") || !requirement.attacks.every((id) => attacks.has(id)) || maxCharge < .6 || maxEnemyBullets < 1 || maxDamageTaken < 1) throw new Error(`boss stage ${stage} loop incomplete: ${JSON.stringify(summary)}`);
    if ((requirement.beam && maxEnemyBeams < 1) || (requirement.homing && maxHomingBullets < 1) || (requirement.blast && maxBlastBullets < 1) || (requirement.fragments && maxBossFragments < 1) || (requirement.laserHit && maxLaserHits < 1)) throw new Error(`boss stage ${stage} arsenal incomplete: ${JSON.stringify(summary)}`);
    if (maxOverHardBudget > 0 || maxAddsOverCap > 0) throw new Error(`boss stage ${stage} exceeded a bounded battlefield budget: ${JSON.stringify(summary)}`);
    if (!finiteBeams || maxInvalidProjectiles > 0) throw new Error(`boss stage ${stage} emitted invalid geometry: ${JSON.stringify(summary)}`);
    if (finalState.fps < 50) throw new Error(`boss stage ${stage} performance below 50 FPS: ${JSON.stringify(summary)}`);
    results.push(summary);
  }
  if (errors.length) throw new Error(`boss combat console errors: ${errors.join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ stages: results, consoleErrors: errors.length, outputDirectory })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
