// Qo‘ng‘iroq so‘rovi: saytdagi yagona maqsadli amal.
// Istalgan joydan data-callback="<mahsulot id>" bilan ochiladi.
import { S, $, t, esc, sizeLabel, on, track, lockScroll, trapFocus, releaseFocus, input } from "../core.js";
import { BY_ID } from "../data.js";

export function initCallback() {
  const el = $("#callback");
  const panel = $(".cb__panel", el);
  const prodEl = $("#cbProduct");
  const form = $("form", el);
  let ctx = null;
  let hideTimer = 0;

  function open(context = null) {
    ctx = context;
    if (context?.id && BY_ID[context.id]) {
      const p = BY_ID[context.id];
      const bits = [
        p.name,
        context.size ? `${sizeLabel(context.size)} ${t("unit.cm")}` : "",
        context.scheme ? `${t("sh.scheme")}: ${context.scheme}` : "",
      ].filter(Boolean);
      prodEl.innerHTML = `<b>${esc(t("cb.product"))}:</b> ${esc(bits.join(" · "))}`;
      prodEl.hidden = false;
    } else {
      prodEl.hidden = true;
    }
    form.reset();
    const msg = $(".form__msg", el);
    msg.hidden = true;
    $("[type=submit]", form).hidden = false;
    clearTimeout(hideTimer);
    el.hidden = false;
    lockScroll(true);
    trapFocus(el);
    requestAnimationFrame(() => el.classList.add("is-open"));
    (input.kbd ? $(".cb__x", el) : panel).focus({ preventScroll: true });
    track("callback_open", { id: context?.id || null });
  }

  function close() {
    if (el.hidden) return;
    el.classList.remove("is-open");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { el.hidden = true; }, 350);
    lockScroll(false);
    releaseFocus(el);
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-cb-close]")) { close(); return; }
    const b = e.target.closest("[data-callback]");
    if (!b) return;
    e.preventDefault();
    const id = b.dataset.callback || null;
    open(id ? { id, size: b.dataset.size || S.size, scheme: b.dataset.scheme || null } : null);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.hidden) {
      e.stopImmediatePropagation();
      close();
    }
  });
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='tel:']");
    if (a) track("call_click");
  });
  on("lead:sent", ({ type }) => {
    if (type !== "callback" || el.hidden) return;
    $("[type=submit]", form).hidden = true;
    hideTimer = setTimeout(close, 3200);
  });

  return { open, close, context: () => ctx, isOpen: () => !el.hidden };
}
