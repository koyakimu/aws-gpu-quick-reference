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
- 新しいGPUを追加する場合はまずJSONを更新してから `src/scripts/gpu-data.js` の `GPU_DATA` 配列を編集

### GPU_DATA配列

`src/scripts/gpu-data.js` の `GPU_DATA` 配列を編集。各エントリはオブジェクト形式:
```javascript
{ gen, gpu, ec2, size, count, vramPerGpu, fp16PerGpu, fp8PerGpu,
  efa, pcie, vcpu, mem, nvme, price, priceGpu, priceCb, tokyo }
```

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

#### CB (Capacity Blocks) 価格更新

CB価格データソース:
https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json

JSONの `instance_types.<インスタンス名>.pricing` 配列から `accelerator_hourly_rate_usd` を参照し、`GPU_DATA` の `priceCb` フィールドを更新する。
- 東京リージョン（ap-northeast-1）がある場合はその値を使用
- ない場合は最も一般的なリージョン（us-east-1等）を使用
- 価格は小数点第2位まで表示（例: $3.93）
