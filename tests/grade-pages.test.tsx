import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../admin/src/App";
import "../admin/src/i18n";
import { platform } from "../admin/src/lib/platform";
import { usePlatformStore } from "../admin/src/store/usePlatformStore";

function refreshAppStore() {
  usePlatformStore.getState().refresh(platform.getState());
}

describe("grade pages and role routes", () => {
  beforeEach(() => {
    platform.resetDemo();
  });

  afterEach(() => {
    cleanup();
    window.location.hash = "";
  });

  it("shows the teacher student-grades page and sidebar entry", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/grades";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "学生成绩" })).toBeInTheDocument();
    expect(screen.getAllByText("学生成绩").some((node) => node.tagName === "SPAN")).toBe(true);
    expect(screen.getByText("综合均分")).toBeInTheDocument();
    expect(screen.getByText("互动均分")).toBeInTheDocument();
    expect(screen.getByText("作业均分")).toBeInTheDocument();
    expect(screen.getByText("考试均分")).toBeInTheDocument();
    expect(screen.queryByText("学生人数")).not.toBeInTheDocument();
    expect(screen.queryByText("待录 / 缺考")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "成绩趋势" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "能力雷达" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "成绩构成" })).toBeInTheDocument();
    expect(screen.queryByText(/项待录/)).not.toBeInTheDocument();
    const classRadarTooltip = screen.getByRole("tooltip");
    expect(screen.getByRole("button", { name: "查看题型与能力维度对照" })).toBeInTheDocument();
    expect(within(classRadarTooltip).getByText("题型与能力维度对照")).toBeInTheDocument();
    expect(within(classRadarTooltip).getByText("看图说话")).toBeInTheDocument();
    expect(within(classRadarTooltip).getAllByText("口语").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "全部学生成绩汇总" })).toBeInTheDocument();
    expect(screen.getByText("课程")).toBeInTheDocument();
    expect(screen.getAllByText("问候复习课").length).toBeGreaterThan(0);
    expect(screen.getAllByText("印尼圣心学校7年级A班").length).toBeGreaterThan(1);
    expect(screen.queryByText("周三晚 A 班 / 印尼圣心学校7年级A班")).not.toBeInTheDocument();
  });

  it("updates the student summary title when a class is selected", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/grades";
    render(<App />);

    const classOption = await screen.findByRole("option", { name: "印尼圣心学校7年级A班" }) as HTMLOptionElement;
    fireEvent.change(screen.getByLabelText("按班级筛选"), { target: { value: classOption.value } });
    expect(await screen.findByRole("heading", { name: "印尼圣心学校7年级A班学生成绩汇总" })).toBeInTheDocument();
  });

  it("shows per-student analytics and teacher-facing status labels", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/grades";
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Raymond/ }));
    const dialog = await screen.findByRole("dialog", { name: "Raymond · 成绩详情" });
    expect(within(dialog).getByRole("img", { name: "六维能力雷达图" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "成绩趋势" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "成绩构成" })).toBeInTheDocument();
    expect(within(dialog).getByText("分数均经过归一化计算")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("tab", { name: /作业/ }));
    expect(await within(dialog).findByText("周末复习 · 第 3 次作业")).toBeInTheDocument();
    expect(within(dialog).getByText("已录入")).toBeInTheDocument();
    expect(within(dialog).getByText("待录入")).toBeInTheDocument();
    expect(within(dialog).getByText("缺交")).toBeInTheDocument();
    expect(within(dialog).queryByText("已批改")).not.toBeInTheDocument();
  });

  it("separates teacher records into interaction, homework, and exam tabs", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher/grades";
    render(<App />);

    expect(await screen.findByRole("tab", { name: /互动练习/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "学生维度" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /作业/ }));
    expect(screen.getByRole("button", { name: "学生维度" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("全部学生作业表现")).toBeInTheDocument();
    expect(screen.getByText("已录入")).toBeInTheDocument();
    expect(screen.getByText("缺交")).toBeInTheDocument();
    expect(screen.queryByText("待录入")).not.toBeInTheDocument();
    expect(screen.queryByText("免做")).not.toBeInTheDocument();
    expect(screen.queryByText("缺考")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Raymond/ }));
    const homeworkDialog = await screen.findByRole("dialog", { name: "Raymond · 成绩详情" });
    expect(within(homeworkDialog).getByRole("tab", { name: /作业/ })).toHaveAttribute("aria-selected", "true");
    expect(within(homeworkDialog).getByText("周末复习 · 第 3 次作业")).toBeInTheDocument();
    fireEvent.click(within(homeworkDialog).getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getByRole("tab", { name: /考试/ }));
    expect(await screen.findByText("全部学生考试表现")).toBeInTheDocument();
    expect(screen.getByText("缺考")).toBeInTheDocument();
    expect(screen.queryByText("待录入")).not.toBeInTheDocument();
    expect(screen.queryByText("免考")).not.toBeInTheDocument();
    expect(screen.queryByText("缺交")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /互动练习/ }));
    const interactionPanel = (await screen.findByText("全部学生互动练习表现")).closest(".grade-table-card") as HTMLElement;
    // 角色预览下拉里也有学生姓名，这里限定在互动练习表格内断言。
    expect(within(interactionPanel).getByText("Anisa")).toBeInTheDocument();
    expect(screen.getByText("完成互动")).toBeInTheDocument();
    expect(screen.getByText("平均用时")).toBeInTheDocument();
    expect(screen.queryByText("互动体验 · 八大新题型")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "内容维度" }));
    expect(await screen.findByText("互动体验 · 八大新题型")).toBeInTheDocument();
    expect(screen.getAllByText("按范围内最佳一次成绩统计").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: /作业/ }));
    expect(await screen.findByText("周末复习 · 第 3 次作业")).toBeInTheDocument();
    fireEvent.click((await screen.findAllByRole("button", { name: "按题目查看" }))[0]);
    const accuracyDialog = await screen.findByRole("dialog", { name: "题目正确率" });
    expect(within(accuracyDialog).getByText("听音选择")).toBeInTheDocument();
    expect(within(accuracyDialog).getByText("听力理解")).toBeInTheDocument();
    expect(within(accuracyDialog).getByText(/演示口径/)).toBeInTheDocument();
    fireEvent.click(within(accuracyDialog).getByRole("button", { name: "关闭" }));

    fireEvent.click(screen.getByRole("tab", { name: /考试/ }));
    expect(await screen.findByText("周测 · 问候与餐厅表达")).toBeInTheDocument();
  });

  it("shows recent class results on the teacher dashboard and links to the result page", async () => {
    platform.setCurrentUser("teacher-lina");
    refreshAppStore();
    window.location.hash = "#/teacher";
    render(<App />);

    expect(await screen.findByRole("heading", { name: "最近课程结果" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "最近添加" })).not.toBeInTheDocument();

    const list = document.querySelector(".recent-content-list") as HTMLElement;
    const rows = within(list).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(0);
    expect(within(rows[0]).getByText("内容完成率")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/^\d+%$/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/人$/)).toBeInTheDocument();
    // 每行带上课时间与班级
    expect(within(rows[0]).getByText(/周. /)).toBeInTheDocument();
    const sessionTitle = rows[0].querySelector("strong")?.textContent ?? "";

    fireEvent.click(rows[0]);
    await waitFor(() => expect(window.location.hash).toContain("/teacher/results"));
    expect(await screen.findByRole("heading", { name: "课程结果" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: sessionTitle })).toBeInTheDocument();
  });

  it("shows the student grade statistics page", async () => {
    platform.setCurrentUser("student-anisa");
    refreshAppStore();
    window.location.hash = "#/student/grades";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "成绩统计" })).toBeInTheDocument();
    expect(screen.getByLabelText("开始日期")).toBeInTheDocument();
    expect(screen.getByLabelText("结束日期")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /互动练习/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /作业/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /考试/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "能力雷达" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "六维能力雷达图" })).toBeInTheDocument();
    expect(screen.getByText("分数均经过归一化计算")).toBeInTheDocument();
    expect(screen.getByText(/项待公布/)).toBeInTheDocument();
    expect(screen.getAllByText("听力").length).toBeGreaterThan(0);
    expect(screen.getAllByText("口语").length).toBeGreaterThan(0);
    expect(screen.getAllByText("拼音").length).toBeGreaterThan(0);
    expect(screen.getAllByText("阅读").length).toBeGreaterThan(0);
    const radarTooltip = screen.getByRole("tooltip");
    expect(screen.getByRole("button", { name: "查看题型与能力维度对照" })).toBeInTheDocument();
    expect(within(radarTooltip).getByText("题型与能力维度对照")).toBeInTheDocument();
    expect(within(radarTooltip).getAllByText("听力").length).toBeGreaterThan(0);
    expect(within(radarTooltip).getByText("听音选图 / 选词")).toBeInTheDocument();
    expect(within(radarTooltip).getByText("投票")).toBeInTheDocument();
    expect(within(radarTooltip).getByText("不计入能力雷达")).toBeInTheDocument();
  });

  it("redirects the legacy student results route to the new grade page", async () => {
    platform.setCurrentUser("student-anisa");
    refreshAppStore();
    window.location.hash = "#/student/results";
    render(<App />);
    expect(await screen.findByRole("heading", { name: "成绩统计" })).toBeInTheDocument();
    await waitFor(() => expect(window.location.hash).toBe("#/student/grades"));
  });

  it("uses student-facing status labels for homework records", async () => {
    platform.setCurrentUser("student-raymond");
    refreshAppStore();
    window.location.hash = "#/student/grades";
    render(<App />);

    fireEvent.click(await screen.findByRole("tab", { name: /作业/ }));
    expect(await screen.findByText("周末复习 · 第 3 次作业")).toBeInTheDocument();
    expect(screen.getByText("缺交")).toBeInTheDocument();
    expect(screen.getByText("已批改")).toBeInTheDocument();
    expect(screen.queryByText("缺考")).not.toBeInTheDocument();
    expect(screen.queryByText("已录入")).not.toBeInTheDocument();
    expect(screen.queryByText("待录入")).not.toBeInTheDocument();
  });
});
