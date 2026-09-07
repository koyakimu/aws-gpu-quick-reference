import { describe, it, expect, beforeEach, vi } from "vitest";
import { TAB_IDS, tabFromHash, initTabs } from "../src/scripts/tabs.js";

function mountTabs() {
  document.body.innerHTML = `
    <nav id="tabs">
      ${TAB_IDS.map((id) => `<button class="tab" data-tab="${id}" role="tab">${id}</button>`).join("")}
    </nav>
    ${TAB_IDS.map((id) => `<section class="panel" id="panel-${id}" role="tabpanel"></section>`).join("")}
  `;
}

function visiblePanels() {
  return [...document.querySelectorAll(".panel")].filter((el) => !el.hidden).map((el) => el.id);
}

function activeTabs() {
  return [...document.querySelectorAll(".tab.on")].map((el) => el.dataset.tab);
}

function button(id) {
  return document.querySelector(`.tab[data-tab="${id}"]`);
}

beforeEach(() => {
  mountTabs();
  window.location.hash = "";
});

describe("TAB_IDS", () => {
  it("is the three tabs in the order the header shows them", () => {
    expect(TAB_IDS).toEqual(["compare", "regions", "features"]);
  });
});

describe("tabFromHash", () => {
  it("maps a known hash to its tab id", () => {
    expect(tabFromHash("#regions")).toBe("regions");
    expect(tabFromHash("#features")).toBe("features");
  });

  it("accepts a hash without the leading marker", () => {
    expect(tabFromHash("features")).toBe("features");
  });

  it("keeps the old #calculator link working by opening compare", () => {
    expect(tabFromHash("#calculator")).toBe("compare");
  });

  it("falls back to compare for an empty or unknown hash", () => {
    expect(tabFromHash("")).toBe("compare");
    expect(tabFromHash("#")).toBe("compare");
    expect(tabFromHash("#nope")).toBe("compare");
    expect(tabFromHash(undefined)).toBe("compare");
  });
});

describe("initTabs", () => {
  it("opens compare when there is no hash", () => {
    initTabs();
    expect(visiblePanels()).toEqual(["panel-compare"]);
    expect(activeTabs()).toEqual(["compare"]);
  });

  it("opens the tab named by the hash on first paint", () => {
    window.location.hash = "#features";
    initTabs();
    expect(visiblePanels()).toEqual(["panel-features"]);
    expect(activeTabs()).toEqual(["features"]);
  });

  it("keeps every panel in the DOM", () => {
    initTabs();
    expect(document.querySelectorAll(".panel")).toHaveLength(3);
  });

  it("sets aria-selected on the buttons", () => {
    initTabs();
    expect(button("compare").getAttribute("aria-selected")).toBe("true");
    expect(button("regions").getAttribute("aria-selected")).toBe("false");
  });

  it("switches when a tab is clicked, and writes the hash", () => {
    initTabs();
    button("features").dispatchEvent(new Event("click", { bubbles: true }));
    expect(visiblePanels()).toEqual(["panel-features"]);
    expect(window.location.hash).toBe("#features");
  });

  it("switches when the hash changes from outside", () => {
    initTabs();
    window.location.hash = "#regions";
    window.dispatchEvent(new Event("hashchange"));
    expect(visiblePanels()).toEqual(["panel-regions"]);
    expect(activeTabs()).toEqual(["regions"]);
  });

  it("falls back to compare when the hash becomes nonsense", () => {
    window.location.hash = "#regions";
    initTabs();
    window.location.hash = "#not-a-tab";
    window.dispatchEvent(new Event("hashchange"));
    expect(visiblePanels()).toEqual(["panel-compare"]);
  });

  it("calls onChange with the tab id on first paint and on every switch", () => {
    const onChange = vi.fn();
    initTabs({ onChange });
    expect(onChange).toHaveBeenCalledWith("compare");
    button("features").dispatchEvent(new Event("click", { bubbles: true }));
    expect(onChange).toHaveBeenLastCalledWith("features");
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("exposes show() for switching without a click", () => {
    const api = initTabs();
    api.show("regions");
    expect(visiblePanels()).toEqual(["panel-regions"]);
    expect(window.location.hash).toBe("#regions");
  });

  it("does nothing and does not throw when the strip is absent", () => {
    document.body.innerHTML = "";
    expect(() => initTabs()).not.toThrow();
  });
});
