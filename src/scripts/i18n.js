import { ja } from "../i18n/ja.js";
import { en } from "../i18n/en.js";
import { ko } from "../i18n/ko.js";
import { PRICING_META } from "./gpu-data.js";
import { getPriceRegion, PRICE_REGION_EVENT } from "./price-region.js";

const STORAGE_KEY = "gpu-ref-lang";
const dictionaries = { ja, en, ko };
let currentLang = "ja";

function detectLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && dictionaries[saved]) return saved;

  const nav = navigator.language || navigator.userLanguage || "";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!dictionaries[lang]) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyTranslations();
  document.documentElement.lang = lang;
  document.dispatchEvent(new CustomEvent("lang-changed", { detail: { lang } }));
}

export function t(key) {
  const keys = key.split(".");
  let value = dictionaries[currentLang];
  for (const k of keys) {
    if (value == null) return key;
    value = value[k];
  }
  if (value == null) return key;
  // 価格の基準月はデータ (data/instances.json) が、リージョンはヘッダの選択が持つ。
  // 辞書側は置換子だけ持つ。
  return typeof value === "string"
    ? value
        .replaceAll("%PRICING_AS_OF%", PRICING_META.pricingAsOf)
        .replaceAll("%PRICE_REGION%", getPriceRegion())
    : value;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    el.title = t(key);
  });
}

export function initI18n() {
  currentLang = detectLanguage();
  document.documentElement.lang = currentLang;
  applyTranslations();
  // %PRICE_REGION% を含む文 (notes.priceNote) を選択に追従させる
  document.addEventListener(PRICE_REGION_EVENT, applyTranslations);
}

export function setupLangToggle() {
  const select = document.getElementById("lang-select");
  if (!select) return;
  select.value = currentLang;
  select.addEventListener("change", () => {
    setLang(select.value);
  });
}

export { detectLanguage };
