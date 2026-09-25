const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Regression for low-capacity shields: move real bullets, run the production update,
// and measure submitted GPU positions at the normal gameplay camera. Not a difficulty benchmark.
// The bridge exists only in this isolated loopback server, never shipped source.
const root = path.resolve(__dirname, '..');
const output = path.join(os.tmpdir(), 'spacescraft-shield-gameplay');
const bridge = 'update, renderer3D, world, resetWorld, enemyBullet, draw';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  const target = path.resolve(root, pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1)));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml'})[path.extname(target)] || 'application/octet-stream');
  const source=fs.readFileSync(target);
  res.end(pathname === '/src/game.js' ? source + `\nObject.assign(window, {${bridge}});` : source);
});
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.setPath('userData', path.join(os.tmpdir(), `spacescraft-particle-effects-${process.pid}`));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  await app.whenReady(); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const win=new BrowserWindow({width:1440,height:900,show:false,webPreferences:{backgroundThrottling:false,contextIsolation:true,nodeIntegration:false,sandbox:true}});
  const errors=[];win.webContents.on('console-message',event=>{if(event.level==='error')errors.push(event.message);});
  await win.loadURL(`http://127.0.0.1:${server.address().port}/?seed=2706`);
  await win.webContents.executeJavaScript(`document.querySelector('#startButton').click();if(!document.querySelector('#tutorial').hidden)document.querySelector('#tutorialContinueButton').click();true;`);
  await delay(1400);
  const result=await win.webContents.executeJavaScript(`(()=>{
    const renderer=renderer3D,original=renderer.drawPlayerShield;
    // Neutral reference uses the same particles, time, break state and camera.
    // Rewind the shared buffer before the real draw; only the real draw is rendered.
    renderer.drawPlayerShield=function(base,profile,p){
      if(p.index!==0)return original.call(this,base,profile,p);
      const fx=this.pixelEffects,start=fx.sparkCount,count=fx.count,response=this.shieldRingResponse;
      this.shieldRingResponse=()=>({radial:1,shear:0,stress:0,color:fx.color.clone().set('#6edfff')});
      original.call(this,base,profile,p);
      const n=this.quality==='low'?30:48;
      const neutral=Array.from(fx.geometry.attributes.position.array.slice(start*3,(start+n)*3));
      fx.sparkCount=start;fx.count=count;this.shieldRingResponse=response;
      original.call(this,base,profile,p);
      const actual=fx.geometry.attributes.position.array.slice(start*3,(start+n)*3);
      const bounds=this.canvas.getBoundingClientRect(); const offsets=[];
      for(let i=0;i<n;i++){
        const a=fx.position.clone().fromArray(actual,i*3).project(this.camera);
        const b=fx.position.clone().fromArray(neutral,i*3).project(this.camera);
        offsets.push(Math.hypot((a.x-b.x)*bounds.width/2,(a.y-b.y)*bounds.height/2));
      }
      window.lastOffsets={max:Math.max(...offsets),moved:offsets.filter(x=>x>1).length,above2:offsets.filter(x=>x>2).length};
    };
    const rows=[];
    for(const quality of ['high','balanced','low'])for(const [capacity,shield,damage] of [[3,3,1],[4,4,1],[3,3,2],[3,1,1],[3,1,4]]){
      document.querySelector('#qualitySetting').value=quality;document.querySelector('#qualitySetting').dispatchEvent(new Event('change'));
      resetWorld();world.mode='inspection';world.gameMode='duo';world.introTimer=0;world.clearTimer=0;world.routeChoice=null;world.cinematic=null;world.activeAnomaly=null;
      world.enemies=[];world.bullets=[];world.enemyBullets=[];world.pickups=[];world.particles=[];
      world.players.forEach((p,i)=>{p.x=200+i*170;p.y=205;p.vx=p.vy=0;p.shield=shield;p.maxShield=capacity;p.invulnerability=0;});
      enemyBullet(200,165,0,60,'#ffb45f',3,null,{damage});
      const frames=[];
      for(let frame=0;frame<108;frame++){
        world.mode='playing';update(1/60);world.mode='inspection';draw();
        const p=world.players[0],e=p.shieldImpacts.at(-1);
        if(e&&e.age<.7)frames.push({age:+e.age.toFixed(3),...lastOffsets});
      }
      const p=world.players[0];
      rows.push({quality,capacity,shield,damage,load:p.shieldImpactLoad,absorbed:p.shieldAbsorbed,hp:p.hp,remaining:p.shield,expired:p.shieldImpacts.length,
        frames:frames.filter((f,i)=>i%4===0),peak:Math.max(...frames.map(f=>f.max))});
    }
    renderer.drawPlayerShield=original;return rows;
  })()`);
  for(const row of result){
    assert.equal(row.load,row.damage/row.capacity,'load uses incoming damage and total capacity');
    assert.equal(row.absorbed,Math.min(row.shield,row.damage),'visual load must not alter absorption');
    assert.equal(row.remaining,Math.max(0,row.shield-row.damage));
    assert.equal(row.hp,7-Math.max(0,row.damage-row.shield),'overflow still damages the hull');
    assert.equal(row.expired,0,'fixed-step update must expire all impulses');
    const traveling=row.frames.find(f=>f.age>=.13);
    assert.ok(traveling.max>4&&traveling.above2>=4,'several submitted perimeter vertices must visibly move after the initial flash');
  }
  for(const quality of ['high','balanced','low']){
    const light=result.find(r=>r.quality===quality&&r.shield===1&&r.damage===1);
    const heavy=result.find(r=>r.quality===quality&&r.shield===1&&r.damage===4);
    assert.ok(heavy.peak>light.peak*1.5,'last shield point must retain distinct light/heavy deformation');
    const capacities=result.filter(r=>r.quality===quality&&r.shield===r.capacity&&r.damage===1);
    assert.ok(capacities[0].peak>capacities[1].peak,'same attack deforms a larger-capacity shield less');
  }
  assert.deepEqual(errors,[]);
  fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'metrics.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({mode:'real collision + fixed-step update + submitted GPU perimeter positions; controlled fixtures',result,errors,output}));
  win.destroy();server.close();app.quit();
}
run().catch(e=>{console.error(e);server.close();app.exit(1);});
