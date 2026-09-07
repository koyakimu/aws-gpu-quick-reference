import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { formatPrice, parseCount, computeSpans, isNew } from "./format.js";
import { t } from "./i18n.js";

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function createVramContent(vramPerGpu, count) {
  const span = document.createElement("span");

  if (typeof count === "string" && count.includes("/")) {
    const fraction = parseCount(count);
    const totalVram = vramPerGpu * fraction;
    span.textContent = `${totalVram}GB`;
    return span;
  }

  const numCount = typeof count === "number" ? count : parseInt(count);

  if (numCount === 1) {
    span.textContent = `${vramPerGpu}GB`;
    return span;
  }

  const totalGb = vramPerGpu * numCount;
  span.textContent = `${vramPerGpu}GB`;

  const br = document.createElement("br");
  const small = document.createElement("small");

  if (totalGb >= 1000) {
    const totalTb = (totalGb / 1000).toFixed(1);
    small.textContent = `(${totalTb}TB)`;
  } else {
    small.textContent = `(${totalGb}GB)`;
  }

  const frag = document.createDocumentFragment();
  frag.appendChild(span);
  frag.appendChild(br);
  frag.appendChild(small);
  return frag;
}

function createPerfContent(perfPerGpu, count, est = false) {
  const span = document.createElement("span");

  if (perfPerGpu === null) {
    span.textContent = "-";
    return span;
  }

  if (typeof count === "string" && count.includes("/")) {
    const fraction = parseCount(count);
    const totalPerf = Math.round(perfPerGpu * fraction);
    span.textContent = est ? totalPerf + "*" : String(totalPerf);
    return span;
  }

  const numCount = typeof count === "number" ? count : parseInt(count);

  if (numCount === 1) {
    span.textContent = est ? formatNumber(perfPerGpu) + "*" : formatNumber(perfPerGpu);
    return span;
  }

  const totalPerf = perfPerGpu * numCount;
  span.textContent = formatNumber(perfPerGpu);

  const br = document.createElement("br");
  const small = document.createElement("small");
  small.textContent = `(${formatNumber(totalPerf)})`;

  const frag = document.createDocumentFragment();
  frag.appendChild(span);
  frag.appendChild(br);
  frag.appendChild(small);
  if (est) {
    const asterisk = document.createTextNode("*");
    frag.appendChild(asterisk);
  }
  return frag;
}

const GEN_LABELS = {
  blackwell: "Blackwell",
  hopper: "Hopper",
  ada: "Ada",
  ampere: "Ampere",
  turing: "Turing",
  volta: "Volta",
};

function createCell(tag, text, className, attrs) {
  const el = document.createElement(tag || "td");
  if (text != null) el.textContent = text;
  if (className) el.className = className;
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, v);
    }
  }
  return el;
}

// rowspan="1" は付けない。setupHover が td[rowspan] を結合セルの集合として拾うため、
// 単独セルに付けるとホバー時の挙動が変わってしまう。
function rowspanAttr(n) {
  return n > 1 ? { rowspan: n } : null;
}

// now は注入可能。NEW バッジの判定が実行日時に依存しないよう、テストから固定値を渡せるようにしている。
export function renderTable({ now = new Date() } = {}) {
  const tbody = document.getElementById("gpu-table-body");
  const fragment = document.createDocumentFragment();
  const spans = computeSpans(GPU_DATA);

  GPU_DATA.forEach((row, i) => {
    const span = spans[i];
    const tr = document.createElement("tr");
    tr.className = `row-${row.gen}`;

    if (span.gen > 0) {
      tr.appendChild(createCell("td", GEN_LABELS[row.gen], "arch", rowspanAttr(span.gen)));
    }

    if (span.gpu > 0) {
      const gpuCell = createCell("td", null, "gpu", rowspanAttr(span.gpu));
      const datasheetUrl = GPU_DATASHEET_LINKS[row.gpu];
      if (datasheetUrl) {
        const link = document.createElement("a");
        link.href = datasheetUrl;
        link.target = "_blank";
        link.className = "gpu-link";
        link.title = `${row.gpu} Datasheet`;
        link.textContent = row.gpu;
        gpuCell.appendChild(link);
      } else {
        gpuCell.appendChild(document.createTextNode(row.gpu));
      }
      if (isNew(row.addedAt, now)) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "NEW";
        gpuCell.appendChild(badge);
      }
      tr.appendChild(gpuCell);
    }

    if (span.ec2 > 0) {
      const ec2Cell = createCell("td", null, null, rowspanAttr(span.ec2));
      const link = document.createElement("a");
      link.href = EC2_LINKS[row.ec2] || "#";
      link.target = "_blank";
      link.className = "ec2-link";
      link.title = `${row.ec2} インスタンス詳細`;
      link.textContent = row.ec2;
      ec2Cell.appendChild(link);
      tr.appendChild(ec2Cell);
    }

    tr.appendChild(createCell("td", row.size, "inst"));
    tr.appendChild(createCell("td", String(row.count)));

    const vramCell = document.createElement("td");
    vramCell.appendChild(createVramContent(row.vramPerGpu, row.count));
    tr.appendChild(vramCell);

    const estClass = row.est ? "est" : null;
    const perfFields = ["fp16NonTc", "fp16Dense", "fp16Sparse", "fp8Dense", "fp8Sparse", "fp4Dense", "fp4Sparse"];
    perfFields.forEach((field) => {
      const cell = document.createElement("td");
      if (estClass) cell.className = estClass;
      cell.appendChild(createPerfContent(row[field], row.count, row.est));
      tr.appendChild(cell);
    });

    tr.appendChild(createCell("td", row.efa, "efa"));
    tr.appendChild(createCell("td", row.pcie, "pcie"));
    tr.appendChild(createCell("td", String(row.vcpu)));
    tr.appendChild(createCell("td", row.mem));
    tr.appendChild(createCell("td", row.nvme));

    // price が null で CB 価格がある行は On-Demand 提供なし = CB 専用。
    // どちらも null なら値が未取得なだけなので、通常の価格セルとして "-" を出す。
    const cbOnly = row.price == null && row.priceCb != null;
    const priceClass = cbOnly ? "cbo" : "price";
    tr.appendChild(createCell("td", cbOnly ? t("table.cbOnly") : formatPrice(row.price), priceClass));
    tr.appendChild(createCell("td", formatPrice(row.priceGpu), priceClass));
    tr.appendChild(createCell("td", formatPrice(row.priceCb), "cb"));
    tr.appendChild(createCell("td", row.tokyo ? "◯" : "✕", row.tokyo ? "ok" : "no"));

    fragment.appendChild(tr);
  });

  tbody.replaceChildren(fragment);
}

export function setupHover() {
  const rows = document.querySelectorAll("tbody tr");
  const spanningCells = [];

  rows.forEach((row, i) => {
    const gen = row.className.replace("row-", "");
    row.querySelectorAll("td[rowspan]").forEach((cell) => {
      spanningCells.push({
        cell,
        startRow: i,
        endRow: i + parseInt(cell.getAttribute("rowspan")) - 1,
        gen,
      });
    });
  });

  rows.forEach((row, rowIndex) => {
    row.addEventListener("mouseenter", () => {
      row.querySelectorAll("td").forEach((td) => td.classList.add("cell-hover"));
      spanningCells.forEach((sc) => {
        if (rowIndex >= sc.startRow && rowIndex <= sc.endRow) {
          sc.cell.classList.add(`cell-hover-${sc.gen}`);
        }
      });
    });

    row.addEventListener("mouseleave", () => {
      row.querySelectorAll("td").forEach((td) => td.classList.remove("cell-hover"));
      spanningCells.forEach((sc) => sc.cell.classList.remove(`cell-hover-${sc.gen}`));
    });
  });
}

export { formatNumber };
