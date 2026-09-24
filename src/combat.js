(() => {
  "use strict";

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const freezeAll = (items) => Object.freeze(items.map((item) => Object.freeze(item)));

  const BEATS = freezeAll([
    { id: "breach", nameKey: "combatBeat.breach", start: 0, end: .18, spawnRate: .92, fireRate: .88, bulletSpeed: .94, moveSpeed: 1.02, capBonus: 0, patternBonus: 0 },
    { id: "engage", nameKey: "combatBeat.engage", start: .18, end: .55, spawnRate: 1.08, fireRate: 1.08, bulletSpeed: 1.02, moveSpeed: 1.06, capBonus: 0, patternBonus: 0 },
    { id: "killzone", nameKey: "combatBeat.killzone", start: .55, end: .82, spawnRate: 1.24, fireRate: 1.2, bulletSpeed: 1.08, moveSpeed: 1.1, capBonus: 1, patternBonus: 1 },
    { id: "release", nameKey: "combatBeat.release", start: .82, end: 1, spawnRate: .82, fireRate: .8, bulletSpeed: .9, moveSpeed: .94, capBonus: -1, patternBonus: 0 },
  ]);

  const CHAPTER_PROFILES = freezeAll([
    {
      id: "academy",
      bounds: [.24, .6, .82, 1],
      pressureBase: .92,
      sectorStep: .055,
      pressure: [.88, .98, 1, .84],
      fireBase: .9,
      fire: [.9, .98, 1, .86],
      speedBase: .97,
      speed: [.92, .98, 1, .9],
      moveBase: 1,
      move: [.96, 1, 1, .92],
      cap: [0, 0, 0, -2],
      wing: [-.06, 0, .04, -.06],
    },
    {
      id: "crossfire",
      bounds: [.18, .50, .76, 1],
      pressureBase: 1.11,
      sectorStep: .075,
      pressure: [1.04, .97, 1.1, .94],
      fireBase: 1.03,
      fire: [1.06, .99, 1.1, .92],
      speedBase: 1.07,
      speed: [1.02, 1, 1.06, .96],
      moveBase: 1.08,
      move: [1.08, 1, 1.06, .97],
      cap: [4, 0, 4, -3],
      wing: [.06, .01, .1, -.03],
    },
    {
      id: "predator",
      bounds: [.16, .48, .78, 1],
      pressureBase: 1.18,
      sectorStep: .075,
      pressure: [1.08, 1.02, 1.12, .84],
      fireBase: 1.17,
      fire: [1.08, 1.04, 1.12, .82],
      speedBase: 1.15,
      speed: [1.04, 1.02, 1.06, .94],
      moveBase: 1.16,
      move: [1.12, 1.08, 1.14, 1.05],
      cap: [4, 2, 0, -8],
      wing: [.08, .04, .10, -.12],
    },
  ].map((profile) => ({
    ...profile,
    bounds: Object.freeze(profile.bounds),
    pressure: Object.freeze(profile.pressure),
    fire: Object.freeze(profile.fire),
    speed: Object.freeze(profile.speed),
    move: Object.freeze(profile.move),
    cap: Object.freeze(profile.cap),
    wing: Object.freeze(profile.wing),
  })));

  const FORMATIONS = freezeAll([
    { id: "vanguard", minStage: 0, minPattern: 0, weight: 6, members: [["scout", 0, 0], ["scout", -34, .18], ["scout", 34, .36]] },
    { id: "spear", minStage: 0, minPattern: 1, weight: 5, members: [["dart", 0, 0], ["scout", -42, .24], ["scout", 42, .38]] },
    { id: "hammer", minStage: 0, minPattern: 2, weight: 4, members: [["tank", 0, 0], ["dart", -54, .18], ["dart", 54, .32]] },
    { id: "crosslock", minStage: 1, minPattern: 2, weight: 5, members: [["spinner", -62, 0], ["spinner", 62, .3], ["lancer", 0, .52]] },
    { id: "snare", minStage: 1, minPattern: 3, weight: 4, members: [["mine", -52, 0], ["mine", 52, .2], ["lancer", 0, .44]] },
    { id: "citadel", minStage: 2, minPattern: 3, weight: 3, members: [["carrier", 0, 0], ["tank", -64, .28], ["spinner", 64, .5]] },
  ].map((formation) => ({ ...formation, members: Object.freeze(formation.members.map((member) => Object.freeze(member))) })));

  function beatForProgress(progress, stageIndex = 0) {
    const normalized = clamp(Number(progress) || 0, 0, .999999);
    const local = (normalized * 9) % 1;
    const profile = CHAPTER_PROFILES[clamp(Number(stageIndex) || 0, 0, 2)];
    const beatIndex = profile.bounds.findIndex((end) => local < end);
    return BEATS[beatIndex < 0 ? BEATS.length - 1 : beatIndex];
  }

  function curveFor(stageIndex, progress) {
    const stage = clamp(Number(stageIndex) || 0, 0, 2);
    const normalized = clamp(Number(progress) || 0, 0, 1);
    const sector = Math.min(2, Math.floor(normalized * 3));
    const profile = CHAPTER_PROFILES[stage];
    const beat = beatForProgress(normalized, stage);
    const beatIndex = BEATS.findIndex((entry) => entry.id === beat.id);
    const sectorLift = 1 + sector * profile.sectorStep;
    const openingRamp = stage === 0 && normalized < .06 ? .82 + normalized / .06 * .18 : 1;
    const patternTier = clamp(stage + sector + beat.patternBonus, 0, 5);
    return Object.freeze({
      beat,
      sector,
      profileId: profile.id,
      pressure: profile.pressureBase * sectorLift * beat.spawnRate * profile.pressure[beatIndex] * openingRamp,
      spawnRate: beat.spawnRate * profile.pressureBase * sectorLift * profile.pressure[beatIndex] * openingRamp,
      fireRate: beat.fireRate * profile.fireBase * profile.fire[beatIndex] * (1 + sector * (.025 + stage * .008)) * openingRamp,
      bulletSpeed: beat.bulletSpeed * profile.speedBase * profile.speed[beatIndex] * (1 + sector * (.018 + stage * .006)) * (.94 + openingRamp * .06),
      moveSpeed: beat.moveSpeed * profile.moveBase * profile.move[beatIndex] * (1 + sector * (.02 + stage * .006)),
      capBonus: beat.capBonus + sector + stage,
      patternTier,
      bulletCap: 46 + stage * 28 + sector * 9 + (beat.id === "killzone" ? 12 : 0) + profile.cap[beatIndex],
      wingChance: normalized < .045 && stage === 0 ? 0 : clamp(.2 + stage * .16 + sector * .08 + (beat.id === "killzone" ? .18 : 0) + profile.wing[beatIndex], 0, .82),
    });
  }

  function ambientEliteChance({ stageIndex = 0, progress = 0, threatTier = 0, beatId = "" } = {}) {
    const stage = clamp(Number(stageIndex) || 0, 0, 2);
    const normalized = clamp(Number(progress) || 0, 0, 1);
    if (stage === 0 && normalized < .25) return 0;
    if (stage === 0) {
      const academyChance = .014 + normalized * .012 + clamp(Number(threatTier) || 0, 0, 2) * .006 + (beatId === "killzone" ? .008 : 0);
      return clamp(academyChance, .014, .045);
    }
    const chance = .055 + stage * .035 + normalized * .045 + clamp(Number(threatTier) || 0, 0, 2) * .012 + (beatId === "killzone" ? .035 : 0);
    return clamp(chance, .055, .24);
  }

  function patternFor({ role, weaponId, weaponPattern = "", speciesPattern = "", patternTier = 0, cycle = 0, elite = false } = {}) {
    if (elite && cycle % 3 === 2) return cycle % 2 ? "eliteCross" : "eliteHalo";
    if (speciesPattern && cycle % 3 === 0) return speciesPattern;
    if (weaponPattern && (!speciesPattern || cycle % 3 === 1)) return weaponPattern;
    if (weaponId === "sniper") return patternTier >= 3 && cycle % 2 ? "twinLance" : "lance";
    if (role === "denial") return patternTier >= 3 ? "seedCluster" : "seedMine";
    if (role === "bulwark") return patternTier >= 2 ? "laneWall" : "heavyFan";
    if (role === "artillery" || weaponId === "orbit") return patternTier >= 3 ? "counterSpiral" : "spiral";
    if (role === "flanker") return patternTier >= 2 ? "pincer" : "predictiveFan";
    if (role === "command") return patternTier >= 4 ? "commandCross" : "commandSalvo";
    if (role === "striker") return patternTier >= 2 ? "predictiveFan" : "snapBurst";
    if (weaponId === "twin") return patternTier >= 2 ? "predictiveFan" : "twinBurst";
    return patternTier >= 3 && cycle % 3 === 2 ? "sweep" : "snapBurst";
  }

  function chooseFormation({ stageIndex = 0, patternTier = 0, random = Math.random } = {}) {
    const candidates = FORMATIONS.filter((formation) => formation.minStage <= stageIndex && formation.minPattern <= patternTier);
    const total = candidates.reduce((sum, formation) => sum + formation.weight, 0);
    let roll = random() * total;
    for (const formation of candidates) {
      roll -= formation.weight;
      if (roll <= 0) return formation;
    }
    return candidates.at(-1) || FORMATIONS[0];
  }

  window.SpaceCombat = Object.freeze({
    BEATS,
    CHAPTER_PROFILES,
    FORMATIONS,
    beatForProgress,
    curveFor,
    ambientEliteChance,
    patternFor,
    chooseFormation,
  });
})();
