(() => {
  "use strict";

  const TIERS = Object.freeze([
    Object.freeze({ id: "relief", nameKey: "threat.relief", color: "#68f4df", spawnRate: .8, bulletSpeed: .84, fireRate: .8, enemyHp: .9, moveSpeed: .92, aimSpread: 1.2, capBonus: -1, score: 1, bpm: -4, music: .88 }),
    Object.freeze({ id: "cruise", nameKey: "threat.cruise", color: "#76dbff", spawnRate: .96, bulletSpeed: .94, fireRate: .96, enemyHp: .98, moveSpeed: .99, aimSpread: 1.08, capBonus: 0, score: 1, bpm: 0, music: 1 }),
    Object.freeze({ id: "strike", nameKey: "threat.strike", color: "#ffe16c", spawnRate: 1.1, bulletSpeed: 1.04, fireRate: 1.1, enemyHp: 1.04, moveSpeed: 1.06, aimSpread: .96, capBonus: 1, score: 1.08, bpm: 3, music: 1.09 }),
    Object.freeze({ id: "surge", nameKey: "threat.surge", color: "#ff936b", spawnRate: 1.24, bulletSpeed: 1.12, fireRate: 1.24, enemyHp: 1.1, moveSpeed: 1.12, aimSpread: .84, capBonus: 2, score: 1.18, bpm: 7, music: 1.19 }),
    Object.freeze({ id: "apex", nameKey: "threat.apex", color: "#ff67d4", spawnRate: 1.38, bulletSpeed: 1.2, fireRate: 1.38, enemyHp: 1.18, moveSpeed: 1.18, aimSpread: .74, capBonus: 3, score: 1.32, bpm: 11, music: 1.32 }),
  ]);
  const THRESHOLDS = Object.freeze([.65, 1.35, 2.1, 2.85]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function tierForScore(score) {
    let tier = 0;
    for (const threshold of THRESHOLDS) if (score >= threshold) tier += 1;
    return clamp(tier, 0, TIERS.length - 1);
  }

  function evaluate(state = {}) {
    const stageIndex = clamp(Number(state.stageIndex) || 0, 0, 2);
    const sectorIndex = clamp(Number(state.sectorIndex) || 0, 0, 2);
    const progress = clamp(Number(state.progress) || 0, 0, 1);
    const healthRatio = clamp(Number.isFinite(state.healthRatio) ? state.healthRatio : 1, 0, 1);
    const downed = clamp(Number(state.downed) || 0, 0, 2);
    const combo = clamp(Number(state.combo) || 0, 0, 40);
    const killsPerMinute = clamp(Number(state.killsPerMinute) || 0, 0, 30);
    const recentDamage = clamp(Number(state.recentDamage) || 0, 0, 1);
    const contractPressure = clamp(Number(state.contractPressure) || 0, 0, .5);
    const base = .52 + stageIndex * .55 + sectorIndex * .28 + progress * .42 + contractPressure;
    // Growth must pay off: success never adds pressure to the normal contract.
    const momentum = contractPressure > 0 ? Math.min(.25, combo * .004 + killsPerMinute * .003) : 0;
    const distress = (1 - healthRatio) * .92 + downed * 1.2 + recentDamage * .5;
    const score = clamp(base + momentum - distress, 0, 4);
    let tier = tierForScore(score);
    if (downed > 0 || healthRatio < .34) tier = 0;
    else if (healthRatio < .52) tier = Math.min(tier, 1);
    if (stageIndex === 0 && progress < .08) tier = Math.min(tier, 1);
    return Object.freeze({ score, tier, config: TIERS[tier], base, momentum, distress });
  }

  function stepTier(currentTier, desiredTier) {
    const current = clamp(Number(currentTier) || 0, 0, TIERS.length - 1);
    const desired = clamp(Number(desiredTier) || 0, 0, TIERS.length - 1);
    return current + Math.sign(desired - current);
  }

  function contractPressure(contractId) {
    if (contractId === "overdrive") return .5;
    if (contractId === "storm") return .25;
    return 0;
  }

  window.SpaceThreat = Object.freeze({ TIERS, THRESHOLDS, HOLD_SECONDS: 1.25, tierForScore, evaluate, stepTier, contractPressure });
})();
