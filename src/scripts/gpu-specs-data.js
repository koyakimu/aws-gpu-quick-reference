// data/gpu-specs.json は手書き。features-data.js と同じく import.meta.glob で
// 「あれば読む」形にして、ファイルが無い状態でもビルドが通るようにする (仕様 10)。
const modules = import.meta.glob("../../data/gpu-specs*.json", { eager: true, import: "default" });

const entry = Object.entries(modules).find(([path]) => path.endsWith("/gpu-specs.json"));

export const SPECS_FILE = entry ? entry[1] : null;

// gpuKey → スペック。ファイルが無ければ空。compare-view からも引く。
export const GPU_SPECS = SPECS_FILE?.gpus ?? {};
