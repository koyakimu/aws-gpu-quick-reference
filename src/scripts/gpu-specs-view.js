// GPU タブの上段に置く GPU スペック比較表。
// 行 = gpuKey ごとに 1 行 (instances.json の登場順 + gpu-specs.json の extraGpus)、
// 列 = データシートの各数値。
// 列は Compute / Memory / Power の 3 グループに分け、compare-view と同じ要領で
// グループ単位の表示切替を持つ。
import { createTable } from "./table-engine.js";
import { GPU_DATA, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { EXTRA_GPUS, SPECS_FILE, withExtraGpus } from "./gpu-specs-data.js";
import { t } from "./i18n.js";

// 先頭の gpu 列を除いた列グループ。表示切替のチェックボックスもこの順で出す。
export const SPEC_COLUMN_GROUPS = ["compute", "memory", "power"];

// Compute グループの列。すべて TFLOPS (INT8 だけ TOPS)。
const COMPUTE_FIELDS = [
  "fp64",
  "fp64Tc",
  "fp32",
  "tf32Dense",
  "tf32Sparse",
  "bf16Dense",
  "bf16Sparse",
  "fp16Dense",
  "fp16Sparse",
  "fp8Dense",
  "fp8Sparse",
  "fp6Dense",
  "fp6Sparse",
  "fp4Dense",
  "fp4Sparse",
  "int8Dense",
  "int8Sparse",
];

const MEMORY_FIELDS = ["memoryGb", "memoryBandwidthGbs"];
const POWER_FIELDS = ["tdpW"];

export const SPEC_FIELDS = [...COMPUTE_FIELDS, ...MEMORY_FIELDS, ...POWER_FIELDS];

// gpuKey → { gpu, gen, announced? }。instances.json の登場順を保ち、
// インスタンスがまだ無い GPU (gpu-specs.json の extraGpus) を after の直後に差し込む。
export function gpuOrder(rows = GPU_DATA, extras = EXTRA_GPUS) {
  const order = new Map();
  for (const row of rows) {
    if (row.gpuKey && !order.has(row.gpuKey)) order.set(row.gpuKey, { gpu: row.gpu, gen: row.gen });
  }
  return withExtraGpus(order, extras ?? EXTRA_GPUS);
}

// 表に渡す行。gpu-specs.json に無い gpuKey は行を作らない。
export function buildSpecRows(file, rows = GPU_DATA) {
  const out = [];
  for (const [gpuKey, { gpu, gen, announced }] of gpuOrder(rows, file?.extraGpus ?? EXTRA_GPUS)) {
    const spec = file?.gpus?.[gpuKey];
    if (!spec) continue;
    const row = {
      gpuKey,
      gpu,
      gen,
      announced: announced === true,
      link: GPU_DATASHEET_LINKS[gpu] || null,
      notes: spec.notes || "",
    };
    for (const field of SPEC_FIELDS) row[field] = spec[field] ?? null;
    out.push(row);
  }
  return out;
}

// 先頭列: 世代色のチップ。データシートがあればリンクにする (compare-view と同じ見た目)。
function gpuCell(_value, row) {
  const chip = document.createElement(row.link ? "a" : "span");
  chip.className = `chip chip-${row.gen}`;
  chip.textContent = row.gpu;
  if (row.link) {
    chip.href = row.link;
    chip.target = "_blank";
    chip.rel = "noopener";
    chip.title = `${row.gpu} datasheet`;
  }
  if (!row.announced) return chip;

  // インスタンスがまだ無い GPU は「発表済み」の印を添えて、表に価格行が無い理由を示す。
  const fragment = document.createDocumentFragment();
  fragment.appendChild(chip);
  const mark = document.createElement("span");
  mark.className = "chip-announced";
  mark.textContent = t("gpu.announced");
  fragment.appendChild(mark);
  return fragment;
}

function numberColumn(key, group) {
  return { key, group, labelKey: `specs.${key}`, type: "number" };
}

export const SPEC_COLUMNS = [
  {
    key: "gpu",
    group: "gpu",
    labelKey: "groups.gpu",
    type: "text",
    sticky: true,
    sortable: false,
    format: gpuCell,
  },
  ...COMPUTE_FIELDS.map((key) => numberColumn(key, "compute")),
  ...MEMORY_FIELDS.map((key) => numberColumn(key, "memory")),
  ...POWER_FIELDS.map((key) => numberColumn(key, "power")),
];

export function initGpuSpecsView({ rows = GPU_DATA, file = SPECS_FILE } = {}) {
  const mount = document.getElementById("gpu-specs-table");
  const missing = document.getElementById("specs-missing");
  const unitNote = document.getElementById("specs-unit-note");
  const columnBox = document.getElementById("spec-column-toggles");
  if (!mount) return { update() {} };

  // 仕様 10: データが無ければ「未生成」の表示にして表は出さない。
  if (!file) {
    mount.replaceChildren();
    if (missing) missing.hidden = false;
    if (unitNote) unitNote.textContent = "";
    if (columnBox) columnBox.replaceChildren();
    return { update() {} };
  }
  if (missing) missing.hidden = true;

  const state = { sortKey: null, sortDir: null, hiddenGroups: [] };
  const specRows = buildSpecRows(file, rows);

  const table = createTable({
    columns: SPEC_COLUMNS,
    rows: specRows,
    state,
    // Compute / Memory / Power の見出しを 1 段目のヘッダに出す。
    groupHeader: (group) => (group === "gpu" ? "" : t(`groups.${group}`)),
    onStateChange(next) {
      state.sortKey = next.sortKey;
      state.sortDir = next.sortDir;
      table.update(specRows, state);
    },
    i18n: t,
  });

  mount.replaceChildren(table.el);

  function buildColumnToggles() {
    if (!columnBox) return;
    const fragment = document.createDocumentFragment();
    for (const group of SPEC_COLUMN_GROUPS) {
      const label = document.createElement("label");
      label.className = "menu-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.dataset.specGroup = group;
      input.checked = !state.hiddenGroups.includes(group);
      label.appendChild(input);
      label.appendChild(document.createTextNode(t(`groups.${group}`)));
      fragment.appendChild(label);
    }
    columnBox.replaceChildren(fragment);
  }

  if (columnBox) {
    columnBox.addEventListener("change", (event) => {
      const input = event.target.closest("[data-spec-group]");
      if (!input) return;
      const group = input.dataset.specGroup;
      const index = state.hiddenGroups.indexOf(group);
      if (index === -1) state.hiddenGroups.push(group);
      else state.hiddenGroups.splice(index, 1);
      table.update(specRows, state);
    });
  }

  function paintLabels() {
    if (unitNote) unitNote.textContent = t("specs.unitNote");
    buildColumnToggles();
  }

  document.addEventListener("lang-changed", () => {
    paintLabels();
    table.update(specRows, state);
  });
  paintLabels();

  return { update: () => table.update(specRows, state) };
}
