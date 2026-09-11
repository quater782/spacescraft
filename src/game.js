const canvas = document.querySelector("#game");
const sceneCanvas = document.querySelector("#scene");
const ctx = canvas.getContext("2d", { alpha: true });
const renderer3D = new SpaceRenderer3D(sceneCanvas);
const menu = document.querySelector("#menu");
const result = document.querySelector("#result");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");
const resultMenuButton = document.querySelector("#resultMenuButton");
const soundButton = document.querySelector("#soundButton");
const fullscreenButton = document.querySelector("#fullscreenButton");
const topSettingsButton = document.querySelector("#topSettingsButton");
const viewport = document.querySelector("#viewport");
const toastElement = document.querySelector("#toast");
const tutorial = document.querySelector("#tutorial");
const tutorialContinueButton = document.querySelector("#tutorialContinueButton");
const upgradePanel = document.querySelector("#upgradePanel");
const upgradeOptions = document.querySelector("#upgradeOptions");
const runSeedLabel = document.querySelector("#runSeedLabel");
const draftProgress = document.querySelector("#draftProgress");
const buildTray = document.querySelector("#buildTray");
const resultBuild = document.querySelector("#resultBuild");
const pauseMenu = document.querySelector("#pauseMenu");
const resumeButton = document.querySelector("#resumeButton");
const pauseSettingsButton = document.querySelector("#pauseSettingsButton");
const exitToMenuButton = document.querySelector("#exitToMenuButton");
const settingsPanel = document.querySelector("#settingsPanel");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const musicVolume = document.querySelector("#musicVolume");
const musicVolumeValue = document.querySelector("#musicVolumeValue");
const sfxVolume = document.querySelector("#sfxVolume");
const sfxVolumeValue = document.querySelector("#sfxVolumeValue");
const qualitySetting = document.querySelector("#qualitySetting");
const shakeSetting = document.querySelector("#shakeSetting");
const flashSetting = document.querySelector("#flashSetting");
const bulletContrastSetting = document.querySelector("#bulletContrastSetting");
const languageSetting = document.querySelector("#languageSetting");
const careerSummary = document.querySelector("#careerSummary");
const resetSaveButton = document.querySelector("#resetSaveButton");
const hangarButton = document.querySelector("#hangarButton");
const hangarPanel = document.querySelector("#hangarPanel");
const closeHangarButton = document.querySelector("#closeHangarButton");
const menuStardust = document.querySelector("#menuStardust");
const hangarStardust = document.querySelector("#hangarStardust");
const shipOptions = document.querySelector("#shipOptions");
const moduleOptions = document.querySelector("#moduleOptions");
const contractOptions = document.querySelector("#contractOptions");
const talentOptions = document.querySelector("#talentOptions");
const talentProgress = document.querySelector("#talentProgress");
const achievementOptions = document.querySelector("#achievementOptions");
const achievementCount = document.querySelector("#achievementCount");
const modeButtons = [...document.querySelectorAll(".mode-button")];
const p2ModeBadge = document.querySelector("#p2ModeBadge");
const p2ControlText = document.querySelector("#p2ControlText");

const W = canvas.width;
const H = canvas.height;
let hudScaleX = 1;
let hudScaleY = 1;

function resizeHudCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(W, Math.min(2560, Math.round(bounds.width * pixelRatio)));
  const height = Math.max(H, Math.min(1440, Math.round(bounds.height * pixelRatio)));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  hudScaleX = canvas.width / W;
  hudScaleY = canvas.height / H;
  ctx.imageSmoothingEnabled = false;
}
const TAU = Math.PI * 2;
const STEP = 1 / 60;
const URL_PARAMS = new URLSearchParams(window.location.search);
const LOCAL_QA_HOST = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const QA_FAST_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-fast");
const QA_WALLET_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-wallet");
const QA_CONTRACTS_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-contracts");
const QA_DRAFT_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-draft");
const QA_RUSH_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-rush");
const QA_NOVA_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-nova");
const QA_BUFFS_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-buffs");
const QA_VOXEL_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-voxel");
const QA_FORCE_ELITE = LOCAL_QA_HOST && QA_VOXEL_MODE && URL_PARAMS.has("qa-elite");
const REQUESTED_QA_GROWTH = LOCAL_QA_HOST && QA_VOXEL_MODE ? URL_PARAMS.get("qa-growth") : null;
const QA_GROWTH_MODE = ["mid", "capstone"].includes(REQUESTED_QA_GROWTH) ? REQUESTED_QA_GROWTH : null;
const QA_MODEL_GALLERY = LOCAL_QA_HOST && URL_PARAMS.has("qa-model-gallery");
const QA_BOSS_GALLERY = LOCAL_QA_HOST && URL_PARAMS.has("qa-boss-gallery");
const QA_BOSS_STATE_MODE = LOCAL_QA_HOST && URL_PARAMS.has("qa-boss-state");
const REQUESTED_QA_BOSS_PHASE = Number.parseInt(URL_PARAMS.get("qa-boss-phase") || "", 10);
const QA_BOSS_PHASE = [1, 2, 3].includes(REQUESTED_QA_BOSS_PHASE) ? REQUESTED_QA_BOSS_PHASE : 3;
const REQUESTED_QA_THREAT = LOCAL_QA_HOST ? Number.parseInt(URL_PARAMS.get("qa-threat") || "", 10) : Number.NaN;
const QA_THREAT_TIER = [0, 1, 2, 3, 4].includes(REQUESTED_QA_THREAT) ? REQUESTED_QA_THREAT : null;
const REQUESTED_QA_COMBAT_STAGE = LOCAL_QA_HOST ? Number.parseInt(URL_PARAMS.get("qa-combat-stage") || "", 10) : Number.NaN;
const QA_COMBAT_STAGE = [1, 2, 3].includes(REQUESTED_QA_COMBAT_STAGE) ? REQUESTED_QA_COMBAT_STAGE - 1 : null;
const REQUESTED_QA_COMBAT_PROGRESS = LOCAL_QA_HOST ? Number.parseFloat(URL_PARAMS.get("qa-combat-progress") || "") : Number.NaN;
const QA_COMBAT_PROGRESS = Number.isFinite(REQUESTED_QA_COMBAT_PROGRESS) && REQUESTED_QA_COMBAT_PROGRESS >= 0 && REQUESTED_QA_COMBAT_PROGRESS < .96
  ? REQUESTED_QA_COMBAT_PROGRESS
  : null;
const REQUESTED_QA_ANOMALY = LOCAL_QA_HOST ? URL_PARAMS.get("qa-anomaly") : null;
const QA_ANOMALY_ID = SpaceAnomalies.ANOMALIES.some((anomaly) => anomaly.id === REQUESTED_QA_ANOMALY)
  ? REQUESTED_QA_ANOMALY
  : null;
const REQUESTED_QA_STATUS = LOCAL_QA_HOST ? URL_PARAMS.get("qa-status") : null;
const QA_STATUS_ID = SpaceStatus.DEBUFF_MODULES.some((debuff) => debuff.id === REQUESTED_QA_STATUS) ? REQUESTED_QA_STATUS : null;
const REQUESTED_QA_PROTOCOL = LOCAL_QA_HOST ? URL_PARAMS.get("qa-protocol") : null;
const QA_PROTOCOL_ID = SpaceRelics.PROTOCOLS.some((protocol) => protocol.id === REQUESTED_QA_PROTOCOL)
  ? REQUESTED_QA_PROTOCOL
  : null;
const REQUESTED_QA_PATH = LOCAL_QA_HOST ? Number.parseInt(URL_PARAMS.get("qa-path") || "", 10) : Number.NaN;
const QA_PATH_INDEX = [0, 1, 2].includes(REQUESTED_QA_PATH) ? REQUESTED_QA_PATH : null;
const REQUESTED_QA_BIOME = LOCAL_QA_HOST ? URL_PARAMS.get("qa-biome") : null;
const QA_BIOME_ID = SpaceExpedition.BIOMES.some((biome) => biome.id === REQUESTED_QA_BIOME) ? REQUESTED_QA_BIOME : null;
const REQUESTED_QA_ENCOUNTER = LOCAL_QA_HOST ? URL_PARAMS.get("qa-encounter") : null;
const QA_ENCOUNTER_ID = SpaceExpedition.ENCOUNTER_PROTOCOLS.some((encounter) => encounter.id === REQUESTED_QA_ENCOUNTER)
  ? REQUESTED_QA_ENCOUNTER
  : null;
const REQUESTED_QA_ENEMY = LOCAL_QA_HOST ? URL_PARAMS.get("qa-enemy") : null;
const REQUESTED_QA_HULL = LOCAL_QA_HOST ? URL_PARAMS.get("qa-hull") : null;
const QA_HULL_ID = SpaceExpedition.HULL_MODULES.some((hull) => hull.id === REQUESTED_QA_HULL) ? REQUESTED_QA_HULL : null;
let QA_ENEMY_MODULE_IDS = null;
const QA_ENEMY_BUILD = (() => {
  if (!REQUESTED_QA_ENEMY) return null;
  const parts = REQUESTED_QA_ENEMY.split(".");
  const pools = [SpaceExpedition.MOVEMENT_MODULES, SpaceExpedition.WEAPON_MODULES, SpaceExpedition.CORE_MODULES, SpaceExpedition.AI_MODULES, SpaceExpedition.PAYLOAD_MODULES];
  if (parts.length !== pools.length || parts.some((id, index) => !pools[index].some((module) => module.id === id))) return null;
  QA_ENEMY_MODULE_IDS = parts;
  return SpaceExpedition.build(...parts, 2, QA_HULL_ID || "scout");
})();
const REQUESTED_RUN_SEED = Number.parseInt(URL_PARAMS.get("seed") || "", 10);
const QA_LABEL = [QA_FAST_MODE && "fast", QA_WALLET_MODE && "wallet", QA_CONTRACTS_MODE && "contracts", QA_DRAFT_MODE && "draft", QA_RUSH_MODE && "rush", QA_NOVA_MODE && "nova", QA_BUFFS_MODE && "buffs", QA_VOXEL_MODE && "voxel", QA_FORCE_ELITE && "elite", QA_GROWTH_MODE && `growth-${QA_GROWTH_MODE}`, QA_MODEL_GALLERY && "model-gallery", QA_BOSS_GALLERY && "boss-gallery", (QA_BOSS_GALLERY || QA_BOSS_STATE_MODE) && `boss-phase${QA_BOSS_PHASE}`, QA_BOSS_STATE_MODE && "boss-state", QA_THREAT_TIER !== null && `threat${QA_THREAT_TIER}`, QA_COMBAT_STAGE !== null && `combat-stage${QA_COMBAT_STAGE + 1}`, QA_COMBAT_PROGRESS !== null && `combat-progress${QA_COMBAT_PROGRESS}`, QA_ANOMALY_ID && `anomaly-${QA_ANOMALY_ID}`, QA_STATUS_ID && `status-${QA_STATUS_ID}`, QA_PROTOCOL_ID && `protocol-${QA_PROTOCOL_ID}`, QA_PATH_INDEX !== null && `path${QA_PATH_INDEX}`, QA_BIOME_ID && `biome-${QA_BIOME_ID}`, QA_ENCOUNTER_ID && `encounter-${QA_ENCOUNTER_ID}`, QA_HULL_ID && `hull-${QA_HULL_ID}`, QA_ENEMY_BUILD && `enemy-${QA_ENEMY_BUILD.moduleSignature}`].filter(Boolean).join("+") || "off";
const t = (key, variables) => SpaceI18n.t(key, variables);
const UPGRADE_DEFS = SpaceRoguelike.UPGRADE_DEFS;
const TALENT_NODES = SpaceConstellation.TALENT_NODES;
const RUSH_CONFIG = SpaceRush.RUSH_CONFIG;
const NOVA_CONFIG = SpaceRush.NOVA_CONFIG;
const PROTOCOLS = SpaceRelics.PROTOCOLS;
const BUFF_MODULES = SpaceStatus.BUFF_MODULES;
const DEBUFF_MODULES = SpaceStatus.DEBUFF_MODULES;
const DIRECTOR = SpaceDirector;
const THREAT_TIERS = SpaceThreat.TIERS;
const COMBAT = SpaceCombat;
const ANOMALIES = SpaceAnomalies.ANOMALIES;
const QA_GROWTH_PLANS = Object.freeze({
  mid: Object.freeze({ overclock: 2, prism: 1, drone: 1 }),
  capstone: Object.freeze({ overclock: 2, prism: 3, drone: 3 }),
});

ctx.imageSmoothingEnabled = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
let rngStreams = SpaceRng.createStreams(1);
let combatRandom = rngStreams.combat;
let draftRandom = rngStreams.draft;
let lootRandom = rngStreams.loot;
let routeRandom = rngStreams.route;
let visualRandom = rngStreams.cosmetic;
const setRunRandomSeed = (seed) => {
  const normalized = (Number(seed) >>> 0) || 0x6d2b79f5;
  rngStreams = SpaceRng.createStreams(normalized);
  combatRandom = rngStreams.combat;
  draftRandom = rngStreams.draft;
  lootRandom = rngStreams.loot;
  routeRandom = rngStreams.route;
  visualRandom = rngStreams.cosmetic;
};
const random = () => combatRandom();
const visualRand = (min, max) => min + visualRandom() * (max - min);
const createRunSeed = () => {
  if (Number.isFinite(REQUESTED_RUN_SEED)) return (REQUESTED_RUN_SEED >>> 0) || 1;
  const values = new Uint32Array(1);
  window.crypto?.getRandomValues?.(values);
  return values[0] || ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0) || 1;
};
const rand = (min, max) => min + random() * (max - min);
const choose = (items) => items[Math.floor(random() * items.length)];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const SAVE_KEY = "spacecraft-career-v1";
const reduceMotionPreferred = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SHIP_FRAMES = [
  {
    id: "comet",
    nameKey: "frame.comet.name",
    tag: "BALANCED",
    descriptionKey: "frame.comet.description",
    statsKey: "frame.comet.stats",
    cost: 0,
    hp: 7,
    speed: 91,
    damage: 1,
    fireRate: 1,
    energyGain: 1,
    novaDamage: 1,
    radius: 5.5,
  },
  {
    id: "bulwark",
    nameKey: "frame.bulwark.name",
    tag: "HEAVY",
    descriptionKey: "frame.bulwark.description",
    statsKey: "frame.bulwark.stats",
    cost: 420,
    hp: 9,
    speed: 79,
    damage: 1.08,
    fireRate: 0.9,
    energyGain: 0.9,
    novaDamage: 1,
    radius: 6.2,
  },
  {
    id: "pulse",
    nameKey: "frame.pulse.name",
    tag: "INTERCEPTOR",
    descriptionKey: "frame.pulse.description",
    statsKey: "frame.pulse.stats",
    cost: 720,
    hp: 6,
    speed: 108,
    damage: 0.92,
    fireRate: 1.24,
    energyGain: 1.22,
    novaDamage: 1.18,
    radius: 5,
  },
];

const CORE_MODULES = [
  {
    id: "flux",
    nameKey: "module.flux.name",
    tag: "ENERGY",
    descriptionKey: "module.flux.description",
    cost: 0,
    energyGain: 1.18,
  },
  {
    id: "aegis",
    nameKey: "module.aegis.name",
    tag: "DEFENSE",
    descriptionKey: "module.aegis.description",
    cost: 260,
    startShield: 1,
    maxShield: 4,
  },
  {
    id: "repair",
    nameKey: "module.repair.name",
    tag: "RESCUE",
    descriptionKey: "module.repair.description",
    cost: 420,
    stageRepair: 1,
    reviveHp: 4,
  },
  {
    id: "resonance",
    nameKey: "module.resonance.name",
    tag: "CO-OP",
    descriptionKey: "module.resonance.description",
    cost: 560,
    linkRange: 122,
    beamDamage: 1.55,
  },
];

const FLIGHT_CONTRACTS = [
  {
    id: "patrol",
    nameKey: "contract.patrol.name",
    tag: "STANDARD · ×1.0",
    descriptionKey: "contract.patrol.description",
    unlockKey: "contract.patrol.unlock",
    enemyHp: 1,
    bulletSpeed: 1,
    spawnRate: 1,
    playerHpDelta: 0,
    playerDamage: 1,
    playerEnergy: 1,
    score: 1,
    stardust: 1,
  },
  {
    id: "storm",
    nameKey: "contract.storm.name",
    tag: "VETERAN · ×1.3",
    descriptionKey: "contract.storm.description",
    unlockKey: "contract.storm.unlock",
    enemyHp: 1.16,
    bulletSpeed: 1.1,
    spawnRate: 1.14,
    playerHpDelta: 0,
    playerDamage: 1,
    playerEnergy: 1,
    score: 1.3,
    stardust: 1.25,
  },
  {
    id: "overdrive",
    nameKey: "contract.overdrive.name",
    tag: "EXPERT · ×1.65",
    descriptionKey: "contract.overdrive.description",
    unlockKey: "contract.overdrive.unlock",
    enemyHp: 1.25,
    bulletSpeed: 1.08,
    spawnRate: 1.2,
    playerHpDelta: -2,
    playerDamage: 1.28,
    playerEnergy: 1.2,
    score: 1.65,
    stardust: 1.55,
  },
];

const ACHIEVEMENTS = [
  { id: "firstFlight", nameKey: "achievement.firstFlight.name", descriptionKey: "achievement.firstFlight.description" },
  { id: "routeTwo", nameKey: "achievement.routeTwo.name", descriptionKey: "achievement.routeTwo.description" },
  { id: "campaignClear", nameKey: "achievement.campaignClear.name", descriptionKey: "achievement.campaignClear.description" },
  { id: "combo20", nameKey: "achievement.combo20.name", descriptionKey: "achievement.combo20.description" },
  { id: "ace100", nameKey: "achievement.ace100.name", descriptionKey: "achievement.ace100.description" },
  { id: "fullHangar", nameKey: "achievement.fullHangar.name", descriptionKey: "achievement.fullHangar.description" },
  { id: "stormClear", nameKey: "achievement.stormClear.name", descriptionKey: "achievement.stormClear.description" },
  { id: "overdriveClear", nameKey: "achievement.overdriveClear.name", descriptionKey: "achievement.overdriveClear.description" },
];

function contractIsUnlocked(contract, state) {
  if (contract.id === "storm") return state.highestStage >= 2;
  if (contract.id === "overdrive") return state.clears >= 1;
  return true;
}

function achievementIsEarned(achievement, state) {
  if (achievement.id === "firstFlight") return state.runs >= 1;
  if (achievement.id === "routeTwo") return state.highestStage >= 2;
  if (achievement.id === "campaignClear") return state.clears >= 1;
  if (achievement.id === "combo20") return state.bestCombo >= 20;
  if (achievement.id === "ace100") return state.totalKills >= 100;
  if (achievement.id === "fullHangar") return state.unlockedFrames.length === SHIP_FRAMES.length && state.unlockedModules.length === CORE_MODULES.length;
  if (achievement.id === "stormClear") return (state.contractClears?.storm || 0) >= 1;
  if (achievement.id === "overdriveClear") return (state.contractClears?.overdrive || 0) >= 1;
  return false;
}

function grantEligibleAchievements(state) {
  const unlocked = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!state.achievements.includes(achievement.id) && achievementIsEarned(achievement, state)) {
      state.achievements.push(achievement.id);
      unlocked.push(achievement);
    }
  }
  return unlocked;
}

const DEFAULT_PROFILE = {
  version: 6,
  highScore: 0,
  totalKills: 0,
  bestCombo: 0,
  runs: 0,
  clears: 0,
  totalPlaySeconds: 0,
  highestStage: 0,
  stardust: 0,
  lifetimeStardust: 0,
  tutorialSeen: false,
  selectedMode: "solo",
  selectedFrame: "comet",
  selectedModule: "flux",
  selectedContract: "patrol",
  unlockedFrames: ["comet"],
  unlockedModules: ["flux"],
  talents: [],
  research: SpaceResearch.sanitize(),
  achievements: [],
  contractClears: { patrol: 0, storm: 0, overdrive: 0 },
  settings: {
    music: 0.75,
    sfx: 0.8,
    quality: "high",
    shake: reduceMotionPreferred ? 0.5 : 1,
    flashes: reduceMotionPreferred ? 0.3 : 0.7,
    bulletContrast: "standard",
    language: "zh",
  },
};

function freshProfile() {
  return {
    ...DEFAULT_PROFILE,
    unlockedFrames: [...DEFAULT_PROFILE.unlockedFrames],
    unlockedModules: [...DEFAULT_PROFILE.unlockedModules],
    talents: [...DEFAULT_PROFILE.talents],
    research: SpaceResearch.sanitize(),
    achievements: [...DEFAULT_PROFILE.achievements],
    contractClears: { ...DEFAULT_PROFILE.contractClears },
    settings: { ...DEFAULT_PROFILE.settings },
  };
}

function loadProfile() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return freshProfile();
    const loaded = {
      ...freshProfile(),
      ...parsed,
      settings: { ...DEFAULT_PROFILE.settings, ...(parsed.settings || {}) },
    };
    loaded.selectedMode = loaded.selectedMode === "coop" ? "coop" : "solo";
    loaded.settings.music = clamp(Number(loaded.settings.music) || 0, 0, 1);
    loaded.settings.sfx = clamp(Number(loaded.settings.sfx) || 0, 0, 1);
    loaded.settings.quality = ["low", "balanced", "high"].includes(loaded.settings.quality) ? loaded.settings.quality : "high";
    loaded.settings.shake = clamp(Number(loaded.settings.shake) || 0, 0, 1);
    loaded.settings.flashes = clamp(Number(loaded.settings.flashes) || 0, 0, 0.7);
    loaded.settings.bulletContrast = loaded.settings.bulletContrast === "high" ? "high" : "standard";
    loaded.settings.language = loaded.settings.language === "en" ? "en" : "zh";
    loaded.version = 6;
    loaded.research = SpaceResearch.sanitize(parsed.research);
    loaded.stardust = Math.max(0, Math.floor(Number(loaded.stardust) || 0));
    loaded.lifetimeStardust = Math.max(loaded.stardust, Math.floor(Number(loaded.lifetimeStardust) || 0));
    const validFrames = new Set(SHIP_FRAMES.map((frame) => frame.id));
    const validModules = new Set(CORE_MODULES.map((module) => module.id));
    loaded.unlockedFrames = [...new Set(["comet", ...(Array.isArray(loaded.unlockedFrames) ? loaded.unlockedFrames : [])])].filter((id) => validFrames.has(id));
    loaded.unlockedModules = [...new Set(["flux", ...(Array.isArray(loaded.unlockedModules) ? loaded.unlockedModules : [])])].filter((id) => validModules.has(id));
    loaded.talents = SpaceConstellation.sanitizeUnlocks(parsed.talents);
    loaded.selectedFrame = loaded.unlockedFrames.includes(loaded.selectedFrame) ? loaded.selectedFrame : "comet";
    loaded.selectedModule = loaded.unlockedModules.includes(loaded.selectedModule) ? loaded.selectedModule : "flux";
    loaded.contractClears = { ...DEFAULT_PROFILE.contractClears, ...(parsed.contractClears || {}) };
    Object.keys(loaded.contractClears).forEach((id) => { loaded.contractClears[id] = Math.max(0, Math.floor(Number(loaded.contractClears[id]) || 0)); });
    const validAchievementIds = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
    loaded.achievements = [...new Set(Array.isArray(parsed.achievements) ? parsed.achievements : [])].filter((id) => validAchievementIds.has(id));
    const selectedContract = FLIGHT_CONTRACTS.find((contract) => contract.id === loaded.selectedContract);
    loaded.selectedContract = selectedContract && contractIsUnlocked(selectedContract, loaded) ? selectedContract.id : "patrol";
    return loaded;
  } catch {
    return freshProfile();
  }
}

let profile = loadProfile();
if (QA_WALLET_MODE) profile.stardust = Math.max(profile.stardust, 3000);
if (QA_CONTRACTS_MODE) {
  profile.highestStage = Math.max(profile.highestStage, 3);
  profile.clears = Math.max(profile.clears, 1);
}
grantEligibleAchievements(profile);
SpaceI18n.setLanguage(profile.settings.language);

function saveProfile() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(profile));
  } catch {
    // Private browsing and locked-down file contexts can deny storage.
  }
}

function pointToSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

const STAGES = [
  {
    codeKey: "stage.1.code",
    nameKey: "stage.1.name",
    subtitleKey: "stage.1.subtitle",
    bossKey: "stage.1.boss",
    duration: DIRECTOR.STAGE_DURATIONS[0],
    bpm: 132,
    sky: "#090a24",
    haze: "#42205d",
    grid: "#51366e",
    star: "#ffb4db",
    accent: "#ff78aa",
  },
  {
    codeKey: "stage.2.code",
    nameKey: "stage.2.name",
    subtitleKey: "stage.2.subtitle",
    bossKey: "stage.2.boss",
    duration: DIRECTOR.STAGE_DURATIONS[1],
    bpm: 148,
    sky: "#071923",
    haze: "#124557",
    grid: "#28606b",
    star: "#a7ffe8",
    accent: "#f9d65c",
  },
  {
    codeKey: "stage.3.code",
    nameKey: "stage.3.name",
    subtitleKey: "stage.3.subtitle",
    bossKey: "stage.3.boss",
    duration: DIRECTOR.STAGE_DURATIONS[2],
    bpm: 164,
    sky: "#100719",
    haze: "#3b113b",
    grid: "#5e1d50",
    star: "#c39aff",
    accent: "#ff5d68",
  },
];

const STAGE_EVENT_TEMPLATES = [
  [
    { nameKey: "event.bubble.name", subtitleKey: "event.bubble.subtitle", pattern: "chevron" },
    { nameKey: "event.spiral.name", subtitleKey: "event.spiral.subtitle", pattern: "crossfire" },
    { nameKey: "event.candyElite.name", subtitleKey: "event.candyElite.subtitle", pattern: "elite", eliteType: "tank" },
  ],
  [
    { nameKey: "event.convoy.name", subtitleKey: "event.convoy.subtitle", pattern: "convoy" },
    { nameKey: "event.gear.name", subtitleKey: "event.gear.subtitle", pattern: "pinwheel" },
    { nameKey: "event.forgeElite.name", subtitleKey: "event.forgeElite.subtitle", pattern: "elite", eliteType: "spinner" },
  ],
  [
    { nameKey: "event.mines.name", subtitleKey: "event.mines.subtitle", pattern: "minefield" },
    { nameKey: "event.pincer.name", subtitleKey: "event.pincer.subtitle", pattern: "pincer" },
    { nameKey: "event.nightElite.name", subtitleKey: "event.nightElite.subtitle", pattern: "elite", eliteType: "tank" },
  ],
];
const STAGE_EVENTS = STAGE_EVENT_TEMPLATES.map((templates) => DIRECTOR.buildEventTimeline(templates));

const BOSS_PHASE_KEYS = [
  ["bossPhase.1.1", "bossPhase.1.2", "bossPhase.1.3"],
  ["bossPhase.2.1", "bossPhase.2.2", "bossPhase.2.3"],
  ["bossPhase.3.1", "bossPhase.3.2", "bossPhase.3.3"],
];

const BOSS_ATTACK_SEQUENCES = [
  [
    ["petalBurst", "sunLance"],
    ["petalBurst", "seedSpiral", "sunLance"],
    ["seedSpiral", "twinBloom", "sunLance", "petalBurst"],
  ],
  [
    ["railWall", "thunderFan"],
    ["forgeCross", "railWall", "thunderFan"],
    ["thunderFan", "doubleRail", "forgeCross", "railWall"],
  ],
  [
    ["spiralCrown", "voidPincer"],
    ["eclipseTwin", "voidPincer", "spiralCrown"],
    ["voidPincer", "tripleEclipse", "spiralCrown", "eclipseTwin"],
  ],
];

const BOSS_ATTACK_TELEGRAPH = Object.freeze({
  petalBurst: .82, sunLance: 1.2, seedSpiral: .9, twinBloom: .88,
  railWall: 1.24, thunderFan: .82, forgeCross: .88, doubleRail: 1.16,
  spiralCrown: .84, voidPincer: .72, eclipseTwin: .9, tripleEclipse: .96,
});

const PLAYER_CONFIG = [
  {
    nameKey: "player.1",
    color: "#68f4df",
    light: "#d5fff5",
    dark: "#176d70",
    keys: { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" },
  },
  {
    nameKey: "player.2",
    color: "#ff6b77",
    light: "#ffd1c9",
    dark: "#872e55",
    keys: { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" },
  },
];

const localizedName = (item) => t(item.nameKey);
const localizedDescription = (item) => t(item.descriptionKey);
const stageText = (stage, field) => t(stage[`${field}Key`]);
const biomeText = (biome, field) => t(biome[`${field}Key`]);
const pathText = (path, field) => t(path[`${field}Key`]);
const encounterText = (encounter, field) => t(encounter[`${field}Key`]);
const anomalyText = (anomaly, field) => t(anomaly[`${field}Key`]);
const eventText = (event, field) => t(event[`${field}Key`]);
const bossPhaseText = (stageIndex, phase) => t(BOSS_PHASE_KEYS[stageIndex][phase - 1]);

class InputManager {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    const blocked = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]);

    window.addEventListener("keydown", (event) => {
      if (blocked.has(event.code)) event.preventDefault();
      if (!this.down.has(event.code)) this.pressed.add(event.code);
      this.down.add(event.code);

      if (world.mode === "draft" && !event.repeat) {
        if (["ArrowLeft", "KeyA"].includes(event.code)) moveDraftSelection(-1);
        else if (["ArrowRight", "KeyD"].includes(event.code)) moveDraftSelection(1);
        else if (["ArrowUp", "ArrowDown", "KeyW", "KeyS"].includes(event.code)) confirmDraftSelection();
        return;
      }

      if (event.code === "Escape" && !hangarPanel.hidden) closeHangar();
      else if (event.code === "Escape" && !settingsPanel.hidden) closeSettings();
      else if (event.code === "Escape" && world.mode === "playing") pauseGame();
      else if (event.code === "Escape" && world.mode === "paused") resumeGame();
      if (event.code === "KeyM") audio.toggleMute();
      if (event.code === "Enter" && !event.repeat) {
        if (!settingsPanel.hidden || !hangarPanel.hidden) return;
        if (!tutorial.hidden) beginTutorialFlight();
        else if (world.mode === "menu") requestStart();
        else if (world.mode === "ended") startGame();
      }
    });

    window.addEventListener("keyup", (event) => this.down.delete(event.code));
    window.addEventListener("blur", () => this.down.clear());
  }

  player(index) {
    if (index === 1 && world.gameMode === "solo") return aiPilotControls(world.players[1]);
    const keys = PLAYER_CONFIG[index].keys;
    let x = (this.down.has(keys.right) ? 1 : 0) - (this.down.has(keys.left) ? 1 : 0);
    let y = (this.down.has(keys.down) ? 1 : 0) - (this.down.has(keys.up) ? 1 : 0);

    const gamepad = navigator.getGamepads?.()[index];
    if (gamepad) {
      const deadzone = (value) => (Math.abs(value) > 0.18 ? value : 0);
      x += deadzone(gamepad.axes[0] || 0);
      y += deadzone(gamepad.axes[1] || 0);
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
  }
}

class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.melodyBus = null;
    this.sfxBus = null;
    this.nextStep = 0;
    this.step = 0;
    this.stage = 0;
    this.boss = false;
    try {
      this.enabled = localStorage.getItem("spacecraft-muted") !== "1";
    } catch {
      this.enabled = true;
    }
    this.noiseBuffer = null;
    this.lastShot = [0, 0];
    this.lastEnemyShot = 0;
    this.updateButton();
  }

  async start() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.context.createGain();
      this.musicBus = this.context.createGain();
      this.melodyBus = this.context.createGain();
      this.sfxBus = this.context.createGain();
      this.musicFilter = this.context.createBiquadFilter();
      this.delay = this.context.createDelay(0.5);
      this.delayFeedback = this.context.createGain();
      this.delayWet = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.65 : 0;
      this.musicBus.gain.value = 0.31 * profile.settings.music;
      this.melodyBus.gain.value = 0.75;
      this.sfxBus.gain.value = 0.52 * profile.settings.sfx;
      this.musicFilter.type = "lowpass";
      this.musicFilter.frequency.value = 7200;
      this.delay.delayTime.value = 0.145;
      this.delayFeedback.gain.value = 0.17;
      this.delayWet.gain.value = 0.2;
      this.melodyBus.connect(this.musicBus);
      this.melodyBus.connect(this.delay);
      this.delay.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delay);
      this.delay.connect(this.delayWet);
      this.delayWet.connect(this.musicBus);
      this.musicBus.connect(this.musicFilter);
      this.musicFilter.connect(this.master);
      this.sfxBus.connect(this.master);
      this.master.connect(this.context.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    }
    if (this.context.state === "suspended") await this.context.resume();
    this.nextStep = this.context.currentTime + 0.06;
    this.step = 0;
  }

  applySettings() {
    if (!this.context) return;
    const now = this.context.currentTime;
    this.musicBus.gain.cancelScheduledValues(now);
    this.sfxBus.gain.cancelScheduledValues(now);
    this.musicBus.gain.linearRampToValueAtTime(0.31 * profile.settings.music, now + 0.05);
    this.sfxBus.gain.linearRampToValueAtTime(0.52 * profile.settings.sfx, now + 0.05);
  }

  createNoiseBuffer() {
    const length = Math.floor(this.context.sampleRate * 0.18);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  updateButton() {
    soundButton.querySelector("span").textContent = t(this.enabled ? "sound.on" : "sound.off");
    soundButton.setAttribute("aria-pressed", String(!this.enabled));
  }

  toggleMute() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("spacecraft-muted", this.enabled ? "0" : "1");
    } catch {
      // File-protocol privacy modes can deny storage; audio still works for this session.
    }
    this.updateButton();
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.linearRampToValueAtTime(this.enabled ? 0.65 : 0, this.context.currentTime + 0.08);
    }
  }

  setStage(stage, boss = false) {
    this.stage = stage;
    this.boss = boss;
    this.step = 0;
  }

  midi(note) {
    return 440 * 2 ** ((note - 69) / 12);
  }

  tone(note, duration, type, volume, when, destination = null, slide = 0) {
    if (!this.context || note == null) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(this.midi(note), when);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(this.midi(note + slide), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.006);
    gain.gain.setValueAtTime(Math.max(0.0002, volume * 0.75), when + Math.max(0.01, duration * 0.55));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(destination || this.melodyBus || this.musicBus);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  noise(duration, volume, when, highpass = 900, destination = this.sfxBus) {
    if (!this.context || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "highpass";
    filter.frequency.value = highpass;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(when);
    source.stop(when + duration);
  }

  kick(when) {
    if (!this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(115, when);
    oscillator.frequency.exponentialRampToValueAtTime(42, when + 0.08);
    gain.gain.setValueAtTime(0.11, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    oscillator.connect(gain);
    gain.connect(this.musicBus);
    oscillator.start(when);
    oscillator.stop(when + 0.1);
  }

  snare(when, strength = 1) {
    this.noise(0.09, 0.055 * strength, when, 850, this.musicBus);
    this.tone(52, 0.055, "square", 0.025 * strength, when, this.musicBus, -7);
  }

  update() {
    if (!this.context || this.context.state !== "running") return;
    while (this.nextStep < this.context.currentTime + 0.1) {
      this.scheduleStep(this.step, this.nextStep);
      const bpm = (world.routeStages?.[this.stage]?.bpm || STAGES[this.stage]?.bpm || 132)
        + (world.activeBranch?.bpmOffset || 0)
        + (world.activeEncounter?.bpmOffset || 0)
        + anomalyConfig().bpm
        + threatConfig().bpm
        + (rushActive() ? 18 : 0);
      this.nextStep += 60 / bpm / 4;
      this.step += 1;
    }
  }

  scheduleStep(step, when) {
    const roots = [45, 42, 40];
    const stageProgress = clamp(world.stageTime / Math.max(1, STAGES[this.stage]?.duration || 1), 0, 1);
    const sectorLift = DIRECTOR.intensityFor(this.stage, stageProgress).musicLift;
    const root = roots[this.stage]
      + (world.routeStages?.[this.stage]?.musicShift || 0)
      + (world.activeBranch?.musicShift || 0)
      + (world.activeEncounter?.musicShift || 0)
      + anomalyConfig().musicShift
      + sectorLift;
    const leads = [
      [12, 15, 19, 22, 19, 15, 17, 15, 12, 15, 20, 22, 20, 19, 15, 10],
      [12, 14, 17, 21, 24, 21, 17, 14, 12, 17, 19, 24, 22, 19, 17, 14],
      [12, 13, 19, 20, 24, 20, 19, 13, 12, 15, 19, 25, 24, 19, 15, 13],
    ];
    const bass = [0, 0, 7, 0, 3, 3, 10, 7];
    const progressions = [
      [0, 5, 3, 7],
      [0, 7, 5, 3],
      [0, 3, 8, 7],
    ];
    const arpeggios = [
      [0, 7, 12, 15, 19, 15, 12, 7],
      [0, 12, 7, 14, 17, 21, 17, 12],
      [0, 7, 13, 19, 24, 19, 13, 7],
    ];
    const s = step % 16;
    const bar = Math.floor(step / 16) % 4;
    const chordRoot = progressions[this.stage][bar];
    const encounterActive = Boolean(world.activeEncounter);
    const rush = rushActive();
    const adaptiveMusic = threatConfig().music;
    const intensity = (rush ? 1.38 : this.boss ? 1.22 : encounterActive ? 1.1 : 1) * adaptiveMusic;
    const bossPhase = this.boss ? world.boss?.phaseLevel || 1 : 0;
    const bossCharging = this.boss && world.boss?.attackState === "telegraph";

    this.tone(root + chordRoot + arpeggios[this.stage][s % 8] + 12, 0.045, "square", 0.012 * intensity, when);
    if (s % 2 === 0 || (this.boss && s % 4 === 1)) {
      const variation = bar === 3 && s >= 8 ? 2 : 0;
      this.tone(root + leads[this.stage][s] + variation, 0.1, "square", 0.034 * intensity, when);
      this.tone(root + leads[this.stage][s] - 12, 0.07, "triangle", 0.018, when);
    }
    if (s % 4 === 0) this.tone(root + chordRoot + bass[(step / 4) % bass.length | 0] - 12, 0.2, "triangle", 0.07, when, this.musicBus);
    if (s === 0) {
      [0, 7, 12].forEach((interval) => this.tone(root + chordRoot + interval, 0.42, "triangle", 0.016, when, this.musicBus));
    }
    if (s === 0 || s === 8 || (this.boss && (s === 4 || s === 12))) this.kick(when);
    if (s === 4 || s === 12) this.snare(when, this.boss ? 1.25 : 1);
    if (s % 2 === 1) this.noise(0.014, this.boss ? 0.018 : 0.011, when, 4200, this.musicBus);
    if (this.boss && s % 4 === 2) {
      this.tone(root + 31, 0.055, "square", 0.025, when);
      this.noise(0.045, 0.025, when, 2400, this.musicBus);
    }
    if (this.boss && bossPhase >= 2 && s % 2 === 0) {
      this.tone(root + 24 + arpeggios[this.stage][(s + bar * 2) % 8], .07, s % 4 ? "square" : "triangle", .017 + bossPhase * .004, when, this.musicBus, s === 14 ? 7 : 0);
    }
    if (this.boss && bossPhase >= 3 && (s === 0 || s === 8)) {
      this.tone(root - 24, .58, "sawtooth", .038, when, this.musicBus, 7);
      [0, 7, 13].forEach((interval, index) => this.tone(root + interval + 12, .28, "triangle", .018, when + index * .018, this.musicBus, 5));
    }
    if (bossCharging && s % 2 === 1) {
      const charge = clamp(world.boss?.attackCharge || 0, 0, 1);
      this.tone(root + 19 + Math.floor(charge * 14) + (s % 4) * 2, .065, "square", .018 + charge * .018, when, this.musicBus, 5 + charge * 7);
      if (s === 7 || s === 15) this.noise(.06, .025 + charge * .025, when, 3400 + charge * 2200, this.musicBus);
    }
    if (encounterActive && !this.boss && s % 4 === 2) {
      const signal = world.activeEncounter.kind === "survive" ? 29 : world.activeEncounter.kind === "siege" ? 24 : 19;
      this.tone(root + signal, .06, "square", .021, when, this.musicBus, s === 10 ? 5 : 0);
      if (s === 6 || s === 14) this.noise(.032, .021, when, 2800, this.musicBus);
    }
    if (!this.boss && world.threatTier >= 3 && s % 4 === 2) {
      this.tone(root + 24 + arpeggios[this.stage][(s + bar) % 8], .055, "square", .018 * adaptiveMusic, when, this.musicBus, 5);
      this.noise(.026, .018 * adaptiveMusic, when, 4600, this.musicBus);
    }
    if (!this.boss && world.threatTier === 4 && (s === 6 || s === 14)) this.kick(when + .02);
    if (!this.boss && world.activeAnomaly) {
      const anomaly = world.activeAnomaly;
      const anomalyInterval = {
        crystal: 12,
        bloom: 16,
        draft: 19,
        aurora: 17,
        gravity: 7,
        prism: 22,
        magnetar: 10,
        chrono: 13,
        surge: 5,
      }[anomaly.kind] || 12;
      if (s === 3 || s === 11) {
        const direction = anomaly.polarity > 0 ? 1 : -1;
        this.tone(root + anomalyInterval + (s === 11 ? 7 : 0), .09, s === 11 ? "triangle" : "square", .014 + anomaly.intensity * .008, when, this.musicBus, direction * 3);
      }
      if ((anomaly.kind === "chrono" || anomaly.kind === "surge") && s % 4 === 1) {
        this.tone(root + anomalyInterval + 24, .045, "square", .012, when + .018, this.musicBus, anomaly.polarity * 5);
      }
    }
    if (rush) {
      this.tone(root + 24 + arpeggios[this.stage][(s + bar) % 8], .055, s % 2 ? "square" : "triangle", .027, when, this.musicBus, s % 4 === 3 ? 7 : 0);
      if (s % 2 === 0) this.kick(when + .025);
      if (s % 4 === 3) this.noise(.028, .028, when, 5200, this.musicBus);
    }
    if (world.activeProtocols?.length && (s === 5 || s === 13)) {
      const signature = world.activeProtocols[0].id.length % 7;
      this.tone(root + 19 + signature + (s === 13 ? 12 : 0), .12, "triangle", .022 * intensity, when, this.musicBus, 4);
      this.tone(root + 31 + signature, .055, "square", .012, when + .035, this.musicBus, -3);
    }
    const activeBuffCount = world.players?.reduce((count, player) => count + SpaceStatus.activeBuffs(player.buffs).length, 0) || 0;
    const activeDebuffCount = world.players?.reduce((count, player) => count + SpaceStatus.activeDebuffs(player.debuffs).length, 0) || 0;
    if (activeBuffCount && (s === 3 || s === 11)) {
      this.tone(root + 24 + Math.min(7, activeBuffCount * 2), .09, "square", .014 + activeBuffCount * .003, when, this.musicBus, 5);
      this.tone(root + 36, .045, "triangle", .012, when + .028, this.musicBus, -2);
    }
    if (activeDebuffCount && s % 4 === 1) {
      this.tone(root + 13 - activeDebuffCount, .045, "sawtooth", .01, when, this.musicBus, -9);
    }
  }

  sfx(name, owner = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
    if (name.startsWith("power")) {
      const sounds = { powerHeavy: [43, 67, .12, "square"], powerFan: [74, 81, .045, "triangle"],
        powerSeeker: [69, 76, .08, "square"], powerArc: [91, 79, .055, "square"],
        powerIntercept: [96, 84, .09, "triangle"], powerOverload: [55, 74, .15, "square"] };
      const spec = sounds[name];
      if (!spec) return;
      this.powerSoundTimes ||= {};
      if (now - (this.powerSoundTimes[name] || -1) < .06) return;
      this.powerSoundTimes[name] = now;
      this.tone(spec[0] + owner, spec[2], spec[3], .035, now, this.sfxBus, -4);
      this.tone(spec[1] + owner, spec[2] * .7, "triangle", .024, now + .025, this.sfxBus, 3);
      if (["powerHeavy", "powerOverload"].includes(name)) this.noise(.045, .018, now, 950);
      return;
    }
    if (name === "shoot") {
      if (now - this.lastShot[owner] < 0.055) return;
      this.lastShot[owner] = now;
      this.tone(owner ? 78 : 82, 0.035, "square", 0.026, now, this.sfxBus, 7);
      this.tone(owner ? 66 : 70, 0.028, "triangle", 0.018, now + .006, this.sfxBus, 12);
    } else if (name === "hit") {
      const note = 46 + Math.floor(Math.random() * 6);
      this.tone(note, 0.045, "square", 0.028, now, this.sfxBus, -5);
      this.noise(0.025, 0.018, now, 1600);
    } else if (name === "hurt") {
      this.tone(43, 0.2, "sawtooth", 0.09, now, this.sfxBus, -12);
      this.tone(55, 0.12, "square", 0.04, now + .025, this.sfxBus, -19);
      this.noise(0.1, 0.07, now, 300);
    } else if (name === "explode") {
      this.tone(39, 0.22, "square", 0.08, now, this.sfxBus, -18);
      this.tone(51, 0.12, "sawtooth", 0.045, now + .02, this.sfxBus, -24);
      this.noise(0.22, 0.12, now, 220);
    } else if (name === "pickup") {
      [72, 76, 79].forEach((note, i) => this.tone(note, 0.08, "square", 0.05, now + i * 0.055, this.sfxBus));
    } else if (name === "buffOnline") {
      [55, 62, 67, 74, 79].forEach((note, index) => this.tone(note + owner * 2, .15, index % 2 ? "triangle" : "square", .042, now + index * .038, this.sfxBus, 5));
      this.tone(43 + owner * 2, .28, "sine", .045, now, this.sfxBus, 9);
      this.noise(.12, .025, now + .045, 3400);
    } else if (name === "debuff") {
      [72, 66, 59].forEach((note, index) => this.tone(note - owner, .11, index === 1 ? "square" : "sawtooth", .033, now + index * .025, this.sfxBus, -11));
      this.noise(.1, .035, now, 850);
    } else if (name === "nova") {
      [48, 55, 60, 67, 72].forEach((note, i) => this.tone(note, 0.26, "square", 0.06, now + i * 0.03, this.sfxBus, 5));
      this.noise(.35, .08, now, 1200);
    } else if (name === "revive") {
      [60, 64, 67, 72].forEach((note, i) => this.tone(note, 0.15, "triangle", 0.07, now + i * 0.08, this.sfxBus));
    } else if (name === "boss") {
      [40, 39, 38].forEach((note, i) => this.tone(note, 0.35, "sawtooth", 0.08, now + i * 0.12, this.sfxBus, -8));
      this.noise(.5, .07, now, 180);
    } else if (name === "bossPhase") {
      [38, 45, 50, 57].forEach((note, i) => this.tone(note, .28, i % 2 ? "square" : "sawtooth", .075, now + i * .055, this.sfxBus, 7));
      this.noise(.34, .085, now, 420);
    } else if (name === "bossCharge") {
      [43, 50, 57, 64, 71].forEach((note, index) => this.tone(note + this.stage, .22, index % 2 ? "square" : "sawtooth", .04 + index * .004, now + index * .055, this.sfxBus, 7));
      this.tone(31 + this.stage * 2, .54, "triangle", .065, now, this.sfxBus, 19);
      this.noise(.28, .045, now + .06, 1800);
    } else if (name === "bossAttack") {
      [67, 55, 43].forEach((note, index) => this.tone(note + this.stage * 2, .18, index === 1 ? "square" : "sawtooth", .07 - index * .012, now + index * .025, this.sfxBus, -12));
      this.tone(31, .32, "square", .08, now, this.sfxBus, -19);
      this.noise(.26, .11, now, 320);
    } else if (name === "sectorShift") {
      const lift = (world.sectorIndex || 0) * 2;
      [48, 55, 60, 67, 72].forEach((note, index) => this.tone(note + lift, .24, index % 2 ? "square" : "triangle", .045 + index * .003, now + index * .045, this.sfxBus, 7));
      this.tone(36 + lift, .38, "triangle", .065, now, this.sfxBus, 14);
      this.noise(.22, .04, now + .06, 3600);
    } else if (name === "anomalyShift") {
      const anomaly = world.activeAnomaly;
      const direction = anomaly?.polarity > 0 ? 1 : -1;
      const root = 48 + (anomaly?.tier || 0) * 4;
      [0, 7, 12, 19, 24].forEach((interval, index) => this.tone(root + interval, .25, index % 2 ? "triangle" : "square", .042 + index * .004, now + index * .04, this.sfxBus, direction * 5));
      this.tone(root - 12, .46, "sine", .06, now, this.sfxBus, direction * 12);
      this.noise(.24, .045, now + .05, 3200 + (anomaly?.tier || 0) * 700);
    } else if (name === "threatRise") {
      [55, 62, 67, 74].forEach((note, index) => this.tone(note, .15, index % 2 ? "triangle" : "square", .038 + index * .003, now + index * .042, this.sfxBus, 5));
      this.tone(43, .3, "triangle", .045, now, this.sfxBus, 12);
      this.noise(.16, .035, now + .04, 3800);
    } else if (name === "threatRelief") {
      [72, 67, 62].forEach((note, index) => this.tone(note, .16, "triangle", .032 - index * .004, now + index * .06, this.sfxBus, -4));
      this.tone(50, .28, "sine", .028, now, this.sfxBus, -5);
    } else if (name === "elite") {
      [48, 55, 51, 60].forEach((note, i) => this.tone(note, .16, "square", .055, now + i * .07, this.sfxBus, i % 2 ? -5 : 4));
      this.noise(.18, .045, now, 1200);
    } else if (name === "enemyCharge") {
      if (now - this.lastEnemyShot < .16) return;
      this.lastEnemyShot = now;
      [50, 57, 65].forEach((note, index) => this.tone(note + this.stage * 2, .11, index === 1 ? "triangle" : "square", .018 + index * .003, now + index * .032, this.sfxBus, 8));
    } else if (name === "enemyShoot") {
      if (now - this.lastEnemyShot < .11) return;
      this.lastEnemyShot = now;
      this.tone(61 + this.stage * 2, .08, "sawtooth", .025, now, this.sfxBus, -9);
    } else if (name === "enemyTwin") {
      if (now - this.lastEnemyShot < .11) return;
      this.lastEnemyShot = now;
      this.tone(58 + this.stage * 2, .07, "square", .022, now, this.sfxBus, -5);
      this.tone(65 + this.stage * 2, .055, "sawtooth", .018, now + .018, this.sfxBus, -10);
    } else if (name === "enemySniper") {
      if (now - this.lastEnemyShot < .13) return;
      this.lastEnemyShot = now;
      this.tone(76 + this.stage, .12, "square", .032, now, this.sfxBus, -22);
      this.noise(.045, .02, now + .015, 3200);
    } else if (name === "enemyOrbit") {
      if (now - this.lastEnemyShot < .13) return;
      this.lastEnemyShot = now;
      [55, 62, 67].forEach((note, index) => this.tone(note + this.stage, .1, "triangle", .017, now + index * .018, this.sfxBus, -4));
    } else if (name === "shield") {
      this.tone(79, .16, "sine", .055, now, this.sfxBus, -12);
      this.tone(91, .1, "square", .025, now + .02, this.sfxBus, -19);
    } else if (name === "shieldBlock") {
      this.tone(86, .08, "triangle", .05, now, this.sfxBus, 5);
      this.tone(93, .12, "square", .025, now + .025, this.sfxBus, -7);
    } else if (name === "shieldBreak") {
      [88, 74, 57].forEach((note, index) => this.tone(note, .13, "square", .035, now + index * .045, this.sfxBus, -14));
      this.noise(.17, .035, now + .025, 2600);
    } else if (name === "barrierBreak") {
      [84, 79, 72].forEach((note, index) => this.tone(note, .11, index === 1 ? "triangle" : "square", .035, now + index * .028, this.sfxBus, -8));
      this.noise(.12, .035, now + .025, 2800);
    } else if (name === "volatile") {
      this.tone(48, .2, "sawtooth", .07, now, this.sfxBus, -19);
      this.tone(60, .1, "square", .04, now + .015, this.sfxBus, -12);
      this.noise(.2, .09, now, 520);
    } else if (name === "routeScan") {
      [48, 55, 62].forEach((note, index) => this.tone(note, .28, "triangle", .032, now + index * .07, this.sfxBus, 7));
      this.noise(.16, .022, now + .04, 3600);
    } else if (name === "routeLock") {
      [60, 67, 72, 79].forEach((note, index) => this.tone(note, .2, index % 2 ? "square" : "triangle", .055, now + index * .045, this.sfxBus, 5));
      this.tone(43, .24, "square", .05, now, this.sfxBus, -9);
      this.noise(.18, .045, now + .03, 1500);
    } else if (name === "encounterStart") {
      [43, 50, 55, 62].forEach((note, index) => this.tone(note, .22, index % 2 ? "triangle" : "square", .045, now + index * .055, this.sfxBus, 4));
      this.noise(.14, .035, now + .035, 2100);
    } else if (name === "encounterTick") {
      this.tone(76, .075, "square", .04, now, this.sfxBus, 7);
      this.tone(88, .045, "triangle", .022, now + .025, this.sfxBus, 2);
    } else if (name === "encounterImpact") {
      this.tone(42, .16, "sawtooth", .065, now, this.sfxBus, -15);
      this.noise(.16, .075, now, 310);
    } else if (name === "encounterComplete") {
      [55, 62, 67, 74, 79, 86].forEach((note, index) => this.tone(note, .24, index % 2 ? "square" : "triangle", .052, now + index * .045, this.sfxBus, 5));
      this.noise(.2, .045, now + .08, 2500);
    } else if (name === "encounterFailed") {
      [55, 50, 43].forEach((note, index) => this.tone(note, .24, "sawtooth", .045, now + index * .07, this.sfxBus, -7));
      this.noise(.18, .045, now + .04, 420);
    } else if (name === "rushStart") {
      [43, 50, 55, 62, 67, 74, 79, 86].forEach((note, index) => this.tone(note, .32, index % 3 ? "square" : "sawtooth", .06, now + index * .038, this.sfxBus, 7));
      this.tone(31, .52, "sine", .09, now, this.sfxBus, 12);
      this.noise(.42, .1, now + .05, 1700);
    } else if (name === "rushHit") {
      [79, 86, 91].forEach((note, index) => this.tone(note, .09, "square", .04, now + index * .022, this.sfxBus, 4));
      this.noise(.055, .028, now, 4200);
    } else if (name === "rushEnd") {
      [74, 67, 62, 55].forEach((note, index) => this.tone(note, .2, index % 2 ? "triangle" : "square", .045, now + index * .055, this.sfxBus, -5));
      this.noise(.18, .04, now + .04, 900);
    } else if (name === "protocolOnline") {
      [48, 55, 60, 67, 72, 79, 84].forEach((note, index) => this.tone(note, .34, index % 2 ? "square" : "triangle", .055, now + index * .048, this.sfxBus, 5));
      this.tone(36, .68, "sawtooth", .07, now, this.sfxBus, 12);
      this.noise(.36, .075, now + .08, 2600);
    } else if (name === "protocolProc") {
      [76, 83, 88].forEach((note, index) => this.tone(note, .085, index === 1 ? "triangle" : "square", .026, now + index * .018, this.sfxBus, 3));
      this.noise(.045, .018, now, 5600);
    } else if (name === "stageClear") {
      [60, 64, 67, 72, 76, 79].forEach((note, i) => this.tone(note, .22, i % 2 ? "square" : "triangle", .06, now + i * .075, this.sfxBus));
    } else if (name === "unlock") {
      [55, 62, 67, 74, 79].forEach((note, i) => this.tone(note, .13, i % 2 ? "triangle" : "square", .05, now + i * .055, this.sfxBus, 2));
      this.noise(.09, .025, now + .08, 3200);
    } else if (name === "talent") {
      [48, 55, 60, 67, 72, 79].forEach((note, i) => this.tone(note, .24, i % 2 ? "triangle" : "square", .052, now + i * .052, this.sfxBus, 7));
      this.tone(36, .42, "sine", .065, now, this.sfxBus, 12);
      this.noise(.2, .035, now + .08, 2600);
    } else if (name === "equip") {
      [67, 74].forEach((note, i) => this.tone(note, .1, "square", .042, now + i * .045, this.sfxBus));
    } else if (name === "draftOpen") {
      [48, 55, 60, 67].forEach((note, i) => this.tone(note, .24, i % 2 ? "triangle" : "square", .045, now + i * .075, this.sfxBus, i * 2));
      this.noise(.18, .025, now + .12, 2600);
    } else if (name === "upgrade") {
      [48, 55, 60, 64, 67, 72, 79].forEach((note, i) => this.tone(note, .3, i % 3 ? "square" : "triangle", .058, now + i * .045, this.sfxBus, 7));
      this.noise(.34, .07, now + .05, 1800);
    }
  }
}

const input = new InputManager();
const audio = new AudioEngine();

const world = {
  mode: "menu",
  gameMode: profile.selectedMode,
  time: 0,
  stageIndex: 0,
  stageTime: 0,
  sectorIndex: 0,
  globalSector: 1,
  sectorFlashTimer: 0,
  anomalyPlan: [],
  anomalyPlanSignature: "",
  activeAnomaly: null,
  anomalyHistory: [],
  anomalyElapsed: 0,
  anomalyTransitions: 0,
  anomalyForceX: 0,
  anomalyForceY: 0,
  midDraftIndex: 0,
  threatTier: 1,
  threatScore: 0,
  threatDesiredTier: 1,
  threatCandidateTier: 1,
  threatHoldTimer: 0,
  threatRecentDamage: 0,
  threatKillMomentum: 0,
  threatPeak: 1,
  threatChanges: 0,
  threatReliefSeconds: 0,
  threatApexSeconds: 0,
  threatPulseTimer: 0,
  combatBeatId: "breach",
  combatPressure: 0,
  combatPatternTier: 0,
  combatBulletCap: 46,
  combatStateTransitions: 0,
  combatTelegraphs: 0,
  combatPatterns: new Set(),
  formationSerial: 0,
  activeFormations: new Set(),
  lastFormationId: "",
  pendingFormation: null,
  qaCombatApplied: false,
  introTimer: 0,
  clearTimer: 0,
  eventIndex: 0,
  stageEvent: null,
  cinematic: null,
  spawnTimer: 0,
  boss: null,
  bossSpawned: false,
  score: 0,
  combo: 0,
  comboTimer: 0,
  bestCombo: 0,
  kills: 0,
  shake: 0,
  flash: 0,
  beamTimer: 0,
  padSkillLatch: [false, false],
  players: [],
  bullets: [],
  enemyBullets: [],
  enemyBeams: [],
  enemies: [],
  pickups: [],
  lootDropBudget: 0,
  lootBag: [],
  lootDrought: 0,
  lootMaxDrought: 0,
  lootDrops: 0,
  particles: [],
  stars: [],
  loadoutFrame: profile.selectedFrame,
  loadoutModule: profile.selectedModule,
  contractId: profile.selectedContract,
  contract: FLIGHT_CONTRACTS.find((contract) => contract.id === profile.selectedContract) || FLIGHT_CONTRACTS[0],
  stardustReward: 0,
  newAchievements: [],
  runStartedAt: 0,
  resultCommitted: false,
  lastResultVictory: false,
  lastResultNewRecord: false,
  runSeed: 1,
  upgrades: {},
  upgradeHistory: [],
  draftOptions: [],
  draftIndex: 0,
  draftCount: 0,
  draftContext: "stage-clear",
  draftTimer: 0,
  draftInputCooldown: 0,
  draftOfferHistory: [],
  enemySerial: 0,
  chainResolving: false,
  biomes: [],
  routeStages: [],
  routeSignature: "",
  discoveredVariants: new Set(),
  variantNotice: null,
  variantNoticeCooldown: 0,
  volatileResolving: false,
  combatLaserHits: 0,
  combatHomingHits: 0,
  combatBlastHits: 0,
  combatDeathrattles: 0,
  combatBodyCollisions: 0,
  combatFriendlyCollisions: 0,
  combatInvalidProjectiles: 0,
  combatBossFragments: 0,
  ambientEliteSpawns: 0,
  branchSets: [],
  branchPlanSignature: "",
  branchHistory: [],
  routeChoice: null,
  activeBranch: null,
  encounterPlans: [],
  encounterPlanSignature: "",
  encounterIndex: 0,
  activeEncounter: null,
  encounterObjects: [],
  encounterHistory: [],
  encounterSerial: 0,
  novaCharge: 0,
  novaCooldown: 0,
  novaCount: 0,
  novaHitChargeBudget: 0,
  novaHitChargeEarned: 0,
  novaBulletsCleared: 0,
  novaLocalClears: 0,
  novaFullClears: 0,
  novaOutsideSurvivors: 0,
  novaBeamsAtTrigger: 0,
  novaBeamsCleared: 0,
  novaLastRadius: 0,
  novaSelfChargeBlocked: 0,
  novaSuppressedDeathrattles: 0,
  qaNovaHazardFragments: 0,
  novaLastTriggerTime: -1,
  novaMinimumInterval: 0,
  novaReadyTimer: 0,
  qaNovaPreparedForCount: -1,
  rushCharge: 0,
  rushTimer: 0,
  rushCooldown: 0,
  rushChain: 0,
  rushBestChain: 0,
  rushCount: 0,
  rushPulseTimer: 0,
  rushGuardClears: 0,
  rushGuardClearsThisRush: 0,
  rushStartClears: 0,
  rushLastBonus: 0,
  power: makePowerState(),
  activeProtocols: [],
  protocolProcs: 0,
  protocolFlashTimer: 0,
  protocolSoundTimer: 0,
  modelGallery: QA_MODEL_GALLERY,
  bossGallery: QA_BOSS_GALLERY,
  bossGalleryPhase: QA_BOSS_PHASE,
};

const activeStage = (index = world.stageIndex) => world.routeStages[index] || STAGES[index] || STAGES[0];
const threatConfig = () => THREAT_TIERS[world.threatTier] || THREAT_TIERS[1];
const anomalyConfig = () => world.activeAnomaly?.multipliers || SpaceAnomalies.multipliers(world.activeAnomaly);

function activateAnomaly(sectorIndex, { announce = false, record = true } = {}) {
  const anomaly = SpaceAnomalies.entryFor(world.anomalyPlan, world.stageIndex, sectorIndex);
  world.activeAnomaly = anomaly;
  world.anomalyElapsed = 0;
  world.anomalyForceX = 0;
  world.anomalyForceY = 0;
  if (record && world.anomalyHistory.at(-1)?.globalSector !== anomaly.globalSector) world.anomalyHistory.push(anomaly);
  if (announce) {
    world.anomalyTransitions += 1;
    audio.sfx("anomalyShift");
    showToast(t("toast.anomalyShift", {
      current: anomaly.globalSector,
      total: DIRECTOR.TOTAL_SECTORS,
      anomaly: anomalyText(anomaly, "name"),
      effect: anomalyText(anomaly, "effect"),
    }));
  }
  return anomaly;
}

function updateAdaptiveThreat(dt) {
  world.threatRecentDamage = Math.max(0, world.threatRecentDamage - dt / 6);
  world.threatKillMomentum *= Math.exp(-dt / 20);
  world.threatPulseTimer = Math.max(0, world.threatPulseTimer - dt);
  const stage = activeStage();
  const healthRatio = world.players.length
    ? world.players.reduce((sum, player) => sum + Math.max(0, player.hp) / Math.max(1, player.maxHp), 0) / world.players.length
    : 1;
  const downedCount = world.players.filter((player) => player.downed).length;
  const criticalPilot = world.players.some((player) => !player.downed && player.hp / Math.max(1, player.maxHp) <= .29);
  const evaluation = SpaceThreat.evaluate({
    stageIndex: world.stageIndex,
    sectorIndex: world.sectorIndex,
    progress: clamp(world.stageTime / Math.max(1, stage.duration), 0, 1),
    healthRatio,
    downed: downedCount,
    combo: world.combo,
    killsPerMinute: world.threatKillMomentum * 3,
    recentDamage: world.threatRecentDamage,
    contractPressure: SpaceThreat.contractPressure(world.contractId),
    rushActive: rushActive(),
    linked: world.linked,
  });
  world.threatScore = evaluation.score;
  world.threatDesiredTier = QA_THREAT_TIER ?? evaluation.tier;
  const commitThreatTier = (nextTier) => {
    const previousTier = world.threatTier;
    if (nextTier === previousTier) return;
    world.threatTier = nextTier;
    world.threatPeak = Math.max(world.threatPeak, world.threatTier);
    world.threatChanges += 1;
    world.threatPulseTimer = 1.1;
    world.flash = Math.max(world.flash, .12);
    world.shake = Math.max(world.shake, .08);
    audio.sfx(world.threatTier > previousTier ? "threatRise" : "threatRelief");
    showToast(t(world.threatTier > previousTier ? "toast.threatRise" : "toast.threatRelief", { threat: t(threatConfig().nameKey) }));
  };
  if (QA_THREAT_TIER !== null) {
    world.threatTier = QA_THREAT_TIER;
    world.threatCandidateTier = QA_THREAT_TIER;
    world.threatHoldTimer = 0;
  } else if (downedCount > 0 || healthRatio < .34 || criticalPilot) {
    commitThreatTier(0);
    world.threatCandidateTier = 0;
    world.threatHoldTimer = 0;
  } else if (world.threatDesiredTier === world.threatTier) {
    world.threatCandidateTier = world.threatTier;
    world.threatHoldTimer = 0;
  } else {
    if (world.threatCandidateTier !== world.threatDesiredTier) {
      world.threatCandidateTier = world.threatDesiredTier;
      world.threatHoldTimer = 0;
    }
    world.threatHoldTimer += dt;
    if (world.threatHoldTimer >= SpaceThreat.HOLD_SECONDS) {
      commitThreatTier(SpaceThreat.stepTier(world.threatTier, world.threatDesiredTier));
      world.threatHoldTimer = 0;
    }
  }
  if (world.threatTier === 0) world.threatReliefSeconds += dt;
  if (world.threatTier === 4) world.threatApexSeconds += dt;
}

let settingsReturnContext = "menu";
let resetSaveArmed = false;

function telegraphedBeamSegments(enemy) {
  if (!enemy || enemy.dead) return [];
  const ray = (sourceX, sourceY, radius, targetX, targetY, angleOffset = 0) => {
    const x1 = sourceX;
    const y1 = sourceY + radius * .45;
    const angle = Math.atan2(targetY - y1, targetX - x1) + angleOffset;
    const reach = Math.hypot(W, H) * 1.45;
    return { x1, y1, x2: x1 + Math.cos(angle) * reach, y2: y1 + Math.sin(angle) * reach };
  };
  if (enemy.boss) {
    if (enemy.attackState !== "telegraph") return [];
    if (enemy.attackId === "sunLance") {
      const offsets = enemy.phaseLevel >= 3 ? [-.12, .12] : [0];
      return offsets.map((offset) => ray(enemy.x, enemy.y, enemy.r, enemy.attackTargetX, enemy.attackTargetY, offset));
    }
    if (enemy.attackId === "railWall") {
      return [-1, 0, 1].map((lane) => ray(enemy.x + lane * 28, enemy.y, enemy.r, enemy.attackTargetX + lane * 92, H + 20));
    }
    if (enemy.attackId === "doubleRail") {
      return [-1, 1].map((side) => ray(enemy.x + side * 24, enemy.y, enemy.r, enemy.attackTargetX + side * 34, H + 16));
    }
    return [];
  }
  if (enemy.aiState !== "telegraph" || !["laserLance", "laserSweep"].includes(enemy.attackPattern)) return [];
  const offsets = enemy.attackPattern === "laserSweep" ? [-.12, .12] : [0];
  return offsets.map((offset) => ray(enemy.x, enemy.y, enemy.r, enemy.attackTargetX, enemy.attackTargetY, offset));
}

function aiPilotControls(player) {
  if (!player) return { x: 0, y: 0 };
  const partner = world.players[0];
  let targetX = partner?.x ?? W * 0.55;
  let targetY = H - 43;
  player.aiIntent = "formation";

  if (world.routeChoice && partner) {
    const targetLane = partner.x < W / 3 ? 0 : partner.x > W * 2 / 3 ? 2 : 1;
    targetX = [W * .19, W * .5, W * .81][targetLane];
    const dx = targetX - player.x;
    const dy = targetY - player.y;
    const magnitude = Math.hypot(dx, dy);
    return magnitude > 3 ? { x: dx / Math.max(3, magnitude), y: dy / Math.max(3, magnitude) } : { x: 0, y: 0 };
  }

  if (partner?.downed) {
    targetX = partner.x;
    targetY = partner.y;
    player.aiIntent = "rescue";
  } else {
    const liveEnemies = world.enemies.filter((enemy) => !enemy.dead);
    if (liveEnemies.length) {
      const target = liveEnemies.reduce((best, enemy) => {
        const targetingAi = enemy.squadTargetIndex === player.index && enemy.attackState === "telegraph";
        const rolePriority = enemy.hullRole === "command" ? -48 : enemy.hullRole === "artillery" || enemy.weaponModule === "sniper" ? -28 : 0;
        const score = Math.abs(enemy.x - player.x) + Math.max(0, enemy.y - 155) * 0.4 + rolePriority + (targetingAi ? -42 : 0);
        return !best || score < best.score ? { enemy, score } : best;
      }, null)?.enemy;
      if (target) {
        targetX = clamp(target.x, 25, W - 25);
        player.aiIntent = target.hullRole === "command" ? "focus-command" : "focus-fire";
      }
    }
    const encounter = world.activeEncounter;
    if (encounter?.kind === "hold" || encounter?.kind === "escort") {
      targetX = encounter.x;
      targetY = encounter.y;
      player.aiIntent = "objective";
    } else if (encounter?.kind === "collect") {
      const shard = world.encounterObjects
        .filter((object) => object.type === "salvage" && !object.dead)
        .sort((a, b) => distance(player, a) - distance(player, b))[0];
      if (shard) {
        targetX = shard.x;
        targetY = shard.y;
        player.aiIntent = "salvage";
      }
    } else if (encounter?.kind === "siege") {
      targetX = encounter.x;
      player.aiIntent = "siege";
    }

    const livePickups = world.pickups.filter((pickup) => !pickup.dead);
    if (livePickups.length && !["hold", "escort", "collect", "siege"].includes(encounter?.kind)) {
      const missingHull = world.players.reduce((sum, pilot) => sum + Math.max(0, pilot.maxHp - Math.max(0, pilot.hp)), 0);
      const missingShield = world.players.reduce((sum, pilot) => sum + Math.max(0, pilot.maxShield - pilot.shield), 0);
      const healthRatio = world.players.reduce((sum, pilot) => sum + Math.max(0, pilot.hp) / Math.max(1, pilot.maxHp), 0) / Math.max(1, world.players.length);
      const rankedPickup = livePickups
        .map((pickup) => {
          const range = distance(player, pickup);
          const sustain = pickup.type === "repair" || pickup.type === "shield";
          const needed = pickup.type === "repair" ? missingHull > 0 : pickup.type === "shield" ? missingShield > 0 : true;
          const utility = pickup.type === "repair"
            ? 128 + missingHull * 13
            : pickup.type === "shield"
              ? 82 + missingShield * 8
              : pickup.type === "weapon"
                ? 48
                : 30;
          return { pickup, range, sustain, needed, score: needed ? utility - range * .42 : -Infinity };
        })
        .sort((a, b) => b.score - a.score)[0];
      const urgentSustain = rankedPickup?.sustain && healthRatio <= .72;
      const withinDetour = rankedPickup && rankedPickup.range <= (rankedPickup.sustain ? 175 : 105);
      if (rankedPickup && rankedPickup.needed && (urgentSustain || withinDetour)) {
        targetX = rankedPickup.pickup.x;
        targetY = clamp(rankedPickup.pickup.y + 8, H * .48, H - 30);
        player.aiIntent = "resupply";
      }
    }
    if (partner && !partner.downed && !["objective", "salvage", "siege", "resupply"].includes(player.aiIntent)) {
      const range = Math.max(player.linkRange, partner.linkRange);
      const separation = distance(player, partner);
      if (separation > range * .8 || player.aiLinkReturning) {
        player.aiLinkReturning = separation > range * .62;
        targetX = lerp(targetX, partner.x + (partner.x > W / 2 ? -1 : 1) * range * .55, .7);
        targetY = lerp(targetY, partner.y - range * .22, .55);
      }
    }
    if (player.hp <= 2 && partner) {
      targetX = lerp(targetX, partner.x, 0.68);
      targetY = Math.min(H - 30, partner.y + 14);
      player.aiIntent = "survival";
    }
  }

  let steerX = (targetX - player.x) * 0.045;
  let steerY = (targetY - player.y) * 0.05;
  for (const bullet of world.enemyBullets) {
    const toPlayerX = player.x - bullet.x;
    const toPlayerY = player.y - bullet.y;
    const velocitySquared = Math.max(1, bullet.vx * bullet.vx + bullet.vy * bullet.vy);
    const targetedHoming = bullet.behavior === "homing" && bullet.targetIndex === player.index;
    const interceptTime = clamp((toPlayerX * bullet.vx + toPlayerY * bullet.vy) / velocitySquared, .08, targetedHoming ? 1.05 : .82);
    const futureX = bullet.x + bullet.vx * interceptTime;
    const futureY = bullet.y + bullet.vy * interceptTime;
    const dx = player.x - futureX;
    const dy = player.y - futureY;
    const range = Math.hypot(dx, dy);
    const safety = bullet.behavior === "mine"
      ? 82
      : bullet.behavior === "blast"
        ? Math.max(78, (bullet.blastRadius || 38) + 38)
        : bullet.behavior === "homing"
          ? targetedHoming ? 94 : 82
          : bullet.pattern === "laneWall" || bullet.pattern === "commandCross"
            ? 74
            : 64;
    if (range < safety) {
      const urgency = (safety - range) / safety;
      const radialX = dx / Math.max(8, range);
      const radialY = dy / Math.max(8, range);
      if (targetedHoming) {
        const bulletSpeed = Math.sqrt(velocitySquared);
        const perpendicularX = -bullet.vy / bulletSpeed;
        const perpendicularY = bullet.vx / bulletSpeed;
        const centerBias = (W / 2 - player.x) * perpendicularX + (H - 48 - player.y) * perpendicularY;
        const dodgeSide = centerBias >= 0 ? 1 : -1;
        steerX += (perpendicularX * dodgeSide * 7.4 + radialX * 2.2) * urgency;
        steerY += (perpendicularY * dodgeSide * 4.2 + radialY * 1.6) * urgency;
      } else {
        steerX += radialX * urgency * (bullet.pattern === "laneWall" ? 6.2 : 4.8);
        steerY += radialY * urgency * 2.4;
      }
      player.aiIntent = "evasion";
    }
  }
  const avoidBeamLine = (line, safety) => {
    const lineX = line.x2 - line.x1;
    const lineY = line.y2 - line.y1;
    const lineLengthSquared = Math.max(1, lineX * lineX + lineY * lineY);
    const projection = clamp(((player.x - line.x1) * lineX + (player.y - line.y1) * lineY) / lineLengthSquared, 0, 1);
    const nearestX = line.x1 + lineX * projection;
    const nearestY = line.y1 + lineY * projection;
    let awayX = player.x - nearestX;
    let awayY = player.y - nearestY;
    let range = Math.hypot(awayX, awayY);
    if (range < 1) {
      const lineLength = Math.sqrt(lineLengthSquared);
      const perpendicularX = -lineY / lineLength;
      const perpendicularY = lineX / lineLength;
      const centerBias = (W / 2 - player.x) * perpendicularX + (H - 48 - player.y) * perpendicularY;
      const side = centerBias >= 0 ? 1 : -1;
      awayX = perpendicularX * side;
      awayY = perpendicularY * side;
      range = 1;
    }
    if (range >= safety) return;
    const urgency = (safety - range) / safety;
    steerX += awayX / range * urgency * 7.6;
    steerY += awayY / range * urgency * 4.4;
    player.aiIntent = "evasion";
  };
  for (const enemy of world.enemies) {
    for (const line of telegraphedBeamSegments(enemy)) avoidBeamLine(line, 58);
  }
  for (const beam of world.enemyBeams) avoidBeamLine(beam, 44 + (beam.width || 5));
  for (const hazard of world.encounterObjects.filter((object) => object.type === "meteor" && !object.dead)) {
    const futureX = hazard.x + hazard.vx * .42;
    const futureY = hazard.y + hazard.vy * .42;
    const dx = player.x - futureX;
    const dy = player.y - futureY;
    const range = Math.hypot(dx, dy);
    if (range < 72) {
      const urgency = (72 - range) / 72;
      steerX += (dx / Math.max(9, range)) * urgency * 5.1;
      steerY += (dy / Math.max(9, range)) * urgency * 2.7;
    }
  }
  if (player.x < 28) steerX += 2.4;
  if (player.x > W - 28) steerX -= 2.4;
  if (player.y < 80) steerY += 1.8;
  if (player.y > H - 24) steerY -= 1.2;

  const magnitude = Math.hypot(steerX, steerY);
  if (magnitude > 1) return { x: steerX / magnitude, y: steerY / magnitude };
  return { x: steerX, y: steerY };
}

function updateModeUI() {
  world.gameMode = profile.selectedMode;
  modeButtons.forEach((button) => {
    const active = button.dataset.mode === profile.selectedMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const solo = profile.selectedMode === "solo";
  p2ModeBadge.textContent = solo ? "AI" : "P2";
  p2ControlText.textContent = t(solo ? "p2.ai" : "p2.coop");
}

function frameIcon(frameId) {
  if (frameId === "bulwark") return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 3h6v6h4l2 4h5v10h-9v6H11v-6H2V13h5l2-4h4z"/><path fill="#fff" opacity=".75" d="M14 8h4v7h-4z"/></svg>';
  if (frameId === "pulse") return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M14 2h4l3 12 7 4-2 7-7-3-1 8h-4l-1-8-7 3-2-7 7-4z"/><path fill="#fff" opacity=".75" d="M15 7h2v8h-2z"/></svg>';
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M13 3h6v7h4v5h6v8h-9v6h-8v-6H3v-8h6v-5h4z"/><path fill="#fff" opacity=".75" d="M14 8h4v7h-4z"/></svg>';
}

function moduleIcon(moduleId) {
  if (moduleId === "aegis") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 20 5v6c0 5.2-3.3 8.8-8 11-4.7-2.2-8-5.8-8-11V5l8-3Zm0 5-4 1.5V11c0 2.6 1.4 4.7 4 6.3 2.6-1.6 4-3.7 4-6.3V8.5L12 7Z"/></svg>';
  if (moduleId === "repair") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/></svg>';
  if (moduleId === "resonance") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4v6H4V9Zm12 0h4v6h-4V9ZM9 11h6v2H9v-2Zm2-7h2v5h-2V4Zm0 11h2v5h-2v-5Z"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-8 11h6l-1 9 9-12h-6V2Z"/></svg>';
}

function contractIcon(contractId) {
  if (contractId === "storm") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 9.5 13h-4.4A6 6 0 1 1 12 6c2.1 0 4 1.1 5.1 2.8l-3.7.7 6.2 4.2L22 6.6l-3 .6A10 10 0 0 0 12 2Zm1 5-5 7h4l-1 5 6-8h-4V7Z"/></svg>';
  if (contractId === "overdrive") return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2c1 4-2 5-1 8 1.5-1.1 2.7-2.4 3-4 3.4 3 5 6.1 4.4 9.2A7.6 7.6 0 0 1 12 22a7.5 7.5 0 0 1-7.4-6.8C4.1 12.3 5.6 9.5 8 7c-.1 2.4.8 3.8 2 4.7-.4-3.6 2.4-5.5 3-9.7Z"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4V4Zm3 3v2h7V7H7Zm0 4v2h10v-2H7Zm0 4v2h6v-2H7Z"/></svg>';
}

function medalIcon() {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 2 5 7 5-7h4l-6 9a6 6 0 1 1-6 0L3 2h4Zm5 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>';
}

function talentIcon(branch, tier = 1) {
  const paths = {
    mobility: '<path d="M4 12h11m-5-6 6 6-6 6M4 7h3M4 17h3"/><circle cx="18" cy="12" r="3"/>',
    armament: '<path d="M4 12h11m-4-4 7 4-7 4v-3H4z"/><path d="M5 7h4M5 17h4"/>',
    resonance: '<circle cx="7" cy="12" r="3"/><circle cx="17" cy="12" r="3"/><path d="M10 12h4M12 4v4m0 8v4"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[branch]}<path d="M${3 + tier * 4} 22h${tier * 3}"/></svg>`;
}

function upgradeIcon(upgradeId) {
  const paths = {
    overclock: '<path d="M13 2 5 13h6l-1 9 9-12h-6V2Z"/>',
    rail: '<path d="M3 10h12V6l6 6-6 6v-4H3v-4Z"/>',
    prism: '<path d="m12 2 8 10-8 10L4 12 12 2Zm0 5-4 5 4 5 4-5-4-5Z"/>',
    piercing: '<path d="M2 11h13V7l7 5-7 5v-4H2v-2Zm4-6h2v14H6V5Z"/>',
    drone: '<path d="M10 4h4v5h4l4 4-4 4h-4v3h-4v-3H6l-4-4 4-4h4V4Zm-6 9 3 2v-4l-3 2Zm16 0-3-2v4l3-2Z"/>',
    chain: '<path d="M8.5 7H6a5 5 0 0 0 0 10h4v-3H6a2 2 0 0 1 0-4h2.5V7Zm7 0H18a5 5 0 0 1 0 10h-4v-3h4a2 2 0 0 0 0-4h-2.5V7ZM8 11h8v3H8v-3Z"/>',
    turbo: '<path d="m4 4 8 8-8 8v-5l3-3-3-3V4Zm8 0 8 8-8 8v-5l3-3-3-3V4Z"/>',
    gyro: '<path d="M12 2a10 10 0 1 0 10 10h-4a6 6 0 1 1-2-4.5L12 12h10V2l-3.2 3.2A10 10 0 0 0 12 2Z"/>',
    phase: '<path d="m12 2 8 3v6c0 5-3 8.6-8 11-5-2.4-8-6-8-11V5l8-3Zm0 4L8 7.5V11c0 2.6 1.3 4.7 4 6.4 2.7-1.7 4-3.8 4-6.4V7.5L12 6Z"/>',
    aegisCycle: '<path d="M12 2a10 10 0 0 1 8.7 5H17l5 5 2-7h-2.7A12 12 0 1 0 24 12h-4A8 8 0 1 1 12 4v-2Zm-1 5h2v6l4 2-1 2-5-3V7Z"/>',
    nanites: '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7V2Zm3 4v6H6v1h6v6h1v-6h6v-1h-6V6h-1Z"/>',
    capacitor: '<path d="M7 3h10v3h2v15H5V6h2V3Zm2 4v5h3v6l4-8h-3V7H9Z"/>',
    novaCore: '<path d="m12 1 2.3 7.4L22 6l-4.7 6 4.7 6-7.7-2.4L12 23l-2.3-7.4L2 18l4.7-6L2 6l7.7 2.4L12 1Zm0 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
    novaHarvester: '<path d="M4 4h4v5h3V2h3v7h3V4h4v7c0 4.4-2.5 7.2-7 8.6V23h-4v-3.4C6.5 18.2 4 15.4 4 11V4Zm4 8c.4 2 1.7 3.2 4 4 2.3-.8 3.6-2 4-4H8Z"/>',
    novaAegis: '<path d="m12 2 8 3v6c0 5-3.2 8.6-8 11-4.8-2.4-8-6-8-11V5l8-3Zm0 5-1.2 3.4L7 12l3.8 1.6L12 17l1.2-3.4L17 12l-3.8-1.6L12 7Z"/>',
    novaPurifier: '<path d="M11 2h2v5.2l3.7-3.7 1.8 1.8L14.8 9H22v3h-7.2l3.7 3.7-1.8 1.8-3.7-3.7V22h-2v-8.2l-3.7 3.7-1.8-1.8L9.2 12H2V9h7.2L5.5 5.3l1.8-1.8L11 7.2V2Z"/>',
    resonanceArray: '<path d="M2 8h6v8H2V8Zm14 0h6v8h-6V8ZM9 10h6v4H9v-4Zm2-8h2v6h-2V2Zm0 14h2v6h-2v-6Z"/>',
    rushRelay: '<path d="M3 5h6v5H3V5Zm12 9h6v5h-6v-5ZM8 7h5v2H8V7Zm4 1h2v8H9v-2h3V8Z"/>',
    rushSalvage: '<path d="M5 3h5v8a2 2 0 0 0 4 0V3h5v8a7 7 0 0 1-14 0V3Zm7 12 4 4h-3v3h-2v-3H8l4-4Z"/>',
    rushOverdrive: '<path d="M3 6h8l-3-3h5l6 6-6 6H8l3-3H3V6Zm8 10h10v3H11v-3Z"/>',
    rushGuard: '<path d="m12 2 8 3v6c0 5-3.2 8.6-8 11-4.8-2.4-8-6-8-11V5l8-3Zm-1 5v4H7v2h4v4h2v-4h4v-2h-4V7h-2Z"/>',
    magnet: '<path d="M5 3h5v8a2 2 0 0 0 4 0V3h5v8a7 7 0 0 1-14 0V3Zm0 0h5v4H5V3Zm9 0h5v4h-5V3Z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[upgradeId] || paths.novaCore}</svg>`;
}

function protocolIcon(protocolId) {
  const paths = {
    cometDrive: '<path d="M3 12h8l-4-4 2-2 8 6-8 6-2-2 4-4H3Zm14-7h4v4h-4V5Zm0 10h4v4h-4v-4Z"/>',
    phaseLance: '<path d="M3 11h11V6l8 6-8 6v-5H3v-2Zm5-6h2v14H8V5Z"/>',
    prismChoir: '<path d="m12 2 6 7-6 7-6-7 6-7Zm0 6-2 2 2 2 2-2-2-2Zm-8 9 4-3 2 3-4 4-2-4Zm16 0-4-3-2 3 4 4 2-4Z"/>',
    stormCircuit: '<path d="M8 3h8l-2 6h5l-9 12 2-8H6L8 3Zm-5 7h4v3H3v-3Zm14 2h4v3h-4v-3Z"/>',
    aegisNova: '<path d="m12 2 8 3v6c0 5-3 8.5-8 11-5-2.5-8-6-8-11V5l8-3Zm0 5-1.3 3.7L7 12l3.7 1.3L12 17l1.3-3.7L17 12l-3.7-1.3L12 7Z"/>',
    salvageReactor: '<path d="M5 3h5v7a2 2 0 0 0 4 0V3h5v7a7 7 0 0 1-14 0V3Zm7 11 2 3h-2l1 4-4-6h2l-1-3 2 2Z"/>',
    resonantGyro: '<circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 12h6M12 3a9 9 0 0 1 9 9h-3l4 4 2-7h-3M12 21a9 9 0 0 1-9-9h3L2 8 0 15h3"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[protocolId] || paths.cometDrive}</svg>`;
}

function upgradeLevel(upgradeId) {
  return world.upgrades[upgradeId] || 0;
}

function rollDraftOptions() {
  const draftIndex = Math.max(0, world.draftCount - 1);
  const choices = SpaceRoguelike.rollDraftOptions({
    levels: world.upgrades,
    stageIndex: world.stageIndex,
    draftIndex,
    offerHistory: world.draftOfferHistory,
    pickHistory: world.upgradeHistory,
    random: draftRandom,
  });
  return SpaceRelics.injectProtocolChoice({
    choices,
    levels: world.upgrades,
    upgrades: UPGRADE_DEFS,
    draftIndex,
    offerHistory: world.draftOfferHistory,
    pickHistory: world.upgradeHistory,
    random: draftRandom,
  });
}

function renderBuildTray() {
  const uniqueIds = [...new Set(world.upgradeHistory)];
  const protocols = world.activeProtocols || [];
  buildTray.hidden = (uniqueIds.length === 0 && protocols.length === 0) || ["menu", "ended"].includes(world.mode);
  const upgrades = uniqueIds.map((id) => {
    const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
    if (!upgrade) return "";
    const level = upgradeLevel(id);
    const description = t(upgrade.descriptionKey, SpaceRoguelike.tierStats(id, level));
    return `<span class="build-chip ${upgrade.rarity}" tabindex="0" title="${description}" aria-label="${localizedName(upgrade)} Lv.${level}. ${description}">${upgradeIcon(id)}<b>${level}</b></span>`;
  }).join("");
  const protocolChips = protocols.map((protocol) => `<span class="build-chip protocol-chip protocol-${protocol.id}" aria-label="${t("hud.protocolOnline", { protocol: localizedName(protocol) })}">${protocolIcon(protocol.id)}</span>`).join("");
  buildTray.innerHTML = upgrades + protocolChips;
}

function renderResultBuild() {
  const uniqueIds = [...new Set(world.upgradeHistory)];
  const seedChip = `<span>${t("result.runSeed", { seed: String(world.runSeed).padStart(8, "0") })}</span>`;
  const route = world.biomes.map((biome) => biomeText(biome, "name")).join(t("result.routeSeparator"));
  const routeChip = route ? `<span>${t("result.ecosystems", { route })}</span>` : "";
  const anomalyRoute = world.anomalyPlan.flat().map((anomaly) => anomalyText(anomaly, "name")).join(t("result.routeSeparator"));
  const anomalyChip = anomalyRoute ? `<span>${t("result.anomalies", { anomalies: anomalyRoute })}</span>` : "";
  const paths = world.branchHistory.map((path) => pathText(path, "name")).join(t("result.routeSeparator"));
  const pathChip = paths ? `<span>${t("result.paths", { paths })}</span>` : "";
  const encounters = world.encounterHistory
    .map((record) => `${encounterText(record.encounter, "name")} ${t(record.success ? "encounter.status.success" : "encounter.status.failed")}`)
    .join(t("result.routeSeparator"));
  const encounterChip = encounters ? `<span>${t("result.encounters", { encounters })}</span>` : "";
  const talentChip = `<span>${t("result.talents", { current: profile.talents.length, total: TALENT_NODES.length })}</span>`;
  const rushChip = `<span>${t("result.rushSummary", { count: world.rushCount, chain: world.rushBestChain })}</span>`;
  const peakThreat = THREAT_TIERS[world.threatPeak] || THREAT_TIERS[1];
  const threatChip = `<span>${t("result.threatSummary", { peak: t(peakThreat.nameKey), changes: world.threatChanges, relief: Math.round(world.threatReliefSeconds), apex: Math.round(world.threatApexSeconds) })}</span>`;
  const protocolChip = world.activeProtocols.length
    ? `<span>${t("result.protocols", { protocols: world.activeProtocols.map(localizedName).join(t("result.separator")) })}</span>`
    : `<span>${t("result.protocolsEmpty")}</span>`;
  const upgradeChips = uniqueIds.map((id) => {
    const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
    return upgrade ? `<span>${upgradeIcon(id)}${localizedName(upgrade)} <b>Lv.${upgradeLevel(id)}</b></span>` : "";
  }).join("");
  const settlement = world.researchReward;
  const rewardChips = settlement ? `<span>${t("research.breakdown", settlement.breakdown)}</span><span>${t("research.progress", { earned: settlement.dataEarned, progress: settlement.research.progress })}</span>` + settlement.discoveries.map((entry) => {
    const node = SpaceResearch.BLUEPRINTS.find((item) => item.id === entry.id);
    return `<span>${node ? t("research.discovered", { name: t(node.nameKey), rank: entry.rank }) : t("research.converted", { amount: entry.amount })}</span>`;
  }).join("") + `<span>${t(settlement.cacheCount > 0 ? "research.nextRun" : "research.noCache")}</span>` : "";
  document.querySelector("#resultRewards").innerHTML = rewardChips;
  resultBuild.innerHTML = seedChip + talentChip + rushChip + threatChip + protocolChip + routeChip + anomalyChip + pathChip + encounterChip + (upgradeChips || `<span>${t("result.buildEmpty")}</span>`);
}

function renderUpgradeDraft(focusSelected = false) {
  runSeedLabel.textContent = `#${String(world.runSeed).padStart(8, "0")}`;
  draftProgress.textContent = t("draft.progress", { current: world.draftCount, total: DIRECTOR.TOTAL_DRAFTS });
  upgradeOptions.innerHTML = world.draftOptions.map((upgrade, index) => {
    const selected = index === world.draftIndex;
    const nextLevel = upgradeLevel(upgrade.id) + 1;
    const before = nextLevel > 1 ? t(upgrade.descriptionKey, SpaceRoguelike.tierStats(upgrade.id, nextLevel - 1)) : t("draft.new");
    const after = t(upgrade.descriptionKey, SpaceRoguelike.tierStats(upgrade.id, nextLevel));
    const recipe = PROTOCOLS.filter((entry) => entry.required.includes(upgrade.id)).map((entry) => t("draft.recipe", { recipe: entry.required.map((id, i) => `${localizedName(UPGRADE_DEFS.find((card) => card.id === id))} ${entry.ranks[i]}`).join(" + ") })).join(" · ");
    const protocol = SpaceRelics.protocolUnlockedByChoice(world.upgrades, upgrade.id);
    const protocolBadge = protocol ? `<span class="protocol-ready-badge protocol-${protocol.id}">${protocolIcon(protocol.id)}${t("draft.protocolReady", { protocol: localizedName(protocol) })}</span>` : "";
    return `<button class="upgrade-choice ${upgrade.rarity} ${protocol ? `protocol-ready protocol-${protocol.id}` : ""} ${selected ? "selected" : ""}" type="button" role="listitem" data-upgrade-id="${upgrade.id}" aria-pressed="${selected}" aria-label="${t("draft.choose", { name: localizedName(upgrade) })}. ${after}"><span class="upgrade-icon">${upgradeIcon(upgrade.id)}</span><span class="upgrade-kicker"><i>${t(`draft.path.${upgrade.path}`)}</i><b>${t(`draft.rarity.${upgrade.rarity}`)}</b></span><strong>${localizedName(upgrade)}</strong><p><span class="upgrade-before">${t("draft.before")} · ${before}</span><span class="upgrade-after">${t("draft.after")} · ${after}</span><small class="upgrade-recipe">${recipe}</small></p>${protocolBadge}<span class="upgrade-level">${t("draft.level", { current: nextLevel, max: upgrade.max })}</span></button>`;
  }).join("");
  if (focusSelected) upgradeOptions.querySelector(`[data-upgrade-id="${world.draftOptions[world.draftIndex]?.id}"]`)?.focus();
}

function beginUpgradeDraft(context = "stage-clear") {
  world.mode = "draft";
  world.draftCount += 1;
  world.draftContext = context;
  world.draftIndex = 0;
  world.draftTimer = 0;
  world.draftInputCooldown = .35;
  world.draftOptions = rollDraftOptions();
  world.draftOfferHistory.push(world.draftOptions.map((upgrade) => upgrade.id));
  upgradePanel.hidden = false;
  renderUpgradeDraft(true);
  renderBuildTray();
  audio.sfx("draftOpen");
}

function moveDraftSelection(direction) {
  if (world.mode !== "draft" || !world.draftOptions.length) return;
  world.draftIndex = (world.draftIndex + direction + world.draftOptions.length) % world.draftOptions.length;
  audio.sfx("equip");
  renderUpgradeDraft(true);
}

function applyRunUpgrade(upgrade) {
  const previousProtocols = new Set(world.activeProtocols.map((protocol) => protocol.id));
  const level = upgradeLevel(upgrade.id) + 1;
  if (level > upgrade.max) return;
  world.upgrades[upgrade.id] = level;
  world.upgradeHistory.push(upgrade.id);
  world.growthGrace = 12;
  for (const player of world.players) {
    SpaceRoguelike.applyUpgradeToPlayer(player, upgrade.id, level);
  }
  if (upgrade.id === "rushGuard" && level === 1) world.power.guardNodes = 3;
  world.activeProtocols = SpaceRelics.activeProtocols(world.upgrades, world.upgradeHistory);
  const activated = world.activeProtocols.find((protocol) => !previousProtocols.has(protocol.id));
  if (activated) {
    world.protocolFlashTimer = 1.15;
    world.flash = Math.max(world.flash, .42);
    world.shake = Math.max(world.shake, .3);
    for (const player of world.players) burst(player.x, player.y, activated.color, 30, 105);
    audio.sfx("protocolOnline");
    pulseGamepad(0, 240, .48, .4);
    pulseGamepad(1, 240, .48, .4);
    showToast(t("toast.protocolOnline", { protocol: localizedName(activated) }));
  } else {
    audio.sfx("upgrade");
    showToast(t("toast.upgrade", { name: localizedName(upgrade), level }));
  }
  pulseGamepad(0, 220, .55, .42);
  pulseGamepad(1, 220, .55, .42);
}

function confirmDraftSelection() {
  if (world.mode !== "draft") return;
  const upgrade = world.draftOptions[world.draftIndex];
  if (!upgrade) return;
  applyRunUpgrade(upgrade);
  upgradePanel.hidden = true;
  const context = world.draftContext;
  world.draftContext = "stage-clear";
  world.mode = "playing";
  if (context === "stage-clear") {
    advanceStage();
  } else {
    world.spawnTimer = Math.max(world.spawnTimer, .8);
    for (const player of world.players) player.invulnerability = Math.max(player.invulnerability, .45);
  }
  renderBuildTray();
}

function updateDraft(dt) {
  world.draftTimer += dt;
  world.draftInputCooldown = Math.max(0, world.draftInputCooldown - dt);
  if (QA_FAST_MODE && !QA_DRAFT_MODE && world.draftTimer >= .55) {
    world.draftIndex = (world.draftCount - 1) % Math.max(1, world.draftOptions.length);
    confirmDraftSelection();
    return;
  }
  if (world.draftInputCooldown > 0) return;
  for (const pad of navigator.getGamepads?.() || []) {
    if (!pad) continue;
    if (Math.abs(pad.axes[0] || 0) > .65) {
      moveDraftSelection(pad.axes[0] > 0 ? 1 : -1);
      world.draftInputCooldown = .32;
      return;
    }
    if (Math.abs(pad.axes[1] || 0) > .7) {
      confirmDraftSelection();
      world.draftInputCooldown = .4;
      return;
    }
  }
}

function renderLoadoutCards(items, unlockedIds, selectedId, container, kind) {
  container.innerHTML = items.map((item) => {
    const unlocked = unlockedIds.includes(item.id);
    const selected = unlocked && selectedId === item.id;
    const affordable = profile.stardust >= item.cost;
    const action = selected ? t("action.equipped") : unlocked ? t("action.equip") : affordable ? t("action.unlock", { cost: item.cost }) : t("action.need", { cost: item.cost });
    const classes = ["loadout-card", kind === "module" ? "module-card" : "", selected ? "selected" : "", !unlocked ? "locked" : "", !unlocked && !affordable ? "unaffordable" : ""].filter(Boolean).join(" ");
    const description = kind === "frame" ? `<span class="loadout-stats">${t(item.statsKey)}</span><p>${localizedDescription(item)}</p>` : `<p>${localizedDescription(item)}</p>`;
    const icon = kind === "frame" ? frameIcon(item.id) : moduleIcon(item.id);
    return `<button class="${classes}" type="button" data-loadout-kind="${kind}" data-loadout-id="${item.id}" aria-pressed="${selected}" ${!unlocked && !affordable ? 'aria-disabled="true"' : ""}>${icon}<span class="loadout-tag">${item.tag}</span><strong>${localizedName(item)}</strong>${description}<span class="loadout-action">${action}</span></button>`;
  }).join("");
}

function renderResearch() {
  const research = profile.research;
  document.querySelector("#researchProgress").textContent = t("research.storedProgress", { progress: research.progress });
  document.querySelector("#researchRoutes").innerHTML = SpaceResearch.ROUTES.map((route) =>
    `<button type="button" class="research-route ${research.focus === route.id ? "selected" : ""}" data-research-route="${route.id}" aria-pressed="${research.focus === route.id}"><strong>${t(route.nameKey)}</strong><small>${t(route.descriptionKey)}</small></button>`).join("");
  document.querySelector("#researchOptions").innerHTML = SpaceResearch.BLUEPRINTS.map((node) => {
    const rank = research.ranks[node.id];
    const cost = SpaceResearch.COSTS[rank];
    const branch = { exploration: "mobility", salvage: "resonance", assault: "armament" }[node.route];
    return `<button type="button" class="talent-node ${rank === 3 ? "owned" : profile.stardust >= cost ? "available" : "blocked"}" data-research-id="${node.id}" aria-disabled="${rank === 3 || profile.stardust < cost}">${talentIcon(branch, Math.max(1, rank))}<span><strong>${t(node.nameKey)} ${rank}/3</strong><small>${t(node.descriptionKey)}</small></span><b>${rank === 3 ? t("research.max") : t("research.buy", { cost })}</b></button>`;
  }).join("");
}

document.querySelector("#researchRoutes").addEventListener("click", (event) => {
  const id = event.target.closest("[data-research-route]")?.dataset.researchRoute;
  if (!SpaceResearch.ROUTES.some((route) => route.id === id)) return;
  profile.research.focus = id;
  saveProfile();
  renderResearch();
  document.querySelector(`[data-research-route="${id}"]`)?.focus();
});

document.querySelector("#researchOptions").addEventListener("click", (event) => {
  const id = event.target.closest("[data-research-id]")?.dataset.researchId;
  if (!id) return;
  const purchase = SpaceResearch.purchase(profile.research, id, profile.stardust);
  if (!purchase.ok) {
    if (purchase.reason === "cost") showToast(t("toast.needDust", { amount: purchase.cost - profile.stardust }));
    return;
  }
  profile.stardust -= purchase.cost;
  profile.research = purchase.research;
  saveProfile();
  renderHangar();
  audio.start().then(() => audio.sfx("talent"));
  showToast(t("research.upgraded", { name: t(SpaceResearch.BLUEPRINTS.find((node) => node.id === id).nameKey) }));
  document.querySelector(`[data-research-id="${id}"]`)?.focus();
});

function renderHangar() {
  const balance = `✦ ${profile.stardust}`;
  menuStardust.textContent = balance;
  hangarStardust.textContent = balance;
  renderResearch();
  renderLoadoutCards(SHIP_FRAMES, profile.unlockedFrames, profile.selectedFrame, shipOptions, "frame");
  renderLoadoutCards(CORE_MODULES, profile.unlockedModules, profile.selectedModule, moduleOptions, "module");
  contractOptions.innerHTML = FLIGHT_CONTRACTS.map((contract) => {
    const unlocked = contractIsUnlocked(contract, profile);
    const selected = unlocked && profile.selectedContract === contract.id;
    const classes = ["loadout-card", "contract-card", selected ? "selected" : "", !unlocked ? "locked unaffordable" : ""].filter(Boolean).join(" ");
    const action = selected ? t("action.signed") : unlocked ? t("action.sign") : t(contract.unlockKey);
    return `<button class="${classes}" type="button" data-contract-id="${contract.id}" aria-pressed="${selected}" ${unlocked ? "" : 'aria-disabled="true"'}>${contractIcon(contract.id)}<span class="loadout-tag">${contract.tag}</span><strong>${localizedName(contract)}</strong><p>${localizedDescription(contract)}</p><span class="loadout-action">${action}</span></button>`;
  }).join("");
  talentOptions.innerHTML = ["mobility", "armament", "resonance"].map((branch) => {
    const nodes = TALENT_NODES.filter((node) => node.branch === branch);
    const cards = nodes.map((node) => {
      const state = SpaceConstellation.canUnlock(node.id, profile.talents, profile.stardust);
      const owned = profile.talents.includes(node.id);
      const statusKey = owned ? "talent.status.owned" : state.ok ? "talent.status.available" : state.reason === "prerequisite" ? "talent.status.prerequisite" : "talent.status.cost";
      const classes = ["talent-node", owned ? "owned" : state.ok ? "available" : "blocked"].join(" ");
      return `<button class="${classes}" type="button" data-talent-id="${node.id}" aria-pressed="${owned}" ${state.ok ? "" : 'aria-disabled="true"'}>${talentIcon(branch, node.tier)}<span><strong>${t(node.nameKey)}</strong><small>${t(node.descriptionKey)}</small></span><b>${t(statusKey, { cost: node.cost })}</b></button>`;
    }).join("");
    return `<article class="talent-branch" data-branch="${branch}"><h4>${talentIcon(branch)}${t(`talent.branch.${branch}`)}</h4>${cards}</article>`;
  }).join("");
  talentProgress.textContent = `${profile.talents.length} / ${TALENT_NODES.length}`;
  achievementOptions.innerHTML = ACHIEVEMENTS.map((achievement) => {
    const unlocked = profile.achievements.includes(achievement.id);
    const status = t(unlocked ? "achievement.unlocked" : "achievement.locked");
    return `<article class="achievement-card ${unlocked ? "unlocked" : ""}" aria-label="${localizedName(achievement)}: ${status}">${medalIcon()}<div><strong>${localizedName(achievement)}</strong><small>${localizedDescription(achievement)}</small></div></article>`;
  }).join("");
  achievementCount.textContent = `${profile.achievements.length} / ${ACHIEVEMENTS.length}`;
  world.loadoutFrame = profile.selectedFrame;
  world.loadoutModule = profile.selectedModule;
  world.contractId = profile.selectedContract;
  world.contract = FLIGHT_CONTRACTS.find((contract) => contract.id === profile.selectedContract) || FLIGHT_CONTRACTS[0];
}

function unlockTalent(id) {
  const state = SpaceConstellation.canUnlock(id, profile.talents, profile.stardust);
  if (!state.node || profile.talents.includes(id)) return;
  if (!state.ok) {
    if (state.reason === "prerequisite") {
      const prerequisite = TALENT_NODES.find((node) => node.id === state.node.requires);
      showToast(t("toast.talentPrerequisite", { name: prerequisite ? t(prerequisite.nameKey) : "—" }));
    } else if (state.reason === "stardust") {
      showToast(t("toast.needDust", { amount: state.node.cost - profile.stardust }));
    }
    return;
  }
  profile.stardust -= state.node.cost;
  profile.talents = SpaceConstellation.sanitizeUnlocks([...profile.talents, id]);
  saveProfile();
  renderHangar();
  updateCareerSummary();
  audio.start().then(() => audio.sfx("talent"));
  showToast(t("toast.talentUnlocked", { name: t(state.node.nameKey) }));
  document.querySelector(`[data-talent-id="${id}"]`)?.focus();
}

function openHangar() {
  if (world.mode !== "menu") return;
  renderHangar();
  hangarPanel.hidden = false;
  closeHangarButton.focus();
}

function closeHangar() {
  hangarPanel.hidden = true;
  hangarButton.focus();
}

function chooseLoadout(kind, id) {
  const items = kind === "frame" ? SHIP_FRAMES : CORE_MODULES;
  const unlockedKey = kind === "frame" ? "unlockedFrames" : "unlockedModules";
  const selectedKey = kind === "frame" ? "selectedFrame" : "selectedModule";
  const item = items.find((entry) => entry.id === id);
  if (!item) return;
  if (!profile[unlockedKey].includes(id)) {
    if (profile.stardust < item.cost) {
      showToast(t("toast.needDust", { amount: item.cost - profile.stardust }));
      return;
    }
    profile.stardust -= item.cost;
    profile[unlockedKey].push(id);
    profile[selectedKey] = id;
    audio.start().then(() => audio.sfx("unlock"));
    showToast(t("toast.unlockedEquipped", { name: localizedName(item) }));
  } else {
    if (profile[selectedKey] === id) return;
    profile[selectedKey] = id;
    audio.start().then(() => audio.sfx("equip"));
    showToast(t("toast.equipped", { name: localizedName(item) }));
  }
  const unlockedAchievements = grantEligibleAchievements(profile);
  saveProfile();
  renderHangar();
  updateCareerSummary();
  document.querySelector(`[data-loadout-kind="${kind}"][data-loadout-id="${id}"]`)?.focus();
  if (unlockedAchievements.length) showToast(t("toast.medal", { name: localizedName(unlockedAchievements[0]) }));
}

function chooseContract(id) {
  const contract = FLIGHT_CONTRACTS.find((entry) => entry.id === id);
  if (!contract) return;
  if (!contractIsUnlocked(contract, profile)) {
    showToast(t("toast.contractLocked", { name: localizedName(contract), condition: t(contract.unlockKey) }));
    return;
  }
  if (profile.selectedContract === id) return;
  profile.selectedContract = id;
  saveProfile();
  renderHangar();
  audio.start().then(() => audio.sfx("equip"));
  showToast(t("toast.contractSigned", { name: localizedName(contract) }));
  document.querySelector(`[data-contract-id="${id}"]`)?.focus();
}

function updateCareerSummary() {
  if (!profile.runs) {
    careerSummary.textContent = t("career.empty", { dust: profile.stardust, talents: profile.talents.length, talentTotal: TALENT_NODES.length, earned: profile.achievements.length, total: ACHIEVEMENTS.length });
    renderHangar();
    return;
  }
  const minutes = Math.floor(profile.totalPlaySeconds / 60);
  careerSummary.textContent = t("career.summary", { runs: profile.runs, clears: profile.clears, score: profile.highScore, dust: profile.stardust, talents: profile.talents.length, talentTotal: TALENT_NODES.length, earned: profile.achievements.length, total: ACHIEVEMENTS.length, minutes });
  renderHangar();
}

function syncSettingsUI() {
  musicVolume.value = String(Math.round(profile.settings.music * 100));
  musicVolumeValue.value = `${musicVolume.value}%`;
  sfxVolume.value = String(Math.round(profile.settings.sfx * 100));
  sfxVolumeValue.value = `${sfxVolume.value}%`;
  qualitySetting.value = profile.settings.quality;
  shakeSetting.value = String(profile.settings.shake);
  flashSetting.value = String(profile.settings.flashes);
  bulletContrastSetting.value = profile.settings.bulletContrast;
  languageSetting.value = profile.settings.language;
  updateCareerSummary();
}

function requestStart() {
  if (!profile.tutorialSeen) {
    menu.hidden = true;
    tutorial.hidden = false;
    return;
  }
  startGame();
}

function beginTutorialFlight() {
  tutorial.hidden = true;
  profile.tutorialSeen = true;
  saveProfile();
  startGame();
}

function pauseGame() {
  if (world.mode !== "playing") return;
  world.mode = "paused";
  pauseMenu.hidden = false;
  renderPowerSummary();
}

function renderPowerSummary() {
  const power = world.power;
  const damage = Math.round(Object.entries(power.damage).reduce((sum, [source, value]) => sum + (source === "pierce" ? 0 : value), 0));
  const summary = t("power.summary", { damage, pierce: power.pierceHits, guard: world.rushGuardClears });
  const link = t("power.linkState", { state: t(linkedNow() ? "power.linked" : "power.unlinked"), nodes: power.guardNodes });
  document.querySelector("#powerSummary").textContent = summary + " · " + link;
}

function resumeGame() {
  if (world.mode !== "paused") return;
  pauseMenu.hidden = true;
  settingsPanel.hidden = true;
  world.mode = "playing";
  previousTime = performance.now();
}

function openSettings() {
  hangarPanel.hidden = true;
  if (world.mode === "playing") {
    pauseGame();
    settingsReturnContext = "pause";
  } else if (world.mode === "paused") {
    settingsReturnContext = "pause";
  } else {
    settingsReturnContext = world.mode;
  }
  pauseMenu.hidden = true;
  settingsPanel.hidden = false;
  syncSettingsUI();
}

function closeSettings() {
  settingsPanel.hidden = true;
  if (settingsReturnContext === "pause" && world.mode === "paused") pauseMenu.hidden = false;
}

function exitToMenu() {
  resetWorld();
  world.mode = "menu";
  menu.hidden = false;
  result.hidden = true;
  tutorial.hidden = true;
  pauseMenu.hidden = true;
  settingsPanel.hidden = true;
  hangarPanel.hidden = true;
  audio.setStage(0, false);
  renderHangar();
  showToast(t("toast.backMenu"));
}

function pulseGamepad(index, duration = 90, strong = 0.35, weak = 0.2) {
  const pad = navigator.getGamepads?.()[index];
  const actuator = pad?.vibrationActuator;
  if (!actuator?.playEffect) return;
  actuator.playEffect("dual-rumble", {
    duration,
    strongMagnitude: clamp(strong, 0, 1),
    weakMagnitude: clamp(weak, 0, 1),
  }).catch(() => {});
}

function makeStars() {
  world.stars = Array.from({ length: 105 }, () => ({
    x: visualRand(-W * 2, W * 2),
    y: visualRand(-H * 2, H * 2),
    z: visualRand(20, 380),
    pz: visualRand(20, 380),
    size: visualRandom() < 0.16 ? 2 : 1,
  }));
}

function resetStar(star, far = false) {
  star.x = visualRand(-W * 2, W * 2);
  star.y = visualRand(-H * 2, H * 2);
  star.z = far ? 380 : visualRand(300, 380);
  star.pz = star.z;
}

function createPlayer(index) {
  const frame = SHIP_FRAMES.find((entry) => entry.id === profile.selectedFrame) || SHIP_FRAMES[0];
  const module = CORE_MODULES.find((entry) => entry.id === profile.selectedModule) || CORE_MODULES[0];
  const contract = FLIGHT_CONTRACTS.find((entry) => entry.id === profile.selectedContract) || FLIGHT_CONTRACTS[0];
  const contractHp = Math.max(4, frame.hp + contract.playerHpDelta);
  const baseNovaChargeRate = clamp(frame.energyGain * (module.energyGain || 1) * contract.playerEnergy, .8, 1.25);
  const collisionRadii = SpaceCollision.playerRadii(frame.id);
  const player = {
    index,
    frameId: frame.id,
    moduleId: module.id,
    x: index === 0 ? W * 0.39 : W * 0.61,
    y: H - 38,
    vx: 0,
    vy: 0,
    r: collisionRadii.hurt,
    hurtRadius: collisionRadii.hurt,
    bodyRadius: collisionRadii.body,
    pickupRadius: collisionRadii.pickup,
    hp: contractHp,
    maxHp: contractHp,
    speed: frame.speed,
    damage: frame.damage * contract.playerDamage,
    fireRate: frame.fireRate,
    energyGain: baseNovaChargeRate,
    novaChargeRate: baseNovaChargeRate,
    novaDamage: frame.novaDamage,
    novaRadiusBonus: 0,
    novaHitChargeBonus: 0,
    novaHitBudgetBonus: 0,
    novaShieldCharge: 0,
    novaRescueCharge: 0,
    novaClearAll: false,
    rushLinkedChargeRate: 1,
    rushKillCharge: 0,
    rushEliteCharge: 0,
    rushPickupCharge: 0,
    rushEncounterCharge: 0,
    rushFireRate: 1,
    rushDamage: 1,
    rushGuard: false,
    rushGuardInterval: RUSH_CONFIG.guardInterval,
    rushGuardLimit: RUSH_CONFIG.guardLimit,
    maxShield: module.maxShield || 3,
    stageRepair: module.stageRepair || 0,
    reviveHp: module.reviveHp || 3,
    reviveSpeed: 1,
    linkRange: module.linkRange || 105,
    beamDamage: module.beamDamage || 1,
    energy: 0,
    weapon: 1,
    weaponFloor: 0,
    projectileSpeed: 180,
    pierce: 0,
    droneLevel: 0,
    droneVolley: 0,
    chainDamage: 0,
    burstCadence: 0,
    prismEcho: 0,
    handling: 18,
    hitInvulnerability: .72,
    shieldRegenInterval: 0,
    shieldRegenTimer: Number.POSITIVE_INFINITY,
    pickupMagnetRadius: 0,
    fireTimer: 0,
    invulnerability: 2,
    shield: module.startShield || 0,
    shieldHitTimer: 0,
    shieldImpactX: 0,
    shieldImpactY: 0,
    shieldBreakTimer: 0,
    hullHitTimer: 0,
    damageVfxTimer: 0,
    shieldAbsorbed: 0,
    hullDamageTaken: 0,
    downed: false,
    downTimer: 0,
    revive: 0,
    shots: 0,
    damageTaken: 0,
    downCount: 0,
    rescueCount: 0,
    capstoneHeavyProcs: 0,
    capstonePrismProcs: 0,
    capstoneDroneProcs: 0,
    protocolCooldown: 0,
    buffs: Object.fromEntries(BUFF_MODULES.map((buff) => [buff.id, 0])),
    debuffs: Object.fromEntries(DEBUFF_MODULES.map((debuff) => [debuff.id, 0])),
    nanobloomTick: 0,
    aegisPulse: 0,
    buffFlash: 0,
    statusFlash: 0,
    statusSoundTimer: 0,
    aiIntent: index === 1 ? "formation" : "human",
  };
  return SpaceConstellation.applyToPlayer(player, profile.talents);
}

function prepareRouteChoice(stageIndex) {
  const options = world.branchSets[stageIndex] || [];
  const total = QA_FAST_MODE || QA_VOXEL_MODE ? .22 : 5.8;
  world.activeBranch = null;
  world.routeChoice = {
    options,
    timer: total,
    total,
    elapsed: 0,
    selectedIndex: 1,
    hold: 0,
    converged: false,
  };
  world.introTimer = 0;
  world.variantNotice = null;
  world.variantNoticeCooldown = 0;
}

function confirmRouteChoice(index) {
  const choice = world.routeChoice;
  if (!choice) return;
  const selectedIndex = clamp(Math.round(index), 0, choice.options.length - 1);
  let branch = choice.options[selectedIndex];
  if (!branch) return;
  if (!world.qaCombatApplied && (QA_VOXEL_MODE || QA_BOSS_STATE_MODE) && QA_COMBAT_STAGE !== null && QA_COMBAT_PROGRESS !== null) {
    world.stageIndex = QA_COMBAT_STAGE;
    world.stageTime = activeStage(QA_COMBAT_STAGE).duration * QA_COMBAT_PROGRESS;
    world.sectorIndex = DIRECTOR.sectorForProgress(QA_COMBAT_PROGRESS);
    world.globalSector = DIRECTOR.globalSector(QA_COMBAT_STAGE, world.sectorIndex);
    branch = world.branchSets[QA_COMBAT_STAGE]?.[selectedIndex] || branch;
    activateAnomaly(world.sectorIndex, { announce: false });
    world.qaCombatApplied = true;
    audio.setStage(world.stageIndex, false);
  }
  world.activeBranch = branch;
  world.branchHistory[world.stageIndex] = branch;
  world.routeChoice = null;
  world.introTimer = QA_FAST_MODE || QA_VOXEL_MODE ? .5 : 2.8;
  world.cinematic = { type: "warp", timer: 1.35, total: 1.35 };
  world.flash = Math.max(world.flash, .34);
  world.shake = Math.max(world.shake, .24);
  for (const player of world.players) {
    player.hp = Math.min(player.maxHp, player.hp + (branch.reward.repair || 0));
    player.shield = Math.min(player.maxShield, player.shield + (branch.reward.shield || 0));
    player.weapon = Math.min(3, player.weapon + (branch.reward.weapon || 0));
    player.x = player.index === 0 ? W * .39 : W * .61;
    player.y = H - 38;
    player.vx = 0;
    player.vy = 0;
    player.invulnerability = Math.max(player.invulnerability, .9);
  }
  if (branch.reward.energy > 0) {
    addNovaCharge("route", Math.min(NOVA_CONFIG.routeRewardCap, branch.reward.energy * NOVA_CONFIG.routeRewardScale));
  }
  audio.sfx("routeLock");
  pulseGamepad(0, 180, .42, .3);
  pulseGamepad(1, 180, .42, .3);
  showToast(t("toast.pathLocked", { path: pathText(branch, "name"), reward: pathText(branch, "reward") }));
}

function updateRouteChoice(dt) {
  const choice = world.routeChoice;
  if (!choice) return;
  choice.elapsed += dt;
  choice.timer -= dt;
  for (const player of world.players) {
    const controls = world.gameMode === "solo" && player.index === 1
      ? aiPilotControls(player)
      : input.player(player.index);
    const speed = player.speed * .92;
    player.vx = lerp(player.vx, controls.x * speed, 1 - Math.exp(-dt * player.handling));
    player.vy = lerp(player.vy, controls.y * speed, 1 - Math.exp(-dt * player.handling));
    player.x = clamp(player.x + player.vx * dt, 13, W - 13);
    player.y = clamp(player.y + player.vy * dt, H - 72, H - 14);
    player.invulnerability = Math.max(player.invulnerability, .9);
  }
  const pilots = world.players.filter((player) => !player.downed);
  const gateState = SpaceExpedition.evaluateGateChoice(pilots.map((player) => player.x), W, 42);
  choice.selectedIndex = gateState.selectedIndex;
  choice.converged = gateState.converged;
  if (choice.elapsed > .9 && gateState.converged) {
    choice.hold += dt;
  } else {
    choice.hold = Math.max(0, choice.hold - dt * 2.4);
  }
  if (choice.hold >= .68 || choice.timer <= 0) confirmRouteChoice(QA_PATH_INDEX ?? choice.selectedIndex);
}

function resetWorld() {
  world.runResearch = SpaceResearch.sanitize(profile.research);
  world.researchEffects = SpaceResearch.effects(world.runResearch);
  world.researchReward = null;
  world.researchPickups = 0;
  world.researchElites = 0;
  world.researchBosses = 0;
  world.researchProcs = 0;
  world.researchShieldProgress = 0;
  world.researchSectors = new Set();
  world.growthGrace = 0;
  world.pressureHolds = 0;
  world.runSeed = createRunSeed();
  setRunRandomSeed(world.runSeed);
  world.anomalyPlan = [...SpaceAnomalies.generatePlan(world.runSeed)].map((stage) => [...stage]);
  if (QA_ANOMALY_ID) world.anomalyPlan = [...SpaceAnomalies.forceFirst(world.anomalyPlan, QA_ANOMALY_ID, world.runSeed)].map((stage) => [...stage]);
  world.anomalyPlanSignature = world.anomalyPlan.map((stage) => stage.map((anomaly) => anomaly.signature).join("|")).join(">");
  world.activeAnomaly = SpaceAnomalies.entryFor(world.anomalyPlan, 0, 0);
  world.anomalyHistory = [world.activeAnomaly];
  world.anomalyElapsed = 0;
  world.anomalyTransitions = 0;
  world.anomalyForceX = 0;
  world.anomalyForceY = 0;
  world.biomes = [...SpaceExpedition.generateRoute(world.runSeed)];
  if (QA_BIOME_ID) {
    const forcedBiome = SpaceExpedition.BIOMES.find((biome) => biome.id === QA_BIOME_ID);
    if (QA_COMBAT_STAGE !== null) world.biomes[QA_COMBAT_STAGE] = forcedBiome;
    else world.biomes[0] = forcedBiome;
  }
  world.branchSets = [...SpaceExpedition.generateBranchSets(world.runSeed)];
  world.branchPlanSignature = world.branchSets.map((set) => set.map((path) => path.id).join("|")).join(">");
  world.branchHistory = [];
  world.routeChoice = null;
  world.activeBranch = null;
  world.encounterPlans = [...SpaceExpedition.generateEncounterPlans(world.runSeed)].map((plan) => [...plan]);
  if (QA_ENCOUNTER_ID) {
    const forced = SpaceExpedition.ENCOUNTER_PROTOCOLS.find((encounter) => encounter.id === QA_ENCOUNTER_ID);
    for (let stageIndex = forced.minStage; stageIndex < world.encounterPlans.length; stageIndex += 1) {
      const base = world.encounterPlans[stageIndex][0];
      world.encounterPlans[stageIndex][0] = Object.freeze({
        ...forced,
        stageIndex,
        slot: 0,
        at: base.at,
        lane: 1,
        variant: base.variant,
        intensity: base.intensity,
        signature: `${forced.id}:1:${base.variant}`,
      });
    }
  }
  world.encounterPlanSignature = world.encounterPlans.map((plan) => plan.map((encounter) => encounter.signature).join("|")).join(">");
  world.encounterIndex = 0;
  world.activeEncounter = null;
  world.encounterObjects = [];
  world.encounterHistory = [];
  world.encounterSerial = 0;
  world.novaCharge = QA_NOVA_MODE ? NOVA_CONFIG.threshold : 0;
  world.novaCooldown = 0;
  world.novaCount = 0;
  world.novaHitChargeBudget = NOVA_CONFIG.hitChargePerSecond;
  world.novaHitChargeEarned = 0;
  world.novaBulletsCleared = 0;
  world.novaLocalClears = 0;
  world.novaFullClears = 0;
  world.novaOutsideSurvivors = 0;
  world.novaBeamsAtTrigger = 0;
  world.novaBeamsCleared = 0;
  world.novaLastRadius = 0;
  world.novaSelfChargeBlocked = 0;
  world.novaSuppressedDeathrattles = 0;
  world.qaNovaHazardFragments = 0;
  world.novaLastTriggerTime = -1;
  world.novaMinimumInterval = 0;
  world.novaReadyTimer = 0;
  world.qaNovaPreparedForCount = -1;
  world.rushCharge = QA_RUSH_MODE ? RUSH_CONFIG.threshold : 0;
  world.rushTimer = 0;
  world.rushCooldown = 0;
  world.rushChain = 0;
  world.rushBestChain = 0;
  world.rushCount = 0;
  world.rushPulseTimer = 0;
  world.rushGuardClears = 0;
  world.rushGuardClearsThisRush = 0;
  world.rushStartClears = 0;
  world.rushLastBonus = 0;
  world.power = makePowerState();
  world.activeProtocols = [];
  world.protocolProcs = 0;
  world.protocolFlashTimer = 0;
  world.protocolSoundTimer = 0;
  world.routeStages = STAGES.map((stage, index) => {
    const biome = world.biomes[index];
    return {
      ...stage,
      sky: biome.sky,
      haze: biome.haze,
      grid: biome.grid,
      star: biome.star,
      accent: biome.accent,
      secondary: biome.secondary,
      bpm: stage.bpm + biome.bpmOffset,
      musicShift: biome.musicShift,
      biome,
    };
  });
  world.routeSignature = world.biomes.map((biome) => biome.id).join(">");
  world.gameMode = profile.selectedMode;
  world.loadoutFrame = profile.selectedFrame;
  world.loadoutModule = profile.selectedModule;
  world.contractId = profile.selectedContract;
  world.contract = FLIGHT_CONTRACTS.find((contract) => contract.id === profile.selectedContract) || FLIGHT_CONTRACTS[0];
  world.time = 0;
  world.stageIndex = 0;
  world.stageTime = 0;
  world.sectorIndex = 0;
  world.globalSector = DIRECTOR.globalSector(0, 0);
  world.sectorFlashTimer = 0;
  world.midDraftIndex = 0;
  world.threatTier = QA_THREAT_TIER ?? 1;
  world.threatScore = 0;
  world.threatDesiredTier = world.threatTier;
  world.threatCandidateTier = world.threatTier;
  world.threatHoldTimer = 0;
  world.threatRecentDamage = 0;
  world.threatKillMomentum = 0;
  world.threatPeak = world.threatTier;
  world.threatChanges = 0;
  world.threatReliefSeconds = 0;
  world.threatApexSeconds = 0;
  world.threatPulseTimer = 0;
  world.combatBeatId = "breach";
  world.combatPressure = 0;
  world.combatPatternTier = 0;
  world.combatBulletCap = 46;
  world.combatStateTransitions = 0;
  world.combatTelegraphs = 0;
  world.combatPatterns = new Set();
  world.formationSerial = 0;
  world.activeFormations = new Set();
  world.lastFormationId = "";
  world.pendingFormation = null;
  world.qaCombatApplied = false;
  world.introTimer = 0;
  world.clearTimer = 0;
  world.eventIndex = 0;
  world.stageEvent = null;
  world.variantNotice = null;
  world.variantNoticeCooldown = 0;
  world.cinematic = null;
  world.spawnTimer = 1.8;
  world.boss = null;
  world.bossSpawned = false;
  world.score = 0;
  world.combo = 0;
  world.comboTimer = 0;
  world.bestCombo = 0;
  world.kills = 0;
  world.shake = 0;
  world.flash = 0;
  world.beamTimer = 0;
  world.stardustReward = 0;
  world.newAchievements = [];
  world.runStartedAt = 0;
  world.resultCommitted = false;
  world.lastResultVictory = false;
  world.lastResultNewRecord = false;
  world.upgrades = {};
  world.upgradeHistory = [];
  world.draftOptions = [];
  world.draftIndex = 0;
  world.draftCount = 0;
  world.draftContext = "stage-clear";
  world.draftTimer = 0;
  world.draftInputCooldown = 0;
  world.draftOfferHistory = [];
  world.lootDropBudget = 0;
  world.lootBag = [];
  world.lootDrought = 0;
  world.lootMaxDrought = 0;
  world.lootDrops = 0;
  world.enemySerial = 0;
  world.chainResolving = false;
  world.discoveredVariants = new Set();
  world.variantNotice = null;
  world.variantNoticeCooldown = 0;
  world.volatileResolving = false;
  world.combatLaserHits = 0;
  world.combatHomingHits = 0;
  world.combatBlastHits = 0;
  world.combatDeathrattles = 0;
  world.combatBodyCollisions = 0;
  world.combatFriendlyCollisions = 0;
  world.combatInvalidProjectiles = 0;
  world.combatBossFragments = 0;
  world.ambientEliteSpawns = 0;
  world.players = [createPlayer(0), createPlayer(1)];
  syncNovaMirrors();
  if (QA_BOSS_STATE_MODE) {
    world.players.forEach((player) => {
      player.maxHp = 99;
      player.hp = 99;
      player.invulnerability = 0;
      player.hitInvulnerability = .18;
    });
  }
  if (QA_FORCE_ELITE) {
    world.players.forEach((player) => {
      player.maxHp = 30;
      player.hp = 30;
      player.invulnerability = 0;
    });
  }
  if (QA_GROWTH_MODE) {
    const plan = QA_GROWTH_PLANS[QA_GROWTH_MODE];
    for (const [upgradeId, maxLevel] of Object.entries(plan)) {
      for (let level = 1; level <= maxLevel; level += 1) {
        world.upgrades[upgradeId] = level;
        world.upgradeHistory.push(upgradeId);
        for (const player of world.players) SpaceRoguelike.applyUpgradeToPlayer(player, upgradeId, level);
      }
    }
    world.activeProtocols = SpaceRelics.activeProtocols(world.upgrades, world.upgradeHistory);
  }
  if (QA_BUFFS_MODE) {
    for (const player of world.players) {
      for (const buff of BUFF_MODULES) player.buffs[buff.id] = 30;
      player.buffFlash = .48;
    }
  }
  if (QA_STATUS_ID) world.players[0].debuffs[QA_STATUS_ID] = 30;
  if (QA_PROTOCOL_ID) {
    const protocol = PROTOCOLS.find((entry) => entry.id === QA_PROTOCOL_ID);
    for (const [slot, upgradeId] of protocol.required.entries()) {
      for (let rank = (world.upgrades[upgradeId] || 0) + 1; rank <= protocol.ranks[slot]; rank += 1) {
        world.upgrades[upgradeId] = rank;
        world.upgradeHistory.push(upgradeId);
        for (const player of world.players) SpaceRoguelike.applyUpgradeToPlayer(player, upgradeId, rank);
      }
    }
    world.activeProtocols = SpaceRelics.activeProtocols(world.upgrades, world.upgradeHistory);
  }
  world.bullets = [];
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.enemies = [];
  world.pickups = [];
  world.particles = [];
  makeStars();
  prepareRouteChoice(0);
  upgradePanel.hidden = true;
  buildTray.hidden = true;
  buildTray.innerHTML = "";
  resultBuild.innerHTML = "";
}

function startGame() {
  resetWorld();
  world.mode = "playing";
  world.runStartedAt = performance.now();
  menu.hidden = true;
  result.hidden = true;
  tutorial.hidden = true;
  pauseMenu.hidden = true;
  settingsPanel.hidden = true;
  hangarPanel.hidden = true;
  upgradePanel.hidden = true;
  renderBuildTray();
  audio.start().then(() => {
    audio.setStage(0, false);
    audio.sfx("routeScan");
  });
  const frame = SHIP_FRAMES.find((entry) => entry.id === profile.selectedFrame) || SHIP_FRAMES[0];
  showToast(t(world.gameMode === "solo" ? "toast.soloStart" : "toast.coopStart", { contract: localizedName(world.contract), frame: localizedName(frame), talents: profile.talents.length, total: TALENT_NODES.length }));
}

function showToast(message) {
  toastElement.textContent = message;
  toastElement.classList.remove("show");
  window.clearTimeout(showToast.timeout);
  cancelAnimationFrame(showToast.frame);
  showToast.frame = requestAnimationFrame(() => toastElement.classList.add("show"));
  showToast.timeout = window.setTimeout(() => toastElement.classList.remove("show"), 1900);
}

function burst(x, y, color, count = 8, speed = 55) {
  for (let i = 0; i < count; i += 1) {
    const angle = visualRand(0, TAU);
    const velocity = visualRand(speed * 0.25, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      life: visualRand(0.25, 0.7),
      maxLife: 0.7,
      color,
      size: visualRandom() < 0.4 ? 2 : 1,
    });
  }
}

const relicBonuses = () => SpaceRelics.combatBonuses(world.upgrades, world.upgradeHistory);
const statusBonuses = (player) => SpaceStatus.combatBonuses(player?.buffs, player?.debuffs);

function makePowerState() {
  return { effects: [], damage: {}, shots: {}, hits: {}, pierceHits: 0, blastCount: 0,
    guardNodes: 0, guardRecovery: 0, guardCooldown: 0, guardFlash: 0,
    chargeBudget: 0, hitBudget: 0, unlinkedTime: 0, pulseElapsed: 0, pulseCount: 0,
    shieldBudget: 6, rescueCooldown: 0, aegisCooldown: 0, salvageCount: 0,
    fragments: [], blastDamage: 0, novaEarned: 0 };
}

function powerEffect(kind, x, y, radius, color, tier = 1, target = null) {
  const duration = kind === "blast" ? .46 : kind === "arc" ? .22 : .28;
  if (world.power.effects.length >= 56) world.power.effects.shift();
  world.power.effects.push({ kind, x, y, radius, color, tier, target, age: 0, duration });
}

function creditDamage(source, damage) {
  const amount = Math.max(0, damage.hull || 0) + Math.max(0, damage.barrier || 0);
  world.power.damage[source] = (world.power.damage[source] || 0) + amount;
  return amount;
}

const interceptable = (bullet) => !["blast", "mine"].includes(bullet.behavior);
const linkedNow = () => world.players.length === 2 && world.players.every((p) => !p.downed)
  && distance(world.players[0], world.players[1]) < Math.max(...world.players.map((p) => p.linkRange)) * (world.activeBranch?.reward.link || 1);

function teamAverage(field, fallback = 0) {
  const players = world.players.filter((player) => !player.downed);
  if (!players.length) return fallback;
  return players.reduce((sum, player) => sum + (Number(player[field]) || fallback), 0) / players.length;
}

function teamMaximum(field, fallback = 0) {
  return world.players.reduce((best, player) => Math.max(best, Number(player[field]) || fallback), fallback);
}

function teamNovaChargeRate() {
  const players = world.players.filter((player) => !player.downed);
  if (!players.length) return 1;
  const rate = players.reduce((sum, player) => (
    sum + (Number(player.novaChargeRate) || Number(player.energyGain) || 1)
      * (statusBonuses(player).sharedCharge || 1) * statusBonuses(player).energyGain
  ), 0) / players.length;
  return clamp(rate, .75, 3);
}

function teamRushBonuses() {
  const relic = relicBonuses();
  return {
    rushLinkedChargeRate: clamp(teamAverage("rushLinkedChargeRate", 1) * (relic.linkedCharge || 1), 1, 2),
    rushKillCharge: teamAverage("rushKillCharge"),
    rushEliteCharge: teamAverage("rushEliteCharge"),
    rushPickupCharge: teamAverage("rushPickupCharge"),
    rushEncounterCharge: teamAverage("rushEncounterCharge"),
    rushFireRate: teamAverage("rushFireRate", 1),
    rushDamage: teamAverage("rushDamage", 1),
    rushGuard: world.players.some((player) => player.rushGuard),
    rushGuardInterval: Math.max(.16, teamAverage("rushGuardInterval", RUSH_CONFIG.guardInterval)),
    rushGuardLimit: Math.min(RUSH_CONFIG.guardLimit, Math.max(1, Math.round(teamMaximum("rushGuardLimit", RUSH_CONFIG.guardLimit)))),
  };
}

function syncNovaMirrors() {
  for (const player of world.players) player.energy = world.novaCharge;
}

function addNovaCharge(type, amount, player = null) {
  let delta = Number(amount) || 0;
  if (type === "nova") {
    if (delta > 0) world.novaSelfChargeBlocked += 1;
    return 0;
  }
  if (type === "hit") {
    delta += teamAverage("novaHitChargeBonus");
    delta = Math.min(Math.max(0, delta), world.novaHitChargeBudget);
    world.novaHitChargeBudget = Math.max(0, world.novaHitChargeBudget - delta);
  }
  if (["passive", "hit", "anomaly"].includes(type)) delta *= teamNovaChargeRate();
  else if (player && delta > 0) delta *= clamp(Number(player.novaChargeRate) || Number(player.energyGain) || 1, .75, 3);
  const previous = world.novaCharge;
  world.novaCharge = SpaceRush.clampNovaCharge(world.novaCharge + delta);
  if (type === "hit") world.novaHitChargeEarned += world.novaCharge - previous;
  syncNovaMirrors();
  return delta;
}

function grantBuff(player, pickupType) {
  const buff = SpaceStatus.buffForPickup(pickupType);
  const current = player.buffs[buff.id] || 0;
  player.buffs[buff.id] = SpaceStatus.refreshBuffDuration(current, buff);
  player.buffFlash = .48;
  if (buff.id === "nanobloom") player.nanobloomTick = Math.min(player.nanobloomTick, .18);
  if (buff.id === "aegis") player.aegisPulse = Math.min(player.aegisPulse, .12);
  burst(player.x, player.y, buff.color, 22, 92);
  audio.sfx("buffOnline", player.index);
  return buff;
}

function applyEnemyDebuff(player, bullet) {
  if (!bullet.debuff || !SpaceStatus.debuffById(bullet.debuff) || player.downed) return false;
  const bonuses = statusBonuses(player);
  const duration = Math.max(.25, (bullet.debuffDuration || 1) * bonuses.statusResistance);
  player.debuffs[bullet.debuff] = Math.max(player.debuffs[bullet.debuff] || 0, duration);
  if (bullet.debuff === "fracture") addNovaCharge("fracture", -6);
  player.statusFlash = .44;
  burst(player.x, player.y, bullet.payloadColor || bullet.color, 10, 52);
  if (player.statusSoundTimer <= 0) {
    audio.sfx("debuff", player.index);
    player.statusSoundTimer = .18;
  }
  return true;
}

function updatePlayerStatus(player, dt) {
  for (const buff of BUFF_MODULES) player.buffs[buff.id] = Math.max(0, (player.buffs[buff.id] || 0) - dt);
  for (const debuff of DEBUFF_MODULES) player.debuffs[debuff.id] = Math.max(0, (player.debuffs[debuff.id] || 0) - dt);
  player.buffFlash = Math.max(0, player.buffFlash - dt);
  player.statusFlash = Math.max(0, player.statusFlash - dt);
  player.statusSoundTimer = Math.max(0, (player.statusSoundTimer || 0) - dt);
  const bonuses = statusBonuses(player);
  if (bonuses.nanobloom) {
    player.nanobloomTick -= dt;
    if (player.nanobloomTick <= 0) {
      player.nanobloomTick = 1.1;
      player.hp = Math.min(player.maxHp, player.hp + .25);
      burst(player.x, player.y, "#78f5aa", 5, 28);
    }
  } else {
    player.nanobloomTick = 0;
  }
  if (bonuses.aegis) {
    player.aegisPulse -= dt;
    if (player.aegisPulse <= 0) {
      player.aegisPulse = .26;
      const threat = world.enemyBullets
        .filter((bullet) => !bullet.dead && distance(player, bullet) <= 33)
        .sort((a, b) => distance(player, a) - distance(player, b))[0];
      if (threat) {
        threat.dead = true;
        burst(threat.x, threat.y, "#76dbff", 5, 34);
      }
    }
  } else {
    player.aegisPulse = 0;
  }
}

function markProtocolProc(protocolId, x, y) {
  const protocol = PROTOCOLS.find((entry) => entry.id === protocolId);
  if (!protocol) return;
  world.protocolProcs += 1;
  world.protocolFlashTimer = Math.max(world.protocolFlashTimer, .38);
  burst(x, y, protocol.color, 8, 58);
  if (world.protocolSoundTimer <= 0) {
    audio.sfx("protocolProc");
    world.protocolSoundTimer = .14;
  }
}

function triggerAegisNova(player) {
  if (!relicBonuses().aegisNova || world.power.aegisCooldown > 0) return;
  world.power.aegisCooldown = 6;
  const threats = world.enemyBullets.filter((bullet) => !bullet.dead && interceptable(bullet) && distance(player, bullet) <= 36)
    .sort((a, b) => distance(player, a) - distance(player, b)).slice(0, 3);
  for (const bullet of threats) bullet.dead = true;
  for (const enemy of world.enemies) {
    if (enemy.dead || distance(player, enemy) > 36) continue;
    creditDamage("aegisNova", damageEnemy(enemy, baseShotDamage(player) * .8));
    if (enemy.hp <= 0) killEnemy(enemy, player.index, { derived: true });
  }
  powerEffect("impact", player.x, player.y, 36, "#82b8ff", 3);
  markProtocolProc("aegisNova", player.x, player.y);
}

const rushActive = () => world.rushTimer > 0;

function addRushCharge(type) {
  if (rushActive()) {
    if (["kill", "elite", "bossPhase"].includes(type)) {
      world.rushChain += type === "elite" ? 3 : 1;
      world.rushBestChain = Math.max(world.rushBestChain, world.rushChain);
      if (world.rushChain % 4 === 0) audio.sfx("rushHit");
    }
    return;
  }
  addRushAmount(SpaceRush.chargeForEvent(type, linkedNow(), teamRushBonuses()));
}

function startRush() {
  if (rushActive() || world.rushCooldown > 0 || !linkedNow()) return;
  world.power.pulseElapsed = 0;
  world.power.pulseCount = 0;
  world.power.chargeBudget = 0;
  world.power.hitBudget = 0;
  if (upgradeLevel("rushGuard")) { world.power.guardNodes = 3; world.power.guardRecovery = 0; }
  world.rushCharge = RUSH_CONFIG.threshold;
  world.rushTimer = RUSH_CONFIG.duration;
  world.rushChain = 0;
  world.rushCount += 1;
  world.rushPulseTimer = 0;
  world.rushGuardClearsThisRush = 0;
  for (const player of world.players) {
    if (player.downed) continue;
    burst(player.x, player.y, PLAYER_CONFIG[player.index].light, 36, 130);
  }
  world.flash = Math.max(world.flash, .58);
  world.shake = Math.max(world.shake, .48);
  world.cinematic = { type: "rush", timer: .9, total: .9 };
  audio.sfx("rushStart");
  pulseGamepad(0, 260, .58, .48);
  pulseGamepad(1, 260, .58, .48);
  showToast(t("toast.rushStart"));
}

function finishRush() {
  world.rushLastBonus = 0;
  world.rushTimer = 0;
  world.rushCharge = 0;
  world.rushCooldown = RUSH_CONFIG.cooldown;
  audio.sfx("rushEnd");
  showToast(t("toast.rushEnd", { chain: world.rushChain }));
}

function addRushAmount(amount) {
  if (rushActive() || world.rushCooldown > 0 || world.introTimer > 0 || world.clearTimer > 0 || world.routeChoice) return 0;
  const earned = Math.min(Math.max(0, amount), world.power.chargeBudget, RUSH_CONFIG.threshold - world.rushCharge);
  world.power.chargeBudget -= earned; world.rushCharge += earned;
  return earned;
}

function addRushHitCharge() {
  if (!linkedNow()) return;
  const earned = addRushAmount(Math.min(teamAverage("rushHitCharge"), world.power.hitBudget));
  world.power.hitBudget -= earned;
}

function updateRush(dt) {
  const state = world.power;
  const wasCooling = world.rushCooldown > 0;
  world.rushCooldown = Math.max(0, world.rushCooldown - dt);
  state.shieldBudget = Math.min(6, state.shieldBudget + 6 * dt);
  state.rescueCooldown = Math.max(0, state.rescueCooldown - dt);
  state.aegisCooldown = Math.max(0, state.aegisCooldown - dt);
  state.guardCooldown = Math.max(0, state.guardCooldown - dt);
  state.guardFlash = Math.max(0, state.guardFlash - dt);
  const connected = linkedNow();
  const bonuses = teamRushBonuses();
  if (connected && bonuses.rushGuard) {
    if (state.guardNodes < 3) {
      state.guardRecovery += dt;
      if (state.guardRecovery >= bonuses.rushGuardInterval) {
        state.guardRecovery -= bonuses.rushGuardInterval; state.guardNodes += 1;
      }
    } else state.guardRecovery = 0;
    if (state.guardNodes > 0 && state.guardCooldown <= 0) {
      const [a, b] = world.players;
      const threatTime = (entry) => Math.min(...world.players.map((p) => distance(p, entry) / Math.max(1, Math.hypot(entry.vx || 0, entry.vy || 0))));
      const bullet = world.enemyBullets.filter((entry) => !entry.dead && interceptable(entry)
        && pointToSegmentDistance(entry.x, entry.y, a.x, a.y, b.x, b.y) <= 10)
        .sort((x, y) => threatTime(x) - threatTime(y) || (x.serial || 0) - (y.serial || 0))[0];
      if (bullet) {
        bullet.dead = true; state.guardNodes -= 1; state.guardCooldown = .25; state.guardFlash = .3;
        world.rushGuardClears += 1;
        if (rushActive()) world.rushGuardClearsThisRush += 1;
        powerEffect("intercept", bullet.x, bullet.y, 9, "#b9efff", 2);
        audio.sfx("powerIntercept");
      }
    }
  }
  if (rushActive()) {
    const nextElapsed = Math.min(6, state.pulseElapsed + dt);
    const rank = upgradeLevel("rushOverdrive");
    if (rank) {
      const stats = SpaceRoguelike.tierStats("rushOverdrive", rank);
      const due = Math.floor((nextElapsed + 1e-8) / stats.interval);
      while (state.pulseCount < due) {
        state.pulseCount += 1;
        if (!connected) continue;
        for (const player of world.players) {
          const target = world.enemies.filter((e) => !e.dead && !(e.boss && e.phaseShield > 0) && e.y < player.y && distance(e, player) <= 180)
            .sort((a, b) => distance(a, player) - distance(b, player) || a.id - b.id)[0];
          if (!target) continue;
          emitPlayerShot(player, "overloadPulse", { damage: stats.damage, angle: Math.atan2(target.x - player.x, player.y - 9 - target.y) });
          audio.sfx("powerOverload", player.index);
        }
      }
    }
    state.pulseElapsed = nextElapsed;
    world.rushTimer = Math.max(0, 6 - nextElapsed);
    if (world.rushTimer <= 1e-8) finishRush();
    return;
  }
  if (wasCooling || world.rushCooldown > 0) { state.chargeBudget = 0; state.hitBudget = 0; return; }
  const eligible = world.introTimer <= 0 && world.clearTimer <= 0 && !world.routeChoice;
  if (!eligible) return;
  state.chargeBudget = Math.min(10, state.chargeBudget + 10 * dt);
  const budget = teamAverage("rushHitBudget");
  state.hitBudget = Math.min(budget, state.hitBudget + budget * dt);
  state.unlinkedTime = connected ? 0 : state.unlinkedTime + dt;
  if (connected) addRushAmount(RUSH_CONFIG.linkedChargePerSecond * bonuses.rushLinkedChargeRate * dt);
  else if (state.unlinkedTime > 3) world.rushCharge = Math.max(0, world.rushCharge - dt);
  if (connected && world.rushCharge >= RUSH_CONFIG.threshold && world.enemies.some((e) => !e.dead && !(e.boss && e.phaseShield > 0))) startRush();
}

function enemyTarget(source) {
  const targets = world.players.filter((player) => !player.downed);
  if (!targets.length) return { x: W / 2, y: H, vx: 0, vy: 0 };
  if (source.aiTargeting === "weakest") return targets.reduce((best, player) => player.hp / player.maxHp < best.hp / best.maxHp ? player : best);
  if (source.aiTargeting === "isolated") return targets.reduce((best, player) => Math.abs(player.x - W / 2) > Math.abs(best.x - W / 2) ? player : best);
  if (source.aiTargeting === "leading") return targets.reduce((best, player) => Math.hypot(player.vx || 0, player.vy || 0) > Math.hypot(best.vx || 0, best.vy || 0) ? player : best);
  if (Number.isInteger(source.squadTargetIndex)) {
    const assigned = targets.find((player) => player.index === source.squadTargetIndex);
    if (assigned) return assigned;
  }
  return targets.reduce((best, player) => distance(source, player) < distance(source, best) ? player : best);
}

function aimedVelocity(source, speed, spread = 0, lockedTarget = null) {
  const target = lockedTarget || enemyTarget(source);
  const lead = lockedTarget ? 0 : (source.aiLead || 0) + (COMBAT.doctrineFor(source.hullRole).aimLead || 0);
  const targetX = target.x + (target.vx || 0) * lead;
  const targetY = target.y + (target.vy || 0) * lead;
  const angle = Math.atan2(targetY - source.y, targetX - source.x) + rand(-spread, spread);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function makeEnemy(type, x = rand(25, W - 25), y = -15, options = {}) {
  const hull = SpaceExpedition.HULL_MODULES.find((entry) => entry.id === type) || SpaceExpedition.HULL_MODULES[0];
  const stats = { hp: hull.hp, r: hull.radius, score: hull.score };
  const elite = Boolean(options.elite);
  const stage = activeStage();
  const progress = clamp(world.stageTime / stage.duration, 0, 1);
  const build = options.build || (QA_ENEMY_MODULE_IDS
    ? SpaceExpedition.build(...QA_ENEMY_MODULE_IDS, 2, hull.id)
    : SpaceExpedition.assembleEnemy({
      stageIndex: world.stageIndex,
      progress,
      biome: stage.biome,
      branch: world.activeBranch,
      hullId: hull.id,
      elite,
      random,
    }));
  const branchHealth = world.stageIndex === 0 && progress < .08
    ? Math.min(1, world.activeBranch?.enemyHp || 1)
    : world.activeBranch?.enemyHp || 1;
  const contractHealth = (world.contract?.enemyHp || 1) * (stage.biome?.enemyHp || 1) * branchHealth;
  const adaptiveThreat = threatConfig();
  const combat = COMBAT.curveFor(world.stageIndex, progress);
  const anomaly = anomalyConfig();
  const eliteHealth = elite ? (QA_FORCE_ELITE ? 20 : 4.8) : 1;
  const powerHealth = [lerp(1, .68, clamp(progress / .3, 0, 1)), .62, .58][world.stageIndex];
  const maxHp = stats.hp * eliteHealth * contractHealth * build.hp * adaptiveThreat.enemyHp * powerHealth;
  const enemyRadius = stats.r * (elite ? 1.4 : 1) * build.scale;
  const enemyId = ++world.enemySerial;
  const formationId = options.formationId || 0;
  const enemy = {
    id: enemyId,
    type,
    hullRole: build.hullRole,
    hullNameKey: build.hullNameKey,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: maxHp,
    maxHp,
    r: enemyRadius,
    bodyRadius: enemyRadius * .8,
    score: Math.round(stats.score * (elite ? 4 : 1) * build.score),
    age: 0,
    shootTimer: rand(1.6, 3),
    eliteTimer: elite ? 1.6 : 0,
    seed: rand(0, TAU),
    dead: false,
    boss: false,
    elite,
    bossAdd: Boolean(options.bossAdd),
    hitFlash: 0,
    movementModule: build.movementId,
    movementNameKey: build.movementNameKey,
    weaponModule: build.weaponId,
    weaponNameKey: build.weaponNameKey,
    weaponPattern: build.weaponPattern || "",
    coreModule: build.coreId,
    coreNameKey: build.coreNameKey,
    aiModule: build.aiId,
    aiNameKey: build.aiNameKey,
    payloadModule: build.payloadId,
    payloadNameKey: build.payloadNameKey,
    buildSignature: build.signature,
    moduleScale: build.scale,
    moveSpeed: build.speed * adaptiveThreat.moveSpeed * anomaly.enemyMoveSpeed * combat.moveSpeed,
    moveSway: build.sway,
    moveDrift: build.drift,
    weaponBulletSpeed: build.bulletSpeed,
    weaponExtraShots: build.extraShots,
    weaponRingBonus: build.ringBonus,
    weaponCooldown: build.cooldown * build.aiCooldown,
    weaponSpread: build.spread,
    moduleBarrier: build.barrier * powerHealth,
    moduleBarrierMax: build.barrier,
    volatileRadius: build.volatileRadius,
    aiTargeting: build.targeting,
    aiSteer: build.aiSteer,
    aiFlank: build.aiFlank,
    aiLead: build.aiLead,
    aiEvasion: build.aiEvasion,
    aiState: "entry",
    aiStateTimer: COMBAT.stateDuration(build.hullRole, "entry", world.stageIndex, elite, world.enemySerial),
    aiStateDuration: 1,
    aiStateAge: 0,
    attackState: "entry",
    attackCharge: 0,
    attackPattern: "",
    attackCycle: 0,
    attackTargetX: W / 2,
    attackTargetY: H - 36,
    attackTargetIndex: null,
    speciesPattern: build.speciesPattern || "",
    deathrattle: world.stageIndex === 0 && progress < .42 ? "" : build.deathrattle || "",
    nativeBiome: build.nativeBiome || "",
    collisionDamage: build.collisionDamage || 2,
    collisionCooldown: 0,
    formationId,
    packId: options.packId || formationId || `${world.stageIndex}:${Math.floor(world.stageTime / 4)}`,
    formationOffsetX: options.formationOffsetX || 0,
    formationDelay: options.formationDelay || 0,
    squadTargetIndex: Number.isInteger(options.squadTargetIndex) ? options.squadTargetIndex : null,
    stationX: clamp(Number.isFinite(options.stationX) ? options.stationX : x, 22, W - 22),
    stationYBias: (enemyId % 3 - 1) * 20,
    retreating: false,
    debuff: build.debuff,
    debuffDuration: build.debuffDuration,
    debuffIntensity: build.debuffIntensity,
    payloadColor: build.payloadColor,
    moduleColor: world.activeBranch?.color || stage.biome?.secondary || stage.accent,
    threatReward: adaptiveThreat.score,
    anomalyReward: anomaly.score,
  };
  enemy.aiStateDuration = enemy.aiStateTimer + enemy.formationDelay;
  enemy.aiStateTimer = enemy.aiStateDuration;
  if (build.moduleSignature !== "standard.pulse.light.sentry.clean" && !world.discoveredVariants.has(build.signature)) {
    world.discoveredVariants.add(build.signature);
    if (world.variantNoticeCooldown <= 0) {
      world.variantNotice = { enemy, timer: 2.2, total: 2.2 };
      world.variantNoticeCooldown = 6.4;
    }
  }
  return enemy;
}

function addFormationEnemy(type, x, y, options = {}) {
  if (world.stageIndex > 0) {
    const curve = COMBAT.curveFor(world.stageIndex, world.stageTime / activeStage().duration);
    const budget = 10 + world.stageIndex * 2 + (curve.beat.id === "killzone" ? 2 : 0);
    const occupied = world.enemies.reduce((sum, enemy) => sum + (enemy.dead || enemy.boss ? 0 : enemy.elite ? 2.5 : 1), 0);
    if (occupied + (options.elite ? 2.5 : 1) > budget) return null;
  }
  const pending = world.pendingFormation;
  const enemy = makeEnemy(type, x, y, {
    ...options,
    formationId: options.formationId || pending?.id || 0,
    squadTargetIndex: Number.isInteger(options.squadTargetIndex) ? options.squadTargetIndex : pending?.targetIndex,
    stationX: Number.isFinite(options.stationX) ? options.stationX : x,
  });
  if (Number.isFinite(options.vx)) enemy.vx = options.vx;
  if (Number.isFinite(options.shootDelay)) enemy.shootTimer = options.shootDelay;
  world.enemies.push(enemy);
  return enemy;
}

function spawnStageEvent(event) {
  const stage = world.stageIndex;
  const progress = clamp(world.stageTime / activeStage(stage).duration, 0, 1);
  const nativeType = stage === 0 && progress < .25 ? null : activeStage(stage).biome?.speciesId;
  const formationId = ++world.formationSerial;
  world.pendingFormation = { id: formationId, targetIndex: formationId % 2 };
  world.activeFormations.add(formationId);
  if (event.pattern === "chevron") {
    [-2, -1, 0, 1, 2].forEach((column) => addFormationEnemy(column === 0 && nativeType ? nativeType : "scout", W / 2 + column * 39, -12 - Math.abs(column) * 13));
  } else if (event.pattern === "crossfire") {
    for (let row = 0; row < 2; row += 1) {
      addFormationEnemy(row === 0 && nativeType ? nativeType : "dart", -10, 48 + row * 42, { vx: 34, shootDelay: 2 + row * .35 });
      addFormationEnemy(row === 0 && nativeType ? nativeType : "dart", W + 10, 69 + row * 42, { vx: -34, shootDelay: 2.2 + row * .35 });
    }
  } else if (event.pattern === "convoy") {
    addFormationEnemy(nativeType || "tank", W / 2, -18, { shootDelay: 2.5 });
    addFormationEnemy("scout", W / 2 - 58, -34, { shootDelay: 2.1 });
    addFormationEnemy("scout", W / 2 + 58, -34, { shootDelay: 2.3 });
    addFormationEnemy("dart", W / 2 - 104, -55);
    addFormationEnemy("dart", W / 2 + 104, -55);
  } else if (event.pattern === "pinwheel") {
    [72, 184, 296, 408].forEach((x, index) => addFormationEnemy(index === 1 && nativeType ? nativeType : "spinner", x, -16 - (index % 2) * 25, { shootDelay: 1.7 + index * .2 }));
  } else if (event.pattern === "minefield") {
    [55, 145, 240, 335, 425].forEach((x, index) => addFormationEnemy(index === 2 && nativeType ? nativeType : "mine", x, -14 - (index % 2) * 30, { shootDelay: 2.1 + index * .14 }));
  } else if (event.pattern === "pincer") {
    for (let row = 0; row < 3; row += 1) {
      const pincerType = row === 1 && nativeType ? nativeType : row === 1 ? "spinner" : "dart";
      addFormationEnemy(pincerType, -12, 42 + row * 42, { vx: 38, shootDelay: 1.9 + row * .22 });
      addFormationEnemy(pincerType, W + 12, 61 + row * 42, { vx: -38, shootDelay: 2.05 + row * .22 });
    }
  } else if (event.pattern === "elite") {
    addFormationEnemy(nativeType || event.eliteType, W / 2, -22, { elite: true, shootDelay: 1.4 });
    const guardType = stage === 0 ? "scout" : stage === 1 ? "dart" : "mine";
    addFormationEnemy(guardType, W / 2 - 68, -42, { shootDelay: 2.4 });
    addFormationEnemy(guardType, W / 2 + 68, -42, { shootDelay: 2.6 });
    audio.sfx("elite");
  }
  for (let reinforcement = 1; reinforcement < (event.tier || 1); reinforcement += 1) {
    const guardType = stage === 0 ? "scout" : stage === 1 ? "dart" : "spinner";
    const spacing = 84 + reinforcement * 22;
    addFormationEnemy(guardType, W / 2 - spacing, -42 - reinforcement * 22, { shootDelay: 2.45 + reinforcement * .24 });
    addFormationEnemy(guardType, W / 2 + spacing, -42 - reinforcement * 22, { shootDelay: 2.65 + reinforcement * .24 });
  }
  world.pendingFormation = null;
  world.stageEvent = { ...event, timer: 3.1, total: 3.1 };
  world.spawnTimer = Math.max(world.spawnTimer, 1.8);
  world.flash = Math.max(world.flash, .18);
  world.shake = Math.max(world.shake, .14);
  showToast(t("toast.event", { route: stageText(activeStage(stage), "code"), event: eventText(event, "name") }));
}

function enterSector(sectorIndex) {
  const key = `${world.stageIndex}:${sectorIndex}`;
  if (!world.researchSectors.has(key)) {
    world.researchSectors.add(key);
    if (world.researchEffects.sectorEnergy > 0) {
      addNovaCharge("encounter", world.researchEffects.sectorEnergy);
      researchShield();
    }
  }
  world.sectorIndex = sectorIndex;
  world.globalSector = DIRECTOR.globalSector(world.stageIndex, sectorIndex);
  activateAnomaly(sectorIndex, { announce: true });
  world.sectorFlashTimer = 1.45;
  world.flash = Math.max(world.flash, .24);
  world.shake = Math.max(world.shake, .2);
  world.spawnTimer = Math.max(world.spawnTimer, 1.15);
}

function leastCrowdedFormationCenter() {
  const lanes = [84, 162, 240, 318, 396];
  const rotation = Math.floor(random() * lanes.length);
  let bestCenter = lanes[rotation];
  let bestCrowding = Number.POSITIVE_INFINITY;
  for (let step = 0; step < lanes.length; step += 1) {
    const center = lanes[(rotation + step) % lanes.length];
    const crowding = world.enemies.reduce((score, enemy) => {
      if (enemy.dead || enemy.boss || enemy.aiState === "retreat") return score;
      const anchor = Number.isFinite(enemy.stationX) ? enemy.stationX : enemy.x;
      const proximity = Math.max(0, 128 - Math.abs(anchor - center));
      return score + proximity * proximity;
    }, 0);
    if (crowding < bestCrowding) {
      bestCrowding = crowding;
      bestCenter = center;
    }
  }
  return bestCenter;
}

function rollAmbientElite(combat, progress) {
  const liveElites = world.enemies.filter((enemy) => !enemy.dead && !enemy.boss && enemy.elite).length;
  if (liveElites >= 1 + world.stageIndex) return false;
  if (QA_FORCE_ELITE) return true;
  const chance = COMBAT.ambientEliteChance({
    stageIndex: world.stageIndex,
    progress,
    threatTier: world.threatTier,
    beatId: combat.beat.id,
  });
  return random() < chance;
}

function spawnTacticalWing(maxMembers = 3) {
  const stage = activeStage();
  const progress = clamp(world.stageTime / stage.duration, 0, 1);
  const combat = COMBAT.curveFor(world.stageIndex, progress);
  const formation = COMBAT.chooseFormation({ stageIndex: world.stageIndex, patternTier: combat.patternTier, random });
  const formationId = ++world.formationSerial;
  const targetIndex = formationId % 2;
  const center = leastCrowdedFormationCenter();
  const members = formation.members.slice(0, Math.max(1, maxMembers));
  const eliteLeader = rollAmbientElite(combat, progress);
  members.forEach(([type, offsetX, delay], index) => {
    const memberType = index === 0 && stage.biome?.speciesId && !(world.stageIndex === 0 && progress < .25) ? stage.biome.speciesId : type;
    const x = clamp(center + offsetX, 24, W - 24);
    const enemy = makeEnemy(memberType, x, -16 - Math.abs(offsetX) * .12 - delay * 18, {
      elite: eliteLeader && index === 0,
      formationId,
      formationOffsetX: offsetX,
      formationDelay: delay,
      squadTargetIndex: targetIndex,
      stationX: x,
    });
    world.enemies.push(enemy);
  });
  if (eliteLeader) {
    world.ambientEliteSpawns += 1;
    audio.sfx("elite");
  }
  world.activeFormations.add(formationId);
  world.lastFormationId = formation.id;
  return members.length;
}

function spawnEnemy(maxMembers = 1) {
  const stage = activeStage();
  const progress = clamp(world.stageTime / stage.duration, 0, 1);
  const combat = COMBAT.curveFor(world.stageIndex, progress);
  if (!QA_HULL_ID && maxMembers > 1 && random() < combat.wingChance) return spawnTacticalWing(maxMembers);
  const type = QA_HULL_ID || SpaceExpedition.chooseEnemyHull({ stageIndex: world.stageIndex, progress, biome: stage.biome, random });
  const elite = rollAmbientElite(combat, progress);

  if (progress > 0.35 && random() < 0.08 + world.stageIndex * 0.035) {
    const side = random() < 0.5 ? -12 : W + 12;
    const enemy = makeEnemy(type, side, rand(45, 130), { elite });
    enemy.vx = side < 0 ? rand(25, 45) : rand(-45, -25);
    world.enemies.push(enemy);
  } else {
    world.enemies.push(makeEnemy(type, undefined, undefined, { elite }));
  }
  if (elite) {
    world.ambientEliteSpawns += 1;
    audio.sfx("elite");
  }
  return 1;
}

function spawnBoss() {
  if (world.activeEncounter) finishEncounter(false);
  const baseHealth = [340, 490, 690][world.stageIndex];
  const stage = activeStage();
  const health = (QA_BOSS_STATE_MODE ? baseHealth * 100 : QA_FAST_MODE ? baseHealth * .14 : baseHealth) * (world.contract?.enemyHp || 1) * (stage.biome?.enemyHp || 1) * (world.activeBranch?.enemyHp || 1);
  world.boss = {
    id: ++world.enemySerial,
    type: `boss${world.stageIndex + 1}`,
    boss: true,
    x: W / 2,
    y: -45,
    vx: 0,
    vy: 0,
    hp: health,
    maxHp: health,
    r: [28, 32, 37][world.stageIndex],
    bodyRadius: [28, 32, 37][world.stageIndex],
    score: 5000 * (world.stageIndex + 1),
    age: 0,
    shootTimer: 1.5,
    secondaryTimer: 3.4,
    attackState: "recover",
    attackId: "",
    attackTimer: 1.15,
    attackDuration: 1,
    attackIndex: 0,
    attackCharge: 0,
    attackTargetX: W / 2,
    attackTargetY: H - 48,
    attackTargetIndex: null,
    phaseLevel: QA_BOSS_STATE_MODE ? QA_BOSS_PHASE : 1,
    phaseShield: QA_FAST_MODE ? .45 : 2.2,
    hitFlash: 0,
    seed: 0,
    dead: false,
  };
  world.enemies.push(world.boss);
  world.bossSpawned = true;
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.stageEvent = null;
  world.cinematic = { type: "boss", timer: 2.4, total: 2.4 };
  world.flash = 0.7;
  world.shake = 0.5;
  audio.setStage(world.stageIndex, true);
  audio.sfx("boss");
  showToast(t("toast.warning", { boss: stageText(stage, "boss") }));
}

function enterBossPhase(boss, nextPhase) {
  boss.phaseLevel = nextPhase;
  boss.phaseShield = QA_FAST_MODE ? .28 : 1.15;
  boss.shootTimer = Math.max(boss.shootTimer, 1.25);
  boss.attackState = "recover";
  boss.attackId = "";
  boss.attackTimer = QA_FAST_MODE ? .32 : .9;
  boss.attackCharge = 0;
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.flash = Math.max(world.flash, .62);
  world.shake = Math.max(world.shake, .52);
  world.cinematic = { type: "phase", timer: 1.1, total: 1.1 };
  burst(boss.x, boss.y, activeStage().accent, 42, 120);
  addNovaCharge("bossPhase", 5);
  addRushCharge("bossPhase");
  audio.sfx("bossPhase");
  showToast(`${t("hud.phaseTitle", { phase: nextPhase })} // ${bossPhaseText(world.stageIndex, nextPhase)}`);
}

function enemyBullet(x, y, vx, vy, color = "#ff7d8b", size = 3, source = null, options = {}) {
  const stage = activeStage();
  const progress = world.stageTime / stage.duration;
  const combat = COMBAT.curveFor(world.stageIndex, progress);
  const budgetClass = options.budgetClass || (source?.boss ? "boss" : source?.dead && source?.deathrattle ? "deathrattle" : "ordinary");
  const budgetBonus = budgetClass === "boss" ? 34 : budgetClass === "deathrattle" ? 12 : 0;
  const bulletCap = combat.bulletCap + budgetBonus;
  if (world.enemyBullets.filter((bullet) => !bullet.dead).length >= bulletCap) return null;
  const branchSpeed = world.stageIndex === 0 && progress < .08
    ? Math.min(1, world.activeBranch?.bulletSpeed || 1)
    : world.activeBranch?.bulletSpeed || 1;
  const biomeSpeed = world.stageIndex === 0 && progress < .08
    ? Math.min(1, stage.biome?.bulletSpeed || 1)
    : stage.biome?.bulletSpeed || 1;
  const tacticalSpeed = source?.boss ? 1 : combat.bulletSpeed;
  const speedMultiplier = (world.contract?.bulletSpeed || 1) * biomeSpeed * branchSpeed * threatConfig().bulletSpeed * anomalyConfig().enemyBulletSpeed * tacticalSpeed;
  const finiteInput = [x, y, vx, vy].every(Number.isFinite);
  if (!finiteInput) world.combatInvalidProjectiles += 1;
  const safeX = Number.isFinite(x) ? x : W / 2;
  const safeY = Number.isFinite(y) ? y : 0;
  const safeVx = Number.isFinite(vx) ? vx : 0;
  const safeVy = Number.isFinite(vy) ? vy : 62;
  const bullet = {
    x: safeX,
    y: safeY,
    vx: safeVx * speedMultiplier,
    vy: safeVy * speedMultiplier,
    r: size,
    color: source?.debuff ? source.payloadColor : color,
    age: 0,
    dead: false,
    weaponModule: source?.weaponModule || "pulse",
    payloadModule: source?.payloadModule || "clean",
    debuff: source?.debuff || "",
    debuffDuration: source?.debuffDuration || 0,
    debuffIntensity: source?.debuffIntensity || 0,
    payloadColor: source?.payloadColor || color,
    bossStage: source?.boss ? world.stageIndex : null,
    bossPhase: source?.boss ? source.phaseLevel : 0,
    behavior: options.behavior || "linear",
    pattern: options.pattern || source?.attackPattern || "linear",
    curve: (options.curve || 0) * (source?.elite ? 1.12 : 1),
    homing: options.homing || 0,
    homingDuration: options.homingDuration || 0,
    targetIndex: Number.isInteger(options.targetIndex) ? options.targetIndex : source?.squadTargetIndex,
    triggerAge: options.triggerAge || 0,
    burstCount: options.burstCount || 0,
    burstSpeed: (options.burstSpeed || 0) * speedMultiplier,
    baseSpeed: Math.hypot(safeVx, safeVy) * speedMultiplier,
    damage: Math.max(1, Number(options.damage) || 1),
    blastRadius: Math.max(0, Number(options.blastRadius) || (options.behavior === "mine" ? 26 : options.behavior === "blast" ? 34 : 0)),
    blastDamage: Math.max(0, Number(options.blastDamage) || (options.behavior === "mine" ? 1 : options.behavior === "blast" ? 2 : 0)),
    enemyBlastDamage: Math.max(0, Number(options.enemyBlastDamage) || 0),
    anchored: Boolean(options.anchored),
    sourceId: source?.id || 0,
    budgetClass,
    budgetBonus,
  };
  world.enemyBullets.push(bullet);
  return bullet;
}

function enemyBeam(source, target, options = {}) {
  if (!source || world.enemyBeams.length >= 12) return null;
  const finiteInput = [source.x, source.y, source.r, target?.x, target?.y].every(Number.isFinite);
  if (!finiteInput) world.combatInvalidProjectiles += 1;
  const startX = Number.isFinite(source.x) ? source.x : W / 2;
  const startY = (Number.isFinite(source.y) ? source.y : 0) + (Number.isFinite(source.r) ? source.r : 4) * .45;
  const targetX = Number.isFinite(target?.x) ? target.x : W / 2;
  const targetY = Number.isFinite(target?.y) ? target.y : H - 42;
  const angle = Math.atan2(targetY - startY, targetX - startX) + (options.angleOffset || 0);
  const reach = Math.hypot(W, H) * 1.45;
  const beam = {
    x1: startX,
    y1: startY,
    x2: startX + Math.cos(angle) * reach,
    y2: startY + Math.sin(angle) * reach,
    age: 0,
    duration: options.duration || .34,
    width: options.width || 5,
    damage: options.damage || (source.boss ? 2 : source.elite ? 2 : 1),
    color: options.color || (source.boss ? activeStage().accent : "#ffdf68"),
    pattern: options.pattern || source.attackPattern || "laserLance",
    sourceId: source.id,
    bossStage: source.boss ? world.stageIndex : null,
    debuff: source.debuff || "",
    debuffDuration: source.debuffDuration || 0,
    debuffIntensity: source.debuffIntensity || 0,
    payloadColor: source.payloadColor || options.color || "#ffdf68",
    hitIds: [],
    dead: false,
  };
  world.enemyBeams.push(beam);
  return beam;
}

function fireAimed(enemy, speed = 62, count = 1, spread = 0.12, color, options = {}) {
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  const finalCount = count + (enemy.weaponExtraShots || 0);
  const finalSpread = spread * (enemy.weaponSpread || 1) * threatConfig().aimSpread;
  for (let i = 0; i < finalCount; i += 1) {
    const offset = (i - (finalCount - 1) / 2) * finalSpread;
    const velocity = aimedVelocity(enemy, finalSpeed, 0, options.target || null);
    const angle = Math.atan2(velocity.vy, velocity.vx) + offset;
    enemyBullet(enemy.x, enemy.y + enemy.r * 0.5, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, color, enemy.weaponModule === "sniper" ? 2.25 : 3, enemy, options);
  }
  const sound = enemy.weaponModule === "twin" ? "enemyTwin" : enemy.weaponModule === "sniper" ? "enemySniper" : "enemyShoot";
  audio.sfx(sound);
}

function fireRing(enemy, count, speed, phase = 0, color = "#ff6b8c", options = {}) {
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  const finalCount = count + (enemy.weaponRingBonus || 0);
  for (let i = 0; i < finalCount; i += 1) {
    const angle = phase + (i / finalCount) * TAU;
    enemyBullet(enemy.x, enemy.y, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, color, 2.5, enemy, options);
  }
  audio.sfx(enemy.weaponModule === "orbit" ? "enemyOrbit" : "enemyShoot");
}

function lockedAttackTarget(enemy) {
  return {
    x: Number.isFinite(enemy.attackTargetX) ? enemy.attackTargetX : W / 2,
    y: Number.isFinite(enemy.attackTargetY) ? enemy.attackTargetY : H - 42,
    vx: 0,
    vy: 0,
    index: Number.isInteger(enemy.attackTargetIndex) ? enemy.attackTargetIndex : undefined,
  };
}

function fireLaneWall(enemy, speed, pattern = "laneWall") {
  const targetX = enemy.attackTargetX || W / 2;
  const spacing = 34;
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  for (let x = 18; x <= W - 18; x += spacing) {
    if (Math.abs(x - targetX) < 39) continue;
    enemyBullet(x, enemy.y + enemy.r * .45, (x - W / 2) * .018, finalSpeed, "#ff6f72", 2.7, enemy, { pattern });
  }
  audio.sfx("enemyTwin");
}

function firePincer(enemy, speed, pattern = "pincer") {
  const target = lockedAttackTarget(enemy);
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  for (const side of [-1, 1]) {
    const origin = { ...enemy, x: side < 0 ? 12 : W - 12, y: clamp(enemy.y + 22, 58, 132) };
    const velocity = aimedVelocity(origin, finalSpeed, 0, target);
    for (let lane = -1; lane <= 1; lane += 1) {
      const angle = Math.atan2(velocity.vy, velocity.vx) + lane * .12;
      enemyBullet(origin.x, origin.y + lane * 8, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, side < 0 ? "#ff668c" : "#b86cff", 2.5, enemy, { pattern, behavior: "curve", curve: side * -.18 });
    }
  }
  audio.sfx("enemyTwin");
}

function fireSeedMine(enemy, cluster = false) {
  const count = cluster ? 3 : 1;
  const target = lockedAttackTarget(enemy);
  for (let index = 0; index < count; index += 1) {
    const finalSpeed = (48 + index * 3) * (enemy.weaponBulletSpeed || 1);
    const velocity = aimedVelocity(enemy, finalSpeed, 0, target);
    const angle = Math.atan2(velocity.vy, velocity.vx) + (index - (count - 1) / 2) * .26;
    enemyBullet(enemy.x, enemy.y + enemy.r * .4, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, "#ff5470", 3.2, enemy, {
      pattern: cluster ? "seedCluster" : "seedMine",
      behavior: "mine",
      triggerAge: 1.05 + index * .16,
      burstCount: cluster ? 6 : 7,
      burstSpeed: cluster ? 55 : 62,
    });
  }
  audio.sfx("enemyOrbit");
}

function fireHunterSeeker(enemy, cluster = false, pattern = "hunterSeeker") {
  const target = lockedAttackTarget(enemy);
  const academy = world.stageIndex === 0;
  fireAimed(enemy, academy ? (cluster ? 88 : 96) : cluster ? 96 : 104, academy ? (cluster ? 2 : 1) : cluster ? 3 : 2, cluster ? .14 : .08, "#ff5fa2", {
    target,
    pattern,
    behavior: "homing",
    homing: academy ? 1.55 : cluster ? 2.05 : 2.35,
    homingDuration: academy ? (cluster ? 1.45 : 1.7) : cluster ? 2.7 : 3.15,
    targetIndex: target.index,
  });
}

function fireBlastSeed(enemy, cluster = false, pattern = "blastSeed") {
  const target = lockedAttackTarget(enemy);
  const count = cluster ? 3 : 1;
  for (let index = 0; index < count; index += 1) {
    const speed = (56 + world.stageIndex * 6 + index * 2) * (enemy.weaponBulletSpeed || 1);
    const velocity = aimedVelocity(enemy, speed, 0, target);
    const angle = Math.atan2(velocity.vy, velocity.vx) + (index - (count - 1) / 2) * .18;
    const blastRadius = cluster ? 34 : 42;
    const travelDistance = Math.hypot(target.x - enemy.x, target.y - (enemy.y + enemy.r * .45));
    const projectile = enemyBullet(enemy.x, enemy.y + enemy.r * .45, Math.cos(angle) * speed, Math.sin(angle) * speed, "#ff7a4f", 3.6, enemy, {
      pattern,
      behavior: "blast",
      blastRadius,
      blastDamage: enemy.elite ? 3 : 2,
      burstCount: cluster ? 8 : 10,
      burstSpeed: cluster ? 58 : 64,
      targetIndex: target.index,
    });
    if (projectile) projectile.triggerAge = clamp((travelDistance - blastRadius * .58) / Math.max(1, projectile.baseSpeed), .52, 2.55) + index * .05;
  }
  audio.sfx("enemyOrbit");
}

function fireLaser(enemy, sweep = false, pattern = "laserLance") {
  const target = lockedAttackTarget(enemy);
  const offsets = sweep ? [-.12, .12] : [0];
  for (const angleOffset of offsets) enemyBeam(enemy, target, {
    pattern,
    angleOffset,
    width: sweep ? 4.6 : enemy.elite ? 7 : 5.4,
    damage: enemy.elite ? 3 : 2,
    duration: sweep ? .42 : .32,
    color: sweep ? "#ff72d4" : "#ffe070",
  });
  audio.sfx("enemySniper");
}

function executeEnemyPattern(enemy) {
  const stage = world.stageIndex;
  const progress = clamp(world.stageTime / activeStage().duration, 0, 1);
  const combat = COMBAT.curveFor(stage, progress);
  const pattern = enemy.attackPattern || COMBAT.patternFor({ role: enemy.hullRole, weaponId: enemy.weaponModule, weaponPattern: enemy.weaponPattern, speciesPattern: enemy.speciesPattern, patternTier: combat.patternTier, cycle: enemy.attackCycle, elite: enemy.elite });
  const target = lockedAttackTarget(enemy);
  const tier = combat.patternTier;
  world.combatPatterns.add(pattern);
  enemy.attackCycle += 1;
  if (pattern === "snapBurst") {
    fireAimed(enemy, 62 + stage * 8, tier >= 3 ? 2 : 1, .08, "#ff8aa3", { target, targetIndex: target.index, pattern, behavior: tier >= 3 ? "homing" : "linear", homing: .82, homingDuration: .72 });
  } else if (pattern === "twinBurst") {
    fireAimed(enemy, 68 + stage * 8, 2, .12, "#ffc45e", { target, pattern });
  } else if (pattern === "predictiveFan") {
    fireAimed(enemy, 70 + stage * 9, 3 + Math.floor(tier / 3), .16, "#ff936b", { target, pattern });
  } else if (pattern === "sweep") {
    fireAimed(enemy, 66 + stage * 8, 5, .2, "#ff6f88", { target, pattern, behavior: "curve", curve: Math.sin(enemy.seed) * .2 });
  } else if (pattern === "lance" || pattern === "twinLance") {
    fireAimed(enemy, 108 + stage * 12, pattern === "twinLance" ? 2 : 1, .055, "#ffcf62", { target, pattern, behavior: "brake", damage: enemy.elite ? 3 : 2 });
  } else if (pattern === "laserLance" || pattern === "laserSweep") {
    fireLaser(enemy, pattern === "laserSweep", pattern);
  } else if (pattern === "hunterSeeker") {
    fireHunterSeeker(enemy, tier >= 4, pattern);
  } else if (pattern === "blastSeed" || pattern === "proximityBloom") {
    fireBlastSeed(enemy, pattern === "proximityBloom", pattern);
  } else if (pattern === "ramCharge") {
    enemy.aiStateDuration = enemy.elite ? 1.05 : .86;
    enemy.aiStateTimer = enemy.aiStateDuration;
    audio.sfx("enemyCharge");
  } else if (pattern === "heavyFan") {
    fireAimed(enemy, 64 + stage * 7, 4, .2, "#ff6f63", { target, pattern });
  } else if (pattern === "laneWall") {
    fireLaneWall(enemy, 60 + stage * 8, pattern);
  } else if (pattern === "spiral") {
    fireRing(enemy, 7 + stage * 2, 52 + stage * 6, enemy.age * .72, "#b58aff", { pattern, behavior: "curve", curve: .34 });
  } else if (pattern === "counterSpiral") {
    fireRing(enemy, 6 + stage, 50 + stage * 6, enemy.age * .6, "#b58aff", { pattern, behavior: "curve", curve: .44 });
    fireRing(enemy, 6 + stage, 61 + stage * 6, -enemy.age * .5 + .2, "#ff668c", { pattern, behavior: "curve", curve: -.4 });
  } else if (pattern === "pincer") {
    firePincer(enemy, 70 + stage * 8, pattern);
  } else if (pattern === "seedMine" || pattern === "seedCluster") {
    fireSeedMine(enemy, pattern === "seedCluster");
  } else if (pattern === "commandSalvo") {
    fireAimed(enemy, 72 + stage * 8, 3, .13, "#ffe16c", { target, pattern });
    fireRing(enemy, 5 + stage, 48 + stage * 5, enemy.age * .28, "#ff87d7", { pattern });
  } else if (pattern === "commandCross") {
    fireLaneWall(enemy, 64 + stage * 8, pattern);
    firePincer(enemy, 68 + stage * 7, pattern);
  } else if (pattern === "eliteHalo") {
    fireRing(enemy, 8 + stage * 2, 56 + stage * 7, enemy.age * .34, activeStage().accent, { pattern, behavior: "curve", curve: .28, damage: 2 });
  } else if (pattern === "eliteCross") {
    firePincer(enemy, 74 + stage * 8, pattern);
    fireAimed(enemy, 78 + stage * 8, 3, .16, "#fff0a0", { target, pattern, damage: 2 });
  }
  world.shake = Math.max(world.shake, enemy.elite ? .24 : .08);
}

function setEnemyState(enemy, state) {
  enemy.aiState = state;
  enemy.attackState = state;
  enemy.aiStateAge = 0;
  const combat = COMBAT.curveFor(world.stageIndex, clamp(world.stageTime / activeStage().duration, 0, 1));
  const fireCompression = state === "position" || state === "recover"
    ? Math.max(.52, (enemy.weaponCooldown || 1) / (threatConfig().fireRate * anomalyConfig().enemyFireRate * combat.fireRate))
    : 1;
  enemy.aiStateDuration = state === "retreat"
    ? 3
    : COMBAT.stateDuration(enemy.hullRole, state, world.stageIndex, enemy.elite, enemy.seed + enemy.attackCycle) * fireCompression;
  enemy.aiStateTimer = enemy.aiStateDuration;
  enemy.attackCharge = 0;
  world.combatStateTransitions += 1;
  if (state === "telegraph") {
    if (world.stageIndex > 0) {
      const activeAttackers = world.enemies.filter((other) => other !== enemy && !other.dead && !other.boss
        && ["telegraph", "attack"].includes(other.aiState)).length;
      const attackSlots = combat.beat.id === "release" || world.growthGrace > 0 || world.boss ? 2 : 4;
      if (activeAttackers >= attackSlots) {
        world.pressureHolds += 1;
        setEnemyState(enemy, "recover");
        return;
      }
    }
    const target = enemyTarget(enemy);
    enemy.attackTargetX = target.x + (target.vx || 0) * ((enemy.aiLead || 0) + COMBAT.doctrineFor(enemy.hullRole).aimLead);
    enemy.attackTargetY = target.y + (target.vy || 0) * ((enemy.aiLead || 0) + COMBAT.doctrineFor(enemy.hullRole).aimLead);
    enemy.attackTargetIndex = Number.isInteger(target.index) ? target.index : null;
    enemy.attackPattern = COMBAT.patternFor({ role: enemy.hullRole, weaponId: enemy.weaponModule, weaponPattern: enemy.weaponPattern, speciesPattern: enemy.speciesPattern, patternTier: combat.patternTier, cycle: enemy.attackCycle, elite: enemy.elite });
    const highRisk = (pattern) => ["laserLance", "laserSweep", "ramCharge", "blastSeed", "proximityBloom"].includes(pattern);
    if (highRisk(enemy.attackPattern)) {
      const reserved = new Set(world.enemies.filter((other) => other !== enemy && !other.dead && !other.boss
        && ["telegraph", "attack"].includes(other.aiState) && highRisk(other.attackPattern)).map((other) => other.id));
      for (const beam of world.enemyBeams) if (!beam.dead) reserved.add(beam.sourceId);
      for (const bullet of world.enemyBullets) if (!bullet.dead && bullet.behavior === "blast") reserved.add(bullet.sourceId);
      const allowance = combat.beat.id === "release" || world.growthGrace > 0 || world.boss ? 1 : 2;
      if (reserved.size >= allowance) {
        world.pressureHolds += 1;
        setEnemyState(enemy, "recover");
        return;
      }
    }
    if (enemy.attackPattern === "laserLance") enemy.aiStateDuration = Math.max(enemy.aiStateDuration, 1.12);
    else if (enemy.attackPattern === "laserSweep") enemy.aiStateDuration = Math.max(enemy.aiStateDuration, 1.28);
    if (enemy.attackPattern === "ramCharge") {
      const dx = enemy.attackTargetX - enemy.x;
      const dy = enemy.attackTargetY - enemy.y;
      const range = Math.max(1, Math.hypot(dx, dy));
      enemy.attackEndX = clamp(enemy.attackTargetX + dx / range * 48, 12, W - 12);
      enemy.attackEndY = clamp(enemy.attackTargetY + dy / range * 48, 18, H + 24);
    }
    enemy.aiStateTimer = enemy.aiStateDuration;
    world.combatTelegraphs += 1;
    audio.sfx("enemyCharge");
  } else if (state === "attack") {
    executeEnemyPattern(enemy);
  }
}

function advanceEnemyState(enemy, canFire) {
  let next = COMBAT.nextState(enemy.hullRole, enemy.aiState);
  if (next === "telegraph" && !canFire) next = "position";
  setEnemyState(enemy, next);
}

function updateEnemyTactics(enemy, dt, canFire) {
  const doctrine = COMBAT.doctrineFor(enemy.hullRole);
  const target = enemyTarget(enemy);
  const flankSide = Math.sin(enemy.seed * 2.17) >= 0 ? 1 : -1;
  const formationBias = enemy.formationId ? enemy.formationOffsetX * .52 : 0;
  let desiredX = lerp(enemy.stationX, target.x + formationBias, enemy.formationId ? .34 : .68);
  const currentRange = Math.hypot(target.x - enemy.x, target.y - enemy.y);
  const desiredDepth = clamp(target.y - doctrine.engagementRange + enemy.stationYBias, 24, H - 72);
  const depthSettled = Math.abs(enemy.y - desiredDepth) <= doctrine.rangeBand * .35;
  let desiredY = depthSettled ? enemy.y : desiredDepth;
  if (currentRange < doctrine.engagementRange - doctrine.rangeBand) {
    const retreat = doctrine.engagementRange - doctrine.rangeBand - currentRange;
    desiredX += Math.sign(enemy.x - target.x || flankSide) * Math.min(doctrine.rangeBand, retreat * .38);
    desiredY -= Math.min(doctrine.rangeBand, retreat * .42);
  } else if (currentRange > doctrine.engagementRange + doctrine.rangeBand) {
    desiredY += Math.min(doctrine.rangeBand * .7, (currentRange - doctrine.engagementRange) * .16);
  }
  desiredY = clamp(desiredY, 24, H - 72);
  enemy.engagementRange = doctrine.engagementRange;
  enemy.rangeError = currentRange - doctrine.engagementRange;
  const weaveAmplitude = Math.max(0, (enemy.moveSway || 1) - 1) * 34;
  desiredX += Math.sin(enemy.age * (1.35 + (enemy.moveSway || 1) * .22) + enemy.seed) * weaveAmplitude;
  if (enemy.hullRole === "flanker") desiredX = target.x + flankSide * doctrine.lateral;
  else if (enemy.hullRole === "striker") desiredX += Math.sin(enemy.age * 1.8 + enemy.seed) * doctrine.lateral * .38;
  else if (enemy.hullRole === "artillery") desiredX += Math.sin(enemy.age * .72 + enemy.seed) * doctrine.lateral;
  if (enemy.aiModule === "pack") {
    const packmates = world.enemies.filter((other) => !other.dead && other !== enemy && other.aiModule === "pack" && other.packId === enemy.packId);
    const rank = packmates.filter((other) => other.id < enemy.id).length - packmates.length * .5;
    desiredX = target.x + clamp(rank * 24 + flankSide * 18, -76, 76);
    const attackingPackmate = packmates.find((other) => other.aiState === "telegraph" || other.aiState === "attack");
    if (attackingPackmate && enemy.aiState === "position") enemy.aiStateTimer = Math.min(enemy.aiStateTimer, .16 + Math.abs(rank) * .05);
  } else if (enemy.aiModule === "ambusher" && enemy.aiState !== "attack") {
    desiredX = flankSide < 0 ? 24 : W - 24;
  }
  desiredX = clamp(desiredX, 20, W - 20);

  enemy.aiStateTimer -= dt;
  enemy.aiStateAge += dt;
  if (enemy.aiState === "entry") {
    enemy.y += doctrine.entrySpeed * (enemy.moveSpeed || 1) * dt;
    enemy.x = lerp(enemy.x, desiredX, 1 - Math.exp(-dt * 2.4));
  } else if (enemy.aiState === "position" || enemy.aiState === "recover" || enemy.aiState === "telegraph") {
    const hold = enemy.aiState === "telegraph" ? .48 : 1;
    enemy.vx *= Math.exp(-dt * 3.2);
    enemy.y = lerp(enemy.y, desiredY + Math.sin(enemy.age * 1.1 + enemy.seed) * 5, 1 - Math.exp(-dt * 2.2 * hold));
    enemy.x = lerp(enemy.x, desiredX, 1 - Math.exp(-dt * (1.8 + enemy.aiSteer * 1.8) * hold));
    if (enemy.aiState !== "telegraph") updateEnemyIntelligence(enemy, dt);
  } else if (enemy.aiState === "attack") {
    if (enemy.attackPattern === "ramCharge") {
      const dx = (enemy.attackEndX ?? enemy.attackTargetX) - enemy.x;
      const dy = (enemy.attackEndY ?? enemy.attackTargetY) - enemy.y;
      const range = Math.max(1, Math.hypot(dx, dy));
      const speed = (enemy.elite ? 188 : 158) * (enemy.moveSpeed || 1);
      enemy.x += dx / range * speed * dt;
      enemy.y += dy / range * speed * dt;
    } else if (["striker", "flanker", "interceptor"].includes(enemy.hullRole)) {
      enemy.y += doctrine.entrySpeed * .66 * (enemy.moveSpeed || 1) * dt;
      const attackX = enemy.aiModule === "ambusher" ? target.x - flankSide * 18 : target.x + flankSide * doctrine.lateral * .35;
      enemy.x = lerp(enemy.x, attackX, 1 - Math.exp(-dt * (enemy.aiModule === "ambusher" ? 5.2 : 3.4)));
    }
  } else if (enemy.aiState === "breakaway") {
    const orbitY = clamp(doctrine.stationY + enemy.stationYBias + 34, 48, H - 82);
    enemy.y = lerp(enemy.y, orbitY, 1 - Math.exp(-dt * 2.8));
    enemy.x += flankSide * doctrine.lateral * .72 * dt;
  }

  if (enemy.aiState === "telegraph") enemy.attackCharge = clamp(1 - enemy.aiStateTimer / Math.max(.01, enemy.aiStateDuration), 0, 1);
  if (enemy.aiStateTimer <= 0) advanceEnemyState(enemy, canFire);
  enemy.x = clamp(enemy.x, enemy.aiState === "entry" ? -32 : 16, enemy.aiState === "entry" ? W + 32 : W - 16);
  if (enemy.aiState !== "entry") enemy.y = clamp(enemy.y, 24, H - 58);
}

function beginBossAttack(boss, stage) {
  const sequence = BOSS_ATTACK_SEQUENCES[stage][boss.phaseLevel - 1];
  boss.attackId = sequence[boss.attackIndex % sequence.length];
  boss.attackIndex += 1;
  boss.attackState = "telegraph";
  boss.attackDuration = (BOSS_ATTACK_TELEGRAPH[boss.attackId] || .8) * (QA_FAST_MODE ? .52 : 1);
  boss.attackTimer = boss.attackDuration;
  boss.attackCharge = 0;
  const target = enemyTarget(boss);
  boss.attackTargetX = target.x;
  boss.attackTargetY = target.y;
  boss.attackTargetIndex = Number.isInteger(target.index) ? target.index : null;
  audio.sfx("bossCharge");
}

function executeBossAttack(boss, stage) {
  const phase = boss.phaseLevel;
  const id = boss.attackId;
  if (id === "petalBurst") {
    fireRing(boss, 7 + phase * 2, 58 + phase * 7, boss.age * .42, "#ff72ac", { pattern: "boss:petalBurst" });
  } else if (id === "sunLance") {
    fireLaser(boss, phase >= 3, "boss:sunLance");
  } else if (id === "seedSpiral") {
    fireRing(boss, 8 + phase * 2, 54 + phase * 6, boss.age * .68, "#ff9dcc", { pattern: "boss:seedSpiral" });
    fireRing(boss, 5 + phase, 72, -boss.age * .42, "#ffca58", { pattern: "boss:seedSpiral" });
  } else if (id === "twinBloom") {
    fireBlastSeed(boss, true, "boss:twinBloom");
  } else if (id === "railWall") {
    for (let lane = -1; lane <= 1; lane += 1) enemyBeam({ ...boss, x: boss.x + lane * 28 }, { x: boss.attackTargetX + lane * 92, y: H + 20 }, { pattern: "boss:railWall", width: 5.8, damage: phase >= 3 ? 3 : 2, duration: .38, color: lane ? "#70eaff" : "#ffe16c" });
  } else if (id === "thunderFan") {
    fireAimed(boss, 82 + phase * 8, 2 + phase, .16, "#ffe16c", { damage: phase >= 3 ? 2 : 1, pattern: "boss:thunderFan" });
  } else if (id === "forgeCross") {
    fireRing(boss, 6 + phase * 2, 62 + phase * 7, Math.PI / 4, "#70eaff", { pattern: "boss:forgeCross" });
    fireAimed(boss, 84, 2, .12, "#ffe16c", { pattern: "boss:forgeCross" });
  } else if (id === "doubleRail") {
    for (const side of [-1, 1]) enemyBeam({ ...boss, x: boss.x + side * 24 }, { x: boss.attackTargetX + side * 34, y: H + 16 }, { pattern: "boss:doubleRail", width: 7.2, damage: 3, duration: .46, color: side > 0 ? "#ffe16c" : "#70eaff" });
  } else if (id === "spiralCrown") {
    fireRing(boss, 9 + phase * 3, 58 + phase * 7, -boss.age * .62, "#c183ff", { pattern: "boss:spiralCrown" });
  } else if (id === "voidPincer") {
    fireHunterSeeker(boss, true, "boss:voidPincer");
  } else if (id === "eclipseTwin") {
    fireRing(boss, 8 + phase * 2, 62, boss.age * .36, "#c183ff", { pattern: "boss:eclipseTwin" });
    fireRing(boss, 7 + phase, 78, -boss.age * .28, "#ff4f70", { pattern: "boss:eclipseTwin", damage: phase >= 3 ? 2 : 1 });
  } else if (id === "tripleEclipse") {
    fireBlastSeed(boss, true, "boss:tripleEclipse");
    fireRing(boss, 10 + phase, 72, boss.age * -.38, "#c183ff", { pattern: "boss:tripleEclipse" });
  }
  boss.attackState = "recover";
  boss.attackTimer = Math.max(.66, 1.42 - phase * .15 - stage * .08) * (QA_FAST_MODE ? .58 : 1);
  boss.attackCharge = 0;
  world.shake = Math.max(world.shake, .2 + stage * .05);
  audio.sfx("bossAttack");
}

function updateEnemyIntelligence(enemy, dt) {
  if ((!enemy.aiSteer && !enemy.aiEvasion) || enemy.y < 18 || enemy.y > H - 54) return;
  const target = enemyTarget(enemy);
  const flankSide = Math.sin(enemy.seed * 2.17) >= 0 ? 1 : -1;
  const desiredX = target.x + (enemy.aiFlank || 0) * flankSide;
  const steering = clamp((desiredX - enemy.x) / 70, -1, 1) * (enemy.aiSteer || 0) * 34;
  enemy.x += steering * dt;
  if (enemy.aiEvasion > 0) {
    const threat = world.bullets
      .filter((bullet) => !bullet.dead && bullet.y < enemy.y + 38 && distance(enemy, bullet) < 58)
      .sort((a, b) => distance(enemy, a) - distance(enemy, b))[0];
    if (threat) enemy.x += Math.sign(enemy.x - threat.x || flankSide) * enemy.aiEvasion * 52 * dt;
  }
}

function updateEnemy(enemy, dt) {
  enemy.age += dt;
  enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt);
  enemy.collisionCooldown = Math.max(0, (enemy.collisionCooldown || 0) - dt);
  const canFire = world.stageTime > 6;

  if (enemy.boss) {
    updateBoss(enemy, dt);
    return;
  }
  enemy.x += enemy.vx * dt;
  enemy.x += Math.sin(enemy.age * .85 + enemy.seed) * (enemy.moveDrift || 0) * dt;
  updateEnemyTactics(enemy, dt, canFire);
}

function resolveEnemyCrowding(dt) {
  const enemies = world.enemies.filter((enemy) => !enemy.dead && !enemy.boss);
  for (let first = 0; first < enemies.length; first += 1) {
    const a = enemies[first];
    for (let second = first + 1; second < enemies.length; second += 1) {
      const b = enemies[second];
      if (["entry", "attack"].includes(a.aiState) || ["entry", "attack"].includes(b.aiState)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const range = Math.max(.01, Math.hypot(dx, dy));
      const clearance = a.r + b.r + 5 - range;
      if (clearance <= 0) continue;
      const push = clearance * .5 * Math.min(1, dt * 12);
      const nx = dx / range;
      const ny = dy / range;
      a.x = clamp(a.x - nx * push, 16, W - 16);
      a.y = clamp(a.y - ny * push, 24, H - 58);
      b.x = clamp(b.x + nx * push, 16, W - 16);
      b.y = clamp(b.y + ny * push, 24, H - 58);
    }
  }
}

function updateBoss(boss, dt) {
  const stage = world.stageIndex;
  const phase = 1 - boss.hp / boss.maxHp;
  boss.secondaryTimer -= dt;
  boss.phaseShield = Math.max(0, boss.phaseShield - dt);
  const nextPhase = phase >= .68 ? 3 : phase >= .34 ? 2 : 1;
  if (nextPhase > boss.phaseLevel) enterBossPhase(boss, nextPhase);

  if (boss.y < 45) {
    boss.y = lerp(boss.y, 47, dt * 1.8);
    return;
  }

  boss.x = W / 2 + Math.sin(boss.age * (0.65 + stage * 0.08)) * (115 + stage * 15);
  boss.y = 45 + Math.sin(boss.age * 1.3) * 5;

  if (boss.phaseShield > 0) return;

  boss.attackTimer -= dt;
  if (boss.attackState === "telegraph") {
    boss.attackCharge = clamp(1 - boss.attackTimer / boss.attackDuration, 0, 1);
    boss.x = lerp(boss.x, W / 2 + (boss.attackTargetX - W / 2) * .24, dt * 1.8);
    if (boss.attackTimer <= 0) executeBossAttack(boss, stage);
  } else if (boss.attackTimer <= 0) {
    beginBossAttack(boss, stage);
  }

  if (boss.secondaryTimer <= 0) {
    const nativeType = activeStage().biome?.speciesId;
    const liveAdds = world.enemies.filter((enemy) => !enemy.dead && !enemy.boss).length;
    const addBudget = Math.max(0, [8, 10, 12][stage] - liveAdds);
    const desiredAdds = stage < 2 ? 2 : 3;
    const addCount = Math.min(desiredAdds, addBudget);
    if (stage === 0) {
      for (let i = 0; i < addCount; i += 1) world.enemies.push(makeEnemy(i === 0 && nativeType ? nativeType : "dart", boss.x + (i ? 22 : -22), boss.y + 20, { bossAdd: true }));
    } else if (stage === 1) {
      for (let i = 0; i < addCount; i += 1) world.enemies.push(makeEnemy(i === 0 && nativeType ? nativeType : "spinner", boss.x + (i ? 30 : -30), boss.y + 15, { bossAdd: true }));
      if (addCount > 0) world.shake = 0.25;
    } else {
      for (let i = 0; i < addCount; i += 1) world.enemies.push(makeEnemy(i === 1 && nativeType ? nativeType : i % 2 ? "mine" : "dart", rand(30, W - 30), -10, { bossAdd: true }));
    }
    boss.secondaryTimer = Math.max(3, 5.4 - phase * 1.2 - stage * 0.3);
  }
}

function baseShotDamage(player) {
  return 1.25 * player.damage * statusBonuses(player).damage * (world.activeBranch?.reward.damage || 1);
}

function emitPlayerShot(player, source, options = {}) {
  const ids = { primary: "overclock", heavy: "rail", fan: "prism", seeker: "drone", overloadPulse: "rushOverdrive" };
  const tier = source === "primary" ? Math.max(upgradeLevel("overclock"), upgradeLevel("piercing")) : upgradeLevel(ids[source]);
  const relic = relicBonuses();
  const angle = options.angle || 0;
  const damage = baseShotDamage(player) * (options.damage ?? 1);
  const bullet = {
    x: player.x + (options.x || 0), y: player.y - 9,
    vx: Math.sin(angle) * player.projectileSpeed, vy: -Math.cos(angle) * player.projectileSpeed,
    r: source === "heavy" || source === "overloadPulse" ? 2.6 : 2,
    source, tier, owner: player.index, damage, baseDamage: damage,
    color: source === "heavy" ? "#ffc767" : source === "seeker" ? "#b497ff" : source === "fan" ? "#78dedb" : source === "overloadPulse" ? "#bb8fff" : PLAYER_CONFIG[player.index].color,
    pierceLeft: source === "primary" ? player.pierce : 0,
    pierceRank: source === "primary" ? player.pierce : 0,
    phaseBarrier: source === "heavy" && relic.phaseLance,
    seeker: source === "seeker" ? Math.PI * 150 / 180 : 0,
    targetId: options.targetId ?? null, guidance: 1.2, age: 0, life: source === "seeker" ? 2 : source === "overloadPulse" ? 1.2 : 3,
    choir: source === "seeker" && options.choir && relic.prismChoir,
    hitIds: [], dead: false,
  };
  world.bullets.push(bullet);
  world.power.shots[source] = (world.power.shots[source] || 0) + 1;
  if (source !== "primary") powerEffect("muzzle", bullet.x, bullet.y, 4 + tier, bullet.color, tier);
  return bullet;
}

function playerShoot(player) {
  const rush = SpaceRush.combatMultipliers(rushActive(), teamRushBonuses());
  const relic = relicBonuses();
  const movingFast = Math.hypot(player.vx, player.vy) > player.speed * .4;
  emitPlayerShot(player, "primary", { damage: 1 + .1 * (player.weapon - 1) });
  const rate = Math.min(2, player.fireRate * (1 + (player.primaryRateBonus || 0) + rush.fireRate - 1
    + (movingFast ? relic.movingFireRate - 1 : 0)) * statusBonuses(player).fireRate * anomalyConfig().playerFireRate);
  player.fireTimer = .184 / rate;
  player.shots += 1;
  if (relic.cometDrive && movingFast && player.shots % 8 === 0) markProtocolProc("cometDrive", player.x, player.y);
  audio.sfx("shoot", player.index);
}

function updateAuxiliaryWeapons(player, dt) {
  player.arcCooldown = Math.max(0, (player.arcCooldown || 0) - dt);
  const tick = (field, interval, fire) => {
    if (!interval) return;
    player[field] = (player[field] ?? interval) - dt;
    if (player[field] <= 0) { player[field] += interval; fire(); }
  };
  tick("heavyTimer", player.heavyInterval, () => {
    emitPlayerShot(player, "heavy", { damage: player.heavyDamage });
    if (upgradeLevel("rail") === 3) player.capstoneHeavyProcs += 1;
    audio.sfx("powerHeavy", player.index);
  });
  tick("fanTimer", player.fanInterval, () => {
    for (const side of [-1, 1]) emitPlayerShot(player, "fan", { x: side * 9, angle: side * Math.PI / 9, damage: .35 });
    if (upgradeLevel("prism") === 3) player.capstonePrismProcs += 1;
    audio.sfx("powerFan", player.index);
  });
  tick("seekerTimer", player.seekerInterval, () => {
    const targets = world.enemies.filter((e) => !e.dead && !(e.boss && e.phaseShield > 0) && e.y < player.y && distance(e, player) <= 220)
      .sort((a, b) => distance(a, player) - distance(b, player) || a.id - b.id);
    for (const [i, side] of [-1, 1].entries()) emitPlayerShot(player, "seeker", { x: side * 13, angle: side * Math.PI / 12, damage: .75, targetId: (targets[i] || targets[0])?.id, choir: i === 0 });
    if (upgradeLevel("drone") === 3) player.capstoneDroneProcs += 1;
    audio.sfx("powerSeeker", player.index);
  });
}

function triggerArc(player, enemy, extra = 1) {
  if (!player?.chainHits) return;
  player.arcCount = Math.min(player.chainHits, (player.arcCount || 0) + extra);
  if (player.arcCount < player.chainHits || player.arcCooldown > 0) return;
  const targets = world.enemies.filter((e) => !e.dead && e !== enemy && !(e.boss && e.phaseShield > 0) && distance(e, enemy) <= 56)
    .sort((a, b) => distance(a, enemy) - distance(b, enemy) || a.id - b.id).slice(0, 2);
  if (!targets.length) return;
  player.arcCount = 0; player.arcCooldown = .5;
  for (const target of targets) {
    creditDamage("arc", damageEnemy(target, baseShotDamage(player) * player.chainDamage));
    powerEffect("arc", enemy.x, enemy.y, 0, "#8bddff", upgradeLevel("chain"), { x: target.x, y: target.y });
    if (target.hp <= 0) killEnemy(target, player.index, { derived: true });
  }
  audio.sfx("powerArc");
  return true;
}

function damageEnemy(enemy, amount, shieldScale = 1) {
  if (amount <= 0 || enemy.dead || (enemy.boss && enemy.phaseShield > 0)) return { hull: 0, barrier: 0, broken: false };
  let remaining = amount;
  const hullBefore = Math.max(0, enemy.hp);
  let barrierDamage = 0;
  let broken = false;
  if ((enemy.moduleBarrier || 0) > 0) {
    barrierDamage = Math.min(enemy.moduleBarrier, remaining * shieldScale);
    enemy.moduleBarrier -= barrierDamage;
    remaining -= barrierDamage / shieldScale;
    broken = enemy.moduleBarrier <= 0;
    enemy.hitFlash = .11;
    burst(enemy.x, enemy.y, enemy.moduleColor || "#9be9ff", broken ? 12 : 4, broken ? 58 : 28);
    if (broken) audio.sfx("barrierBreak");
  }
  if (remaining > 0) {
    enemy.hp -= remaining;
    enemy.hitFlash = .075;
  }
  return { hull: Math.min(hullBefore, remaining), barrier: barrierDamage, broken };
}

function novaDangerState() {
  const pilots = world.players.filter((player) => !player.downed);
  const radiusBonus = teamMaximum("novaRadiusBonus");
  const clearRadius = NOVA_CONFIG.clearRadius + radiusBonus;
  const damageRadius = NOVA_CONFIG.damageRadius + radiusBonus;
  const localBullets = world.enemyBullets.filter((bullet) => !bullet.dead && pilots.some((pilot) => distance(pilot, bullet) <= clearRadius));
  const outsideBullets = world.enemyBullets.filter((bullet) => !bullet.dead && !pilots.some((pilot) => distance(pilot, bullet) <= clearRadius));
  const localEnemies = world.enemies.filter((enemy) => !enemy.dead && pilots.some((pilot) => distance(pilot, enemy) <= damageRadius));
  return { pilots, radiusBonus, clearRadius, damageRadius, localBullets, outsideBullets, localEnemies };
}

function prepareQaNovaHazards() {
  if (!QA_NOVA_MODE || world.novaCount >= 2 || world.qaNovaPreparedForCount === world.novaCount) return;
  if (world.novaCount > 0 && world.novaCooldown > .45) return;
  const pilot = world.players.find((player) => !player.downed);
  if (!pilot) return;
  const source = { id: -700 - world.novaCount, x: pilot.x, y: pilot.y - 40, r: 4, attackPattern: "qaNova", elite: false, boss: false };
  for (const [offsetX, offsetY] of [[-34, -26], [34, -26]]) {
    enemyBullet(pilot.x + offsetX, pilot.y + offsetY, 0, 0, "#ff72bc", 3, source, { pattern: "qa:nova-near" });
  }
  enemyBullet(pilot.x - 30, pilot.y + 24, 0, 0, "#ff72bc", 3, source, {
    pattern: "qa:nova-near", behavior: "mine", triggerAge: .01, burstCount: 6, burstSpeed: 64,
  });
  enemyBullet(pilot.x + 30, pilot.y + 24, 0, 0, "#ff8a62", 3.4, source, {
    pattern: "qa:nova-near", behavior: "blast", triggerAge: .01, burstCount: 8, burstSpeed: 68,
    blastRadius: 28, blastDamage: 2,
  });
  enemyBullet(18, 42, 0, 0, "#ffdf68", 3, source, { pattern: "qa:nova-far" });
  const target = makeEnemy("dart", pilot.x, pilot.y - 54, { bossAdd: true });
  target.hp = 1;
  target.maxHp = 1;
  target.score = 0;
  target.deathrattle = "mineRing";
  target.aiState = "recover";
  world.enemies.push(target);
  world.enemyBeams.push({
    x1: 18, y1: 38, x2: W - 18, y2: 38, age: 0, duration: 2, width: 4, damage: 1,
    color: "#ffdf68", pattern: "qa:nova-beam", sourceId: source.id, bossStage: null,
    debuff: "", debuffDuration: 0, debuffIntensity: 0, payloadColor: "#ffdf68", hitIds: [], dead: false,
  });
  world.novaCharge = NOVA_CONFIG.threshold;
  world.qaNovaPreparedForCount = world.novaCount;
  syncNovaMirrors();
}

function useNova() {
  if (world.novaCharge < NOVA_CONFIG.threshold || world.novaCooldown > 0) return false;
  const danger = novaDangerState();
  const { pilots } = danger;
  if (!pilots.length) return false;
  const { radiusBonus, clearRadius, damageRadius } = danger;
  const clearAll = world.players.some((player) => player.novaClearAll);
  const damageMultiplier = teamAverage("novaDamage", 1);
  const beamsBefore = world.enemyBeams.filter((beam) => !beam.dead).length;
  world.novaCharge = 0;
  world.novaCooldown = NOVA_CONFIG.cooldown;
  world.novaCount += 1;
  const shieldEvery = world.researchEffects.novaShieldEvery;
  if (shieldEvery && world.novaCount % shieldEvery === 0) researchShield();
  if (world.novaLastTriggerTime >= 0) {
    const interval = world.time - world.novaLastTriggerTime;
    world.novaMinimumInterval = world.novaMinimumInterval > 0 ? Math.min(world.novaMinimumInterval, interval) : interval;
  }
  world.novaLastTriggerTime = world.time;
  world.novaLastRadius = clearRadius;
  world.novaBeamsAtTrigger = beamsBefore;
  for (const bullet of world.enemyBullets) {
    if (bullet.dead || (!clearAll && !pilots.some((pilot) => distance(pilot, bullet) <= clearRadius))) continue;
    bullet.dead = true;
    world.novaBulletsCleared += 1;
    if (clearAll) world.novaFullClears += 1;
    else world.novaLocalClears += 1;
    const pilot = pilots.reduce((best, candidate) => distance(candidate, bullet) < distance(best, bullet) ? candidate : best);
    burst(bullet.x, bullet.y, PLAYER_CONFIG[pilot.index].color, 2, 16);
  }
  world.novaOutsideSurvivors = world.enemyBullets.filter((bullet) => !bullet.dead && !pilots.some((pilot) => distance(pilot, bullet) <= clearRadius)).length;
  world.novaBeamsCleared += Math.max(0, beamsBefore - world.enemyBeams.filter((beam) => !beam.dead).length);
  for (const enemy of world.enemies) {
    if (enemy.dead || !pilots.some((pilot) => distance(pilot, enemy) <= damageRadius)) continue;
    const damage = damageEnemy(enemy, (enemy.boss ? NOVA_CONFIG.bossDamage : NOVA_CONFIG.damage) * damageMultiplier);
    if (damage.hull <= 0 && damage.barrier <= 0) enemy.hitFlash = .1;
    if (enemy.hp <= 0) killEnemy(enemy, -1, { novaSource: true, suppressDeathrattle: true });
  }
  for (const player of pilots) for (let i = 0; i < 32; i += 1) {
    const angle = (i / 32) * TAU;
    world.particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * visualRand(90, 190),
      vy: Math.sin(angle) * visualRand(90, 190),
      life: .65,
      maxLife: .65,
      color: PLAYER_CONFIG[player.index].color,
      size: i % 3 ? 1 : 2,
    });
  }
  syncNovaMirrors();
  world.flash = 0.45;
  world.shake = 0.45;
  audio.sfx("nova");
  pulseGamepad(0, 260, .75, .45);
  pulseGamepad(1, 260, .75, .45);
  showToast(t("toast.novaShared"));
  return true;
}

function updateNova(dt) {
  world.novaCooldown = Math.max(0, world.novaCooldown - dt);
  const hitBudget = NOVA_CONFIG.hitChargePerSecond + teamAverage("novaHitBudgetBonus");
  world.novaHitChargeBudget = Math.min(hitBudget, world.novaHitChargeBudget + hitBudget * dt);
  const eligible = world.introTimer <= 0 && world.clearTimer <= 0 && !world.routeChoice;
  if (eligible) prepareQaNovaHazards();
  if (eligible && world.novaCharge < NOVA_CONFIG.threshold) {
    addNovaCharge("passive", NOVA_CONFIG.passiveChargePerSecond * dt);
    const anomalyRate = Math.max(0, anomalyConfig().energyRate || 0);
    if (anomalyRate > 0) addNovaCharge("anomaly", anomalyRate * dt);
  }
  if (eligible && world.novaCharge >= NOVA_CONFIG.threshold) {
    world.novaReadyTimer += dt;
    const danger = novaDangerState();
    const immediateDanger = danger.localBullets.length > 0 || danger.localEnemies.length > 0;
    const qaReady = !QA_NOVA_MODE || (danger.localBullets.length >= 4 && danger.outsideBullets.length >= 1 && world.enemyBeams.some((beam) => !beam.dead));
    if (world.novaCooldown <= 0 && qaReady && immediateDanger) useNova();
  } else {
    world.novaReadyTimer = 0;
  }
}

function damagePlayer(player, amount = 1, impact = null) {
  if (player.invulnerability > 0 || player.downed) return false;
  const incoming = Math.max(1, Math.round(Number(amount) || 1));
  let remaining = incoming;
  player.damageTaken += incoming;
  if (player.shield > 0) {
    world.threatRecentDamage = 1;
    const absorbed = Math.min(player.shield, remaining);
    player.shield -= absorbed;
    player.shieldAbsorbed += absorbed;
    // Presentation metadata only: source side, with reverse velocity at point overlap.
    let impactX = Number.isFinite(impact?.x) ? impact.x - player.x : 0;
    let impactY = Number.isFinite(impact?.y) ? impact.y - player.y : 0;
    if (Math.hypot(impactX, impactY) < .01) {
      impactX = -(impact?.vx || 0); impactY = -(impact?.vy || 0);
    }
    const impactLength = Math.hypot(impactX, impactY);
    player.shieldImpactX = impactLength > 0 ? impactX / impactLength : 0;
    player.shieldImpactY = impactLength > 0 ? impactY / impactLength : 0;
    player.shieldHitTimer = .32;
    player.shieldBreakTimer = player.shield <= 0 ? .55 : 0;
    remaining -= absorbed;
    player.invulnerability = remaining > 0 ? 0 : .22;
    player.shieldRegenTimer = player.shieldRegenInterval || Number.POSITIVE_INFINITY;
    burst(player.x, player.y, "#9be9ff", 8, 45);
    audio.sfx(player.shield <= 0 ? "shieldBreak" : "shieldBlock");
    pulseGamepad(player.index, 80, 0.16, 0.34);
    if (player.novaShieldCharge > 0) {
      const charge = Math.min(world.power.shieldBudget, absorbed * player.novaShieldCharge);
      world.power.shieldBudget -= charge;
      addNovaCharge("shield", charge, player);
    }
    triggerAegisNova(player);
    if (remaining <= 0) return true;
  }

  world.threatRecentDamage = 1;
  player.hp -= remaining;
  player.hullDamageTaken += remaining;
  player.hullHitTimer = .35;
  player.invulnerability = player.hitInvulnerability;
  player.shieldRegenTimer = player.shieldRegenInterval || Number.POSITIVE_INFINITY;
  world.shake = 0.3;
  burst(player.x, player.y, PLAYER_CONFIG[player.index].color, 13, 70);
  audio.sfx("hurt");
  pulseGamepad(player.index, 150, 0.62, 0.35);

  if (player.hp <= 0) {
    player.downed = true;
    player.downCount += 1;
    player.downTimer = 12;
    player.revive = 0;
    player.vx = 0;
    player.vy = 0;
    world.enemyBullets.forEach((bullet) => {
      if (distance(player, bullet) < 82) bullet.dead = true;
    });
    audio.sfx("explode");
    showToast(t("toast.downed", { player: player.index + 1 }));
  }
  return true;
}

function revivePlayer(player) {
  player.downed = false;
  player.rescueCount += 1;
  player.hp = Math.min(player.maxHp, player.reviveHp);
  player.invulnerability = 1.2;
  player.shield = 1;
  player.downTimer = 0;
  player.revive = 0;
  burst(player.x, player.y, PLAYER_CONFIG[player.index].light, 28, 90);
  if (player.novaRescueCharge > 0 && world.power.rescueCooldown <= 0) {
    world.power.rescueCooldown = 20;
    addNovaCharge("rescue", player.novaRescueCharge, player);
  }
  addRushCharge("rescue");
  audio.sfx("revive");
  showToast(t("toast.revived", { player: player.index + 1 }));
}

function updatePlayers(dt) {
  const anomaly = anomalyConfig();
  let forceTotalX = 0;
  let forceTotalY = 0;
  for (const player of world.players) {
    const controls = input.player(player.index);
    player.controls = controls;
    player.invulnerability = Math.max(0, player.invulnerability - dt);
    player.shieldHitTimer = Math.max(0, player.shieldHitTimer - dt);
    player.shieldBreakTimer = Math.max(0, player.shieldBreakTimer - dt);
    player.hullHitTimer = Math.max(0, player.hullHitTimer - dt);
    player.fireTimer -= dt;
    player.protocolCooldown = Math.max(0, player.protocolCooldown - dt);
    updatePlayerStatus(player, dt);

    if (player.downed) {
      player.downTimer -= dt;
      player.y = Math.min(H - 17, player.y + 8 * dt);
      if (player.downTimer <= 0) {
        endGame(false);
        return;
      }
      continue;
    }

    if (player.shieldRegenInterval > 0) {
      if (player.shield < player.maxShield) {
        player.shieldRegenTimer -= dt;
        if (player.shieldRegenTimer <= 0) {
          player.shield += 1;
          player.shieldRegenTimer = player.shieldRegenInterval;
          burst(player.x, player.y, "#9be9ff", 10, 38);
          audio.sfx("shield");
        }
      } else {
        player.shieldRegenTimer = player.shieldRegenInterval;
      }
    }

    const status = statusBonuses(player);
    const rush = SpaceRush.combatMultipliers(rushActive(), teamRushBonuses());
    const speed = player.speed * status.speed * anomaly.playerSpeed * rush.moveSpeed;
    const field = SpaceAnomalies.playerForce(world.activeAnomaly, world.anomalyElapsed, player.x, player.y, W, H);
    forceTotalX += field.x;
    forceTotalY += field.y;
    player.vx = lerp(player.vx, controls.x * speed + field.x, 1 - Math.exp(-dt * player.handling * rush.handling));
    player.vy = lerp(player.vy, controls.y * speed + field.y, 1 - Math.exp(-dt * player.handling * rush.handling));
    player.x = clamp(player.x + player.vx * dt, 13, W - 13);
    player.y = clamp(player.y + player.vy * dt, 32, H - 14);

    player.damageVfxTimer = Math.max(0, player.damageVfxTimer - dt);
    const hullRatio = player.hp / player.maxHp;
    if (hullRatio <= .6 && player.damageVfxTimer <= 0) {
      const critical = hullRatio <= .3;
      player.damageVfxTimer = critical ? .14 : .32;
      world.particles.push({
        x: player.x + visualRand(-3, 3), y: player.y + 5,
        vx: visualRand(-5, 5), vy: visualRand(9, 19),
        life: .7, maxLife: .7, color: critical ? "#af7157" : "#667180", size: critical ? 2 : 1.4,
      });
      if (critical) burst(player.x, player.y + 4, "#ffab62", 1, 16);
    }

    if (player.fireTimer <= 0) playerShoot(player);
    updateAuxiliaryWeapons(player, dt);
  }

  const livePilots = Math.max(1, world.players.filter((player) => !player.downed).length);
  world.anomalyForceX = forceTotalX / livePilots;
  world.anomalyForceY = forceTotalY / livePilots;

  for (const downed of world.players.filter((player) => player.downed)) {
    const rescuer = world.players.find((player) => !player.downed);
    if (!rescuer) {
      endGame(false);
      return;
    }
    if (distance(downed, rescuer) < 34) {
      downed.revive += dt * Math.max(downed.reviveSpeed, rescuer.reviveSpeed);
      if (downed.revive >= 1.65) revivePlayer(downed);
    } else {
      downed.revive = Math.max(0, downed.revive - dt * 0.75);
    }
  }

  const [p1, p2] = world.players;
  const linkRange = Math.max(p1.linkRange, p2.linkRange) * (world.activeBranch?.reward.link || 1);
  const linked = !p1.downed && !p2.downed && distance(p1, p2) < linkRange;
  if (linked) {
    const rush = SpaceRush.combatMultipliers(rushActive(), teamRushBonuses());
    const relic = relicBonuses();
    world.beamTimer -= dt;
    if (world.beamTimer <= 0) {
      world.beamTimer = 0.12 / rush.linkRate;
      let charged = false;
      for (const enemy of world.enemies) {
        if (!enemy.dead && pointToSegmentDistance(enemy.x, enemy.y, p1.x, p1.y, p2.x, p2.y) < enemy.r + 3 + relic.beamRadius) {
          const statusBeam = (statusBonuses(p1).beamDamage + statusBonuses(p2).beamDamage) * .5;
          const damage = damageEnemy(enemy, 1.2 * rush.linkDamage * relic.beamDamage * statusBeam * ((p1.beamDamage + p2.beamDamage) * .5));
          creditDamage("link", damage);
          if (!charged && (damage.hull > 0 || damage.barrier > 0)) { addNovaCharge("hit", NOVA_CONFIG.hitCharge); charged = true; }
          if (relic.resonantGyro && world.protocolSoundTimer <= 0) markProtocolProc("resonantGyro", enemy.x, enemy.y);
          if (enemy.hp <= 0) killEnemy(enemy, 0);
        }
      }
    }
  }
  world.linked = linked;
}

function triggerEnemyDeathrattle(enemy) {
  if (enemy.boss || !enemy.deathrattle) return;
  const projectilesBefore = world.enemyBullets.length + world.enemyBeams.length;
  let directEffect = false;
  const target = enemyTarget(enemy);
  enemy.attackTargetX = target.x;
  enemy.attackTargetY = target.y;
  enemy.attackTargetIndex = Number.isInteger(target.index) ? target.index : null;
  if (enemy.deathrattle === "seekerBurst") {
    fireHunterSeeker(enemy, true, "death:seekerBurst");
  } else if (enemy.deathrattle === "shardFan") {
    fireRing(enemy, 8, 82 + world.stageIndex * 8, enemy.age * .7, "#d99cff", { pattern: "death:shardFan", damage: 1 });
  } else if (enemy.deathrattle === "arcCross") {
    fireRing(enemy, 4, 96 + world.stageIndex * 8, Math.PI / 4, "#70eaff", { pattern: "death:arcCross", damage: 2 });
  } else if (enemy.deathrattle === "mineRing") {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * TAU + enemy.age;
      enemyBullet(enemy.x, enemy.y, Math.cos(angle) * 42, Math.sin(angle) * 42, "#ff72bc", 3, enemy, { pattern: "death:mineRing", behavior: "mine", triggerAge: .64, burstCount: 6, burstSpeed: 64 });
    }
  } else if (enemy.deathrattle === "crossBurst") {
    fireRing(enemy, 8, 94 + world.stageIndex * 9, Math.PI / 8, "#ff5278", { pattern: "death:crossBurst", damage: 2 });
  } else if (enemy.deathrattle === "seedBurst") {
    fireBlastSeed(enemy, true, "death:seedBurst");
  } else if (enemy.deathrattle === "blast") {
    const radius = 48 + world.stageIndex * 5 + (enemy.elite ? 14 : 0);
    directEffect = Boolean(enemyBullet(enemy.x, enemy.y, 0, 0, "#ff9a58", 5.2, enemy, {
      pattern: "death:blast",
      behavior: "blast",
      triggerAge: .68,
      burstCount: 10,
      burstSpeed: 64,
      blastRadius: radius,
      blastDamage: enemy.elite ? 4 : 3,
      enemyBlastDamage: 12,
      anchored: true,
      budgetClass: "deathrattle",
    }));
    if (directEffect) {
      burst(enemy.x, enemy.y, "#ff9a58", 8, radius * .72);
      audio.sfx("enemyCharge");
    }
  }
  if (directEffect || world.enemyBullets.length + world.enemyBeams.length > projectilesBefore) world.combatDeathrattles += 1;
}

function killEnemy(enemy, owner = 0, options = {}) {
  if (enemy.dead) return;
  enemy.dead = true;
  world.kills += 1;
  if (enemy.elite && !enemy.boss) world.researchElites += 1;
  if (enemy.boss) world.researchBosses += 1;
  world.threatKillMomentum += enemy.elite ? 2.2 : enemy.boss ? 4 : 1;
  world.combo = world.comboTimer > 0 ? world.combo + 1 : 1;
  world.comboTimer = 2.4;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const multiplier = 1 + Math.floor(world.combo / 8) * 0.5;
  const rush = SpaceRush.combatMultipliers(rushActive(), teamRushBonuses());
  world.score += Math.round(enemy.score * multiplier * rush.score * (world.contract?.score || 1) * (world.activeBranch?.score || 1) * (enemy.threatReward || 1) * (enemy.anomalyReward || 1));
  const player = world.players[owner];
  if (options.novaSource) addNovaCharge("nova", NOVA_CONFIG.hitCharge);
  burst(enemy.x, enemy.y, enemy.boss ? "#fff2a6" : activeStage().accent, enemy.boss ? 80 : 12, enemy.boss ? 150 : 65);
  if (!options.derived && !options.novaSource) {
    addRushCharge("kill");
    if (enemy.elite) addRushCharge("elite");
  }
  if (options.suppressDeathrattle && enemy.deathrattle) world.novaSuppressedDeathrattles += 1;
  else triggerEnemyDeathrattle(enemy);


  if (!enemy.boss && enemy.volatileRadius > 0 && !world.volatileResolving) {
    world.volatileResolving = true;
    try {
      const blastDamage = 7 + world.stageIndex * 2;
      const warning = enemyBullet(enemy.x, enemy.y, 0, 0, enemy.moduleColor || activeStage().accent, 4.8, enemy, {
        pattern: "death:volatile",
        behavior: "blast",
        triggerAge: .72,
        burstCount: 8,
        burstSpeed: 58,
        blastRadius: enemy.volatileRadius,
        blastDamage: enemy.elite ? 4 : 3,
        enemyBlastDamage: blastDamage,
        anchored: true,
        budgetClass: "deathrattle",
      });
      if (warning) {
        burst(enemy.x, enemy.y, enemy.moduleColor || activeStage().accent, 7, enemy.volatileRadius * .7);
        audio.sfx("enemyCharge");
      }
    } finally {
      world.volatileResolving = false;
    }
  }

  if (enemy.boss) {
    handleBossDefeat(enemy);
  } else {
    audio.sfx(Math.random() < 0.28 ? "explode" : "hit");
    if (enemy.elite) {
      spawnPickup(enemy.x - 8, enemy.y + 3);
      spawnPickup(enemy.x + 12, enemy.y - 4);
      world.lootDrought = 0;
      world.flash = Math.max(world.flash, .38);
      world.shake = Math.max(world.shake, .42);
      showToast(t("toast.elite", { event: world.stageEvent ? eventText(world.stageEvent, "name") : t("toast.routeThreatClear") }));
    } else {
      const result = SpaceLoot.advanceBudget(world.lootDropBudget, enemy.type, lootRandom());
      world.lootDropBudget = result.budget;
      world.lootDrought += 1;
      world.lootMaxDrought = Math.max(world.lootMaxDrought, world.lootDrought);
      if (result.drops > 0) {
        for (let index = 0; index < result.drops; index += 1) spawnPickup(enemy.x + index * 7, enemy.y - index * 4);
        world.lootDrought = 0;
      }
    }
  }
}

function spawnPickup(x, y, forcedType = "") {
  let type = forcedType;
  if (!SpaceLoot.LOOT_TYPES.includes(type)) {
    const draw = SpaceLoot.drawType(world.lootBag, lootRandom);
    type = draw.type;
    world.lootBag = [...draw.bag];
  }
  world.lootDrops += 1;
  world.pickups.push({ x, y, type, age: 0, vy: 24, r: 7, dead: false });
}

function researchShield() {
  const pilot = world.players.filter((player) => !player.downed && player.shield < player.maxShield)
    .sort((a, b) => (b.maxShield - b.shield) - (a.maxShield - a.shield))[0];
  if (!pilot) return false;
  pilot.shield = Math.min(pilot.maxShield, pilot.shield + 1);
  pilot.shieldHitTimer = .32;
  burst(pilot.x, pilot.y, "#76dbff", 10, 35);
  world.researchProcs += 1;
  audio.sfx("shieldBlock");
  return true;
}

function applyPickup(player, pickup) {
  if (pickup.dead) return;
  world.researchPickups += 1;
  const effects = world.researchEffects;
  if (effects.pickupEnergy) { addNovaCharge("pickup", effects.pickupEnergy, player); world.researchProcs += 1; }
  if (effects.pickupShieldEvery) {
    world.researchShieldProgress = Math.min(effects.pickupShieldEvery, world.researchShieldProgress + 1);
    if (world.researchShieldProgress >= effects.pickupShieldEvery && researchShield()) world.researchShieldProgress = 0;
  }
  if (pickup.type === "weapon") {
    const maxed = world.players.every((pilot) => pilot.weapon >= 3);
    for (const pilot of world.players) pilot.weapon = Math.min(3, pilot.weapon + 1);
    if (maxed) addNovaCharge("pickup", 8, player);
  } else if (pickup.type === "repair") {
    player.hp = Math.min(player.maxHp, player.hp + 2);
    if (world.gameMode === "solo") {
      const partner = world.players.find((entry) => entry !== player && !entry.downed);
      if (partner) partner.hp = Math.min(partner.maxHp, partner.hp + 1);
    }
  } else if (pickup.type === "shield") {
    player.shield = Math.min(player.maxShield, player.shield + 2);
    if (world.gameMode === "solo") {
      const partner = world.players.find((entry) => entry !== player && !entry.downed);
      if (partner) partner.shield = Math.min(partner.maxShield, partner.shield + 1);
    }
  } else {
    addNovaCharge("pickup", NOVA_CONFIG.energyPickupCharge, player);
  }
  const buff = grantBuff(player, pickup.type);
  pickup.dead = true;
  addRushCharge("pickup");
  if (player.pickupNovaBonus) addNovaCharge("pickup", player.pickupNovaBonus, player);
  const relic = relicBonuses();
  if (relic.salvageReactor) {
    world.power.salvageCount += 1;
    if (world.power.salvageCount % 4 === 0) {
      addNovaCharge("pickup", 8, player);
      addRushAmount(6);
      markProtocolProc("salvageReactor", pickup.x, pickup.y);
    }
  }
  burst(pickup.x, pickup.y, PLAYER_CONFIG[player.index].light, 15, 65);
  audio.sfx("pickup");
  pulseGamepad(player.index, 75, 0.08, 0.28);
  showToast(t("toast.pickupBuff", { player: player.index + 1, pickup: t(`pickup.${pickup.type}`), buff: t(buff.nameKey), time: buff.duration }));
}

function handleBossDefeat() {
  world.score += Math.round(2500 * (world.stageIndex + 1) * (world.contract?.score || 1) * (world.activeBranch?.score || 1) * anomalyConfig().score);
  world.clearTimer = QA_FAST_MODE ? 1.1 : 4.2;
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.boss = null;
  world.stageEvent = null;
  world.cinematic = { type: "clear", timer: world.clearTimer, total: world.clearTimer };
  world.flash = 1;
  world.shake = 0.8;
  audio.setStage(world.stageIndex, false);
  audio.sfx("stageClear");
  showToast(t("toast.stageClear", { stage: stageText(activeStage(), "name") }));
}

function advanceStage() {
  if (world.stageIndex >= STAGES.length - 1) {
    endGame(true);
    return;
  }
  world.stageIndex += 1;
  world.stageTime = 0;
  world.sectorIndex = 0;
  world.globalSector = DIRECTOR.globalSector(world.stageIndex, 0);
  activateAnomaly(0, { announce: false });
  world.sectorFlashTimer = 0;
  world.midDraftIndex = 0;
  world.introTimer = 0;
  world.clearTimer = 0;
  world.eventIndex = 0;
  world.stageEvent = null;
  world.encounterIndex = 0;
  world.activeEncounter = null;
  world.encounterObjects = [];
  world.cinematic = { type: "warp", timer: 1.7, total: 1.7 };
  world.spawnTimer = 1.8;
  world.bossSpawned = false;
  world.boss = null;
  world.enemies = [];
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.pickups = [];
  for (const player of world.players) {
    if (player.downed) {
      player.downed = false;
      player.downTimer = 0;
      player.revive = 0;
      player.hp = Math.max(1, player.hp);
    }
    player.hp = Math.min(player.maxHp, player.hp + 2 + player.stageRepair);
    // Route transitions preserve picked weapons and every run upgrade.
    player.weapon = Math.max(1 + player.weaponFloor, player.weapon);
    player.invulnerability = .9;
  }
  audio.setStage(world.stageIndex, false);
  prepareRouteChoice(world.stageIndex);
  audio.sfx("routeScan");
}

function startEncounter(plan) {
  if (!plan || world.activeEncounter || world.bossSpawned) return;
  const qaDuration = QA_FAST_MODE ? 1.25 : plan.duration;
  const laneX = [W * .22, W * .5, W * .78][plan.lane] || W / 2;
  const baseGoal = plan.kind === "siege" ? plan.goal * (1 + world.stageIndex * .18) : plan.goal;
  const scaledGoal = QA_FAST_MODE && plan.kind !== "survive" ? baseGoal * .14 : baseGoal;
  world.activeEncounter = {
    ...plan,
    x: laneX,
    y: plan.kind === "siege" ? 68 : H - 68,
    radius: plan.kind === "escort" ? 52 : 42,
    timer: qaDuration,
    total: qaDuration,
    elapsed: 0,
    progress: 0,
    goal: scaledGoal,
    hits: 0,
    spawned: 0,
    spawnTimer: .28,
    hitSoundTimer: 0,
    hp: scaledGoal,
    maxHp: scaledGoal,
  };
  world.encounterObjects = [];
  if (plan.kind === "collect") {
    const count = plan.itemCount || 7;
    for (let index = 0; index < count; index += 1) {
      const offset = ((index * 73 + plan.variant * 31) % 169) - 84;
      world.encounterObjects.push({
        id: ++world.encounterSerial,
        type: "salvage",
        x: clamp(laneX + offset, 24, W - 24),
        y: 46 + Math.floor(index / 3) * 44 + (index % 3) * 22,
        vx: 0,
        vy: 25 + (index % 3) * 4,
        r: 7,
        age: index * .23,
        loops: 0,
        dead: false,
        color: plan.color,
      });
    }
  }
  world.cinematic = { type: "encounter", timer: .72, total: .72 };
  world.flash = Math.max(world.flash, .2);
  world.shake = Math.max(world.shake, .12);
  audio.sfx("encounterStart");
  showToast(t("toast.encounterStart", { encounter: encounterText(plan, "name"), description: encounterText(plan, "description") }));
}

function finishEncounter(success) {
  const encounter = world.activeEncounter;
  if (!encounter) return;
  world.encounterHistory.push({ encounter, success, stageIndex: world.stageIndex });
  if (success) {
    const reward = encounter.reward;
    for (const player of world.players) {
      player.weapon = Math.min(3, player.weapon + (reward.weapon || 0));
      player.hp = Math.min(player.maxHp, player.hp + (reward.repair || 0) + (player.downed ? 0 : world.researchEffects.encounterRepair));
      player.shield = Math.min(player.maxShield, player.shield + (reward.shield || 0));
    }
    if (reward.energy > 0) addNovaCharge("encounter", NOVA_CONFIG.encounterCharge);
    if (world.researchEffects.encounterRepair) world.researchProcs += 1;
    world.score += Math.round((reward.score || 0) * (world.contract?.score || 1) * (world.activeBranch?.score || 1) * anomalyConfig().score);
    addRushCharge("encounter");
    burst(encounter.x, encounter.y, encounter.color, 34, 110);
    world.flash = Math.max(world.flash, .36);
    world.shake = Math.max(world.shake, .28);
    audio.sfx("encounterComplete");
    pulseGamepad(0, 170, .35, .3);
    pulseGamepad(1, 170, .35, .3);
    showToast(t("toast.encounterComplete", { encounter: encounterText(encounter, "name"), reward: encounterText(encounter, "reward") }));
  } else {
    audio.sfx("encounterFailed");
    showToast(t("toast.encounterFailed", { encounter: encounterText(encounter, "name") }));
  }
  world.activeEncounter = null;
  world.encounterObjects = [];
}

function updateEncounter(dt) {
  const encounter = world.activeEncounter;
  if (!encounter) return;
  encounter.elapsed += dt;
  encounter.timer -= dt;
  encounter.hitSoundTimer = Math.max(0, encounter.hitSoundTimer - dt);
  const players = world.players.filter((player) => !player.downed);

  if (encounter.kind === "hold") {
    const occupants = players.filter((player) => distance(player, encounter) <= encounter.radius).length;
    const rate = occupants >= 2 ? 1.55 : occupants === 1 ? .82 : -.3;
    encounter.progress = clamp(encounter.progress + rate * dt, 0, encounter.goal);
  } else if (encounter.kind === "escort") {
    const center = [W * .22, W * .5, W * .78][encounter.lane] || W / 2;
    encounter.x = clamp(center + Math.sin(encounter.elapsed * 1.3 + encounter.variant) * 62, 45, W - 45);
    encounter.y = H - 76 + Math.sin(encounter.elapsed * .72 + encounter.variant) * 18;
    const escorts = players.filter((player) => distance(player, encounter) <= encounter.radius).length;
    const rate = escorts >= 2 ? 1.45 : escorts === 1 ? .78 : -.2;
    encounter.progress = clamp(encounter.progress + rate * dt, 0, encounter.goal);
  } else if (encounter.kind === "survive") {
    encounter.spawnTimer -= dt;
    if (encounter.spawnTimer <= 0) {
      const serial = encounter.spawned;
      const x = 24 + ((serial * 97 + encounter.variant * 61 + encounter.lane * 53) % 433);
      const stageSpeed = 58 + world.stageIndex * 8;
      world.encounterObjects.push({
        id: ++world.encounterSerial,
        type: "meteor",
        x,
        y: -18,
        vx: ((encounter.lane - 1) * 8) + (((serial + encounter.variant) % 3) - 1) * 5,
        vy: stageSpeed + (serial % 4) * 4,
        r: 9 + (serial % 3) * 2,
        age: 0,
        rotation: serial * .7,
        dead: false,
        color: encounter.color,
      });
      encounter.spawned += 1;
      encounter.spawnTimer = Math.max(.48, .82 - world.stageIndex * .08);
    }
  } else if (encounter.kind === "siege") {
    const center = [W * .22, W * .5, W * .78][encounter.lane] || W / 2;
    encounter.x = center + Math.sin(encounter.elapsed * 1.7 + encounter.variant) * 25;
    encounter.y = 68 + Math.sin(encounter.elapsed * 1.1) * 7;
    encounter.progress = encounter.maxHp - Math.max(0, encounter.hp);
  }

  const outcome = SpaceExpedition.evaluateEncounter(encounter, {
    timeRemaining: encounter.timer,
    progress: encounter.progress,
    hits: encounter.hits,
  });
  if (outcome !== "pending") finishEncounter(outcome === "success");
}

function updateStage(dt) {
  world.growthGrace = Math.max(0, world.growthGrace - dt);
  const stage = activeStage();
  if (world.clearTimer > 0) {
    world.clearTimer -= dt;
    if (world.clearTimer <= 0) {
      if (world.stageIndex < STAGES.length - 1) beginUpgradeDraft("stage-clear");
      else advanceStage();
    }
    return;
  }
  if (world.introTimer > 0) {
    world.introTimer -= dt;
    return;
  }
  if (world.bossSpawned) return;

  world.stageTime += dt * DIRECTOR.timeScale({ bossState: QA_BOSS_STATE_MODE, fast: QA_FAST_MODE, voxel: QA_VOXEL_MODE });
  world.spawnTimer -= dt;
  const progress = clamp(world.stageTime / stage.duration, 0, 1);
  const intensity = DIRECTOR.intensityFor(world.stageIndex, progress);
  const combat = COMBAT.curveFor(world.stageIndex, progress);
  world.combatBeatId = combat.beat.id;
  world.combatPressure = combat.pressure;
  world.combatPatternTier = combat.patternTier;
  world.combatBulletCap = combat.bulletCap;
  if (!QA_VOXEL_MODE && intensity.sector !== world.sectorIndex) enterSector(intensity.sector);
  const nextDraftPoint = DIRECTOR.MID_DRAFT_POINTS[world.midDraftIndex];
  if (!QA_VOXEL_MODE && !world.activeEncounter && nextDraftPoint !== undefined && progress >= nextDraftPoint) {
    world.midDraftIndex += 1;
    beginUpgradeDraft("mid-stage");
    return;
  }
  const nextEncounter = world.encounterPlans[world.stageIndex]?.[world.encounterIndex];
  if (!QA_VOXEL_MODE && !world.activeEncounter && nextEncounter && world.stageTime >= nextEncounter.at * stage.duration) {
    startEncounter(nextEncounter);
    world.encounterIndex += 1;
  }
  const nextEvent = STAGE_EVENTS[world.stageIndex][world.eventIndex];
  if (!QA_VOXEL_MODE && nextEvent && world.stageTime >= nextEvent.at * stage.duration) {
    spawnStageEvent(nextEvent);
    world.eventIndex += 1;
  }
  const preBossRecovery = !QA_VOXEL_MODE && world.stageTime >= stage.duration - 10;
  const releaseBacklog = combat.beat.id === "release" && world.enemies.filter((enemy) => !enemy.dead && !enemy.boss).length >= 5;
  if (world.spawnTimer <= 0 && !preBossRecovery && !releaseBacklog && world.growthGrace <= 0) {
    const adaptiveThreat = threatConfig();
    const rawEnemyCap = Math.max(4, 6 + world.stageIndex * 2 + intensity.enemyCapBonus + adaptiveThreat.capBonus + combat.capBonus);
    const chapterBudget = world.stageIndex > 0 ? 10 + world.stageIndex * 2 + (combat.beat.id === "killzone" ? 2 : 0) : rawEnemyCap;
    const enemyCap = QA_FORCE_ELITE ? 1 : Math.min(rawEnemyCap, chapterBudget);
    const activeEnemies = world.enemies.filter((enemy) => !enemy.dead && !enemy.boss).length;
    const weightedEnemies = world.enemies.reduce((sum, enemy) => sum + (enemy.dead || enemy.boss ? 0 : enemy.elite ? 2.5 : 1), 0);
    if (weightedEnemies < enemyCap) {
      const spawned = spawnEnemy(Math.min(3, Math.ceil(enemyCap - weightedEnemies)));
      if (spawned === 1 && progress > 0.72 && activeEnemies + spawned < enemyCap && random() < 0.08 + world.stageIndex * 0.03) {
        world.enemies.push(makeEnemy(choose(["scout", "dart"])));
      }
    }
    const ecologyRate = stage.biome?.spawnRate || 1;
    const routeRate = world.stageIndex === 0 && progress < .08
      ? Math.min(1, world.activeBranch?.spawnRate || 1)
      : world.activeBranch?.spawnRate || 1;
    const encounterRate = world.stageIndex === 0 && progress < .08
      ? Math.min(1, world.activeEncounter?.spawnRate || 1)
      : world.activeEncounter?.spawnRate || 1;
    world.spawnTimer = Math.max(0.38, (1.68 - world.stageIndex * 0.15 - progress * 0.58) / ((world.contract?.spawnRate || 1) * ecologyRate * routeRate * encounterRate * intensity.spawnCadence * adaptiveThreat.spawnRate * anomalyConfig().spawnRate * combat.spawnRate));
  }
  if (!QA_VOXEL_MODE && world.stageTime >= stage.duration) spawnBoss();
}

function detonateEnemyBlast(bullet) {
  if (bullet.dead || bullet.detonated) return;
  bullet.detonated = true;
  bullet.dead = true;
  const radius = bullet.blastRadius || (bullet.behavior === "mine" ? 26 : 34);
  const damage = bullet.blastDamage || (bullet.behavior === "mine" ? 1 : 2);
  const blast = { ...bullet, blastRadius: radius };
  world.power.blastCount += 1;
  // Resolve one explosion against every pilot, before any fragment contacts.
  for (const player of world.players) {
    if (player.downed || !SpaceCollision.hostileBlastHitsPlayer(blast, player)) continue;
    if (damagePlayer(player, damage, bullet)) {
      world.combatBlastHits += 1;
      world.power.blastDamage += damage;
      applyEnemyDebuff(player, bullet);
    }
  }
  if (bullet.enemyBlastDamage > 0) for (const enemy of world.enemies) {
    if (enemy.dead || enemy.id === bullet.sourceId || !SpaceCollision.circlesOverlap(blast, radius, enemy, enemy.r)) continue;
    damageEnemy(enemy, bullet.enemyBlastDamage);
    if (enemy.hp <= 0) killEnemy(enemy, -1, { derived: true });
  }
  const count = Math.max(4, bullet.burstCount || 8);
  const phase = (bullet.age || 0) + (bullet.sourceId || 0) * .37;
  for (let index = 0; index < count; index += 1) {
    const angle = phase + index / count * TAU;
    world.power.fragments.push({ ...bullet, detonated: false, dead: false, age: 0,
      vx: Math.cos(angle) * (bullet.burstSpeed || 65), vy: Math.sin(angle) * (bullet.burstSpeed || 65),
      anchored: false, r: Math.max(2.1, bullet.r * .64), damage: 1, behavior: "linear",
      pattern: `${bullet.pattern}:blast`, triggerAge: 0, burstCount: 0,
      blastRadius: 0, blastDamage: 0, enemyBlastDamage: 0, contactGrace: .15 });
  }
  powerEffect("blast", bullet.x, bullet.y, radius, bullet.color || "#ff965d", 3);
  burst(bullet.x, bullet.y, bullet.color, 18, radius * 2.4);
  world.shake = Math.max(world.shake, .24);
  audio.sfx("volatile");
}

function updateObjects(dt) {
  for (const effect of world.power.effects) effect.age += dt;
  world.power.effects = world.power.effects.filter((effect) => effect.age < effect.duration);
  for (const bullet of world.bullets) {
    if (bullet.dead) continue;
    bullet.age = (bullet.age || 0) + dt;
    if (bullet.age >= (bullet.life || 3)) { bullet.dead = true; continue; }
    if (bullet.seeker > 0 && bullet.age <= (bullet.guidance || 1.2)) {
      const candidates = world.enemies.filter((enemy) => !enemy.dead && !(enemy.boss && enemy.phaseShield > 0)
        && enemy.y < bullet.y && distance(bullet, enemy) <= 220 && !bullet.hitIds?.includes(enemy.id));
      const target = candidates.find((enemy) => enemy.id === bullet.targetId)
        || candidates.sort((a, b) => distance(bullet, a) - distance(bullet, b) || a.id - b.id)[0];
      if (target) {
        bullet.targetId = target.id;
        const speed = Math.max(80, Math.hypot(bullet.vx, bullet.vy));
        const angle = Math.atan2(bullet.vy, bullet.vx);
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        const delta = Math.atan2(Math.sin(desired - angle), Math.cos(desired - angle));
        const next = angle + clamp(delta, -bullet.seeker * dt, bullet.seeker * dt);
        bullet.vx = Math.cos(next) * speed;
        bullet.vy = Math.sin(next) * speed;
      }
    }
    const anomalyFlow = SpaceAnomalies.bulletFlow(world.activeAnomaly, world.anomalyElapsed, bullet, W, H, false);
    bullet.x += (bullet.vx + anomalyFlow.x) * dt;
    bullet.y += (bullet.vy + anomalyFlow.y) * dt;
    if (bullet.y < -12 || bullet.y > H + 12 || bullet.x < -12 || bullet.x > W + 12) bullet.dead = true;
  }

  const spawnedEnemyBullets = [];
  for (const bullet of world.enemyBullets) {
    if (bullet.dead) continue;
    bullet.age += dt;
    const blastProximity = bullet.behavior === "blast" && !bullet.anchored && bullet.age >= .32 && world.players.some((player) => (
      !player.downed && distance(player, bullet) <= bullet.blastRadius * .78 + player.hurtRadius
    ));
    if (bullet.behavior === "curve") {
      const angle = (bullet.curve || 0) * dt;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      const vx = bullet.vx * cosine - bullet.vy * sine;
      bullet.vy = bullet.vx * sine + bullet.vy * cosine;
      bullet.vx = vx;
    } else if (bullet.behavior === "brake") {
      const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
      if (bullet.age < .42) {
        const drag = Math.exp(-dt * 3.6);
        bullet.vx *= drag;
        bullet.vy *= drag;
      } else {
        const targetSpeed = Math.max(speed, bullet.baseSpeed || speed);
        const accelerated = Math.min(targetSpeed, speed + targetSpeed * dt * 1.8);
        bullet.vx = bullet.vx / speed * accelerated;
        bullet.vy = bullet.vy / speed * accelerated;
      }
    } else if (bullet.behavior === "homing" && bullet.age <= bullet.homingDuration) {
      const target = world.players.find((player) => player.index === bullet.targetIndex && !player.downed)
        || world.players.find((player) => !player.downed);
      if (target) {
        const speed = Math.max(1, Math.hypot(bullet.vx, bullet.vy));
        const currentAngle = Math.atan2(bullet.vy, bullet.vx);
        const targetAngle = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        const angleDelta = Math.atan2(Math.sin(targetAngle - currentAngle), Math.cos(targetAngle - currentAngle));
        const guidanceProgress = clamp(bullet.age / Math.max(.01, bullet.homingDuration), 0, 1);
        const guidanceScale = lerp(1, .32, guidanceProgress * guidanceProgress);
        const maxTurn = (bullet.homing || .35) * guidanceScale * dt;
        const nextAngle = currentAngle + clamp(angleDelta, -maxTurn, maxTurn);
        bullet.vx = Math.cos(nextAngle) * speed;
        bullet.vy = Math.sin(nextAngle) * speed;
      }
    } else if (bullet.behavior === "mine") {
      const drag = Math.exp(-dt * 2.2);
      bullet.vx *= drag; bullet.vy *= drag;
      if (bullet.age >= bullet.triggerAge) { detonateEnemyBlast(bullet); continue; }
    } else if (bullet.behavior === "blast" && (bullet.age >= bullet.triggerAge || blastProximity)) {
      detonateEnemyBlast(bullet);
      continue;
    }
    const anomalyFlow = bullet.anchored ? { x: 0, y: 0 } : SpaceAnomalies.bulletFlow(world.activeAnomaly, world.anomalyElapsed, bullet, W, H, true);
    bullet.x += (bullet.anchored ? 0 : bullet.vx + anomalyFlow.x) * dt;
    bullet.y += (bullet.anchored ? 0 : bullet.vy + anomalyFlow.y) * dt;
    if (bullet.y < -25 || bullet.y > H + 25 || bullet.x < -25 || bullet.x > W + 25 || bullet.age > 10) bullet.dead = true;
  }
  let activeBulletCount = world.enemyBullets.reduce((count, bullet) => count + (bullet.dead ? 0 : 1), 0);
  for (const spawned of [...spawnedEnemyBullets, ...world.power.fragments.splice(0)]) {
    const hardCap = world.combatBulletCap + Math.max(0, spawned.budgetBonus || 0);
    if (activeBulletCount >= hardCap) continue;
    world.enemyBullets.push(spawned);
    activeBulletCount += 1;
    if ((spawned.pattern || "").startsWith("qa:nova-near:")) world.qaNovaHazardFragments += 1;
    if (spawned.budgetClass === "boss" && (spawned.pattern || "").includes(":blast")) world.combatBossFragments += 1;
  }

  for (const beam of world.enemyBeams) {
    beam.age += dt;
    for (const player of world.players) {
      if (player.downed || beam.hitIds.includes(player.index)) continue;
      if (pointToSegmentDistance(player.x, player.y, beam.x1, beam.y1, beam.x2, beam.y2) <= player.hurtRadius + beam.width) {
        beam.hitIds.push(player.index);
        if (damagePlayer(player, beam.damage, { x: beam.x1, y: beam.y1, vx: beam.x2 - beam.x1, vy: beam.y2 - beam.y1 })) {
          world.combatLaserHits += 1;
          applyEnemyDebuff(player, beam);
        }
      }
    }
    if (beam.age >= beam.duration) beam.dead = true;
  }

  for (const enemy of world.enemies) updateEnemy(enemy, dt);
  resolveEnemyCrowding(dt);
  for (const pickup of world.pickups) {
    pickup.age += dt;
    pickup.y += pickup.vy * dt;
    const rushMagnet = SpaceRush.combatMultipliers(rushActive(), teamRushBonuses()).pickupMagnet;
    const anomaly = anomalyConfig();
    const magnetTarget = world.players
      .filter((player) => !player.downed && player.pickupMagnetRadius + rushMagnet + statusBonuses(player).pickupMagnet + anomaly.pickupMagnet > 0)
      .map((player) => ({ player, range: distance(pickup, player), radius: player.pickupMagnetRadius + rushMagnet + statusBonuses(player).pickupMagnet + anomaly.pickupMagnet }))
      .filter(({ range, radius }) => range <= radius)
      .sort((a, b) => a.range - b.range)[0];
    if (magnetTarget) {
      const dx = magnetTarget.player.x - pickup.x;
      const dy = magnetTarget.player.y - pickup.y;
      const range = Math.max(1, magnetTarget.range);
      const pull = (70 + 145 * (1 - range / magnetTarget.radius)) * anomaly.pickupPull;
      pickup.x += dx / range * pull * dt;
      pickup.y += dy / range * pull * dt;
    } else {
      pickup.x += Math.sin(pickup.age * 4) * 10 * dt;
    }
    if (pickup.y > H + 15) pickup.dead = true;
  }
  for (const object of world.encounterObjects) {
    object.age += dt;
    object.x += object.vx * dt;
    object.y += object.vy * dt;
    if (object.type === "salvage") {
      object.x += Math.sin(object.age * 3.4 + object.id) * 8 * dt;
      if (object.y > H + 14) {
        object.loops += 1;
        object.y = -18;
        object.x = 24 + ((object.id * 89 + object.loops * 61) % 433);
      }
    } else if (object.type === "meteor") {
      object.rotation += dt * (1.7 + object.id % 3);
      if (object.y > H + 24 || object.x < -30 || object.x > W + 30) object.dead = true;
    }
  }
  for (const particle of world.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.975;
    particle.vy *= 0.975;
  }
}

function handleCollisions() {
  for (const bullet of world.bullets) {
    if (bullet.dead) continue;
    const encounter = world.activeEncounter;
    if (encounter?.kind === "siege" && encounter.hp > 0) {
      const hitRadius = bullet.r + 19;
      if ((bullet.x - encounter.x) ** 2 + (bullet.y - encounter.y) ** 2 < hitRadius ** 2) {
        encounter.hp = Math.max(0, encounter.hp - bullet.damage);
        encounter.progress = encounter.maxHp - encounter.hp;
        bullet.dead = true;
        burst(bullet.x, bullet.y, encounter.color, 3, 24);
        if (encounter.hitSoundTimer <= 0) {
          encounter.hitSoundTimer = .09;
          audio.sfx("encounterTick");
        }
        continue;
      }
    }
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      if (bullet.hitIds?.includes(enemy.id)) continue;
      const hitRadius = bullet.r + enemy.r;
      if ((bullet.x - enemy.x) ** 2 + (bullet.y - enemy.y) ** 2 < hitRadius ** 2) {
        if (enemy.boss && enemy.phaseShield > 0) {
          bullet.dead = true;
          enemy.hitFlash = .075;
          burst(bullet.x, bullet.y, "#ffffff", 2, 18);
          break;
        }
        const markEvery = world.researchEffects.markEvery;
        let markBonus = 0;
        if (markEvery && ["primary", "heavy", "fan", "seeker"].includes(bullet.source || "primary") && (enemy.elite || enemy.boss)) {
          enemy.researchMarks = (enemy.researchMarks || 0) + 1;
          if (enemy.researchMarks >= markEvery) {
            enemy.researchMarks = 0;
            markBonus = bullet.damage;
            world.researchProcs += 1;
            burst(enemy.x, enemy.y, "#ffe16c", 8, 45);
          }
        }
        const source = bullet.source || "primary";
        const firstHit = !bullet.hitIds?.length;
        const damage = damageEnemy(enemy, bullet.damage + markBonus, bullet.phaseBarrier && source === "heavy" ? 1.5 : 1);
        creditDamage(source, damage);
        world.power.hits[source] = (world.power.hits[source] || 0) + 1;
        if (!firstHit && source === "primary") { world.power.pierceHits += 1; creditDamage("pierce", damage); }
        bullet.hitIds?.push(enemy.id);
        if (damage.barrier > 0 || source !== "primary") bullet.dead = true;
        else if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
          const sequence = bullet.pierceRank >= 2 ? [1, .65, .4] : [1, .55];
          bullet.damage = (bullet.baseDamage || bullet.damage) * (sequence[bullet.hitIds.length] || 0);
        }
        else bullet.dead = true;
        if (damage.barrier > 0 && bullet.phaseBarrier) markProtocolProc("phaseLance", bullet.x, bullet.y);
        if (enemy.boss) world.shake = Math.max(world.shake, .035);
        const owner = world.players[bullet.owner];
        if ((damage.hull > 0 || damage.barrier > 0) && firstHit && ["primary", "heavy", "fan", "seeker"].includes(source)) {
          addNovaCharge("hit", NOVA_CONFIG.hitCharge, owner);
          addRushHitCharge();
        }
        if (source === "primary" && !bullet.arcTriggered && (firstHit || (bullet.hitIds.length === 2 && relicBonuses().stormCircuit))) {
          if (!firstHit) markProtocolProc("stormCircuit", enemy.x, enemy.y);
          bullet.arcTriggered = triggerArc(owner, enemy) === true;
        }
        if (bullet.choir && firstHit && owner) {
          const targets = world.enemies.filter((e) => !e.dead && e !== enemy && distance(e, enemy) <= 24)
            .sort((a, b) => distance(a, enemy) - distance(b, enemy) || a.id - b.id).slice(0, 2);
          for (const target of targets) {
            creditDamage("prismChoir", damageEnemy(target, baseShotDamage(owner) * .35));
            if (target.hp <= 0) killEnemy(target, owner.index, { derived: true });
          }
          powerEffect("impact", enemy.x, enemy.y, 24, "#cc91ff", 3);
          if (targets.length) markProtocolProc("prismChoir", enemy.x, enemy.y);
        }
        if (source !== "primary" || (bullet.tier || 0) > 0) powerEffect("impact", bullet.x, bullet.y, source === "heavy" ? 7 : 4, bullet.color, bullet.tier || 1);
        burst(bullet.x, bullet.y, bullet.color, 2, 20);
        if (enemy.hp <= 0) killEnemy(enemy, bullet.owner, { derived: source === "overloadPulse" });
        break;
      }
    }
  }

  for (const bullet of world.enemyBullets) {
    if (bullet.dead) continue;
    if ((bullet.age || 0) < (bullet.contactGrace || 0)) continue;
    for (const player of world.players) {
      if (player.downed) continue;
      if (SpaceCollision.hostileBulletHitsPlayer(bullet, player)) {
        if (["blast", "mine"].includes(bullet.behavior)) {
          if (!bullet.anchored || bullet.age >= bullet.triggerAge) detonateEnemyBlast(bullet);
          break;
        }
        bullet.dead = true;
        if (damagePlayer(player, bullet.damage || 1, bullet)) {
          if (bullet.behavior === "homing") world.combatHomingHits += 1;
          applyEnemyDebuff(player, bullet);
        }
        break;
      }
    }
  }

  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    for (const player of world.players) {
      if (player.downed) continue;
      if (enemy.collisionCooldown <= 0 && SpaceCollision.bodyHitsPlayer(enemy, player)) {
        const impactDamage = enemy.boss ? 4 : enemy.elite ? 4 : Math.max(3, enemy.collisionDamage || 2);
        const playerDamaged = damagePlayer(player, impactDamage, enemy);
        enemy.collisionCooldown = .7;
        if (playerDamaged) world.combatBodyCollisions += 1;
        if (playerDamaged && !enemy.boss) {
          damageEnemy(enemy, Math.max(12, enemy.maxHp * (enemy.elite ? .34 : .58)));
          if (enemy.hp <= 0) {
            killEnemy(enemy, player.index);
            break;
          }
        }
      }
    }
  }

  for (let first = 0; first < world.enemies.length; first += 1) {
    const a = world.enemies[first];
    if (a.dead || a.boss || a.collisionCooldown > 0) continue;
    for (let second = first + 1; second < world.enemies.length; second += 1) {
      const b = world.enemies[second];
      if (b.dead || b.boss || b.collisionCooldown > 0) continue;
      const impactState = a.aiState === "attack" || b.aiState === "attack" || a.attackPattern === "ramCharge" || b.attackPattern === "ramCharge";
      if (!impactState) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const range = Math.hypot(dx, dy);
      const bodyRange = (a.bodyRadius || a.r * .8) + (b.bodyRadius || b.r * .8);
      if (range >= bodyRange) continue;
      const normalX = range > .01 ? dx / range : (a.id % 2 ? 1 : -1);
      const normalY = range > .01 ? dy / range : 0;
      damageEnemy(a, Math.max(10, b.maxHp * .28));
      damageEnemy(b, Math.max(10, a.maxHp * .28));
      const separation = Math.max(8, (bodyRange - range) * .5 + 3);
      a.x -= normalX * separation;
      a.y -= normalY * separation;
      b.x += normalX * separation;
      b.y += normalY * separation;
      a.collisionCooldown = .72;
      b.collisionCooldown = .72;
      world.combatFriendlyCollisions += 1;
      burst((a.x + b.x) * .5, (a.y + b.y) * .5, "#ffb45f", 18, 92);
      world.shake = Math.max(world.shake, .28);
      audio.sfx("explode");
      if (a.hp <= 0) killEnemy(a, -1);
      if (b.hp <= 0) killEnemy(b, -1);
      break;
    }
  }

  for (const pickup of world.pickups) {
    if (pickup.dead) continue;
    for (const player of world.players) {
      if (!player.downed && SpaceCollision.pickupTouchesPlayer(pickup, player)) {
        applyPickup(player, pickup);
        break;
      }
    }
  }

  for (const object of world.encounterObjects) {
    if (object.dead) continue;
    for (const player of world.players) {
      const touches = object.type === "meteor"
        ? SpaceCollision.bodyHitsPlayer({ ...object, bodyRadius: object.r }, player)
        : SpaceCollision.pickupTouchesPlayer(object, player);
      if (player.downed || !touches) continue;
      if (object.type === "salvage" && world.activeEncounter?.kind === "collect") {
        object.dead = true;
        world.activeEncounter.progress = Math.min(world.activeEncounter.goal, world.activeEncounter.progress + 1);
        burst(object.x, object.y, object.color, 12, 58);
        audio.sfx("encounterTick");
        pulseGamepad(player.index, 65, .08, .22);
      } else if (object.type === "meteor") {
        object.dead = true;
        if (damagePlayer(player, 1, object) && world.activeEncounter?.kind === "survive") world.activeEncounter.hits += 1;
        burst(object.x, object.y, object.color, 20, 88);
        world.shake = Math.max(world.shake, .3);
        audio.sfx("encounterImpact");
      }
      break;
    }
  }

  world.bullets = world.bullets.filter((bullet) => !bullet.dead);
  world.enemyBullets = world.enemyBullets.filter((bullet) => !bullet.dead);
  world.enemyBeams = world.enemyBeams.filter((beam) => !beam.dead);
  world.enemies = world.enemies.filter((enemy) => !enemy.dead);
  world.pickups = world.pickups.filter((pickup) => !pickup.dead);
  world.encounterObjects = world.encounterObjects.filter((object) => !object.dead);
  world.particles = world.particles.filter((particle) => particle.life > 0);
}

function updateStars(dt, idle = false) {
  const speed = idle ? 18 : 45 + world.stageIndex * 12 + (world.boss ? 12 : 0);
  for (const star of world.stars) {
    star.pz = star.z;
    star.z -= speed * dt;
    if (star.z < 4) resetStar(star, true);
  }
}

function update(dt) {
  audio.update();
  if (world.mode === "menu") {
    world.time += dt;
    updateStars(dt, true);
    input.endFrame();
    return;
  }
  if (world.mode === "draft") {
    world.time += dt;
    updateStars(dt, true);
    updateDraft(dt);
    input.endFrame();
    return;
  }
  if (world.mode !== "playing") {
    input.endFrame();
    return;
  }

  world.time += dt;
  world.protocolFlashTimer = Math.max(0, world.protocolFlashTimer - dt);
  world.protocolSoundTimer = Math.max(0, world.protocolSoundTimer - dt);
  world.sectorFlashTimer = Math.max(0, world.sectorFlashTimer - dt);
  if (world.routeChoice) {
    world.shake = Math.max(0, world.shake - dt * 2.2);
    world.flash = Math.max(0, world.flash - dt * 2.7);
    updateStars(dt, true);
    updateRouteChoice(dt);
    input.endFrame();
    return;
  }
  world.anomalyElapsed += dt;
  updateAdaptiveThreat(dt);
  world.variantNoticeCooldown = Math.max(0, world.variantNoticeCooldown - dt);
  if (world.variantNotice) {
    world.variantNotice.timer -= dt;
    if (world.variantNotice.timer <= 0) world.variantNotice = null;
  }
  world.comboTimer -= dt;
  if (world.comboTimer <= 0) world.combo = 0;
  world.shake = Math.max(0, world.shake - dt * 2.2);
  world.flash = Math.max(0, world.flash - dt * 2.7);
  if (world.stageEvent) {
    world.stageEvent.timer -= dt;
    if (world.stageEvent.timer <= 0) world.stageEvent = null;
  }
  if (world.cinematic) {
    world.cinematic.timer -= dt;
    if (world.cinematic.timer <= 0) world.cinematic = null;
  }
  updateStars(dt);
  updateStage(dt);
  if (world.mode !== "playing") {
    input.endFrame();
    return;
  }
  if (world.clearTimer > 0) {
    input.endFrame();
    return;
  }
  updatePlayers(dt);
  if (world.mode !== "playing") {
    input.endFrame();
    return;
  }
  updateNova(dt);
  updateRush(dt);
  updateEncounter(dt);
  updateObjects(dt);
  handleCollisions();
  input.endFrame();
}

function renderResult() {
  const victory = world.lastResultVictory;
  const title = document.querySelector("#resultTitle");
  const eyebrow = document.querySelector("#resultEyebrow");
  const text = document.querySelector("#resultText");
  const stats = document.querySelector("#resultStats");
  const eyebrowKey = QA_FAST_MODE
    ? (victory ? "result.qaClear" : "result.qaInterrupted")
    : world.lastResultNewRecord ? "result.newHigh" : victory ? "result.allClear" : "result.interrupted";
  eyebrow.textContent = t(eyebrowKey);
  title.textContent = t(victory ? "result.titleVictory" : "result.titleDefeat");
  const achievementText = world.newAchievements.length
    ? t("result.achievementSuffix", { names: world.newAchievements.map(localizedName).join(t("result.separator")) })
    : "";
  const contract = localizedName(world.contract);
  text.textContent = QA_FAST_MODE
    ? t("result.qa", { contract })
    : t(victory ? "result.victory" : "result.defeat", { contract }) + achievementText;
  stats.innerHTML = `
    <div>${t("result.score")}<b>${String(world.score).padStart(6, "0")}</b></div>
    <div>${t("result.kills")}<b>${world.kills}</b></div>
    <div>${t("result.combo")}<b>×${world.bestCombo}</b></div>
    <div>${t(QA_FAST_MODE ? "result.testReward" : "result.dust")}<b>${QA_FAST_MODE ? "—" : `✦ ${world.stardustReward}`}</b></div>
  `;
  renderResultBuild();
}

function endGame(victory) {
  if (world.mode === "ended") return;
  cancelAnimationFrame(showToast.frame);
  window.clearTimeout(showToast.timeout);
  toastElement.classList.remove("show");
  if (rushActive()) {
    world.rushLastBonus = 0;
    world.rushTimer = 0;
    world.rushCharge = 0;
  }
  world.mode = "ended";
  upgradePanel.hidden = true;
  world.enemyBullets = [];
  world.enemyBeams = [];
  world.enemies = [];
  world.activeEncounter = null;
  world.encounterObjects = [];
  world.boss = null;
  const previousHighScore = profile.highScore;
  const runSeconds = world.runStartedAt ? Math.max(0, Math.round((performance.now() - world.runStartedAt) / 1000)) : 0;
  if (!QA_FAST_MODE) {
    world.researchReward = SpaceResearch.settle({
      kills: world.kills,
      sectors: world.stageIndex * 3 + Math.min(3, Math.floor(world.stageTime / activeStage().duration * 3)),
      bosses: world.researchBosses,
      encounters: world.encounterHistory.filter((record) => record.success).length,
      pickups: world.researchPickups, elites: world.researchElites,
      victory, multiplier: world.contract?.stardust || 1,
    }, world.runResearch, world.runSeed, profile.runs);
    world.stardustReward = world.researchReward.dust;
    profile.research = world.researchReward.research;
    profile.runs += 1;
    profile.clears += victory ? 1 : 0;
    if (victory) profile.contractClears[world.contractId] = (profile.contractClears[world.contractId] || 0) + 1;
    profile.highScore = Math.max(profile.highScore, world.score);
    profile.totalKills += world.kills;
    profile.bestCombo = Math.max(profile.bestCombo, world.bestCombo);
    profile.highestStage = Math.max(profile.highestStage, world.stageIndex + 1);
    profile.totalPlaySeconds += runSeconds;
    profile.stardust += world.stardustReward;
    profile.lifetimeStardust += world.stardustReward;
    world.newAchievements = grantEligibleAchievements(profile);
    saveProfile();
    updateCareerSummary();
  }
  const newRecord = !QA_FAST_MODE && world.score > previousHighScore;
  world.lastResultVictory = victory;
  world.lastResultNewRecord = newRecord;
  renderResult();
  renderBuildTray();
  result.hidden = false;
  audio.setStage(Math.min(world.stageIndex, 2), false);
}

function drawBackground() {
  const stage = activeStage();
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, stage.sky);
  gradient.addColorStop(0.62, stage.haze);
  gradient.addColorStop(1, "#060711");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  drawStageLandmark(stage);

  const cx = W / 2;
  const cy = H * 0.43;
  for (const star of world.stars) {
    const sx = Math.round((star.x / star.z) * 72 + cx);
    const sy = Math.round((star.y / star.z) * 72 + cy);
    const px = Math.round((star.x / star.pz) * 72 + cx);
    const py = Math.round((star.y / star.pz) * 72 + cy);
    if (sx < 0 || sx >= W || sy < 0 || sy >= H) {
      resetStar(star, true);
      continue;
    }
    const alpha = clamp(1 - star.z / 380, 0.18, 0.9);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stage.star;
    ctx.lineWidth = star.size;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  drawPerspectiveGrid(stage);
}

function drawStageLandmark(stage) {
  ctx.save();
  if (world.stageIndex === 0) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#d85b99";
    ctx.beginPath();
    ctx.arc(400, 72, 48, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffb276";
    ctx.beginPath();
    ctx.arc(388, 60, 12, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#f9a8cc";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(400, 74, 68, 15, -0.2, 0, TAU);
    ctx.stroke();
  } else if (world.stageIndex === 1) {
    ctx.globalAlpha = 0.38;
    ctx.fillStyle = "#52b7b1";
    for (let i = 0; i < 7; i += 1) {
      const x = 35 + i * 75 + Math.sin(world.time * 0.15 + i) * 8;
      const y = 55 + (i % 3) * 13;
      ctx.fillRect(x, y, 34, 9);
      ctx.fillRect(x + 7, y - 6, 22, 20);
    }
    ctx.strokeStyle = "#f7d95e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 88);
    ctx.lineTo(W, 65);
    ctx.stroke();
  } else {
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#2b123e";
    ctx.fillRect(365, 20, 78, 95);
    ctx.fillStyle = "#5f275b";
    for (let y = 27; y < 106; y += 13) {
      for (let x = 373; x < 436; x += 13) ctx.fillRect(x, y, 6, 4);
    }
    ctx.fillStyle = "#ff466b";
    ctx.fillRect(396, 32, 16, 3);
    ctx.fillRect(400, 27, 8, 13);
  }
  ctx.restore();
}

function drawPerspectiveGrid(stage) {
  const horizon = 184;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, horizon, W, H - horizon);
  ctx.clip();
  ctx.globalAlpha = world.boss ? 0.35 : 0.23;
  ctx.strokeStyle = stage.grid;
  ctx.lineWidth = 1;
  for (let x = -320; x <= W + 320; x += 32) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + (x - W / 2) * 0.05, horizon);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  const scroll = (world.time * 26) % 18;
  for (let i = 0; i < 12; i += 1) {
    const t = (i * 18 + scroll) / 216;
    const y = horizon + t * t * (H - horizon + 25);
    ctx.beginPath();
    ctx.moveTo(0, Math.round(y));
    ctx.lineTo(W, Math.round(y));
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(player) {
  const config = PLAYER_CONFIG[player.index];
  const blink = player.invulnerability > 0 && Math.floor(world.time * 14) % 2 === 0;
  if (blink) return;
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const tilt = clamp(Math.round(player.vx / 35), -2, 2);
  ctx.save();
  ctx.translate(x, y);

  if (player.shield > 0) {
    ctx.strokeStyle = "#9be9ff";
    ctx.globalAlpha = 0.45 + Math.sin(world.time * 8) * 0.12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "#0b1025";
  ctx.fillRect(-10 + tilt, 1, 20, 6);
  ctx.fillRect(-6 + tilt, -5, 12, 14);
  ctx.fillRect(-2 + tilt, -10, 4, 18);

  ctx.fillStyle = config.dark;
  ctx.fillRect(-9 + tilt, 2, 18, 4);
  ctx.fillRect(-5 + tilt, -4, 10, 12);
  ctx.fillStyle = config.color;
  ctx.fillRect(-7 + tilt, 0, 14, 4);
  ctx.fillRect(-3 + tilt, -7, 6, 12);
  ctx.fillRect(-10 + tilt, 5, 4, 2);
  ctx.fillRect(6 + tilt, 5, 4, 2);
  ctx.fillStyle = config.light;
  ctx.fillRect(-1 + tilt, -8, 2, 3);
  ctx.fillRect(-2 + tilt, -3, 4, 3);
  ctx.fillStyle = "#1b254f";
  ctx.fillRect(-2 + tilt, -2, 4, 3);

  const flame = 3 + (Math.floor(world.time * 18 + player.index) % 2) * 3;
  ctx.fillStyle = "#fff28a";
  ctx.fillRect(-4 + tilt, 8, 2, flame);
  ctx.fillRect(2 + tilt, 8, 2, flame);
  ctx.fillStyle = config.color;
  ctx.fillRect(-3 + tilt, 8 + flame, 1, 2);
  ctx.fillRect(3 + tilt, 8 + flame, 1, 2);
  ctx.restore();
}

function drawDowned(player) {
  const config = PLAYER_CONFIG[player.index];
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = config.dark;
  ctx.fillRect(-8, -2, 16, 5);
  ctx.fillRect(-4, -5, 7, 11);
  ctx.fillStyle = config.color;
  ctx.fillRect(-6, 0, 4, 2);
  ctx.fillRect(2, -3, 4, 2);
  ctx.globalAlpha = 0.35 + Math.sin(world.time * 10) * 0.2;
  ctx.strokeStyle = config.light;
  ctx.beginPath();
  ctx.arc(0, 0, 12 + Math.sin(world.time * 5) * 2, 0, TAU);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#090a18";
  ctx.fillRect(x - 14, y - 18, 28, 4);
  ctx.fillStyle = config.color;
  ctx.fillRect(x - 13, y - 17, Math.round(26 * (player.revive / 1.65)), 2);
  pixelText(`${Math.ceil(player.downTimer)}s`, x, y - 22, "#ffffff", "center", 6);
}

function drawEnemy(enemy) {
  const x = Math.round(enemy.x);
  const y = Math.round(enemy.y);
  ctx.save();
  ctx.translate(x, y);

  if (enemy.boss) {
    drawBoss(enemy);
    ctx.restore();
    return;
  }

  if (enemy.type === "scout") {
    ctx.fillStyle = "#16142e";
    ctx.fillRect(-8, -5, 16, 11);
    ctx.fillRect(-3, -8, 6, 16);
    ctx.fillStyle = "#8d6aff";
    ctx.fillRect(-7, -3, 14, 7);
    ctx.fillStyle = "#cfb8ff";
    ctx.fillRect(-2, -6, 4, 5);
    ctx.fillStyle = "#ffdf68";
    ctx.fillRect(-5, 5, 3, 2);
    ctx.fillRect(2, 5, 3, 2);
  } else if (enemy.type === "dart") {
    ctx.fillStyle = "#23132f";
    ctx.fillRect(-8, -3, 16, 7);
    ctx.fillRect(-3, -7, 6, 14);
    ctx.fillStyle = "#ff7c66";
    ctx.fillRect(-6, -2, 12, 5);
    ctx.fillStyle = "#ffd173";
    ctx.fillRect(-1, -5, 2, 6);
    ctx.fillRect(-9, 2, 3, 2);
    ctx.fillRect(6, 2, 3, 2);
  } else if (enemy.type === "tank") {
    ctx.fillStyle = "#171827";
    ctx.fillRect(-12, -8, 24, 16);
    ctx.fillRect(-8, -11, 16, 22);
    ctx.fillStyle = "#ef565f";
    ctx.fillRect(-10, -6, 20, 12);
    ctx.fillStyle = "#762d52";
    ctx.fillRect(-7, -8, 14, 5);
    ctx.fillStyle = "#fff19a";
    ctx.fillRect(-4, -4, 3, 3);
    ctx.fillRect(2, -4, 3, 3);
    ctx.fillStyle = "#231525";
    ctx.fillRect(-2, 2, 4, 6);
  } else if (enemy.type === "spinner") {
    ctx.rotate(enemy.age * 2);
    ctx.fillStyle = "#171529";
    ctx.fillRect(-10, -3, 20, 6);
    ctx.fillRect(-3, -10, 6, 20);
    ctx.fillStyle = "#9e78ff";
    ctx.fillRect(-8, -2, 16, 4);
    ctx.fillRect(-2, -8, 4, 16);
    ctx.fillStyle = "#d9c7ff";
    ctx.fillRect(-2, -2, 4, 4);
  } else if (enemy.type === "mine") {
    ctx.rotate(enemy.age * 0.8);
    ctx.fillStyle = "#1b0e22";
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = "#ff4f70";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "#ffd46c";
    ctx.fillRect(-2, -2, 4, 4);
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(-1, -11, 2, 5);
    }
  } else if (enemy.type === "lancer") {
    ctx.fillStyle = "#102b3d";
    ctx.fillRect(-5, -7, 10, 16);
    ctx.fillRect(-11, -2, 22, 7);
    ctx.fillStyle = "#43cbe8";
    ctx.fillRect(-8, -5, 4, 12);
    ctx.fillRect(4, -5, 4, 12);
    ctx.fillRect(-2, -10, 4, 14);
    ctx.fillStyle = "#d9fbff";
    ctx.fillRect(-1, -9, 2, 4);
  } else {
    ctx.fillStyle = "#261c32";
    ctx.fillRect(-13, -7, 9, 17);
    ctx.fillRect(4, -7, 9, 17);
    ctx.fillRect(-6, -4, 12, 13);
    ctx.fillStyle = "#d5679c";
    ctx.fillRect(-11, -5, 6, 12);
    ctx.fillRect(5, -5, 6, 12);
    ctx.fillRect(-8, -2, 16, 5);
    ctx.fillStyle = "#ffe278";
    ctx.fillRect(-2, -7, 4, 5);
  }
  ctx.restore();
}

function drawBoss(boss) {
  const stage = world.stageIndex;
  const pulse = Math.floor(world.time * 8) % 2;
  if (stage === 0) {
    ctx.fillStyle = "#211331";
    ctx.fillRect(-31, -17, 62, 29);
    ctx.fillRect(-21, -25, 42, 46);
    ctx.fillStyle = "#b83f83";
    ctx.fillRect(-28, -14, 56, 23);
    ctx.fillStyle = "#f26ba5";
    ctx.fillRect(-18, -21, 36, 34);
    ctx.fillStyle = "#ffbd78";
    ctx.fillRect(-10, -15, 20, 20);
    ctx.fillStyle = pulse ? "#fff4b0" : "#ff665d";
    ctx.fillRect(-5, -10, 10, 10);
    ctx.fillStyle = "#692655";
    ctx.fillRect(-34, -7, 8, 13);
    ctx.fillRect(26, -7, 8, 13);
    ctx.fillRect(-22, 14, 8, 8);
    ctx.fillRect(14, 14, 8, 8);
  } else if (stage === 1) {
    ctx.fillStyle = "#0a2028";
    ctx.fillRect(-35, -11, 70, 25);
    ctx.fillRect(-23, -22, 46, 43);
    ctx.fillStyle = "#278d8a";
    ctx.fillRect(-32, -8, 64, 18);
    ctx.fillStyle = "#56d3bd";
    ctx.fillRect(-18, -18, 36, 31);
    ctx.fillStyle = "#f3c94f";
    ctx.fillRect(-7, -13, 14, 15);
    ctx.fillStyle = pulse ? "#fff4a0" : "#ff7b4f";
    ctx.fillRect(-3, -9, 6, 7);
    ctx.fillStyle = "#1d5c68";
    ctx.fillRect(-38, -3, 9, 15);
    ctx.fillRect(29, -3, 9, 15);
    ctx.fillRect(-26, 14, 12, 7);
    ctx.fillRect(14, 14, 12, 7);
  } else {
    ctx.fillStyle = "#130b20";
    ctx.fillRect(-42, -14, 84, 33);
    ctx.fillRect(-30, -28, 60, 56);
    ctx.fillStyle = "#4e1a52";
    ctx.fillRect(-39, -11, 78, 27);
    ctx.fillStyle = "#7e2b69";
    ctx.fillRect(-25, -24, 50, 44);
    ctx.fillStyle = "#d04c85";
    ctx.fillRect(-13, -18, 26, 27);
    ctx.fillStyle = pulse ? "#ffffff" : "#ff4b6e";
    ctx.fillRect(-6, -12, 12, 13);
    ctx.fillStyle = "#ff526c";
    ctx.fillRect(-45, -5, 9, 19);
    ctx.fillRect(36, -5, 9, 19);
    ctx.fillRect(-31, 19, 12, 8);
    ctx.fillRect(19, 19, 12, 8);
    ctx.fillStyle = "#bc8cff";
    ctx.fillRect(-34, -18, 6, 5);
    ctx.fillRect(28, -18, 6, 5);
  }

  const ratio = clamp(boss.hp / boss.maxHp, 0, 1);
  ctx.fillStyle = "#090915";
  ctx.fillRect(-28, boss.r + 5, 56, 4);
  ctx.fillStyle = ratio < 0.3 ? "#ff4e67" : activeStage(stage).accent;
  ctx.fillRect(-27, boss.r + 6, Math.round(54 * ratio), 2);
}

function drawPickup(pickup) {
  const colors = { weapon: "#ffe36d", repair: "#78f5aa", shield: "#76dbff", energy: "#bc86ff" };
  const labels = { weapon: "W", repair: "+", shield: "S", energy: "E" };
  const bob = Math.round(Math.sin(pickup.age * 5) * 2);
  ctx.save();
  ctx.translate(Math.round(pickup.x), Math.round(pickup.y + bob));
  ctx.fillStyle = "#0a0b19";
  ctx.fillRect(-7, -7, 14, 14);
  ctx.fillStyle = colors[pickup.type];
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(labels[pickup.type], 0, 1);
  ctx.restore();
}

function drawProjectiles() {
  for (const bullet of world.bullets) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(bullet.x - 1), Math.round(bullet.y - 4), 2, 6);
    ctx.fillStyle = bullet.color;
    ctx.fillRect(Math.round(bullet.x - 2), Math.round(bullet.y), 4, 4);
  }
  for (const bullet of world.enemyBullets) {
    const pulse = Math.floor(bullet.age * 16) % 2;
    ctx.fillStyle = "#40142a";
    ctx.fillRect(Math.round(bullet.x - bullet.r - 1), Math.round(bullet.y - bullet.r - 1), bullet.r * 2 + 2, bullet.r * 2 + 2);
    ctx.fillStyle = bullet.color;
    ctx.fillRect(Math.round(bullet.x - bullet.r), Math.round(bullet.y - bullet.r), bullet.r * 2, bullet.r * 2);
    if (pulse) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.round(bullet.x), Math.round(bullet.y), 1, 1);
    }
  }
}

function drawParticles() {
  for (const particle of world.particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function drawLinkBeam() {
  if (!world.linked) return;
  const [p1, p2] = world.players;
  ctx.save();
  ctx.globalAlpha = 0.22 + Math.sin(world.time * 18) * 0.08;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(Math.round(p1.x), Math.round(p1.y));
  ctx.lineTo(Math.round(p2.x), Math.round(p2.y));
  ctx.stroke();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = "#8bf4ff";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.lineDashOffset = -world.time * 25;
  ctx.stroke();
  ctx.restore();
}

function pixelText(text, x, y, color = "#fff", align = "left", size = 7) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ui-monospace, monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, Math.round(x), Math.round(y));
}

function wrappedPixelText(text, x, y, maxWidth, lineHeight, color = "#fff", align = "center", size = 6, maxLines = 2) {
  ctx.font = `bold ${size}px ui-monospace, monospace`;
  const english = SpaceI18n.language === "en";
  const units = english ? String(text).split(/\s+/) : [...String(text)];
  const separator = english ? " " : "";
  const lines = [];
  let line = "";
  for (const unit of units) {
    const candidate = line ? `${line}${separator}${unit}` : unit;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = unit;
    }
  }
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    let finalLine = visibleLines[visibleLines.length - 1];
    while (finalLine.length > 1 && ctx.measureText(`${finalLine}…`).width > maxWidth) finalLine = finalLine.slice(0, -1);
    visibleLines[visibleLines.length - 1] = `${finalLine}…`;
  }
  visibleLines.forEach((entry, index) => pixelText(entry, x, y + index * lineHeight, color, align, size));
  return visibleLines.length;
}

function drawRouteChoice() {
  const choice = world.routeChoice;
  if (!choice) return;
  const stage = activeStage();
  ctx.save();
  ctx.fillStyle = "rgba(3, 4, 14, .34)";
  ctx.fillRect(0, 27, W, H - 27);
  pixelText(`${stageText(stage, "code")} // ${biomeText(stage.biome, "name")}`, W / 2, 43, stage.accent, "center", 6);
  pixelText(t("hud.choosePath"), W / 2, 56, "#ffffff", "center", 11);
  pixelText(t("hud.choosePathHint"), W / 2, 66, "#aaa8be", "center", 5.5);
  const cardWidth = 146;
  const cardY = 74;
  const cardHeight = 126;
  choice.options.forEach((path, index) => {
    const x = 10 + index * 157;
    const selected = index === choice.selectedIndex;
    ctx.fillStyle = selected ? "rgba(20, 22, 43, .94)" : "rgba(8, 9, 24, .86)";
    ctx.fillRect(x, cardY, cardWidth, cardHeight);
    ctx.fillStyle = path.color;
    ctx.fillRect(x, cardY, cardWidth, selected ? 4 : 2);
    if (selected) {
      ctx.strokeStyle = path.color;
      ctx.lineWidth = choice.converged ? 2 : 1;
      ctx.strokeRect(x + .5, cardY + .5, cardWidth - 1, cardHeight - 1);
    }
    pixelText(t(`path.group.${path.group}`), x + cardWidth / 2, cardY + 15, path.color, "center", 5);
    wrappedPixelText(pathText(path, "name"), x + cardWidth / 2, cardY + 29, cardWidth - 12, 9, "#ffffff", "center", 8, 2);
    wrappedPixelText(pathText(path, "description"), x + cardWidth / 2, cardY + 54, cardWidth - 14, 7, "#aaa8be", "center", 5, 2);
    wrappedPixelText(t("hud.pathRisk", { risk: pathText(path, "risk") }), x + cardWidth / 2, cardY + 79, cardWidth - 12, 7, "#ff9bad", "center", 5, 2);
    wrappedPixelText(t("hud.pathReward", { reward: pathText(path, "reward") }), x + cardWidth / 2, cardY + 101, cardWidth - 12, 7, "#ffe784", "center", 5, 2);
    pixelText(`×${path.score.toFixed(2)}`, x + cardWidth / 2, cardY + 119, path.color, "center", 6);
  });
  const holdRatio = clamp(choice.hold / .68, 0, 1);
  ctx.fillStyle = "#17182f";
  ctx.fillRect(W / 2 - 58, 210, 116, 5);
  ctx.fillStyle = choice.options[choice.selectedIndex]?.color || stage.accent;
  ctx.fillRect(W / 2 - 57, 211, Math.round(114 * holdRatio), 3);
  pixelText(t(choice.converged ? "hud.pathConverged" : "hud.pathGather"), W / 2, 227, choice.converged ? "#ffffff" : "#aaa8be", "center", 6);
  pixelText(t("hud.pathTimer", { time: Math.max(0, choice.timer).toFixed(1) }), W / 2, 240, "#85849e", "center", 5);
  ctx.restore();
}

function drawBar(x, y, width, value, color, reverse = false) {
  const filled = Math.round((width - 2) * clamp(value, 0, 1));
  ctx.fillStyle = "#080916";
  ctx.fillRect(x, y, width, 4);
  ctx.fillStyle = "#2b2d50";
  ctx.fillRect(x + 1, y + 1, width - 2, 2);
  ctx.fillStyle = color;
  ctx.fillRect(reverse ? x + width - 1 - filled : x + 1, y + 1, filled, 2);
}

function drawHud() {
  const stage = activeStage();
  ctx.fillStyle = "rgba(5, 6, 18, .88)";
  ctx.fillRect(0, 0, W, 26);
  ctx.fillStyle = "#292b50";
  ctx.fillRect(0, 25, W, 1);

  const p1 = world.players[0];
  const p2 = world.players[1];
  pixelText("P1", 9, 10, PLAYER_CONFIG[0].color, "left", 7);
  pixelText(String(world.score).padStart(6, "0"), 27, 10, "#f7f4df", "left", 7);
  drawBar(9, 14, 65, p1.hp / p1.maxHp, p1.hp / p1.maxHp <= .3 ? "#ff826b" : "#94dba6");
  drawBar(78, 14, 48, world.novaCharge / NOVA_CONFIG.threshold, "#c691ff");
  pixelText(`W${p1.weapon}`, 130, 18, "#8585a4", "left", 6);

  pixelText(world.gameMode === "solo" ? "AI" : "P2", W - 9, 10, PLAYER_CONFIG[1].color, "right", 7);
  pixelText(String(world.score).padStart(6, "0"), W - 27, 10, "#f7f4df", "right", 7);
  drawBar(W - 74, 14, 65, p2.hp / p2.maxHp, p2.hp / p2.maxHp <= .3 ? "#ff826b" : "#94dba6", true);
  drawBar(W - 126, 14, 48, world.novaCharge / NOVA_CONFIG.threshold, "#c691ff", true);
  pixelText(`W${p2.weapon}`, W - 130, 18, "#8585a4", "right", 6);

  for (const player of world.players) {
    const left = player.index === 0;
    const x = left ? 9 : W - 9;
    const align = left ? "left" : "right";
    drawBar(left ? 9 : W - 74, 20, 65, player.shield / player.maxShield, player.shieldHitTimer > 0 ? "#d6ffff" : "#6edcf5", !left);
    pixelText(t("hud.hullShield", { hp: Math.max(0, player.hp), maxHp: player.maxHp, shield: player.shield, maxShield: player.maxShield }), x, 34, player.shieldBreakTimer > 0 ? "#d6ffff" : "#bcc5d8", align, 5);
    if (player.hp / player.maxHp <= .3 && !player.downed) pixelText(t("hud.hullCritical"), x, 43, "#ffae77", align, 5);
  }
  pixelText(t("hud.novaMeter", { percent: Math.floor(world.novaCharge / NOVA_CONFIG.threshold * 100) }), 78, 24, "#c691ff", "left", 4.5);
  pixelText(t("hud.novaMeter", { percent: Math.floor(world.novaCharge / NOVA_CONFIG.threshold * 100) }), W - 78, 24, "#c691ff", "right", 4.5);

  pixelText(`${stageText(stage, "code")} // ${biomeText(stage.biome, "name")}`, W / 2, 10, "#d6d4e4", "center", 6);
  const progress = world.bossSpawned ? 1 : world.stageTime / stage.duration;
  drawBar(W / 2 - 46, 15, 92, progress, stage.accent);
  const routeStatus = world.activeBranch
    ? `${pathText(world.activeBranch, "name")} ×${world.activeBranch.score.toFixed(2)} // ${t("hud.sector", { current: world.globalSector, total: DIRECTOR.TOTAL_SECTORS })}`
    : t("hud.pathPending");
  pixelText(routeStatus, W / 2, 24, world.activeBranch?.color || "#85849e", "center", 5);

  if (world.combo > 1) {
    const scale = Math.min(2, 1 + world.combo * 0.02);
    if (p2.hp / p2.maxHp > .3) pixelText(t("hud.combo", { combo: world.combo }), W - 9, 43, world.combo > 20 ? "#ffe27a" : "#ffffff", "right", 7 * scale);
  }
  const threat = threatConfig();
  const threatPulse = world.threatPulseTimer > 0 ? .72 + Math.sin(world.time * 20) * .28 : 1;
  ctx.globalAlpha = threatPulse;
  pixelText(t("hud.threatLevel", { level: world.threatTier + 1, name: t(threat.nameKey) }), W - 9, 53, threat.color, "right", 5.5);
  drawBar(W - 62, 57, 53, (world.threatTier + 1) / THREAT_TIERS.length, threat.color, true);
  const combatBeat = COMBAT.BEATS.find((beat) => beat.id === world.combatBeatId) || COMBAT.BEATS[0];
  pixelText(t("hud.combatBeat", { beat: t(combatBeat.nameKey), tier: world.combatPatternTier + 1 }), W - 9, 68, combatBeat.id === "killzone" ? "#ff8a70" : "#9d9bb4", "right", 5);
  ctx.globalAlpha = 1;
  const anomaly = world.activeAnomaly;
  if (anomaly) {
    const direction = anomaly.polarity > 0 ? "+" : "−";
    pixelText(t("hud.anomalyField", { anomaly: anomalyText(anomaly, "name"), direction }), 9, 53, anomaly.color, "left", 5.5);
    drawBar(9, 57, 53, anomaly.intensity, anomaly.color);
  }
  if (rushActive() || world.rushCharge > 0) {
    const active = rushActive();
    const ratio = active
      ? clamp(world.rushTimer / RUSH_CONFIG.duration, 0, 1)
      : clamp(world.rushCharge / RUSH_CONFIG.threshold, 0, 1);
    const pulse = active ? .72 + Math.sin(world.time * 18) * .28 : 1;
    const color = active ? (world.rushChain >= 12 ? "#ffe56d" : "#92fff0") : "#8585a4";
    ctx.globalAlpha = pulse;
    pixelText(active
      ? t("hud.rushActive", { time: world.rushTimer.toFixed(1), chain: world.rushChain })
      : t("hud.rushCharge", { percent: Math.floor(ratio * 100) }), W / 2, H - 25, color, "center", active ? 6.5 : 5.5);
    drawBar(W / 2 - 58, H - 21, 116, ratio, color);
    ctx.globalAlpha = 1;
  }
  if (world.linked) pixelText(t("hud.resonance"), W / 2, H - 8, "#92fff0", "center", 6);
  if (world.activeProtocols.length) {
    const protocol = world.activeProtocols[Math.floor(world.time / 4) % world.activeProtocols.length];
    pixelText(t("hud.protocolActive", { protocol: localizedName(protocol), procs: world.protocolProcs }), 9, H - 8, protocol.color, "left", 5.5);
  }
  for (const player of world.players) {
    const buffs = SpaceStatus.activeBuffs(player.buffs);
    const debuffs = SpaceStatus.activeDebuffs(player.debuffs);
    const align = player.index === 0 ? "left" : "right";
    const x = player.index === 0 ? 9 : W - 9;
    const statusY = player.index === 0 && world.activeProtocols.length ? H - 26 : H - 17;
    if (buffs.length) {
      const names = buffs.slice(0, 2).map((buff) => t(buff.nameKey)).join("+");
      pixelText(t("hud.buffModules", { buffs: names }), x, statusY, buffs[0].color, align, 5);
    }
    if (debuffs.length) {
      const names = debuffs.slice(0, 2).map((debuff) => t(debuff.nameKey)).join("+");
      pixelText(t("hud.debuffModules", { debuffs: names }), x, statusY + 9, debuffs[0].color, align, 5);
    }
  }

  if (world.boss) {
    pixelText(stageText(stage, "boss"), W / 2, 34, stage.accent, "center", 7);
    drawBar(W / 2 - 82, 38, 164, world.boss.hp / world.boss.maxHp, stage.accent);
    const phaseLabel = t(world.boss.phaseShield > 0 ? "hud.coreShift" : "hud.phase", { phase: world.boss.phaseLevel });
    pixelText(phaseLabel, W / 2, 48, world.boss.phaseShield > 0 ? "#ffffff" : "#85849e", "center", 5.5);
  }

  if (world.novaCharge >= NOVA_CONFIG.threshold) pixelText(world.novaCooldown > 0 ? t("hud.novaCooling", { seconds: Math.ceil(world.novaCooldown) }) : t("hud.novaReady"), W / 2, world.boss ? 61 : 34, "#d7a8ff", "center", 6);
}

function drawEncounterHud() {
  const encounter = world.activeEncounter;
  if (!encounter || world.introTimer > 0 || world.clearTimer > 0 || world.routeChoice) return;
  const ratio = encounter.kind === "survive"
    ? 1 - clamp(encounter.timer / encounter.total, 0, 1)
    : clamp(encounter.progress / encounter.goal, 0, 1);
  const objective = t(encounter.objectiveKey, {
    current: Math.floor(encounter.progress),
    goal: Math.ceil(encounter.goal),
    hits: encounter.hits,
    allowed: encounter.goal,
    hp: Math.ceil(encounter.hp),
    total: Math.ceil(encounter.maxHp),
  });
  const x = W / 2 - 118;
  const y = 30;
  ctx.save();
  ctx.fillStyle = "rgba(5, 6, 18, .9)";
  ctx.fillRect(x, y, 236, 27);
  ctx.fillStyle = encounter.color;
  ctx.fillRect(x, y, 3, 27);
  pixelText(t("hud.encounter", { current: world.encounterIndex, total: world.encounterPlans[world.stageIndex]?.length || 0 }), x + 9, y + 9, encounter.color, "left", 5);
  pixelText(encounterText(encounter, "name"), W / 2, y + 10, "#ffffff", "center", 7);
  pixelText(t("hud.encounterTimer", { time: Math.max(0, encounter.timer).toFixed(1) }), x + 227, y + 9, "#9d9bb4", "right", 5);
  pixelText(objective, W / 2, y + 20, "#c9c7db", "center", 5.5);
  drawBar(x + 8, y + 22, 220, ratio, encounter.color);
  ctx.restore();
}

function drawStageEvent() {
  const event = world.stageEvent;
  if (!event || world.introTimer > 0 || world.clearTimer > 0) return;
  const elapsed = event.total - event.timer;
  const reveal = clamp(elapsed * 4, 0, 1) * clamp(event.timer * 2.4, 0, 1);
  ctx.save();
  ctx.globalAlpha = reveal;
  const width = 230;
  const x = W / 2 - width / 2;
  const y = 57;
  ctx.fillStyle = "rgba(5, 6, 18, .86)";
  ctx.fillRect(x, y, width, 34);
  const stage = activeStage();
  ctx.fillStyle = stage.accent;
  ctx.fillRect(x, y, 4, 34);
  ctx.fillRect(x + width - 4, y, 4, 34);
  pixelText(t("hud.routeEvent", { event: world.eventIndex }), W / 2, y + 10, stage.accent, "center", 6);
  pixelText(eventText(event, "name"), W / 2, y + 22, "#ffffff", "center", 10);
  pixelText(eventText(event, "subtitle"), W / 2, y + 31, "#9d9bb4", "center", 5.5);
  ctx.restore();
}

function drawVariantNotice() {
  const notice = world.variantNotice;
  if (!notice || world.introTimer > 0 || world.clearTimer > 0 || world.stageEvent) return;
  const reveal = clamp((notice.total - notice.timer) * 5, 0, 1) * clamp(notice.timer * 2.6, 0, 1);
  const enemy = notice.enemy;
  const moduleNames = [enemy.movementNameKey, enemy.weaponNameKey, enemy.coreNameKey, enemy.aiNameKey, enemy.payloadNameKey].map((key) => t(key)).join(" // ");
  const width = 158;
  const x = 8;
  const y = 64;
  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = "rgba(5, 6, 18, .78)";
  ctx.fillRect(x, y, width, 34);
  ctx.fillStyle = enemy.moduleColor || activeStage().accent;
  ctx.fillRect(x, y, 3, 34);
  pixelText(t("hud.enemyScan"), x + 9, y + 9, enemy.moduleColor || activeStage().accent, "left", 5);
  wrappedPixelText(moduleNames, x + 9, y + 19, width - 16, 7, "#ffffff", "left", 5.25, 2);
  ctx.restore();
}

function drawCinematic() {
  const cinematic = world.cinematic;
  if (!cinematic) return;
  const progress = clamp(1 - cinematic.timer / cinematic.total, 0, 1);
  const amount = Math.sin(progress * Math.PI);
  ctx.save();
  ctx.globalAlpha = .82 * amount;
  ctx.fillStyle = "#03040d";
  ctx.fillRect(0, 0, W, 12 * amount);
  ctx.fillRect(0, H - 12 * amount, W, 12 * amount);
  if (cinematic.type === "boss" && world.boss) {
    ctx.globalAlpha = Math.min(1, amount * 1.5);
    pixelText(t("hud.threat"), W / 2, 102, "#ff6b77", "center", 7);
    pixelText(stageText(activeStage(), "boss"), W / 2, 124, "#ffffff", "center", 15);
  } else if (cinematic.type === "phase" && world.boss) {
    ctx.globalAlpha = Math.min(.9, amount * 1.4);
    pixelText(t("hud.phaseTitle", { phase: world.boss.phaseLevel }), W / 2, 112, activeStage().accent, "center", 13);
    pixelText(bossPhaseText(world.stageIndex, world.boss.phaseLevel), W / 2, 130, "#ffffff", "center", 7);
  }
  ctx.restore();
}

function drawStageCard() {
  if (world.introTimer <= 0 && world.clearTimer <= 0) return;
  const stage = activeStage();
  if (world.clearTimer > 0) {
    const repairAmount = 2 + (world.players[0]?.stageRepair || 0);
    ctx.fillStyle = "rgba(5, 6, 15, .7)";
    ctx.fillRect(140, 101, 200, 52);
    pixelText(t("hud.routeClear"), W / 2, 122, stage.accent, "center", 14);
    pixelText(t("hud.repairWarp", { amount: repairAmount }), W / 2, 140, "#c6c4d7", "center", 7);
    return;
  }
  const opacity = clamp((3.2 - world.introTimer) * 2, 0, 1) * clamp(world.introTimer, 0, 1);
  ctx.globalAlpha = Math.max(0.35, opacity);
  ctx.fillStyle = "rgba(5, 6, 15, .72)";
  ctx.fillRect(98, 72, 284, 104);
  ctx.fillStyle = stage.accent;
  ctx.fillRect(98, 72, 4, 104);
  pixelText(`${stageText(stage, "code")} // ${localizedName(world.contract)}`, W / 2, 89, stage.accent, "center", 7);
  pixelText(stageText(stage, "name"), W / 2, 109, "#ffffff", "center", 15);
  pixelText(biomeText(stage.biome, "name"), W / 2, 126, stage.secondary, "center", 9);
  pixelText(biomeText(stage.biome, "description"), W / 2, 139, "#aaa8be", "center", 5.5);
  pixelText(t("hud.anomalyStageLine", { anomaly: anomalyText(world.activeAnomaly, "name"), effect: anomalyText(world.activeAnomaly, "effect") }), W / 2, 149, world.activeAnomaly.color, "center", 5.5);
  pixelText(t("hud.pathActive", { path: pathText(world.activeBranch, "name") }), W / 2, 159, world.activeBranch.color, "center", 5.5);
  pixelText(t("hud.pathRewardLine", { reward: pathText(world.activeBranch, "reward"), score: world.activeBranch.score.toFixed(2) }), W / 2, 169, "#ffe56d", "center", 5);
  ctx.globalAlpha = 1;
}

function drawPause() {
  if (world.mode !== "paused") return;
  ctx.fillStyle = "rgba(4, 5, 15, .78)";
  ctx.fillRect(0, 0, W, H);
  pixelText(t("hud.paused"), W / 2, H / 2 - 3, "#ffffff", "center", 18);
  pixelText(t("hud.pauseHint"), W / 2, H / 2 + 17, "#8d8ba6", "center", 7);
}

function drawMenuScene() {
  const t = world.time;
  const fakeOne = { ...createPlayer(0), x: 348 + Math.sin(t * 0.7) * 10, y: 144 + Math.cos(t * 1.2) * 6, invulnerability: 0, shield: 1 };
  const fakeTwo = { ...createPlayer(1), x: 390 + Math.sin(t * 0.9) * 14, y: 166 + Math.cos(t) * 7, invulnerability: 0, shield: 0 };
  drawPlayer(fakeOne);
  drawPlayer(fakeTwo);
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = "#68f4df";
  for (let i = 0; i < 5; i += 1) ctx.fillRect(348 + i * 9, 128 - i * 4, 2, 9);
  ctx.globalAlpha = 1;
}

function enemyLayoutStats() {
  const enemies = world.enemies.filter((enemy) => !enemy.dead && !enemy.boss && enemy.aiState !== "entry" && enemy.y >= 20 && enemy.y < H - 40);
  let overlapPairs = 0;
  let closePairs = 0;
  let minClearance = enemies.length > 1 ? Number.POSITIVE_INFINITY : 0;
  for (let first = 0; first < enemies.length; first += 1) {
    for (let second = first + 1; second < enemies.length; second += 1) {
      const a = enemies[first];
      const b = enemies[second];
      const clearance = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      minClearance = Math.min(minClearance, clearance);
      if (clearance < 0) overlapPairs += 1;
      if (clearance < 12) closePairs += 1;
    }
  }
  const xs = enemies.map((enemy) => enemy.x);
  const ys = enemies.map((enemy) => enemy.y);
  return {
    overlapPairs,
    closePairs,
    minClearance: Number.isFinite(minClearance) ? minClearance : 0,
    spreadX: xs.length ? Math.max(...xs) - Math.min(...xs) : 0,
    spreadY: ys.length ? Math.max(...ys) - Math.min(...ys) : 0,
  };
}

function draw() {
  renderer3D.render(world, world.routeStages.length ? world.routeStages : STAGES, PLAYER_CONFIG, profile.settings);
  resizeHudCanvas();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(hudScaleX, 0, 0, hudScaleY, 0, 0);

  if (world.mode !== "menu") {
    drawHud();
    drawRouteChoice();
    drawEncounterHud();
    drawStageCard();
    drawStageEvent();
    drawVariantNotice();
    drawCinematic();
    const downedPlayers = world.players.filter((player) => player.downed);
    downedPlayers.forEach((player, index) => {
      const y = H - 31 - index * 13;
      ctx.fillStyle = "rgba(5, 6, 18, .82)";
      ctx.fillRect(W / 2 - 70, y - 8, 140, 12);
      pixelText(t("hud.autoRescue", { player: player.index + 1, percent: Math.round(player.revive / 1.65 * 100) }), W / 2, y, PLAYER_CONFIG[player.index].light, "center", 6);
      drawBar(W / 2 - 45, y + 1, 90, player.revive / 1.65, PLAYER_CONFIG[player.index].color);
    });
  }

  if (world.flash > 0) {
    ctx.globalAlpha = world.flash * profile.settings.flashes;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  const enemyLayout = enemyLayoutStats();
  const activeEnemies = world.enemies.filter((enemy) => !enemy.boss);
  const enemyBulletSpeeds = world.enemyBullets.map((bullet) => Math.hypot(bullet.vx, bullet.vy));
  const enemyBulletAverage = enemyBulletSpeeds.length ? enemyBulletSpeeds.reduce((sum, speed) => sum + speed, 0) / enemyBulletSpeeds.length : 0;
  const homingSpeeds = world.enemyBullets.filter((bullet) => bullet.behavior === "homing").map((bullet) => Math.hypot(bullet.vx, bullet.vy));
  const homingAverage = homingSpeeds.length ? homingSpeeds.reduce((sum, speed) => sum + speed, 0) / homingSpeeds.length : 0;
  const standoffErrors = activeEnemies.map((enemy) => Math.abs(enemy.rangeError)).filter(Number.isFinite);
  const activeEnemyTelegraphs = activeEnemies.filter((enemy) => enemy.aiState === "telegraph" && enemy.attackPattern);
  const nativeSpecies = activeStage().biome?.speciesId || "";
  canvas.dataset.mode = world.mode;
  canvas.dataset.language = SpaceI18n.language;
  canvas.dataset.stage = String(world.stageIndex + 1);
  canvas.dataset.stageTime = world.stageTime.toFixed(2);
  canvas.dataset.runTargetSeconds = String(DIRECTOR.BASE_RUN_SECONDS);
  canvas.dataset.sector = String(world.globalSector);
  canvas.dataset.sectorLocal = String(world.sectorIndex + 1);
  canvas.dataset.sectorFlash = world.sectorFlashTimer.toFixed(2);
  canvas.dataset.events = String(world.eventIndex);
  canvas.dataset.encounters = String(world.encounterIndex);
  canvas.dataset.drafts = String(world.draftCount);
  canvas.dataset.draftContext = world.draftContext;
  canvas.dataset.enemies = String(world.enemies.length);
  canvas.dataset.enemyOverlapPairs = String(enemyLayout.overlapPairs);
  canvas.dataset.enemyClosePairs = String(enemyLayout.closePairs);
  canvas.dataset.enemyMinClearance = enemyLayout.minClearance.toFixed(1);
  canvas.dataset.enemySpread = `${enemyLayout.spreadX.toFixed(1)}|${enemyLayout.spreadY.toFixed(1)}`;
  canvas.dataset.enemyStandoffError = standoffErrors.length
    ? `${(standoffErrors.reduce((sum, error) => sum + error, 0) / standoffErrors.length).toFixed(1)}|${Math.max(...standoffErrors).toFixed(1)}`
    : "0.0|0.0";
  canvas.dataset.enemyBullets = String(world.enemyBullets.length);
  canvas.dataset.enemyBeams = String(world.enemyBeams.length);
  canvas.dataset.enemyHomingBullets = String(world.enemyBullets.filter((bullet) => bullet.behavior === "homing").length);
  canvas.dataset.enemyBlastBullets = String(world.enemyBullets.filter((bullet) => bullet.behavior === "blast").length);
  canvas.dataset.enemyHomingSpeed = homingSpeeds.length
    ? `${Math.min(...homingSpeeds).toFixed(1)}|${homingAverage.toFixed(1)}|${Math.max(...homingSpeeds).toFixed(1)}`
    : "0.0|0.0|0.0";
  canvas.dataset.enemyBeamFinite = world.enemyBeams.every((beam) => [beam.x1, beam.y1, beam.x2, beam.y2].every(Number.isFinite)) ? "true" : "false";
  canvas.dataset.enemyBulletSpeed = enemyBulletSpeeds.length
    ? `${Math.min(...enemyBulletSpeeds).toFixed(1)}|${enemyBulletAverage.toFixed(1)}|${Math.max(...enemyBulletSpeeds).toFixed(1)}`
    : "0.0|0.0|0.0";
  canvas.dataset.combatLaserHits = String(world.combatLaserHits);
  canvas.dataset.combatHomingHits = String(world.combatHomingHits);
  canvas.dataset.combatBlastHits = String(world.combatBlastHits);
  canvas.dataset.combatDeathrattles = String(world.combatDeathrattles);
  canvas.dataset.combatBodyCollisions = String(world.combatBodyCollisions);
  canvas.dataset.combatFriendlyCollisions = String(world.combatFriendlyCollisions);
  canvas.dataset.combatInvalidProjectiles = String(world.combatInvalidProjectiles);
  canvas.dataset.combatBossFragments = String(world.combatBossFragments);
  canvas.dataset.ambientEliteSpawns = String(world.ambientEliteSpawns);
  canvas.dataset.combatBeat = world.combatBeatId;
  canvas.dataset.combatPressure = world.combatPressure.toFixed(3);
  canvas.dataset.combatPatternTier = String(world.combatPatternTier);
  canvas.dataset.combatBulletCap = String(world.combatBulletCap);
  canvas.dataset.combatHardBulletCap = String(world.combatBulletCap + (world.boss ? 34 : 12));
  canvas.dataset.bossAddCap = String(world.boss ? [8, 10, 12][world.stageIndex] : 0);
  canvas.dataset.bossAdds = String(world.boss ? activeEnemies.filter((enemy) => enemy.bossAdd).length : 0);
  canvas.dataset.combatStateTransitions = String(world.combatStateTransitions);
  canvas.dataset.combatTelegraphs = String(world.combatTelegraphs);
  canvas.dataset.combatPatterns = [...world.combatPatterns].join(",");
  canvas.dataset.enemyTelegraphPatterns = activeEnemyTelegraphs.map((enemy) => enemy.attackPattern).join(",");
  canvas.dataset.enemyTelegraphTargets = activeEnemyTelegraphs.map((enemy) => {
    const targetIndex = Number.isInteger(enemy.attackTargetIndex) ? enemy.attackTargetIndex : -1;
    const endX = Number.isFinite(enemy.attackEndX) ? enemy.attackEndX : enemy.attackTargetX;
    const endY = Number.isFinite(enemy.attackEndY) ? enemy.attackEndY : enemy.attackTargetY;
    return `${enemy.id}|${enemy.attackPattern}|${targetIndex}|${enemy.x.toFixed(1)}|${enemy.y.toFixed(1)}|${enemy.attackTargetX.toFixed(1)}|${enemy.attackTargetY.toFixed(1)}|${endX.toFixed(1)}|${endY.toFixed(1)}`;
  }).join(",");
  canvas.dataset.enemyAiStates = [...new Set(world.enemies.filter((enemy) => !enemy.boss).map((enemy) => enemy.aiState))].filter(Boolean).join(",");
  canvas.dataset.enemyAiDoctrines = [...new Set(activeEnemies.map((enemy) => `${enemy.aiModule}:${enemy.aiState}`))].join(",");
  canvas.dataset.enemyHulls = [...new Set(activeEnemies.map((enemy) => enemy.type))].join(",");
  canvas.dataset.enemyPositions = activeEnemies.slice(0, 8).map((enemy) => `${enemy.id}|${enemy.x.toFixed(1)}|${enemy.y.toFixed(1)}|${enemy.aiState}`).join(",");
  canvas.dataset.enemyWeapons = [...new Set(activeEnemies.map((enemy) => enemy.weaponModule))].filter(Boolean).join(",");
  canvas.dataset.enemySpecies = nativeSpecies;
  canvas.dataset.enemyNativeCount = String(activeEnemies.filter((enemy) => enemy.type === nativeSpecies).length);
  canvas.dataset.enemyEliteCount = String(activeEnemies.filter((enemy) => enemy.elite).length);
  canvas.dataset.enemyMaxHp = String(activeEnemies.length ? Math.max(...activeEnemies.map((enemy) => enemy.maxHp)) : 0);
  canvas.dataset.enemyMaxAge = (activeEnemies.length ? Math.max(...activeEnemies.map((enemy) => enemy.age)) : 0).toFixed(2);
  canvas.dataset.enemyMaxCycles = String(activeEnemies.length ? Math.max(...activeEnemies.map((enemy) => enemy.attackCycle || 0)) : 0);
  canvas.dataset.enemyFormations = String(new Set(world.enemies.filter((enemy) => !enemy.boss && enemy.formationId).map((enemy) => enemy.formationId)).size);
  canvas.dataset.lastFormation = world.lastFormationId || "solo";
  canvas.dataset.enemyScanLayout = "edge-compact";
  canvas.dataset.enemyScanActive = world.variantNotice ? "true" : "false";
  canvas.dataset.enemyScanVisible = world.variantNotice && world.introTimer <= 0 && world.clearTimer <= 0 && !world.stageEvent ? "true" : "false";
  canvas.dataset.enemyScanBounds = "8,64,158,34";
  canvas.dataset.runGrowth = SpaceRoguelike.growthScore(world.upgrades).toFixed(2);
  canvas.dataset.qaCombat = world.qaCombatApplied ? `${world.stageIndex + 1}:${(world.stageTime / activeStage().duration).toFixed(3)}` : "off";
  const adaptiveThreat = threatConfig();
  canvas.dataset.threatTier = String(world.threatTier);
  canvas.dataset.threatId = adaptiveThreat.id;
  canvas.dataset.threatScore = world.threatScore.toFixed(3);
  canvas.dataset.threatTarget = String(world.threatDesiredTier);
  canvas.dataset.threatPeak = String(world.threatPeak);
  canvas.dataset.threatChanges = String(world.threatChanges);
  canvas.dataset.threatReliefSeconds = world.threatReliefSeconds.toFixed(2);
  canvas.dataset.threatApexSeconds = world.threatApexSeconds.toFixed(2);
  canvas.dataset.threatSpawnRate = String(adaptiveThreat.spawnRate);
  canvas.dataset.threatBulletSpeed = String(adaptiveThreat.bulletSpeed);
  canvas.dataset.threatFireRate = String(adaptiveThreat.fireRate);
  canvas.dataset.threatEnemyHp = String(adaptiveThreat.enemyHp);
  canvas.dataset.threatAimSpread = String(adaptiveThreat.aimSpread);
  const anomaly = world.activeAnomaly;
  const anomalyMultipliers = anomalyConfig();
  canvas.dataset.anomalyPlan = world.anomalyPlanSignature;
  canvas.dataset.anomalyCount = String(ANOMALIES.length);
  canvas.dataset.anomalyId = anomaly?.id || "";
  canvas.dataset.anomalyKind = anomaly?.kind || "";
  canvas.dataset.anomalyIntensity = (anomaly?.intensity || 0).toFixed(3);
  canvas.dataset.anomalyPolarity = String(anomaly?.polarity || 0);
  canvas.dataset.anomalyElapsed = world.anomalyElapsed.toFixed(2);
  canvas.dataset.anomalyTransitions = String(world.anomalyTransitions);
  canvas.dataset.anomalyHistory = world.anomalyHistory.map((entry) => entry.id).join(",");
  canvas.dataset.anomalyForce = `${world.anomalyForceX.toFixed(2)},${world.anomalyForceY.toFixed(2)}`;
  canvas.dataset.anomalySpawnRate = anomalyMultipliers.spawnRate.toFixed(3);
  canvas.dataset.anomalyBulletSpeed = anomalyMultipliers.enemyBulletSpeed.toFixed(3);
  canvas.dataset.anomalyMoveSpeed = anomalyMultipliers.enemyMoveSpeed.toFixed(3);
  canvas.dataset.anomalyEnemyFireRate = anomalyMultipliers.enemyFireRate.toFixed(3);
  canvas.dataset.anomalyDropRate = anomalyMultipliers.dropRate.toFixed(3);
  canvas.dataset.anomalyPlayerSpeed = anomalyMultipliers.playerSpeed.toFixed(3);
  canvas.dataset.anomalyFireRate = anomalyMultipliers.playerFireRate.toFixed(3);
  canvas.dataset.anomalyEnergyRate = anomalyMultipliers.energyRate.toFixed(3);
  canvas.dataset.anomalyPickupMagnet = anomalyMultipliers.pickupMagnet.toFixed(2);
  canvas.dataset.anomalyScore = anomalyMultipliers.score.toFixed(3);
  canvas.dataset.bossPhase = world.boss ? String(world.boss.phaseLevel) : "0";
  canvas.dataset.bossAttackState = world.boss?.attackState || "off";
  canvas.dataset.bossAttack = world.boss?.attackId || "";
  canvas.dataset.bossAttackCharge = (world.boss?.attackCharge || 0).toFixed(2);
  canvas.dataset.playerHp = world.players.map((player) => player.hp).join(",");
  canvas.dataset.playerMaxHp = world.players.map((player) => player.maxHp).join(",");
  canvas.dataset.playerShield = world.players.map((player) => player.shield).join(",");
  canvas.dataset.playerShieldAbsorbed = world.players.map((player) => player.shieldAbsorbed).join(",");
  canvas.dataset.playerHullDamage = world.players.map((player) => player.hullDamageTaken).join(",");
  canvas.dataset.playerDamageState = world.players.map((player) => player.downed ? "downed" : player.hp / player.maxHp <= .3 ? "critical" : player.hp / player.maxHp <= .6 ? "damaged" : "healthy").join(",");
  canvas.dataset.playerHitFeedback = world.players.map((player) => `${player.shieldHitTimer.toFixed(2)}|${player.shieldBreakTimer.toFixed(2)}|${player.hullHitTimer.toFixed(2)}`).join(",");
  canvas.dataset.playerSpeed = world.players.map((player) => player.speed).join(",");
  canvas.dataset.playerFireRate = world.players.map((player) => player.fireRate).join(",");
  canvas.dataset.playerDamage = world.players.map((player) => player.damage.toFixed(3)).join(",");
  canvas.dataset.playerEnergyGain = world.players.map((player) => player.energyGain.toFixed(3)).join(",");
  canvas.dataset.playerShots = world.players.map((player) => player.shots).join(",");
  canvas.dataset.playerPosition = world.players.map((player) => `${player.x.toFixed(1)}|${player.y.toFixed(1)}`).join(",");
  canvas.dataset.playerDamageTaken = world.players.map((player) => player.damageTaken).join(",");
  canvas.dataset.playerDowned = world.players.map((player) => player.downed ? "1" : "0").join(",");
  canvas.dataset.playerDownCount = world.players.map((player) => player.downCount).join(",");
  canvas.dataset.playerRescueCount = world.players.map((player) => player.rescueCount).join(",");
  canvas.dataset.playerProjectiles = String(world.bullets.length);
  canvas.dataset.growthCapstones = world.players.map((player) => `${player.burstCadence > 0 ? 1 : 0}|${player.prismEcho > 0 ? 1 : 0}|${player.droneVolley > 0 ? 1 : 0}`).join(",");
  canvas.dataset.growthCapstoneProcs = world.players.map((player) => `${player.capstoneHeavyProcs}|${player.capstonePrismProcs}|${player.capstoneDroneProcs}`).join(",");
  canvas.dataset.qaGrowth = QA_GROWTH_MODE || "off";
  canvas.dataset.aiIntent = world.gameMode === "solo" ? world.players[1]?.aiIntent || "formation" : "human-coop";
  canvas.dataset.fps = String(measuredFps);
  canvas.dataset.qa = QA_LABEL;
  canvas.dataset.frame = world.loadoutFrame;
  canvas.dataset.module = world.loadoutModule;
  canvas.dataset.contract = world.contractId;
  canvas.dataset.scoreMultiplier = String(world.contract.score);
  canvas.dataset.achievementCount = String(profile.achievements.length);
  canvas.dataset.talents = profile.talents.join(",");
  canvas.dataset.talentCount = String(profile.talents.length);
  canvas.dataset.stardustReward = String(world.stardustReward);
  canvas.dataset.researchRanks = JSON.stringify(profile.research.ranks);
  canvas.dataset.researchFocus = world.runResearch.focus;
  canvas.dataset.researchProcs = String(world.researchProcs);
  canvas.dataset.researchCaches = String(world.researchReward?.cacheCount || 0);
  canvas.dataset.growthGrace = world.growthGrace.toFixed(2);
  canvas.dataset.pressureHolds = String(world.pressureHolds);
  canvas.dataset.runSeed = String(world.runSeed);
  canvas.dataset.upgradeCount = String(world.upgradeHistory.length);
  canvas.dataset.kills = String(world.kills);
  canvas.dataset.upgrades = [...new Set(world.upgradeHistory)].map((id) => `${id}:${upgradeLevel(id)}`).join(",");
  canvas.dataset.draftOptions = world.draftOptions.map((upgrade) => upgrade.id).join(",");
  canvas.dataset.draftOfferHistory = world.draftOfferHistory.map((offer) => offer.join("+")).join("|");
  canvas.dataset.buildFocus = SpaceRoguelike.focusPath(world.upgradeHistory) || "none";
  canvas.dataset.rngStreams = "combat,draft,loot,route,cosmetic";
  canvas.dataset.routeSignature = world.routeSignature;
  canvas.dataset.biome = activeStage().biome?.id || "";
  canvas.dataset.enemyVariants = String(world.discoveredVariants.size);
  canvas.dataset.activeBuilds = [...new Set(world.enemies.filter((enemy) => !enemy.boss).map((enemy) => enemy.buildSignature))].filter(Boolean).join(",");
  canvas.dataset.enemyModuleSlots = "6";
  canvas.dataset.enemyBuildCatalog = String(SpaceExpedition.HULL_MODULES.length * SpaceExpedition.MOVEMENT_MODULES.length * SpaceExpedition.WEAPON_MODULES.length * SpaceExpedition.CORE_MODULES.length * SpaceExpedition.AI_MODULES.length * SpaceExpedition.PAYLOAD_MODULES.length);
  canvas.dataset.qaEnemyBuild = QA_ENEMY_BUILD?.signature || "";
  canvas.dataset.playerBuffs = world.players.map((player) => SpaceStatus.activeBuffs(player.buffs).map((buff) => buff.id).join("|") || "none").join(",");
  canvas.dataset.playerDebuffs = world.players.map((player) => SpaceStatus.activeDebuffs(player.debuffs).map((debuff) => debuff.id).join("|") || "none").join(",");
  canvas.dataset.pathPlan = world.branchPlanSignature;
  canvas.dataset.activePath = world.activeBranch?.id || "";
  canvas.dataset.pathOptions = world.routeChoice?.options.map((path) => path.id).join(",") || "";
  canvas.dataset.pathSelection = world.routeChoice ? String(world.routeChoice.selectedIndex) : "-1";
  canvas.dataset.pathHistory = world.branchHistory.filter(Boolean).map((path) => path.id).join(",");
  canvas.dataset.encounterPlan = world.encounterPlanSignature;
  canvas.dataset.activeEncounter = world.activeEncounter?.id || "";
  canvas.dataset.encounterProgress = world.activeEncounter
    ? `${world.activeEncounter.progress.toFixed(2)}/${world.activeEncounter.goal.toFixed(2)}`
    : "";
  canvas.dataset.encounterHistory = world.encounterHistory.map((record) => `${record.encounter.id}:${record.success ? "success" : "failed"}`).join(",");
  canvas.dataset.encounterObjects = String(world.encounterObjects.length);
  canvas.dataset.lootBudget = world.lootDropBudget.toFixed(3);
  canvas.dataset.lootDrought = String(world.lootDrought);
  canvas.dataset.lootMaxDrought = String(world.lootMaxDrought);
  canvas.dataset.lootDrops = String(world.lootDrops);
  canvas.dataset.lootBag = world.lootBag.join(",") || "empty";
  canvas.dataset.teamNovaCharge = world.novaCharge.toFixed(2);
  canvas.dataset.novaSharedMirrors = world.players.map((player) => player.energy.toFixed(2)).join("|");
  canvas.dataset.novaCount = String(world.novaCount);
  canvas.dataset.novaHitChargeEarned = world.novaHitChargeEarned.toFixed(2);
  canvas.dataset.novaChargeRate = teamNovaChargeRate().toFixed(3);
  canvas.dataset.novaClearRadius = String(NOVA_CONFIG.clearRadius + teamMaximum("novaRadiusBonus"));
  canvas.dataset.novaCooldown = world.novaCooldown.toFixed(2);
  canvas.dataset.novaMinInterval = world.novaMinimumInterval.toFixed(2);
  canvas.dataset.novaLocalClears = String(world.novaLocalClears);
  canvas.dataset.novaFullClears = String(world.novaFullClears);
  canvas.dataset.novaOutsideSurvivors = String(world.novaOutsideSurvivors);
  canvas.dataset.novaBeamsAtTrigger = String(world.novaBeamsAtTrigger);
  canvas.dataset.novaBeamsCleared = String(world.novaBeamsCleared);
  canvas.dataset.novaSelfChargeRejected = String(world.novaSelfChargeBlocked);
  canvas.dataset.novaSuppressedDeathrattles = String(world.novaSuppressedDeathrattles);
  canvas.dataset.novaHazardFragments = String(world.qaNovaHazardFragments);
  canvas.dataset.novaLastRadius = world.novaLastRadius.toFixed(1);
  canvas.dataset.rushCharge = world.rushCharge.toFixed(2);
  canvas.dataset.rushActive = String(rushActive());
  canvas.dataset.rushTimer = world.rushTimer.toFixed(2);
  canvas.dataset.rushCooldown = world.rushCooldown.toFixed(2);
  canvas.dataset.rushChain = String(world.rushChain);
  canvas.dataset.rushBestChain = String(world.rushBestChain);
  canvas.dataset.rushCount = String(world.rushCount);
  canvas.dataset.rushStartClears = String(world.rushStartClears);
  canvas.dataset.rushGuardClears = String(world.rushGuardClears);
  canvas.dataset.powerRules = "visible-build-v1";
  canvas.dataset.powerDamage = JSON.stringify(world.power.damage);
  canvas.dataset.powerShots = JSON.stringify(world.power.shots);
  canvas.dataset.powerHits = JSON.stringify(world.power.hits);
  canvas.dataset.pierceFollowupHits = String(world.power.pierceHits);
  canvas.dataset.blastDetonations = String(world.power.blastCount);
  canvas.dataset.blastAreaDamage = String(world.power.blastDamage);
  canvas.dataset.linkNodes = String(world.power.guardNodes);
  canvas.dataset.linkRecovery = world.power.guardRecovery.toFixed(2);
  canvas.dataset.ammoRanks = JSON.stringify(world.upgrades);
  canvas.dataset.rushGuardLimit = String(teamRushBonuses().rushGuardLimit);
  const rushDiagnostics = SpaceRush.combatMultipliers(true, teamRushBonuses());
  canvas.dataset.rushMoveSpeed = rushDiagnostics.moveSpeed.toFixed(3);
  canvas.dataset.rushHandling = rushDiagnostics.handling.toFixed(3);
  canvas.dataset.rushFireRate = rushDiagnostics.fireRate.toFixed(3);
  canvas.dataset.rushDamage = rushDiagnostics.damage.toFixed(3);
  canvas.dataset.rushLastBonus = String(world.rushLastBonus);
  canvas.dataset.protocols = world.activeProtocols.map((protocol) => protocol.id).join(",");
  canvas.dataset.protocolPrimary = world.activeProtocols[0]?.id || "none";
  canvas.dataset.protocolCount = String(world.activeProtocols.length);
  canvas.dataset.protocolProcs = String(world.protocolProcs);
  canvas.dataset.playerHurtRadius = world.players.map((player) => player.hurtRadius.toFixed(2)).join(",");
  canvas.dataset.playerBodyRadius = world.players.map((player) => player.bodyRadius.toFixed(2)).join(",");
  canvas.dataset.playerPickupRadius = world.players.map((player) => player.pickupRadius.toFixed(2)).join(",");
  canvas.dataset.hudResolution = `${canvas.width}x${canvas.height}`;
  canvas.dataset.hudScale = `${hudScaleX.toFixed(3)}x${hudScaleY.toFixed(3)}`;
}

let previousTime = performance.now();
let accumulator = 0;
let fpsWindowStarted = previousTime;
let fpsFrameCount = 0;
let measuredFps = 60;

function frame(now) {
  const elapsed = Math.min(0.1, (now - previousTime) / 1000);
  previousTime = now;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    update(STEP);
    accumulator -= STEP;
  }
  draw();
  fpsFrameCount += 1;
  if (now - fpsWindowStarted >= 1000) {
    measuredFps = Math.round(fpsFrameCount * 1000 / (now - fpsWindowStarted));
    fpsFrameCount = 0;
    fpsWindowStarted = now;
  }
  requestAnimationFrame(frame);
}

startButton.addEventListener("click", requestStart);
restartButton.addEventListener("click", startGame);
resultMenuButton.addEventListener("click", exitToMenu);
tutorialContinueButton.addEventListener("click", beginTutorialFlight);
resumeButton.addEventListener("click", resumeGame);
exitToMenuButton.addEventListener("click", exitToMenu);
topSettingsButton.addEventListener("click", openSettings);
pauseSettingsButton.addEventListener("click", openSettings);
closeSettingsButton.addEventListener("click", closeSettings);
hangarButton.addEventListener("click", openHangar);
closeHangarButton.addEventListener("click", closeHangar);

shipOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-loadout-id]");
  if (button) chooseLoadout("frame", button.dataset.loadoutId);
});

moduleOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-loadout-id]");
  if (button) chooseLoadout("module", button.dataset.loadoutId);
});

contractOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-contract-id]");
  if (button) chooseContract(button.dataset.contractId);
});

talentOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-talent-id]");
  if (button) unlockTalent(button.dataset.talentId);
});

upgradeOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-upgrade-id]");
  if (!button || world.mode !== "draft") return;
  const index = world.draftOptions.findIndex((upgrade) => upgrade.id === button.dataset.upgradeId);
  if (index < 0) return;
  world.draftIndex = index;
  confirmDraftSelection();
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (world.mode !== "menu") return;
    profile.selectedMode = button.dataset.mode === "coop" ? "coop" : "solo";
    saveProfile();
    updateModeUI();
    showToast(t(profile.selectedMode === "solo" ? "toast.soloReady" : "toast.coopReady"));
  });
});

musicVolume.addEventListener("input", () => {
  profile.settings.music = Number(musicVolume.value) / 100;
  musicVolumeValue.value = `${musicVolume.value}%`;
  audio.applySettings();
  saveProfile();
});

sfxVolume.addEventListener("input", () => {
  profile.settings.sfx = Number(sfxVolume.value) / 100;
  sfxVolumeValue.value = `${sfxVolume.value}%`;
  audio.applySettings();
  saveProfile();
});

qualitySetting.addEventListener("change", () => {
  profile.settings.quality = qualitySetting.value;
  saveProfile();
  showToast(t("toast.quality", { quality: qualitySetting.options[qualitySetting.selectedIndex].textContent }));
});

shakeSetting.addEventListener("change", () => {
  profile.settings.shake = Number(shakeSetting.value);
  saveProfile();
});

flashSetting.addEventListener("change", () => {
  profile.settings.flashes = Number(flashSetting.value);
  saveProfile();
});

bulletContrastSetting.addEventListener("change", () => {
  profile.settings.bulletContrast = bulletContrastSetting.value === "high" ? "high" : "standard";
  saveProfile();
  showToast(t(profile.settings.bulletContrast === "high" ? "toast.bulletsHigh" : "toast.bulletsStandard"));
});

languageSetting.addEventListener("change", () => {
  profile.settings.language = languageSetting.value === "en" ? "en" : "zh";
  saveProfile();
  SpaceI18n.setLanguage(profile.settings.language);
  languageSetting.value = profile.settings.language;
  updateModeUI();
  updateCareerSummary();
  audio.updateButton();
  resetSaveButton.textContent = t(resetSaveArmed ? "settings.resetConfirm" : "settings.reset");
  if (world.mode === "draft") renderUpgradeDraft();
  renderBuildTray();
  if (world.mode === "ended") renderResult();
  showToast(t("toast.language"));
});

resetSaveButton.addEventListener("click", () => {
  if (!resetSaveArmed) {
    resetSaveArmed = true;
    resetSaveButton.textContent = t("settings.resetConfirm");
    window.setTimeout(() => {
      resetSaveArmed = false;
      resetSaveButton.textContent = t("settings.reset");
    }, 3000);
    return;
  }
  profile = freshProfile();
  saveProfile();
  resetSaveArmed = false;
  SpaceI18n.setLanguage(profile.settings.language);
  resetSaveButton.textContent = t("settings.reset");
  updateModeUI();
  syncSettingsUI();
  renderHangar();
  audio.applySettings();
  showToast(t("toast.reset"));
});

soundButton.addEventListener("click", async () => {
  await audio.start();
  audio.toggleMute();
});
fullscreenButton.addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) await viewport.requestFullscreen();
    else await document.exitFullscreen();
  } catch {
    showToast(t("toast.fullscreenError"));
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && world.mode === "playing") pauseGame();
});

window.addEventListener("gamepadconnected", (event) => {
  showToast(t("toast.padConnected", { index: event.gamepad.index + 1, name: event.gamepad.id.slice(0, 24) }));
  pulseGamepad(event.gamepad.index, 120, 0.18, 0.28);
});

window.addEventListener("gamepaddisconnected", (event) => {
  showToast(t("toast.padDisconnected", { index: event.gamepad.index + 1 }));
});

updateModeUI();
syncSettingsUI();
resetWorld();
requestAnimationFrame(frame);
