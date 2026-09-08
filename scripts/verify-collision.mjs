import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/collision.js", import.meta.url), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: "src/collision.js" });

const collision = sandbox.window.SpaceCollision;
assert.deepEqual({ ...collision.playerRadii("comet") }, { hurt: 3.2, body: 3.6, pickup: 5.5 });
assert.deepEqual({ ...collision.playerRadii("bulwark") }, { hurt: 3.6, body: 4.1, pickup: 6.2 });
assert.deepEqual({ ...collision.playerRadii("pulse") }, { hurt: 2.8, body: 3.3, pickup: 5 });

const pilot = { x: 20, y: 20, hurtRadius: 3.2, bodyRadius: 3.6, pickupRadius: 5.5 };
assert.equal(collision.hostileBulletHitsPlayer({ x: 25.19, y: 20, r: 2 }, pilot), true, "a hostile bullet just inside the hurt core must hit");
assert.equal(collision.hostileBulletHitsPlayer({ x: 25.21, y: 20, r: 2 }, pilot), false, "a hostile bullet just outside the hurt core must miss");
assert.equal(collision.hostileBlastHitsPlayer({ x: 33.19, y: 20, blastRadius: 10 }, pilot), true, "a blast just inside the hurt core must hit");
assert.equal(collision.hostileBlastHitsPlayer({ x: 33.21, y: 20, blastRadius: 10 }, pilot), false, "a blast just outside the hurt core must miss");
assert.equal(collision.bodyHitsPlayer({ x: 31.59, y: 20, bodyRadius: 8 }, pilot), true, "body contact must use the physical body radius");
assert.equal(collision.bodyHitsPlayer({ x: 31.61, y: 20, bodyRadius: 8 }, pilot), false, "body contact must not borrow the pickup radius");
assert.equal(collision.pickupTouchesPlayer({ x: 34.49, y: 20, r: 7 }, pilot), true, "pickup reach must remain generous");
assert.equal(collision.pickupTouchesPlayer({ x: 34.51, y: 20, r: 7 }, pilot), false, "pickup reach must still have a deterministic edge");
assert.ok(collision.playerRadii("comet").hurt < collision.playerRadii("comet").body);
assert.ok(collision.playerRadii("comet").body < collision.playerRadii("comet").pickup);

console.log("Collision grammar verified: separate hurt, body and pickup radii with deterministic inside/outside boundaries.");
