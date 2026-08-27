const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenshotPath = path.join(os.tmpdir(), "spacescraft-voxel-electron-smoke.png");
const voxelShowcaseScreenshotPath = path.join(os.tmpdir(), "spacescraft-voxel-showcase.png");
const airframeShowcaseScreenshotPath = path.join(os.tmpdir(), "spacescraft-airframe-showcase.png");
const talentScreenshotPath = path.join(os.tmpdir(), "spacescraft-talent-grid-smoke.png");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-smoke-profile-${process.pid}`));

async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) errors.push(message);
  });
  await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-wallet&qa-rush&qa-buffs&qa-protocol=cometDrive&qa-path=1&qa-encounter=relay&qa-enemy=drift.orbit.barrier.oracle.cryo&seed=2`);
  const talentState = await window.webContents.executeJavaScript(`(() => {
    document.querySelector('#hangarButton').click();
    document.querySelector('[data-talent-id="vectorThrusters"]').click();
    const button = document.querySelector('[data-talent-id="vectorThrusters"]');
    button.scrollIntoView({ block: 'center' });
    return { owned: button.classList.contains('owned'), progress: document.querySelector('#talentProgress').textContent, balance: document.querySelector('#hangarStardust').textContent };
  })()`);
  if (!talentState.owned || talentState.progress !== "1 / 9" || talentState.balance !== "✦ 2920") throw new Error(`talent purchase failed: ${JSON.stringify(talentState)}`);
  await delay(140);
  const talentImage = await window.webContents.capturePage();
  fs.writeFileSync(talentScreenshotPath, talentImage.toPNG());
  await window.webContents.executeJavaScript(`
    document.querySelector('#closeHangarButton').click();
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);

  let state = null;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await delay(100);
    state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      return Object.fromEntries(['mode', 'qa', 'stage', 'fps', 'activeEncounter', 'encounterProgress', 'encounterObjects', 'encounterPlan', 'hudResolution', 'talents', 'talentCount', 'playerSpeed', 'rushActive', 'rushCharge', 'rushTimer', 'rushChain', 'rushBestChain', 'rushCount', 'protocols', 'protocolCount', 'protocolProcs', 'enemyModuleSlots', 'enemyBuildCatalog', 'qaEnemyBuild', 'activeBuilds', 'playerBuffs', 'playerDebuffs'].map((key) => [key, game.dataset[key]]));
    })()`);
    if (state.activeEncounter === "relay" && state.rushCount === "1") break;
  }
  if (state?.activeEncounter !== "relay") throw new Error(`relay encounter did not become active: ${JSON.stringify(state)}`);
  if (state.rushActive !== "true" || state.rushCount !== "1" || Number(state.rushTimer) <= 0) throw new Error(`automatic rush did not activate: ${JSON.stringify(state)}`);
  if (state.enemyModuleSlots !== "6" || state.enemyBuildCatalog !== "7168" || state.qaEnemyBuild !== "scout.drift.orbit.barrier.oracle.cryo") throw new Error(`six-slot organic enemy forge diagnostics missing: ${JSON.stringify(state)}`);
  if (!state.playerBuffs.split(",").every((buffs) => ["arsenal", "nanobloom", "aegis", "flux"].every((id) => buffs.includes(id)))) throw new Error(`automatic buff modules missing: ${state.playerBuffs}`);

  window.webContents.sendInputEvent({ type: "keyDown", keyCode: "D" });
  window.webContents.sendInputEvent({ type: "keyDown", keyCode: "W" });
  await delay(420);
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "D" });
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "W" });
  let encounterHistory = "";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(100);
    encounterHistory = await window.webContents.executeJavaScript("document.querySelector('#game').dataset.encounterHistory");
    if (encounterHistory) break;
  }
  if (encounterHistory !== "relay:success") throw new Error(`direction-only encounter did not complete: ${encounterHistory}`);
  window.webContents.sendInputEvent({ type: "keyDown", keyCode: "A" });
  window.webContents.sendInputEvent({ type: "keyDown", keyCode: "S" });
  await delay(520);
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "A" });
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "S" });
  const protocolState = await window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    return Object.fromEntries(['protocols', 'protocolCount', 'protocolProcs'].map((key) => [key, game.dataset[key]]));
  })()`);
  if (protocolState.protocols !== "cometDrive" || protocolState.protocolCount !== "1" || Number(protocolState.protocolProcs) <= 0) throw new Error(`relic protocol did not activate and proc: ${JSON.stringify(protocolState)}`);
  if (state.talents !== "vectorThrusters" || state.talentCount !== "1") throw new Error(`talent diagnostics missing: ${JSON.stringify(state)}`);
  if (!state.playerSpeed.split(",").every((speed) => Number(speed) > 96)) throw new Error(`talent combat effect missing: ${state.playerSpeed}`);
  if (errors.length) throw new Error(`renderer console errors: ${errors.join(" | ")}`);
  const rendererState = await window.webContents.executeJavaScript(`(() => {
    const scene = document.querySelector('#scene');
    return { backend: scene.dataset.renderer, webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')) };
  })()`);
  const webgl = rendererState.webgl;
  if (!webgl || rendererState.backend !== "three-r185-instanced-voxel") throw new Error(`Three.js WebGL renderer unavailable: ${JSON.stringify(rendererState)}`);
  const rushState = await window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    return Object.fromEntries(['rushActive', 'rushCharge', 'rushTimer', 'rushChain', 'rushBestChain', 'rushCount', 'rushLastBonus'].map((key) => [key, game.dataset[key]]));
  })()`);
  const image = await window.webContents.capturePage();
  fs.writeFileSync(screenshotPath, image.toPNG());
  let settledRush = rushState;
  for (let attempt = 0; attempt < 70; attempt += 1) {
    await delay(100);
    settledRush = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      return Object.fromEntries(['rushActive', 'rushCharge', 'rushTimer', 'rushChain', 'rushBestChain', 'rushCount', 'rushLastBonus'].map((key) => [key, game.dataset[key]]));
    })()`);
    if (settledRush.rushActive === "false" && Number(settledRush.rushLastBonus) > 0) break;
  }
  if (settledRush.rushActive !== "false" || Number(settledRush.rushLastBonus) <= 0) throw new Error(`rush did not settle with a score bonus: ${JSON.stringify(settledRush)}`);
  await window.loadURL(`http://127.0.0.1:${port}/?qa-voxel&qa-buffs&qa-status=chill&qa-path=1&qa-hull=carrier&qa-enemy=drift.orbit.barrier.oracle.cryo&seed=2`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  await delay(6000);
  const voxelState = await window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    return Object.fromEntries(['mode', 'qa', 'stageTime', 'fps', 'activeBuilds', 'enemyModuleSlots', 'enemyBuildCatalog', 'qaEnemyBuild', 'playerBuffs', 'playerDebuffs'].map((key) => [key, game.dataset[key]]));
  })()`);
  if (!voxelState.activeBuilds.includes("carrier.drift.orbit.barrier.oracle.cryo") || voxelState.enemyModuleSlots !== "6" || voxelState.enemyBuildCatalog !== "7168") throw new Error(`voxel showcase did not render the forced six-slot organic build: ${JSON.stringify(voxelState)}`);
  if (!voxelState.playerBuffs.includes("arsenal|nanobloom|aegis|flux")) throw new Error(`voxel showcase buffs missing: ${JSON.stringify(voxelState)}`);
  if (!voxelState.playerDebuffs.startsWith("chill,")) throw new Error(`voxel showcase debuff missing: ${JSON.stringify(voxelState)}`);
  const voxelImage = await window.webContents.capturePage();
  fs.writeFileSync(voxelShowcaseScreenshotPath, voxelImage.toPNG());
  if (errors.length) throw new Error(`renderer console errors after voxel showcase: ${errors.join(" | ")}`);
  await window.loadURL(`http://127.0.0.1:${port}/?qa-voxel&qa-path=1&qa-hull=lancer&qa-enemy=rush.sniper.volatile.hunter.fracture&seed=2`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  await delay(6000);
  const cleanVoxelState = await window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    return Object.fromEntries(['fps', 'activeBuilds', 'enemyBuildCatalog', 'playerBuffs', 'playerDebuffs'].map((key) => [key, game.dataset[key]]));
  })()`);
  if (!cleanVoxelState.activeBuilds.includes("lancer.rush.sniper.volatile.hunter.fracture") || cleanVoxelState.enemyBuildCatalog !== "7168" || cleanVoxelState.playerBuffs !== "none,none") throw new Error(`clean airframe showcase invalid: ${JSON.stringify(cleanVoxelState)}`);
  const airframeImage = await window.webContents.capturePage();
  fs.writeFileSync(airframeShowcaseScreenshotPath, airframeImage.toPNG());
  if (errors.length) throw new Error(`renderer console errors after clean airframe showcase: ${errors.join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ ...state, protocolState, rushState, settledRush, voxelState, cleanVoxelState, talentPurchase: talentState, encounterHistory, rendererState, webgl, consoleErrors: errors.length, screenshot: screenshotPath, voxelShowcaseScreenshot: voxelShowcaseScreenshotPath, airframeShowcaseScreenshot: airframeShowcaseScreenshotPath, talentScreenshot: talentScreenshotPath })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
