// Savat va buyurtma: ro‘yxat → ma’lumotlar → tasdiq
import { S, $, $$, t, tList, esc, money, fmt, priceOf, monthly, effSize, sizeLabel, on, emit, store, track, toast, lockScroll, trapFocus, releaseFocus, thumbImg, input } from "../core.js";
import { BY_ID } from "../data.js";

const MINUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

export function initCart(api) {
  const el = $("#cart");
  const body = $("#cartBody");
  let view = "list";
  let orderNo = "";

  const total = () => S.cart.reduce((a, c) => a + priceOf(BY_ID[c.id], c.size).price * c.qty, 0);

  function counts() {
    const n = S.cart.reduce((a, c) => a + c.qty, 0);
    $$("[data-cart-count]").forEach((x) => {
      x.textContent = n;
      x.toggleAttribute("data-zero", n === 0);
    });
  }
  function save() {
    store.set("cart", S.cart);
    counts();
    emit("cart");
    if (isOpen()) render();
  }

  function add(id, size, scheme = null) {
    const p = BY_ID[id];
    if (!p) return;
    const sz = effSize(p, size);
    const key = [id, sz, scheme || ""].join("|");
    const it = S.cart.find((c) => c.key === key);
    if (it) it.qty++;
    else S.cart.push({ key, id, size: sz, scheme, qty: 1 });
    view = "list";
    save();
    toast(t("toast.added", { name: p.name }), { label: t("mb.cart"), run: open });
    $$(".cart-btn, .mbar [data-open-cart]").forEach((b) => {
      b.classList.remove("bump");
      void b.offsetWidth;
      b.classList.add("bump");
    });
    track("add_to_cart", { id, size: sz, scheme });
  }

  function listHTML() {
    const items = S.cart.map((c) => {
      const p = BY_ID[c.id];
      const meta = [`${sizeLabel(c.size)} ${t("unit.cm")}`, c.scheme && t("cart.scheme", { s: c.scheme })].filter(Boolean).join(" · ");
      return `<div class="citem" data-key="${esc(c.key)}">
        <div class="citem__img">${thumbImg(c.id)}</div>
        <span class="citem__name">${esc(p.name)}</span>
        <span class="citem__price">${money(priceOf(p, c.size).price * c.qty)}</span>
        <span class="citem__meta">${esc(meta)}</span>
        <div class="citem__ctl">
          <button type="button" class="link-btn" data-c="rm">${esc(t("cart.remove"))}</button>
          <div class="qty">
            <button type="button" data-c="-1" aria-label="${esc(t("cart.less"))}">${MINUS}</button>
            <output>${c.qty}</output>
            <button type="button" data-c="1" aria-label="${esc(t("cart.more"))}">${PLUS}</button>
          </div>
        </div>
      </div>`;
    }).join("");
    const sum = total();
    return `<div class="cart-list">${items}</div>
      <div class="cart-foot">
        <div class="row"><span>${esc(t("cart.delivery"))}</span><span>${esc(t("cart.free"))}</span></div>
        <div class="row row--total"><span>${esc(t("cart.total"))}</span><span>${money(sum)}</span></div>
        <small>${esc(t("cart.inst", { x: fmt(monthly(sum, 12)) }))}</small>
        <button type="button" class="btn btn--accent btn--block" data-c="next">${esc(t("cart.next"))}</button>
      </div>`;
  }

  function checkoutHTML() {
    return `<form class="checkout form" data-lead="order" novalidate>
      <button type="button" class="link-btn" data-c="back" style="align-self:flex-start">← ${esc(t("co.back"))}</button>
      <h3 class="h3">${esc(t("co.title"))}</h3>
      <div class="field"><label for="coName">${esc(t("lead.name"))}</label><input id="coName" name="name" autocomplete="name" required></div>
      <div class="field"><label for="coPhone">${esc(t("lead.phone"))}</label><input id="coPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+998 90 123 45 67" data-phone-input required></div>
      <div class="field"><label for="coCity">${esc(t("co.city"))}</label><div class="select"><select id="coCity" name="city">${tList("co.cities").map((c) => `<option>${esc(c)}</option>`).join("")}</select></div></div>
      <fieldset class="field fieldset">
        <legend>${esc(t("co.pay"))}</legend>
        <div class="radios">
          <label class="radio"><input type="radio" name="pay" value="card" checked>${esc(t("co.pay.card"))}</label>
          <label class="radio"><input type="radio" name="pay" value="cash">${esc(t("co.pay.cash"))}</label>
          <label class="radio"><input type="radio" name="pay" value="installment">${esc(t("co.pay.inst"))}</label>
        </div>
      </fieldset>
      <div class="row row--total"><span>${esc(t("cart.total"))}</span><span>${money(total())}</span></div>
      <p class="form__msg" role="status" hidden></p>
      <button type="submit" class="btn btn--accent btn--block">${esc(t("co.submit"))}</button>
    </form>`;
  }

  function render() {
    if (view === "done") {
      body.innerHTML = `<div class="done">
        <div class="done__ic">${CHECK}</div>
        <h3 class="h3">${esc(t("co.done", { n: orderNo }))}</h3>
        <p class="sec__text">${esc(t("co.doneText"))}</p>
        <button type="button" class="btn btn--glass" data-c="close">${esc(t("co.continue"))}</button>
      </div>`;
      return;
    }
    if (!S.cart.length) {
      body.innerHTML = `<div class="cart-empty"><p>${esc(t("cart.empty"))}</p><a class="btn btn--accent" href="#quiz" data-c="close">${esc(t("cart.toQuiz"))}</a></div>`;
      return;
    }
    body.innerHTML = view === "checkout" ? checkoutHTML() : listHTML();
  }

  const isOpen = () => !el.hidden;
  function open() {
    if (isOpen()) return;
    render();
    el.hidden = false;
    lockScroll(true);
    trapFocus(el);
    (input.kbd ? $(".drawer__head .icon-btn", el) : $(".drawer__panel", el)).focus({ preventScroll: true });
    track("view_cart");
  }
  function close() {
    if (!isOpen()) return;
    el.hidden = true;
    lockScroll(false);
    releaseFocus(el);
    if (view === "done") view = "list";
  }

  $$("[data-open-cart]").forEach((b) => b.addEventListener("click", open));
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-cart-close]")) { close(); return; }
    const b = e.target.closest("[data-c]");
    if (!b) return;
    const c = b.dataset.c;
    if (c === "close") {
      close();
      if (b.tagName === "A") {
        e.preventDefault();
        if (S.sheet.open) api.closeSheet();
        setTimeout(() => $(b.getAttribute("href"))?.scrollIntoView({ behavior: S.reduced ? "auto" : "smooth" }), 140);
      }
      return;
    }
    if (c === "next") { view = "checkout"; render(); $("#coName", body)?.focus(); track("begin_checkout", { value: total() }); return; }
    if (c === "back") { view = "list"; render(); return; }
    const row = b.closest(".citem");
    if (!row) return;
    const i = S.cart.findIndex((x) => x.key === row.dataset.key);
    if (i < 0) return;
    if (c === "rm") S.cart.splice(i, 1);
    else {
      S.cart[i].qty += Number(c);
      if (S.cart[i].qty < 1) S.cart.splice(i, 1);
    }
    const key = row.dataset.key;
    save();
    const again = $(`.citem[data-key="${CSS.escape(key)}"] [data-c="${c}"]`, body);
    (again || $(".drawer__head .icon-btn", el)).focus();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen()) {
      e.stopImmediatePropagation();
      close();
    }
  });

  on("lead:sent", ({ type, payload }) => {
    if (type !== "order") return;
    orderNo = String(Date.now()).slice(-6);
    track("purchase", { value: total(), items: payload.cart?.length || 0 });
    S.cart = [];
    view = "done";
    save();
    render();
    $(".done .btn", body)?.focus();
  });
  on("lang", () => { if (isOpen()) render(); });

  counts();
  return { add, open, close, isOpen };
}
