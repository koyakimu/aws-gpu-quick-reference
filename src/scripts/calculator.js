import { GPU_DATA } from "./gpu-data.js";
import { t } from "./i18n.js";

const HOURS_PER_MONTH = 720;
const MONTHS_PER_YEAR = 12;

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

function formatJpy(amount) {
  if (amount == null) return "-";
  return "¥" + Math.round(amount).toLocaleString("ja-JP");
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

function setResultComparison(resultId, currentValue, defaultValue, isJpy) {
  const defaultEl = document.getElementById(resultId + "-default");
  const diffEl = document.getElementById(resultId + "-diff");
  if (!defaultEl || !diffEl) return;

  const formatter = isJpy ? formatJpy : formatCurrency;

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

function updateResult() {
  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");
  const exchangeRateInput = document.getElementById("calc-exchange-rate");
  const odUnitInput = document.getElementById("calc-od-unit-price");
  const cbUnitInput = document.getElementById("calc-cb-unit-price");
  const odResult = document.getElementById("calc-od-result");
  const odYearlyResult = document.getElementById("calc-od-yearly-result");
  const cbResult = document.getElementById("calc-cb-result");
  const cbYearlyResult = document.getElementById("calc-cb-yearly-result");
  const odJpyResult = document.getElementById("calc-od-jpy-result");
  const odYearlyJpyResult = document.getElementById("calc-od-yearly-jpy-result");
  const cbJpyResult = document.getElementById("calc-cb-jpy-result");
  const cbYearlyJpyResult = document.getElementById("calc-cb-yearly-jpy-result");

  if (!select || !countInput || !odResult || !cbResult) return;

  const instanceSize = select.value;
  const instanceCount = parseInt(countInput.value) || 1;
  const exchangeRate = parseFloat(exchangeRateInput?.value) || 150;

  const row = GPU_DATA.find((r) => r.size === instanceSize);
  if (!row) return;

  // Default prices from data (per-GPU)
  const gpuCount = typeof row.count === "string" ? parseFraction(row.count) : row.count;
  const odDefaultGpuPrice = parsePrice(row.priceGpu);
  const odDefaultMonthly = odDefaultGpuPrice != null ? odDefaultGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;
  const odDefaultYearly = calculateYearlyCost(odDefaultMonthly);

  // User-adjusted price (per-GPU)
  const odGpuPrice = odUnitInput && odUnitInput.value !== "" ? parseFloat(odUnitInput.value) : odDefaultGpuPrice;
  const odMonthly = odGpuPrice != null ? odGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;
  const odYearly = calculateYearlyCost(odMonthly);

  if (odMonthly != null) {
    odResult.textContent = formatCurrency(odMonthly);
    odResult.classList.remove("cbo");
    if (odYearlyResult) {
      odYearlyResult.textContent = formatCurrency(odYearly);
      odYearlyResult.classList.remove("cbo");
    }
    if (odJpyResult) {
      odJpyResult.textContent = formatJpy(convertToJpy(odMonthly, exchangeRate));
      odJpyResult.classList.remove("cbo");
    }
    if (odYearlyJpyResult) {
      odYearlyJpyResult.textContent = formatJpy(convertToJpy(odYearly, exchangeRate));
      odYearlyJpyResult.classList.remove("cbo");
    }

    // Show comparison if user edited OD price
    if (odUserEdited && odDefaultGpuPrice != null) {
      setResultComparison("calc-od-result", odMonthly, odDefaultMonthly, false);
      setResultComparison("calc-od-yearly-result", odYearly, odDefaultYearly, false);
      setResultComparison("calc-od-jpy-result", convertToJpy(odMonthly, exchangeRate), convertToJpy(odDefaultMonthly, exchangeRate), true);
      setResultComparison("calc-od-yearly-jpy-result", convertToJpy(odYearly, exchangeRate), convertToJpy(odDefaultYearly, exchangeRate), true);
    } else {
      setResultComparison("calc-od-result", null, null, false);
      setResultComparison("calc-od-yearly-result", null, null, false);
      setResultComparison("calc-od-jpy-result", null, null, true);
      setResultComparison("calc-od-yearly-jpy-result", null, null, true);
    }
  } else {
    odResult.textContent = t("calculator.cbOnly");
    odResult.classList.add("cbo");
    if (odYearlyResult) {
      odYearlyResult.textContent = t("calculator.cbOnly");
      odYearlyResult.classList.add("cbo");
    }
    if (odJpyResult) {
      odJpyResult.textContent = t("calculator.cbOnly");
      odJpyResult.classList.add("cbo");
    }
    if (odYearlyJpyResult) {
      odYearlyJpyResult.textContent = t("calculator.cbOnly");
      odYearlyJpyResult.classList.add("cbo");
    }
    setResultComparison("calc-od-result", null, null, false);
    setResultComparison("calc-od-yearly-result", null, null, false);
    setResultComparison("calc-od-jpy-result", null, null, true);
    setResultComparison("calc-od-yearly-jpy-result", null, null, true);
  }

  // CB pricing
  const cbDefaultGpuPrice = parsePrice(row.priceCb);
  const cbDefaultMonthly = cbDefaultGpuPrice != null ? cbDefaultGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount : null;
  const cbDefaultYearly = calculateYearlyCost(cbDefaultMonthly);

  const cbGpuPrice = cbUnitInput && cbUnitInput.value !== "" ? parseFloat(cbUnitInput.value) : cbDefaultGpuPrice;
  if (cbGpuPrice != null) {
    const cbMonthly = cbGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount;
    const cbYearly = calculateYearlyCost(cbMonthly);
    cbResult.textContent = formatCurrency(cbMonthly);
    if (cbYearlyResult) cbYearlyResult.textContent = formatCurrency(cbYearly);
    if (cbJpyResult) cbJpyResult.textContent = formatJpy(convertToJpy(cbMonthly, exchangeRate));
    if (cbYearlyJpyResult) cbYearlyJpyResult.textContent = formatJpy(convertToJpy(cbYearly, exchangeRate));

    // Show comparison if user edited CB price
    if (cbUserEdited && cbDefaultGpuPrice != null) {
      setResultComparison("calc-cb-result", cbMonthly, cbDefaultMonthly, false);
      setResultComparison("calc-cb-yearly-result", cbYearly, cbDefaultYearly, false);
      setResultComparison("calc-cb-jpy-result", convertToJpy(cbMonthly, exchangeRate), convertToJpy(cbDefaultMonthly, exchangeRate), true);
      setResultComparison("calc-cb-yearly-jpy-result", convertToJpy(cbYearly, exchangeRate), convertToJpy(cbDefaultYearly, exchangeRate), true);
    } else {
      setResultComparison("calc-cb-result", null, null, false);
      setResultComparison("calc-cb-yearly-result", null, null, false);
      setResultComparison("calc-cb-jpy-result", null, null, true);
      setResultComparison("calc-cb-yearly-jpy-result", null, null, true);
    }
  } else {
    cbResult.textContent = "-";
    if (cbYearlyResult) cbYearlyResult.textContent = "-";
    if (cbJpyResult) cbJpyResult.textContent = "-";
    if (cbYearlyJpyResult) cbYearlyJpyResult.textContent = "-";
    setResultComparison("calc-cb-result", null, null, false);
    setResultComparison("calc-cb-yearly-result", null, null, false);
    setResultComparison("calc-cb-jpy-result", null, null, true);
    setResultComparison("calc-cb-yearly-jpy-result", null, null, true);
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

export function initCalculator() {
  populateSelect();

  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");
  const exchangeRateInput = document.getElementById("calc-exchange-rate");
  const odUnitInput = document.getElementById("calc-od-unit-price");
  const cbUnitInput = document.getElementById("calc-cb-unit-price");
  const odResetBtn = document.getElementById("calc-od-reset");
  const cbResetBtn = document.getElementById("calc-cb-reset");

  if (select) select.addEventListener("change", onInstanceChange);
  if (countInput) countInput.addEventListener("input", updateResult);
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
    updateResult();
  });

  // Initialize unit prices for the first selected instance
  const initialRow = GPU_DATA.find((r) => r.size === select?.value);
  if (initialRow) updateUnitPrices(initialRow);

  updateResult();
}
