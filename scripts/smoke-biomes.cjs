const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputDirectory = path.join(os.tmpdir(), "spacescraft-biome-matrix");
const biomeIds = [
  "sugarBloom",
  "crystalOrchard",
  "cometTide",
  "auroraFoundry",
  "thunderWorks",
  "cloudReef",
  "eclipseCarnival",
  "prismGrave",
  "voidGarden",
];
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-biome-smoke-${process.pid}`));

async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  fs.mkdirSync(outputDirectory, { recursive: true });
  const port = server.address().port;
  const errors = [];
  const results = [];
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.on("console-message", (_event, level, message) => {
    if (level >= 2) errors.push(message);
  });

  for (const biomeId of biomeIds) {
    await window.loadURL(`http://127.0.0.1:${port}/?qa-voxel&qa-biome=${biomeId}&seed=2`);
    await window.webContents.executeJavaScript(`
      document.querySelector('#startButton').click();
      if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
      true;
    `);
    await delay(4200);
    const state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      const scene = document.querySelector('#scene');
      return {
        biome: game.dataset.biome,
        qa: game.dataset.qa,
        fps: Number(game.dataset.fps),
        backend: scene.dataset.renderer,
        artStyle: scene.dataset.artStyle,
        modelPalette: scene.dataset.modelPalette,
        worldDepthLayers: scene.dataset.worldDepthLayers,
        biomeDioramas: scene.dataset.biomeDioramas,
        projectileVfx: scene.dataset.projectileVfx,
        pixelGrammar: scene.dataset.pixelGrammar,
        spaceComposition: scene.dataset.spaceComposition,
        ecosystemComposition: scene.dataset.ecosystemComposition,
        combatNegativeSpace: scene.dataset.combatNegativeSpace,
        nebulaParallax: scene.dataset.nebulaParallax,
        skyAtmosphere: scene.dataset.skyAtmosphere,
        energyBloom: scene.dataset.energyBloom,
        edgeAA: scene.dataset.edgeAA,
        ringGrammar: scene.dataset.ringGrammar,
        projectileReadability: scene.dataset.projectileReadability,
        hullExposure: scene.dataset.hullExposure,
        groundPlane: scene.dataset.groundPlane,
        depthScaffolding: scene.dataset.depthScaffolding,
        shieldLanguage: scene.dataset.shieldLanguage,
        macroLayout: scene.dataset.macroLayout,
        celestialScaffolding: scene.dataset.celestialScaffolding,
        webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
      };
    })()`);
    if (state.biome !== biomeId || !state.qa.includes(`biome-${biomeId}`)) throw new Error(`biome override failed: ${JSON.stringify(state)}`);
    if (!state.webgl || state.backend !== "three-r185-instanced-voxel") throw new Error(`WebGL renderer unavailable in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.artStyle !== "toon-glow-light-blocks" || state.modelPalette !== "saturated-no-black") throw new Error(`Toon+Glow contract missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.worldDepthLayers !== "3" || state.biomeDioramas !== "9" || state.projectileVfx !== "segmented-toon-trails") throw new Error(`v0.18 visual diagnostics missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.pixelGrammar !== "coarse-emissive-012" || state.spaceComposition !== "open-celestial-parallax") throw new Error(`open-space visual contract missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.ecosystemComposition !== "9-macro-mid-sparse" || state.combatNegativeSpace !== "center-55-clear" || state.nebulaParallax !== "3d-additive-dust" || state.skyAtmosphere !== "layered-soft-voxel-nebula") throw new Error(`deep-space ecosystem composition missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.energyBloom !== "unreal-selective-5mip" || state.edgeAA !== "native-smaa" || state.ringGrammar !== "continuous-segmented-arcs" || state.projectileReadability !== "dim-friendly-hot-hostile") throw new Error(`professional post-process contract missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.hullExposure !== "matte-ceramic-no-bloom" || state.groundPlane !== "none-open-space" || state.depthScaffolding !== "macro-mid-distant" || state.shieldLanguage !== "four-hugging-plates" || state.macroLayout !== "alternating-edge-anchors" || state.celestialScaffolding !== "opposed-biome-horizon-bodies") throw new Error(`second-pass art polish contract missing in ${biomeId}: ${JSON.stringify(state)}`);
    if (state.fps < 45) throw new Error(`biome performance below 45 FPS in ${biomeId}: ${JSON.stringify(state)}`);
    await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = 'hidden'; true");
    await delay(80);
    const image = await window.webContents.capturePage();
    await window.webContents.executeJavaScript("document.querySelector('#game').style.visibility = ''; true");
    const screenshot = path.join(outputDirectory, `${biomeId}.png`);
    fs.writeFileSync(screenshot, image.toPNG());
    results.push({ ...state, screenshot });
  }
  if (errors.length) throw new Error(`renderer console errors: ${errors.join(" | ")}`);
  process.stdout.write(`${JSON.stringify({ biomes: results, consoleErrors: errors.length, outputDirectory })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
