import { defineConfig } from "vitest/config";
import { viteSingleFile } from "vite-plugin-singlefile";

// ビルド実行日 (JST) を index.html の %BUILD_DATE% に埋め込む
const buildDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
}).format(new Date());

const injectBuildDate = () => ({
  name: "inject-build-date",
  transformIndexHtml(html) {
    return html.replaceAll("%BUILD_DATE%", buildDate);
  },
});

export default defineConfig({
  root: "src",
  plugins: [viteSingleFile(), injectBuildDate()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    environment: "jsdom",
  },
});
