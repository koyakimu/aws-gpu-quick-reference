import { describe, it, expect } from "vitest";
import { GPU_DATA, EC2_LINKS } from "../src/scripts/gpu-data.js";

describe("GPU_DATA integrity", () => {
  it("has entries", () => {
    expect(GPU_DATA.length).toBeGreaterThan(0);
  });

  it("all entries have required fields", () => {
    GPU_DATA.forEach((row, i) => {
      expect(row.gen, `row ${i}: gen`).toBeTruthy();
      expect(row.size, `row ${i}: size`).toBeTruthy();
      expect(row.count, `row ${i}: count`).toBeDefined();
      expect(row.vramPerGpu, `row ${i}: vramPerGpu`).toBeGreaterThan(0);
      expect(row.fp16PerGpu, `row ${i}: fp16PerGpu`).toBeGreaterThan(0);
      expect(row.vcpu, `row ${i}: vcpu`).toBeGreaterThan(0);
      expect(row.mem, `row ${i}: mem`).toBeTruthy();
      expect(typeof row.tokyo, `row ${i}: tokyo`).toBe("boolean");
    });
  });

  it("all gen values are valid", () => {
    const validGens = ["blackwell", "hopper", "ada", "ampere", "turing", "volta"];
    GPU_DATA.forEach((row, i) => {
      expect(validGens, `row ${i}: gen="${row.gen}"`).toContain(row.gen);
    });
  });

  it("price fields are valid format", () => {
    const pricePattern = /^\$\d+(\.\d{1,2})?$/;
    GPU_DATA.forEach((row, i) => {
      if (row.price !== null && row.price !== "TBD") {
        expect(row.price, `row ${i}: price`).toMatch(pricePattern);
      }
      if (row.priceCb !== "-") {
        expect(row.priceCb, `row ${i}: priceCb`).toMatch(pricePattern);
      }
    });
  });

  it("genRows sum matches total rows per generation", () => {
    const genCounts = {};
    GPU_DATA.forEach((row) => {
      genCounts[row.gen] = (genCounts[row.gen] || 0) + 1;
    });

    GPU_DATA.forEach((row) => {
      if (row.genRows) {
        expect(row.genRows, `${row.gen} genRows`).toBe(genCounts[row.gen]);
      }
    });
  });
});

describe("EC2_LINKS", () => {
  it("has entries", () => {
    expect(Object.keys(EC2_LINKS).length).toBeGreaterThan(0);
  });

  it("all links are valid AWS URLs", () => {
    Object.entries(EC2_LINKS).forEach(([key, url]) => {
      expect(url, `EC2_LINKS[${key}]`).toMatch(/^https:\/\/aws\.amazon\.com/);
    });
  });

  it("all ec2 types in GPU_DATA have a corresponding link", () => {
    const ec2Types = new Set(GPU_DATA.filter((r) => r.ec2).map((r) => r.ec2));
    ec2Types.forEach((ec2) => {
      expect(EC2_LINKS, `Missing link for ${ec2}`).toHaveProperty(ec2);
    });
  });
});
