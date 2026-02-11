import { describe, it, expect } from "vitest";
import { parseFraction, formatNumber } from "../src/scripts/table.js";

describe("parseFraction", () => {
  it("parses simple fractions", () => {
    expect(parseFraction("1/8")).toBeCloseTo(0.125);
    expect(parseFraction("1/2")).toBeCloseTo(0.5);
  });

  it("parses whole numbers as strings", () => {
    expect(parseFraction("8")).toBe(8);
    expect(parseFraction("1")).toBe(1);
  });
});

describe("formatNumber", () => {
  it("adds comma separators", () => {
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(1979)).toBe("1,979");
    expect(formatNumber(15832)).toBe("15,832");
  });

  it("handles small numbers without commas", () => {
    expect(formatNumber(100)).toBe("100");
    expect(formatNumber(42)).toBe("42");
  });
});
