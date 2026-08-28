(() => {
  const STAGE_DURATIONS = Object.freeze([570, 600, 630]);
  const EVENT_POINTS = Object.freeze([.08, .18, .28, .38, .48, .58, .68, .78, .88]);
  const ENCOUNTER_POINTS = Object.freeze([.14, .34, .58, .79]);
  const MID_DRAFT_POINTS = Object.freeze([.25, .72]);
  const SECTORS_PER_STAGE = 3;
  const TOTAL_SECTORS = STAGE_DURATIONS.length * SECTORS_PER_STAGE;
  const TOTAL_FORMATION_EVENTS = STAGE_DURATIONS.length * EVENT_POINTS.length;
  const TOTAL_ENCOUNTERS = STAGE_DURATIONS.length * ENCOUNTER_POINTS.length;
  const TOTAL_DRAFTS = STAGE_DURATIONS.length * MID_DRAFT_POINTS.length + STAGE_DURATIONS.length - 1;
  const BASE_RUN_SECONDS = STAGE_DURATIONS.reduce((sum, seconds) => sum + seconds, 0);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function sectorForProgress(progress) {
    return Math.min(SECTORS_PER_STAGE - 1, Math.floor(clamp(progress, 0, .999999) * SECTORS_PER_STAGE));
  }

  function globalSector(stageIndex, sectorIndex) {
    return clamp(stageIndex, 0, STAGE_DURATIONS.length - 1) * SECTORS_PER_STAGE
      + clamp(sectorIndex, 0, SECTORS_PER_STAGE - 1) + 1;
  }

  function buildEventTimeline(templates) {
    if (!Array.isArray(templates) || templates.length === 0) return Object.freeze([]);
    return Object.freeze(EVENT_POINTS.map((at, sequence) => Object.freeze({
      ...templates[sequence % templates.length],
      at,
      sequence,
      tier: Math.floor(sequence / templates.length) + 1,
    })));
  }

  function intensityFor(stageIndex, progress) {
    const sector = sectorForProgress(progress);
    return Object.freeze({
      sector,
      enemyCapBonus: sector + Math.floor(clamp(progress, 0, 1) * 2),
      spawnCadence: 1 + stageIndex * .04 + sector * .055,
      musicLift: sector * 2,
    });
  }

  function timeScale({ bossState = false, fast = false, voxel = false } = {}) {
    if (bossState) return 180;
    if (fast && !voxel) return 90;
    return 1;
  }

  window.SpaceDirector = Object.freeze({
    STAGE_DURATIONS,
    EVENT_POINTS,
    ENCOUNTER_POINTS,
    MID_DRAFT_POINTS,
    SECTORS_PER_STAGE,
    TOTAL_SECTORS,
    TOTAL_FORMATION_EVENTS,
    TOTAL_ENCOUNTERS,
    TOTAL_DRAFTS,
    BASE_RUN_SECONDS,
    sectorForProgress,
    globalSector,
    buildEventTimeline,
    intensityFor,
    timeScale,
  });
})();
