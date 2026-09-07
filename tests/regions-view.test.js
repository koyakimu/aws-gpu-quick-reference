import { describe, it, expect, beforeEach } from "vitest";
import { availabilityColumns, initRegionsView } from "../src/scripts/regions-view.js";

const ROWS = [
  { gen: "hopper", gpu: "H100", ec2: "P5", size: "p5.48xlarge" },
  { gen: "ada", gpu: "L4", ec2: "G6", size: "g6.xlarge" },
];

const FILE = {
  generatedAt: "2026-09-07T09:00:00Z",
  regions: [
    { code: "us-east-1", name: "US East (N. Virginia)" },
    { code: "eu-west-1", name: "Europe (Ireland)" },
    { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
  ],
  availability: {
    "p5.48xlarge": { "us-east-1": "both", "ap-northeast-1": "cb" },
    "g6.xlarge": { "us-east-1": "od", "eu-west-1": "od" },
  },
};

function mountPanel() {
  document.body.innerHTML = `
    <section id="panel-regions" class="panel">
      <div class="bar"><div class="filter-group" id="region-groups"></div></div>
      <div id="regions-table"></div>
      <p class="placeholder" id="regions-missing" hidden></p>
      <p class="note mono" id="regions-generated"></p>
    </section>
  `;
}

beforeEach(() => {
  localStorage.clear();
  mountPanel();
});

describe("availabilityColumns", () => {
  it("builds one availability column per region, grouped geographically", () => {
    const columns = availabilityColumns(FILE.regions);
    expect(columns.map((c) => c.key)).toEqual(["us-east-1", "eu-west-1", "ap-northeast-1"]);
    expect(columns.map((c) => c.group)).toEqual(["na", "eu", "ap"]);
    expect(columns[0].type).toBe("availability");
    expect(columns[0].labelKey).toBe("us-east-1");
    expect(columns[0].title).toBe("US East (N. Virginia)");
  });
});

describe("initRegionsView", () => {
  it("renders instances as rows and regions as columns", () => {
    initRegionsView({ rows: ROWS, file: FILE });

    const head = [...document.querySelectorAll("#regions-table thead th")];
    // 先頭列は t("table.instanceSize") = ja の "サイズ"。既定言語は ja。
    expect(head.map((th) => th.textContent.trim())).toEqual([
      "サイズ",
      "us-east-1",
      "eu-west-1",
      "ap-northeast-1",
    ]);
    expect(head[1].title).toBe("US East (N. Virginia)");
    expect(head[0].classList.contains("sticky")).toBe(true);

    const first = [...document.querySelectorAll("#regions-table tbody tr")[0].children];
    expect(first[0].textContent).toBe("p5.48xlarge");
    expect(first[1].textContent).toBe("OD+CB");
    expect(first[2].textContent).toBe("—"); // eu-west-1 は提供なし
    expect(first[3].textContent).toBe("CB");

    expect(document.getElementById("regions-generated").textContent).toContain("2026-09-07");
    expect(document.getElementById("regions-missing").hidden).toBe(true);
    // 地理グループの表示切替 (2 段見出しの代わり)
    expect([...document.querySelectorAll("#region-groups [data-group]")].map((b) => b.dataset.group)).toEqual([
      "na",
      "eu",
      "ap",
    ]);
  });

  it("renders a row of dashes for a size with no availability anywhere", () => {
    const rows = [...ROWS, { gen: "blackwell", gpu: "GB200", ec2: "P6e-GB200", size: "p6e-gb200.36xlarge" }];
    initRegionsView({ rows, file: FILE });
    const last = [...document.querySelectorAll("#regions-table tbody tr")[2].children];
    expect(last.map((td) => td.textContent)).toEqual(["p6e-gb200.36xlarge", "—", "—", "—"]);
  });

  it("shows the placeholder and no table when regions.json is absent", () => {
    initRegionsView({ rows: ROWS, file: null });
    expect(document.getElementById("regions-missing").hidden).toBe(false);
    expect(document.querySelector("#regions-table table")).toBe(null);
    expect(document.getElementById("regions-generated").textContent).toBe("");
  });
});
