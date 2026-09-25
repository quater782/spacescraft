import * as THREE from "three";

export const TAU = Math.PI * 2;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const mixColor = (color, target = "#172039", amount = .55) => `#${new THREE.Color(color).lerp(new THREE.Color(target), amount).getHexString()}`;

export const compose = (position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], "YXZ"));
  matrix.compose(new THREE.Vector3(...position), quaternion, new THREE.Vector3(...scale));
  return matrix;
};
export const multiply = (base, local) => new THREE.Matrix4().multiplyMatrices(base, local);
