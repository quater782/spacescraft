const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const output = path.join(os.tmpdir(), "spacescraft-survival-feedback");
const fixturesOnly = process.argv.includes("--fixtures-only");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const target = path.resolve(root, pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1)));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return response.writeHead(404).end();
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };
  response.setHeader("Content-Type", mime[path.extname(target)] || "application/octet-stream");
  if (pathname === "/src/game.js") {
    // Expose module-scoped functions only in this loopback test server; shipped
    // source and public pages never receive the fixture bridge.
    response.end(fs.readFileSync(target, "utf8") + "\nObject.assign(window, { world, resetWorld, applyRunUpgrade, UPGRADE_DEFS, advanceStage, relicBonuses, syncNovaMirrors, damagePlayer, makeEnemy, handleCollisions, addNovaCharge, NOVA_CONFIG, updateNova, updatePlayers, draw });\n");
  } else response.end(fs.readFileSync(target));
});
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-survival-${process.pid}`));

async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  fs.mkdirSync(output, { recursive: true });
  const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  win.webContents.on("console-message", (event) => { if (event.level === "error") { errors.push(event.message); console.error(event.message); } });
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript("document.querySelector('#startButton').click(); true");
  await delay(150);
  fs.writeFileSync(path.join(output, "tutorial-zh.png"), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript("if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click(); true");
  // Actual normal-speed opening: no health, weapon, clock or AI overrides.
  let opening;
  const start = Date.now();
  let maxEnemies = 0, maxBullets = 0;
  while (!fixturesOnly && Date.now() - start < 45000) {
    await delay(250);
    opening = await win.webContents.executeJavaScript(`({ ...document.querySelector('#game').dataset })`);
    maxEnemies = Math.max(maxEnemies, Number(opening.enemies));
    maxBullets = Math.max(maxBullets, Number(opening.enemyBullets));
    assert.equal(opening.mode, "playing");
    if (Number(opening.stageTime) >= 20) break;
  }
  const openingSummary = opening ? {seconds:opening.stageTime,hp:opening.playerHp,maxEnemies,maxBullets,fps:opening.fps} : {skipped:true};
  if (opening) {
    assert.ok(Number(opening.stageTime) >= 20, `normal-speed chapter one must advance twenty combat seconds: ${JSON.stringify(openingSummary)}`);
    assert.equal(opening.stage, "1");
    assert.equal(opening.playerDowned, "0,0");
    assert.ok(Number(opening.fps) >= 40);
    assert.equal(opening.combatInvalidProjectiles, "0");
    fs.writeFileSync(path.join(output, "opening-20s.png"), (await win.webContents.capturePage()).toPNG());
    console.log("Normal-speed opening:", JSON.stringify(openingSummary));
  }

  // Exercise the real upgrade + chapter-transition functions synchronously, so
  // damage, movement and expiring timed pickups cannot confound inheritance.
  const inherited = await win.webContents.executeJavaScript(`(() => {
    world.mode = 'inspection';
    const reports = [];
    for (const mode of ['solo', 'coop']) {
      for (const allCards of [false, true]) {
        resetWorld(); world.mode = 'inspection'; world.gameMode = mode;
        const picks = allCards ? UPGRADE_DEFS.flatMap(card => Array(card.max).fill(card.id))
          : ['rail', 'phase', 'overclock', 'turbo', 'capacitor', 'novaCore', 'novaHarvester', 'aegisCycle'];
        for (const id of picks) applyRunUpgrade(UPGRADE_DEFS.find(card => card.id === id));
        world.players.forEach(player => { player.weapon = 3; player.buffs.arsenal = 5; });
        world.novaCharge = 77; world.novaCooldown = 7; syncNovaMirrors();
        const snapshot = () => ({
          levels: {...world.upgrades}, history: [...world.upgradeHistory],
          protocols: world.activeProtocols.map(p => p.id), bonuses: {...relicBonuses()},
          charge: world.novaCharge, cooldown: world.novaCooldown,
          players: world.players.map(player => Object.fromEntries(Object.entries(player).filter(([key]) =>
            !['hp', 'x', 'y', 'vx', 'vy', 'invulnerability', 'downed', 'downTimer', 'revive'].includes(key))))
        });
        const before = JSON.parse(JSON.stringify(snapshot()));
        advanceStage();
        const second = JSON.parse(JSON.stringify(snapshot()));
        advanceStage();
        const third = JSON.parse(JSON.stringify(snapshot()));
        reports.push({mode, allCards, before, second, third, stage: world.stageIndex});
      }
    }
    return reports;
  })()`);
  for (const sample of inherited) {
    assert.equal(sample.stage, 2);
    assert.deepEqual(sample.second, sample.before, `${sample.mode} chapter 2 must retain actual effects`);
    assert.deepEqual(sample.third, sample.before, `${sample.mode} chapter 3 must retain actual effects`);
    assert.equal(sample.before.protocols.length, sample.allCards ? 7 : 3);
  }

  const mechanics = await win.webContents.executeJavaScript(`(() => {
    resetWorld(); world.mode = 'inspection'; world.introTimer = 0; world.clearTimer = 0; world.routeChoice = null;
    world.enemies = []; world.enemyBullets = []; world.enemyBeams = []; world.bullets = [];
    const p = world.players[0]; p.invulnerability = 0; p.shield = 2;
    const hp = p.hp;
    damagePlayer(p, 1);
    const block = {hp:p.hp, shield:p.shield, hit:p.shieldHitTimer, hull:p.hullHitTimer};
    p.invulnerability = 0; damagePlayer(p, 3);
    const overflow = {hp:p.hp, shield:p.shield, broken:p.shieldBreakTimer, hull:p.hullHitTimer, absorbed:p.shieldAbsorbed, hullDamage:p.hullDamageTaken};
    const enemy = makeEnemy('scout', 180, 90); enemy.hp = enemy.maxHp = 10000; enemy.moduleBarrier = 0;
    world.enemies = [enemy]; world.novaCharge = 0;
    const shot = () => ({x:enemy.x,y:enemy.y,r:2,owner:0,damage:1,hitIds:[],color:'#66ddff'});
    world.bullets = [shot()]; handleCollisions(); const livingHitCharge = world.novaCharge;
    const kills = world.kills;
    for (let i = 0; i < 100; i++) addNovaCharge('hit', NOVA_CONFIG.hitCharge, p);
    const burstCharge = world.novaCharge;
    const beforeNovaSource = world.novaCharge; addNovaCharge('nova', 80);
    const novaLoopCharge = world.novaCharge - beforeNovaSource;
    enemy.boss = true; enemy.phaseShield = 1; world.bullets = [shot()];
    const beforeBlocked = world.novaCharge; handleCollisions(); const blockedGain = world.novaCharge - beforeBlocked;
    enemy.boss = false; enemy.phaseShield = 0; world.enemies = [];
    world.novaCharge = 120; world.novaCooldown = 0; const beforeEmpty = world.novaCount;
    updateNova(1/60); const emptyPreserved = world.novaCharge === 120 && world.novaCount === beforeEmpty;
    world.enemyBullets = [{x:p.x+10,y:p.y,r:2,dead:false}];
    updateNova(1/60); const localClear = world.enemyBullets[0].dead && world.novaCount === beforeEmpty+1;
    return { hp, block, overflow, livingHitCharge, kills, burstCharge, novaLoopCharge, blockedGain, emptyPreserved, localClear };
  })()`);
  assert.equal(mechanics.block.hp, mechanics.hp);
  assert.equal(mechanics.block.shield, 1);
  assert.ok(mechanics.block.hit > 0 && mechanics.block.hull === 0);
  assert.equal(mechanics.overflow.hp, mechanics.hp - 2);
  assert.equal(mechanics.overflow.shield, 0);
  assert.ok(mechanics.overflow.broken > 0 && mechanics.overflow.hull > 0);
  assert.equal(mechanics.overflow.absorbed, 2);
  assert.equal(mechanics.overflow.hullDamage, 2);
  assert.ok(mechanics.livingHitCharge >= .65 && mechanics.kills === 0, "a still-living target must charge Nova");
  assert.ok(mechanics.burstCharge <= 6, "shot count cannot bypass the shared budget");
  assert.equal(mechanics.blockedGain, 0);
  assert.equal(mechanics.novaLoopCharge, 0);
  assert.ok(mechanics.emptyPreserved && mechanics.localClear);

  // Visual fixtures use real damage and ship rendering; they are not difficulty evidence.
  for (const state of ['shield', 'block', 'break', 'damaged', 'critical']) {
    await win.webContents.executeJavaScript(`(() => {
      resetWorld(); world.mode = 'inspection'; world.introTimer = 0; world.routeChoice = null; world.cinematic = null;
      world.enemies = []; world.enemyBullets = []; world.bullets = []; world.particles = []; world.linked = false;
      world.players.forEach((p,i) => { p.x = 200 + i*80; p.y = 170; p.invulnerability = 0; p.shield = 2; });
      const p = world.players[0];
      const state = ${JSON.stringify(state)};
      if (state === 'block') damagePlayer(p, 1);
      if (state === 'break') damagePlayer(p, 2);
      if (state === 'damaged' || state === 'critical') { p.shield = 0; damagePlayer(p, state === 'critical' ? 5 : 3); p.hullHitTimer = 0; updatePlayers(.16); }
      world.flash = 0; world.shake = 0; draw(); return true;
    })()`);
    await delay(100);
    fs.writeFileSync(path.join(output, `${state}.png`), (await win.webContents.capturePage()).toPNG());
  }
  await win.webContents.executeJavaScript("SpaceI18n.setLanguage('en'); document.querySelector('#pauseMenu').hidden = false; true");
  await delay(100);
  fs.writeFileSync(path.join(output, "guide-en.png"), (await win.webContents.capturePage()).toPNG());
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({opening:openingSummary,inheritance:inherited.map(s => ({mode:s.mode,allCards:s.allCards,protocols:s.before.protocols.length,stages:3})),mechanics,errors,screenshots:output}, null, 2));
  win.destroy();
}

run().then(() => server.close(() => app.quit())).catch((error) => { console.error(error); server.close(); app.exit(1); });
