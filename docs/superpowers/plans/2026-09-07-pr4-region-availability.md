# PR 4: リージョン提供有無 (feat/region-availability) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AWS 全リージョンでの GPU インスタンス提供有無 (On-Demand / Capacity Blocks) を週次で自動生成し、Regions タブと Compare のリージョンフィルタで見せる。

**Architecture:** 取得は `scripts/lib/regions.mjs` の純関数 (行ストリーム走査・合成・並び順) と `scripts/update-regions.mjs` の CLI (fetch と fs) に分ける。既存の `scripts/lib/od-pricing.mjs` と同じ「純関数はテスト、IO は CLI」の形。表示側は既存の `createTable` をそのまま使い、`src/scripts/regions-data.js` が `data/regions.json` を「あれば読む」形で取り込む (§10: ファイルが無くてもビルドが通る)。

**Tech Stack:** Node 22 標準 (`fetch` / `node:readline` / `node:stream`)、Vite 8 + vite-plugin-singlefile、Vitest 5 + jsdom 30。**実行時・ビルド時ともに新しい依存パッケージは足さない。**

**Spec:** `docs/superpowers/specs/2026-09-07-site-renewal-design.md` (§3 の 4 行目 = §4.2 / §5.2 / §5.3 / §7 / §9 / §10)

## Global Constraints

- 依存パッケージは増やさない (§7.2「Node 標準の `fetch` を使い、依存パッケージを増やさない」)
- 実行時依存ゼロ・単一 HTML 配布を維持する (§2)
- `data/regions.json` はスクリプト生成。手で編集しない (§4.2)
- `availability` の値は `"od"` / `"cb"` / `"both"` の 3 種。提供の無いリージョンはキー自体を書かない (§4.2)
- `regions` の並びは AWS の地理グループ順 (北米 → 南米 → 欧州 → 中東・アフリカ → アジア太平洋) に固定し、スクリプト内の定数で並べる (§4.2)
- UltraServer (`unit: "ultraserver"`) は Price List に載らないため CB フィードだけで判定する (§7.1)
- 1 リージョンの取得失敗で全体を止めない。失敗したリージョンは前回値を保持し stderr に警告、終了コード 0。全リージョン失敗のときだけ終了コード 1 (§7.1)
- `generatedAt` 以外に差分が無ければファイルを書き換えない (§7.1)
- `regions.json` が無いビルドでも Compare / Features / Calculator は動く。Regions タブは「データ未生成」表示、リージョンフィルタは出さない (§10)
- テストはネットワークを使わない。固定入力 (fixture) で検証する (§9)
- i18n キーは `ja` / `en` / `ko` の 3 辞書すべてに同じ形で足す (`tests/i18n-keys.test.js` が集合一致を検証する)
- Bash では `cd` しない。パスは常に絶対パスで書く

## 実測値 (この計画を書く際に計測したもの)

- `region_index.json` の `regions` は **106 件**。うち Local Zone (`us-east-1-dfw-1` 等) と GovCloud (`us-gov-*`) を除いた通常リージョンは **34 件** (`/^[a-z]{2}-[a-z]+-\d$/` に一致するもの)
- `index.json` の `products` セクションは `terms` より前にあり、提供有無の判定には `products` しか要らない。`terms` の行に着いた時点でストリームを打ち切れる
  - us-east-1: `products` 部分は **208 MB** (ファイル全体は約 480 MB)。ダウンロード + 走査 5.1 秒 (ローカル計測)
  - af-south-1: `products` 部分は **72 MB**。5.3 秒
- → **週次ワークフロー 1 回あたりの想定転送量は約 3〜4 GB、並列 3 で実行時間は 3〜8 分**。`terms` で打ち切らずに全体を読むと 12〜16 GB / 20〜40 分になるので、打ち切りは必須

## 前提 (この計画を書いた時点のツリー)

- タブは `compare` / `regions` / `features` の 3 つ。計算ツールは Compare パネル内の `<details id="calculator-box">` に移っており、`#panel-calculator` は無い
- `initCompareView({ rows = GPU_DATA } = {})`。NEW バッジと `now` 引数は削除済み (既存テストは `now: NOW` を渡しているが無視される)
- `src/index.html` の `#panel-regions` は placeholder の `<p>` 1 つだけ、`#region-filter` は空の `hidden` な `<div>`
- 着手前に `git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference status` と上記 3 点を確認すること。ずれていたら、この計画のコード片を現状に合わせて読み替える

## File Structure

作成:

- `scripts/lib/regions.mjs` — 純関数のみ。`scanInstanceTypes` (products セクションの行走査)、`cbAvailability` (CB フィード → リージョン集合)、`mergeAvailability` (合成)、`regionGroup` / `regionOrder` (地理グループ順)、`carryOverRegions` (失敗リージョンの前回値保持)、`sameExceptGeneratedAt` (差分判定)。fs も fetch も触らない
- `scripts/update-regions.mjs` — CLI。fetch・並列制御・fs 書き込み・警告出力
- `.github/workflows/update-regions.yml` — 週次 + 手動 + `repository_dispatch`
- `data/regions.json` — スクリプトを実際に走らせて生成する (タスク 2)
- `src/scripts/regions-data.js` — `data/regions.json` を「あれば読む」薄い層
- `src/scripts/regions-view.js` — Regions タブ
- `tests/update-regions.test.js` — タスク 1 のテスト
- `tests/regions-view.test.js` — タスク 3 のテスト

変更:

- `src/scripts/table-engine.js` — 列定義の `title` を `<th title>` に出す 1 行 (リージョン正式名のツールチップ用)
- `src/index.html` — `#panel-regions` の中身、`#region-filter` の中身
- `src/scripts/main.js` — `initRegionsView()` の呼び出し
- `src/scripts/compare-view.js` — `regionFilter` の実装、状態変更イベントの発火、リージョン選択 UI
- `src/i18n/{ja,en,ko}.js` — `regionGroups.*` / `regions.generatedAt` / `filters.allRegions`
- `tests/compare-view.test.js` — リージョンフィルタのテスト追記
- `CLAUDE.md` — リージョンデータ更新の節

## 仕様から外れる判断 (実装者はこの通りに作ること)

1. **2 段見出しは作らない (§5.3)。** `table-engine.js` の `buildHead` は `<tr>` を 1 本しか描かず、2 段化はエンジンの改修とテストの書き直しになる。代わりに (a) 地理グループ順に列を並べ、(b) グループ単位の表示切替バーをリージョン表の上に置き (`visibleColumns` / `hiddenGroups` の既存機構をそのまま使う)、(c) 各リージョン列の `<th>` に `title="US East (N. Virginia)"` を出す。グループ名は (b) のバーに出るので、地理グループは画面上で読める
2. **リージョンの表示名は Price List の `location` 属性から取る。** `region_index.json` は `regionCode` しか持たないため、`products` を走査するついでに最初に見つかった `location` を拾う。ハードコードした対訳表は持たない
3. **`availability` には全 `size` のキーを書く** (提供リージョンが 1 つも無い行は値が `{}`)。キー集合が毎回同じになり、自動更新 PR の差分が読みやすくなるため。§4.2 が禁じているのは「提供の無い**リージョン**のキー」だけ
4. **リージョン列の見出しはリージョンコードそのまま。** `createTable` は `i18n(column.labelKey)` を呼ぶが、`t()` は辞書に無いキーをそのまま返すので `labelKey: "us-east-1"` で `us-east-1` と出る (リージョンコードに `.` は含まれないので分割の副作用も無い)
5. **通常リージョンだけを対象にする。** Local Zone (`us-east-1-dfw-1` など 72 件) と GovCloud は列に出さない。表が 106 列になるのを避けるため

---

### Task 1: `scripts/lib/regions.mjs` (純関数) とそのテスト

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/lib/regions.mjs`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/update-regions.test.js`

**Interfaces:**
- Consumes: なし (このタスクが最初)
- Produces:
  - `scanInstanceTypes(lines, wantedSizes) -> Promise<{ sizes: Set<string>, location: string|null }>` — `lines` は同期/非同期どちらの行イテラブルでもよい
  - `cbAvailability(instanceTypes, wantedSizes) -> Map<string, Set<string>>` (size -> リージョンコードの集合)
  - `mergeAvailability(sizes, odByRegion, cbByRegion) -> Record<string, Record<string, "od"|"cb"|"both">>`
    - `odByRegion` / `cbByRegion` は `Map<regionCode, Set<size>>`
  - `regionGroup(code) -> "na"|"sa"|"eu"|"meaf"|"ap"|"other"`
  - `regionOrder(regions) -> {code, name}[]` (入力は変更しない)
  - `carryOverRegions(availability, previous, regionCodes) -> availability` (新しいオブジェクトを返す)
  - `sameExceptGeneratedAt(a, b) -> boolean`
  - `REGION_GROUPS: string[]` = `["na", "sa", "eu", "meaf", "ap"]`
  - `STANDARD_REGION = /^[a-z]{2}-[a-z]+-\d$/`

- [ ] **Step 1: テストを書く (失敗させる)**

`tests/update-regions.test.js` を新規作成する。

```js
import { describe, it, expect } from "vitest";
import {
  scanInstanceTypes,
  cbAvailability,
  mergeAvailability,
  regionGroup,
  regionOrder,
  carryOverRegions,
  sameExceptGeneratedAt,
  REGION_GROUPS,
  STANDARD_REGION,
} from "../scripts/lib/regions.mjs";

// AWS Price List の region index.json を切り詰めた固定入力。
// インデント幅が意味を持つのでそのまま維持すること。
// terms セクションに p5.48xlarge を置いてあるのは、products で打ち切っても
// 誤って拾わないことを確かめるため。
const FIXTURE = `{
  "formatVersion" : "v1.0",
  "offerCode" : "AmazonEC2",
  "products" : {
    "AAAAAAAAAAAAAAAA" : {
      "sku" : "AAAAAAAAAAAAAAAA",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "p5.48xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    },
    "BBBBBBBBBBBBBBBB" : {
      "sku" : "BBBBBBBBBBBBBBBB",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Windows",
        "tenancy" : "Shared"
      }
    },
    "CCCCCCCCCCCCCCCC" : {
      "sku" : "CCCCCCCCCCCCCCCC",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6e.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Dedicated"
      }
    },
    "DDDDDDDDDDDDDDDD" : {
      "sku" : "DDDDDDDDDDDDDDDD",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "m5.large",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    },
    "EEEEEEEEEEEEEEEE" : {
      "sku" : "EEEEEEEEEEEEEEEE",
      "productFamily" : "Compute Instance",
      "attributes" : {
        "instanceType" : "g6.xlarge",
        "location" : "US East (N. Virginia)",
        "operatingSystem" : "Linux",
        "tenancy" : "Shared"
      }
    }
  },
  "terms" : {
    "OnDemand" : {
      "ZZZZZZZZZZZZZZZZ" : {
        "attributes" : {
          "instanceType" : "p4d.24xlarge",
          "operatingSystem" : "Linux",
          "tenancy" : "Shared"
        }
      }
    }
  }
}`;

const WANTED = new Set(["p5.48xlarge", "g6.xlarge", "g6e.xlarge", "p4d.24xlarge"]);

// CB 価格 JSON (pricing.json) の instance_types を切り詰めたもの。
const CB_FEED = {
  "p5.48xlarge": {
    pricing: [
      { region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 3.93 },
      { region: "Asia Pacific (Tokyo)", region_code: "ap-northeast-1", accelerator_hourly_rate_usd: 4.5 },
    ],
  },
  "u-p6e-gb200x72": {
    pricing: [{ region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 12.36 }],
  },
  // region_code が欠けた行と、通常リージョンでない行は無視する
  "g6.xlarge": {
    pricing: [
      { region: "US East (Dallas)", region_code: "us-east-1-dfw-1", accelerator_hourly_rate_usd: 1.0 },
      { region: "Unknown", accelerator_hourly_rate_usd: 1.0 },
    ],
  },
  "trn2.48xlarge": {
    pricing: [{ region: "US East (N. Virginia)", region_code: "us-east-1", accelerator_hourly_rate_usd: 1.0 }],
  },
};

describe("scanInstanceTypes", () => {
  it("keeps Linux/Shared wanted sizes, drops the rest, and stops at terms", async () => {
    const { sizes, location } = await scanInstanceTypes(FIXTURE.split("\n"), WANTED);
    expect([...sizes].sort()).toEqual(["g6.xlarge", "p5.48xlarge"]);
    expect(sizes.has("p4d.24xlarge")).toBe(false); // terms にしか無い
    expect(location).toBe("US East (N. Virginia)");
  });
});

describe("cbAvailability", () => {
  it("maps wanted sizes to standard region codes from the CB feed", () => {
    const map = cbAvailability(CB_FEED, new Set([...WANTED, "u-p6e-gb200x72"]));
    expect([...map.get("p5.48xlarge")].sort()).toEqual(["ap-northeast-1", "us-east-1"]);
    expect([...map.get("u-p6e-gb200x72")]).toEqual(["us-east-1"]); // UltraServer は CB のみ
    expect(map.has("g6.xlarge")).toBe(false); // Local Zone と region_code 無しだけ
    expect(map.has("trn2.48xlarge")).toBe(false); // wantedSizes に無い
  });
});

describe("mergeAvailability", () => {
  it("labels od / cb / both and omits regions with no availability", () => {
    const od = new Map([
      ["us-east-1", new Set(["p5.48xlarge", "g6.xlarge"])],
      ["ap-northeast-1", new Set(["g6.xlarge"])],
    ]);
    const cb = new Map([
      ["us-east-1", new Set(["p5.48xlarge"])],
      ["ap-northeast-1", new Set(["p5.48xlarge"])],
    ]);
    const result = mergeAvailability(["p5.48xlarge", "g6.xlarge", "p3.2xlarge"], od, cb);
    expect(result["p5.48xlarge"]).toEqual({ "us-east-1": "both", "ap-northeast-1": "cb" });
    expect(result["g6.xlarge"]).toEqual({ "us-east-1": "od", "ap-northeast-1": "od" });
    expect(result["p3.2xlarge"]).toEqual({}); // 全リージョンで提供なし
  });
});

describe("regionOrder", () => {
  it("sorts by geographic group: NA -> SA -> EU -> ME/AF -> AP", () => {
    const input = [
      { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
      { code: "eu-west-1", name: "Europe (Ireland)" },
      { code: "us-east-1", name: "US East (N. Virginia)" },
      { code: "il-central-1", name: "Israel (Tel Aviv)" },
      { code: "sa-east-1", name: "South America (Sao Paulo)" },
      { code: "ca-central-1", name: "Canada (Central)" },
      { code: "af-south-1", name: "Africa (Cape Town)" },
    ];
    expect(regionOrder(input).map((r) => r.code)).toEqual([
      "ca-central-1",
      "us-east-1",
      "sa-east-1",
      "eu-west-1",
      "af-south-1",
      "il-central-1",
      "ap-northeast-1",
    ]);
    expect(input[0].code).toBe("ap-northeast-1"); // 入力は変更しない
    expect(REGION_GROUPS).toEqual(["na", "sa", "eu", "meaf", "ap"]);
    expect(regionGroup("mx-central-1")).toBe("na");
    expect(regionGroup("me-central-1")).toBe("meaf");
    expect(STANDARD_REGION.test("us-east-1-dfw-1")).toBe(false);
  });
});

describe("carryOverRegions and sameExceptGeneratedAt", () => {
  it("restores failed regions from the previous file and detects real changes", () => {
    const previous = {
      generatedAt: "2026-09-01T00:00:00Z",
      regions: [{ code: "us-east-1", name: "US East (N. Virginia)" }],
      availability: { "p5.48xlarge": { "us-east-1": "both", "eu-west-1": "od" } },
    };
    const fresh = { "p5.48xlarge": { "us-east-1": "od" } };
    const restored = carryOverRegions(fresh, previous.availability, ["eu-west-1"]);
    expect(restored["p5.48xlarge"]).toEqual({ "us-east-1": "od", "eu-west-1": "od" });

    const next = { generatedAt: "2026-09-08T00:00:00Z", regions: previous.regions, availability: previous.availability };
    expect(sameExceptGeneratedAt(next, previous)).toBe(true);
    expect(sameExceptGeneratedAt({ ...next, availability: fresh }, previous)).toBe(false);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run tests/update-regions.test.js`
(または `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test -- tests/update-regions.test.js`)
Expected: FAIL —「Failed to load .../scripts/lib/regions.mjs」

- [ ] **Step 3: `scripts/lib/regions.mjs` を実装**

```js
// リージョン提供有無データの純関数。ネットワークにも fs にも触らない。
// IO は scripts/update-regions.mjs 側が持つ。

// index.json は 2 スペースインデントで整形されている。1 リージョン 480MB あり
// JSON.parse できないため行単位で走査する (od-pricing.mjs と同じ方針)。
const SECTION = /^ {2}"(products|terms)" : \{$/;
const PRODUCT_START = /^ {4}"[A-Z0-9]+" : \{$/;
const PRODUCT_END = /^ {4}\},?$/;
const ATTRIBUTE = /^ {8}"([A-Za-z]+)" : "(.*?)",?$/;

// Local Zone (us-east-1-dfw-1) や GovCloud を除いた通常リージョンだけを対象にする。
// region_index.json は 106 件返すが、そのうち 34 件がこれに一致する。
export const STANDARD_REGION = /^[a-z]{2}-[a-z]+-\d$/;

// 地理グループ順 (仕様 4.2): 北米 -> 南米 -> 欧州 -> 中東・アフリカ -> アジア太平洋
export const REGION_GROUPS = ["na", "sa", "eu", "meaf", "ap"];

const GROUP_PREFIXES = [
  ["na", ["us-", "ca-", "mx-"]],
  ["sa", ["sa-"]],
  ["eu", ["eu-"]],
  ["meaf", ["me-", "il-", "af-"]],
  ["ap", ["ap-"]],
];

export function regionGroup(code) {
  for (const [group, prefixes] of GROUP_PREFIXES) {
    if (prefixes.some((prefix) => code.startsWith(prefix))) return group;
  }
  return "other";
}

// 並べ替えた新しい配列を返す。入力は変更しない。
// グループ内はコードの辞書順。未知の接頭辞は末尾へ。
export function regionOrder(regions) {
  const rank = (code) => {
    const index = REGION_GROUPS.indexOf(regionGroup(code));
    return index === -1 ? REGION_GROUPS.length : index;
  };
  return regions
    .slice()
    .sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}

// index.json の products セクションだけを読み、wantedSizes のうち
// Linux / Shared で提供されているものを返す (仕様 7.1)。
// products は terms より前にあるので、terms に着いたら打ち切る。
// 呼び出し側がストリームを渡していれば、この break でダウンロードも止まる
// (480MB のうち products は 200MB 程度で、残りを読まずに済む)。
// location はリージョンの表示名 (例 "US East (N. Virginia)") として使う。
export async function scanInstanceTypes(lines, wantedSizes) {
  const sizes = new Set();
  let location = null;
  let section = null;
  let attributes = null;

  for await (const line of lines) {
    const sectionMatch = SECTION.exec(line);
    if (sectionMatch) {
      if (sectionMatch[1] === "terms") break;
      section = "products";
      attributes = null;
      continue;
    }
    if (section !== "products") continue;

    if (PRODUCT_START.test(line)) {
      attributes = {};
      continue;
    }
    if (attributes == null) continue;

    const attribute = ATTRIBUTE.exec(line);
    if (attribute) {
      attributes[attribute[1]] = attribute[2];
      continue;
    }
    if (PRODUCT_END.test(line)) {
      if (location == null && attributes.location) location = attributes.location;
      if (
        attributes.operatingSystem === "Linux" &&
        attributes.tenancy === "Shared" &&
        wantedSizes.has(attributes.instanceType)
      ) {
        sizes.add(attributes.instanceType);
      }
      attributes = null;
    }
  }

  return { sizes, location };
}

// CB 価格 JSON の instance_types から size -> リージョンコード集合を作る。
// region_code を持たないエントリと通常リージョン以外は捨てる。
export function cbAvailability(instanceTypes, wantedSizes) {
  const map = new Map();
  for (const [size, info] of Object.entries(instanceTypes)) {
    if (!wantedSizes.has(size)) continue;
    const codes = new Set();
    for (const entry of info?.pricing ?? []) {
      const code = entry?.region_code;
      if (typeof code === "string" && STANDARD_REGION.test(code)) codes.add(code);
    }
    if (codes.size > 0) map.set(size, codes);
  }
  return map;
}

// 仕様 4.2 の availability マップを作る。
// odByRegion / cbByRegion は Map<regionCode, Set<size>>。
// 提供の無いリージョンはキー自体を書かない。
export function mergeAvailability(sizes, odByRegion, cbByRegion) {
  const availability = {};
  for (const size of sizes) {
    const perRegion = {};
    for (const [region, present] of odByRegion) {
      if (present.has(size)) perRegion[region] = "od";
    }
    for (const [region, present] of cbByRegion) {
      if (!present.has(size)) continue;
      perRegion[region] = perRegion[region] === "od" ? "both" : "cb";
    }
    availability[size] = perRegion;
  }
  return availability;
}

// 取得に失敗したリージョンの値を前回ファイルから戻す (仕様 7.1)。
// 新しいオブジェクトを返す。前回に無かった size は素通し。
export function carryOverRegions(availability, previous, regionCodes) {
  const failed = new Set(regionCodes);
  const result = {};
  for (const [size, perRegion] of Object.entries(availability)) {
    const next = { ...perRegion };
    for (const region of failed) {
      const value = previous?.[size]?.[region];
      if (value != null) next[region] = value;
    }
    result[size] = next;
  }
  return result;
}

// generatedAt だけが違うなら「変化なし」。書き換えを避けるための判定 (仕様 7.1)。
export function sameExceptGeneratedAt(a, b) {
  if (!a || !b) return false;
  const strip = (file) => JSON.stringify({ regions: file.regions, availability: file.availability });
  return strip(a) === strip(b);
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run tests/update-regions.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: コミット**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add scripts/lib/regions.mjs tests/update-regions.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'MSG'
feat: リージョン提供有無の合成ロジックを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
MSG
)"
```

---

### Task 2: 取得スクリプト・ワークフロー・初回 `data/regions.json`

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-regions.mjs`
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/.github/workflows/update-regions.yml`
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/regions.json` (スクリプトを実行して生成)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/CLAUDE.md` (「データ更新」節の末尾に追記)

**Interfaces:**
- Consumes: Task 1 の `scanInstanceTypes` / `cbAvailability` / `mergeAvailability` / `regionOrder` / `carryOverRegions` / `sameExceptGeneratedAt` / `STANDARD_REGION`、既存の `scripts/lib/instances-file.mjs` の `readInstances`
- Produces: `data/regions.json` (§4.2 の形)。Task 3 / 4 がこれを読む

このタスクにテストは足さない。純粋なロジックは Task 1 で覆っており、残りは fetch と fs だけのため。

- [ ] **Step 1: `scripts/update-regions.mjs` を書く**

```js
// AWS Price List と CB 価格 JSON から、全リージョンの提供有無を取得して
// data/regions.json を更新する (仕様 7.1)。
//   node scripts/update-regions.mjs
//   node scripts/update-regions.mjs --dry-run
//
// 各リージョンの index.json は 480MB あるが、判定に要る products セクションは
// ファイルの前半 (us-east-1 で約 200MB) にある。terms に着いた時点で
// ストリームを閉じるので、1 リージョンあたりの実転送量はその範囲に収まる。
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { readInstances } from "./lib/instances-file.mjs";
import {
  scanInstanceTypes,
  cbAvailability,
  mergeAvailability,
  regionOrder,
  carryOverRegions,
  sameExceptGeneratedAt,
  STANDARD_REGION,
} from "./lib/regions.mjs";

const BASE = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current";
const CB_URL =
  "https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json";
const REGIONS_PATH = new URL("../data/regions.json", import.meta.url);
const CONCURRENCY = 3;

const dryRun = process.argv.includes("--dry-run");

function warn(message) {
  process.stderr.write(`warning: ${message}\n`);
}

function readPrevious() {
  try {
    return JSON.parse(readFileSync(REGIONS_PATH, "utf8"));
  } catch {
    return null; // 初回はファイルが無い
  }
}

// 1 レコード 1 行で書き出す。自動更新のコミット差分を読める形に保つため。
function serialize(file) {
  const regions = file.regions.map((region) => "    " + JSON.stringify(region)).join(",\n");
  const availability = Object.entries(file.availability)
    .map(([size, perRegion]) => `    ${JSON.stringify(size)}: ${JSON.stringify(perRegion)}`)
    .join(",\n");
  return `{
  "generatedAt": ${JSON.stringify(file.generatedAt)},
  "regions": [
${regions}
  ],
  "availability": {
${availability}
  }
}
`;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function scanRegion(code, wantedSizes) {
  const url = `${BASE}/${code}/index.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  try {
    return await scanInstanceTypes(rl, wantedSizes);
  } finally {
    rl.close(); // terms で打ち切ったときに残りのダウンロードを止める
  }
}

const file = readInstances();
const allSizes = file.instances.map((row) => row.size);
// UltraServer は Price List に載らないので On-Demand の走査対象から外す (仕様 7.1)。
const odSizes = new Set(file.instances.filter((row) => row.unit !== "ultraserver").map((row) => row.size));

const regionIndex = await fetchJson(`${BASE}/region_index.json`);
const codes = Object.keys(regionIndex.regions).filter((code) => STANDARD_REGION.test(code)).sort();
process.stderr.write(`scanning ${codes.length} regions (concurrency ${CONCURRENCY})\n`);

const previous = readPrevious();
const previousNames = new Map((previous?.regions ?? []).map((region) => [region.code, region.name]));

const odByRegion = new Map();
const names = new Map();
const failed = [];

await mapWithConcurrency(codes, CONCURRENCY, async (code) => {
  try {
    const { sizes, location } = await scanRegion(code, odSizes);
    odByRegion.set(code, sizes);
    names.set(code, location ?? previousNames.get(code) ?? code);
    process.stderr.write(`  ${code}: ${sizes.size} sizes\n`);
  } catch (error) {
    failed.push(code);
    names.set(code, previousNames.get(code) ?? code);
    warn(`${code}: ${error.message}; keeping previous values`);
  }
});

if (failed.length === codes.length) {
  process.stderr.write("error: every region failed; aborting without writing\n");
  process.exit(1);
}

const cbFeed = await fetchJson(CB_URL);
const cbBySize = cbAvailability(cbFeed.instance_types ?? {}, new Set(allSizes));
// mergeAvailability は Map<region, Set<size>> を取るので向きを入れ替える。
const cbByRegion = new Map();
for (const [size, regions] of cbBySize) {
  for (const region of regions) {
    if (!cbByRegion.has(region)) cbByRegion.set(region, new Set());
    cbByRegion.get(region).add(size);
  }
}

const merged = mergeAvailability(allSizes, odByRegion, cbByRegion);
const availability = failed.length ? carryOverRegions(merged, previous?.availability, failed) : merged;

// 列に出すのは、どこかの size が提供されているリージョンだけ。
const used = new Set();
for (const perRegion of Object.values(availability)) {
  for (const region of Object.keys(perRegion)) used.add(region);
}
const regions = regionOrder(
  [...used].filter((code) => STANDARD_REGION.test(code)).map((code) => ({ code, name: names.get(code) ?? code })),
);

const next = { generatedAt: new Date().toISOString(), regions, availability };

if (sameExceptGeneratedAt(next, previous)) {
  console.log("Region availability is up to date.");
} else if (dryRun) {
  console.log(`Would write ${regions.length} regions for ${allSizes.length} instance sizes.`);
} else {
  writeFileSync(REGIONS_PATH, serialize(next));
  console.log(`Wrote data/regions.json: ${regions.length} regions, ${allSizes.length} instance sizes.`);
}
```

- [ ] **Step 2: `--dry-run` で動かして形を確認する**

Run: `node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-regions.mjs --dry-run`

**このコマンドはネットワークを使う。サンドボックス内では通信が拒否されるので、`<sandbox_violations>` や "Operation not permitted" が出たら `dangerouslyDisableSandbox: true` で即座に再実行すること。**

Expected: `scanning 34 regions (concurrency 3)` に続いて 34 行の `  <code>: N sizes`、最後に `Would write NN regions for 71 instance sizes.`。所要 3〜8 分、転送量 3〜4 GB。

- [ ] **Step 3: 本番実行して `data/regions.json` を生成する**

Run: `node /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/scripts/update-regions.mjs`
(同じくサンドボックス無効で実行する)
Expected: `Wrote data/regions.json: NN regions, 71 instance sizes.`

生成後に目視で確かめること:
- `head -5 /Users/koyakimu/workspace/personal/aws-gpu-quick-reference/data/regions.json` の `regions` 先頭が北米 (`ca-central-1` か `us-*`) になっている
- `grep -c '"p5.48xlarge"' ...` が 1 で、その行に `"us-east-1":"both"` 相当の値が入っている
- UltraServer 行 (`u-p6e-gb200x72`) に少なくとも 1 つ `"cb"` が付いている

- [ ] **Step 4: `.github/workflows/update-regions.yml` を書く**

```yaml
name: Update Region Availability

on:
  schedule:
    # 毎週月曜 18:00 JST (09:00 UTC)
    - cron: "0 9 * * 1"
  workflow_dispatch:
  repository_dispatch:
    types: [cb-pricing-updated]

permissions:
  contents: write
  actions: write

concurrency:
  group: update-regions
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    # 34 リージョン x 約 100MB (products セクションのみ) を並列 3 で読む。
    # 実測ベースの見込みは転送量 3〜4GB / 3〜8 分。詰まったときのために余裕を持たせる。
    timeout-minutes: 45
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Update region availability from the AWS Price List
        run: node scripts/update-regions.mjs

      - name: Commit and deploy if changed
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          if git diff --quiet; then
            echo "No availability changes."
            exit 0
          fi
          npm ci
          npm test
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add data/regions.json
          git commit -m "chore: リージョン提供状況を自動更新"
          git push
          # GITHUB_TOKEN の push では deploy.yml が発火しないため明示的に起動する
          gh workflow run deploy.yml --ref main
```

- [ ] **Step 5: `CLAUDE.md` に節を足す**

`## データ更新` の `#### CB (Capacity Blocks) 価格更新` の節の直後に、次を追記する。

```markdown
#### リージョン提供有無 (data/regions.json)

`data/regions.json` は `scripts/update-regions.mjs` が生成する。**手で編集しない。**

- AWS Price List の `region_index.json` から通常リージョン (Local Zone と GovCloud を除く 34 件) を取り、各リージョンの `index.json` の `products` セクションをストリームで走査して Linux / Shared の提供有無を判定する
- Capacity Blocks 側は CB 価格 JSON の `instance_types.<size>.pricing[].region_code` から取る。UltraServer は Price List に載らないため CB のみで判定する
- `products` は `terms` より前にあるので、`terms` に着いた時点でストリームを閉じる。これがないと 1 リージョン 480MB を丸ごと落とすことになる (実測: us-east-1 の `products` は 208MB、af-south-1 は 72MB)
- 1 リージョンの取得失敗では止まらない。そのリージョンは前回値を保持して警告のみ。全リージョン失敗のときだけ終了コード 1

**自動化済み**: `.github/workflows/update-regions.yml` が毎週月曜 18:00 JST と `workflow_dispatch` / `repository_dispatch`（`cb-pricing-updated`）で実行し、差分があれば main にコミットして deploy を起動する。1 回あたりの転送量は約 3〜4GB、実行時間は 3〜8 分。手動実行は `gh workflow run update-regions.yml` または `node scripts/update-regions.mjs`（`--dry-run` で書き込みなし）。
```

- [ ] **Step 6: 既存テストが壊れていないことを確認**

Run: `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test`
Expected: 全 PASS

- [ ] **Step 7: コミット**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add scripts/update-regions.mjs .github/workflows/update-regions.yml data/regions.json CLAUDE.md
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'MSG'
feat: リージョン提供有無の取得スクリプトと週次ワークフローを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
MSG
)"
```

---

### Task 3: Regions タブ

**Files:**
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/regions-data.js`
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/regions-view.js`
- Create: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/regions-view.test.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/table-engine.js` (`buildHead` に 1 行)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/index.html` (`#panel-regions`)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/main.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/compare-view.js` (状態変更イベントの発火)
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/{ja,en,ko}.js`

**Interfaces:**
- Consumes: Task 2 の `data/regions.json`、既存の `createTable` / `GPU_DATA` / `t` / `loadState` / `filterRows`
- Produces:
  - `src/scripts/regions-data.js`: `REGIONS_FILE` (`{generatedAt, regions, availability}` または `null`)
  - `src/scripts/regions-view.js`: `availabilityColumns(regions)`、`initRegionsView({ rows, file })`
  - `compare-view.js`: `COMPARE_STATE_EVENT = "compare-state-changed"` を export し、状態変更のたびに `document` へ `{ detail: { state } }` で発火する

- [ ] **Step 1: テストを書く (失敗させる)**

`tests/regions-view.test.js` を新規作成する。

```js
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

  it("shows the placeholder and no table when regions.json is absent", () => {
    initRegionsView({ rows: ROWS, file: null });
    expect(document.getElementById("regions-missing").hidden).toBe(false);
    expect(document.querySelector("#regions-table table")).toBe(null);
    expect(document.getElementById("regions-generated").textContent).toBe("");
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run tests/regions-view.test.js`
Expected: FAIL —「Failed to load .../src/scripts/regions-view.js」

- [ ] **Step 3: `table-engine.js` に `title` の 1 行を足す**

`buildHead` の中、`if (column.width) th.style.width = column.width;` の直後に足す。

```js
    // リージョン列のようにラベルが略記の列は、正式名をツールチップに出す。
    if (column.title) th.title = column.title;
```

- [ ] **Step 4: `src/scripts/regions-data.js` を書く**

```js
// data/regions.json は scripts/update-regions.mjs が生成する。生成前でもビルドが
// 通るよう、静的 import ではなく import.meta.glob で「あれば読む」形にする (仕様 10)。
// glob はビルド時に解決され、ファイルが無ければ空のオブジェクトになる。
const modules = import.meta.glob("../../data/regions*.json", { eager: true, import: "default" });

const entry = Object.entries(modules).find(([path]) => path.endsWith("/regions.json"));

export const REGIONS_FILE = entry ? entry[1] : null;
```

- [ ] **Step 5: `src/scripts/regions-view.js` を書く**

```js
// Regions タブ (仕様 5.3)。行 = インスタンス、列 = リージョン。
// 描画は table-engine.js に任せ、ここは列の組み立てと状態の受け取りだけを持つ。
//
// 仕様の 2 段見出し (地理グループを上段に) は table-engine が 1 段しか描けないため
// 見送った。代わりに列を地理グループ順に並べ、グループ単位の表示切替バーを表の上に
// 置き、各列の <th> に正式名のツールチップを出している。
import { createTable } from "./table-engine.js";
import { GPU_DATA } from "./gpu-data.js";
import { REGIONS_FILE } from "./regions-data.js";
import { loadState, filterRows, COMPARE_STATE_EVENT } from "./compare-view.js";
import { t } from "./i18n.js";

// scripts/lib/regions.mjs の regionGroup と同じ対応表。表示側は Node のスクリプトを
// import できないので、5 行だけ写している。増やすときは両方直すこと。
const GROUP_PREFIXES = [
  ["na", ["us-", "ca-", "mx-"]],
  ["sa", ["sa-"]],
  ["eu", ["eu-"]],
  ["meaf", ["me-", "il-", "af-"]],
  ["ap", ["ap-"]],
];

export function regionGroup(code) {
  for (const [group, prefixes] of GROUP_PREFIXES) {
    if (prefixes.some((prefix) => code.startsWith(prefix))) return group;
  }
  return "other";
}

// regions.json の並び (地理グループ順) をそのまま列の並びにする。
export function availabilityColumns(regions) {
  return regions.map((region) => ({
    key: region.code,
    group: regionGroup(region.code),
    labelKey: region.code, // t() は辞書に無いキーをそのまま返すのでコードが出る
    title: region.name,
    type: "availability",
  }));
}

function uniqueGroups(columns) {
  const seen = [];
  for (const column of columns) {
    if (!seen.includes(column.group)) seen.push(column.group);
  }
  return seen;
}

export function initRegionsView({ rows = GPU_DATA, file = REGIONS_FILE } = {}) {
  const mount = document.getElementById("regions-table");
  const missing = document.getElementById("regions-missing");
  const generated = document.getElementById("regions-generated");
  const groupBox = document.getElementById("region-groups");
  if (!mount) return { update() {} };

  // 仕様 10: データが無ければ「未生成」の表示にして表は出さない。
  if (!file) {
    mount.replaceChildren();
    if (groupBox) groupBox.replaceChildren();
    if (missing) missing.hidden = false;
    if (generated) generated.textContent = "";
    return { update() {} };
  }
  if (missing) missing.hidden = true;

  const columns = [
    { key: "size", group: "instance", labelKey: "table.instanceSize", type: "text", sticky: true, mono: true },
    ...availabilityColumns(file.regions),
  ];

  // 行は Compare と同じ世代・ファミリのフィルタを共有する (仕様 5.3)。
  // Compare が状態を変えるたびにイベントで飛んでくるので、それを持ち回る。
  let state = { ...loadState(), sortKey: null, sortDir: null, hiddenGroups: [] };

  // 表に渡すのは、行のフィルタ (Compare の state) と列の表示切替 (このタブ独自の
  // hiddenGroups) を混ぜたもの。行のフィルタに hiddenGroups は関係しない。
  let hiddenGroups = [];

  function tableState() {
    return { sortKey: state.sortKey, sortDir: state.sortDir, hiddenGroups };
  }

  const table = createTable({
    columns,
    rows: filterRows(rows, state),
    state: tableState(),
    onStateChange(next) {
      state.sortKey = next.sortKey;
      state.sortDir = next.sortDir;
      update();
    },
    i18n: t,
  });

  mount.replaceChildren(table.el);

  function update() {
    table.update(filterRows(rows, state), tableState());
    if (generated) {
      generated.textContent = t("regions.generatedAt").replace("{date}", file.generatedAt);
    }
  }

  function buildGroupToggles() {
    if (!groupBox) return;
    const fragment = document.createDocumentFragment();
    for (const group of uniqueGroups(columns.slice(1))) {
      const on = !hiddenGroups.includes(group);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ctl";
      btn.dataset.group = group;
      btn.textContent = t(`regionGroups.${group}`);
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("on", on);
      fragment.appendChild(btn);
    }
    groupBox.replaceChildren(fragment);
  }

  if (groupBox) {
    groupBox.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-group]");
      if (!btn) return;
      const group = btn.dataset.group;
      const index = hiddenGroups.indexOf(group);
      if (index === -1) hiddenGroups.push(group);
      else hiddenGroups.splice(index, 1);
      const on = !hiddenGroups.includes(group);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
      update();
    });
  }

  // Compare 側のフィルタ変更に追随する (仕様 5.3: state を共有)。
  document.addEventListener(COMPARE_STATE_EVENT, (event) => {
    const next = event.detail?.state;
    if (!next) return;
    state = { ...state, generations: next.generations, families: next.families, region: next.region };
    update();
  });

  document.addEventListener("lang-changed", () => {
    buildGroupToggles();
    update();
  });

  buildGroupToggles();
  update();

  return { update };
}
```

- [ ] **Step 6: `compare-view.js` に状態変更イベントを足す**

`STORAGE_KEY` の定義の下に export を足す。

```js
// Regions タブが世代・ファミリのフィルタを共有するためのイベント (仕様 5.3)。
export const COMPARE_STATE_EVENT = "compare-state-changed";
```

`initCompareView` の中、`function update() {` の直前に足す。

```js
  function notifyStateChanged() {
    document.dispatchEvent(new CustomEvent(COMPARE_STATE_EVENT, { detail: { state } }));
  }
```

そして 3 つのフィルタのハンドラで `update();` の直前に `notifyStateChanged();` を呼ぶ (世代 `genBox`、ファミリ `familyBox`、列 `columnBox`)。列は Regions の行に影響しないが、1 つのイベントで揃えておく方が読みやすい。

- [ ] **Step 7: `src/index.html` の `#panel-regions` を書き換える**

```html
      <section class="panel" id="panel-regions" role="tabpanel" hidden>
        <div class="bar">
          <div class="filter-group" id="region-groups"></div>
        </div>

        <div id="regions-table"></div>

        <p class="placeholder" id="regions-missing" data-i18n="placeholders.regionsMissing" hidden>
          リージョン提供状況のデータはまだ生成されていません。
        </p>
        <p class="note mono" id="regions-generated"></p>
      </section>
```

- [ ] **Step 8: `src/scripts/main.js` に初期化を足す**

`import { initCompareView } from "./compare-view.js";` の下に:

```js
import { initRegionsView } from "./regions-view.js";
```

`initCompareView();` の下に:

```js
  initRegionsView();
```

- [ ] **Step 9: i18n キーを 3 辞書に足す**

`ja.js` の `placeholders` ブロックの直前に:

```js
  regionGroups: {
    na: "北米",
    sa: "南米",
    eu: "欧州",
    meaf: "中東・アフリカ",
    ap: "アジア太平洋",
  },
  regions: {
    generatedAt: "データ生成: {date}",
  },
```

`en.js` の同じ位置に:

```js
  regionGroups: {
    na: "North America",
    sa: "South America",
    eu: "Europe",
    meaf: "Middle East & Africa",
    ap: "Asia Pacific",
  },
  regions: {
    generatedAt: "Generated: {date}",
  },
```

`ko.js` の同じ位置に:

```js
  regionGroups: {
    na: "북미",
    sa: "남미",
    eu: "유럽",
    meaf: "중동·아프리카",
    ap: "아시아 태평양",
  },
  regions: {
    generatedAt: "데이터 생성: {date}",
  },
```

- [ ] **Step 10: テストを実行**

Run: `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test`
Expected: 全 PASS (`tests/regions-view.test.js` の 3 件と `tests/i18n-keys.test.js` を含む)

- [ ] **Step 11: ビルドが通ることを確認**

Run: `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build`
Expected: `dist/index.html` が出る。エラーなし

- [ ] **Step 12: コミット**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src tests/regions-view.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'MSG'
feat: Regions タブでリージョン別の提供状況を表示

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
MSG
)"
```

---

### Task 4: Compare のリージョンフィルタ (§5.2)

**Files:**
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/scripts/compare-view.js`
- Modify: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/src/i18n/{ja,en,ko}.js`
- Test: `/Users/koyakimu/workspace/personal/aws-gpu-quick-reference/tests/compare-view.test.js` (追記)

**Interfaces:**
- Consumes: Task 3 の `REGIONS_FILE`、既存の `regionFilter` (今は素通しのスタブ)
- Produces: `regionFilter(rows, region, file)` の実装。`#region-filter` の中に `#region-select` を作る

- [ ] **Step 1: テストを書く (失敗させる)**

まず、この PR で不要になる既存テストを **削除**する (`tests/compare-view.test.js`):

```js
  it("keeps the region filter hidden in this PR", () => {
    initCompareView({ rows: ROWS, now: NOW });
    expect(document.getElementById("region-filter").hidden).toBe(true);
  });
```

そのうえで、`initCompareView` は既に import されているので、ファイル末尾に次の describe を足す。
(既存テストは `now: NOW` を渡しているが、現在の `initCompareView` はこの引数を無視する。
新しいテストでは渡さない。)

```js
describe("region filter", () => {
  const FILE = {
    generatedAt: "2026-09-07T09:00:00Z",
    regions: [
      { code: "us-east-1", name: "US East (N. Virginia)" },
      { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
    ],
    availability: {
      "p6-b200.48xlarge": { "us-east-1": "both" },
      "p5.48xlarge": { "us-east-1": "both", "ap-northeast-1": "cb" },
      "g6.xlarge": { "ap-northeast-1": "od" },
      "g6e.xlarge": {},
    },
  };

  it("passes every row through when no region is selected", () => {
    expect(regionFilter(ROWS, null, FILE)).toHaveLength(ROWS.length);
  });

  it("keeps only rows available in the selected region", () => {
    expect(regionFilter(ROWS, "ap-northeast-1", FILE).map((r) => r.size)).toEqual([
      "p5.48xlarge",
      "g6.xlarge",
    ]);
  });

  it("builds the select from regions.json and hides the filter without it", () => {
    initCompareView({ rows: ROWS, regionsFile: FILE });
    const select = document.getElementById("region-select");
    expect(document.getElementById("region-filter").hidden).toBe(false);
    expect([...select.options].map((o) => o.value)).toEqual(["", "us-east-1", "ap-northeast-1"]);

    select.value = "ap-northeast-1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelectorAll("#compare-table tbody tr")).toHaveLength(2);

    mountPanel();
    initCompareView({ rows: ROWS, regionsFile: null });
    expect(document.getElementById("region-filter").hidden).toBe(true);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `npx --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference vitest run tests/compare-view.test.js`
Expected: FAIL — `regionFilter` が第 3 引数を無視して全行返す / `region-select` が null

- [ ] **Step 3: `compare-view.js` を実装**

import に足す:

```js
import { REGIONS_FILE } from "./regions-data.js";
```

`regionFilter` のスタブを置き換える:

```js
// 選んだリージョンで提供のある行だけ残す (仕様 5.2)。
// region が null、または regions.json が無ければ素通し。
export function regionFilter(rows, region, file = REGIONS_FILE) {
  if (!region || !file) return rows;
  return rows.filter((row) => file.availability?.[row.size]?.[region] != null);
}
```

`filterRows` は `regionFilter(filtered, state.region)` のままでよい (既定引数が効く)。テストが `file` を渡すために `filterRows` にも第 3 引数を通す必要は無い —— `initCompareView` はモジュールの既定値ではなく渡された file を使うので、次の形にする:

```js
export function filterRows(rows, state, file = REGIONS_FILE) {
  const gens = new Set(state.generations);
  const families = new Set(state.families);
  const filtered = rows.filter((row) => {
    if (gens.size > 0 && !gens.has(row.gen)) return false;
    if (families.size > 0 && !families.has(row.ec2)) return false;
    return true;
  });
  return regionFilter(filtered, state.region, file);
}
```

`initCompareView` の引数と本体を変える (現在の署名は `{ rows = GPU_DATA } = {}`。
呼び出し側が渡す余分なオプションを無視する方針はそのまま):

```js
// 呼び出し側が渡す余分なオプション (旧 now など) は無視する。
export function initCompareView({ rows = GPU_DATA, regionsFile = REGIONS_FILE } = {}) {
```

`update()` の中の `filterRows(rows, state)` を `filterRows(rows, state, regionsFile)` に、`createTable` に渡す初期行も同じく `filterRows(rows, state, regionsFile)` にする。

`buildColumnToggles` の下に足す:

```js
  // リージョン選択は regions.json があるときだけ出す (仕様 5.2 / 10)。
  // 単一選択で、保存はしない。
  function buildRegionFilter() {
    const box = document.getElementById("region-filter");
    if (!box) return;
    if (!regionsFile) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    const select = document.createElement("select");
    select.id = "region-select";
    select.className = "ctl";

    const all = document.createElement("option");
    all.value = "";
    all.textContent = t("filters.allRegions");
    select.appendChild(all);

    for (const region of regionsFile.regions) {
      const option = document.createElement("option");
      option.value = region.code;
      option.textContent = region.code;
      option.title = region.name;
      select.appendChild(option);
    }
    select.value = state.region || "";

    select.addEventListener("change", () => {
      state.region = select.value || null;
      notifyStateChanged();
      update();
    });

    box.replaceChildren(select);
    box.hidden = false;
  }
```

`buildColumnToggles();` の呼び出しの下に `buildRegionFilter();` を足し、`lang-changed` のハンドラにも `buildRegionFilter();` を足す (「全リージョン」のラベルを引き直すため)。

- [ ] **Step 4: i18n キーを 3 辞書に足す**

`ja.js` の `filters` ブロックに `allRegions: "全リージョン",` を、
`en.js` に `allRegions: "All regions",` を、
`ko.js` に `allRegions: "전체 리전",` を、それぞれ `region` の次の行に足す。

- [ ] **Step 5: テストを実行**

Run: `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test`
Expected: 全 PASS

- [ ] **Step 6: ビルドを確認**

Run: `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build`
Expected: エラーなし

- [ ] **Step 7: コミット**

```bash
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference add src tests/compare-view.test.js
git -C /Users/koyakimu/workspace/personal/aws-gpu-quick-reference commit -m "$(cat <<'MSG'
feat: 比較表にリージョンフィルタを追加

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_015p4zZTKnfmK1LaUu9QMCwj
MSG
)"
```

---

## 完了条件

- `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference test` が全 PASS
- `npm --prefix /Users/koyakimu/workspace/personal/aws-gpu-quick-reference run build` が成功
- `data/regions.json` を一時的に退避して `npm run build` と `npm test` を通し、Regions タブが placeholder になりリージョンフィルタが出ないことを確認する (§10)。確認後にファイルを戻す
