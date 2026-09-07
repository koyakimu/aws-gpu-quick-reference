// テーマの優先順位 (仕様 6.2):
//   1. 切替ボタンで明示的に選ばれた値 (localStorage)
//   2. 無ければ OS の prefers-color-scheme
// 初回訪問では保存しない。保存してしまうと以後 OS 設定に追従しなくなるため。
import { t } from "./i18n.js";

// 旧キー "gpu-ref-theme" は、以前の initTheme が初回訪問で必ず書き込んでいたので
// 「明示的な選択」とは限らない。移行せず無視し、新しいキーで再出発する。
const STORAGE_KEY = "gpu-ref-theme-pref";

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

  // i18n.js の setLang が document に対して発火する CustomEvent
  document.addEventListener("lang-changed", relabel);
  relabel();
}
