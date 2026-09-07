# PR 1: Foundation (`chore/foundation`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring devDependencies to their latest versions and add the three missing safety-net tests (i18n key parity, table DOM render, theme) so that PRs 2–5 can refactor data and design with a regression net in place.

**Architecture:** No production behaviour changes. Three new test files under `tests/`, one dictionary fix in `src/i18n/`, one `package.json` bump, and one `vite.config.js` change so the Vitest config keeps type-checking after the Vitest major upgrade. Every test asserts *current* behaviour so that later PRs see real failures when they change it.

**Tech Stack:** Vite 8, vite-plugin-singlefile 2, Vitest (upgrading 4 → 5), jsdom (upgrading 29 → 30), vanilla ES modules, no framework.

**Spec:** `docs/superpowers/specs/2026-09-07-site-renewal-design.md` — this plan implements **only** row 1 of section 3 (`chore/foundation`): 依存パッケージ更新 and テスト補強. Everything else in the spec belongs to PRs 2–5 and is explicitly out of scope here.

## Global Constraints

- **No runtime dependencies.** The site ships as a single HTML file via `vite-plugin-singlefile`; only `devDependencies` may be added or changed (spec §2, §7.2 "依存パッケージを増やさない").
- **Do not touch production behaviour in this PR.** No data model changes, no `data/*.json` reshaping, no design tokens, no tabs. Those are PRs 2–5.
- **`.superpowers/` gitignore is already done** in the spec commit (`d606182`). Do not redo it.
- **Never use `cd`.** Every command in this plan uses `npm --prefix <abs path>` or `git -C <abs path>` with absolute paths.
- **Repo root** for every command: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference`
- **Branch:** `chore/foundation`, cut from `main`.
- **Commit message style** (from `git log`): `chore:` / `feat:` / `fix:` + a Japanese one-line summary. Every commit message in this plan ends with these two trailer lines, exactly:

  ```
  Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
  ```

- **Do not push and do not open a PR** unless the user asks. Commit locally only.

## Known environment issue: npm cache EPERM

`npm outdated`, `npm view`, and `npm install` fail on this machine with:

```
npm error code EPERM
npm error path /Users/koyakimu/.npm/_cacache/tmp/...
npm error Your cache folder contains root-owned files
```

This is a pre-existing local npm cache permission problem, **not** something this PR fixes and **not** something to "fix" with `sudo chown`. Work around it by pointing npm at a scratch cache with `--cache "$TMPDIR/npmcache"`. Every npm command below already carries that flag. If a command works without the flag on your machine, the flag is harmless.

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `package.json` | Modify | devDependency version floors |
| `package-lock.json` | Modify (generated) | Exists in the repo and is consumed by `npm ci` in `.github/workflows/deploy.yml:28` and `update-cb-pricing.yml:41`. It **must** be committed with the `package.json` bump or CI breaks. |
| `vite.config.js` | Modify | Switch `defineConfig` import to `vitest/config` so the `test` block stays a known option under Vitest 5 |
| `tests/i18n-keys.test.js` | Create | ja / en / ko key-set parity (spec §9) |
| `src/i18n/en.js` | Modify | Add the 2 keys it is missing |
| `src/i18n/ko.js` | Modify | Add the 6 keys it is missing |
| `tests/table-render.test.js` | Create | DOM render test for the current `renderTable()` |
| `tests/theme.test.js` | Create | Current `theme.js` behaviour (spec §9 lists this file; the `prefers-color-scheme` priority cases in the spec belong to PR 3 and are **not** written here) |

**Why `tests/table-render.test.js` and not an extension of `tests/table.test.js`:** the existing `tests/table.test.js` is a pure-function unit test — it imports only `parseFraction` and `formatNumber` and touches no DOM, so it has no fixtures and no `beforeEach`. The render test needs a `#gpu-table-body` fixture rebuilt before each case and imports `renderTable`, which pulls in `gpu-data.js` and `i18n.js`. Keeping the DOM fixture out of the pure-function file keeps both files small and makes it obvious which file PR 3 must rewrite when `table.js` is replaced by `table-engine.js` (spec §5). `tests/table.test.js` is left untouched.

**Vitest file discovery:** `vite.config.js` sets `test.root: "."`, and Vitest's default `include` is `**/*.{test,spec}.?(c|m)[jt]s?(x)` with `node_modules` excluded. All three new files match, so **no `include` change is needed.** Task 1 Step 8 verifies this by file count rather than assuming it.

## Baseline (measured 2026-09-07, before any change)

```
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
→ Test Files  4 passed (4)
→      Tests  39 passed (39)
```

Keep this number in mind: after this PR it must be 7 files and strictly more than 39 tests.

---

### Task 1: devDependency 更新

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/package.json` (the `devDependencies` block)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/package-lock.json` (regenerated by npm — do not hand-edit)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/vite.config.js:1`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm --prefix <repo> test` on Vitest 5 + jsdom 30, which Tasks 2–4 all run.

- [ ] **Step 1: Cut the branch**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference switch -c chore/foundation
```

Expected: `Switched to a new branch 'chore/foundation'`

- [ ] **Step 2: Record the baseline**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: `Test Files  4 passed (4)` / `Tests  39 passed (39)`. If this already fails, stop and report — the tree is not clean and nothing below is meaningful.

- [ ] **Step 3: Find the latest versions**

Try the direct route first:

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference outdated
```

If it prints the `npm error code EPERM ... _cacache` block described above, use the scratch-cache fallback — it produces the same table:

```bash
mkdir -p "$TMPDIR/npmcache"
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference --cache "$TMPDIR/npmcache" outdated
```

Expected (values measured 2026-09-07 — re-read the real output, do not copy these blindly):

```
Package  Current  Wanted  Latest  Location             Depended by
jsdom     29.1.1  29.1.1  30.0.1  node_modules/jsdom   aws-gpu-quick-reference
vite       8.1.5   8.2.2   8.2.2  node_modules/vite    aws-gpu-quick-reference
vitest    4.1.10  4.1.11   5.0.0  node_modules/vitest  aws-gpu-quick-reference
```

`vite-plugin-singlefile` does not appear, meaning it is already at latest (2.3.3).

If `outdated` fails even with the scratch cache, fall back to one `npm view` per devDependency:

```bash
mkdir -p "$TMPDIR/npmcache"
for p in jsdom vite vite-plugin-singlefile vitest; do
  echo -n "$p "
  npm view --cache "$TMPDIR/npmcache" "$p" version
done
```

Expected: `jsdom 30.0.1` / `vite 8.2.2` / `vite-plugin-singlefile 2.3.3` / `vitest 5.0.0`

- [ ] **Step 4: Check the Node engine floors before bumping**

The two majors raise their Node requirements, and `.github/workflows/deploy.yml:25` pins `node-version: 22`.

```bash
mkdir -p "$TMPDIR/npmcache"
for p in vitest@5.0.0 jsdom@30.0.1 vite@8.2.2; do
  echo -n "$p "
  npm view --cache "$TMPDIR/npmcache" "$p" engines
done
node -v
```

Expected (measured 2026-09-07):

```
vitest@5.0.0 { node: '^22.12.0 || ^24.0.0 || >=26.0.0' }
jsdom@30.0.1 { node: '^22.22.2 || ^24.15.0 || >=26.0.0' }
vite@8.2.2 { node: '^20.19.0 || >=22.12.0' }
v24.18.0
```

`node-version: 22` in the workflow resolves to the latest 22.x, which satisfies `^22.22.2`, so **no workflow change is needed**. Local Node 24.18.0 satisfies `^24.15.0`. If your local `node -v` is below both floors, stop and report rather than downgrading the packages.

- [ ] **Step 5: Bump `package.json`**

Replace the `devDependencies` block in `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/package.json` with the versions Step 3 reported. Using the measured values:

```json
  "devDependencies": {
    "jsdom": "^30.0.1",
    "vite": "^8.2.2",
    "vite-plugin-singlefile": "^2.3.3",
    "vitest": "^5.0.0"
  }
```

Leave `name`, `version`, `private`, `type`, and `scripts` untouched.

- [ ] **Step 6: Install**

```bash
mkdir -p "$TMPDIR/npmcache"
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference --cache "$TMPDIR/npmcache" install
```

Expected: `added/changed/removed N packages` and no `EPERM`. Confirm `package-lock.json` was rewritten:

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --short
```

Expected: both `package.json` and `package-lock.json` listed as modified (` M`).

- [ ] **Step 7: Point the Vitest config at `vitest/config`**

Vitest 5 owns the `test` key in the config object. Importing `defineConfig` from `vite` leaves `test` as an unknown option to Vite's own type/validation path. Change **line 1** of `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/vite.config.js`:

```js
import { defineConfig } from "vitest/config";
```

(was `import { defineConfig } from "vite";`)

Everything else in the file — `injectBuildDate`, `root: "src"`, `plugins`, `build.outDir`, and the `test` block — stays exactly as it is. `vitest/config` re-exports Vite's `defineConfig` with the `test` types added, so `vite build` behaves identically; `vitest` is a devDependency and CI runs `npm ci`, which installs devDependencies, so the build still resolves it.

- [ ] **Step 8: Run the tests and confirm discovery is unchanged**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: `RUN v5.x.x`, then `Test Files  4 passed (4)` and `Tests  39 passed (39)` — the same counts as the Step 2 baseline, proving the majors did not silently drop a test file. If the count dropped, the `include` glob is the first thing to check; add an explicit `include: ["tests/**/*.test.js"]` to the `test` block only if the default genuinely stopped matching.

- [ ] **Step 9: Run the build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
```

Expected: `vite vX.Y.Z building for production...`, then `✓ built in ...`, and a written `../dist/index.html`. Confirm the single-file output is intact and the build date got substituted:

```bash
ls -la /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/
grep -c "%BUILD_DATE%" /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/dist/index.html
```

Expected: `dist/` contains `index.html` (and no separate `.js`/`.css` assets — singlefile inlined them), and `grep -c` prints `0` with exit status 1, meaning no unreplaced placeholder survived.

- [ ] **Step 10: Commit**

`dist/` is a build artifact; check whether it is tracked before staging. Stage only the four source files:

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add package.json package-lock.json vite.config.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
chore: devDependenciesを最新化（vite 8.2 / vitest 5 / jsdom 30）

vitest 5 で test 設定キーを正しく扱うため vite.config.js の defineConfig を
vitest/config からの import に変更。既存テスト 39 件とビルドの通過を確認済み。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

Expected: `3 files changed`.

---

### Task 2: i18n キー整合テストと不足キーの補完

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/i18n-keys.test.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/en.js` (the `calculator` block)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ko.js` (the `notes` block)

**Interfaces:**
- Consumes: the working test runner from Task 1.
- Produces: nothing that later tasks import. The three dictionaries `ja` / `en` / `ko` from `src/i18n/*.js` end this task with **identical key sets, 83 keys each**.

**Context the implementer needs:** the dictionaries are **nested** plain objects, two levels deep (`header`, `table`, `generations`, `calculator`, `theme`, `footer`, `notes`), and every leaf is a string. `src/scripts/i18n.js` looks keys up by splitting on `.` (`t("notes.priceNote")`), so the meaningful unit of comparison is the dotted leaf path, not the top-level group. The parity check must therefore recurse.

This test **fails on first run against the current dictionaries** — that is the point of it. The real, measured gaps are:

- `en` is missing `calculator.exchangeRateLabel` and `calculator.localCurrency` (both present in `ja` and `ko`; both are referenced by `src/index.html:149` and `src/index.html:200` via `data-i18n`, so English users currently see the raw Japanese fallback text baked into the HTML).
- `ko` is missing `notes.refAwsTitle`, `notes.refNvidiaTitle`, `notes.refNvidiaDataCenter`, `notes.refDgxB200`, `notes.refDgxB300`, `notes.refGpuSpecNote` (all present in `ja` and `en`).

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/i18n-keys.test.js`:

```js
import { describe, it, expect } from "vitest";
import { ja } from "../src/i18n/ja.js";
import { en } from "../src/i18n/en.js";
import { ko } from "../src/i18n/ko.js";

/**
 * 辞書はネストしたプレーンオブジェクト。i18n.js が "notes.priceNote" のように
 * ドット区切りで引くので、比較の単位は葉のドット付きパスにする。
 */
function collectKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix + key;
    const isPlainObject =
      value !== null && typeof value === "object" && !Array.isArray(value);
    return isPlainObject ? collectKeys(value, path + ".") : [path];
  });
}

function keySet(dict) {
  return new Set(collectKeys(dict));
}

function missingFrom(reference, target) {
  return [...reference].filter((key) => !target.has(key)).sort();
}

const dictionaries = { ja, en, ko };

describe("i18n key parity", () => {
  it("every leaf key path is a string", () => {
    for (const [lang, dict] of Object.entries(dictionaries)) {
      for (const path of collectKeys(dict)) {
        const value = path.split(".").reduce((acc, k) => acc[k], dict);
        expect(typeof value, `${lang}.${path} must be a string`).toBe("string");
        expect(value.length, `${lang}.${path} must not be empty`).toBeGreaterThan(0);
      }
    }
  });

  it("ja / en / ko have identical key sets", () => {
    const sets = {
      ja: keySet(ja),
      en: keySet(en),
      ko: keySet(ko),
    };

    const problems = [];
    for (const [langA, setA] of Object.entries(sets)) {
      for (const [langB, setB] of Object.entries(sets)) {
        if (langA === langB) continue;
        const missing = missingFrom(setA, setB);
        if (missing.length > 0) {
          problems.push(`${langB} is missing ${missing.length} key(s) present in ${langA}:\n    ${missing.join("\n    ")}`);
        }
      }
    }

    expect(problems.join("\n\n"), "i18n dictionaries are out of sync").toBe("");
  });

  it("all three dictionaries have the same key count", () => {
    expect({
      ja: keySet(ja).size,
      en: keySet(en).size,
      ko: keySet(ko).size,
    }).toEqual({ ja: 83, en: 83, ko: 83 });
  });
});
```

- [ ] **Step 2: Run it and verify it fails for the expected reason**

```bash
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/i18n-keys.test.js
```

Expected: the first test (`every leaf key path is a string`) PASSES; the other two FAIL. The failure message must name exactly these keys:

```
en is missing 2 key(s) present in ja:
    calculator.exchangeRateLabel
    calculator.localCurrency

ko is missing 6 key(s) present in ja:
    notes.refAwsTitle
    notes.refDgxB200
    notes.refDgxB300
    notes.refGpuSpecNote
    notes.refNvidiaDataCenter
    notes.refNvidiaTitle
```

and the count test failing with `{ ja: 83, en: 81, ko: 77 }`. If a different set of keys is named, the dictionaries drifted since this plan was written — fix the ones actually reported and adjust the `83` in Step 1's third test to the ja count.

- [ ] **Step 3: Add the two missing English keys**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/en.js`, inside the `calculator` block, insert these two lines immediately after `cbDays: "CB by Days",` — matching the position they occupy in `ja.js` and `ko.js`:

```js
    exchangeRateLabel: "Exchange Rate (USD→JPY)",
    localCurrency: "JPY",
```

JPY is correct here: `src/scripts/calculator.js:41` exports `convertToJpy` and the default rate at `calculator.js:182` is `150`, i.e. the converter is hard-coded to yen regardless of UI language. The Korean dictionary already labels it KRW, which is a pre-existing mislabel of the same yen figure — **leave it alone**; correcting the converter is not in this PR's scope.

- [ ] **Step 4: Add the six missing Korean keys**

In `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/ko.js`, inside the `notes` block:

Insert after `refTitle: "공식 레퍼런스",`:

```js
    refAwsTitle: "AWS",
```

Insert after `refBlog: "AWS Blog - EC2 카테고리 (최신 정보)",`:

```js
    refNvidiaTitle: "NVIDIA GPU 데이터 소스",
    refNvidiaDataCenter: "NVIDIA Data Center GPUs (제품 페이지 · 데이터시트)",
    refDgxB200: "DGX B200 (B200 사양)",
    refDgxB300: "DGX B300 (B300 사양)",
    refGpuSpecNote: "GPU 연산 성능 값은 NVIDIA 공식 데이터시트 및 제품 페이지를 기준으로 합니다. 표의 GPU 이름을 클릭하면 각 GPU의 공식 페이지로 이동합니다.",
```

This ordering mirrors `ja.js` and `en.js` exactly, so the three files stay diff-comparable.

- [ ] **Step 5: Run the test and verify it passes**

```bash
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/i18n-keys.test.js
```

Expected: `Test Files  1 passed (1)` / `Tests  3 passed (3)`

- [ ] **Step 6: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: `Test Files  5 passed (5)` / `Tests  42 passed (42)`

- [ ] **Step 7: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add tests/i18n-keys.test.js src/i18n/en.js src/i18n/ko.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
test: ja/en/ko の i18n キー整合テストを追加し不足キーを補完

en に calculator.exchangeRateLabel / localCurrency、ko に notes.refAwsTitle 他
NVIDIA 参照系 5 件を追加。3 辞書のキー集合を 83 件で一致させた。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

Expected: `3 files changed`.

---

### Task 3: 比較表の DOM 描画テスト

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-render.test.js`
- Read only (do not modify): `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table.js`

**Interfaces:**
- Consumes: `renderTable()` (no arguments, no return value — it finds `document.getElementById("gpu-table-body")` itself and calls `tbody.replaceChildren(fragment)`) and `setupHover()` from `src/scripts/table.js`; `GPU_DATA` from `src/scripts/gpu-data.js`.
- Produces: nothing importable. This test is the regression net PR 3 will rewrite when `table.js` is replaced by `table-engine.js` (spec §5).

**Context the implementer needs — all values below were measured by rendering the current code in jsdom, not guessed:**

- `GPU_DATA.length` is **47**; `renderTable()` emits one `<tr>` per entry, so **47 rows**.
- Each `<tr>` gets `class="row-<gen>"`. Row 0 is `row-blackwell`; the last row is `row-volta`.
- Column count varies by row because of rowspan grouping: only the first row of a `gen` / `gpu` / `ec2` run emits that cell. Row 0 has **22** `<td>` (the full width, matching the 4+9+2+3+3+1 = 22 leaf `<th>` in `src/index.html`), row 1 has **21** (no generation cell), row 3 has **19** (no generation, GPU, or EC2 cell).
- Row 0 cell texts, in order: `Blackwell`, `B300NEW`, `P6-B300`, `p6-b300.48xlarge`, `8`, `288GB(2.3TB)`, `-`, `2,250(18,000)`, `4,500(36,000)`, `4,500(36,000)`, `9,000(72,000)`, `13,500(108,000)`, `18,000(144,000)`, `v4 3200G`, `Gen5`, `192`, `4TB`, `30TB`, `$142.42`, `$17.80`, `$14.04`, `✕`. (`B300NEW` is the GPU name plus the `<span class="badge">NEW</span>` concatenated by `textContent`.)
- Across the whole tbody there are **24** `td[rowspan]` cells, **15** `a.gpu-link` anchors, and **2** `span.badge` NEW badges.
- Row 0's only rowspan cell is `td.arch` with `rowspan="8"`, which equals the number of `blackwell` entries in `GPU_DATA`.
- `renderTable()` calls `t("table.cbOnly")` for rows whose `price` is falsy or `"TBD"`. `src/scripts/i18n.js` defaults `currentLang` to `"ja"` at module load, so the test does **not** need to call `initI18n()` and does not need a `[data-i18n]` DOM.
- `setupHover()` reads `document.querySelectorAll("tbody tr")` — an unscoped selector — so the fixture must contain exactly one `<tbody>`.

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/table-render.test.js`:

```js
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
```

- [ ] **Step 2: Run it to see it pass against the current code**

```bash
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/table-render.test.js
```

Expected: `Test Files  1 passed (1)` / `Tests  10 passed (10)`

This is a characterisation test of code that already exists, so a green first run is the correct outcome — there is no implementation step to follow it. If a case fails, the numbers above drifted with the data; re-derive them from the real render before editing the assertion, and never "fix" a failure by loosening the assertion to something that cannot fail.

- [ ] **Step 3: Prove the test can actually fail**

A characterisation test that never fails is worthless. Verify the net is live by temporarily breaking the source:

```bash
sed -i '' 's/GPU_DATA.forEach((row) => {/GPU_DATA.slice(1).forEach((row) => {/' \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table.js
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/table-render.test.js
```

Expected: multiple FAILs, including `expected length 46 to be 47`.

Then restore the file exactly:

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference checkout -- src/scripts/table.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --short src/scripts/table.js
```

Expected: the second command prints nothing (the file is clean again).

- [ ] **Step 4: Run the whole suite**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
```

Expected: `Test Files  6 passed (6)` / `Tests  52 passed (52)`

- [ ] **Step 5: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add tests/table-render.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
test: 比較表の DOM 描画テストを追加

renderTable が GPU_DATA 47 件を 47 行に描画すること、rowspan による世代・GPU・
EC2 の結合、GPU データシートリンクと NEW バッジ、setupHover のホバー class 付与を
jsdom で検証する。表エンジン移行（PR 3）の回帰ネットとして使う。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

Expected: `1 file changed`.

---

### Task 4: テーマ切替の現状動作テスト

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/theme.test.js`
- Read only (do not modify): `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/theme.js`

**Interfaces:**
- Consumes: from `src/scripts/theme.js` — `getTheme(): "light" | "dark"`, `setTheme(theme: "light" | "dark"): void`, `initTheme(): void`, `setupThemeToggle(): void`. All four take/return exactly these; none of them are async.
- Produces: nothing importable. Spec §9 lists `tests/theme.test.js` as covering the `prefers-color-scheme` / localStorage priority — **that priority rule is introduced in PR 3** (spec §6.2). This task writes only the behaviour that exists today, in the same file, so PR 3 extends it rather than creating it.

**Context the implementer needs:**

- The localStorage key is `"gpu-ref-theme"` (a module-level constant in `theme.js`, not exported).
- `setTheme(theme)` does two things: `document.documentElement.setAttribute("data-theme", theme)` and `localStorage.setItem("gpu-ref-theme", theme)`. It does not validate its argument.
- `getTheme()` returns the stored value only if it is exactly `"light"` or `"dark"`; anything else falls through to `window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"`.
- **`window.matchMedia` does not exist in this jsdom environment.** Verified by running it: `TypeError: window.matchMedia is not a function`. So any test that reaches the fallback branch **must** stub it first, or `getTheme()` throws. This is the single biggest gotcha in this task.
- `setupThemeToggle()` looks up `document.getElementById("theme-toggle")` and returns early if absent. Its click handler reads the **current `data-theme` attribute**, not localStorage, and flips it. The icon it writes is `☀️` (`☀️`) when the current theme is dark and `🌙` (`🌙`) otherwise; `btn.title` is `"Light mode"` / `"Dark mode"` correspondingly. (Spec §6.3 removes the emoji in PR 3 — do not pre-empt that here.)
- `document.documentElement` is shared across tests in a file, so the `data-theme` attribute must be removed in `beforeEach` or cases leak into each other.

- [ ] **Step 1: Write the failing test**

Create `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/theme.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTheme, setTheme, initTheme, setupThemeToggle } from "../src/scripts/theme.js";

const STORAGE_KEY = "gpu-ref-theme";

/**
 * jsdom は window.matchMedia を実装していない（実行して確認済み）。
 * getTheme() の prefers-color-scheme フォールバックに入るケースでは必須。
 */
function stubMatchMedia(matches) {
  const impl = vi.fn((query) => ({
    matches,
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

describe("getTheme", () => {
  it("returns the saved theme from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    expect(getTheme()).toBe("light");

    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
  });

  it("does not consult matchMedia when a valid theme is saved", () => {
    const mm = stubMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, "dark");
    expect(getTheme()).toBe("dark");
    expect(mm).not.toHaveBeenCalled();
  });

  it("ignores a stored value that is not light or dark", () => {
    stubMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, "sepia");
    expect(getTheme()).toBe("dark");
  });

  it("falls back to dark when nothing is saved", () => {
    stubMatchMedia(false);
    expect(getTheme()).toBe("dark");
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
  it("applies the saved theme to the document", () => {
    localStorage.setItem(STORAGE_KEY, "light");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

describe("setupThemeToggle", () => {
  function mountButton() {
    document.body.innerHTML = '<button id="theme-toggle"></button>';
    return document.getElementById("theme-toggle");
  }

  it("does nothing when the button is absent", () => {
    expect(() => setupThemeToggle()).not.toThrow();
  });

  it("labels the button for the current theme on setup", () => {
    setTheme("dark");
    const btn = mountButton();
    setupThemeToggle();
    expect(btn.textContent).toBe("☀️");
    expect(btn.title).toBe("Light mode");
  });

  it("flips dark to light on click and persists it", () => {
    setTheme("dark");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
    expect(btn.textContent).toBe("🌙");
    expect(btn.title).toBe("Dark mode");
  });

  it("flips light back to dark on a second click", () => {
    setTheme("light");
    const btn = mountButton();
    setupThemeToggle();

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    btn.dispatchEvent(new Event("click"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("light");
  });
});
```

- [ ] **Step 2: Run it to see it pass against the current code**

```bash
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/theme.test.js
```

Expected: `Test Files  1 passed (1)` / `Tests  11 passed (11)`

Like Task 3 this characterises existing code, so a green first run is correct. If `TypeError: window.matchMedia is not a function` appears, a case reached the fallback branch without calling `stubMatchMedia` — add the stub, do not change `theme.js`.

- [ ] **Step 3: Prove the test can actually fail**

```bash
sed -i '' 's/localStorage.setItem(STORAGE_KEY, theme);/\/\/ localStorage.setItem(STORAGE_KEY, theme);/' \
  /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/theme.js
npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run \
  --root /Users/koyakimu/workspace/personal/aws-gpu-quick-reference tests/theme.test.js
```

Expected: FAILs in `persists the theme to localStorage` and `flips dark to light on click and persists it`, with `expected null to be 'light'`.

Restore:

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference checkout -- src/scripts/theme.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --short src/scripts/theme.js
```

Expected: the second command prints nothing.

- [ ] **Step 4: Run the whole suite and the build**

```bash
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test
npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build
```

Expected: `Test Files  7 passed (7)` / `Tests  63 passed (63)`, then `✓ built in ...`.

Seven files is the target set: the 4 originals plus `i18n-keys`, `table-render`, `theme`. If it reports fewer, a new file is not being discovered — revisit Task 1 Step 8.

- [ ] **Step 5: Confirm nothing outside the intended files changed**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status --short
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference diff --stat main...HEAD
```

Expected: `status --short` shows only `?? tests/theme.test.js` (plus `dist/` if it is untracked). The branch diff against `main` must list exactly: `package.json`, `package-lock.json`, `vite.config.js`, `src/i18n/en.js`, `src/i18n/ko.js`, `tests/i18n-keys.test.js`, `tests/table-render.test.js`. No `src/scripts/*` file may appear — if one does, a Step 3 sabotage was not restored.

- [ ] **Step 6: Commit**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add tests/theme.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'EOF'
test: テーマ切替の現状動作テストを追加

localStorage への保存と data-theme 属性の付与、切替ボタンのクリックによる反転を
検証する。prefers-color-scheme の優先順位はデザイン刷新（PR 3）で追加する。
jsdom は window.matchMedia を持たないため、フォールバック分岐はスタブする。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
EOF
)"
```

Expected: `1 file changed`.

---

## Done criteria

- `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test` → 7 files, 63 tests, all passing
- `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build` → `dist/index.html` written, no `%BUILD_DATE%` left in it
- `git -C <repo> diff --stat main...HEAD` lists exactly the 7 files named in the File Structure table
- Four commits on `chore/foundation`, each with both trailer lines
- Nothing pushed, no PR opened, nothing uploaded anywhere

## Out of scope — do not do these in this PR

Named here so an executor does not drift into them while "finishing the foundation":

- `data/instances.json` and the `GPU_DATA` reshape, numeric prices, `gpuKey`, `unit`, `addedAt` (spec §4.1 → PR 2)
- On-Demand price re-fetch, `scripts/update-od-pricing.mjs`, `pricingAsOf` build-time injection (spec §8 → PR 2)
- `src/styles/tokens.css`, retiring `light-theme.css`, `prefers-color-scheme`-first theming, tabs, `table-engine.js` (spec §5, §6 → PR 3)
- `data/regions.json`, `scripts/update-regions.mjs`, `update-regions.yml` (spec §7 → PR 4)
- `data/gpu-features.json` and the features matrix (spec §4.3 → PR 5)
- Fixing the `convertToJpy` / KRW label mismatch noted in Task 2 Step 3
- `.superpowers/` gitignore — already committed in `d606182`
