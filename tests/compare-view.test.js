import { describe, it, expect, beforeEach } from "vitest";
import {
  COLUMN_GROUPS,
  COMPARE_COLUMNS,
  STORAGE_KEY,
  defaultState,
  loadState,
  saveState,
  regionFilter,
  filterRows,
  formatRowCount,
  initCompareView,
} from "../src/scripts/compare-view.js";
import { EMPTY } from "../src/scripts/table-engine.js";
import { GPU_DATA } from "../src/scripts/gpu-data.js";

// フィルタのテストは実データに依存しない小さな行で行う。
const ROWS = [
  { gen: "blackwell", gpu: "B200", gpuKey: "b200", ec2: "P6-B200", size: "p6-b200.48xlarge", count: 8, price: 113.93, priceCb: 12.36, tokyo: false, addedAt: "2026-09" },
  { gen: "hopper", gpu: "H100", gpuKey: "h100", ec2: "P5", size: "p5.48xlarge", count: 8, price: 55.04, priceCb: 3.93, tokyo: true, addedAt: "2023-07" },
  { gen: "ada", gpu: "L4", gpuKey: "l4", ec2: "G6", size: "g6.xlarge", count: 1, price: 0.8, priceCb: null, tokyo: true, addedAt: "2024-08" },
  { gen: "ada", gpu: "L40S", gpuKey: "l40s", ec2: "G6e", size: "g6e.xlarge", count: 1, price: 1.86, priceCb: null, tokyo: true, addedAt: "2024-08" },
];

const NOW = new Date(Date.UTC(2026, 8, 15));

function mountPanel() {
  document.body.innerHTML = `
    <section id="panel-compare" class="panel">
      <div class="bar">
        <div class="filter-group" id="gen-filters"></div>
        <details class="menu" id="family-menu"><summary class="ctl">F</summary><div class="menu-body" id="family-filters"></div></details>
        <details class="menu" id="column-menu"><summary class="ctl">C</summary><div class="menu-body" id="column-toggles"></div></details>
        <div class="filter-group" id="region-filter" hidden></div>
        <span class="row-count mono" id="compare-row-count"></span>
      </div>
      <div id="compare-table"></div>
    </section>
  `;
}

function column(key) {
  return COMPARE_COLUMNS.find((c) => c.key === key);
}

beforeEach(() => {
  localStorage.clear();
  mountPanel();
});

describe("COLUMN_GROUPS and COMPARE_COLUMNS", () => {
  it("names the six groups from the spec, in order", () => {
    expect(COLUMN_GROUPS).toEqual([
      "instance",
      "gpu",
      "performance",
      "connect",
      "system",
      "price",
    ]);
  });

  it("assigns every column to one of those groups", () => {
    for (const col of COMPARE_COLUMNS) {
      expect(COLUMN_GROUPS, `column ${col.key}`).toContain(col.group);
    }
  });

  it("gives every column an i18n label key and a known type", () => {
    const types = ["text", "number", "price", "flag", "availability", "feature"];
    for (const col of COMPARE_COLUMNS) {
      expect(typeof col.labelKey, `column ${col.key}`).toBe("string");
      expect(types, `column ${col.key}`).toContain(col.type);
    }
  });

  it("makes exactly one column sticky, and it is the instance size", () => {
    const sticky = COMPARE_COLUMNS.filter((c) => c.sticky);
    expect(sticky).toHaveLength(1);
    expect(sticky[0].key).toBe("size");
  });

  it("covers every field the mockup's table shows", () => {
    const keys = COMPARE_COLUMNS.map((c) => c.key);
    expect(keys).toContain("size");
    expect(keys).toContain("ec2");
    expect(keys).toContain("gpu");
    expect(keys).toContain("count");
    expect(keys).toContain("vramPerGpu");
    expect(keys).toContain("fp8Dense");
    expect(keys).toContain("price");
    expect(keys).toContain("priceGpu");
    expect(keys).toContain("priceCb");
    expect(keys).toContain("tokyo");
  });

  it("puts the GPU chip before the EC2 family (NVIDIA-side first)", () => {
    const keys = COMPARE_COLUMNS.map((c) => c.key);
    expect(keys.slice(0, 4)).toEqual(["size", "gpu", "ec2", "count"]);
  });

  it("has no generation column — the chip carries it", () => {
    expect(COMPARE_COLUMNS.map((c) => c.key)).not.toContain("gen");
  });
});

describe("column formats", () => {
  it("marks an estimated performance value with * (notes.fpNote)", () => {
    const fp8 = column("fp8Dense");
    expect(fp8.format(4500, { est: true })).toBe("4,500*");
    expect(fp8.format(4500, { est: false })).toBe("4,500");
    expect(fp8.format(null, { est: true })).toBe(EMPTY);
  });

  it("marks every performance column the same way", () => {
    for (const col of COMPARE_COLUMNS.filter((c) => c.group === "performance")) {
      expect(col.format(10, { est: true }), `column ${col.key}`).toBe("10*");
    }
  });

  it("shows the GPU count verbatim but sorts it numerically", () => {
    const count = column("count");
    expect(count.format("1/8", {})).toBe("1/8");
    expect(count.format(8, {})).toBe("8");
    expect(count.format(null, {})).toBe(EMPTY);
    expect(count.sortValue({ count: "1/8" })).toBeCloseTo(0.125);
    expect(count.sortValue({ count: 8 })).toBe(8);
  });

  it("labels a CB-only instance in the On-Demand column", () => {
    const price = column("price");
    expect(price.format(55.04, {})).toBe("55.04");
    expect(price.format(null, { priceCb: 3.93 })).toBe("CB専用");
    expect(price.format(null, { priceCb: null })).toBe(EMPTY);
  });

  it("leaves the CB column empty when there is no CB price", () => {
    const cb = column("priceCb");
    expect(cb.format(3.93, {})).toBe("3.93");
    expect(cb.format(null, {})).toBe(EMPTY);
  });

  it("scales VRAM down for a fractional GPU count", () => {
    const vram = column("vramPerGpu");
    expect(vram.format(24, { count: 1 })).toBe("24");
    expect(vram.format(24, { count: "1/8" })).toBe("3");
    expect(vram.format(null, { count: 1 })).toBe(EMPTY);
  });
});

describe("defaultState", () => {
  it("starts unsorted, unfiltered and with every group visible", () => {
    expect(defaultState()).toEqual({
      sortKey: null,
      sortDir: null,
      hiddenGroups: [],
      generations: [],
      families: [],
      region: null,
    });
  });
});

describe("saveState / loadState", () => {
  it("persists only hiddenGroups and generations", () => {
    saveState({
      sortKey: "price",
      sortDir: "asc",
      hiddenGroups: ["performance"],
      generations: ["hopper"],
      families: ["P5"],
      region: "ap-northeast-1",
    });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual({
      hiddenGroups: ["performance"],
      generations: ["hopper"],
    });
  });

  it("round-trips the persisted subset and defaults the rest", () => {
    saveState({ ...defaultState(), hiddenGroups: ["connect"], generations: ["ada"] });
    expect(loadState()).toEqual({
      sortKey: null,
      sortDir: null,
      hiddenGroups: ["connect"],
      generations: ["ada"],
      families: [],
      region: null,
    });
  });

  it("returns the defaults when nothing is stored", () => {
    expect(loadState()).toEqual(defaultState());
  });

  it("returns the defaults when the stored value is corrupt", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadState()).toEqual(defaultState());
  });

  it("drops a stored group name that is not a real group", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hiddenGroups: ["bogus", "price"] }));
    expect(loadState().hiddenGroups).toEqual(["price"]);
  });

  it("ignores a stored value of the wrong shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hiddenGroups: "price", generations: 3 }));
    expect(loadState()).toEqual(defaultState());
  });
});

describe("filterRows", () => {
  it("returns everything when no filter is set", () => {
    expect(filterRows(ROWS, defaultState())).toHaveLength(4);
  });

  it("keeps only the selected generations", () => {
    const out = filterRows(ROWS, { ...defaultState(), generations: ["ada"] });
    expect(out.map((r) => r.size)).toEqual(["g6.xlarge", "g6e.xlarge"]);
  });

  it("accepts several generations at once", () => {
    const out = filterRows(ROWS, { ...defaultState(), generations: ["blackwell", "hopper"] });
    expect(out.map((r) => r.gen)).toEqual(["blackwell", "hopper"]);
  });

  it("keeps only the selected families", () => {
    const out = filterRows(ROWS, { ...defaultState(), families: ["P5", "G6"] });
    expect(out.map((r) => r.ec2)).toEqual(["P5", "G6"]);
  });

  it("applies generation and family together", () => {
    const out = filterRows(ROWS, { ...defaultState(), generations: ["ada"], families: ["G6e"] });
    expect(out.map((r) => r.size)).toEqual(["g6e.xlarge"]);
  });

  it("can produce an empty result", () => {
    expect(filterRows(ROWS, { ...defaultState(), generations: ["volta"] })).toEqual([]);
  });

  it("preserves data order", () => {
    const out = filterRows(ROWS, { ...defaultState(), generations: ["ada", "blackwell"] });
    expect(out.map((r) => r.size)).toEqual(["p6-b200.48xlarge", "g6.xlarge", "g6e.xlarge"]);
  });

  it("does not modify the input array", () => {
    const copy = ROWS.slice();
    filterRows(ROWS, { ...defaultState(), generations: ["ada"] });
    expect(ROWS).toEqual(copy);
  });
});

describe("formatRowCount", () => {
  it("substitutes both markers", () => {
    expect(formatRowCount(12, 47)).toBe("12 / 47 行");
  });
});

describe("initCompareView", () => {
  it("renders one row per instance", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(4);
  });

  it("opens with a generation band before the first row", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const rows = [...document.querySelectorAll("#compare-table tbody tr")];
    expect(rows[0].classList.contains("band")).toBe(true);
    expect(rows[0].classList.contains("band-blackwell")).toBe(true);
    expect(rows[0].textContent).toBe("Blackwell");
    expect(rows[1].classList.contains("band")).toBe(false);
    expect(rows[1].children[1].textContent).toBe("B200");
    expect(rows[1].children[2].textContent).toBe("P6-B200");
  });

  it("mounts the engine's frame inside #compare-table", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelector("#compare-table .table-frame")).not.toBeNull();
  });

  it("shows the row count", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.getElementById("compare-row-count").textContent).toBe("4 / 4 行");
  });

  it("renders a GPU chip on every row, coloured by generation", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const chips = [...document.querySelectorAll("#compare-table tbody .chip")];
    expect(chips).toHaveLength(4);
    expect(chips[0].textContent).toContain("B200");
    expect(chips[0].classList.contains("chip-blackwell")).toBe(true);
    expect(chips[1].classList.contains("chip-hopper")).toBe(true);
  });

  it("links the GPU chip to the datasheet when there is one", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const chip = document.querySelector("#compare-table tbody .chip");
    expect(chip.tagName).toBe("A");
    expect(chip.getAttribute("href")).toContain("nvidia.com");
    expect(chip.getAttribute("rel")).toBe("noopener");
  });

  it("shows the family on every row — no rowspans anywhere", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelectorAll("#compare-table [rowspan]")).toHaveLength(0);
    const familyCells = [...document.querySelectorAll("#compare-table tbody tr:not(.band)")].map(
      (tr) => tr.textContent,
    );
    expect(familyCells[0]).toContain("P6-B200");
    expect(familyCells[3]).toContain("G6e");
  });

  it("builds one generation button per generation present in the rows", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const gens = [...document.querySelectorAll("#gen-filters [data-gen]")].map((b) => b.dataset.gen);
    expect(gens).toEqual(["blackwell", "hopper", "ada"]);
  });

  it("labels the generation buttons from the dictionary", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelector('[data-gen="ada"]').textContent).toBe("Ada Lovelace");
  });

  it("filters the table when a generation button is clicked", () => {
    initCompareView({ rows: ROWS, now: NOW });
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(2);
    expect(document.getElementById("compare-row-count").textContent).toBe("2 / 4 行");
    expect(document.querySelector('[data-gen="ada"]').classList.contains("on")).toBe(true);
    expect(document.querySelector('[data-gen="ada"]').getAttribute("aria-pressed")).toBe("true");
  });

  it("un-filters when the same generation button is clicked again", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const btn = document.querySelector('[data-gen="ada"]');
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(4);
    expect(btn.classList.contains("on")).toBe(false);
  });

  it("builds one family checkbox per family, in data order", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const families = [...document.querySelectorAll("#family-filters [data-family]")].map(
      (el) => el.dataset.family,
    );
    expect(families).toEqual(["P6-B200", "P5", "G6", "G6e"]);
  });

  it("filters by family checkbox", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const box = document.querySelector('[data-family="P5"]');
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(1);
  });

  it("does not persist the family filter", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const box = document.querySelector('[data-family="P5"]');
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("builds one column toggle per group, all checked", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const boxes = [...document.querySelectorAll("#column-toggles [data-group]")];
    expect(boxes.map((b) => b.dataset.group)).toEqual(COLUMN_GROUPS);
    expect(boxes.every((b) => b.checked)).toBe(true);
  });

  it("hides a column group when its toggle is cleared", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const before = document.querySelectorAll("#compare-table thead th").length;
    const box = document.querySelector('[data-group="performance"]');
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    const after = document.querySelectorAll("#compare-table thead th").length;
    expect(after).toBeLessThan(before);
    expect(after).toBe(
      COMPARE_COLUMNS.filter((c) => c.group !== "performance").length,
    );
  });

  it("persists hidden groups and generations, but not the sort", () => {
    initCompareView({ rows: ROWS, now: NOW });
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    const box = document.querySelector('[data-group="connect"]');
    box.checked = false;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    document
      .querySelectorAll("#compare-table thead th.sortable")[1]
      .dispatchEvent(new Event("click", { bubbles: true }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored).toEqual({ hiddenGroups: ["connect"], generations: ["ada"] });
  });

  it("restores the persisted state on the next visit", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ hiddenGroups: ["performance"], generations: ["ada"] }),
    );
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(2);
    expect(document.querySelector('[data-gen="ada"]').classList.contains("on")).toBe(true);
    expect(document.querySelector('[data-group="performance"]').checked).toBe(false);
  });

  it("sorts when a header is clicked, and keeps the filters", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const priceHeader = [...document.querySelectorAll("#compare-table thead th")].find(
      (th) => th.dataset.key === "price",
    );
    priceHeader.dispatchEvent(new Event("click", { bubbles: true }));
    const first = document.querySelector("#compare-table tbody tr:not(.band) td");
    expect(first.textContent).toBe("p6-b200.48xlarge"); // desc: 113.93 が先頭
  });

  it("keeps the sort when a filter changes afterwards", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const priceHeader = [...document.querySelectorAll("#compare-table thead th")].find(
      (th) => th.dataset.key === "price",
    );
    priceHeader.dispatchEvent(new Event("click", { bubbles: true }));
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    const sizes = [...document.querySelectorAll("#compare-table tbody tr:not(.band) td:first-child")].map(
      (td) => td.textContent,
    );
    expect(sizes).toEqual(["g6e.xlarge", "g6.xlarge"]); // 1.86 → 0.80
  });

  it("shows the empty-result message when nothing matches", () => {
    initCompareView({ rows: ROWS, now: NOW });
    const box = document.querySelector('[data-family="P5"]');
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(0);
    expect(document.querySelector("#compare-table .empty").textContent).toBe(
      "条件に合う行がありません。",
    );
  });

  it("hides the empty-result message while there are rows", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.querySelector("#compare-table .empty").hidden).toBe(true);
  });

  it("defaults to the real GPU_DATA when no rows are passed", () => {
    initCompareView();
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(GPU_DATA.length);
  });

  it("builds a generation button for every generation in the real data", () => {
    initCompareView();
    const gens = [...document.querySelectorAll("#gen-filters [data-gen]")].map((b) => b.dataset.gen);
    expect(gens).toEqual(["blackwell", "hopper", "ada", "ampere", "turing", "volta"]);
  });

  it("does not throw when the panel is absent", () => {
    document.body.innerHTML = "";
    expect(() => initCompareView({ rows: ROWS, now: NOW })).not.toThrow();
  });

  it("re-renders on the returned update()", () => {
    const view = initCompareView({ rows: ROWS, now: NOW });
    document.getElementById("compare-row-count").textContent = "";
    view.update();
    expect(document.getElementById("compare-row-count").textContent).toBe("4 / 4 行");
  });
});

describe("region filter", () => {
  const FILE = {
    generatedAt: "2026-09-07T09:00:00Z",
    regions: [
      { code: "us-east-1", name: "US East (N. Virginia)" },
      { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    ],
    availability: {
      "p6-b200.48xlarge": { "us-east-1": "both" },
      "p5.48xlarge": { "us-east-1": "both", "ap-northeast-1": "cb" },
      "g6.xlarge": { "ap-northeast-1": "od" },
      "g6e.xlarge": {},
    },
  };

  it("passes every row through when no region is selected", () => {
    expect(regionFilter(ROWS, null, FILE)).toHaveLength(ROWS.length);
  });

  it("keeps only rows available in the selected region", () => {
    expect(regionFilter(ROWS, "ap-northeast-1", FILE).map((r) => r.size)).toEqual([
      "p5.48xlarge",
      "g6.xlarge",
    ]);
  });

  it("builds the select from regions.json and hides the filter without it", () => {
    initCompareView({ rows: ROWS, regionsFile: FILE });
    const select = document.getElementById("region-select");
    expect(document.getElementById("region-filter").hidden).toBe(false);
    expect([...select.options].map((o) => o.value)).toEqual(["", "us-east-1", "ap-northeast-1"]);

    select.value = "ap-northeast-1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr:not(.band)")).toHaveLength(2);

    mountPanel();
    initCompareView({ rows: ROWS, regionsFile: null });
    expect(document.getElementById("region-filter").hidden).toBe(true);
  });
});
