// Umumiy holat, hodisalar shinasi, tarjima va narx yordamchilari
import uz from "./i18n/uz.js";
import ru from "./i18n/ru.js";
import { SIZES } from "./data.js";

const DICT = { uz, ru };

export const S = {
  lang: "uz",
  size: "160x200",
  cart: [],
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  glReady: false,
  // vitrina
  index: 0,
  // mahsulot oynasi
  sheet: { open: false, id: null, size: null, months: 12, scheme: null, explode: true },
  // scroll hikoyasi (0..1)
  story: { p: 0, zones: [2, 2, 2] },
};

const bus = new EventTarget();
export const emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));
export const on = (type, fn) => bus.addEventListener(type, (e) => fn(e.detail));

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export const store = {
  get(k, d) { try { const v = localStorage.getItem("tayanch:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tayanch:" + k, JSON.stringify(v)); } catch { /* ixtiyoriy */ } },
};

const plural = (n, a, b, c) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
};

export function t(key, vars = {}) {
  let s = DICT[S.lang][key] ?? DICT.uz[key] ?? key;
  s = s.replace(/\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}/g, (_, a, b, c) => plural(vars.n ?? 0, a, b, c));
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
// *so‘z* → <em>so‘z</em> (matn avval xavfsizlantiriladi)
export const tHTML = (key, vars) => esc(t(key, vars)).replace(/\*([^*]+)\*/g, "<em>$1</em>");
export const tList = (key) => t(key).split("|");

export function applyI18n(root = document) {
  document.documentElement.lang = S.lang;
  document.title = t("meta.title");
  $$("[data-i18n]", root).forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-html]", root).forEach((el) => { el.innerHTML = tHTML(el.dataset.i18nHtml); });
  $$("[data-i18n-aria]", root).forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $$("[data-i18n-ph]", root).forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPh)));
}

export const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
export const money = (n) => `${fmt(n)} ${t("cur")}`;
export const sizeLabel = (id) => id.replace("x", "×");
const sizeIdx = (id) => SIZES.findIndex((s) => s.id === id);
export const available = (p, size) => !p.maxSize || sizeIdx(size) <= sizeIdx(p.maxSize);
export const effSize = (p, size) => (available(p, size) ? size : p.maxSize);
const round10k = (n) => Math.round(n / 10000) * 10000;
export function priceOf(p, size) {
  const f = SIZES[sizeIdx(effSize(p, size))].f;
  const price = round10k(p.price * f);
  const old = p.disc ? round10k(price / (1 - p.disc / 100)) : null;
  return { price, old };
}
export const monthly = (price, n) => Math.ceil(price / n / 1000) * 1000;

export const firmBar = ([a, b]) =>
  `<span class="firm-bar" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i >= a && i <= b ? "on" + i : ""}"></i>`).join("")}</span>`;
export const firmText = ([a, b]) => (a === b ? t(`firm.${a}`) : `${t(`firm.${a}`)} – ${t(`firm.${b}`)}`);

// Analitika uchun ilgak: GA/Meta piksel ulanganda dataLayer orqali ketadi
export function track(event, data = {}) {
  try { (window.dataLayer = window.dataLayer || []).push({ event, ...data }); } catch { /* ixtiyoriy */ }
}

let toastTimer;
export function toast(msg, action) {
  const el = $("#toast");
  el.hidden = true;
  void el.offsetWidth;
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button" class="toast__btn">${esc(action.label)}</button>` : ""}`;
  if (action) $(".toast__btn", el).onclick = () => { el.hidden = true; action.run(); };
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3600);
}

// Fokusni faqat klaviatura foydalanuvchisi uchun dasturiy ko‘chiramiz
export const input = { kbd: false };
addEventListener("keydown", (e) => { if (e.key === "Tab" || e.key.startsWith("Arrow") || e.key === "Enter" || e.key === " ") input.kbd = true; }, true);
addEventListener("pointerdown", () => { input.kbd = false; }, true);

export const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

// Dialoglar uchun fokus tuzog‘i (ichma-ich ochilishi mumkin: oyna ustida savat)
const traps = [];
export function trapFocus(el) {
  traps.push({ el, last: document.activeElement });
}
export function releaseFocus(el) {
  const i = traps.findIndex((x) => x.el === el);
  if (i < 0) return;
  const [x] = traps.splice(i, 1);
  x.last?.focus?.({ preventScroll: true });
}
document.addEventListener("keydown", (e) => {
  const top = traps[traps.length - 1]?.el;
  if (!top || e.key !== "Tab") return;
  const f = $$("button:not([disabled]), a[href], input:not([type=hidden]), select, [tabindex='0']", top).filter((x) => x.offsetParent !== null || x.getClientRects().length);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

// 3D modellardan olingan katalog rasmlari
export const THUMBS = new Map();
export const thumbImg = (id, alt = "") => {
  const u = THUMBS.get(id);
  return `<img data-thumb="${id}" alt="${esc(alt)}" decoding="async"${u ? ` src="${u}" class="is-loaded"` : ""}>`;
};

// Ochiq dialoglar soni: sahifa scrollini qulflash uchun
let locks = 0;
export function lockScroll(on) {
  const root = document.documentElement;
  if (on && locks === 0) root.style.setProperty("--sbw", `${window.innerWidth - root.clientWidth}px`);
  locks = Math.max(0, locks + (on ? 1 : -1));
  if (locks === 0) root.style.setProperty("--sbw", "0px");
  root.classList.toggle("is-locked", locks > 0);
}
