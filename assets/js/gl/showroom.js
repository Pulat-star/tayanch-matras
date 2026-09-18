// Bitta sahna — butun hikoya. Scroll "plyer" vazifasini bajaradi:
// matras yotadi → qatlamlarga ajraladi → zonalari almashadi → havo o‘tadi → o‘rniga qaytadi.
// Mahsulot oynasi ham shu sahnada ochiladi, shuning uchun o‘tishlar uzluksiz.
import * as THREE from "three";
import { makeModel, makeAir, L, smooth } from "./models.js";
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

// Scroll ssenariysi: a = 0..1
function timeline(a) {
  return {
    // yon modellar chetga suriladi, oxirida qaytadi
    arcOut: smooth(0.02, 0.16, a) * (1 - smooth(0.88, 1, a)),
    // markazdagisi yotadi
    lie: smooth(0.1, 0.26, a) * (1 - smooth(0.84, 0.96, a)),
    // qatlamlarga ajraladi
    ex: smooth(0.28, 0.42, a) * (1 - smooth(0.68, 0.78, a)),
    // ustki qatlamlar uchib ketadi, bloklar yoyiladi
    ta: smooth(0.46, 0.55, a) * (1 - smooth(0.64, 0.72, a)),
    // havo
    air: smooth(0.72, 0.8, a) * (1 - smooth(0.92, 0.99, a)),
    // kamera yaqinlashadi
    camIn: smooth(0.04, 0.28, a) * (1 - smooth(0.86, 1, a)),
    zones: a < 0.55 ? [2, 2, 2] : a < 0.61 ? [1, 3, 2] : [1, 2, 1],
  };
}

export function createShowroom({ rig, S, on, emit, products, wake }) {
  const html = document.documentElement;
  const heroEl = document.querySelector(".hero");
  const stageEl = document.getElementById("showroomStage");
  const actEl = document.querySelector(".act");
  const actStageEl = document.querySelector(".act__stage");
  const sheetStageEl = document.getElementById("sheetStage");
  const pick$ = (sel) => Object.fromEntries([...document.querySelectorAll(sel)].map((e) => [e.dataset.a, e]));
  const labels = { sheet: pick$("#shLabels .glabel"), act: pick$("#stLabels .glabel") };
  const lines = { sheet: pick$("#shLines g"), act: pick$("#stLines g") };
  const zTags = [...document.querySelectorAll("#stTags .ztag")];

  const scene = rig.scene({ near: 8, far: 22 });
  const spot = scene.userData.spot;
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
  const n = products.length;

  /* ---------- Studiya: pol, podium, chiroq, nur, chang ---------- */
  const plane = new THREE.PlaneGeometry(1, 1);
  const glowMat = (map, color, opacity) => new THREE.MeshBasicMaterial({
    map, color, opacity, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  });
  const floor = new THREE.Mesh(plane, glowMat(TX.radial("glow"), 0x7fb3d4, 0.75));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(10, 6, 1);
  const podMat = new THREE.MeshStandardMaterial({ color: "#16354B", roughness: 0.32, metalness: 0.35 });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.05, PED, 64), podMat);
  pod.position.y = PED / 2;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x9fd0ea, transparent: true, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.99, 0.007, 8, 120), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = PED;
  const halo = new THREE.Mesh(plane, glowMat(TX.radial("ring"), 0x7fb4d6, 0.6));
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = PED + 0.003;
  halo.scale.set(2.6, 2.6, 1);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.04, 64), podMat);
  lamp.position.y = 4.65;
  const lampRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.007, 8, 120), ringMat);
  lampRing.rotation.x = Math.PI / 2;
  lampRing.position.y = 4.62;
  const lampGlow = new THREE.Mesh(plane, glowMat(TX.radial("glow"), 0xd7ecf8, 0.9));
  lampGlow.rotation.x = Math.PI / 2;
  lampGlow.position.y = 4.615;
  lampGlow.scale.set(1.6, 1.6, 1);
  const beamMat = new THREE.MeshBasicMaterial({
    map: TX.beam(), color: 0xbcdcf0, opacity: 0.12, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false, fog: false,
  });
  const beamMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 4.5, 48, 1, true), beamMat);
  beamMesh.position.y = 4.6 - 2.25;
  const DUST = 110;
  const dustPos = new Float32Array(DUST * 3);
  const dustCol = new Float32Array(DUST * 4).map((_, i) => (i % 4 === 3 ? 0.55 : [0.32, 0.54, 0.68][i % 4]));
  const dustSeed = Array.from({ length: DUST }, (_, i) => ({ a: i * 2.39996, r: 0.15 + ((i * 37) % 100) / 115, y: ((i * 53) % 100) / 100, s: 0.03 + ((i * 17) % 10) / 250 }));
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustCol, 4));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.03, map: TX.radial("dot"), vertexColors: true, transparent: true, depthWrite: false }));
  dust.frustumCulled = false;
  const air = makeAir();
  const decor = new THREE.Group();
  decor.add(floor, pod, ring, halo, lamp, lampRing, lampGlow, beamMesh, dust, air.pts);
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
      items.push({ p, model, holder, H: model.H, ex: 0, tint: 1, st: { e: 0, spread: 0, fold: 0, incline: 0, topAway: 0, band: 1, air: 0 } });
      await tick();
    }
  }

  /* ---------- Holat ---------- */
  let cur = 0, target = 0, vel = 0;
  let det = 0, detT = 0;
  let introT = 0;
  let dragYaw = 0, yawVel = 0;
  let lastIndex = -1;
  let rect = { x: 0, y: 0, w: 1, h: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const wrapD = (i, c) => ((((i - c) % n) + n + n / 2) % n) - n / 2;
  const goTo = (i) => { target = Math.round(cur + wrapD(i, cur)); };
  const selIndex = () => (((Math.round(cur) % n) + n) % n);
  // Hikoya faqat modulli matras bilan ketadi (ko‘rpacha yoki topperda qatlam yo‘q)
  const storyIndex = Math.max(0, products.findIndex((p) => p.model.kind === "modular" && !p.model.slices));
  const heroVisible = () => heroEl.getBoundingClientRect().bottom > innerHeight * 0.55;

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
    if (heroVisible() && !S.reduced && S.act.p < 0.02) {
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
    if (heroVisible() && !S.reduced && S.act.p < 0.02) {
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

  /* ---------- Kiritish (faqat bosh ekranda) ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pickAt(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const hit = ray.intersectObjects(items.filter((it) => it.holder.visible).map((it) => it.holder), true)[0];
    return hit ? hit.object.userData.item : -1;
  }
  let down = null, dragging = false, lastT = 0, hoverQueued = false;
  stageEl.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || S.act.p > 0.02) return;
    down = { x: e.clientX, y: e.clientY, cur };
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
        lastT = now;
      }
    } else if (!hoverQueued && e.pointerType === "mouse" && S.act.p < 0.02) {
      hoverQueued = true;
      requestAnimationFrame(() => {
        hoverQueued = false;
        stageEl.classList.toggle("is-hover", pickAt(e.clientX, e.clientY) >= 0);
      });
    }
  });
  const release = (e, click) => {
    if (dragging) target = Math.round(cur + clamp(vel * 0.18, -2.5, 2.5));
    else if (down && click) {
      const i = pickAt(e.clientX, e.clientY);
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
    if (S.act.p > 0.02 || Math.abs(e.deltaX) <= Math.abs(e.deltaY) || Math.abs(e.deltaX) < 3) return;
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

  /* ---------- Kamera va kadr ---------- */
  const vt = Math.tan((cam.fov * DEG) / 2);
  const fit = (r, H, fw, fh) => Math.max(fh / 2 / (vt * (r.h / H)), fw / 2 / (vt * (r.w / H)));
  const hPos = new THREE.Vector3(), aPos = new THREE.Vector3(), dPos = new THREE.Vector3();
  const hT = new THREE.Vector3(), aT = new THREE.Vector3(), dT = new THREE.Vector3();
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();

  function detailRect(W, H) {
    if (W <= 860) return { x: 0, y: 0, w: W, h: H * 0.46 };
    return { x: 0, y: 0, w: W - Math.min(540, W * 0.44), h: H };
  }

  function prepare(W, H) {
    const hr = heroEl.getBoundingClientRect();
    const ar = actStageEl.getBoundingClientRect();
    const heroVis = hr.bottom > 0 && hr.top < H;
    const actVis = ar.bottom > 0 && ar.top < H;
    if (det > 0.001 || detT > 0) {
      rect = detailRect(W, H);
      return { x: 0, y: 0, w: W, h: H };
    }
    if (!heroVis && !actVis) return null;
    const useAct = actVis && (S.act.p > 0.001 || !heroVis);
    const r = useAct ? ar : hr;
    rect = { x: r.left, y: r.top, w: r.width, h: r.height };
    return { x: 0, y: 0, w: W, h: H };
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

    const a = S.reduced ? 0.34 : clamp(S.act.p);
    const tl = timeline(a);
    // Akt boshlanishi bilan sahna modulli matrasga o‘tadi
    if (a > 0.02 && !S.sheet.open && !items[selIndex()]?.model.layered) goTo(storyIndex);
    const portrait = W <= 760;
    const e = easeIO(det);

    // Kamera: bosh ekran → akt → mahsulot oynasi
    cam.aspect = W / H;
    const nd = fit(rect, H, portrait ? 2.8 : 8.2, 4.4);
    hT.set(0, 1.2, 0);
    const drift = S.reduced ? 0 : 1;
    hPos.set(
      hT.x + (pointer.sx * 0.35 + Math.sin(t * 0.13) * 0.22 * drift),
      hT.y + 0.3 - pointer.sy * 0.12 + Math.sin(t * 0.19) * 0.06 * drift,
      nd,
    );
    const ad = fit(rect, H, portrait ? 2.9 : 5.2, portrait ? 2.1 : 3.1);
    const aAz = -0.5 + a * 1.0;
    const aPol = lerp(1.06, 0.76, tl.ta);
    aT.set(0, PED + 0.22 + tl.ex * 0.12, 0);
    aPos.set(
      aT.x + ad * Math.sin(aPol) * Math.sin(aAz),
      aT.y + ad * Math.cos(aPol),
      ad * Math.sin(aPol) * Math.cos(aAz),
    );
    const dr = detailRect(W, H);
    const dd = fit(dr, H, portrait ? 2.5 : 2.7, portrait ? 1.6 : 1.9);
    dT.set(0, PED + 0.2, 0);
    dPos.set(0, dT.y + dd * Math.cos(1.02), dd * Math.sin(1.02));

    const ci = easeIO(tl.camIn);
    pos.lerpVectors(hPos, aPos, ci).lerp(dPos, e);
    tgt.lerpVectors(hT, aT, ci).lerp(dT, e);
    cam.position.copy(pos);
    cam.lookAt(tgt);
    const cd = pos.distanceTo(tgt);
    scene.fog.near = cd - 1;
    scene.fog.far = cd + 13;

    const heroCx = rect.x + rect.w / 2;
    const actCx = rect.x + rect.w * (portrait ? 0.5 : 0.64);
    const heroCy = rect.y + rect.h * (portrait ? 0.55 : 0.56);
    const actCy = rect.y + rect.h * (portrait ? 0.26 : 0.5);
    const detCy = dr.y + dr.h * (portrait ? 0.5 : 0.48);
    const cx = lerp(lerp(heroCx, actCx, ci), dr.x + dr.w / 2, e);
    const cy = lerp(lerp(heroCy, actCy, ci), detCy, e);
    cam.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);

    // Dekor
    const kIntro = S.reduced ? 1 : easeOut(clamp(introT / 1.6));
    spot.intensity = 46 * kIntro;
    spot.target.position.y = lerp(1.2, PED + 0.2, Math.max(ci, e));
    ringMat.opacity = kIntro;
    halo.material.opacity = 0.6 * kIntro;
    beamMat.opacity = 0.12 * kIntro * (1 - Math.max(e, tl.camIn * 0.8));
    beamMesh.visible = beamMat.opacity > 0.005;
    const lampOn = !portrait && beamMesh.visible;
    lamp.visible = lampRing.visible = lampGlow.visible = lampOn;
    floor.material.opacity = 0.75 * kIntro;
    for (let i = 0; i < DUST; i++) {
      const q = dustSeed[i];
      const y = ((q.y + t * q.s) % 1) * 3.2 + 0.15;
      const ang = q.a + t * 0.05;
      dustPos[i * 3] = Math.cos(ang) * q.r * (0.65 + y * 0.12);
      dustPos[i * 3 + 1] = y;
      dustPos[i * 3 + 2] = Math.sin(ang) * q.r * (0.65 + y * 0.12);
    }
    dustGeo.attributes.position.needsUpdate = true;
    dust.visible = !S.reduced;
    air.update(t, tl.air);

    // Mahsulotlar
    const idle = S.reduced ? 0 : Math.sin(t * 0.45) * 0.38;
    const hoverYaw = portrait ? 0 : pointer.sx * 0.3;
    const auto = S.reduced ? 0 : Math.sin(t * 0.3) * 0.18 * e;
    const sel = selIndex();
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const d = wrapD(i, cur);
      const ad2 = Math.abs(d);
      const focus = 1 - smooth(0, 1, ad2);
      const flat = easeIO(Math.max(det, tl.lie) * focus);
      const away = Math.max(det, tl.arcOut) * (1 - focus);
      const ang = d * STEP;
      const k = S.reduced ? 1 : easeOut(clamp((introT - ad2 * 0.14) / 1.1));
      const x = Math.sin(ang) * R * (1 + away * 0.6);
      const z = (Math.cos(ang) - 1) * R - away * 5 - (1 - k) * 10;
      const bob = S.reduced ? 0 : Math.sin(t * 1.1 + i * 1.7) * 0.03;
      const yUp = PED + L / 2 + 0.03 + bob;
      const yFlat = PED + it.H / 2 + 0.005;
      const y = lerp(yUp, yFlat, flat) - away * 0.8 - (1 - k) * 0.5;
      qA.setFromAxisAngle(Y, UP_YAW - ang * 0.8 + focus * (idle + hoverYaw)).multiply(qUp);
      qB.setFromAxisAngle(Y, FLAT_YAW + dragYaw + auto).multiply(qFlatBase);
      it.holder.quaternion.slerpQuaternions(qA, qB, flat);
      it.holder.position.set(x * (1 - flat), y, z * (1 - flat));
      it.holder.visible = (ad2 < 3.3 || flat > 0.01) && k > 0.002 && away < 0.985;
      if (!it.holder.visible) continue;

      const tintT = lerp(0.62, 1, focus) * (1 - away * 0.3);
      it.tint = S.reduced ? tintT : damp(it.tint, tintT, 6, dt);
      it.model.setTint(it.tint);

      const isSel = i === sel;
      const want = S.sheet.open
        ? (S.sheet.explode ? smooth(0.72, 1, flat) : 0)
        : isSel ? tl.ex : 0;
      it.ex = S.reduced ? want : damp(it.ex, want, 5, dt);
      const st = it.st;
      const anim = it.p.model.anim;
      st.e = 0; st.spread = 0; st.fold = 0; st.incline = 0; st.topAway = 0; st.band = 1; st.air = 0;
      if (anim === "fold") st.fold = it.ex;
      else if (anim === "incline") { st.incline = smooth(0.6, 1, flat) * 0.8; st.e = it.ex * 0.7; }
      else if (anim === "zones") { st.e = it.ex * 0.75; st.spread = it.ex; }
      else if (anim === "explode") st.e = it.ex * 0.8;
      if (isSel && !S.sheet.open) {
        // akt: ustki qatlamlar uchadi, bloklar yoyiladi, havo o‘tadi
        st.topAway = tl.ta;
        st.spread = Math.max(st.spread, tl.ta);
        st.e = Math.max(st.e, tl.ex * 0.8);
        st.air = tl.air;
        if (tl.ta > 0.02 && it.model.layered) it.model.setZones(tl.zones);
        else if (tl.ta <= 0.02 && it.p.scheme) it.model.setZones(it.p.scheme);
      }
      it.model.update(st, dt, t);
    }
  }

  /* ---------- Ustidagi izohlar ---------- */
  const v = new THREE.Vector3();
  let side = 1;
  function place(set, lineSet, host, it, show, W, H) {
    for (const k in set) {
      set[k].style.opacity = show.toFixed(3);
      lineSet[k].style.opacity = show.toFixed(3);
    }
    if (show < 0.01 || !it?.model.layered) return;
    const sr = host.getBoundingClientRect();
    const m = it.model.root.matrixWorld;
    const px = (sgn) => { v.copy(it.model.anchors(sgn)[0][1]).applyMatrix4(m).project(cam); return v.x; };
    const pr = px(1), pl = px(-1);
    if (pr > pl + 0.05) side = 1; else if (pl > pr + 0.05) side = -1;
    const narrow = sr.width < 560;
    let prev = -Infinity;
    for (const [name, p] of it.model.anchors(side)) {
      v.copy(p).applyMatrix4(m).project(cam);
      const ax = ((v.x + 1) / 2) * W - sr.left;
      const ay = ((1 - v.y) / 2) * H - sr.top;
      const lab = set[name];
      const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const lx = narrow ? sr.width - lw - 12 : Math.min(sr.width - lw - 24, ax + 64);
      const ly = Math.max(ay - lh / 2, prev + 8);
      prev = ly + lh;
      lab.style.transform = `translate(${lx.toFixed(1)}px,${ly.toFixed(1)}px)`;
      const [line, dot] = lineSet[name].children;
      line.setAttribute("x1", ax.toFixed(1));
      line.setAttribute("y1", ay.toFixed(1));
      line.setAttribute("x2", lx.toFixed(1));
      line.setAttribute("y2", (ly + lh / 2).toFixed(1));
      dot.setAttribute("cx", ax.toFixed(1));
      dot.setAttribute("cy", ay.toFixed(1));
    }
  }

  function after(W, H) {
    const it = items[selIndex()];
    if (S.sheet.open) {
      const show = it?.model.layered ? smooth(0.5, 0.85, it.ex) * smooth(0.92, 1, det) : 0;
      place(labels.sheet, lines.sheet, sheetStageEl, it, show, W, H);
      place(labels.act, lines.act, actStageEl, it, 0, W, H);
      zTags.forEach((tag) => { tag.style.opacity = "0"; });
      return;
    }
    const a = S.reduced ? 0.34 : clamp(S.act.p);
    const tl = timeline(a);
    const show = S.reduced ? 0 : smooth(0.29, 0.36, a) * (1 - smooth(0.44, 0.5, a));
    place(labels.act, lines.act, actStageEl, it, show, W, H);
    place(labels.sheet, lines.sheet, sheetStageEl, it, 0, W, H);

    const tagShow = S.reduced ? 0 : tl.ta;
    const sr = actStageEl.getBoundingClientRect();
    const blocks = it?.model.inner.parts?.blocks;
    zTags.forEach((tag, i) => {
      tag.style.opacity = tagShow.toFixed(3);
      if (tagShow < 0.01 || !blocks) return;
      const b = blocks.find((q) => q.col === i && q.row === 0 && q.tier === 0);
      if (!b) return;
      v.copy(it.model.inner.zoneAnchor(i)).applyMatrix4(it.model.root.matrixWorld).project(cam);
      const tw = tag.offsetWidth, th = tag.offsetHeight;
      const x = clamp(((v.x + 1) / 2) * W - sr.left - tw / 2, 8, sr.width - tw - 8);
      const y = Math.min(((1 - v.y) / 2) * H - sr.top + 14, sr.height - th - 120);
      tag.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
    });
  }

  return {
    scene, camera: cam, items, build, prepare, update, after,
    syncOpen() { if (S.sheet.open) openDetail(S.sheet.id); },
    setIndex(i) { cur = target = i; lastIndex = i; },
  };
}
