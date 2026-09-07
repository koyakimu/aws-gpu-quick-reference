import { describe, it, expect } from "vitest";
import {
  scanInstanceTypes,
  cbAvailability,
  mergeAvailability,
  regionGroup,
  regionOrder,
  carryOverRegions,
  sameExceptGeneratedAt,
  REGION_GROUPS,
  STANDARD_REGION,
} from "../scripts/lib/regions.mjs";

// AWS Price List の region index.json を切り詰めた固定入力。
// インデント幅が意味を持つのでそのまま維持すること。
// terms セクションに p5.48xlarge を置いてあるのは、products で打ち切っても
// 誤って拾わないことを確かめるため。
const FIXTURE = `{
  "formatVersion" : "v1.0",
  "offerCode" : "AmazonEC2",
  "products" : {
    "AAAAAAAAAAAAAAAA" : {
      "sku" : "AAAAAAAAAAAAAAAA",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    },
    "BBBBBBBBBBBBBBBB" : {
      "sku" : "BBBBBBBBBBBBBBBB",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Windows",
        "tenancy" : "Shared"
      }
    },
    "CCCCCCCCCCCCCCCC" : {
      "sku" : "CCCCCCCCCCCCCCCC",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6e.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Dedicated"
      }
    },
    "DDDDDDDDDDDDDDDD" : {
      "sku" : "DDDDDDDDDDDDDDDD",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "m5.large",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    },
    "EEEEEEEEEEEEEEEE" : {
      "sku" : "EEEEEEEEEEEEEEEE",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    }
  },
  "terms" : {
    "OnDemand" : {
      "ZZZZZZZZZZZZZZZZ" : {
        "attributes" : {
          "instanceType" : "p4d.24xlarge",
          "operatingSystem" : "Linux",
          "tenancy" : "Shared"
        }
      }
    }
  }
}`;

const WANTED = new Set(["p5.48xlarge", "g6.xlarge", "g6e.xlarge", "p4d.24xlarge"]);

// CB 価格 JSON (pricing.json) の instance_types を切り詰めたもの。
const CB_FEED = {
  "p5.48xlarge": {
    pricing: [
      { region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 3.93 },
      { region: "Asia Pacific (Tokyo)", region_code: "ap-northeast-1", accelerator_hourly_rate_usd: 4.5 },
    ],
  },
  "u-p6e-gb200x72": {
    pricing: [{ region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 12.36 }],
  },
  // region_code が欠けた行と、通常リージョンでない行は無視する
  "g6.xlarge": {
    pricing: [
      { region: "US East (Dallas)", region_code: "us-east-1-dfw-1", accelerator_hourly_rate_usd: 1.0 },
      { region: "Unknown", accelerator_hourly_rate_usd: 1.0 },
    ],
  },
  "trn2.48xlarge": {
    pricing: [{ region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 1.0 }],
  },
};

describe("scanInstanceTypes", () => {
  it("keeps Linux/Shared wanted sizes, drops the rest, and stops at terms", async () => {
    const { sizes, location } = await scanInstanceTypes(FIXTURE.split("\n"), WANTED);
    expect([...sizes].sort()).toEqual(["g6.xlarge", "p5.48xlarge"]);
    expect(sizes.has("p4d.24xlarge")).toBe(false); // terms にしか無い
    expect(location).toBe("US East (N. Virginia)");
  });
});

describe("cbAvailability", () => {
  it("maps wanted sizes to standard region codes from the CB feed", () => {
    const map = cbAvailability(CB_FEED, new Set([...WANTED, "u-p6e-gb200x72"]));
    expect([...map.get("p5.48xlarge")].sort()).toEqual(["ap-northeast-1", "us-east-1"]);
    expect([...map.get("u-p6e-gb200x72")]).toEqual(["us-east-1"]); // UltraServer は CB のみ
    expect(map.has("g6.xlarge")).toBe(false); // Local Zone と region_code 無しだけ
    expect(map.has("trn2.48xlarge")).toBe(false); // wantedSizes に無い
  });
});

describe("mergeAvailability", () => {
  it("labels od / cb / both and omits regions with no availability", () => {
    const od = new Map([
      ["us-east-1", new Set(["p5.48xlarge", "g6.xlarge"])],
      ["ap-northeast-1", new Set(["g6.xlarge"])],
    ]);
    const cb = new Map([
      ["us-east-1", new Set(["p5.48xlarge"])],
      ["ap-northeast-1", new Set(["p5.48xlarge"])],
    ]);
    const result = mergeAvailability(["p5.48xlarge", "g6.xlarge", "p3.2xlarge"], od, cb);
    expect(result["p5.48xlarge"]).toEqual({ "us-east-1": "both", "ap-northeast-1": "cb" });
    expect(result["g6.xlarge"]).toEqual({ "us-east-1": "od", "ap-northeast-1": "od" });
    expect(result["p3.2xlarge"]).toEqual({}); // 全リージョンで提供なし
  });
});

describe("regionOrder", () => {
  it("sorts by geographic group: NA -> SA -> EU -> ME/AF -> AP", () => {
    const input = [
      { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
      { code: "eu-west-1", name: "Europe (Ireland)" },
      { code: "us-east-1", name: "US East (N. Virginia)" },
      { code: "il-central-1", name: "Israel (Tel Aviv)" },
      { code: "sa-east-1", name: "South America (Sao Paulo)" },
      { code: "ca-central-1", name: "Canada (Central)" },
      { code: "af-south-1", name: "Africa (Cape Town)" },
    ];
    expect(regionOrder(input).map((r) => r.code)).toEqual([
      "ca-central-1",
      "us-east-1",
      "sa-east-1",
      "eu-west-1",
      "af-south-1",
      "il-central-1",
      "ap-northeast-1",
    ]);
    expect(input[0].code).toBe("ap-northeast-1"); // 入力は変更しない
    expect(REGION_GROUPS).toEqual(["na", "sa", "eu", "meaf", "ap"]);
    expect(regionGroup("mx-central-1")).toBe("na");
    expect(regionGroup("me-central-1")).toBe("meaf");
    expect(STANDARD_REGION.test("us-east-1-dfw-1")).toBe(false);
  });
});

describe("carryOverRegions and sameExceptGeneratedAt", () => {
  it("restores failed regions from the previous file and detects real changes", () => {
    const previous = {
      generatedAt: "2026-09-01T00:00:00Z",
      regions: [{ code: "us-east-1", name: "US East (N. Virginia)" }],
      availability: { "p5.48xlarge": { "us-east-1": "both", "eu-west-1": "od" } },
    };
    const fresh = { "p5.48xlarge": { "us-east-1": "od" } };
    const restored = carryOverRegions(fresh, previous.availability, ["eu-west-1"]);
    expect(restored["p5.48xlarge"]).toEqual({ "us-east-1": "od", "eu-west-1": "od" });

    const next = { generatedAt: "2026-09-08T00:00:00Z", regions: previous.regions, availability: previous.availability };
    expect(sameExceptGeneratedAt(next, previous)).toBe(true);
    expect(sameExceptGeneratedAt({ ...next, availability: fresh }, previous)).toBe(false);
  });
});
