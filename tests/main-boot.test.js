import { describe, it, expect, beforeAll } from "vitest";
import html from "../src/index.html?raw";
import { GPU_DATA } from "../src/scripts/gpu-data.js";
import { TAB_IDS } from "../src/scripts/tabs.js";

// 実物の index.html を読んで body だけを jsdom に流し込む。
// マークアップと main.js の配線がずれたらここで落ちる。
const body = html
  .replace(/^[\s\S]*<body>/, "")
  .replace(/<\/body>[\s\S]*$/, "")
  .replace(/<script[\s\S]*?<\/script>/g, "");

beforeAll(async () => {
  document.body.innerHTML = body;
  // main.js は DOMContentLoaded で起動する。テストでは既に発火済みなので手で投げる。
  await import("../src/scripts/main.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));
});

describe("main.js boot", () => {
  it("renders every instance into the compare table", () => {
    const rows = document.querySelectorAll("#compare-table table tbody tr:not(.band)");
    expect(rows.length).toBe(GPU_DATA.length);
  });

  it("has a tab and a panel for each tab id", () => {
    for (const id of TAB_IDS) {
      expect(document.querySelector(`#tabs .tab[data-tab="${id}"]`), id).not.toBeNull();
      expect(document.getElementById(`panel-${id}`), id).not.toBeNull();
    }
  });

  it("puts the calculator inside the compare panel, closed by default", () => {
    const box = document.querySelector("#panel-compare > details#calculator-box");
    expect(box).not.toBeNull();
    expect(box.open).toBe(false);
    for (const id of ["calc-instance", "calc-count", "calc-days", "calc-od-unit-price"]) {
      expect(box.querySelector(`#${id}`), id).not.toBeNull();
    }
  });

  it("has no calculator tab or panel any more", () => {
    expect(document.querySelector('#tabs .tab[data-tab="calculator"]')).toBeNull();
    expect(document.getElementById("panel-calculator")).toBeNull();
  });
});
