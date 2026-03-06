import { GPU_DATA, EC2_LINKS, GPU_DATASHEET_LINKS } from "./gpu-data.js";
import { t } from "./i18n.js";

function parseFraction(str) {
  const parts = str.split("/");
  return parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(str);
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function createVramContent(vramPerGpu, count) {
  const span = document.createElement("span");

  if (typeof count === "string" && count.includes("/")) {
    const fraction = parseFraction(count);
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
    const fraction = parseFraction(count);
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

export function renderTable() {
  const tbody = document.getElementById("gpu-table-body");
  const fragment = document.createDocumentFragment();

  GPU_DATA.forEach((row) => {
    const tr = document.createElement("tr");
    tr.className = `row-${row.gen}`;

    if (row.genRows) {
      tr.appendChild(createCell("td", GEN_LABELS[row.gen], "arch", { rowspan: row.genRows }));
    }

    if (row.gpu) {
      const attrs = row.gpuRows ? { rowspan: row.gpuRows } : {};
      const gpuCell = createCell("td", null, "gpu", attrs);
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
      if (row.gpuNew) {
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "NEW";
        gpuCell.appendChild(badge);
      }
      tr.appendChild(gpuCell);
    }

    if (row.ec2) {
      const attrs = row.ec2Rows ? { rowspan: row.ec2Rows } : {};
      const ec2Cell = createCell("td", null, null, attrs);
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

    const fp16CudaCell = document.createElement("td");
    if (estClass) fp16CudaCell.className = estClass;
    fp16CudaCell.appendChild(createPerfContent(row.fp16NonTc, row.count, row.est));
    tr.appendChild(fp16CudaCell);

    const fp16DenseCell = document.createElement("td");
    if (estClass) fp16DenseCell.className = estClass;
    fp16DenseCell.appendChild(createPerfContent(row.fp16Dense, row.count, row.est));
    tr.appendChild(fp16DenseCell);

    const fp16SparseCell = document.createElement("td");
    if (estClass) fp16SparseCell.className = estClass;
    fp16SparseCell.appendChild(createPerfContent(row.fp16Sparse, row.count, row.est));
    tr.appendChild(fp16SparseCell);

    const fp8DenseCell = document.createElement("td");
    if (estClass) fp8DenseCell.className = estClass;
    fp8DenseCell.appendChild(createPerfContent(row.fp8Dense, row.count, row.est));
    tr.appendChild(fp8DenseCell);

    const fp8SparseCell = document.createElement("td");
    if (estClass) fp8SparseCell.className = estClass;
    fp8SparseCell.appendChild(createPerfContent(row.fp8Sparse, row.count, row.est));
    tr.appendChild(fp8SparseCell);

    const fp4DenseCell = document.createElement("td");
    if (estClass) fp4DenseCell.className = estClass;
    fp4DenseCell.appendChild(createPerfContent(row.fp4Dense, row.count, row.est));
    tr.appendChild(fp4DenseCell);

    const fp4SparseCell = document.createElement("td");
    if (estClass) fp4SparseCell.className = estClass;
    fp4SparseCell.appendChild(createPerfContent(row.fp4Sparse, row.count, row.est));
    tr.appendChild(fp4SparseCell);

    tr.appendChild(createCell("td", row.efa, "efa"));
    tr.appendChild(createCell("td", row.pcie, "pcie"));
    tr.appendChild(createCell("td", String(row.vcpu)));
    tr.appendChild(createCell("td", row.mem));
    tr.appendChild(createCell("td", row.nvme));

    const priceClass = row.price && row.price !== "TBD" ? "price" : "cbo";
    tr.appendChild(createCell("td", row.price || t("table.cbOnly"), priceClass));
    tr.appendChild(createCell("td", row.priceGpu || "-", priceClass));
    tr.appendChild(createCell("td", row.priceCb, "cb"));
    tr.appendChild(createCell("td", row.tokyo ? "◯" : "✕", row.tokyo ? "ok" : "no"));

    tr.appendChild(document.createTextNode(""));
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

export { parseFraction, formatNumber };
