(() => {
  "use strict";

  const TIERS = Object.freeze([
    Object.freeze({ id: "relief", nameKey: "threat.relief", color: "#68f4df", spawnRate: .82, bulletSpeed: .84, fireRate: .84, enemyHp: .92, moveSpeed: .94, aimSpread: 1.16, capBonus: -1, score: 1, bpm: -3, music: .9 }),
    Object.freeze({ id: "cruise", nameKey: "threat.cruise", color: "#76dbff", spawnRate: .94, bulletSpeed: .92, fireRate: .94, enemyHp: .97, moveSpeed: .98, aimSpread: 1.08, capBonus: 0, score: 1, bpm: 0, music: 1 }),
    Object.freeze({ id: "strike", nameKey: "threat.strike", color: "#ffe16c", spawnRate: 1, bulletSpeed: 1, fireRate: 1, enemyHp: 1, moveSpeed: 1, aimSpread: 1, capBonus: 0, score: 1.05, bpm: 2, music: 1.06 }),
    Object.freeze({ id: "surge", nameKey: "threat.surge", color: "#ff936b", spawnRate: 1.08, bulletSpeed: 1.05, fireRate: 1.08, enemyHp: 1.05, moveSpeed: 1.04, aimSpread: .91, capBonus: 1, score: 1.12, bpm: 5, music: 1.14 }),
    Object.freeze({ id: "apex", nameKey: "threat.apex", color: "#ff67d4", spawnRate: 1.16, bulletSpeed: 1.09, fireRate: 1.14, enemyHp: 1.1, moveSpeed: 1.07, aimSpread: .84, capBonus: 2, score: 1.22, bpm: 8, music: 1.24 }),
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
    const momentum = combo * .018 + killsPerMinute * .012 + (state.rushActive ? .42 : 0) + (state.linked ? .12 : 0);
    const distress = (1 - healthRatio) * .92 + downed * 1.2 + recentDamage * .5;
    const score = clamp(base + momentum - distress, 0, 4);
    let tier = tierForScore(score);
    if (downed > 0 || healthRatio < .34) tier = 0;
    else if (healthRatio < .52) tier = Math.min(tier, 1);
    if (stageIndex === 0 && progress < .4) tier = Math.min(tier, 1);
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
