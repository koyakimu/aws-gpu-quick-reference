import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/header.css";
import "../styles/table.css";
import "../styles/calculator.css";

import { initTheme, setupThemeToggle } from "./theme.js";
import { initI18n, setupLangToggle } from "./i18n.js";
import { initTabs } from "./tabs.js";
import { initCompareView } from "./compare-view.js";
import { initRegionsView } from "./regions-view.js";
import { initFeaturesView } from "./features-view.js";
import { initGpuSpecsView } from "./gpu-specs-view.js";
import { initCalculator } from "./calculator.js";
import { PRICING_META } from "./gpu-data.js";
import { initPriceRegionSelect } from "./price-region.js";

// 旧 #calculator リンクは compare タブを開いたうえで計算ツールの details を展開する。
function openCalculatorFromHash() {
  if (window.location.hash.replace(/^#/, "") !== "calculator") return;
  const box = document.getElementById("calculator-box");
  if (box) box.open = true;
}

// 価格リージョンの表示。select が出ているときはそれが値を持ち、
// regions.json が無くて select を出せないときだけ既定リージョンを素の文字で見せる。
// 「（価格基準 YYYY-MM）」は data-i18n="header.pricingAsOf" 側で入る。
function setPricingCaption() {
  const fallback = document.getElementById("price-region-static");
  if (!fallback) return;
  const select = document.getElementById("price-region");
  const showFallback = !select || select.hidden;
  fallback.textContent = showFallback ? PRICING_META.pricingRegion : "";
  fallback.hidden = !showFallback;
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initI18n();
  initPriceRegionSelect();
  setPricingCaption();
  initTabs();
  initCompareView();
  initRegionsView();
  initGpuSpecsView();
  initFeaturesView();
  initCalculator();
  openCalculatorFromHash();
  window.addEventListener("hashchange", openCalculatorFromHash);
  setupLangToggle();
  setupThemeToggle();
});
