import { describe, it, expect, beforeEach } from "vitest";
import { renderTable, setupHover } from "../src/scripts/table.js";
import { GPU_DATA } from "../src/scripts/gpu-data.js";

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
    renderTable();
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
      "$142.42",
      "$17.80",
      "$14.04",
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
    expect(spanning.length).toBe(24);

    const archCell = bodyRows()[0].querySelector("td.arch");
    expect(archCell.textContent).toBe("Blackwell");
    const blackwellCount = GPU_DATA.filter((r) => r.gen === "blackwell").length;
    expect(archCell.getAttribute("rowspan")).toBe(String(blackwellCount));
    expect(blackwellCount).toBe(8);
  });

  it("links GPU names to datasheets and badges new GPUs", () => {
    expect(document.querySelectorAll("#gpu-table-body a.gpu-link")).toHaveLength(15);
    expect(document.querySelectorAll("#gpu-table-body span.badge")).toHaveLength(2);

    const firstGpuLink = document.querySelector("#gpu-table-body a.gpu-link");
    expect(firstGpuLink.textContent).toBe("B300");
    expect(firstGpuLink.getAttribute("target")).toBe("_blank");
    expect(firstGpuLink.href).toMatch(/^https:\/\/www\.nvidia\.com/);
  });

  it("replaces previous content instead of appending on a re-render", () => {
    renderTable();
    renderTable();
    expect(bodyRows()).toHaveLength(GPU_DATA.length);
  });
});

describe("setupHover", () => {
  beforeEach(() => {
    mountFixture();
    renderTable();
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
