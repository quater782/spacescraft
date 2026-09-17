const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const archive = path.resolve(process.argv[2] || 'out/SPACECRAFT 星航双子-win32-x64/resources/app.asar');
const output = process.env.SPACECRAFT_SMOKE_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'spacecraft-packaged-smoke-'));
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'profile'));
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
const deadline = setTimeout(() => { console.error('Packaged startup timed out'); app.exit(1); }, 60000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(archive, relative);
  if (!target.startsWith(`${archive}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
  response.end(fs.readFileSync(target));
});

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: process.platform === 'win32', width: 1280, height: 800,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false } });
  window.webContents.on('console-message', (event) => {
    if (event.level === 'error') errors.push(event.message);
  });
  window.webContents.session.webRequest.onErrorOccurred((details) => errors.push(`${details.error}: ${details.url}`));
  await window.loadFile(path.join(archive, 'index.html'));
  await delay(1500);
  const initial = await window.webContents.executeJavaScript(`({
    mode: document.querySelector('#game').dataset.mode,
    renderer: document.querySelector('#scene').dataset.renderer,
    webgl: !!document.querySelector('#scene').getContext('webgl2')
  })`);
  console.log(JSON.stringify({ initial, errors }));
  assert.equal(errors.length, 0, errors.join('\n'));
  assert.equal(initial.mode, 'menu');
  assert.equal(initial.webgl, true);
  assert.ok(initial.renderer?.startsWith('three-'));
  await window.webContents.executeJavaScript(`document.querySelector('#hangarButton').click()`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelector('#hangarPanel').hidden`), false);
  await window.webContents.executeJavaScript(`document.querySelector('#closeHangarButton').click(); document.querySelector('#topSettingsButton').click()`);
  assert.equal(await window.webContents.executeJavaScript(`document.querySelector('#settingsPanel').hidden`), false);
  await window.webContents.executeJavaScript(`const language = document.querySelector('#languageSetting'); language.value = 'en'; language.dispatchEvent(new Event('change'));`);
  assert.equal(await window.webContents.executeJavaScript(`document.documentElement.lang`), 'en');
  // Keep the production file:// launch above, then serve that exact ASAR from
  // loopback so the existing localhost-only fast QA path can overcome display-
  // less CI frame throttling without exposing a packaged test bridge.
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await window.loadURL(`http://127.0.0.1:${port}/?qa-fast&qa-path=1&seed=2809`);
  await window.webContents.executeJavaScript(`document.querySelector('#startButton').click(); if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click()`);
  let playing;
  for (let attempt = 0; attempt < 45; attempt += 1) {
    await delay(1000);
    playing = await window.webContents.executeJavaScript(`({...document.querySelector('#game').dataset})`);
    if (Number(playing.stageTime) >= 20 || playing.mode !== 'playing') break;
  }
  console.log(JSON.stringify({ mode: playing.mode, stageTime: playing.stageTime, hp: playing.playerHp, shots: playing.playerShots, fps: playing.fps, errors }));
  fs.writeFileSync(path.join(output, 'state.json'), JSON.stringify({ initial, playing, errors }, null, 2));
  fs.writeFileSync(path.join(output, 'playing.png'), (await window.webContents.capturePage()).toPNG());
  assert.equal(playing.mode, 'playing');
  assert.ok(Number(playing.stageTime) >= 20);
  assert.ok(playing.playerShots.split(',').every((shots) => Number(shots) > 0));
  assert.ok(playing.playerHp.split(',').every((hp) => Number(hp) > 0));
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ archive, output, stageTime: playing.stageTime, hp: playing.playerHp, shots: playing.playerShots, fps: playing.fps, errors }));
  clearTimeout(deadline);
  server.close();
  app.exit(0);
}).catch((error) => { console.error(error); clearTimeout(deadline); server.close(); app.exit(1); });
