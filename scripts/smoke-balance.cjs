const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const arg = (key, fallback) => process.argv.find(v => v.startsWith(`--${key}=`))?.split('=')[1] || fallback;
const seeds = arg('seeds','260901').split(',').map(Number);
const campaign = process.argv.includes('--campaign');
const stages = arg('stages',campaign?'1':'1,3').split(',').map(Number);
const builds = arg('builds','none,balanced').split(',');
const seconds = Number(arg('seconds',campaign?'2700':'900'));
const pilot = arg('pilot','dual-ai');
const frameId = arg('frame','comet');
assert.ok(['comet','bulwark','pulse'].includes(frameId),'unknown player frame');
assert.ok(seeds.every(Number.isFinite)&&stages.every(s=>[1,2,3].includes(s)),'invalid seed/stage');
assert.ok(seconds>=20&&seconds<=(campaign?3600:1800)&&builds.every(b=>['none','balanced','developed','full'].includes(b)),'invalid duration/build');
assert.ok(!campaign||(stages.length===1&&stages[0]===1&&!process.argv.includes('--acceptance')),'campaign must start at chapter one; independent-chapter acceptance is separate');
const output = path.join(os.tmpdir(), 'spacescraft-balance', `${campaign?'campaign-':''}${frameId}-${pilot}-${stages.join('-')}-${builds.join('-')}`);
const bridge = 'world, profile, resetWorld, update, draw, input, aiPilotControls, chooseAiStrategicGoal, aiNavigate, aiHazardForecast, createPlayer, makeEnemy, damagePlayer, applyRunUpgrade, UPGRADE_DEFS, advanceStage, confirmDraftSelection, enemyBullet, beginEnemyWindup, updateEnemy, spawnBoss, fireBossPetals, SHIP_FRAMES, updatePlayers, updateObjects, handleCollisions, updateEncounter, startEncounter, aiForecastBullet';
const source = fs.readFileSync(path.join(root,'src/game.js'),'utf8')
  .replace('function aiHazardForecast(player) {', 'function aiHazardForecast(player) { window.balanceForecastCalls = (window.balanceForecastCalls || 0) + 1;')
  .replace('function endGame(victory) {', 'function endGame(victory) { window.balanceVictory = victory;')
  .replace('function applyPickup(player, pickup) {', `function applyPickup(player, pickup) { if (window.balanceBare && pickup.type === "weapon") { pickup.dead = true; return; }`)
  .replaceAll('requestAnimationFrame(frame);','/* Manual fixed-step runner; renderer still exercised with draw(). */')
  .replace('if (index === 1 && world.gameMode === "solo") return aiPilotControls(world.players[1]);',`if (world.gameMode === "solo") return index === 0 && '${pilot}' === 'direction' ? balanceDirectionControls() : aiPilotControls(world.players[index]);`);
const directionController = `
function balanceDirectionControls() {
  const pilot=world.players[0],wing=world.players[1];if(pilot.downed)return {x:0,y:0};
  if(pilot.proxyAt>world.time)return pilot.proxyControls;
  pilot.proxyAt=world.time+.25;
  let x=wing.x-34+Math.sin(world.time*.39)*22,y=wing.y+4+Math.sin(world.time*.27)*9;
  if(wing.downed){x=wing.x;y=wing.y;}
  else if(world.enemyBullets.length>=12||pilot.hp<=Math.max(2,pilot.maxHp*.34)){x=wing.x-26+Math.sin(world.time*1.13)*50;y=wing.y+4+Math.cos(world.time*.83)*18;}
  x=Math.max(24,Math.min(456,x));y=Math.max(105,Math.min(246,y));
  const dx=Math.abs(x-pilot.x)>7?Math.sign(x-pilot.x):0,dy=Math.abs(y-pilot.y)>6?Math.sign(y-pilot.y):0;
  const m=Math.max(1,Math.hypot(dx,dy));return pilot.proxyControls={x:dx/m,y:dy/m};
}`;
const server = http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://127.0.0.1').pathname;
  const target = path.resolve(root,pathname==='/'?'index.html':decodeURIComponent(pathname.slice(1)));
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile())return res.writeHead(404).end();
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(target)]||'application/octet-stream');
  res.end(pathname==='/src/game.js'?source+directionController+`\nObject.assign(window,{${bridge}});`:fs.readFileSync(target));
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData',path.join(os.tmpdir(),`spacescraft-balance-${process.pid}`));
async function run(){
  await app.whenReady();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));fs.mkdirSync(output,{recursive:true});
  const win=new BrowserWindow({width:1100,height:800,show:false,webPreferences:{backgroundThrottling:false,contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=260924`);
  const mechanics = await win.webContents.executeJavaScript(`(() => {
    const check=(ok,message)=>{if(!ok)throw new Error(message);};
    const clean=()=>{profile.talents=[];profile.selectedFrame='comet';profile.selectedModule='flux';resetWorld();world.mode='inspection';world.gameMode='solo';world.introTimer=0;world.routeChoice=null;world.enemies=[];world.enemyBullets=[];world.enemyBeams=[];world.pickups=[];world.encounterObjects=[];world.activeEncounter=null;world.activeAnomaly=null;world.players.forEach((p,i)=>{p.x=220+i*35;p.y=225;p.invulnerability=0;});};
    clean();const p=world.players[1],partner=world.players[0];
    p.x=350;partner.x=180;const e=makeEnemy('scout',400,100);world.enemies=[e];
    const formation=chooseAiStrategicGoal(p,partner);check(formation.intent==='formation','distant ally must outrank opportunistic focus fire');
    p.x=245;partner.x=220;p.hp=2;
    world.pickups=[{x:250,y:230,type:'repair',dead:false}];
    const supply=chooseAiStrategicGoal(p,partner);check(supply.intent==='resupply','critical hull must not overwrite reachable repair with blind retreat');
    world.pickups=[];partner.downed=true;partner.hp=0;
    const rescue=chooseAiStrategicGoal(p,partner);check(rescue.intent==='rescue','downed ally must override all other objectives');
    partner.downed=false;
    // The old broad threat circles abandoned this clear firing lane.
    world.enemies=[];world.enemyBullets=[{x:p.x+55,y:190,vx:0,vy:55,r:3,behavior:'linear',dead:false}];
    const still=aiNavigate(p,{x:p.x,y:p.y,intent:'focus-fire'},partner);
    check(Math.hypot(still.x,still.y)<.1,'distant non-intersecting bullet must not break a useful firing lane');
    world.enemyBullets=[{x:p.x,y:p.y-32,vx:0,vy:90,r:3,behavior:'linear',dead:false}];
    p.aiControl={x:0,y:0};
    const dodge=aiNavigate(p,{x:p.x,y:p.y,intent:'focus-fire'},partner);
    check(Math.abs(dodge.x)>.3,'an incoming shot must provoke a lateral escape');
    // A body ahead blocks the tempting straight path to a pickup/goal.
    const body=makeEnemy('tank',p.x,p.y-30);world.enemies=[body];world.enemyBullets=[];
    const detour=aiNavigate(p,{x:p.x,y:p.y-80,intent:'resupply'},partner);
    check(Math.abs(detour.x)>.2||detour.y>-.5,'pickup route must not fly straight through a hull');
    clean();const navigator=world.players[1];
    world.pickups=Array.from({length:20},(_,i)=>({x:200+i,y:220,type:'repair',dead:false}));
    window.balanceForecastCalls=0;aiPilotControls(navigator);
    check(window.balanceForecastCalls===1,'one AI decision must share one forecast across pickups and navigation');
    const emitter=makeEnemy('lancer',200,80);emitter.weaponState='fire';emitter.attackCommit={motion:{vx:40,vy:0}};
    world.enemies=[emitter];world.enemyBeams=[{x1:200,y1:80,x2:200,y2:280,width:5,age:0,duration:1,sourceId:emitter.id}];
    const beamAt=()=>aiHazardForecast(navigator).hazards[2].find(h=>h.reason==='beam').line;
    check(Math.abs(beamAt().x1-216)<1e-7,'live beam forecast must follow committed emitter motion');
    emitter.x=460;world.enemyBeams[0].x1=world.enemyBeams[0].x2=460;
    check(Math.abs(beamAt().x1-(480-Math.max(16,emitter.bodyRadius+7)))<1e-7,'beam forecast must stop at arena edge');
    emitter.dead=true;
    check(beamAt().x1===460,'orphaned beam must not follow a dead emitter');
    // Dynamic priorities must produce real collection, rescue and mission progress.
    const dynamic = {};
    const step = (seconds, missions = false) => {
      for(let i=0;i<seconds*60;i++) {
        world.time+=1/60;updatePlayers(1/60);updateObjects(1/60);handleCollisions();
        if(missions&&world.activeEncounter)updateEncounter(1/60);
      }
    };
    clean();let wing=world.players[1],peer=world.players[0];
    wing.hp=2;wing.x=255;wing.y=150;peer.x=225;peer.y=150;
    const upper={x:255,y:72,vy:0,r:6,age:0,type:'repair',dead:false};world.pickups=[upper];
    const upperGoal=chooseAiStrategicGoal(wing,peer);
    check(upperGoal.y<100,'upper-half pickup must keep its reachable location');
    step(4);check(upper.dead&&wing.hp>2,'AI must actually collect the upper-half repair');
    dynamic.upperRepair={collected:upper.dead,hp:wing.hp};
    clean();wing=world.players[1];peer=world.players[0];
    wing.shield=wing.maxShield;peer.shield=peer.maxShield;
    world.pickups=[{x:wing.x+12,y:wing.y,vy:0,r:6,age:0,type:'shield',dead:false}];
    check(chooseAiStrategicGoal(wing,peer).intent==='resupply','full shield must still value a fresh aegis buff');
    step(1);check(wing.buffs.aegis>0||peer.buffs.aegis>0,'fresh buff must be acquired through real pickup collision');
    dynamic.fullShieldBuff=true;
    clean();wing=world.players[1];peer=world.players[0];
    peer.x=220;peer.y=200;peer.hp=2;
    const attacker=makeEnemy('scout',255,100);attacker.attackTargetIndex=peer.index;attacker.weaponState='windup';attacker.weaponTimer=1;
    world.enemies=[attacker];
    world.activeEncounter={kind:'hold',x:220,y:200,radius:42,goal:10,progress:2,timer:30};
    check(chooseAiStrategicGoal(wing,peer).intent==='protect','attack on wounded teammate must outrank an already covered relaxed objective');
    world.activeEncounter.timer=6;attacker.weaponState='cooldown';peer.hp=peer.maxHp;
    check(chooseAiStrategicGoal(wing,peer).intent==='objective','two-pilot deadline must regain priority');
    dynamic.deadlineAndProtection=true;
    clean();wing=world.players[1];peer=world.players[0];
    wing.hp=2;const finish=makeEnemy('scout',wing.x,100);finish.hp=1;world.enemies=[finish];
    check(chooseAiStrategicGoal(wing,peer).intent==='focus-fire','low HP in a safe lane must not suppress finishing an enemy');
    step(4);check(finish.dead,'selected vulnerable enemy must actually be killed');dynamic.finishKill=true;
    clean();wing=world.players[1];peer=world.players[0];
    peer.downed=true;peer.hp=0;peer.downTimer=12;peer.x=160;wing.x=280;
    step(5);check(!peer.downed&&peer.rescueCount===1,'AI must arrive, stay in rescue range and complete revive');
    dynamic.rescue={hp:peer.hp,rescues:peer.rescueCount};
    clean();wing=world.players[1];peer=world.players[0];
    const crossing={x:wing.x-95,y:wing.y,vx:500,vy:0,r:3,behavior:'linear',age:0,dead:false};world.enemyBullets=[crossing];
    const swept=aiNavigate(wing,{x:wing.x,y:wing.y,intent:'focus-fire'},peer);
    check(Math.abs(swept.y)>.3,'fast crossing between .12/.24 samples must trigger dodge');dynamic.swept=swept;
    clean();wing=world.players[1];peer=world.players[0];
    world.pickups=[{x:wing.x+30,y:wing.y,vy:0,r:6,type:'weapon',dead:false}];
    const reward=world.pickups[0];const selected=chooseAiStrategicGoal(wing,peer);
    world.enemyBullets=[{x:wing.x+12,y:wing.y-32,vx:0,vy:100,r:3,behavior:'linear',dead:false}];
    aiNavigate(wing,selected,peer);check(wing.aiIntent==='evasion','incoming threat must temporarily take over the pickup approach');world.enemyBullets=[];wing.aiNextDecision=0;
    check(chooseAiStrategicGoal(wing,peer).target===reward,'temporary dodge must preserve useful strategic work');
    reward.dead=true;check(chooseAiStrategicGoal(wing,peer).target!==reward,'completed goal must be released immediately');
    dynamic.resumeAndRelease=true;
    clean();wing=world.players[1];peer=world.players[0];
    const seeker={x:220,y:120,vx:65,vy:0,r:3,behavior:'homing',age:.2,homing:2,homingDuration:1.6,targetIndex:wing.index,dead:false};
    const predicted=aiForecastBullet(seeker,.6);world.enemyBullets=[seeker];
    for(let i=0;i<36;i++)updateObjects(1/60);
    check(Math.hypot(predicted.x-seeker.x,predicted.y-seeker.y)<3,'seeker forecast must follow actual limited-turn guidance');dynamic.seekerError=Math.hypot(predicted.x-seeker.x,predicted.y-seeker.y);
    clean();
    const hold=SpaceExpedition.ENCOUNTER_PROTOCOLS.find(e=>e.kind==='hold');
    startEncounter({...hold,lane:1,variant:0});step(28,true);
    check(world.encounterHistory.some(e=>e.success),'AI pair must complete a real hold encounter');dynamic.holdCompleted=true;
    for(const kind of ['escort','collect','siege']) {
      clean();const plan=SpaceExpedition.ENCOUNTER_PROTOCOLS.find(e=>e.kind===kind);
      startEncounter({...plan,lane:1,variant:0});step(plan.duration+2,true);
      check(world.encounterHistory.some(e=>e.success),'AI pair must complete real '+kind+' encounter');
      dynamic[kind+'Completed']=true;
    }
    clean();world.stageIndex=1;world.stageTime=140;const locked=[];
    for(const chip of [false,true])for(const pattern of ['snapBurst','laserLance','laserSweep']){
      world.enemies=[];world.enemyBullets=[];world.enemyBeams=[];
      const target=world.players[0];target.x=240;target.y=235;target.downed=false;
      const craft=makeEnemy('lancer',210,80,{build:SpaceExpedition.build('standard',pattern==='snapBurst'?'pulse':'laser','light','sentry','clean',1,'lancer')});
      craft.chipId=chip?'adaptive':'';SpaceEnemyAI.init(craft);craft.attackPattern=pattern;craft.heading=craft.weaponAim=Math.PI/2;craft.vx=22;craft.vy=3;craft.tacticState='reposition';craft.pathX=420;craft.pathY=80;
      world.enemies=[craft];beginEnemyWindup(craft,target);
      if(!chip||pattern==='snapBurst')check(!!craft.attackCommit.motion,'ordinary attack must lock motion immediately');
      let lock=null,steps=0;
      while(craft.weaponState!=='cooldown'&&steps++<300){
        if(craft.attackCommit?.motion&&!lock)lock={x:craft.x,y:craft.y,heading:craft.heading,vx:craft.vx,vy:craft.vy,originX:craft.attackCommit.origin.x-craft.x,originY:craft.attackCommit.origin.y-craft.y};
        target.x+=.15;world.time+=1/60;updateEnemy(craft,1/60);
        if(lock&&craft.attackCommit?.motion){
          check(Math.abs(craft.heading-lock.heading)<1e-9,'committed hull rotated toward the moving target');
          check(Math.abs(craft.vx-lock.vx)<1e-9&&Math.abs(craft.vy-lock.vy)<1e-9,'committed movement vector changed');
          check(Math.abs(craft.attackCommit.origin.x-craft.x-lock.originX)<1e-7&&Math.abs(craft.attackCommit.origin.y-craft.y-lock.originY)<1e-7,'muzzle was left behind by the ship');
          if(craft.weaponState==='fire')for(const [i,beam] of world.enemyBeams.entries())for(const k of ['x1','y1','x2','y2'])check(Math.abs(beam[k]-craft.attackCommit.rays[i][k])<1e-7,'live beam detached from its muzzle');
        }
      }
      check(lock&&craft.attackCycle>0&&Math.hypot(craft.x-lock.x,craft.y-lock.y)>1,'committed flight or actual attack missing');
      locked.push({chip,pattern,steps});
    }
    clean();spawnBoss();const boss=world.boss;boss.x=280;boss.y=80;boss.attackTargetX=100;boss.attackTargetY=230;
    boss.heading=boss.weaponAim=Math.PI/2;boss.attackCommit={angle:Math.PI/2};world.enemyBullets=[];fireBossPetals(boss);
    const sum=world.enemyBullets.reduce((v,b)=>({x:v.x+b.vx,y:v.y+b.vy}),{x:0,y:0});
    check(Math.abs(Math.atan2(sum.y,sum.x)-Math.PI/2)<1e-7,'boss petals must retain their committed aim while the muzzle moves');
    const frames=SHIP_FRAMES.map(frame=>{profile.selectedFrame=frame.id;const player=createPlayer(0);check(player.speed>0&&player.hitInvulnerability<1,'invalid base chassis');return {id:frame.id,hp:player.maxHp,speed:player.speed,damage:player.damage};});
    return {dynamic,formation:formation.intent,supply:supply.intent,rescue:rescue.intent,clearLane:still,dodge,detour,locked,frames};
  })()`);
  console.log(JSON.stringify({mechanics}));
  fs.writeFileSync(path.join(output,'mechanics.json'),JSON.stringify(mechanics,null,2));
  if(process.argv.includes('--fixtures-only')){assert.equal(errors.length,0,errors.join('\n'));win.destroy();server.close();app.quit();return;}

  const reports=[];
  for(const seed of seeds)for(const stage of stages)for(const build of builds){
    await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=${seed}`);
    await win.webContents.executeJavaScript(`(() => {
      profile.talents=[];profile.research=SpaceResearch.sanitize({});profile.selectedFrame='${frameId}';profile.selectedModule='flux';profile.selectedContract='patrol';profile.selectedMode='solo';
      if(['developed','full'].includes('${build}'))profile.talents=['vectorThrusters','kineticDrift','phaseAnchor','pulseTuning','autoLoader','linkCoils','harmonicWeave'];
      if('${build}'==='full'){profile.talents=SpaceConstellation.TALENT_NODES.map(n=>n.id);profile.research=SpaceResearch.sanitize({ranks:Object.fromEntries(SpaceResearch.BLUEPRINTS.map(n=>[n.id,3]))});}
      window.balanceBare='${build}'==='none';
      resetWorld();world.gameMode='solo';world.mode='playing';world.introTimer=0;
      for(let i=1;i<${stage};i++)advanceStage();
      window.balanceStart=world.time;window.balanceDamage=[0,0];window.balancePeak=0;window.balanceFrames=0;window.balanceCheckpoints=[];window.balanceVictory=false;window.balanceCleared=-1;
      // Later-chapter fixture carries ten earned choices. No invulnerability or artificial damage.
      if('${build}'!=='none'&&${stage}>1)for(const id of ['rail','nanites','overclock','rail','aegisCycle','drone','overclock','prism','phase','drone'].slice(0,${stage}===2?5:10))applyRunUpgrade(UPGRADE_DEFS.find(c=>c.id===id));
      return true;
    })()`);
    let result;
    for(let block=0;block<Math.ceil(seconds/10);block++){
      result=await win.webContents.executeJavaScript(`(() => {
        for(let f=0;f<600;f++){
          if(world.mode==='ended'||(!${campaign}&&(world.clearTimer>0||world.stageIndex!==${stage-1})))break;
          if(world.mode==='draft'){
            if('${build}'==='none'){const advance=world.draftContext==='stage-clear';world.mode='playing';document.querySelector('#upgradePanel').hidden=true;if(advance)advanceStage();}
            else {const priority=['nanites','aegisCycle','rail','drone','overclock','phase','prism','chain','capacitor'];world.draftIndex=world.draftOptions.reduce((best,c,i)=>{const score=priority.includes(c.id)?priority.indexOf(c.id):99;const old=priority.includes(world.draftOptions[best].id)?priority.indexOf(world.draftOptions[best].id):99;return score<old?i:best;},0);confirmDraftSelection();}
          }
          update(1/60);if(balanceBare)world.players.forEach(p=>{p.weapon=1;});balanceFrames++;balancePeak=Math.max(balancePeak,world.enemies.filter(e=>!e.dead).length);
          if(world.clearTimer>0&&balanceCleared!==world.stageIndex){balanceCleared=world.stageIndex;balanceCheckpoints.push({stage:world.stageIndex+1,elapsed:balanceFrames/60,hp:world.players.map(p=>p.hp),damage:world.players.map(p=>p.hullDamageTaken),downs:world.players.map(p=>p.downCount),rescues:world.players.map(p=>p.rescueCount),choices:world.upgradeHistory.slice(),weapon:world.players.map(p=>p.weapon)});}
        }
        return {seed:${seed},stage:${stage},currentStage:world.stageIndex+1,campaign:${campaign},checkpoints:balanceCheckpoints,build:'${build}',frame:'${frameId}',pilot:'${pilot}',mode:world.mode,clear:${campaign}?balanceVictory:world.clearTimer>0,time:world.stageTime,elapsed:balanceFrames/60,hp:world.players.map(p=>p.hp),downs:world.players.map(p=>p.downCount),rescues:world.players.map(p=>p.rescueCount),damage:world.players.map(p=>p.hullDamageTaken),kills:world.kills,boss:world.boss?.hp??null,choices:world.upgradeHistory,weapon:world.players.map(p=>p.weapon),peak:balancePeak,pickups:world.researchPickups,invalid:world.combatInvalidProjectiles};
      })()`);
      if(result.clear||result.mode==='ended')break;
    }
    assert.equal(result.invalid,0);if(build==='none'){assert.equal(result.choices.length,0);assert.ok(result.weapon.every(level=>level===1));}reports.push(result);console.log(JSON.stringify(result));
    if(campaign&&result.clear){assert.equal(result.checkpoints.length,3,'victory must complete every chapter');if(build!=='none')assert.equal(result.choices.length,14,'campaign must use all fourteen naturally offered drafts');}
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(reports,null,2));
    await win.webContents.executeJavaScript('draw();true');
  }
  if(process.argv.includes('--acceptance')){
    const samples=(stage,build)=>reports.filter(r=>r.stage===stage&&r.build===build);
    const bareFirst=samples(1,'none'),bareLast=samples(3,'none'),builtLast=samples(3,'balanced');
    for(const group of [bareFirst,bareLast,builtLast])assert.ok(group.length>=3,'acceptance requires at least three seeds per group');
    assert.ok(bareFirst.filter(r=>r.clear).length>=bareFirst.length*2/3,'unupgraded first chapter must be attainable');
    assert.ok(bareLast.filter(r=>r.clear).length<=bareLast.length/3,'third chapter must require meaningful growth');
    assert.ok(builtLast.filter(r=>r.clear).length>=builtLast.length*2/3,'a coherent legal build must have a viable third chapter');
    assert.ok(builtLast.every(r=>r.damage.reduce((a,b)=>a+b,0)>10),'built crews must still face real damage pressure');
  }
  assert.equal(errors.length,0,errors.join('\n'));win.destroy();server.close();app.quit();
}
run().catch(e=>{console.error(e.stack);server.close();app.exit(1);});
