import { describe, it, expect, beforeEach } from "vitest";
import { initFeaturesView, buildFeatureRows } from "../src/scripts/features-view.js";

const FILE = {
  features: [{ key: "fp8" }, { key: "nvlink" }, { key: "mig" }],
  gpus: {
    h100: { fp8: true, nvlink: true, mig: true },
    a10g: {
      fp8: false,
      nvlink: "partial",
      mig: false,
      notes: { nvlink: "A10G は NVLink 非対応" },
    },
  },
};

const ROWS = [
  { gpuKey: "h100", gpu: "H100", size: "p5.48xlarge" },
  { gpuKey: "h100", gpu: "H100", size: "p5.4xlarge" },
  { gpuKey: "a10g", gpu: "A10G", size: "g5.xlarge" },
];

beforeEach(() => {
  document.body.innerHTML = `
    <section id="panel-features" class="panel">
      <div id="features-table"></div>
      <p class="placeholder" id="features-missing" hidden></p>
      <p class="note" id="features-legend"></p>
      <div class="note" id="features-notes"></div>
    </section>
  `;
});

describe("buildFeatureRows", () => {
  it("collapses instances into one row per gpuKey and numbers the notes", () => {
    const { rows, notes } = buildFeatureRows(FILE, ROWS);
    expect(rows.map((r) => r.gpuKey)).toEqual(["h100", "a10g"]);
    expect(notes).toHaveLength(1);
    expect(notes[0].n).toBe(1);
    expect(rows[1].noteRefs.nvlink).toBe(1);
  });
});

describe("initFeaturesView", () => {
  it("renders one row per gpu, a note reference on the partial cell, and the legend", () => {
    initFeaturesView({ rows: ROWS, file: FILE });

    const bodyRows = [...document.querySelectorAll("#features-table tbody tr")];
    expect(bodyRows).toHaveLength(2);

    // 先頭列は GPU 名。データシートのリンクになっている。
    expect(bodyRows[0].querySelector("td.sticky a")?.textContent).toBe("H100");

    // A10G の NVLink セルは △ と注記番号を持ち、注記一覧にその番号が並ぶ。
    const nvlinkCell = bodyRows[1].children[2];
    expect(nvlinkCell.textContent).toBe("△ 1");
    expect(document.querySelectorAll("#features-notes .feature-notes li")).toHaveLength(1);
    expect(document.getElementById("features-legend").textContent).toContain("✓");
  });

  it("shows the placeholder when the data file is absent", () => {
    initFeaturesView({ rows: ROWS, file: null });
    expect(document.getElementById("features-missing").hidden).toBe(false);
    expect(document.querySelector("#features-table table")).toBeNull();
  });
});
