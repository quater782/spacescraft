// Scene art has one source of truth. Gameplay biome modifiers and UI signal colors
// stay in expedition.js; the renderer resolves scenery exclusively by stable ID.
const freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const SCENE_SETTINGS = freeze({
  background: "#030510", fog: .0105,
  camera: { fov: 55, near: .1, far: 96, eye: [0, 9.2, 12.8], target: [0, -.1, -3.8], follow: .08, shake: .14 },
  post: { exposure: .9, bloom: .3, radius: .1, threshold: 1.03, maxDpr: 1.25 },
  lights: {
    ambient: ["#dce8ff", .16], sky: ["#c8dcf2", "#29183d", .64],
    key: ["#e5eff5", 1.08], keyPosition: [-7, 12, 8],
    rim: { intensity: 1.12, range: 28, position: [0, 4, -8], anomalyBoost: .16 },
    player: { colors: ["#66f6e5", "#ff8a70"], intensity: .24, range: 3.2 },
  },
  stars: [
    { count: 360, size: .055, seed: 90210, parallax: 1, speed: .46, offset: 0 },
    { count: 210, size: .085, seed: 37191, parallax: .72, speed: .28, offset: -12 },
    { count: 96, size: .13, seed: 72031, parallax: .42, speed: .12, offset: -18 },
  ],
  nebula: [
    { count: 118, size: 6.2, seed: 44127, opacity: .12, speed: .045, span: 10 },
    { count: 76, size: 8.4, seed: 77321, opacity: .075, speed: .028, span: 12 },
  ],
  atmosphere: { drift: 2.3, breathe: .12, period: 24, tilt: .026 },
  threatColors: ["#68f4df", "#76dbff", "#ffe16c", "#ff936b", "#ff67d4"],
  transition: { particleCount: 18, duration: 1.45 },
});

export const SCENE_QUALITY = freeze({
  low: { maxDpr: 1, resolution: .72, stars: .65, nebula: .6 },
  balanced: { maxDpr: 1, resolution: 1, stars: .85, nebula: .85 },
  high: { maxDpr: 1.5, resolution: 1, stars: 1, nebula: 1 },
});
export const qualitySettings = (quality) => SCENE_QUALITY[quality] || SCENE_QUALITY.high;

// [ID, sky, accent, secondary, star, macro anchor]
const definitions = [
  ["sugarBloom", "#090a20", "#bf809c", "#c99e63", "#dcb6cd", [-21, -.8, -25]],
  ["crystalOrchard", "#0b0b24", "#a18abb", "#79bfae", "#c2b6df", [20, -1.5, -27]],
  ["cometTide", "#061322", "#719fbd", "#bb88a5", "#b0d6e9", [-14.2, 2.6, -23]],
  ["auroraFoundry", "#061820", "#6fb6a8", "#c6ac62", "#b0d9cc", [20.5, -1.4, -25]],
  ["thunderWorks", "#0c1220", "#bba465", "#739dbd", "#dfcba1", [-21, -1.5, -27]],
  ["cloudReef", "#081b2c", "#72a5b6", "#c09773", "#b4d2da", [14, 1, -24]],
  ["eclipseCarnival", "#0e0719", "#b77185", "#997eaf", "#d9a5ba", [0, -.8, -28]],
  ["prismGrave", "#0c0a20", "#9d7dba", "#70b1a7", "#c6b4da", [-21, -2, -26]],
  ["voidGarden", "#061318", "#69ad8b", "#af718b", "#afcfbe", [21, -1.2, -27]],
];
export const BIOME_SCENES = freeze(Object.fromEntries(definitions.map(([id, sky, accent, secondary, star, anchor], index) => {
  const hero = ["ark", "crystal", "planet", "station", "coil", "planet", "eclipse", "monument", "rift"][index];
  const heroSide = anchor[0] < 0 ? -1 : 1;
  return [id, {
    id, index, sky, accent, secondary, star, anchor, hero, heroScale: 1.55,
    motion: {
      period: [7, 9, 14, 8, 8, 16, 12, 9, 11][index],
      rotation: [0, 0, .055, .065, .14, .048, .045, 0, .13][index],
      rock: [.26, .2, 0, 0, 0, 0, 0, .24, 0][index],
      cloudSpin: .085, cloudOpacity: .56, panelAngle: .42,
    },
    planet: {
      position: hero === "eclipse" ? [0, -.8, -32] : [heroSide * 19, -.7, -35],
      radius: hero === "eclipse" ? 5.8 : 7.2,
      ocean: hero === "eclipse" ? "#17182d" : "#263c59",
      land: hero === "eclipse" ? "#332b42" : accent,
    },
    salvage: {
      side: index % 2 ? 1 : -1, radius: 4.4,
      segments: 18,
      position: [anchor[0], anchor[1], anchor[2]],
    },
  }];
})));
const CHAPTER_SCENES = ["sugarBloom", "auroraFoundry", "eclipseCarnival"];
export const resolveScene = (stage, stageIndex = 0) => BIOME_SCENES[stage?.biome?.id] || BIOME_SCENES[CHAPTER_SCENES[stageIndex]] || BIOME_SCENES.sugarBloom;
