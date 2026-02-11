import { describe, it, expect } from "vitest";
import { parsePrice, calculateMonthlyCost, isCbOnly } from "../src/scripts/calculator.js";

describe("parsePrice", () => {
  it("parses dollar string to number", () => {
    expect(parsePrice("$3.78")).toBe(3.78);
    expect(parsePrice("$30.27")).toBe(30.27);
    expect(parsePrice("$0.80")).toBe(0.8);
  });

  it("returns null for null/empty/dash/TBD", () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("-")).toBeNull();
    expect(parsePrice("TBD")).toBeNull();
  });
});

describe("calculateMonthlyCost", () => {
  it("calculates monthly cost correctly (720h * price * count)", () => {
    expect(calculateMonthlyCost(3.78, 1)).toBeCloseTo(2721.6);
    expect(calculateMonthlyCost(3.78, 2)).toBeCloseTo(5443.2);
    expect(calculateMonthlyCost(30.27, 1)).toBeCloseTo(21794.4);
  });

  it("returns null when price is null", () => {
    expect(calculateMonthlyCost(null, 1)).toBeNull();
  });

  it("returns null when count is null", () => {
    expect(calculateMonthlyCost(3.78, null)).toBeNull();
  });
});

describe("isCbOnly", () => {
  it("returns true when price is null", () => {
    expect(isCbOnly({ price: null })).toBe(true);
  });

  it("returns true when price is TBD", () => {
    expect(isCbOnly({ price: "TBD" })).toBe(true);
  });

  it("returns false when price exists", () => {
    expect(isCbOnly({ price: "$3.78" })).toBe(false);
  });
});
