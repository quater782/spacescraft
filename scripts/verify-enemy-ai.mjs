import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync(new URL('../src/enemy-ai.js',import.meta.url),'utf8'),sandbox);
const ai=sandbox.window.SpaceEnemyAI;
for(const file of ['game.js','combat.js','enemy-ai.js','renderer3d.js','expedition.js']) {
  const source=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  assert.doesNotMatch(source,/\b(?:aiState|attackState|aiStateTimer|aiStateDuration|aiStateAge|attackTimer|attackDuration|attackCharge|shootTimer|eliteTimer|aiSteer|aiFlank|beamHold|syncEnemyAiState|stateDuration|ROLE_DOCTRINES|doctrineFor|updateEnemyIntelligence|resolveEnemyCrowding)\b/,'legacy enemy controller must not return: '+file);
}
const make=(role='interceptor')=>({id:1,type:'scout',hullRole:role,x:240,y:100,vx:0,vy:0,r:8,bodyRadius:6,age:0,seed:1,moveSpeed:1,stationX:240,stationYBias:0,attackCycle:0});
const ctx={width:480,height:270,enemies:[],bullets:[],hazards:[]};
const players=[{index:0,x:230,y:230,vx:0,vy:0,hp:7,maxHp:7},{index:1,x:285,y:230,vx:0,vy:0,hp:7,maxHp:7}];
const e=make();ai.init(e);e.tacticState='engage';
assert.equal(ai.chooseTarget(e,players,.01).index,0);
players[1].x=240;assert.equal(ai.chooseTarget(e,players,.21).index,0,'closer contender cannot thrash an acquired target');
players[0].downed=true;assert.equal(ai.chooseTarget(e,players,.01).index,1,'invalid target must release immediately');
players[0].downed=false;
// Reversing or strafing must respond before any hull rotation, for every ordinary role and Boss.
for (const role of Object.keys(ai.profiles)) {
  const craft=make(role);craft.boss=role==='boss';ai.init(craft);craft.tacticState='maneuver';
  let reverse=0,side=0;
  for(let frame=0;frame<48;frame++) {
    ai.flight(craft,{x:170,y:45,face:Math.PI/2,speed:ai.profile(craft).speed},ctx,1/60);
    reverse=Math.max(reverse,craft.reverseThrust);side=Math.max(side,Math.abs(craft.sideThrust));
    assert.ok(Math.abs(ai.angleDelta(craft.heading,Math.PI/2))<1e-8,'translation cannot force the hull to turn around');
    if(frame===11)assert.ok(craft.x<239.8&&craft.y<99.8,'reverse/strafe did not respond immediately');
  }
  assert.ok(craft.x<235&&craft.y<95&&reverse>.1&&side>.1,'reverse/side movement must have matching thrust');
}
const chipInput={runSeed:260901,stageIndex:0,progress:.5};
const chipRolls=Array.from({length:500},(_,id)=>ai.chipFor({...chipInput,id}));
assert.ok(chipRolls.filter(Boolean).length>20&&chipRolls.filter(Boolean).length<110,'chips must remain an uncommon random modifier');
assert.deepEqual(chipRolls,Array.from({length:500},(_,id)=>ai.chipFor({...chipInput,id})),'chip draws must replay from the run seed');
for(let id=0;id<100;id++) {
  assert.equal(ai.chipFor({...chipInput,id,progress:.24}),'','opening protection must exclude chips');
  assert.equal(ai.chipFor({...chipInput,id,active:2}),'','chapter one chip cap must hold');
  assert.equal(ai.chipFor({...chipInput,id,relief:true}),'','recovery windows must exclude new chips');
}
const basic=make(),smart=make();smart.chipId='adaptive';ai.init(basic);ai.init(smart);
basic.tacticState=smart.tacticState='engage';
const blocker={id:2,x:240,y:92,r:8};
const target={index:0,x:240,y:230,vx:0,vy:0};
const occupied={...ctx,enemies:[blocker]};
const basicGoal=ai.plan(basic,target,occupied,1/60),smartGoal=ai.plan(smart,target,occupied,1/60);
assert.ok(Math.abs(smartGoal.x-blocker.x)>Math.abs(basicGoal.x-blocker.x)+40,'chip should choose a less crowded firing lane');
assert.ok(ai.aimLead(smart)>ai.aimLead(basic),'chip must use bounded motion prediction');
const incoming={x:240,y:180,vx:0,vy:-120};
for(const chipped of [false,true]) {
  const c=make();if(chipped)c.chipId='adaptive';ai.init(c);c.tacticState='engage';c.sensedThisStep=true;
  ai.plan(c,target,{...ctx,bullets:[incoming]},1/60);
  assert.equal(c.tacticState==='evade',chipped,'chip should react earlier to a perceived interception');
  if(chipped){c.tacticState='engage';c.weaponState='windup';c.evadeCooldown=0;ai.plan(c,target,{...ctx,bullets:[incoming]},1/60);assert.equal(c.tacticState,'engage','chip must respect an attack commitment');}
}
// Defensive retreat responds to observed incoming fire and low hull, then respects its cooldown.
const wounded=make();wounded.chipId='adaptive';wounded.hp=3;wounded.maxHp=10;ai.init(wounded);
wounded.tacticState='engage';wounded.sensedThisStep=true;wounded.evadeCooldown=2;
ai.plan(wounded,target,{...ctx,bullets:[{x:240,y:130,vx:0,vy:-120}]},1/60);
assert.equal(wounded.stateReason,'defensive-withdrawal');assert.equal(wounded.chipDefenses,1);
for(let frame=0;frame<120;frame++){wounded.age+=1/60;const intent=ai.plan(wounded,target,ctx,1/60);ai.flight(wounded,intent,ctx,1/60);}
assert.notEqual(wounded.tacticState,'disengage','defense must return to combat');
// Wide flank choices must still allow the engage transition.
for(const x of [40,240,440]) {
  const flank=make('flanker');flank.chipId='adaptive';flank.aiModule='ambusher';ai.init(flank);flank.tacticState='maneuver';
  const t={...target,x};const goal=ai.plan(flank,t,ctx,1/60);
  assert.ok(Math.hypot(goal.x-t.x,goal.y-t.y)<=ai.profile(flank).engagementRange+1e-6);
}
const slow=make(),fast=make();fast.chipId='adaptive';
for(const c of [slow,fast]){ai.init(c);c.tacticState='maneuver';ai.flight(c,{x:400,y:100,face:0,speed:45},ctx,1/60);}
assert.ok(fast.vx>slow.vx&&Math.abs(fast.turnRate)>Math.abs(slow.turnRate),'chip must improve acceleration and turning');
const steady=make();ai.init(steady);steady.tacticState='engage';const station=ai.plan(steady,target,ctx,1/60);
for(let frame=0;frame<120;frame++){steady.age+=1/60;const goal=ai.plan(steady,{...target,x:240+Math.sin(frame)*3},ctx,1/60);assert.equal(goal.x,station.x,'small target motion must not churn the navigation goal');}
// Turn reversal must preserve bounded acceleration and position continuity, including angular wrapping.
for(const role of Object.keys(ai.profiles)){
  const craft=make(role);if(role==='boss')craft.boss=true;ai.init(craft);craft.tacticState='maneuver';
  for(let frame=0;frame<720;frame++){
    const old={x:craft.x,y:craft.y,vx:craft.vx,vy:craft.vy,h:craft.heading};
    const intent={x:frame<240?360:120,y:frame<480?110:60,speed:ai.profile(craft).speed};
    ai.flight(craft,intent,ctx,1/60);
    assert.ok([craft.x,craft.y,craft.heading,craft.bank].every(Number.isFinite));
    assert.ok(Math.hypot(craft.x-old.x,craft.y-old.y)<1.1,'unexpected position jump');
    assert.ok(Math.abs(ai.angleDelta(craft.heading,old.h))*60<=ai.profile(craft).turn+1e-7,'turn exceeded capability');
    assert.ok(Math.hypot(craft.vx-old.vx,craft.vy-old.vy)*60<=Math.max(ai.profile(craft).accel,ai.profile(craft).brake)+1e-6,'acceleration exceeded actuator');
  }
  assert.equal(craft.boundaryCorrections,0,'normal flight must not touch a hard clamp');
}
for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.7]){
  const craft=make();ai.init(craft);craft.heading=heading;craft.weaponYaw=0;
  const point=ai.muzzle(craft);const direction=Math.atan2(point.y-craft.y,point.x-craft.x);
  assert.ok(Math.abs(ai.angleDelta(direction,heading))<1e-8,'nonuniform 3D mapping must preserve the firing direction');
}
const ram=make('striker');ai.init(ram);ram.heading=Math.PI/2;
const lane=ai.ramPath(ram,{x:240,y:260},480,270);
assert.ok(lane.endY<=250&&lane.endY>200,'charge endpoint must be feasible inside the arena');
ram.y=248;assert.equal(ai.ramPath(ram,{x:240,y:260},480,270),null,'blocked short charge must be rejected');
const laser=make('artillery');ai.init(laser);laser.attackPattern='laserLance';laser.weaponAim=Math.PI/2;
const locked=ai.beamRays(laser);laser.attackCommit={rays:locked};laser.attackTargetX=10;laser.x+=40;
assert.equal(ai.beamRays(laser),locked,'warning and damage must share the immutable attack snapshot');
// Rendering frequency does not invoke AI; repeat the same fixed-step input schedule.
const simulate=()=>{const c=make();ai.init(c);for(let n=0;n<180;n++)ai.flight(c,{x:350,y:90,speed:45},ctx,1/60);return [c.x,c.y,c.heading,c.vx,c.vy]};
assert.deepEqual(simulate(),simulate());
console.log('Enemy AI verified: immediate reverse/strafe with target-facing hulls, bounded motion, stable stations, rare seeded chips with opening/cap protection, smart lane selection/anticipation, committed warnings and feasible charge corridors.');
