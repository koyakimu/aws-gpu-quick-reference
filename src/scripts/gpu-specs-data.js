// data/gpu-specs.json は手書き。features-data.js と同じく import.meta.glob で
// 「あれば読む」形にして、ファイルが無い状態でもビルドが通るようにする (仕様 10)。
const modules = import.meta.glob("../../data/gpu-specs*.json", { eager: true, import: "default" });

const entry = Object.entries(modules).find(([path]) => path.endsWith("/gpu-specs.json"));

export const SPECS_FILE = entry ? entry[1] : null;

// gpuKey → スペック。ファイルが無ければ空。compare-view からも引く。
export const GPU_SPECS = SPECS_FILE?.gpus ?? {};

// instances.json にまだ載らない GPU (AWS のインスタンス型が未公開) を表に出すための
// 並び順ヒント。gpu-specs.json の extraGpus に
// { gpuKey, gpu, gen, after, announced } の形で書く。after は「この gpuKey の直後に
// 挿入する」指定で、見つからなければ末尾に付ける。
export const EXTRA_GPUS = SPECS_FILE?.extraGpus ?? [];

// instances.json 由来の並び (gpuKey → { gpu, gen }) に extraGpus を差し込んだ Map を返す。
// instances.json に同じ gpuKey が現れた時点で extraGpus 側は無視される
// (= インスタンスが出たら自動的に通常の行に戻る)。
export function withExtraGpus(order, extras = EXTRA_GPUS) {
  const pending = new Map();
  for (const extra of extras) {
    if (!extra?.gpuKey || order.has(extra.gpuKey)) continue;
    const list = pending.get(extra.after) ?? [];
    list.push(extra);
    pending.set(extra.after, list);
  }

  const out = new Map();
  const add = (extra) =>
    out.set(extra.gpuKey, {
      gpu: extra.gpu,
      gen: extra.gen,
      announced: extra.announced === true,
    });

  for (const [gpuKey, value] of order) {
    out.set(gpuKey, value);
    for (const extra of pending.get(gpuKey) ?? []) add(extra);
    pending.delete(gpuKey);
  }
  // after が見つからなかった分は末尾に回す。
  for (const list of pending.values()) for (const extra of list) add(extra);

  return out;
}
