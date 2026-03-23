import { describe, it, expect } from "vitest";
import { parsePrice, calculateMonthlyCost, calculateYearlyCost, calculateDaysCost, convertToJpy, isCbOnly } from "../src/scripts/calculator.js";

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

describe("calculateYearlyCost", () => {
  it("calculates yearly cost as monthly * 12", () => {
    expect(calculateYearlyCost(2721.6)).toBeCloseTo(32659.2);
    expect(calculateYearlyCost(21794.4)).toBeCloseTo(261532.8);
  });

  it("returns null when monthly cost is null", () => {
    expect(calculateYearlyCost(null)).toBeNull();
  });
});

describe("calculateDaysCost", () => {
  it("calculates cost for specified days (24h * price * days * count)", () => {
    expect(calculateDaysCost(3.78, 30, 1)).toBeCloseTo(2721.6);
    expect(calculateDaysCost(3.78, 182, 1)).toBeCloseTo(16504.32);
    expect(calculateDaysCost(3.78, 365, 1)).toBeCloseTo(33112.8);
    expect(calculateDaysCost(3.78, 365, 2)).toBeCloseTo(66225.6);
  });

  it("returns null when price is null", () => {
    expect(calculateDaysCost(null, 30, 1)).toBeNull();
  });

  it("returns null when days is null", () => {
    expect(calculateDaysCost(3.78, null, 1)).toBeNull();
  });

  it("returns null when count is null", () => {
    expect(calculateDaysCost(3.78, 30, null)).toBeNull();
  });
});

describe("convertToJpy", () => {
  it("converts USD to JPY using exchange rate", () => {
    expect(convertToJpy(100, 150)).toBe(15000);
    expect(convertToJpy(2721.6, 150)).toBeCloseTo(408240);
  });

  it("returns null when amount is null", () => {
    expect(convertToJpy(null, 150)).toBeNull();
  });

  it("returns null when exchange rate is null", () => {
    expect(convertToJpy(100, null)).toBeNull();
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
