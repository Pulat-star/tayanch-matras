// 4 savollik tanlash testi → shaxsiy tavsiya (model, sxema, o‘lcham, sabablar)
import { S, $, t, esc, money, fmt, priceOf, monthly, sizeLabel, on, track, thumbImg, input } from "../core.js";
import { BY_ID, recommend } from "../data.js";

const Q = [
  { key: "pos", t: "qz.q1", opts: ["side", "back", "stomach", "mixed"] },
  { key: "weight", t: "qz.q2", opts: ["light", "mid", "heavy"] },
  { key: "pain", t: "qz.q3", opts: ["back", "shoulder", "none"] },
  { key: "partner", t: "qz.q4", opts: ["solo", "couple"] },
];

export function initQuiz(api) {
  const box = $("#quizBox");
  let step = 0;
  let ans = {};
  let res = null;
  let busy = false;

  function question(anim) {
    const q = Q[step];
    box.innerHTML = `
      <div class="qz__top mono"><span>${esc(t("qz.step", { i: step + 1 }))}</span>${step ? `<button type="button" class="qz__link" data-q="back">${esc(t("qz.back"))}</button>` : ""}</div>
      <div class="qz__bar"><i style="width:${((step + 0.35) / Q.length) * 100}%"></i></div>
      <div class="qz__stack${anim ? " qz__anim" : ""}">
        <h3 class="qz__q" id="qzQ">${esc(t(q.t))}</h3>
        <div class="qz__opts" role="group" aria-labelledby="qzQ">
          ${q.opts.map((o) => `<button type="button" class="qz__opt" data-a="${o}" aria-pressed="${ans[q.key] === o}"><i></i>${esc(t(`${q.t}.${o}`))}</button>`).join("")}
        </div>
      </div>`;
  }

  function result(anim) {
    const p = BY_ID[res.id];
    const { price } = priceOf(p, res.size);
    const meta = p.scheme ? t("qz.meta", { s: res.scheme.join("-"), size: sizeLabel(res.size) }) : `${sizeLabel(res.size)} ${t("unit.cm")}`;
    box.innerHTML = `
      <div class="qz__top mono"><span>${esc(t("qz.result"))}</span><button type="button" class="qz__link" data-q="restart">${esc(t("qz.restart"))}</button></div>
      <div class="qz__bar"><i style="width:100%"></i></div>
      <div class="qz__res${anim ? " qz__anim" : ""}">
        <div class="qz__img">${thumbImg(p.id, p.name)}</div>
        <div class="qz__info">
          <p class="qz__name">${esc(p.name)}</p>
          <p class="qz__meta mono">${esc(meta)}</p>
          <ul class="checks">${res.reasons.map((r) => `<li>${esc(t("qz.r." + r))}</li>`).join("")}</ul>
          <div class="qz__price"><strong>${money(price)}</strong></div>
          <p class="inst">${esc(t("sr.from", { x: fmt(monthly(price, 12)) }))}</p>
        </div>
        <div class="qz__cta">
          <button type="button" class="btn btn--accent" data-callback="${p.id}" data-size="${res.size}"${p.scheme ? ` data-scheme="${res.scheme.join("-")}"` : ""}>${esc(t("cta.callback"))}</button>
          <button type="button" class="btn btn--glass" data-q="open">${esc(t("qz.open"))}</button>
          <a class="btn btn--glass" data-phone href="tel:+998711234567">${esc(t("cta.call"))}</a>
        </div>
      </div>`;
  }

  const render = (anim = true) => (res ? result(anim) : question(anim));

  box.addEventListener("click", (e) => {
    const opt = e.target.closest(".qz__opt");
    if (opt && !busy) {
      const q = Q[step];
      ans[q.key] = opt.dataset.a;
      opt.setAttribute("aria-pressed", "true");
      box.querySelectorAll(".qz__opt").forEach((b) => { if (b !== opt) b.setAttribute("aria-pressed", "false"); });
      track("quiz_answer", { step: step + 1, value: opt.dataset.a });
      busy = true;
      setTimeout(() => {
        busy = false;
        if (step < Q.length - 1) step++;
        else {
          res = recommend(ans);
          track("quiz_complete", { id: res.id, scheme: res.scheme.join("") });
        }
        render();
        if (input.kbd) box.querySelector(".qz__opt, .qz__cta .btn")?.focus({ preventScroll: true });
      }, S.reduced ? 0 : 260);
      return;
    }
    const b = e.target.closest("[data-q]");
    if (!b) return;
    const a = b.dataset.q;
    if (a === "back") { step = Math.max(0, step - 1); render(); }
    else if (a === "restart") { step = 0; ans = {}; res = null; render(); }
    else if (a === "open") {
      api.openSheet(res.id, { scheme: res.scheme, size: res.size, from: "quiz" });
    }
  });

  on("lang", () => render(false));
  render(false);
}
