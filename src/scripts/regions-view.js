// Regions タブ (仕様 5.3)。行 = インスタンス、列 = リージョン。
// 描画は table-engine.js に任せ、ここは列の組み立てと状態の受け取りだけを持つ。
//
// 仕様の 2 段見出し (地理グループを上段に) は table-engine が 1 段しか描けないため
// 見送った。代わりに列を地理グループ順に並べ、グループ単位の表示切替バーを表の上に
// 置き、各列の <th> に正式名のツールチップを出している。
import { createTable } from "./table-engine.js";
import { GPU_DATA } from "./gpu-data.js";
import { REGIONS_FILE } from "./regions-data.js";
import { loadState, filterRows, COMPARE_STATE_EVENT } from "./compare-view.js";
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

// regions.json の並び (地理グループ順) をそのまま列の並びにする。
export function availabilityColumns(regions) {
  return regions.map((region) => ({
    key: region.code,
    group: regionGroup(region.code),
    labelKey: region.code, // t() は辞書に無いキーをそのまま返すのでコードが出る
    title: region.name,
    type: "availability",
  }));
}

// 表エンジンは row[column.key] を読むので、リージョンコードを行の属性として持たせる。
// availability に載っていない size は全列が空 (= すべて EMPTY) の行になる。
export function withAvailability(rows, file) {
  return rows.map((row) => ({ ...row, ...(file.availability?.[row.size] ?? {}) }));
}

function uniqueGroups(columns) {
  const seen = [];
  for (const column of columns) {
    if (!seen.includes(column.group)) seen.push(column.group);
  }
  return seen;
}

export function initRegionsView({ rows = GPU_DATA, file = REGIONS_FILE } = {}) {
  const mount = document.getElementById("regions-table");
  const missing = document.getElementById("regions-missing");
  const generated = document.getElementById("regions-generated");
  const groupBox = document.getElementById("region-groups");
  if (!mount) return { update() {} };

  // 仕様 10: データが無ければ「未生成」の表示にして表は出さない。
  if (!file) {
    mount.replaceChildren();
    if (groupBox) groupBox.replaceChildren();
    if (missing) missing.hidden = false;
    if (generated) generated.textContent = "";
    return { update() {} };
  }
  if (missing) missing.hidden = true;

  const columns = [
    { key: "size", group: "instance", labelKey: "table.instanceSize", type: "text", sticky: true, mono: true },
    ...availabilityColumns(file.regions),
  ];

  // 行は Compare と同じ世代・ファミリのフィルタを共有する (仕様 5.3)。
  // Compare が状態を変えるたびにイベントで飛んでくるので、それを持ち回る。
  let state = { ...loadState(), sortKey: null, sortDir: null, hiddenGroups: [] };

  // 表に渡すのは、行のフィルタ (Compare の state) と列の表示切替 (このタブ独自の
  // hiddenGroups) を混ぜたもの。行のフィルタに hiddenGroups は関係しない。
  const hiddenGroups = [];

  function tableState() {
    return { sortKey: state.sortKey, sortDir: state.sortDir, hiddenGroups };
  }

  function tableRows() {
    return withAvailability(filterRows(rows, state, file), file);
  }

  const table = createTable({
    columns,
    rows: tableRows(),
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
    table.update(tableRows(), tableState());
    if (generated) {
      generated.textContent = t("regions.generatedAt").replace("{date}", file.generatedAt);
    }
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

  // Compare 側のフィルタ変更に追随する (仕様 5.3: state を共有)。
  document.addEventListener(COMPARE_STATE_EVENT, (event) => {
    const next = event.detail?.state;
    if (!next) return;
    state = { ...state, generations: next.generations, families: next.families, region: next.region };
    update();
  });

  document.addEventListener("lang-changed", () => {
    buildGroupToggles();
    update();
  });

  buildGroupToggles();
  update();

  return { update };
}
