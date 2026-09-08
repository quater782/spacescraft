const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-director-smoke-${process.pid}`));

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
  await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-path=0&seed=2200`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);

  const sectors = new Set();
  const anomalies = new Set();
  const draftContexts = new Set();
  let maxEvents = 0;
  let maxEncounters = 0;
  let maxDrafts = 0;
  let sawBoss = false;
  let latest = null;
  for (let attempt = 0; attempt < 190; attempt += 1) {
    await delay(100);
    if (attempt % 20 === 0) {
      window.webContents.sendInputEvent({ type: "keyUp", keyCode: "D" });
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: "A" });
    } else if (attempt % 20 === 10) {
      window.webContents.sendInputEvent({ type: "keyUp", keyCode: "A" });
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: "D" });
    }
    latest = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      const scene = document.querySelector('#scene');
      return {
        mode: game.dataset.mode,
        stage: game.dataset.stage,
        stageTime: game.dataset.stageTime,
        sector: game.dataset.sector,
        events: game.dataset.events,
        encounters: game.dataset.encounters,
        drafts: game.dataset.drafts,
        draftContext: game.dataset.draftContext,
        bossState: game.dataset.bossAttackState,
        anomalyId: game.dataset.anomalyId,
        anomalyHistory: game.dataset.anomalyHistory,
        anomalyPlan: game.dataset.anomalyPlan,
        runTargetSeconds: game.dataset.runTargetSeconds,
        fps: game.dataset.fps,
        renderer: scene.dataset.renderer,
        expeditionSectors: scene.dataset.expeditionSectors,
        sectorAnomalies: scene.dataset.sectorAnomalies,
        sceneAnomaly: scene.dataset.anomalyId,
      };
    })()`);
    sectors.add(latest.sector);
    if (latest.anomalyId) anomalies.add(latest.anomalyId);
    if (latest.mode === "draft") draftContexts.add(latest.draftContext);
    maxEvents = Math.max(maxEvents, Number(latest.events || 0));
    maxEncounters = Math.max(maxEncounters, Number(latest.encounters || 0));
    maxDrafts = Math.max(maxDrafts, Number(latest.drafts || 0));
    sawBoss ||= latest.bossState !== "off";
    if (sawBoss && maxEvents === 9 && maxEncounters === 4 && maxDrafts >= 4) break;
    if (latest.mode === "ended") break;
  }
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "A" });
  window.webContents.sendInputEvent({ type: "keyUp", keyCode: "D" });

  if (latest?.runTargetSeconds !== "1800") throw new Error(`normal run target missing: ${JSON.stringify(latest)}`);
  if (!["1", "2", "3"].every((sector) => sectors.has(sector))) throw new Error(`chapter-one sector progression incomplete: ${JSON.stringify([...sectors])}`);
  if (anomalies.size !== 3) throw new Error(`chapter-one anomaly progression incomplete: ${JSON.stringify([...anomalies])}`);
  if (latest.anomalyPlan.split(/[>|]/).length !== 9 || latest.anomalyHistory.split(",").length < 3) throw new Error(`nine-sector anomaly route/history missing: ${JSON.stringify(latest)}`);
  if (latest.sceneAnomaly !== latest.anomalyId) throw new Error(`gameplay/render anomaly mismatch: ${JSON.stringify(latest)}`);
  if (maxEvents !== 9) throw new Error(`formation timeline incomplete: ${maxEvents}/9`);
  if (maxEncounters !== 4) throw new Error(`encounter timeline incomplete: ${maxEncounters}/4`);
  if (maxDrafts < 4 || !draftContexts.has("mid-stage")) throw new Error(`mid-stage drafts missing: ${maxDrafts}, ${JSON.stringify([...draftContexts])}`);
  if (!sawBoss) throw new Error(`chapter boss was not reached: ${JSON.stringify(latest)}`);
  if (latest.renderer !== "three-r185-instanced-voxel" || latest.expeditionSectors !== "9-progressive-voxel-gates" || latest.sectorAnomalies !== "9-seeded-gameplay-fields") throw new Error(`sector renderer contract missing: ${JSON.stringify(latest)}`);
  if (Number(latest.fps) < 40) throw new Error(`director smoke performance too low: ${latest.fps} FPS`);
  if (errors.length) throw new Error(`console errors: ${errors.join(" | ")}`);

  process.stdout.write(`${JSON.stringify({ latest, sectors: [...sectors], anomalies: [...anomalies], maxEvents, maxEncounters, maxDrafts, draftContexts: [...draftContexts], sawBoss, consoleErrors: errors.length })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
