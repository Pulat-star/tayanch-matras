// Abr (ikat) naqsh: bo‘yalgan iplarning qatorma-qator siljishi chetlarni "tuklangan" qiladi.
// Kenglik bo‘yicha choksiz takrorlanadi.

export const IKAT_PAL = {
  ikat: ["#0B1B33", "#2C6B93", "#DCEAF4", "#8FC0DC"],
  gold: ["#123049", "#5189AC", "#F1F7FB", "#C8A86A"],
  adras: ["#153A5C", "#5189AC", "#F6F2E8", "#C8A86A"],
};

const hex = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export function drawIkat(ctx, w, h, pal = IKAT_PAL.ikat, reps = 6, seed = 11) {
  const cols = pal.map(hex);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let s = seed;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const P = w / reps;
  const off = new Float32Array(h);
  let cur = 0;
  for (let y = 0; y < h; y++) {
    if (y % 3 === 0) cur = (rnd() - 0.5) * P * 0.14;
    off[y] = cur;
  }
  for (let y = 0; y < h; y++) {
    const dy = Math.abs(y + 0.5 - h / 2) / (h / 2);
    for (let x = 0; x < w; x++) {
      const xx = x + off[y];
      const u = (((xx % P) + P) % P) / P;
      const v = 1 - Math.abs(u * 2 - 1) - dy;
      const u2 = ((((xx + P / 2) % P) + P) % P) / P;
      const v2 = (1 - Math.abs(u2 * 2 - 1)) * 0.5 - (1 - dy);
      let c = 0;
      if (v > 0.36) c = 3;
      else if (v > 0.2) c = 2;
      else if (v > 0.02) c = 1;
      else if (v2 > 0.12) c = 2;
      else if (v2 > 0) c = 1;
      const col = cols[c];
      const n = 0.9 + 0.1 * rnd() * (y & 1 ? 1 : 0.6);
      const i = (y * w + x) * 4;
      d[i] = col[0] * n;
      d[i + 1] = col[1] * n;
      d[i + 2] = col[2] * n;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function ikatDataURL(pal = IKAT_PAL.ikat) {
  const c = document.createElement("canvas");
  c.width = 480;
  c.height = 64;
  drawIkat(c.getContext("2d"), c.width, c.height, pal);
  return c.toDataURL("image/png");
}
