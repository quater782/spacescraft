const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenshotRoot = path.join(os.tmpdir(), "spacescraft-boss-gallery");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-boss-smoke-${process.pid}`));

async function run() {
  await app.whenReady();
  fs.mkdirSync(screenshotRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  const results = [];
  for (const phase of [1, 2, 3]) {
    await window.loadURL(`http://127.0.0.1:${port}/?qa-boss-gallery&qa-boss-phase=${phase}&seed=2`);
    await window.webContents.executeJavaScript(`
      document.querySelector('#startButton').click();
      if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
      true;
    `);
    await delay(1500);
    const state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      const scene = document.querySelector('#scene');
      return {
        qa: game.dataset.qa,
        fps: Number(game.dataset.fps),
        backend: scene.dataset.renderer,
        artStyle: scene.dataset.artStyle,
        modelPalette: scene.dataset.modelPalette,
        moduleAnatomy: scene.dataset.moduleAnatomy,
        bossFamilies: scene.dataset.bossFamilies,
        bossChoreography: scene.dataset.bossChoreography,
        bossGallery: scene.dataset.bossGallery,
        energyBloom: scene.dataset.energyBloom,
        edgeAA: scene.dataset.edgeAA,
        enemyModuleLanguage: scene.dataset.enemyModuleLanguage,
        groundPlane: scene.dataset.groundPlane,
        depthScaffolding: scene.dataset.depthScaffolding,
        bossGalleryView: scene.dataset.bossGalleryView,
        webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
      };
    })()`);
    if (!state.qa.includes(`boss-phase${phase}`) || state.bossGallery !== `phase-${phase}`) throw new Error(`boss phase gallery unavailable: ${JSON.stringify(state)}`);
    if (!state.webgl || state.backend !== "three-r185-instanced-voxel") throw new Error(`WebGL renderer unavailable: ${JSON.stringify(state)}`);
    if (state.artStyle !== "toon-glow-light-blocks" || state.modelPalette !== "saturated-no-black" || state.moduleAnatomy !== "integrated-large-form" || state.bossFamilies !== "3-organic-phase-forms" || state.bossChoreography !== "telegraph-state-arena") throw new Error(`boss art contract unavailable: ${JSON.stringify(state)}`);
    if (state.energyBloom !== "unreal-selective-5mip" || state.edgeAA !== "native-smaa" || state.enemyModuleLanguage !== "surface-organs") throw new Error(`boss post-process contract unavailable: ${JSON.stringify(state)}`);
    if (state.groundPlane !== "none-open-space" || state.depthScaffolding !== "macro-mid-distant") throw new Error(`boss open-space depth contract unavailable: ${JSON.stringify(state)}`);
    if (state.bossGalleryView !== "neutral-silhouette") throw new Error(`boss silhouette gallery contract unavailable: ${JSON.stringify(state)}`);
    if (state.fps < 50) throw new Error(`boss gallery performance below 50 FPS: ${JSON.stringify(state)}`);
    if (errors.length) throw new Error(`renderer console errors: ${errors.join(" | ")}`);
    await window.webContents.executeJavaScript(`
      document.querySelector('#game').style.visibility = 'hidden';
      for (const selector of ['#toast', '#buildTray', '#menu', '#tutorial']) {
        const element = document.querySelector(selector);
        if (element) element.style.display = 'none';
      }
      true;
    `);
    await delay(60);
    const screenshot = path.join(screenshotRoot, `boss-phase-${phase}.png`);
    fs.writeFileSync(screenshot, (await window.webContents.capturePage()).toPNG());
    results.push({ ...state, screenshot });
  }
  process.stdout.write(`${JSON.stringify({ phases: results, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
