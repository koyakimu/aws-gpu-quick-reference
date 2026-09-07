// data/instances.json の読み書きと金額の丸めをまとめる。
// update-od-pricing.mjs と update-cb-pricing.mjs の両方から使う。
import { readFileSync, writeFileSync } from "node:fs";

export const INSTANCES_PATH = new URL("../../data/instances.json", import.meta.url);

export function readInstances() {
  return JSON.parse(readFileSync(INSTANCES_PATH, "utf8"));
}

// 1 レコード 1 行で書き出す。自動更新 PR の差分を読める形に保つため。
export function writeInstances(file) {
  const body = file.instances.map((row) => "    " + JSON.stringify(row)).join(",\n");
  const json = `{
  "pricingAsOf": ${JSON.stringify(file.pricingAsOf)},
  "pricingRegion": ${JSON.stringify(file.pricingRegion)},
  "instances": [
${body}
  ]
}
`;
  writeFileSync(INSTANCES_PATH, json);
}

// 12.355 のような3桁小数を十進で正しく四捨五入する（浮動小数点誤差対策）。
// 既存の update-cb-pricing.mjs の formatUsd と同じ計算で、返り値だけ数値にした。
export function roundUsd(value) {
  return Math.round(Math.round(value * 100000) / 1000) / 100;
}
