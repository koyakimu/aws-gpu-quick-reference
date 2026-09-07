// Features タブ (仕様 5.4)。行 = GPU (gpuKey ごとに 1 行)、列 = 機能。
// セルの ✓ / △ / 空欄は table-engine の feature 型がそのまま描くので、
// ここは列の組み立てと注記番号の割り当てだけを持つ。
import { createTable } from "./table-engine.js";
import { GPU_DATA, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { FEATURES_FILE } from "./features-data.js";
import { t } from "./i18n.js";

// gpuKey → 表示名。instances.json の gpu をそのまま使う (同じ gpuKey なら同じ名前)。
export function gpuNames(rows) {
  const names = new Map();
  for (const row of rows) {
    if (row.gpuKey && !names.has(row.gpuKey)) names.set(row.gpuKey, row.gpu);
  }
  return names;
}

// 表に渡す行を作る。並びは instances.json の登場順 (= 世代の新しい順)。
// notes は「partial のセル」の分だけ通し番号を振り、表の下の一覧と対応させる。
export function buildFeatureRows(file, rows = GPU_DATA) {
  const names = gpuNames(rows);
  const notes = [];
  const out = [];

  for (const [gpuKey, name] of names) {
    const entry = file.gpus?.[gpuKey];
    if (!entry) continue;

    const row = { gpuKey, gpu: name, link: GPU_DATASHEET_LINKS[name] || null, noteRefs: {} };
    for (const feature of file.features) {
      row[feature.key] = entry[feature.key] ?? false;
      const note = entry.notes?.[feature.key];
      if (note) {
        notes.push({ n: notes.length + 1, gpu: name, feature: feature.key, text: note });
        row.noteRefs[feature.key] = notes.length;
      }
    }
    out.push(row);
  }

  return { rows: out, notes };
}

// 先頭列: GPU 名をデータシートへのリンクにする。リンクが無ければ素のテキスト。
function gpuCell(_value, row) {
  if (!row.link) return row.gpu;
  const a = document.createElement("a");
  a.href = row.link;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = row.gpu;
  return a;
}

// feature 型の既定表示 (✓ / △ / 空欄) に、partial のときだけ注記番号を足す。
function featureCell(value, row, key) {
  if (value === true) return "✓";
  if (value === "partial") {
    const ref = row.noteRefs?.[key];
    return ref ? `△ ${ref}` : "△";
  }
  return "—";
}

export function featureColumns(file) {
  return [
    {
      key: "gpu",
      group: "gpu",
      labelKey: "groups.gpu",
      type: "text",
      sticky: true,
      sortable: false,
      format: gpuCell,
    },
    ...file.features.map((feature) => ({
      key: feature.key,
      group: "feature",
      labelKey: `features.${feature.key}.label`,
      title: t(`features.${feature.key}.desc`),
      type: "feature",
      format: (value, row) => featureCell(value, row, feature.key),
    })),
  ];
}

function renderNotes(el, notes) {
  if (!el) return;
  if (notes.length === 0) {
    el.replaceChildren();
    return;
  }
  const ol = document.createElement("ol");
  ol.className = "feature-notes";
  for (const note of notes) {
    const li = document.createElement("li");
    li.value = note.n;
    li.textContent = `${note.gpu} / ${t(`features.${note.feature}.label`)}: ${note.text}`;
    ol.appendChild(li);
  }
  el.replaceChildren(ol);
}

export function initFeaturesView({ rows = GPU_DATA, file = FEATURES_FILE } = {}) {
  const mount = document.getElementById("features-table");
  const missing = document.getElementById("features-missing");
  const notesBox = document.getElementById("features-notes");
  const legend = document.getElementById("features-legend");
  if (!mount) return { update() {} };

  // 仕様 10: データが無ければ「未生成」の表示にして表は出さない。
  if (!file) {
    mount.replaceChildren();
    if (missing) missing.hidden = false;
    if (notesBox) notesBox.replaceChildren();
    if (legend) legend.textContent = "";
    return { update() {} };
  }
  if (missing) missing.hidden = true;

  let state = { sortKey: null, sortDir: null, hiddenGroups: [] };

  function build() {
    const { rows: featureRows, notes } = buildFeatureRows(file, rows);
    const table = createTable({
      columns: featureColumns(file),
      rows: featureRows,
      state,
      onStateChange(next) {
        state = { ...state, sortKey: next.sortKey, sortDir: next.sortDir };
        build();
      },
      i18n: t,
    });
    mount.replaceChildren(table.el);
    renderNotes(notesBox, notes);
    if (legend) legend.textContent = t("features.legend");
  }

  document.addEventListener("lang-changed", build);
  build();

  return { update: build };
}
