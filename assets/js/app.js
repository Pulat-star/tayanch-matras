// Ishga tushirish: avval interfeys (darhol), keyin 3D (fonda, brauzer bo‘shaganda)
import { S, $$, applyI18n, store, emit, on, track } from "./core.js";
import { SIZES, BY_ID } from "./data.js";
import { ikatDataURL } from "./gl/ikat.js";
import { initHero } from "./ui/hero.js";
import { initCatalog } from "./ui/catalog.js";
import { initSheet } from "./ui/sheet.js";
import { initCallback } from "./ui/callback.js";
import { initQuiz } from "./ui/quiz.js";
import { initForms } from "./ui/forms.js";
import { initMotion } from "./ui/motion.js";

const html = document.documentElement;

function pickLang() {
  const q = new URLSearchParams(location.search).get("lang");
  if (q === "uz" || q === "ru") return q;
  const saved = store.get("lang", null);
  if (saved === "uz" || saved === "ru") return saved;
  return (navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "uz";
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function loadGL() {
  if (!webglOK()) {
    html.classList.add("no-gl");
    return;
  }
  const go = () => import("./gl/engine.js")
    .then((m) => m.boot())
    .catch((err) => {
      console.warn("3D yuklanmadi:", err);
      html.classList.add("no-gl");
    });
  if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 600 });
  else setTimeout(go, 50);
}

function boot() {
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch { /* ixtiyoriy */ }
  S.lang = pickLang();
  const size = store.get("size", null);
  if (SIZES.some((s) => s.id === size)) S.size = size;
  try { html.style.setProperty("--ikat", `url("${ikatDataURL()}")`); } catch { /* gradient zaxirasi qoladi */ }

  applyI18n();
  const setLangButtons = () => $$(".lang__b").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === S.lang)));
  setLangButtons();

  const api = {};
  const callback = initCallback();
  const sheet = initSheet(api);
  Object.assign(api, {
    openSheet: sheet.open,
    closeSheet: sheet.close,
    openCallback: callback.open,
    leadExtra(type) {
      if (type !== "callback") return {};
      const c = callback.context();
      return c ? { product: c.id, size: c.size || null, scheme: c.scheme || null } : {};
    },
  });
  initHero(api);
  initCatalog(api);
  initQuiz(api);
  initForms(api);
  initMotion(api);

  $$(".lang__b").forEach((b) => b.addEventListener("click", () => {
    if (S.lang === b.dataset.lang) return;
    S.lang = b.dataset.lang;
    store.set("lang", S.lang);
    applyI18n();
    setLangButtons();
    emit("lang", S.lang);
    track("language", { lang: S.lang });
  }));
  $$("[data-track]").forEach((a) => a.addEventListener("click", () => track(a.dataset.track)));

  // 3D rasmlar tayyor bo‘lganda sahifadagi barcha joylarga qo‘yiladi
  on("thumb", ({ id, url }) => {
    $$(`img[data-thumb="${id}"]:not([src])`).forEach((img) => {
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.src = url;
    });
  });

  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => { S.reduced = e.matches; });

  const m = location.hash.match(/^#p\/([\w-]+)/);
  if (m && BY_ID[m[1]]) sheet.open(m[1]);

  loadGL();
}

boot();
