// Barcha sahnalar bir xil yorug‘lik va tuman to‘plamini oladi —
// shunda shaderlar bir marta kompilyatsiya qilinadi va qayta ishlatiladi.
import * as THREE from "three";

export function createRig(env) {
  return {
    scene({ near = 9, far = 26 } = {}) {
      const s = new THREE.Scene();
      s.environment = env;
      s.environmentIntensity = 0.55;
      s.fog = new THREE.Fog(0x07080d, near, far);
      const hemi = new THREE.HemisphereLight(0xdfe5ff, 0x0a0c14, 0.55);
      const key = new THREE.DirectionalLight(0xffffff, 1.7);
      key.position.set(-3, 6, 5);
      const rim = new THREE.DirectionalLight(0x8fa0ff, 1.2);
      rim.position.set(4, 3, -5);
      const spot = new THREE.SpotLight(0xeef1ff, 0, 16, 0.4, 0.65, 1.4);
      spot.position.set(0, 6.8, 1.4);
      spot.target.position.set(0, 0.9, 0);
      s.add(hemi, key, rim, spot, spot.target);
      s.userData.spot = spot;
      return s;
    },
  };
}
