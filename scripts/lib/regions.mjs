// リージョン提供有無データの純関数。ネットワークにも fs にも触らない。
// IO は scripts/update-regions.mjs 側が持つ。

// index.json は 2 スペースインデントで整形されている。1 リージョン 480MB あり
// JSON.parse できないため行単位で走査する (od-pricing.mjs と同じ方針)。
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
export async function scanInstanceTypes(lines, wantedSizes) {
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

  return { sizes, location };
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

// generatedAt だけが違うなら「変化なし」。書き換えを避けるための判定 (仕様 7.1)。
export function sameExceptGeneratedAt(a, b) {
  if (!a || !b) return false;
  const strip = (file) => JSON.stringify({ regions: file.regions, availability: file.availability });
  return strip(a) === strip(b);
}
