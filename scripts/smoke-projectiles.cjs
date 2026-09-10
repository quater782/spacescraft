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
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-projectile-smoke-${process.pid}`));

async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port, errors = [];
  const output = path.join(os.tmpdir(), "spacescraft-projectile-art");
  fs.mkdirSync(output, { recursive: true });
  const window = new BrowserWindow({ show: false, width: 1440, height: 900,
    webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (event) => {
    if (event.level === "error") { errors.push(event.message); console.error(event.message); }
  });
  await window.loadURL(`http://127.0.0.1:${port}/?qa-model-gallery&seed=2706`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);
  await delay(1200);
  await window.webContents.executeJavaScript(`
    for (const selector of ['#game', '#toast', '#buildTray', '#menu', '#tutorial']) {
      document.querySelector(selector).style.visibility = 'hidden';
    }
    window.shotCases = [
      ['青色脉冲 / P1', false, {}], ['珊瑚脉冲 / P2', false, { owner: 1 }],
      ['相位 / PHASE', false, { phaseBarrier: true }], ['追踪僚弹 / DRONE', false, { seeker: 1 }], ['重弹 / HEAVY', false, { r: 2.6 }],
      ['种刺 / SEED', true, {}], ['双颚 / TWIN', true, { weaponModule: 'twin' }],
      ['针枪 / NEEDLE', true, { weaponModule: 'sniper' }], ['旋镰 / ORBIT', true, { weaponModule: 'orbit' }], ['弹墙 / WALL', true, { pattern: 'laneWall' }],
      ['弯刃 / SHARD', true, { pattern: 'pincer' }], ['制导中 / SEEKER', true, { behavior: 'homing', homingDuration: 1.7 }],
      ['制导结束 / COAST', true, { behavior: 'homing', homingDuration: .3 }],
      ['种雷 / MINE', true, { behavior: 'mine' }], ['种雷待爆 / ARMED', true, { behavior: 'mine', age: .85 }],
      ['爆破种 / BLAST', true, { behavior: 'blast', age: .2 }], ['开裂 / FUSE', true, { behavior: 'blast', age: .8 }],
      ['母巢 / BLOOM', true, { bossStage: 0 }], ['熔炉 / FORGE', true, { bossStage: 1 }], ['虚空 / VOID', true, { bossStage: 2 }],
    ];
    window.shotScale = 2.8;
    window.shotStress = false;
    window.shotDraw = SpaceRenderer3D.prototype.drawModelGallery;
    SpaceRenderer3D.prototype.drawModelGallery = function() {
      const oldDraw = this.projectileArt.draw;
      this.projectileArt.draw = function(shape, palette, position, angle, unit) {
        return oldDraw.call(this, shape, palette, position, angle, unit * window.shotScale);
      };
      const count = window.shotStress ? 192 : window.shotCases.length;
      for (let index = 0; index < count; index++) {
        const [label, hostile, options] = window.shotCases[index % window.shotCases.length];
        const x = window.shotStress ? 32 + index % 16 * 27 : 65 + index % 5 * 87;
        const y = window.shotStress ? 15 + Math.floor(index / 16) * 19 : 24 + Math.floor(index / 5) * 63;
        this.drawProjectile({ x, y, vx: 0, vy: hostile ? 60 : -240, r: hostile ? 3 : 2,
          owner: 0, age: .45, triggerAge: 1, behavior: 'linear', weaponModule: 'pulse',
          payloadModule: 'clean', bossStage: null, sourceId: 0, blastRadius: 0, ...options }, hostile);
        if (!window.shotStress) {
          const point = this.projectileArt.position.clone().set(...this.toWorld(x, y, .4)).project(this.camera);
          const rect = this.canvas.getBoundingClientRect();
          const id = 'shot-label-' + index;
          let element = document.getElementById(id);
          if (!element) { element = document.createElement('div'); element.id = id; document.body.appendChild(element); }
          element.textContent = label;
          element.style.cssText = 'position:fixed;pointer-events:none;font:11px monospace;color:#a9b5c9;text-align:center;transform:translateX(-50%);z-index:9;white-space:nowrap;left:' +
            (rect.left + (point.x + 1) / 2 * rect.width) + 'px;top:' + (rect.top + (1 - point.y) / 2 * rect.height + 25 + Math.floor(index / 5) * 10) + 'px';
        }
      }
      this.projectileArt.draw = oldDraw;
    }; true;
  `);
  const captures = [ ['detail', 2.8, 'high', 'standard'], ['actual-size', 1, 'high', 'standard'], ['contrast', 2.8, 'high', 'high'], ['low', 2.8, 'low', 'standard'] ];
  for (const [name, scale, quality, contrast] of captures) {
    await window.webContents.executeJavaScript(`
      window.shotScale = ${scale};
      var quality = document.querySelector('#qualitySetting'); quality.value = '${quality}'; quality.dispatchEvent(new Event('change'));
      var contrast = document.querySelector('#bulletContrastSetting'); contrast.value = '${contrast}'; contrast.dispatchEvent(new Event('change'));
      true;
    `);
    await delay(1100);
    fs.writeFileSync(path.join(output, name + '.png'), (await window.webContents.capturePage()).toPNG());
    if (name === 'detail') fs.writeFileSync(path.join(output, 'detail-crop.png'), (await window.webContents.capturePage({ x: 140, y: 280, width: 1160, height: 470 })).toPNG());
  }
  await window.webContents.executeJavaScript(`
    window.shotScale = 1; window.shotStress = true;
    document.querySelectorAll('[id^="shot-label-"]').forEach(element => element.remove());
    var quality = document.querySelector('#qualitySetting'); quality.value = 'high'; quality.dispatchEvent(new Event('change')); true;
  `);
  await delay(1800);
  const stress = await window.webContents.executeJavaScript(`({ fps: Number(document.querySelector('#game').dataset.fps), ...document.querySelector('#scene').dataset })`);
  if (stress.projectileArt !== 'extruded-pixel-stamps' || Number(stress.projectileDropped) !== 0 || stress.fps < 40) throw new Error('Projectile render regression: ' + JSON.stringify(stress));
  fs.writeFileSync(path.join(output, 'density.png'), (await window.webContents.capturePage()).toPNG());
  // Reload removes every display override. Real opening at normal speed, unchanged simulation.
  await window.loadURL(`http://127.0.0.1:${port}/?seed=2706`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click(); true;
  `);
  const started = Date.now(); let opening;
  while (Date.now() - started < 45000) {
    await delay(250);
    opening = await window.webContents.executeJavaScript(`({ ...document.querySelector('#game').dataset })`);
    if (opening.mode !== 'playing') throw new Error('Opening stopped: ' + JSON.stringify(opening));
    if (Number(opening.stageTime) >= 20) break;
  }
  if (Number(opening.stageTime) < 20 || opening.playerDowned !== '0,0' || Number(opening.fps) < 40) throw new Error('Opening regression: ' + JSON.stringify(opening));
  if (errors.length) throw new Error(errors.join(' | '));
  fs.writeFileSync(path.join(output, 'opening.png'), (await window.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({ output, samples: 20, density: { count: 192, fps: stress.fps, batches: stress.projectileBatches, dropped: stress.projectileDropped },
    opening: { seconds: opening.stageTime, hp: opening.playerHp, downed: opening.playerDowned, fps: opening.fps }, consoleErrors: errors.length }));
  window.destroy(); server.close(); app.quit();
}
run().catch(error => { console.error(error); server.close(); app.exit(1); });
