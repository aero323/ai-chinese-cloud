import { beforeEach, describe, expect, it } from "vitest";
import "../shared/activity-types.js";
import "../shared/activity-fab.js";

const fab = (window as any).AICloudActivityFab;
const types = (window as any).AICloudActivityTypes;

describe("activity picker", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState({}, "", "/");
    fab.install();
  });

  it("adds a floating button labelled 题型体验", () => {
    const button = document.querySelector(".activity-fab");
    expect(button).not.toBeNull();
    expect(button!.textContent).toContain("题型体验");
  });

  it("lists every type and links only the ready pages", () => {
    document.querySelector<HTMLButtonElement>(".activity-fab")!.click();
    const rows = Array.from(document.querySelectorAll(".demo-activity-row"));
    const all = types.all();
    const ready = all.filter((item: any) => item.ready);
    expect(rows).toHaveLength(all.length);
    const links = rows.filter((row) => row.tagName === "A");
    expect(links.map((row) => row.getAttribute("href"))).toEqual(ready.map((item: any) => types.linkFor(item.type)));
    expect(rows.filter((row) => row.classList.contains("is-pending"))).toHaveLength(all.length - ready.length);
    rows.forEach((row, index) => {
      if (all[index].ready) {
        expect(row.textContent).toContain("可体验");
        expect(row.getAttribute("href")).toBeTruthy();
      } else {
        expect(row.getAttribute("aria-disabled")).toBe("true");
        expect(row.textContent).toContain("待认领");
      }
    });
  });

  it("opens the sheet on tap and closes it again", () => {
    const button = document.querySelector<HTMLButtonElement>(".activity-fab")!;
    const overlay = document.querySelector(".activity-sheet-overlay")!;
    expect(overlay.classList.contains("open")).toBe(false);
    button.click();
    expect(overlay.classList.contains("open")).toBe(true);
    document.querySelector<HTMLButtonElement>("[data-activity-close]")!.click();
    expect(overlay.classList.contains("open")).toBe(false);
  });

  it("opens the sheet straight away when the page is loaded with ?activities=1", () => {
    window.history.replaceState({}, "", "/classroom.html?activities=1");
    document.body.innerHTML = "";
    fab.install();
    const overlay = document.querySelector(".activity-sheet-overlay")!;
    expect(overlay.classList.contains("open")).toBe(true);
    expect(window.location.search).toBe("");
    expect(document.querySelectorAll(".demo-activity-row")).toHaveLength(types.all().length);
  });

  it("exposes open and close for the 换一个题型 entry", () => {
    const overlay = document.querySelector(".activity-sheet-overlay")!;
    fab.close();
    expect(overlay.classList.contains("open")).toBe(false);
    fab.open();
    expect(overlay.classList.contains("open")).toBe(true);
  });
});
