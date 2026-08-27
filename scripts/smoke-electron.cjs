const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const screenshotPath = path.join(os.tmpdir(), "spacescraft-electron-smoke.png");
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
  await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-path=1&qa-encounter=relay&seed=2`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);

  let state = null;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await delay(100);
    state = await window.webContents.executeJavaScript(`(() => {
      const game = document.querySelector('#game');
      return Object.fromEntries(['mode', 'qa', 'stage', 'fps', 'activeEncounter', 'encounterProgress', 'encounterObjects', 'encounterPlan', 'hudResolution'].map((key) => [key, game.dataset[key]]));
    })()`);
    if (state.activeEncounter === "relay") break;
  }
  if (state?.activeEncounter !== "relay") throw new Error(`relay encounter did not become active: ${JSON.stringify(state)}`);

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
  if (errors.length) throw new Error(`renderer console errors: ${errors.join(" | ")}`);
  const webgl = await window.webContents.executeJavaScript("Boolean(document.querySelector('#scene').getContext('webgl'))");
  if (!webgl) throw new Error("WebGL context unavailable");
  const image = await window.webContents.capturePage();
  fs.writeFileSync(screenshotPath, image.toPNG());
  process.stdout.write(`${JSON.stringify({ ...state, encounterHistory, webgl, consoleErrors: errors.length, screenshot: screenshotPath })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
