import { ja } from "../i18n/ja.js";
import { en } from "../i18n/en.js";

const STORAGE_KEY = "gpu-ref-lang";
const dictionaries = { ja, en };

let currentLang = "ja";

function detectLanguage() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && dictionaries[saved]) return saved;

  const nav = navigator.language || navigator.userLanguage || "";
  return nav.startsWith("ja") ? "ja" : "en";
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

export function setupLangToggle() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    setLang(currentLang === "ja" ? "en" : "ja");
    btn.textContent = currentLang === "ja" ? "English" : "日本語";
  });
  btn.textContent = currentLang === "ja" ? "English" : "日本語";
}

export { detectLanguage };
