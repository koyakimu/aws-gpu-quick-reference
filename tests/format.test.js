import { describe, it, expect } from "vitest";
import { parseCount, formatNumber, formatDate } from "../src/scripts/format.js";

describe("parseCount", () => {
  it("passes numbers through", () => {
    expect(parseCount(8)).toBe(8);
    expect(parseCount(1)).toBe(1);
  });

  it("parses fraction strings", () => {
    expect(parseCount("1/8")).toBeCloseTo(0.125);
    expect(parseCount("1/2")).toBeCloseTo(0.5);
  });

  it("parses whole-number strings", () => {
    expect(parseCount("8")).toBe(8);
  });
});

describe("formatNumber", () => {
  it("inserts thousands separators", () => {
    expect(formatNumber(4500)).toBe("4,500");
    expect(formatNumber(18000)).toBe("18,000");
    expect(formatNumber(1979)).toBe("1,979");
  });

  it("leaves values under a thousand alone", () => {
    expect(formatNumber(8)).toBe("8");
    expect(formatNumber(242)).toBe("242");
  });

  it("does not group the fractional part", () => {
    expect(formatNumber(0.125)).toBe("0.125");
    expect(formatNumber(1234.5678)).toBe("1,234.5678");
    expect(formatNumber(12345.6789)).toBe("12,345.6789");
  });
});

describe("formatDate", () => {
  it("renders YYYY-MM in each language", () => {
    expect(formatDate("2026-09", "ja")).toBe("2026年9月");
    expect(formatDate("2026-09", "en")).toBe("September 2026");
    expect(formatDate("2026-09", "ko")).toBe("2026년 9월");
  });

  it("renders YYYY-MM-DD with the day in each language", () => {
    expect(formatDate("2026-11-26", "ja")).toBe("2026年11月26日");
    expect(formatDate("2026-11-26", "en")).toBe("November 26, 2026");
    expect(formatDate("2026-11-26", "ko")).toBe("2026년 11월 26일");
  });

  it("returns non YYYY-MM input unchanged", () => {
    expect(formatDate("2026", "en")).toBe("2026");
    expect(formatDate(null, "en")).toBe("");
  });
});
