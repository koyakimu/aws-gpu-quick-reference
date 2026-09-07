// CB (Capacity Blocks) 価格を pricing.json から取得し、
// data/instances.json の priceCb / tokyo を更新する。
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

const file = readInstances();
const { instances, changes } = applyCbPricing(file.instances, instanceTypes);

for (const key of unmatchedFeedKeys(file.instances, instanceTypes)) {
  console.error(`warning: no row for ${key}`);
}

if (changes.length === 0) {
  console.log("CB pricing is up to date.");
} else {
  writeInstances({ ...file, instances });
  console.log("Updated CB pricing:");
  for (const change of changes) console.log(`  ${change}`);
}
