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
const bridge = 'renderer3D, damagePlayer, world, resetWorld, applyRunUpgrade, UPGRADE_DEFS, advanceStage, relicBonuses, makeEnemy, handleCollisions, updatePlayers, updatePlayerStatus, playerShoot, emitPlayerShot, updateAuxiliaryWeapons, updateRush, startRush, updateObjects, detonateEnemyBlast, enemyBullet, applyPickup, addNovaCharge, draw, renderUpgradeDraft, renderPowerSummary';
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
  const capture = async (name, script) => {
    await win.webContents.executeJavaScript(`(() => {${script}; draw(); document.querySelector('#game').style.visibility='hidden';document.querySelector('#toast').style.visibility='hidden';return true;})()`);
    await delay(100);
    fs.writeFileSync(path.join(output,name+'.png'),(await win.webContents.capturePage()).toPNG());
  };
  await capture('shield-directions', `cleanEffects();
    damagePlayer(world.players[0],1,{x:120,y:205});damagePlayer(world.players[1],1,{x:360,y:205});
    world.players.forEach(p=>p.shieldHitTimer=.26);world.particles=[];`);
  await capture('shield-break', `world.players.forEach((p,i)=>{p.invulnerability=0;p.shield=1;damagePlayer(p,1,{x:p.x,y:120});p.shieldBreakTimer=.36;p.shieldHitTimer=.13;});world.particles=[];`);
  await capture('link-charge', `cleanEffects();world.linked=true;world.rushCharge=65;world.upgrades.rushGuard=1;world.power.guardNodes=3;world.players.forEach(p=>p.shield=0);`);
  await capture('link-overload', `world.rushTimer=4;world.rushCharge=0;world.power.guardNodes=1;world.time=2.17;`);
  await capture('link-cooldown', `world.rushTimer=0;world.rushCooldown=4;world.time=2.3;`);
  await capture('warning-early', `cleanEffects();world.players.forEach(p=>p.shield=0);
    const a=makeEnemy('cometRammer',160,80), b=makeEnemy('lancer',310,75);
    Object.assign(a,{attackState:'telegraph',attackPattern:'ramCharge',attackCharge:.12,attackTargetX:190,attackTargetY:220,attackEndX:200,attackEndY:250,aiStateDuration:1.28});
    Object.assign(b,{attackState:'telegraph',attackPattern:'laserLance',attackCharge:.12,attackTargetX:270,attackTargetY:240,aiStateDuration:1.28});
    world.enemies=[a,b];`);
  await capture('warning-late', `world.enemies.forEach(e=>e.attackCharge=.97);world.time=3;`);
  const flashes = await win.webContents.executeJavaScript(`(() => {
    const sample=[];for(let i=0;i<=128;i++)sample.push(renderer3D.warningFlash({aiStateDuration:1.28},i/128));
    const rises=sample.flatMap((value,i)=>i>0&&value>sample[i-1]?[i/100]:[]);return rises;
  })()`);
  assert.ok(flashes.length>=3 && flashes[flashes.length-1]-flashes[flashes.length-2]<flashes[1]-flashes[0], 'warning pulses must accelerate');
  await capture('laser-ram', `const ram=world.enemies[0];world.enemies=[ram];ram.attackState='attack';
    for(let i=0;i<24;i++){world.time+=1/60;ram.x=160+i*1.5;ram.y=90+i*3;draw();}
    world.enemyBeams=[{x1:310,y1:75,x2:260,y2:265,width:5,age:.2,duration:.65,color:'#ff5a68'}];`);
  await capture('effects-low', `document.querySelector('#qualitySetting').value='low';document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));`);
  const particles = await win.webContents.executeJavaScript(`({...document.querySelector('#scene').dataset})`);
  assert.equal(particles.effectDropped,'0');assert.ok(Number(particles.effectParticles)>50);
  if(process.argv.includes('--fixtures-only')){assert.equal(errors.length,0,errors.join(' | '));console.log(JSON.stringify({output,directions,warningRises:flashes,particles:particles.effectParticles,dropped:particles.effectDropped,opening:'skipped: fixtures-only',errors}));win.destroy();server.close();app.quit();return;}
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true;`);
  const started=Date.now();let opening;
  while(Date.now()-started<45000){await delay(300);opening=await win.webContents.executeJavaScript(`({...document.querySelector('#game').dataset})`);if(Number(opening.stageTime)>=20)break;}
  assert.equal(opening.mode,'playing');assert.equal(opening.playerDowned,'0,0');assert.ok(Number(opening.stageTime)>=20);assert.ok(Number(opening.fps)>=40);
  assert.equal(errors.length,0,errors.join(' | '));
  fs.writeFileSync(path.join(output,'opening.png'),(await win.webContents.capturePage()).toPNG());
  console.log(JSON.stringify({output,directions,warningRises:flashes,particles:particles.effectParticles,dropped:particles.effectDropped,opening:{seconds:opening.stageTime,hp:opening.playerHp,fps:opening.fps},errors}));
  win.destroy();server.close();app.quit();
}
run().catch(error=>{console.error(error);server.close();app.exit(1);});
