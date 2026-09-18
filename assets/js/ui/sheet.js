// Mahsulot oynasi: chapda 3D (vitrina sahnasining o‘zi), o‘ngda ma’lumot va xarid.
// Manzil #p/<id> bo‘ladi — havolani ulashish va «orqaga» tugmasi ishlaydi.
import { S, $, $$, t, tList, esc, money, fmt, priceOf, monthly, available, effSize, sizeLabel, firmBar, firmText, on, emit, track, lockScroll, trapFocus, releaseFocus, input } from "../core.js";
import { CONFIG } from "../config.js";
import { PRODUCTS, SIZES, SCHEMES, BY_ID } from "../data.js";

// iframe ichida manzilni o‘zgartirish taqiqlangan bo‘lishi mumkin — shuning uchun himoyalangan
const nav = {
  push(id) { try { history.pushState({ sheet: id }, "", `#p/${id}`); } catch { /* ixtiyoriy */ } },
  replace(id) { try { history.replaceState(history.state, "", `#p/${id}`); } catch { /* ixtiyoriy */ } },
  clear() {
    try {
      if (history.state?.sheet) history.back();
      else history.replaceState(null, "", location.pathname + location.search);
    } catch { /* ixtiyoriy */ }
  },
};

const IC = {
  moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z"/></svg>',
  truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
};

export function initSheet(api) {
  const el = $("#sheet");
  const bd = $("#sheetBackdrop");
  const panel = $("#shPanel");
  const toggle = $("#shToggle");
  toggle.removeAttribute("aria-pressed");
  let hideTimer = 0;

  function toggleLabel() {
    const p = BY_ID[S.sheet.id];
    const a = p.model.anim;
    toggle.hidden = a === "none";
    if (a === "fold") toggle.textContent = t(S.sheet.explode ? "sh.unfold" : "sh.fold");
    else toggle.textContent = t(S.sheet.explode ? "sh.assemble" : "sh.explode");
  }

  function render(focusSel) {
    const sh = S.sheet;
    const p = BY_ID[sh.id];
    const { price, old } = priceOf(p, sh.size);
    const m = sh.months;
    const perMonth = esc(t("sh.perMonth", { x: fmt(monthly(price, m)) }));
    const schemeAttr = sh.scheme ? ` data-scheme="${sh.scheme.join("-")}"` : "";
    panel.innerHTML = `<div class="shp">
      <div class="shp__head">
        <p class="eyebrow">${esc(t("t." + p.type))}${p.badge ? " · " + esc(t("badge." + p.badge)) : ""}</p>
        <h2 class="h2" id="shTitle">${esc(p.name)}</h2>
        <p class="shp__tag">${esc(t(`p.${p.id}.desc`))}</p>
        <div class="firm">${firmBar(p.firm)}<span>${esc(firmText(p.firm))}</span></div>
      </div>
      <div>
        <h3 class="shp__label">${esc(t("sh.fit"))}</h3>
        <ul class="checks">${tList(`p.${p.id}.fit`).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      </div>
      <div>
        <h3 class="shp__label" id="shSizeL">${esc(t("sh.size"))}</h3>
        <div class="opts" role="radiogroup" aria-labelledby="shSizeL">
          ${SIZES.map((s) => `<button type="button" class="chip" role="radio" data-size="${s.id}" aria-checked="${s.id === sh.size}"${available(p, s.id) ? "" : " disabled"}>${sizeLabel(s.id)}</button>`).join("")}
        </div>
      </div>
      ${sh.scheme ? `<div>
        <h3 class="shp__label" id="shSchL">${esc(t("sh.scheme"))}</h3>
        <div class="schemes" role="radiogroup" aria-labelledby="shSchL">
          ${SCHEMES.map((z) => `<button type="button" role="radio" data-scheme="${z.join("")}" aria-checked="${z.join("") === sh.scheme.join("")}"><span class="mini" aria-hidden="true">${z.map((f) => `<i class="sw--${f}"></i>`).join("")}</span>${z.join("-")}</button>`).join("")}
        </div>
        <p class="shp__hint">${esc(t("sh.schemeHint"))}</p>
      </div>` : ""}
      <div class="shp__buy">
        <div class="shp__price"><strong>${money(price)}</strong>${old ? `<s>${money(old)}</s><span class="save">${esc(t("sh.save", { x: fmt(old - price) }))}</span>` : ""}</div>
        <div>
          <h3 class="shp__label" id="shInstL">${esc(t("sh.inst"))}</h3>
          <div class="seg" role="radiogroup" aria-labelledby="shInstL">
            ${[3, 6, 12].map((k) => `<button type="button" role="radio" data-months="${k}" aria-checked="${k === m}">${esc(t("sh.months", { n: k }))}</button>`).join("")}
          </div>
          <p class="shp__month">${perMonth}</p>
        </div>
        <button type="button" class="btn btn--accent btn--block" data-callback="${p.id}" data-size="${sh.size}"${schemeAttr}>${esc(t("cb.submit"))}</button>
        <a class="btn btn--glass btn--block" data-phone href="tel:${CONFIG.phone}"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg><span>${esc(CONFIG.phoneLabel)}</span></a>
        <ul class="guar">
          <li>${IC.moon}${esc(t("sh.g1"))}</li>
          <li>${IC.truck}${esc(t("sh.g2"))}</li>
          <li>${IC.shield}${esc(t("sh.g3", { n: p.warranty }))}</li>
        </ul>
      </div>
      <div>
        <h3 class="shp__label">${esc(t("sh.specs"))}</h3>
        <dl class="specs">
          <dt>${esc(t("sh.h"))}</dt><dd>${p.h} ${t("unit.cm")}</dd>
          <dt>${esc(t("sh.core"))}</dt><dd>${esc(t(`p.${p.id}.core`))}</dd>
          <dt>${esc(t("sh.cover"))}</dt><dd>${esc(t("sh.coverV"))}</dd>
          <dt>${esc(t("sh.load"))}</dt><dd>${esc(t("sh.loadV", { n: p.load }))}</dd>
          <dt>${esc(t("sh.warranty"))}</dt><dd>${p.warranty} ${t("unit.y")}</dd>
          <dt>${esc(t("sh.trial"))}</dt><dd>${p.trial} ${t("unit.n")}</dd>
        </dl>
      </div>
      <div class="shp__sticky">
        <div><strong>${money(price)}</strong><span>${perMonth}</span></div>
        <button type="button" class="btn btn--accent btn--sm" data-callback="${p.id}" data-size="${sh.size}"${schemeAttr}>${esc(t("cta.callback"))}</button>
      </div>
    </div>`;
    toggleLabel();
    if (focusSel) $(focusSel, panel)?.focus();
  }

  function open(id, { scheme, size } = {}) {
    const p = BY_ID[id];
    if (!p) return;
    clearTimeout(hideTimer);
    const was = S.sheet.open;
    Object.assign(S.sheet, {
      open: true,
      id,
      size: effSize(p, size || (was ? S.sheet.size : S.size)),
      months: 12,
      scheme: p.scheme ? [...(scheme || p.scheme)] : null,
      explode: p.model.anim !== "fold",
    });
    render();
    panel.scrollTop = 0;
    const hash = `#p/${id}`;
    if (!was) {
      bd.hidden = false;
      el.hidden = false;
      lockScroll(true);
      trapFocus(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        bd.classList.add("is-open");
        el.classList.add("is-open");
      }));
      (input.kbd ? $("[data-sheet-close]", el) : panel).focus({ preventScroll: true });
      if (location.hash !== hash) nav.push(id);
      emit("sheet:open", { id });
    } else {
      nav.replace(id);
      emit("sheet:product", { id });
      if (S.sheet.scheme) emit("sheet:scheme", S.sheet.scheme);
    }
    track("view_item", { id });
  }

  function close({ fromPop = false } = {}) {
    if (!S.sheet.open) return;
    S.sheet.open = false;
    bd.classList.remove("is-open");
    el.classList.remove("is-open");
    emit("sheet:close");
    hideTimer = setTimeout(() => { bd.hidden = true; el.hidden = true; }, 750);
    lockScroll(false);
    releaseFocus(el);
    if (!fromPop) nav.clear();
  }

  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const sh = S.sheet;
    if (b.dataset.size) {
      sh.size = b.dataset.size;
      render(`[data-size="${b.dataset.size}"]`);
    } else if (b.dataset.months) {
      sh.months = Number(b.dataset.months);
      render(`[data-months="${b.dataset.months}"]`);
    } else if (b.dataset.scheme) {
      sh.scheme = b.dataset.scheme.split("").map(Number);
      render(`[data-scheme="${b.dataset.scheme}"]`);
      emit("sheet:scheme", sh.scheme);
      if (!sh.explode) {
        sh.explode = true;
        toggleLabel();
        emit("sheet:explode");
      }
      track("scheme_select", { id: sh.id, scheme: b.dataset.scheme });
    }
  });
  toggle.addEventListener("click", () => {
    S.sheet.explode = !S.sheet.explode;
    toggleLabel();
    emit("sheet:explode");
  });
  $$("[data-sheet-nav]", el).forEach((b) => b.addEventListener("click", () => {
    const n = PRODUCTS.length;
    const i = PRODUCTS.findIndex((p) => p.id === S.sheet.id);
    open(PRODUCTS[(i + Number(b.dataset.sheetNav) + n) % n].id);
  }));
  $("[data-sheet-close]", el).addEventListener("click", () => close());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.sheet.open) close();
  });
  addEventListener("popstate", () => {
    const m = location.hash.match(/^#p\/([\w-]+)/);
    if (m && BY_ID[m[1]]) {
      if (!S.sheet.open || S.sheet.id !== m[1]) open(m[1]);
    } else if (S.sheet.open) {
      close({ fromPop: true });
    }
  });
  on("lang", () => { if (S.sheet.open) render(); });

  return { open, close };
}
