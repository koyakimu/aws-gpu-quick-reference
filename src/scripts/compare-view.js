// 比較表 (Compare タブ)。列定義・フィルタ・行数表示・状態の保存を持ち、
// 描画そのものは table-engine.js に任せる。
import { createTable, EMPTY } from "./table-engine.js";
import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { parseCount, formatNumber } from "./format.js";
import { t } from "./i18n.js";
import { REGIONS_FILE } from "./regions-data.js";
import { getPrice, PRICE_REGION_EVENT } from "./price-region.js";
import { GPU_SPECS } from "./gpu-specs-data.js";
import {
  buildFamilyCheckboxes,
  buildGenerationButtons,
  bindFamilyToggle,
  bindGenerationToggle,
  syncFamilyCheckboxes,
  syncGenerationButtons,
  toggleInArray,
} from "./filter-bar.js";

export const STORAGE_KEY = "gpu-ref-compare";

// Regions タブが世代・ファミリのフィルタを共有するためのイベント (仕様 5.3)。
export const COMPARE_STATE_EVENT = "compare-state-changed";

// 仕様 5.2 の 6 グループ。表示順もこの順。
export const COLUMN_GROUPS = ["instance", "gpu", "performance", "connect", "system", "price"];

// GPU 名のチップ。世代で色が変わり、データシートがあればリンクにする。
function gpuChip(value, row) {
  const url = GPU_DATASHEET_LINKS[row.gpu];
  const chip = document.createElement(url ? "a" : "span");
  chip.className = `chip chip-${row.gen}`;
  chip.textContent = row.gpu;
  if (url) {
    chip.href = url;
    chip.target = "_blank";
    chip.rel = "noopener";
    chip.title = `${row.gpu} datasheet`;
  }
  return chip;
}

// ファミリ名は EC2 インスタンス種別のページへのリンク。
function familyLink(value) {
  const url = EC2_LINKS[value];
  if (!url) return value || EMPTY;
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.className = "ec2-link";
  link.textContent = value;
  return link;
}

// GPU 数は "1/8" のような分数もそのまま見せる。並べ替えだけ数値に直す (sortValue)。
function countCell(value) {
  return value == null || value === "" ? EMPTY : String(value);
}

// VRAM は 1 GPU あたりの値。count が "1/8" のような分数なら実効値に直す。
function vramCell(value, row) {
  if (value == null) return EMPTY;
  const count = parseCount(row.count);
  return count < 1 ? String(Math.round(value * count)) : String(value);
}

// 演算性能は est の行だけ末尾に * を付ける。notes.fpNote の「*付きは予想値」がその説明。
function perfCell(value, row) {
  if (value == null || value === "") return EMPTY;
  return formatNumber(value) + (row.est ? "*" : "");
}

// 価格 3 列はヘッダで選んだリージョンの値を出す (price-region.js)。
// 行が持つ price / priceCb は既定リージョンのフォールバックとしてのみ使われる。
function amount(value) {
  return value == null ? EMPTY : value.toFixed(2);
}

// On-Demand が無く CB だけあるインスタンスは「CB専用」と書く。両方無ければ空欄。
function onDemandCell(_value, row) {
  const { od, cb } = getPrice(row);
  if (od == null) return cb == null ? EMPTY : t("table.cbOnly");
  return od.toFixed(2);
}

function priceColumn(key, labelKey, pick) {
  return {
    key,
    group: "price",
    labelKey,
    type: "price",
    format: (_value, row) => amount(pick(getPrice(row))),
    sortValue: (row) => pick(getPrice(row)),
  };
}

// GPU 単体のスペック (gpu-specs.json) から引く列。行ではなく gpuKey に紐づく値なので、
// format と sortValue の両方で同じ引き方をする。est の * は付けない (データシートの実測値)。
function specValue(row, field) {
  const spec = GPU_SPECS[row.gpuKey];
  const value = spec ? spec[field] : null;
  return value == null ? null : value;
}

function specColumn(field, labelKey) {
  return {
    key: `spec-${field}`,
    group: "performance",
    labelKey,
    type: "number",
    format: (_value, row) => {
      const value = specValue(row, field);
      return value == null ? EMPTY : formatNumber(value);
    },
    sortValue: (row) => specValue(row, field),
  };
}

// 演算性能の列。ラベル以外は同じ扱いなので定義をまとめて作る。
const PERF_COLUMNS = [
  ["fp16NonTc", "table.fp16Cuda"],
  ["fp16Dense", "table.fp16Dense"],
  ["fp16Sparse", "table.fp16Sparse"],
  ["fp8Dense", "table.fp8Dense"],
  ["fp8Sparse", "table.fp8Sparse"],
  ["fp4Dense", "table.fp4Dense"],
  ["fp4Sparse", "table.fp4Sparse"],
].map(([key, labelKey]) => ({
  key,
  group: "performance",
  labelKey,
  type: "number",
  format: perfCell,
}));

// FP16 CUDA の直後に、GPU 単体のデータシート値 (gpu-specs.json) から引く 2 列を挟む。
PERF_COLUMNS.splice(1, 0, specColumn("fp32", "table.fp32"), specColumn("tf32Dense", "table.tf32Dense"));

export const COMPARE_COLUMNS = [
  // 読み手は NVIDIA 側 (GPU → ファミリ → サイズ) から見るので、GPU を先頭の固定列にする。
  { key: "gpu", group: "gpu", labelKey: "table.gpuModel", type: "text", sticky: true, format: gpuChip },
  { key: "ec2", group: "instance", labelKey: "table.ec2Type", type: "text", format: familyLink },
  { key: "size", group: "instance", labelKey: "table.instanceSize", type: "text", mono: true },
  {
    key: "count",
    group: "gpu",
    labelKey: "table.gpuCount",
    type: "number",
    format: countCell,
    sortValue: (row) => parseCount(row.count),
  },
  {
    key: "vramPerGpu",
    group: "gpu",
    labelKey: "table.vram",
    type: "number",
    format: vramCell,
    // 分数 GPU の行は表示値 (実効 VRAM) で並べる。vramCell と同じ計算にする。
    sortValue: (row) => row.vramPerGpu * Math.min(1, parseCount(row.count)),
  },
  ...PERF_COLUMNS,
  { key: "efa", group: "connect", labelKey: "table.efa", type: "text", mono: true },
  { key: "pcie", group: "connect", labelKey: "table.pcie", type: "text", mono: true },
  { key: "vcpu", group: "system", labelKey: "table.vcpu", type: "number" },
  { key: "mem", group: "system", labelKey: "table.memory", type: "text", mono: true, align: "right" },
  { key: "nvme", group: "system", labelKey: "table.nvme", type: "text", mono: true, align: "right" },
  {
    key: "price",
    group: "price",
    labelKey: "table.onDemand",
    type: "price",
    format: onDemandCell,
    sortValue: (row) => getPrice(row).od,
  },
  priceColumn("priceGpu", "table.perGpu", (price) => price.gpu),
  priceColumn("priceCb", "table.cb", (price) => price.cb),
  { key: "tokyo", group: "price", labelKey: "table.tokyo", type: "flag" },
];

export function defaultState() {
  return {
    sortKey: null,
    sortDir: null,
    hiddenGroups: [],
    generations: [],
    families: [],
    region: null,
  };
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

export function loadState() {
  const state = defaultState();
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return state; // 壊れた値は黙って既定に戻す。表が出ないより良い。
  }
  if (!stored || typeof stored !== "object") return state;

  state.hiddenGroups = asStringArray(stored.hiddenGroups).filter((g) => COLUMN_GROUPS.includes(g));
  state.generations = asStringArray(stored.generations);
  return state;
}

// 仕様 5.2: 保存するのは hiddenGroups と世代フィルタだけ。ソートとリージョンは保存しない。
export function saveState(state) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ hiddenGroups: state.hiddenGroups, generations: state.generations }),
  );
}

// 選んだリージョンで提供のある行だけ残す (仕様 5.2)。
// region が null、または regions.json が無ければ素通し。
export function regionFilter(rows, region, file = REGIONS_FILE) {
  if (!region || !file) return rows;
  return rows.filter((row) => file.availability?.[row.size]?.[region] != null);
}

export function filterRows(rows, state, file = REGIONS_FILE) {
  const gens = new Set(state.generations);
  const families = new Set(state.families);
  const filtered = rows.filter((row) => {
    if (gens.size > 0 && !gens.has(row.gen)) return false;
    if (families.size > 0 && !families.has(row.ec2)) return false;
    return true;
  });
  return regionFilter(filtered, state.region, file);
}

export function formatRowCount(shown, total) {
  return t("filters.rowCount").replace("{shown}", String(shown)).replace("{total}", String(total));
}

// 呼び出し側が渡す余分なオプション (旧 now など) は無視する。
export function initCompareView({ rows = GPU_DATA, regionsFile = REGIONS_FILE } = {}) {
  const mount = document.getElementById("compare-table");
  if (!mount) return { update() {} };

  const genBox = document.getElementById("gen-filters");
  const familyBox = document.getElementById("family-filters");
  const columnBox = document.getElementById("column-toggles");
  const counter = document.getElementById("compare-row-count");

  const state = loadState();

  const table = createTable({
    columns: COMPARE_COLUMNS,
    rows: filterRows(rows, state, regionsFile),
    state,
    // データ順のときだけ世代の帯を挟み、同じ GPU / ファミリの繰り返しを空欄にする。
    bandBy: (row) => row.gen,
    bandLabel: (gen) => t(`generations.${gen}`),
    collapseRepeats: {
      gpu: (row, prev) => prev.gen === row.gen && prev.gpu === row.gpu,
      ec2: (row, prev) => prev.gen === row.gen && prev.gpu === row.gpu && prev.ec2 === row.ec2,
    },
    onStateChange(next) {
      // ソートだけがここから来る。保存はしない (仕様 5.2)。
      state.sortKey = next.sortKey;
      state.sortDir = next.sortDir;
      update();
    },
    i18n: t,
  });

  const empty = document.createElement("p");
  empty.className = "empty";
  empty.hidden = true;

  mount.replaceChildren(table.el, empty);

  function notifyStateChanged() {
    document.dispatchEvent(new CustomEvent(COMPARE_STATE_EVENT, { detail: { state, source: "compare" } }));
  }

  function update() {
    const shown = filterRows(rows, state, regionsFile);
    table.update(shown, state);
    empty.textContent = t("placeholders.noRows");
    empty.hidden = shown.length > 0;
    if (counter) counter.textContent = formatRowCount(shown.length, rows.length);
  }

  function buildGenerationFilters() {
    buildGenerationButtons(genBox, rows, state, t);
  }

  function buildFamilyFilters() {
    buildFamilyCheckboxes(familyBox, rows, state);
  }

  function buildColumnToggles() {
    if (!columnBox) return;
    const fragment = document.createDocumentFragment();
    for (const group of COLUMN_GROUPS) {
      const label = document.createElement("label");
      label.className = "menu-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.group = group;
      input.checked = !state.hiddenGroups.includes(group);
      label.appendChild(input);
      label.appendChild(document.createTextNode(t(`groups.${group}`)));
      fragment.appendChild(label);
    }
    columnBox.replaceChildren(fragment);
  }

  // リージョン選択は regions.json があるときだけ出す (仕様 5.2 / 10)。
  // 単一選択で、保存はしない。
  function buildRegionFilter() {
    const box = document.getElementById("region-filter");
    if (!box) return;
    if (!regionsFile) {
      box.hidden = true;
      box.replaceChildren();
      return;
    }
    const select = document.createElement("select");
    select.id = "region-select";
    select.className = "ctl";

    const all = document.createElement("option");
    all.value = "";
    all.textContent = t("filters.allRegions");
    select.appendChild(all);

    for (const region of regionsFile.regions) {
      const option = document.createElement("option");
      option.value = region.code;
      option.textContent = region.code;
      option.title = region.name;
      select.appendChild(option);
    }
    select.value = state.region || "";

    select.addEventListener("change", () => {
      state.region = select.value || null;
      notifyStateChanged();
      update();
    });

    box.replaceChildren(select);
    box.hidden = false;
  }

  bindGenerationToggle(genBox, state, () => {
    saveState(state);
    notifyStateChanged();
    update();
  });

  // ファミリは保存しない (仕様 5.2)
  bindFamilyToggle(familyBox, state, () => {
    notifyStateChanged();
    update();
  });

  if (columnBox) {
    columnBox.addEventListener("change", (event) => {
      const input = event.target.closest("[data-group]");
      if (!input) return;
      toggleInArray(state.hiddenGroups, input.dataset.group);
      saveState(state);
      notifyStateChanged();
      update();
    });
  }

  buildGenerationFilters();
  buildFamilyFilters();
  buildColumnToggles();
  buildRegionFilter();
  update();

  // Regions タブのフィルタバーは同じ state を映す 2 つ目の UI なので、
  // 向こうで世代・ファミリが変わったらこちらのボタンも合わせる (仕様 5.3)。
  document.addEventListener(COMPARE_STATE_EVENT, (event) => {
    if (event.detail?.source === "compare") return;
    const next = event.detail?.state;
    if (!next) return;
    state.generations = next.generations;
    state.families = next.families;
    syncGenerationButtons(genBox, state);
    syncFamilyCheckboxes(familyBox, state);
    update();
  });

  // ヘッダで価格のリージョンが変わったら金額を引き直す (行の絞り込みは変えない)。
  document.addEventListener(PRICE_REGION_EVENT, update);

  // 言語切替のたびに見出しとフィルタのラベルを引き直す。
  // ファミリ名は製品名なので訳さない = 作り直す必要がない。
  document.addEventListener("lang-changed", () => {
    buildGenerationFilters();
    buildColumnToggles();
    buildRegionFilter();
    update();
  });

  return { update };
}
