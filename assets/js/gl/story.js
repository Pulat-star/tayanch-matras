// «Ichida nima bor» bo‘limi: scroll bilan matras qatlamlarga ajraladi, zonalar almashadi, havo o‘tadi.
import * as THREE from "three";
import { makeModel, makeAir, smooth } from "./models.js";
import * as TX from "./textures.js";

const DEG = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));

const KF = [
  { p: 0.0, az: -0.55, pol: 1.08, e: 0, sp: 0, ta: 0, band: 1, air: 0, zm: 1 },
  { p: 0.12, az: -0.42, pol: 1.13, e: 1, sp: 0, ta: 0, band: 1, air: 0, zm: 1 },
  { p: 0.3, az: -0.2, pol: 1.15, e: 1, sp: 0, ta: 0, band: 1, air: 0, zm: 1 },
  { p: 0.42, az: -0.06, pol: 0.8, e: 0.3, sp: 1, ta: 1, band: 0, air: 0, zm: 1.2 },
  { p: 0.64, az: 0.08, pol: 0.76, e: 0.3, sp: 1, ta: 1, band: 0, air: 0, zm: 1.2 },
  { p: 0.78, az: 0.4, pol: 1.02, e: 0, sp: 0, ta: 0, band: 1, air: 1, zm: 1 },
  { p: 1.0, az: 0.6, pol: 1.06, e: 0, sp: 0, ta: 0, band: 1, air: 1, zm: 1 },
];
function sample(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(a.p, b.p, p);
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], t);
  return o;
}

export function createStory({ rig, S }) {
  const stageEl = document.querySelector(".story__stage");
  const viewEl = document.getElementById("storyStage");
  const labelEls = Object.fromEntries([...document.querySelectorAll("#stLabels .glabel")].map((e) => [e.dataset.a, e]));
  const lineEls = Object.fromEntries([...document.querySelectorAll("#stLines g")].map((e) => [e.dataset.a, e]));
  const tagEls = [...document.querySelectorAll("#stTags .ztag")];

  const scene = rig.scene({ near: 6, far: 20 });
  scene.userData.spot.intensity = 40;
  scene.userData.spot.target.position.set(0, 0.2, 0);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const model = makeModel({ kind: "modular", core: 0.15, band: "ikat", quilt: "diamond", zones: [2, 2, 2], W: 1.3 }, { shadow: true });
  scene.add(model.root);
  const air = makeAir();
  air.pts.scale.set(1, 1, 1.3);
  scene.add(air.pts);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: TX.radial("glow"), color: 0x4e5fd0, opacity: 0.45, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  }));
  glow.rotation.x = -Math.PI / 2;
  glow.scale.set(6, 4, 1);
  scene.add(glow);

  let sp = null;
  let rect = null;
  const st = { e: 0, spread: 0, topAway: 0, band: 1, air: 0 };
  const vt = Math.tan((cam.fov * DEG) / 2);

  function prepare(W, H) {
    if (S.sheet.open) return null;
    const r = stageEl.getBoundingClientRect();
    if (r.bottom <= 0 || r.top >= H || r.height < 2) return null;
    rect = viewEl.getBoundingClientRect();
    const y0 = Math.max(0, r.top), y1 = Math.min(H, r.bottom);
    return { x: 0, y: y0, w: W, h: y1 - y0 };
  }

  let k = sample(0);
  function update(dt, t, W, H) {
    const target = S.reduced ? 0.2 : S.story.p;
    sp = sp == null || S.reduced ? target : damp(sp, target, 6, dt);
    k = sample(sp);
    st.e = k.e; st.spread = k.sp; st.topAway = k.ta; st.band = k.band; st.air = k.air;
    model.setZones(S.story.zones);
    model.update(st, dt, t);
    air.update(t, k.air);

    cam.aspect = W / H;
    const wide = W > 860;
    // Keng ekranda matras o‘ng tomonda, matn chapda qoladi
    const box = wide
      ? { x: rect.left + rect.width * 0.36, y: rect.top, w: rect.width * 0.62, h: rect.height }
      : { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    const fh = 1.9, fw = 2.9;
    const d = Math.max(fh / 2 / (vt * (box.h / H)), fw / 2 / (vt * (box.w / H))) * k.zm;
    const ty = 0.25 + k.e * 0.12;
    cam.position.set(d * Math.sin(k.pol) * Math.sin(k.az), ty + d * Math.cos(k.pol), d * Math.sin(k.pol) * Math.cos(k.az));
    cam.lookAt(0, ty, 0);
    scene.fog.near = d + 1;
    scene.fog.far = d + 16;
    const cx = box.x + box.w / 2, cy = box.y + box.h * 0.5;
    cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
  }

  const v = new THREE.Vector3();
  function after(W, H) {
    const sr = stageEl.getBoundingClientRect();
    const p = sp ?? 0;
    const show = S.reduced ? 0 : smooth(0.06, 0.12, p) * (1 - smooth(0.3, 0.36, p));
    for (const name in labelEls) {
      labelEls[name].style.opacity = show.toFixed(3);
      lineEls[name].style.opacity = show.toFixed(3);
    }
    if (show > 0.01) {
      let prev = -Infinity;
      for (const [name, pt] of model.anchors(1)) {
        v.copy(pt).project(cam);
        const ax = ((v.x + 1) / 2) * W - sr.left;
        const ay = ((1 - v.y) / 2) * H - sr.top;
        const lab = labelEls[name];
        const lw = lab.offsetWidth, lh = lab.offsetHeight;
        const lx = Math.min(sr.width - lw - 24, ax + 70);
        const ly = Math.max(ay - lh / 2, prev + 8);
        prev = ly + lh;
        lab.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
        const [line, dot] = lineEls[name].children;
        line.setAttribute("x1", ax.toFixed(1));
        line.setAttribute("y1", ay.toFixed(1));
        line.setAttribute("x2", lx.toFixed(1));
        line.setAttribute("y2", (ly + lh / 2).toFixed(1));
        dot.setAttribute("cx", ax.toFixed(1));
        dot.setAttribute("cy", ay.toFixed(1));
      }
    }
    const tagShow = S.reduced ? 0 : smooth(0.42, 0.46, p) * (1 - smooth(0.66, 0.7, p));
    tagEls.forEach((tag, i) => {
      tag.style.opacity = tagShow.toFixed(3);
      if (tagShow < 0.01) return;
      v.copy(model.inner.zoneAnchor(i)).project(cam);
      const tw = tag.offsetWidth, th = tag.offsetHeight;
      const x = clamp(((v.x + 1) / 2) * W - sr.left - tw / 2, 8, sr.width - tw - 8);
      const y = Math.min(((1 - v.y) / 2) * H - sr.top + 12, sr.height - th - 90);
      tag.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    });
  }

  const busy = () => sp == null || Math.abs((sp ?? 0) - S.story.p) > 0.0005 || k.air > 0.01;
  return { scene, camera: cam, prepare, update, after, busy };
}
