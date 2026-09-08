(() => {
  "use strict";

  const PLAYER_RADII = Object.freeze({
    comet: Object.freeze({ hurt: 3.2, body: 3.6, pickup: 5.5 }),
    bulwark: Object.freeze({ hurt: 3.6, body: 4.1, pickup: 6.2 }),
    pulse: Object.freeze({ hurt: 2.8, body: 3.3, pickup: 5 }),
  });

  const FALLBACK_RADII = PLAYER_RADII.comet;

  function playerRadii(frameId) {
    return PLAYER_RADII[frameId] || FALLBACK_RADII;
  }

  function finiteRadius(value) {
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function squaredDistance(a, b) {
    const dx = (Number(a?.x) || 0) - (Number(b?.x) || 0);
    const dy = (Number(a?.y) || 0) - (Number(b?.y) || 0);
    return dx * dx + dy * dy;
  }

  function circlesOverlap(a, radiusA, b, radiusB) {
    const range = finiteRadius(radiusA) + finiteRadius(radiusB);
    return squaredDistance(a, b) <= range * range;
  }

  function hostileBulletHitsPlayer(bullet, player) {
    return circlesOverlap(bullet, bullet?.r, player, player?.hurtRadius);
  }

  function hostileBlastHitsPlayer(blast, player, radius = blast?.blastRadius) {
    return circlesOverlap(blast, radius, player, player?.hurtRadius);
  }

  function bodyHitsPlayer(body, player) {
    return circlesOverlap(body, body?.bodyRadius ?? body?.r, player, player?.bodyRadius);
  }

  function pickupTouchesPlayer(pickup, player, padding = 2) {
    return circlesOverlap(pickup, finiteRadius(pickup?.r) + finiteRadius(padding), player, player?.pickupRadius);
  }

  window.SpaceCollision = Object.freeze({
    PLAYER_RADII,
    playerRadii,
    squaredDistance,
    circlesOverlap,
    hostileBulletHitsPlayer,
    hostileBlastHitsPlayer,
    bodyHitsPlayer,
    pickupTouchesPlayer,
  });
})();
