import { describe, it, expect } from "vitest";
import { scanPriceList, applyOdPricing } from "../scripts/lib/od-pricing.mjs";
import { roundUsd } from "../scripts/lib/instances-file.mjs";
import { PRICE_LIST_FIXTURE as FIXTURE } from "./fixtures/price-list.mjs";

// 同一 instanceType に SKU が2つ、かつ片方に offer term が2つある入力。
// 最安値が選ばれることを確かめるために使う。
const MIN_FIXTURE = `{
  "products" : {
    "GGGGGGGGGGGGGGGG" : {
      "attributes" : {
        "instanceType" : "p4d.24xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "HHHHHHHHHHHHHHHH" : {
      "attributes" : {
        "instanceType" : "p4d.24xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    }
  },
  "terms" : {
    "OnDemand" : {
      "GGGGGGGGGGGGGGGG" : {
        "GGGGGGGGGGGGGGGG.JRTCKXETXF" : {
          "priceDimensions" : {
            "GGGGGGGGGGGGGGGG.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "32.7726000000"
              },
              "appliesTo" : [ ]
            },
            "GGGGGGGGGGGGGGGG.JRTCKXETXF.AAAAAAAAAA" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "28.0000000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "HHHHHHHHHHHHHHHH" : {
        "HHHHHHHHHHHHHHHH.JRTCKXETXF" : {
          "priceDimensions" : {
            "HHHHHHHHHHHHHHHH.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "20.0000000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      }
    }
  }
}
`;

const LINES = FIXTURE.split("\n");

describe("scanPriceList", () => {
  it("returns the Linux / Shared / Used / NA On-Demand hourly price", async () => {
    const prices = await scanPriceList(LINES, new Set(["p5.48xlarge", "g6f.large"]));
    expect(prices.get("p5.48xlarge")).toBeCloseTo(55.044);
    expect(prices.get("g6f.large")).toBeCloseTo(0.201);
  });

  it("ignores instance types that were not asked for", async () => {
    const prices = await scanPriceList(LINES, new Set(["p5.48xlarge"]));
    expect(prices.has("m5.large")).toBe(false);
  });

  it("ignores Windows, Dedicated and UnusedCapacityReservation products", async () => {
    const prices = await scanPriceList(LINES, new Set(["p5.48xlarge"]));
    // Windows の 99.99、Dedicated / UnusedCapacityReservation の SKU が
    // 選ばれていないことを、価格が Linux/Shared/Used の値であることで確かめる
    expect(prices.get("p5.48xlarge")).toBeCloseTo(55.044);
    expect(prices.size).toBe(1);
  });

  it("ignores Reserved terms", async () => {
    const prices = await scanPriceList(LINES, new Set(["p5.48xlarge"]));
    expect(prices.get("p5.48xlarge")).not.toBeCloseTo(11.11);
  });

  it("returns an empty map when nothing matches", async () => {
    expect((await scanPriceList(LINES, new Set(["p9.99xlarge"]))).size).toBe(0);
  });

  it("accepts an async iterable of lines (streamed download)", async () => {
    async function* streamed() {
      for (const line of LINES) yield line;
    }
    const prices = await scanPriceList(streamed(), new Set(["p5.48xlarge", "g6f.large"]));
    expect(prices.get("p5.48xlarge")).toBeCloseTo(55.044);
    expect(prices.get("g6f.large")).toBeCloseTo(0.201);
  });

  it("takes the cheapest price when a size has several SKUs or offer terms", async () => {
    const prices = await scanPriceList(MIN_FIXTURE.split("\n"), new Set(["p4d.24xlarge"]));
    expect(prices.get("p4d.24xlarge")).toBeCloseTo(20.0);
  });
});

describe("applyOdPricing", () => {
  const base = [
    { size: "p5.48xlarge", unit: "instance", count: 8, price: 55.04, priceGpu: 6.88, priceCb: 4.72, tokyo: false },
    { size: "g6f.large", unit: "instance", count: "1/8", price: 0.2, priceGpu: 1.6, priceCb: null, tokyo: true },
    { size: "p5e.48xlarge", unit: "instance", count: 8, price: null, priceGpu: null, priceCb: 5.97, tokyo: true },
    { size: "u-p6e-gb200x72", unit: "ultraserver", count: 72, price: null, priceGpu: null, priceCb: 9.0, tokyo: true },
  ];

  it("writes price and recomputes priceGpu as price / count", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    const { instances } = applyOdPricing(base, prices, new Set(["p5.48xlarge"]));
    expect(instances[0].price).toBe(60);
    expect(instances[0].priceGpu).toBe(7.5);
  });

  it("handles a fractional GPU count", () => {
    const prices = new Map([["g6f.large", 0.24]]);
    const { instances } = applyOdPricing(base, prices, new Set());
    expect(instances[1].price).toBe(0.24);
    expect(instances[1].priceGpu).toBe(1.92);
  });

  it("rounds to two decimals", () => {
    const prices = new Map([["p5.48xlarge", 55.0440000001]]);
    const { instances } = applyOdPricing(base, prices, new Set());
    expect(instances[0].price).toBe(55.04);
    expect(instances[0].priceGpu).toBe(6.88);
  });

  it("sets tokyo from the ap-northeast-1 size set for priced rows", () => {
    // 両方向に動かす。開始値と同じ値を期待すると、tokyo の書き込みを消しても通ってしまう。
    // p5.48xlarge は tokyo: false から true へ、g6f.large は true から false へ。
    // 価格は fixture と同じ値を渡し、変化するのが tokyo だけになるようにしている。
    const prices = new Map([
      ["p5.48xlarge", 55.04],
      ["g6f.large", 0.2],
    ]);
    const { instances, changes } = applyOdPricing(base, prices, new Set(["p5.48xlarge"]));
    expect(instances[0].tokyo).toBe(true);
    expect(instances[1].tokyo).toBe(false);
    expect(changes).toContain("p5.48xlarge tokyo: false -> true");
    expect(changes).toContain("g6f.large tokyo: true -> false");
  });

  it("keeps tokyo for a row with no On-Demand price, even when absent from tokyoSizes", () => {
    // p5e.48xlarge は Capacity Blocks 専用で On-Demand の terms を持たない。
    // 東京の index.json にも出てこないが、CB では東京から使えるので true のまま残す。
    const prices = new Map([["p5.48xlarge", 55.04]]);
    const { instances, changes } = applyOdPricing(base, prices, new Set(["p5.48xlarge"]));
    expect(instances[2].size).toBe("p5e.48xlarge");
    expect(instances[2].tokyo).toBe(true);
    expect(changes.some((c) => c.includes("p5e.48xlarge"))).toBe(false);
  });

  it("leaves an UltraServer row alone because it gets no us-east-1 price", () => {
    // applyOdPricing は unit を見ない。UltraServer は Price List に載らず
    // us-east-1 の価格が付かないため、価格なしの行と同じ経路で素通しされる。
    const { instances } = applyOdPricing(base, new Map(), new Set());
    expect(instances[3].unit).toBe("ultraserver");
    expect(instances[3].tokyo).toBe(true);
    expect(instances[3].price).toBeNull();
  });

  it("leaves price and priceGpu untouched when the size has no On-Demand price", () => {
    const { instances } = applyOdPricing(base, new Map(), new Set());
    expect(instances[2].price).toBeNull();
    expect(instances[2].priceGpu).toBeNull();
    expect(instances[2].priceCb).toBe(5.97);
  });

  it("does not mutate the input array", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    applyOdPricing(base, prices, new Set());
    expect(base[0].price).toBe(55.04);
  });

  it("reports a change line per changed field", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    const { changes } = applyOdPricing(base, prices, new Set(["g6f.large"]));
    expect(changes).toContain("p5.48xlarge price: 55.04 -> 60");
    expect(changes.some((c) => c.startsWith("p5.48xlarge priceGpu"))).toBe(true);
    expect(changes).not.toContain("g6f.large tokyo: true -> true");
  });

  it("reports no changes when nothing moved", () => {
    // On-Demand 価格が 1 件も付かなければ price も tokyo も書き換えない。
    const { changes } = applyOdPricing(base, new Map(), new Set(["g6f.large", "p5e.48xlarge"]));
    expect(changes).toEqual([]);
  });
});

describe("roundUsd", () => {
  it("rounds three-decimal values half-up without float drift", () => {
    expect(roundUsd(12.355)).toBe(12.36);
    expect(roundUsd(4.725)).toBe(4.73);
    expect(roundUsd(0.2)).toBe(0.2);
    expect(roundUsd(55.044)).toBe(55.04);
  });
});
