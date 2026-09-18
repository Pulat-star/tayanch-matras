// 3D dvigatel: bitta renderer, bitta kanvas, bir nechta sahna.
// Sahifa qotmasligi uchun: bosqichma-bosqich tayyorlash, shaderlarni oldindan asinxron kompilyatsiya,
// ko‘rinmayotgan sahnani chizmaslik, kadr sekinlashsa piksel zichligini pasaytirish.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { S, on, emit, nextFrame, THUMBS } from "../core.js";
import { PRODUCTS } from "../data.js";
import { setAniso } from "./textures.js";
import { createRig } from "./rig.js";
import { createShowroom } from "./showroom.js";
import { createThumbs } from "./thumbs.js";

export async function boot() {
  const html = document.documentElement;
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  setAniso(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

  const weak = matchMedia("(max-width: 760px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
  const maxPR = Math.min(window.devicePixelRatio || 1, weak ? 1.5 : 2);
  let pr = maxPR;
  let cw = 0, ch = 0;
  function resize(force) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!force && w === cw && h === ch) return;
    cw = w;
    ch = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
  }
  resize(true);
  await nextFrame();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const rig = createRig(env);
  await nextFrame();

  let raf = 0;
  let alive = true;
  const wake = () => { if (!raf && alive) raf = requestAnimationFrame(frame); };

  const showroom = createShowroom({ rig, S, on, emit, products: PRODUCTS, wake });
  showroom.setIndex(S.index);
  await showroom.build(nextFrame);
  await nextFrame();
  const thumbs = createThumbs({
    renderer, rig,
    onReady: (id, url) => { THUMBS.set(id, url); emit("thumb", { id, url }); },
  });
  for (const it of showroom.items) thumbs.add(it.p.id, it.model);

  // Teksturalarni oldindan yuklash va shaderlarni fonda kompilyatsiya qilish
  const texs = new Set();
  for (const sc of [showroom.scene]) {
    sc.traverse((o) => {
      const m = o.material;
      if (m) for (const k of ["map", "bumpMap"]) if (m[k]) texs.add(m[k]);
    });
  }
  texs.forEach((tx) => renderer.initTexture(tx));
  await nextFrame();
  resize();
  showroom.prepare(cw, ch);
  showroom.update(0, 0, cw, ch);
  try {
    await renderer.compileAsync(showroom.scene, showroom.camera);
  } catch {
    /* eski brauzer: birinchi kadrda kompilyatsiya bo‘ladi */
  }
  const stages = [showroom];
  let last = performance.now();
  let acc = 0, cnt = 0;
  const heroTop = document.querySelector(".hero").getBoundingClientRect().bottom > 0;
  const thumbsAt = performance.now() + (heroTop ? 1900 : 250);

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    alive = false;
    html.classList.remove("gl-on", "gl-front");
    html.classList.add("no-gl");
  });

  function quality(d) {
    acc += d;
    cnt++;
    if (cnt < 90) return;
    const avg = acc / cnt;
    acc = 0;
    cnt = 0;
    if (avg > 1 / 40 && pr > 1) {
      pr = Math.max(1, pr - 0.25);
      resize(true);
    }
  }

  function frame(now) {
    raf = 0;
    if (!alive) return;
    const raw = (now - last) / 1000;
    const dt = Math.min(0.05, raw);
    last = now;
    const t = now / 1000;
    resize();
    const active = [];
    for (const s of stages) {
      const sc = s.prepare(cw, ch);
      if (sc && sc.h > 0) active.push([s, sc]);
    }
    renderer.setScissorTest(false);
    renderer.clear();
    const doThumb = thumbs.pending() && now > thumbsAt && (!S.sheet.open || !active.length);
    if (doThumb) thumbs.pump();
    for (const [s, sc] of active) {
      s.update(dt, t, cw, ch);
      renderer.setViewport(0, 0, cw, ch);
      renderer.setScissorTest(true);
      renderer.setScissor(sc.x, ch - sc.y - sc.h, sc.w, sc.h);
      renderer.render(s.scene, s.camera);
      s.after(cw, ch);
    }
    renderer.setScissorTest(false);
    if (active.length && raw < 0.1) quality(raw);
    if (active.length || thumbs.pending()) wake();
  }

  addEventListener("scroll", wake, { passive: true });
  addEventListener("resize", wake);
  document.addEventListener("visibilitychange", () => { last = performance.now(); wake(); });
  for (const ev of ["showroom:goto", "sheet:open", "sheet:close", "sheet:product", "sheet:scheme", "sheet:explode", "lang"]) on(ev, wake);

  S.glReady = true;
  html.classList.add("gl-on");
  emit("gl:ready");
  showroom.syncOpen();
  last = performance.now();
  wake();
}
