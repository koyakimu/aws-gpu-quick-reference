import { ja } from "../i18n/ja.js";
import { en } from "../i18n/en.js";
import { ko } from "../i18n/ko.js";

const STORAGE_KEY = "gpu-ref-lang";
const dictionaries = { ja, en, ko };
const LANG_ORDER = ["ja", "en", "ko"];
const LANG_LABELS = { ja: "日本語", en: "English", ko: "한국어" };

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
  return value != null ? value : key;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = t(key);
  });
}

export function initI18n() {
  currentLang = detectLanguage();
  document.documentElement.lang = currentLang;
  applyTranslations();
}

function nextLangLabel() {
  const idx = LANG_ORDER.indexOf(currentLang);
  const nextLang = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
  return LANG_LABELS[nextLang];
}

export function setupLangToggle() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const idx = LANG_ORDER.indexOf(currentLang);
    const nextLang = LANG_ORDER[(idx + 1) % LANG_ORDER.length];
    setLang(nextLang);
    btn.textContent = nextLangLabel();
  });
  btn.textContent = nextLangLabel();
}

export { detectLanguage };
