import { describe, it, expect, beforeEach } from "vitest";
import { renderTable, setupHover } from "../src/scripts/table.js";
import { GPU_DATA } from "../src/scripts/gpu-data.js";
import { formatPrice, isNew } from "../src/scripts/format.js";

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
    expect(GPU_DATA.length).toBe(47);
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
    expect(rows[3].querySelector("td.inst").textContent).toBe("g7e.4xlarge");
  });

  it("groups rows with rowspan", () => {
    const spanning = document.querySelectorAll("#gpu-table-body td[rowspan]");
    // rowspan は span > 1 のセルにだけ付く。内訳は世代 6 (blackwell/hopper/ada/ampere/turing/volta)
    // + GPU 9 (RTX PRO/H200/H100/L40S/L4/A10G/T4/T4G/V100)
    // + EC2 9 (G7e/P5/G6e/G6/G6f/G5/G4dn/G5g/P3) = 24。
    expect(spanning.length).toBe(24);

    const archCell = bodyRows()[0].querySelector("td.arch");
    expect(archCell.textContent).toBe("Blackwell");
    const blackwellCount = GPU_DATA.filter((r) => r.gen === "blackwell").length;
    expect(archCell.getAttribute("rowspan")).toBe(String(blackwellCount));
    expect(blackwellCount).toBe(8);
  });

  it("links GPU names to datasheets and badges new GPUs", () => {
    // GPU セルは「同じ世代の中で連続する同じ gpu」ごとに 1 つ。13 = B300/B200/RTX PRO/H200/H100/
    // L40S/L4/A100 40GB/A100 80GB/A10G/T4/T4G/V100。旧データでは L4 (G6/G6f) と H200 (P5en/P5e)
    // がそれぞれ 2 セルに分かれていたので 15 だった。
    expect(document.querySelectorAll("#gpu-table-body a.gpu-link")).toHaveLength(13);
    // バッジは addedAt が FIXED_NOW から 3 か月以内の行にだけ出る。
    const expectedBadges = GPU_DATA.filter((r) => isNew(r.addedAt, FIXED_NOW)).length;
    expect(document.querySelectorAll("#gpu-table-body span.badge")).toHaveLength(expectedBadges);
    expect(expectedBadges).toBe(2);

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
