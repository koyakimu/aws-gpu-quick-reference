// 汎用の表エンジン。列定義と行の配列だけを受け取り、GPU データを一切知らない。
// 比較表 (compare-view.js)、リージョン表、機能マトリクスの 3 つが共有する。
import { formatNumber } from "./format.js";

// 値が無いセルの表示。モック D に合わせて em ダッシュを使う。
export const EMPTY = "—";

// 右寄せにする型。数値は tabular-nums で揃えたいので等幅にもする。
const NUMERIC_TYPES = new Set(["number", "price"]);

// 順位で比べる型。数値列と同じく「昇順は小さい方が先」に揃えてあるので、
// 初回クリック (= desc) で最良の値 (true / both / ✓) が先頭に来る。
const RANK_TYPES = new Set(["flag", "availability", "feature"]);
const RANKS = {
  flag: { true: 2, false: 1 },
  availability: { both: 3, od: 2, cb: 1 },
  feature: { true: 3, partial: 2, false: 1 },
};

const AVAILABILITY_LABELS = { both: "OD+CB", od: "OD", cb: "CB" };

// null / undefined / 空文字は「値なし」。ソートでは常に末尾、表示では EMPTY。
function isBlank(value) {
  return value == null || value === "";
}

// ソート上の「値なし」。数値列では数として読めない値 (NaN、"n/a" 等) も
// 比較すると NaN を返して順序を壊すので、null と同じく末尾へ送る。
function isMissing(type, value) {
  if (isBlank(value)) return true;
  return NUMERIC_TYPES.has(type) && Number.isNaN(Number(value));
}

function rankOf(type, value) {
  const table = RANKS[type];
  const rank = table[String(value)];
  return rank == null ? 0 : rank;
}

// 並べ替えに使う値。列が sortValue を持つならそちらを優先する
// ("1/8" のような分数文字列を数値に直してから比べる、といった用途)。
function sortValueOf(column, row) {
  return typeof column.sortValue === "function" ? column.sortValue(row) : row[column.key];
}

// 非 null 同士の比較。null の扱いは sortRows 側で行う。
export function compareValues(type, a, b) {
  if (NUMERIC_TYPES.has(type)) return Number(a) - Number(b);
  if (RANK_TYPES.has(type)) return rankOf(type, a) - rankOf(type, b);
  return String(a).localeCompare(String(b));
}

// 並べ替えた新しい配列を返す。入力は変更しない。
// 値なしの行は方向によらず末尾に固定する (仕様 5.1)。
export function sortRows(rows, column, dir) {
  const copy = rows.slice();
  if (!column || !dir) return copy;

  const indexed = copy.map((row, index) => ({ row, index, value: sortValueOf(column, row) }));
  const filled = indexed.filter(({ value }) => !isMissing(column.type, value));
  const blank = indexed.filter(({ value }) => isMissing(column.type, value));

  filled.sort((x, y) => {
    const result = compareValues(column.type, x.value, y.value);
    if (result !== 0) return dir === "asc" ? result : -result;
    return x.index - y.index; // 同値は元の順を保つ (安定ソート)
  });

  return [...filled, ...blank].map(({ row }) => row);
}

// クリックごとに desc → asc → 解除 と巡回する。解除するとデータ順に戻る (仕様 5.2)。
export function nextSortState(state, key) {
  if (state.sortKey !== key) return { sortKey: key, sortDir: "desc" };
  if (state.sortDir === "desc") return { sortKey: key, sortDir: "asc" };
  return { sortKey: null, sortDir: null };
}

export function visibleColumns(columns, hiddenGroups) {
  const hidden = new Set(hiddenGroups || []);
  return columns.filter((column) => !hidden.has(column.group));
}

function isNumericColumn(column) {
  return column.align ? column.align === "right" : NUMERIC_TYPES.has(column.type);
}

function isMonoColumn(column) {
  return column.mono === true || NUMERIC_TYPES.has(column.type);
}

// format 関数が無い列の既定の表示。
function defaultCellText(type, value) {
  if (isBlank(value)) return EMPTY;
  if (type === "price") return Number(value).toFixed(2);
  if (type === "number") return formatNumber(value);
  if (type === "flag") return value === true ? "✓" : EMPTY;
  if (type === "availability") return AVAILABILITY_LABELS[value] || EMPTY;
  if (type === "feature") {
    if (value === true) return "✓";
    if (value === "partial") return "△";
    return EMPTY;
  }
  return String(value);
}

function buildHead(columns, state, i18n) {
  const tr = document.createElement("tr");

  for (const column of columns) {
    const th = document.createElement("th");
    th.dataset.key = column.key;
    th.setAttribute("scope", "col");
    if (column.sticky) th.classList.add("sticky");
    if (isNumericColumn(column)) th.classList.add("num");
    if (column.width) th.style.width = column.width;
    // リージョン列のようにラベルが略記の列は、正式名をツールチップに出す。
    if (column.title) th.title = column.title;

    const sortable = column.sortable !== false;
    const label = i18n(column.labelKey);

    // 並べ替えできる列だけ、中身をネイティブの button にする。
    // フォーカスと Enter / Space はブラウザが面倒を見てくれるので、
    // エンジン側はクリックの委譲だけを持てばよい。
    let content = th;
    if (sortable) {
      th.classList.add("sortable");
      th.setAttribute("aria-sort", "none");
      content = document.createElement("button");
      content.type = "button";
      content.className = "sort-btn";
      th.appendChild(content);
    }
    content.textContent = label;

    if (state.sortKey === column.key && state.sortDir) {
      th.classList.add("sorted");
      th.setAttribute("aria-sort", state.sortDir === "asc" ? "ascending" : "descending");
      const arrow = document.createElement("span");
      arrow.className = "sortarrow";
      arrow.textContent = state.sortDir === "asc" ? "▲" : "▼";
      content.appendChild(arrow);
    }

    tr.appendChild(th);
  }

  return tr;
}

// 列グループの見出し行 (ヘッダ 1 段目)。隣り合う同じ group の列を colspan でまとめる。
// groupHeader(group) が空文字を返した列は見出しなしのセルになる (固定列など)。
function buildGroupHead(columns, groupHeader) {
  const tr = document.createElement("tr");
  tr.className = "group-head";

  for (let i = 0; i < columns.length; ) {
    const group = columns[i].group;
    let span = 1;
    while (i + span < columns.length && columns[i + span].group === group) span++;

    const th = document.createElement("th");
    th.colSpan = span;
    th.setAttribute("scope", "colgroup");
    if (columns[i].sticky) th.classList.add("sticky");
    th.textContent = groupHeader(group) || "";
    tr.appendChild(th);
    i += span;
  }

  return tr;
}

// 世代の帯行。全列にまたがる 1 セルだけを持つ。データ行ではないので
// .band を付けて行数集計や絞り込みから外せるようにする。
function buildBandRow(columns, key, label) {
  const tr = document.createElement("tr");
  tr.className = `band band-${key}`;
  const td = document.createElement("td");
  td.className = "band-cell";
  td.colSpan = columns.length;
  // ラベルは内側の span に入れる。全列にまたがる td は viewport より広くなりうるので、
  // td ではなく span を sticky にしないと横スクロールで文字が見えなくなる。
  const span = document.createElement("span");
  span.className = "band-label";
  span.textContent = label;
  td.appendChild(span);
  tr.appendChild(td);
  return tr;
}

function buildBody(columns, rows, state, options = {}) {
  const fragment = document.createDocumentFragment();
  // 帯と繰り返しの省略はデータ順のときだけ。並べ替え中は行の連続に意味がない。
  const grouped = state.sortKey == null;
  const bandBy = grouped ? options.bandBy : null;
  const collapseRepeats = grouped ? options.collapseRepeats || {} : {};
  let bandKey;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const prevRow = index > 0 ? rows[index - 1] : null;

    if (bandBy) {
      const key = bandBy(row);
      if (key != null && key !== bandKey) {
        const label = options.bandLabel ? options.bandLabel(key) : String(key);
        fragment.appendChild(buildBandRow(columns, key, label));
      }
      bandKey = key;
    }

    const tr = document.createElement("tr");

    for (const column of columns) {
      const td = document.createElement("td");
      const value = row[column.key];

      if (column.sticky) td.classList.add("sticky");
      if (isNumericColumn(column)) td.classList.add("num");
      if (isMonoColumn(column)) td.classList.add("mono");
      if (column.type === "price") td.classList.add("price");
      if (state.sortKey === column.key && state.sortDir) td.classList.add("sorted");

      const collapsed =
        prevRow != null &&
        typeof collapseRepeats[column.key] === "function" &&
        collapseRepeats[column.key](row, prevRow);

      const content = collapsed
        ? ""
        : column.format
          ? column.format(value, row)
          : defaultCellText(column.type, value);
      if (collapsed) td.classList.add("collapsed", "dim");
      if (content instanceof Node) {
        td.appendChild(content);
      } else {
        td.textContent = content;
      }

      // dim は値ではなく描画結果で決める。false の flag のように
      // 「値はあるが EMPTY を描く」セルも薄く見せたいため。
      if (td.textContent === EMPTY) td.classList.add("dim");

      tr.appendChild(td);
    }

    fragment.appendChild(tr);
  }

  return fragment;
}

export function createTable({ columns, rows, state, onStateChange, i18n, bandBy, bandLabel, collapseRepeats, groupHeader }) {
  const el = document.createElement("div");
  el.className = "table-frame";

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");
  table.appendChild(thead);
  table.appendChild(tbody);
  el.appendChild(table);

  let currentState = state;
  const currentColumns = columns;

  // ヘッダは描き直されるので、th ではなく thead に 1 度だけ委譲で張る。
  // button のクリックも th まで上がってくるので、拾うのはここ 1 箇所でよい。
  thead.addEventListener("click", (event) => {
    const th = event.target.closest("th.sortable");
    if (!th) return;
    if (typeof onStateChange !== "function") return;
    onStateChange({ ...currentState, ...nextSortState(currentState, th.dataset.key) });
  });

  function render(nextRows, nextState) {
    currentState = nextState;
    const shown = visibleColumns(currentColumns, nextState.hiddenGroups);
    const sortColumn = shown.find((column) => column.key === nextState.sortKey) || null;
    const head = buildHead(shown, nextState, i18n);
    thead.replaceChildren(...(groupHeader ? [buildGroupHead(shown, groupHeader), head] : [head]));
    tbody.replaceChildren(
      buildBody(shown, sortRows(nextRows, sortColumn, nextState.sortDir), nextState, {
        bandBy,
        bandLabel,
        collapseRepeats,
      }),
    );
  }

  render(rows, state);

  return {
    el,
    update(nextRows, nextState) {
      render(nextRows, nextState || currentState);
    },
  };
}
