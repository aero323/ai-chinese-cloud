import { describe, expect, it } from "vitest";
import "../shared/feedback-copy.js";

const copy = (window as any).AICloudFeedbackCopy;
const POOLS = ["correct", "correctFirstTry", "wrong", "pair"];

describe("feedback copy", () => {
  it("keeps fixed bilingual lines for rare moments", () => {
    ["record", "submitted"].forEach((key) => {
      expect(typeof copy[key].zh).toBe("string");
      expect(copy[key].zh.length).toBeGreaterThan(0);
      expect(typeof copy[key].id).toBe("string");
      expect(copy[key].id.length).toBeGreaterThan(0);
    });
  });

  it("rotates praise pools with short bilingual entries", () => {
    POOLS.forEach((key) => {
      expect(Array.isArray(copy[key])).toBe(true);
      expect(copy[key].length).toBeGreaterThanOrEqual(2);
      copy[key].forEach((entry: any) => {
        const plain = entry.zh.replace(/[！？，、。]/g, "");
        expect(plain.length).toBeGreaterThan(0);
        expect(plain.length).toBeLessThanOrEqual(6);
        expect(entry.zh.endsWith("！")).toBe(true);
        expect(typeof entry.id).toBe("string");
        expect(entry.id.length).toBeGreaterThan(0);
      });
    });
  });

  it("never draws the same sentence twice in a row", () => {
    POOLS.forEach((key) => {
      const seen = new Set<string>();
      let previous = "";
      for (let i = 0; i < 40; i += 1) {
        const entry = copy.draw(key);
        expect(entry).toBeTruthy();
        expect(previous).not.toBe(entry.zh);
        previous = entry.zh;
        seen.add(entry.zh);
      }
      expect(seen.size).toBeGreaterThan(1);
    });
  });

  it("draws pair praise from shared + pair pools, gated by a perfect run", () => {
    const shared = copy.correct.map((entry: any) => entry.zh);
    const pairOnly = copy.pair
      .filter((entry: any) => entry.onlyPerfect)
      .map((entry: any) => entry.zh);
    const allowed = shared.concat(copy.pair.map((entry: any) => entry.zh));
    expect(pairOnly.length).toBeGreaterThan(0);

    let sawPairOnly = false;
    for (let i = 0; i < 200; i += 1) {
      const normal = copy.draw("pair", { perfect: false });
      expect(allowed).toContain(normal.zh);
      expect(pairOnly).not.toContain(normal.zh);

      const perfect = copy.draw("pair", { perfect: true });
      expect(allowed).toContain(perfect.zh);
      if (pairOnly.includes(perfect.zh)) sawPairOnly = true;
    }
    expect(sawPairOnly).toBe(true);
    expect(shared.length).toBeGreaterThan(1);
  });

  it("ships one emoji per pool entry", () => {
    POOLS.forEach((key) => {
      copy[key].forEach((entry: any) => {
        expect(typeof entry.emoji).toBe("string");
        expect(entry.emoji.length).toBeGreaterThan(0);
      });
    });
    const drawn = copy.draw("correct");
    expect(drawn.emoji).toBeTruthy();
  });
});
