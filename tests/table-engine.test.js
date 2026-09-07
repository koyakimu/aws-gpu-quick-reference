import { describe, it, expect, vi } from "vitest";
import {
  createTable,
  visibleColumns,
  sortRows,
  compareValues,
  nextSortState,
  EMPTY,
} from "../src/scripts/table-engine.js";
import { parseCount } from "../src/scripts/format.js";

// テスト用の最小の列定義。GPU データとは無関係。
const COLUMNS = [
  { key: "name", group: "a", labelKey: "col.name", type: "text", sticky: true, mono: true },
  { key: "count", group: "a", labelKey: "col.count", type: "number" },
  { key: "price", group: "b", labelKey: "col.price", type: "price" },
  { key: "tokyo", group: "b", labelKey: "col.tokyo", type: "flag" },
  { key: "avail", group: "c", labelKey: "col.avail", type: "availability", sortable: false },
];

const ROWS = [
  { name: "beta", count: 8, price: 113.93, tokyo: false, avail: "cb" },
  { name: "alpha", count: 1, price: null, tokyo: true, avail: "both" },
  { name: "gamma", count: 4, price: 30.13, tokyo: true, avail: "od" },
];

// i18n はキーをそのまま返すスタブ。エンジンは辞書を知らない。
const i18n = (key) => key;

const baseState = { sortKey: null, sortDir: null, hiddenGroups: [] };

function mount(overrides = {}) {
  const onStateChange = vi.fn();
  const table = createTable({
    columns: COLUMNS,
    rows: ROWS,
    state: baseState,
    onStateChange,
    i18n,
    ...overrides,
  });
  document.body.replaceChildren(table.el);
  return { table, onStateChange };
}

function headerTexts() {
  return [...document.querySelectorAll("thead th")].map((th) => th.textContent.replace(/[▼▲]/g, "").trim());
}

function columnTexts(index) {
  return [...document.querySelectorAll("tbody tr")].map(
    (tr) => tr.querySelectorAll("td")[index].textContent,
  );
}

describe("compareValues", () => {
  it("compares numbers and prices numerically", () => {
    expect(compareValues("number", 1, 8)).toBeLessThan(0);
    expect(compareValues("price", 113.93, 30.13)).toBeGreaterThan(0);
    expect(compareValues("number", 4, 4)).toBe(0);
  });

  it("compares text with localeCompare", () => {
    expect(compareValues("text", "alpha", "beta")).toBeLessThan(0);
    expect(compareValues("text", "gamma", "beta")).toBeGreaterThan(0);
  });

  // 順位型 (flag / availability / feature) は昇順で「低い順位が先」。
  // 初回クリックが desc なので、1 回目に最良の値が先頭へ来る (数値列と同じ体験)。
  it("orders flag false before true ascending", () => {
    expect(compareValues("flag", true, false)).toBeGreaterThan(0);
    expect(compareValues("flag", false, true)).toBeLessThan(0);
  });

  it("ranks availability cb < od < both ascending", () => {
    expect(compareValues("availability", "both", "od")).toBeGreaterThan(0);
    expect(compareValues("availability", "od", "cb")).toBeGreaterThan(0);
  });

  it("ranks feature false < partial < true ascending", () => {
    expect(compareValues("feature", true, "partial")).toBeGreaterThan(0);
    expect(compareValues("feature", "partial", false)).toBeGreaterThan(0);
  });
});

describe("sortRows", () => {
  const priceCol = COLUMNS[2];
  const nameCol = COLUMNS[0];

  it("returns a copy in the original order when there is no sort", () => {
    const out = sortRows(ROWS, null, null);
    expect(out).not.toBe(ROWS);
    expect(out.map((r) => r.name)).toEqual(["beta", "alpha", "gamma"]);
  });

  it("sorts prices ascending with null last", () => {
    expect(sortRows(ROWS, priceCol, "asc").map((r) => r.name)).toEqual(["gamma", "beta", "alpha"]);
  });

  it("keeps null last when the direction flips", () => {
    expect(sortRows(ROWS, priceCol, "desc").map((r) => r.name)).toEqual(["beta", "gamma", "alpha"]);
  });

  it("sorts text with localeCompare", () => {
    expect(sortRows(ROWS, nameCol, "asc").map((r) => r.name)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("is stable for equal values", () => {
    const col = { key: "g", type: "text" };
    const rows = [
      { g: "x", id: 1 },
      { g: "x", id: 2 },
      { g: "x", id: 3 },
    ];
    expect(sortRows(rows, col, "asc").map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it("never mutates the input", () => {
    const before = ROWS.map((r) => r.name);
    sortRows(ROWS, priceCol, "asc");
    expect(ROWS.map((r) => r.name)).toEqual(before);
  });

  it("treats unparsable numeric values as missing and sends them last", () => {
    const col = { key: "n", type: "number" };
    const rows = [
      { name: "junk", n: "n/a" },
      { name: "two", n: 2 },
      { name: "nan", n: NaN },
      { name: "one", n: 1 },
    ];
    expect(sortRows(rows, col, "asc").map((r) => r.name)).toEqual(["one", "two", "junk", "nan"]);
    expect(sortRows(rows, col, "desc").map((r) => r.name)).toEqual(["two", "one", "junk", "nan"]);
  });

  // 裁定 R4: 列が sortValue を持つときは row[key] ではなくその戻り値で比べる。
  it("sorts by a column's sortValue when it has one", () => {
    const col = {
      key: "count",
      type: "number",
      sortValue: (row) => parseCount(row.count),
    };
    const rows = [
      { name: "one", count: 1 },
      { name: "eighth", count: "1/8" },
      { name: "eight", count: 8 },
    ];
    // "1/8" は 0.125 なので 1 より下に来る。文字列のままなら比較は壊れる。
    expect(sortRows(rows, col, "asc").map((r) => r.name)).toEqual(["eighth", "one", "eight"]);
    expect(sortRows(rows, col, "desc").map((r) => r.name)).toEqual(["eight", "one", "eighth"]);
  });
});

describe("nextSortState", () => {
  it("starts a new column descending", () => {
    expect(nextSortState({ sortKey: null, sortDir: null }, "price")).toEqual({
      sortKey: "price",
      sortDir: "desc",
    });
  });

  it("cycles desc to asc on the same column", () => {
    expect(nextSortState({ sortKey: "price", sortDir: "desc" }, "price")).toEqual({
      sortKey: "price",
      sortDir: "asc",
    });
  });

  it("clears the sort on the third click", () => {
    expect(nextSortState({ sortKey: "price", sortDir: "asc" }, "price")).toEqual({
      sortKey: null,
      sortDir: null,
    });
  });

  it("switches columns descending", () => {
    expect(nextSortState({ sortKey: "price", sortDir: "asc" }, "name")).toEqual({
      sortKey: "name",
      sortDir: "desc",
    });
  });
});

describe("visibleColumns", () => {
  it("returns everything when nothing is hidden", () => {
    expect(visibleColumns(COLUMNS, []).map((c) => c.key)).toEqual([
      "name",
      "count",
      "price",
      "tokyo",
      "avail",
    ]);
  });

  it("drops every column of a hidden group", () => {
    expect(visibleColumns(COLUMNS, ["b"]).map((c) => c.key)).toEqual(["name", "count", "avail"]);
  });

  it("drops several groups at once", () => {
    expect(visibleColumns(COLUMNS, ["b", "c"]).map((c) => c.key)).toEqual(["name", "count"]);
  });
});

describe("createTable rendering", () => {
  it("renders a header cell per visible column, labelled through i18n", () => {
    mount();
    expect(headerTexts()).toEqual(["col.name", "col.count", "col.price", "col.tokyo", "col.avail"]);
  });

  it("renders one body row per row, in the given order", () => {
    mount();
    expect(columnTexts(0)).toEqual(["beta", "alpha", "gamma"]);
  });

  it("marks the sticky column on both the header and the cells", () => {
    mount();
    expect(document.querySelectorAll("thead th")[0].classList.contains("sticky")).toBe(true);
    expect(document.querySelectorAll("thead th")[1].classList.contains("sticky")).toBe(false);
    const firstCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[0]);
    firstCells.forEach((td) => expect(td.classList.contains("sticky")).toBe(true));
  });

  it("marks numeric and monospaced cells", () => {
    mount();
    const row = document.querySelector("tbody tr");
    expect(row.children[0].classList.contains("mono")).toBe(true);
    expect(row.children[1].classList.contains("num")).toBe(true);
    expect(row.children[1].classList.contains("mono")).toBe(true);
    expect(row.children[2].classList.contains("num")).toBe(true);
  });

  it("formats prices to two decimals without a currency sign", () => {
    mount();
    expect(columnTexts(2)).toEqual(["113.93", EMPTY, "30.13"]);
  });

  it("formats numbers with thousands separators", () => {
    const { table } = mount();
    table.update([{ name: "big", count: 18000, price: null, tokyo: false, avail: "od" }], baseState);
    expect(columnTexts(1)).toEqual(["18,000"]);
  });

  it("renders flags as a check mark or the empty marker", () => {
    mount();
    expect(columnTexts(3)).toEqual([EMPTY, "✓", "✓"]);
  });

  it("marks price cells with the price class", () => {
    mount();
    const priceCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[2]);
    expect(priceCells.every((td) => td.classList.contains("price"))).toBe(true);
    const nameCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[0]);
    expect(nameCells.some((td) => td.classList.contains("price"))).toBe(false);
  });

  it("marks empty cells dim", () => {
    mount();
    const priceCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[2]);
    expect(priceCells.map((td) => td.classList.contains("dim"))).toEqual([false, true, false]);
  });

  // 裁定 R8: dim は「描画結果が EMPTY か」で決める。false の flag も EMPTY を描くので dim になる。
  it("marks any cell rendering the empty marker dim, flags included", () => {
    mount();
    const flagCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[3]);
    expect(flagCells.map((td) => td.textContent)).toEqual([EMPTY, "✓", "✓"]);
    expect(flagCells.map((td) => td.classList.contains("dim"))).toEqual([true, false, false]);
  });

  it("uses a column's format function when it has one", () => {
    const columns = COLUMNS.map((c) =>
      c.key === "name" ? { ...c, format: (value) => `<${value}>` } : c,
    );
    mount({ columns });
    expect(columnTexts(0)).toEqual(["<beta>", "<alpha>", "<gamma>"]);
  });

  it("accepts a Node from a format function", () => {
    const columns = COLUMNS.map((c) =>
      c.key === "name"
        ? {
            ...c,
            format: (value) => {
              const span = document.createElement("span");
              span.className = "chip";
              span.textContent = value;
              return span;
            },
          }
        : c,
    );
    mount({ columns });
    expect(document.querySelectorAll("tbody td .chip")).toHaveLength(3);
  });

  it("hides the columns of a hidden group", () => {
    mount({ state: { ...baseState, hiddenGroups: ["b"] } });
    expect(headerTexts()).toEqual(["col.name", "col.count", "col.avail"]);
    expect(document.querySelectorAll("tbody tr")[0].children).toHaveLength(3);
  });

  it("sorts the rows it is handed according to the state", () => {
    mount({ state: { sortKey: "price", sortDir: "asc", hiddenGroups: [] } });
    expect(columnTexts(0)).toEqual(["gamma", "beta", "alpha"]);
  });

  it("marks the sorted header and its cells", () => {
    mount({ state: { sortKey: "price", sortDir: "asc", hiddenGroups: [] } });
    const th = document.querySelectorAll("thead th")[2];
    expect(th.classList.contains("sorted")).toBe(true);
    expect(th.textContent).toContain("▲");
    const cells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[2]);
    cells.forEach((td) => expect(td.classList.contains("sorted")).toBe(true));
  });

  it("shows a down arrow when sorting descending", () => {
    mount({ state: { sortKey: "price", sortDir: "desc", hiddenGroups: [] } });
    expect(document.querySelectorAll("thead th")[2].textContent).toContain("▼");
  });
});

describe("createTable interaction", () => {
  it("reports the next sort state when a sortable header is clicked", () => {
    const { onStateChange } = mount();
    document.querySelectorAll("thead th")[2].dispatchEvent(new Event("click", { bubbles: true }));
    expect(onStateChange).toHaveBeenCalledWith({
      sortKey: "price",
      sortDir: "desc",
      hiddenGroups: [],
    });
  });

  it("lists the best value first on the first click of a rank column", () => {
    const { table, onStateChange } = mount();
    // tokyo は flag 列。1 回目のクリックは desc になり、true の行が先頭へ来る。
    document.querySelectorAll("thead th")[3].dispatchEvent(new Event("click", { bubbles: true }));
    const nextState = onStateChange.mock.calls[0][0];
    expect(nextState.sortDir).toBe("desc");
    table.update(ROWS, nextState);
    expect(columnTexts(3)).toEqual(["✓", "✓", EMPTY]);
    expect(columnTexts(0)).toEqual(["alpha", "gamma", "beta"]);
  });

  it("does not re-render on its own — the caller drives update()", () => {
    const { table, onStateChange } = mount();
    document.querySelectorAll("thead th")[2].dispatchEvent(new Event("click", { bubbles: true }));
    expect(columnTexts(0)).toEqual(["beta", "alpha", "gamma"]);
    table.update(ROWS, onStateChange.mock.calls[0][0]);
    expect(columnTexts(0)).toEqual(["beta", "gamma", "alpha"]);
  });

  it("ignores clicks on a non-sortable header", () => {
    const { onStateChange } = mount();
    document.querySelectorAll("thead th")[4].dispatchEvent(new Event("click", { bubbles: true }));
    expect(onStateChange).not.toHaveBeenCalled();
  });

  it("marks sortable headers for the stylesheet and for assistive tech", () => {
    mount();
    const [name, , , , avail] = document.querySelectorAll("thead th");
    expect(name.classList.contains("sortable")).toBe(true);
    expect(name.getAttribute("aria-sort")).toBe("none");
    expect(avail.classList.contains("sortable")).toBe(false);
    expect(avail.hasAttribute("aria-sort")).toBe(false);
  });

  // ソート操作はネイティブの button が担う。Enter / Space とフォーカスはブラウザ任せ。
  it("puts a focusable button inside a sortable header, and a click on it sorts", () => {
    const { onStateChange } = mount();
    const button = document.querySelectorAll("thead th")[2].querySelector("button.sort-btn");
    expect(button).not.toBeNull();
    expect(button.getAttribute("type")).toBe("button");

    button.focus();
    expect(document.activeElement).toBe(button);

    button.dispatchEvent(new Event("click", { bubbles: true }));
    expect(onStateChange).toHaveBeenCalledWith({
      sortKey: "price",
      sortDir: "desc",
      hiddenGroups: [],
    });
  });

  it("leaves the sort button out of a non-sortable header", () => {
    mount();
    const avail = document.querySelectorAll("thead th")[4];
    expect(avail.querySelector("button")).toBeNull();
    expect(avail.textContent).toBe("col.avail");
  });

  it("puts the label and the sort arrow inside the button", () => {
    mount({ state: { sortKey: "price", sortDir: "asc", hiddenGroups: [] } });
    const button = document.querySelectorAll("thead th")[2].querySelector("button.sort-btn");
    expect(button.textContent).toContain("col.price");
    expect(button.querySelector(".sortarrow").textContent).toBe("▲");
  });

  it("leaves the header itself a plain column header", () => {
    mount();
    const headers = [...document.querySelectorAll("thead th")];
    headers.forEach((th) => {
      expect(th.getAttribute("scope")).toBe("col");
      expect(th.hasAttribute("role")).toBe(false);
      expect(th.hasAttribute("tabindex")).toBe(false);
    });
  });

  it("keeps the same element across update()", () => {
    const { table } = mount();
    const before = table.el;
    table.update([ROWS[0]], baseState);
    expect(table.el).toBe(before);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
  });

  it("renders no body rows for an empty row list", () => {
    const { table } = mount();
    table.update([], baseState);
    expect(document.querySelectorAll("tbody tr")).toHaveLength(0);
    expect(document.querySelectorAll("thead th")).toHaveLength(5);
  });
});
