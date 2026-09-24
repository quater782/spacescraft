const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'spacescraft-enemy-ai');
// Loopback-only test bridge; no production globals, accelerated gameplay or player privileges.
const bridge = 'world, resetWorld, makeEnemy, updateEnemy, handleCollisions, spawnBoss, enterBossPhase, updateBoss, draw, fireLaser, telegraphedBeamSegments, cancelEnemyAttack, beginEnemyWindup, profile';
const server = http.createServer((req,res) => {
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  const target = path.resolve(root, pathname==='/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');
  res.end(pathname==='/src/game.js' ? fs.readFileSync(target,'utf8')+`\nObject.assign(window,{${bridge}});` : fs.readFileSync(target));
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData',path.join(os.tmpdir(),`spacescraft-ai-${process.pid}`));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(){
  await app.whenReady(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); fs.mkdirSync(output,{recursive:true});
  const win=new BrowserWindow({width:1280,height:900,show:false,webPreferences:{backgroundThrottling:false,contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error'){errors.push(event.message);console.error(event.message)}});
  const url=`http://127.0.0.1:${server.address().port}/?seed=260901`;
  await win.loadURL(url);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click(); if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true`);
  await delay(150);
  const report=await win.webContents.executeJavaScript(`(() => { try {
    const check=(ok,label)=>{if(!ok)throw new Error(label)};
    const clean=()=>{resetWorld();world.mode='inspection';world.stageIndex=1;world.stageTime=140;world.time=140;world.introTimer=0;world.cinematic=null;world.stageEvent=null;world.variantNotice=null;world.routeChoice=null;world.enemies=[];world.bullets=[];world.enemyBullets=[];world.enemyBeams=[];world.players.forEach((p,i)=>{p.x=240+i*44;p.y=230;p.downed=false});};
    const all=[];window.aiShots=[];window.aiResults=all;
    for(const [index,hull] of SpaceExpedition.HULL_MODULES.entries()){
      clean();const build=SpaceExpedition.build(['standard','weave','rush','drift'][index%4],hull.preferredWeapon||['pulse','twin','sniper','orbit','bomb','laser','seeker'][index%7],'light',hull.preferredAi||['sentry','hunter','flanker','oracle','pack','ambusher'][index%6],'clean',1,hull.id);
      const e=makeEnemy(hull.id,150,-25,{build});e.chipId=index%2?'adaptive':'';world.enemies=[e];
      const states=new Set(),weapons=new Set(),headings=[];let maxStep=0,maxTurn=0,lastYaw=null,locked=0,ramDone=0;
      for(let frame=0;frame<1800;frame++){
        const x=e.x,y=e.y,h=e.heading;const beforeWeapon=e.weaponState;
        world.time+=1/60;world.stageTime+=1/60;updateEnemy(e,1/60);
        states.add(e.tacticState);weapons.add(e.weaponState);headings.push(e.heading);
        if(beforeWeapon==='windup'&&e.weaponState==='fire'&&e.attackCommit?.rays){
          const beams=world.enemyBeams.filter(b=>b.sourceId===e.id).slice(-e.attackCommit.rays.length);
          check(beams.length===e.attackCommit.rays.length,'committed laser did not fire');
          for(let i=0;i<beams.length;i++)for(const key of ['x1','y1','x2','y2'])check(Math.abs(beams[i][key]-e.attackCommit.rays[i][key])<1e-7,'fired beam diverges from warning');
        }
        maxStep=Math.max(maxStep,Math.hypot(e.x-x,e.y-y));
        if(Number.isFinite(h))maxTurn=Math.max(maxTurn,Math.abs(SpaceEnemyAI.angleDelta(e.heading,h))*60);
        if(e.weaponState==='windup'&&e.attackCommit?.rays){
          const expected=JSON.stringify(e.attackCommit.rays);check(JSON.stringify(telegraphedBeamSegments(e))===expected,'warning geometry changed');locked++;
        }
        if(e.stateReason==='charge-lane-complete')ramDone++;
        if(frame===500||frame===570||frame===640){draw();window.aiShots.push({type:hull.id,x:e.x,y:e.y,heading:e.heading});}
        if(frame%300===0){world.enemyBullets=[];world.enemyBeams=[];}
      }
      all.push({hull:hull.id,chip:e.chipId,chipDecisions:e.chipDecisions,weapon:build.weaponId,states:[...states],weapons:[...weapons],cycles:e.attackCycle,firstFire:e.firstFireAge,movingAttacks:e.movingAttacks||0,boundaries:e.boundaryCorrections,maxStep,maxTurn,turnSpan:Math.max(...headings)-Math.min(...headings),position:[e.x,e.y],locked,ramDone});
    }
    // Continuous incoming fire used to renew evasion before the craft could ever shoot.
    const pressure=[];
    for(const type of ['scout','dart','tank','lancer']) {
      clean();
      const build=SpaceExpedition.build('standard','pulse','light','ambusher','clean',1,type);
      const e=makeEnemy(type,240,70,{build});e.chipId='adaptive';world.enemies=[e];
      let emitted=0,maxEvade=0;
      for(let frame=0;frame<2400;frame++) {
        world.bullets=[{x:e.x,y:e.y+80,vx:0,vy:-120,dead:false}];
        world.enemyBullets=[];world.enemyBeams=[];
        world.time+=1/60;world.stageTime+=1/60;updateEnemy(e,1/60);
        emitted+=world.enemyBullets.length+world.enemyBeams.length;
        if(e.tacticState==='evade')maxEvade=Math.max(maxEvade,e.stateAge);
      }
      check(emitted>0,type+' chip never emitted a projectile under sustained pressure');
      check(e.chipEvades>0&&maxEvade<.7,type+' evasion did not recover');
      pressure.push({type,emitted,evades:e.chipEvades,cycles:e.attackCycle,maxEvade});
    }
    console.log(JSON.stringify({chipPressure:pressure}));
    clean();world.players[1].downed=true;
    const predictive=makeEnemy('scout',240,85,{build:SpaceExpedition.build('standard','pulse','light','sentry','clean',1,'scout')});
    predictive.chipId='adaptive';world.enemies=[predictive];let rawLockX=null,shotError=null;
    for(let f=0;f<1200&&predictive.weaponState!=='fire';f++) {
      const p=world.players[0];p.vx=6;p.x+=6/60;
      world.time+=1/60;updateEnemy(predictive,1/60);
      if(predictive.weaponState==='windup'&&rawLockX===null)rawLockX=p.x;
    }
    const shot=world.enemyBullets[0],pilot=world.players[0];
    check(shot&&shot.vy>0,'predictive pulse failed to fire');
    const travel=(pilot.y-shot.y)/shot.vy;
    shotError=Math.abs(shot.x+shot.vx*travel-(pilot.x+pilot.vx*travel));
    check(shotError<Math.abs(rawLockX-(pilot.x+pilot.vx*travel))&&shotError<8,'pulse interception did not improve aim');
    const mobile=[];
    for(const chipped of [false,true])for(const weapon of ['pulse','laser'])for(const tactic of ['maneuver','evade','disengage','reposition']) {
      clean();world.players[1].downed=true;
      const e=makeEnemy('scout',140,70,{build:SpaceExpedition.build('standard',weapon,'light','sentry','clean',1,'scout')});
      e.chipId=chipped?'adaptive':'';SpaceEnemyAI.init(e);world.enemies=[e];
      let movingFires=0,first=null,travel=0,movingWindupFrames=0;
      for(let f=0;f<720;f++) {
        e.tacticState=tactic;e.pathX=240+100*Math.sin(f/120);e.pathY=70;
        world.players[0].x=260+45*Math.sin(f/100);world.players[0].vx=27*Math.cos(f/100);
        world.time+=1/60;world.stageTime+=1/60;const old=e.weaponState,x=e.x,y=e.y;
        updateEnemy(e,1/60);travel+=Math.hypot(e.x-x,e.y-y);
        if(e.weaponState==='windup'&&Math.hypot(e.vx,e.vy)>2)movingWindupFrames++;
        if(old==='windup'&&e.weaponState==='fire'){first??=e.age;if(Math.hypot(e.vx,e.vy)>2)movingFires++;}
        if(f%180===0){world.enemyBullets=[];world.enemyBeams=[];}
      }
      // A longer windup can finish after arrival; verify overlapping motion and repeated shots independently.
      check(first<5&&e.attackCycle>=2&&movingWindupFrames>=30,'mobile weapon starved: '+[chipped,weapon,tactic,first,e.attackCycle,movingWindupFrames]);
      mobile.push({chipped,weapon,tactic,first,movingFires,movingWindupFrames,cycles:e.attackCycle,travel});
    }
    const relativeRays=e=>JSON.stringify(e.attackCommit.rays.map(r=>[r.x1-e.x,r.y1-e.y,r.x2-r.x1,r.y2-r.y1].map(v=>Math.round(v*1e7)/1e7)));
    const laserTracking=[];
    for(const chipped of [false,true]) {
      clean();
      const e=makeEnemy('lancer',240,100,{build:SpaceExpedition.build('standard','laser','light','sentry','clean',1,'lancer')});
      e.chipId=chipped?'adaptive':'';world.enemies=[e];
      for(let f=0;f<1800&&e.weaponState!=='windup';f++){world.time+=1/60;updateEnemy(e,1/60);}
      check(e.weaponState==='windup','laser never entered windup');
      const duration=e.weaponTimer;check(Math.abs(duration-(chipped?3:1.12))<1e-8,'incorrect laser windup duration');
      const initial=relativeRays(e);let frozen=null,changed=false,lockTime=0,elapsed=0;
      for(let f=0;f<240&&e.weaponState!=='fire';f++) {
        elapsed+=1/60;const target=world.players.find(p=>p.index===e.attackTargetIndex);target.x+=.5;target.vx=30;
        world.time+=1/60;updateEnemy(e,1/60);
        const rays=relativeRays(e);
        if(e.weaponTimer>.75&&e.weaponState==='windup')changed ||= rays!==initial;
        if(e.weaponTimer<=.75&&e.weaponState==='windup') {
          if(!frozen){frozen=rays;lockTime=e.weaponTimer;}
          check(rays===frozen,'laser direction or muzzle offset changed during final lock');
        }
      }
      check(changed===chipped,'laser tracking did not match chip capability');
      check(e.weaponState==='fire'&&relativeRays(e)===frozen,'laser did not honor final lock');
      for(const [i,b] of world.enemyBeams.entries())for(const k of ['x1','y1','x2','y2'])check(b[k]===e.attackCommit.rays[i][k],'live laser diverged from lock');
      check(lockTime>.73&&world.enemyBeams.length>0,'laser lock window or emission missing');
      check(Math.abs(elapsed-duration)<=1/60+1e-8,'laser fired outside its windup duration');
      laserTracking.push({chipped,duration,elapsed,changed,lockTime,beams:world.enemyBeams.length});
    }
    clean();world.stageIndex=0;world.stageTime=285;world.growthGrace=0;
    const cohort=Array.from({length:8},(_,i)=>{const e=makeEnemy('scout',45+i*55,60,{build:SpaceExpedition.build('standard',i%3===0?'laser':'pulse','light','sentry','clean',0,'scout')});e.chipId=i%2?'adaptive':'';return e;});
    world.enemies=cohort;
    for(let f=0;f<1200;f++){world.time+=1/60;world.stageTime+=1/60;world.enemyBullets=[];world.enemyBeams=[];for(const e of cohort)updateEnemy(e,1/60);check(cohort.filter(SpaceEnemyAI.committed).length<=2,'chapter one concurrency exceeded');}
    check(cohort.every(e=>e.attackCycle>=2&&e.firstFireAge<10),'an eligible member starved in the shared queue: '+JSON.stringify(cohort.map(e=>({id:e.id,first:e.firstFireAge,cycles:e.attackCycle}))));
    const queue=cohort.map(e=>({id:e.id,first:e.firstFireAge,cycles:e.attackCycle}));
    const laserPlans=[];
    for(const [chipped,allyState,expected] of [[false,null,'strike'],[false,'align','strike'],[false,'windup','corridor'],[true,'align','corridor']]) {
      clean();const target=world.players[0];
      const e=makeEnemy('lancer',240,80,{build:SpaceExpedition.build('standard','laser','light','sentry','clean',1,'lancer')});
      e.chipId=chipped?'adaptive':'';SpaceEnemyAI.init(e);e.attackPattern='laserSweep';e.weaponAim=Math.PI/2;e.targetId=target.index;e.tacticState='evade';e.pathX=400;e.pathY=80;e.vx=30;
      const ally=makeEnemy('scout',320,90);ally.weaponState=allyState;ally.targetId=target.index;ally.attackTargetIndex=target.index;
      world.enemies=allyState?[e,ally]:[e];beginEnemyWindup(e,target);
      check(Math.abs(e.weaponTimer-(chipped?3:1.28))<1e-8,'incorrect multi-laser windup duration');
      check(e.laserPlan.mode===expected,'wrong multi-laser policy');
      const crossMiss=r=>Math.abs((target.x-r.x1)*(r.y2-r.y1)-(target.y-r.y1)*(r.x2-r.x1))/Math.hypot(r.x2-r.x1,r.y2-r.y1);
      const misses=e.attackCommit.rays.map(crossMiss);
      check(expected==='strike'?Math.min(...misses)<1e-7:Math.min(...misses)>12,'laser policy geometry does not match intent');
      let locked=null,lockX=0;
      for(let f=0;f<240&&e.weaponState!=='fire';f++) {
        e.tacticState='reposition';e.stateAge=0;e.pathX=e.x<360?420:60;e.pathY=80;
        world.time+=1/60;updateEnemy(e,1/60);
        if(e.weaponState==='windup'&&e.weaponTimer<=.75){if(!locked){locked=relativeRays(e);lockX=e.x;}check(relativeRays(e)===locked,'locked beam rotated or left its moving muzzle');}
      }
      check(e.weaponState==='fire'&&world.enemyBeams.length===2,'multi laser did not actually fire both beams');
      check(Math.abs(e.x-lockX)>2,'laser ship stopped navigating during lock');
      for(const [i,b] of world.enemyBeams.entries())for(const k of ['x1','y1','x2','y2'])check(b[k]===e.attackCommit.rays[i][k],'multi laser departed its warning');
      laserPlans.push({chipped,allyState,mode:e.laserPlan.mode,misses,movementAfterLock:Math.abs(e.x-lockX)});
    }
    clean(); const e=makeEnemy('scout',230,70);SpaceEnemyAI.init(e);e.tacticState='engage';e.targetId=0;e.targetHold=1.2;
    const first=SpaceEnemyAI.chooseTarget(e,world.players,1/60).index;
    world.players[1].x=e.x;const held=SpaceEnemyAI.chooseTarget(e,world.players,.2).index;
    world.players[0].downed=true;const switched=SpaceEnemyAI.chooseTarget(e,world.players,.01).index;
    check(first===held&&switched===1,'target hold/death handling');
    const bosses=[];
    for(let stage=0;stage<3;stage++){
      clean();world.stageIndex=stage;spawnBoss();const b=world.boss;b.y=52;b.phaseLevel=3;b.phaseShield=0;b.secondaryTimer=1000;
      const attacks=new Set(),states=new Set();let rays=0;
      for(let frame=0;frame<2400;frame++){
        world.time+=1/60;updateEnemy(b,1/60);states.add(b.weaponState);if(b.attackId)attacks.add(b.attackId);
        if(b.weaponState==='windup'&&b.attackCommit?.rays){rays++;check(JSON.stringify(telegraphedBeamSegments(b))===JSON.stringify(b.attackCommit.rays),'boss warning mismatch')}
        if(frame%300===0){world.enemyBullets=[];world.enemyBeams=[];}
      }
      b.phaseLevel=1;b.hp=b.maxHp*.65;
      const wasCommitted=['windup','fire'].includes(b.weaponState),oldCommit=b.attackCommit;
      enterBossPhase(b,2);
      if(wasCommitted)check(b.phaseLevel===1&&b.pendingPhase===2&&b.attackCommit===oldCommit,'phase must preserve advertised attack');
      for(let frame=0;frame<360&&b.phaseLevel===1;frame++){world.time+=1/60;updateEnemy(b,1/60);}
      check(b.phaseLevel===2&&b.weaponState==='cooldown'&&b.opening>0&&b.attackCommit===null,'phase must open core after attack');
      b.phaseShield=0;
      for(let frame=0;frame<1200&&b.weaponState!=='windup';frame++){world.time+=1/60;updateEnemy(b,1/60);}
      check(b.weaponState==='windup','boss never reacquired after phase change');
      world.players.find(p=>p.index===b.attackTargetIndex).downed=true;
      updateEnemy(b,1/60);check(b.weaponState==='cooldown'&&b.attackCommit===null&&telegraphedBeamSegments(b).length===0,'lost boss target must cancel committed warning');
      bosses.push({stage,attacks:[...attacks],states:[...states],rays});
    }
    clean(); const a=makeEnemy('scout',200,80),b=makeEnemy('scout',201,80);world.enemies=[a,b];
    SpaceEnemyAI.init(a);SpaceEnemyAI.init(b);a.attackPattern='ramCharge';a.weaponState='cooldown';a.vx=b.vx=0;
    const before=[a.hp,b.hp];handleCollisions();check(a.hp===before[0]&&b.hp===before[1],'stale ram must not damage');
    check(Math.abs(a.x-200)<=.650001&&Math.abs(b.x-201)<=.650001,'contact must not teleport');
    clean();world.stageIndex=0;world.stageTime=20;
    for(let i=0;i<40;i++){const e=makeEnemy('scout');world.enemies.push(e);check(!e.chipId,'chip entered protected opening');}
    world.stageTime=400;world.enemies=[];world.growthGrace=0;
    for(let i=0;i<100;i++){world.enemies.push(makeEnemy('scout'));check(world.enemies.filter(SpaceEnemyAI.hasChip).length<=1,'natural chip cap exceeded');}
    check(world.enemies.some(SpaceEnemyAI.hasChip),'natural spawn never assigned a chip');
    return {all,bosses,pressure,mobile,queue,laserPlans,shotError,laserTracking,targetHold:true,staleRam:true,chipSpawnProtection:true};
    } catch(error) {return {failure:error.stack,all:window.aiResults};}
  })()`);
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  assert.ok(!report.failure,report.failure);
  for(const row of report.all){assert.ok(row.cycles>0,`${row.hull} never attacked`);assert.ok(row.maxStep<5,`${row.hull} teleported`);assert.ok(row.turnSpan>.1,`${row.hull} never rotated`);assert.ok(row.boundaries===0,`${row.hull} hit hard bounds`)}
  for(const row of report.bosses){
    assert.equal(row.attacks.length,4,`boss ${row.stage} arsenal stalled`);
    for(const state of ['cooldown','align','windup','fire'])assert.ok(row.states.includes(state),`boss ${row.stage} missed ${state}`);
  }
  // Render a real simulated diagonal approach, warning and departure in a representative gallery.
  for(const quality of ['balanced','low']){
    await win.webContents.executeJavaScript(`resetWorld();world.mode='inspection';world.stageTime=140;world.time=140;world.stageIndex=1;world.introTimer=0;world.cinematic=null;world.stageEvent=null;world.variantNotice=null;world.routeChoice=null;world.enemies=[];world.players.forEach((p,i)=>{p.x=210+i*70;p.y=230});
      for(const [i,type] of ['scout','tank','cometRammer','prismRay'].entries()) { const hull=SpaceExpedition.HULL_MODULES.find(h=>h.id===type);const e=makeEnemy(type,65+i*105,55,{build:SpaceExpedition.build('standard',hull.preferredWeapon||'pulse','light','sentry','clean',1,type)});world.enemies.push(e); }
      profile.settings.quality='${quality}';true`);
    for(let frame=0;frame<150;frame++)await win.webContents.executeJavaScript(`world.time+=1/60;for(const e of world.enemies)updateEnemy(e,1/60);draw();true`);
    await delay(80);fs.writeFileSync(path.join(output,`flight-${quality}.png`),(await win.webContents.capturePage()).toPNG());
  }
  // Actual reverse thrust plus visible chip board and bilingual scan, with enhanced hull statistics.
  for(const [language,quality] of [['zh','balanced'],['en','low']]) {
    const comparison=await win.webContents.executeJavaScript(`(() => {
      resetWorld();world.mode='inspection';world.stageIndex=0;world.stageTime=285;world.growthGrace=0;world.introTimer=0;world.cinematic=null;world.stageEvent=null;world.routeChoice=null;world.enemies=[];
      const build=SpaceExpedition.build('standard','pulse','light','sentry','clean',0,'scout');
      const spawn=(chipped,x)=>{
        let id=world.enemySerial+1;
        while(Boolean(SpaceEnemyAI.chipFor({runSeed:world.runSeed,id,stageIndex:0,progress:.5}))!==chipped)id++;
        world.enemySerial=id-1;return makeEnemy('scout',x,125,{build});
      };
      const pair=[spawn(false,160),spawn(true,320)];world.enemies=pair;
      for(const e of pair){SpaceEnemyAI.init(e);e.tacticState='maneuver';e.galleryScale=1.5;}
      for(let frame=0;frame<20;frame++){world.time+=1/60;for(const e of pair)SpaceEnemyAI.flight(e,{x:e.id===pair[0].id?135:295,y:60,face:Math.PI/2,speed:45},{width:480,height:270,enemies:pair},1/60);}
      SpaceI18n.setLanguage('${language}');profile.settings.quality='${quality}';
      world.variantNotice={enemy:pair[1],timer:2,total:3.2};draw();
      return pair.map(e=>({hp:e.maxHp,speed:e.moveSpeed,cooldown:e.weaponCooldown,x:e.x,y:e.y,heading:e.heading,reverse:e.reverseThrust,chip:e.chipId}));
    })()`);
    assert.equal(comparison[0].hp*1.25,comparison[1].hp);assert.equal(comparison[0].speed,comparison[1].speed);assert.equal(comparison[0].cooldown,comparison[1].cooldown);
    for(const e of comparison){assert.ok(e.y<125&&e.reverse>.1);assert.ok(Math.abs(e.heading-Math.PI/2)<1e-8);}
    await delay(80);fs.writeFileSync(path.join(output,`chip-reverse-${language}.png`),(await win.webContents.capturePage()).toPNG());
    console.log(JSON.stringify({chipVisual:language,quality,comparison}));
  }
  await win.webContents.executeJavaScript(`world.mode='inspection';world.enemies=[];world.variantNotice=null;world.toast=null;
    for(const [i,state] of ['maneuver','evade','disengage','engage'].entries()) {
      const e=makeEnemy('scout',75+i*110,125);SpaceEnemyAI.init(e);e.chipId='adaptive';e.galleryScale=1.6;e.tacticState=state;
      e.stateReason=state==='disengage'?'defensive-withdrawal':'';e.weaponState=state==='engage'?'align':'cooldown';world.enemies.push(e);
    } draw();true`);
  fs.writeFileSync(path.join(output,'chip-intents.png'),(await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`resetWorld();world.mode='inspection';world.stageIndex=1;world.stageTime=140;world.time=140;world.introTimer=0;world.cinematic=null;world.stageEvent=null;world.routeChoice=null;world.variantNotice=null;world.enemies=[];world.players[1].downed=true;world.players[0].x=240;world.players[0].y=230;
    window.trackingCraft=makeEnemy('lancer',240,100,{build:SpaceExpedition.build('standard','laser','light','sentry','clean',1,'lancer')});trackingCraft.chipId='adaptive';world.enemies=[trackingCraft];
    for(let f=0;f<1800&&trackingCraft.weaponState!=='windup';f++){world.time+=1/60;updateEnemy(trackingCraft,1/60);}true`);
  for(const [name,frames] of [['tracking',12],['locked',126],['locked-later',24]]) {
    await win.webContents.executeJavaScript(`for(let f=0;f<${frames};f++){world.players[0].x+=.5;world.players[0].vx=30;world.time+=1/60;updateEnemy(trackingCraft,1/60);}draw();true`);
    await delay(80);
    fs.writeFileSync(path.join(output,'laser-'+name+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  for(const mode of ['strike','corridor']) {
    await win.webContents.executeJavaScript(`(() => {resetWorld();world.mode='inspection';world.stageIndex=1;world.stageTime=140;world.time=140;world.introTimer=0;world.cinematic=null;world.stageEvent=null;world.routeChoice=null;world.variantNotice=null;world.enemies=[];world.players[0].x=240;world.players[0].y=230;world.players[1].x=320;world.players[1].y=230;
      const e=makeEnemy('lancer',240,80,{build:SpaceExpedition.build('standard','laser','light','sentry','clean',1,'lancer')});e.chipId='adaptive';SpaceEnemyAI.init(e);e.targetId=0;e.attackPattern='laserSweep';e.weaponAim=Math.PI/2;e.tacticState='evade';e.pathX=400;e.pathY=80;e.vx=30;world.enemies=[e];
      if('${mode}'==='corridor'){const ally=makeEnemy('scout',340,100);SpaceEnemyAI.init(ally);ally.weaponState='align';ally.targetId=0;world.enemies.push(ally);}
      beginEnemyWindup(e,world.players[0]);const frames=Math.ceil((e.weaponTimer-.35)*60);for(let f=0;f<frames;f++){world.time+=1/60;updateEnemy(e,1/60);}profile.settings.quality='low';draw();return true;})()`);
    await delay(80);fs.writeFileSync(path.join(output,'multi-laser-'+mode+'.png'),(await win.webContents.capturePage()).toPNG());
  }
  if(process.argv.includes('--mechanics-only')) {
    assert.equal(errors.length,0,errors.join('\n'));win.destroy();server.close();app.quit();return;
  }
  // Normal opening, normal clock, solo and local coop UI/input paths, no fixture invulnerability.
  for(const mode of ['solo','coop']){
    await win.loadURL(url);await win.webContents.executeJavaScript(`document.querySelector('.mode-button[data-mode="${mode}"]').click();document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true`);
    win.webContents.sendInputEvent({type:'keyDown',keyCode:'D'});
    if(mode==='coop')win.webContents.sendInputEvent({type:'keyDown',keyCode:'Left'});
    await delay(300);win.webContents.sendInputEvent({type:'keyUp',keyCode:'D'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Left'});
    let state;const start=Date.now();
    do {await delay(500);state=await win.webContents.executeJavaScript(`({...document.querySelector('#game').dataset})`);}while(Number(state.stageTime)<20&&Date.now()-start<35000);
    assert.ok(Number(state.stageTime)>=20,'opening did not advance');assert.equal(state.mode,'playing');assert.equal(state.combatInvalidProjectiles,'0');
    console.log(JSON.stringify({opening:mode,time:state.stageTime,hp:state.playerHp,fps:state.fps,states:state.enemyTacticStates}));
  }
  assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(output,'opening.png'),(await win.webContents.capturePage()).toPNG());
  win.destroy();server.close();app.quit();
}
run().catch(error=>{console.error(error.stack||error);server.close();app.exit(1)});
