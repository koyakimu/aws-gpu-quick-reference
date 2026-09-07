import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// ビルド実行日 (JST) を index.html の %BUILD_DATE% に埋め込む
const buildDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
}).format(new Date());

// 価格の基準月 (%PRICING_AS_OF%) はデータの正から読む
const { pricingAsOf } = JSON.parse(
  readFileSync(new URL("./data/instances.json", import.meta.url), "utf8"),
);

// order: "pre" で、singlefile がバンドルをインライン化する前の生の HTML に対して置換する
const injectBuildMeta = () => ({
  name: "inject-build-meta",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      return html
        .replaceAll("%BUILD_DATE%", buildDate)
        .replaceAll("%PRICING_AS_OF%", pricingAsOf);
    },
  },
});

export default defineConfig({
  root: "src",
  plugins: [viteSingleFile(), injectBuildMeta()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    environment: "jsdom",
  },
});
