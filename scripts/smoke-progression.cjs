const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.join(os.tmpdir(), "spacescraft-progression");
const fixturesOnly = process.argv.includes("--fixtures-only");
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const bridge = "\nObject.assign(window,{world,resetWorld,applyRunUpgrade,UPGRADE_DEFS,advanceStage,enterSector,applyPickup,finishEncounter,makeEnemy,handleCollisions,useNova,endGame,renderHangar,renderResult,loadProfile,saveProfile,updateStage,confirmDraftSelection,setEnemyState,activeStage,COMBAT}); window.testProfile=()=>profile;\n";
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const file = path.resolve(root, pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.setHeader("Content-Type", { ".js": "text/javascript", ".html": "text/html", ".css": "text/css", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream");
  response.end(pathname === "/src/game.js" ? fs.readFileSync(file, "utf8") + bridge : fs.readFileSync(file));
});
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-progression-${process.pid}`));
async function run() {
  await app.whenReady();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  fs.mkdirSync(output, { recursive: true });
  const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false } });
  const errors = [];
  win.webContents.on("console-message", (event) => { if (event.level === "error") errors.push(event.message); });
  const evaluate = (fn) => win.webContents.executeJavaScript(`(${fn.toString()})()`);
  const shot = async (name) => { await delay(120); fs.writeFileSync(path.join(output, name + ".png"), (await win.webContents.capturePage()).toPNG()); };
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2801`);
  await evaluate(() => { document.querySelector("#startButton").click(); if (!document.querySelector("#tutorial").hidden) document.querySelector("#tutorialContinueButton").click(); });
  let opening, maxBullets = 0, maxEnemies = 0;
  const started = Date.now();
  while (!fixturesOnly && Date.now() - started < 45000) {
    await delay(300);
    opening = await evaluate(() => ({ ...document.querySelector("#game").dataset }));
    maxBullets = Math.max(maxBullets, Number(opening.enemyBullets));
    maxEnemies = Math.max(maxEnemies, Number(opening.enemies));
    assert.equal(opening.mode, "playing");
    assert.equal(opening.playerDowned, "0,0");
    if (Number(opening.stageTime) >= 20) break;
  }
  if (opening) {
    assert.ok(Number(opening.stageTime) >= 20 && Number(opening.fps) >= 40);
    console.log("Normal opening", JSON.stringify({ time: opening.stageTime, hp: opening.playerHp, maxEnemies, maxBullets, fps: opening.fps }));
    await shot("opening");
  } else console.log("Normal opening skipped: fixtures-only");
  const migration = await evaluate(() => {
    world.mode = "inspection";
    const key = "spacecraft-career-v1";
    localStorage.setItem(key, JSON.stringify({ version: 5, stardust: 500, unlockedFrames: ["comet", "bulwark"], talents: ["vectorThrusters"], settings: { language: "en" } }));
    const old = loadProfile();
    localStorage.setItem(key, "{invalid"); const broken = loadProfile();
    localStorage.removeItem(key); const absent = loadProfile();
    return { version: old.version, dust: old.stardust, talents: old.talents, ranks: old.research.ranks, broken: broken.version, absent: absent.version };
  });
  assert.equal(migration.version, 6); assert.equal(migration.dust, 500); assert.deepEqual(migration.talents, ["vectorThrusters"]);
  assert.ok(Object.values(migration.ranks).every((rank) => rank === 0)); assert.equal(migration.broken, 6); assert.equal(migration.absent, 6);
  await evaluate(() => {
    testProfile().stardust = 500; world.mode = "menu"; renderHangar();
    document.querySelector("#hangarPanel").hidden = false;
    document.querySelector('[data-research-route="salvage"]').click();
    document.querySelector('[data-research-id="fluxSalvage"]').click();
    document.querySelector("#researchHeading").scrollIntoView({ block: "start" });
  });
  const purchase = await evaluate(() => ({ dust: testProfile().stardust, stored: loadProfile().research, active: world.researchEffects.pickupEnergy }));
  assert.equal(purchase.dust, 420); assert.equal(purchase.stored.focus, "salvage"); assert.equal(purchase.stored.ranks.fluxSalvage, 1); assert.equal(purchase.active, 0);
  await shot("research-zh");
  await evaluate(() => { SpaceI18n.setLanguage("en"); renderHangar(); document.querySelector("#researchHeading").scrollIntoView({ block: "start" }); });
  await shot("research-en");
  const wiring = await evaluate(() => {
    document.querySelector("#hangarPanel").hidden = true;
    testProfile().research = SpaceResearch.sanitize({ ranks: Object.fromEntries(SpaceResearch.BLUEPRINTS.map((node) => [node.id, 3])) });
    resetWorld(); world.mode = "inspection"; world.routeChoice = null; world.introTimer = 0;
    world.players.forEach((player) => { player.shield = 0; player.hp = 2; }); world.novaCharge = 0;
    for (let i = 0; i < 4; i++) applyPickup(world.players[0], { type: "weapon", x: 180, y: 190, dead: false });
    const pickup = { charge: world.novaCharge, shield: world.players.reduce((sum, player) => sum + player.shield, 0) };
    enterSector(1); const sectorCharge = world.novaCharge; enterSector(1); const repeatCharge = world.novaCharge;
    const hp = world.players[0].hp;
    world.activeEncounter = { id: "relay", nameKey: "encounter.relay.name", rewardKey: "encounter.relay.reward", reward: {}, color: "#68f4df", x: 240, y: 140 };
    finishEncounter(true); const repair = world.players[0].hp - hp;
    world.enemies = []; world.bullets = []; world.enemyBullets = []; world.enemyBeams = []; world.pickups = [];
    const enemy = makeEnemy("scout", 240, 80, { elite: true }); enemy.hp = 100; enemy.moduleBarrier = 0; world.enemies = [enemy];
    for (let i = 0; i < 6; i++) { world.bullets = [{ x: enemy.x, y: enemy.y, r: 1, damage: 1, owner: 0, color: "#68f4df", dead: false }]; handleCollisions(); }
    const markedDamage = 100 - enemy.hp;
    world.players.forEach((player) => { player.shield = 0; }); world.novaCharge = 120; world.novaCooldown = 0; useNova();
    const pulseShield = world.players.reduce((sum, player) => sum + player.shield, 0);
    world.stageIndex = 2; world.stageTime = activeStage().duration * ((4 + .65) / 9); world.growthGrace = 0; world.boss = null; world.enemyBeams = []; world.enemyBullets = [];
    world.enemies = [0,1,2].map((index) => { const foe = makeEnemy("lancer", 100 + index * 100, 80); foe.weaponModule = "laser"; foe.weaponPattern = "laserLance"; foe.speciesPattern = ""; return foe; });
    world.enemies.forEach((foe) => setEnemyState(foe, "telegraph"));
    return { pickup, sectorCharge, repeatCharge, repair, markedDamage, pulseShield, held: world.pressureHolds, telegraphs: world.enemies.filter((foe) => foe.aiState === "telegraph").length };
  });
  assert.ok(wiring.pickup.charge > 16); assert.equal(wiring.pickup.shield, 1); assert.equal(wiring.sectorCharge, wiring.repeatCharge);
  assert.equal(wiring.repair, 1.5); assert.equal(wiring.markedDamage, 7); assert.equal(wiring.pulseShield, 1);
  assert.equal(wiring.telegraphs, 2); assert.ok(wiring.held > 0);
  const drafts = await evaluate(() => {
    const totals = [];
    for (const mode of ["solo", "coop"]) {
      testProfile().selectedMode = mode; resetWorld(); world.mode = "inspection"; world.routeChoice = null;
      for (let stage = 0; stage < 3; stage++) {
        world.stageIndex = stage; world.midDraftIndex = 0; world.introTimer = 0; world.clearTimer = 0; world.bossSpawned = false;
        world.eventIndex = 9; world.encounterIndex = 4; world.activeEncounter = null;
        for (const point of SpaceDirector.MID_DRAFT_POINTS) {
          world.stageTime = activeStage().duration * point; updateStage(1/60);
          if (world.mode !== "draft") throw new Error("scheduled draft missing");
          confirmDraftSelection(); world.mode = "inspection";
        }
        if (stage < 2) { world.draftCount++; applyRunUpgrade(UPGRADE_DEFS.find((node) => node.id === "capacitor")); advanceStage(); world.routeChoice = null; }
      }
      totals.push({ mode, drafts: world.draftCount, upgrades: world.upgradeHistory.length, grace: world.growthGrace });
    }
    return totals;
  });
  assert.ok(drafts.every((entry) => entry.drafts === 14 && entry.upgrades === 14 && entry.grace > 0));
  // A normal-speed late-game sample with a reachable twelve-pick build, no
  // permanent research and no ongoing HP/clock overrides. Not a full-run claim.
  if (process.argv.includes("--late-sample")) {
    await evaluate(() => {
      testProfile().selectedMode = "solo"; testProfile().research = SpaceResearch.sanitize(); resetWorld();
      world.routeChoice = null; world.introTimer = 0; world.clearTimer = 0; world.stageIndex = 2;
      world.stageTime = activeStage().duration * ((4 + .48) / 9); world.midDraftIndex = 2; world.eventIndex = 5; world.encounterIndex = 2;
      for (const id of ["overclock", "rail", "overclock", "prism", "aegisCycle", "rail", "piercing", "capacitor", "novaCore", "aegisCycle", "overclock", "nanites"]) applyRunUpgrade(UPGRADE_DEFS.find((node) => node.id === id));
      world.growthGrace = 0; world.enemies = []; world.bullets = []; world.enemyBullets = []; world.mode = "playing";
      document.querySelector("#menu").hidden = true; document.querySelector("#result").hidden = true;
    });
    const lateStart = Date.now(); let late, previous = null, bullets = 0, enemies = 0;
    while (Date.now() - lateStart < 24000) {
      const key = Math.floor((Date.now() - lateStart) / 2400) % 2 ? "D" : "A";
      if (previous !== key) {
        if (previous) win.webContents.sendInputEvent({ type: "keyUp", keyCode: previous });
        win.webContents.sendInputEvent({ type: "keyDown", keyCode: key }); previous = key;
      }
      await delay(250);
      late = await evaluate(() => ({ ...document.querySelector("#game").dataset }));
      if (late.mode === "draft") await evaluate(() => { confirmDraftSelection(); });
      bullets = Math.max(bullets, Number(late.enemyBullets)); enemies = Math.max(enemies, Number(late.enemies));
      if (late.mode === "ended") break;
    }
    if (previous) win.webContents.sendInputEvent({ type: "keyUp", keyCode: previous });
    console.log("Late normal-speed sample", JSON.stringify({ mode: late.mode, hp: late.playerHp, damage: late.playerDamageTaken, downs: late.playerDownCount, peakBullets: bullets, peakEnemies: enemies, fps: late.fps, holds: late.pressureHolds }));
    assert.equal(late.combatInvalidProjectiles, "0"); assert.ok(Number(late.fps) >= 40);
    assert.notEqual(late.mode, "ended", "reachable late build must survive this short pressure sample");
    await shot("late-twelve-picks");
  }
  const rewards = await evaluate(() => {
    testProfile().research = SpaceResearch.sanitize({ focus: "salvage" }); resetWorld(); world.mode = "playing";
    world.kills = 12; world.stageTime = 120; world.researchPickups = 4;
    const before = testProfile().stardust; endGame(false);
    const awarded = testProfile().stardust - before; endGame(false);
    return { awarded, repeated: testProfile().stardust - before, reward: world.researchReward, saved: loadProfile().research };
  });
  assert.equal(rewards.awarded, 80); assert.equal(rewards.repeated, 80); assert.equal(rewards.reward.cacheCount, 1);
  assert.ok(Object.values(rewards.saved.ranks).some((rank) => rank === 1));
  await shot("result-en");
  await evaluate(() => { SpaceI18n.setLanguage("zh"); renderResult(); }); await shot("result-zh");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ migration, purchase, wiring, drafts, rewards, consoleErrors: errors.length, output }));
  win.destroy(); server.close(); app.quit();
}
run().catch((error) => { console.error(error); server.close(); app.exit(1); });
