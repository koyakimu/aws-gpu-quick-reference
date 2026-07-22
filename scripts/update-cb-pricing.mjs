// CB (Capacity Blocks) 価格を pricing.json から取得し、
// src/scripts/gpu-data.js の priceCb を更新する。
//
// ルール (CLAUDE.md):
// - 東京リージョン (Asia Pacific (Tokyo)) があればその値を使用
// - ない場合は最も一般的なリージョン (us-east-1 等) を使用
// - 価格は小数点第2位まで表示（四捨五入）
import { readFileSync, writeFileSync } from "node:fs";

const PRICING_URL =
  "https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json";
const GPU_DATA_PATH = new URL("../src/scripts/gpu-data.js", import.meta.url);

const REGION_PRIORITY = [
  "Asia Pacific (Tokyo)",
  "US East (N. Virginia)",
  "US East (Ohio)",
  "US West (Oregon)",
];

function pickRate(pricing) {
  for (const region of REGION_PRIORITY) {
    const entry = pricing.find((p) => p.region === region);
    if (entry?.accelerator_hourly_rate_usd != null) {
      return entry.accelerator_hourly_rate_usd;
    }
  }
  return pricing[0]?.accelerator_hourly_rate_usd ?? null;
}

// 12.355 のような3桁小数を十進で正しく四捨五入する（浮動小数点誤差対策）
function formatUsd(value) {
  const cents = Math.round(Math.round(value * 1000) / 10);
  return `$${(cents / 100).toFixed(2)}`;
}

const res = await fetch(PRICING_URL);
if (!res.ok) {
  console.error(`Failed to fetch pricing.json: ${res.status}`);
  process.exit(1);
}
const { instance_types: instanceTypes } = await res.json();

let source = readFileSync(GPU_DATA_PATH, "utf8");
const changes = [];

for (const [size, info] of Object.entries(instanceTypes)) {
  const rate = pickRate(info.pricing ?? []);
  if (rate == null) continue;
  const newPrice = formatUsd(rate);

  // size が一致する行の priceCb のみ書き換える（1エントリ1行の形式が前提）
  const linePattern = new RegExp(
    `^(.*size: "${size.replace(".", "\\.")}".*priceCb: ")(\\$[\\d.]+)(".*)$`,
    "m",
  );
  source = source.replace(linePattern, (line, before, oldPrice, after) => {
    if (oldPrice !== newPrice) {
      changes.push(`${size}: ${oldPrice} -> ${newPrice}`);
    }
    return `${before}${newPrice}${after}`;
  });
}

if (changes.length === 0) {
  console.log("CB pricing is up to date.");
} else {
  writeFileSync(GPU_DATA_PATH, source);
  console.log("Updated CB pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
