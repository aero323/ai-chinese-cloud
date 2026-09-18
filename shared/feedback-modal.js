(function (global) {
  "use strict";

  const DEFAULT_BADGE = "🎉";
  const TIER_EMOJI = {
    correct: "🎉",
    correctFirstTry: "🏆",
    wrong: "💪"
  };
  const TIERS = ["correct", "correctFirstTry", "wrong"];
  let overlay = null;

  function ensureOverlay() {
    if (overlay && overlay.isConnected) return overlay;
    const doc = global.document;

    overlay = doc.createElement("div");
    overlay.className = "modal-overlay hidden";
    overlay.setAttribute("data-feedback-modal", "");

    const section = doc.createElement("section");
    section.className = "completion-modal";
    section.setAttribute("role", "dialog");
    section.setAttribute("aria-modal", "true");
    section.setAttribute("aria-labelledby", "feedback-modal-title");
    section.setAttribute("tabindex", "-1");

    const badge = doc.createElement("div");
    badge.className = "modal-badge";
    badge.setAttribute("data-feedback-modal-badge", "");

    const emoji = doc.createElement("span");
    emoji.setAttribute("data-feedback-modal-emoji", "");
    badge.appendChild(emoji);

    ["s1", "s2", "s3"].forEach(function (name) {
      const sparkle = doc.createElement("span");
      sparkle.className = "modal-spark " + name;
      sparkle.setAttribute("aria-hidden", "true");
      sparkle.textContent = "✦";
      badge.appendChild(sparkle);
    });

    const title = doc.createElement("h3");
    title.id = "feedback-modal-title";
    title.setAttribute("data-feedback-modal-title", "");

    const titleId = doc.createElement("p");
    titleId.className = "id-copy";
    titleId.lang = "id";
    titleId.setAttribute("data-feedback-modal-title-id", "");

    const actions = doc.createElement("div");
    actions.className = "complete-actions";
    actions.setAttribute("data-feedback-modal-actions", "");

    section.append(badge, title, titleId, actions);
    overlay.append(section);
    doc.body.append(overlay);
    return overlay;
  }

  function open(options) {
    const settings = options || {};
    const doc = global.document;
    if (!doc) return null;
    const root = ensureOverlay();
    const badge = root.querySelector("[data-feedback-modal-emoji]");
    const title = root.querySelector("[data-feedback-modal-title]");
    const titleId = root.querySelector("[data-feedback-modal-title-id]");
    const actions = root.querySelector("[data-feedback-modal-actions]");

    if (TIERS.indexOf(settings.tier) >= 0) {
      root.setAttribute("data-tier", settings.tier);
    } else {
      root.removeAttribute("data-tier");
    }

    badge.textContent = settings.badge || TIER_EMOJI[settings.tier] || DEFAULT_BADGE;
    title.textContent = settings.titleZh || "";
    titleId.textContent = settings.titleId || "";
    titleId.hidden = !settings.titleId;
    actions.textContent = "";

    const items = Array.isArray(settings.actions) ? settings.actions : [];
    items.forEach(function (item) {
      if (!item || typeof item.label !== "string") return;
      const button = doc.createElement("button");
      button.type = "button";
      button.className = actions.children.length === 0 ? "primary-button" : "secondary-button";
      if (typeof item.icon === "string" && item.icon) {
        const icon = doc.createElement("span");
        icon.className = "action-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = item.icon;
        button.appendChild(icon);
      }
      button.appendChild(doc.createTextNode(item.label));
      if (typeof item.onSelect === "function") {
        button.addEventListener("click", function () { item.onSelect(); });
      }
      actions.appendChild(button);
    });

    root.classList.remove("hidden");
    const dialog = root.querySelector(".completion-modal");
    if (dialog && typeof dialog.focus === "function") dialog.focus();
    return root;
  }

  function close() {
    if (overlay) overlay.classList.add("hidden");
  }

  function isOpen() {
    return !!(overlay && !overlay.classList.contains("hidden"));
  }

  global.AICloudFeedbackModal = { open: open, close: close, isOpen: isOpen };
})(typeof window !== "undefined" ? window : globalThis);
