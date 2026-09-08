const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenshotPath = path.join(os.tmpdir(), "spacescraft-model-gallery.png");
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-model-smoke-${process.pid}`));

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
  await window.loadURL(`http://127.0.0.1:${port}/?qa-model-gallery&qa-biome=crystalOrchard&seed=2`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  await delay(1800);
  const state = await window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    const scene = document.querySelector('#scene');
    return {
      qa: game.dataset.qa,
      fps: Number(game.dataset.fps),
      backend: scene.dataset.renderer,
      artStyle: scene.dataset.artStyle,
      modelPalette: scene.dataset.modelPalette,
      modelFamilies: scene.dataset.modelFamilies,
      moduleAnatomy: scene.dataset.moduleAnatomy,
      pixelGrammar: scene.dataset.pixelGrammar,
      factionLanguage: scene.dataset.factionLanguage,
      playerModules: scene.dataset.playerModules,
      energyBloom: scene.dataset.energyBloom,
      edgeAA: scene.dataset.edgeAA,
      enemyModuleLanguage: scene.dataset.enemyModuleLanguage,
      playerMaterialSeparation: scene.dataset.playerMaterialSeparation,
      hullExposure: scene.dataset.hullExposure,
      groundPlane: scene.dataset.groundPlane,
      shieldLanguage: scene.dataset.shieldLanguage,
      modelGallery: scene.dataset.modelGallery,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
  if (!state.qa.includes("model-gallery") || state.modelGallery !== "active") throw new Error(`model gallery unavailable: ${JSON.stringify(state)}`);
  if (!state.webgl || state.backend !== "three-r185-instanced-voxel") throw new Error(`WebGL renderer unavailable: ${JSON.stringify(state)}`);
  if (state.artStyle !== "toon-glow-light-blocks" || state.modelPalette !== "saturated-no-black" || state.modelFamilies !== "3-player-16-alien" || state.moduleAnatomy !== "integrated-large-form") throw new Error(`model art contract unavailable: ${JSON.stringify(state)}`);
  if (state.pixelGrammar !== "coarse-emissive-012" || state.factionLanguage !== "human-kites-vs-void-organisms" || state.playerModules !== "4-integrated-silhouette-parts") throw new Error(`visual rebuild contract unavailable: ${JSON.stringify(state)}`);
  if (state.energyBloom !== "unreal-selective-5mip" || state.edgeAA !== "native-smaa" || state.enemyModuleLanguage !== "surface-organs" || state.playerMaterialSeparation !== "ceramic-core-engine") throw new Error(`professional model rendering contract unavailable: ${JSON.stringify(state)}`);
  if (state.hullExposure !== "matte-ceramic-no-bloom" || state.groundPlane !== "none-open-space" || state.shieldLanguage !== "segmented-shell-hit-break") throw new Error(`matte hull/open-space contract unavailable: ${JSON.stringify(state)}`);
  if (state.fps < 50) throw new Error(`model gallery performance below 50 FPS: ${JSON.stringify(state)}`);
  if (errors.length) throw new Error(`renderer console errors: ${errors.join(" | ")}`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#game').style.visibility = 'hidden';
    for (const selector of ['#toast', '#buildTray', '#menu', '#tutorial']) {
      const element = document.querySelector(selector);
      if (element) element.style.display = 'none';
    }
    true;
  `);
  await delay(80);
  const image = await window.webContents.capturePage();
  fs.writeFileSync(screenshotPath, image.toPNG());
  process.stdout.write(`${JSON.stringify({ ...state, consoleErrors: errors.length, screenshot: screenshotPath })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
