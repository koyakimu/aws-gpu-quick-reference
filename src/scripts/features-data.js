// data/gpu-features.json は手書きだが、無い状態でもビルドが通るように
// regions-data.js と同じく import.meta.glob で「あれば読む」形にする (仕様 10)。
const modules = import.meta.glob("../../data/gpu-features*.json", { eager: true, import: "default" });

const entry = Object.entries(modules).find(([path]) => path.endsWith("/gpu-features.json"));

export const FEATURES_FILE = entry ? entry[1] : null;
