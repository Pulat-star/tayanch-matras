// Bitta WebGL kanvas sahifadagi barcha [data-view] bloklarini chizadi (scissor usuli).
// Modellar koddan yasaladi: tashqi fayl yuklanmaydi.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { drawIkat, IKAT_PAL } from "./ikat.js";
import { PRODUCTS } from "./data.js";

const L = 2.0;
const W = 1.5;
const BLOCK = { 1: new THREE.Color("#C9D6F7"), 2: new THREE.Color("#7D92E3"), 3: new THREE.Color("#2C3F9E") };
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
const STORY_SPEC = { kind: "modular", core: 0.15, band: "ikat", quilt: "diamond", zones: [2, 2, 2] };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
const rng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

/* ---------- Teksturalar ---------- */
let aniso = 4;
const memoT = {};
const memo = (k, f) => memoT[k] || (memoT[k] = f());

function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
function tex(c, rx = 1, ry = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function withRepeat(t, rx, ry) {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}

// Ustki g‘ilofning tikuv naqshi: diamond | wave | grid
function quiltCanvas(kind, bump) {
  const rnd = rng(bump ? 5 : 9);
  return makeCanvas(512, 512, (g, w, h) => {
    const img = g.createImageData(w, h);
    const d = img.data;
    const P = 128;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let dist, maxD;
        if (kind === "diamond") {
          const m1 = (x + y) % P, m2 = (((x - y) % P) + P) % P;
          dist = Math.min(m1, P - m1, m2, P - m2) / Math.SQRT2;
          maxD = P / 2 / Math.SQRT2;
        } else if (kind === "wave") {
          const Q = P / 2;
          const yy = y + Math.sin((x / w) * Math.PI * 8) * 12;
          const m = ((yy % Q) + Q) % Q;
          dist = Math.min(m, Q - m);
          maxD = Q / 2;
        } else {
          const mx = x % P, my = y % P;
          dist = Math.min(mx, P - mx, my, P - my);
          maxD = P / 2;
        }
        const puff = Math.sqrt(clamp(dist / maxD));
        const seam = dist < 1.8;
        const n = rnd();
        const knit = ((x + (y << 1)) & 3) < 2 ? 1 : 0;
        const i = (y * w + x) * 4;
        if (bump) {
          const v = seam ? 0 : 30 + puff * 200 + n * 12 + knit * 6;
          d[i] = d[i + 1] = d[i + 2] = v;
        } else {
          const v = seam ? 0.8 : 0.93 + puff * 0.07 - n * 0.025 - knit * 0.015;
          d[i] = 246 * v;
          d[i + 1] = 247 * v;
          d[i + 2] = 251 * v;
        }
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
  });
}
const quiltMap = (k) => memo("qm" + k, () => tex(quiltCanvas(k, false), 4, 3));
const quiltBump = (k) => memo("qb" + k, () => tex(quiltCanvas(k, true), 4, 3, false));

const fiberTex = () => memo("fiber", () => {
  const rnd = rng(21);
  const c = makeCanvas(256, 256, (g, w, h) => {
    g.fillStyle = "#e4e6ea";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      g.strokeStyle = rnd() < 0.55 ? `rgba(255,255,255,${0.35 + rnd() * 0.4})` : `rgba(90,96,120,${0.12 + rnd() * 0.2})`;
      g.lineWidth = 0.5 + rnd() * 1.2;
      const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 30;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + (rnd() - 0.5) * r * 2, y + (rnd() - 0.5) * r * 2, x + (rnd() - 0.5) * r * 2, y + (rnd() - 0.5) * r * 2, x + (rnd() - 0.5) * r, y + (rnd() - 0.5) * r);
      g.stroke();
    }
  });
  return tex(c, 2, 2);
});

const meshTex = () => memo("mesh", () => tex(makeCanvas(128, 128, (g, w, h) => {
  g.fillStyle = "#f2f4f9";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#b9c1d8";
  for (let y = 0; y < 8; y++) {
    for (let x = -1; x < 9; x++) {
      g.beginPath();
      g.arc(x * 16 + (y % 2 ? 8 : 0) + 4, y * 16 + 8, 3.2, 0, Math.PI * 2);
      g.fill();
    }
  }
}), 24, 18));

const knitTex = () => memo("knit", () => tex(makeCanvas(256, 64, (g, w, h) => {
  for (let x = 0; x < w; x++) {
    const v = 0.78 + 0.22 * Math.abs(Math.sin((x * Math.PI) / 4));
    g.fillStyle = `rgb(${(58 * v) | 0},${(63 * v) | 0},${(86 * v) | 0})`;
    g.fillRect(x, 0, 1, h);
  }
  g.fillStyle = "#d9deea";
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, h - 3, w, 3);
}), 3, 1));

const ikatTex = (pal, piping = true) => memo("ikat" + pal + piping, () => tex(makeCanvas(480, 64, (g, w, h) => {
  drawIkat(g, w, h, IKAT_PAL[pal]);
  if (piping) {
    g.fillStyle = "#e9ecf5";
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, h - 3, w, 3);
  }
}), 2, 1));

const shadowTex = () => memo("shadow", () => tex(makeCanvas(128, 128, (g, w, h) => {
  for (let i = 0; i < 18; i++) {
    const s = i * 3.2, r = Math.max(4, 30 - i);
    g.fillStyle = "rgba(20,26,51,0.05)";
    g.beginPath();
    g.moveTo(s + r, s);
    g.arcTo(w - s, s, w - s, h - s, r);
    g.arcTo(w - s, h - s, s, h - s, r);
    g.arcTo(s, h - s, s, s, r);
    g.arcTo(s, s, w - s, s, r);
    g.fill();
  }
})));

const dotTex = () => memo("dot", () => tex(makeCanvas(64, 64, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.4, "rgba(255,255,255,.6)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
})));

/* ---------- Materiallar va geometriya ---------- */
const geoCache = new Map();
function rbox(w, h, d, r) {
  const k = [w, h, d, r].map((n) => n.toFixed(4)).join();
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 3, r));
  return geoCache.get(k);
}
const planeGeo = new THREE.PlaneGeometry(1, 1);

const coverMat = (quilt, bumpScale = 3) => new THREE.MeshPhysicalMaterial({
  color: 0xffffff, map: quiltMap(quilt), bumpMap: quiltBump(quilt), bumpScale,
  roughness: 0.9, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color("#dfe5ff"),
});
const bandMat = (kind) => new THREE.MeshPhysicalMaterial({
  map: kind === "knit" ? knitTex() : ikatTex(kind === "gold" ? "gold" : "ikat"),
  roughness: 0.8, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color("#ffffff"),
});
const fiberMat = (color) => new THREE.MeshStandardMaterial({ map: fiberTex(), color, roughness: 0.95 });

function fade(list, mat, o) {
  const tr = o < 0.995;
  if (mat.transparent !== tr) {
    mat.transparent = tr;
    mat.depthWrite = !tr;
    mat.needsUpdate = true;
  }
  mat.opacity = o;
  for (const p of list) p.mesh.visible = o > 0.01;
}

/* ---------- Modellar ---------- */
// Qatlamli matras: asos, bloklar (zonalar), sovutuvchi qatlam, g‘ilof tasmasi, ustki g‘ilof
function buildLayered(spec) {
  const g = new THREE.Group();
  const hb = 0.02, hc = spec.core, hf = 0.03, ht = 0.045, ins = 0.012, gap = 0.006;
  const slices = spec.slices || 1;
  const cols = spec.kind === "modular" ? 3 : 1;
  const rows = spec.rows || 1;
  const tiers = spec.tiers || 1;
  const frameH = slices > 1 ? 0.05 : 0;
  const sg = slices > 1 ? 0.008 : 0;
  const Ls = (L - sg * (slices - 1)) / slices;
  const zonesA = spec.zones || [2, 2, 2];
  const zonesB = rows > 1 ? [1, 2, 1] : zonesA;

  const matBase = new THREE.MeshStandardMaterial({ color: "#2A2F45", roughness: 0.95 });
  const matFrame = new THREE.MeshStandardMaterial({ color: "#3A3F55", roughness: 0.55, metalness: 0.15 });
  const matBand = bandMat(spec.band);
  const matTop = coverMat(spec.quilt);
  const matComf = new THREE.MeshStandardMaterial({ map: meshTex(), roughness: 0.9 });
  const parts = { base: [], band: [], comfort: [], top: [], blocks: [] };
  const pivots = [];
  const bh = (hc - gap * (tiers - 1)) / tiers;

  for (let s = 0; s < slices; s++) {
    const cx = -L / 2 + Ls / 2 + s * (Ls + sg);
    const hx = s === 0 && slices > 1 ? cx + Ls / 2 : 0;
    const pivot = new THREE.Group();
    pivot.position.x = hx;
    g.add(pivot);
    pivots.push(pivot);
    const add = (mesh, x, y, z, list) => {
      mesh.position.set(x - hx, y, z);
      pivot.add(mesh);
      if (list) list.push({ mesh, y0: y });
      return mesh;
    };
    if (frameH) add(new THREE.Mesh(rbox(Ls, frameH, W + 0.04, 0.01), matFrame), cx, frameH / 2, 0);
    const y0 = frameH;
    const li = slices > 1 ? Ls - 0.004 : Ls - ins * 2;
    const wi = W - ins * 2;
    add(new THREE.Mesh(rbox(li, hb, wi, 0.008), matBase), cx, y0 + hb / 2, 0, parts.base);

    const colsHere = slices > 1 ? 1 : cols;
    const bl = (li - gap * (colsHere - 1)) / colsHere;
    const bw = (wi - gap * (rows - 1)) / rows;
    for (let t = 0; t < tiers; t++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < colsHere; c++) {
          const col = slices > 1 ? s : c;
          const zset = r === 0 ? zonesA : zonesB;
          const modular = spec.kind === "modular";
          const color = modular ? BLOCK[zset[col]].clone() : new THREE.Color(t === 0 && tiers > 1 ? "#9AA8E6" : "#E6E9F2");
          const mat = fiberMat(color);
          const x = cx - li / 2 + bl / 2 + c * (bl + gap);
          const z = -wi / 2 + bw / 2 + r * (bw + gap);
          const y = y0 + hb + bh / 2 + t * (bh + gap);
          const mesh = add(new THREE.Mesh(rbox(bl, bh, bw, 0.012), mat), x, y, z);
          parts.blocks.push({ mesh, mat, col, row: r, tier: t, x0: x - hx, z0: z, y0: y, target: color.clone(), press: 0, f: modular ? zset[col] : 0, modular });
        }
      }
    }
    add(new THREE.Mesh(rbox(li, hf, wi, 0.01), matComf), cx, y0 + hb + hc + hf / 2, 0, parts.comfort);
    const hBand = hb + hc + hf;
    add(new THREE.Mesh(rbox(Ls, hBand, W, 0.03), matBand), cx, y0 + hBand / 2, 0, parts.band);
    add(new THREE.Mesh(rbox(Ls + 0.006, ht, W + 0.006, 0.022), matTop), cx, y0 + hBand + ht / 2 - 0.004, 0, parts.top);
  }

  return {
    group: g,
    parts,
    bh,
    setZones(z) {
      for (const b of parts.blocks) {
        if (!b.modular) continue;
        const f = (b.row === 0 ? z : zonesB)[b.col];
        if (f !== b.f) {
          b.f = f;
          b.target.copy(BLOCK[f]);
          b.press = 1;
        }
      }
    },
    update(st, dt, time) {
      const e = st.e || 0, sp = st.spread || 0, ta = st.topAway || 0;
      fade(parts.band, matBand, (st.band ?? 1) * (1 - smooth(0, 0.35, e)));
      for (const b of parts.blocks) {
        b.mesh.position.y = b.y0 + e * (0.09 + b.tier * 0.07);
        b.mesh.position.x = b.x0 + (slices > 1 ? 0 : (b.col - 1) * sp * 0.16);
        b.mesh.position.z = b.z0 + (rows > 1 ? (b.row - 0.5) * e * 0.12 : 0);
        if (b.press > 0) b.press = Math.max(0, b.press - dt * 2.2);
        b.mesh.scale.y = 1 - Math.sin(b.press * Math.PI) * 0.16;
        b.mat.color.lerp(b.target, 1 - Math.exp(-7 * dt));
      }
      for (const p of parts.comfort) p.mesh.position.y = p.y0 + e * 0.2 + ta * 0.4;
      fade(parts.comfort, matComf, 1 - smooth(0.2, 0.8, ta));
      const breathe = (st.air || 0) * Math.sin(time * 2.2) * 0.012;
      for (const p of parts.top) {
        p.mesh.position.y = p.y0 + e * 0.34 + ta * 0.75 + breathe;
        p.mesh.rotation.z = slices > 1 ? 0 : e * 0.05;
      }
      fade(parts.top, matTop, 1 - smooth(0.1, 0.7, ta));
      if (slices > 1) pivots[0].rotation.z = -(st.incline || 0) * 0.5;
      g.position.y = e * 0.02;
    },
  };
}

// Ko‘rpacha: uch bo‘lak, Z shaklida buklanadi. G‘ilofi adras.
function buildKorpacha() {
  const g = new THREE.Group();
  const Wk = 0.95, h = 0.08, gp = 0.004;
  const Ls = (L - 2 * gp) / 3;
  const mat = new THREE.MeshPhysicalMaterial({
    map: withRepeat(ikatTex("adras", false), 1, 9),
    bumpMap: withRepeat(quiltBump("wave"), 1.3, 2), bumpScale: 1.6,
    roughness: 0.7, sheen: 0.9, sheenRoughness: 0.35, sheenColor: new THREE.Color("#ffe6c4"),
  });
  const geo = rbox(Ls, h, Wk, 0.034);
  const mid = new THREE.Mesh(geo, mat);
  mid.position.y = h / 2;
  g.add(mid);
  const pv2 = new THREE.Group();
  pv2.position.set(Ls / 2 + gp / 2, h, 0);
  g.add(pv2);
  const s2 = new THREE.Mesh(geo, mat);
  s2.position.set(Ls / 2 + gp / 2, -h / 2, 0);
  pv2.add(s2);
  const pv0 = new THREE.Group();
  pv0.position.set(-(Ls / 2 + gp / 2), 1.5 * h, 0);
  g.add(pv0);
  const s0 = new THREE.Mesh(geo, mat);
  s0.position.set(-(Ls / 2 + gp / 2), -h, 0);
  pv0.add(s0);
  const api = {
    group: g,
    shadowW: Wk,
    shadowScale: 1,
    update(st) {
      const f = st.fold || 0;
      pv2.rotation.z = Math.PI * smooth(0, 0.5, f);
      pv0.rotation.z = -Math.PI * smooth(0.5, 1, f);
      api.shadowScale = lerp(1, 0.36, smooth(0, 1, f));
    },
  };
  return api;
}

// Topper: mavjud matras (xira) ustiga yotadi
function buildTopper(spec) {
  const g = new THREE.Group();
  const gh = 0.22;
  const ghostMat = new THREE.MeshStandardMaterial({ color: "#D5DAE8", roughness: 1, transparent: true, opacity: 0.5, depthWrite: false });
  const ghost = new THREE.Mesh(rbox(L - 0.02, gh, W - 0.02, 0.04), ghostMat);
  ghost.position.y = gh / 2;
  g.add(ghost);
  const tg = new THREE.Group();
  tg.position.y = gh;
  g.add(tg);
  const layers = [];
  if (spec.layers === 2) {
    const bottom = new THREE.Mesh(rbox(L, 0.03, W, 0.012), fiberMat(new THREE.Color("#E6E9F2")));
    bottom.position.y = 0.015;
    tg.add(bottom);
    const top = new THREE.Mesh(rbox(L, 0.032, W, 0.014), coverMat("wave"));
    top.position.y = 0.046;
    tg.add(top);
    layers.push({ mesh: top, y0: 0.046 });
  } else {
    const m = new THREE.Mesh(rbox(L, 0.04, W, 0.016), coverMat("grid", 2.4));
    m.position.y = 0.02;
    tg.add(m);
  }
  return {
    group: g,
    update(st) {
      const d = st.drop || 0;
      tg.position.y = gh + d * 0.55;
      tg.rotation.z = d * 0.07;
      tg.rotation.x = d * 0.03;
      for (const l of layers) l.mesh.position.y = l.y0 + (st.e || 0) * 0.18;
    },
  };
}

function makeModel(spec) {
  const inner = spec.kind === "korpacha" ? buildKorpacha() : spec.kind === "topper" ? buildTopper(spec) : buildLayered(spec);
  const root = new THREE.Group();
  root.add(inner.group);
  const shadow = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.001;
  shadow.renderOrder = -1;
  const sw = (inner.shadowW ?? W) * 1.35;
  shadow.scale.set(L * 1.22, sw, 1);
  root.add(shadow);
  return {
    root,
    inner,
    setZones: (z) => inner.setZones?.(z),
    update(st, dt, time) {
      inner.update(st, dt, time);
      shadow.material.opacity = 1 - 0.35 * (st.e || 0) - 0.4 * (st.drop || 0);
      shadow.scale.x = L * 1.22 * (inner.shadowScale ?? 1);
    },
  };
}

// Konstruktor uchun yotgan odam siluet
function buildFigure() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.45, transparent: true, opacity: 0.82 });
  const parts = [];
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 28, 18), mat);
  head.scale.set(1, 0.9, 1);
  head.position.x = -0.8;
  g.add(head);
  parts.push({ m: head, zone: 0, h: 0.095 * 0.9 });
  const cap = (r, len, x, z, sy, sz, zone) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 18), mat);
    m.rotation.z = Math.PI / 2;
    m.scale.set(sy, 1, sz);
    m.position.set(x, 0, z);
    g.add(m);
    parts.push({ m, zone, h: r * sy });
  };
  cap(0.15, 0.26, -0.43, 0, 0.55, 1.25, 0);
  cap(0.045, 0.4, -0.4, 0.25, 1, 1, 0);
  cap(0.045, 0.4, -0.4, -0.25, 1, 1, 0);
  cap(0.14, 0.12, -0.02, 0, 0.6, 1.2, 1);
  cap(0.065, 0.6, 0.5, 0.09, 1, 1, 2);
  cap(0.065, 0.6, 0.5, -0.09, 1, 1, 2);
  return { group: g, parts, sink: [0, 0, 0] };
}

// Hikoyaning 4-bobi: matrasdan havo chiqadi
function makeAir() {
  const N = 220;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 4);
  const rnd = rng(33);
  const seeds = Array.from({ length: N }, () => ({ x: (rnd() - 0.5) * 1.8, z: (rnd() - 0.5) * 1.3, ph: rnd(), sp: 0.1 + rnd() * 0.12, w: rnd() * 6.28 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 4));
  const mat = new THREE.PointsMaterial({ size: 0.04, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return {
    pts,
    update(time, air) {
      pts.visible = air > 0.01;
      if (!pts.visible) return;
      seeds.forEach((s, i) => {
        const u = (s.ph + time * s.sp) % 1;
        pos[i * 3] = s.x + Math.sin(time * 0.8 + s.w) * 0.04 * u;
        pos[i * 3 + 1] = 0.05 + u * 1.0;
        pos[i * 3 + 2] = s.z;
        col[i * 4] = 0.32;
        col[i * 4 + 1] = 0.42;
        col[i * 4 + 2] = 0.95;
        col[i * 4 + 3] = air * smooth(0, 0.15, u) * (1 - smooth(0.55, 1, u));
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}

/* ---------- Hikoya kalit kadrlari ---------- */
const KF = [
  { p: 0.0, az: -0.62, pol: 1.1, e: 0, sp: 0, ta: 0, band: 1, air: 0, tx: 0, zm: 1 },
  { p: 0.12, az: -0.5, pol: 1.08, e: 0, sp: 0, ta: 0, band: 1, air: 0, tx: 0, zm: 1 },
  { p: 0.26, az: -0.34, pol: 1.16, e: 1, sp: 0, ta: 0, band: 1, air: 0, tx: 0.55, zm: 1 },
  { p: 0.44, az: -0.18, pol: 1.16, e: 1, sp: 0, ta: 0, band: 1, air: 0, tx: 0.55, zm: 1 },
  { p: 0.54, az: -0.08, pol: 0.78, e: 0.3, sp: 1, ta: 1, band: 0, air: 0, tx: 0, zm: 1.3 },
  { p: 0.74, az: 0.06, pol: 0.74, e: 0.3, sp: 1, ta: 1, band: 0, air: 0, tx: 0, zm: 1.3 },
  { p: 0.86, az: 0.42, pol: 1.02, e: 0, sp: 0, ta: 0, band: 1, air: 1, tx: 0, zm: 1 },
  { p: 1.0, az: 0.62, pol: 1.06, e: 0, sp: 0, ta: 0, band: 1, air: 1, tx: 0, zm: 1 },
];
function sampleKF(p) {
  let i = 0;
  while (i < KF.length - 2 && p > KF[i + 1].p) i++;
  const a = KF[i], b = KF[i + 1];
  const t = smooth(a.p, b.p, p);
  const o = {};
  for (const k in a) o[k] = lerp(a[k], b[k], t);
  return o;
}

/* ---------- Kamera ---------- */
function fitDist(cam, fw, fh) {
  const vt = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  return Math.max(fh / 2 / vt, fw / 2 / (vt * cam.aspect));
}
function placeCamera(v) {
  const d = fitDist(v.cam, v.fw, v.fh) * (v.zm || 1);
  v.cam.position.set(
    v.tx + d * Math.sin(v.pol) * Math.sin(v.az),
    v.ty + d * Math.cos(v.pol),
    d * Math.sin(v.pol) * Math.cos(v.az),
  );
  v.cam.lookAt(v.tx, v.ty, 0);
}
const _p = new THREE.Vector3();
function project(cam, x, y, z, w, h) {
  _p.set(x, y, z).project(cam);
  return [((_p.x + 1) / 2) * w, ((1 - _p.y) / 2) * h];
}

/* ---------- Ishga tushirish ---------- */
export function init(S) {
  const rootEl = document.documentElement;
  const canvas = document.getElementById("gl");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    rootEl.classList.add("no-gl");
    return;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const hdr = document.querySelector(".hdr");
  const stageEl = document.querySelector(".story__stage");
  const annoGroups = Object.fromEntries([...document.querySelectorAll("#anno g")].map((g) => [g.dataset.a, g]));
  const annoLabels = Object.fromEntries([...document.querySelectorAll(".alabel")].map((l) => [l.dataset.a, l]));
  const storyTags = [...document.querySelectorAll("#storyTags .ztag")];
  const cfgTags = [...document.querySelectorAll("#cfgTags .ztag")];
  const views = new Map();
  const modalModels = new Map();
  const freshState = () => ({ e: 0, spread: 0, topAway: 0, band: 1, fold: 0, drop: 0, incline: 0, air: 0 });

  function createView(key) {
    const scene = new THREE.Scene();
    scene.environment = env;
    scene.environmentIntensity = 0.8;
    const keyL = new THREE.DirectionalLight(0xffffff, 1.4);
    keyL.position.set(-3, 5, 4);
    const rim = new THREE.DirectionalLight(0xc9d6ff, 0.6);
    rim.position.set(4, 3, -4);
    scene.add(keyL, rim, new THREE.HemisphereLight(0xf2f4ff, 0x40465e, 0.35));
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
    return {
      key, scene, cam, el: null, model: null, st: freshState(),
      product: key.startsWith("p:") ? byId[key.slice(2)] : null,
      hv: 0, az: -0.62, pol: 1.1, tx: 0, ty: 0.2, fw: 2.75, fh: 1.6,
    };
  }

  function ensureModel(v) {
    if (v.model || v.key === "modal") return;
    if (v.product) {
      v.model = makeModel(v.product.model);
      if (v.product.model.anim === "fold") v.st.fold = 1;
      if (v.product.model.anim === "land") v.st.drop = 1;
    } else if (v.key === "story") {
      v.model = makeModel(STORY_SPEC);
      v.air = makeAir();
      v.scene.add(v.air.pts);
    } else if (v.key === "config") {
      v.model = makeModel({ kind: "modular", core: 0.15, band: "ikat", quilt: "diamond", zones: S.config });
      v.figure = buildFigure();
      v.scene.add(v.figure.group);
    }
    v.scene.add(v.model.root);
  }

  function syncViews() {
    document.querySelectorAll("[data-view]").forEach((el) => {
      const key = el.dataset.view;
      if (!views.has(key)) views.set(key, createView(key));
      views.get(key).el = el;
    });
  }

  /* --- kartalar --- */
  function animCard(v, r, dt, vh) {
    const p = v.product;
    const a = p.model.anim;
    const t = S.reduced ? 0 : clamp((r.top + r.height / 2 - vh / 2) / (vh / 2), -1.2, 1.2);
    const peak = 1 - smooth(0.08, 0.8, Math.abs(t));
    const hvT = S.hover[p.id] ? 1 : 0;
    v.hv = S.reduced ? hvT : damp(v.hv, hvT, 6, dt);
    const hv = v.hv;
    const tgt = {};
    if (a === "explode") tgt.e = clamp(peak * 0.4 + hv * 0.6);
    if (a === "zones") { tgt.e = clamp(peak * 0.45 + hv * 0.55); tgt.spread = tgt.e; }
    if (a === "incline") { tgt.incline = clamp(peak + hv * 0.3); tgt.e = hv * 0.35; }
    if (a === "fold") tgt.fold = clamp(1 - peak * 1.1 - hv);
    if (a === "land") tgt.drop = clamp(1 - peak * 1.1 - hv);
    const k = S.reduced ? 1 : 1 - Math.exp(-7 * dt);
    for (const key in tgt) v.st[key] = lerp(v.st[key] || 0, tgt[key], k);
    v.az = -0.62 + t * 0.35 + hv * 0.2;
    v.pol = 1.1;
    v.fw = 2.95;
    v.fh = 1.6;
    v.tx = 0;
    v.ty = 0.2 + (v.st.e || 0) * 0.1 + (a === "land" ? 0.08 : 0);
  }

  /* --- hikoya --- */
  function animStory(v, r, dt, time) {
    const target = S.reduced ? 0.32 : S.story.p;
    v.sp = S.reduced || v.sp == null ? target : damp(v.sp, target, 5, dt);
    const k = sampleKF(v.sp);
    Object.assign(v.st, { e: k.e, spread: k.sp, topAway: k.ta, band: k.band, air: k.air });
    const idle = S.reduced ? 0 : 1 - smooth(0, 0.1, v.sp);
    const wide = r.width > 620;
    v.az = k.az + Math.sin(time * 0.5) * 0.12 * idle;
    v.pol = k.pol;
    v.tx = wide ? k.tx : 0;
    v.ty = 0.22 + k.e * 0.12;
    v.zm = k.zm;
    v.fw = wide ? 2.9 + k.tx : 3.05;
    v.fh = 2.0;
    v.model.setZones(S.story.zones);
    v.air.update(time, k.air);
  }

  function storyOverlay(v, r) {
    const sr = stageEl.getBoundingClientRect();
    const ox = r.left - sr.left, oy = r.top - sr.top;
    const parts = v.model.inner.parts;
    const gy = v.model.inner.group.position.y;
    const show = S.reduced ? 0 : smooth(0.22, 0.28, v.sp) * (1 - smooth(0.41, 0.47, v.sp));
    const block = parts.blocks[parts.blocks.length - 1];
    const layers = [
      ["cover", parts.top[0].mesh.position.y + 0.02],
      ["comfort", parts.comfort[0].mesh.position.y],
      ["core", block.mesh.position.y],
      ["base", parts.base[0].mesh.position.y],
    ];
    let prevBottom = -Infinity;
    const minX = ox + r.width * 0.74;
    for (const [name, y] of layers) {
      const g = annoGroups[name], lab = annoLabels[name];
      if (!g || !lab) continue;
      g.style.opacity = lab.style.opacity = show.toFixed(3);
      if (show <= 0.001) continue;
      const [px, py] = project(v.cam, L * 0.34, y + gy, W / 2, r.width, r.height);
      const ax = ox + px, ay = oy + py;
      const lw = lab.offsetWidth, lh = lab.offsetHeight;
      const lx = Math.min(sr.width - lw - 16, Math.max(ax + 56, minX));
      const ly = Math.max(ay - lh / 2, prevBottom + 8);
      prevBottom = ly + lh;
      lab.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
      const [line, dot] = g.children;
      line.setAttribute("x1", ax.toFixed(1));
      line.setAttribute("y1", ay.toFixed(1));
      line.setAttribute("x2", lx.toFixed(1));
      line.setAttribute("y2", (ly + lh / 2).toFixed(1));
      dot.setAttribute("cx", ax.toFixed(1));
      dot.setAttribute("cy", ay.toFixed(1));
    }
    const tagShow = S.reduced ? 0 : smooth(0.5, 0.55, v.sp) * (1 - smooth(0.72, 0.76, v.sp));
    placeTags(storyTags, v, r, ox, oy, tagShow);
  }

  function placeTags(tags, v, r, ox, oy, show) {
    const blocks = v.model.inner.parts.blocks;
    tags.forEach((tag, i) => {
      tag.style.opacity = show.toFixed(3);
      if (show <= 0.001) return;
      const b = blocks.find((x) => x.col === i && x.row === 0 && x.tier === 0);
      const [px, py] = project(v.cam, b.mesh.position.x, 0.02, W / 2 + 0.03, r.width, r.height);
      const tw = tag.offsetWidth, th = tag.offsetHeight;
      const x = clamp(ox + px - tw / 2, ox + 8, ox + r.width - tw - 8);
      const y = Math.min(oy + py + 10, oy + r.height - th - 10);
      tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
  }

  /* --- konstruktor --- */
  function animConfig(v, dt, time) {
    Object.assign(v.st, { e: 0.2, spread: 0.35, topAway: 1, band: 0 });
    v.model.setZones(S.config);
    v.az = -0.2 + (S.reduced ? 0 : Math.sin(time * 0.3) * 0.05);
    v.pol = 0.9;
    v.fw = 2.6;
    v.fh = 1.5;
    v.zm = 1.22;
    v.tx = 0;
    v.ty = 0.1;
  }
  function configAfterUpdate(v, dt) {
    const blocks = v.model.inner.parts.blocks;
    const bh = v.model.inner.bh;
    const gy = v.model.inner.group.position.y;
    const f = v.figure;
    for (const part of f.parts) {
      const b = blocks[part.zone];
      const top = gy + b.mesh.position.y + (bh / 2) * b.mesh.scale.y;
      const sinkT = (3 - S.config[part.zone]) * 0.016;
      f.sink[part.zone] = S.reduced ? sinkT : damp(f.sink[part.zone], sinkT, 4, dt);
      part.m.position.y = top + part.h - f.sink[part.zone];
    }
  }

  /* --- mahsulot oynasi --- */
  function animModal(v, dt) {
    if (v.id !== S.modal.id) {
      if (v.model) v.scene.remove(v.model.root);
      v.id = S.modal.id;
      if (!modalModels.has(v.id)) modalModels.set(v.id, makeModel(byId[v.id].model));
      v.model = modalModels.get(v.id);
      v.scene.add(v.model.root);
      v.st = freshState();
      v.az = -0.62;
      v.pol = 1.08;
      v.vel = 0;
    }
    const a = byId[v.id].model.anim;
    const ex = S.modal.explode;
    const k = S.reduced ? 1 : 1 - Math.exp(-8 * dt);
    if (a === "fold") v.st.fold = lerp(v.st.fold, ex, k);
    else if (a === "land") v.st.drop = lerp(v.st.drop, ex, k);
    else {
      v.st.e = lerp(v.st.e, ex, k);
      if (a === "zones") v.st.spread = v.st.e;
      if (a === "incline") v.st.incline = 0.7;
    }
    if (!v.dragging) {
      v.az += v.vel;
      v.vel *= 0.92;
      if (!S.reduced && Math.abs(v.vel) < 0.0005) v.az += dt * 0.12;
    }
    v.fw = 2.9;
    v.fh = 1.9;
    v.tx = 0;
    v.ty = 0.2 + v.st.e * 0.12 + (a === "land" ? 0.1 : 0);
  }
  function bindDrag(v) {
    const el = v.el;
    if (!el || v.dragBound) return;
    v.dragBound = true;
    el.addEventListener("pointerdown", (e) => {
      v.dragging = true;
      v.px = e.clientX;
      v.py = e.clientY;
      v.vel = 0;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!v.dragging) return;
      const dx = e.clientX - v.px, dy = e.clientY - v.py;
      v.px = e.clientX;
      v.py = e.clientY;
      v.vel = -dx * 0.008;
      v.az += v.vel;
      v.pol = clamp(v.pol - dy * 0.004, 0.45, 1.42);
    });
    const end = () => { v.dragging = false; };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  /* --- kadr --- */
  let cw = 0, ch = 0, cpr = 0, seen = -1, last = performance.now(), alive = true;
  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    alive = false;
    rootEl.classList.add("no-gl");
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const pr = Math.min(window.devicePixelRatio || 1, w < 700 ? 1.5 : 2);
    if (w !== cw || h !== ch || pr !== cpr) {
      cw = w;
      ch = h;
      cpr = pr;
      renderer.setPixelRatio(pr);
      renderer.setSize(w, h, false);
    }
  }

  function frame(now) {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    resize();
    if (S.gridVersion !== seen) {
      seen = S.gridVersion;
      syncViews();
    }
    renderer.setScissorTest(false);
    renderer.clear();
    renderer.setScissorTest(true);
    const modalOpen = S.modal.id != null && rootEl.classList.contains("modal-open");
    const clipTop = modalOpen ? 0 : Math.max(0, hdr.getBoundingClientRect().bottom);

    for (const v of views.values()) {
      if (modalOpen !== (v.key === "modal")) continue;
      const el = v.el;
      if (!el || !el.isConnected) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom <= clipTop || r.top >= ch || r.right <= 0 || r.left >= cw) continue;

      v.cam.aspect = r.width / r.height;
      v.cam.updateProjectionMatrix();
      if (v.key === "modal") {
        bindDrag(v);
        animModal(v, dt);
      } else {
        ensureModel(v);
        if (v.product) animCard(v, r, dt, ch);
        else if (v.key === "story") animStory(v, r, dt, time);
        else if (v.key === "config") animConfig(v, dt, time);
      }
      v.model.update(v.st, dt, time);
      if (v.figure) configAfterUpdate(v, dt);
      placeCamera(v);

      const top = Math.max(r.top, clipTop);
      const yGL = ch - r.bottom;
      renderer.setViewport(r.left, yGL, r.width, r.height);
      renderer.setScissor(r.left, Math.max(0, yGL), r.width, ch - top - Math.max(0, yGL));
      renderer.render(v.scene, v.cam);

      if (v.key === "story") storyOverlay(v, r);
      else if (v.key === "config") placeTags(cfgTags, v, r, 0, 0, 1);
    }
    requestAnimationFrame(frame);
  }

  syncViews();
  rootEl.classList.remove("no-gl");
  rootEl.classList.add("gl-ready");
  requestAnimationFrame(frame);
}
