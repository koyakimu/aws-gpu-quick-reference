import { describe, it, expect, beforeEach } from "vitest";
import { renderTable, setupHover } from "../src/scripts/table.js";
import { GPU_DATA } from "../src/scripts/gpu-data.js";
import { formatPrice, isNew, computeSpans } from "../src/scripts/format.js";

// NEW バッジは addedAt と「今」の差で決まるので、実行日で結果が変わらないよう時刻を固定する。
const FIXED_NOW = new Date("2026-09-15T00:00:00Z");

function mountFixture() {
  document.body.innerHTML = '<table><tbody id="gpu-table-body"></tbody></table>';
}

function bodyRows() {
  return [...document.querySelectorAll("#gpu-table-body tr")];
}

function cellTexts(tr) {
  return [...tr.querySelectorAll("td")].map((td) => td.textContent);
}

describe("renderTable", () => {
  beforeEach(() => {
    mountFixture();
    renderTable({ now: FIXED_NOW });
  });

  it("renders one row per GPU_DATA entry", () => {
    expect(bodyRows()).toHaveLength(GPU_DATA.length);
    // 47 -> 71。AWS の accelerated computing 一覧との突き合わせで 24 行追加した
    // (P6e-GB200 3 / G7 6 / G6e 4 / G6 4 / G6f 1 / Gr6 2 / Gr6f 1 / G5 1 / G5g 1 / G4dn 1)。
    expect(GPU_DATA.length).toBe(71);
  });

  it("tags every row with its generation class", () => {
    const rows = bodyRows();
    rows.forEach((tr, i) => {
      expect(tr.className, `row ${i}`).toBe(`row-${GPU_DATA[i].gen}`);
    });
    expect(rows[0].className).toBe("row-blackwell");
    expect(rows.at(-1).className).toBe("row-volta");
  });

  it("renders the first data row with the full column set", () => {
    const first = bodyRows()[0];
    expect(first.querySelectorAll("td")).toHaveLength(22);
    expect(cellTexts(first)).toEqual([
      "Blackwell",
      "B300NEW",
      "P6-B300",
      "p6-b300.48xlarge",
      "8",
      "288GB(2.3TB)",
      "-",
      "2,250(18,000)",
      "4,500(36,000)",
      "4,500(36,000)",
      "9,000(72,000)",
      "13,500(108,000)",
      "18,000(144,000)",
      "v4 3200G",
      "Gen5",
      "192",
      "4TB",
      "30TB",
      formatPrice(GPU_DATA[0].price),
      formatPrice(GPU_DATA[0].priceGpu),
      formatPrice(GPU_DATA[0].priceCb),
      "✕",
    ]);
  });

  it("puts the instance size in a td.inst cell", () => {
    const rows = bodyRows();
    expect(rows[0].querySelector("td.inst").textContent).toBe("p6-b300.48xlarge");
    expect(rows[1].querySelector("td.inst").textContent).toBe("p6-b200.48xlarge");
    rows.forEach((tr, i) => {
      expect(tr.querySelector("td.inst").textContent, `row ${i}`).toBe(GPU_DATA[i].size);
    });
  });

  it("omits grouped cells on continuation rows", () => {
    const rows = bodyRows();
    // row 1 shares row 0's generation cell, so it is one column narrower
    expect(rows[1].querySelectorAll("td")).toHaveLength(21);
    // row 3 shares generation, GPU and EC2 cells with earlier rows
    expect(rows[3].querySelectorAll("td")).toHaveLength(19);
    // 行 2 が p6e-gb200.36xlarge、行 3 がその継続行 (u-p6e-gb200x36)。
    expect(rows[3].querySelector("td.inst").textContent).toBe("u-p6e-gb200x36");
  });

  it("groups rows with rowspan", () => {
    const spanning = document.querySelectorAll("#gpu-table-body td[rowspan]");
    // rowspan は span > 1 のセルにだけ付く。行が増減するたびに数え直さずに済むよう、
    // 描画と同じ computeSpans から期待値を導く。
    const spans = computeSpans(GPU_DATA);
    const expectedSpanning = spans.reduce(
      (total, span) => total + ["gen", "gpu", "ec2"].filter((field) => span[field] > 1).length,
      0,
    );
    expect(spanning.length).toBe(expectedSpanning);
    // 内訳は世代 6 (blackwell/hopper/ada/ampere/turing/volta)
    // + GPU 11 (GB200/RTX PRO/RTX PRO 4500/H200/H100/L40S/L4/A10G/T4/T4G/V100)
    // + EC2 12 (P6e-GB200/G7e/G7/P5/G6e/G6/G6f/Gr6/G5/G4dn/G5g/P3) = 29。
    expect(expectedSpanning).toBe(29);

    const archCell = bodyRows()[0].querySelector("td.arch");
    expect(archCell.textContent).toBe("Blackwell");
    const blackwellCount = GPU_DATA.filter((r) => r.gen === "blackwell").length;
    expect(archCell.getAttribute("rowspan")).toBe(String(blackwellCount));
    // 8 -> 17。P6e-GB200 3 行と G7 6 行を足した。
    expect(blackwellCount).toBe(17);
  });

  it("links GPU names to datasheets and badges new GPUs", () => {
    // GPU セルは「同じ世代の中で連続する同じ gpu」ごとに 1 つ = computeSpans の gpu > 0 の数。
    // すべての gpu に GPU_DATASHEET_LINKS のエントリがある (gpu-data.test.js が保証) ので、
    // GPU セル数と a.gpu-link の数は一致する。
    const expectedGpuCells = computeSpans(GPU_DATA).filter((span) => span.gpu > 0).length;
    expect(document.querySelectorAll("#gpu-table-body a.gpu-link")).toHaveLength(expectedGpuCells);
    // 15 = B300/B200/GB200/RTX PRO/RTX PRO 4500/H200/H100/L40S/L4/A100 40GB/A100 80GB/
    // A10G/T4/T4G/V100。Gr6・Gr6f は G6f と同じ L4 が続くので GPU セルは増えない。
    expect(expectedGpuCells).toBe(15);
    // バッジは addedAt が FIXED_NOW から 3 か月以内の行にだけ出る。
    const expectedBadges = GPU_DATA.filter((r) => isNew(r.addedAt, FIXED_NOW)).length;
    expect(document.querySelectorAll("#gpu-table-body span.badge")).toHaveLength(expectedBadges);
    // 4 = p6-b300.48xlarge / p6e-gb200.36xlarge / g7e.2xlarge / g7.2xlarge。
    // addedAt は GPU セルを持つ先頭行だけに付けているので、行数とバッジ数が一致する。
    expect(expectedBadges).toBe(4);

    const firstGpuLink = document.querySelector("#gpu-table-body a.gpu-link");
    expect(firstGpuLink.textContent).toBe("B300");
    expect(firstGpuLink.getAttribute("target")).toBe("_blank");
    expect(firstGpuLink.href).toMatch(/^https:\/\/www\.nvidia\.com/);
  });

  it("replaces previous content instead of appending on a re-render", () => {
    renderTable({ now: FIXED_NOW });
    renderTable({ now: FIXED_NOW });
    expect(bodyRows()).toHaveLength(GPU_DATA.length);
  });
});

describe("setupHover", () => {
  beforeEach(() => {
    mountFixture();
    renderTable({ now: FIXED_NOW });
    setupHover();
  });

  it("adds cell-hover to every cell of the hovered row and clears it on leave", () => {
    const row = bodyRows()[1];
    row.dispatchEvent(new Event("mouseenter"));
    row.querySelectorAll("td").forEach((td) => {
      expect(td.classList.contains("cell-hover")).toBe(true);
    });

    row.dispatchEvent(new Event("mouseleave"));
    row.querySelectorAll("td").forEach((td) => {
      expect(td.classList.contains("cell-hover")).toBe(false);
    });
  });

  it("highlights the spanning generation cell that covers the hovered row", () => {
    const archCell = bodyRows()[0].querySelector("td.arch");
    const row = bodyRows()[1]; // inside the blackwell rowspan range
    row.dispatchEvent(new Event("mouseenter"));
    expect(archCell.classList.contains("cell-hover-blackwell")).toBe(true);

    row.dispatchEvent(new Event("mouseleave"));
    expect(archCell.classList.contains("cell-hover-blackwell")).toBe(false);
  });
});
