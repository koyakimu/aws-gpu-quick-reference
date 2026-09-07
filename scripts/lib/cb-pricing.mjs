// CB (Capacity Blocks) 価格を instances 配列に反映する純関数。ネットワークには触らない。
//
// ルール (CLAUDE.md):
// - 東京リージョン (ap-northeast-1) があればその値を使用
// - ない場合は最も一般的なリージョン (us-east-1 等) を使用
// - 価格は小数点第2位に四捨五入
import { roundUsd } from "./instances-file.mjs";

// pricing.json の各エントリは region (表示名) と region_code の両方を持つが、
// 表示名は上流の表記ゆれを受けるのでコードでも照合する。
const REGION_PRIORITY = [
  { code: "ap-northeast-1", name: "Asia Pacific (Tokyo)" },
  { code: "us-east-1", name: "US East (N. Virginia)" },
  { code: "us-east-2", name: "US East (Ohio)" },
  { code: "us-west-2", name: "US West (Oregon)" },
];

const TOKYO = REGION_PRIORITY[0];

function isRegion(entry, region) {
  return entry.region_code === region.code || entry.region === region.name;
}

function hasRate(entry) {
  return entry?.accelerator_hourly_rate_usd != null;
}

// 採用したエントリ自体を返す。どのリージョンを使ったかを変更ログに書くため。
export function pickEntry(pricing) {
  for (const region of REGION_PRIORITY) {
    const entry = pricing.find((p) => isRegion(p, region) && hasRate(p));
    if (entry) return entry;
  }
  return pricing.find(hasRate) ?? null;
}

export function pickRate(pricing) {
  return pickEntry(pricing)?.accelerator_hourly_rate_usd ?? null;
}

export function hasTokyo(pricing) {
  return pricing.some((p) => isRegion(p, TOKYO));
}

function regionLabel(entry) {
  return entry.region_code ?? entry.region;
}

// instanceTypes は pricing.json の instance_types そのまま。
// CB フィードに無い size は触らない（消えた＝提供終了とは限らないため）。
//
// tokyo は「On-Demand か Capacity Blocks のどちらかで東京から使えるか」を表す。
// ここから分かるのは CB 側だけなので true には倒せるが false には倒さない。
// On-Demand のぶんは update-od-pricing.mjs 側が持つ。
export function applyCbPricing(instances, instanceTypes) {
  const changes = [];

  const updated = instances.map((row) => {
    const info = instanceTypes[row.size];
    if (!info) return { ...row };

    const pricing = info.pricing ?? [];
    const next = { ...row };

    const entry = pickEntry(pricing);
    if (entry) {
      const priceCb = roundUsd(entry.accelerator_hourly_rate_usd);
      if (next.priceCb !== priceCb) {
        const where = isRegion(entry, TOKYO) ? "" : ` (${regionLabel(entry)})`;
        changes.push(`${row.size} priceCb: ${next.priceCb} -> ${priceCb}${where}`);
      }
      next.priceCb = priceCb;
    }

    if (hasTokyo(pricing) && next.tokyo !== true) {
      changes.push(`${row.size} tokyo: ${next.tokyo} -> true`);
      next.tokyo = true;
    }

    return next;
  });

  return { instances: updated, changes };
}
