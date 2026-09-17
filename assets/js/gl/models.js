// Matras modellari koddan yasaladi. Koordinatalar: x — uzunlik, y — qalinlik (0 = pastki yuz), z — kenglik.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import * as TX from "./textures.js";

export const L = 2.0;
export const BLOCK = { 1: new THREE.Color("#C9D6F7"), 2: new THREE.Color("#7D92E3"), 3: new THREE.Color("#2C3F9E") };

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;

const geoCache = new Map();
export function rbox(w, h, d, r) {
  const k = [w, h, d, r].map((n) => n.toFixed(4)).join();
  if (!geoCache.has(k)) geoCache.set(k, new RoundedBoxGeometry(w, h, d, 3, r));
  return geoCache.get(k);
}
const planeGeo = new THREE.PlaneGeometry(1, 1);

// Umumiy (o‘zgarmaydigan) materiallar
let shared = null;
function sharedMats() {
  if (shared) return shared;
  shared = {
    base: new THREE.MeshStandardMaterial({ color: "#23283C", roughness: 0.95 }),
    frame: new THREE.MeshStandardMaterial({ color: "#2F3448", roughness: 0.5, metalness: 0.2 }),
    shadow: new THREE.MeshBasicMaterial({ map: TX.radial("shadow"), transparent: true, depthWrite: false, toneMapped: false, fog: false }),
  };
  return shared;
}

// Shaffofligi o‘zgaradigan materiallar doim transparent — dastur (shader) almashmaydi
const fabric = (opts) => new THREE.MeshPhysicalMaterial({
  roughness: 0.88, sheen: 0.6, sheenRoughness: 0.6, sheenColor: new THREE.Color("#dfe5ff"),
  transparent: true, ...opts,
});
// Vitrinadagi yon mahsulotlarni xiralashtirish: faqat rang (uniform) o‘zgaradi, shader emas
function tinter(mats) {
  for (const m of mats) m.userData.base = m.color.clone();
  return (v) => { for (const m of mats) m.color.copy(m.userData.base).multiplyScalar(v); };
}
function fade(list, mat, o) {
  mat.opacity = o;
  mat.depthWrite = o > 0.98;
  const vis = o > 0.01;
  for (const m of list) m.visible = vis;
}

function buildLayered(spec) {
  const g = new THREE.Group();
  const W = spec.W || 1.0;
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
  const M = sharedMats();

  const matBand = fabric({
    map: spec.band === "knit" ? TX.knit() : TX.ikat(spec.band === "gold" ? "gold" : "ikat"),
    bumpMap: TX.fiber(), bumpScale: 0.6, roughness: 0.8, sheen: 0.35,
  });
  const matTop = fabric({
    map: TX.withRepeat(TX.quilt(spec.quilt, false), (4 * Ls) / L, 2 * W),
    bumpMap: TX.withRepeat(TX.quilt(spec.quilt, true), (4 * Ls) / L, 2 * W),
    bumpScale: 3,
  });
  const matComf = new THREE.MeshStandardMaterial({ map: TX.mesh(), roughness: 0.9, transparent: true });
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
      mesh.userData.y0 = y;
      pivot.add(mesh);
      if (list) list.push(mesh);
      return mesh;
    };
    if (frameH) add(new THREE.Mesh(rbox(Ls, frameH, W + 0.04, 0.01), M.frame), cx, frameH / 2, 0);
    const y0 = frameH;
    const li = slices > 1 ? Ls - 0.004 : Ls - ins * 2;
    const wi = W - ins * 2;
    add(new THREE.Mesh(rbox(li, hb, wi, 0.008), M.base), cx, y0 + hb / 2, 0, parts.base);

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
          const mat = new THREE.MeshStandardMaterial({ map: TX.fiber(), color, roughness: 0.95 });
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

  const H = frameH + hb + hc + hf + ht;
  const tmp = new THREE.Vector3();
  return {
    group: g,
    W, H, bh, layered: true,
    setTint: tinter([matBand, matTop, matComf]),
    parts,
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
    // Izoh nuqtalari (model koordinatalarida). side: +1 yoki −1 — qaysi uchida
    anchors(side = 1) {
      const gy = g.position.y;
      const x = side * L * 0.3;
      const last = parts.blocks.filter((b) => b.row === 0).reduce((a, b) => (b.mesh.position.y > a.mesh.position.y ? b : a));
      return [
        ["cover", tmp.set(x, parts.top[0].position.y + gy + ht / 2, W / 2).clone()],
        ["comfort", tmp.set(x, parts.comfort[0].position.y + gy, W / 2).clone()],
        ["core", tmp.set(x, last.mesh.position.y + gy, W / 2).clone()],
        ["base", tmp.set(x, parts.base[0].position.y + gy, W / 2).clone()],
      ];
    },
    zoneAnchor(col) {
      const b = parts.blocks.find((x) => x.col === col && x.row === 0 && x.tier === 0);
      return tmp.set(b.mesh.position.x + (slices > 1 ? pivots[col].position.x : 0), 0.02, W / 2 + 0.03).clone();
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
      for (const m of parts.comfort) m.position.y = m.userData.y0 + e * 0.2 + ta * 0.4;
      fade(parts.comfort, matComf, 1 - smooth(0.2, 0.8, ta));
      const breathe = (st.air || 0) * Math.sin(time * 2.2) * 0.012;
      for (const m of parts.top) {
        m.position.y = m.userData.y0 + e * 0.34 + ta * 0.75 + breathe;
        m.rotation.z = slices > 1 ? 0 : e * 0.05;
      }
      fade(parts.top, matTop, 1 - smooth(0.1, 0.7, ta));
      if (slices > 1) pivots[0].rotation.z = -(st.incline || 0) * 0.5;
      g.position.y = e * 0.02;
    },
  };
}

// Ko‘rpacha: uch bo‘lak, Z shaklida buklanadi. G‘ilofi — adras.
function buildKorpacha() {
  const g = new THREE.Group();
  const W = 0.95, h = 0.08, gp = 0.004;
  const Ls = (L - 2 * gp) / 3;
  const mat = new THREE.MeshPhysicalMaterial({
    map: TX.withRepeat(TX.ikat("adras", false), 1, 9),
    bumpMap: TX.withRepeat(TX.quilt("wave", true), 1.3, 2),
    bumpScale: 1.6,
    roughness: 0.62, sheen: 0.9, sheenRoughness: 0.35, sheenColor: new THREE.Color("#ffe6c4"),
    transparent: true,
  });
  const geo = rbox(Ls, h, W, 0.034);
  const mid = new THREE.Mesh(geo, mat);
  mid.position.y = h / 2;
  const pv2 = new THREE.Group();
  pv2.position.set(Ls / 2 + gp / 2, h, 0);
  const s2 = new THREE.Mesh(geo, mat);
  s2.position.set(Ls / 2 + gp / 2, -h / 2, 0);
  pv2.add(s2);
  const pv0 = new THREE.Group();
  pv0.position.set(-(Ls / 2 + gp / 2), 1.5 * h, 0);
  const s0 = new THREE.Mesh(geo, mat);
  s0.position.set(-(Ls / 2 + gp / 2), -h, 0);
  pv0.add(s0);
  g.add(mid, pv2, pv0);
  const api = {
    group: g, W, H: h, layered: false, shadowScale: 1,
    setTint: tinter([mat]),
    update(st) {
      const f = st.fold || 0;
      pv2.rotation.z = Math.PI * smooth(0, 0.5, f);
      pv0.rotation.z = -Math.PI * smooth(0.5, 1, f);
      api.shadowScale = lerp(1, 0.36, smooth(0, 1, f));
    },
  };
  return api;
}

// Topper: yupqa bir yoki ikki qatlam
function buildTopper(spec) {
  const g = new THREE.Group();
  const W = 1.0;
  const layers = [];
  const mats = [];
  let H;
  if (spec.layers === 2) {
    const bottom = new THREE.Mesh(rbox(L, 0.03, W, 0.012), new THREE.MeshStandardMaterial({ map: TX.fiber(), color: "#E6E9F2", roughness: 0.95 }));
    bottom.position.y = 0.015;
    const top = new THREE.Mesh(rbox(L, 0.032, W, 0.014), fabric({
      map: TX.withRepeat(TX.quilt("wave", false), 4, 2),
      bumpMap: TX.withRepeat(TX.quilt("wave", true), 4, 2),
      bumpScale: 3,
    }));
    top.position.y = 0.046;
    g.add(bottom, top);
    mats.push(bottom.material, top.material);
    layers.push({ mesh: top, y0: 0.046 });
    H = 0.062;
  } else {
    const m = new THREE.Mesh(rbox(L, 0.04, W, 0.016), fabric({
      map: TX.withRepeat(TX.quilt("grid", false), 4, 2),
      bumpMap: TX.withRepeat(TX.quilt("grid", true), 4, 2),
      bumpScale: 2.4,
    }));
    m.position.y = 0.02;
    g.add(m);
    mats.push(m.material);
    H = 0.04;
  }
  return {
    group: g, W, H, layered: false,
    setTint: tinter(mats),
    update(st) {
      for (const l of layers) l.mesh.position.y = l.y0 + (st.e || 0) * 0.18;
    },
  };
}

export function makeModel(spec, { shadow = false } = {}) {
  const inner = spec.kind === "korpacha" ? buildKorpacha() : spec.kind === "topper" ? buildTopper(spec) : buildLayered(spec);
  const root = new THREE.Group();
  root.add(inner.group);
  let sh = null;
  if (shadow) {
    sh = new THREE.Mesh(planeGeo, sharedMats().shadow);
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.002;
    sh.renderOrder = -1;
    sh.scale.set(L * 1.2, inner.W * 1.5, 1);
    root.add(sh);
  }
  return {
    root,
    inner,
    W: inner.W,
    H: inner.H,
    layered: inner.layered,
    setZones: (z) => inner.setZones?.(z),
    setTint: (v) => inner.setTint?.(v),
    anchors: (side) => inner.anchors?.(side) || [],
    update(st, dt, time) {
      inner.update(st, dt, time);
      if (sh) sh.scale.x = L * 1.2 * (inner.shadowScale ?? 1);
    },
  };
}

// Konstruktor va hikoya uchun havo zarrachalari
export function makeAir(THREEref = THREE) {
  const N = 200;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 4);
  let s = 33;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const seeds = Array.from({ length: N }, () => ({ x: (r() - 0.5) * 1.8, z: (r() - 0.5) * 0.9, ph: r(), sp: 0.1 + r() * 0.12, w: r() * 6.28 }));
  const geo = new THREEref.BufferGeometry();
  geo.setAttribute("position", new THREEref.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREEref.BufferAttribute(col, 4));
  const mat = new THREEref.PointsMaterial({ size: 0.045, map: TX.radial("dot"), vertexColors: true, transparent: true, depthWrite: false });
  const pts = new THREEref.Points(geo, mat);
  pts.frustumCulled = false;
  return {
    pts,
    update(time, air) {
      pts.visible = air > 0.01;
      if (!pts.visible) return;
      seeds.forEach((q, i) => {
        const u = (q.ph + time * q.sp) % 1;
        pos[i * 3] = q.x + Math.sin(time * 0.8 + q.w) * 0.04 * u;
        pos[i * 3 + 1] = 0.05 + u * 1.1;
        pos[i * 3 + 2] = q.z;
        col[i * 4] = 0.55;
        col[i * 4 + 1] = 0.62;
        col[i * 4 + 2] = 1;
        col[i * 4 + 3] = air * smooth(0, 0.15, u) * (1 - smooth(0.55, 1, u));
      });
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
    },
  };
}
