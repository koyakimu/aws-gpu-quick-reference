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
