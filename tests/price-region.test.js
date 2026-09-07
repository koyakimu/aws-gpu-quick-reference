import { describe, it, expect, beforeEach } from "vitest";
import {
  setRegionsFile,
  setPriceRegion,
  getPriceRegion,
  getRegionPrices,
  getPrice,
  initPriceRegionSelect,
  DEFAULT_PRICE_REGION,
} from "../src/scripts/price-region.js";
import { unitPrices } from "../src/scripts/calculator.js";
import { initCompareView } from "../src/scripts/compare-view.js";

// data/regions.json を切り詰めたもの。us-east-1 と ap-northeast-1 で価格が違う。
const REGIONS = {
  generatedAt: "2026-09-07T00:00:00Z",
  regions: [
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
  ],
  availability: {
    "p5.48xlarge": { "us-east-1": "both", "ap-northeast-1": "both" },
    "g6.xlarge": { "us-east-1": "od" },
  },
  prices: {
    "p5.48xlarge": {
      "ap-northeast-1": { od: 68.8, cb: 4.72 },
      "us-east-1": { od: 55.04, cb: 5.19 },
    },
    "g6.xlarge": { "us-east-1": { od: 0.8, cb: null } },
  },
};

const ROWS = [
  {
    gen: "hopper", gpu: "H100", gpuKey: "h100", ec2: "P5", size: "p5.48xlarge",
    count: 8, price: 55.04, priceGpu: 6.88, priceCb: 4.72, tokyo: true,
  },
  {
    gen: "ada", gpu: "L4", gpuKey: "l4", ec2: "G6", size: "g6.xlarge",
    count: 1, price: 0.8, priceGpu: 0.8, priceCb: null, tokyo: true,
  },
];

function mount() {
  document.body.innerHTML = `
    <div class="brand">
      <small id="pricing-caption">pricing 2026-09 ·</small>
      <select id="price-region" class="ctl" hidden></select>
    </div>
    <section id="panel-compare" class="panel">
      <div class="bar">
        <div class="filter-group" id="gen-filters"></div>
        <div class="menu-body" id="family-filters"></div>
        <div class="menu-body" id="column-toggles"></div>
        <div class="filter-group" id="region-filter" hidden></div>
        <span id="compare-row-count"></span>
      </div>
      <div id="compare-table"></div>
    </section>
  `;
}

function priceCells(size) {
  const row = [...document.querySelectorAll("#compare-table tbody tr")].find((tr) =>
    tr.textContent.includes(size),
  );
  const cells = [...row.querySelectorAll("td, th")].map((cell) => cell.textContent);
  // 末尾は price, priceGpu, priceCb, tokyo の順
  return { od: cells.at(-4), gpu: cells.at(-3), cb: cells.at(-2) };
}

beforeEach(() => {
  localStorage.clear();
  setRegionsFile(REGIONS);
  setPriceRegion(DEFAULT_PRICE_REGION);
});

describe("the header region selector drives the price columns", () => {
  it("re-renders $/h, $/GPU and $/GPU CB for the selected region", () => {
    mount();
    initPriceRegionSelect();
    initCompareView({ rows: ROWS, regionsFile: REGIONS });

    const select = document.getElementById("price-region");
    expect(select.hidden).toBe(false);
    expect([...select.options].map((o) => o.value)).toEqual(["us-east-1", "ap-northeast-1"]);
    expect(select.value).toBe("us-east-1");
    expect(priceCells("p5.48xlarge")).toEqual({ od: "55.04", gpu: "6.88", cb: "5.19" });

    select.value = "ap-northeast-1";
    select.dispatchEvent(new Event("change"));

    expect(getPriceRegion()).toBe("ap-northeast-1");
    expect(localStorage.getItem("gpu-ref-price-region")).toBe("ap-northeast-1");
    expect(priceCells("p5.48xlarge")).toEqual({ od: "68.80", gpu: "8.60", cb: "4.72" });
    // 東京に価格が無い行は 3 列とも空欄になる (行自体は残す)
    expect(priceCells("g6.xlarge")).toEqual({ od: "—", gpu: "—", cb: "—" });

    // regions.json に無い行は、既定リージョンだけ instances.json の値に落ちる
    const unknown = { size: "unknown.size", count: 8, price: 40, priceGpu: 5, priceCb: 3 };
    expect(getPrice(unknown, "us-east-1")).toEqual({ od: 40, gpu: 5, cb: 3 });
    expect(getPrice(unknown, "ap-northeast-1")).toEqual({ od: null, gpu: null, cb: null });
    expect(getRegionPrices("p5.48xlarge", "ap-northeast-1")).toEqual({ od: 68.8, cb: 4.72 });
  });
});

describe("calculator default unit prices", () => {
  it("uses the selected region's $/GPU and CB rate", () => {
    const row = ROWS[0];
    expect(unitPrices(row)).toEqual({ od: 6.88, cb: 5.19 });
    setPriceRegion("ap-northeast-1");
    expect(unitPrices(row)).toEqual({ od: 8.6, cb: 4.72 });
  });
});
