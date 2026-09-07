import { describe, it, expect } from "vitest";
import { formatNumber } from "../src/scripts/table.js";

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
