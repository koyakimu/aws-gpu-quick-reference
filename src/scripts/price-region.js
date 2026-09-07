// ヘッダで選んだ「価格のリージョン」を持つ。比較表の価格列と計算ツールが参照する。
// 提供状況の絞り込み (compare-view.js の #region-select) とは別物で、
// あちらは行を絞り、こちらは金額を差し替える。
import { REGIONS_FILE } from "./regions-data.js";
import { PRICING_META } from "./gpu-data.js";
import { parseCount } from "./format.js";

export const PRICE_REGION_EVENT = "price-region-changed";
export const STORAGE_KEY = "gpu-ref-price-region";

// data/instances.json の価格が us-east-1 基準なので、既定もそこに合わせる。
export const DEFAULT_PRICE_REGION = PRICING_META.pricingRegion || "us-east-1";

// テストから差し替えられるようにモジュール変数で持つ (import は再代入できないため)。
let regionsFile = REGIONS_FILE;

export function setRegionsFile(file) {
  regionsFile = file;
}

export function getRegionsFile() {
  return regionsFile;
}

function knownRegion(code) {
  if (!code) return false;
  return (regionsFile?.regions ?? []).some((region) => region.code === code);
}

let current = null;

function load() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null; // localStorage が使えない環境でも既定で動く
  }
  return knownRegion(saved) ? saved : DEFAULT_PRICE_REGION;
}

export function getPriceRegion() {
  if (current == null) current = load();
  return current;
}

export function setPriceRegion(code) {
  current = code || DEFAULT_PRICE_REGION;
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // 保存できなくても選択自体は効かせる
  }
  document.dispatchEvent(new CustomEvent(PRICE_REGION_EVENT, { detail: { region: current } }));
}

// regions.json の prices から 1 行分を引く。od はインスタンス単位、cb は GPU 1 枚あたり。
export function getRegionPrices(size, region = getPriceRegion()) {
  const entry = regionsFile?.prices?.[size]?.[region];
  return { od: entry?.od ?? null, cb: entry?.cb ?? null };
}

// 表示に使う 1 行分の価格。regions.json に値が無い既定リージョンでは
// instances.json の値に落とす (regions.json が無いときも今までと同じ数字になる)。
export function getPrice(row, region = getPriceRegion()) {
  const { od: regionOd, cb: regionCb } = getRegionPrices(row.size, region);
  const isDefault = region === DEFAULT_PRICE_REGION;
  const od = regionOd ?? (isDefault ? (row.price ?? null) : null);
  const cb = regionCb ?? (isDefault ? (row.priceCb ?? null) : null);

  // $/GPU は od を GPU 数で割る。既定リージョンで instances.json に落ちたときも
  // 同じ計算で priceGpu と一致する (price / count がそのまま priceGpu のため)。
  const count = parseCount(row.count);
  const gpu = od == null || !(count > 0) ? null : od / count;

  return { od, gpu, cb };
}

// ヘッダのリージョン選択。regions.json が無ければ出さない (仕様 10 と同じ方針)。
export function initPriceRegionSelect() {
  const select = document.getElementById("price-region");
  if (!select) return;
  if (!regionsFile) {
    select.hidden = true;
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const region of regionsFile.regions) {
    const option = document.createElement("option");
    option.value = region.code;
    option.textContent = region.code;
    option.title = region.name;
    fragment.appendChild(option);
  }
  select.replaceChildren(fragment);
  select.value = getPriceRegion();
  select.hidden = false;

  select.addEventListener("change", () => {
    setPriceRegion(select.value);
  });
}
