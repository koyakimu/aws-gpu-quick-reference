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

// 提供の有無だけを見る緩い条件 (regions.mjs の scanInstanceTypes と同じ)。
function isPresentProduct(attributes, wantedSizes) {
  return (
    attributes != null &&
    attributes.operatingSystem === "Linux" &&
    attributes.tenancy === "Shared" &&
    wantedSizes.has(attributes.instanceType)
  );
}

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
//
// 返り値:
//   prices   size -> 時間単価 (USD, 生の数値)。Linux / Shared / Used / NA / BYOL 以外。
//            同じ instanceType に複数 SKU / 複数 offer term が該当したときは安い方を採る。
//   present  そのリージョンで Linux / Shared として提供されている size の集合。
//            価格の条件より緩い (提供の有無を見るだけなので capacitystatus 等を問わない)。
//            update-regions.mjs の availability がこちらを使う。
//   location リージョンの表示名 (例 "US East (N. Virginia)")。products の先頭から拾う。
//
// update-od-pricing.mjs (us-east-1 の価格) と update-regions.mjs (全リージョンの
// 価格と提供状況) が同じ走査器を共有するための関数。
export async function scanPriceListFull(lines, wantedSizes) {
  const skuToSize = new Map();
  const skuToPrice = new Map();
  const present = new Set();
  let location = null;

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
        if (location == null && attributes.location) location = attributes.location;
        if (isPresentProduct(attributes, wantedSizes)) {
          present.add(attributes.instanceType);
        }
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
  return { prices, present, location };
}

// 価格だけが要る呼び出し (update-od-pricing.mjs) 向けの薄い包み。
export async function scanPriceList(lines, wantedSizes) {
  return (await scanPriceListFull(lines, wantedSizes)).prices;
}

// instances に On-Demand 価格と東京リージョンの有無を反映した新しい配列を返す。
// 入力は変更しない。UltraServer は Price List に載らないため素通しする。
//
// tokyo は「On-Demand か Capacity Blocks のどちらかで東京から使えるか」を表す。
// この関数が判定できるのは On-Demand のぶんだけなので、us-east-1 で On-Demand 価格が
// 付いた行にしか tokyo を書かない。Capacity Blocks 専用の行 (p5e.48xlarge など) と
// UltraServer は On-Demand の terms を持たず、東京の index.json にも出てこないため、
// ここで判定すると必ず false になってしまう。それらの tokyo は CB 価格スクリプトと
// regions データが持つので、既存の値をそのまま残す。
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

    if (rawPrice != null) {
      const tokyo = tokyoSizes.has(row.size);
      if (next.tokyo !== tokyo) changes.push(`${row.size} tokyo: ${next.tokyo} -> ${tokyo}`);
      next.tokyo = tokyo;
    }

    return next;
  });

  return { instances: updated, changes };
}
