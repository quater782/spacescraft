const { app, BrowserWindow } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'spacescraft-boss-encounters');
const fixturesOnly = process.argv.includes('--fixtures-only') || process.argv.includes('--presentation-only');
const simulation = process.argv.includes('--simulation');
const firstChapter = process.argv.includes('--first-chapter');
const wounded = process.argv.includes('--wounded');
const build = process.argv.includes('--defense') ? 'defense' : process.argv.includes('--offense') ? 'offense' : 'balanced';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
// Test-only bridge served on loopback; production files expose no mutable globals.
const bridge = 'world, resetWorld, spawnBoss, enterBossPhase, updateEnemy, updateBoss, damageEnemy, enemyBullet, enemyBeam, beginBossAttack, executeBossAttack, draw, renderer3D, audio, AudioEngine, profile, applyRunUpgrade, UPGRADE_DEFS, activeStage, activateAnomaly, input, aiPilotControls, update';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const target = path.resolve(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[path.extname(target)] || 'application/octet-stream');
  res.end(pathname === '/src/game.js' ? fs.readFileSync(target, 'utf8') + `\nObject.assign(window,{${bridge}});` : fs.readFileSync(target));
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData', path.join(os.tmpdir(), `spacescraft-boss-encounters-${process.pid}`));
async function run() {
  await app.whenReady();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync(output, { recursive: true });
  const win = new BrowserWindow({ width: 1280, height: 900, show: false, webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') { errors.push(event.message); console.error(event.message); } });
  const url = `http://127.0.0.1:${server.address().port}/?seed=260924`;
  await win.loadURL(url);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true`);
  const fixtures = await win.webContents.executeJavaScript(`(() => {
    const check=(ok,label)=>{if(!ok){console.error(label);throw new Error(label)}};
    window.setupBoss=(stage)=>{
      resetWorld();world.mode='inspection';world.gameMode='solo';world.stageIndex=stage;
      world.stageTime=activeStage().duration;world.sectorIndex=2;world.globalSector=stage*3+3;
      activateAnomaly(2,{announce:false});
      world.introTimer=0;world.routeChoice=null;world.cinematic=null;world.activeEncounter=null;
      world.enemies=[];world.bullets=[];world.enemyBullets=[];world.enemyBeams=[];world.stageEvent=null;
      world.players.forEach((p,i)=>{p.x=205+i*70;p.y=215;});
      spawnBoss();return world.boss;
    };
    const results=[];
    for(let stage=0;stage<3;stage++){
      const b=setupBoss(stage); b.x=240;b.y=58;b.age=4;b.phaseShield=0;
      const bullet=enemyBullet(20,30,0,30,'#ff6680',3,b);
      const beam=enemyBeam(b,world.players[0]);
      // Arrival preserves both object identity and biome/sector, not just the count.
      const biome=activeStage().biome.id, sector=world.sectorIndex;spawnBoss();
      check(world.enemyBullets.includes(bullet)&&world.enemyBeams.includes(beam),'arrival erased hazards');
      check(activeStage().biome.id===biome&&world.sectorIndex===sector,'arrival changed biome');
      world.boss=b;world.enemies=[b];beginBossAttack(b,stage);
      const commit=b.attackCommit,attack=b.attackId;b.hp=b.maxHp*.65;enterBossPhase(b,2);
      check(b.phaseLevel===1&&b.pendingPhase===2&&b.attackCommit===commit&&b.attackId===attack,'phase interrupted warning');
      for(let f=0;f<400&&b.phaseLevel===1;f++){world.time+=1/60;updateEnemy(b,1/60);}
      check(b.phaseLevel===2&&b.opening>2.5&&b.phaseShield===0,'phase failed to open core');
      check(world.enemyBullets.includes(bullet)&&world.enemyBeams.includes(beam),'phase erased hazards');
      const hp=b.hp;damageEnemy(b,10);check(Math.abs(hp-b.hp-13)<1e-6,'core opening damage mismatch');
      world.shake=0;world.cinematic=null;draw();const camera=renderer3D.camera.matrixWorld.elements.slice();
      world.cinematic={type:'boss',timer:1.2,total:2.4};draw();
      check(camera.every((v,i)=>Math.abs(v-renderer3D.camera.matrixWorld.elements[i])<1e-7),'boss camera changed framing');
      // Burst through both thresholds: phase 2 must retain its full advertised opening.
      b.phaseLevel=1;b.weaponState='cooldown';b.phaseRecovery=0;b.hp=b.maxHp*.2;
      enterBossPhase(b,3);check(b.phaseLevel===2,'burst must enter the next phase first');
      for(let f=0;f<160;f++){world.time+=1/60;updateEnemy(b,1/60);check(b.phaseLevel===2,'burst skipped phase 2 recovery');}
      check(b.opening>0&&b.phaseShield===0,'burst recovery became invulnerable');
      const burstHp=b.hp;damageEnemy(b,1);check(b.hp<burstHp,'burst recovery blocked damage');
      for(let f=0;f<20&&b.phaseLevel===2;f++){world.time+=1/60;updateEnemy(b,1/60);}
      check(b.phaseLevel===3,'queued phase never resumed');
      const attacks=new Set();
      b.phaseLevel=3;b.hp=b.maxHp;b.opening=0;b.weaponState='cooldown';b.weaponTimer=0;
      let moving=0,maxAdds=0;
      for(let f=0;f<3600;f++){
        world.time+=1/60;updateEnemy(b,1/60);if(b.weaponState==='fire')attacks.add(b.attackId);
        moving=Math.max(moving,Math.hypot(b.vx,b.vy));maxAdds=Math.max(maxAdds,world.enemies.filter(e=>!e.boss&&!e.dead).length);
        if(f%240===0){world.enemyBullets=[];world.enemyBeams=[];}
      }
      check(attacks.size===4,'chapter missing attacks');check(maxAdds<=[2,3,4][stage],'add budget');
      check(world.combatInvalidProjectiles===0,'invalid projectile');
      // A queued phase must wait for every volley, without reacquiring a target mid-combo.
      b.phaseLevel=2;b.phaseRecovery=0;b.opening=0;b.hp=b.maxHp*.65;b.attackIndex=0;b.weaponState='cooldown';
      beginBossAttack(b,stage);
      for(let f=0;f<180&&b.weaponState!=='fire';f++){world.time+=1/60;updateEnemy(b,1/60);}
      check(b.weaponState==='fire'&&b.salvoCount===2,'phase two must advertise a two-volley attack');
      const salvoCommit=b.attackCommit,volleyCount=b.salvoCount,volleys=new Set([b.salvoIndex]);
      b.hp=b.maxHp*.2;enterBossPhase(b,3);
      for(let f=0;f<180&&b.phaseLevel===2;f++){
        world.time+=1/60;updateEnemy(b,1/60);volleys.add(b.salvoIndex);
        if(b.weaponState==='fire')check(b.attackCommit===salvoCommit,'combo reacquired its aim');
      }
      check(volleys.size===volleyCount&&b.phaseLevel===3,'phase interrupted a scheduled volley');
      // Audio must retain transport and produce three distinct composed motifs.
      const tones=[],oldTone=audio.tone,oldNoise=audio.noise,oldKick=audio.kick,oldSnare=audio.snare;
      audio.tone=(...args)=>tones.push([args[0],args[1],args[2]]);audio.noise=audio.kick=audio.snare=()=>{};
      const step=audio.step;audio.setStage(stage,true);for(let beat=0;beat<16;beat++)audio.scheduleStep(beat,0);
      check(audio.step===step,'boss reset music transport');audio.tone=oldTone;audio.noise=oldNoise;audio.kick=oldKick;audio.snare=oldSnare;
      results.push({stage:stage+1,attacks:[...attacks],maxAdds,moving,notes:tones.length,signature:JSON.stringify(tones)});
    }
    check(new Set(results.map(r=>r.signature)).size===3,'identical chapter music');
    return results.map(({signature,...r})=>r);
  })()`);
  console.log(JSON.stringify({ fixtures }));
  if (process.argv.includes('--presentation-only')) {
    const samples = await win.webContents.executeJavaScript(`(async()=>{
      const engine=Object.create(AudioEngine.prototype);
      engine.context=new OfflineAudioContext(1,44100*4,44100);
      engine.sfxBus=engine.context.createGain();engine.sfxBus.gain.value=.52*.65;engine.sfxBus.connect(engine.context.destination);
      engine.noiseBuffer=engine.createNoiseBuffer();
      const tone=engine.tone.bind(engine),noise=engine.noise.bind(engine);let offset=.1;
      engine.tone=(n,d,t,v,w,...rest)=>tone(n,d,t,v,w+offset,...rest);
      engine.noise=(d,v,w,...rest)=>noise(d,v,w+offset,...rest);
      for(let stage=0;stage<3;stage++){engine.stage=stage;offset=.1+stage*1.2;engine.sfx('bossPhase');}
      const buffer=await engine.context.startRendering();return Array.from(buffer.getChannelData(0));
    })()`);
    const peaks=[0,1,2].map(i=>samples.slice(i*52920,(i+1)*52920).reduce((m,v)=>Math.max(m,Math.abs(v)),0));
    peaks.forEach(p=>assert.ok(p>.01&&p<1,'phase cue silent or clipped'));
    const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
    wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
    samples.forEach((v,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));
    fs.writeFileSync(path.join(output,'boss-phase-cues.wav'),wav);
    await delay(1100);
    assert.equal(await win.webContents.executeJavaScript("document.querySelector('#bootSplash').hidden"),true,'startup cover still visible');
    for(let stage=0;stage<3;stage++)for(const elapsed of [.7,1.4]) {
      const visual=await win.webContents.executeJavaScript(`(()=>{
        const b=setupBoss(${stage});b.x=240;b.y=100;b.age=5;b.phaseShield=0;b.phaseLevel=3;
        b.phaseMorph=1.4-${elapsed};b.opening=2.8-${elapsed};b.weaponState='cooldown';b.weaponDuration=2.8;b.weaponTimer=2.8-${elapsed};
        world.cinematic=null;world.shake=0;world.mode='inspection';world.introTimer=0;document.querySelector('#menu').hidden=true;
        profile.settings.quality=${stage===1 ? "'low'" : "'high'"};document.querySelector('#toast').style.display='none';draw();
        return {growth:renderer3D.bossPhaseGrowth(b,3),older:renderer3D.bossPhaseGrowth(b,2),opening:renderer3D.bossOpeningAmount(b),dropped:renderer3D.surfaces.dropped};
      })()`);
      assert.equal(visual.growth,elapsed===.7?.5:1);assert.equal(visual.older,1);assert.equal(visual.opening,1);assert.equal(visual.dropped,0,'boss detail exceeded shared surface capacity');
      await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
      await delay(150);
      fs.writeFileSync(path.join(output,`phase-stage-${stage+1}-${elapsed}.png`),(await win.webContents.capturePage()).toPNG());
    }
    console.log(JSON.stringify({phaseAudioPeaks:peaks,visualMorph:'midpoint and full extension, all three chapters'}));
  }
  const battles = [];
  for (let stage = process.argv.includes('--final-chapter') ? 2 : 0; stage < (fixturesOnly ? 0 : firstChapter ? 1 : process.argv.includes('--first-two') ? 2 : 3); stage++) {
    await win.webContents.executeJavaScript(`(() => {
      setupBoss(${stage});
      const cards=({balanced:['nanites','rail','drone','overclock','aegisCycle','prism','phase','capacitor'],defense:['nanites','aegisCycle','phase','rail','drone','prism','overclock','capacitor'],offense:['rail','overclock','drone','prism','piercing','rail','overclock','drone']})['${build}'].slice(0,[2,5,8][${stage}]);
      for(const id of cards)applyRunUpgrade(UPGRADE_DEFS.find(c=>c.id===id));
      if(${wounded})world.players.forEach(p=>{p.hp=3;p.shield=0;p.invulnerability=0;});
      world.growthGrace=0;window.normalInput??=input.player.bind(input);input.player=index=>aiPilotControls(world.players[index]);
      window.battleStarted=world.time;world.mode=${simulation ? "'inspection'" : "'playing'"};document.querySelector('#menu').hidden=true;
      document.querySelector('#upgradePanel').hidden=true;SpaceI18n.setLanguage(${stage===1 ? "'en'" : "'zh'"});
      profile.settings.quality=${stage===1 ? "'low'" : "'high'"};true;
    })()`);
    let final, maxBullets=0, phases=new Set(), captured=false;
    for(let sample=0;sample<(simulation?120:1200);sample++) {
      if(simulation) await win.webContents.executeJavaScript(`(()=>{world.mode='playing';for(let f=0;f<120&&world.mode==='playing'&&world.boss;f++)update(1/60);draw();window.simMode=world.mode;if(world.mode==='playing')world.mode='inspection';return true;})()`);
      else await delay(200);
      final=await win.webContents.executeJavaScript(`({mode:${simulation ? "window.simMode" : "world.mode"},elapsed:world.time-window.battleStarted,boss:!!world.boss,hp:world.players.map(p=>p.hp),damage:world.players.map(p=>p.damageTaken),downs:world.players.map(p=>p.downCount),phase:world.boss?.phaseLevel||0,bossHp:world.boss?.hp||0,bullets:world.enemyBullets.length,weapon:world.boss?.weaponState,opening:world.boss?.opening||0,fps:Number(document.querySelector('#game').dataset.fps),invalid:world.combatInvalidProjectiles})`);
      maxBullets=Math.max(maxBullets,final.bullets);if(final.phase)phases.add(final.phase);
      if(!captured&&final.weapon==='windup'&&final.elapsed>8){await win.webContents.executeJavaScript('draw();true');fs.writeFileSync(path.join(output,`chapter-${stage+1}.png`),(await win.webContents.capturePage()).toPNG());captured=true;}
      if(!final.boss||final.mode!=='playing')break;
    }
    const report={stage:stage+1,simulation,build,entryHp:wounded?3:'full',...final,maxBullets,phases:[...phases]};battles.push(report);console.log(JSON.stringify({battle:report}));
    fs.writeFileSync(path.join(output,'latest-battles.json'),JSON.stringify(battles,null,2));
    assert.equal(final.invalid,0);if(!simulation)assert.ok(final.fps>=45,'boss performance below 45 FPS');
    assert.equal(final.boss,false,'isolated boss battle failed or exceeded 240 seconds');
    assert.deepEqual([...phases],[1,2,3],'battle skipped a phase');
    // Report survival honestly; an isolated fixture is not a full-run difficulty claim.
  }
  const openings=[];
  for(const mode of simulation || fixturesOnly || process.argv.includes('--first-two') || process.argv.includes('--skip-openings') || process.argv.includes('--final-chapter') ? [] : ['solo','coop']) {
    await win.loadURL(url);
    await win.webContents.executeJavaScript(`profile.selectedMode='${mode}';document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true`);
    let state;
    for(let i=0;i<180;i++){
      await delay(200);
      state=await win.webContents.executeJavaScript(`(() => {return {time:world.stageTime,mode:world.mode,hp:world.players.map(p=>p.hp),fps:Number(document.querySelector('#game').dataset.fps),invalid:world.combatInvalidProjectiles};})()`);
      if(state.time>=20||state.mode==='gameover')break;
    }
    assert.ok(state.time>=20,'normal opening did not reach 20 seconds');assert.equal(state.invalid,0);openings.push({controlMode:mode,...state});
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,fixturesOnly ? 'report-fixtures.json' : simulation ? 'report-simulation.json' : firstChapter ? `report-first-${build}-${wounded?'wounded':'full'}.json` : process.argv.includes('--final-chapter') ? 'report-final-chapter.json' : process.argv.includes('--skip-openings') ? 'report-battles.json' : process.argv.includes('--first-two') ? 'report-first-two.json' : 'report.json'),JSON.stringify({fixtures,battles,openings,errors},null,2));
  console.log(JSON.stringify({openings,errors,output}));
  win.destroy();server.close();app.quit();
}
run().catch(e=>{console.error(e.stack||e);server.close();app.exit(1);});
