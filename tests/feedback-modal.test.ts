import { beforeEach, describe, expect, it, vi } from "vitest";
import "../shared/feedback-modal.js";

const modal = (window as any).AICloudFeedbackModal;

describe("feedback modal mold", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders badge, bilingual title and ordered actions", () => {
    const onRetry = vi.fn();
    modal.open({
      tier: "wrong",
      badge: "💪",
      titleZh: "再来一遍？",
      titleId: "Mau coba lagi?",
      actions: [
        { label: "再练一次", icon: "↻", onSelect: onRetry },
        { label: "返回课堂", onSelect: () => {} }
      ]
    });

    const overlay = document.querySelector("[data-feedback-modal]") as HTMLElement;
    expect(overlay).toBeTruthy();
    expect(overlay.classList.contains("hidden")).toBe(false);
    expect(overlay.getAttribute("data-tier")).toBe("wrong");
    expect(overlay.querySelector("[data-feedback-modal-emoji]")!.textContent).toBe("💪");
    expect(overlay.querySelector("h3")!.textContent).toBe("再来一遍？");
    expect(overlay.querySelector(".id-copy")!.textContent).toBe("Mau coba lagi?");

    const buttons = overlay.querySelectorAll("button");
    expect(buttons.length).toBe(2);
    expect(buttons[0].className).toBe("primary-button");
    expect(buttons[0].querySelector(".action-icon")!.textContent).toBe("↻");
    expect(buttons[0].textContent).toBe("↻再练一次");
    expect(buttons[1].className).toBe("secondary-button");
    buttons[0].click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lets the tier drive styling and emoji fallback", () => {
    modal.open({ tier: "correctFirstTry", titleZh: "完美！", titleId: "Sempurna!", actions: [] });
    const overlay = document.querySelector("[data-feedback-modal]") as HTMLElement;
    expect(overlay.getAttribute("data-tier")).toBe("correctFirstTry");
    expect(overlay.querySelectorAll(".modal-spark").length).toBe(3);
    expect(overlay.querySelector("[data-feedback-modal-emoji]")!.textContent).toBe("🏆");

    modal.open({ tier: "correct", titleZh: "太棒了！", titleId: "Hebat!", actions: [] });
    expect(overlay.getAttribute("data-tier")).toBe("correct");
    expect(overlay.querySelector("[data-feedback-modal-emoji]")!.textContent).toBe("🎉");
  });

  it("still supports calls without a tier", () => {
    modal.open({
      badge: "🎉",
      titleZh: "收到啦！",
      titleId: "Sudah diterima!",
      actions: [{ label: "返回课堂", onSelect: () => {} }]
    });
    const overlay = document.querySelector("[data-feedback-modal]") as HTMLElement;
    expect(overlay.hasAttribute("data-tier")).toBe(false);
    expect(overlay.querySelector("[data-feedback-modal-emoji]")!.textContent).toBe("🎉");
  });

  it("reuses one overlay and swaps content on reopen", () => {
    modal.open({ titleZh: "第一", titleId: "Satu", actions: [{ label: "去", onSelect: () => {} }] });
    modal.open({ titleZh: "第二", titleId: "Dua", actions: [{ label: "走", onSelect: () => {} }] });

    const overlays = document.querySelectorAll("[data-feedback-modal]");
    expect(overlays.length).toBe(1);
    const overlay = overlays[0] as HTMLElement;
    expect(overlay.querySelector("h3")!.textContent).toBe("第二");
    const buttons = overlay.querySelectorAll("button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe("走");
  });

  it("closes and reports open state", () => {
    modal.open({ titleZh: "好", titleId: "Baik", actions: [] });
    expect(modal.isOpen()).toBe(true);
    modal.close();
    expect(modal.isOpen()).toBe(false);
    const overlay = document.querySelector("[data-feedback-modal]") as HTMLElement;
    expect(overlay.classList.contains("hidden")).toBe(true);
  });
});
