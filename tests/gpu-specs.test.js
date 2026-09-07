import { describe, it, expect, beforeEach } from "vitest";
import specs from "../data/gpu-specs.json";
import { GPU_DATA } from "../src/scripts/gpu-data.js";
import { initGpuSpecsView, SPEC_FIELDS } from "../src/scripts/gpu-specs-view.js";
import { initCompareView } from "../src/scripts/compare-view.js";

// 仕様: instances.json のすべての gpuKey が gpu-specs.json に載っていること。
describe("gpu-specs.json covers every gpuKey", () => {
  it("has an entry for every distinct gpuKey and a source URL", () => {
    const keys = [...new Set(GPU_DATA.map((row) => row.gpuKey))];
    const missing = keys.filter((key) => !(key in specs.gpus));
    expect(missing, "gpuKey without a gpu-specs.json entry").toEqual([]);
    for (const key of keys) {
      expect(specs.gpus[key].source, `${key}: source`).toMatch(/^https:\/\//);
    }
  });

  it("every numeric field is a number or null", () => {
    for (const [gpuKey, entry] of Object.entries(specs.gpus)) {
      for (const field of SPEC_FIELDS) {
        const value = entry[field];
        expect(
          value === null || (typeof value === "number" && Number.isFinite(value) && value > 0),
          `${gpuKey}.${field}=${JSON.stringify(value)} must be a positive number or null`,
        ).toBe(true);
      }
    }
  });
});

describe("GPU tab rendering", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="panel-features" class="panel">
        <div class="menu-body" id="spec-column-toggles"></div>
        <div id="gpu-specs-table"></div>
        <p class="placeholder" id="specs-missing" hidden></p>
        <p class="note" id="specs-unit-note"></p>
      </section>
      <section id="panel-compare" class="panel"><div id="compare-table"></div></section>
    `;
  });

  it("renders one row per GPU with the Compute / Memory / Power group header", () => {
    initGpuSpecsView();

    const bodyRows = [...document.querySelectorAll("#gpu-specs-table tbody tr")];
    expect(bodyRows).toHaveLength(15);

    const groupHead = document.querySelector("#gpu-specs-table thead tr.group-head");
    expect(groupHead).not.toBeNull();
    const spans = [...groupHead.children].map((th) => th.colSpan);
    expect(spans).toEqual([1, 17, 2, 1]);

    // 先頭列は世代チップつきのデータシートリンク。
    expect(bodyRows[0].querySelector("td.sticky a.chip")?.textContent).toBe("B300");
  });

  it("adds FP32 and TF32 Dense to the compare table", () => {
    initCompareView();
    const headers = [...document.querySelectorAll("#compare-table thead th")].map((th) => th.textContent);
    expect(headers).toContain("FP32");
    expect(headers).toContain("TF32 Dense");
  });
});
