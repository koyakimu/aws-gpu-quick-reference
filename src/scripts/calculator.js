import { GPU_DATA } from "./gpu-data.js";
import { t, getLang } from "./i18n.js";

const HOURS_PER_MONTH = 720;
const HOURS_PER_DAY = 24;
const MONTHS_PER_YEAR = 12;

const CURRENCY_CONFIG = {
  ja: { currency: "JPY", symbol: "¥", defaultRate: 150, locale: "ja-JP" },
  ko: { currency: "KRW", symbol: "₩", defaultRate: 1400, locale: "ko-KR" },
};

let odUserEdited = false;
let cbUserEdited = false;

function parseFraction(str) {
  const parts = str.split("/");
  return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(str);
}

export function parsePrice(priceStr) {
  if (!priceStr || priceStr === "-" || priceStr === "TBD") return null;
  return parseFloat(priceStr.replace("$", ""));
}

export function calculateMonthlyCost(hourlyPrice, count) {
  if (hourlyPrice == null || count == null) return null;
  return hourlyPrice * HOURS_PER_MONTH * count;
}

export function calculateYearlyCost(monthlyCost) {
  if (monthlyCost == null) return null;
  return monthlyCost * MONTHS_PER_YEAR;
}

export function calculateDaysCost(hourlyPrice, days, count) {
  if (hourlyPrice == null || days == null || count == null) return null;
  return hourlyPrice * HOURS_PER_DAY * days * count;
}

export function convertToJpy(usdAmount, exchangeRate) {
  if (usdAmount == null || exchangeRate == null) return null;
  return usdAmount * exchangeRate;
}

export function isCbOnly(row) {
  return row.price === null || row.price === "TBD";
}

function formatCurrency(amount) {
  if (amount == null) return "-";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatLocalCurrency(amount) {
  if (amount == null) return "-";
  const config = CURRENCY_CONFIG[getLang()];
  if (!config) return "-";
  return config.symbol + Math.round(amount).toLocaleString(config.locale);
}

function formatDiff(diff, formatter) {
  if (diff == null) return "";
  const sign = diff > 0 ? "+" : "";
  return sign + formatter(diff);
}

function getUniqueInstances() {
  return GPU_DATA.map((row) => {
    const gpuName = row.gpu || GPU_DATA.find((r) => r.gen === row.gen && r.gpu)?.gpu || "";
    return {
      size: row.size,
      label: `${row.size} (${gpuName} x${row.count})`,
      price: row.price,
      priceGpu: row.priceGpu,
      priceCb: row.priceCb,
      count: row.count,
      cbOnly: isCbOnly(row),
    };
  });
}

function updateDefaultPriceDisplay(row) {
  const odDefault = document.getElementById("calc-od-default-price");
  const cbDefault = document.getElementById("calc-cb-default-price");

  const odGpuPrice = parsePrice(row.priceGpu);
  const cbPrice = parsePrice(row.priceCb);

  if (odDefault) {
    odDefault.textContent = odGpuPrice != null
      ? `${t("calculator.defaultPrice")}: $${odGpuPrice.toFixed(2)}`
      : `${t("calculator.defaultPrice")}: -`;
  }
  if (cbDefault) {
    cbDefault.textContent = cbPrice != null
      ? `${t("calculator.defaultPrice")}: $${cbPrice.toFixed(2)}`
      : `${t("calculator.defaultPrice")}: -`;
  }
}

function updateUnitPrices(row) {
  const odInput = document.getElementById("calc-od-unit-price");
  const cbInput = document.getElementById("calc-cb-unit-price");
  if (!odInput || !cbInput) return;

  const odGpuPrice = parsePrice(row.priceGpu);
  const cbPrice = parsePrice(row.priceCb);

  if (!odUserEdited) {
    odInput.value = odGpuPrice != null ? odGpuPrice.toFixed(2) : "";
    odInput.classList.remove("user-edited");
  }
  if (!cbUserEdited) {
    cbInput.value = cbPrice != null ? cbPrice.toFixed(2) : "";
    cbInput.classList.remove("user-edited");
  }

  updateDefaultPriceDisplay(row);
}

function setResultComparison(resultId, currentValue, defaultValue, isLocal) {
  const defaultEl = document.getElementById(resultId + "-default");
  const diffEl = document.getElementById(resultId + "-diff");
  if (!defaultEl || !diffEl) return;

  const formatter = isLocal ? formatLocalCurrency : formatCurrency;

  if (currentValue != null && defaultValue != null && currentValue !== defaultValue) {
    defaultEl.textContent = `${t("calculator.defaultCost")}: ${formatter(defaultValue)}`;
    const diff = currentValue - defaultValue;
    diffEl.textContent = `${t("calculator.diffLabel")}: ${formatDiff(diff, formatter)}`;
    diffEl.className = "result-diff " + (diff > 0 ? "diff-increase" : "diff-decrease");
  } else {
    defaultEl.textContent = "";
    diffEl.textContent = "";
    diffEl.className = "result-diff";
  }
}

function hasLocalCurrency() {
  return CURRENCY_CONFIG[getLang()] != null;
}

function updateLocalCurrencyVisibility() {
  const localColumn = document.getElementById("local-currency-column");
  const exchangeField = document.getElementById("calc-exchange-rate-field");
  const grid = document.querySelector(".calculator-results-grid");

  const showLocal = hasLocalCurrency();

  if (localColumn) localColumn.style.display = showLocal ? "" : "none";
  if (exchangeField) exchangeField.style.display = showLocal ? "" : "none";
  if (grid) grid.style.gridTemplateColumns = showLocal ? "1fr 1fr" : "1fr";
}

function updateResult() {
  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");
  const daysInput = document.getElementById("calc-days");
  const exchangeRateInput = document.getElementById("calc-exchange-rate");
  const odUnitInput = document.getElementById("calc-od-unit-price");
  const cbUnitInput = document.getElementById("calc-cb-unit-price");

  // USD results
  const odResult = document.getElementById("calc-od-result");
  const cbResult = document.getElementById("calc-cb-result");
  const odDaysResult = document.getElementById("calc-od-days-result");
  const cbDaysResult = document.getElementById("calc-cb-days-result");

  // Local currency results
  const odLocalResult = document.getElementById("calc-od-local-result");
  const cbLocalResult = document.getElementById("calc-cb-local-result");
  const odDaysLocalResult = document.getElementById("calc-od-days-local-result");
  const cbDaysLocalResult = document.getElementById("calc-cb-days-local-result");

  if (!select || !countInput || !odResult || !cbResult) return;

  const instanceSize = select.value;
  const instanceCount = parseInt(countInput.value) || 1;
  const days = parseInt(daysInput?.value) || 30;
  const exchangeRate = parseFloat(exchangeRateInput?.value) || 150;
  const showLocal = hasLocalCurrency();

  const row = GPU_DATA.find((r) => r.size === instanceSize);
  if (!row) return;

  const gpuCount = typeof row.count === "string" ? parseFraction(row.count) : row.count;

  // --- On-Demand ---
  const odDefaultGpuPrice = parsePrice(row.priceGpu);
  const odDefaultMonthly = odDefaultGpuPrice != null ? odDefaultGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;
  const odGpuPrice = odUnitInput && odUnitInput.value !== "" ? parseFloat(odUnitInput.value) : odDefaultGpuPrice;
  const odMonthly = odGpuPrice != null ? odGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;

  if (odMonthly != null) {
    odResult.textContent = formatCurrency(odMonthly);
    odResult.classList.remove("cbo");

    const odDaysCost = odGpuPrice * HOURS_PER_DAY * days * gpuCount * instanceCount;
    const odDefaultDaysCost = odDefaultGpuPrice != null ? odDefaultGpuPrice * HOURS_PER_DAY * days * gpuCount * instanceCount : null;
    if (odDaysResult) {
      odDaysResult.textContent = formatCurrency(odDaysCost);
      odDaysResult.classList.remove("cbo");
    }

    if (showLocal) {
      if (odLocalResult) {
        odLocalResult.textContent = formatLocalCurrency(convertToJpy(odMonthly, exchangeRate));
        odLocalResult.classList.remove("cbo");
      }
      if (odDaysLocalResult) {
        odDaysLocalResult.textContent = formatLocalCurrency(convertToJpy(odDaysCost, exchangeRate));
        odDaysLocalResult.classList.remove("cbo");
      }
    }

    if (odUserEdited && odDefaultGpuPrice != null) {
      setResultComparison("calc-od-result", odMonthly, odDefaultMonthly, false);
      setResultComparison("calc-od-days-result", odDaysCost, odDefaultDaysCost, false);
      if (showLocal) {
        setResultComparison("calc-od-local-result", convertToJpy(odMonthly, exchangeRate), convertToJpy(odDefaultMonthly, exchangeRate), true);
        setResultComparison("calc-od-days-local-result", convertToJpy(odDaysCost, exchangeRate), convertToJpy(odDefaultDaysCost, exchangeRate), true);
      }
    } else {
      setResultComparison("calc-od-result", null, null, false);
      setResultComparison("calc-od-days-result", null, null, false);
      if (showLocal) {
        setResultComparison("calc-od-local-result", null, null, true);
        setResultComparison("calc-od-days-local-result", null, null, true);
      }
    }
  } else {
    odResult.textContent = t("calculator.cbOnly");
    odResult.classList.add("cbo");
    if (odDaysResult) {
      odDaysResult.textContent = t("calculator.cbOnly");
      odDaysResult.classList.add("cbo");
    }
    if (showLocal) {
      if (odLocalResult) {
        odLocalResult.textContent = t("calculator.cbOnly");
        odLocalResult.classList.add("cbo");
      }
      if (odDaysLocalResult) {
        odDaysLocalResult.textContent = t("calculator.cbOnly");
        odDaysLocalResult.classList.add("cbo");
      }
    }
    setResultComparison("calc-od-result", null, null, false);
    setResultComparison("calc-od-days-result", null, null, false);
    if (showLocal) {
      setResultComparison("calc-od-local-result", null, null, true);
      setResultComparison("calc-od-days-local-result", null, null, true);
    }
  }

  // --- CB ---
  const cbDefaultGpuPrice = parsePrice(row.priceCb);
  const cbDefaultMonthly = cbDefaultGpuPrice != null ? cbDefaultGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;
  const cbGpuPrice = cbUnitInput && cbUnitInput.value !== "" ? parseFloat(cbUnitInput.value) : cbDefaultGpuPrice;

  if (cbGpuPrice != null) {
    const cbMonthly = cbGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount;
    cbResult.textContent = formatCurrency(cbMonthly);

    const cbDaysCost = cbGpuPrice * HOURS_PER_DAY * days * gpuCount * instanceCount;
    const cbDefaultDaysCost = cbDefaultGpuPrice != null ? cbDefaultGpuPrice * HOURS_PER_DAY * days * gpuCount * instanceCount : null;
    if (cbDaysResult) cbDaysResult.textContent = formatCurrency(cbDaysCost);

    if (showLocal) {
      if (cbLocalResult) cbLocalResult.textContent = formatLocalCurrency(convertToJpy(cbMonthly, exchangeRate));
      if (cbDaysLocalResult) cbDaysLocalResult.textContent = formatLocalCurrency(convertToJpy(cbDaysCost, exchangeRate));
    }

    if (cbUserEdited && cbDefaultGpuPrice != null) {
      setResultComparison("calc-cb-result", cbMonthly, cbDefaultMonthly, false);
      setResultComparison("calc-cb-days-result", cbDaysCost, cbDefaultDaysCost, false);
      if (showLocal) {
        setResultComparison("calc-cb-local-result", convertToJpy(cbMonthly, exchangeRate), convertToJpy(cbDefaultMonthly, exchangeRate), true);
        setResultComparison("calc-cb-days-local-result", convertToJpy(cbDaysCost, exchangeRate), convertToJpy(cbDefaultDaysCost, exchangeRate), true);
      }
    } else {
      setResultComparison("calc-cb-result", null, null, false);
      setResultComparison("calc-cb-days-result", null, null, false);
      if (showLocal) {
        setResultComparison("calc-cb-local-result", null, null, true);
        setResultComparison("calc-cb-days-local-result", null, null, true);
      }
    }
  } else {
    cbResult.textContent = "-";
    if (cbDaysResult) cbDaysResult.textContent = "-";
    if (showLocal) {
      if (cbLocalResult) cbLocalResult.textContent = "-";
      if (cbDaysLocalResult) cbDaysLocalResult.textContent = "-";
    }
    setResultComparison("calc-cb-result", null, null, false);
    setResultComparison("calc-cb-days-result", null, null, false);
    if (showLocal) {
      setResultComparison("calc-cb-local-result", null, null, true);
      setResultComparison("calc-cb-days-local-result", null, null, true);
    }
  }
}

function populateSelect() {
  const select = document.getElementById("calc-instance");
  if (!select) return;

  const instances = getUniqueInstances();
  select.textContent = "";
  instances.forEach((inst) => {
    const option = document.createElement("option");
    option.value = inst.size;
    option.textContent = inst.label;
    select.appendChild(option);
  });
}

function onInstanceChange() {
  const select = document.getElementById("calc-instance");
  if (!select) return;
  const row = GPU_DATA.find((r) => r.size === select.value);
  if (!row) return;

  odUserEdited = false;
  cbUserEdited = false;
  updateUnitPrices(row);
  updateResult();
}

function updateExchangeRateForLang() {
  const exchangeRateInput = document.getElementById("calc-exchange-rate");
  if (!exchangeRateInput) return;

  const config = CURRENCY_CONFIG[getLang()];
  if (config) {
    exchangeRateInput.value = config.defaultRate;
  }
}

export function initCalculator() {
  populateSelect();

  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");
  const daysInput = document.getElementById("calc-days");
  const exchangeRateInput = document.getElementById("calc-exchange-rate");
  const odUnitInput = document.getElementById("calc-od-unit-price");
  const cbUnitInput = document.getElementById("calc-cb-unit-price");
  const odResetBtn = document.getElementById("calc-od-reset");
  const cbResetBtn = document.getElementById("calc-cb-reset");

  if (select) select.addEventListener("change", onInstanceChange);
  if (countInput) countInput.addEventListener("input", updateResult);
  if (daysInput) daysInput.addEventListener("input", updateResult);
  if (exchangeRateInput) exchangeRateInput.addEventListener("input", updateResult);

  if (odUnitInput) {
    odUnitInput.addEventListener("input", () => {
      odUserEdited = true;
      odUnitInput.classList.add("user-edited");
      updateResult();
    });
  }
  if (cbUnitInput) {
    cbUnitInput.addEventListener("input", () => {
      cbUserEdited = true;
      cbUnitInput.classList.add("user-edited");
      updateResult();
    });
  }

  if (odResetBtn) {
    odResetBtn.addEventListener("click", () => {
      odUserEdited = false;
      const row = GPU_DATA.find((r) => r.size === select?.value);
      if (row) {
        const odGpuPrice = parsePrice(row.priceGpu);
        odUnitInput.value = odGpuPrice != null ? odGpuPrice.toFixed(2) : "";
        odUnitInput.classList.remove("user-edited");
      }
      updateResult();
    });
  }
  if (cbResetBtn) {
    cbResetBtn.addEventListener("click", () => {
      cbUserEdited = false;
      const row = GPU_DATA.find((r) => r.size === select?.value);
      if (row) {
        const cbPrice = parsePrice(row.priceCb);
        cbUnitInput.value = cbPrice != null ? cbPrice.toFixed(2) : "";
        cbUnitInput.classList.remove("user-edited");
      }
      updateResult();
    });
  }

  document.addEventListener("lang-changed", () => {
    const row = GPU_DATA.find((r) => r.size === select?.value);
    if (row) updateDefaultPriceDisplay(row);
    updateLocalCurrencyVisibility();
    updateExchangeRateForLang();
    updateResult();
  });

  // Initialize for current language
  updateLocalCurrencyVisibility();
  updateExchangeRateForLang();

  const initialRow = GPU_DATA.find((r) => r.size === select?.value);
  if (initialRow) updateUnitPrices(initialRow);

  updateResult();
}
