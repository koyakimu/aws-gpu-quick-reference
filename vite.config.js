import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// 価格の確認日 (%PRICING_AS_OF%) はデータの正から読む
const { pricingAsOf } = JSON.parse(
  readFileSync(new URL("./data/instances.json", import.meta.url), "utf8"),
);

// order: "pre" で、singlefile がバンドルをインライン化する前の生の HTML に対して置換する
const injectBuildMeta = () => ({
  name: "inject-build-meta",
  transformIndexHtml: {
    order: "pre",
    handler(html) {
      return html.replaceAll("%PRICING_AS_OF%", pricingAsOf);
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
