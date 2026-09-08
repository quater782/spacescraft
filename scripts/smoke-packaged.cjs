const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const archive = path.resolve(process.argv[2] || 'out/SPACECRAFT 星航双子-win32-x64/resources/app.asar');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'spacecraft-packaged-smoke-'));
app.setPath('userData', path.join(output, 'profile'));
app.commandLine.appendSwitch('disable-background-timer-throttling');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
const deadline = setTimeout(() => { console.error('Packaged startup timed out'); app.exit(1); }, 60000);

app.whenReady().then(async () => {
  const window = new BrowserWindow({ show: false, width: 1280, height: 800,
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
  await window.webContents.executeJavaScript(`document.querySelector('#closeSettingsButton').click(); document.querySelector('#startButton').click(); if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click()`);
  // The opening route selection precedes the chapter clock. Wait for actual
  // chapter time instead of mistaking wall time at the route gate for combat.
  let playing;
  for (let attempt = 0; attempt < 45; attempt++) {
    await delay(1000);
    playing = await window.webContents.executeJavaScript(`({...document.querySelector('#game').dataset})`);
    if (Number(playing.stageTime) >= 20 || playing.mode !== 'playing') break;
  }
  console.log(JSON.stringify({ mode: playing.mode, stageTime: playing.stageTime, hp: playing.playerHp, shots: playing.playerShots, fps: playing.fps, errors }));
  assert.equal(playing.mode, 'playing');
  assert.ok(Number(playing.stageTime) >= 20);
  assert.ok(playing.playerShots.split(',').every((shots) => Number(shots) > 0));
  assert.ok(playing.playerHp.split(',').every((hp) => Number(hp) > 0));
  assert.equal(errors.length, 0, errors.join('\n'));
  fs.writeFileSync(path.join(output, 'playing.png'), (await window.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({ archive, output, stageTime: playing.stageTime, hp: playing.playerHp, shots: playing.playerShots, fps: playing.fps, errors }));
  clearTimeout(deadline);
  app.exit(0);
}).catch((error) => { console.error(error); clearTimeout(deadline); app.exit(1); });
