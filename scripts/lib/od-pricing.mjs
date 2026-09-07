// AWS Price List (region 別 index.json) から On-Demand 価格を取り出し、
// instances 配列に反映する純関数。ネットワークには触らない。
import { parseCount } from "../../src/scripts/format.js";
import { roundUsd } from "./instances-file.mjs";

// index.json は 2 スペースインデントで整形されている。
// 482MB あり JSON.parse だと V8 の文字列長上限に近づくため、行単位で走査する。
const SECTION = /^ {2}"(products|terms)" : \{$/;
const PRODUCT_START = /^ {4}"([A-Z0-9]+)" : \{$/;
const PRODUCT_END = /^ {4}\},?$/;
const ATTRIBUTE = /^ {8}"([A-Za-z]+)" : "(.*?)",?$/;
const TERM_KIND = /^ {4}"([A-Za-z]+)" : \{$/;
const TERM_SKU = /^ {6}"([A-Z0-9]+)" : \{$/;
const PRICE_DIMENSION = /^ {12}"[A-Za-z0-9.]+" : \{$/;
const TERM_UNIT = /^ {14}"unit" : "(.*?)",$/;
const TERM_USD = /^ {16}"USD" : "([0-9.]+)"$/;

function isWantedProduct(attributes, wantedSizes) {
  return (
    attributes != null &&
    wantedSizes.has(attributes.instanceType) &&
    attributes.operatingSystem === "Linux" &&
    attributes.tenancy === "Shared" &&
    attributes.preInstalledSw === "NA" &&
    attributes.capacitystatus === "Used" &&
    attributes.licenseModel !== "Bring your own license"
  );
}

// lines: 行のイテラブル (同期・非同期どちらでもよい)。ストリームをそのまま渡せるよう
// for await で回し、480MB を配列に溜めずに走査する。
// 返り値は size -> 時間単価 (USD, 生の数値)。
// 同じ instanceType に複数 SKU / 複数 offer term が該当したときは安い方を採る。
export async function scanPriceList(lines, wantedSizes) {
  const skuToSize = new Map();
  const skuToPrice = new Map();

  let section = null;
  let termKind = null;
  let sku = null;
  let attributes = null;
  let termSku = null;
  let unit = null;

  for await (const line of lines) {
    const sectionMatch = SECTION.exec(line);
    if (sectionMatch) {
      section = sectionMatch[1];
      sku = null;
      attributes = null;
      continue;
    }

    if (section === "products") {
      const start = PRODUCT_START.exec(line);
      if (start) {
        sku = start[1];
        attributes = {};
        continue;
      }
      if (sku == null) continue;
      const attribute = ATTRIBUTE.exec(line);
      if (attribute) {
        attributes[attribute[1]] = attribute[2];
        continue;
      }
      if (PRODUCT_END.test(line)) {
        if (isWantedProduct(attributes, wantedSizes)) {
          skuToSize.set(sku, attributes.instanceType);
        }
        sku = null;
        attributes = null;
      }
      continue;
    }

    if (section === "terms") {
      const kind = TERM_KIND.exec(line);
      if (kind) {
        termKind = kind[1];
        termSku = null;
        unit = null;
        continue;
      }
      if (termKind !== "OnDemand") continue;

      const skuLine = TERM_SKU.exec(line);
      if (skuLine) {
        // 目的の product に紐づかない SKU は読み飛ばす。
        // products は terms より先に現れるので、ここで対象を絞れる。
        termSku = skuToSize.has(skuLine[1]) ? skuLine[1] : null;
        unit = null;
        continue;
      }
      if (termSku == null) continue;
      // priceDimension ごとに unit を捨てる。unit を持たない dimension が
      // 直前の "Hrs" を引き継がないようにするため。
      if (PRICE_DIMENSION.test(line)) {
        unit = null;
        continue;
      }
      const unitLine = TERM_UNIT.exec(line);
      if (unitLine) {
        unit = unitLine[1];
        continue;
      }
      const usd = TERM_USD.exec(line);
      if (usd && unit === "Hrs") {
        const value = Number(usd[1]);
        if (value > 0) {
          const previous = skuToPrice.get(termSku);
          if (previous == null || value < previous) skuToPrice.set(termSku, value);
        }
      }
    }
  }

  const prices = new Map();
  for (const [productSku, size] of skuToSize) {
    const price = skuToPrice.get(productSku);
    if (price == null) continue;
    const previous = prices.get(size);
    if (previous == null || price < previous) prices.set(size, price);
  }
  return prices;
}

// instances に On-Demand 価格と東京リージョンの有無を反映した新しい配列を返す。
// 入力は変更しない。UltraServer は Price List に載らないため素通しする。
export function applyOdPricing(instances, usEast1Prices, tokyoSizes) {
  const changes = [];

  const updated = instances.map((row) => {
    const next = { ...row };

    const rawPrice = usEast1Prices.get(row.size);
    if (rawPrice != null) {
      const price = roundUsd(rawPrice);
      const gpuCount = parseCount(row.count);
      const priceGpu = gpuCount > 0 ? roundUsd(rawPrice / gpuCount) : null;
      if (next.price !== price) changes.push(`${row.size} price: ${next.price} -> ${price}`);
      if (next.priceGpu !== priceGpu) changes.push(`${row.size} priceGpu: ${next.priceGpu} -> ${priceGpu}`);
      next.price = price;
      next.priceGpu = priceGpu;
    }

    if (row.unit !== "ultraserver") {
      const tokyo = tokyoSizes.has(row.size);
      if (next.tokyo !== tokyo) changes.push(`${row.size} tokyo: ${next.tokyo} -> ${tokyo}`);
      next.tokyo = tokyo;
    }

    return next;
  });

  return { instances: updated, changes };
}
