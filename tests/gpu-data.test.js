import { describe, it, expect } from "vitest";
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS, PRICING_META } from "../src/scripts/gpu-data.js";

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
      expect(row.fp16Dense === null || row.fp16Dense > 0, `row ${i}: fp16Dense must be null or > 0`).toBe(true);
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

  it("every record carries gen / gpu / gpuKey / ec2", () => {
    GPU_DATA.forEach((row, i) => {
      expect(row.gen, `row ${i} (${row.size}): gen`).toBeTruthy();
      expect(row.gpu, `row ${i} (${row.size}): gpu`).toBeTruthy();
      expect(row.gpuKey, `row ${i} (${row.size}): gpuKey`).toBeTruthy();
      expect(row.ec2, `row ${i} (${row.size}): ec2`).toBeTruthy();
    });
  });

  it("gpuKey is lowercase alphanumeric with hyphens", () => {
    GPU_DATA.forEach((row, i) => {
      expect(row.gpuKey, `row ${i} (${row.size}): gpuKey="${row.gpuKey}"`).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it("unit is instance or ultraserver", () => {
    GPU_DATA.forEach((row, i) => {
      expect(["instance", "ultraserver"], `row ${i} (${row.size})`).toContain(row.unit);
    });
  });

  it("prices are numeric or null", () => {
    GPU_DATA.forEach((row, i) => {
      ["price", "priceGpu", "priceCb"].forEach((field) => {
        const value = row[field];
        expect(
          value === null || (typeof value === "number" && Number.isFinite(value) && value > 0),
          `row ${i} (${row.size}): ${field}=${JSON.stringify(value)} must be a positive number or null`,
        ).toBe(true);
      });
    });
  });

  it("dropped fields are gone", () => {
    GPU_DATA.forEach((row, i) => {
      ["genRows", "gpuRows", "ec2Rows", "gpuNew"].forEach((field) => {
        expect(field in row, `row ${i} (${row.size}): ${field} must be removed`).toBe(false);
      });
    });
  });

  it("addedAt is a YYYY-MM string or null", () => {
    GPU_DATA.forEach((row, i) => {
      const value = row.addedAt;
      expect(
        value === null || /^\d{4}-\d{2}$/.test(value),
        `row ${i} (${row.size}): addedAt=${JSON.stringify(value)}`,
      ).toBe(true);
    });
  });

  it("sizes are unique", () => {
    const sizes = GPU_DATA.map((r) => r.size);
    expect(new Set(sizes).size, `duplicate size in instances.json`).toBe(sizes.length);
  });
});

describe("PRICING_META", () => {
  it("carries a YYYY-MM pricingAsOf and a region code", () => {
    expect(PRICING_META.pricingAsOf).toMatch(/^\d{4}-\d{2}$/);
    expect(PRICING_META.pricingRegion).toMatch(/^[a-z]{2}-[a-z]+-\d$/);
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

describe("GPU_DATASHEET_LINKS", () => {
  it("has entries", () => {
    expect(Object.keys(GPU_DATASHEET_LINKS).length).toBeGreaterThan(0);
  });

  it("all links are valid NVIDIA URLs", () => {
    Object.entries(GPU_DATASHEET_LINKS).forEach(([key, url]) => {
      expect(url, `GPU_DATASHEET_LINKS[${key}]`).toMatch(/^https:\/\/www\.nvidia\.com/);
    });
  });

  it("all gpu types in GPU_DATA have a corresponding datasheet link", () => {
    const gpuTypes = new Set(GPU_DATA.filter((r) => r.gpu).map((r) => r.gpu));
    gpuTypes.forEach((gpu) => {
      expect(GPU_DATASHEET_LINKS, `Missing datasheet link for ${gpu}`).toHaveProperty(gpu);
    });
  });
});
