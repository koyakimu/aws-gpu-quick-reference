# PR 3 `feat/design-renewal` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single hand-written table and its AWS-branded skin with a reusable table engine, hash-based tabs, a filter bar, and a full design-token system in the approved "dense data tool" style (mockup D), in both dark and light themes.

**Architecture:** A generic, data-agnostic `src/scripts/table-engine.js` renders any `{columns, rows, state}` triple into a sticky-header / sticky-first-column table and reports sort clicks back through `onStateChange`. `src/scripts/compare-view.js` owns everything GPU-specific: the column definitions for the six column groups, the generation / family filters, the row counter, and the localStorage persistence. `src/scripts/tabs.js` switches four always-rendered panels by URL hash. All colour, spacing, type and radius values move into `src/styles/tokens.css` (dark on `:root`, light under `[data-theme="light"]`); every other stylesheet is rewritten to reference tokens only, and `light-theme.css` is deleted. The Calculator's JavaScript is untouched — only its stylesheet is rewritten.

**Tech Stack:** Vite 8 + `vite-plugin-singlefile` 2, vanilla ES modules, Vitest 5 + jsdom 30. No new runtime or dev dependencies.

**Spec:** `docs/superpowers/specs/2026-09-07-site-renewal-design.md` — this plan implements **only PR 3** (section 3 row 3; detail in sections 5.1, 5.2, 5.5, all of 6, the PR-3 items of 9, and the `regions.json`-absent case of 10).

**Visual target:** `.superpowers/brainstorm/95289-1788758443/content/visual-style-v2.html` — the `.d` (dark) and `.dl` (light) blocks. The `.c` block is the rejected glass variant; ignore it. Every hex value in Task 6 of this plan was transcribed from that file.

## Global Constraints

- **PR 2 is not merged yet, but its plan is authoritative.** Branch from `feat/data-json`, not from `main`. This plan assumes PR 2's Task 1 and Task 2 have landed on that branch, i.e. that these already exist:
  - `src/scripts/format.js` exporting `formatPrice(value: number|null): string`, `parseCount(count: number|string): number`, `computeSpans(rows: object[]): Array<{gen:number,gpu:number,ec2:number}>`, `isNew(addedAt: string|null, now?: Date): boolean`.
  - `src/scripts/gpu-data.js` as a thin layer over `data/instances.json`, exporting `GPU_DATA`, `EC2_LINKS`, `GPU_DATASHEET_LINKS`, `PRICING_META` (`{pricingAsOf, pricingRegion}`).
  - Every row in `GPU_DATA` has `gen`, `gpu`, `gpuKey`, `ec2`, `size`, `unit`, `addedAt`; `price` / `priceGpu` / `priceCb` are **numbers or `null`**; `genRows` / `gpuRows` / `ec2Rows` / `gpuNew` are gone.
  - `%PRICING_AS_OF%` is injected into `src/index.html` at build time by `vite.config.js`.
  - **Before Step 1 of Task 1, verify this.** Run `node -e 'import("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/gpu-data.js")'`-style checks as spelled out in Task 1 Step 1. If `src/scripts/format.js` does not exist, stop and report — you are on the wrong base branch.
- **No new dependencies.** Neither runtime nor dev (Spec §2).
- **Single-file build stays.** `npm run build` must keep producing one self-contained `dist/index.html` with zero runtime dependencies (Spec §2).
- **No raw colour literals outside `src/styles/tokens.css`.** Every other stylesheet references `var(--…)` only. Enforced by a grep check in Task 8.
- **No theme branching outside `tokens.css`.** Component CSS must contain no `[data-theme="light"]` selector (Spec §6.2).
- **No emoji anywhere in the UI.** Not in `index.html`, not in JS-generated DOM, not in the i18n dictionaries' new keys (Spec §6.3). The existing favicon `🚀` data-URI is replaced in Task 7. Check marks `✓`, the em dash `—`, the triangle `△` and the sort arrows `▼` `▲` are typographic symbols, not emoji, and are allowed.
- **One breakpoint only: `768px`**, and every `@media` rule for it lives in `base.css` (Spec §6.3).
- **`prefers-reduced-motion: reduce` disables transitions** (Spec §6.2).
- **Every i18n key added must be added to all three of `src/i18n/ja.js`, `en.js`, `ko.js` in the same commit.** `tests/i18n-keys.test.js` fails the build otherwise.
- **Every commit message** is `feat:` / `chore:` + a Japanese summary, and ends with these two trailer lines after one blank line:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
  ```
- **Code comments in Japanese**, matching the existing files' style.
- **Never run `cd`.** All commands use absolute paths or `npm --prefix`.
- Repo root is `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference`. It is written out in full in every command below; in prose it is abbreviated to `<repo>`.

---

## Decisions this plan locks in (where the spec, the mockup and the current code disagreed)

Read these before Task 1. Each one is applied consistently by the tasks that follow.

1. **Prices render without a `$`; the column header carries the unit.** PR 2's `formatPrice` returns `"$113.93"`, but the mockup's price cells read `113.93` under an `On-Demand` header, right-aligned with `tabular-nums`. Right-aligned numeric columns are unreadable with a leading sigil of varying width. The table engine therefore formats `type: "price"` as `value.toFixed(2)` and the column labels are `$/h`, `$/GPU`, `$/GPU(CB)` (the i18n keys `table.onDemand` / `table.perGpu` / `table.cb` already hold exactly those strings). `formatPrice` stays as it is and stays in use by `calculator.js`.
2. **Missing values render as the em dash `—`, not the hyphen `-`.** The mockup uses `—` in every empty cell. `formatPrice`'s `-` is unchanged and remains the Calculator's placeholder.
3. **There is no generation column.** The spec's group list (§5.2) names Instance / GPU / Performance / Connect / System / Price and the mockup shows no `Gen` column — the generation is carried by the colour of the GPU chip and is exposed as a filter. `gen` is still on every row and is still the sort key inside the default order.
4. **"Default order = data order."** Spec §5.2 says the default order is 世代 → ファミリ → サイズ; `data/instances.json` is already stored in exactly that order, so the engine simply preserves array order when `sortKey` is `null`. No sort is applied on first paint.
5. **The legend is deleted, not folded into the filter bar.** The old `.legend` block existed to explain six row background colours that no longer exist — the mockup gives each row a neutral background and puts the generation colour on the chip. The generation filter buttons in the filter bar are themselves rendered in their generation's chip colours, so they do the legend's job. Turing and Volta have no filter-bar colour of their own (they are grey chips, per Spec §6.1), which is the intended outcome: colour marks the modern generations.
6. **The column definition shape gains one optional field, `mono`.** Spec §5.1 lists `{key, group, labelKey, type, sortable, sticky, align, format, width}`; Spec §6.1 additionally requires instance names to be monospaced, and the instance name is a `text` column, so the type cannot imply it. `mono: true` is that switch. `number` and `price` columns are monospaced automatically.
7. **`--fs-xs` (11px) is used for table headers.** The mockup's `thead th` is `11.5px`, which is not on the spec's type scale (11 / 12.5 / 13 / 15 / 20). Half-pixel type is not worth a scale entry; headers use `--fs-xs`.
8. **The spec's token list is extended by five names** that the mockup needs and §6.1 does not enumerate: `--bg-inset` (the tab strip's trough), `--bg-active` (the selected tab's fill), `--accent-line` (the active filter button's border), `--line-head` (the `thead` bottom rule, which is a different value from `--line` in light), and `--sorted-cell-bg` (the tinted body cells of the sorted column). All five are transcribed from the mockup in Task 6 and defined in `tokens.css` like any other token.
9. **The Regions and Features tabs are shells in this PR.** Both panels render one centred placeholder paragraph. The Regions placeholder is the Spec §10 "データ未生成" message, shown because `data/regions.json` does not exist yet; the region filter control is present in the DOM but `hidden`, and `regionFilter()` is a documented no-op that PR 4 replaces. The Features placeholder says the same thing for `gpu-features.json`.
10. **`setupHover()` is deleted, not ported.** It existed to repaint `rowspan`ed cells on hover; Spec §5.2 removes rowspans, and a plain `tr:hover td` CSS rule replaces the whole mechanism.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `src/scripts/table-engine.js` | Generic table renderer. Knows columns, rows, sort state and column-group visibility. Knows nothing about GPUs. |
| `src/scripts/compare-view.js` | The Compare tab: column definitions, generation/family filters, row counter, localStorage persistence, `regionFilter` hook. |
| `src/scripts/tabs.js` | Hash-driven tab switching over four always-rendered panels. |
| `src/styles/tokens.css` | Every colour, spacing, type-scale, font and radius value. Dark on `:root`, light under `[data-theme="light"]`. |
| `tests/table-engine.test.js` | Sort rules, column-group visibility, sticky classes, `update()`. |
| `tests/compare-view.test.js` | Column definitions, filters, row counter, persistence. |
| `tests/tabs.test.js` | Hash ↔ panel mapping, initial paint, `hashchange`. |

**Modified:**

| Path | Change |
|---|---|
| `src/scripts/format.js` | Gains `formatNumber` (moved out of the deleted `table.js`). |
| `src/scripts/theme.js` | First visit follows `prefers-color-scheme` without writing localStorage; the toggle persists and wins afterwards. Text label instead of emoji. |
| `src/scripts/main.js` | Wires tabs + compare view + calculator; imports the new stylesheet set. |
| `src/index.html` | New header, tab strip, filter bar, four panels. Legend deleted. |
| `src/i18n/{ja,en,ko}.js` | Keys for tabs, filter bar, column groups, the flattened performance column labels, and the two placeholders. |
| `src/styles/base.css` | Reset + `body` + the single 768px media block. All old AWS variables deleted. |
| `src/styles/header.css` | Header, tab strip, filter bar. |
| `src/styles/table.css` | Table frame, sticky column and header, sort affordance, chips. |
| `src/styles/calculator.css` | Same layout, token-based colours. |
| `tests/theme.test.js` | Assertions updated for the new priority rule and the text label. |

**Deleted:**

| Path | Why |
|---|---|
| `src/scripts/table.js` | Replaced by `table-engine.js` + `compare-view.js`. |
| `src/styles/light-theme.css` | Spec §6.2: light is token redefinition only. |
| `tests/table-render.test.js` | Tests the deleted renderer. Replaced by `tests/table-engine.test.js` and `tests/compare-view.test.js`. |
| `tests/table.test.js` | Tests `parseFraction` / `formatNumber` through `table.js`. `parseCount` is already covered by `tests/format.test.js`; `formatNumber` moves there in Task 1. |

**Task order and why:** the three new JS modules land first, each green and unwired (Tasks 1, 2, 4, 5), so a reviewer can reject one without unpicking the page. The i18n keys land before the modules that read them (Task 3). The page swap (Task 6) is one commit — HTML, `main.js`, and the deletion of the old renderer — and leaves the page **working but wearing the old skin**, which is ugly for exactly one commit. The stylesheets then land (Tasks 7, 8). Task 9 verifies in a browser.

---

## Task 1: The table engine (`src/scripts/table-engine.js`)

The one piece PR 4 and PR 5 also depend on. It takes columns, rows and a sort/visibility state and produces DOM. It never imports GPU data, never filters, and never mutates the state it is given — sort clicks are reported through `onStateChange` and the caller decides what to do.

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table-engine.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js` (add `formatNumber`)
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-engine.test.js`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/format.test.js` (add `formatNumber` cases)

**Interfaces:**
- Consumes: nothing from this PR. From PR 2: `src/scripts/format.js`.
- Produces (named exports of `src/scripts/table-engine.js`):
  - `createTable({ columns, rows, state, onStateChange, i18n }) -> { el: HTMLDivElement, update(rows, state): void }`
  - `visibleColumns(columns: Column[], hiddenGroups: string[]): Column[]`
  - `sortRows(rows: object[], column: Column|null, dir: "asc"|"desc"|null): object[]` — returns a new array, never mutates.
  - `compareValues(type: string, a: unknown, b: unknown): number` — non-null values only.
  - `nextSortState(state, key): {sortKey, sortDir}` — the three-step cycle.
  - `EMPTY = "—"`
- Produces (added to `src/scripts/format.js`): `formatNumber(num: number): string` — `4500` → `"4,500"`.

**The `Column` shape** (Spec §5.1, plus `mono` per Decision 6):

```
{
  key: string,            // row 側のプロパティ名
  group: string,          // 列グループ ID。hiddenGroups と突き合わせる
  labelKey: string,       // i18n キー
  type: "text" | "number" | "price" | "flag" | "availability" | "feature",
  sortable?: boolean,     // 既定 true
  sticky?: boolean,       // 先頭列固定。1 つだけ true にする
  align?: "left" | "right",  // 既定は type から決まる
  mono?: boolean,         // 等幅にする。number / price は指定不要
  format?: (value, row) => string | Node,
  width?: string,         // CSS の長さ。省略時は内容にまかせる
}
```

**Sort rules** (Spec §5.1): `number` / `price` compare numerically; `text` compares with `localeCompare`; `flag` puts `true` first; `availability` ranks `both` > `od` > `cb`; `feature` ranks `true` > `"partial"` > `false`. In every type, `null` / `undefined` / `""` sort to the **end regardless of direction** — they are pulled out before sorting and appended afterwards. Equal values keep their original order (index tiebreak), so sorting is stable.

- [ ] **Step 1: Verify the base branch and cut the working branch**

```bash
ls -1 /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js
grep -c "export function formatPrice" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js
grep -c "PRICING_META" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/gpu-data.js
```

Expected: the path prints, and both greps print a number ≥ 1. If `format.js` is missing or either grep prints `0`, **stop and report** — PR 2 has not landed on this branch and every later task will fail.

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference switch -c feat/design-renewal feat/data-json
```

- [ ] **Step 2: Write the failing test for `formatNumber`**

Append to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/format.test.js`. Also add `formatNumber` to the import list at the top of that file, so the first line becomes:

```js
import { formatPrice, parseCount, computeSpans, isNew, formatNumber } from "../src/scripts/format.js";
```

and append:

```js
describe("formatNumber", () => {
  it("inserts thousands separators", () => {
    expect(formatNumber(4500)).toBe("4,500");
    expect(formatNumber(18000)).toBe("18,000");
    expect(formatNumber(1979)).toBe("1,979");
  });

  it("leaves values under a thousand alone", () => {
    expect(formatNumber(8)).toBe("8");
    expect(formatNumber(242)).toBe("242");
  });

  it("does not group the fractional part", () => {
    expect(formatNumber(0.125)).toBe("0.125");
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/format.test.js
```

Expected: FAIL — `formatNumber is not a function`.

- [ ] **Step 4: Add `formatNumber` to `format.js`**

Append to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js`:

```js
// 数値に 3 桁区切りを入れる。小数部には入れない。
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
```

- [ ] **Step 5: Run it and watch it pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/format.test.js
```

Expected: PASS, `Test Files 1 passed (1)`.

- [ ] **Step 6: Write the failing test for the engine**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-engine.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import {
  createTable,
  visibleColumns,
  sortRows,
  compareValues,
  nextSortState,
  EMPTY,
} from "../src/scripts/table-engine.js";

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

  it("puts flag true before false", () => {
    expect(compareValues("flag", true, false)).toBeLessThan(0);
    expect(compareValues("flag", false, true)).toBeGreaterThan(0);
  });

  it("ranks availability both > od > cb", () => {
    expect(compareValues("availability", "both", "od")).toBeLessThan(0);
    expect(compareValues("availability", "od", "cb")).toBeLessThan(0);
  });

  it("ranks feature true > partial > false", () => {
    expect(compareValues("feature", true, "partial")).toBeLessThan(0);
    expect(compareValues("feature", "partial", false)).toBeLessThan(0);
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

  it("marks empty cells dim", () => {
    mount();
    const priceCells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[2]);
    expect(priceCells.map((td) => td.classList.contains("dim"))).toEqual([false, true, false]);
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
```

- [ ] **Step 7: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/table-engine.test.js
```

Expected: FAIL — `Failed to resolve import "../src/scripts/table-engine.js"`.

- [ ] **Step 8: Write the engine**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table-engine.js`:

```js
// 汎用の表エンジン。列定義と行の配列だけを受け取り、GPU データを一切知らない。
// 比較表 (compare-view.js)、リージョン表、機能マトリクスの 3 つが共有する。
import { formatNumber } from "./format.js";

// 値が無いセルの表示。モック D に合わせて em ダッシュを使う。
export const EMPTY = "—";

// 右寄せにする型。数値は tabular-nums で揃えたいので等幅にもする。
const NUMERIC_TYPES = new Set(["number", "price"]);

// availability / feature は「対応が手厚いほど先」で並べる。flag の true 優先と同じ考え方。
const RANKS = {
  availability: { both: 3, od: 2, cb: 1 },
  feature: { true: 3, partial: 2, false: 1 },
};

const AVAILABILITY_LABELS = { both: "OD+CB", od: "OD", cb: "CB" };

// null / undefined / 空文字は「値なし」。ソートでは常に末尾、表示では EMPTY。
function isBlank(value) {
  return value == null || value === "";
}

function rankOf(type, value) {
  const table = RANKS[type];
  const rank = table[String(value)];
  return rank == null ? 0 : rank;
}

// 非 null 同士の比較。null の扱いは sortRows 側で行う。
export function compareValues(type, a, b) {
  if (NUMERIC_TYPES.has(type)) return Number(a) - Number(b);
  if (type === "flag") return (b === true ? 1 : 0) - (a === true ? 1 : 0);
  if (type === "availability" || type === "feature") return rankOf(type, b) - rankOf(type, a);
  return String(a).localeCompare(String(b));
}

// 並べ替えた新しい配列を返す。入力は変更しない。
// 値なしの行は方向によらず末尾に固定する (仕様 5.1)。
export function sortRows(rows, column, dir) {
  const copy = rows.slice();
  if (!column || !dir) return copy;

  const indexed = copy.map((row, index) => ({ row, index }));
  const filled = indexed.filter(({ row }) => !isBlank(row[column.key]));
  const blank = indexed.filter(({ row }) => isBlank(row[column.key]));

  filled.sort((x, y) => {
    const result = compareValues(column.type, x.row[column.key], y.row[column.key]);
    if (result !== 0) return dir === "asc" ? result : -result;
    return x.index - y.index; // 同値は元の順を保つ (安定ソート)
  });

  return [...filled, ...blank].map(({ row }) => row);
}

// クリックごとに desc → asc → 解除 と巡回する。解除するとデータ順に戻る (仕様 5.2)。
export function nextSortState(state, key) {
  if (state.sortKey !== key) return { sortKey: key, sortDir: "desc" };
  if (state.sortDir === "desc") return { sortKey: key, sortDir: "asc" };
  return { sortKey: null, sortDir: null };
}

export function visibleColumns(columns, hiddenGroups) {
  const hidden = new Set(hiddenGroups || []);
  return columns.filter((column) => !hidden.has(column.group));
}

function isNumericColumn(column) {
  return column.align ? column.align === "right" : NUMERIC_TYPES.has(column.type);
}

function isMonoColumn(column) {
  return column.mono === true || NUMERIC_TYPES.has(column.type);
}

// format 関数が無い列の既定の表示。
function defaultCellText(type, value) {
  if (isBlank(value)) return EMPTY;
  if (type === "price") return Number(value).toFixed(2);
  if (type === "number") return formatNumber(value);
  if (type === "flag") return value === true ? "✓" : EMPTY;
  if (type === "availability") return AVAILABILITY_LABELS[value] || EMPTY;
  if (type === "feature") {
    if (value === true) return "✓";
    if (value === "partial") return "△";
    return EMPTY;
  }
  return String(value);
}

function buildHead(columns, state, i18n) {
  const tr = document.createElement("tr");

  for (const column of columns) {
    const th = document.createElement("th");
    th.dataset.key = column.key;
    th.textContent = i18n(column.labelKey);
    if (column.sticky) th.classList.add("sticky");
    if (isNumericColumn(column)) th.classList.add("num");
    if (column.width) th.style.width = column.width;

    const sortable = column.sortable !== false;
    if (sortable) {
      th.classList.add("sortable");
      th.setAttribute("aria-sort", "none");
    }

    if (state.sortKey === column.key && state.sortDir) {
      th.classList.add("sorted");
      th.setAttribute("aria-sort", state.sortDir === "asc" ? "ascending" : "descending");
      const arrow = document.createElement("span");
      arrow.className = "sortarrow";
      arrow.textContent = state.sortDir === "asc" ? "▲" : "▼";
      th.appendChild(arrow);
    }

    tr.appendChild(th);
  }

  return tr;
}

function buildBody(columns, rows, state) {
  const fragment = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");

    for (const column of columns) {
      const td = document.createElement("td");
      const value = row[column.key];

      if (column.sticky) td.classList.add("sticky");
      if (isNumericColumn(column)) td.classList.add("num");
      if (isMonoColumn(column)) td.classList.add("mono");
      if (state.sortKey === column.key && state.sortDir) td.classList.add("sorted");
      if (isBlank(value)) td.classList.add("dim");

      const content = column.format ? column.format(value, row) : defaultCellText(column.type, value);
      if (content instanceof Node) {
        td.appendChild(content);
      } else {
        td.textContent = content;
      }

      tr.appendChild(td);
    }

    fragment.appendChild(tr);
  }

  return fragment;
}

export function createTable({ columns, rows, state, onStateChange, i18n }) {
  const el = document.createElement("div");
  el.className = "table-frame";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  el.appendChild(table);

  let currentState = state;
  let currentColumns = columns;

  // ヘッダは描き直されるので、th ではなく thead に 1 度だけ委譲で張る。
  thead.addEventListener("click", (event) => {
    const th = event.target.closest("th");
    if (!th || !th.classList.contains("sortable")) return;
    if (typeof onStateChange !== "function") return;
    onStateChange({ ...currentState, ...nextSortState(currentState, th.dataset.key) });
  });

  function render(nextRows, nextState) {
    currentState = nextState;
    const shown = visibleColumns(currentColumns, nextState.hiddenGroups);
    const sortColumn = shown.find((column) => column.key === nextState.sortKey) || null;
    thead.replaceChildren(buildHead(shown, nextState, i18n));
    tbody.replaceChildren(buildBody(shown, sortRows(nextRows, sortColumn, nextState.sortDir), nextState));
  }

  render(rows, state);

  return {
    el,
    update(nextRows, nextState) {
      render(nextRows, nextState || currentState);
    },
  };
}
```

- [ ] **Step 9: Run it and watch it pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/table-engine.test.js
```

Expected: PASS — `Test Files 1 passed (1)`, every `compareValues` / `sortRows` / `nextSortState` / `visibleColumns` / `createTable` case green.

- [ ] **Step 10: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files. Nothing else imports the engine yet.

- [ ] **Step 11: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/scripts/table-engine.js src/scripts/format.js tests/table-engine.test.js tests/format.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 汎用の表エンジンを追加

列定義と行配列だけを受け取り DOM を描く table-engine.js を新設した。
ソート (数値・価格・テキスト・フラグ・提供状況・機能、null は常に末尾)、
列グループ単位の表示切替、先頭列と thead の sticky クラス付与を持つ。
GPU データには依存しないので、比較表・リージョン表・機能マトリクスで共有できる。
3 桁区切りの formatNumber は table.js から format.js へ移した。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 2: Hash-driven tabs (`src/scripts/tabs.js`)

Four panels are rendered once and never re-rendered; the tab strip only flips the `hidden` attribute (Spec §5.5). The module owns no markup — `index.html` supplies the buttons and the panels in Task 6, and this module finds them by a fixed contract.

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/tabs.js`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/tabs.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (named exports of `src/scripts/tabs.js`):
  - `TAB_IDS = ["compare", "regions", "features", "calculator"]`
  - `tabFromHash(hash: string): string` — a known id, or `"compare"` for anything else.
  - `initTabs(options?: { onChange?: (id: string) => void }): { show(id: string): void }` — wires the strip, paints the tab named by `location.hash`, and listens for `hashchange`.

**DOM contract** (Task 6 provides this markup):
- Each button: `<button class="tab" data-tab="compare" role="tab">`.
- Each panel: `<section class="panel" id="panel-compare" role="tabpanel">`.
- The selected button gets `class="tab on"` and `aria-selected="true"`; the others `aria-selected="false"`.
- The selected panel has no `hidden` attribute; the others have it.

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/tabs.test.js`:

```js
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
  it("is the four tabs in the order the header shows them", () => {
    expect(TAB_IDS).toEqual(["compare", "regions", "features", "calculator"]);
  });
});

describe("tabFromHash", () => {
  it("maps a known hash to its tab id", () => {
    expect(tabFromHash("#regions")).toBe("regions");
    expect(tabFromHash("#calculator")).toBe("calculator");
  });

  it("accepts a hash without the leading marker", () => {
    expect(tabFromHash("features")).toBe("features");
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
    expect(document.querySelectorAll(".panel")).toHaveLength(4);
  });

  it("sets aria-selected on the buttons", () => {
    initTabs();
    expect(button("compare").getAttribute("aria-selected")).toBe("true");
    expect(button("regions").getAttribute("aria-selected")).toBe("false");
  });

  it("switches when a tab is clicked, and writes the hash", () => {
    initTabs();
    button("calculator").dispatchEvent(new Event("click", { bubbles: true }));
    expect(visiblePanels()).toEqual(["panel-calculator"]);
    expect(window.location.hash).toBe("#calculator");
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
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/tabs.test.js
```

Expected: FAIL — `Failed to resolve import "../src/scripts/tabs.js"`.

- [ ] **Step 3: Write the module**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/tabs.js`:

```js
// URL ハッシュでタブを切り替える。非表示のタブも DOM は描いたまま hidden で隠すので、
// 切り替えのたびに描き直す必要がない (仕様 5.5)。
export const TAB_IDS = ["compare", "regions", "features", "calculator"];

const DEFAULT_TAB = "compare";

export function tabFromHash(hash) {
  const id = String(hash || "").replace(/^#/, "");
  return TAB_IDS.includes(id) ? id : DEFAULT_TAB;
}

export function initTabs({ onChange } = {}) {
  const nav = document.getElementById("tabs");
  const buttons = new Map(
    [...document.querySelectorAll(".tab[data-tab]")].map((btn) => [btn.dataset.tab, btn]),
  );
  const panels = new Map(
    TAB_IDS.map((id) => [id, document.getElementById(`panel-${id}`)]).filter(([, el]) => el),
  );

  if (!nav || panels.size === 0) return { show() {} };

  let current = null;

  function paint(id) {
    for (const [tabId, panel] of panels) panel.hidden = tabId !== id;
    for (const [tabId, btn] of buttons) {
      btn.classList.toggle("on", tabId === id);
      btn.setAttribute("aria-selected", String(tabId === id));
    }
    if (current === id) return;
    current = id;
    if (typeof onChange === "function") onChange(id);
  }

  function show(id) {
    const tab = tabFromHash(id);
    // ハッシュを書くと hashchange が飛ぶが、paint は同じ id なら onChange を呼ばない。
    if (window.location.hash !== `#${tab}`) window.location.hash = `#${tab}`;
    paint(tab);
  }

  nav.addEventListener("click", (event) => {
    const btn = event.target.closest(".tab[data-tab]");
    if (!btn) return;
    show(btn.dataset.tab);
  });

  window.addEventListener("hashchange", () => paint(tabFromHash(window.location.hash)));

  paint(tabFromHash(window.location.hash));

  return { show };
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/tabs.test.js
```

Expected: PASS — `Test Files 1 passed (1)`.

- [ ] **Step 5: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/scripts/tabs.js tests/tabs.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: ハッシュ連動のタブ切替を追加

#compare #regions #features #calculator の 4 タブを URL ハッシュで切り替える。
既定は compare。hashchange にも追従し、非表示タブは hidden 属性で隠すだけで
DOM は残すので再描画が起きない。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 3: i18n keys for the new UI

Every string the new header, tab strip, filter bar and placeholders need, added to all three dictionaries in one commit so `tests/i18n-keys.test.js` stays green. Nothing reads these keys yet.

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ja.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/en.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ko.js`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/i18n-keys.test.js` (already exists; not edited — it must simply stay green)

**Interfaces:**
- Consumes: nothing.
- Produces: these key paths, readable through `t()` from `src/scripts/i18n.js`.
  - `tabs.compare`, `tabs.regions`, `tabs.features`, `tabs.calculator`
  - `filters.generations`, `filters.families`, `filters.columns`, `filters.region`, `filters.rowCount`, `filters.reset`
  - `groups.instance`, `groups.gpu`, `groups.performance`, `groups.connect`, `groups.system`, `groups.price`
  - `table.fp16Cuda`, `table.fp16Dense`, `table.fp16Sparse`, `table.fp8Dense`, `table.fp8Sparse`, `table.fp4Dense`, `table.fp4Sparse`
  - `placeholders.regionsMissing`, `placeholders.featuresMissing`, `placeholders.noRows`
- Already present and reused, do not re-add: `table.instanceSize`, `table.ec2Type`, `table.gpuModel`, `table.gpuCount`, `table.vram`, `table.efa`, `table.pcie`, `table.vcpu`, `table.memory`, `table.nvme`, `table.onDemand`, `table.perGpu`, `table.cb`, `table.tokyo`, `generations.*`, `theme.dark`, `theme.light`, `header.updated`.

`filters.rowCount` carries two substitution markers, `{shown}` and `{total}`, which `compare-view.js` replaces in Task 5. It is the only key in the file with markers.

- [ ] **Step 1: Write the failing test**

`tests/i18n-keys.test.js` only checks parity, so it cannot fail for a key that is missing from all three files. Add an explicit presence test to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/i18n-keys.test.js`, appended after the existing `describe` block:

```js
describe("keys the renewed UI needs", () => {
  const REQUIRED = [
    "tabs.compare",
    "tabs.regions",
    "tabs.features",
    "tabs.calculator",
    "filters.generations",
    "filters.families",
    "filters.columns",
    "filters.region",
    "filters.rowCount",
    "filters.reset",
    "groups.instance",
    "groups.gpu",
    "groups.performance",
    "groups.connect",
    "groups.system",
    "groups.price",
    "table.fp16Cuda",
    "table.fp16Dense",
    "table.fp16Sparse",
    "table.fp8Dense",
    "table.fp8Sparse",
    "table.fp4Dense",
    "table.fp4Sparse",
    "placeholders.regionsMissing",
    "placeholders.featuresMissing",
    "placeholders.noRows",
  ];

  it("every dictionary has all of them", () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      const keys = keySet(dict);
      const missing = REQUIRED.filter((key) => !keys.has(key));
      expect(missing, `${lang} is missing keys`).toEqual([]);
    }
  });

  it("the row counter carries both substitution markers", () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      expect(dict.filters.rowCount, `${lang}.filters.rowCount`).toContain("{shown}");
      expect(dict.filters.rowCount, `${lang}.filters.rowCount`).toContain("{total}");
    }
  });

  it("no new UI string contains an emoji", () => {
    // 仕様 6.3: 絵文字は使わない。✓ — △ ▼ ▲ は記号なので対象外。
    const emoji = /\p{Extended_Pictographic}/u;
    for (const [lang, dict] of Object.entries(dictionaries)) {
      for (const path of collectKeys(dict)) {
        const value = path.split(".").reduce((acc, k) => acc[k], dict);
        expect(emoji.test(value), `${lang}.${path} contains an emoji: ${value}`).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/i18n-keys.test.js
```

Expected: FAIL — `ja is missing keys` listing all 26 paths. The emoji test may also fail if any current string carries one; if it does, strip the emoji from that string in Step 3 as well.

- [ ] **Step 3: Add the keys to `ja.js`**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ja.js`, add these seven entries **inside the existing `table:` block**, after `nvme`:

```js
    fp16Cuda: "FP16 CUDA",
    fp16Dense: "FP16 Dense",
    fp16Sparse: "FP16 Sparse",
    fp8Dense: "FP8 Dense",
    fp8Sparse: "FP8 Sparse",
    fp4Dense: "FP4 Dense",
    fp4Sparse: "FP4 Sparse",
```

and add these three new top-level blocks after the existing `generations:` block:

```js
  tabs: {
    compare: "比較",
    regions: "リージョン",
    features: "機能",
    calculator: "計算",
  },
  filters: {
    generations: "世代",
    families: "ファミリ",
    columns: "列",
    region: "リージョン",
    rowCount: "{shown} / {total} 行",
    reset: "絞り込みを解除",
  },
  groups: {
    instance: "インスタンス",
    gpu: "GPU",
    performance: "演算性能",
    connect: "接続",
    system: "システム",
    price: "価格",
  },
  placeholders: {
    regionsMissing: "リージョン提供状況のデータはまだ生成されていません。",
    featuresMissing: "GPU 機能マトリクスのデータはまだ生成されていません。",
    noRows: "条件に合う行がありません。",
  },
```

- [ ] **Step 4: Add the same keys to `en.js`**

Same positions in `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/en.js`. Inside `table:`:

```js
    fp16Cuda: "FP16 CUDA",
    fp16Dense: "FP16 Dense",
    fp16Sparse: "FP16 Sparse",
    fp8Dense: "FP8 Dense",
    fp8Sparse: "FP8 Sparse",
    fp4Dense: "FP4 Dense",
    fp4Sparse: "FP4 Sparse",
```

and the new blocks:

```js
  tabs: {
    compare: "Compare",
    regions: "Regions",
    features: "Features",
    calculator: "Calculator",
  },
  filters: {
    generations: "Generation",
    families: "Family",
    columns: "Columns",
    region: "Region",
    rowCount: "{shown} / {total} rows",
    reset: "Clear filters",
  },
  groups: {
    instance: "Instance",
    gpu: "GPU",
    performance: "Performance",
    connect: "Connect",
    system: "System",
    price: "Price",
  },
  placeholders: {
    regionsMissing: "Region availability data has not been generated yet.",
    featuresMissing: "The GPU feature matrix data has not been generated yet.",
    noRows: "No rows match the current filters.",
  },
```

- [ ] **Step 5: Add the same keys to `ko.js`**

Same positions in `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ko.js`. Inside `table:`:

```js
    fp16Cuda: "FP16 CUDA",
    fp16Dense: "FP16 Dense",
    fp16Sparse: "FP16 Sparse",
    fp8Dense: "FP8 Dense",
    fp8Sparse: "FP8 Sparse",
    fp4Dense: "FP4 Dense",
    fp4Sparse: "FP4 Sparse",
```

and the new blocks:

```js
  tabs: {
    compare: "비교",
    regions: "리전",
    features: "기능",
    calculator: "계산",
  },
  filters: {
    generations: "세대",
    families: "패밀리",
    columns: "열",
    region: "리전",
    rowCount: "{shown} / {total} 행",
    reset: "필터 해제",
  },
  groups: {
    instance: "인스턴스",
    gpu: "GPU",
    performance: "연산 성능",
    connect: "연결",
    system: "시스템",
    price: "가격",
  },
  placeholders: {
    regionsMissing: "리전 제공 현황 데이터가 아직 생성되지 않았습니다.",
    featuresMissing: "GPU 기능 매트릭스 데이터가 아직 생성되지 않았습니다.",
    naRows: "조건에 맞는 행이 없습니다.",
  },
```

**Note the deliberate typo above:** `naRows` must be `noRows`. Fix it as you type — it is here to make the point that the parity test catches exactly this class of mistake, and Step 6 will show you the failure if you paste it verbatim.

- [ ] **Step 6: Run the i18n tests and watch them pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/i18n-keys.test.js tests/i18n.test.js
```

Expected: PASS, `Test Files 2 passed (2)`. If you see `ko is missing keys ["placeholders.noRows"]`, you pasted the typo from Step 5 — rename it and re-run.

- [ ] **Step 7: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files.

- [ ] **Step 8: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/i18n/ja.js src/i18n/en.js src/i18n/ko.js tests/i18n-keys.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 刷新後の UI 用の i18n キーを 3 言語に追加

タブ名、フィルタバー、列グループ名、平坦化した演算性能の列見出し、
Regions / Features の未生成プレースホルダを ja / en / ko に追加した。
キーの存在と絵文字不使用を i18n-keys のテストで担保する。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 4: Theme priority and a text toggle (`src/scripts/theme.js`)

Today `initTheme()` calls `setTheme()`, which writes localStorage — so the very first page view silently pins whatever the OS said at that moment, and the site stops following the OS forever after. Spec §6.2 wants the opposite: **follow `prefers-color-scheme` until the user presses the toggle; after that the stored choice wins.** The button also loses its emoji (Spec §6.3).

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/theme.js` (whole file replaced)
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/theme.test.js` (rewritten)

**Interfaces:**
- Consumes: `t` from `src/scripts/i18n.js`; the keys `theme.dark` / `theme.light` (already present in all three dictionaries).
- Produces (named exports of `src/scripts/theme.js`):
  - `getStoredTheme(): "light"|"dark"|null` — the explicit choice, or `null` if there is none.
  - `getSystemTheme(): "light"|"dark"` — from `prefers-color-scheme`, defaulting to `"dark"`.
  - `getTheme(): "light"|"dark"` — stored first, otherwise system.
  - `applyTheme(theme): void` — sets `data-theme` and does **not** persist.
  - `setTheme(theme): void` — applies **and** persists.
  - `initTheme(): void` — applies `getTheme()`; never persists.
  - `setupThemeToggle(): void` — labels `#theme-toggle` with the name of the theme it will switch *to*, flips on click, and relabels on the `lang-changed` event.

**Which assertions in `tests/theme.test.js` change, and why.** PR 1 pinned the *current* behaviour, so most of the file is still correct; these are the four that move.

| Existing assertion | New assertion | Why |
|---|---|---|
| `setupThemeToggle` "labels the button for the current theme on setup" expects `btn.textContent === "☀️"` | expects `"ライト"` (`t("theme.light")`) | Spec §6.3 forbids emoji; the label now names the theme the button switches to. |
| the same test's `btn.title === "Light mode"` | `btn.title === "ライト"` | The hardcoded English strings go; the title mirrors the label so the control is legible when the strip is narrow. |
| "flips dark to light on click and persists it" expects `"🌙"` / `"Dark mode"` | expects `"ダーク"` for both text and title | Same reason. |
| *(new)* — nothing pinned `initTheme`'s persistence | `initTheme()` must leave `localStorage` empty | The behaviour change itself: Spec §6.2's "初回は `prefers-color-scheme` に従う" only holds if the first visit does not write a value. |

Everything else — `getTheme` reading localStorage, ignoring a bogus stored value, the `matchMedia` fallbacks, `setTheme` writing both the attribute and localStorage — is unchanged and stays.

- [ ] **Step 1: Rewrite the test file**

Replace the whole of `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/theme.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getStoredTheme,
  getSystemTheme,
  getTheme,
  applyTheme,
  setTheme,
  initTheme,
  setupThemeToggle,
} from "../src/scripts/theme.js";

const STORAGE_KEY = "gpu-ref-theme";

/**
 * jsdom は window.matchMedia を実装していない（実行して確認済み）。
 * prefers-color-scheme を読むケースでは必須。
 */
function stubMatchMedia(prefersLight) {
  const impl = vi.fn((query) => ({
    matches: prefersLight,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("matchMedia", impl);
  window.matchMedia = impl;
  return impl;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.body.innerHTML = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.matchMedia;
});

describe("getStoredTheme", () => {
  it("returns the explicit choice", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    expect(getStoredTheme()).toBe("light");
  });

  it("returns null when nothing has been chosen", () => {
    expect(getStoredTheme()).toBeNull();
  });

  it("returns null for a value that is neither light nor dark", () => {
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getStoredTheme()).toBeNull();
  });
});

describe("getSystemTheme", () => {
  it("is light when the OS prefers light", () => {
    stubMatchMedia(true);
    expect(getSystemTheme()).toBe("light");
  });

  it("is dark when the OS prefers dark", () => {
    stubMatchMedia(false);
    expect(getSystemTheme()).toBe("dark");
  });

  it("is dark when matchMedia is unavailable", () => {
    expect(getSystemTheme()).toBe("dark");
  });
});

describe("getTheme", () => {
  it("prefers the stored choice over the OS setting", () => {
    stubMatchMedia(true); // OS says light
    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("does not consult matchMedia when a choice is stored", () => {
    const mm = stubMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, "dark");
    getTheme();
    expect(mm).not.toHaveBeenCalled();
  });

  it("follows the OS setting when nothing is stored", () => {
    stubMatchMedia(true);
    expect(getTheme()).toBe("light");
    localStorage.clear();
    stubMatchMedia(false);
    expect(getTheme()).toBe("dark");
  });

  it("ignores a stored value that is neither light nor dark", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getTheme()).toBe("dark");
  });
});

describe("applyTheme", () => {
  it("sets data-theme without persisting", () => {
    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("setTheme", () => {
  it("sets the data-theme attribute on the root element", () => {
    setTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    setTheme("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists the theme to localStorage", () => {
    setTheme("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    setTheme("dark");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("dark");
  });
});

describe("initTheme", () => {
  it("applies the stored choice", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "light");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("applies the OS setting on a first visit", () => {
    stubMatchMedia(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  // 仕様 6.2 の肝。初回訪問で保存してしまうと、以後 OS 設定に追従しなくなる。
  it("does not persist anything on a first visit", () => {
    stubMatchMedia(true);
    initTheme();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("keeps following the OS across reloads until the user chooses", () => {
    stubMatchMedia(true);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // OS 設定が変わった状態で再訪。保存が無いので追従する。
    stubMatchMedia(false);
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("stops following the OS once the user has chosen", () => {
    stubMatchMedia(true);
    setTheme("dark"); // 明示的な切替
    stubMatchMedia(true); // OS は light のまま
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});

describe("setupThemeToggle", () => {
  function mountButton() {
    document.body.innerHTML = '<button id="theme-toggle" type="button"></button>';
    return document.getElementById("theme-toggle");
  }

  it("does nothing when the button is absent", () => {
    expect(() => setupThemeToggle()).not.toThrow();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("labels the button with the theme it will switch to", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("ライト");
    expect(btn.title).toBe("ライト");
  });

  it("carries no emoji in the label", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(/\p{Extended_Pictographic}/u.test(btn.textContent)).toBe(false);
  });

  it("flips dark to light on click, persists it, and relabels", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(btn.textContent).toBe("ダーク");
  });

  it("flips light back to dark on a second click", () => {
    stubMatchMedia(false);
    applyTheme("light");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });

  it("relabels when the language changes", () => {
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("ライト");

    document.dispatchEvent(new CustomEvent("lang-changed", { detail: { lang: "en" } }));
    expect(btn.textContent).toBe("Light");
  });
});
```

**On the last test:** `setLang` is not called, so `i18n.js`'s `currentLang` stays `"ja"` and `t("theme.light")` would still return `"ライト"`. Make the test honest by having it drive the real language switch. Replace that last `it` block with:

```js
  it("relabels when the language changes", async () => {
    const { setLang } = await import("../src/scripts/i18n.js");
    stubMatchMedia(false);
    applyTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("ライト");

    setLang("en");
    expect(btn.textContent).toBe("Light");

    setLang("ja"); // 他のテストに影響しないよう戻す
  });
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/theme.test.js
```

Expected: FAIL — `getStoredTheme is not a function`, plus the `initTheme` persistence case failing with `expected 'dark' to be null`.

- [ ] **Step 3: Rewrite `theme.js`**

Replace the whole of `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/theme.js`:

```js
// テーマの優先順位 (仕様 6.2):
//   1. 切替ボタンで明示的に選ばれた値 (localStorage)
//   2. 無ければ OS の prefers-color-scheme
// 初回訪問では保存しない。保存してしまうと以後 OS 設定に追従しなくなるため。
import { t } from "./i18n.js";

const STORAGE_KEY = "gpu-ref-theme";

function isTheme(value) {
  return value === "light" || value === "dark";
}

export function getStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return isTheme(saved) ? saved : null;
}

export function getSystemTheme() {
  if (typeof window.matchMedia !== "function") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getTheme() {
  return getStoredTheme() || getSystemTheme();
}

// 適用するだけ。保存しない。
export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// 明示的な選択。適用して保存する。
export function setTheme(theme) {
  applyTheme(theme);
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme() {
  applyTheme(getTheme());
}

export function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  // ラベルは「押すと切り替わる先」の名前。絵文字は使わない (仕様 6.3)。
  function relabel() {
    const current = document.documentElement.getAttribute("data-theme");
    const label = current === "dark" ? t("theme.light") : t("theme.dark");
    btn.textContent = label;
    btn.title = label;
  }

  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    setTheme(current === "dark" ? "light" : "dark");
    relabel();
  });

  document.addEventListener("lang-changed", relabel);
  relabel();
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/theme.test.js
```

Expected: PASS, `Test Files 1 passed (1)`.

- [ ] **Step 5: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files. `main.js` still calls `initTheme()` and `setupThemeToggle()` with the same names, so nothing else needs touching yet — but the button in `index.html` will now read `ライト` instead of `☀️` until Task 6 rebuilds the header.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/scripts/theme.js tests/theme.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: テーマは初回 OS 設定に従い、明示的な切替のみ保存する

initTheme が localStorage に書き込んでいたため、初回訪問でテーマが固定され
以後 OS 設定に追従しなくなっていた。適用のみの applyTheme と、適用して保存する
setTheme に分け、初回は保存しないようにした。切替ボタンの絵文字は
切り替え先のテーマ名 (i18n) に置き換えた。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 5: The Compare tab (`src/scripts/compare-view.js`)

Everything GPU-specific: the six column groups, the generation and family filters, the row counter, the persisted state, and the `regionFilter` hook PR 4 will fill in. It drives `table-engine.js` but adds no rendering of its own beyond the filter bar controls.

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/compare-view.js`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/compare-view.test.js`

**Interfaces:**
- Consumes: `createTable`, `EMPTY` from `./table-engine.js`; `GPU_DATA`, `EC2_LINKS`, `GPU_DATASHEET_LINKS` from `./gpu-data.js`; `isNew`, `parseCount` from `./format.js`; `t` from `./i18n.js`.
- Produces (named exports of `src/scripts/compare-view.js`):
  - `COLUMN_GROUPS: string[]` — `["instance", "gpu", "performance", "connect", "system", "price"]`.
  - `COMPARE_COLUMNS: Column[]` — the definitions, in display order.
  - `STORAGE_KEY = "gpu-ref-compare"`.
  - `defaultState(): CompareState`
  - `loadState(): CompareState` — merges the persisted subset over `defaultState()`; tolerates absent or corrupt storage.
  - `saveState(state): void` — writes **only** `hiddenGroups` and `generations` (Spec §5.2: sort and region are not persisted).
  - `regionFilter(rows, region): object[]` — the PR 4 hook. Returns `rows` untouched.
  - `filterRows(rows, state): object[]` — generation filter, then family filter, then `regionFilter`.
  - `formatRowCount(shown, total): string` — substitutes into `filters.rowCount`.
  - `initCompareView({ rows? }): { update(): void }` — wires the filter bar and the table into the existing `#panel-compare` markup.

**`CompareState`:**

```
{
  sortKey: string|null,      // 保存しない
  sortDir: "asc"|"desc"|null,// 保存しない
  hiddenGroups: string[],    // 保存する
  generations: string[],     // 保存する。空配列 = 絞り込みなし (全表示)
  families: string[],        // 保存しない。空配列 = 絞り込みなし
  region: string|null,       // 保存しない。PR 4 で使う
}
```

An **empty** filter array means "no filter", not "show nothing". That keeps a fresh visit showing all 47 rows without seeding the array with every value, and it makes `saveState` / `loadState` round-trip cleanly.

**DOM contract** (Task 6 provides this markup inside `#panel-compare`):
- `#gen-filters` — empty container; this module fills it with one `<button class="ctl" data-gen="blackwell">` per generation.
- `#family-filters` — empty container; one `<label><input type="checkbox" data-family="P5"></label>` per family, inside a `<details>` the HTML provides.
- `#column-toggles` — empty container; one checkbox per column group.
- `#region-filter` — a container that stays `hidden` in this PR.
- `#compare-row-count` — the counter's `<span>`.
- `#compare-table` — the mount point for the engine's element.

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/compare-view.test.js`:

```js
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
import { GPU_DATA } from "../src/scripts/gpu-data.js";

// フィルタのテストは実データに依存しない小さな行で行う。
const ROWS = [
  { gen: "blackwell", gpu: "B200", gpuKey: "b200", ec2: "P6-B200", size: "p6-b200.48xlarge", count: 8, price: 113.93, priceCb: 12.36, tokyo: false, addedAt: "2026-09" },
  { gen: "hopper", gpu: "H100", gpuKey: "h100", ec2: "P5", size: "p5.48xlarge", count: 8, price: 55.04, priceCb: 3.93, tokyo: true, addedAt: "2023-07" },
  { gen: "ada", gpu: "L4", gpuKey: "l4", ec2: "G6", size: "g6.xlarge", count: 1, price: 0.8, priceCb: null, tokyo: true, addedAt: "2024-08" },
  { gen: "ada", gpu: "L40S", gpuKey: "l40s", ec2: "G6e", size: "g6e.xlarge", count: 1, price: 1.86, priceCb: null, tokyo: true, addedAt: "2024-08" },
];

function mountPanel() {
  document.body.innerHTML = `
    <section id="panel-compare" class="panel">
      <div class="bar">
        <div class="filter-group" id="gen-filters"></div>
        <details class="menu"><summary class="ctl">F</summary><div id="family-filters"></div></details>
        <details class="menu"><summary class="ctl">C</summary><div id="column-toggles"></div></details>
        <div class="filter-group" id="region-filter" hidden></div>
        <span class="row-count mono" id="compare-row-count"></span>
      </div>
      <div id="compare-table"></div>
    </section>
  `;
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
    for (const column of COMPARE_COLUMNS) {
      expect(COLUMN_GROUPS, `column ${column.key}`).toContain(column.group);
    }
  });

  it("gives every column an i18n label key and a known type", () => {
    const types = ["text", "number", "price", "flag", "availability", "feature"];
    for (const column of COMPARE_COLUMNS) {
      expect(typeof column.labelKey, `column ${column.key}`).toBe("string");
      expect(types, `column ${column.key}`).toContain(column.type);
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

  it("has no generation column — the chip carries it", () => {
    expect(COMPARE_COLUMNS.map((c) => c.key)).not.toContain("gen");
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
});

describe("regionFilter", () => {
  it("is a no-op until PR 4 implements it", () => {
    expect(regionFilter(ROWS, "ap-northeast-1")).toEqual(ROWS);
    expect(regionFilter(ROWS, null)).toEqual(ROWS);
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
});

describe("formatRowCount", () => {
  it("substitutes both markers", () => {
    expect(formatRowCount(12, 47)).toBe("12 / 47 行");
  });
});

describe("initCompareView", () => {
  it("renders one row per instance", () => {
    initCompareView({ rows: ROWS });
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(4);
  });

  it("mounts the engine's frame inside #compare-table", () => {
    initCompareView({ rows: ROWS });
    expect(document.querySelector("#compare-table .table-frame")).not.toBeNull();
  });

  it("shows the row count", () => {
    initCompareView({ rows: ROWS });
    expect(document.getElementById("compare-row-count").textContent).toBe("4 / 4 行");
  });

  it("renders a GPU chip on every row, coloured by generation", () => {
    initCompareView({ rows: ROWS });
    const chips = [...document.querySelectorAll("#compare-table tbody .chip")];
    expect(chips).toHaveLength(4);
    expect(chips[0].textContent).toContain("B200");
    expect(chips[0].classList.contains("chip-blackwell")).toBe(true);
    expect(chips[1].classList.contains("chip-hopper")).toBe(true);
  });

  it("shows the family on every row — no rowspans anywhere", () => {
    initCompareView({ rows: ROWS });
    expect(document.querySelectorAll("#compare-table [rowspan]")).toHaveLength(0);
    const familyCells = [...document.querySelectorAll("#compare-table tbody tr")].map(
      (tr) => tr.textContent,
    );
    expect(familyCells[0]).toContain("P6-B200");
    expect(familyCells[3]).toContain("G6e");
  });

  it("builds one generation button per generation present in the rows", () => {
    initCompareView({ rows: ROWS });
    const gens = [...document.querySelectorAll("#gen-filters [data-gen]")].map((b) => b.dataset.gen);
    expect(gens).toEqual(["blackwell", "hopper", "ada"]);
  });

  it("filters the table when a generation button is clicked", () => {
    initCompareView({ rows: ROWS });
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(2);
    expect(document.getElementById("compare-row-count").textContent).toBe("2 / 4 行");
    expect(document.querySelector('[data-gen="ada"]').classList.contains("on")).toBe(true);
  });

  it("un-filters when the same generation button is clicked again", () => {
    initCompareView({ rows: ROWS });
    const btn = document.querySelector('[data-gen="ada"]');
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    btn.dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(4);
    expect(btn.classList.contains("on")).toBe(false);
  });

  it("builds one family checkbox per family, in data order", () => {
    initCompareView({ rows: ROWS });
    const families = [...document.querySelectorAll("#family-filters [data-family]")].map(
      (el) => el.dataset.family,
    );
    expect(families).toEqual(["P6-B200", "P5", "G6", "G6e"]);
  });

  it("filters by family checkbox", () => {
    initCompareView({ rows: ROWS });
    const box = document.querySelector('[data-family="P5"]');
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(1);
  });

  it("builds one column toggle per group, all checked", () => {
    initCompareView({ rows: ROWS });
    const boxes = [...document.querySelectorAll("#column-toggles [data-group]")];
    expect(boxes.map((b) => b.dataset.group)).toEqual(COLUMN_GROUPS);
    expect(boxes.every((b) => b.checked)).toBe(true);
  });

  it("hides a column group when its toggle is cleared", () => {
    initCompareView({ rows: ROWS });
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
    initCompareView({ rows: ROWS });
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
    initCompareView({ rows: ROWS });
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(2);
    expect(document.querySelector('[data-gen="ada"]').classList.contains("on")).toBe(true);
    expect(document.querySelector('[data-group="performance"]').checked).toBe(false);
  });

  it("sorts when a header is clicked, and keeps the filters", () => {
    initCompareView({ rows: ROWS });
    const priceHeader = [...document.querySelectorAll("#compare-table thead th")].find(
      (th) => th.dataset.key === "price",
    );
    priceHeader.dispatchEvent(new Event("click", { bubbles: true }));
    const first = document.querySelector("#compare-table tbody tr td");
    expect(first.textContent).toBe("p6-b200.48xlarge"); // desc: 113.93 が先頭
  });

  it("keeps the region filter hidden in this PR", () => {
    initCompareView({ rows: ROWS });
    expect(document.getElementById("region-filter").hidden).toBe(true);
  });

  it("shows the empty-result message when nothing matches", () => {
    initCompareView({ rows: ROWS });
    const box = document.querySelector('[data-family="P5"]');
    box.checked = true;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-gen="ada"]').dispatchEvent(new Event("click", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(0);
    expect(document.querySelector("#compare-table .empty").textContent).toBe(
      "条件に合う行がありません。",
    );
  });

  it("defaults to the real GPU_DATA when no rows are passed", () => {
    initCompareView();
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(GPU_DATA.length);
  });

  it("does not throw when the panel is absent", () => {
    document.body.innerHTML = "";
    expect(() => initCompareView({ rows: ROWS })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/compare-view.test.js
```

Expected: FAIL — `Failed to resolve import "../src/scripts/compare-view.js"`.

- [ ] **Step 3: Write the module**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/compare-view.js`:

```js
// 比較表 (Compare タブ)。列定義・フィルタ・行数表示・状態の保存を持ち、
// 描画そのものは table-engine.js に任せる。
import { createTable, EMPTY } from "./table-engine.js";
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { isNew, parseCount } from "./format.js";
import { t } from "./i18n.js";

export const STORAGE_KEY = "gpu-ref-compare";

// 仕様 5.2 の 6 グループ。表示順もこの順。
export const COLUMN_GROUPS = ["instance", "gpu", "performance", "connect", "system", "price"];

// GPU 名のチップ。世代で色が変わり、データシートがあればリンクにする。
function gpuChip(value, row) {
  const url = GPU_DATASHEET_LINKS[row.gpu];
  const chip = document.createElement(url ? "a" : "span");
  chip.className = `chip chip-${row.gen}`;
  chip.textContent = row.gpu;
  if (url) {
    chip.href = url;
    chip.target = "_blank";
    chip.rel = "noopener";
    chip.title = `${row.gpu} datasheet`;
  }

  if (!isNew(row.addedAt)) return chip;

  // 直近 3 か月以内に追加された行には NEW バッジを添える (仕様 4.1)。
  const frag = document.createDocumentFragment();
  frag.appendChild(chip);
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = "NEW";
  frag.appendChild(badge);
  return frag;
}

// ファミリ名は EC2 インスタンス種別のページへのリンク。
function familyLink(value) {
  const url = EC2_LINKS[value];
  if (!url) return value || EMPTY;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "ec2-link";
  link.textContent = value;
  return link;
}

// VRAM は 1 GPU あたりの値。count が "1/8" のような分数なら実効値に直す。
function vramCell(value, row) {
  if (value == null) return EMPTY;
  const count = parseCount(row.count);
  if (count < 1) return `${Math.round(value * count)}`;
  return `${value}`;
}

export const COMPARE_COLUMNS = [
  { key: "size", group: "instance", labelKey: "table.instanceSize", type: "text", sticky: true, mono: true },
  { key: "ec2", group: "instance", labelKey: "table.ec2Type", type: "text", format: familyLink },
  { key: "gpu", group: "gpu", labelKey: "table.gpuModel", type: "text", format: gpuChip },
  { key: "count", group: "gpu", labelKey: "table.gpuCount", type: "number" },
  { key: "vramPerGpu", group: "gpu", labelKey: "table.vram", type: "number", format: vramCell },
  { key: "fp16NonTc", group: "performance", labelKey: "table.fp16Cuda", type: "number" },
  { key: "fp16Dense", group: "performance", labelKey: "table.fp16Dense", type: "number" },
  { key: "fp16Sparse", group: "performance", labelKey: "table.fp16Sparse", type: "number" },
  { key: "fp8Dense", group: "performance", labelKey: "table.fp8Dense", type: "number" },
  { key: "fp8Sparse", group: "performance", labelKey: "table.fp8Sparse", type: "number" },
  { key: "fp4Dense", group: "performance", labelKey: "table.fp4Dense", type: "number" },
  { key: "fp4Sparse", group: "performance", labelKey: "table.fp4Sparse", type: "number" },
  { key: "efa", group: "connect", labelKey: "table.efa", type: "text", mono: true },
  { key: "pcie", group: "connect", labelKey: "table.pcie", type: "text", mono: true },
  { key: "vcpu", group: "system", labelKey: "table.vcpu", type: "number" },
  { key: "mem", group: "system", labelKey: "table.memory", type: "text", mono: true, align: "right" },
  { key: "nvme", group: "system", labelKey: "table.nvme", type: "text", mono: true, align: "right" },
  { key: "price", group: "price", labelKey: "table.onDemand", type: "price" },
  { key: "priceGpu", group: "price", labelKey: "table.perGpu", type: "price" },
  { key: "priceCb", group: "price", labelKey: "table.cb", type: "price" },
  { key: "tokyo", group: "price", labelKey: "table.tokyo", type: "flag" },
];

export function defaultState() {
  return {
    sortKey: null,
    sortDir: null,
    hiddenGroups: [],
    generations: [],
    families: [],
    region: null,
  };
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function loadState() {
  const state = defaultState();
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return state; // 壊れた値は黙って既定に戻す。表が出ないより良い。
  }
  if (!stored || typeof stored !== "object") return state;

  state.hiddenGroups = asStringArray(stored.hiddenGroups).filter((g) => COLUMN_GROUPS.includes(g));
  state.generations = asStringArray(stored.generations);
  return state;
}

// 仕様 5.2: 保存するのは hiddenGroups と世代フィルタだけ。ソートとリージョンは保存しない。
export function saveState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ hiddenGroups: state.hiddenGroups, generations: state.generations }),
  );
}

// PR 4 で regions.json を読んで実装する。今は素通し。
export function regionFilter(rows, region) {
  void region;
  return rows;
}

export function filterRows(rows, state) {
  const gens = new Set(state.generations);
  const families = new Set(state.families);
  const filtered = rows.filter((row) => {
    if (gens.size > 0 && !gens.has(row.gen)) return false;
    if (families.size > 0 && !families.has(row.ec2)) return false;
    return true;
  });
  return regionFilter(filtered, state.region);
}

export function formatRowCount(shown, total) {
  return t("filters.rowCount").replace("{shown}", String(shown)).replace("{total}", String(total));
}

// データに出てくる順で重複を除く。フィルタの並びをデータ順に合わせるため。
function uniqueInOrder(rows, key) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row[key])) continue;
    seen.add(row[key]);
    out.push(row[key]);
  }
  return out;
}

export function initCompareView({ rows = GPU_DATA } = {}) {
  const mount = document.getElementById("compare-table");
  if (!mount) return { update() {} };

  const genBox = document.getElementById("gen-filters");
  const familyBox = document.getElementById("family-filters");
  const columnBox = document.getElementById("column-toggles");
  const counter = document.getElementById("compare-row-count");

  const state = loadState();

  const table = createTable({
    columns: COMPARE_COLUMNS,
    rows: filterRows(rows, state),
    state,
    onStateChange(next) {
      // ソートだけがここから来る。保存はしない (仕様 5.2)。
      state.sortKey = next.sortKey;
      state.sortDir = next.sortDir;
      update();
    },
    i18n: t,
  });

  const empty = document.createElement("p");
  empty.className = "empty";
  empty.hidden = true;

  mount.replaceChildren(table.el, empty);

  function update() {
    const shown = filterRows(rows, state);
    table.update(shown, state);
    empty.textContent = t("placeholders.noRows");
    empty.hidden = shown.length > 0;
    if (counter) counter.textContent = formatRowCount(shown.length, rows.length);
  }

  function buildGenerationFilters() {
    if (!genBox) return;
    const fragment = document.createDocumentFragment();
    for (const gen of uniqueInOrder(rows, "gen")) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `ctl gen-${gen}`;
      btn.dataset.gen = gen;
      btn.textContent = t(`generations.${gen}`);
      btn.setAttribute("aria-pressed", String(state.generations.includes(gen)));
      btn.classList.toggle("on", state.generations.includes(gen));
      fragment.appendChild(btn);
    }
    genBox.replaceChildren(fragment);
  }

  function buildFamilyFilters() {
    if (!familyBox) return;
    const fragment = document.createDocumentFragment();
    for (const family of uniqueInOrder(rows, "ec2")) {
      const label = document.createElement("label");
      label.className = "menu-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.family = family;
      input.checked = state.families.includes(family);
      label.appendChild(input);
      label.appendChild(document.createTextNode(family));
      fragment.appendChild(label);
    }
    familyBox.replaceChildren(fragment);
  }

  function buildColumnToggles() {
    if (!columnBox) return;
    const fragment = document.createDocumentFragment();
    for (const group of COLUMN_GROUPS) {
      const label = document.createElement("label");
      label.className = "menu-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = group;
      input.checked = !state.hiddenGroups.includes(group);
      label.appendChild(input);
      label.appendChild(document.createTextNode(t(`groups.${group}`)));
      fragment.appendChild(label);
    }
    columnBox.replaceChildren(fragment);
  }

  function toggleInArray(list, value) {
    const index = list.indexOf(value);
    if (index === -1) list.push(value);
    else list.splice(index, 1);
  }

  if (genBox) {
    genBox.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-gen]");
      if (!btn) return;
      toggleInArray(state.generations, btn.dataset.gen);
      const on = state.generations.includes(btn.dataset.gen);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
      saveState(state);
      update();
    });
  }

  if (familyBox) {
    familyBox.addEventListener("change", (event) => {
      const input = event.target.closest("[data-family]");
      if (!input) return;
      toggleInArray(state.families, input.dataset.family);
      update(); // ファミリは保存しない (仕様 5.2)
    });
  }

  if (columnBox) {
    columnBox.addEventListener("change", (event) => {
      const input = event.target.closest("[data-group]");
      if (!input) return;
      toggleInArray(state.hiddenGroups, input.dataset.group);
      saveState(state);
      update();
    });
  }

  buildGenerationFilters();
  buildFamilyFilters();
  buildColumnToggles();
  update();

  // 言語切替のたびに見出しとフィルタのラベルを引き直す。
  document.addEventListener("lang-changed", () => {
    buildGenerationFilters();
    buildColumnToggles();
    update();
  });

  return { update };
}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/compare-view.test.js
```

Expected: PASS, `Test Files 1 passed (1)`.

- [ ] **Step 5: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files. The old `table.js` and its tests are still there and still green — they go in Task 6.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/scripts/compare-view.js tests/compare-view.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 比較表の列定義とフィルタを compare-view.js に実装

Instance / GPU / Performance / Connect / System / Price の 6 列グループ、
世代とファミリの複数選択フィルタ、行数表示、列グループの表示切替を追加した。
hiddenGroups と世代フィルタは localStorage に保存し、ソートとリージョンは保存しない。
rowspan は廃止し、全行に GPU チップとファミリを表示する。
リージョンフィルタは PR 4 用の no-op フックとして置くだけにした。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 6: Swap the page over (`index.html`, `main.js`, delete the old renderer)

One commit: the new markup, the new wiring, and the removal of everything the new modules replace. The page works at the end of this task but still wears the old AWS skin — Tasks 7 and 8 restyle it. That transient ugliness is deliberate; splitting it further would leave a commit where the page does not render at all.

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/index.html`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/main.js`
- Delete: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table.js`
- Delete: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-render.test.js`
- Delete: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table.test.js`

**Interfaces:**
- Consumes: `initTabs` (Task 2), `initCompareView` (Task 5), `initTheme` / `setupThemeToggle` (Task 4), and the untouched `initI18n` / `setupLangToggle` / `initCalculator`, plus `PRICING_META` from `gpu-data.js`.
- Produces: the DOM contracts Tasks 2 and 5 depend on, and the class names Tasks 7 and 8 style.

**What leaves the page:**
- The `.legend` block (Decision 5).
- The three-deep `<thead>` with its `colspan` / `rowspan` group headers — the engine builds a single header row and the groups become the Columns menu.
- The `🚀` in `header.title` and in the favicon, and the `📝 🔗 ⚠️` in the notes headings.
- `renderTable` / `setupHover` and their tests.

**What stays, moved:**
- The whole `<section id="cost-calculator">` block, verbatim, now inside `#panel-calculator`.
- The whole `.notes` block, minus the emoji, now at the bottom of `#panel-compare` — it documents the comparison table and belongs with it.
- `%BUILD_DATE%`, now a line in the notes block rather than a subtitle.
- `%PRICING_AS_OF%`, now the header caption's fallback, overwritten at runtime from `PRICING_META`.

- [ ] **Step 1: Rewrite the `<body>` of `index.html`**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/index.html`, leave the whole `<head>` as it is **except** the favicon `<link>`, which becomes (Spec §6.3 — no emoji):

```html
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23161719'/><text x='50' y='68' font-size='58' font-family='monospace' font-weight='700' fill='%23f5b95a' text-anchor='middle'>G</text></svg>"
    />
```

Then replace everything from `<body>` to `</body>` with the following. The two long blocks marked **"copy verbatim"** are moved, not retyped — cut them from the current file so their many `id`s reach `calculator.js` unchanged.

```html
  <body>
    <div class="app">
      <header class="top">
        <div class="brand">
          <h1>AWS GPU Reference</h1>
          <small class="mono" id="pricing-caption">pricing %PRICING_AS_OF% · us-east-1</small>
        </div>

        <nav class="tabs" id="tabs" role="tablist">
          <button class="tab" type="button" role="tab" data-tab="compare" data-i18n="tabs.compare">比較</button>
          <button class="tab" type="button" role="tab" data-tab="regions" data-i18n="tabs.regions">リージョン</button>
          <button class="tab" type="button" role="tab" data-tab="features" data-i18n="tabs.features">機能</button>
          <button class="tab" type="button" role="tab" data-tab="calculator" data-i18n="tabs.calculator">計算</button>
        </nav>

        <div class="top-controls">
          <select id="lang-select" class="ctl">
            <option value="ja">日本語</option>
            <option value="en">English</option>
            <option value="ko">한국어</option>
          </select>
          <button id="theme-toggle" class="ctl" type="button"></button>
        </div>
      </header>

      <section class="panel" id="panel-compare" role="tabpanel">
        <div class="bar">
          <div class="filter-group" id="gen-filters"></div>

          <details class="menu" id="family-menu">
            <summary class="ctl" data-i18n="filters.families">ファミリ</summary>
            <div class="menu-body" id="family-filters"></div>
          </details>

          <details class="menu" id="column-menu">
            <summary class="ctl" data-i18n="filters.columns">列</summary>
            <div class="menu-body" id="column-toggles"></div>
          </details>

          <!-- リージョンフィルタは PR 4 で regions.json が入ってから出す -->
          <div class="filter-group" id="region-filter" hidden></div>

          <span class="row-count mono" id="compare-row-count"></span>
        </div>

        <div id="compare-table"></div>

        <div class="notes">
          <h3 data-i18n="notes.title">Notes</h3>
          <ul>
            <li><strong>価格:</strong> <span data-i18n="notes.priceNote">us-east-1 (バージニア北部) の On-Demand 価格 (USD)。CB = Capacity Blocks（東京リージョン優先、未提供時は米国リージョン）。%PRICING_AS_OF% 更新。</span></li>
            <li><strong>G7e:</strong> <span data-i18n="notes.g7eNote">NVIDIA RTX PRO Server 6000 (Blackwell) GPU搭載。</span></li>
            <li><strong>P5en vs P5e vs P5:</strong> <span data-i18n="notes.p5CompNote">P5en: H200 + EFAv3 + PCIe Gen5...</span></li>
            <li><strong>EFA:</strong> <span data-i18n="notes.efaNote">Elastic Fabric Adapter。マルチノード分散学習に必須。</span></li>
            <li><strong>PCIe:</strong> <span data-i18n="notes.pcieNote">Gen5はGen4の約2倍の帯域幅。</span></li>
            <li><strong>FP16/FP8/FP4:</strong> <span data-i18n="notes.fpNote">TFLOPS値。</span></li>
          </ul>

          <h3 data-i18n="notes.refTitle">公式リファレンス</h3>
          <h4 data-i18n="notes.refAwsTitle">AWS</h4>
          <ul>
            <li><a href="https://aws.amazon.com/ec2/instance-types/#Accelerated_Computing" target="_blank" rel="noopener" data-i18n="notes.refAccelerated">EC2 Accelerated Computing インスタンス一覧</a></li>
            <li><a href="https://aws.amazon.com/ec2/pricing/on-demand/" target="_blank" rel="noopener" data-i18n="notes.refOnDemand">EC2 On-Demand 料金</a></li>
            <li><a href="https://aws.amazon.com/ec2/capacityblocks/" target="_blank" rel="noopener" data-i18n="notes.refCb">Capacity Blocks for ML</a></li>
            <li><a href="https://aws.amazon.com/hpc/efa/" target="_blank" rel="noopener" data-i18n="notes.refEfa">Elastic Fabric Adapter (EFA)</a></li>
            <li><a href="https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/accelerated-computing-instances.html" target="_blank" rel="noopener" data-i18n="notes.refUserGuide">EC2 ユーザーガイド</a></li>
            <li><a href="https://aws.amazon.com/blogs/aws/category/compute/amazon-ec2/" target="_blank" rel="noopener" data-i18n="notes.refBlog">AWS Blog - EC2 カテゴリ</a></li>
          </ul>
          <h4 data-i18n="notes.refNvidiaTitle">NVIDIA GPU データソース</h4>
          <ul>
            <li><a href="https://www.nvidia.com/en-us/data-center/" target="_blank" rel="noopener" data-i18n="notes.refNvidiaDataCenter">NVIDIA Data Center GPUs</a></li>
            <li><a href="https://www.nvidia.com/en-us/data-center/dgx-b200/" target="_blank" rel="noopener" data-i18n="notes.refDgxB200">DGX B200</a></li>
            <li><a href="https://www.nvidia.com/en-us/data-center/dgx-b300/" target="_blank" rel="noopener" data-i18n="notes.refDgxB300">DGX B300</a></li>
          </ul>
          <p class="note" data-i18n="notes.refGpuSpecNote">GPU演算性能値はNVIDIA公式データシート・製品ページに基づいています。</p>

          <h3 data-i18n="notes.disclaimerTitle">免責事項</h3>
          <p class="note">
            <span data-i18n="notes.disclaimerBefore">本ページの情報は参考用であり、正確性を保証するものではありません。</span><a href="https://aws.amazon.com/ec2/instance-types/" target="_blank" rel="noopener" data-i18n="notes.disclaimerLink">AWS公式ドキュメント</a><span data-i18n="notes.disclaimerAfter">をご確認ください。</span>
          </p>
          <p class="note mono"><span data-i18n="header.updated">更新日</span>: %BUILD_DATE%</p>
        </div>
      </section>

      <section class="panel" id="panel-regions" role="tabpanel" hidden>
        <p class="placeholder" data-i18n="placeholders.regionsMissing">
          リージョン提供状況のデータはまだ生成されていません。
        </p>
      </section>

      <section class="panel" id="panel-features" role="tabpanel" hidden>
        <p class="placeholder" data-i18n="placeholders.featuresMissing">
          GPU 機能マトリクスのデータはまだ生成されていません。
        </p>
      </section>

      <section class="panel" id="panel-calculator" role="tabpanel" hidden>
        <!-- ここに現行の <section id="cost-calculator" class="calculator-section"> ブロックを
             そのまま移す。calculator.js が参照する id を 1 つも変えないこと。 -->
      </section>
    </div>

    <script type="module" src="./scripts/main.js"></script>
  </body>
```

**Copy verbatim:** the `<section id="cost-calculator" class="calculator-section">` … `</section>` block, from `<h2 data-i18n="calculator.title">` through `<p class="calculator-disclaimer" …>`, moves inside `#panel-calculator` unchanged. Also drop the `↺` from the two reset buttons' text — replace `↺` with nothing and let the `title` carry the meaning; the button gets a CSS-drawn glyph in Task 8. Everything else about that block, including every `id`, stays.

**On the notes text above:** the `<li>` fallback strings are shortened for readability in this plan, but the strings that actually reach the user come from the i18n dictionaries, which are unchanged. Keep whatever fallback text is in the current file if you prefer — the only required edits are removing `📝`, `🔗`, `⚠️` from the three `<h3>` elements and dropping the inline `style=` attributes (their spacing moves to `base.css` in Task 7).

- [ ] **Step 2: Rewrite `main.js`**

Replace the whole of `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/main.js`:

```js
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/header.css";
import "../styles/table.css";
import "../styles/calculator.css";

import { initTheme, setupThemeToggle } from "./theme.js";
import { initI18n, setupLangToggle } from "./i18n.js";
import { initTabs } from "./tabs.js";
import { initCompareView } from "./compare-view.js";
import { initCalculator } from "./calculator.js";
import { PRICING_META } from "./gpu-data.js";

// ヘッダのキャプションはデータの正 (instances.json) に合わせる。
// HTML 側の %PRICING_AS_OF% はビルド時に埋まるフォールバック。
function setPricingCaption() {
  const el = document.getElementById("pricing-caption");
  if (!el) return;
  el.textContent = `pricing ${PRICING_META.pricingAsOf} · ${PRICING_META.pricingRegion}`;
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initI18n();
  setPricingCaption();
  initTabs();
  initCompareView();
  initCalculator();
  setupLangToggle();
  setupThemeToggle();
});
```

`tokens.css` does not exist yet — create it as an empty file now so the import resolves, and fill it in Task 7:

```bash
touch /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/tokens.css
```

`light-theme.css` is no longer imported but the file still exists; Task 7 deletes it.

**Note the dropped `lang-changed` listener.** The old `main.js` re-rendered the table on every language change. `compare-view.js` now subscribes to that event itself (Task 5), so re-registering it here would double-render.

- [ ] **Step 3: Delete the old renderer and its tests**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference rm src/scripts/table.js tests/table-render.test.js tests/table.test.js
```

Expected: `rm 'src/scripts/table.js'` and two more `rm` lines.

- [ ] **Step 4: Confirm nothing still imports the deleted module**

```bash
grep -rn "table\.js\|renderTable\|setupHover\|parseFraction" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests
```

Expected: **no output**. Any hit is a dangling reference — fix it before moving on.

- [ ] **Step 5: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS. The file list should now be `calculator`, `compare-view`, `format`, `gpu-data`, `i18n`, `i18n-keys`, `tabs`, `table-engine`, `theme` — nine files, with `table-render` and `table` gone.

- [ ] **Step 6: Check the page in a browser**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run dev
```

Open the printed URL. Confirm, then stop the server with Ctrl-C:
- The Compare tab is open and the table has one row per instance, each with its own GPU chip and family (no merged cells).
- Clicking `Regions`, `Features` and `Calculator` switches the panel and changes the URL hash; reloading on `#calculator` opens the Calculator.
- The Calculator still computes — pick an instance, change the count, watch the numbers move.
- The generation buttons, the Family menu and the Columns menu all change the table, and the row counter tracks them.
- It looks wrong. That is expected at this commit: the stylesheets still describe the old table.

- [ ] **Step 7: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/index.html src/scripts/main.js src/styles/tokens.css
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: ページを新しいタブ構成と表エンジンに載せ替え

ヘッダをテキストロゴ + タブ + 言語/テーマ切替に作り直し、比較表・リージョン・
機能・計算の 4 パネルを置いた。凡例は削除し、世代の色分けは GPU チップと
世代フィルタが担う。旧 table.js とその DOM テストは表エンジンに置き換えた。
見た目のトークン化は次のコミットで行うため、この時点では旧スタイルのまま。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 7: Design tokens and the shell (`tokens.css`, `base.css`, `header.css`, `table.css`)

The visual swap. Every value below was transcribed from the mockup's `.d` and `.dl` blocks; the token names are Spec §6.1's, plus the five from Decision 8.

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/tokens.css` (empty file from Task 6 → filled)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/base.css` (whole file replaced)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/header.css` (whole file replaced)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/table.css` (whole file replaced)
- Delete: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/light-theme.css`

**Interfaces:**
- Consumes: the class names `table-engine.js` emits (`.table-frame`, `th.sticky`, `th.sortable`, `th.sorted`, `.sortarrow`, `td.num`, `td.mono`, `td.sorted`, `td.dim`) and the ones `compare-view.js` emits (`.chip`, `.chip-<gen>`, `.badge`, `.ec2-link`, `.ctl.gen-<gen>`, `.menu-item`, `.empty`), plus the markup from Task 6 (`.app`, `.top`, `.brand`, `.tabs`, `.tab`, `.top-controls`, `.panel`, `.bar`, `.filter-group`, `.menu`, `.menu-body`, `.row-count`, `.placeholder`, `.notes`, `.note`, `.mono`).
- Produces: the token names Task 8 uses.

- [ ] **Step 1: Write `tokens.css`**

Overwrite `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/tokens.css`:

```css
/*
 * デザイントークン。色・余白・文字・角丸はすべてここに置く (仕様 6.1)。
 * ダークが既定で、ライトは [data-theme="light"] でトークンだけ再定義する。
 * コンポーネント CSS にテーマ分岐を書かないこと (仕様 6.2)。
 */
:root {
  color-scheme: dark;

  /* 面 */
  --bg: #161719;
  --bg-raised: #1b1d20;
  --bg-hover: #1c1e22;
  --bg-inset: #1e2023;   /* タブ列の受け皿 */
  --bg-active: #2b2d31;  /* 選択中のタブ */

  /* 罫線 */
  --line: #2a2c30;
  --line-soft: #222428;
  --line-head: #2a2c30;

  /* 文字 */
  --fg: #d4d6da;
  --fg-strong: #f2f3f5;
  --fg-muted: #8b8f97;
  --fg-dim: #5c6068;

  /* アクセント。価格とソート中の列など「状態」にだけ使う */
  --accent: #f5b95a;
  --accent-bg: #221e15;
  --accent-line: #3d3a2e;
  --sorted-cell-bg: #1a1916;

  /* 世代チップ。turing / volta は既定のグレーのまま */
  --chip-fg: #a9adb5;
  --chip-bg: #232529;
  --chip-line: #2e3035;
  --chip-blackwell-fg: #c4b5ff;
  --chip-blackwell-bg: #211f30;
  --chip-blackwell-line: #3c3560;
  --chip-hopper-fg: #9db8ff;
  --chip-hopper-bg: #1b2233;
  --chip-hopper-line: #2c3a5f;
  --chip-ada-fg: #8fd3db;
  --chip-ada-bg: #16272a;
  --chip-ada-line: #25444a;
  --chip-ampere-fg: #b5d37a;
  --chip-ampere-bg: #1e2515;
  --chip-ampere-line: #374722;
  --chip-turing-fg: var(--chip-fg);
  --chip-turing-bg: var(--chip-bg);
  --chip-turing-line: var(--chip-line);
  --chip-volta-fg: var(--chip-fg);
  --chip-volta-bg: var(--chip-bg);
  --chip-volta-line: var(--chip-line);

  /* 余白スケール */
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;

  /* 文字スケール */
  --fs-xs: 11px;
  --fs-sm: 12.5px;
  --fs-md: 13px;
  --fs-lg: 15px;
  --fs-xl: 20px;

  /* 書体 */
  --font-sans: -apple-system, "Inter", "Hiragino Sans", "Segoe UI", sans-serif;
  --font-mono: "SF Mono", Menlo, "JetBrains Mono", ui-monospace, monospace;

  /* 形。影は使わない (仕様 6.1) */
  --radius: 5px;
  --radius-lg: 7px;

  /* 表の密度 (仕様 6.3): 行高 28px、セル余白 6px × 10px */
  --cell-pad-y: 6px;
  --cell-pad-x: 10px;
  --row-height: 28px;
}

[data-theme="light"] {
  color-scheme: light;

  --bg: #f7f7f8;
  --bg-raised: #fafafb;
  --bg-hover: #f6f6f8;
  --bg-inset: #ebebee;
  --bg-active: #ffffff;

  --line: #dcdde2;
  --line-soft: #eeeff2;
  --line-head: #e1e2e6;

  --fg: #2b2d31;
  --fg-strong: #16171a;
  --fg-muted: #6b6f77;
  --fg-dim: #a0a4ab;

  --accent: #a35f00;
  --accent-bg: #fff6e6;
  --accent-line: #e8c58a;
  --sorted-cell-bg: #fffaf1;

  --chip-fg: #5c6068;
  --chip-bg: #f0f0f3;
  --chip-line: #e1e2e6;
  --chip-blackwell-fg: #5b45c7;
  --chip-blackwell-bg: #f2effd;
  --chip-blackwell-line: #d9d2f7;
  --chip-hopper-fg: #2f5bd9;
  --chip-hopper-bg: #eef3fe;
  --chip-hopper-line: #cfdafa;
  --chip-ada-fg: #137a86;
  --chip-ada-bg: #e9f7f9;
  --chip-ada-line: #c2e6ea;
  --chip-ampere-fg: #5b7a10;
  --chip-ampere-bg: #f3f8e6;
  --chip-ampere-line: #d9e6b8;
}
```

- [ ] **Step 2: Write `base.css`**

Overwrite `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/base.css`. Every AWS-palette variable from the old file is gone; anything that referenced them is rewritten in this task or the next.

```css
/* リセット、body、Notes、そして 768px のメディアクエリ (サイト唯一の分岐点) */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  font-size: var(--fs-md);
  line-height: 1.45;
  background: var(--bg);
  color: var(--fg);
  min-height: 100vh;
  padding: var(--sp-5);
}

.app {
  max-width: 1600px;
  margin: 0 auto;
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}

a {
  color: inherit;
  text-decoration: none;
}
a:hover {
  color: var(--fg-strong);
  text-decoration: underline;
}

.panel[hidden] {
  display: none;
}

/* 未生成データのプレースホルダ (仕様 10) */
.placeholder {
  padding: var(--sp-6);
  text-align: center;
  color: var(--fg-muted);
  border: 1px dashed var(--line);
  border-radius: var(--radius-lg);
}

/* Notes */
.notes {
  margin-top: var(--sp-5);
  padding: var(--sp-4) var(--sp-5);
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  font-size: var(--fs-sm);
  line-height: 1.7;
  color: var(--fg-muted);
}

.notes h3 {
  color: var(--fg-strong);
  font-size: var(--fs-md);
  font-weight: 600;
  margin-top: var(--sp-4);
  margin-bottom: var(--sp-2);
}
.notes h3:first-child {
  margin-top: 0;
}

.notes h4 {
  color: var(--fg);
  font-size: var(--fs-sm);
  font-weight: 600;
  margin-top: var(--sp-3);
  margin-bottom: var(--sp-1);
}

.notes ul {
  margin-left: var(--sp-4);
}
.notes li {
  margin-bottom: var(--sp-1);
}
.notes li strong {
  color: var(--fg);
  font-weight: 600;
}
.notes a {
  color: var(--accent);
}

.note {
  font-size: var(--fs-xs);
  color: var(--fg-muted);
  margin-top: var(--sp-2);
}

/* 動きを減らす設定では遷移を止める (仕様 6.2) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }
}

/* サイト唯一のブレークポイント。全ファイルのモバイル調整をここに集約する (仕様 6.3) */
@media (max-width: 768px) {
  body {
    padding: var(--sp-3);
  }

  /* ヘッダは 2 段: ロゴ + 切替、その下にタブ */
  .top {
    flex-wrap: wrap;
    row-gap: var(--sp-2);
  }
  .tabs {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }

  .bar {
    flex-wrap: wrap;
    row-gap: var(--sp-2);
  }
  .row-count {
    margin-left: 0;
  }

  .notes {
    padding: var(--sp-3);
  }

  .calculator-form {
    gap: var(--sp-3);
  }
  .calculator-input select {
    min-width: 0;
    width: 100%;
  }
  .calculator-results-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Write `header.css`**

Overwrite `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/header.css`:

```css
/* ヘッダ、タブ列、フィルタバー (仕様 6.3) */
.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}

.brand {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
}

.brand h1 {
  font-size: var(--fs-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--fg-strong);
}

.brand small {
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}

/* タブ */
.tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  background: var(--bg-inset);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.tab {
  padding: var(--sp-1) var(--sp-3);
  font: inherit;
  font-size: var(--fs-sm);
  color: var(--fg-muted);
  background: none;
  border: 0;
  border-radius: var(--radius);
  cursor: pointer;
  transition: color 0.12s ease, background 0.12s ease;
}
.tab:hover {
  color: var(--fg);
}
.tab.on {
  background: var(--bg-active);
  color: var(--fg-strong);
}

/* 言語・テーマ切替 */
.top-controls {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
}

/* フィルタバー */
.bar {
  display: flex;
  gap: var(--sp-2);
  align-items: center;
  margin: var(--sp-3) 0;
  font-size: var(--fs-sm);
}

.filter-group {
  display: flex;
  gap: var(--sp-1);
  align-items: center;
}
.filter-group[hidden] {
  display: none;
}

/* 汎用のコントロール。フィルタボタン、セレクト、メニューの見出しに共通 */
.ctl {
  padding: var(--sp-1) 9px;
  font: inherit;
  font-size: var(--fs-sm);
  color: var(--fg);
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
  transition: color 0.12s ease, background 0.12s ease, border-color 0.12s ease;
  list-style: none; /* <summary> のマーカーを消す */
}
.ctl::-webkit-details-marker {
  display: none;
}
.ctl:hover {
  color: var(--fg-strong);
  border-color: var(--fg-dim);
}
.ctl.on {
  color: var(--accent);
  background: var(--accent-bg);
  border-color: var(--accent-line);
}

/* 世代フィルタのボタンは、選択中は世代の色をまとう。旧・凡例の代わり */
.ctl.gen-blackwell.on {
  color: var(--chip-blackwell-fg);
  background: var(--chip-blackwell-bg);
  border-color: var(--chip-blackwell-line);
}
.ctl.gen-hopper.on {
  color: var(--chip-hopper-fg);
  background: var(--chip-hopper-bg);
  border-color: var(--chip-hopper-line);
}
.ctl.gen-ada.on {
  color: var(--chip-ada-fg);
  background: var(--chip-ada-bg);
  border-color: var(--chip-ada-line);
}
.ctl.gen-ampere.on {
  color: var(--chip-ampere-fg);
  background: var(--chip-ampere-bg);
  border-color: var(--chip-ampere-line);
}

select.ctl {
  appearance: auto;
}

/* ドロップダウン (ファミリ選択・列切替) */
.menu {
  position: relative;
}
.menu > summary {
  cursor: pointer;
}
.menu > summary::after {
  content: "▾";
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}

.menu-body {
  position: absolute;
  z-index: 20;
  top: calc(100% + var(--sp-1));
  left: 0;
  min-width: 180px;
  max-height: 320px;
  overflow-y: auto;
  padding: var(--sp-2);
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: 3px var(--sp-1);
  color: var(--fg);
  cursor: pointer;
  border-radius: var(--radius);
}
.menu-item:hover {
  background: var(--bg-hover);
}
.menu-item input {
  accent-color: var(--accent);
}

/* 行数表示は右端 */
.row-count {
  margin-left: auto;
  color: var(--fg-muted);
}
```

- [ ] **Step 4: Write `table.css`**

Overwrite `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/table.css`:

```css
/* 表エンジンの共通スタイル。比較表・リージョン表・機能マトリクスが共有する */
.table-frame {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--bg-raised);
}

.table-frame table {
  width: 100%;
  border-collapse: separate; /* sticky セルでは collapse だと罫線が消える */
  border-spacing: 0;
  font-size: var(--fs-md);
}

.table-frame th,
.table-frame td {
  padding: var(--cell-pad-y) var(--cell-pad-x);
  height: var(--row-height);
  text-align: left;
  white-space: nowrap;
}

/* ヘッダ固定 */
.table-frame thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--bg-raised);
  color: var(--fg-muted);
  font-size: var(--fs-xs);
  font-weight: 500;
  border-bottom: 1px solid var(--line-head);
}

.table-frame thead th.sortable {
  cursor: pointer;
  user-select: none;
}
.table-frame thead th.sortable:hover {
  color: var(--fg);
}
.table-frame thead th.sorted {
  color: var(--accent);
  background: var(--accent-bg);
}

.sortarrow {
  font-size: 9px;
  margin-left: 3px;
}

/* 先頭列固定。ヘッダの角は両方 sticky なので z-index を 1 段上げる */
.table-frame th.sticky,
.table-frame td.sticky {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--bg-raised);
  box-shadow: 1px 0 0 var(--line);
}
.table-frame thead th.sticky {
  z-index: 3;
}

/* 本体 */
.table-frame td {
  border-bottom: 1px solid var(--line-soft);
  color: var(--fg);
}
.table-frame tbody tr:last-child td {
  border-bottom: 0;
}
.table-frame tbody tr:hover td {
  background: var(--bg-hover);
}
.table-frame tbody tr:hover td.sticky {
  background: var(--bg-hover);
}

.table-frame td.sorted {
  background: var(--sorted-cell-bg);
}
.table-frame td.dim {
  color: var(--fg-dim);
}

/* 数値列は右寄せ・等幅・桁揃え */
.table-frame th.num,
.table-frame td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.table-frame td.mono {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
}

/* 先頭列 (インスタンス名) は本文より強い色で */
.table-frame td.sticky {
  color: var(--fg-strong);
}

/* 価格列にだけアクセント色を当てる */
.table-frame td.num.mono[class*="dim"] {
  color: var(--fg-dim);
}

/* 世代チップ */
.chip {
  display: inline-block;
  padding: 1px 7px;
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--chip-fg);
  background: var(--chip-bg);
  border: 1px solid var(--chip-line);
}
a.chip:hover {
  text-decoration: none;
  border-color: var(--fg-dim);
}

.chip-blackwell {
  color: var(--chip-blackwell-fg);
  background: var(--chip-blackwell-bg);
  border-color: var(--chip-blackwell-line);
}
.chip-hopper {
  color: var(--chip-hopper-fg);
  background: var(--chip-hopper-bg);
  border-color: var(--chip-hopper-line);
}
.chip-ada {
  color: var(--chip-ada-fg);
  background: var(--chip-ada-bg);
  border-color: var(--chip-ada-line);
}
.chip-ampere {
  color: var(--chip-ampere-fg);
  background: var(--chip-ampere-bg);
  border-color: var(--chip-ampere-line);
}
.chip-turing {
  color: var(--chip-turing-fg);
  background: var(--chip-turing-bg);
  border-color: var(--chip-turing-line);
}
.chip-volta {
  color: var(--chip-volta-fg);
  background: var(--chip-volta-bg);
  border-color: var(--chip-volta-line);
}

.badge {
  display: inline-block;
  margin-left: var(--sp-1);
  padding: 0 var(--sp-1);
  border-radius: var(--radius);
  font-size: var(--fs-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--accent);
  background: var(--accent-bg);
  border: 1px solid var(--accent-line);
}

.ec2-link {
  color: var(--fg-muted);
}
.ec2-link:hover {
  color: var(--fg-strong);
}

/* 絞り込み結果が 0 件のとき */
.empty {
  padding: var(--sp-5);
  text-align: center;
  color: var(--fg-muted);
}
.empty[hidden] {
  display: none;
}
```

**On the price colour.** The mockup paints the On-Demand and CB cells in the accent. The engine does not emit a `price` class, so add it with an attribute selector keyed on the column, which the engine *does* emit on the header only — it does not. Rather than complicate the engine, style the price columns through their position-independent marker: **add `price` to the engine's cell classes**. Make this one-line change in `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table-engine.js`, inside `buildBody`, right after the `num` line:

```js
      if (column.type === "price") td.classList.add("price");
```

and add the matching rule at the end of `table.css`:

```css
.table-frame td.price {
  color: var(--accent);
}
.table-frame td.price.dim {
  color: var(--fg-dim);
}
```

Then delete the placeholder rule `.table-frame td.num.mono[class*="dim"]` shown above — it was a stand-in and `td.price.dim` replaces it. Also add a test for the new class to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-engine.test.js`, inside the `createTable rendering` describe:

```js
  it("marks price cells so the stylesheet can accent them", () => {
    mount();
    const cells = [...document.querySelectorAll("tbody tr")].map((tr) => tr.children[2]);
    cells.forEach((td) => expect(td.classList.contains("price")).toBe(true));
    expect(document.querySelector("tbody tr").children[1].classList.contains("price")).toBe(false);
  });
```

- [ ] **Step 5: Delete `light-theme.css`**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference rm src/styles/light-theme.css
```

Expected: `rm 'src/styles/light-theme.css'`.

- [ ] **Step 6: Confirm no theme branching and no stale imports survive**

```bash
grep -rn "light-theme\|data-theme=\"light\"" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src --include=*.css --include=*.js | grep -v "styles/tokens.css"
```

Expected: **no output**. `theme.js` writes the attribute through `setAttribute("data-theme", …)`, which this pattern does not match; a hit means a component stylesheet still branches on theme, which Spec §6.2 forbids.

- [ ] **Step 7: Run the tests**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, including the new `price` class case.

- [ ] **Step 8: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/styles/tokens.css src/styles/base.css src/styles/header.css src/styles/table.css src/scripts/table-engine.js tests/table-engine.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: デザイントークンを導入し、ヘッダと表をモック D の見た目にした

色・余白・文字・角丸を tokens.css に集約し、ライトは [data-theme="light"] で
トークンを再定義するだけにした。light-theme.css は廃止。base.css / header.css /
table.css は生の色指定をやめてトークン参照だけにし、768px のメディアクエリを
base.css に集約した。prefers-reduced-motion では遷移を無効化する。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 8: Restyle the Calculator (`calculator.css`)

`calculator.js` is not touched — its logic, its element ids and its number formatting all stay exactly as they are (Spec §6.3: 計算ツールは既存のロジックを維持し、見た目だけトークンに合わせる). Only the stylesheet is rewritten, using the same tokens as the rest of the page, and its mobile rules move to `base.css` (they were added there in Task 7).

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/calculator.css` (whole file replaced)

**Interfaces:**
- Consumes: the tokens from Task 7 and the class names already in `index.html` / emitted by `calculator.js`: `.calculator-section`, `.calculator-form`, `.calculator-input`, `.unit-price-field`, `.unit-price-input-wrapper`, `.unit-price-prefix`, `.unit-price-reset`, `.unit-price-default`, `input.user-edited`, `.calculator-results-grid`, `.result-currency-column`, `.result-currency-header`, `.result-item`, `.result-label`, `.result-value`, `.result-value.cbo`, `.result-default`, `.result-diff`, `.diff-increase`, `.diff-decrease`, `.calculator-monthly-note`, `.calculator-disclaimer`.
- Produces: nothing other tasks read.

- [ ] **Step 1: List the selectors you must keep**

```bash
grep -o "^[.#][a-zA-Z0-9_.#: -]*" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/calculator.css | sort -u
```

Expected: the 31 selectors listed under **Interfaces** above. Every one of them must appear in the rewritten file — dropping one silently unstyles a control.

- [ ] **Step 2: Overwrite `calculator.css`**

Replace the whole of `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/calculator.css`:

```css
/* コスト計算ツール。ロジックは calculator.js のまま、見た目だけトークンに合わせる */
.calculator-section {
  padding: var(--sp-5);
  background: var(--bg-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
}

.calculator-section h2 {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--fg-strong);
  margin-bottom: var(--sp-4);
}

.calculator-form {
  display: flex;
  gap: var(--sp-4);
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: var(--sp-5);
}

.calculator-input {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.calculator-input label {
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}

.calculator-input select,
.calculator-input input {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--fg);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--sp-1) var(--sp-2);
}

.calculator-input select {
  min-width: 300px;
}

.calculator-input input {
  width: 110px;
}

.calculator-input select:focus,
.calculator-input input:focus {
  outline: none;
  border-color: var(--accent);
}

/* 単価の直接入力 */
.unit-price-field .unit-price-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
}

.unit-price-prefix {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.unit-price-field .unit-price-input-wrapper input {
  width: 90px;
}

.unit-price-field .unit-price-input-wrapper input:focus {
  border-color: var(--accent);
}

/* 既定値から書き換えられた入力欄はアクセントで示す */
.unit-price-field .unit-price-input-wrapper input.user-edited {
  color: var(--accent);
  border-color: var(--accent-line);
  background: var(--accent-bg);
}

.unit-price-reset {
  font: inherit;
  font-size: var(--fs-xs);
  line-height: 1;
  color: var(--fg-muted);
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: var(--sp-1) var(--sp-2);
  cursor: pointer;
  transition: color 0.12s ease, border-color 0.12s ease;
}
/* 絵文字を使わずに「戻す」を示す (仕様 6.3) */
.unit-price-reset::before {
  content: "reset";
}
.unit-price-reset:hover {
  color: var(--fg-strong);
  border-color: var(--fg-dim);
}

.unit-price-default {
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}

/* 結果 */
.calculator-results-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-5);
}

.result-currency-column {
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
}

.result-currency-header {
  padding: var(--sp-1) var(--sp-3);
  font-size: var(--fs-xs);
  font-weight: 500;
  color: var(--fg-muted);
  background: var(--bg-inset);
  border-bottom: 1px solid var(--line-head);
}

.result-item {
  display: flex;
  align-items: baseline;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-3);
  border-bottom: 1px solid var(--line-soft);
}
.result-item:last-child {
  border-bottom: 0;
}

.result-label {
  flex: 1;
  font-size: var(--fs-sm);
  color: var(--fg-muted);
}

.result-value {
  font-family: var(--font-mono);
  font-size: var(--fs-md);
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}

/* CB 専用など、その側の値が無い行 */
.result-value.cbo {
  color: var(--fg-dim);
}

.result-default {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-dim);
}

.result-diff {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}
.result-diff.diff-increase {
  color: var(--chip-ampere-fg);
}
.result-diff.diff-decrease {
  color: var(--chip-ada-fg);
}

.calculator-monthly-note,
.calculator-disclaimer {
  margin-top: var(--sp-3);
  font-size: var(--fs-xs);
  color: var(--fg-muted);
}
```

**On `.diff-increase` / `.diff-decrease`:** the old stylesheet used red and green. There is no red or green token — Spec §6.1's palette is neutral plus one amber accent plus the generation chips. Reusing the ampere (yellow-green) and ada (teal) chip foregrounds keeps the difference legible in both themes without inventing a semantic colour pair that appears nowhere else. If a reviewer wants true semantic colours, that is a token addition and a separate change.

- [ ] **Step 3: Verify no raw colour survives outside `tokens.css`**

```bash
grep -nE "#[0-9a-fA-F]{3,8}\b|rgba?\(" \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/base.css \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/header.css \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/table.css \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/calculator.css
```

Expected: **no output**. Any hit is a colour that escaped the token system; move it into `tokens.css` and reference it.

- [ ] **Step 4: Verify every selector survived the rewrite**

```bash
for s in calculator-section calculator-form calculator-input unit-price-field unit-price-input-wrapper unit-price-prefix unit-price-reset unit-price-default user-edited calculator-results-grid result-currency-column result-currency-header result-item result-label result-value cbo result-default result-diff diff-increase diff-decrease calculator-monthly-note calculator-disclaimer; do
  grep -q "$s" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/styles/calculator.css || echo "MISSING: $s"
done
```

Expected: **no output**.

- [ ] **Step 5: Run the tests**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all nine files. `calculator.js` was not touched, so `tests/calculator.test.js` should be untouched too.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/styles/calculator.css
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: コスト計算ツールをトークンベースの見た目に揃えた

calculator.js のロジックと id は一切変えず、calculator.css だけを書き直した。
生の色指定をやめてトークン参照にし、モバイル調整は base.css の 768px に寄せた。
リセットボタンの絵文字は CSS で "reset" の文字に置き換えた。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 9: Build, and verify against the mockup in a browser

Nothing new is written here. This task proves the whole thing renders, in both themes and both widths, and that the single-file build still works.

**Files:** none modified unless a defect is found.

- [ ] **Step 1: Build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
```

Expected: `vite vX.Y.Z building for production...`, then `✓ built in …`, and one emitted file, `../dist/index.html`. No warning about an unresolved import.

- [ ] **Step 2: Confirm the build is still a single self-contained file**

```bash
ls -1 /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist
grep -c "<script" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html
grep -c 'src="\./\|href="\./' /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html
grep -c "%PRICING_AS_OF%\|%BUILD_DATE%" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html
```

Expected: `index.html` is the only file (plus `ogp.png` if the repo ships one); the `<script` count is small and every script is inline; the relative-asset count is `0`; and the placeholder count is `0` — both markers were substituted at build time.

- [ ] **Step 3: Serve the build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run preview
```

Note the printed port (Vite's preview default is `4173`). Leave it running for Steps 4–6.

- [ ] **Step 4: Screenshot it, if a browser is available**

If Playwright MCP tools are available in your session, take four screenshots of `http://localhost:<port>/` and compare each against the corresponding block of `.superpowers/brainstorm/95289-1788758443/content/visual-style-v2.html`:

1. **1280px wide, dark** — resize the browser to 1280×900, navigate, ensure `localStorage` is empty and the emulated colour scheme is dark, screenshot. Compare against the `.d` block.
2. **1280px wide, light** — click the theme toggle, screenshot. Compare against the `.dl` block.
3. **375px wide, dark** — resize to 375×800, screenshot. There is no mockup for this width; check the acceptance list below instead.
4. **375px wide, light** — screenshot.

What to compare against the mockup, in order of importance:
- The header reads `AWS GPU Reference` with a monospace `pricing YYYY-MM · us-east-1` beside it, then the four-tab strip in a recessed trough, then the language select and the theme button. No emoji anywhere.
- The table sits in a 1px hairline panel with a 7px radius and **no shadow**. Rows are about 28px tall.
- The instance name column is monospace and stronger in colour than the rest; every row carries a coloured GPU chip; numbers are right-aligned and tabular.
- Amber appears **only** on price cells, the sorted column's header and cells, and active filter buttons. Nothing else is coloured except the chips.
- Light mode is the same layout on a near-white ground with the darker amber `#a35f00`; nothing is unreadable and no element keeps a dark background.

At 375px, check instead:
- The header wraps to two rows with the tab strip on its own line and horizontally scrollable.
- The table scrolls horizontally **inside its frame** while the instance-name column stays pinned to the left and the header stays pinned to the top.
- The page body itself does not scroll sideways.

- [ ] **Step 5: If no browser tooling is available, check by hand**

Open `http://localhost:<port>/` in a browser and walk this list, which is the same as Step 4's:

1. In your OS settings, switch the appearance to Light with the site's `localStorage` cleared (DevTools → Application → Local Storage → clear, then reload). The page must come up light **without** the toggle having been pressed. Switch the OS back to Dark and reload: the page follows. This is the Spec §6.2 behaviour and the one most likely to regress.
2. Press the theme toggle once. Now change the OS setting and reload — the page must keep your choice.
3. Narrow the window under 768px and confirm the header wraps, the tab strip scrolls, and the table's first column stays pinned while the rest scrolls.
4. Click each of the four tabs; confirm the hash changes and a reload on `#calculator` lands on the Calculator.
5. Sort by On-Demand: first click descending, second ascending, third back to the data order. Rows with no price stay at the bottom in both directions.
6. Turn off the Performance column group, reload, and confirm it is still off. Sort by something, reload, and confirm the sort is **not** restored (Spec §5.2).
7. Confirm the Regions and Features tabs each show their "not generated yet" placeholder and that no region control appears in the filter bar.

- [ ] **Step 6: Stop the preview server**

Ctrl-C the `npm run preview` process.

- [ ] **Step 7: Record the result**

If everything passed, there is nothing to commit — the previous eight commits are the PR. Say so and move on to opening the PR. If a defect turned up, fix it in the file that owns it, re-run `npm test`, and commit with a `fix:` prefix and the same two trailers.

- [ ] **Step 8: Open the pull request**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference push -u origin feat/design-renewal
```

Then open the PR against `feat/data-json` (not `main` — PR 2 is its base):

```bash
gh pr create --repo koyakimu/aws-gpu-quick-reference --base feat/data-json --head feat/design-renewal --title "デザイン全面刷新: トークン、テーマ、タブ、表エンジン" --body "$(cat <<'EOF'
## 内容

設計書 `docs/superpowers/specs/2026-09-07-site-renewal-design.md` の PR 3。
5.1 / 5.2 / 5.5 と 6 節すべてを実装した。

- `src/scripts/table-engine.js`: GPU データを知らない汎用の表エンジン。ソート、
  列グループの表示切替、先頭列と thead の固定を持つ。PR 4 / PR 5 もこれを使う
- `src/scripts/compare-view.js`: 比較表の列定義 (6 グループ)、世代・ファミリの
  フィルタ、行数表示、hiddenGroups と世代フィルタの localStorage 保存
- `src/scripts/tabs.js`: `#compare #regions #features #calculator` のハッシュ連動タブ
- `src/styles/tokens.css`: 色・余白・文字・角丸を集約。ライトは
  `[data-theme="light"]` でトークンを再定義するだけ。`light-theme.css` は廃止
- テーマの優先順位を修正: 初回は OS 設定に従い、切替ボタンを押したときだけ保存する
- rowspan による結合を廃止し、全行に GPU チップとファミリを表示 (モック D)
- 凡例は削除。世代の色は GPU チップと世代フィルタが担う
- 絵文字を UI から全廃

## レビューで確認してほしい点

- ライト/ダークの見え方 (OS 設定に従う初回、切替後の固定)
- 768px 以下でヘッダが 2 段になり、表が先頭列固定で横スクロールすること
- ソートは保存されず、列の表示切替と世代フィルタだけが保存されること

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

Once PR 2 merges, retarget this PR at `main` with `gh pr edit --base main`.

---

## Self-Review

Run against the spec after the plan was written.

**1. Spec coverage (PR 3 scope only).**

| Spec section | Where |
|---|---|
| §5.1 engine interface, column shape, type set, sort rules | Task 1 |
| §5.2 six column groups | Task 5 (`COLUMN_GROUPS`, `COMPARE_COLUMNS`) |
| §5.2 default order = data order, sort release returns to it | Task 1 (`sortRows` with a null column; `nextSortState`'s third step) |
| §5.2 generation and family filters | Task 5 (`filterRows`, the filter-bar builders) |
| §5.2 region filter only when `regions.json` exists | Task 5 (`regionFilter` no-op) + Task 6 (`#region-filter` `hidden`) — Decision 9 |
| §5.2 persist `hiddenGroups` + generations, not sort/region | Task 5 (`saveState` / `loadState` and their tests) |
| §5.2 sticky first column and `thead` | Task 1 (classes) + Task 7 (`position: sticky`) |
| §5.2 no rowspans; chip + family on every row | Task 5 (`gpuChip`, `familyLink`) and its "no rowspans anywhere" test |
| §5.2 row count "12 / 47 rows" | Task 3 (`filters.rowCount`) + Task 5 (`formatRowCount`) |
| §5.5 hash tabs, default compare, `hashchange`, `hidden` | Task 2 |
| §6.1 every token | Task 7 `tokens.css` |
| §6.2 theme priority | Task 4 |
| §6.2 `light-theme.css` deleted, no theme branching in components | Task 7 Steps 5–6 |
| §6.2 `prefers-reduced-motion` | Task 7 `base.css` |
| §6.3 header layout, no emoji | Task 6 + Task 4 (toggle label) + Task 8 (reset button) |
| §6.3 filter bar | Task 6 markup + Task 7 `header.css` |
| §6.3 table density (28px rows, 6×10 padding) | Task 7 (`--row-height`, `--cell-pad-*`) |
| §6.3 calculator keeps logic, restyled | Task 8 |
| §6.3 single 768px breakpoint in `base.css` | Task 7 |
| §6.4 the five-file CSS layout | Tasks 7–8 |
| §9 `tests/table-engine.test.js` | Task 1 |
| §9 `tests/tabs.test.js` | Task 2 |
| §9 `tests/theme.test.js` priority | Task 4 |
| §10 Regions placeholder when `regions.json` is absent | Task 6 |

Out of PR 3's scope and deliberately absent: §5.3 (Regions table — PR 4), §5.4 (Features matrix — PR 5), §4.2/§4.3 (their data files), §7 (the region fetch script), §8 (PR 2), and the §9 tests belonging to those PRs.

**2. Placeholder scan.** No `TBD`, no "add error handling", no "similar to Task N", no test described without its code. `regionFilter` is a deliberate, documented no-op with a passing test that pins it as one, not a placeholder — PR 4 replaces its body.

**3. Type consistency.** Checked across tasks: `createTable` / `update` / `visibleColumns` / `sortRows` / `compareValues` / `nextSortState` / `EMPTY` (Task 1) are used under exactly those names in Tasks 5 and 7. `COLUMN_GROUPS` / `COMPARE_COLUMNS` / `STORAGE_KEY` / `defaultState` / `loadState` / `saveState` / `regionFilter` / `filterRows` / `formatRowCount` / `initCompareView` (Task 5) match the test file's import list. `TAB_IDS` / `tabFromHash` / `initTabs` (Task 2) match `main.js` in Task 6. `getStoredTheme` / `getSystemTheme` / `getTheme` / `applyTheme` / `setTheme` / `initTheme` / `setupThemeToggle` (Task 4) match both the test and `main.js`. `formatNumber` (Task 1) is imported by `table-engine.js` from `format.js`, where Task 1 puts it. The i18n key list in Task 3 is exactly the set of keys `compare-view.js`, `tabs.js` (via the HTML), `theme.js` and `index.html` read.

**One fix applied during review:** Task 7 originally styled price cells through an attribute selector the engine never emits. It now adds a `price` class in `buildBody` and a test for it, and the stand-in rule is deleted in the same step.
