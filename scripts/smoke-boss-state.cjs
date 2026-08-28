const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenshotPath = path.join(os.tmpdir(), "spacescraft-boss-state.png");
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
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  await window.loadURL(`http://127.0.0.1:${server.address().port}/?qa-fast&qa-boss-state&qa-path=1&seed=7`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  const states = new Set();
  const attacks = new Set();
  let maxCharge = 0;
  let maxEnemyBullets = 0;
  let captured = false;
  let finalState = null;
  for (let sample = 0; sample < 220; sample += 1) {
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
    if (!captured && state.attackState === "telegraph" && state.charge >= .6) {
      await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'hidden'; true");
      await delay(50);
      fs.writeFileSync(screenshotPath, (await window.webContents.capturePage()).toPNG());
      await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'visible'; true");
      captured = true;
    }
    if (states.has("recover") && states.has("telegraph") && attacks.size >= 2 && maxCharge >= .6 && maxEnemyBullets > 0) break;
  }
  if (!finalState?.qa.includes("boss-state")) throw new Error(`boss state QA unavailable: ${JSON.stringify(finalState)}`);
  if (!finalState.webgl || finalState.backend !== "three-r185-instanced-voxel" || finalState.choreography !== "telegraph-state-arena") throw new Error(`boss choreography renderer unavailable: ${JSON.stringify(finalState)}`);
  if (!states.has("recover") || !states.has("telegraph") || attacks.size < 2 || maxCharge < .6 || maxEnemyBullets < 1) throw new Error(`boss state loop incomplete: ${JSON.stringify({ states: [...states], attacks: [...attacks], maxCharge, maxEnemyBullets, finalState })}`);
  if (finalState.fps < 50) throw new Error(`boss combat performance below 50 FPS: ${JSON.stringify(finalState)}`);
  if (errors.length) throw new Error(`boss combat console errors: ${errors.join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ states: [...states], attacks: [...attacks], maxCharge, maxEnemyBullets, finalState, consoleErrors: errors.length, screenshot: screenshotPath })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
