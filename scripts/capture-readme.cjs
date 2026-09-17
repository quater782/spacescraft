const { app, BrowserWindow } = require("electron");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(root, "docs", "media");
const framesRoot = fs.mkdtempSync(path.join(os.tmpdir(), "spacecraft-readme-"));
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
}, 600000);

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("force-device-scale-factor", "1");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-readme-profile-${process.pid}`));

async function capture(window, filename) {
  fs.writeFileSync(path.join(output, filename), (await window.webContents.capturePage()).toPNG());
}

async function startRun(window, url) {
  await window.loadURL(url);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
}

async function combatState(window) {
  return window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    return {
      mode: game.dataset.mode,
      hp: String(game.dataset.playerHp || '').split(',').map(Number),
      shots: String(game.dataset.playerShots || '').split(',').map(Number),
      upgrades: game.dataset.upgrades,
      capstones: game.dataset.growthCapstones,
      procs: game.dataset.growthCapstoneProcs,
      rushActive: game.dataset.rushActive === 'true',
      rushCount: Number(game.dataset.rushCount),
      novaCount: Number(game.dataset.novaCount),
    };
  })()`);
}

async function recordScenario(window, port, scenario) {
  const directory = path.join(framesRoot, scenario.id);
  fs.mkdirSync(directory, { recursive: true });
  console.log(`[capture] loading ${scenario.id}`);
  await startRun(window, `http://127.0.0.1:${port}/?${scenario.query}`);
  await delay(scenario.warmup || 700);

  const directions = scenario.directions || ["A", "W", "D", "S"];
  let held = null;
  let peakRush = false;
  let peakNova = 0;
  let lastState = null;
  for (let index = 0; index < 45; index += 1) {
    const next = directions[Math.floor(index / 9) % directions.length];
    if (next !== held) {
      if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });
      held = next;
      window.webContents.sendInputEvent({ type: "keyDown", keyCode: held });
    }
    await delay(110);
    lastState = await combatState(window);
    peakRush ||= lastState.rushActive || lastState.rushCount > 0;
    peakNova = Math.max(peakNova, lastState.novaCount);
    fs.writeFileSync(path.join(directory, `frame-${String(index).padStart(3, "0")}.png`), (await window.webContents.capturePage()).toPNG());
    if (scenario.hero && index === 22) await capture(window, "gameplay-hero.png");
  }
  if (held) window.webContents.sendInputEvent({ type: "keyUp", keyCode: held });

  if (!lastState || lastState.mode !== "playing" || lastState.hp.some((hp) => hp <= 0)) {
    throw new Error(`${scenario.id} did not keep both pilots alive: ${JSON.stringify(lastState)}`);
  }
  if (!lastState.upgrades.includes("overclock:2") || !lastState.upgrades.includes("prism:3") || !lastState.upgrades.includes("drone:3") || lastState.shots.some((shots) => shots <= 0)) {
    throw new Error(`${scenario.id} did not show the maxed showcase build: ${JSON.stringify(lastState)}`);
  }
  if (scenario.requiresRush && !peakRush) throw new Error(`${scenario.id} never activated Starlink Rush`);
  if (scenario.requiresNova && peakNova < 1) throw new Error(`${scenario.id} never activated shared Nova`);

  const gif = spawnSync("ffmpeg", [
    "-y", "-framerate", "9", "-i", path.join(directory, "frame-%03d.png"),
    "-vf", "fps=8,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
    "-loop", "0", path.join(output, `${scenario.id}.gif`),
  ], { stdio: "inherit" });
  if (gif.error) throw gif.error;
  if (gif.status !== 0) throw new Error(`ffmpeg exited with ${gif.status} for ${scenario.id}`);
  console.log(JSON.stringify({ scenario: scenario.id, state: lastState, peakRush, peakNova }));
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
  const scenarios = [
    {
      id: "capstone-barrage",
      hero: true,
      query: "qa-voxel&qa-growth=capstone&qa-buffs&qa-boss-state&qa-boss-phase=2&qa-path=1&qa-threat=3&qa-combat-stage=2&qa-combat-progress=.58&qa-biome=crystalOrchard&seed=2701",
    },
    {
      id: "starlink-rush",
      requiresRush: true,
      query: "qa-voxel&qa-growth=capstone&qa-buffs&qa-rush&qa-protocol=resonantGyro&qa-boss-state&qa-boss-phase=2&qa-path=1&qa-threat=3&qa-combat-stage=2&qa-combat-progress=.68&qa-biome=cometTide&seed=2809",
    },
    {
      id: "shared-nova",
      requiresNova: true,
      warmup: 2400,
      query: "qa-voxel&qa-growth=capstone&qa-buffs&qa-nova&qa-boss-state&qa-boss-phase=3&qa-path=1&qa-threat=4&qa-combat-stage=3&qa-combat-progress=.95&qa-biome=eclipseCarnival&seed=3401",
    },
  ];
  for (const scenario of scenarios) await recordScenario(window, port, scenario);

  await window.loadURL(`http://127.0.0.1:${port}/`);
  await window.webContents.executeJavaScript(`document.querySelector('#hangarButton').click(); true;`);
  await delay(900);
  await capture(window, "hangar.png");
  if (errors.length) throw new Error(`Capture contained console errors: ${errors.join(" | ")}`);
  console.log(JSON.stringify({ output, gifs: scenarios.map(({ id }) => path.join(output, `${id}.gif`)), framesPerGif: 45, secondsPerGif: 5 }));
  window.destroy();
  server.close();
  fs.rmSync(framesRoot, { recursive: true, force: true });
  clearTimeout(deadline);
  app.quit();
}

run().catch((error) => {
  console.error(error.stack || error);
  server.close();
  fs.rmSync(framesRoot, { recursive: true, force: true });
  clearTimeout(deadline);
  app.exit(1);
});
