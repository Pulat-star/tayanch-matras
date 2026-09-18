// Barcha sahnalar bir xil yorug‘lik va tuman to‘plamini oladi —
// shunda shaderlar bir marta kompilyatsiya qilinadi va qayta ishlatiladi.
import * as THREE from "three";

export function createRig(env) {
  return {
    scene({ near = 9, far = 26 } = {}) {
      const s = new THREE.Scene();
      s.environment = env;
      s.environmentIntensity = 0.85;
      s.fog = new THREE.Fog(0xf3f8fc, near, far);
      const hemi = new THREE.HemisphereLight(0xffffff, 0xc3d8e6, 0.65);
      const key = new THREE.DirectionalLight(0xffffff, 1.65);
      key.position.set(-3, 6, 5);
      const rim = new THREE.DirectionalLight(0xbfd9ea, 1.1);
      rim.position.set(4, 3, -5);
      const spot = new THREE.SpotLight(0xffffff, 0, 16, 0.42, 0.7, 1.3);
      spot.position.set(0, 6.8, 1.4);
      spot.target.position.set(0, 0.9, 0);
      s.add(hemi, key, rim, spot, spot.target);
      s.userData.spot = spot;
      return s;
    },
  };
}
