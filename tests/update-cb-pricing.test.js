import { describe, it, expect } from "vitest";
import { pickRate, applyCbPricing, unmatchedFeedKeys } from "../scripts/lib/cb-pricing.mjs";

describe("pickRate", () => {
  it("prefers Tokyo", () => {
    expect(
      pickRate([
        { region: "US East (N. Virginia)", accelerator_hourly_rate_usd: 4.72 },
        { region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 6.24 },
      ]),
    ).toBe(6.24);
  });

  it("matches on region_code as well as the display name", () => {
    expect(
      pickRate([
        { region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 4.72 },
        { region: "東京", region_code: "ap-northeast-1", accelerator_hourly_rate_usd: 6.24 },
      ]),
    ).toBe(6.24);
  });

  it("falls back to the first priority region present", () => {
    expect(
      pickRate([
        { region: "US West (Oregon)", accelerator_hourly_rate_usd: 3.5 },
        { region: "US East (Ohio)", accelerator_hourly_rate_usd: 3.1 },
      ]),
    ).toBe(3.1);
  });

  it("falls back to the first entry when no priority region matches", () => {
    expect(pickRate([{ region: "Europe (Stockholm)", accelerator_hourly_rate_usd: 2.2 }])).toBe(2.2);
  });

  it("returns null for an empty list", () => {
    expect(pickRate([])).toBeNull();
  });

  it("ignores non-numeric rates such as \"N/A\"", () => {
    expect(
      pickRate([
        { region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: "N/A" },
        { region: "US East (N. Virginia)", accelerator_hourly_rate_usd: 4.72 },
      ]),
    ).toBe(4.72);
    expect(pickRate([{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: "N/A" }])).toBeNull();
  });
});

describe("applyCbPricing", () => {
  const base = [
    { size: "p5.48xlarge", priceCb: 4.72, tokyo: true },
    { size: "p5e.48xlarge", priceCb: 5.97, tokyo: false },
    { size: "g6.xlarge", priceCb: null, tokyo: false },
  ];

  it("writes a rounded numeric priceCb", () => {
    const { instances } = applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 12.355 }] },
    });
    expect(instances[0].priceCb).toBe(12.36);
  });

  it("leaves sizes that are absent from the CB feed untouched", () => {
    const { instances } = applyCbPricing(base, {});
    expect(instances[1].priceCb).toBe(5.97);
    expect(instances[2].priceCb).toBeNull();
  });

  it("does not mutate the input", () => {
    applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 9.99 }] },
    });
    expect(base[0].priceCb).toBe(4.72);
  });

  it("reports changes and stays quiet when nothing moved", () => {
    const feed = {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 4.72 }] },
    };
    expect(applyCbPricing(base, feed).changes).toEqual([]);

    const moved = {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 5.0 }] },
    };
    expect(applyCbPricing(base, moved).changes).toEqual(["p5.48xlarge priceCb: 4.72 -> 5"]);
  });

  it("names the region in the change line when it is not Tokyo", () => {
    const { changes } = applyCbPricing(base, {
      "p5.48xlarge": {
        pricing: [{ region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 5.0 }],
      },
    });
    expect(changes).toEqual(["p5.48xlarge priceCb: 4.72 -> 5 (us-east-1)"]);
  });

  it("fills in a previously null priceCb", () => {
    const { instances } = applyCbPricing(base, {
      "g6.xlarge": { pricing: [{ region: "US East (N. Virginia)", accelerator_hourly_rate_usd: 0.55 }] },
    });
    expect(instances[2].priceCb).toBe(0.55);
  });

  // tokyo は「On-Demand か Capacity Blocks のどちらかで東京から使えるか」。
  // CB フィードから分かるのは CB 側だけなので、true にはできても false にはできない。
  it("sets tokyo true when the CB feed lists Tokyo", () => {
    const { instances, changes } = applyCbPricing(base, {
      "p5e.48xlarge": {
        pricing: [{ region: "Asia Pacific (Tokyo)", region_code: "ap-northeast-1", accelerator_hourly_rate_usd: 5.97 }],
      },
    });
    expect(instances[1].tokyo).toBe(true);
    expect(changes).toEqual(["p5e.48xlarge tokyo: false -> true"]);
  });

  it("leaves priceCb untouched and records no change for a non-numeric rate", () => {
    const { instances, changes } = applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: "N/A" }] },
    });
    expect(instances[0].priceCb).toBe(4.72);
    expect(changes).toEqual([]);
  });

  // 東京にレートが無くても提供自体はされているので tokyo は true に倒す。
  it("sets tokyo true for a Tokyo entry that carries no rate", () => {
    const { instances, changes } = applyCbPricing(base, {
      "p5e.48xlarge": {
        pricing: [{ region: "Asia Pacific (Tokyo)", region_code: "ap-northeast-1", accelerator_hourly_rate_usd: "N/A" }],
      },
    });
    expect(instances[1].priceCb).toBe(5.97);
    expect(instances[1].tokyo).toBe(true);
    expect(changes).toEqual(["p5e.48xlarge tokyo: false -> true"]);
  });

  it("tolerates a feed entry with no pricing array", () => {
    const { instances, changes } = applyCbPricing(base, { "g6.xlarge": {} });
    expect(instances[2].priceCb).toBeNull();
    expect(changes).toEqual([]);
  });

  it("never clears tokyo when the CB feed has no Tokyo entry", () => {
    const { instances, changes } = applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "US East (Ohio)", region_code: "us-east-2", accelerator_hourly_rate_usd: 4.72 }] },
    });
    expect(instances[0].tokyo).toBe(true);
    expect(changes).toEqual([]);
  });
});

describe("unmatchedFeedKeys", () => {
  const instances = [{ size: "p5.48xlarge" }, { size: "g6.xlarge" }];

  it("lists feed keys that have no row", () => {
    expect(unmatchedFeedKeys(instances, { "p5.48xlarge": {}, "p6-b200.48xlarge": {} })).toEqual([
      "p6-b200.48xlarge",
    ]);
  });

  it("skips Trainium and Inferentia keys", () => {
    expect(
      unmatchedFeedKeys(instances, { "trn2.48xlarge": {}, "trn1.32xlarge": {}, "inf2.48xlarge": {} }),
    ).toEqual([]);
  });

  it("returns an empty list when every feed key has a row", () => {
    expect(unmatchedFeedKeys(instances, { "p5.48xlarge": {}, "g6.xlarge": {} })).toEqual([]);
  });
});
