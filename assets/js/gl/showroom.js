// Vitrina: matraslar yoy bo‘ylab tik turadi, markazdagisi podiumda yoritiladi.
// Mahsulot oynasi ochilganda o‘sha sahnaning o‘zida matras yotadi va qatlamlarga ajraladi —
// yangi narsa yuklanmaydi, shuning uchun o‘tish silliq.
import * as THREE from "three";
import { makeModel, L, smooth } from "./models.js";
import * as TX from "./textures.js";

const STEP = 0.4;
const R = 5.4;
const PED = 0.14;
const FLAT_YAW = Math.PI / 2 - 0.38;
const UP_YAW = 0.55;
const DEG = Math.PI / 180;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const easeIO = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const easeOut = (x) => 1 - Math.pow(1 - x, 4);

export function createShowroom({ rig, S, on, emit, products, wake }) {
  const html = document.documentElement;
  const heroEl = document.querySelector(".hero");
  const stageEl = document.getElementById("showroomStage");
  const sheetStageEl = document.getElementById("sheetStage");
  const labelEls = Object.fromEntries([...document.querySelectorAll("#shLabels .glabel")].map((e) => [e.dataset.a, e]));
  const lineEls = Object.fromEntries([...document.querySelectorAll("#shLines g")].map((e) => [e.dataset.a, e]));

  const scene = rig.scene({ near: 8, far: 22 });
  const spot = scene.userData.spot;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const n = products.length;

  /* ---------- Dekor: pol, podium, yuqori chiroq, nur, chang ---------- */
  const plane = new THREE.PlaneGeometry(1, 1);
  const glowMat = (map, color, opacity) => new THREE.MeshBasicMaterial({
    map, color, opacity, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  });
  const floor = new THREE.Mesh(plane, glowMat(TX.radial("glow"), 0x4e5fd0, 0.5));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(10, 6, 1);
  const podMat = new THREE.MeshStandardMaterial({ color: "#10121B", roughness: 0.3, metalness: 0.7 });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.05, PED, 64), podMat);
  pod.position.y = PED / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xb4beff, transparent: true, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.007, 8, 120), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PED;
  const halo = new THREE.Mesh(plane, glowMat(TX.radial("ring"), 0x8a9cff, 0.9));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = PED + 0.003;
  halo.scale.set(2.6, 2.6, 1);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.05, 64), podMat);
  lamp.position.y = 3.4;
  const lampRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.008, 8, 120), ringMat);
  lampRing.rotation.x = Math.PI / 2;
  lampRing.position.y = 3.37;
  const lampGlow = new THREE.Mesh(plane, glowMat(TX.radial("glow"), 0xaab6ff, 0.8));
  lampGlow.rotation.x = Math.PI / 2;
  lampGlow.position.y = 3.365;
  lampGlow.scale.set(1.7, 1.7, 1);
  const beamMat = new THREE.MeshBasicMaterial({
    map: TX.beam(), color: 0x9fb0ff, opacity: 0.13, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 1.02, 3.2, 48, 1, true), beamMat);
  beamMesh.position.y = 3.36 - 1.6;
  const DUST = 110;
  const dustPos = new Float32Array(DUST * 3);
  const dustCol = new Float32Array(DUST * 4).map((_, i) => (i % 4 === 3 ? 0.7 : [0.79, 0.83, 1][i % 4]));
  const dustSeed = Array.from({ length: DUST }, (_, i) => ({ a: i * 2.39996, r: 0.15 + ((i * 37) % 100) / 115, y: ((i * 53) % 100) / 100, s: 0.03 + ((i * 17) % 10) / 250 }));
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 4));
  const dustMat = new THREE.PointsMaterial({ size: 0.028, map: TX.radial("dot"), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  const decor = new THREE.Group();
  decor.add(floor, pod, ring, halo, lamp, lampRing, lampGlow, beamMesh, dust);
  scene.add(decor);

  /* ---------- Mahsulotlar ---------- */
  const qUp = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(Y.clone(), new THREE.Vector3(0, 0, 1), X.clone()));
  const qFlatBase = new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2).multiply(qUp);
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();
  const items = [];

  async function build(tick) {
    for (let i = 0; i < n; i++) {
      const p = products[i];
      const model = makeModel({ ...p.model, W: 1.0 });
      const holder = new THREE.Group();
      model.root.position.y = -model.H / 2;
      holder.add(model.root);
      holder.traverse((o) => { o.userData.item = i; });
      scene.add(holder);
      items.push({ p, model, holder, H: model.H, ex: 0, tint: 1, st: { e: 0, spread: 0, fold: 0, incline: 0 } });
      await tick();
    }
  }

  /* ---------- Holat ---------- */
  let cur = 0, target = 0, vel = 0;
  let det = 0, detT = 0;
  let introT = 0;
  let dragYaw = 0, yawVel = 0;
  let lastIndex = -1;
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const wrapD = (i, c) => ((((i - c) % n) + n + n / 2) % n) - n / 2;
  const goTo = (i) => { target = Math.round(cur + wrapD(i, cur)); };
  const heroVisible = () => {
    const r = heroEl.getBoundingClientRect();
    return r.bottom > innerHeight * 0.55;
  };
  const selIndex = () => (((Math.round(cur) % n) + n) % n);

  on("showroom:goto", (i) => { goTo(i); wake(); });
  on("sheet:product", ({ id }) => { goTo(products.findIndex((p) => p.id === id)); dragYaw = 0; wake(); });
  on("sheet:scheme", (z) => { items[selIndex()]?.model.setZones(z); wake(); });
  on("sheet:explode", () => wake());
  on("sheet:open", ({ id }) => openDetail(id));
  on("sheet:close", () => closeDetail());

  function openDetail(id) {
    const i = products.findIndex((p) => p.id === id);
    dragYaw = 0;
    yawVel = 0;
    if (heroVisible() && !S.reduced) {
      goTo(i);
      detT = 1;
      setTimeout(() => { if (S.sheet.open) html.classList.add("gl-front"); }, 140);
    } else {
      html.classList.add("gl-hide");
      cur = target = Math.round(cur + wrapD(i, cur));
      vel = 0;
      det = detT = 1;
      introT = 9;
      html.classList.add("gl-front");
      setTimeout(() => html.classList.remove("gl-hide"), 90);
    }
    if (S.sheet.scheme) items[i]?.model.setZones(S.sheet.scheme);
    wake();
  }

  function closeDetail() {
    detT = 0;
    if (heroVisible() && !S.reduced) {
      setTimeout(() => { if (!S.sheet.open) html.classList.remove("gl-front"); }, 520);
    } else {
      html.classList.add("gl-hide");
      setTimeout(() => {
        if (S.sheet.open) return;
        html.classList.remove("gl-front");
        det = 0;
        setTimeout(() => html.classList.remove("gl-hide"), 80);
      }, 280);
    }
    wake();
  }

  /* ---------- Kiritish: tortish, bosish, g‘ildirak ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const vis = items.filter((it) => it.holder.visible).map((it) => it.holder);
    const hit = ray.intersectObjects(vis, true)[0];
    return hit ? hit.object.userData.item : -1;
  }
  let down = null, dragging = false, lastX = 0, lastT = 0, hoverQueued = false;
  stageEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, cur };
    lastX = e.clientX;
    lastT = performance.now();
    vel = 0;
    emit("showroom:interact");
    wake();
  });
  stageEl.addEventListener("pointermove", (e) => {
    pointer.x = (e.clientX / innerWidth - 0.5) * 2;
    pointer.y = (e.clientY / innerHeight - 0.5) * 2;
    wake();
    if (down) {
      const dx = e.clientX - down.x;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - down.y)) {
        dragging = true;
        stageEl.setPointerCapture(e.pointerId);
        stageEl.classList.add("is-drag");
      }
      if (dragging) {
        const now = performance.now();
        const nc = down.cur - dx / (innerWidth * 0.22);
        vel = (nc - cur) / Math.max(0.008, (now - lastT) / 1000);
        cur = target = nc;
        lastX = e.clientX;
        lastT = now;
      }
    } else if (!hoverQueued && e.pointerType === "mouse") {
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        stageEl.classList.toggle("is-hover", pick(e.clientX, e.clientY) >= 0);
      });
    }
  });
  const release = (e, click) => {
    if (dragging) {
      target = Math.round(cur + clamp(vel * 0.18, -2.5, 2.5));
    } else if (down && click) {
      const i = pick(e.clientX, e.clientY);
      if (i >= 0) {
        if (Math.abs(wrapD(i, cur)) < 0.5) emit("showroom:open", products[i].id);
        else goTo(i);
      }
    }
    down = null;
    dragging = false;
    stageEl.classList.remove("is-drag");
    wake();
  };
  stageEl.addEventListener("pointerup", (e) => release(e, true));
  stageEl.addEventListener("pointercancel", (e) => release(e, false));
  let wheelAcc = 0, wheelT = 0;
  stageEl.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 3) return;
    e.preventDefault();
    wheelAcc += e.deltaX;
    const now = performance.now();
    if (Math.abs(wheelAcc) > 50 && now - wheelT > 380) {
      target = Math.round(target) + Math.sign(wheelAcc);
      wheelAcc = 0;
      wheelT = now;
      emit("showroom:interact");
      wake();
    }
  }, { passive: false });

  // Oyna ichida matrasni aylantirish
  let sd = null;
  sheetStageEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || e.button !== 0) return;
    sd = { x: e.clientX, yaw: dragYaw };
    sheetStageEl.setPointerCapture(e.pointerId);
    wake();
  });
  sheetStageEl.addEventListener("pointermove", (e) => {
    if (!sd) return;
    const ny = sd.yaw + (e.clientX - sd.x) * 0.009;
    yawVel = ny - dragYaw;
    dragYaw = ny;
    wake();
  });
  const endSd = () => { sd = null; };
  sheetStageEl.addEventListener("pointerup", endSd);
  sheetStageEl.addEventListener("pointercancel", endSd);

  /* ---------- Kadr ---------- */
  const vt = Math.tan((cam.fov * DEG) / 2);
  const fit = (r, H, fw, fh) => Math.max(fh / 2 / (vt * (r.h / H)), fw / 2 / (vt * (r.w / H)));
  let hero = { x: 0, y: 0, w: 1, h: 1 };
  const nPos = new THREE.Vector3(), dPos = new THREE.Vector3(), nT = new THREE.Vector3(), dT = new THREE.Vector3();
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();

  function detailRect(W, H) {
    if (W <= 860) return { x: 0, y: 0, w: W, h: H * 0.46 };
    return { x: 0, y: 0, w: W - Math.min(540, W * 0.44), h: H };
  }

  function prepare(W, H) {
    const r = heroEl.getBoundingClientRect();
    hero = { x: r.left, y: r.top, w: r.width, h: r.height };
    const vis = r.bottom > 0 && r.top < H;
    if (det > 0.001 || detT > 0) return { x: 0, y: 0, w: W, h: H };
    if (!vis) return null;
    const y0 = Math.max(0, r.top), y1 = Math.min(H, r.bottom);
    return { x: 0, y: y0, w: W, h: y1 - y0 };
  }

  function update(dt, t, W, H) {
    introT += dt;
    if (!dragging) {
      const k = 38, c = 2 * Math.sqrt(k);
      vel += (k * (target - cur) - c * vel) * dt;
      cur += vel * dt;
      if (Math.abs(target - cur) < 0.0005 && Math.abs(vel) < 0.001) { cur = target; vel = 0; }
    }
    det = S.reduced ? detT : damp(det, detT, 3.4, dt);
    if (Math.abs(det - detT) < 0.0005) det = detT;
    pointer.sx = damp(pointer.sx, pointer.x, 3, dt);
    pointer.sy = damp(pointer.sy, pointer.y, 3, dt);
    if (!sd) { dragYaw += yawVel; yawVel *= 0.92; }

    const idx = selIndex();
    if (idx !== lastIndex && !S.sheet.open) {
      lastIndex = idx;
      emit("showroom:index", idx);
    }

    // Kamera: vitrina kadri va tafsilot kadri orasida silliq o‘tadi
    cam.aspect = W / H;
    const portrait = W <= 760;
    const e = easeIO(det);
    const nd = fit(hero, H, portrait ? 2.8 : 8.2, portrait ? 4.4 : 4.4);
    nT.set(0, 1.2, 0);
    nPos.set(nT.x + pointer.sx * 0.35 * (1 - e), nT.y + 0.3 - pointer.sy * 0.12, nd);
    const dr = detailRect(W, H);
    const dd = fit(dr, H, portrait ? 2.5 : 2.7, portrait ? 1.6 : 1.9);
    dT.set(0, PED + 0.2, 0);
    const pol = 1.02, az = 0;
    dPos.set(dT.x + dd * Math.sin(pol) * Math.sin(az), dT.y + dd * Math.cos(pol), dd * Math.sin(pol) * Math.cos(az));
    pos.lerpVectors(nPos, dPos, e);
    tgt.lerpVectors(nT, dT, e);
    cam.position.copy(pos);
    cam.lookAt(tgt);
    const cd = pos.distanceTo(tgt);
    scene.fog.near = cd - 1.5;
    scene.fog.far = cd + 12;
    const ncx = hero.x + hero.w / 2, ncy = hero.y + hero.h * (portrait ? 0.55 : 0.56);
    const dcx = dr.x + dr.w / 2, dcy = dr.y + dr.h * (portrait ? 0.5 : 0.48);
    const cx = lerp(ncx, dcx, e), cy = lerp(ncy, dcy, e);
    cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);

    // Dekor
    const kIntro = S.reduced ? 1 : easeOut(clamp(introT / 1.6));
    spot.intensity = 70 * kIntro;
    spot.target.position.y = lerp(1.2, PED + 0.2, e);
    ringMat.opacity = kIntro;
    halo.material.opacity = 0.9 * kIntro;
    beamMat.opacity = 0.13 * kIntro * (1 - e);
    beamMesh.visible = e < 0.99;
    const lampOn = !portrait && e < 0.6;
    lamp.visible = lampRing.visible = lampGlow.visible = lampOn;
    floor.material.opacity = 0.5 * kIntro;
    for (let i = 0; i < DUST; i++) {
      const q = dustSeed[i];
      const y = ((q.y + t * q.s) % 1) * 3.2 + 0.15;
      const a = q.a + t * 0.05;
      dustPos[i * 3] = Math.cos(a) * q.r * (0.65 + y * 0.12);
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = Math.sin(a) * q.r * (0.65 + y * 0.12);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.visible = !S.reduced;

    // Mahsulotlar
    const idle = S.reduced ? 0 : Math.sin(t * 0.45) * 0.38;
    const hoverYaw = portrait ? 0 : pointer.sx * 0.3;
    const auto = S.reduced ? 0 : Math.sin(t * 0.3) * 0.18 * e;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const d = wrapD(i, cur);
      const ad = Math.abs(d);
      const focus = 1 - smooth(0, 1, ad);
      const flat = easeIO(det * focus);
      const away = det * (1 - focus);
      const a = d * STEP;
      const k = S.reduced ? 1 : easeOut(clamp((introT - ad * 0.14) / 1.1));
      const x = Math.sin(a) * R * (1 + away * 0.6);
      const z = (Math.cos(a) - 1) * R - away * 5 - (1 - k) * 10;
      const bob = S.reduced ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.03;
      const yUp = PED + L / 2 + 0.03 + bob;
      const yFlat = PED + it.H / 2 + 0.005;
      const y = lerp(yUp, yFlat, flat) - away * 0.8 - (1 - k) * 0.5;
      qA.setFromAxisAngle(Y, UP_YAW - a * 0.8 + focus * (idle + hoverYaw)).multiply(qUp);
      qB.setFromAxisAngle(Y, FLAT_YAW + dragYaw + auto).multiply(qFlatBase);
      it.holder.quaternion.slerpQuaternions(qA, qB, flat);
      it.holder.position.set(x * (1 - flat), y, z * (1 - flat));
      it.holder.visible = (ad < 3.3 || flat > 0.01) && k > 0.002;
      if (!it.holder.visible) continue;
      const tintT = lerp(0.2, 1, focus) * (1 - away * 0.6);
      it.tint = S.reduced ? tintT : damp(it.tint, tintT, 6, dt);
      it.model.setTint(it.tint);

      const want = S.sheet.open && S.sheet.explode ? smooth(0.72, 1, flat) : 0;
      it.ex = S.reduced ? want : damp(it.ex, want, 5, dt);
      const st = it.st;
      const anim = it.p.model.anim;
      st.e = 0; st.spread = 0; st.fold = 0; st.incline = 0;
      if (anim === "fold") st.fold = it.ex;
      else if (anim === "incline") { st.incline = smooth(0.6, 1, flat) * 0.8; st.e = it.ex * 0.7; }
      else if (anim === "zones") { st.e = it.ex * 0.75; st.spread = it.ex; }
      else if (anim === "explode") st.e = it.ex * 0.8;
      it.model.update(st, dt, t);
    }
  }

  // Tafsilot rejimidagi qatlam izohlari
  const v = new THREE.Vector3();
  let side = 1;
  function after(W, H) {
    const it = items[selIndex()];
    const show = S.sheet.open && it?.model.layered ? smooth(0.5, 0.85, it.ex) * smooth(0.92, 1, det) : 0;
    for (const k in labelEls) {
      labelEls[k].style.opacity = show.toFixed(3);
      lineEls[k].style.opacity = show.toFixed(3);
    }
    if (show < 0.01) return;
    const sr = sheetStageEl.getBoundingClientRect();
    const m = it.model.root.matrixWorld;
    const px = (s) => { v.copy(it.model.anchors(s)[0][1]).applyMatrix4(m).project(cam); return v.x; };
    const pr = px(1), pl = px(-1);
    if (pr > pl + 0.05) side = 1; else if (pl > pr + 0.05) side = -1;
    const list = it.model.anchors(side);
    let prev = -Infinity;
    const narrow = sr.width < 520;
    for (const [name, p] of list) {
      v.copy(p).applyMatrix4(m).project(cam);
      const ax = ((v.x + 1) / 2) * W - sr.left;
      const ay = ((1 - v.y) / 2) * H - sr.top;
      const lab = labelEls[name];
      const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const lx = narrow ? sr.width - lw - 12 : Math.min(sr.width - lw - 20, ax + 64);
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

  const busy = () => introT < 2.5 || Math.abs(target - cur) > 0.0005 || Math.abs(det - detT) > 0.0005 || dragging;

  return {
    scene, camera: cam, items, build, prepare, update, after, busy,
    syncOpen() { if (S.sheet.open) openDetail(S.sheet.id); },
    setIndex(i) { cur = target = i; lastIndex = i; },
  };
}
