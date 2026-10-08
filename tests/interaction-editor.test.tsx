import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import App from "../admin/src/App";
import "../admin/src/i18n";
import { platform } from "../admin/src/lib/platform";
import { usePlatformStore } from "../admin/src/store/usePlatformStore";

function refreshAppStore() {
  usePlatformStore.getState().refresh(platform.getState());
}

/** 打开课堂设计页（session-preview 课次）。 */
async function openDesignPage() {
  platform.setCurrentUser("teacher-berenice");
  refreshAppStore();
  window.location.hash = "#/teacher/session/session-preview/design";
  render(<App />);
  await screen.findByRole("button", { name: /新建互动/ });
}

describe("interaction editor", () => {
  beforeEach(() => {
    platform.resetDemo();
  });

  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("no longer embeds the student preview inside the editor modal", async () => {
    await openDesignPage();
    fireEvent.click(screen.getByRole("button", { name: /新建互动/ }));
    const dialog = await screen.findByRole("dialog", { name: "新建互动" });

    expect(within(dialog).queryByRole("heading", { name: "学生端预览" })).not.toBeInTheDocument();
    expect(dialog.querySelector(".student-preview-card")).toBeNull();
    expect(dialog.querySelector(".student-preview-phone")).toBeNull();

    // 题目卡片仍保留「编辑中」高亮：新增的题目自动成为当前编辑项，点回上一题也能切回来。
    fireEvent.click(within(dialog).getByRole("button", { name: "排序" }));
    const cards = dialog.querySelectorAll(".editor-item-card");
    expect(cards).toHaveLength(2);
    expect(cards[1].className).toContain("is-active");
    expect(cards[1].textContent).toContain("编辑中");

    fireEvent.click(cards[0].querySelector("header") as HTMLElement);
    const refreshed = dialog.querySelectorAll(".editor-item-card");
    expect(refreshed[0].className).toContain("is-active");
    expect(refreshed[0].textContent).toContain("编辑中");
  });

  it("keeps the full-set phone preview reachable from the design list", async () => {
    await openDesignPage();
    fireEvent.click(screen.getAllByRole("button", { name: "预览" })[0]);

    const preview = await screen.findByRole("dialog", { name: /学生端预览 · / });
    const shell = preview.querySelector(".student-preview-phone") as HTMLElement;
    const screens = preview.querySelector(".student-preview-screen") as HTMLElement;
    expect(shell).toBeTruthy();
    expect(within(shell).getByText("1 / 2")).toBeInTheDocument();
    // 没作答之前「下一题」是禁用的
    expect(within(shell).getByRole("button", { name: "下一题" })).toBeDisabled();

    // 点第一个选项（不同课次的第一题选项文案不同，按类名取更稳）
    const firstOption = screens.querySelector(".choice-player-item") as HTMLElement;
    fireEvent.click(firstOption);
    fireEvent.click(within(screens).getByRole("button", { name: "提交本题" }));
    fireEvent.click(within(shell).getByRole("button", { name: "下一题" }));
    expect(within(shell).getByText("2 / 2")).toBeInTheDocument();
  });
});
