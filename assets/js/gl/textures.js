// Protsedural teksturalar. Piksel sikllari o‘rniga vektor chizish ishlatiladi —
// hammasi birgalikda bir necha millisekundda tayyor bo‘ladi va asosiy oqimni to‘smaydi.
import * as THREE from "three";
import { drawIkat, IKAT_PAL } from "./ikat.js";

let aniso = 4;
export const setAniso = (a) => { aniso = a; };
const cache = new Map();
const memo = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

function makeCanvas(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  return c;
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Bir xil rasm (source) bir marta yuklanadi, takrorlanish har material uchun alohida
export function withRepeat(t, rx, ry) {
  const c = t.clone();
  c.repeat.set(rx, ry);
  c.needsUpdate = true;
  return c;
}
const rng = (seed) => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

const noiseTile = () => memo("noise", () => makeCanvas(32, 32, (g, w, h) => {
  const img = g.createImageData(w, h);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + r() * 165;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}));

// Tikuv naqshi: diamond | wave | grid. bump=true — relyef xaritasi (kulrang).
export const quilt = (kind, bump) => memo(`q-${kind}-${bump}`, () => tex(makeCanvas(256, 256, (g, S) => {
  const P = S / 4;
  g.fillStyle = bump ? "#3a3a3a" : "#E6E8F0";
  g.fillRect(0, 0, S, S);
  const puff = (cx, cy, r) => {
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (bump) {
      gr.addColorStop(0, "rgba(240,240,240,1)");
      gr.addColorStop(0.65, "rgba(160,160,160,.8)");
      gr.addColorStop(1, "rgba(58,58,58,0)");
    } else {
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.7, "rgba(248,249,253,.65)");
      gr.addColorStop(1, "rgba(248,249,253,0)");
    }
    g.fillStyle = gr;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  };
  const seam = () => {
    g.strokeStyle = bump ? "#000" : "rgba(104,112,140,.55)";
    g.lineWidth = bump ? 2.2 : 1.2;
  };
  if (kind === "diamond") {
    for (let i = -1; i <= 4; i++) {
      for (let j = -1; j <= 4; j++) {
        puff(i * P + P / 2, j * P, P * 0.62);
        puff(i * P, j * P + P / 2, P * 0.62);
      }
    }
    seam();
    g.beginPath();
    for (let k = -4; k <= 8; k++) {
      g.moveTo(k * P, 0); g.lineTo(k * P + S, S);
      g.moveTo(k * P, 0); g.lineTo(k * P - S, S);
    }
    g.stroke();
  } else if (kind === "wave") {
    const Q = P / 2;
    const wave = (y0) => {
      g.beginPath();
      for (let x = 0; x <= S; x += 8) {
        const y = y0 + Math.sin((x / S) * Math.PI * 4) * 6;
        if (x === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    };
    g.lineCap = "round";
    for (let j = -1; j <= 8; j++) {
      g.strokeStyle = bump ? "rgba(210,210,210,.5)" : "rgba(255,255,255,.7)";
      g.lineWidth = Q * 0.75;
      wave(j * Q + Q / 2);
      g.strokeStyle = bump ? "rgba(240,240,240,.7)" : "rgba(255,255,255,.9)";
      g.lineWidth = Q * 0.35;
      wave(j * Q + Q / 2);
    }
    seam();
    for (let j = 0; j <= 8; j++) wave(j * Q);
  } else {
    for (let i = -1; i <= 4; i++) for (let j = -1; j <= 4; j++) puff(i * P + P / 2, j * P + P / 2, P * 0.72);
    seam();
    g.beginPath();
    for (let k = 0; k <= 4; k++) {
      g.moveTo(k * P, 0); g.lineTo(k * P, S);
      g.moveTo(0, k * P); g.lineTo(S, k * P);
    }
    g.stroke();
  }
  g.globalAlpha = bump ? 0.22 : 0.06;
  g.fillStyle = g.createPattern(noiseTile(), "repeat");
  g.fillRect(0, 0, S, S);
  g.globalAlpha = 1;
}), !bump));

// Havo tolasi: chalkash iplar
export const fiber = () => memo("fiber", () => {
  const r = rng(21);
  const t = tex(makeCanvas(256, 256, (g, w, h) => {
    g.fillStyle = "#e4e6ea";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      g.strokeStyle = r() < 0.55 ? `rgba(255,255,255,${0.35 + r() * 0.4})` : `rgba(90,96,120,${0.12 + r() * 0.2})`;
      g.lineWidth = 0.5 + r() * 1.2;
      const x = r() * w, y = r() * h, s = 10 + r() * 30;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2, x + (r() - 0.5) * s * 2, y + (r() - 0.5) * s * 2, x + (r() - 0.5) * s, y + (r() - 0.5) * s);
      g.stroke();
    }
  }));
  t.repeat.set(2, 2);
  return t;
});

// Sovutuvchi qatlam: 3D to‘r teshiklari
export const mesh = () => memo("mesh", () => {
  const t = tex(makeCanvas(128, 128, (g, w, h) => {
    g.fillStyle = "#EEF0F6";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#AEB6CE";
    for (let y = 0; y < 8; y++) {
      for (let x = -1; x < 9; x++) {
        g.beginPath();
        g.arc(x * 16 + (y % 2 ? 8 : 0) + 4, y * 16 + 8, 3.2, 0, Math.PI * 2);
        g.fill();
      }
    }
  }));
  t.repeat.set(24, 12);
  return t;
});

// Klassik tasma: grafit trikotaj
export const knit = () => memo("knit", () => {
  const t = tex(makeCanvas(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 0.78 + 0.22 * Math.abs(Math.sin((x * Math.PI) / 4));
      g.fillStyle = `rgb(${(58 * v) | 0},${(63 * v) | 0},${(86 * v) | 0})`;
      g.fillRect(x, 0, 1, h);
    }
    g.fillStyle = "#d9deea";
    g.fillRect(0, 0, w, 3);
    g.fillRect(0, h - 3, w, 3);
  }));
  t.repeat.set(3, 1);
  return t;
});

// Abr (ikat) tasma
export const ikat = (pal = "ikat", piping = true) => memo(`ikat-${pal}-${piping}`, () => {
  const t = tex(makeCanvas(480, 64, (g, w, h) => {
    drawIkat(g, w, h, IKAT_PAL[pal]);
    if (piping) {
      g.fillStyle = "#e9ecf5";
      g.fillRect(0, 0, w, 3);
      g.fillRect(0, h - 3, w, 3);
    }
  }));
  t.repeat.set(2, 1);
  return t;
});

// Yumshoq dog‘lar: soya, pol yorug‘ligi, zarracha
export const radial = (kind) => memo(`radial-${kind}`, () => tex(makeCanvas(128, 128, (g, w, h) => {
  if (kind === "shadow") {
    for (let i = 0; i < 18; i++) {
      const s = i * 3.2, r = Math.max(4, 30 - i);
      g.fillStyle = "rgba(0,0,0,0.07)";
      g.beginPath();
      g.moveTo(s + r, s);
      g.arcTo(w - s, s, w - s, h - s, r);
      g.arcTo(w - s, h - s, s, h - s, r);
      g.arcTo(s, h - s, s, s, r);
      g.arcTo(s, s, w - s, s, r);
      g.fill();
    }
    return;
  }
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  if (kind === "dot") {
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.35, "rgba(255,255,255,.55)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
  } else if (kind === "ring") {
    gr.addColorStop(0, "rgba(255,255,255,0)");
    gr.addColorStop(0.72, "rgba(255,255,255,0)");
    gr.addColorStop(0.86, "rgba(255,255,255,1)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.3, "rgba(255,255,255,.45)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
})));

// Yorug‘lik ustuni: yuqoridan pastga so‘nadi
export const beam = () => memo("beam", () => tex(makeCanvas(16, 128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "rgba(255,255,255,.9)");
  gr.addColorStop(0.5, "rgba(255,255,255,.25)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
})));
