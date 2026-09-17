// Katalog panjarasi, filtrlar, o‘lcham tanlash va solishtirish jadvali
import { S, $, $$, t, esc, money, fmt, priceOf, monthly, available, sizeLabel, firmBar, firmText, on, emit, store, thumbImg } from "../core.js";
import { PRODUCTS, SIZES, COMPARE_IDS, BY_ID } from "../data.js";

export function initCatalog(api) {
  const grid = $("#grid");
  const fType = $("#fType");
  const fFirm = $("#fFirm");
  const fSize = $("#fSize");
  let type = "all";
  let firm = 0;

  const inCart = (id) => S.cart.some((c) => c.id === id);

  function card(p) {
    const ok = available(p, S.size);
    const { price, old } = priceOf(p, S.size);
    const added = inCart(p.id);
    const badges = [
      p.badge ? `<span class="badge${p.badge === "new" ? " badge--new" : ""}">${esc(t("badge." + p.badge))}</span>` : "",
      p.disc ? `<span class="badge badge--sale">−${p.disc}%</span>` : "",
    ].join("");
    return `<article class="card" data-id="${p.id}">
      <button type="button" class="card__media" data-act="open" aria-label="${esc(p.name)} — ${esc(t("card.more"))}">
        ${thumbImg(p.id)}<span class="card__ph"></span>
        <span class="badges">${badges}</span>
        <span class="card__open">${esc(t("sr.more"))} →</span>
      </button>
      <div class="card__body">
        <div class="card__head"><h3 class="card__name">${esc(p.name)}</h3><span class="card__h mono">${esc(t("card.h", { h: p.h }))}</span></div>
        <p class="card__tag">${esc(t(`p.${p.id}.tag`))}</p>
        <div class="firm">${firmBar(p.firm)}<span>${esc(firmText(p.firm))}</span></div>
        <div class="price"><strong>${money(price)}</strong>${old ? `<s>${fmt(old)}</s>` : ""}</div>
        <p class="inst${ok ? "" : " is-warn"}">${esc(ok ? t("sr.from", { x: fmt(monthly(price, 12)) }) : t("cat.nosize", { max: sizeLabel(p.maxSize) }))}</p>
        <div class="card__actions">
          <button type="button" class="btn btn--glass btn--sm" data-act="open">${esc(t("card.more"))}</button>
          <button type="button" class="btn btn--accent btn--sm${added ? " is-done" : ""}" data-act="add">${esc(t(added ? "card.added" : "card.add"))}</button>
        </div>
      </div>
    </article>`;
  }

  function render() {
    const list = PRODUCTS.filter((p) => (type === "all" || p.type === type) && (!firm || (firm >= p.firm[0] && firm <= p.firm[1])));
    grid.innerHTML = list.map(card).join("");
    $("#catEmpty").hidden = list.length > 0;
    $("#catCount").textContent = t("cat.count", { n: list.length });
  }

  function renderCompare() {
    const ps = COMPARE_IDS.map((id) => BY_ID[id]);
    const hl = (p) => (p.id === "mohir-20" ? ' class="hl"' : "");
    const row = (label, fn) => `<tr><th scope="row">${esc(label)}</th>${ps.map((p) => `<td${hl(p)}>${fn(p)}</td>`).join("")}</tr>`;
    $("#ctable").innerHTML = `
      <thead><tr><td></td>${ps.map((p) => `<th scope="col"${hl(p)}><button type="button" data-open="${p.id}">${esc(p.name)}</button></th>`).join("")}</tr></thead>
      <tbody>
        ${row(t("cmp.h"), (p) => `${p.h} ${t("unit.cm")}`)}
        ${row(t("cmp.zones"), (p) => esc(p.zones))}
        ${row(t("cmp.firm"), (p) => `${p.firm[0] === p.firm[1] ? p.firm[0] : p.firm.join("–")}${firmBar(p.firm)}`)}
        ${row(t("cmp.schemes"), (p) => esc(p.schemes))}
        ${row(t("cmp.load"), (p) => esc(t("sh.loadV", { n: p.load })))}
        ${row(t("cmp.warranty"), (p) => `${p.warranty} ${t("unit.y")}`)}
        ${row(t("cmp.price", { size: sizeLabel(S.size) }), (p) => `<span class="pc">${money(priceOf(p, S.size).price)}</span>`)}
      </tbody>`;
  }

  const setChips = (group, v) => $$(".chip", group).forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.v === String(v))));

  fSize.innerHTML = SIZES.map((s) => `<option value="${s.id}">${sizeLabel(s.id)}</option>`).join("");
  fSize.value = S.size;
  fSize.addEventListener("change", () => {
    S.size = fSize.value;
    store.set("size", S.size);
    render();
    renderCompare();
    emit("size", S.size);
  });
  fType.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    type = b.dataset.v;
    setChips(fType, type);
    render();
  });
  fFirm.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    firm = Number(b.dataset.v);
    setChips(fFirm, firm);
    render();
  });
  $("#catReset").addEventListener("click", () => {
    type = "all";
    firm = 0;
    setChips(fType, type);
    setChips(fFirm, firm);
    render();
  });
  $$("[data-filter]").forEach((a) => a.addEventListener("click", () => {
    type = a.dataset.filter;
    firm = 0;
    setChips(fType, type);
    setChips(fFirm, firm);
    render();
  }));

  grid.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    const c = e.target.closest(".card");
    if (!b || !c) return;
    if (b.dataset.act === "open") api.openSheet(c.dataset.id, { from: "catalog" });
    else if (b.classList.contains("is-done")) api.openCart();
    else api.addToCart(c.dataset.id, S.size);
  });
  $("#ctable").addEventListener("click", (e) => {
    const b = e.target.closest("[data-open]");
    if (b) api.openSheet(b.dataset.open, { from: "compare" });
  });

  on("cart", () => {
    $$(".card", grid).forEach((c) => {
      const b = $('[data-act="add"]', c);
      const added = inCart(c.dataset.id);
      b.classList.toggle("is-done", added);
      b.textContent = t(added ? "card.added" : "card.add");
    });
  });
  on("lang", () => { render(); renderCompare(); });

  render();
  renderCompare();
}
