(() => {
  "use strict";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const approach = (n, goal, step) => n + clamp(goal - n, -step, step);
  const length = (x, y) => Math.hypot(x, y);
  const yaw = (heading) => Math.atan2(-Math.cos(heading) / 21.5, -Math.sin(heading) / 13.3);
  const hardpoints = Object.freeze({
    scout: [-.65, .72, .51, .5], dart: [-.92, .86, .53, .38], tank: [-.73, .72, .8, .86],
    spinner: [-.51, .64, .58, .48], mine: [-.61, .71, .7, .66], lancer: [-.62, .7, .6, .42],
    carrier: [-.8, .94, .75, 1.04], nectarMoth: [-.62, .72, .54, .44], prismRay: [-.85, .85, .59, .65],
    cometRammer: [-.54, .86, .68, .65], auroraLeech: [-.7, .82, .63, .53], railBeetle: [-.76, .82, .94, .91],
    reefMedusa: [-.77, .8, .89, .86], eclipseReaper: [-.76, .78, .66, .55],
    graveMirror: [-.8, .84, .6, .61], gardenSpore: [-.84, .96, .89, .96],
  });
  const profiles = Object.freeze({
    interceptor: { speed: 45, turn: 4.8, accel: 82, brake: 110, bank: .31, engagementRange: 138, rangeBand: 22, flankDistance: 58, aimLead: .12, windup: .42, fireDuration: .14, cooldown: 1.2944 },
    striker: { speed: 57, turn: 5.2, accel: 100, brake: 130, bank: .34, engagementRange: 122, rangeBand: 20, flankDistance: 76, aimLead: .18, windup: .48, fireDuration: .16, cooldown: 1.4032 },
    flanker: { speed: 54, turn: 5.4, accel: 96, brake: 125, bank: .38, engagementRange: 112, rangeBand: 24, flankDistance: 108, aimLead: .24, windup: .56, fireDuration: .16, cooldown: 1.4304 },
    bulwark: { speed: 24, turn: 2.4, accel: 45, brake: 75, bank: .12, turret: true, engagementRange: 164, rangeBand: 26, flankDistance: 22, aimLead: .08, windup: .72, fireDuration: .2, cooldown: 1.9472 },
    artillery: { speed: 30, turn: 2.8, accel: 52, brake: 85, bank: .14, turret: true, engagementRange: 176, rangeBand: 28, flankDistance: 42, aimLead: .14, windup: .68, fireDuration: .22, cooldown: 1.784 },
    denial: { speed: 26, turn: 2.5, accel: 48, brake: 80, bank: .12, turret: true, engagementRange: 154, rangeBand: 26, flankDistance: 34, aimLead: .1, windup: .78, fireDuration: .2, cooldown: 2.0016 },
    command: { speed: 23, turn: 2.2, accel: 42, brake: 70, bank: .1, turret: true, engagementRange: 172, rangeBand: 30, flankDistance: 28, aimLead: .16, windup: .86, fireDuration: .24, cooldown: 2.1376 },
    boss: { speed: 34, turn: 1.7, accel: 48, brake: 90, bank: .06, turret: true },
  });
  const profile = e => profiles[e.boss ? "boss" : e.hullRole] || profiles.interceptor;
  const isLaser = pattern => ["laserLance", "laserSweep", "sunLance", "railWall", "doubleRail"].includes(pattern);
  const isRadial = pattern => ["spiral", "counterSpiral", "eliteHalo", "seedMine", "seedCluster", "laneWall", "pincer", "commandCross", "eliteCross"].includes(pattern);
  const committed = e => e.weaponState === "windup" || e.weaponState === "fire";
  const hasChip = e => e.chipId === "adaptive";
  const CHIP = Object.freeze({ id: "adaptive", chance: [.14, .22, .28], cap: [2, 3, 4], hp: 1.25, speed: 1.18, turn: 1.3, accel: 1.35, brake: 1.25 });

  function chipFor({ runSeed, id, stageIndex, progress, active = 0, relief = false }) {
    const stage = clamp(stageIndex, 0, 2);
    if (relief || (stage === 0 && progress < .25) || active >= CHIP.cap[stage]) return "";
    // Independent deterministic draw: chip assignment must not consume the combat/loot random stream.
    let hash = Math.imul((runSeed ^ Math.imul(id, 0x9e3779b1)) >>> 0, 0x85ebca6b);
    hash ^= hash >>> 13; hash = Math.imul(hash, 0xc2b2ae35); hash ^= hash >>> 16;
    return (hash >>> 0) / 4294967296 < CHIP.chance[stage] ? CHIP.id : "";
  }

  function init(e) {
    if (Number.isFinite(e.heading)) return;
    e.heading = Math.PI / 2;
    e.turnRate = 0; e.bank = 0; e.pitch = 0; e.weaponYaw = 0;
    e.tacticState = "ingress"; e.stateAge = 0; e.stateReason = "spawn";
    e.weaponState ??= "cooldown"; e.weaponTimer ??= Math.max(.7, e.initialFireDelay || 0);
    e.weaponDuration ??= e.weaponTimer; e.weaponAge ??= 0; e.weaponCharge ??= 0;
    e.targetHold = 0; e.targetId = null; e.targetSwitches = 0;
    e.perceptionTimer = ((e.id * .618034) % 1) * .2;
    e.flightSide = Math.sin(e.seed * 2.17) >= 0 ? 1 : -1;
    e.pathId = 0; e.evadeCooldown = 0; e.stableAim = 0;
    e.boundaryCorrections = 0; e.contactCorrections = 0; e.tacticTransitions = 0;
    e.chipDefenseCooldown = 0; e.chipDefenses = 0;
    e.chipReplanTimer = 0; e.chipDecisions = 0; e.chipEvades = 0; e.chipReason = "";
  }
  function transition(e, state, reason) {
    if (e.tacticState === state) return;
    e.tacticState = state; e.stateAge = 0; e.stateReason = reason; e.tacticTransitions++;
  }
  function chooseTarget(e, players, dt) {
    e.sensedThisStep = false;
    const live = players.filter(p => !p.downed);
    e.targetHold = Math.max(0, e.targetHold - dt);
    e.perceptionTimer -= dt;
    const current = live.find(p => p.index === e.targetId);
    if (current && (committed(e) || e.perceptionTimer > 0)) return current;
    e.sensedThisStep = true;
    e.perceptionTimer = hasChip(e) ? .12 + ((e.id * .381966) % 1) * .06 : .16 + ((e.id * .381966) % 1) * .08;
    if (!live.length) { e.targetId = null; return null; }
    const score = p => {
      const distance = length(p.x - e.x, p.y - e.y);
      let value = 1 - distance / 550;
      if (e.aiTargeting === "weakest") value += (1 - p.hp / p.maxHp) * .75;
      if (e.aiTargeting === "leading") value += Math.min(1, length(p.vx || 0, p.vy || 0) / 90) * .3;
      if (e.aiTargeting === "isolated") {
        const partner = live.find(other => other !== p);
        value += partner ? Math.min(1, length(p.x - partner.x, p.y - partner.y) / 120) * .35 : .5;
        value += (Math.sign(p.x - e.x) === e.flightSide ? .15 : 0);
      }
      if (p.index === e.squadTargetIndex) value += .3;
      return value;
    };
    const candidate = live.reduce((best, p) => score(p) > score(best) ? p : best);
    if (current && (e.targetHold > 0 || score(candidate) < score(current) + .2)) return current;
    if (e.targetId != null && candidate.index !== e.targetId) e.targetSwitches++;
    e.targetId = candidate.index; e.targetHold = 1.2;
    return candidate;
  }
  function setPath(e, x, y, ctx, reason) {
    e.pathX = clamp(x, 32, ctx.width - 32); e.pathY = clamp(y, 32, ctx.height - 78);
    e.pathId++; e.pathReason = reason;
  }
  function laneRisk(e, point, ctx) {
    let risk = 0;
    for (const other of ctx.enemies) {
      if (other === e || other.dead || other.boss) continue;
      const position = hasChip(other) && other.navGoal ? other.navGoal : other;
      risk += Math.max(0, 54 - length(position.x - point.x, position.y - point.y)) * 1.8;
    }
    for (const bullet of ctx.bullets) {
      if (bullet.dead || length(bullet.x - e.x, bullet.y - e.y) > 140) continue;
      const vx = bullet.vx || 0, vy = bullet.vy || 0;
      const time = clamp(((point.x - bullet.x) * vx + (point.y - bullet.y) * vy) / Math.max(1, vx * vx + vy * vy), 0, .7);
      risk += Math.max(0, 26 - length(bullet.x + vx * time - point.x, bullet.y + vy * time - point.y)) * 2;
    }
    return risk;
  }
  function chipStation(e, goal, target, ctx) {
    const predicted = { x: clamp(goal.x + (target.vx || 0) * .35, 32, ctx.width - 32), y: goal.y };
    if (e.chipReplanTimer <= 0 && !committed(e)) {
      const candidates = [-64, 0, 64].map(offset => ({ offset, x: clamp(predicted.x + offset, 32, ctx.width - 32), y: predicted.y }));
      const score = p => laneRisk(e, p, ctx) + Math.abs(p.offset) * .18 + length(p.x - e.x, p.y - e.y) * .06;
      const current = candidates.find(p => p.offset === e.chipLaneOffset) || candidates[1];
      const best = candidates.reduce((a, b) => score(a) <= score(b) ? a : b);
      const chosen = e.chipLaneOffset == null || score(best) + 12 < score(current) ? best : current;
      if (chosen.offset !== e.chipLaneOffset) { e.chipDecisions++; e.chipReason = "clear-fire-lane"; }
      e.chipLaneOffset = chosen.offset; e.chipReplanTimer = .75;
    }
    // Keep lateral choices inside a reachable firing band, including flanker/ambusher offsets.
    const reach = profile(e).engagementRange;
    const x = clamp(predicted.x + (e.chipLaneOffset || 0), Math.max(32, target.x - reach * .8), Math.min(ctx.width - 32, target.x + reach * .8));
    const depth = Math.sqrt(Math.max(0, reach * reach - (x - target.x) ** 2));
    return { x, y: clamp(Math.max(predicted.y, target.y - depth), 32, ctx.height - 90) };
  }
  function aimLead(e) {
    return Math.min(.65, (e.aiLead || 0) + (profile(e).aimLead || 0) + (hasChip(e) ? .16 : 0));
  }
  function station(e, target, ctx) {
    const d = profile(e);
    const side = e.flightSide;
    let x = e.stationX * (e.formationId ? .66 : .32) + (target.x + (e.formationOffsetX || 0) * .52) * (e.formationId ? .34 : .68);
    let y = target.y - d.engagementRange + e.stationYBias;
    if (e.hullRole === "flanker" || e.aiModule === "ambusher") x = target.x + side * (e.aiModule === "ambusher" ? 110 : d.flankDistance);
    if (e.hullRole === "artillery") x += Math.sin(e.age * .32 + e.seed) * d.flankDistance;
    const weaveAmplitude = Math.max(0, (e.moveSway || 1) - 1) * 28;
    x += Math.sin(e.age * .8 + e.seed) * weaveAmplitude + Math.sin(e.age * .4 + e.seed) * (e.moveDrift || 0);
    if (e.aiModule === "pack") {
      const pack = ctx.enemies.filter(other => !other.dead && other.packId === e.packId && other.aiModule === "pack");
      const leader = pack.reduce((best, p) => p.id < best.id ? p : best, e);
      if (leader !== e) {
        const slot = Math.max(1, pack.filter(p => p.id < e.id).length);
        const offset = (slot % 2 ? -1 : 1) * (32 + Math.floor(slot / 2) * 20);
        x = leader.x - Math.sin(leader.heading) * offset;
        y = leader.y + Math.cos(leader.heading) * offset - 18;
      }
    }
    if (e.hullRole === "denial") {
      const lanes = [70, 155, 240, 325, 410];
      if (e.denialLane == null || (e.lastLaidCycle !== e.attackCycle && e.weaponState === "cooldown")) {
        e.lastLaidCycle = e.attackCycle;
        e.denialLane = lanes.reduce((best, lane) => {
          const count = center => ctx.hazards.filter(b => !b.dead && ["mine", "blast"].includes(b.behavior) && Math.abs(b.x - center) < 60).length;
          return count(lane) < count(best) ? lane : best;
        }, lanes[e.id % lanes.length]);
      }
      x = e.denialLane;
    }
    let goal = { x: clamp(x, 32, ctx.width - 32), y: clamp(y, 32, ctx.height - 90) };
    if (hasChip(e)) goal = chipStation(e, goal, target, ctx);
    // Hold a useful station through small player motions; translation should not chase every pixel.
    if (!e.navGoal || e.navTargetId !== target.index || length(goal.x - e.navGoal.x, goal.y - e.navGoal.y) > 18
      || (e.age - e.navPlannedAt > 2 && length(goal.x - e.navGoal.x, goal.y - e.navGoal.y) > 6)) {
      e.navGoal = goal; e.navTargetId = target.index; e.navPlannedAt = e.age;
    }
    return e.navGoal;
  }
  function plan(e, target, ctx, dt) {
    const d = profile(e), p = d;
    e.stateAge += dt; e.evadeCooldown = Math.max(0, e.evadeCooldown - dt);
    e.chipReplanTimer = Math.max(0, e.chipReplanTimer - dt);
    e.chipDefenseCooldown = Math.max(0, e.chipDefenseCooldown - dt);
    if (!target) {
      transition(e, "acquire", "no-target");
      return { x: ctx.width / 2, y: 65, speed: p.speed * .4 };
    }
    e.engagementRange = d.engagementRange;
    const range = length(target.x - e.x, target.y - e.y);
    e.rangeError = range - d.engagementRange;
    const goal = station(e, target, ctx);
    const face = Math.atan2(target.y - e.y, target.x - e.x);
    if (e.tacticState === "ingress") {
      if (e.age < (e.formationDelay || 0)) return { x: e.x, y: e.y, speed: 0 };
      if (e.x >= 22 && e.x <= ctx.width - 22 && e.y >= 28 && Math.abs(e.y - goal.y) < 28) transition(e, "acquire", "entry-complete");
      return { ...goal, speed: p.speed, face };
    }
    if (e.tacticState === "acquire") transition(e, "maneuver", "target-acquired");
    if (e.sensedThisStep && !committed(e) && (hasChip(e) || e.aiEvasion > 0) && e.evadeCooldown <= 0 && ["maneuver", "engage"].includes(e.tacticState)) {
      const threat = ctx.bullets.find(b => {
        if (b.dead) return false;
        const rx = b.x - e.x, ry = b.y - e.y, vx = b.vx - e.vx, vy = b.vy - e.vy;
        const t = -(rx * vx + ry * vy) / Math.max(1, vx * vx + vy * vy);
        return t > .22 && t < (hasChip(e) ? .75 : .55) && length(rx, ry) < (hasChip(e) ? 110 : 65) && length(rx + vx * t, ry + vy * t) < e.r + 5;
      });
      if (threat) {
        let side = Math.sign(e.x - threat.x) || e.flightSide;
        if (hasChip(e)) {
          const cost = s => {
            const x = clamp(e.x + s * 44, 32, ctx.width - 32);
            return laneRisk(e, { x, y: e.y - 10 }, ctx) + (44 - Math.abs(x - e.x)) * 2;
          };
          side = cost(-1) < cost(1) ? -1 : 1;
          e.chipEvades++; e.chipReason = "predicted-intercept";
        }
        setPath(e, e.x + side * 44, e.y - 10, ctx, "incoming-projectile");
        transition(e, "evade", "perceived-intercept"); e.evadeCooldown = hasChip(e) ? 2.2 : 1.8;
      }
    }
    if (hasChip(e) && e.sensedThisStep && !committed(e) && e.chipDefenseCooldown <= 0
      && ["maneuver", "engage"].includes(e.tacticState) && e.hp < e.maxHp * .45 && laneRisk(e, e, { ...ctx, enemies: [] }) > 12) {
      const candidates = [-1, 1].map(side => ({ x: clamp(e.x + side * 48, 32, ctx.width - 32), y: clamp(e.y - 28, 32, ctx.height - 90) }));
      const cover = candidates.reduce((a, b) => laneRisk(e, a, ctx) <= laneRisk(e, b, ctx) ? a : b);
      setPath(e, cover.x, cover.y, ctx, "defensive-withdrawal");
      transition(e, "disengage", "defensive-withdrawal");
      e.chipDefenses++; e.chipReason = "defensive-withdrawal"; e.chipDefenseCooldown = 6;
    }
    if (["disengage", "reposition", "evade"].includes(e.tacticState)) {
      const arrived = length(e.pathX - e.x, e.pathY - e.y) < 14;
      const timeout = hasChip(e) ? (e.tacticState === "evade" ? .65 : 1.1) : 4;
      if (arrived || e.stateAge > timeout) {
        if (hasChip(e) && e.tacticState === "evade") e.evadeCooldown = 2.2;
        if (e.tacticState !== "reposition") {
          setPath(e, goal.x, goal.y, ctx, "new-approach"); transition(e, "reposition", "clear-of-pass");
        } else transition(e, "maneuver", arrived ? "new-lane-ready" : "replan-blocked-lane");
      }
      return { x: e.pathX, y: e.pathY, speed: p.speed, face };
    }
    if (!committed(e) && range < Math.max(55, d.engagementRange - d.rangeBand * 2.2)) {
      const retreat = { x: e.x + (e.x - target.x) / Math.max(1, range) * 60, y: e.y + (e.y - target.y) / Math.max(1, range) * 60 };
      if (retreat.y < 32) retreat.x += e.flightSide * 48;
      setPath(e, retreat.x, retreat.y, ctx, "standoff-breached");
      transition(e, "disengage", "too-close");
      return { x: e.pathX, y: e.pathY, speed: p.speed, face };
    }
    const inRange = range <= d.engagementRange + d.rangeBand * 1.8;
    if (e.tacticState === "maneuver" && inRange && length(goal.x - e.x, goal.y - e.y) < 44) transition(e, "engage", "firing-lane-ready");
    if (e.tacticState === "engage" && !committed(e) && range > d.engagementRange + d.rangeBand * 2.6) transition(e, "maneuver", "target-left-band");
    return { ...goal, speed: p.speed, face, arrivalRadius: e.tacticState === "engage" ? 6 : 2 };
  }
  function flight(e, intent, ctx, dt) {
    init(e);
    const p = profile(e), scale = (e.moveSpeed || 1) * (hasChip(e) ? CHIP.speed : 1);
    const dx = intent.x - e.x, dy = intent.y - e.y, range = length(dx, dy);
    let maxSpeed = (intent.speed ?? p.speed) * scale;
    const accel = intent.ram ? 360 : p.accel * Math.min(1.4, e.moveSpeed || 1) * (hasChip(e) ? CHIP.accel : 1);
    const brake = intent.ram || e.postChargeBrake ? 320 : p.brake * (hasChip(e) ? CHIP.brake : 1);
    if (e.postChargeBrake && length(e.vx, e.vy) < p.speed) e.postChargeBrake = false;
    const remaining = Math.max(0, range - (intent.arrivalRadius ?? 2));
    let speed = Math.min(maxSpeed, Math.sqrt(remaining * brake), remaining * 3);
    if (intent.stop) speed = 0;
    let vx = range > .01 ? dx / range * speed : 0, vy = range > .01 ? dy / range * speed : 0;
    if (!intent.ram && !intent.lock) {
      // Predict neighbours; separation requests use the same bounded actuator as navigation.
      for (const other of ctx.enemies) {
        if (other === e || other.dead || other.boss || other.tacticState === "ingress") continue;
        const ox = e.x + e.vx * .3 - other.x - (other.vx || 0) * .3;
        const oy = e.y + e.vy * .3 - other.y - (other.vy || 0) * .3;
        const gap = length(ox, oy), safe = e.r + other.r + 14;
        if (gap < safe) {
          const urgency = (safe - gap) / safe * 28;
          vx += (gap > .1 ? ox / gap : e.id < other.id ? -1 : 1) * urgency;
          vy += (gap > .1 ? oy / gap : 0) * urgency;
        }
      }
    }
    const margin = Math.max(16, (e.bodyRadius || e.r) + 7);
    const inArena = e.tacticState !== "ingress";
    const minY = inArena ? 20 : -180, maxY = ctx.height - margin;
    const stopSpeed = distance => Math.sqrt(Math.max(0, distance) * 2 * brake);
    vx = clamp(vx, -stopSpeed(e.x - margin), stopSpeed(ctx.width - margin - e.x));
    vy = clamp(vy, -stopSpeed(e.y - minY), stopSpeed(maxY - e.y));
    const vlen = length(vx, vy); if (vlen > maxSpeed && vlen > 0) { vx *= maxSpeed / vlen; vy *= maxSpeed / vlen; }
    const face = Number.isFinite(intent.face) ? intent.face : e.heading;
    const delta = angleDelta(face, e.heading);
    const turnLimit = p.turn * (hasChip(e) ? CHIP.turn : 1) * (e.movementModule === "weave" ? 1.1 : 1);
    e.turnRate = approach(e.turnRate, clamp(delta * 7, -turnLimit, turnLimit), turnLimit * 10 * dt);
    const turn = e.turnRate * dt;
    e.heading += Math.abs(turn) > Math.abs(delta) && Math.sign(turn) === Math.sign(delta) ? delta : turn;
    // Translation is independent of facing. Only a committed ram follows its frozen nose axis.
    if (intent.ram) {
      vx = Math.cos(e.heading) * speed; vy = Math.sin(e.heading) * speed;
    }
    // Locking a stabilized weapon never teleports the vessel. Contact may cancel the lock.
    if (intent.lock && length(e.vx, e.vy) < .35) { vx = 0; vy = 0; }
    // Include controller response distance before reaching the physical boundary.
    if (inArena) {
      const stopping = v => v * v / (2 * brake) + Math.abs(v) * .2 + 5;
      if ((e.vx > 0 && ctx.width - margin - e.x < stopping(e.vx)) || (e.vx < 0 && e.x - margin < stopping(e.vx))) vx = 0;
      if ((e.vy > 0 && maxY - e.y < stopping(e.vy)) || (e.vy < 0 && e.y - minY < stopping(e.vy))) vy = 0;
    }
    let ax = (vx - e.vx) / Math.max(dt, .14), ay = (vy - e.vy) / Math.max(dt, .14);
    const limit = speed < length(e.vx, e.vy) ? brake : accel;
    const alen = length(ax, ay); if (alen > limit) { ax *= limit / alen; ay *= limit / alen; }
    e.vx += ax * dt; e.vy += ay * dt;
    if (intent.lock && length(e.vx, e.vy) < .035) { e.vx = 0; e.vy = 0; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (inArena) {
      const x = clamp(e.x, margin, ctx.width - margin), y = clamp(e.y, minY, maxY);
      if (x !== e.x || y !== e.y) { e.boundaryCorrections++; if (x !== e.x) e.vx = 0; if (y !== e.y) e.vy = 0; e.x = x; e.y = y; }
    }
    const lateral = -Math.sin(e.heading) * ax + Math.cos(e.heading) * ay;
    e.bank += (clamp(-e.turnRate * .12 - lateral * .001, -p.bank, p.bank) - e.bank) * (1 - Math.exp(-dt * 6));
    e.pitch += (clamp(-(Math.cos(e.heading) * ax + Math.sin(e.heading) * ay) * .0007, -.075, .075) - e.pitch) * (1 - Math.exp(-dt * 5));
    e.throttle = clamp(length(e.vx, e.vy) / Math.max(1, p.speed * scale), 0, intent.ram ? 3 : 1);
    const forward = Math.cos(e.heading) * ax + Math.sin(e.heading) * ay;
    const forwardSpeed = Math.cos(e.heading) * e.vx + Math.sin(e.heading) * e.vy;
    const lateralSpeed = -Math.sin(e.heading) * e.vx + Math.cos(e.heading) * e.vy;
    const thrust = forward / Math.max(1, accel) + forwardSpeed / Math.max(1, maxSpeed) * .35;
    e.forwardThrust = clamp(thrust, 0, 1); e.reverseThrust = clamp(-thrust, 0, 1);
    e.sideThrust = clamp(lateral / Math.max(1, accel) + lateralSpeed / Math.max(1, maxSpeed) * .35, -1, 1);
    e.renderYaw = yaw(e.heading);
  }
  function aim(e, target, dt, bodyOnly = false) {
    const p = profile(e);
    const targetHeading = Math.atan2(target.y - e.y, target.x - e.x);
    const desired = bodyOnly || !p.turret ? 0 : clamp(angleDelta(yaw(targetHeading), yaw(e.heading)), -.61, .61);
    e.weaponYaw = approach(e.weaponYaw || 0, desired, 1.8 * dt);
    const axisYaw = yaw(e.heading) + e.weaponYaw;
    e.weaponAim = Math.atan2(-Math.cos(axisYaw) * 13.3, -Math.sin(axisYaw) * 21.5);
    e.aimError = Math.abs(angleDelta(targetHeading, e.weaponAim));
    return e.aimError;
  }
  function muzzle(e, slot = 0) {
    const scale = (e.boss ? 1.32 : e.elite ? 1.4 : 1.18) * (e.moduleScale || 1);
    const socket = hardpoints[e.type] || hardpoints.scout;
    const muzzleDepth = ["laser", "sniper"].includes(e.weaponModule) ? -.73 : e.weaponModule === "bomb" ? -.57 : -.62;
    const gunYaw = e.weaponYaw || 0;
    let x = Math.sin(gunYaw) * muzzleDepth + slot * .2, y = .25, z = socket[0] + Math.cos(gunYaw) * muzzleDepth;
    if (e.boss) { x = slot * 1.15; y = .3; z = -1.45; }
    // Same YXZ body transform used by the WebGL renderer.
    const bank = e.bank || 0, pitch = e.pitch || 0, bodyYaw = yaw(e.heading ?? Math.PI / 2);
    const bx = x * Math.cos(bank) - y * Math.sin(bank), by = x * Math.sin(bank) + y * Math.cos(bank);
    const py = by * Math.cos(pitch) - z * Math.sin(pitch), pz = by * Math.sin(pitch) + z * Math.cos(pitch);
    return { x: e.x + (bx * Math.cos(bodyYaw) + pz * Math.sin(bodyYaw)) * scale * 21.5,
      y: e.y + (-bx * Math.sin(bodyYaw) + pz * Math.cos(bodyYaw)) * scale * 13.3, height: .32 + py * scale };
  }
  function ray(origin, angle, width, height, extra = {}) {
    const reach = length(width, height) * 1.45;
    return { x1: origin.x, y1: origin.y, x2: origin.x + Math.cos(angle) * reach, y2: origin.y + Math.sin(angle) * reach, ...extra };
  }
  function beamRays(e, width = 480, height = 270) {
    if (e.attackCommit?.rays) return e.attackCommit.rays;
    const pattern = e.boss ? e.attackId : e.attackPattern;
    if (!isLaser(pattern)) return [];
    const origin = muzzle(e);
    const angle = e.weaponAim ?? Math.atan2(e.attackTargetY - origin.y, e.attackTargetX - origin.x);
    if (pattern === "railWall" || pattern === "doubleRail") return (pattern === "railWall" ? [-1, 0, 1] : [-1, 1]).map(side => {
      const start = muzzle(e, side);
      const endX = e.attackTargetX + side * (pattern === "railWall" ? 92 : 34);
      return ray(start, Math.atan2(height + 20 - start.y, endX - start.x), width, height, { width: pattern === "railWall" ? 5.8 : 7.2, color: side > 0 ? "#ffe16c" : "#70eaff" });
    });
    const sweep = pattern === "laserSweep" || (pattern === "sunLance" && e.phaseLevel >= 3);
    return (sweep ? [-.12, .12] : [0]).map(offset => ray(origin, angle + offset, width, height, { width: sweep ? 4.6 : e.elite ? 7 : 5.4 }));
  }
  function ramPath(e, target, width, height) {
    const angle = e.heading, nx = Math.cos(angle), ny = Math.sin(angle);
    const margin = Math.max(20, e.r + 10);
    let reach = length(target.x - e.x, target.y - e.y) + 35;
    for (const [value, direction, low, high] of [[e.x, nx, margin, width - margin], [e.y, ny, 24, height - margin]]) {
      if (Math.abs(direction) > .0001) reach = Math.min(reach, ((direction > 0 ? high : low) - value) / direction);
    }
    if (reach < 55) return null;
    return { x: e.x, y: e.y, endX: e.x + nx * reach, endY: e.y + ny * reach, angle, length: reach };
  }
  window.SpaceEnemyAI = Object.freeze({ profiles, profile, CHIP, chipFor, hasChip, aimLead, init, transition, chooseTarget, plan, flight, aim,
    hardpoints, yaw, angleDelta, muzzle, beamRays, ray, ramPath, isLaser, isRadial, committed });
})();
