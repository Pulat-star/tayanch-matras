// Katalog rasmlari o‘sha 3D modellardan bir martagina olinadi.
// Kadr ichida: kanvasning burchagiga chiziladi → 2D kanvasga ko‘chiriladi → darhol tozalanadi.
// Brauzer bu oraliqni ekranga chiqarmaydi, shuning uchun hech narsa miltillamaydi.
import * as THREE from "three";
import { L } from "./models.js";
import * as TX from "./textures.js";

const DEG = Math.PI / 180;

export function createThumbs({ renderer, rig, onReady }) {
  const scene = rig.scene({ near: 30, far: 60 });
  scene.userData.spot.intensity = 30;
  scene.userData.spot.target.position.set(0, 0.1, 0);
  const cam = new THREE.PerspectiveCamera(24, 4 / 3, 0.1, 50);
  const holder = new THREE.Group();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: TX.radial("shadow"), transparent: true, depthWrite: false, toneMapped: false, fog: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  shadow.scale.set(L * 1.25, 1.6, 1);
  holder.add(shadow);
  scene.add(holder);
  const out = document.createElement("canvas");
  out.width = 640;
  out.height = 480;
  const ctx = out.getContext("2d");
  const queue = [];
  const vt = Math.tan((cam.fov * DEG) / 2);

  function pump() {
    const job = queue.shift();
    if (!job) return;
    const gl = renderer.domElement;
    let tw = 640, th = 480;
    if (gl.width < tw || gl.height < th) {
      const s = Math.min(gl.width / tw, gl.height / th);
      tw = Math.floor(tw * s);
      th = Math.floor(th * s);
    }
    if (tw < 240) { queue.length = 0; return; }
    const pr = renderer.getPixelRatio();

    job.model.setTint(1); // vitrina keyingi yangilanishda o‘z rangini qaytaradi
    const obj = job.model.root.clone();
    obj.position.set(0, 0, 0);
    obj.traverse((o) => { if (o.isMesh) o.visible = true; });
    holder.add(obj);
    holder.rotation.y = -0.62;
    shadow.scale.y = job.model.W * 1.6;

    cam.aspect = tw / th;
    cam.clearViewOffset();
    const d = Math.max(1.35 / 2 / vt, 2.55 / 2 / (vt * cam.aspect));
    const pol = 1.1;
    cam.position.set(0, 0.14 + d * Math.cos(pol), d * Math.sin(pol));
    cam.lookAt(0, 0.14, 0);
    cam.updateProjectionMatrix();

    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, tw / pr, th / pr);
    renderer.setScissor(0, 0, tw / pr, th / pr);
    renderer.clear();
    renderer.render(scene, cam);
    ctx.clearRect(0, 0, out.width, out.height);
    ctx.drawImage(gl, 0, gl.height - th, tw, th, 0, 0, out.width, out.height);
    renderer.clear();
    renderer.setScissorTest(false);
    holder.remove(obj);

    out.toBlob((b) => { if (b) onReady(job.id, URL.createObjectURL(b)); }, "image/webp", 0.9);
  }

  return {
    add: (id, model) => queue.push({ id, model }),
    pending: () => queue.length > 0,
    pump,
  };
}
