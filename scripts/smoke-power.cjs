const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Deterministic mechanics fixtures, NOT a natural-play difficulty benchmark.
// The bridge exists only in this isolated loopback server, never shipped source.
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'spacescraft-power');
const bridge = 'world, resetWorld, applyRunUpgrade, UPGRADE_DEFS, advanceStage, relicBonuses, makeEnemy, handleCollisions, updatePlayers, updatePlayerStatus, playerShoot, emitPlayerShot, updateAuxiliaryWeapons, updateRush, startRush, updateObjects, detonateEnemyBlast, enemyBullet, applyPickup, addNovaCharge, draw, renderUpgradeDraft, renderPowerSummary';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const target = path.resolve(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'})[path.extname(target)] || 'application/octet-stream');
  res.end(pathname === '/src/game.js' ? fs.readFileSync(target, 'utf8') + `\nObject.assign(window, {${bridge}});` : fs.readFileSync(target));
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData', path.join(os.tmpdir(), `spacescraft-power-${process.pid}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  await app.whenReady();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  fs.mkdirSync(output, {recursive:true});
  const win = new BrowserWindow({width:1280, height:900, show:false, webPreferences:{backgroundThrottling:false, contextIsolation:true, nodeIntegration:false, sandbox:true}});
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') {errors.push(event.message);console.error(event.message);} });
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();
    if (!document.querySelector('#tutorial').hidden) document.querySelector('#tutorialContinueButton').click(); true;`);
  await delay(150);
  const report = await win.webContents.executeJavaScript(`(() => {
    const clean = () => {
      resetWorld(); world.mode='inspection'; world.introTimer=0; world.clearTimer=0; world.routeChoice=null; world.cinematic=null;
      world.enemies=[]; world.enemyBullets=[]; world.enemyBeams=[]; world.bullets=[]; world.pickups=[];
      world.players.forEach((p,i) => {p.x=210+i*40; p.y=210; p.shield=0; p.invulnerability=0;});
    };
    const upgrade = id => applyRunUpgrade(UPGRADE_DEFS.find(card => card.id===id));
    const target = (x,y) => {const e=makeEnemy('scout',x,y); e.hp=e.maxHp=1000; e.moduleBarrier=0; e.r=4; e.dead=false; world.enemies.push(e); return e;};
    const result = {};
    clean(); upgrade('piercing'); upgrade('piercing');
    const enemies=[target(210,155),target(210,125),target(210,95),target(210,65)];
    const bullet=emitPlayerShot(world.players[0],'primary');
    for (const e of enemies) {bullet.x=e.x;bullet.y=e.y;handleCollisions();}
    result.pierce={damage:enemies.map(e=>1000-e.hp),base:bullet.baseDamage,dead:bullet.dead,hits:bullet.hitIds.length};
    world.bullets=[]; const seeker=emitPlayerShot(world.players[0],'seeker',{damage:.75});
    seeker.x=enemies[0].x;seeker.y=enemies[0].y;handleCollisions();
    result.seeker={dead:seeker.dead,pierce:seeker.pierceLeft,hits:seeker.hitIds.length};

    result.blasts=[];
    for (const behavior of ['blast','mine']) for (const outside of [false,true]) {
      clean(); const radius=behavior==='mine'?26:34;
      world.players[0].x=200; world.players[1].x=200+(outside?radius+5:radius-1);
      const before=world.players.map(p=>p.hp);
      const bomb=enemyBullet(200,210,0,0,'#ff8050',3,null,{behavior,triggerAge:.8});
      detonateEnemyBlast(bomb);detonateEnemyBlast(bomb);
      result.blasts.push({behavior,outside,loss:world.players.map((p,i)=>before[i]-p.hp),count:world.power.blastCount,fragments:world.power.fragments.length});
    }
    clean(); const bomb=enemyBullet(210,210,0,0,'#ff8050',3,null,{behavior:'blast',triggerAge:.8,anchored:true});
    handleCollisions();const beforeFuse=world.players[0].hp;updateObjects(.81);handleCollisions();
    result.fuse={before:beforeFuse,after:world.players[0].hp,count:world.power.blastCount};

    clean(); upgrade('rushGuard');
    const ordinary=Array.from({length:4},()=>enemyBullet(230,210,0,60));
    const protectedBomb=enemyBullet(230,210,0,0,'#ff8050',3,null,{behavior:'blast',triggerAge:8});
    for (let i=0;i<48;i++) updateRush(1/60);
    result.guard={clears:world.rushGuardClears,nodes:world.power.guardNodes,bombAlive:!protectedBomb.dead,ordinary:ordinary.filter(b=>b.dead).length};
    world.enemyBullets=[]; world.players[1].x=450;
    const recovery=world.power.guardRecovery;
    for(let i=0;i<360;i++)updateRush(1/60);
    result.guard.splitRecovery=world.power.guardRecovery-recovery;

    result.pulses=[];
    for(const rank of [1,2]){
      clean(); for(let i=0;i<rank;i++)upgrade('rushOverdrive');target(230,100);world.rushCharge=100;startRush();
      for(let i=0;i<360;i++)updateRush(1/60);
      result.pulses.push({rank,count:world.power.shots.overloadPulse,perOwner:world.players.map(p=>world.bullets.filter(b=>b.source==='overloadPulse'&&b.owner===p.index).length),cooldown:world.rushCooldown,pierce:world.bullets.some(b=>b.pierceLeft),seeker:world.bullets.some(b=>b.seeker),charge:world.rushCharge});
    }

    result.pickup=[];
    clean();
    const p=world.players[0];
    const sample=label=>{
      world.bullets=[];playerShoot(p);const shot=world.bullets[0];const e=target(p.x,120);shot.x=e.x;shot.y=e.y;
      const charge=world.novaCharge;handleCollisions();const hitDamage=1000-e.hp;world.enemies=[];
      return{label,weapon:world.players.map(p=>p.weapon),damage:shot.damage,hitDamage,period:p.fireTimer,buff:p.buffs.arsenal,charge};
    };
    const collectWeapon=()=>{const pickup={type:'weapon',x:p.x,y:p.y,r:5};world.pickups=[pickup];handleCollisions();return pickup.dead;};
    result.pickup.push(sample('base'));
    result.pickupCollected=collectWeapon(); result.pickup.push(sample('pickup1-active'));
    updatePlayerStatus(p,8.1);result.pickup.push(sample('pickup1-expired'));
    collectWeapon();updatePlayerStatus(p,8.1);result.pickup.push(sample('pickup2-expired'));
    world.novaCharge=0;collectWeapon();result.pickup.push(sample('max-pickup'));
    advanceStage();result.pickup.push(sample('chapter2'));

    result.cadence=[];
    for(const rank of [1,2,3])for(const overclock of [0,2]){
      clean();for(const id of ['rail','prism','drone'])for(let i=0;i<rank;i++)upgrade(id);
      for(let i=0;i<overclock;i++)upgrade('overclock');
      for(let i=0;i<360;i++)updateAuxiliaryWeapons(world.players[0],1/60);
      result.cadence.push({rank,overclock,shots:{...world.power.shots}});
    }
    result.inheritance=[];
    for(const mode of ['solo','coop']){
      clean();world.gameMode=mode;
      for(const card of UPGRADE_DEFS)for(let i=0;i<card.max;i++)upgrade(card.id);
      const snapshot=()=>JSON.stringify({ranks:world.upgrades,history:world.upgradeHistory,protocols:world.activeProtocols.map(p=>p.id),players:world.players.map(p=>[p.damage,p.primaryRateBonus,p.heavyInterval,p.fanInterval,p.seekerInterval,p.pierce,p.maxHp,p.maxShield])});
      const before=snapshot();advanceStage();const second=snapshot();advanceStage();
      result.inheritance.push({mode,second:before===second,third:before===snapshot(),protocols:world.activeProtocols.length});
    }
    return result;
  })()`);
  console.log('Power measurements:',JSON.stringify(report));
  const near = (a,b) => assert.ok(Math.abs(a-b)<1e-6, `${a} != ${b}`);
  report.pierce.damage.forEach((damage,i)=>near(damage,report.pierce.base*[1,.65,.4,0][i]));
  assert.equal(report.pierce.hits,3);assert.ok(report.pierce.dead);
  assert.deepEqual(report.seeker,{dead:true,pierce:0,hits:1});
  for(const b of report.blasts){assert.deepEqual(b.loss,[b.behavior==='mine'?1:2,b.outside?0:b.behavior==='mine'?1:2]);assert.equal(b.count,1);assert.equal(b.fragments,8);}
  near(report.fuse.before-report.fuse.after,2);assert.equal(report.fuse.count,1);
  assert.deepEqual(report.guard,{clears:3,nodes:0,bombAlive:true,ordinary:3,splitRecovery:0});
  for(const pulse of report.pulses){assert.deepEqual(pulse.perOwner,Array(2).fill(pulse.rank===1?6:8));near(pulse.cooldown,8);assert.equal(pulse.charge,0);assert.ok(!pulse.pierce&&!pulse.seeker);}
  const [base,active,expired,third,max,chapter]=report.pickup;
  near(active.damage/base.damage,1.1*1.06);near(expired.damage/base.damage,1.1);near(third.damage/base.damage,1.2);
  assert.ok(report.pickupCollected);for(const sample of report.pickup)near(sample.hitDamage,sample.damage);
  assert.deepEqual(expired.weapon,[2,2]);assert.deepEqual(third.weapon,[3,3]);assert.deepEqual(chapter.weapon,[3,3]);assert.ok(max.charge>=8, 'maxed pickup must convert to charge, including equipped charge bonuses');
  for(let i=0;i<report.cadence.length;i+=2)assert.deepEqual(report.cadence[i].shots,report.cadence[i+1].shots,'primary overclock must not multiply periodic weapons');
  for(const state of report.inheritance){assert.ok(state.second&&state.third);assert.equal(state.protocols,7);}
  console.log('Power mechanics:',JSON.stringify(report));
  fs.writeFileSync(path.join(output,'mechanics.json'),JSON.stringify(report,null,2));

  for(const rank of [0,1,2,3]){
    await win.webContents.executeJavaScript(`(() => {
      resetWorld();world.mode='inspection';world.introTimer=0;world.routeChoice=null;world.cinematic=null;
      for(const id of ['overclock','piercing','rail','prism','drone','rushOverdrive','rushGuard']){
        const card=UPGRADE_DEFS.find(c=>c.id===id);for(let i=0;i<Math.min(${rank},card.max);i++)applyRunUpgrade(card);
      }
      world.enemies=[];world.enemyBullets=[];world.bullets=[];world.particles=[];world.power.effects=[];
      world.players.forEach((p,i)=>{p.x=210+i*60;p.y=225;p.invulnerability=0;});world.linked=true;
      const sources=${rank}===0?['primary']:['primary','heavy','fan','seeker','overloadPulse'];
      for(const [column,source]of sources.entries())for(let row=0;row<3;row++){
        const b=emitPlayerShot(world.players[0],source);b.x=110+column*65;b.y=85+row*35;b.age=.3+row*.1;
      }
      world.flash=0;world.shake=0;draw();return true;
    })()`);
    await delay(100);
    fs.writeFileSync(path.join(output,`rank-${rank}.png`),(await win.webContents.capturePage()).toPNG());
  }
  await win.webContents.executeJavaScript(`(() => {
    world.draftOptions=['rail','piercing','rushGuard'].map(id=>UPGRADE_DEFS.find(c=>c.id===id));
    world.upgrades={rail:1,piercing:1,rushGuard:1};world.draftIndex=0;world.mode='draft';document.querySelector('#upgradePanel').hidden=false;renderUpgradeDraft();return true;
  })()`);
  for(const language of ['zh','en']){
    await win.webContents.executeJavaScript(`SpaceI18n.setLanguage('${language}');renderUpgradeDraft();true;`);
    await delay(100);
    const cards=await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.upgrade-choice'),n=>({text:n.textContent,scroll:n.scrollHeight,client:n.clientHeight}))`);
    assert.equal(cards.length,3);for(const card of cards)assert.doesNotMatch(card.text,/\{\w+\}/);
    fs.writeFileSync(path.join(output,`draft-${language}.png`),(await win.webContents.capturePage()).toPNG());
  }
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({fixtures:'passed',errors,screenshots:output,normalPlay:'separate smoke:chapter-one run'}));
  win.destroy();
}
run().then(()=>server.close(()=>app.quit())).catch(error=>{console.error(error);server.close();app.exit(1);});
