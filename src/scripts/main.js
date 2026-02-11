import "../styles/base.css";
import "../styles/table.css";
import "../styles/header.css";
import "../styles/calculator.css";
import "../styles/light-theme.css";

import { initTheme, setupThemeToggle } from "./theme.js";
import { initI18n, setupLangToggle } from "./i18n.js";
import { renderTable, setupHover } from "./table.js";
import { initCalculator } from "./calculator.js";

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initI18n();
  renderTable();
  setupHover();
  initCalculator();
  setupLangToggle();
  setupThemeToggle();

  document.addEventListener("lang-changed", () => {
    renderTable();
    setupHover();
  });
});
