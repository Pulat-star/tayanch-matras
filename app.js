import { SIZES, PRODUCTS, COMPARE_IDS, PRESETS, T } from "./data.js";
import { ikatDataURL } from "./ikat.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// 3D sahna shu obyektni har kadrda o‘qiydi
const S = {
  lang: "uz",
  size: "160x200",
  type: "all",
  firm: 0,
  sort: "pop",
  story: { p: 0, zones: [2, 2, 2] },
  hover: {},
  config: [1, 3, 2],
  modal: { id: null, explode: 0, size: null, months: 12 },
  reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
  gridVersion: 0,
  cart: [],
};

const store = {
  get(k, d) { try { const v = localStorage.getItem("tayanch:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("tayanch:" + k, JSON.stringify(v)); } catch { /* saqlash ixtiyoriy */ } },
};

/* ---------- Til ---------- */
const plural = (n, a, b, c) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
};
function t(key, vars = {}) {
  let s = T[S.lang][key] ?? T.uz[key] ?? key;
  s = s.replace(/\{([^{}|]+)\|([^{}|]+)\|([^{}|]+)\}/g, (_, a, b, c) => plural(vars.n ?? 0, a, b, c));
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function applyI18n() {
  root.lang = S.lang;
  document.title = t("meta.title");
  $$("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  $$(".lang__b").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === S.lang)));
}

/* ---------- Narx ---------- */
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const money = (n) => `${fmt(n)} ${t("cur")}`;
const sizeLabel = (id) => id.replace("x", "×");
const sizeIdx = (id) => SIZES.findIndex((s) => s.id === id);
const available = (p, size) => !p.maxSize || sizeIdx(size) <= sizeIdx(p.maxSize);
const effSize = (p, size) => (available(p, size) ? size : p.maxSize);
const round10k = (n) => Math.round(n / 10000) * 10000;
function priceOf(p, size) {
  const f = SIZES[sizeIdx(effSize(p, size))].f;
  const price = round10k(p.price * f);
  const old = p.disc ? round10k(price / (1 - p.disc / 100)) : null;
  return { price, old };
}
const monthly = (price, n) => Math.ceil(price / n / 1000) * 1000;

const firmBar = ([a, b]) =>
  `<span class="firm__bar" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i >= a && i <= b ? "on" + i : ""}"></i>`).join("")}</span>`;
const firmText = ([a, b]) => (a === b ? t(`firm.${a}`) : `${t(`firm.${a}`)} – ${t(`firm.${b}`)}`);

/* ---------- Katalog ---------- */
const grid = $("#grid");

function badgesHTML(p) {
  let h = "";
  if (p.badge) h += `<span class="badge${p.badge === "new" ? " badge--new" : ""}">${esc(t("badge." + p.badge))}</span>`;
  if (p.disc) h += `<span class="badge badge--sale">−${p.disc}%</span>`;
  return h;
}

function cardHTML(p) {
  const ok = available(p, S.size);
  const { price, old } = priceOf(p, S.size);
  const inCart = S.cart.some((c) => c.id === p.id);
  return `<article class="card${ok ? "" : " is-off"}" data-id="${p.id}">
    <div class="card__view view" data-view="p:${p.id}" role="button" tabindex="0" aria-label="${esc(p.name)} — ${esc(t("card.more"))}">
      <div class="badges">${badgesHTML(p)}</div><div class="fallback"></div>
    </div>
    <div class="card__body">
      <div class="card__head"><h3 class="card__name">${esc(p.name)}</h3><span class="card__h">${t("card.h")} ${p.h} ${t("unit.cm")}</span></div>
      <p class="card__tag">${esc(t(`p.${p.id}.tag`))}</p>
      <div class="firm">${firmBar(p.firm)}<span>${esc(firmText(p.firm))}</span></div>
      <div class="price"><strong>${money(price)}</strong>${old ? `<s>${fmt(old)}</s>` : ""}</div>
      <p class="inst">${ok ? esc(t("card.inst", { x: fmt(monthly(price, 12)) })) : `<span class="nosize">${esc(t("card.nosize", { max: sizeLabel(p.maxSize) }))}</span>`}</p>
      <div class="card__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-act="more">${esc(t("card.more"))}</button>
        <button type="button" class="btn btn--primary btn--sm${inCart ? " is-done" : ""}" data-act="add">${esc(t(inCart ? "card.added" : "card.add"))}</button>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  let list = PRODUCTS.filter((p) => (S.type === "all" || p.type === S.type) && (!S.firm || (S.firm >= p.firm[0] && S.firm <= p.firm[1])));
  if (S.sort !== "pop") {
    const dir = S.sort === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => (priceOf(a, S.size).price - priceOf(b, S.size).price) * dir);
  }
  grid.innerHTML = list.map(cardHTML).join("");
  $("#catEmpty").hidden = list.length > 0;
  $("#catCount").textContent = t("cat.count", { n: list.length });
  S.hover = {};
  S.gridVersion++;
}

function setChips(group, value) {
  $$(".chip", group).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === String(value))));
}

function initFilters() {
  const sizeSel = $("#fSize");
  sizeSel.innerHTML = SIZES.map((s) => `<option value="${s.id}">${sizeLabel(s.id)}</option>`).join("");
  sizeSel.value = S.size;
  sizeSel.addEventListener("change", () => { S.size = sizeSel.value; store.set("size", S.size); renderGrid(); renderCompare(); });
  $("#fSort").addEventListener("change", (e) => { S.sort = e.target.value; renderGrid(); });
  $("#fType").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    S.type = b.dataset.v; setChips($("#fType"), S.type); renderGrid();
  });
  $("#fFirm").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    S.firm = +b.dataset.v; setChips($("#fFirm"), S.firm); renderGrid();
  });
  $("#catReset").addEventListener("click", () => {
    S.type = "all"; S.firm = 0; setChips($("#fType"), "all"); setChips($("#fFirm"), 0); renderGrid();
  });
  $$("[data-filter]").forEach((a) => a.addEventListener("click", () => {
    S.type = a.dataset.filter; setChips($("#fType"), S.type); renderGrid();
  }));

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".card"); if (!card) return;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "add") addToCart(card.dataset.id, S.size);
    else if (act === "more" || e.target.closest(".card__view")) openModal(card.dataset.id, e.target.closest("button, [tabindex]"));
  });
  grid.addEventListener("keydown", (e) => {
    const v = e.target.closest(".card__view");
    if (v && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openModal(v.closest(".card").dataset.id, v); }
  });
  const hover = (on) => (e) => { const c = e.target.closest?.(".card"); if (c) S.hover[c.dataset.id] = on; };
  grid.addEventListener("pointerover", hover(1));
  grid.addEventListener("pointerout", (e) => { const c = e.target.closest(".card"); if (c && !c.contains(e.relatedTarget)) S.hover[c.dataset.id] = 0; });
  grid.addEventListener("focusin", hover(1));
  grid.addEventListener("focusout", hover(0));
}

/* ---------- Solishtirish ---------- */
function renderCompare() {
  const ps = COMPARE_IDS.map((id) => byId[id]);
  const cell = (p, html) => `<td${p.id === "mohir-20" ? ' class="hl"' : ""}>${html}</td>`;
  const row = (label, fn) => `<tr><th scope="row">${esc(label)}</th>${ps.map((p) => cell(p, fn(p))).join("")}</tr>`;
  $("#ctable").innerHTML = `
    <thead><tr><td></td>${ps.map((p) => `<th scope="col"${p.id === "mohir-20" ? ' class="hl"' : ""}>${esc(p.name)}</th>`).join("")}</tr></thead>
    <tbody>
      ${row(t("cmp.h"), (p) => `${p.h} ${t("unit.cm")}`)}
      ${row(t("cmp.zones"), (p) => p.zones)}
      ${row(t("cmp.firm"), (p) => `${p.firm[0] === p.firm[1] ? p.firm[0] : p.firm.join("–")} ${firmBar(p.firm)}`)}
      ${row(t("cmp.schemes"), (p) => p.schemes)}
      ${row(t("cmp.load"), (p) => esc(t("cmp.upto", { n: p.load })))}
      ${row(t("cmp.cover"), () => esc(t("cmp.washable")))}
      ${row(t("cmp.warranty"), (p) => `${p.warranty} ${t("unit.y")}`)}
      ${row(t("cmp.price", { size: sizeLabel(S.size) }), (p) => `<span class="price-cell">${money(priceOf(p, S.size).price)}</span>`)}
    </tbody>`;
}

/* ---------- Zona konstruktori ---------- */
const schemeOf = (z) => z.join("-");
const presetOf = (z) => PRESETS.find((p) => p.z.join("") === z.join(""));

function renderConfig() {
  const cur = presetOf(S.config);
  $("#presets").innerHTML = PRESETS.map((p) => `
    <button type="button" class="preset" role="radio" aria-checked="${cur === p}" data-p="${p.id}">
      <b>${schemeOf(p.z)}</b><span>${esc(t("pr." + p.id))}</span><small>${esc(t("pr." + p.id + ".d"))}</small>
    </button>`).join("");
  $("#zctl").innerHTML = [0, 1, 2].map((zi) => `
    <div class="zrow">
      <span id="zl${zi}">${esc(t("zone." + zi))}</span>
      <div class="seg" role="radiogroup" aria-labelledby="zl${zi}">
        ${[1, 2, 3].map((f) => `<button type="button" role="radio" aria-checked="${S.config[zi] === f}" data-z="${zi}" data-f="${f}" title="${esc(t("firm." + f))}"><i class="sw sw--${f}"></i>${f}</button>`).join("")}
      </div>
    </div>`).join("");
  $("#cfgScheme").textContent = schemeOf(S.config);
  $("#cfgDesc").textContent = cur ? `${t("pr." + cur.id)}. ${t("pr." + cur.id + ".d")}` : t("pr.custom.d");
  setZoneTags($("#cfgTags"), S.config);
}

function setZoneTags(box, z) {
  $$(".ztag", box).forEach((el, i) => {
    el.dataset.f = z[i];
    el.innerHTML = `<b>${z[i]}</b>${esc(t("zone." + i))}`;
  });
}

function initConfig() {
  $("#presets").addEventListener("click", (e) => {
    const b = e.target.closest(".preset"); if (!b) return;
    S.config = [...PRESETS.find((p) => p.id === b.dataset.p).z];
    renderConfig();
    $(`.preset[data-p="${b.dataset.p}"]`)?.focus();
  });
  $("#zctl").addEventListener("click", (e) => {
    const b = e.target.closest("[data-z]"); if (!b) return;
    S.config[+b.dataset.z] = +b.dataset.f;
    S.config = [...S.config];
    renderConfig();
    $(`#zctl [data-z="${b.dataset.z}"][data-f="${b.dataset.f}"]`)?.focus();
  });
  $("#cfgAdd").addEventListener("click", () => addToCart("mohir-20", S.size, schemeOf(S.config)));
}

/* ---------- Savat ---------- */
const cartEl = $("#cart");

function addToCart(id, size, scheme = null) {
  const p = byId[id];
  const sz = effSize(p, size);
  const key = [id, sz, scheme].join("|");
  const item = S.cart.find((c) => c.key === key);
  if (item) item.qty++;
  else S.cart.push({ key, id, size: sz, scheme, qty: 1 });
  saveCart();
  toast(t("toast.added", { name: p.name }));
  const btn = $("#cartOpen");
  btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
}

function saveCart() {
  store.set("cart", S.cart);
  renderCart();
  $$(".card").forEach((c) => {
    const b = $('[data-act="add"]', c);
    const on = S.cart.some((i) => i.id === c.dataset.id);
    b.classList.toggle("is-done", on);
    b.textContent = t(on ? "card.added" : "card.add");
  });
}

function renderCart() {
  const n = S.cart.reduce((a, c) => a + c.qty, 0);
  const cnt = $("#cartCount");
  cnt.textContent = n;
  cnt.toggleAttribute("data-zero", n === 0);
  const body = $("#cartBody"), foot = $("#cartFoot");
  if (!S.cart.length) {
    body.innerHTML = `<div class="cempty"><p>${esc(t("cart.empty"))}</p><a class="btn btn--line" href="#catalog" data-close>${esc(t("cart.toCatalog"))}</a></div>`;
    foot.innerHTML = "";
    return;
  }
  let total = 0;
  body.innerHTML = S.cart.map((c) => {
    const p = byId[c.id];
    const sum = priceOf(p, c.size).price * c.qty;
    total += sum;
    const meta = [sizeLabel(c.size) + " " + t("unit.cm"), c.scheme && `${t("cfg.scheme")} ${c.scheme}`].filter(Boolean).join(" · ");
    return `<div class="citem" data-key="${esc(c.key)}">
      <div class="citem__thumb" aria-hidden="true"></div>
      <span class="citem__name">${esc(p.name)}</span>
      <span class="citem__price">${money(sum)}</span>
      <span class="citem__meta">${esc(meta)}</span>
      <div class="citem__ctl">
        <button type="button" class="link-btn" data-q="rm">${esc(t("cart.remove"))}</button>
        <div class="qty">
          <button type="button" data-q="-1" aria-label="${esc(t("cart.less"))}"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
          <output>${c.qty}</output>
          <button type="button" data-q="1" aria-label="${esc(t("cart.more"))}"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
        </div>
      </div>
    </div>`;
  }).join("");
  foot.innerHTML = `
    <div class="row"><span>${esc(t("cart.delivery"))}</span><span>${esc(t("cart.free"))}</span></div>
    <div class="row row--total"><span>${esc(t("cart.total"))}</span><span>${money(total)}</span></div>
    <small>${esc(t("cart.inst", { x: fmt(monthly(total, 12)) }))}</small>
    <button type="button" class="btn btn--primary" id="checkout">${esc(t("cart.checkout"))}</button>
    <small>${esc(t("cart.pay"))}</small>`;
}

function initCart() {
  $("#cartOpen").addEventListener("click", () => openDialog(cartEl, $("#cartOpen")));
  $("#cartBody").addEventListener("click", (e) => {
    const b = e.target.closest("[data-q]"); if (!b) return;
    const key = b.closest(".citem").dataset.key;
    const i = S.cart.findIndex((c) => c.key === key);
    if (b.dataset.q === "rm") S.cart.splice(i, 1);
    else {
      S.cart[i].qty += +b.dataset.q;
      if (S.cart[i].qty < 1) S.cart.splice(i, 1);
    }
    saveCart();
    const again = $(`.citem[data-key="${CSS.escape(key)}"] [data-q="${b.dataset.q}"]`);
    (again || $("#cartTitle")).focus?.();
  });
  $("#cartFoot").addEventListener("click", (e) => {
    if (e.target.id !== "checkout") return;
    S.cart = [];
    saveCart();
    closeDialog(cartEl);
    toast(t("toast.order"));
  });
}

/* ---------- Dialoglar ---------- */
let lastFocus = null;
let openEl = null;

function openDialog(el, from) {
  lastFocus = from || document.activeElement;
  openEl = el;
  el.hidden = false;
  document.body.style.overflow = "hidden";
  (el.querySelector("[data-close].icon-btn") || el.querySelector("button"))?.focus();
}
function closeDialog(el) {
  el.hidden = true;
  if (el.id === "modal") { S.modal.id = null; root.classList.remove("modal-open"); }
  document.body.style.overflow = "";
  openEl = null;
  lastFocus?.focus?.({ preventScroll: true });
}
document.addEventListener("click", (e) => {
  const c = e.target.closest("[data-close]");
  if (c && openEl && openEl.contains(c)) closeDialog(openEl);
});
document.addEventListener("keydown", (e) => {
  if (!openEl) return;
  if (e.key === "Escape") { closeDialog(openEl); return; }
  if (e.key !== "Tab") return;
  const f = $$("button:not([disabled]), a[href], input, select, [tabindex='0']", openEl).filter((x) => x.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* ---------- Mahsulot oynasi ---------- */
const modal = $("#modal");

function renderModal() {
  const p = byId[S.modal.id];
  if (!p) return;
  const { price, old } = priceOf(p, S.modal.size);
  const m = S.modal.months;
  const lab = $('label[for="mExplode"]');
  lab.dataset.i18n = p.model.anim === "fold" ? "m.fold" : p.model.anim === "land" ? "m.lift" : "m.explode";
  lab.textContent = t(lab.dataset.i18n);
  $("#mInfo").innerHTML = `
    <p class="eyebrow">${esc(t("t." + p.type))}${p.badge ? " · " + esc(t("badge." + p.badge)) : ""}</p>
    <h2 class="h2" id="mTitle">${esc(p.name)}</h2>
    <p class="desc">${esc(t(`p.${p.id}.desc`))}</p>
    <div class="firm">${firmBar(p.firm)}<span>${esc(firmText(p.firm))}</span></div>
    <div>
      <p class="h-label" id="mSizeL">${esc(t("m.size"))}, ${t("unit.cm")}</p>
      <div class="opts" role="radiogroup" aria-labelledby="mSizeL">
        ${SIZES.map((s) => `<button type="button" class="chip" role="radio" data-size="${s.id}" aria-checked="${s.id === S.modal.size}" aria-pressed="${s.id === S.modal.size}" ${available(p, s.id) ? "" : "disabled"}>${sizeLabel(s.id)}</button>`).join("")}
      </div>
    </div>
    <div class="mprice"><strong>${money(price)}</strong>${old ? `<s>${money(old)}</s>` : ""}</div>
    <div>
      <p class="h-label" id="mInstL">${esc(t("m.inst"))} · 0%</p>
      <div class="opts" role="radiogroup" aria-labelledby="mInstL">
        ${[3, 6, 12].map((n) => `<button type="button" class="chip" role="radio" data-months="${n}" aria-checked="${n === m}" aria-pressed="${n === m}">${esc(t("m.months", { n }))}</button>`).join("")}
      </div>
      <p class="minst">${esc(t("m.perMonth", { x: fmt(monthly(price, m)) }))}</p>
    </div>
    <button type="button" class="btn btn--primary" data-act="madd">${esc(t("card.add"))}</button>
    <dl class="specs">
      <dt>${esc(t("card.h"))}</dt><dd>${p.h} ${t("unit.cm")}</dd>
      <dt>${esc(t("m.core"))}</dt><dd>${esc(t(`p.${p.id}.core`))}</dd>
      <dt>${esc(t("m.cover"))}</dt><dd>${esc(t("m.coverV"))}</dd>
      <dt>${esc(t("m.load"))}</dt><dd>${esc(t("cmp.upto", { n: p.load }))}</dd>
      <dt>${esc(t("m.warranty"))}</dt><dd>${p.warranty} ${t("unit.y")}</dd>
      <dt>${esc(t("m.trial"))}</dt><dd>${p.trial} ${t("unit.n")}</dd>
    </dl>`;
}

function openModal(id, from) {
  const p = byId[id];
  S.modal.id = id;
  S.modal.size = effSize(p, S.size);
  S.modal.months = 12;
  S.modal.explode = 0;
  $("#mExplode").value = 0;
  renderModal();
  root.classList.add("modal-open");
  openDialog(modal, from);
}

function initModal() {
  $("#mInfo").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.size) { S.modal.size = b.dataset.size; renderModal(); $(`#mInfo [data-size="${b.dataset.size}"]`)?.focus(); }
    else if (b.dataset.months) { S.modal.months = +b.dataset.months; renderModal(); $(`#mInfo [data-months="${b.dataset.months}"]`)?.focus(); }
    else if (b.dataset.act === "madd") addToCart(S.modal.id, S.modal.size);
  });
  $("#mExplode").addEventListener("input", (e) => { S.modal.explode = e.target.value / 100; });
}

/* ---------- 3D hikoya: scroll holati ---------- */
const story = $("#story");
const stage = $(".story__stage");
const chapters = $$(".chapter");
const railItems = $$(".rail li");
const BOUNDS = [0, 0.2, 0.47, 0.77, 1];
let lastCh = 0;
let lastScheme = "";

function storyZones(p) {
  if (p < 0.57) return [2, 2, 2];
  if (p < 0.67) return [1, 3, 2];
  return [1, 2, 1];
}

function updateStory() {
  if (S.reduced) return;
  const r = story.getBoundingClientRect();
  const hdr = $(".hdr").getBoundingClientRect().bottom;
  const total = story.offsetHeight - stage.offsetHeight;
  const p = Math.min(1, Math.max(0, (hdr - r.top) / Math.max(1, total)));
  S.story.p = p;
  let ch = BOUNDS.findIndex((b, i) => i > 0 && p < b) - 1;
  if (ch < 0) ch = 3;
  if (ch !== lastCh) {
    chapters.forEach((c, i) => c.classList.toggle("is-on", i === ch));
    lastCh = ch;
  }
  railItems.forEach((li, i) => {
    const f = Math.min(1, Math.max(0, (p - BOUNDS[i]) / (BOUNDS[i + 1] - BOUNDS[i])));
    li.style.setProperty("--fill", f.toFixed(3));
    li.classList.toggle("is-on", i === ch);
  });
  const z = storyZones(p);
  S.story.zones = z;
  const sc = schemeOf(z) + S.lang;
  if (sc !== lastScheme) {
    lastScheme = sc;
    $("#storyScheme").textContent = schemeOf(z);
    const pr = presetOf(z);
    $("#storySchemeText").textContent = pr ? `${t("pr." + pr.id)}. ${t("pr." + pr.id + ".d")}` : "";
    setZoneTags($("#storyTags"), z);
  }
}

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; updateStory(); });
};

/* ---------- Maslahat formasi ---------- */
function formatPhone(v) {
  let d = v.replace(/\D/g, "");
  if (!d.startsWith("998")) d = "998" + d.replace(/^998/, "");
  d = d.slice(0, 12);
  const p = [d.slice(0, 3), d.slice(3, 5), d.slice(5, 8), d.slice(8, 10), d.slice(10, 12)].filter(Boolean);
  return "+" + p.join(" ");
}
function initLead() {
  const form = $("#leadForm"), phone = $("#leadPhone"), name = $("#leadName"), err = $("#leadErr");
  phone.addEventListener("focus", () => { if (!phone.value) phone.value = "+998 "; });
  phone.addEventListener("input", () => {
    const pos = phone.value.length;
    phone.value = formatPhone(phone.value);
    if (pos >= phone.value.length) phone.setSelectionRange(phone.value.length, phone.value.length);
  });
  phone.addEventListener("blur", () => { if (phone.value.replace(/\D/g, "") === "998") phone.value = ""; });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const badName = !name.value.trim();
    const badPhone = phone.value.replace(/\D/g, "").length !== 12;
    name.setAttribute("aria-invalid", String(badName));
    phone.setAttribute("aria-invalid", String(badPhone));
    if (badName || badPhone) {
      err.textContent = badName ? t("lead.errName") : t("lead.err");
      err.hidden = false;
      (badName ? name : phone).focus();
      return;
    }
    err.hidden = true;
    form.reset();
    toast(t("lead.ok"));
  });
}

/* ---------- Umumiy ---------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.hidden = true;
  void el.offsetWidth;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2800);
}

function renderAll() {
  applyI18n();
  renderGrid();
  renderCompare();
  renderConfig();
  renderCart();
  if (S.modal.id) renderModal();
  lastScheme = "";
  updateStory();
}

function initHeader() {
  const burger = $("#burger"), nav = $("#nav");
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) { burger.setAttribute("aria-expanded", "false"); nav.classList.remove("is-open"); }
  });
  $$(".lang__b").forEach((b) => b.addEventListener("click", () => {
    S.lang = b.dataset.lang;
    store.set("lang", S.lang);
    renderAll();
  }));
}

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch { return false; }
}

function boot() {
  const q = new URLSearchParams(location.search).get("lang");
  S.lang = q === "ru" || q === "uz" ? q : store.get("lang", (navigator.language || "").startsWith("ru") ? "ru" : "uz");
  S.size = SIZES.some((s) => s.id === store.get("size")) ? store.get("size") : "160x200";
  const saved = store.get("cart", []);
  S.cart = Array.isArray(saved) ? saved.filter((c) => byId[c.id] && c.qty > 0) : [];

  try { root.style.setProperty("--ikat", `url("${ikatDataURL()}")`); } catch { /* gradient zaxirasi qoladi */ }

  initHeader();
  initFilters();
  initConfig();
  initCart();
  initModal();
  initLead();
  renderAll();

  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    S.reduced = e.matches;
    chapters.forEach((c, i) => c.classList.toggle("is-on", S.reduced || i === lastCh));
  });
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  if (!webglOK()) { root.classList.add("no-gl"); return; }
  import("./scene.js")
    .then((m) => m.init(S))
    .catch((err) => { console.warn("3D yuklanmadi:", err); root.classList.add("no-gl"); });
}

boot();
