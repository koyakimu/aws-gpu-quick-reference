// data/regions.json は scripts/update-regions.mjs が生成する。生成前でもビルドが
// 通るよう、静的 import ではなく import.meta.glob で「あれば読む」形にする (仕様 10)。
// glob はビルド時に解決され、ファイルが無ければ空のオブジェクトになる。
const modules = import.meta.glob("../../data/regions*.json", { eager: true, import: "default" });

const entry = Object.entries(modules).find(([path]) => path.endsWith("/regions.json"));

export const REGIONS_FILE = entry ? entry[1] : null;
