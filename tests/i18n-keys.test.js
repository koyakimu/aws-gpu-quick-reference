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
    const n = keySet(ja).size;
    expect(n).toBeGreaterThan(0);
    expect({
      en: keySet(en).size,
      ko: keySet(ko).size,
    }).toEqual({ en: n, ko: n });
  });
});

describe("keys the renewed UI needs", () => {
  // 一覧に載せるのは、後続タスクが実際に読むキーだけ。
  // tabs.calculator は compare タブ内の計算ツール開閉ボタンのラベル。
  // Task 6 のマークアップ: tabs.*, filters.families, filters.columns, placeholders.regions/features
  // Task 5 の compare-view.js: filters.rowCount, groups.*, table.fp*, placeholders.noRows
  // filters.onlyInRegion は比較タブの「選択リージョンで提供のみ」チェックが使う。
  const REQUIRED = [
    "tabs.compare",
    "tabs.regions",
    "tabs.features",
    "tabs.calculator",
    "filters.families",
    "filters.columns",
    "filters.onlyInRegion",
    "filters.rowCount",
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
      expect(dict.filters?.rowCount, `${lang}.filters.rowCount`).toContain("{shown}");
      expect(dict.filters?.rowCount, `${lang}.filters.rowCount`).toContain("{total}");
    }
  });

  it("no UI string contains an emoji", () => {
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
