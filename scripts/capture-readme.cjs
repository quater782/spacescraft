const { app, BrowserWindow } = require("electron");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "docs", "media");
const frames = fs.mkdtempSync(path.join(os.tmpdir(), "spacecraft-readme-"));
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
const deadline = setTimeout(() => {
  console.error("README capture timed out");
  app.exit(1);
}, 180000);

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-readme-profile-${process.pid}`));

async function capture(window, filename) {
  fs.writeFileSync(path.join(output, filename), (await window.webContents.capturePage()).toPNG());
}

async function run() {
  console.log("[capture] waiting for Electron");
  await app.whenReady();
  console.log("[capture] starting local game server");
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false },
  });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  console.log("[capture] loading gameplay scene");
  await window.loadURL(`http://127.0.0.1:${port}/?qa-voxel&qa-path=1&qa-threat=2&qa-combat-stage=2&qa-combat-progress=.48&seed=2809`);
  await window.webContents.executeJavaScript(`document.querySelector('#startButton').click(); if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click(); true;`);
  await delay(2200);
  console.log("[capture] recording gameplay frames");

  const directions = ["A", "W", "D", "S"];
  let held = null;
  for (let index = 0; index < 30; index += 1) {
    const next = directions[Math.floor(index / 8) % directions.length];
    if (next !== held) {
      if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
      held = next;
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
    }
    await delay(120);
    fs.writeFileSync(path.join(frames, `frame-${String(index).padStart(3, "0")}.png`), (await window.webContents.capturePage()).toPNG());
    if (index === 14) await capture(window, "gameplay-hero.png");
  }
  if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });

  await window.loadURL(`http://127.0.0.1:${port}/`);
  await window.webContents.executeJavaScript(`document.querySelector('#hangarButton').click(); true;`);
  await delay(900);
  await capture(window, "hangar.png");
  console.log("[capture] encoding GIF");

  const gif = spawnSync("ffmpeg", [
    "-y", "-framerate", "6", "-i", path.join(frames, "frame-%03d.png"),
    "-vf", "fps=6,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
    "-loop", "0", path.join(output, "gameplay.gif"),
  ], { stdio: "inherit" });
  if (gif.error) throw gif.error;
  if (gif.status !== 0) throw new Error(`ffmpeg exited with ${gif.status}`);
  if (errors.length) throw new Error(`Capture contained console errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ output, gif: path.join(output, "gameplay.gif"), frames: 30 }));
  window.destroy();
  server.close();
  fs.rmSync(frames, { recursive: true, force: true });
  clearTimeout(deadline);
  app.quit();
}

run().catch((error) => {
  console.error(error.stack || error);
  server.close();
  fs.rmSync(frames, { recursive: true, force: true });
  clearTimeout(deadline);
  app.exit(1);
});
