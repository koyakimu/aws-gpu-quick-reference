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

// 旧 #calculator リンクは compare タブを開いたうえで計算ツールの details を展開する。
function openCalculatorFromHash() {
  if (window.location.hash.replace(/^#/, "") !== "calculator") return;
  const box = document.getElementById("calculator-box");
  if (box) box.open = true;
}

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
  openCalculatorFromHash();
  window.addEventListener("hashchange", openCalculatorFromHash);
  setupLangToggle();
  setupThemeToggle();
});
