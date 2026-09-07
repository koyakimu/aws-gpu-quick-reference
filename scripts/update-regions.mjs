// AWS Price List と CB 価格 JSON から、全リージョンの提供有無を取得して
// data/regions.json を更新する (仕様 7.1)。
//   node scripts/update-regions.mjs
//   node scripts/update-regions.mjs --dry-run
//
// 各リージョンの index.json は 480MB あり、提供状況 (products) と
// On-Demand 価格 (terms.OnDemand) の両方を読むためファイル全体を落とす。
// 34 リージョンで 10〜15GB、並列 3 で 20〜40 分かかる。
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { readInstances } from "./lib/instances-file.mjs";
import {
  scanInstanceTypes,
  cbAvailability,
  cbPricesByRegion,
  mergeAvailability,
  mergePrices,
  regionOrder,
  carryOverRegions,
  carryOverPrices,
  sameExceptGeneratedAt,
  STANDARD_REGION,
} from "./lib/regions.mjs";

const BASE = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current";
const CB_URL =
  "https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json";
const REGIONS_PATH = new URL("../data/regions.json", import.meta.url);
const CONCURRENCY = 3;

const dryRun = process.argv.includes("--dry-run");

function warn(message) {
  process.stderr.write(`warning: ${message}\n`);
}

function readPrevious() {
  try {
    return JSON.parse(readFileSync(REGIONS_PATH, "utf8"));
  } catch {
    return null; // 初回はファイルが無い
  }
}

// 1 レコード 1 行で書き出す。自動更新のコミット差分を読める形に保つため。
function serialize(file) {
  const regions = file.regions.map((region) => "    " + JSON.stringify(region)).join(",\n");
  const byLine = (map) =>
    Object.entries(map)
      .map(([size, value]) => `    ${JSON.stringify(size)}: ${JSON.stringify(value)}`)
      .join(",\n");
  return `{
  "generatedAt": ${JSON.stringify(file.generatedAt)},
  "regions": [
${regions}
  ],
  "availability": {
${byLine(file.availability)}
  },
  "prices": {
${byLine(file.prices)}
  }
}
`;
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function scanRegion(code, wantedSizes) {
  const url = `${BASE}/${code}/index.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  try {
    return await scanInstanceTypes(rl, wantedSizes, { withPrices: true });
  } finally {
    rl.close();
  }
}

const file = readInstances();
const allSizes = file.instances.map((row) => row.size);
// UltraServer は Price List に載らないので On-Demand の走査対象から外す (仕様 7.1)。
const odSizes = new Set(file.instances.filter((row) => row.unit !== "ultraserver").map((row) => row.size));

const regionIndex = await fetchJson(`${BASE}/region_index.json`);
const codes = Object.keys(regionIndex.regions).filter((code) => STANDARD_REGION.test(code)).sort();
process.stderr.write(`scanning ${codes.length} regions (concurrency ${CONCURRENCY})\n`);

const previous = readPrevious();
const previousNames = new Map((previous?.regions ?? []).map((region) => [region.code, region.name]));

const scanned = new Map();
const scannedPrices = new Map();
const names = new Map();
const failed = [];

await mapWithConcurrency(codes, CONCURRENCY, async (code) => {
  try {
    const { sizes, location, prices } = await scanRegion(code, odSizes);
    scanned.set(code, sizes);
    scannedPrices.set(code, prices);
    names.set(code, location ?? previousNames.get(code) ?? code);
    process.stderr.write(`  ${code}: ${sizes.size} sizes, ${prices.size} prices\n`);
  } catch (error) {
    failed.push(code);
    names.set(code, previousNames.get(code) ?? code);
    warn(`${code}: ${error.message}; keeping previous values`);
  }
});

// 並列走査の完了順ではなく codes の順で詰め直す。availability のキー順が
// 実行ごとに変わると sameExceptGeneratedAt が毎回「差分あり」と判定してしまう。
const odByRegion = new Map(codes.filter((code) => scanned.has(code)).map((code) => [code, scanned.get(code)]));
const odPricesByRegion = new Map(
  codes.filter((code) => scannedPrices.has(code)).map((code) => [code, scannedPrices.get(code)]),
);

if (failed.length === codes.length) {
  process.stderr.write("error: every region failed; aborting without writing\n");
  process.exit(1);
}

const cbFeed = await fetchJson(CB_URL);
const cbBySize = cbAvailability(cbFeed.instance_types ?? {}, new Set(allSizes));
const cbPrices = cbPricesByRegion(cbFeed.instance_types ?? {}, new Set(allSizes));
// mergeAvailability は Map<region, Set<size>> を取るので向きを入れ替える。
const cbByRegion = new Map();
for (const [size, regions] of cbBySize) {
  for (const region of regions) {
    if (!cbByRegion.has(region)) cbByRegion.set(region, new Set());
    cbByRegion.get(region).add(size);
  }
}

const merged = mergeAvailability(allSizes, odByRegion, cbByRegion);
// failed も同じ理由でコード順に揃える (前回値を戻すキーの順を安定させる)。
const mergedPrices = mergePrices(allSizes, odPricesByRegion, cbPrices);
const failedSorted = [...failed].sort();
const availability = failed.length ? carryOverRegions(merged, previous?.availability, failedSorted) : merged;
const prices = failed.length ? carryOverPrices(mergedPrices, previous?.prices, failedSorted) : mergedPrices;

// 列に出すのは、どこかの size が提供されているリージョンだけ。
const used = new Set();
for (const perRegion of Object.values(availability)) {
  for (const region of Object.keys(perRegion)) used.add(region);
}
const regions = regionOrder(
  [...used].filter((code) => STANDARD_REGION.test(code)).map((code) => ({ code, name: names.get(code) ?? code })),
);

const next = { generatedAt: new Date().toISOString(), regions, availability, prices };

if (sameExceptGeneratedAt(next, previous)) {
  console.log("Region availability is up to date.");
} else if (dryRun) {
  console.log(`Would write ${regions.length} regions for ${allSizes.length} instance sizes.`);
} else {
  writeFileSync(REGIONS_PATH, serialize(next));
  console.log(`Wrote data/regions.json: ${regions.length} regions, ${allSizes.length} instance sizes.`);
}
