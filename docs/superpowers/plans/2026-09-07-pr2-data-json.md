# PR 2 `feat/data-json` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the instance table's source of truth from a JS literal into `data/instances.json` with numeric prices, refresh On-Demand pricing from the AWS Price List, add the missing instances (including p6e-gb200 UltraServers), and inject `pricingAsOf` at build time — with the current page look and behaviour preserved.

**Architecture:** `data/instances.json` becomes the single source of truth. `src/scripts/gpu-data.js` shrinks to a thin re-export layer (`GPU_DATA`, `EC2_LINKS`, `GPU_DATASHEET_LINKS`, `PRICING_META`) over that JSON — Vite inlines JSON imports into the single-file bundle, so no runtime fetch is added. The presentation concerns that used to live in the data (the `$` prefix, the `-` placeholder, the `genRows` / `gpuRows` / `ec2Rows` rowspan counters, the `gpuNew` badge flag) move into pure helper functions in a new `src/scripts/format.js`, which `table.js` calls at render time. Two Node scripts (`scripts/update-od-pricing.mjs`, the rewritten `scripts/update-cb-pricing.mjs`) write back into the JSON through a shared `scripts/lib/` layer; their logic is split into pure, network-free functions so it is unit-testable.

**Tech Stack:** Vite 8 + `vite-plugin-singlefile` 2, vanilla ES modules, Vitest 4 + jsdom 29, Node 22 (`node:fs`, `node:readline`, global `fetch`) for the update scripts. No new runtime or dev dependencies.

**Spec:** `docs/superpowers/specs/2026-09-07-site-renewal-design.md` — this plan implements **only PR 2** (section 3 row 2; detail in sections 4.1, 4.4, 8, and the PR-2 items of 9 and 10).

## Global Constraints

- **No new dependencies.** Neither runtime nor dev. Node's standard library and the existing devDependencies only. (Spec §7.2 "Node 標準の `fetch` を使い、依存パッケージを増やさない" — applied to PR 2's scripts too.)
- **Single-file build stays.** `npm run build` must keep producing one self-contained `dist/index.html` with zero runtime dependencies (Spec §2).
- **Data source of truth is `data/*.json`; JS is a thin importing layer** (Spec §2).
- **PR 1 is already merged.** Assume the dependency bump, `tests/i18n-keys.test.js`, and the table render DOM test exist. Do not re-create them. If `tests/i18n-keys.test.js` does not exist when you start, stop and report — you are on the wrong base branch.
- **The visible page must not change in this PR** except for the two documented items in Task 2 (L4 rowspan) and Task 7 (pricing date text). The design overhaul is PR 3.
- Field names, exactly as in Spec §4.1: `gen`, `gpu`, `gpuKey`, `ec2`, `size`, `unit`, `count`, `vramPerGpu`, `fp16NonTc`, `fp16Dense`, `fp16Sparse`, `fp8Dense`, `fp8Sparse`, `fp4Dense`, `fp4Sparse`, `est`, `efa`, `pcie`, `vcpu`, `mem`, `nvme`, `price`, `priceGpu`, `priceCb`, `tokyo`, `addedAt`.
- Deleted fields, exactly as in Spec §4.1: `genRows`, `gpuRows`, `ec2Rows`, `gpuNew`.
- `price` / `priceGpu` / `priceCb` are **numbers or `null`**. Never the strings `"$113.93"`, `"-"`, or `"TBD"` (Spec §4.1).
- `unit` is `"instance"` or `"ultraserver"` (Spec §4.1).
- `gpuKey` values are exactly the set listed in Spec §4.1: `b300`, `b200`, `rtx-pro-6000`, `h200`, `h100`, `l40s`, `l4`, `a100-40`, `a100-80`, `a10g`, `t4`, `t4g`, `v100` — plus `gb200`, added by Task 6 for the p6e-gb200 UltraServers (the spec's list predates that row; record the addition in the spec's §11 as the spec instructs).
- Repository language rules: comments and commit messages in Japanese, following the existing style (`feat:` / `fix:` / `chore:` + a Japanese summary).
- Every commit message ends with these two trailer lines, after one blank line:
  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
  ```
- Never run `cd`. All commands in this plan use absolute paths or `npm --prefix`.
- Work on branch `feat/data-json`, cut from `main`.

---

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `data/instances.json` | Source of truth. `pricingAsOf`, `pricingRegion`, `instances[]`. |
| `src/scripts/format.js` | Pure presentation helpers shared by `table.js` and the Node scripts: `formatPrice`, `parseCount`, `computeSpans`, `isNew`. No DOM, no imports. |
| `scripts/lib/instances-file.mjs` | Read / serialise / write `data/instances.json`; `roundUsd`. Shared by both update scripts. |
| `scripts/lib/od-pricing.mjs` | Pure On-Demand logic: `scanPriceList` (line-oriented Price List reader), `applyOdPricing`. No network. |
| `scripts/update-od-pricing.mjs` | Thin CLI wrapper: fetch → `scanPriceList` → `applyOdPricing` → write. |
| `tests/format.test.js` | Unit tests for `src/scripts/format.js`. |
| `tests/update-od-pricing.test.js` | Unit tests for `scripts/lib/od-pricing.mjs` against a small inline fixture. |
| `tests/update-cb-pricing.test.js` | Unit tests for the CB script's pure `applyCbPricing`. |

**Modified:**

| Path | Change |
|---|---|
| `src/scripts/gpu-data.js` | Reduced to a thin layer over `data/instances.json`; keeps `EC2_LINKS` and `GPU_DATASHEET_LINKS`; adds `PRICING_META`. |
| `src/scripts/table.js` | Rowspans computed from the row order; prices formatted through `formatPrice`. |
| `src/scripts/calculator.js` | `parsePrice` / `isCbOnly` accept numbers and `null`; only rows with both `price` and `priceCb` `null` are dropped from the selector; a `null` side renders as `—`. |
| `src/scripts/i18n.js` | `t()` substitutes `%PRICING_AS_OF%`. |
| `src/i18n/{ja,en,ko}.js` | `notes.priceNote` carries `%PRICING_AS_OF%` instead of a hardcoded month. |
| `src/index.html` | The static `notes.priceNote` fallback text carries `%PRICING_AS_OF%`. |
| `vite.config.js` | Reads `pricingAsOf` from `data/instances.json` and injects `%PRICING_AS_OF%`; the `transformIndexHtml` hook becomes `order: "pre"`. |
| `scripts/update-cb-pricing.mjs` | Rewritten to patch numeric `priceCb` in `data/instances.json` instead of regex-editing `gpu-data.js`. |
| `.github/workflows/update-cb-pricing.yml` | `git add data/instances.json`. |
| `data/aws-ec2-nvidia-gpu-specs.json` | Entries appended for the GPUs added in Task 6. |
| `tests/{gpu-data,calculator,table}.test.js` | Updated for the new shapes. Assertions are rewritten, not deleted. |

**Not committed:** the one-off conversion script (Task 2) is written to the scratchpad. Rationale: its only input is the `GPU_DATA` array literal in the pre-migration `gpu-data.js`, which stops existing the moment the task lands, so a committed copy would be dead code from its first commit. Its full source is in this plan so it can be recreated if the migration must be redone.

---

## Task 1: Pure presentation helpers (`src/scripts/format.js`)

The data currently carries presentation: `price: "$113.93"` bakes in the `$`, `priceCb: "-"` bakes in the empty marker, and `genRows` / `gpuRows` / `ec2Rows` bake in the table's rowspans. Spec §4.1 removes all of that from the data. This task creates the functions that will absorb it, tested in isolation, with nothing wired up yet — so it lands green and is reviewable on its own.

**Files:**
- Create: `src/scripts/format.js`
- Test: `tests/format.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (all named exports of `src/scripts/format.js`, all pure, no DOM):
  - `formatPrice(value: number|null): string` — `null` → `"-"`, number → `"$" + value.toFixed(2)`.
  - `parseCount(count: number|string): number` — `8` → `8`, `"1/8"` → `0.125`, `"8"` → `8`.
  - `computeSpans(rows: object[]): Array<{gen:number, gpu:number, ec2:number}>` — one entry per row; the value is the rowspan for the row that starts a run and `0` for rows covered by an earlier cell.
  - `isNew(addedAt: string|null, now?: Date): boolean` — `true` when `addedAt` (`"YYYY-MM"`) is within the last 3 months of `now`.

- [ ] **Step 1: Create the branch**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference switch -c feat/data-json main
```

- [ ] **Step 2: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/format.test.js`:

```js
import { describe, it, expect } from "vitest";
import { formatPrice, parseCount, computeSpans, isNew } from "../src/scripts/format.js";

describe("formatPrice", () => {
  it("prefixes a dollar sign and forces two decimals", () => {
    expect(formatPrice(113.93)).toBe("$113.93");
    expect(formatPrice(0.8)).toBe("$0.80");
    expect(formatPrice(3)).toBe("$3.00");
  });

  it("renders null as a dash", () => {
    expect(formatPrice(null)).toBe("-");
    expect(formatPrice(undefined)).toBe("-");
  });
});

describe("parseCount", () => {
  it("passes numbers through", () => {
    expect(parseCount(8)).toBe(8);
    expect(parseCount(1)).toBe(1);
  });

  it("parses fraction strings", () => {
    expect(parseCount("1/8")).toBeCloseTo(0.125);
    expect(parseCount("1/2")).toBeCloseTo(0.5);
  });

  it("parses whole-number strings", () => {
    expect(parseCount("8")).toBe(8);
  });
});

describe("computeSpans", () => {
  it("gives the first row of each run the run length and the rest zero", () => {
    const rows = [
      { gen: "ada", gpu: "L40S", ec2: "G6e" },
      { gen: "ada", gpu: "L40S", ec2: "G6e" },
      { gen: "ada", gpu: "L4", ec2: "G6" },
      { gen: "turing", gpu: "T4", ec2: "G4dn" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 3, gpu: 2, ec2: 2 },
      { gen: 0, gpu: 0, ec2: 0 },
      { gen: 0, gpu: 1, ec2: 1 },
      { gen: 1, gpu: 1, ec2: 1 },
    ]);
  });

  it("keeps one GPU cell spanning two families (V100 over P3 and P3dn)", () => {
    const rows = [
      { gen: "volta", gpu: "V100", ec2: "P3" },
      { gen: "volta", gpu: "V100", ec2: "P3" },
      { gen: "volta", gpu: "V100", ec2: "P3dn" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 3, gpu: 3, ec2: 2 },
      { gen: 0, gpu: 0, ec2: 0 },
      { gen: 0, gpu: 0, ec2: 1 },
    ]);
  });

  it("does not merge runs of the same GPU that sit in different generations", () => {
    const rows = [
      { gen: "ada", gpu: "L4", ec2: "G6" },
      { gen: "turing", gpu: "L4", ec2: "G6" },
    ];
    expect(computeSpans(rows)).toEqual([
      { gen: 1, gpu: 1, ec2: 1 },
      { gen: 1, gpu: 1, ec2: 1 },
    ]);
  });

  it("returns an empty array for no rows", () => {
    expect(computeSpans([])).toEqual([]);
  });
});

describe("isNew", () => {
  const now = new Date(Date.UTC(2026, 8, 7)); // 2026-09-07

  it("is true within three months", () => {
    expect(isNew("2026-09", now)).toBe(true);
    expect(isNew("2026-06", now)).toBe(true);
  });

  it("is false older than three months", () => {
    expect(isNew("2026-05", now)).toBe(false);
    expect(isNew("2024-01", now)).toBe(false);
  });

  it("is false for a missing or malformed date", () => {
    expect(isNew(null, now)).toBe(false);
    expect(isNew(undefined, now)).toBe(false);
    expect(isNew("nonsense", now)).toBe(false);
  });

  it("is false for a future date", () => {
    expect(isNew("2026-12", now)).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/format.test.js
```

Expected: FAIL — `Failed to resolve import "../src/scripts/format.js"`.

- [ ] **Step 4: Write the implementation**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js`:

```js
// 表示用の純関数。DOM にも他モジュールにも依存しないため、
// ブラウザ側 (table.js) と Node 側 (scripts/) の両方から import できる。

// 価格 (数値または null) を表示文字列にする。null は「提供なし」を意味する。
export function formatPrice(value) {
  if (value == null) return "-";
  return "$" + value.toFixed(2);
}

// count は数値または "1/8" のような分数文字列。
export function parseCount(count) {
  if (typeof count === "number") return count;
  const parts = String(count).split("/");
  return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(count);
}

// 連続する同値の行から rowspan を計算する。
// 先頭行に連続数を、それ以外の行に 0 (= セルを出さない) を入れて返す。
// gpu / ec2 は世代をまたいで結合しないよう gen をキーに含める。
export function computeSpans(rows) {
  const keys = {
    gen: (row) => row.gen,
    gpu: (row) => `${row.gen} ${row.gpu}`,
    ec2: (row) => `${row.gen} ${row.ec2}`,
  };
  const spans = rows.map(() => ({ gen: 0, gpu: 0, ec2: 0 }));

  for (const field of Object.keys(keys)) {
    const keyOf = keys[field];
    let start = 0;
    for (let i = 1; i <= rows.length; i++) {
      if (i === rows.length || keyOf(rows[i]) !== keyOf(rows[start])) {
        spans[start][field] = i - start;
        start = i;
      }
    }
  }
  return spans;
}

// addedAt ("YYYY-MM") が now から 3 か月以内なら NEW 扱いにする。
export function isNew(addedAt, now = new Date()) {
  if (typeof addedAt !== "string") return false;
  const match = /^(\d{4})-(\d{2})$/.exec(addedAt);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const months = (now.getUTCFullYear() - year) * 12 + (now.getUTCMonth() + 1 - month);
  return months >= 0 && months <= 3;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/format.test.js
```

Expected: PASS — 4 test files' worth of suites is not what runs here; you should see `Test Files 1 passed (1)` and every `format` case green.

- [ ] **Step 6: Run the whole suite to confirm nothing else broke**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, all files.

- [ ] **Step 7: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src/scripts/format.js tests/format.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 価格整形と rowspan 計算の純関数を format.js に追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 2: Migrate the data into `data/instances.json`

The flip. `GPU_DATA` moves out of JS and into JSON with numeric prices and no rowspan fields, and every consumer is rewired in the same commit so the tree stays green and the page keeps working.

**Files:**
- Create: `data/instances.json` (generated — never hand-typed)
- Create (scratchpad, **not** committed): `<scratchpad>/convert-gpu-data.mjs`
- Modify: `src/scripts/gpu-data.js` (whole file replaced)
- Modify: `src/scripts/table.js`
- Modify: `src/scripts/calculator.js`
- Test: `tests/gpu-data.test.js`, `tests/calculator.test.js`, `tests/table.test.js`

**Interfaces:**
- Consumes: `formatPrice`, `parseCount`, `computeSpans`, `isNew` from `src/scripts/format.js` (Task 1).
- Produces:
  - `data/instances.json`: `{ pricingAsOf: string, pricingRegion: string, instances: object[] }`.
  - `src/scripts/gpu-data.js` exports `GPU_DATA` (`=== instances`), `EC2_LINKS`, `GPU_DATASHEET_LINKS`, `PRICING_META` (`{ pricingAsOf, pricingRegion }`).
  - `src/scripts/calculator.js` exports `parsePrice(value: number|string|null): number|null` and `isCbOnly(row: {price: number|null}): boolean`, unchanged names.

**gpuKey mapping** (used by the conversion script; from Spec §4.1):

| `gpu` | `gpuKey` |
|---|---|
| `B300` | `b300` |
| `B200` | `b200` |
| `RTX PRO` | `rtx-pro-6000` |
| `H200` | `h200` |
| `H100` | `h100` |
| `L40S` | `l40s` |
| `L4` | `l4` |
| `A100 40GB` | `a100-40` |
| `A100 80GB` | `a100-80` |
| `A10G` | `a10g` |
| `T4` | `t4` |
| `T4G` | `t4g` |
| `V100` | `v100` |

**Known cosmetic difference this task introduces (accept it, do not work around it):** today the `L4` cell is rendered twice — `gpuRows: 4` over the four `g6.*` rows and `gpuRows: 3` over the three `g6f.*` rows. `computeSpans` merges any run of the same `gpu` inside one `gen`, so `L4` becomes a single cell spanning all seven rows. Every other rowspan in the table is reproduced exactly (verified run-by-run against the current `genRows` / `gpuRows` / `ec2Rows` values, including `V100` spanning `P3` + `P3dn`). PR 3 removes rowspans entirely, so this is a one-cell, two-week difference.

**Spec §10 (decided 2026-09-07):** the Calculator keeps CB-only rows (currently `p5e.48xlarge`). The selector drops a row only when **both** `price` and `priceCb` are `null`. When one side is `null`, that side's result cells show `—` and the other side is computed as usual. Verify in Step 12 (browser check) that `p5e.48xlarge` is still selectable and that its On-Demand cells read `—` while its CB cells show amounts.

- [ ] **Step 1: Write the one-off conversion script into the scratchpad**

Do not commit this file. Write it to `<scratchpad>/convert-gpu-data.mjs` (substitute the scratchpad path from your environment):

```js
// 一度きりの移行スクリプト。旧 gpu-data.js の GPU_DATA から data/instances.json を生成する。
// 手で書き写すと転記ミスが出るので必ずこれを通すこと。コミットはしない。
import { writeFileSync } from "node:fs";
import { GPU_DATA } from "/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/gpu-data.js";

const GPU_KEYS = {
  "B300": "b300",
  "B200": "b200",
  "RTX PRO": "rtx-pro-6000",
  "H200": "h200",
  "H100": "h100",
  "L40S": "l40s",
  "L4": "l4",
  "A100 40GB": "a100-40",
  "A100 80GB": "a100-80",
  "A10G": "a10g",
  "T4": "t4",
  "T4G": "t4g",
  "V100": "v100",
};

// "$113.93" / "-" / "TBD" / null -> 数値または null
function toNumber(value) {
  if (value == null || value === "-" || value === "TBD") return null;
  if (typeof value === "number") return value;
  const n = Number(String(value).replace("$", ""));
  return Number.isFinite(n) ? n : null;
}

const FIELD_ORDER = [
  "gen", "gpu", "gpuKey", "ec2", "size", "unit", "count", "vramPerGpu",
  "fp16NonTc", "fp16Dense", "fp16Sparse", "fp8Dense", "fp8Sparse",
  "fp4Dense", "fp4Sparse", "est", "efa", "pcie", "vcpu", "mem", "nvme",
  "price", "priceGpu", "priceCb", "tokyo", "addedAt",
];

let gen = null;
let gpu = null;
let ec2 = null;
const instances = GPU_DATA.map((row) => {
  // 旧データは rowspan 前提で先頭行にしか gen/gpu/ec2 が無いので、直前の値を引き継ぐ
  gen = row.gen ?? gen;
  gpu = row.gpu ?? gpu;
  ec2 = row.ec2 ?? ec2;

  const gpuKey = GPU_KEYS[gpu];
  if (!gpuKey) throw new Error(`gpuKey unknown for gpu="${gpu}" (size=${row.size})`);

  const out = {
    gen,
    gpu,
    gpuKey,
    ec2,
    size: row.size,
    unit: "instance",
    count: row.count,
    vramPerGpu: row.vramPerGpu,
    fp16NonTc: row.fp16NonTc ?? null,
    fp16Dense: row.fp16Dense ?? null,
    fp16Sparse: row.fp16Sparse ?? null,
    fp8Dense: row.fp8Dense ?? null,
    fp8Sparse: row.fp8Sparse ?? null,
    fp4Dense: row.fp4Dense ?? null,
    fp4Sparse: row.fp4Sparse ?? null,
    est: row.est === true,
    efa: row.efa,
    pcie: row.pcie,
    vcpu: row.vcpu,
    mem: row.mem,
    nvme: row.nvme,
    price: toNumber(row.price),
    priceGpu: toNumber(row.priceGpu),
    priceCb: toNumber(row.priceCb),
    tokyo: row.tokyo === true,
    // gpuNew は削除し、判定材料としての追加月に置き換える。
    // 追加月が分からない既存行は null (= NEW を出さない)。現状の表示と一致する。
    addedAt: row.gpuNew === true ? "2026-09" : null,
  };

  const unexpected = Object.keys(out).filter((k) => !FIELD_ORDER.includes(k));
  if (unexpected.length) throw new Error(`unexpected fields: ${unexpected}`);
  return out;
});

// 1 レコード 1 行で書き出す。差分が読める形にしておくと自動更新の PR レビューが楽になる。
const body = instances
  .map((row) => "    " + JSON.stringify(row))
  .join(",\n");

const json = `{
  "pricingAsOf": "2026-07",
  "pricingRegion": "us-east-1",
  "instances": [
${body}
  ]
}
`;

writeFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json", json);
console.log(`wrote ${instances.length} instances`);
```

- [ ] **Step 2: Run the conversion script**

```bash
node <scratchpad>/convert-gpu-data.mjs
```

Expected: `wrote 47 instances`. (47 = the current `GPU_DATA.length`; if the number differs, the array changed under you — stop and re-check.)

- [ ] **Step 3: Sanity-check the generated JSON**

```bash
node -e '
const d = JSON.parse(require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json","utf8"));
console.log("count", d.instances.length);
console.log("missing gen/gpu/gpuKey/ec2:", d.instances.filter(r=>!r.gen||!r.gpu||!r.gpuKey||!r.ec2).length);
console.log("string prices:", d.instances.filter(r=>[r.price,r.priceGpu,r.priceCb].some(v=>typeof v==="string")).length);
console.log("removed fields present:", d.instances.filter(r=>"genRows" in r||"gpuRows" in r||"ec2Rows" in r||"gpuNew" in r).length);
const b=d.instances.find(r=>r.size==="p6-b200.48xlarge");
console.log("p6-b200:", b.price, b.priceGpu, b.priceCb, b.gpuKey, b.unit);
const f=d.instances.find(r=>r.size==="g6f.large");
console.log("g6f.large:", f.count, f.price, f.priceGpu, f.priceCb, f.gpu, f.ec2);
'
```

Expected output:

```
count 47
missing gen/gpu/gpuKey/ec2: 0
string prices: 0
removed fields present: 0
p6-b200: 113.93 14.24 12.36 b200 instance
g6f.large: 1/8 0.2 1.6 null L4 G6f
```

`priceCb` was `"-"` in the old data and becomes `null`. If `p6-b200` shows anything other than `113.93 14.24 12.36`, the conversion dropped precision; fix it before continuing.

- [ ] **Step 4: Replace `src/scripts/gpu-data.js` with the thin layer**

Overwrite `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/gpu-data.js`. Keep the two link tables **byte-for-byte as they are today** — copy them from the current file, do not retype them — and replace the `GPU_DATA` literal with the import. The resulting file:

```js
// データの正は data/instances.json。このファイルは JSON を読むだけの薄い層にする。
// Vite は JSON import をバンドルにインライン化するので、単一 HTML 配布のままでよい。
import instancesFile from "../../data/instances.json";

export const EC2_LINKS = {
    // ... 現行ファイルの内容をそのまま残す（P6-B300 から P3dn まで 17 エントリ）
};

export const GPU_DATASHEET_LINKS = {
    // ... 現行ファイルの内容をそのまま残す（B300 から V100 まで 13 エントリ）
};

export const GPU_DATA = instancesFile.instances;

export const PRICING_META = {
  pricingAsOf: instancesFile.pricingAsOf,
  pricingRegion: instancesFile.pricingRegion,
};
```

Verify the link tables survived:

```bash
node -e '
const s=require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/gpu-data.js","utf8");
console.log("EC2 links:", (s.match(/https:\/\/aws\.amazon\.com/g)||[]).length);
console.log("datasheet links:", (s.match(/https:\/\/www\.nvidia\.com/g)||[]).length);
'
```

Expected: `EC2 links: 17` and `datasheet links: 13`.

- [ ] **Step 5: Rewire `src/scripts/table.js`**

Three edits.

(a) Extend the import block at the top of the file:

```js
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { formatPrice, parseCount, computeSpans, isNew } from "./format.js";
import { t } from "./i18n.js";
```

(b) Delete the local `parseFraction` definition and re-point the two call sites (`createVramContent`, `createPerfContent`) plus the bottom re-export at `parseCount`. The bottom line becomes:

```js
export { formatNumber };
```

and every `parseFraction(count)` call becomes `parseCount(count)`. `formatNumber` stays where it is.

(c) In `renderTable`, compute the spans once and drive the three merged cells and the price cells from them. Replace the body of `renderTable` with:

```js
export function renderTable() {
  const tbody = document.getElementById("gpu-table-body");
  const fragment = document.createDocumentFragment();
  const spans = computeSpans(GPU_DATA);
  const now = new Date();

  GPU_DATA.forEach((row, i) => {
    const span = spans[i];
    const tr = document.createElement("tr");
    tr.className = `row-${row.gen}`;

    if (span.gen > 0) {
      tr.appendChild(createCell("td", GEN_LABELS[row.gen], "arch", { rowspan: span.gen }));
    }

    if (span.gpu > 0) {
      const gpuCell = createCell("td", null, "gpu", { rowspan: span.gpu });
      const datasheetUrl = GPU_DATASHEET_LINKS[row.gpu];
      if (datasheetUrl) {
        const link = document.createElement("a");
        link.href = datasheetUrl;
        link.target = "_blank";
        link.className = "gpu-link";
        link.title = `${row.gpu} Datasheet`;
        link.textContent = row.gpu;
        gpuCell.appendChild(link);
      } else {
        gpuCell.appendChild(document.createTextNode(row.gpu));
      }
      if (isNew(row.addedAt, now)) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "NEW";
        gpuCell.appendChild(badge);
      }
      tr.appendChild(gpuCell);
    }

    if (span.ec2 > 0) {
      const ec2Cell = createCell("td", null, null, { rowspan: span.ec2 });
      const link = document.createElement("a");
      link.href = EC2_LINKS[row.ec2] || "#";
      link.target = "_blank";
      link.className = "ec2-link";
      link.title = `${row.ec2} インスタンス詳細`;
      link.textContent = row.ec2;
      ec2Cell.appendChild(link);
      tr.appendChild(ec2Cell);
    }

    tr.appendChild(createCell("td", row.size, "inst"));
    tr.appendChild(createCell("td", String(row.count)));

    const vramCell = document.createElement("td");
    vramCell.appendChild(createVramContent(row.vramPerGpu, row.count));
    tr.appendChild(vramCell);

    const estClass = row.est ? "est" : null;
    const perfFields = ["fp16NonTc", "fp16Dense", "fp16Sparse", "fp8Dense", "fp8Sparse", "fp4Dense", "fp4Sparse"];
    perfFields.forEach((field) => {
      const cell = document.createElement("td");
      if (estClass) cell.className = estClass;
      cell.appendChild(createPerfContent(row[field], row.count, row.est));
      tr.appendChild(cell);
    });

    tr.appendChild(createCell("td", row.efa, "efa"));
    tr.appendChild(createCell("td", row.pcie, "pcie"));
    tr.appendChild(createCell("td", String(row.vcpu)));
    tr.appendChild(createCell("td", row.mem));
    tr.appendChild(createCell("td", row.nvme));

    // price が null の行は On-Demand 提供なし = CB 専用
    const priceClass = row.price != null ? "price" : "cbo";
    tr.appendChild(createCell("td", row.price != null ? formatPrice(row.price) : t("table.cbOnly"), priceClass));
    tr.appendChild(createCell("td", formatPrice(row.priceGpu), priceClass));
    tr.appendChild(createCell("td", formatPrice(row.priceCb), "cb"));
    tr.appendChild(createCell("td", row.tokyo ? "◯" : "✕", row.tokyo ? "ok" : "no"));

    fragment.appendChild(tr);
  });

  tbody.replaceChildren(fragment);
}
```

Note: the stray `tr.appendChild(document.createTextNode(""))` from the old body is dropped — it appended an empty text node to every row and did nothing. `setupHover` is untouched; it reads `td[rowspan]` off the rendered DOM and keeps working.

- [ ] **Step 6: Rewire `src/scripts/calculator.js`**

Four edits.

(a) Replace `parsePrice` and `isCbOnly` so they take numbers, and tolerate the old strings so a stale caller cannot silently produce `NaN`:

```js
// price / priceGpu / priceCb は data/instances.json では数値または null。
// 旧データの文字列 ("$3.78" / "-" / "TBD") も受けて null か数値に正規化する。
export function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value === "" || value === "-" || value === "TBD") return null;
  const n = parseFloat(String(value).replace("$", ""));
  return Number.isFinite(n) ? n : null;
}

export function isCbOnly(row) {
  return row.price == null;
}
```

(b) Replace the local `parseFraction` with the shared helper. Add to the imports at the top:

```js
import { parseCount } from "./format.js";
```

delete the `parseFraction` function, and change the one call site in `updateResult` to:

```js
  const gpuCount = parseCount(row.count);
```

(c) `getUniqueInstances` — every record now carries `gpu`, so the fallback lookup goes away. Spec §10: drop a row only when both prices are `null`:

```js
function getUniqueInstances() {
  // 仕様 §10: On-Demand と CB の両方が無い行だけ選択肢から除く（CB 専用は残す）
  return GPU_DATA.filter((row) => row.price != null || row.priceCb != null).map((row) => ({
    size: row.size,
    label: `${row.size} (${row.gpu} x${row.count})`,
    price: row.price,
    priceGpu: row.priceGpu,
    priceCb: row.priceCb,
    count: row.count,
  }));
}
```

(d) The three `GPU_DATA.find((r) => r.size === ...)` lookups in `onInstanceChange`, the two reset-button handlers, and `updateResult` stay as they are — the selector only ever holds sizes that survived the filter, so they still resolve. In `updateResult`, guard each side: when `row.price == null` write `"—"` into every On-Demand result cell (hourly, daily, monthly, yearly, and the local-currency twins) instead of calling `calculateMonthlyCost` etc.; do the same for the CB cells when `row.priceCb == null`. Read the current `updateResult` to find the exact element ids; do not add new DOM.

- [ ] **Step 7: Update `tests/gpu-data.test.js`**

Replace the two obsolete suites — `price fields are valid format` (asserts the `"$1.23"` string shape) and `genRows sum matches total rows per generation` (asserts a field that no longer exists) — with the Spec §9 assertions. Keep every other suite as-is. The new/changed blocks:

```js
import { describe, it, expect } from "vitest";
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS, PRICING_META } from "../src/scripts/gpu-data.js";
```

```js
  it("every record carries gen / gpu / gpuKey / ec2", () => {
    GPU_DATA.forEach((row, i) => {
      expect(row.gen, `row ${i} (${row.size}): gen`).toBeTruthy();
      expect(row.gpu, `row ${i} (${row.size}): gpu`).toBeTruthy();
      expect(row.gpuKey, `row ${i} (${row.size}): gpuKey`).toBeTruthy();
      expect(row.ec2, `row ${i} (${row.size}): ec2`).toBeTruthy();
    });
  });

  it("gpuKey is lowercase alphanumeric with hyphens", () => {
    GPU_DATA.forEach((row, i) => {
      expect(row.gpuKey, `row ${i} (${row.size}): gpuKey="${row.gpuKey}"`).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it("unit is instance or ultraserver", () => {
    GPU_DATA.forEach((row, i) => {
      expect(["instance", "ultraserver"], `row ${i} (${row.size})`).toContain(row.unit);
    });
  });

  it("prices are numeric or null", () => {
    GPU_DATA.forEach((row, i) => {
      ["price", "priceGpu", "priceCb"].forEach((field) => {
        const value = row[field];
        expect(
          value === null || (typeof value === "number" && Number.isFinite(value) && value > 0),
          `row ${i} (${row.size}): ${field}=${JSON.stringify(value)} must be a positive number or null`,
        ).toBe(true);
      });
    });
  });

  it("dropped fields are gone", () => {
    GPU_DATA.forEach((row, i) => {
      ["genRows", "gpuRows", "ec2Rows", "gpuNew"].forEach((field) => {
        expect(field in row, `row ${i} (${row.size}): ${field} must be removed`).toBe(false);
      });
    });
  });

  it("addedAt is a YYYY-MM string or null", () => {
    GPU_DATA.forEach((row, i) => {
      const value = row.addedAt;
      expect(
        value === null || /^\d{4}-\d{2}$/.test(value),
        `row ${i} (${row.size}): addedAt=${JSON.stringify(value)}`,
      ).toBe(true);
    });
  });

  it("sizes are unique", () => {
    const sizes = GPU_DATA.map((r) => r.size);
    expect(new Set(sizes).size, `duplicate size in instances.json`).toBe(sizes.length);
  });
});

describe("PRICING_META", () => {
  it("carries a YYYY-MM pricingAsOf and a region code", () => {
    expect(PRICING_META.pricingAsOf).toMatch(/^\d{4}-\d{2}$/);
    expect(PRICING_META.pricingRegion).toMatch(/^[a-z]{2}-[a-z]+-\d$/);
  });
```

The existing `all ec2 types in GPU_DATA have a corresponding link` and `all gpu types ... datasheet link` suites already use `.filter((r) => r.ec2)` / `.filter((r) => r.gpu)`; those filters are now no-ops but harmless — leave them, or drop the `.filter(...)` call. Either is fine.

- [ ] **Step 8: Update `tests/calculator.test.js`**

Replace the `parsePrice` and `isCbOnly` suites:

```js
describe("parsePrice", () => {
  it("passes numbers through", () => {
    expect(parsePrice(3.78)).toBe(3.78);
    expect(parsePrice(30.27)).toBe(30.27);
    expect(parsePrice(0.8)).toBe(0.8);
  });

  it("returns null for null and undefined", () => {
    expect(parsePrice(null)).toBeNull();
    expect(parsePrice(undefined)).toBeNull();
  });

  it("still normalises the legacy string forms", () => {
    expect(parsePrice("$3.78")).toBe(3.78);
    expect(parsePrice("")).toBeNull();
    expect(parsePrice("-")).toBeNull();
    expect(parsePrice("TBD")).toBeNull();
  });
});
```

```js
describe("isCbOnly", () => {
  it("returns true when price is null", () => {
    expect(isCbOnly({ price: null })).toBe(true);
  });

  it("returns false when a numeric price exists", () => {
    expect(isCbOnly({ price: 3.78 })).toBe(false);
    expect(isCbOnly({ price: 0.2 })).toBe(false);
  });
});
```

The `calculateMonthlyCost` / `calculateYearlyCost` / `calculateDaysCost` / `convertToJpy` suites need no change — they already take numbers.

- [ ] **Step 9: Update `tests/table.test.js`**

`parseFraction` no longer exists on `table.js`. Change the import and the suite name:

```js
import { formatNumber } from "../src/scripts/table.js";
```

and delete the `describe("parseFraction", ...)` block — its cases now live in `tests/format.test.js` as `parseCount`. Keep the `formatNumber` suite verbatim. If PR 1's table render DOM test is in this file, leave it in place; it renders through `renderTable()` and must still pass.

- [ ] **Step 10: Run the full suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, every file. If `gpu-data.test.js` fails on `prices are numeric or null`, the conversion script left a string somewhere — fix the script and regenerate rather than editing the JSON by hand.

- [ ] **Step 11: Verify the build still inlines everything**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
node -e '
const s=require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html","utf8");
console.log("files in dist:", require("fs").readdirSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist"));
console.log("external script/link refs:", (s.match(/<(script[^>]*\bsrc=|link[^>]*\brel="stylesheet")/g)||[]).length);
console.log("p6-b200 price present:", s.includes("113.93"));
'
```

Expected: `files in dist: [ 'index.html' ]`, `external script/link refs: 0`, `p6-b200 price present: true`. That is the proof that the JSON import was inlined by `vite-plugin-singlefile` and no fetch was introduced.

- [ ] **Step 12: Verify the dev server can read `data/` (it sits outside `root: "src"`)**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run dev -- --port 5199 &
sleep 4
curl -s http://localhost:5199/scripts/gpu-data.js | head -5
kill %1
```

Expected: the transformed module source, not a `403 Restricted` body. Vite's `server.fs.allow` defaults to the git workspace root, which contains `data/`, so this should pass with no config change. If it 403s, add `server: { fs: { allow: [".."] } }` to `vite.config.js` and re-run.

- [ ] **Step 13: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add data/instances.json src/scripts/gpu-data.js src/scripts/table.js src/scripts/calculator.js tests/gpu-data.test.js tests/calculator.test.js tests/table.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: インスタンスデータを data/instances.json に移し価格を数値化

GPU_DATA を JSON に移し、gpu-data.js は JSON を読むだけの薄い層にした。
rowspan 用の genRows/gpuRows/ec2Rows と gpuNew は削除し、結合は描画時に
computeSpans で計算する。価格は "$113.93" のような文字列をやめて数値か null
にし、表示は formatPrice で整形する。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 3: On-Demand pricing script (`scripts/update-od-pricing.mjs`)

Spec §8 asks for the On-Demand refresh to be kept as a reusable script. All the logic that can be wrong goes into pure functions with tests; the CLI is a wrapper thin enough to eyeball.

**Files:**
- Create: `scripts/lib/instances-file.mjs`
- Create: `scripts/lib/od-pricing.mjs`
- Create: `scripts/update-od-pricing.mjs`
- Test: `tests/update-od-pricing.test.js`

**Interfaces:**
- Consumes: `parseCount` from `src/scripts/format.js` (Task 1); `data/instances.json` (Task 2).
- Produces:
  - `scripts/lib/instances-file.mjs`: `INSTANCES_PATH: URL`, `readInstances(): {pricingAsOf, pricingRegion, instances}`, `writeInstances(file): void`, `roundUsd(value: number): number`.
  - `scripts/lib/od-pricing.mjs`: `scanPriceList(lines: Iterable<string>, wantedSizes: Set<string>): Map<string, number>`, `applyOdPricing(instances: object[], usEast1Prices: Map<string, number>, tokyoSizes: Set<string>): {instances: object[], changes: string[]}`.

**Why the Price List is read line by line, not with `JSON.parse`.** Measured on 2026-09-07, `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json` returns `Content-Length: 481907939` — 482 MB. V8's maximum string length on 64-bit is 536,870,888 characters, so materialising the body as one string (which both `res.text()` and `JSON.parse` require) is within a few percent of a hard engine limit that AWS's file will cross on its own schedule, and would need roughly 2 GB of heap (`node --max-old-space-size=4096 scripts/update-od-pricing.mjs`) even while it fits. The file is pretty-printed with a stable two-space indent (verified against both the head and the tail of the live file), so a line-oriented scan keyed on indentation is exact, uses flat memory, and needs no heap flag. Keep `JSON.parse` for the test fixtures only.

The relevant shape, with the indentation the scanner keys on:

```
  "products" : {
    "QUMEF4UK3NPT4MN3" : {          <- 4 spaces: product SKU
      "attributes" : {
        "instanceType" : "p5.48xlarge",   <- 8 spaces: attributes
        "operatingSystem" : "Linux",
        ...
      }
    },                              <- 4 spaces: product ends
  },
  "terms" : {
    "OnDemand" : {                  <- 4 spaces: term kind
      "QUMEF4UK3NPT4MN3" : {        <- 6 spaces: SKU
        "QUMEF4UK3NPT4MN3.JRTCKXETXF" : {
          "priceDimensions" : {
            "QUMEF4UK3NPT4MN3.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",                 <- 14 spaces
              "pricePerUnit" : {
                "USD" : "55.0440000000"       <- 16 spaces
              },
```

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/update-od-pricing.test.js`:

```js
import { describe, it, expect } from "vitest";
import { scanPriceList, applyOdPricing } from "../scripts/lib/od-pricing.mjs";
import { roundUsd } from "../scripts/lib/instances-file.mjs";

// AWS Price List の region index.json を切り詰めた固定入力。
// インデント幅が意味を持つのでそのまま維持すること。
const FIXTURE = `{
  "formatVersion" : "v1.0",
  "offerCode" : "AmazonEC2",
  "products" : {
    "AAAAAAAAAAAAAAAA" : {
      "sku" : "AAAAAAAAAAAAAAAA",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "BBBBBBBBBBBBBBBB" : {
      "sku" : "BBBBBBBBBBBBBBBB",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Windows",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "CCCCCCCCCCCCCCCC" : {
      "sku" : "CCCCCCCCCCCCCCCC",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Dedicated",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "DDDDDDDDDDDDDDDD" : {
      "sku" : "DDDDDDDDDDDDDDDD",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "UnusedCapacityReservation",
        "licenseModel" : "No License required"
      }
    },
    "EEEEEEEEEEEEEEEE" : {
      "sku" : "EEEEEEEEEEEEEEEE",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6f.large",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    },
    "FFFFFFFFFFFFFFFF" : {
      "sku" : "FFFFFFFFFFFFFFFF",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "m5.large",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared",
        "preInstalledSw" : "NA",
        "capacitystatus" : "Used",
        "licenseModel" : "No License required"
      }
    }
  },
  "terms" : {
    "OnDemand" : {
      "AAAAAAAAAAAAAAAA" : {
        "AAAAAAAAAAAAAAAA.JRTCKXETXF" : {
          "offerTermCode" : "JRTCKXETXF",
          "priceDimensions" : {
            "AAAAAAAAAAAAAAAA.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "55.0440000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "BBBBBBBBBBBBBBBB" : {
        "BBBBBBBBBBBBBBBB.JRTCKXETXF" : {
          "priceDimensions" : {
            "BBBBBBBBBBBBBBBB.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "99.9900000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "EEEEEEEEEEEEEEEE" : {
        "EEEEEEEEEEEEEEEE.JRTCKXETXF" : {
          "priceDimensions" : {
            "EEEEEEEEEEEEEEEE.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "0.2010000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      },
      "FFFFFFFFFFFFFFFF" : {
        "FFFFFFFFFFFFFFFF.JRTCKXETXF" : {
          "priceDimensions" : {
            "FFFFFFFFFFFFFFFF.JRTCKXETXF.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "0.0960000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      }
    },
    "Reserved" : {
      "AAAAAAAAAAAAAAAA" : {
        "AAAAAAAAAAAAAAAA.4NA7Y494T4" : {
          "priceDimensions" : {
            "AAAAAAAAAAAAAAAA.4NA7Y494T4.6YS6EN2CT7" : {
              "unit" : "Hrs",
              "pricePerUnit" : {
                "USD" : "11.1100000000"
              },
              "appliesTo" : [ ]
            }
          },
          "termAttributes" : { }
        }
      }
    }
  },
  "attributesList" : { }
}
`;

const LINES = FIXTURE.split("\n");

describe("scanPriceList", () => {
  it("returns the Linux / Shared / Used / NA On-Demand hourly price", () => {
    const prices = scanPriceList(LINES, new Set(["p5.48xlarge", "g6f.large"]));
    expect(prices.get("p5.48xlarge")).toBeCloseTo(55.044);
    expect(prices.get("g6f.large")).toBeCloseTo(0.201);
  });

  it("ignores instance types that were not asked for", () => {
    const prices = scanPriceList(LINES, new Set(["p5.48xlarge"]));
    expect(prices.has("m5.large")).toBe(false);
  });

  it("ignores Windows, Dedicated and UnusedCapacityReservation products", () => {
    const prices = scanPriceList(LINES, new Set(["p5.48xlarge"]));
    // Windows の 99.99、Dedicated / UnusedCapacityReservation の SKU が
    // 選ばれていないことを、価格が Linux/Shared/Used の値であることで確かめる
    expect(prices.get("p5.48xlarge")).toBeCloseTo(55.044);
    expect(prices.size).toBe(1);
  });

  it("ignores Reserved terms", () => {
    const prices = scanPriceList(LINES, new Set(["p5.48xlarge"]));
    expect(prices.get("p5.48xlarge")).not.toBeCloseTo(11.11);
  });

  it("returns an empty map when nothing matches", () => {
    expect(scanPriceList(LINES, new Set(["p9.99xlarge"])).size).toBe(0);
  });
});

describe("applyOdPricing", () => {
  const base = [
    { size: "p5.48xlarge", unit: "instance", count: 8, price: 55.04, priceGpu: 6.88, priceCb: 4.72, tokyo: false },
    { size: "g6f.large", unit: "instance", count: "1/8", price: 0.2, priceGpu: 1.6, priceCb: null, tokyo: true },
    { size: "p5e.48xlarge", unit: "instance", count: 8, price: null, priceGpu: null, priceCb: 5.97, tokyo: true },
    { size: "u-p6e-gb200x72", unit: "ultraserver", count: 72, price: null, priceGpu: null, priceCb: 9.0, tokyo: true },
  ];

  it("writes price and recomputes priceGpu as price / count", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    const { instances } = applyOdPricing(base, prices, new Set(["p5.48xlarge"]));
    expect(instances[0].price).toBe(60);
    expect(instances[0].priceGpu).toBe(7.5);
  });

  it("handles a fractional GPU count", () => {
    const prices = new Map([["g6f.large", 0.24]]);
    const { instances } = applyOdPricing(base, prices, new Set());
    expect(instances[1].price).toBe(0.24);
    expect(instances[1].priceGpu).toBe(1.92);
  });

  it("rounds to two decimals", () => {
    const prices = new Map([["p5.48xlarge", 55.0440000001]]);
    const { instances } = applyOdPricing(base, prices, new Set());
    expect(instances[0].price).toBe(55.04);
    expect(instances[0].priceGpu).toBe(6.88);
  });

  it("sets tokyo from the ap-northeast-1 size set", () => {
    const { instances } = applyOdPricing(base, new Map(), new Set(["g6f.large"]));
    expect(instances[0].tokyo).toBe(false);
    expect(instances[1].tokyo).toBe(true);
    expect(instances[2].tokyo).toBe(false);
  });

  it("leaves UltraServer rows alone (they are not in the Price List)", () => {
    const { instances } = applyOdPricing(base, new Map(), new Set());
    expect(instances[3].tokyo).toBe(true);
    expect(instances[3].price).toBeNull();
  });

  it("leaves price and priceGpu untouched when the size has no On-Demand price", () => {
    const { instances } = applyOdPricing(base, new Map(), new Set());
    expect(instances[2].price).toBeNull();
    expect(instances[2].priceGpu).toBeNull();
    expect(instances[2].priceCb).toBe(5.97);
  });

  it("does not mutate the input array", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    applyOdPricing(base, prices, new Set());
    expect(base[0].price).toBe(55.04);
  });

  it("reports a change line per changed field", () => {
    const prices = new Map([["p5.48xlarge", 60.0]]);
    const { changes } = applyOdPricing(base, prices, new Set(["g6f.large"]));
    expect(changes).toContain("p5.48xlarge price: 55.04 -> 60");
    expect(changes.some((c) => c.startsWith("p5.48xlarge priceGpu"))).toBe(true);
    expect(changes).not.toContain("g6f.large tokyo: true -> true");
  });

  it("reports no changes when nothing moved", () => {
    const { changes } = applyOdPricing(base, new Map(), new Set(["g6f.large"]));
    expect(changes).toEqual([]);
  });
});

describe("roundUsd", () => {
  it("rounds three-decimal values half-up without float drift", () => {
    expect(roundUsd(12.355)).toBe(12.36);
    expect(roundUsd(4.725)).toBe(4.73);
    expect(roundUsd(0.2)).toBe(0.2);
    expect(roundUsd(55.044)).toBe(55.04);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/update-od-pricing.test.js
```

Expected: FAIL — `Failed to resolve import "../scripts/lib/od-pricing.mjs"`.

- [ ] **Step 3: Write `scripts/lib/instances-file.mjs`**

```js
// data/instances.json の読み書きと金額の丸めをまとめる。
// update-od-pricing.mjs と update-cb-pricing.mjs の両方から使う。
import { readFileSync, writeFileSync } from "node:fs";

export const INSTANCES_PATH = new URL("../../data/instances.json", import.meta.url);

export function readInstances() {
  return JSON.parse(readFileSync(INSTANCES_PATH, "utf8"));
}

// 1 レコード 1 行で書き出す。自動更新 PR の差分を読める形に保つため。
export function writeInstances(file) {
  const body = file.instances.map((row) => "    " + JSON.stringify(row)).join(",\n");
  const json = `{
  "pricingAsOf": ${JSON.stringify(file.pricingAsOf)},
  "pricingRegion": ${JSON.stringify(file.pricingRegion)},
  "instances": [
${body}
  ]
}
`;
  writeFileSync(INSTANCES_PATH, json);
}

// 12.355 のような3桁小数を十進で正しく四捨五入する（浮動小数点誤差対策）。
// 既存の update-cb-pricing.mjs の formatUsd と同じ計算で、返り値だけ数値にした。
export function roundUsd(value) {
  return Math.round(Math.round(value * 100000) / 1000) / 100;
}
```

- [ ] **Step 4: Write `scripts/lib/od-pricing.mjs`**

```js
// AWS Price List (region 別 index.json) から On-Demand 価格を取り出し、
// instances 配列に反映する純関数。ネットワークには触らない。
import { parseCount } from "../../src/scripts/format.js";
import { roundUsd } from "./instances-file.mjs";

// index.json は 2 スペースインデントで整形されている。
// 482MB あり JSON.parse だと V8 の文字列長上限に近づくため、行単位で走査する。
const SECTION = /^ {2}"(products|terms)" : \{$/;
const PRODUCT_START = /^ {4}"([A-Z0-9]+)" : \{$/;
const PRODUCT_END = /^ {4}\},?$/;
const ATTRIBUTE = /^ {8}"([A-Za-z]+)" : "(.*?)",?$/;
const TERM_KIND = /^ {4}"([A-Za-z]+)" : \{$/;
const TERM_SKU = /^ {6}"([A-Z0-9]+)" : \{$/;
const TERM_UNIT = /^ {14}"unit" : "(.*?)",$/;
const TERM_USD = /^ {16}"USD" : "([0-9.]+)"$/;

function isWantedProduct(attributes, wantedSizes) {
  return (
    attributes != null &&
    wantedSizes.has(attributes.instanceType) &&
    attributes.operatingSystem === "Linux" &&
    attributes.tenancy === "Shared" &&
    attributes.preInstalledSw === "NA" &&
    attributes.capacitystatus === "Used" &&
    attributes.licenseModel !== "Bring your own license"
  );
}

// lines: 行の同期イテラブル。返り値は size -> 時間単価 (USD, 生の数値)。
// 同じ instanceType に複数 SKU が該当したときは安い方を採る。
export function scanPriceList(lines, wantedSizes) {
  const skuToSize = new Map();
  const skuToPrice = new Map();

  let section = null;
  let termKind = null;
  let sku = null;
  let attributes = null;
  let termSku = null;
  let unit = null;

  for (const line of lines) {
    const sectionMatch = SECTION.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      sku = null;
      attributes = null;
      continue;
    }

    if (section === "products") {
      const start = PRODUCT_START.exec(line);
      if (start) {
        sku = start[1];
        attributes = {};
        continue;
      }
      if (sku == null) continue;
      const attribute = ATTRIBUTE.exec(line);
      if (attribute) {
        attributes[attribute[1]] = attribute[2];
        continue;
      }
      if (PRODUCT_END.test(line)) {
        if (isWantedProduct(attributes, wantedSizes)) {
          skuToSize.set(sku, attributes.instanceType);
        }
        sku = null;
        attributes = null;
      }
      continue;
    }

    if (section === "terms") {
      const kind = TERM_KIND.exec(line);
      if (kind) {
        termKind = kind[1];
        termSku = null;
        unit = null;
        continue;
      }
      if (termKind !== "OnDemand") continue;

      const skuLine = TERM_SKU.exec(line);
      if (skuLine) {
        termSku = skuLine[1];
        unit = null;
        continue;
      }
      const unitLine = TERM_UNIT.exec(line);
      if (unitLine) {
        unit = unitLine[1];
        continue;
      }
      const usd = TERM_USD.exec(line);
      if (usd && termSku != null && unit === "Hrs") {
        const value = Number(usd[1]);
        if (value > 0) {
          const previous = skuToPrice.get(termSku);
          if (previous == null || value < previous) skuToPrice.set(termSku, value);
        }
      }
    }
  }

  const prices = new Map();
  for (const [productSku, size] of skuToSize) {
    const price = skuToPrice.get(productSku);
    if (price == null) continue;
    const previous = prices.get(size);
    if (previous == null || price < previous) prices.set(size, price);
  }
  return prices;
}

// instances に On-Demand 価格と東京リージョンの有無を反映した新しい配列を返す。
// 入力は変更しない。UltraServer は Price List に載らないため素通しする。
export function applyOdPricing(instances, usEast1Prices, tokyoSizes) {
  const changes = [];

  const updated = instances.map((row) => {
    const next = { ...row };

    const rawPrice = usEast1Prices.get(row.size);
    if (rawPrice != null) {
      const price = roundUsd(rawPrice);
      const gpuCount = parseCount(row.count);
      const priceGpu = gpuCount > 0 ? roundUsd(rawPrice / gpuCount) : null;
      if (next.price !== price) changes.push(`${row.size} price: ${next.price} -> ${price}`);
      if (next.priceGpu !== priceGpu) changes.push(`${row.size} priceGpu: ${next.priceGpu} -> ${priceGpu}`);
      next.price = price;
      next.priceGpu = priceGpu;
    }

    if (row.unit !== "ultraserver") {
      const tokyo = tokyoSizes.has(row.size);
      if (next.tokyo !== tokyo) changes.push(`${row.size} tokyo: ${next.tokyo} -> ${tokyo}`);
      next.tokyo = tokyo;
    }

    return next;
  });

  return { instances: updated, changes };
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/update-od-pricing.test.js
```

Expected: PASS, all cases.

- [ ] **Step 6: Write the CLI wrapper `scripts/update-od-pricing.mjs`**

```js
// AWS Price List から On-Demand 価格を取得し、data/instances.json を更新する。
// 自動化はしない（仕様 §8）。手動実行のみ:
//   node scripts/update-od-pricing.mjs
//   node scripts/update-od-pricing.mjs --dry-run
//
// index.json は 1 リージョンあたり 480MB 程度ある。JSON.parse を避けて
// 行単位で読むため、追加のヒープ指定 (--max-old-space-size) は不要。
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { readInstances, writeInstances } from "./lib/instances-file.mjs";
import { scanPriceList, applyOdPricing } from "./lib/od-pricing.mjs";

const BASE = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current";
const OD_REGION = "us-east-1";
const TOKYO_REGION = "ap-northeast-1";

async function* fetchLines(region) {
  const url = `${BASE}/${region}/index.json`;
  process.stderr.write(`fetching ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (++count % 2_000_000 === 0) process.stderr.write(`  ${count} lines\n`);
    yield line;
  }
  process.stderr.write(`  done (${count} lines)\n`);
}

async function collectLines(region, wantedSizes) {
  const buffered = [];
  for await (const line of fetchLines(region)) buffered.push(line);
  return scanPriceList(buffered, wantedSizes);
}

const dryRun = process.argv.includes("--dry-run");
const file = readInstances();
const wantedSizes = new Set(file.instances.map((row) => row.size));

const usEast1Prices = await collectLines(OD_REGION, wantedSizes);
const tokyoPrices = await collectLines(TOKYO_REGION, wantedSizes);
const tokyoSizes = new Set(tokyoPrices.keys());

const missing = file.instances
  .filter((row) => row.unit !== "ultraserver" && !usEast1Prices.has(row.size) && row.price != null)
  .map((row) => row.size);
if (missing.length) {
  process.stderr.write(`warning: no ${OD_REGION} On-Demand price found for: ${missing.join(", ")}\n`);
}

const { instances, changes } = applyOdPricing(file.instances, usEast1Prices, tokyoSizes);

if (changes.length === 0) {
  console.log("On-Demand pricing is up to date.");
} else if (dryRun) {
  console.log("Would update On-Demand pricing:");
  for (const change of changes) console.log(`  ${change}`);
} else {
  writeInstances({ ...file, instances });
  console.log("Updated On-Demand pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
```

Note on `collectLines`: it buffers the lines of one region file (~9 million short strings, roughly 1 GB of small strings — comfortably inside Node 22's default heap, unlike a single 482 MB string which sits at V8's string-length ceiling). If a future region file makes even that tight, change `scanPriceList` to accept an async iterable and `for await` over `fetchLines` directly; the parsing logic needs no other change.

- [ ] **Step 7: Verify the script runs end to end without writing**

```bash
node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-od-pricing.mjs --dry-run
```

Expected: two `fetching ...` lines on stderr, then either `On-Demand pricing is up to date.` or a `Would update On-Demand pricing:` block. This takes several minutes (about 1 GB of download). Then confirm the file is untouched:

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --porcelain data/instances.json
```

Expected: no output.

If the dry run reports `no us-east-1 On-Demand price found for:` a long list, the indentation assumptions are wrong — re-check the regexes against a fresh sample before continuing:

```bash
curl -s -r 0-3000 https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json
```

- [ ] **Step 8: Run the full suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, every file.

- [ ] **Step 9: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add scripts/lib/instances-file.mjs scripts/lib/od-pricing.mjs scripts/update-od-pricing.mjs tests/update-od-pricing.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: On-Demand価格の更新スクリプトを追加

AWS Price List の region 別 index.json から Linux/Shared/Used の時間単価を
読み、data/instances.json の price / priceGpu / tokyo を更新する。
index.json は 480MB あり JSON.parse が V8 の文字列長上限に近づくため、
行単位で走査する。判定ロジックは純関数に切り出してテストする。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 4: Refresh the On-Demand prices for real

Spec §8's first bullet: actually re-fetch the prices, and stamp `pricingAsOf` / `pricingRegion` to match what was fetched.

**Files:**
- Modify: `data/instances.json` (via the script from Task 3)

**Interfaces:**
- Consumes: `scripts/update-od-pricing.mjs` (Task 3).
- Produces: `data/instances.json` with current `price` / `priceGpu` / `tokyo`, `pricingAsOf` set to the fetch month.

- [ ] **Step 1: Run the update for real**

```bash
node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-od-pricing.mjs
```

Expected: `Updated On-Demand pricing:` followed by the change lines, or `On-Demand pricing is up to date.` if nothing moved.

- [ ] **Step 2: Set `pricingAsOf` and `pricingRegion`**

`pricingRegion` is already `"us-east-1"` and matches what the script fetched — leave it. Set `pricingAsOf` to the month the fetch happened:

```bash
node -e '
const fs = require("fs");
const p = "/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json";
const month = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(new Date());
const s = fs.readFileSync(p, "utf8").replace(/"pricingAsOf": "[^"]*"/, `"pricingAsOf": "${month}"`);
fs.writeFileSync(p, s);
console.log("pricingAsOf =", month);
'
```

Expected: `pricingAsOf = 2026-09`.

- [ ] **Step 3: Review the diff before trusting it**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference diff --stat data/instances.json
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference diff data/instances.json | head -60
```

Read the changed lines. Two things to check, because they are how this step goes silently wrong:
1. Every `priceGpu` still equals `price / count`. Verify mechanically in the next step.
2. No `tokyo` flipped from `true` to `false` across a whole family at once — that pattern means the `ap-northeast-1` fetch failed or returned a truncated body, not that AWS pulled the family.

- [ ] **Step 4: Verify `priceGpu` consistency mechanically**

```bash
node -e '
const { parseCount } = await import("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/format.js");
const d = JSON.parse(require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json","utf8"));
const bad = d.instances.filter((r) => {
  if (r.price == null || r.priceGpu == null) return r.price != null || r.priceGpu != null;
  return Math.abs(r.priceGpu - r.price / parseCount(r.count)) > 0.011;
});
console.log("inconsistent rows:", bad.map((r) => `${r.size} ${r.price}/${r.count} != ${r.priceGpu}`));
' --input-type=module
```

Expected: `inconsistent rows: []`.

- [ ] **Step 5: Run the full suite and the build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test && npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
```

Expected: tests PASS, build succeeds.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add data/instances.json
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
chore: On-Demand価格をPrice Listから再取得して更新

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 5: Point the CB pricing automation at `data/instances.json`

`scripts/update-cb-pricing.mjs` currently rewrites `src/scripts/gpu-data.js` with a line regex that requires `priceCb: "$x.xx"` to already be present on the same line as `size:`. After Task 2 that file has no prices in it at all, so the script silently updates nothing — the daily workflow would keep committing nothing and no one would notice. Fix it in the same PR.

**Files:**
- Modify: `scripts/update-cb-pricing.mjs` (rewritten)
- Modify: `.github/workflows/update-cb-pricing.yml`
- Modify: `CLAUDE.md`
- Test: `tests/update-cb-pricing.test.js`

**Interfaces:**
- Consumes: `readInstances`, `writeInstances`, `roundUsd` from `scripts/lib/instances-file.mjs` (Task 3).
- Produces: `scripts/lib/cb-pricing.mjs` exporting `pickRate(pricing: object[]): number|null` and `applyCbPricing(instances: object[], instanceTypes: object): {instances: object[], changes: string[]}`.

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/update-cb-pricing.test.js`:

```js
import { describe, it, expect } from "vitest";
import { pickRate, applyCbPricing } from "../scripts/lib/cb-pricing.mjs";

describe("pickRate", () => {
  it("prefers Tokyo", () => {
    expect(pickRate([
      { region: "US East (N. Virginia)", accelerator_hourly_rate_usd: 4.72 },
      { region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 6.24 },
    ])).toBe(6.24);
  });

  it("falls back to the first priority region present", () => {
    expect(pickRate([
      { region: "US West (Oregon)", accelerator_hourly_rate_usd: 3.5 },
      { region: "US East (Ohio)", accelerator_hourly_rate_usd: 3.1 },
    ])).toBe(3.1);
  });

  it("falls back to the first entry when no priority region matches", () => {
    expect(pickRate([{ region: "Europe (Stockholm)", accelerator_hourly_rate_usd: 2.2 }])).toBe(2.2);
  });

  it("returns null for an empty list", () => {
    expect(pickRate([])).toBeNull();
  });
});

describe("applyCbPricing", () => {
  const base = [
    { size: "p5.48xlarge", priceCb: 4.72 },
    { size: "p5e.48xlarge", priceCb: 5.97 },
    { size: "g6.xlarge", priceCb: null },
  ];

  it("writes a rounded numeric priceCb", () => {
    const { instances } = applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 12.355 }] },
    });
    expect(instances[0].priceCb).toBe(12.36);
  });

  it("leaves sizes that are absent from the CB feed untouched", () => {
    const { instances } = applyCbPricing(base, {});
    expect(instances[1].priceCb).toBe(5.97);
    expect(instances[2].priceCb).toBeNull();
  });

  it("does not mutate the input", () => {
    applyCbPricing(base, {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 9.99 }] },
    });
    expect(base[0].priceCb).toBe(4.72);
  });

  it("reports changes and stays quiet when nothing moved", () => {
    const feed = {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 4.72 }] },
    };
    expect(applyCbPricing(base, feed).changes).toEqual([]);

    const moved = {
      "p5.48xlarge": { pricing: [{ region: "Asia Pacific (Tokyo)", accelerator_hourly_rate_usd: 5.0 }] },
    };
    expect(applyCbPricing(base, moved).changes).toEqual(["p5.48xlarge: 4.72 -> 5"]);
  });

  it("fills in a previously null priceCb", () => {
    const { instances } = applyCbPricing(base, {
      "g6.xlarge": { pricing: [{ region: "US East (N. Virginia)", accelerator_hourly_rate_usd: 0.55 }] },
    });
    expect(instances[2].priceCb).toBe(0.55);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/update-cb-pricing.test.js
```

Expected: FAIL — `Failed to resolve import "../scripts/lib/cb-pricing.mjs"`.

- [ ] **Step 3: Write `scripts/lib/cb-pricing.mjs`**

```js
// CB (Capacity Blocks) 価格を instances 配列に反映する純関数。
//
// ルール (CLAUDE.md):
// - 東京リージョン (Asia Pacific (Tokyo)) があればその値を使用
// - ない場合は最も一般的なリージョン (us-east-1 等) を使用
// - 価格は小数点第2位に四捨五入
import { roundUsd } from "./instances-file.mjs";

const REGION_PRIORITY = [
  "Asia Pacific (Tokyo)",
  "US East (N. Virginia)",
  "US East (Ohio)",
  "US West (Oregon)",
];

export function pickRate(pricing) {
  for (const region of REGION_PRIORITY) {
    const entry = pricing.find((p) => p.region === region);
    if (entry?.accelerator_hourly_rate_usd != null) {
      return entry.accelerator_hourly_rate_usd;
    }
  }
  return pricing[0]?.accelerator_hourly_rate_usd ?? null;
}

// instanceTypes は pricing.json の instance_types そのまま。
// CB フィードに無い size は触らない（消えた＝提供終了とは限らないため）。
export function applyCbPricing(instances, instanceTypes) {
  const changes = [];
  const updated = instances.map((row) => {
    const info = instanceTypes[row.size];
    if (!info) return { ...row };
    const rate = pickRate(info.pricing ?? []);
    if (rate == null) return { ...row };
    const priceCb = roundUsd(rate);
    if (row.priceCb !== priceCb) changes.push(`${row.size}: ${row.priceCb} -> ${priceCb}`);
    return { ...row, priceCb };
  });
  return { instances: updated, changes };
}
```

- [ ] **Step 4: Rewrite `scripts/update-cb-pricing.mjs`**

Replace the whole file:

```js
// CB (Capacity Blocks) 価格を pricing.json から取得し、
// data/instances.json の priceCb を更新する。
import { readInstances, writeInstances } from "./lib/instances-file.mjs";
import { applyCbPricing } from "./lib/cb-pricing.mjs";

const PRICING_URL =
  "https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json";

const res = await fetch(PRICING_URL);
if (!res.ok) {
  console.error(`Failed to fetch pricing.json: ${res.status}`);
  process.exit(1);
}
const { instance_types: instanceTypes } = await res.json();

const file = readInstances();
const { instances, changes } = applyCbPricing(file.instances, instanceTypes);

if (changes.length === 0) {
  console.log("CB pricing is up to date.");
} else {
  writeInstances({ ...file, instances });
  console.log("Updated CB pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/update-cb-pricing.test.js
```

Expected: PASS.

- [ ] **Step 6: Run the real CB script and confirm it touches the JSON, not the JS**

```bash
node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-cb-pricing.mjs
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --porcelain
```

Expected: either `CB pricing is up to date.` with no modified files, or `Updated CB pricing:` with `M data/instances.json` and **no** `M src/scripts/gpu-data.js`. Seeing `gpu-data.js` modified means the old script is still in place.

- [ ] **Step 7: Update the workflow's commit path**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/.github/workflows/update-cb-pricing.yml`, change the one line:

```yaml
          git add src/scripts/gpu-data.js
```

to:

```yaml
          git add data/instances.json
```

Leave the rest of the file (schedule, `repository_dispatch`, `npm ci && npm test`, `gh workflow run deploy.yml`) alone.

- [ ] **Step 8: Update `CLAUDE.md`**

Two edits in `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/CLAUDE.md`, in the データ更新 section:

Replace the `GPU_DATA配列` subsection body so it points at the JSON:

```markdown
### instances.json

データの正は `data/instances.json`。`src/scripts/gpu-data.js` は JSON を読むだけの薄い層で、
`GPU_DATA` / `EC2_LINKS` / `GPU_DATASHEET_LINKS` / `PRICING_META` を export する。
1 レコード 1 インスタンスサイズで、各レコードは次のフィールドを持つ:

```javascript
{ gen, gpu, gpuKey, ec2, size, unit, count, vramPerGpu,
  fp16NonTc, fp16Dense, fp16Sparse, fp8Dense, fp8Sparse, fp4Dense, fp4Sparse,
  est, efa, pcie, vcpu, mem, nvme, price, priceGpu, priceCb, tokyo, addedAt }
```

`price` / `priceGpu` / `priceCb` は数値または `null`（= 提供なし）。表示時に `formatPrice` で整形する。
```

And in the CB 価格更新 subsection, change `src/scripts/gpu-data.js の priceCb` to `data/instances.json の priceCb`, and add a line for the new script:

```markdown
On-Demand 価格の更新は `node scripts/update-od-pricing.mjs`（手動実行のみ、自動化なし）。
```

- [ ] **Step 9: Run the full suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, every file.

- [ ] **Step 10: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add scripts/lib/cb-pricing.mjs scripts/update-cb-pricing.mjs tests/update-cb-pricing.test.js .github/workflows/update-cb-pricing.yml CLAUDE.md data/instances.json
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
fix: CB価格の自動更新を data/instances.json 向けに書き直し

gpu-data.js を正規表現で書き換える方式をやめ、instances.json の priceCb を
数値で更新する。判定部分を純関数に切り出してテストを追加し、ワークフローの
git add 対象も差し替えた。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 6: Reconcile against the current AWS lineup

Spec §8's second bullet. The executor cannot recall the 2026-09 AWS GPU lineup reliably, so this task is a research task with named sources and a named checklist — do not fill it from memory.

**Files:**
- Modify: `data/instances.json`
- Modify: `data/aws-ec2-nvidia-gpu-specs.json`
- Modify: `src/scripts/gpu-data.js` (`EC2_LINKS`, `GPU_DATASHEET_LINKS` for anything new)
- Modify: `docs/superpowers/specs/2026-09-07-site-renewal-design.md` (§11, per the spec's own instruction)
- Test: `tests/gpu-data.test.js`

**Interfaces:**
- Consumes: `data/instances.json` (Task 2/4), `scripts/update-od-pricing.mjs` (Task 3).
- Produces: `data/instances.json` covering the full NVIDIA-GPU EC2 lineup; `data/aws-ec2-nvidia-gpu-specs.json` with a `gpus[]` entry for every distinct `gpu` value in `instances.json`.

**Sources to consult — use these, not memory:**

1. `https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html` — the authoritative accelerated-computing instance list, with per-size vCPU / memory / accelerator count / instance-store tables. This is the primary source for the size lists.
2. `https://aws.amazon.com/ec2/instance-types/` — the family index, to catch families the doc page groups differently.
3. Family pages for spec detail and EFA generation: `https://aws.amazon.com/ec2/instance-types/p6/`, `/p5/`, `/p4/`, `/p3/`, `/g7e/`, `/g6e/`, `/g6/`, `/g5/`, `/g5g/`, `/g4/`.
4. `https://aws.amazon.com/ec2/instance-types/p6e-gb200/` (and the `ac.html` UltraServer section) for the p6e-gb200 UltraServers.
5. NVIDIA datasheets for FP16/FP8/FP4 and VRAM — the existing `GPU_DATASHEET_LINKS` URLs, plus `https://www.nvidia.com/en-us/data-center/gb200-nvl72/` for GB200 and `https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/` for RTX PRO 6000.

**Out of scope, per Spec §1:** Trainium (`trn*`), Inferentia (`inf*`), AMD GPU (`g4ad`), and Intel/Habana. The site is NVIDIA-only. Do not add them.

**Family checklist.** For each family, list every size on `ac.html`, diff against `data/instances.json`, and record the result. Families already partly present, with the sizes currently in the JSON:

| Family | Sizes currently in `instances.json` | Action |
|---|---|---|
| `p6-b300` | `p6-b300.48xlarge` | confirm complete |
| `p6-b200` | `p6-b200.48xlarge` | confirm complete |
| `p6e-gb200` (UltraServer) | *(none)* | **add** — see below |
| `p5en` | `p5en.48xlarge` | confirm complete |
| `p5e` | `p5e.48xlarge` | confirm complete |
| `p5` | `p5.48xlarge`, `p5.4xlarge` | confirm complete |
| `p4d` / `p4de` | `p4d.24xlarge`, `p4de.24xlarge` | confirm complete |
| `p3` / `p3dn` | `p3.2xlarge`, `p3.8xlarge`, `p3.16xlarge`, `p3dn.24xlarge` | confirm complete |
| `g7e` | `2xlarge`, `4xlarge`, `8xlarge`, `12xlarge`, `24xlarge`, `48xlarge` | confirm complete (note: no `xlarge` today — check) |
| `g6e` | `xlarge`, `4xlarge`, `12xlarge`, `48xlarge` | **known gap** — `ac.html` also lists `2xlarge`, `8xlarge`, `16xlarge`, `24xlarge`. Verify and add. |
| `g6` | `xlarge`, `4xlarge`, `12xlarge`, `48xlarge` | **known gap** — `ac.html` also lists `2xlarge`, `8xlarge`, `16xlarge`, `24xlarge`. Verify and add. |
| `g6f` | `large`, `xlarge`, `4xlarge` | confirm complete (fractional-GPU sizes) |
| `g5` | `xlarge`, `2xlarge`, `4xlarge`, `8xlarge`, `12xlarge`, `24xlarge`, `48xlarge` | **known gap** — check for `16xlarge`. |
| `g5g` | `xlarge`, `2xlarge`, `4xlarge`, `8xlarge`, `16xlarge` | **known gap** — check for `g5g.metal`. |
| `g4dn` | `xlarge`, `2xlarge`, `4xlarge`, `8xlarge`, `12xlarge`, `metal` | **known gap** — `g4dn.16xlarge` is listed on `ac.html` and is absent here. Verify and add. |

Also check `ac.html` for any NVIDIA-GPU family not in the table above (a `p7*`, `g8*`, or a new `g6*` variant published since this plan was written). If one exists, add it and say so in the PR description.

**UltraServer records.** Both p6e-gb200 UltraServers get `unit: "ultraserver"`, `count` = the total GPU count of the UltraServer, `size` = the UltraServer type name, and a price that is the whole UltraServer's hourly rate (Spec §4.1). Skeleton — fill every value from the sources, do not guess:

```json
{"gen":"blackwell","gpu":"GB200","gpuKey":"gb200","ec2":"P6e-GB200","size":"u-p6e-gb200x36","unit":"ultraserver","count":36, ... ,"price":null,"priceGpu":null,"priceCb":null,"tokyo":false,"addedAt":"2026-09"}
{"gen":"blackwell","gpu":"GB200","gpuKey":"gb200","ec2":"P6e-GB200","size":"u-p6e-gb200x72","unit":"ultraserver","count":72, ... ,"price":null,"priceGpu":null,"priceCb":null,"tokyo":false,"addedAt":"2026-09"}
```

UltraServers do not appear in the Price List (Spec §7.1), so `price` / `priceGpu` stay `null` and `applyOdPricing` skips them. `priceCb` is filled by Task 5's script if the CB feed carries these sizes.

- [ ] **Step 1: Enumerate the current lineup**

Fetch `https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html` and, for each family in the checklist above, write down the full size list, the accelerator count per size, vCPU, memory, and instance store. Keep the notes in the scratchpad — they are the evidence for the next step.

- [ ] **Step 2: Produce the diff**

```bash
node -e '
const d = JSON.parse(require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json","utf8"));
const byFamily = {};
for (const r of d.instances) {
  const fam = r.size.split(".")[0];
  (byFamily[fam] ||= []).push(r.size);
}
for (const [fam, sizes] of Object.entries(byFamily)) console.log(fam.padEnd(12), sizes.join(" "));
'
```

Compare against the Step 1 notes and write out the exact list of records to add.

- [ ] **Step 3: Add the missing records to `data/instances.json`**

Insert each new record as a single line, in the file's existing order: generation (blackwell → hopper → ada → ampere → turing → volta), then family, then size ascending. Ordering matters — `computeSpans` merges only *consecutive* equal values, so a record inserted in the wrong place splits a rowspan.

For each new record: copy `gen`, `gpu`, `gpuKey`, `ec2`, `vramPerGpu`, the seven perf fields, `est`, and `pcie` from an existing record of the same family (they are per-GPU properties and identical across sizes); take `count`, `vcpu`, `mem`, `nvme`, and `efa` from `ac.html` / the family page; set `unit: "instance"`, `price: null`, `priceGpu: null`, `priceCb: null`, `tokyo: false`, `addedAt: null` (the price fields and `tokyo` get filled by Step 5). Use `addedAt: "<current YYYY-MM>"` only for a genuinely new *GPU* (the p6e-gb200 UltraServers), not for a size that has existed for years.

- [ ] **Step 4: Add link-table entries for anything new**

If a new `ec2` value appeared, add it to `EC2_LINKS` in `src/scripts/gpu-data.js` (for p6e-gb200: `"P6e-GB200": "https://aws.amazon.com/ec2/instance-types/p6e-gb200/"`). If a new `gpu` value appeared, add it to `GPU_DATASHEET_LINKS` (for GB200: `"GB200": "https://www.nvidia.com/en-us/data-center/gb200-nvl72/"`). The existing tests `all ec2 types in GPU_DATA have a corresponding link` and `all gpu types in GPU_DATA have a corresponding datasheet link` will catch an omission.

- [ ] **Step 5: Fill in prices for the new sizes**

```bash
node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-od-pricing.mjs
node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-cb-pricing.mjs
```

Expected: `Updated On-Demand pricing:` listing the newly added sizes. Any new non-UltraServer size still showing `price: null` afterwards means it genuinely has no On-Demand offering (like `p5e.48xlarge`) — confirm that on the family page before accepting it.

- [ ] **Step 6: Append the missing GPUs to `data/aws-ec2-nvidia-gpu-specs.json`**

Spec §4.4: the specs file stays as the reference, and its numbers must agree with `instances.json`. Three GPUs in `instances.json` have no entry there today — `RTX PRO`, `T4G`, and (after Step 3) `GB200`. Append one `gpus[]` entry each, in the file's existing shape. The convention in that file is that `fp16_tflops` holds the **sparse** value when `fp16_with_sparsity` is `true` and the **dense** value when it is `false` — match it, and take the numbers from the NVIDIA datasheets, not from `instances.json` (the point of the file is to be an independent check). Also bump `metadata.last_updated`.

Example shape (fill the real values from the datasheet):

```json
    {
      "gpu_name": "RTX PRO 6000 Blackwell SE",
      "ec2_instance": ["G7e"],
      "architecture": "Blackwell",
      "form_factor": "PCIe",
      "fp16_tflops": 480,
      "fp16_with_sparsity": true,
      "fp8_tflops": 960,
      "fp8_with_sparsity": true,
      "fp4_tflops": 4000,
      "fp4_with_sparsity": true,
      "memory_gb": 96,
      "is_aws_custom": false,
      "datasheet_url": "https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/"
    }
```

- [ ] **Step 7: Write the failing agreement test**

Add to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/gpu-data.test.js` (Spec §9). This is the test that proves the two data files did not drift:

```js
import specs from "../data/aws-ec2-nvidia-gpu-specs.json";

// instances.json の gpu 名 -> specs JSON の gpu_name
const SPEC_NAMES = {
  "B300": "B300 SXM",
  "B200": "B200 SXM",
  "GB200": "GB200",
  "RTX PRO": "RTX PRO 6000 Blackwell SE",
  "H200": "H200 SXM",
  "H100": "H100 SXM",
  "L40S": "L40S",
  "L4": "L4",
  "A100 40GB": "A100 SXM",
  "A100 80GB": "A100 SXM",
  "A10G": "A10G",
  "T4": "T4",
  "T4G": "T4G",
  "V100": "V100 SXM2",
};

// specs JSON は fp16_with_sparsity が true のときスパース値を持つ。
// instances.json は Dense を持つので、比較前に揃える。
function denseOf(tflops, withSparsity) {
  if (tflops == null) return null;
  return withSparsity ? tflops / 2 : tflops;
}

describe("instances.json agrees with aws-ec2-nvidia-gpu-specs.json", () => {
  const byName = new Map(specs.gpus.map((g) => [g.gpu_name, g]));

  it("every gpu in GPU_DATA is mapped and present in the specs file", () => {
    const gpus = [...new Set(GPU_DATA.map((r) => r.gpu))];
    gpus.forEach((gpu) => {
      const name = SPEC_NAMES[gpu];
      expect(name, `no SPEC_NAMES entry for gpu="${gpu}"`).toBeTruthy();
      expect(byName.has(name), `specs JSON has no gpu_name="${name}"`).toBe(true);
    });
  });

  it("vramPerGpu matches memory_gb", () => {
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      const memory = Array.isArray(spec.memory_gb) ? spec.memory_gb : [spec.memory_gb];
      expect(memory, `${row.size} (${row.gpu}): vramPerGpu=${row.vramPerGpu}`).toContain(row.vramPerGpu);
    });
  });

  it("fp16Dense / fp8Dense / fp4Dense match the specs file", () => {
    // 1979 / 2 = 989.5 を表では 989 と丸めているため 0.5 の誤差を許す
    const TOLERANCE = 0.5;
    const pairs = [
      ["fp16Dense", "fp16_tflops", "fp16_with_sparsity"],
      ["fp8Dense", "fp8_tflops", "fp8_with_sparsity"],
      ["fp4Dense", "fp4_tflops", "fp4_with_sparsity"],
    ];
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      pairs.forEach(([dataField, specField, sparsityField]) => {
        const expected = denseOf(spec[specField], spec[sparsityField] === true);
        const actual = row[dataField];
        if (expected == null) {
          expect(actual, `${row.size} (${row.gpu}): ${dataField} should be null`).toBeNull();
        } else {
          expect(actual, `${row.size} (${row.gpu}): ${dataField}`).not.toBeNull();
          expect(
            Math.abs(actual - expected) <= TOLERANCE,
            `${row.size} (${row.gpu}): ${dataField}=${actual} vs specs ${expected}`,
          ).toBe(true);
        }
      });
    });
  });

  it("fp16NonTc matches fp16_tflops_non_tensor when the specs file has it", () => {
    GPU_DATA.forEach((row) => {
      const spec = byName.get(SPEC_NAMES[row.gpu]);
      const expected = spec.fp16_tflops_non_tensor ?? null;
      expect(row.fp16NonTc, `${row.size} (${row.gpu}): fp16NonTc`).toBe(expected);
    });
  });
});
```

- [ ] **Step 8: Run the suite and fix the disagreements**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/gpu-data.test.js
```

Expected on the first run: failures naming the exact `size` / field pairs that disagree. Resolve each by going back to the NVIDIA datasheet and correcting whichever file is wrong — never by loosening the tolerance or adding a skip. When it passes, the two files agree.

Note for the `est: true` rows (G7e): those values are the site's own estimates (see `notes.g7eNote`). If the RTX PRO datasheet does not publish FP16/FP8, put the same estimated numbers in the specs file and add a note under `metadata.notes` saying they are estimates, so the test still guards against accidental drift.

- [ ] **Step 9: Record the `gb200` gpuKey addition in the spec**

Spec §11 says "実装中に判断が必要になった場合はこの文書に追記する". Append to §11 of `docs/superpowers/specs/2026-09-07-site-renewal-design.md`:

```markdown
- 2026-09: §4.1 の `gpuKey` 一覧に `gb200` を追加した（p6e-gb200 UltraServer の追加に伴う）。
```

- [ ] **Step 10: Run the full suite and the build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test && npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
```

Expected: tests PASS, build succeeds.

- [ ] **Step 11: Eyeball the rendered table**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run preview -- --port 5199
```

Open `http://localhost:5199`. Confirm: the new rows sit inside the right generation block, the merged generation / GPU / family cells still line up (no cell running past its block), and the new UltraServer rows show `-` in the On-Demand columns. Then stop the server.

- [ ] **Step 12: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add data/instances.json data/aws-ec2-nvidia-gpu-specs.json src/scripts/gpu-data.js tests/gpu-data.test.js docs/superpowers/specs/2026-09-07-site-renewal-design.md
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 不足していたGPUインスタンスを追加（p6e-gb200 UltraServer 含む）

AWS の accelerated computing 一覧と突き合わせて不足サイズを追加し、
p6e-gb200 UltraServer を unit: "ultraserver" として追加した。
演算性能は NVIDIA データシートから取り、aws-ec2-nvidia-gpu-specs.json にも
同じ値を追記して、両者の一致をテストで検証する。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Task 7: Inject `pricingAsOf` at build time

Spec §8's third bullet. Today the pricing month is hardcoded in three dictionaries and one HTML fallback, so it silently goes stale every time the prices are refreshed. Drive it from `data/instances.json` instead.

**Occurrences of the hardcoded month, found with `grep -rn "Updated July 2026\|2026年7月更新\|2025년 6월" src/`** — all four must change:

| File:line | Current text |
|---|---|
| `src/i18n/en.js:76` | `... TBD = pricing not yet announced. Updated July 2026.` |
| `src/i18n/ja.js:78` | `... TBD = 価格未発表。2026年7月更新。` |
| `src/i18n/ko.js:78` | `2025년 6월 가격 인하 반영. 도쿄 리전 On-Demand 가격 (USD). CB = Capacity Blocks. TBD = 가격 미발표.` |
| `src/index.html:236` | the static fallback of `data-i18n="notes.priceNote"`, same Japanese text |

Note the Korean string has drifted twice over: it says the prices are **Tokyo** On-Demand (they are us-east-1, and both other languages say so) and carries a 2025-06 date. Bring it in line with the other two while you are here.

**Files:**
- Modify: `vite.config.js`
- Modify: `src/scripts/i18n.js`
- Modify: `src/i18n/ja.js`, `src/i18n/en.js`, `src/i18n/ko.js`
- Modify: `src/index.html:236`
- Test: `tests/i18n.test.js`

**Interfaces:**
- Consumes: `PRICING_META` from `src/scripts/gpu-data.js` (Task 2).
- Produces: `t()` substitutes `%PRICING_AS_OF%` with `PRICING_META.pricingAsOf`; `vite.config.js` substitutes `%PRICING_AS_OF%` in `index.html`.

**Why both a runtime and a build-time substitution.** `%BUILD_DATE%` only ever needs to reach `index.html`, so `transformIndexHtml` is enough for it. `%PRICING_AS_OF%` also has to reach the three i18n dictionaries, which are JS modules — `transformIndexHtml` cannot reliably touch those (whether it sees them depends on whether `vite-plugin-singlefile` has inlined the bundle yet). Substituting inside `t()` from `PRICING_META` is order-independent and needs no build machinery, and the HTML fallback keeps its own `%PRICING_AS_OF%` for the pre-hydration paint. Making the existing hook `order: "pre"` pins it to the raw HTML so the two mechanisms cannot collide.

- [ ] **Step 1: Write the failing test**

Add to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/i18n.test.js`:

```js
describe("pricingAsOf substitution", () => {
  it("replaces %PRICING_AS_OF% in translated strings", async () => {
    const { t, setLang } = await import("../src/scripts/i18n.js");
    const { PRICING_META } = await import("../src/scripts/gpu-data.js");
    ["ja", "en", "ko"].forEach((lang) => {
      setLang(lang);
      const note = t("notes.priceNote");
      expect(note, `${lang}: placeholder left unsubstituted`).not.toContain("%PRICING_AS_OF%");
      expect(note, `${lang}: pricingAsOf missing`).toContain(PRICING_META.pricingAsOf);
    });
  });

  it("leaves strings without the placeholder alone", async () => {
    const { t, setLang } = await import("../src/scripts/i18n.js");
    setLang("en");
    expect(t("notes.efaNote")).not.toContain("%");
  });

  it("returns the key unchanged for a missing key", async () => {
    const { t } = await import("../src/scripts/i18n.js");
    expect(t("nope.not.a.key")).toBe("nope.not.a.key");
  });
});
```

Also add to `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/gpu-data.test.js`, so a dictionary that loses the placeholder is caught:

```js
import { ja } from "../src/i18n/ja.js";
import { en } from "../src/i18n/en.js";
import { ko } from "../src/i18n/ko.js";

describe("priceNote carries the pricingAsOf placeholder", () => {
  it("is present in every language", () => {
    [["ja", ja], ["en", en], ["ko", ko]].forEach(([lang, dict]) => {
      expect(dict.notes.priceNote, `${lang}`).toContain("%PRICING_AS_OF%");
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/i18n.test.js tests/gpu-data.test.js
```

Expected: FAIL — the `priceNote` strings still contain `July 2026` / `2026年7月` and no `%PRICING_AS_OF%`.

- [ ] **Step 3: Substitute in `t()`**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/i18n.js`, add the import at the top:

```js
import { PRICING_META } from "./gpu-data.js";
```

and change the tail of `t()`:

```js
export function t(key) {
  const keys = key.split(".");
  let value = dictionaries[currentLang];
  for (const k of keys) {
    if (value == null) return key;
    value = value[k];
  }
  if (value == null) return key;
  // 価格の基準月はデータ (data/instances.json) が持つので、辞書側は置換子だけ持つ
  return typeof value === "string"
    ? value.replaceAll("%PRICING_AS_OF%", PRICING_META.pricingAsOf)
    : value;
}
```

- [ ] **Step 4: Update the three dictionaries**

`src/i18n/en.js:76-77`:

```js
    priceNote:
      "On-Demand pricing (USD) for us-east-1 (N. Virginia). CB = Capacity Blocks (Tokyo region when available, otherwise US regions). TBD = pricing not yet announced. Pricing as of %PRICING_AS_OF%.",
```

`src/i18n/ja.js:77-78`:

```js
    priceNote:
      "us-east-1 (バージニア北部) の On-Demand 価格 (USD)。CB = Capacity Blocks（東京リージョン優先、未提供時は米国リージョン）。TBD = 価格未発表。価格基準: %PRICING_AS_OF%。",
```

`src/i18n/ko.js:77-78` (also corrected from Tokyo to us-east-1, matching the other two):

```js
    priceNote:
      "us-east-1 (버지니아 북부)의 On-Demand 가격 (USD). CB = Capacity Blocks (도쿄 리전 우선, 미제공 시 미국 리전). TBD = 가격 미발표. 가격 기준: %PRICING_AS_OF%.",
```

- [ ] **Step 5: Update the HTML fallback**

`src/index.html:236` — replace the inline fallback text so it matches the new `ja` string:

```html
          <li><strong>価格:</strong> <span data-i18n="notes.priceNote">us-east-1 (バージニア北部) の On-Demand 価格 (USD)。CB = Capacity Blocks（東京リージョン優先、未提供時は米国リージョン）。TBD = 価格未発表。価格基準: %PRICING_AS_OF%。</span></li>
```

- [ ] **Step 6: Inject `%PRICING_AS_OF%` at build time**

Replace `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/vite.config.js`:

```js
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// ビルド実行日 (JST) を index.html の %BUILD_DATE% に埋め込む
const buildDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
}).format(new Date());

// 価格の基準月 (%PRICING_AS_OF%) はデータの正から読む
const { pricingAsOf } = JSON.parse(
  readFileSync(new URL("./data/instances.json", import.meta.url), "utf8"),
);

// order: "pre" で、singlefile がバンドルをインライン化する前の生の HTML に対して置換する
const injectBuildMeta = () => ({
  name: "inject-build-meta",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      return html
        .replaceAll("%BUILD_DATE%", buildDate)
        .replaceAll("%PRICING_AS_OF%", pricingAsOf);
    },
  },
});

export default defineConfig({
  root: "src",
  plugins: [viteSingleFile(), injectBuildMeta()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    environment: "jsdom",
  },
});
```

- [ ] **Step 7: Run the tests to verify they pass**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: PASS, every file — including PR 1's `tests/i18n-keys.test.js` (the key sets are unchanged; only values moved).

- [ ] **Step 8: Verify the built output**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
node -e '
const s=require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html","utf8");
const meta=JSON.parse(require("fs").readFileSync("/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/instances.json","utf8"));
console.log("unsubstituted %BUILD_DATE%:", s.includes("%BUILD_DATE%"));
console.log("unsubstituted %PRICING_AS_OF% in HTML fallback:", /data-i18n="notes.priceNote"[^>]*>[^<]*%PRICING_AS_OF%/.test(s));
console.log("pricingAsOf present:", s.includes(meta.pricingAsOf));
'
```

Expected:

```
unsubstituted %BUILD_DATE%: false
unsubstituted %PRICING_AS_OF% in HTML fallback: false
pricingAsOf present: true
```

The literal `%PRICING_AS_OF%` **will** still appear elsewhere in `dist/index.html` — inside the inlined `en` / `ja` / `ko` dictionary strings — and that is correct: `t()` substitutes those at runtime.

- [ ] **Step 9: Check it in the browser, in all three languages**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run preview -- --port 5199
```

Open `http://localhost:5199`, scroll to Notes, and switch the language selector through 日本語 / English / 한국어. The 価格 note must show the month from `data/instances.json` (`2026-09`) in each, with no `%PRICING_AS_OF%` visible. The header's 更新日 must still show the build date. Stop the server.

- [ ] **Step 10: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add vite.config.js src/scripts/i18n.js src/i18n/ja.js src/i18n/en.js src/i18n/ko.js src/index.html tests/i18n.test.js tests/gpu-data.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
feat: 価格の基準月をビルド時に埋め込む

「2026年7月更新」のようなハードコードをやめ、data/instances.json の
pricingAsOf を %PRICING_AS_OF% として埋め込む。index.html はビルド時、
i18n 辞書は t() の実行時に置換する。ko の価格注記が東京リージョン基準の
まま古くなっていたので ja / en に揃えた。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

- [ ] **Step 11: Open the PR**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference push -u origin feat/data-json
gh pr create --repo koyakimu/aws-gpu-quick-reference --base main --head feat/data-json \
  --title "feat: データの正を data/instances.json に移し、価格と不足インスタンスを更新" \
  --body "$(cat <<'EOF'
設計書 `docs/superpowers/specs/2026-09-07-site-renewal-design.md` の PR 2 (`feat/data-json`)。

## 内容

- `data/instances.json` をデータの正にした。全レコードが `gen` / `gpu` / `gpuKey` / `ec2` / `unit` を持ち、`genRows` / `gpuRows` / `ec2Rows` / `gpuNew` は削除。価格は数値または `null`
- `src/scripts/gpu-data.js` は JSON を読むだけの薄い層（`GPU_DATA` / `EC2_LINKS` / `GPU_DATASHEET_LINKS` / `PRICING_META`）
- rowspan は描画時に `computeSpans` で計算し、見た目は現状維持
- `scripts/update-od-pricing.mjs` を追加し、On-Demand 価格を Price List から再取得
- 不足インスタンスを追加（p6e-gb200 UltraServer 含む）
- `scripts/update-cb-pricing.mjs` を `data/instances.json` 向けに書き直し
- 価格の基準月をビルド時に埋め込み（`%PRICING_AS_OF%`）

## レビューで確認してほしい点

- **計算ツールの選択肢**: 設計書 §10 に従い `price === null` の行（現状 `p5e.48xlarge`）を除外した。従来は「CB専用」表示のまま選択でき、CB 側の試算はできていたので、機能としては後退している。この挙動でよいか
- **L4 の結合セル**: 従来 G6 の 4 行と G6f の 3 行で別セルだったものが、7 行の 1 セルに結合される。PR 3 で rowspan 自体を廃止するため一時的な差分

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

---

## Self-Review

Run against the spec after the plan is written; recorded here so the executor knows what was and was not covered.

**1. Spec coverage (PR 2 scope only)**

| Spec item | Task |
|---|---|
| §3 row 2 — JSON migration | Task 2 |
| §3 row 2 — On-Demand 価格再取得 | Tasks 3, 4 |
| §3 row 2 — 不足インスタンス追加 | Task 6 |
| §3 row 2 — `pricingAsOf` ビルド時埋め込み | Task 7 |
| §4.1 — schema, `gpuKey`, `unit`, numeric prices, `addedAt`, dropped fields | Task 2 (+ Task 6 for `gb200` / ultraserver) |
| §4.1 — `gpu-data.js` exports exactly `GPU_DATA` / `EC2_LINKS` / `GPU_DATASHEET_LINKS` / `PRICING_META` | Task 2 Step 4 |
| §4.4 — specs JSON kept as reference, agreement verified by test | Task 6 Steps 6–8 |
| §8 — OD refresh kept as `scripts/update-od-pricing.mjs`, manual only | Task 3 (no workflow added — deliberate) |
| §8 — specs appended for new GPUs | Task 6 Step 6 |
| §8 — `%PRICING_AS_OF%` in vite.config, i18n strings replaced | Task 7 |
| §8 — `%BUILD_DATE%` kept as the site update date | Task 7 Step 6 (both tokens injected) |
| §9 — `gpu-data.test.js`: gen/gpu/gpuKey/ec2 present, prices numeric or null | Task 2 Step 7 |
| §9 — `gpu-data.test.js`: specs JSON agreement | Task 6 Step 7 |
| §9 — calculator tests adapted | Task 2 Step 8 |
| §9 — `tests/update-od-pricing.test.js` | Task 3 Step 1 |
| §10 — Calculator keeps CB-only rows, drops only rows with both prices `null`, shows `—` for the missing side | Task 2 Step 6(c)(d) |
| §11 — record in-flight decisions in the spec | Task 6 Step 9 |

**Deliberately out of scope, deferred to their own PRs:** §4.2 `regions.json` and §7 (PR 4); §4.3 `gpu-features.json` and §5.4 Features (PR 5); §5, §6 table engine / tabs / design tokens (PR 3); §9's `table-engine.test.js`, `tabs.test.js`, `theme.test.js`, `update-regions.test.js` (PRs 3–5); §10's `regions.json`-missing and `gpu-features.json`-missing cases (PRs 4, 5). Spec §9's "`gpuKey` が `gpu-features.json` に存在する" test cannot run in PR 2 — `gpu-features.json` does not exist until PR 5 — so it belongs to PR 5; PR 2 asserts the `gpuKey` shape instead (Task 2 Step 7).

**2. Placeholder scan** — no "TBD" / "TODO" / "similar to Task N" / "add error handling" in any step. Every code step carries the full code. The only intentionally incomplete literals are in Task 6, where the values must come from the named AWS and NVIDIA sources; the `...` there is marked, scoped to per-size numbers, and paired with the exact sources and a mechanical diff step.

**3. Type consistency** — checked across tasks: `formatPrice`, `parseCount`, `computeSpans`, `isNew` (Task 1) are used under those exact names in Tasks 2 and 3. `roundUsd` / `readInstances` / `writeInstances` / `INSTANCES_PATH` (Task 3) are used under those names in Task 5. `scanPriceList` / `applyOdPricing` signatures match between the Task 3 test and implementation and the Task 3 CLI. `pickRate` / `applyCbPricing` match between the Task 5 test and implementation. `PRICING_META.pricingAsOf` is written in Task 2, asserted in Task 2's test, and read in Task 7 by both `i18n.js` and `vite.config.js`.
