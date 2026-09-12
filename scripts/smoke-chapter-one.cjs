const { app, BrowserWindow } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const offenseBuild = process.argv.includes('--offense');
const dualAi = process.argv.includes('--dual-ai');
const sampleSeconds = Number(process.argv.find(arg => arg.startsWith('--sample-seconds='))?.split('=')[1]) || 0;
if (sampleSeconds && (sampleSeconds < 20 || sampleSeconds > 570)) throw new Error('sample-seconds must be 20..570');
const outputRoot = path.join(os.tmpdir(), dualAi ? `spacescraft-chapter-one-dual-ai-${offenseBuild ? 'offense' : 'survival'}` : offenseBuild ? "spacescraft-chapter-one-offense" : "spacescraft-chapter-one-soak");
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png" };
const SAMPLE_MS = 250;
const CHAPTER_SECONDS = 570;
const BOSS_BUDGET_SECONDS = 240;
const BUILD_PRIORITY = offenseBuild
  ? ["rail", "drone", "prism", "overclock", "piercing", "chain", "nanites", "aegisCycle", "phase", "rushOverdrive", "capacitor"]
  : ["nanites", "aegisCycle", "phase", "overclock", "rail", "prism", "piercing", "turbo", "gyro", "capacitor", "magnet"];
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// Test-server-only instrumentation; no production globals, AI privileges or save edits.
function instrumentGame(source) {
  const replaceOnce = (from, to) => {
    if (source.split(from).length !== 2) throw new Error(`Fixture anchor missing or ambiguous: ${from}`);
    source = source.replace(from, to);
  };
  if (dualAi) {
    replaceOnce('if (index === 1 && world.gameMode === "solo") return aiPilotControls(world.players[1]);',
      'if (world.gameMode === "solo") { window.__pilotQA.controlCalls[index]++; return aiPilotControls(world.players[index]); }');
    // The production wingman assumes P1 is its partner; P1 must not target itself.
    replaceOnce('const partner = world.players[0];', 'const partner = world.players[1 - player.index];');
  }
  replaceOnce('world.power.shots[source] = (world.power.shots[source] || 0) + 1;',
    'world.power.shots[source] = (world.power.shots[source] || 0) + 1; window.__pilotQA.pilots[player.index].shots++;');
  replaceOnce('creditDamage(source, damage);',
    'creditDamage(source, damage); window.__pilotQA.pilots[bullet.owner].hits++; window.__pilotQA.pilots[bullet.owner].directDamage += damage.hull + damage.barrier;');
  replaceOnce('player.downCount += 1;', `player.downCount += 1;
    window.__pilotQA.events.push({type:'down',pilot:player.index,time:world.stageTime,hp:world.players.map(p=>p.hp),positions:world.players.map(p=>({x:p.x,y:p.y})),intent:world.players.map(p=>p.aiIntent)});`);
  replaceOnce('player.rescueCount += 1;', `player.rescueCount += 1;
    window.__pilotQA.events.push({type:'rescued',pilot:player.index,time:world.stageTime});`);
  replaceOnce('function updatePlayers(dt) {', `function updatePlayers(dt) {
    if (world.mode === 'playing' && world.introTimer <= 0 && !world.routeChoice) {
      for (const p of world.players) window.__pilotQA.pilots[p.index][p.downed ? 'downSeconds' : 'activeSeconds'] += dt;
      if (world.players.every(p=>!p.downed) && linkedNow()) window.__pilotQA.linkSeconds += dt;
    }`);
  return `window.__pilotQA={controlCalls:[0,0],events:[],linkSeconds:0,pilots:Array.from({length:2},()=>({shots:0,hits:0,directDamage:0,activeSeconds:0,downSeconds:0}))};\n` + source;
}
const gameSnapshot = instrumentGame(fs.readFileSync(path.join(root, 'src/game.js'), 'utf8'));

const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404).end("not found");
    return;
  }
  response.setHeader("Content-Type", mime[path.extname(target)] || "application/octet-stream");
  response.end(pathname === '/src/game.js' ? gameSnapshot : fs.readFileSync(target));
});

app.commandLine.appendSwitch("disable-background-timer-throttling");
app.setPath("userData", path.join(os.tmpdir(), `spacescraft-chapter-one-${process.pid}`));

async function stateOf(window) {
  return window.webContents.executeJavaScript(`(() => {
    const game = document.querySelector('#game');
    const scene = document.querySelector('#scene');
    const pair = (value) => value.split(',').map(Number);
    const positions = game.dataset.playerPosition.split(',').map((entry) => {
      const [x, y] = entry.split('|').map(Number);
      return { x, y };
    });
    return {
      mode: game.dataset.mode,
      qa: game.dataset.qa,
      stage: Number(game.dataset.stage),
      stageTime: Number(game.dataset.stageTime),
      runTargetSeconds: Number(game.dataset.runTargetSeconds),
      events: Number(game.dataset.events),
      encounters: Number(game.dataset.encounters),
      encounterHistory: game.dataset.encounterHistory,
      activeEncounter: game.dataset.activeEncounter,
      drafts: Number(game.dataset.drafts),
      draftContext: game.dataset.draftContext,
      draftOptions: game.dataset.draftOptions.split(',').filter(Boolean),
      pathOptions: game.dataset.pathOptions.split(',').filter(Boolean),
      enemies: Number(game.dataset.enemies),
      bullets: Number(game.dataset.enemyBullets),
      beams: Number(game.dataset.enemyBeams),
      nativeCount: Number(game.dataset.enemyNativeCount),
      species: game.dataset.enemySpecies,
      eliteCount: Number(game.dataset.enemyEliteCount),
      eliteSpawns: Number(game.dataset.ambientEliteSpawns),
      invalidProjectiles: Number(game.dataset.combatInvalidProjectiles),
      laserHits: Number(game.dataset.combatLaserHits),
      homingHits: Number(game.dataset.combatHomingHits),
      blastHits: Number(game.dataset.combatBlastHits),
      bodyCollisions: Number(game.dataset.combatBodyCollisions),
      deathrattles: Number(game.dataset.combatDeathrattles),
      hp: pair(game.dataset.playerHp),
      maxHp: pair(game.dataset.playerMaxHp),
      damageTaken: pair(game.dataset.playerDamageTaken),
      downed: pair(game.dataset.playerDowned),
      downs: pair(game.dataset.playerDownCount),
      rescues: pair(game.dataset.playerRescueCount),
      positions,
      aiIntent: game.dataset.aiIntent,
      pilotQA: window.__pilotQA,
      kills: Number(game.dataset.kills),
      powerDamage: JSON.parse(game.dataset.powerDamage || '{}'),
      powerShots: JSON.parse(game.dataset.powerShots || '{}'),
      powerHits: JSON.parse(game.dataset.powerHits || '{}'),
      linkSupport: JSON.parse(game.dataset.linkSupport || '{}'),
      masteryTasks: JSON.parse(game.dataset.masteryTasks || '{}'),
      bossPhase: Number(game.dataset.bossPhase),
      bossAttackState: game.dataset.bossAttackState,
      bossAttack: game.dataset.bossAttack,
      fps: Number(game.dataset.fps),
      renderer: scene.dataset.renderer,
      webgl: Boolean(scene.getContext('webgl2') || scene.getContext('webgl')),
    };
  })()`);
}

async function tapKey(window, keyCode) {
  window.webContents.sendInputEvent({ type: "keyDown", keyCode });
  await delay(45);
  window.webContents.sendInputEvent({ type: "keyUp", keyCode });
}

function movementKeys(state, elapsedSeconds) {
  const [pilot, wing] = state.positions;
  if (!pilot || !wing || state.downed[0]) return new Set();
  let targetX = wing.x - 34 + Math.sin(elapsedSeconds * .39) * 22;
  let targetY = wing.y + 4 + Math.sin(elapsedSeconds * .27) * 9;
  if (state.downed[1]) {
    targetX = wing.x;
    targetY = wing.y;
  } else if (state.bullets >= 12 || state.hp[0] <= Math.max(2, state.maxHp[0] * .34)) {
    targetX = wing.x - 26 + Math.sin(elapsedSeconds * 1.13) * 50;
    targetY = wing.y + 4 + Math.cos(elapsedSeconds * .83) * 18;
  }
  targetX = Math.max(24, Math.min(456, targetX));
  targetY = Math.max(105, Math.min(246, targetY));
  const keys = new Set();
  if (targetX < pilot.x - 7) keys.add("A");
  else if (targetX > pilot.x + 7) keys.add("D");
  if (targetY < pilot.y - 6) keys.add("W");
  else if (targetY > pilot.y + 6) keys.add("S");
  return keys;
}

function syncKeys(window, held, wanted) {
  for (const key of held) {
    if (!wanted.has(key)) window.webContents.sendInputEvent({ type: "keyUp", keyCode: key });
  }
  for (const key of wanted) {
    if (!held.has(key)) window.webContents.sendInputEvent({ type: "keyDown", keyCode: key });
  }
  return wanted;
}

async function confirmMidDraft(window, state) {
  const ranked = state.draftOptions
    .map((id, index) => ({ id, index, rank: BUILD_PRIORITY.indexOf(id) }))
    .sort((a, b) => (a.rank < 0 ? 999 : a.rank) - (b.rank < 0 ? 999 : b.rank))[0];
  const selectedIndex = ranked?.index || 0;
  for (let index = 0; index < selectedIndex; index += 1) await tapKey(window, "D");
  await tapKey(window, "W");
  return ranked?.id || state.draftOptions[0] || "unknown";
}

function updateSummary(summary, state, previousPosition) {
  summary.maxStageTime = Math.max(summary.maxStageTime, state.stageTime);
  summary.maxEvents = Math.max(summary.maxEvents, state.events);
  summary.maxEncounters = Math.max(summary.maxEncounters, state.encounters);
  summary.maxEnemies = Math.max(summary.maxEnemies, state.enemies);
  summary.maxBullets = Math.max(summary.maxBullets, state.bullets);
  summary.maxBeams = Math.max(summary.maxBeams, state.beams);
  summary.maxNative = Math.max(summary.maxNative, state.nativeCount);
  summary.maxElites = Math.max(summary.maxElites, state.eliteCount);
  summary.eliteSpawns = Math.max(summary.eliteSpawns, state.eliteSpawns);
  summary.invalidProjectiles = Math.max(summary.invalidProjectiles, state.invalidProjectiles);
  summary.laserHits = Math.max(summary.laserHits, state.laserHits);
  summary.homingHits = Math.max(summary.homingHits, state.homingHits);
  summary.blastHits = Math.max(summary.blastHits, state.blastHits);
  summary.bodyCollisions = Math.max(summary.bodyCollisions, state.bodyCollisions);
  summary.deathrattles = Math.max(summary.deathrattles, state.deathrattles);
  summary.minHp = summary.minHp.map((value, index) => Math.min(value, state.hp[index]));
  summary.maxDamageTaken = summary.maxDamageTaken.map((value, index) => Math.max(value, state.damageTaken[index]));
  summary.downs = summary.downs.map((value, index) => Math.max(value, state.downs[index]));
  summary.rescues = summary.rescues.map((value, index) => Math.max(value, state.rescues[index]));
  summary.maxBossPhase = Math.max(summary.maxBossPhase, state.bossPhase);
  summary.maxKills = Math.max(summary.maxKills, state.kills);
  if (state.bossAttack) summary.bossAttacks.add(state.bossAttack);
  if (state.bossAttackState !== "off") summary.bossStates.add(state.bossAttackState);
  if (state.activeEncounter) summary.encounterKinds.add(state.activeEncounter);
  if (state.aiIntent) summary.aiIntents.add(state.aiIntent);
  if (state.species) summary.species.add(state.species);
  if (state.mode === "playing" && state.stageTime >= 5 && state.fps > 0) {
    summary.minFps = Math.min(summary.minFps, state.fps);
    summary.fpsTotal += state.fps;
    summary.fpsSamples += 1;
  }
  if (previousPosition && state.positions[0]) {
    const step = Math.hypot(state.positions[0].x - previousPosition.x, state.positions[0].y - previousPosition.y);
    if (step < 40) summary.pilotDistance += step;
  }
  if (state.positions[0]) summary.pilotCells.add(`${Math.floor(state.positions[0].x / 48)}:${Math.floor(state.positions[0].y / 36)}`);
}

async function capture(window, filename) {
  const target = path.join(outputRoot, filename);
  fs.writeFileSync(target, (await window.webContents.capturePage()).toPNG());
  return target;
}

async function run() {
  await app.whenReady();
  fs.mkdirSync(outputRoot, { recursive: true });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const errors = [];
  const window = new BrowserWindow({ show: false, width: 1280, height: 720, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  window.webContents.on("console-message", (_event, level, message) => { if (level >= 2) errors.push(message); });
  await window.loadURL(`http://127.0.0.1:${port}/?seed=260901`);
  await window.webContents.executeJavaScript(`
    document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click();
    true;
  `);

  const summary = {
    maxStageTime: 0, maxEvents: 0, maxEncounters: 0, maxEnemies: 0, maxBullets: 0, maxBeams: 0,
    maxNative: 0, maxElites: 0, eliteSpawns: 0, invalidProjectiles: 0,
    laserHits: 0, homingHits: 0, blastHits: 0, bodyCollisions: 0, deathrattles: 0,
    minHp: [Infinity, Infinity],
    maxDamageTaken: [0, 0], downs: [0, 0], rescues: [0, 0], maxBossPhase: 0, maxKills: 0,
    bossSeen: false, bossDefeated: false, pilotDistance: 0, minFps: Infinity, fpsTotal: 0, fpsSamples: 0,
    draftChoices: [], screenshots: [], bossAttacks: new Set(), bossStates: new Set(), encounterKinds: new Set(),
    aiIntents: new Set(), species: new Set(), pilotCells: new Set(),
  };
  const startedAt = Date.now();
  let bossSeenAt = 0;
  let previousPosition = null;
  let held = new Set();
  let handledDrafts = 0;
  let nextCapture = 190;
  let nextLog = 30;
  let finalState = null;

  while (Date.now() - startedAt < (CHAPTER_SECONDS + BOSS_BUDGET_SECONDS + 45) * 1000) {
    await delay(SAMPLE_MS);
    const state = await stateOf(window);
    finalState = state;
    updateSummary(summary, state, previousPosition);
    previousPosition = state.positions[0] ? { ...state.positions[0] } : previousPosition;

    if (state.stage !== 1) {
      summary.bossDefeated = summary.bossSeen;
      break;
    }
    if (state.mode === "ended") break;
    if (sampleSeconds && state.stageTime >= sampleSeconds) break;
    if (state.bossPhase > 0) {
      summary.bossSeen = true;
      if (!bossSeenAt) {
        bossSeenAt = Date.now();
        summary.screenshots.push(await capture(window, "boss-entry.png"));
      }
    }
    if (summary.bossSeen && state.mode === "draft" && state.draftContext === "stage-clear") {
      summary.bossDefeated = true;
      summary.screenshots.push(await capture(window, "chapter-one-clear.png"));
      break;
    }

    if (state.mode === "draft" && state.draftContext === "mid-stage" && state.drafts > handledDrafts) {
      held = syncKeys(window, held, new Set());
      await delay(420);
      const refreshed = await stateOf(window);
      const selected = await confirmMidDraft(window, refreshed);
      handledDrafts = state.drafts;
      summary.draftChoices.push(selected);
      await delay(180);
      continue;
    }
    if (state.mode === "playing" && !dualAi) held = syncKeys(window, held, movementKeys(state, (Date.now() - startedAt) / 1000));
    else held = syncKeys(window, held, new Set());

    if (state.stageTime >= nextCapture && nextCapture < CHAPTER_SECONDS) {
      summary.screenshots.push(await capture(window, `chapter-one-${nextCapture}s.png`));
      nextCapture += 190;
    }
    const elapsed = (Date.now() - startedAt) / 1000;
    if (elapsed >= nextLog) {
      process.stdout.write(`[chapter-one] wall=${elapsed.toFixed(0)}s stage=${state.stageTime.toFixed(1)}s hp=${state.hp.join('/')} enemies=${state.enemies} bullets=${state.bullets} events=${state.events} encounters=${state.encounters} drafts=${state.drafts} boss=${state.bossPhase}\n`);
      nextLog += 30;
    }
    if (bossSeenAt && Date.now() - bossSeenAt >= BOSS_BUDGET_SECONDS * 1000 && summary.maxBossPhase >= 2) break;
  }
  held = syncKeys(window, held, new Set());
  if (summary.bossSeen && !summary.screenshots.some((entry) => entry.endsWith("chapter-one-clear.png"))) summary.screenshots.push(await capture(window, "boss-final.png"));

  const encounterHistory = (finalState?.encounterHistory || "").split(",").filter(Boolean);
  const result = {
    ...summary,
    bossAttacks: [...summary.bossAttacks], bossStates: [...summary.bossStates], encounterKinds: [...summary.encounterKinds],
    aiIntents: [...summary.aiIntents], species: [...summary.species], pilotCells: summary.pilotCells.size,
    averageFps: summary.fpsSamples ? Number((summary.fpsTotal / summary.fpsSamples).toFixed(1)) : 0,
    encounterHistory, handledDrafts, wallSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)), finalState,
  };
  delete result.fpsTotal;
  delete result.fpsSamples;
  result.buildPolicy = offenseBuild ? 'offense' : 'survival';
  result.controller = dualAi ? 'dual-production-ai-peer-partner' : 'direction-script-plus-wingman';
  result.sampleSeconds = sampleSeconds;
  result.survived = finalState?.mode !== 'ended';
  summary.screenshots.push(await capture(window, 'final.png'));
  fs.writeFileSync(path.join(outputRoot, 'report.json'), JSON.stringify({chapterOne:result,consoleErrors:errors}, null, 2));

  if (!finalState || finalState.qa !== "off" || finalState.runTargetSeconds !== 1800) throw new Error(`chapter-one soak was not a normal 1x run: ${JSON.stringify(result)}`);
  if (!finalState.webgl || finalState.renderer !== "three-r185-instanced-voxel") throw new Error(`chapter-one WebGL contract failed: ${JSON.stringify(result)}`);
  if (dualAi && !finalState.pilotQA.controlCalls.every(count=>count>600)) throw new Error('Both pilots must actually execute production AI controls');
  if (sampleSeconds) {
    if (errors.length || summary.invalidProjectiles) throw new Error('sample contained runtime or projectile errors');
    // A bounded observation records deaths too. It does NOT pass the full-chapter gate.
    process.stdout.write(`${JSON.stringify({sample:result,fullChapterVerified:false,consoleErrors:errors.length,outputRoot})}\n`);
    window.destroy(); server.close(); app.quit(); return;
  }
  if (summary.maxStageTime < CHAPTER_SECONDS - .75 || summary.maxEvents !== 9 || summary.maxEncounters !== 4 || encounterHistory.length !== 4) throw new Error(`chapter-one director coverage incomplete: ${JSON.stringify(result)}`);
  if (handledDrafts !== 4 || summary.draftChoices.length !== 4) throw new Error(`chapter-one mid-stage builds incomplete: ${JSON.stringify(result)}`);
  if (summary.maxNative < 1 || summary.species.size !== 1 || summary.eliteSpawns < 1 || summary.maxElites < 1) throw new Error(`chapter-one ecology coverage incomplete: ${JSON.stringify(result)}`);
  if (!summary.bossSeen || (!summary.bossDefeated && summary.maxBossPhase < 2) || summary.bossAttacks.size < 1 || !summary.bossStates.has("telegraph")) throw new Error(`chapter-one Boss coverage incomplete: ${JSON.stringify(result)}`);
  if (finalState.mode === "ended" || finalState.hp.every((value) => value <= 0)) throw new Error(`chapter-one crew did not survive: ${JSON.stringify(result)}`);
  if (summary.maxEnemies < 5 || summary.maxBullets < 8 || summary.maxKills < 12) throw new Error(`chapter-one battlefield intensity was not exercised: ${JSON.stringify(result)}`);
  if (summary.invalidProjectiles > 0) throw new Error(`chapter-one emitted invalid projectile geometry: ${JSON.stringify(result)}`);
  if (summary.pilotDistance < 1800 || summary.pilotCells.size < 10 || summary.aiIntents.size < 2) throw new Error(`chapter-one avoidance pilot did not demonstrate meaningful movement: ${JSON.stringify(result)}`);
  if (summary.minFps < 40 || result.averageFps < 50) throw new Error(`chapter-one long-run performance regressed: ${JSON.stringify(result)}`);
  if (errors.length) throw new Error(`chapter-one console errors: ${errors.join(" | ")}`);

  process.stdout.write(`${JSON.stringify({ chapterOne: result, consoleErrors: errors.length, outputRoot })}\n`);
  window.destroy();
  server.close();
  app.quit();
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  server.close();
  app.exit(1);
});
