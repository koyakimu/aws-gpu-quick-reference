import { GPU_DATA, EC2_LINKS } from "./gpu-data.js";
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
      gpuCell.appendChild(document.createTextNode(row.gpu));
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
    const fp16Cell = document.createElement("td");
    if (estClass) fp16Cell.className = estClass;
    fp16Cell.appendChild(createPerfContent(row.fp16PerGpu, row.count, row.est));
    tr.appendChild(fp16Cell);

    const fp8Cell = document.createElement("td");
    if (estClass) fp8Cell.className = estClass;
    fp8Cell.appendChild(createPerfContent(row.fp8PerGpu, row.count, row.est));
    tr.appendChild(fp8Cell);

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
