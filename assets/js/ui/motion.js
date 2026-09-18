// Sarlavha holati, bo‘limlarning paydo bo‘lishi, menyu, scroll hikoyasining boblari
import { S, $, $$, t, esc, clamp, on } from "../core.js";

export function initMotion() {
  const hdr = $("#hdr");
  const burger = $("#burger");
  const nav = $("#nav");

  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") !== "true";
    burger.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
    hdr.classList.toggle("is-solid", open || scrollY > 24);
  });
  nav.addEventListener("click", (e) => {
    if (!e.target.closest("a")) return;
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  });

  // Paydo bo‘lish: bir guruhdagi elementlar ketma-ket chiqadi
  const reveal = $$(".reveal");
  reveal.forEach((el) => {
    const sib = [...el.parentElement.children].filter((x) => x.classList.contains("reveal"));
    const i = sib.indexOf(el);
    if (i > 0) el.style.setProperty("--rd", `${Math.min(i, 6) * 0.07}s`);
  });
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveal.forEach((el) => io.observe(el));
  } else {
    reveal.forEach((el) => el.classList.add("is-in"));
  }

  // Scroll akti
  const sec = $("#inside");
  const chapters = $$(".chapter", sec);
  const rail = $$(".rail li", sec);
  const schemeEl = $("#stScheme");
  const tags = $$("#stTags .ztag");
  // Boblar scroll bo‘yicha: har biri sahna bosqichiga to‘g‘ri keladi
  const B = [0, 0.26, 0.44, 0.64, 0.86, 1];
  let lastCh = 0;
  let lastZ = "";

  function paintTags(z) {
    tags.forEach((el, i) => {
      el.dataset.f = z[i];
      el.innerHTML = `<b>${z[i]}</b>${esc(t("zone." + i))}`;
    });
  }

  function story() {
    const r = sec.getBoundingClientRect();
    const p = S.reduced ? 0.34 : clamp(-r.top / Math.max(1, r.height - innerHeight));
    S.act.p = p;
    let ch = 0;
    while (ch < B.length - 2 && p >= B[ch + 1]) ch++;
    if (!S.reduced && ch !== lastCh) {
      chapters.forEach((c, i) => c.classList.toggle("is-on", i === ch));
      lastCh = ch;
    }
    rail.forEach((li, i) => {
      li.style.setProperty("--fill", clamp((p - B[i]) / (B[i + 1] - B[i])).toFixed(3));
      li.classList.toggle("is-on", i === ch);
    });
    const z = p < 0.55 ? [2, 2, 2] : p < 0.61 ? [1, 3, 2] : [1, 2, 1];
    const zs = z.join("-");
    if (zs !== lastZ) {
      lastZ = zs;
      schemeEl.textContent = zs;
      paintTags(z);
    }
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      hdr.classList.toggle("is-solid", scrollY > 24 || nav.classList.contains("is-open"));
      story();
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  on("lang", () => { lastZ = ""; story(); });
  onScroll();
}
