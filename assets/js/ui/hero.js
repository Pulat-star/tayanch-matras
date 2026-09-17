// Vitrina ostidagi mahsulot paneli: nom, narx, oylik to‘lov, tugmalar, strelkalar, avtoaylanish
import { S, $, $$, t, esc, money, fmt, priceOf, monthly, on, emit, track } from "../core.js";
import { PRODUCTS } from "../data.js";

export function initHero(api) {
  const card = $("#srCard");
  const dots = $("#srDots");
  const hero = $(".hero");
  const n = PRODUCTS.length;
  const pad = (x) => String(x).padStart(2, "0");
  dots.innerHTML = PRODUCTS.map((p, i) => `<button type="button" data-i="${i}" aria-current="false"><span class="vh">${esc(p.name)}</span></button>`).join("");

  let shown = -1;
  let swapTimer = 0;
  let interacted = false;

  function paint() {
    const p = PRODUCTS[S.index];
    const { price } = priceOf(p, S.size);
    card.innerHTML = `
      <div class="sr__who">
        <span class="sr__idx mono">${pad(S.index + 1)} / ${pad(n)}${p.badge ? ` · ${esc(t("badge." + p.badge))}` : ""}</span>
        <span class="sr__name">${esc(p.name)}</span>
        <span class="sr__tag">${esc(t(`p.${p.id}.tag`))}</span>
      </div>
      <div class="sr__price">
        <strong>${money(price)}</strong>
        <span>${esc(t("sr.from", { x: fmt(monthly(price, 12)) }))}</span>
      </div>
      <div class="sr__btns">
        <button type="button" class="btn btn--light btn--sm" data-act="open">${esc(t("sr.more"))}</button>
        <button type="button" class="btn btn--accent btn--sm" data-act="add">${esc(t("card.add"))}</button>
      </div>`;
  }

  function render(force = false) {
    if (S.index === shown && !force) return;
    const first = shown === -1;
    shown = S.index;
    $$("button", dots).forEach((b, k) => b.setAttribute("aria-current", String(k === S.index)));
    clearTimeout(swapTimer);
    if (first || force || S.reduced) {
      paint();
      card.classList.remove("is-swap");
      return;
    }
    card.classList.add("is-swap");
    swapTimer = setTimeout(() => { paint(); card.classList.remove("is-swap"); }, 160);
  }

  function go(i) {
    S.index = ((i % n) + n) % n;
    render();
    emit("showroom:goto", S.index);
  }

  $$("[data-sr]").forEach((b) => b.addEventListener("click", () => {
    interacted = true;
    go(S.index + Number(b.dataset.sr));
    track("showroom_arrow");
  }));
  dots.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    interacted = true;
    go(Number(b.dataset.i));
  });
  card.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    interacted = true;
    const p = PRODUCTS[S.index];
    if (b.dataset.act === "open") api.openSheet(p.id, { from: "hero" });
    else api.addToCart(p.id, S.size);
  });
  $(".sr").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target.closest(".sr__card")) return;
    e.preventDefault();
    interacted = true;
    go(S.index + (e.key === "ArrowRight" ? 1 : -1));
  });

  on("showroom:index", (i) => { S.index = i; render(); });
  on("showroom:open", (id) => {
    interacted = true;
    api.openSheet(id, { from: "hero" });
    track("showroom_click", { id });
  });
  on("showroom:interact", () => { interacted = true; });
  on("lang", () => render(true));
  on("size", () => render(true));

  // Avtoaylanish: foydalanuvchi tegmaguncha va vitrina ko‘rinib turganda
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.intersectionRatio > 0.5; }, { threshold: [0, 0.5, 1] }).observe(hero);
  setInterval(() => {
    if (interacted || S.reduced || !visible || S.sheet.open || document.hidden || !S.glReady) return;
    if (hero.matches(":hover") || hero.contains(document.activeElement)) return;
    go(S.index + 1);
  }, 6500);

  render(true);
}
