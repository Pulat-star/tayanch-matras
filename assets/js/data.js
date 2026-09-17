// Katalog: narx 160×200 uchun, qolgan o‘lchamlar koeffitsient bilan hisoblanadi.
export const SIZES = [
  { id: "80x190", f: 0.55 },
  { id: "90x200", f: 0.62 },
  { id: "120x200", f: 0.8 },
  { id: "140x200", f: 0.9 },
  { id: "160x200", f: 1 },
  { id: "180x200", f: 1.12 },
  { id: "200x200", f: 1.25 },
];

// model.kind: modular | classic | korpacha | topper
// model.anim (katalog va oyna uchun): zones | explode | incline | fold
export const PRODUCTS = [
  { id: "mohir-20", name: "Mohir 2.0", type: "modular", firm: [1, 3], h: 26, price: 17400000, disc: 10, badge: "hit",
    load: 140, zones: "3", schemes: "5", warranty: 10, trial: 100, scheme: [1, 3, 2],
    model: { kind: "modular", core: 0.15, band: "ikat", quilt: "diamond", zones: [1, 3, 2], anim: "zones" } },
  { id: "sokin-10", name: "Sokin 1.0", type: "modular", firm: [1, 2], h: 23, price: 12900000, disc: 10, badge: "lux",
    load: 110, zones: "3", schemes: "3", warranty: 10, trial: 100, scheme: [1, 2, 1],
    model: { kind: "modular", core: 0.12, band: "ikat", quilt: "wave", zones: [1, 2, 1], anim: "explode" } },
  { id: "choqqi-30", name: "Cho‘qqi 3.0", type: "modular", firm: [1, 3], h: 30, price: 29900000, disc: 10, badge: "couple",
    load: 160, zones: "3 × 2", schemes: "5 + 5", warranty: 12, trial: 100, scheme: [2, 3, 2],
    model: { kind: "modular", core: 0.18, tiers: 2, rows: 2, band: "gold", quilt: "diamond", zones: [2, 3, 2], anim: "explode" } },
  { id: "korpacha-air", name: "Ko‘rpacha Air", type: "korpacha", firm: [2, 2], h: 8, price: 3900000, disc: 0, badge: "local",
    load: 110, zones: "—", schemes: "—", warranty: 5, trial: 100, maxSize: "140x200",
    model: { kind: "korpacha", anim: "fold" } },
  { id: "tong-20", name: "Tong 20", type: "classic", firm: [2, 2], h: 20, price: 8400000, disc: 20, badge: "value",
    load: 110, zones: "—", schemes: "—", warranty: 7, trial: 100,
    model: { kind: "classic", core: 0.14, band: "knit", quilt: "grid", anim: "explode" } },
  { id: "mohir-21", name: "Mohir 2.1", type: "modular", firm: [1, 3], h: 26, price: 18900000, disc: 0, badge: "new",
    load: 140, zones: "3", schemes: "5", warranty: 10, trial: 100, scheme: [2, 2, 2],
    model: { kind: "modular", core: 0.15, band: "ikat", quilt: "diamond", zones: [2, 2, 2], slices: 3, anim: "incline" } },
  { id: "tong-pro", name: "Tong Pro 28", type: "classic", firm: [3, 3], h: 28, price: 11200000, disc: 20, badge: null,
    load: 160, zones: "—", schemes: "—", warranty: 10, trial: 100,
    model: { kind: "classic", core: 0.2, tiers: 2, band: "knit", quilt: "grid", anim: "explode" } },
  { id: "topper-lux", name: "Topper Lyuks", type: "topper", firm: [1, 1], h: 6, price: 4600000, disc: 10, badge: null,
    load: 120, zones: "—", schemes: "—", warranty: 3, trial: 30,
    model: { kind: "topper", layers: 2, anim: "explode" } },
  { id: "topper-yol", name: "Yo‘l topper", type: "topper", firm: [2, 2], h: 4, price: 3400000, disc: 10, badge: null,
    load: 120, zones: "—", schemes: "—", warranty: 3, trial: 30,
    model: { kind: "topper", layers: 1, anim: "none" } },
];

export const BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const COMPARE_IDS = ["sokin-10", "mohir-20", "choqqi-30", "tong-20", "tong-pro"];
export const SCHEMES = [[1, 3, 2], [2, 3, 2], [1, 2, 1], [2, 2, 2], [1, 2, 2]];

// Tanlash testi: javoblar → model, sxema, o‘lcham va sabablar
export function recommend({ pos, weight, pain, partner }) {
  const reasons = [];
  let id = "mohir-20";
  let scheme = [2, 2, 2];
  if (partner === "couple" && (weight === "heavy" || pain !== "none")) {
    id = "choqqi-30";
    reasons.push("couple");
  }
  if (pain === "back") { scheme = [1, 3, 2]; reasons.push("back"); }
  else if (pain === "shoulder") { scheme = [1, 2, 2]; reasons.push("shoulder"); }
  else if (pos === "side" && weight === "light") { id = partner === "couple" ? id : "sokin-10"; scheme = [1, 2, 1]; reasons.push("side", "light"); }
  else if (pos === "side") { scheme = [1, 2, 2]; reasons.push("side"); }
  else if (pos === "stomach") { scheme = [2, 3, 2]; reasons.push("stomach"); }
  if (weight === "heavy" && !reasons.includes("heavy")) {
    if (scheme.join("") === "222") scheme = [2, 3, 2];
    if (pos === "back" && pain === "none" && partner === "solo") id = "tong-pro";
    reasons.push("heavy");
  }
  if (pain !== "none" && (pos === "side" || pos === "stomach")) reasons.push(pos);
  if (weight === "light" && !reasons.includes("light")) reasons.push("light");
  if (reasons.length < 2) reasons.push("default");
  const size = partner === "couple" ? "160x200" : "90x200";
  return { id, scheme, size, reasons: [...new Set(reasons)].slice(0, 3) };
}
