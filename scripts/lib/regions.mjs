// リージョン提供有無データの純関数。ネットワークにも fs にも触らない。
// IO は scripts/update-regions.mjs 側が持つ。

// index.json は 2 スペースインデントで整形されている。1 リージョン 480MB あり
// JSON.parse できないため行単位で走査する (od-pricing.mjs と同じ方針)。
import { scanPriceListFull } from "./od-pricing.mjs";
import { roundUsd } from "./instances-file.mjs";
const SECTION = /^ {2}"(products|terms)" : \{$/;
const PRODUCT_START = /^ {4}"[A-Z0-9]+" : \{$/;
const PRODUCT_END = /^ {4}\},?$/;
const ATTRIBUTE = /^ {8}"([A-Za-z]+)" : "(.*?)",?$/;

// Local Zone (us-east-1-dfw-1) や GovCloud を除いた通常リージョンだけを対象にする。
// region_index.json は 106 件返すが、そのうち 34 件がこれに一致する。
export const STANDARD_REGION = /^[a-z]{2}-[a-z]+-\d$/;

// CB フィードは Local Zone / Wavelength のコード (us-east-1-dfw-2a) で提供を
// 書いてくることがある。列は通常リージョンだけなので、親リージョンに寄せる。
// 先頭が通常リージョンの形をしていないコード (us-gov-west-1 等) は捨てる。
const REGION_PREFIX = /^[a-z]{2}-[a-z]+-\d/;

export function parentRegion(code) {
  if (typeof code !== "string") return null;
  const match = REGION_PREFIX.exec(code);
  return match ? match[0] : null;
}

// 地理グループ順 (仕様 4.2): 北米 -> 南米 -> 欧州 -> 中東・アフリカ -> アジア太平洋
export const REGION_GROUPS = ["na", "sa", "eu", "meaf", "ap"];

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

// 並べ替えた新しい配列を返す。入力は変更しない。
// グループ内はコードの辞書順。未知の接頭辞は末尾へ。
export function regionOrder(regions) {
  const rank = (code) => {
    const index = REGION_GROUPS.indexOf(regionGroup(code));
    return index === -1 ? REGION_GROUPS.length : index;
  };
  return regions
    .slice()
    .sort((a, b) => rank(a.code) - rank(b.code) || a.code.localeCompare(b.code));
}

// index.json の products セクションだけを読み、wantedSizes のうち
// Linux / Shared で提供されているものを返す (仕様 7.1)。
// products は terms より前にあるので、terms に着いたら打ち切る。
// 呼び出し側がストリームを渡していれば、この break でダウンロードも止まる
// (480MB のうち products は 200MB 程度で、残りを読まずに済む)。
// location はリージョンの表示名 (例 "US East (N. Virginia)") として使う。
//
// withPrices: true にすると terms.OnDemand まで読み進め、リージョン別の時間単価も
// 返す (prices: size -> USD)。走査は od-pricing.mjs の scanPriceListFull に任せる。
// この場合は products で打ち切れないので、index.json を最後まで落とすことになる
// (products のみの約 2〜3 倍の転送量)。
export async function scanInstanceTypes(lines, wantedSizes, { withPrices = false } = {}) {
  if (withPrices) {
    const { present, prices, location } = await scanPriceListFull(lines, wantedSizes);
    return { sizes: present, location, prices };
  }
  const sizes = new Set();
  let location = null;
  let section = null;
  let attributes = null;

  for await (const line of lines) {
    const sectionMatch = SECTION.exec(line);
    if (sectionMatch) {
      if (sectionMatch[1] === "terms") break;
      section = "products";
      attributes = null;
      continue;
    }
    if (section !== "products") continue;

    if (PRODUCT_START.test(line)) {
      attributes = {};
      continue;
    }
    if (attributes == null) continue;

    const attribute = ATTRIBUTE.exec(line);
    if (attribute) {
      attributes[attribute[1]] = attribute[2];
      continue;
    }
    if (PRODUCT_END.test(line)) {
      if (location == null && attributes.location) location = attributes.location;
      if (
        attributes.operatingSystem === "Linux" &&
        attributes.tenancy === "Shared" &&
        wantedSizes.has(attributes.instanceType)
      ) {
        sizes.add(attributes.instanceType);
      }
      attributes = null;
    }
  }

  return { sizes, location, prices: new Map() };
}

// CB 価格 JSON の instance_types から size -> リージョンコード集合を作る。
// region_code を持たないエントリと、親リージョンに寄せられないコードは捨てる。
export function cbAvailability(instanceTypes, wantedSizes) {
  const map = new Map();
  for (const [size, info] of Object.entries(instanceTypes)) {
    if (!wantedSizes.has(size)) continue;
    const codes = new Set();
    for (const entry of info?.pricing ?? []) {
      const code = parentRegion(entry?.region_code);
      if (code) codes.add(code);
    }
    if (codes.size > 0) map.set(size, codes);
  }
  return map;
}

// 仕様 4.2 の availability マップを作る。
// odByRegion / cbByRegion は Map<regionCode, Set<size>>。
// 提供の無いリージョンはキー自体を書かない。
export function mergeAvailability(sizes, odByRegion, cbByRegion) {
  const availability = {};
  for (const size of sizes) {
    const perRegion = {};
    for (const [region, present] of odByRegion) {
      if (present.has(size)) perRegion[region] = "od";
    }
    for (const [region, present] of cbByRegion) {
      if (!present.has(size)) continue;
      perRegion[region] = perRegion[region] === "od" ? "both" : "cb";
    }
    availability[size] = perRegion;
  }
  return availability;
}

// 取得に失敗したリージョンの値を前回ファイルから戻す (仕様 7.1)。
// 新しいオブジェクトを返す。前回に無かった size は素通し。
export function carryOverRegions(availability, previous, regionCodes) {
  const failed = new Set(regionCodes);
  const result = {};
  for (const [size, perRegion] of Object.entries(availability)) {
    const next = { ...perRegion };
    for (const region of failed) {
      const value = previous?.[size]?.[region];
      if (value != null) next[region] = value;
    }
    result[size] = next;
  }
  return result;
}

// CB 価格フィードから size -> (リージョン -> GPU 1 枚あたりの時間単価) を作る。
// availability と同じく Local Zone のコードは親リージョンに寄せる。
// 同じ親リージョンに複数エントリが来たときは安い方を採る。
export function cbPricesByRegion(instanceTypes, wantedSizes) {
  const map = new Map();
  for (const [size, info] of Object.entries(instanceTypes)) {
    if (!wantedSizes.has(size)) continue;
    const perRegion = new Map();
    for (const entry of info?.pricing ?? []) {
      const code = parentRegion(entry?.region_code);
      const rate = entry?.accelerator_hourly_rate_usd;
      if (!code || !Number.isFinite(rate)) continue;
      const previous = perRegion.get(code);
      if (previous == null || rate < previous) perRegion.set(code, roundUsd(rate));
    }
    if (perRegion.size > 0) map.set(size, perRegion);
  }
  return map;
}

// data/regions.json の prices マップを作る。
//   odByRegion   Map<regionCode, Map<size, USD/時>>  (インスタンス単位の On-Demand 価格)
//   cbBySize     Map<size, Map<regionCode, USD/時>>  (GPU 1 枚あたりの CB 価格)
// 片方しか無いリージョンは、無い側を null にして書く。どちらも無ければキーを書かない。
// リージョンのキーはコード順に揃える (実行ごとの並び替えで差分が出ないように)。
export function mergePrices(sizes, odByRegion, cbBySize) {
  const prices = {};
  for (const size of sizes) {
    const perRegion = new Map();
    for (const [region, bySize] of odByRegion) {
      const od = bySize.get(size);
      if (od != null) perRegion.set(region, { od: roundUsd(od), cb: null });
    }
    for (const [region, cb] of cbBySize.get(size) ?? []) {
      const current = perRegion.get(region);
      if (current) current.cb = cb;
      else perRegion.set(region, { od: null, cb });
    }
    prices[size] = Object.fromEntries([...perRegion.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }
  return prices;
}

// 取得に失敗したリージョンの On-Demand 価格を前回ファイルから戻す。
// CB 価格は 1 本のフィードから取るのでリージョン単位の失敗が無く、今回の値を残す。
export function carryOverPrices(prices, previous, regionCodes) {
  const failed = new Set(regionCodes);
  const result = {};
  for (const [size, perRegion] of Object.entries(prices)) {
    const next = { ...perRegion };
    for (const region of failed) {
      const od = previous?.[size]?.[region]?.od;
      if (od == null) continue;
      next[region] = { od, cb: next[region]?.cb ?? null };
    }
    result[size] = next;
  }
  return result;
}

// generatedAt だけが違うなら「変化なし」。書き換えを避けるための判定 (仕様 7.1)。
export function sameExceptGeneratedAt(a, b) {
  if (!a || !b) return false;
  const strip = (file) =>
    JSON.stringify({ regions: file.regions, availability: file.availability, prices: file.prices ?? null });
  return strip(a) === strip(b);
}
