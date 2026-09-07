# CLAUDE.md

AWS EC2 GPUインスタンスの比較表を表示する静的Webサイト。

## 構成

- Vite + vite-plugin-singlefile でビルド
- ソースは `src/` 配下にモジュール分割（CSS/JS/HTML/i18n）
- `npm run build` で `dist/index.html` に単一HTMLを出力
- デプロイ: GitHub Actions で `npm run build` → `dist/` を GitHub Pages にデプロイ

### ディレクトリ構成

```
src/
├── index.html          # HTMLテンプレート
├── styles/
│   ├── base.css        # リセット、タイポグラフィ、CSS変数
│   ├── table.css       # テーブルスタイル（世代色分け、ホバー等）
│   ├── header.css      # ヘッダー（言語/テーマ切替含む）
│   ├── calculator.css  # コスト計算ツールのスタイル
│   └── light-theme.css # ライトモード用オーバーライド
├── scripts/
│   ├── main.js         # エントリーポイント（初期化・イベント登録）
│   ├── gpu-data.js     # GPU_DATA配列 + EC2_LINKS
│   ├── table.js        # テーブル描画ロジック
│   ├── calculator.js   # コスト計算ロジック
│   ├── i18n.js         # 多言語切替ロジック
│   └── theme.js        # ライト/ダークモード切替ロジック
└── i18n/
    ├── ja.js           # 日本語翻訳辞書
    └── en.js           # 英語翻訳辞書
```

### 開発コマンド

- `npm run dev` — Vite開発サーバー（HMR対応）
- `npm run build` — `dist/index.html` に単一HTMLを出力
- `npm run preview` — ビルド結果のプレビュー
- `npm test` — Vitest で単体テスト実行

## データ更新

### GPUスペック

- GPUの演算性能等は `data/aws-ec2-nvidia-gpu-specs.json` を参照
- 新しいGPUを追加する場合はまずJSONを更新してから `data/instances.json` にレコードを追加

### instances.json

データの正は `data/instances.json`。`src/scripts/gpu-data.js` は JSON を読むだけの薄い層で、
`GPU_DATA` / `EC2_LINKS` / `GPU_DATASHEET_LINKS` / `PRICING_META` を export する。
1 レコード 1 インスタンスサイズで、各レコードは次のフィールドを持つ:

```javascript
{ gen, gpu, gpuKey, ec2, size, unit, count, vramPerGpu,
  fp16NonTc, fp16Dense, fp16Sparse, fp8Dense, fp8Sparse, fp4Dense, fp4Sparse,
  est, efa, pcie, vcpu, mem, nvme, price, priceGpu, priceCb, tokyo, addedAt }
```

`price` / `priceGpu` / `priceCb` は数値または `null`（= 提供なし）。表示時に `formatPrice` で整形する。

### 価格更新

#### On-Demand 価格

**AWS Price List Bulk API**を使用して最新価格を取得可能:
```
https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/index.json
```

- ファイルサイズが大きい（数百MB）ため、ダウンロードと解析に時間がかかる
- `products` セクションでインスタンスタイプを検索
- `terms.OnDemand` セクションで価格情報を取得
- リージョン別の価格は `location` フィールドで識別
- 東京リージョンは `"Asia Pacific (Tokyo)"` または `ap-northeast-1`

**代替手段:**
- AWS CLI: `aws pricing get-products --service-code AmazonEC2 --filters ...`
- AWS SDKを使用したプログラマティックアクセス

On-Demand 価格の更新は `node scripts/update-od-pricing.mjs`（手動実行のみ、自動化なし）。

#### CB (Capacity Blocks) 価格更新

CB価格データソース:
https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json

JSONの `instance_types.<インスタンス名>.pricing` 配列から `accelerator_hourly_rate_usd` を参照し、`data/instances.json` の `priceCb` フィールドを更新する。
- リージョンの優先順位は 東京 (ap-northeast-1) → us-east-1 → us-east-2 → us-west-2 → レートを持つ先頭のエントリ（東京以外を使った場合は変更ログにリージョン名を出す）
- `accelerator_hourly_rate_usd` が数値でないエントリ（`"N/A"` など）はレート無しとして飛ばす
- 価格は数値のまま小数点第2位に四捨五入して保存する（表示側で `formatPrice` が整形する）
- CB フィードに東京が載っている行は `tokyo` を `true` にする。`tokyo` は「On-Demand か CB のどちらかで東京から使えるか」なので、CB 側からは `false` に倒さない

判定ロジックは `scripts/lib/cb-pricing.mjs` の純関数（`pickRate` / `applyCbPricing` / `unmatchedFeedKeys`）にあり、`tests/update-cb-pricing.test.js` でテストする。ファイルの読み書きは `scripts/lib/instances-file.mjs` の `readInstances` / `writeInstances` を使う（1 レコード 1 行の書式を保つため、別のシリアライザを書かないこと）。`scripts/update-cb-pricing.mjs` は fetch と入出力だけの薄い CLI で、フィードにあって `instances.json` に無いサイズを `warning: no row for <key>` として stderr に出す（trn / inf 系は対象外なので除く）。

**この更新は自動化済み**: `.github/workflows/update-cb-pricing.yml` が毎日 18:00 JST と `repository_dispatch`（`cb-pricing-updated`）で `scripts/update-cb-pricing.mjs` を実行し、差分があれば `data/instances.json` を main にコミットして deploy を起動する。手動実行は `gh workflow run update-cb-pricing.yml` または `node scripts/update-cb-pricing.mjs`。
