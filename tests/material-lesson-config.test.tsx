import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../admin/src/App";
import "../admin/src/i18n";
import { platform } from "../admin/src/lib/platform";
import { sessionMaterials } from "../admin/src/lib/domain";
import { usePlatformStore } from "../admin/src/store/usePlatformStore";

function refreshAppStore() {
  usePlatformStore.getState().refresh(platform.getState());
}

describe("material lesson configuration", () => {
  beforeEach(() => {
    platform.resetDemo();
  });

  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("links a library material to a lesson phase and can remove it again", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/materials";
    render(<App />);

    const configButtons = await screen.findAllByRole("button", { name: /配置到课节/ });
    expect(configButtons.length).toBeGreaterThan(0);

    const card = configButtons[0].closest("article") as HTMLElement;
    const title = card.querySelector(".material-title-row strong")?.textContent ?? "";
    const material = platform.getState().materials.find((item) => item.title === title);
    expect(material).toBeTruthy();

    fireEvent.click(configButtons[0]);
    const dialog = await screen.findByRole("dialog", { name: `配置到课节 · ${title}` });
    expect(within(dialog).getByLabelText("课节")).toBeInTheDocument();

    const lessonSelect = within(dialog).getByLabelText("课节") as HTMLSelectElement;
    const lessonId = lessonSelect.value;
    expect(lessonId).toBeTruthy();

    fireEvent.change(within(dialog).getByLabelText("学习阶段"), { target: { value: "live" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /添加到课节|更新配置/ }));

    await waitFor(() => {
      const ref = platform
        .getState()
        .materialRefs.find((item) => item.materialId === material!.id && item.lessonId === lessonId && item.phase === "live");
      expect(ref).toBeTruthy();
    });

    const created = platform
      .getState()
      .materialRefs.find((item) => item.materialId === material!.id && item.lessonId === lessonId && item.phase === "live");
    const lessonTitle = platform.getState().lessons.find((item) => item.id === lessonId)?.title ?? "";
    const removeButton = await within(dialog).findByRole("button", { name: `从${lessonTitle} · 课中 移除` });
    const row = removeButton.closest(".material-config-row") as HTMLElement;
    expect(within(row).getByText("课中")).toBeInTheDocument();

    fireEvent.click(removeButton);
    await waitFor(() => {
      expect(platform.getState().materialRefs.some((item) => item.id === created!.id)).toBe(false);
    });
  });

  it("filters library materials by multiple file types", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/materials";
    render(<App />);

    const group = await screen.findByRole("group", { name: "按文件类型筛选" });
    const chip = (name: string) => within(group).getByRole("button", { name: new RegExp(`^${name}`) });
    expect(chip("PDF").textContent).toContain("2");
    expect(chip("音频").textContent).toContain("2");
    expect(chip("视频外链").textContent).toContain("1");
    expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(7);

    fireEvent.click(chip("PDF"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(2));
    expect(screen.getByText("课前词汇卡：你好、早上好、再见")).toBeInTheDocument();
    expect(screen.queryByText("课后跟读音频")).not.toBeInTheDocument();

    // 多选：PDF + 音频 → 4 张卡
    fireEvent.click(chip("音频"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(4));
    expect(screen.getByText("课后跟读音频")).toBeInTheDocument();
    expect(screen.queryByText("情境视频：初次见面")).not.toBeInTheDocument();

    // 取消 PDF 只剩音频
    fireEvent.click(chip("PDF"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(2));
    expect(screen.getByText("时间句型跟读音频")).toBeInTheDocument();

    // 点“全部类型”清空
    fireEvent.click(chip("全部类型"));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(7));

    // 叠加阶段筛选到无结果时给出空状态，可一键清除
    fireEvent.click(chip("视频外链"));
    fireEvent.click(screen.getByRole("tab", { name: /课前/ }));
    expect(await screen.findByText("没有匹配的材料")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "查看" })).toHaveLength(7));
  });

  it("opens the material detail dialog from 查看 and keeps an icon-only download", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/materials";
    render(<App />);

    const viewButtons = await screen.findAllByRole("button", { name: "查看" });
    expect(viewButtons.length).toBeGreaterThan(0);
    const card = viewButtons[0].closest("article") as HTMLElement;
    const title = card.querySelector(".material-title-row strong")?.textContent ?? "";

    expect(within(card).getByRole("button", { name: `下载 ${title}` })).toBeInTheDocument();

    fireEvent.click(viewButtons[0]);
    const dialog = await screen.findByRole("dialog", { name: `材料详情 · ${title}` });
    expect(within(dialog).getByText("文件类型")).toBeInTheDocument();
    expect(within(dialog).getByText("文件大小")).toBeInTheDocument();
    expect(within(dialog).queryByText("版本")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("下载次数")).not.toBeInTheDocument();
    expect(within(dialog).getByText("已配置课节")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "下载" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /配置到课节/ })).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /配置到课节/ }));
    expect(await screen.findByRole("dialog", { name: `配置到课节 · ${title}` })).toBeInTheDocument();
  });

  it("scopes the material to selected sessions of the lesson", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/materials";
    render(<App />);

    const configButtons = await screen.findAllByRole("button", { name: /配置到课节/ });
    const card = configButtons[0].closest("article") as HTMLElement;
    const title = card.querySelector(".material-title-row strong")?.textContent ?? "";
    const material = platform.getState().materials.find((item) => item.title === title)!;

    fireEvent.click(configButtons[0]);
    const dialog = await screen.findByRole("dialog", { name: `配置到课节 · ${title}` });

    const lessonId = (within(dialog).getByLabelText("课节") as HTMLSelectElement).value;
    fireEvent.change(within(dialog).getByLabelText("学习阶段"), { target: { value: "review" } });
    const checkboxes = within(dialog).getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[0]);
    fireEvent.click(within(dialog).getByRole("button", { name: /添加到课节|更新配置/ }));

    await waitFor(() => {
      const ref = platform
        .getState()
        .materialRefs.find(
          (item) => item.materialId === material.id && item.lessonId === lessonId && item.phase === "review"
        );
      expect(ref?.sessionIds?.length).toBe(1);
    });
  });
});

describe("material configuration reaches the student session", () => {
  beforeEach(() => {
    platform.resetDemo();
    platform.setCurrentUser("teacher-lina");
  });

  it("only shows the material in the configured session of the lesson", () => {
    const state = platform.getState();
    const session = state.sessions.find((item) => item.lessonId === "lesson-greetings" && item.teacherId === "teacher-lina");
    expect(session).toBeTruthy();
    const material = state.materials[0];

    const result = platform.attachMaterial({
      materialId: material.id,
      lessonId: "lesson-greetings",
      phase: "live",
      sessionIds: [session!.id],
      actorId: "teacher-lina"
    });
    expect(result.ok).toBe(true);

    const after = platform.getState();
    const target = after.sessions.find((item) => item.id === session!.id)!;
    expect(sessionMaterials(after, target, "live").some((item) => item.material?.id === material.id)).toBe(true);

    const sibling = after.sessions.find(
      (item) => item.lessonId === "lesson-greetings" && item.teacherId === "teacher-lina" && item.id !== session!.id
    );
    if (sibling) {
      expect(sessionMaterials(after, sibling, "live").some((item) => item.material?.id === material.id)).toBe(false);
    }
    expect(after.auditEvents.some((event) => event.action === "attach_material" && event.targetId === material.id)).toBe(true);
  });
});
