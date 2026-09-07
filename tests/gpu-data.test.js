import { describe, it, expect } from "vitest";
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS, PRICING_META } from "../src/scripts/gpu-data.js";
import specs from "../data/aws-ec2-nvidia-gpu-specs.json";
import { ja } from "../src/i18n/ja.js";
import { en } from "../src/i18n/en.js";
import { ko } from "../src/i18n/ko.js";

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

// instances.json の gpu 名 -> specs JSON の gpu_name
const SPEC_NAMES = {
  "B300": "B300 SXM",
  "B200": "B200 SXM",
  "GB200": "GB200",
  "RTX PRO": "RTX PRO 6000 Blackwell SE",
  "RTX PRO 4500": "RTX PRO 4500 Blackwell SE",
  "H200": "H200 SXM",
  "H100": "H100 SXM",
  "L40S": "L40S",
  "L4": "L4",
  "A100 40GB": "A100 SXM",
  "A100 80GB": "A100 SXM",
  "A10G": "A10G",
  "T4": "T4",
  "T4G": "T4G",
  "V100": "V100 SXM2",
};

// specs JSON は fp16_with_sparsity が true のときスパース値を持つ。
// instances.json は Dense を持つので、比較前に揃える。
function denseOf(tflops, withSparsity) {
  if (tflops == null) return null;
  return withSparsity ? tflops / 2 : tflops;
}

describe("instances.json agrees with aws-ec2-nvidia-gpu-specs.json", () => {
  const byName = new Map(specs.gpus.map((g) => [g.gpu_name, g]));

  it("every gpu in GPU_DATA is mapped and present in the specs file", () => {
    const gpus = [...new Set(GPU_DATA.map((r) => r.gpu))];
    gpus.forEach((gpu) => {
      const name = SPEC_NAMES[gpu];
      expect(name, `no SPEC_NAMES entry for gpu="${gpu}"`).toBeTruthy();
      expect(byName.has(name), `specs JSON has no gpu_name="${name}"`).toBe(true);
    });
  });

  it("vramPerGpu matches memory_gb", () => {
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      const memory = Array.isArray(spec.memory_gb) ? spec.memory_gb : [spec.memory_gb];
      expect(memory, `${row.size} (${row.gpu}): vramPerGpu=${row.vramPerGpu}`).toContain(row.vramPerGpu);
    });
  });

  it("fp16Dense / fp8Dense / fp4Dense match the specs file", () => {
    // 1979 / 2 = 989.5 を表では 989 と丸めているため 0.5 の誤差を許す
    const TOLERANCE = 0.5;
    const pairs = [
      ["fp16Dense", "fp16_tflops", "fp16_with_sparsity"],
      ["fp8Dense", "fp8_tflops", "fp8_with_sparsity"],
      ["fp4Dense", "fp4_tflops", "fp4_with_sparsity"],
    ];
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      pairs.forEach(([dataField, specField, sparsityField]) => {
        const expected = denseOf(spec[specField], spec[sparsityField] === true);
        const actual = row[dataField];
        if (expected == null) {
          expect(actual, `${row.size} (${row.gpu}): ${dataField} should be null`).toBeNull();
        } else {
          expect(actual, `${row.size} (${row.gpu}): ${dataField}`).not.toBeNull();
          expect(
            Math.abs(actual - expected) <= TOLERANCE,
            `${row.size} (${row.gpu}): ${dataField}=${actual} vs specs ${expected}`,
          ).toBe(true);
        }
      });
    });
  });

  it("fp16NonTc matches fp16_tflops_non_tensor when the specs file has it", () => {
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      const expected = spec.fp16_tflops_non_tensor ?? null;
      expect(row.fp16NonTc, `${row.size} (${row.gpu}): fp16NonTc`).toBe(expected);
    });
  });
});

describe("priceNote carries the pricingAsOf placeholder", () => {
  it("is present in every language", () => {
    [
      ["ja", ja],
      ["en", en],
      ["ko", ko],
    ].forEach(([lang, dict]) => {
      expect(dict.notes.priceNote, `${lang}`).toContain("%PRICING_AS_OF%");
    });
  });
});
