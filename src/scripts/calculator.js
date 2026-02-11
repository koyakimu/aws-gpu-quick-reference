import { GPU_DATA } from "./gpu-data.js";
import { t } from "./i18n.js";

const HOURS_PER_MONTH = 720;

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

export function isCbOnly(row) {
  return row.price === null || row.price === "TBD";
}

function formatCurrency(amount) {
  if (amount == null) return "-";
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

function updateResult() {
  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");
  const odResult = document.getElementById("calc-od-result");
  const cbResult = document.getElementById("calc-cb-result");

  if (!select || !countInput || !odResult || !cbResult) return;

  const instanceSize = select.value;
  const instanceCount = parseInt(countInput.value) || 1;

  const row = GPU_DATA.find((r) => r.size === instanceSize);
  if (!row) return;

  const odPrice = parsePrice(row.price);
  const odMonthly = calculateMonthlyCost(odPrice, instanceCount);

  if (odMonthly != null) {
    odResult.textContent = formatCurrency(odMonthly);
    odResult.classList.remove("cbo");
  } else {
    odResult.textContent = t("calculator.cbOnly");
    odResult.classList.add("cbo");
  }

  const cbGpuPrice = parsePrice(row.priceCb);
  if (cbGpuPrice != null) {
    const gpuCount = typeof row.count === "string" ? parseFraction(row.count) : row.count;
    const cbMonthly = cbGpuPrice * HOURS_PER_MONTH * gpuCount * instanceCount;
    cbResult.textContent = formatCurrency(cbMonthly);
  } else {
    cbResult.textContent = "-";
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

export function initCalculator() {
  populateSelect();

  const select = document.getElementById("calc-instance");
  const countInput = document.getElementById("calc-count");

  if (select) select.addEventListener("change", updateResult);
  if (countInput) countInput.addEventListener("input", updateResult);

  document.addEventListener("lang-changed", () => {
    updateResult();
  });

  updateResult();
}
