const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Deterministic mechanics fixtures, NOT a natural-play difficulty benchmark.
// The bridge exists only in this isolated loopback server, never shipped source.
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'spacescraft-particle-effects');
const bridge = 'useNova, powerEffect, enemyBeam, fireLaser, audio, AudioEngine, researchShield, renderer3D, damagePlayer, world, resetWorld, applyRunUpgrade, UPGRADE_DEFS, advanceStage, relicBonuses, makeEnemy, handleCollisions, updatePlayers, updatePlayerStatus, playerShoot, emitPlayerShot, updateAuxiliaryWeapons, updateRush, startRush, updateObjects, detonateEnemyBlast, enemyBullet, applyPickup, addNovaCharge, draw, renderUpgradeDraft, renderPowerSummary';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const target = path.resolve(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'})[path.extname(target)] || 'application/octet-stream');
  res.end(pathname === '/src/game.js' ? fs.readFileSync(target, 'utf8') + `\nObject.assign(window, {${bridge}});` : fs.readFileSync(target));
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData', path.join(os.tmpdir(), `spacescraft-particle-effects-${process.pid}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  await app.whenReady();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync(output, {recursive:true});
  const win = new BrowserWindow({width:1440, height:900, show:false, webPreferences:{backgroundThrottling:false, contextIsolation:true, nodeIntegration:false, sandbox:true}});
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') {errors.push(event.message);console.error(event.message);} });
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click(); true;`);
  await delay(300);
  const directions = await win.webContents.executeJavaScript(`(() => {
    window.cleanEffects = () => {
      resetWorld(); world.mode='inspection'; world.introTimer=0; world.clearTimer=0; world.routeChoice=null; world.cinematic=null;
      world.enemies=[]; world.enemyBullets=[]; world.enemyBeams=[]; world.bullets=[]; world.pickups=[]; world.particles=[];
      world.players.forEach((p,i)=>{p.x=170+i*140;p.y=205;p.shield=3;p.invulnerability=0;});
      world.linked=false;world.time=2;world.rushTimer=0;
    };
    cleanEffects();
    const result=[];
    for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const p=world.players[0];p.shield=3;p.invulnerability=0;
      world.enemyBullets=[];enemyBullet(p.x+dx*2,p.y+dy*2,-dx*60,-dy*60);handleCollisions();
      result.push({dx,dy,x:p.shieldImpactX,y:p.shieldImpactY,shield:p.shield});
    }
    cleanEffects();
    const p=world.players[0];world.enemyBeams=[{x1:p.x,y1:20,x2:p.x,y2:260,width:5,age:0,duration:.6,damage:1,hitIds:[]}];
    updateObjects(1/60);
    result.push({laser:true,x:p.shieldImpactX,y:p.shieldImpactY,shield:p.shield});
    return result;
  })()`);
  for(const hit of directions) { assert.equal(hit.shield,2); assert.equal(hit.x,hit.laser?0:hit.dx); assert.equal(hit.y,hit.laser?-1:hit.dy); }
  const shieldEvents = await win.webContents.executeJavaScript(`(() => {
    cleanEffects();world.gameMode='duo';const p=world.players[0];p.shield=2;
    const sounds=[];const original=audio.sfx.bind(audio);
    audio.sfx=(name,...args)=>{if(name.startsWith('shield'))sounds.push(name);original(name,...args);};
    const checks={};
    try {
      damagePlayer(p,1,{x:p.x-20,y:p.y});
      checks.hit=p.shield===1&&p.shieldHitTimer===.48&&sounds.at(-1)==='shieldBlock';
      const count=sounds.length;damagePlayer(p,1);checks.invulnerable=sounds.length===count&&p.shield===1;
      p.invulnerability=0;damagePlayer(p,1,{x:p.x-20,y:p.y});
      checks.break=p.shield===0&&p.shieldBreakTimer===.8&&sounds.at(-1)==='shieldBreak';
      applyPickup(p,{type:'shield',x:p.x,y:p.y,dead:false});
      checks.pickup=p.shield===2&&p.shieldReformTimer===.72&&p.shieldBreakTimer===0&&sounds.at(-1)==='shieldReform';
      p.shield=p.maxShield;const full=sounds.length;applyPickup(p,{type:'shield',x:p.x,y:p.y,dead:false});checks.full=sounds.length===full;
      p.shield=0;p.shieldRegenInterval=1;p.shieldRegenTimer=0;updatePlayers(1/60);
      checks.regen=p.shield===1&&p.shieldReformTimer===.72&&sounds.at(-1)==='shieldReform';
      p.shield=0;world.players[1].shield=world.players[1].maxShield;researchShield();
      checks.research=p.shield===1&&p.shieldReformTimer===.72&&sounds.at(-1)==='shieldReform';
      updatePlayers(1/60);checks.decay=p.shieldReformTimer<.72&&p.shieldReformTimer>0;
      return {checks,sounds};
    } finally {audio.sfx=original;}
  })()`);
  for(const [name,passed] of Object.entries(shieldEvents.checks)) assert.ok(passed, 'shield event: '+name);
  const impacts = await win.webContents.executeJavaScript(`(() => {
    cleanEffects();const p=world.players[0];const results=[];
    for(const damage of [1,4]) {
      p.shield=6;p.invulnerability=0;p.vx=p.vy=0;world.enemyBullets=[];
      enemyBullet(p.x-2,p.y,60,0,'#ffdf68',3,null,{damage});
      handleCollisions();results.push({damage,absorbed:p.shieldImpactDamage,remaining:p.shield,incoming:p.shieldIncomingX});
    }
    p.shield=1;p.invulnerability=0;const hp=p.hp;damagePlayer(p,4,{x:p.x-2,y:p.y,vx:60,vy:0});
    const overflow={absorbed:p.shieldImpactDamage,hullLost:hp-p.hp};
    const profile={span:.8,bodyLength:.8/.78};const base=renderer3D.scene.matrix.clone().identity();
    const angles=[0,.9,-.9].map(z=>{
      const contact=renderer3D.shieldContact(base,profile,{shieldImpactOffsetX:-2,shieldImpactOffsetY:z*13.3,shieldIncomingX:1,shieldIncomingY:0});
      return {incidence:contact.incidence,surface:contact.point.x**2+((contact.point.y-.18)/.8)**2+contact.point.z**2,reflectionZ:contact.reflection.z};
    });
    return {results,overflow,angles};
  })()`);
  for(const hit of impacts.results){assert.equal(hit.absorbed,hit.damage);assert.equal(hit.remaining,6-hit.damage);assert.equal(hit.incoming,1);}
  assert.deepEqual(impacts.overflow,{absorbed:1,hullLost:3});
  impacts.angles.forEach(contact=>assert.ok(Math.abs(contact.surface-1)<1e-6));
  assert.ok(impacts.angles[0].incidence>.99&&impacts.angles[1].incidence<.5&&impacts.angles[2].incidence<.5);
  assert.ok(impacts.angles[1].reflectionZ>0&&impacts.angles[2].reflectionZ<0);
  let audioPeaks=[];
  // Visual iterations need not depend on the host audio device clock.
  if (!process.argv.includes('--visual-only')) {
  const samples = await win.webContents.executeJavaScript(`(async () => {
    const engine=Object.create(AudioEngine.prototype);
    engine.context=new OfflineAudioContext(1,44100*3.6,44100);
    engine.sfxBus=engine.context.createGain();engine.sfxBus.gain.value=.52*.65;engine.sfxBus.connect(engine.context.destination);
    engine.noiseBuffer=engine.createNoiseBuffer();
    // Schedule the unchanged production sfx method at three separate timeline offsets.
    const tone=engine.tone.bind(engine),noise=engine.noise.bind(engine);let offset=0;
    engine.tone=(n,d,t,v,w,...rest)=>tone(n,d,t,v,w+offset,...rest);
    engine.noise=(d,v,w,...rest)=>noise(d,v,w+offset,...rest);
    for(const [i,name] of ['shieldBlock','shieldBreak','shieldReform'].entries()){offset=i===0?.2:i*1.2;engine.sfx(name);}
    const buffer=await engine.context.startRendering();return Array.from(buffer.getChannelData(0));
  })()`);
  audioPeaks=[0,1,2].map(i=>samples.slice(i*52920,(i+1)*52920).reduce((max,v)=>Math.max(max,Math.abs(v)),0));
  audioPeaks.forEach(value=>assert.ok(value>.01&&value<1,'shield audio audible, unclipped'));
  const wav=Buffer.alloc(44+samples.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
  samples.forEach((v,i)=>wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));fs.writeFileSync(path.join(output,'shield-hit-break-reform.wav'),wav);
  await win.webContents.executeJavaScript(`(async()=>{await audio.context.resume();if(!audio.enabled)audio.toggleMute();audio.toggleMute();return true;})()`,true);await delay(200);
  assert.equal(await win.webContents.executeJavaScript('audio.master.gain.value'),0);
  await win.webContents.executeJavaScript(`audio.toggleMute();true;`);
  }
  const capture = async (name, script) => {
    await win.webContents.executeJavaScript(`(() => {${script}; draw(); document.querySelector('#game').style.visibility='hidden';document.querySelector('#toast').style.visibility='hidden';return true;})()`);
    await delay(100);
    fs.writeFileSync(path.join(output,name+'.png'),(await win.webContents.capturePage()).toPNG());
    if(['shield-directions','shield-damage','shield-angle','link-overload','link-intercept'].includes(name)) fs.writeFileSync(path.join(output,name+'-detail.png'),(await win.webContents.capturePage({x:410,y:495,width:620,height:190})).toPNG());
  };
  // New VFX use production event creation and simulation ages, without advancing combat.
  const skillFrames = [];
  for (const quality of ['low', 'balanced', 'high']) {
    for (const age of [.04, .18, .42]) {
      await capture(`pixel-skills-${quality}-${age}`, `cleanEffects();
        document.querySelector('#qualitySetting').value='${quality}';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));
        world.players.forEach(p=>p.shield=0);world.novaCharge=SpaceRush.NOVA_CONFIG.threshold;world.novaCooldown=0;useNova();
        world.flash=0;world.shake=0;world.particles=[];
        powerEffect('impact',140,105,12,'#dfac58',3);powerEffect('muzzle',240,105,7,'#59d8c9',3);
        powerEffect('blast',340,105,28,'#ff965d',3);powerEffect('arc',140,105,0,'#adefff',2,{x:240,y:105});
        world.power.effects.forEach(e=>e.age=${age});world.power.effects=world.power.effects.filter(e=>e.age<e.duration);`);
      skillFrames.push(await win.webContents.executeJavaScript(`({quality:'${quality}',age:${age},nova:world.power.effects.filter(e=>e.kind==='nova').length,novaRadius:world.power.effects.find(e=>e.kind==='nova')?.radius,clearRadius:world.novaLastRadius,...document.querySelector('#scene').dataset})`));
    }
  }
  for (const frame of skillFrames) {assert.equal(frame.nova,2);assert.equal(frame.novaRadius,frame.clearRadius);assert.ok(Number(frame.effectWaves)>=2);assert.equal(frame.effectDropped,'0');assert.ok(Number(frame.effectParticles)>0);}
  await win.webContents.executeJavaScript(`document.querySelector('#qualitySetting').value='balanced';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));true;`);
  if (process.argv.includes('--pulse-motion')) {
    await win.webContents.executeJavaScript(`cleanEffects();world.players.forEach((p,i)=>{p.shield=0;p.x=180+i*120;p.y=165;});
      world.novaCharge=SpaceRush.NOVA_CONFIG.threshold;world.novaCooldown=0;useNova();world.shake=0;
      window.pulseEffects=world.power.effects.map(e=>({...e}));
      window.pulseShots=Array.from({length:12},(_,i)=>({x:105+i*24,y:105+i%3*22,vx:0,vy:60,r:3,age:.2,behavior:'linear',weaponModule:'pulse'}));
      document.querySelector('#game').style.visibility='hidden';document.querySelector('#toast').style.visibility='hidden';true;`);
    for(let frame=0;frame<36;frame++) {
      await win.webContents.executeJavaScript(`world.time=2+${frame/30};world.power.effects=pulseEffects.filter(e=>${frame/30}<e.duration).map(e=>({...e,age:${frame/30}}));
        world.enemyBullets=pulseShots.map(b=>({...b,y:b.y+${frame/30}*20}));draw();true;`);
      await delay(35);
      fs.writeFileSync(path.join(output,`pulse-${String(frame).padStart(3,'0')}.png`),(await win.webContents.capturePage()).toPNG());
    }
  }
  await capture('shield-directions', `cleanEffects();
    damagePlayer(world.players[0],1,{x:120,y:205});damagePlayer(world.players[1],1,{x:360,y:205});
    world.players.forEach(p=>p.shieldHitTimer=.40);world.particles=[];`);
  await capture('shield-damage', `cleanEffects();world.players.forEach((p,i)=>{p.shield=6;p.vx=p.vy=0;damagePlayer(p,i?4:1,{x:p.x-2,y:p.y,vx:60,vy:0});p.shieldHitTimer=.33;});world.particles=[];`);
  await capture('shield-angle', `cleanEffects();world.players.forEach((p,i)=>{p.shield=6;p.vx=p.vy=0;damagePlayer(p,2,{x:p.x-2,y:p.y+(i?15:0),vx:60,vy:0});p.shieldHitTimer=.32;});world.particles=[];`);
  await capture('shield-break', `world.players.forEach((p,i)=>{p.invulnerability=0;p.shield=1;damagePlayer(p,1,{x:p.x,y:120});p.shieldBreakTimer=.53;p.shieldHitTimer=.21;});world.particles=[];`);
  await capture('shield-reform', `cleanEffects();world.gameMode='duo';world.players.forEach(p=>{p.shield=0;applyPickup(p,{type:'shield',x:p.x,y:p.y,dead:false});p.shieldReformTimer=.39;});world.particles=[];`);
  await capture('link-charge', `cleanEffects();world.linked=true;world.rushCharge=65;world.upgrades.rushGuard=1;world.power.guardNodes=3;world.players.forEach(p=>p.shield=0);`);
  await capture('link-overload', `world.rushTimer=4;world.rushCharge=0;world.power.guardNodes=1;world.time=2.17;`);
  await capture('link-intercept', `world.power.effects=[{kind:'intercept',x:240,y:205,radius:9,color:'#b9efff',tier:2,duration:.3,age:.1}];`);
  await capture('link-cooldown', `world.rushTimer=0;world.rushCooldown=4;world.time=2.3;`);
  for (const quality of ['low', 'balanced', 'high']) {
    for (const age of [.02, .1, .2]) {
      await capture(`hostile-muzzle-${quality}-${age}`, `cleanEffects();
        document.querySelector('#qualitySetting').value='${quality}';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));
        world.enemies=[makeEnemy('scout',170,110),makeEnemy('scout',310,110)];
        world.enemies.forEach((e,i)=>Object.assign(e,{weaponState:'fire',weaponAge:${age},weaponAim:Math.PI/2,attackPattern:'aimed',remoteEmitters:i?[{x:285,y:125},{x:335,y:125}]:[]}));`);
      assert.equal(await win.webContents.executeJavaScript(`document.querySelector('#scene').dataset.effectDropped`),'0');
    }
  }
  await win.webContents.executeJavaScript(`document.querySelector('#qualitySetting').value='balanced';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));true;`);
  await capture('warning-early', `cleanEffects();world.players.forEach(p=>p.shield=0);
    const a=makeEnemy('cometRammer',160,80), b=makeEnemy('lancer',310,75);
    Object.assign(a,{weaponState:'windup',attackPattern:'ramCharge',weaponCharge:.12,attackTargetX:190,attackTargetY:220,attackEndX:200,attackEndY:250,weaponDuration:1.28});
    Object.assign(b,{weaponState:'windup',attackPattern:'laserLance',weaponCharge:.12,attackTargetX:270,attackTargetY:240,weaponDuration:1.28});
    world.enemies=[a,b];`);
  await capture('warning-late', `world.enemies.forEach(e=>e.weaponCharge=.97);world.time=3;`);
  const flashes = await win.webContents.executeJavaScript(`(() => {
    const sample=[];for(let i=0;i<=128;i++)sample.push(renderer3D.warningFlash({weaponDuration:1.28},i/128));
    const rises=sample.flatMap((value,i)=>i>0&&value>sample[i-1]?[i/100]:[]);return rises;
  })()`);
  assert.ok(flashes.length>=3 && flashes[flashes.length-1]-flashes[flashes.length-2]<flashes[1]-flashes[0], 'warning pulses must accelerate');
  await capture('laser-attributes', `cleanEffects();world.players.forEach((p,i)=>{p.shield=0;p.x=i?410:70;p.y=235;});
    window.attributeEnemies=[150,240,330].map((x,i)=>{const e=makeEnemy('lancer',x,75);Object.assign(e,{elite:i===1,weaponState:'fire',attackTargetX:x,attackTargetY:250});return e;});
    world.enemies=attributeEnemies;attributeEnemies.forEach((e,i)=>fireLaser(e,i===2,i===2?'laserSweep':'laserLance'));
    world.enemyBeams.forEach(b=>{const t=(250-b.y1)/(b.y2-b.y1);b.x2=b.x1+(b.x2-b.x1)*t;b.y2=250;b.age=.065;});
    window.attributeBeams=world.enemyBeams.map(b=>({...b}));`);
  const laserAttributes=await win.webContents.executeJavaScript(`attributeBeams.map(b=>({damage:b.damage,width:b.width,color:b.color,elite:b.sourceElite,pattern:b.pattern}))`);
  assert.equal(laserAttributes[0].damage,2);assert.equal(laserAttributes[1].damage,3);
  assert.ok(laserAttributes[1].width>laserAttributes[0].width);assert.equal(laserAttributes[1].elite,true);
  assert.equal(laserAttributes[2].pattern,'laserSweep');assert.notEqual(laserAttributes[2].color,laserAttributes[0].color);
  if(process.argv.includes('--attributes-motion')) {
    for(let frame=0;frame<60;frame++) {
      const age=frame/30%1;
      await win.webContents.executeJavaScript(`world.time=2+${frame/30};world.enemyBeams=attributeBeams.filter(b=>${age}<b.duration).map(b=>({...b,age:${age}}));draw();true;`);
      await delay(34);
      fs.writeFileSync(path.join(output,`attributes-${String(frame).padStart(3,'0')}.png`),(await win.webContents.capturePage({x:310,y:300,width:800,height:430})).toPNG());
    }
  }
  await capture('ram-setup', `cleanEffects();world.players.forEach(p=>p.shield=0);world.enemies=[makeEnemy('cometRammer',160,80)];world.enemies[0].attackPattern='ramCharge';`);
  await capture('laser-ram', `const ram=world.enemies[0];world.enemies=[ram];ram.weaponState='fire';
    for(let i=0;i<24;i++){world.time+=1/60;ram.x=160+i*1.5;ram.y=90+i*3;draw();}
    world.enemyBeams=[{x1:310,y1:75,x2:260,y2:265,width:5,age:.2,duration:.65,color:'#ff5a68'}];`);
  await capture('effects-low', `document.querySelector('#qualitySetting').value='low';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));`);
  const particles = await win.webContents.executeJavaScript(`({...document.querySelector('#scene').dataset})`);
  assert.equal(particles.effectDropped,'0');assert.equal(particles.effectBeams,'1');assert.ok(Number(particles.effectParticles)>50);
  if(process.argv.includes('--motion')) {
    await win.webContents.executeJavaScript(`cleanEffects();document.querySelector('#qualitySetting').value='balanced';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));
      world.players[0].shield=2;world.players[1].shield=0;world.players[0].x=205;world.players[1].x=310;
      world.players[0].shieldImpactX=-1;world.players[0].shieldImpactY=0;
      world.enemies=[makeEnemy('lancer',310,90)];world.enemyBeams=[{x1:310,y1:90,x2:310,y2:240,width:5,age:0,duration:.65}];true;`);
    for(let frame=0;frame<108;frame++) {
      const time=frame/30;
      await win.webContents.executeJavaScript(`world.time=2+${time};
        world.players[0].shield=${time}<1.2?1:${time}<2.4?0:2;
        world.players[0].shieldHitTimer=${time}<1.2?Math.max(0,.48-(${time}-.2)):0;
        if(${time}<.2)world.players[0].shieldHitTimer=0;
        world.players[0].shieldBreakTimer=${time}>=1.2&&${time}<2.4?Math.max(0,.8-(${time}-1.2)):0;
        world.players[0].shieldReformTimer=${time}>=2.4?Math.max(0,.72-(${time}-2.4)):0;
        world.enemyBeams[0].age=${time}%.65;draw();true;`);
      await delay(34);
      fs.writeFileSync(path.join(output,`motion-${String(frame).padStart(3,'0')}.png`),(await win.webContents.capturePage({x:410,y:300,width:620,height:400})).toPNG());
    }
  }
  if(process.argv.includes('--fixtures-only')){assert.equal(errors.length,0,errors.join(' | '));console.log(JSON.stringify({output,impacts,laserAttributes,shieldEvents,audioPeaks,directions,warningRises:flashes,particles:particles.effectParticles,dropped:particles.effectDropped,opening:'skipped: fixtures-only',errors}));win.destroy();server.close();app.quit();return;}
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true;`);
  const started=Date.now();let opening;
  while(Date.now()-started<45000){await delay(300);opening=await win.webContents.executeJavaScript(`({...document.querySelector('#game').dataset})`);if(Number(opening.stageTime)>=20)break;}
  assert.equal(opening.mode,'playing');assert.equal(opening.playerDowned,'0,0');assert.ok(Number(opening.stageTime)>=20);assert.ok(Number(opening.fps)>=40);
  assert.equal(errors.length,0,errors.join(' | '));
  fs.writeFileSync(path.join(output,'opening.png'),(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({output,impacts,laserAttributes,shieldEvents,audioPeaks,directions,warningRises:flashes,particles:particles.effectParticles,dropped:particles.effectDropped,opening:{seconds:opening.stageTime,hp:opening.playerHp,fps:opening.fps},errors}));
  win.destroy();server.close();app.quit();
}
run().catch(error=>{console.error(error);server.close();app.exit(1);});
