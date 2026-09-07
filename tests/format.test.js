import { describe, it, expect } from "vitest";
import { formatPrice, parseCount, computeSpans, isNew, formatNumber, formatMonth } from "../src/scripts/format.js";

describe("formatPrice", () => {
  it("prefixes a dollar sign and forces two decimals", () => {
    expect(formatPrice(113.93)).toBe("$113.93");
    expect(formatPrice(0.8)).toBe("$0.80");
    expect(formatPrice(3)).toBe("$3.00");
  });

  it("renders zero as a price, not as a dash", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("renders null as a dash", () => {
    expect(formatPrice(null)).toBe("-");
    expect(formatPrice(undefined)).toBe("-");
  });
});

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

describe("computeSpans", () => {
  it("gives the first row of each run the run length and the rest zero", () => {
    const rows = [
      { gen: "ada", gpu: "L40S", ec2: "G6e" },
      { gen: "ada", gpu: "L40S", ec2: "G6e" },
      { gen: "ada", gpu: "L4", ec2: "G6" },
      { gen: "turing", gpu: "T4", ec2: "G4dn" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 3, gpu: 2, ec2: 2 },
      { gen: 0, gpu: 0, ec2: 0 },
      { gen: 0, gpu: 1, ec2: 1 },
      { gen: 1, gpu: 1, ec2: 1 },
    ]);
  });

  it("keeps one GPU cell spanning two families (V100 over P3 and P3dn)", () => {
    const rows = [
      { gen: "volta", gpu: "V100", ec2: "P3" },
      { gen: "volta", gpu: "V100", ec2: "P3" },
      { gen: "volta", gpu: "V100", ec2: "P3dn" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 3, gpu: 3, ec2: 2 },
      { gen: 0, gpu: 0, ec2: 0 },
      { gen: 0, gpu: 0, ec2: 1 },
    ]);
  });

  it("does not merge runs of the same GPU that sit in different generations", () => {
    const rows = [
      { gen: "ada", gpu: "L4", ec2: "G6" },
      { gen: "turing", gpu: "L4", ec2: "G6" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 1, gpu: 1, ec2: 1 },
      { gen: 1, gpu: 1, ec2: 1 },
    ]);
  });

  it("gives a single row a span of one in every column", () => {
    const rows = [{ gen: "ada", gpu: "L4", ec2: "G6" }];
    expect(computeSpans(rows)).toEqual([{ gen: 1, gpu: 1, ec2: 1 }]);
  });

  it("returns an empty array for no rows", () => {
    expect(computeSpans([])).toEqual([]);
  });
});

describe("isNew", () => {
  const now = new Date(Date.UTC(2026, 8, 7)); // 2026-09-07

  it("is true within three months", () => {
    expect(isNew("2026-09", now)).toBe(true);
    expect(isNew("2026-07", now)).toBe(true);
  });

  it("is true at exactly the three-month boundary", () => {
    expect(isNew("2026-06", now)).toBe(true);
  });

  it("is false older than three months", () => {
    expect(isNew("2026-05", now)).toBe(false);
    expect(isNew("2024-01", now)).toBe(false);
  });

  it("is false for a missing or malformed date", () => {
    expect(isNew(null, now)).toBe(false);
    expect(isNew(undefined, now)).toBe(false);
    expect(isNew("nonsense", now)).toBe(false);
    expect(isNew("2026-9", now)).toBe(false);
  });

  it("is false for a future date", () => {
    expect(isNew("2026-12", now)).toBe(false);
  });

  it("defaults now to the current date", () => {
    expect(isNew("1999-01")).toBe(false);
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

describe("formatMonth", () => {
  it("renders YYYY-MM in each language", () => {
    expect(formatMonth("2026-09", "ja")).toBe("2026年9月");
    expect(formatMonth("2026-09", "en")).toBe("September 2026");
    expect(formatMonth("2026-09", "ko")).toBe("2026년 9월");
  });

  it("returns non YYYY-MM input unchanged", () => {
    expect(formatMonth("2026", "en")).toBe("2026");
    expect(formatMonth(null, "en")).toBe("");
  });
});
