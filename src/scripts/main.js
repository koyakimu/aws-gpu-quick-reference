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

// ヘッダのキャプションはデータの正 (instances.json) に合わせる。
// HTML 側の %PRICING_AS_OF% はビルド時に埋まるフォールバック。
// リージョン選択が出ているときは、リージョン名はその select が持つ。
function setPricingCaption() {
  const el = document.getElementById("pricing-caption");
  if (!el) return;
  const select = document.getElementById("price-region");
  const caption = `pricing ${PRICING_META.pricingAsOf} ·`;
  el.textContent = select && !select.hidden ? caption : `${caption} ${PRICING_META.pricingRegion}`;
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
