// Regions タブ (仕様 5.3)。行 = インスタンス、列 = リージョン。
// 描画は table-engine.js に任せ、ここは列の組み立てと状態の受け取りだけを持つ。
//
// 仕様の 2 段見出し (地理グループを上段に) は table-engine が 1 段しか描けないため
// 見送った。代わりに列を地理グループ順に並べ、グループ単位の表示切替バーを表の上に
// 置き、各列の <th> に正式名のツールチップを出している。
import { createTable, EMPTY } from "./table-engine.js";
import { GPU_DATA } from "./gpu-data.js";
import { REGIONS_FILE } from "./regions-data.js";
import { loadState, saveState, filterRows, formatRowCount, COMPARE_STATE_EVENT } from "./compare-view.js";
import {
  buildFamilyCheckboxes,
  buildGenerationButtons,
  bindFamilyToggle,
  bindGenerationToggle,
  syncFamilyCheckboxes,
  syncGenerationButtons,
} from "./filter-bar.js";
import { t } from "./i18n.js";

// scripts/lib/regions.mjs の regionGroup と同じ対応表。表示側は Node のスクリプトを
// import できないので、5 行だけ写している。増やすときは両方直すこと。
const GROUP_PREFIXES = [
  ["na", ["us-", "ca-", "mx-"]],
  ["sa", ["sa-"]],
  ["eu", ["eu-"]],
  ["meaf", ["me-", "il-", "af-"]],
  ["ap", ["ap-"]],
];

export function regionGroup(code) {
  for (const [group, prefixes] of GROUP_PREFIXES) {
    if (prefixes.some((prefix) => code.startsWith(prefix))) return group;
  }
  return "other";
}

// 提供状況の小さな色付きピル。OD は青系 (Hopper チップと同系)、CB はアクセントの琥珀。
// 「両方」は 2 つ並べる。素の "OD+CB" より、列を横に流し読みしたときに拾いやすい。
export function availabilityPill(kind) {
  const pill = document.createElement("span");
  pill.className = `avail avail-${kind}`;
  pill.textContent = kind === "od" ? "OD" : "CB";
  return pill;
}

// table-engine の availability 既定描画 ("OD+CB" 等のテキスト) は他のタブも使うので
// 触らず、この列だけ format フックで Node を返して差し替える。
export function availabilityCell(value) {
  if (value !== "od" && value !== "cb" && value !== "both") return EMPTY;
  const fragment = document.createDocumentFragment();
  if (value !== "cb") fragment.appendChild(availabilityPill("od"));
  if (value !== "od") fragment.appendChild(availabilityPill("cb"));
  return fragment;
}

// regions.json の並び (地理グループ順) をそのまま列の並びにする。
export function availabilityColumns(regions) {
  return regions.map((region) => ({
    key: region.code,
    group: regionGroup(region.code),
    labelKey: region.code, // t() は辞書に無いキーをそのまま返すのでコードが出る
    title: region.name,
    type: "availability",
    format: availabilityCell,
  }));
}

// 表エンジンは row[column.key] を読むので、リージョンコードを行の属性として持たせる。
// availability に載っていない size は全列が空 (= すべて EMPTY) の行になる。
export function withAvailability(rows, file) {
  return rows.map((row) => ({ ...row, ...(file.availability?.[row.size] ?? {}) }));
}

// ISO 文字列をそのまま出すと読みづらいので UTC の日付部分だけにする。
export function formatGeneratedAt(iso) {
  if (typeof iso !== "string") return "";
  const match = /^\d{4}-\d{2}-\d{2}/.exec(iso);
  return match ? match[0] : iso;
}

function uniqueGroups(columns) {
  const seen = [];
  for (const column of columns) {
    if (!seen.includes(column.group)) seen.push(column.group);
  }
  return seen;
}

// 凡例。{od} / {cb} の位置に本物のピルを差し込むので、表のセルと同じ見た目になる。
function buildLegend(box) {
  if (!box) return;
  const fragment = document.createDocumentFragment();
  for (const part of t("regions.legend").split(/(\{od\}|\{cb\})/)) {
    if (part === "{od}") fragment.appendChild(availabilityPill("od"));
    else if (part === "{cb}") fragment.appendChild(availabilityPill("cb"));
    else if (part) fragment.appendChild(document.createTextNode(part));
  }
  box.replaceChildren(fragment);
}

export function initRegionsView({ rows = GPU_DATA, file = REGIONS_FILE } = {}) {
  const mount = document.getElementById("regions-table");
  const missing = document.getElementById("regions-missing");
  const generated = document.getElementById("regions-generated");
  const note = document.getElementById("regions-local-zone-note");
  const legend = document.getElementById("regions-legend");
  const groupBox = document.getElementById("region-groups");
  const genBox = document.getElementById("regions-gen-filters");
  const familyBox = document.getElementById("regions-family-filters");
  const counter = document.getElementById("regions-row-count");
  if (!mount) return { update() {} };

  // 仕様 10: データが無ければ「未生成」の表示にして表は出さない。
  if (!file) {
    mount.replaceChildren();
    if (groupBox) groupBox.replaceChildren();
    if (genBox) genBox.replaceChildren();
    if (familyBox) familyBox.replaceChildren();
    if (missing) missing.hidden = false;
    if (generated) generated.textContent = "";
    if (note) note.textContent = "";
    if (legend) legend.replaceChildren();
    if (counter) counter.textContent = "";
    return { update() {} };
  }
  if (missing) missing.hidden = true;

  const columns = [
    { key: "size", group: "instance", labelKey: "table.instanceSize", type: "text", sticky: true, mono: true },
    ...availabilityColumns(file.regions),
  ];

  // 行は Compare と同じ世代・ファミリのフィルタを共有する (仕様 5.3)。
  // このタブにも同じフィルタバーを出すが、状態は 1 つ。片方を触るともう片方の
  // ボタンもイベント経由で追随する。
  const state = { ...loadState(), sortKey: null, sortDir: null, hiddenGroups: [] };

  // 表に渡すのは、行のフィルタ (共有 state) と列の表示切替 (このタブ独自の
  // hiddenGroups) を混ぜたもの。行のフィルタに hiddenGroups は関係しない。
  const hiddenGroups = [];

  function tableState() {
    return { sortKey: state.sortKey, sortDir: state.sortDir, hiddenGroups };
  }

  function shownRows() {
    return filterRows(rows, state, file);
  }

  const table = createTable({
    columns,
    rows: withAvailability(shownRows(), file),
    state: tableState(),
    onStateChange(next) {
      state.sortKey = next.sortKey;
      state.sortDir = next.sortDir;
      update();
    },
    i18n: t,
  });

  mount.replaceChildren(table.el);

  function update() {
    const shown = shownRows();
    table.update(withAvailability(shown, file), tableState());
    if (counter) counter.textContent = formatRowCount(shown.length, rows.length);
    if (generated) {
      generated.textContent = t("regions.generatedAt").replace("{date}", formatGeneratedAt(file.generatedAt));
    }
    if (note) {
      note.textContent = t("regions.localZoneNote");
    }
    buildLegend(legend);
  }

  function notifyStateChanged() {
    document.dispatchEvent(new CustomEvent(COMPARE_STATE_EVENT, { detail: { state, source: "regions" } }));
  }

  function buildGroupToggles() {
    if (!groupBox) return;
    const fragment = document.createDocumentFragment();
    for (const group of uniqueGroups(columns.slice(1))) {
      const on = !hiddenGroups.includes(group);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ctl";
      btn.dataset.group = group;
      btn.textContent = t(`regionGroups.${group}`);
      btn.setAttribute("aria-pressed", String(on));
      btn.classList.toggle("on", on);
      fragment.appendChild(btn);
    }
    groupBox.replaceChildren(fragment);
  }

  if (groupBox) {
    groupBox.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-group]");
      if (!btn) return;
      const group = btn.dataset.group;
      const index = hiddenGroups.indexOf(group);
      if (index === -1) hiddenGroups.push(group);
      else hiddenGroups.splice(index, 1);
      const on = !hiddenGroups.includes(group);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-pressed", String(on));
      update();
    });
  }

  // 世代は Compare 側と同じく保存する。ファミリは保存しない (仕様 5.2)。
  bindGenerationToggle(genBox, state, () => {
    saveState(state);
    notifyStateChanged();
    update();
  });

  bindFamilyToggle(familyBox, state, () => {
    notifyStateChanged();
    update();
  });

  // Compare 側のフィルタ変更に追随する (仕様 5.3: state を共有)。
  // 共有するのは世代・ファミリだけ。リージョン選択まで引き継ぐと、この表の列が
  // 1 リージョン分に絞られて「どこで使えるか」を見る目的が潰れる。
  document.addEventListener(COMPARE_STATE_EVENT, (event) => {
    if (event.detail?.source === "regions") return;
    const next = event.detail?.state;
    if (!next) return;
    state.generations = next.generations;
    state.families = next.families;
    syncGenerationButtons(genBox, state);
    syncFamilyCheckboxes(familyBox, state);
    update();
  });

  document.addEventListener("lang-changed", () => {
    buildGroupToggles();
    buildGenerationButtons(genBox, rows, state, t);
    update();
  });

  buildGroupToggles();
  buildGenerationButtons(genBox, rows, state, t);
  buildFamilyCheckboxes(familyBox, rows, state);
  update();

  return { update };
}
