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

function getUniqueInstances() {
  return GPU_DATA.map((row) => {
    const gpuName = row.gpu || GPU_DATA.find((r) => r.gen === row.gen && r.gpu)?.gpu || "";
    return {
      size: row.size,
      label: `${row.size} (${gpuName} x${row.count})`,
      price: row.price,
      priceCb: row.priceCb,
      count: row.count,
      cbOnly: isCbOnly(row),
    };
  });
}

function updateUnitPrices(row) {
  const odInput = document.getElementById("calc-od-unit-price");
  const cbInput = document.getElementById("calc-cb-unit-price");
  if (!odInput || !cbInput) return;

  const odPrice = parsePrice(row.price);
  const cbPrice = parsePrice(row.priceCb);

  if (!odUserEdited) {
    odInput.value = odPrice != null ? odPrice.toFixed(2) : "";
    odInput.classList.remove("user-edited");
  }
  if (!cbUserEdited) {
    cbInput.value = cbPrice != null ? cbPrice.toFixed(2) : "";
    cbInput.classList.remove("user-edited");
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

  // Use user-edited unit price if available, otherwise use data
  const odPrice = odUnitInput && odUnitInput.value !== "" ? parseFloat(odUnitInput.value) : parsePrice(row.price);
  const odMonthly = calculateMonthlyCost(odPrice, instanceCount);
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
  }

  // Use user-edited CB unit price if available, otherwise use data
  const cbGpuPrice = cbUnitInput && cbUnitInput.value !== "" ? parseFloat(cbUnitInput.value) : parsePrice(row.priceCb);
  if (cbGpuPrice != null) {
    const gpuCount = typeof row.count === "string" ? parseFraction(row.count) : row.count;
    const cbMonthly = cbGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount;
    const cbYearly = calculateYearlyCost(cbMonthly);
    cbResult.textContent = formatCurrency(cbMonthly);
    if (cbYearlyResult) cbYearlyResult.textContent = formatCurrency(cbYearly);
    if (cbJpyResult) cbJpyResult.textContent = formatJpy(convertToJpy(cbMonthly, exchangeRate));
    if (cbYearlyJpyResult) cbYearlyJpyResult.textContent = formatJpy(convertToJpy(cbYearly, exchangeRate));
  } else {
    cbResult.textContent = "-";
    if (cbYearlyResult) cbYearlyResult.textContent = "-";
    if (cbJpyResult) cbJpyResult.textContent = "-";
    if (cbYearlyJpyResult) cbYearlyJpyResult.textContent = "-";
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
        const odPrice = parsePrice(row.price);
        odUnitInput.value = odPrice != null ? odPrice.toFixed(2) : "";
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
    updateResult();
  });

  // Initialize unit prices for the first selected instance
  const initialRow = GPU_DATA.find((r) => r.size === select?.value);
  if (initialRow) updateUnitPrices(initialRow);

  updateResult();
}
