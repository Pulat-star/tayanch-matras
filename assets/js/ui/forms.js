// Barcha arizalar: maslahat, bir qadamda buyurtma, savatdan buyurtma
import { CONFIG } from "../config.js";
import { S, $$, t, emit, track } from "../core.js";

export function formatPhone(v) {
  let d = v.replace(/\D/g, "");
  if (d.startsWith("998")) d = d.slice(3);
  d = d.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return "+998" + (parts.length ? " " + parts.join(" ") : " ");
}

async function send(payload) {
  if (!CONFIG.leadEndpoint) {
    await new Promise((r) => setTimeout(r, 650));
    console.info("[demo] ariza:", payload);
    return true;
  }
  try {
    const r = await fetch(CONFIG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export function initForms(api) {
  $$("[data-phone]").forEach((a) => {
    a.href = "tel:" + CONFIG.phone;
    if (!a.children.length) a.textContent = CONFIG.phoneLabel;
  });
  $$("[data-telegram]").forEach((a) => {
    if (!CONFIG.telegram) return;
    a.href = CONFIG.telegram;
    a.target = "_blank";
    a.rel = "noopener";
    a.hidden = false;
  });

  const phoneInput = (e) => e.target.closest?.("[data-phone-input]");
  document.addEventListener("focusin", (e) => {
    const i = phoneInput(e);
    if (i && !i.value) i.value = "+998 ";
  });
  document.addEventListener("input", (e) => {
    const i = phoneInput(e);
    if (!i) return;
    i.value = formatPhone(i.value);
    i.removeAttribute("aria-invalid");
  });
  document.addEventListener("focusout", (e) => {
    const i = phoneInput(e);
    if (i && i.value.replace(/\D/g, "") === "998") i.value = "";
  });

  document.addEventListener("submit", async (e) => {
    const form = e.target.closest("form[data-lead]");
    if (!form) return;
    e.preventDefault();
    const type = form.dataset.lead;
    const msg = form.querySelector(".form__msg");
    const name = form.elements.namedItem("name");
    const phone = form.elements.namedItem("phone");
    const badName = !!name && !name.value.trim();
    const badPhone = phone.value.replace(/\D/g, "").length !== 12;
    name?.setAttribute("aria-invalid", String(badName));
    phone.setAttribute("aria-invalid", String(badPhone));
    const say = (text, ok) => {
      msg.textContent = text;
      msg.classList.toggle("is-ok", ok);
      msg.hidden = false;
    };
    if (badName || badPhone) {
      say(t(badName ? "form.errName" : "form.errPhone"), false);
      (badName ? name : phone).focus();
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    const label = btn.textContent;
    btn.setAttribute("aria-busy", "true");
    btn.textContent = t("form.sending");
    msg.hidden = true;
    const payload = {
      type,
      lang: S.lang,
      page: location.href,
      ...Object.fromEntries(new FormData(form)),
      ...(api.leadExtra?.(type) || {}),
    };
    const ok = await send(payload);
    btn.removeAttribute("aria-busy");
    btn.textContent = label;
    if (!ok) {
      say(t("form.fail", { phone: CONFIG.phoneLabel }), false);
      return;
    }
    track("generate_lead", { type });
    if (type !== "order") {
      form.reset();
      say(t("form.ok"), true);
    }
    emit("lead:sent", { type, payload });
  });
}
