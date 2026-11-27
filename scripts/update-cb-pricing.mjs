// CB (Capacity Blocks) 価格を pricing.json から取得し、
// data/instances.json の priceCb / tokyo / cbAsOf を更新する。
import { readInstances, writeInstances } from "./lib/instances-file.mjs";
import { applyCbPricing, unmatchedFeedKeys } from "./lib/cb-pricing.mjs";

const PRICING_URL =
  "https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json";

const res = await fetch(PRICING_URL);
if (!res.ok) {
  console.error(`Failed to fetch pricing.json: ${res.status}`);
  process.exit(1);
}
const { instance_types: instanceTypes } = await res.json();
if (!instanceTypes || Object.keys(instanceTypes).length === 0) {
  console.error("pricing.json has no instance_types; aborting without writing");
  process.exit(1);
}

const file = readInstances();
const { instances, changes } = applyCbPricing(file.instances, instanceTypes);

for (const key of unmatchedFeedKeys(file.instances, instanceTypes)) {
  console.error(`warning: no row for ${key}`);
}

// 価格に変更が無くても、取得が通れば cbAsOf (最後に確認した日) を実行日 (UTC) にする (PRC-001)。
const cbAsOf = new Date().toISOString().slice(0, 10);
if (file.cbAsOf !== cbAsOf) changes.push(`cbAsOf: ${file.cbAsOf ?? "(none)"} -> ${cbAsOf}`);

if (changes.length === 0) {
  console.log("CB pricing is up to date.");
} else {
  writeInstances({ ...file, cbAsOf, instances });
  console.log("Updated CB pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
