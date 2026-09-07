// AWS Price List から On-Demand 価格を取得し、data/instances.json を更新する。
// 自動化はしない（仕様 §8）。手動実行のみ:
//   node scripts/update-od-pricing.mjs
//   node scripts/update-od-pricing.mjs --dry-run
//
// index.json は 1 リージョンあたり 480MB 程度ある。JSON.parse を避けて
// 行単位で読むため、追加のヒープ指定 (--max-old-space-size) は不要。
import { createInterface } from "node:readline";
import { Readable } from "node:stream";
import { readInstances, writeInstances } from "./lib/instances-file.mjs";
import { scanPriceList, applyOdPricing } from "./lib/od-pricing.mjs";

const BASE = "https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current";
const OD_REGION = "us-east-1";
const TOKYO_REGION = "ap-northeast-1";

async function* fetchLines(region) {
  const url = `${BASE}/${region}/index.json`;
  process.stderr.write(`fetching ${url}\n`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const rl = createInterface({ input: Readable.fromWeb(res.body), crlfDelay: Infinity });
  let count = 0;
  for await (const line of rl) {
    if (++count % 2_000_000 === 0) process.stderr.write(`  ${count} lines\n`);
    yield line;
  }
  process.stderr.write(`  done (${count} lines)\n`);
}

function fail(message) {
  process.stderr.write(`error: ${message}\n`);
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const file = readInstances();
const wantedSizes = new Set(file.instances.map((row) => row.size));

const usEast1Prices = await scanPriceList(fetchLines(OD_REGION), wantedSizes);
const tokyoPrices = await scanPriceList(fetchLines(TOKYO_REGION), wantedSizes);
const tokyoSizes = new Set(tokyoPrices.keys());

// 取得が途中で切れた・形式が変わった場合に、price や tokyo を空の結果で
// 上書きしてしまわないよう、書き込み前に結果の妥当性を確かめる。
const priceable = file.instances.filter((row) => row.unit !== "ultraserver");
if (usEast1Prices.size === 0) fail(`no ${OD_REGION} On-Demand prices were parsed; aborting without writing`);
if (tokyoSizes.size === 0) fail(`no ${TOKYO_REGION} On-Demand prices were parsed; aborting without writing`);
if (usEast1Prices.size * 2 < priceable.length) {
  fail(
    `only ${usEast1Prices.size} of ${priceable.length} sizes were priced in ${OD_REGION}; ` +
      "the download or the Price List format is probably broken. Aborting without writing",
  );
}

const missing = priceable.filter((row) => !usEast1Prices.has(row.size)).map((row) => row.size);
if (missing.length) {
  process.stderr.write(`warning: no ${OD_REGION} On-Demand price found for: ${missing.join(", ")}\n`);
}

const { instances, changes } = applyOdPricing(file.instances, usEast1Prices, tokyoSizes);

if (changes.length === 0) {
  console.log("On-Demand pricing is up to date.");
} else if (dryRun) {
  console.log("Would update On-Demand pricing:");
  for (const change of changes) console.log(`  ${change}`);
} else {
  writeInstances({ ...file, instances });
  console.log("Updated On-Demand pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
