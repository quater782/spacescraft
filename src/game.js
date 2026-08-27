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
const REQUESTED_QA_PATH = LOCAL_QA_HOST ? Number.parseInt(URL_PARAMS.get("qa-path") || "", 10) : Number.NaN;
const QA_PATH_INDEX = [0, 1, 2].includes(REQUESTED_QA_PATH) ? REQUESTED_QA_PATH : null;
const REQUESTED_QA_ENCOUNTER = LOCAL_QA_HOST ? URL_PARAMS.get("qa-encounter") : null;
const QA_ENCOUNTER_ID = SpaceExpedition.ENCOUNTER_PROTOCOLS.some((encounter) => encounter.id === REQUESTED_QA_ENCOUNTER)
  ? REQUESTED_QA_ENCOUNTER
  : null;
const REQUESTED_RUN_SEED = Number.parseInt(URL_PARAMS.get("seed") || "", 10);
const QA_LABEL = [QA_FAST_MODE && "fast", QA_WALLET_MODE && "wallet", QA_CONTRACTS_MODE && "contracts", QA_DRAFT_MODE && "draft", QA_RUSH_MODE && "rush", QA_PATH_INDEX !== null && `path${QA_PATH_INDEX}`, QA_ENCOUNTER_ID && `encounter-${QA_ENCOUNTER_ID}`].filter(Boolean).join("+") || "off";
const t = (key, variables) => SpaceI18n.t(key, variables);
const UPGRADE_DEFS = SpaceRoguelike.UPGRADE_DEFS;
const TALENT_NODES = SpaceConstellation.TALENT_NODES;
const RUSH_CONFIG = SpaceRush.RUSH_CONFIG;

ctx.imageSmoothingEnabled = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
let runRandom = SpaceRoguelike.createRng(1);
let visualRandom = SpaceRoguelike.createRng(0x9e3779b9);
const setRunRandomSeed = (seed) => {
  const normalized = (Number(seed) >>> 0) || 0x6d2b79f5;
  runRandom = SpaceRoguelike.createRng(normalized);
  visualRandom = SpaceRoguelike.createRng(normalized ^ 0x9e3779b9);
};
const random = () => runRandom();
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
  version: 5,
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
    loaded.version = 5;
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
    duration: 38,
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
    duration: 42,
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
    duration: 46,
    bpm: 164,
    sky: "#100719",
    haze: "#3b113b",
    grid: "#5e1d50",
    star: "#c39aff",
    accent: "#ff5d68",
  },
];

const STAGE_EVENTS = [
  [
    { at: 7, nameKey: "event.bubble.name", subtitleKey: "event.bubble.subtitle", pattern: "chevron" },
    { at: 18, nameKey: "event.spiral.name", subtitleKey: "event.spiral.subtitle", pattern: "crossfire" },
    { at: 29, nameKey: "event.candyElite.name", subtitleKey: "event.candyElite.subtitle", pattern: "elite", eliteType: "tank" },
  ],
  [
    { at: 8, nameKey: "event.convoy.name", subtitleKey: "event.convoy.subtitle", pattern: "convoy" },
    { at: 21, nameKey: "event.gear.name", subtitleKey: "event.gear.subtitle", pattern: "pinwheel" },
    { at: 33, nameKey: "event.forgeElite.name", subtitleKey: "event.forgeElite.subtitle", pattern: "elite", eliteType: "spinner" },
  ],
  [
    { at: 8, nameKey: "event.mines.name", subtitleKey: "event.mines.subtitle", pattern: "minefield" },
    { at: 23, nameKey: "event.pincer.name", subtitleKey: "event.pincer.subtitle", pattern: "pincer" },
    { at: 36, nameKey: "event.nightElite.name", subtitleKey: "event.nightElite.subtitle", pattern: "elite", eliteType: "tank" },
  ],
];

const BOSS_PHASE_KEYS = [
  ["bossPhase.1.1", "bossPhase.1.2", "bossPhase.1.3"],
  ["bossPhase.2.1", "bossPhase.2.2", "bossPhase.2.3"],
  ["bossPhase.3.1", "bossPhase.3.2", "bossPhase.3.3"],
];

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
        + (rushActive() ? 18 : 0);
      this.nextStep += 60 / bpm / 4;
      this.step += 1;
    }
  }

  scheduleStep(step, when) {
    const roots = [45, 42, 40];
    const root = roots[this.stage]
      + (world.routeStages?.[this.stage]?.musicShift || 0)
      + (world.activeBranch?.musicShift || 0)
      + (world.activeEncounter?.musicShift || 0);
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
    const intensity = rush ? 1.38 : this.boss ? 1.22 : encounterActive ? 1.1 : 1;

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
    if (encounterActive && !this.boss && s % 4 === 2) {
      const signal = world.activeEncounter.kind === "survive" ? 29 : world.activeEncounter.kind === "siege" ? 24 : 19;
      this.tone(root + signal, .06, "square", .021, when, this.musicBus, s === 10 ? 5 : 0);
      if (s === 6 || s === 14) this.noise(.032, .021, when, 2800, this.musicBus);
    }
    if (rush) {
      this.tone(root + 24 + arpeggios[this.stage][(s + bar) % 8], .055, s % 2 ? "square" : "triangle", .027, when, this.musicBus, s % 4 === 3 ? 7 : 0);
      if (s % 2 === 0) this.kick(when + .025);
      if (s % 4 === 3) this.noise(.028, .028, when, 5200, this.musicBus);
    }
  }

  sfx(name, owner = 0) {
    if (!this.context) return;
    const now = this.context.currentTime;
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
    } else if (name === "elite") {
      [48, 55, 51, 60].forEach((note, i) => this.tone(note, .16, "square", .055, now + i * .07, this.sfxBus, i % 2 ? -5 : 4));
      this.noise(.18, .045, now, 1200);
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
  enemies: [],
  pickups: [],
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
  draftTimer: 0,
  draftInputCooldown: 0,
  enemySerial: 0,
  chainResolving: false,
  biomes: [],
  routeStages: [],
  routeSignature: "",
  discoveredVariants: new Set(),
  variantNotice: null,
  variantNoticeCooldown: 0,
  volatileResolving: false,
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
  rushCharge: 0,
  rushTimer: 0,
  rushCooldown: 0,
  rushChain: 0,
  rushBestChain: 0,
  rushCount: 0,
  rushPulseTimer: 0,
  rushLastBonus: 0,
};

const activeStage = (index = world.stageIndex) => world.routeStages[index] || STAGES[index] || STAGES[0];

let settingsReturnContext = "menu";
let resetSaveArmed = false;

function aiPilotControls(player) {
  if (!player) return { x: 0, y: 0 };
  const partner = world.players[0];
  let targetX = partner?.x ?? W * 0.55;
  let targetY = H - 43;

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
  } else {
    const liveEnemies = world.enemies.filter((enemy) => !enemy.dead);
    if (liveEnemies.length) {
      const target = liveEnemies.reduce((best, enemy) => {
        const score = Math.abs(enemy.x - player.x) + Math.max(0, enemy.y - 155) * 0.4;
        return !best || score < best.score ? { enemy, score } : best;
      }, null)?.enemy;
      if (target) targetX = clamp(target.x, 25, W - 25);
    }
    const encounter = world.activeEncounter;
    if (encounter?.kind === "hold" || encounter?.kind === "escort") {
      targetX = encounter.x;
      targetY = encounter.y;
    } else if (encounter?.kind === "collect") {
      const shard = world.encounterObjects
        .filter((object) => object.type === "salvage" && !object.dead)
        .sort((a, b) => distance(player, a) - distance(player, b))[0];
      if (shard) {
        targetX = shard.x;
        targetY = shard.y;
      }
    } else if (encounter?.kind === "siege") {
      targetX = encounter.x;
    }
    if (partner && distance(player, partner) > 88) targetX = lerp(targetX, partner.x + 24, 0.55);
    if (player.hp <= 2 && partner) {
      targetX = lerp(targetX, partner.x, 0.68);
      targetY = Math.min(H - 30, partner.y + 14);
    }
  }

  let steerX = (targetX - player.x) * 0.045;
  let steerY = (targetY - player.y) * 0.05;
  for (const bullet of world.enemyBullets) {
    const futureX = bullet.x + bullet.vx * 0.34;
    const futureY = bullet.y + bullet.vy * 0.34;
    const dx = player.x - futureX;
    const dy = player.y - futureY;
    const range = Math.hypot(dx, dy);
    if (range < 62) {
      const urgency = (62 - range) / 62;
      steerX += (dx / Math.max(8, range)) * urgency * 4.2;
      steerY += (dy / Math.max(8, range)) * urgency * 2.2;
    }
  }
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
    resonanceArray: '<path d="M2 8h6v8H2V8Zm14 0h6v8h-6V8ZM9 10h6v4H9v-4Zm2-8h2v6h-2V2Zm0 14h2v6h-2v-6Z"/>',
    magnet: '<path d="M5 3h5v8a2 2 0 0 0 4 0V3h5v8a7 7 0 0 1-14 0V3Zm0 0h5v4H5V3Zm9 0h5v4h-5V3Z"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[upgradeId] || paths.novaCore}</svg>`;
}

function upgradeLevel(upgradeId) {
  return world.upgrades[upgradeId] || 0;
}

function rollDraftOptions() {
  return SpaceRoguelike.rollDraftOptions({
    levels: world.upgrades,
    stageIndex: world.stageIndex,
    random,
  });
}

function renderBuildTray() {
  const uniqueIds = [...new Set(world.upgradeHistory)];
  buildTray.hidden = uniqueIds.length === 0 || ["menu", "ended"].includes(world.mode);
  buildTray.innerHTML = uniqueIds.map((id) => {
    const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
    if (!upgrade) return "";
    const level = upgradeLevel(id);
    return `<span class="build-chip ${upgrade.rarity}" aria-label="${localizedName(upgrade)} Lv.${level}">${upgradeIcon(id)}<b>${level}</b></span>`;
  }).join("");
}

function renderResultBuild() {
  const uniqueIds = [...new Set(world.upgradeHistory)];
  const seedChip = `<span>${t("result.runSeed", { seed: String(world.runSeed).padStart(8, "0") })}</span>`;
  const route = world.biomes.map((biome) => biomeText(biome, "name")).join(t("result.routeSeparator"));
  const routeChip = route ? `<span>${t("result.ecosystems", { route })}</span>` : "";
  const paths = world.branchHistory.map((path) => pathText(path, "name")).join(t("result.routeSeparator"));
  const pathChip = paths ? `<span>${t("result.paths", { paths })}</span>` : "";
  const encounters = world.encounterHistory
    .map((record) => `${encounterText(record.encounter, "name")} ${t(record.success ? "encounter.status.success" : "encounter.status.failed")}`)
    .join(t("result.routeSeparator"));
  const encounterChip = encounters ? `<span>${t("result.encounters", { encounters })}</span>` : "";
  const talentChip = `<span>${t("result.talents", { current: profile.talents.length, total: TALENT_NODES.length })}</span>`;
  const rushChip = `<span>${t("result.rushSummary", { count: world.rushCount, chain: world.rushBestChain, score: world.rushLastBonus })}</span>`;
  const upgradeChips = uniqueIds.map((id) => {
    const upgrade = UPGRADE_DEFS.find((entry) => entry.id === id);
    return upgrade ? `<span>${upgradeIcon(id)}${localizedName(upgrade)} <b>Lv.${upgradeLevel(id)}</b></span>` : "";
  }).join("");
  resultBuild.innerHTML = seedChip + talentChip + rushChip + routeChip + pathChip + encounterChip + (upgradeChips || `<span>${t("result.buildEmpty")}</span>`);
}

function renderUpgradeDraft(focusSelected = false) {
  runSeedLabel.textContent = `#${String(world.runSeed).padStart(8, "0")}`;
  draftProgress.textContent = t("draft.progress", { current: world.draftCount, total: STAGES.length - 1 });
  upgradeOptions.innerHTML = world.draftOptions.map((upgrade, index) => {
    const selected = index === world.draftIndex;
    const nextLevel = upgradeLevel(upgrade.id) + 1;
    return `<button class="upgrade-choice ${upgrade.rarity} ${selected ? "selected" : ""}" type="button" role="listitem" data-upgrade-id="${upgrade.id}" aria-pressed="${selected}" aria-label="${t("draft.choose", { name: localizedName(upgrade) })}"><span class="upgrade-icon">${upgradeIcon(upgrade.id)}</span><span class="upgrade-kicker"><i>${t(`draft.category.${upgrade.category}`)}</i><b>${t(`draft.rarity.${upgrade.rarity}`)}</b></span><strong>${localizedName(upgrade)}</strong><p>${localizedDescription(upgrade)}</p><span class="upgrade-level">${t("draft.level", { current: nextLevel, max: upgrade.max })}</span></button>`;
  }).join("");
  if (focusSelected) upgradeOptions.querySelector(`[data-upgrade-id="${world.draftOptions[world.draftIndex]?.id}"]`)?.focus();
}

function beginUpgradeDraft() {
  world.mode = "draft";
  world.draftCount += 1;
  world.draftIndex = 0;
  world.draftTimer = 0;
  world.draftInputCooldown = .35;
  world.draftOptions = rollDraftOptions();
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
  const level = upgradeLevel(upgrade.id) + 1;
  if (level > upgrade.max) return;
  world.upgrades[upgrade.id] = level;
  world.upgradeHistory.push(upgrade.id);
  for (const player of world.players) {
    SpaceRoguelike.applyUpgradeToPlayer(player, upgrade.id, level);
  }
  audio.sfx("upgrade");
  pulseGamepad(0, 220, .55, .42);
  pulseGamepad(1, 220, .55, .42);
  showToast(t("toast.upgrade", { name: localizedName(upgrade), level }));
}

function confirmDraftSelection() {
  if (world.mode !== "draft") return;
  const upgrade = world.draftOptions[world.draftIndex];
  if (!upgrade) return;
  applyRunUpgrade(upgrade);
  upgradePanel.hidden = true;
  world.mode = "playing";
  advanceStage();
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

function renderHangar() {
  const balance = `✦ ${profile.stardust}`;
  menuStardust.textContent = balance;
  hangarStardust.textContent = balance;
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
  const player = {
    index,
    frameId: frame.id,
    moduleId: module.id,
    x: index === 0 ? W * 0.39 : W * 0.61,
    y: H - 38,
    vx: 0,
    vy: 0,
    r: frame.radius,
    hp: contractHp,
    maxHp: contractHp,
    speed: frame.speed,
    damage: frame.damage * contract.playerDamage,
    fireRate: frame.fireRate,
    energyGain: frame.energyGain * (module.energyGain || 1) * contract.playerEnergy,
    novaDamage: frame.novaDamage,
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
    chainDamage: 0,
    handling: 18,
    hitInvulnerability: 1.8,
    shieldRegenInterval: 0,
    shieldRegenTimer: Number.POSITIVE_INFINITY,
    pickupMagnetRadius: 0,
    fireTimer: 0,
    invulnerability: 3.5,
    shield: module.startShield || 0,
    downed: false,
    downTimer: 0,
    revive: 0,
    shots: 0,
  };
  return SpaceConstellation.applyToPlayer(player, profile.talents);
}

function prepareRouteChoice(stageIndex) {
  const options = world.branchSets[stageIndex] || [];
  const total = QA_FAST_MODE ? .22 : 5.8;
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
  const branch = choice.options[selectedIndex];
  if (!branch) return;
  world.activeBranch = branch;
  world.branchHistory[world.stageIndex] = branch;
  world.routeChoice = null;
  world.introTimer = QA_FAST_MODE ? .5 : 2.8;
  world.cinematic = { type: "warp", timer: 1.35, total: 1.35 };
  world.flash = Math.max(world.flash, .34);
  world.shake = Math.max(world.shake, .24);
  for (const player of world.players) {
    player.hp = Math.min(player.maxHp, player.hp + (branch.reward.repair || 0));
    player.shield = Math.min(player.maxShield, player.shield + (branch.reward.shield || 0));
    player.energy = Math.min(100, player.energy + (branch.reward.energy || 0));
    player.weapon = Math.min(4, player.weapon + (branch.reward.weapon || 0));
    player.x = player.index === 0 ? W * .39 : W * .61;
    player.y = H - 38;
    player.vx = 0;
    player.vy = 0;
    player.invulnerability = Math.max(player.invulnerability, 2);
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
    player.invulnerability = Math.max(player.invulnerability, 2);
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
  world.runSeed = createRunSeed();
  setRunRandomSeed(world.runSeed);
  world.biomes = [...SpaceExpedition.generateRoute(world.runSeed)];
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
        lane: base.lane,
        variant: base.variant,
        intensity: base.intensity,
        signature: `${forced.id}:${base.lane}:${base.variant}`,
      });
    }
  }
  world.encounterPlanSignature = world.encounterPlans.map((plan) => plan.map((encounter) => encounter.signature).join("|")).join(">");
  world.encounterIndex = 0;
  world.activeEncounter = null;
  world.encounterObjects = [];
  world.encounterHistory = [];
  world.encounterSerial = 0;
  world.rushCharge = QA_RUSH_MODE ? RUSH_CONFIG.threshold : 0;
  world.rushTimer = 0;
  world.rushCooldown = 0;
  world.rushChain = 0;
  world.rushBestChain = 0;
  world.rushCount = 0;
  world.rushPulseTimer = 0;
  world.rushLastBonus = 0;
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
  world.draftTimer = 0;
  world.draftInputCooldown = 0;
  world.enemySerial = 0;
  world.chainResolving = false;
  world.discoveredVariants = new Set();
  world.variantNotice = null;
  world.variantNoticeCooldown = 0;
  world.volatileResolving = false;
  world.players = [createPlayer(0), createPlayer(1)];
  world.bullets = [];
  world.enemyBullets = [];
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
  requestAnimationFrame(() => toastElement.classList.add("show"));
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

const rushActive = () => world.rushTimer > 0;

function addRushCharge(type) {
  if (rushActive()) {
    if (["kill", "elite", "bossPhase"].includes(type)) {
      world.rushChain += type === "elite" ? 3 : 1;
      world.rushBestChain = Math.max(world.rushBestChain, world.rushChain);
      world.rushTimer = Math.min(RUSH_CONFIG.maximumDuration, world.rushTimer + RUSH_CONFIG.killExtension * (type === "elite" ? 2 : 1));
      if (world.rushChain % 4 === 0) audio.sfx("rushHit");
    }
    return;
  }
  world.rushCharge = SpaceRush.addEventCharge(world.rushCharge, type, world.linked);
}

function startRush() {
  if (rushActive() || world.rushCooldown > 0) return;
  world.rushCharge = RUSH_CONFIG.threshold;
  world.rushTimer = RUSH_CONFIG.duration;
  world.rushChain = 0;
  world.rushCount += 1;
  world.rushPulseTimer = 0;
  world.enemyBullets = [];
  for (const player of world.players) {
    if (player.downed) continue;
    player.energy = Math.min(100, player.energy + 18 * player.energyGain);
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

function calculateRushBonus() {
  return Math.round(world.rushChain * 75 * (1 + world.stageIndex * .25) * (world.contract?.score || 1) * (world.activeBranch?.score || 1));
}

function finishRush() {
  const bonus = calculateRushBonus();
  world.score += bonus;
  world.rushLastBonus = bonus;
  world.rushTimer = 0;
  world.rushCharge = 0;
  world.rushCooldown = RUSH_CONFIG.cooldown;
  audio.sfx("rushEnd");
  showToast(t("toast.rushEnd", { chain: world.rushChain, score: bonus }));
}

function updateRush(dt) {
  world.rushCooldown = Math.max(0, world.rushCooldown - dt);
  if (rushActive()) {
    world.rushTimer -= dt;
    world.rushPulseTimer -= dt;
    if (world.rushPulseTimer <= 0 && world.players.length >= 2 && world.players.every((player) => !player.downed)) {
      world.rushPulseTimer = .16;
      const [p1, p2] = world.players;
      for (const bullet of world.enemyBullets) {
        if (!bullet.dead && pointToSegmentDistance(bullet.x, bullet.y, p1.x, p1.y, p2.x, p2.y) <= RUSH_CONFIG.bulletGuardRadius) {
          bullet.dead = true;
          burst(bullet.x, bullet.y, "#fff2a6", 3, 24);
        }
      }
    }
    if (world.rushTimer <= 0) finishRush();
    return;
  }
  const eligible = world.introTimer <= 0 && world.clearTimer <= 0 && !world.routeChoice;
  world.rushCharge = SpaceRush.advanceCharge(world.rushCharge, dt, world.linked, eligible);
  if (world.rushCharge >= RUSH_CONFIG.threshold && world.rushCooldown <= 0) startRush();
}

function aimedVelocity(source, speed, spread = 0) {
  const targets = world.players.filter((player) => !player.downed);
  const target = targets.length ? targets.reduce((best, player) => (distance(source, player) < distance(source, best) ? player : best)) : { x: W / 2, y: H };
  const angle = Math.atan2(target.y - source.y, target.x - source.x) + rand(-spread, spread);
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
}

function makeEnemy(type, x = rand(25, W - 25), y = -15, options = {}) {
  const stats = {
    scout: { hp: 3, r: 8, score: 120 },
    dart: { hp: 2, r: 7, score: 150 },
    tank: { hp: 11, r: 12, score: 350 },
    spinner: { hp: 6, r: 9, score: 240 },
    mine: { hp: 4, r: 8, score: 180 },
  }[type];
  const elite = Boolean(options.elite);
  const stage = activeStage();
  const progress = clamp(world.stageTime / stage.duration, 0, 1);
  const build = options.build || SpaceExpedition.assembleEnemy({
    stageIndex: world.stageIndex,
    progress,
    biome: stage.biome,
    branch: world.activeBranch,
    elite,
    random,
  });
  const branchHealth = world.stageIndex === 0 && progress < .4
    ? Math.min(1, world.activeBranch?.enemyHp || 1)
    : world.activeBranch?.enemyHp || 1;
  const contractHealth = (world.contract?.enemyHp || 1) * (stage.biome?.enemyHp || 1) * branchHealth;
  const maxHp = stats.hp * (elite ? 3.1 : 1) * contractHealth * build.hp;
  const enemy = {
    id: ++world.enemySerial,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    hp: maxHp,
    maxHp,
    r: stats.r * (elite ? 1.28 : 1) * build.scale,
    score: Math.round(stats.score * (elite ? 4 : 1) * build.score),
    age: 0,
    shootTimer: rand(1.6, 3),
    eliteTimer: elite ? 1.6 : 0,
    seed: rand(0, TAU),
    dead: false,
    boss: false,
    elite,
    hitFlash: 0,
    movementModule: build.movementId,
    movementNameKey: build.movementNameKey,
    weaponModule: build.weaponId,
    weaponNameKey: build.weaponNameKey,
    coreModule: build.coreId,
    coreNameKey: build.coreNameKey,
    buildSignature: build.signature,
    moduleScale: build.scale,
    moveSpeed: build.speed,
    moveSway: build.sway,
    moveDrift: build.drift,
    weaponBulletSpeed: build.bulletSpeed,
    weaponExtraShots: build.extraShots,
    weaponRingBonus: build.ringBonus,
    weaponCooldown: build.cooldown,
    weaponSpread: build.spread,
    moduleBarrier: build.barrier,
    moduleBarrierMax: build.barrier,
    volatileRadius: build.volatileRadius,
    moduleColor: world.activeBranch?.color || stage.biome?.secondary || stage.accent,
  };
  if (build.signature !== "standard.pulse.light" && !world.discoveredVariants.has(build.signature)) {
    world.discoveredVariants.add(build.signature);
    if (world.variantNoticeCooldown <= 0) {
      world.variantNotice = { enemy, timer: 2.8, total: 2.8 };
      world.variantNoticeCooldown = 3.5;
    }
  }
  return enemy;
}

function addFormationEnemy(type, x, y, options = {}) {
  const enemy = makeEnemy(type, x, y, options);
  if (Number.isFinite(options.vx)) enemy.vx = options.vx;
  if (Number.isFinite(options.shootDelay)) enemy.shootTimer = options.shootDelay;
  world.enemies.push(enemy);
  return enemy;
}

function spawnStageEvent(event) {
  const stage = world.stageIndex;
  if (event.pattern === "chevron") {
    [-2, -1, 0, 1, 2].forEach((column) => addFormationEnemy("scout", W / 2 + column * 39, -12 - Math.abs(column) * 13));
  } else if (event.pattern === "crossfire") {
    for (let row = 0; row < 2; row += 1) {
      addFormationEnemy("dart", -10, 48 + row * 42, { vx: 34, shootDelay: 2 + row * .35 });
      addFormationEnemy("dart", W + 10, 69 + row * 42, { vx: -34, shootDelay: 2.2 + row * .35 });
    }
  } else if (event.pattern === "convoy") {
    addFormationEnemy("tank", W / 2, -18, { shootDelay: 2.5 });
    addFormationEnemy("scout", W / 2 - 58, -34, { shootDelay: 2.1 });
    addFormationEnemy("scout", W / 2 + 58, -34, { shootDelay: 2.3 });
    addFormationEnemy("dart", W / 2 - 104, -55);
    addFormationEnemy("dart", W / 2 + 104, -55);
  } else if (event.pattern === "pinwheel") {
    [72, 184, 296, 408].forEach((x, index) => addFormationEnemy("spinner", x, -16 - (index % 2) * 25, { shootDelay: 1.7 + index * .2 }));
  } else if (event.pattern === "minefield") {
    [55, 145, 240, 335, 425].forEach((x, index) => addFormationEnemy("mine", x, -14 - (index % 2) * 30, { shootDelay: 2.1 + index * .14 }));
  } else if (event.pattern === "pincer") {
    for (let row = 0; row < 3; row += 1) {
      addFormationEnemy(row === 1 ? "spinner" : "dart", -12, 42 + row * 42, { vx: 38, shootDelay: 1.9 + row * .22 });
      addFormationEnemy(row === 1 ? "spinner" : "dart", W + 12, 61 + row * 42, { vx: -38, shootDelay: 2.05 + row * .22 });
    }
  } else if (event.pattern === "elite") {
    addFormationEnemy(event.eliteType, W / 2, -22, { elite: true, shootDelay: 1.4 });
    const guardType = stage === 0 ? "scout" : stage === 1 ? "dart" : "mine";
    addFormationEnemy(guardType, W / 2 - 68, -42, { shootDelay: 2.4 });
    addFormationEnemy(guardType, W / 2 + 68, -42, { shootDelay: 2.6 });
    audio.sfx("elite");
  }
  world.stageEvent = { ...event, timer: 3.1, total: 3.1 };
  world.spawnTimer = Math.max(world.spawnTimer, 1.8);
  world.flash = Math.max(world.flash, .18);
  world.shake = Math.max(world.shake, .14);
  showToast(t("toast.event", { route: stageText(activeStage(stage), "code"), event: eventText(event, "name") }));
}

function spawnEnemy() {
  const stage = activeStage();
  const progress = world.stageTime / stage.duration;
  const type = SpaceExpedition.chooseEnemyHull({ stageIndex: world.stageIndex, progress, biome: stage.biome, random });

  if (progress > 0.35 && random() < 0.08 + world.stageIndex * 0.035) {
    const side = random() < 0.5 ? -12 : W + 12;
    const enemy = makeEnemy(type, side, rand(45, 130));
    enemy.vx = side < 0 ? rand(25, 45) : rand(-45, -25);
    world.enemies.push(enemy);
  } else {
    world.enemies.push(makeEnemy(type));
  }
}

function spawnBoss() {
  if (world.activeEncounter) finishEncounter(false);
  const baseHealth = [340, 500, 700][world.stageIndex];
  const stage = activeStage();
  const health = (QA_FAST_MODE ? baseHealth * .14 : baseHealth) * (world.contract?.enemyHp || 1) * (stage.biome?.enemyHp || 1) * (world.activeBranch?.enemyHp || 1);
  for (const enemy of world.enemies) {
    if (!enemy.dead) burst(enemy.x, enemy.y, stage.accent, enemy.elite ? 18 : 6, 55);
  }
  world.enemies = [];
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
    r: [30, 34, 40][world.stageIndex],
    score: 5000 * (world.stageIndex + 1),
    age: 0,
    shootTimer: 1.5,
    secondaryTimer: 3.4,
    phaseLevel: 1,
    phaseShield: QA_FAST_MODE ? .45 : 2.2,
    hitFlash: 0,
    seed: 0,
    dead: false,
  };
  world.enemies.push(world.boss);
  world.bossSpawned = true;
  world.enemyBullets = [];
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
  world.enemyBullets = [];
  world.flash = Math.max(world.flash, .62);
  world.shake = Math.max(world.shake, .52);
  world.cinematic = { type: "phase", timer: 1.1, total: 1.1 };
  burst(boss.x, boss.y, activeStage().accent, 42, 120);
  addRushCharge("bossPhase");
  audio.sfx("bossPhase");
  showToast(`${t("hud.phaseTitle", { phase: nextPhase })} // ${bossPhaseText(world.stageIndex, nextPhase)}`);
}

function enemyBullet(x, y, vx, vy, color = "#ff7d8b", size = 3) {
  const stage = activeStage();
  const progress = world.stageTime / stage.duration;
  const branchSpeed = world.stageIndex === 0 && progress < .4
    ? Math.min(1, world.activeBranch?.bulletSpeed || 1)
    : world.activeBranch?.bulletSpeed || 1;
  const speedMultiplier = (world.contract?.bulletSpeed || 1) * (stage.biome?.bulletSpeed || 1) * branchSpeed;
  world.enemyBullets.push({ x, y, vx: vx * speedMultiplier, vy: vy * speedMultiplier, r: size, color, age: 0, dead: false });
}

function fireAimed(enemy, speed = 62, count = 1, spread = 0.12, color) {
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  const finalCount = count + (enemy.weaponExtraShots || 0);
  const finalSpread = spread * (enemy.weaponSpread || 1);
  for (let i = 0; i < finalCount; i += 1) {
    const offset = (i - (finalCount - 1) / 2) * finalSpread;
    const velocity = aimedVelocity(enemy, finalSpeed);
    const angle = Math.atan2(velocity.vy, velocity.vx) + offset;
    enemyBullet(enemy.x, enemy.y + enemy.r * 0.5, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, color);
  }
  const sound = enemy.weaponModule === "twin" ? "enemyTwin" : enemy.weaponModule === "sniper" ? "enemySniper" : "enemyShoot";
  audio.sfx(sound);
}

function fireRing(enemy, count, speed, phase = 0, color = "#ff6b8c") {
  const finalSpeed = speed * (enemy.weaponBulletSpeed || 1);
  const finalCount = count + (enemy.weaponRingBonus || 0);
  for (let i = 0; i < finalCount; i += 1) {
    const angle = phase + (i / finalCount) * TAU;
    enemyBullet(enemy.x, enemy.y, Math.cos(angle) * finalSpeed, Math.sin(angle) * finalSpeed, color, 2.5);
  }
  audio.sfx(enemy.weaponModule === "orbit" ? "enemyOrbit" : "enemyShoot");
}

function updateEnemy(enemy, dt) {
  enemy.age += dt;
  enemy.shootTimer -= dt;
  enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt);
  const canFire = world.stageTime > 6;

  if (enemy.boss) {
    updateBoss(enemy, dt);
    return;
  }

  if (enemy.elite) {
    enemy.eliteTimer -= dt;
    if (enemy.y < 58) enemy.y += 22 * (enemy.moveSpeed || 1) * dt;
    else {
      enemy.y = lerp(enemy.y, 58, 1 - Math.exp(-dt * 3));
      enemy.x += Math.sin(enemy.age * 1.15 + enemy.seed) * 20 * (enemy.moveSway || 1) * dt;
    }
    if (canFire && enemy.eliteTimer <= 0 && enemy.y > 28) {
      fireRing(enemy, 6 + world.stageIndex * 2, 27 + world.stageIndex * 3, enemy.age * .32, activeStage().accent);
      fireAimed(enemy, 38 + world.stageIndex * 3, 2, .2, "#fff0a0");
      enemy.eliteTimer = Math.max(1.65, 2.6 - world.stageIndex * .22) * (enemy.weaponCooldown || 1);
    }
    return;
  }

  enemy.x += enemy.vx * dt;
  enemy.x += Math.sin(enemy.age * .85 + enemy.seed) * (enemy.moveDrift || 0) * dt;

  if (enemy.type === "scout") {
    enemy.y += (29 + world.stageIndex * 5) * (enemy.moveSpeed || 1) * dt;
    enemy.x += Math.sin(enemy.age * 3 + enemy.seed) * 18 * (enemy.moveSway || 1) * dt;
    if (canFire && enemy.shootTimer <= 0 && enemy.y > 20) {
      fireAimed(enemy, 34 + world.stageIndex * 5, 1, 0, "#ff8aa3");
      enemy.shootTimer = rand(2.5, 3.6) * (enemy.weaponCooldown || 1);
    }
  } else if (enemy.type === "dart") {
    enemy.y += (48 + world.stageIndex * 6) * (enemy.moveSpeed || 1) * dt;
    enemy.x += Math.sin(enemy.age * 6 + enemy.seed) * 55 * (enemy.moveSway || 1) * dt;
    if (canFire && enemy.shootTimer <= 0 && enemy.y > 30) {
      fireAimed(enemy, 43, world.stageIndex === 0 ? 1 : 2, 0.13, "#f8ca62");
      enemy.shootTimer = rand(2.7, 3.8) * (enemy.weaponCooldown || 1);
    }
  } else if (enemy.type === "tank") {
    if (enemy.y < 52) enemy.y += 22 * (enemy.moveSpeed || 1) * dt;
    else enemy.x += Math.sin(enemy.age * 1.1 + enemy.seed) * 15 * (enemy.moveSway || 1) * dt;
    if (canFire && enemy.shootTimer <= 0 && enemy.y > 20) {
      fireAimed(enemy, 38, 2 + world.stageIndex, 0.17, "#ff6f63");
      enemy.shootTimer = rand(2.5, 3.2) * (enemy.weaponCooldown || 1);
    }
  } else if (enemy.type === "spinner") {
    enemy.y += 25 * (enemy.moveSpeed || 1) * dt;
    enemy.x += Math.cos(enemy.age * 2.7 + enemy.seed) * 30 * (enemy.moveSway || 1) * dt;
    if (canFire && enemy.shootTimer <= 0 && enemy.y > 25) {
      fireRing(enemy, 5 + world.stageIndex * 2, 29 + world.stageIndex * 4, enemy.age, "#a88bff");
      enemy.shootTimer = 3.2 * (enemy.weaponCooldown || 1);
    }
  } else if (enemy.type === "mine") {
    enemy.y += 17 * (enemy.moveSpeed || 1) * dt;
    enemy.x += Math.sin(enemy.age + enemy.seed) * 9 * (enemy.moveSway || 1) * dt;
    if (canFire && enemy.shootTimer <= 0 && enemy.y > 30) {
      fireRing(enemy, 7, 27, enemy.age * 0.4, "#ff5470");
      enemy.shootTimer = 3 * (enemy.weaponCooldown || 1);
    }
  }

  if (enemy.y > H + 24 || enemy.x < -40 || enemy.x > W + 40) enemy.dead = true;
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

  if (boss.shootTimer <= 0) {
    if (stage === 0) {
      fireRing(boss, phase > 0.5 ? 12 : 9, 34 + phase * 10, boss.age * 0.45, "#ff72ac");
      fireAimed(boss, 43, 2, 0.18, "#ffd166");
      boss.shootTimer = phase > 0.65 ? 1.2 : 1.65;
    } else if (stage === 1) {
      for (let i = -2; i <= 2; i += 1) enemyBullet(boss.x + i * 10, boss.y + 14, i * 5, 39 + Math.abs(i) * 2, "#7fffe2", 2.5);
      if (phase > 0.35) fireAimed(boss, 48, 3, 0.15, "#ffe16c");
      boss.shootTimer = phase > 0.7 ? 1.05 : 1.4;
    } else {
      fireRing(boss, phase > 0.55 ? 16 : 12, 33 + phase * 14, -boss.age * 0.55, "#c183ff");
      fireRing(boss, 7, 46, boss.age * 0.3, "#ff4f70");
      boss.shootTimer = phase > 0.7 ? .92 : 1.25;
    }
  }

  if (boss.secondaryTimer <= 0) {
    if (stage === 0) {
      for (let i = 0; i < 2; i += 1) world.enemies.push(makeEnemy("dart", boss.x + (i ? 22 : -22), boss.y + 20));
    } else if (stage === 1) {
      for (let i = 0; i < 2; i += 1) world.enemies.push(makeEnemy("spinner", boss.x + (i ? 30 : -30), boss.y + 15));
      world.shake = 0.25;
    } else {
      for (let i = 0; i < 3; i += 1) world.enemies.push(makeEnemy(i % 2 ? "mine" : "dart", rand(30, W - 30), -10));
    }
    boss.secondaryTimer = Math.max(3, 5.4 - phase * 1.2 - stage * 0.3);
  }
}

function playerShoot(player) {
  const config = PLAYER_CONFIG[player.index];
  const rush = SpaceRush.combatMultipliers(rushActive());
  const patterns = [
    [{ x: 0, vx: 0, damage: 1.25 }],
    [{ x: -3, vx: -5, damage: 1.15 }, { x: 3, vx: 5, damage: 1.15 }],
    [{ x: -5, vx: -14, damage: 1.1 }, { x: 0, vx: 0, damage: 1.4 }, { x: 5, vx: 14, damage: 1.1 }],
    [{ x: -7, vx: -22, damage: 1.1 }, { x: -3, vx: -7, damage: 1.2 }, { x: 3, vx: 7, damage: 1.2 }, { x: 7, vx: 22, damage: 1.1 }],
  ];

  const addShot = (shot, damageScale = 1) => {
    world.bullets.push({
      x: player.x + shot.x,
      y: player.y - 9,
      vx: shot.vx,
      vy: -player.projectileSpeed,
      r: 2,
      damage: shot.damage * player.damage * damageScale * rush.damage * (world.activeBranch?.reward.damage || 1),
      owner: player.index,
      color: config.color,
      pierceLeft: player.pierce,
      hitIds: [],
      dead: false,
    });
  };

  patterns[player.weapon - 1].forEach((shot) => {
    addShot(shot);
  });
  if (player.droneLevel > 0 && player.shots % 3 === 2) {
    const offset = 11 + player.droneLevel * 3;
    const spread = 25 + player.droneLevel * 5;
    addShot({ x: -offset, vx: -spread, damage: .72 }, 1 + (player.droneLevel - 1) * .16);
    addShot({ x: offset, vx: spread, damage: .72 }, 1 + (player.droneLevel - 1) * .16);
  }
  player.fireTimer = Math.max(0.065, (0.2 - player.weapon * 0.016) / (player.fireRate * rush.fireRate));
  player.shots += 1;
  audio.sfx("shoot", player.index);
}

function damageEnemy(enemy, amount) {
  if (amount <= 0 || enemy.dead || (enemy.boss && enemy.phaseShield > 0)) return { hull: 0, barrier: 0, broken: false };
  let remaining = amount;
  let barrierDamage = 0;
  let broken = false;
  if ((enemy.moduleBarrier || 0) > 0) {
    barrierDamage = Math.min(enemy.moduleBarrier, remaining);
    enemy.moduleBarrier -= barrierDamage;
    remaining -= barrierDamage;
    broken = enemy.moduleBarrier <= 0;
    enemy.hitFlash = .11;
    burst(enemy.x, enemy.y, enemy.moduleColor || "#9be9ff", broken ? 12 : 4, broken ? 58 : 28);
    if (broken) audio.sfx("barrierBreak");
  }
  if (remaining > 0) {
    enemy.hp -= remaining;
    enemy.hitFlash = .075;
  }
  return { hull: remaining, barrier: barrierDamage, broken };
}

function useNova(player) {
  player.energy = 0;
  world.enemyBullets.forEach((bullet) => {
    bullet.dead = true;
    burst(bullet.x, bullet.y, PLAYER_CONFIG[player.index].color, 2, 16);
  });
  world.enemies.forEach((enemy) => {
    const damage = damageEnemy(enemy, (enemy.boss ? 42 : 55) * player.novaDamage);
    if (damage.hull <= 0 && damage.barrier <= 0) enemy.hitFlash = .1;
    if (enemy.hp <= 0) killEnemy(enemy, player.index);
  });
  for (let i = 0; i < 64; i += 1) {
    const angle = (i / 64) * TAU;
    world.particles.push({
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * visualRand(90, 190),
      vy: Math.sin(angle) * visualRand(90, 190),
      life: 0.65,
      maxLife: 0.65,
      color: PLAYER_CONFIG[player.index].color,
      size: i % 3 ? 1 : 2,
    });
  }
  world.flash = 0.45;
  world.shake = 0.45;
  audio.sfx("nova");
  pulseGamepad(player.index, 260, 0.75, 0.45);
  showToast(t("toast.nova", { player: player.index + 1 }));
}

function damagePlayer(player) {
  if (player.invulnerability > 0 || player.downed) return false;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invulnerability = 0.45;
    player.shieldRegenTimer = player.shieldRegenInterval || Number.POSITIVE_INFINITY;
    burst(player.x, player.y, "#9be9ff", 8, 45);
    audio.sfx("shield");
    pulseGamepad(player.index, 80, 0.16, 0.34);
    return true;
  }

  player.hp -= 1;
  player.invulnerability = player.hitInvulnerability;
  player.shieldRegenTimer = player.shieldRegenInterval || Number.POSITIVE_INFINITY;
  world.shake = 0.3;
  burst(player.x, player.y, PLAYER_CONFIG[player.index].color, 13, 70);
  audio.sfx("hurt");
  pulseGamepad(player.index, 150, 0.62, 0.35);

  if (player.hp <= 0) {
    player.downed = true;
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
  player.hp = Math.min(player.maxHp, player.reviveHp);
  player.invulnerability = 2.5;
  player.shield = 1;
  player.downTimer = 0;
  player.revive = 0;
  burst(player.x, player.y, PLAYER_CONFIG[player.index].light, 28, 90);
  addRushCharge("rescue");
  audio.sfx("revive");
  showToast(t("toast.revived", { player: player.index + 1 }));
}

function updatePlayers(dt) {
  for (const player of world.players) {
    const controls = input.player(player.index);
    player.controls = controls;
    player.invulnerability = Math.max(0, player.invulnerability - dt);
    player.fireTimer -= dt;

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

    const speed = player.speed;
    player.vx = lerp(player.vx, controls.x * speed, 1 - Math.exp(-dt * player.handling));
    player.vy = lerp(player.vy, controls.y * speed, 1 - Math.exp(-dt * player.handling));
    player.x = clamp(player.x + player.vx * dt, 13, W - 13);
    player.y = clamp(player.y + player.vy * dt, 32, H - 14);

    if (player.fireTimer <= 0) playerShoot(player);
    if (player.energy >= 100) useNova(player);
  }

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
    const rush = SpaceRush.combatMultipliers(rushActive());
    world.beamTimer -= dt;
    if (world.beamTimer <= 0) {
      world.beamTimer = 0.12 / rush.linkRate;
      for (const enemy of world.enemies) {
        if (!enemy.dead && pointToSegmentDistance(enemy.x, enemy.y, p1.x, p1.y, p2.x, p2.y) < enemy.r + 3) {
          damageEnemy(enemy, 1.2 * rush.linkDamage * ((p1.beamDamage + p2.beamDamage) * .5));
          p1.energy = clamp(p1.energy + 0.45 * p1.energyGain, 0, 100);
          p2.energy = clamp(p2.energy + 0.45 * p2.energyGain, 0, 100);
          if (enemy.hp <= 0) killEnemy(enemy, 0);
        }
      }
    }
  }
  world.linked = linked;
}

function killEnemy(enemy, owner = 0) {
  if (enemy.dead) return;
  enemy.dead = true;
  world.kills += 1;
  world.combo = world.comboTimer > 0 ? world.combo + 1 : 1;
  world.comboTimer = 2.4;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  const multiplier = 1 + Math.floor(world.combo / 8) * 0.5;
  const rush = SpaceRush.combatMultipliers(rushActive());
  world.score += Math.round(enemy.score * multiplier * rush.score * (world.contract?.score || 1) * (world.activeBranch?.score || 1));
  const player = world.players[owner];
  if (player) player.energy = clamp(player.energy + (enemy.boss ? 35 : 4.5) * player.energyGain, 0, 100);
  burst(enemy.x, enemy.y, enemy.boss ? "#fff2a6" : activeStage().accent, enemy.boss ? 80 : 12, enemy.boss ? 150 : 65);
  addRushCharge("kill");
  if (enemy.elite) addRushCharge("elite");

  if (!enemy.boss && player?.chainDamage > 0 && !world.chainResolving) {
    const chainLevel = upgradeLevel("chain");
    const radius = 52 + Math.max(0, chainLevel - 1) * 12;
    const targets = world.enemies
      .filter((target) => !target.dead && target !== enemy && distance(enemy, target) <= radius)
      .sort((a, b) => distance(enemy, a) - distance(enemy, b))
      .slice(0, 2 + chainLevel);
    world.chainResolving = true;
    try {
      for (const target of targets) {
        damageEnemy(target, player.chainDamage);
        burst(target.x, target.y, "#b6f7ff", 5, 42);
        if (target.hp <= 0) killEnemy(target, owner);
      }
    } finally {
      world.chainResolving = false;
    }
  }

  if (!enemy.boss && enemy.volatileRadius > 0 && !world.volatileResolving) {
    world.volatileResolving = true;
    try {
      burst(enemy.x, enemy.y, enemy.moduleColor || activeStage().accent, 24, 105);
      audio.sfx("volatile");
      world.shake = Math.max(world.shake, .24);
      const blastDamage = 7 + world.stageIndex * 2;
      for (const target of world.enemies) {
        if (target.dead || target === enemy || distance(enemy, target) > enemy.volatileRadius) continue;
        damageEnemy(target, blastDamage);
        if (target.hp <= 0) killEnemy(target, owner);
      }
    } finally {
      world.volatileResolving = false;
    }
  }

  if (enemy.boss) {
    handleBossDefeat(enemy);
  } else {
    audio.sfx(Math.random() < 0.28 ? "explode" : "hit");
    const dropChance = enemy.elite ? 1 : enemy.type === "tank" ? 0.32 : 0.105;
    if (random() < dropChance) spawnPickup(enemy.x, enemy.y);
    if (enemy.elite) {
      spawnPickup(enemy.x + 12, enemy.y - 4);
      world.flash = Math.max(world.flash, .38);
      world.shake = Math.max(world.shake, .42);
      showToast(t("toast.elite", { event: world.stageEvent ? eventText(world.stageEvent, "name") : t("toast.routeThreatClear") }));
    }
  }
}

function spawnPickup(x, y) {
  const roll = random();
  const type = roll < 0.42 ? "weapon" : roll < 0.67 ? "repair" : roll < 0.84 ? "shield" : "energy";
  world.pickups.push({ x, y, type, age: 0, vy: 24, r: 7, dead: false });
}

function applyPickup(player, pickup) {
  if (pickup.type === "weapon") player.weapon = Math.min(4, player.weapon + 1);
  else if (pickup.type === "repair") player.hp = Math.min(player.maxHp, player.hp + 2);
  else if (pickup.type === "shield") player.shield = Math.min(player.maxShield, player.shield + 2);
  else player.energy = Math.min(100, player.energy + 40 * player.energyGain);
  pickup.dead = true;
  addRushCharge("pickup");
  burst(pickup.x, pickup.y, PLAYER_CONFIG[player.index].light, 15, 65);
  audio.sfx("pickup");
  pulseGamepad(player.index, 75, 0.08, 0.28);
  showToast(t("toast.pickup", { player: player.index + 1, pickup: t(`pickup.${pickup.type}`) }));
}

function handleBossDefeat() {
  world.score += Math.round(2500 * (world.stageIndex + 1) * (world.contract?.score || 1) * (world.activeBranch?.score || 1));
  world.clearTimer = QA_FAST_MODE ? 1.1 : 4.2;
  world.enemyBullets = [];
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
  world.pickups = [];
  for (const player of world.players) {
    if (player.downed) {
      player.downed = false;
      player.downTimer = 0;
      player.revive = 0;
      player.hp = Math.max(1, player.hp);
    }
    player.hp = Math.min(player.maxHp, player.hp + 2 + player.stageRepair);
    player.weapon = Math.max(1 + player.weaponFloor, player.weapon - 1);
    player.invulnerability = 2;
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
      player.energy = Math.min(100, player.energy + (reward.energy || 0));
      player.weapon = Math.min(4, player.weapon + (reward.weapon || 0));
      player.hp = Math.min(player.maxHp, player.hp + (reward.repair || 0));
      player.shield = Math.min(player.maxShield, player.shield + (reward.shield || 0));
    }
    world.score += Math.round((reward.score || 0) * (world.contract?.score || 1) * (world.activeBranch?.score || 1));
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
  const stage = activeStage();
  if (world.clearTimer > 0) {
    world.clearTimer -= dt;
    if (world.clearTimer <= 0) {
      if (world.stageIndex < STAGES.length - 1) beginUpgradeDraft();
      else advanceStage();
    }
    return;
  }
  if (world.introTimer > 0) {
    world.introTimer -= dt;
    return;
  }
  if (world.bossSpawned) return;

  world.stageTime += dt * (QA_FAST_MODE ? 6 : 1);
  world.spawnTimer -= dt;
  const nextEncounter = world.encounterPlans[world.stageIndex]?.[world.encounterIndex];
  if (!world.activeEncounter && nextEncounter && world.stageTime >= nextEncounter.at * stage.duration) {
    startEncounter(nextEncounter);
    world.encounterIndex += 1;
  }
  const nextEvent = STAGE_EVENTS[world.stageIndex][world.eventIndex];
  if (nextEvent && world.stageTime >= nextEvent.at) {
    spawnStageEvent(nextEvent);
    world.eventIndex += 1;
  }
  if (world.spawnTimer <= 0) {
    const progress = world.stageTime / stage.duration;
    const enemyCap = 6 + world.stageIndex * 2 + Math.floor(progress * 2);
    const activeEnemies = world.enemies.filter((enemy) => !enemy.boss).length;
    if (activeEnemies < enemyCap) {
      spawnEnemy();
      if (progress > 0.72 && random() < 0.08 + world.stageIndex * 0.03) {
        world.enemies.push(makeEnemy(choose(["scout", "dart"])));
      }
    }
    const ecologyRate = stage.biome?.spawnRate || 1;
    const routeRate = world.stageIndex === 0 && progress < .4
      ? Math.min(1, world.activeBranch?.spawnRate || 1)
      : world.activeBranch?.spawnRate || 1;
    const encounterRate = world.stageIndex === 0 && progress < .4
      ? Math.min(1, world.activeEncounter?.spawnRate || 1)
      : world.activeEncounter?.spawnRate || 1;
    world.spawnTimer = Math.max(0.62, (1.72 - world.stageIndex * 0.13 - progress * 0.55) / ((world.contract?.spawnRate || 1) * ecologyRate * routeRate * encounterRate));
  }
  if (world.stageTime >= stage.duration) spawnBoss();
}

function updateObjects(dt) {
  for (const bullet of world.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.y < -12 || bullet.x < -12 || bullet.x > W + 12) bullet.dead = true;
  }

  for (const bullet of world.enemyBullets) {
    bullet.age += dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (bullet.y < -25 || bullet.y > H + 25 || bullet.x < -25 || bullet.x > W + 25 || bullet.age > 10) bullet.dead = true;
  }

  for (const enemy of world.enemies) updateEnemy(enemy, dt);
  for (const pickup of world.pickups) {
    pickup.age += dt;
    pickup.y += pickup.vy * dt;
    const rushMagnet = SpaceRush.combatMultipliers(rushActive()).pickupMagnet;
    const magnetTarget = world.players
      .filter((player) => !player.downed && player.pickupMagnetRadius + rushMagnet > 0)
      .map((player) => ({ player, range: distance(pickup, player), radius: player.pickupMagnetRadius + rushMagnet }))
      .filter(({ range, radius }) => range <= radius)
      .sort((a, b) => a.range - b.range)[0];
    if (magnetTarget) {
      const dx = magnetTarget.player.x - pickup.x;
      const dy = magnetTarget.player.y - pickup.y;
      const range = Math.max(1, magnetTarget.range);
      const pull = 70 + 145 * (1 - range / magnetTarget.radius);
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
        const damage = damageEnemy(enemy, bullet.damage);
        bullet.hitIds?.push(enemy.id);
        if (damage.barrier > 0) bullet.dead = true;
        else if (bullet.pierceLeft > 0) bullet.pierceLeft -= 1;
        else bullet.dead = true;
        if (enemy.boss) world.shake = Math.max(world.shake, .035);
        const owner = world.players[bullet.owner];
        owner.energy = clamp(owner.energy + 0.28 * owner.energyGain, 0, 100);
        burst(bullet.x, bullet.y, bullet.color, 2, 20);
        if (enemy.hp <= 0) killEnemy(enemy, bullet.owner);
        break;
      }
    }
  }

  for (const bullet of world.enemyBullets) {
    if (bullet.dead) continue;
    for (const player of world.players) {
      if (player.downed) continue;
      const hitRadius = Math.max(3, bullet.r + player.r - 2.5);
      if ((bullet.x - player.x) ** 2 + (bullet.y - player.y) ** 2 < hitRadius ** 2) {
        bullet.dead = true;
        damagePlayer(player);
        break;
      }
    }
  }

  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    for (const player of world.players) {
      if (player.downed) continue;
      const hitRadius = enemy.r + player.r - 4;
      if ((enemy.x - player.x) ** 2 + (enemy.y - player.y) ** 2 < hitRadius ** 2) {
        damagePlayer(player);
        if (!enemy.boss) {
          damageEnemy(enemy, 8);
          if (enemy.hp <= 0) killEnemy(enemy, player.index);
        }
      }
    }
  }

  for (const pickup of world.pickups) {
    if (pickup.dead) continue;
    for (const player of world.players) {
      if (!player.downed && distance(pickup, player) < pickup.r + player.r + 2) {
        applyPickup(player, pickup);
        break;
      }
    }
  }

  for (const object of world.encounterObjects) {
    if (object.dead) continue;
    for (const player of world.players) {
      if (player.downed || distance(object, player) >= object.r + player.r + 2) continue;
      if (object.type === "salvage" && world.activeEncounter?.kind === "collect") {
        object.dead = true;
        world.activeEncounter.progress = Math.min(world.activeEncounter.goal, world.activeEncounter.progress + 1);
        player.energy = Math.min(100, player.energy + 5 * player.energyGain);
        burst(object.x, object.y, object.color, 12, 58);
        audio.sfx("encounterTick");
        pulseGamepad(player.index, 65, .08, .22);
      } else if (object.type === "meteor") {
        object.dead = true;
        if (damagePlayer(player) && world.activeEncounter?.kind === "survive") world.activeEncounter.hits += 1;
        burst(object.x, object.y, object.color, 20, 88);
        world.shake = Math.max(world.shake, .3);
        audio.sfx("encounterImpact");
      }
      break;
    }
  }

  world.bullets = world.bullets.filter((bullet) => !bullet.dead);
  world.enemyBullets = world.enemyBullets.filter((bullet) => !bullet.dead);
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
  if (world.routeChoice) {
    world.shake = Math.max(0, world.shake - dt * 2.2);
    world.flash = Math.max(0, world.flash - dt * 2.7);
    updateStars(dt, true);
    updateRouteChoice(dt);
    input.endFrame();
    return;
  }
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
  updatePlayers(dt);
  if (world.mode !== "playing") {
    input.endFrame();
    return;
  }
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
  if (rushActive()) {
    const bonus = calculateRushBonus();
    world.score += bonus;
    world.rushLastBonus = bonus;
    world.rushTimer = 0;
    world.rushCharge = 0;
  }
  world.mode = "ended";
  upgradePanel.hidden = true;
  world.enemyBullets = [];
  world.enemies = [];
  world.activeEncounter = null;
  world.encounterObjects = [];
  world.boss = null;
  const previousHighScore = profile.highScore;
  const runSeconds = world.runStartedAt ? Math.max(0, Math.round((performance.now() - world.runStartedAt) / 1000)) : 0;
  if (!QA_FAST_MODE) {
    const baseReward = Math.max(20, Math.floor(world.score / 300) + world.kills * 2 + (world.stageIndex + 1) * 25 + (victory ? 150 : 0));
    world.stardustReward = Math.round(baseReward * (world.contract?.stardust || 1));
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
  } else {
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
  drawBar(9, 14, 65, p1.hp / p1.maxHp, PLAYER_CONFIG[0].color);
  drawBar(78, 14, 48, p1.energy / 100, "#c691ff");
  pixelText(`W${p1.weapon}`, 130, 18, "#8585a4", "left", 6);

  pixelText(world.gameMode === "solo" ? "AI" : "P2", W - 9, 10, PLAYER_CONFIG[1].color, "right", 7);
  pixelText(String(world.score).padStart(6, "0"), W - 27, 10, "#f7f4df", "right", 7);
  drawBar(W - 74, 14, 65, p2.hp / p2.maxHp, PLAYER_CONFIG[1].color, true);
  drawBar(W - 126, 14, 48, p2.energy / 100, "#c691ff", true);
  pixelText(`W${p2.weapon}`, W - 130, 18, "#8585a4", "right", 6);

  pixelText(`${stageText(stage, "code")} // ${biomeText(stage.biome, "name")}`, W / 2, 10, "#d6d4e4", "center", 6);
  const progress = world.bossSpawned ? 1 : world.stageTime / stage.duration;
  drawBar(W / 2 - 46, 15, 92, progress, stage.accent);
  const routeStatus = world.activeBranch
    ? `${pathText(world.activeBranch, "name")} ×${world.activeBranch.score.toFixed(2)}`
    : t("hud.pathPending");
  pixelText(routeStatus, W / 2, 24, world.activeBranch?.color || "#85849e", "center", 5);

  if (world.combo > 1) {
    const scale = Math.min(2, 1 + world.combo * 0.02);
    pixelText(t("hud.combo", { combo: world.combo }), W - 9, 43, world.combo > 20 ? "#ffe27a" : "#ffffff", "right", 7 * scale);
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

  if (world.boss) {
    pixelText(stageText(stage, "boss"), W / 2, 34, stage.accent, "center", 7);
    drawBar(W / 2 - 82, 38, 164, world.boss.hp / world.boss.maxHp, stage.accent);
    const phaseLabel = t(world.boss.phaseShield > 0 ? "hud.coreShift" : "hud.phase", { phase: world.boss.phaseLevel });
    pixelText(phaseLabel, W / 2, 48, world.boss.phaseShield > 0 ? "#ffffff" : "#85849e", "center", 5.5);
  }

  for (const player of world.players) {
    if (!player.downed && player.energy >= 100) {
      const x = player.index === 0 ? 9 : W - 9;
      pixelText(t("hud.skillReady"), x, 34, PLAYER_CONFIG[player.index].light, player.index === 0 ? "left" : "right", 6);
    }
  }
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
  pixelText(t("hud.encounter", { current: world.encounterIndex, total: 2 }), x + 9, y + 9, encounter.color, "left", 5);
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
  const moduleNames = [enemy.movementNameKey, enemy.weaponNameKey, enemy.coreNameKey].map((key) => t(key)).join(" // ");
  const width = 218;
  const x = W / 2 - width / 2;
  const y = 57;
  ctx.save();
  ctx.globalAlpha = reveal;
  ctx.fillStyle = "rgba(5, 6, 18, .88)";
  ctx.fillRect(x, y, width, 30);
  ctx.fillStyle = enemy.moduleColor || activeStage().accent;
  ctx.fillRect(x, y, 3, 30);
  pixelText(t("hud.enemyScan"), W / 2, y + 10, enemy.moduleColor || activeStage().accent, "center", 5.5);
  pixelText(moduleNames, W / 2, y + 22, "#ffffff", "center", 7);
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
  pixelText(t("hud.pathActive", { path: pathText(world.activeBranch, "name") }), W / 2, 155, world.activeBranch.color, "center", 6);
  pixelText(t("hud.pathRewardLine", { reward: pathText(world.activeBranch, "reward"), score: world.activeBranch.score.toFixed(2) }), W / 2, 168, "#ffe56d", "center", 5);
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

  canvas.dataset.mode = world.mode;
  canvas.dataset.language = SpaceI18n.language;
  canvas.dataset.stage = String(world.stageIndex + 1);
  canvas.dataset.stageTime = world.stageTime.toFixed(2);
  canvas.dataset.events = String(world.eventIndex);
  canvas.dataset.enemies = String(world.enemies.length);
  canvas.dataset.bossPhase = world.boss ? String(world.boss.phaseLevel) : "0";
  canvas.dataset.playerHp = world.players.map((player) => player.hp).join(",");
  canvas.dataset.playerShield = world.players.map((player) => player.shield).join(",");
  canvas.dataset.playerSpeed = world.players.map((player) => player.speed).join(",");
  canvas.dataset.playerFireRate = world.players.map((player) => player.fireRate).join(",");
  canvas.dataset.playerDamage = world.players.map((player) => player.damage.toFixed(3)).join(",");
  canvas.dataset.playerEnergyGain = world.players.map((player) => player.energyGain.toFixed(3)).join(",");
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
  canvas.dataset.runSeed = String(world.runSeed);
  canvas.dataset.upgradeCount = String(world.upgradeHistory.length);
  canvas.dataset.upgrades = [...new Set(world.upgradeHistory)].map((id) => `${id}:${upgradeLevel(id)}`).join(",");
  canvas.dataset.draftOptions = world.draftOptions.map((upgrade) => upgrade.id).join(",");
  canvas.dataset.routeSignature = world.routeSignature;
  canvas.dataset.biome = activeStage().biome?.id || "";
  canvas.dataset.enemyVariants = String(world.discoveredVariants.size);
  canvas.dataset.activeBuilds = [...new Set(world.enemies.filter((enemy) => !enemy.boss).map((enemy) => enemy.buildSignature))].filter(Boolean).join(",");
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
  canvas.dataset.rushCharge = world.rushCharge.toFixed(2);
  canvas.dataset.rushActive = String(rushActive());
  canvas.dataset.rushTimer = world.rushTimer.toFixed(2);
  canvas.dataset.rushChain = String(world.rushChain);
  canvas.dataset.rushBestChain = String(world.rushBestChain);
  canvas.dataset.rushCount = String(world.rushCount);
  canvas.dataset.rushLastBonus = String(world.rushLastBonus);
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
