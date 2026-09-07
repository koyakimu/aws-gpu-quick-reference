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

### GPU スペック (data/gpu-specs.json)

GPU タブ上段の「GPU スペック」表と、比較表の FP32 / TF32 Dense 列が読むファイル。gpuKey ごとに 1 エントリで、`fp64` 〜 `int8Sparse` (TFLOPS、INT8 のみ TOPS)、`memoryGb` / `memoryBandwidthGbs` / `tdpW`、`source` (参照した NVIDIA のページ or データシート PDF の URL)、`notes` を持つ。

編集の決まり:

- 値は **NVIDIA 公式データシート / 製品ページの記載だけ**を入れる。記憶や他サイトからの推定は入れない
- データシートに載っていない項目は `null` にする (表では — と表示される)。0 で埋めない
- データシートがスパース値しか載せていない場合は Dense = その半分とし、その旨を `notes` に書く
- `source` は実際にその数値を読んだ URL にする。複数ページを使った場合は主たる URL を `source` に置き、残りを `notes` に書く
- 追加・変更したら `data/instances.json` の `fp16Dense` / `fp8Dense` / `fp4Dense` と突き合わせる。食い違ったら instances.json を黙って直さず、どちらが正しいかを確認する

`tests/gpu-specs.test.js` が守っている: instances.json の全 gpuKey にエントリがあること、`source` が URL であること、数値フィールドがすべて正数か `null` であること、GPU タブが 15 行描かれること、比較表に FP32 列があること。

### インスタンスがまだ無い GPU (data/gpu-specs.json の extraGpus)

AWS が採用を発表済みでインスタンス型名・価格が未公開の GPU は、`instances.json` には
何も足さず、`data/gpu-specs.json` のトップレベル `extraGpus` に並び順のヒントを書く。

```json
"extraGpus": [
  { "gpuKey": "gb300", "gpu": "GB300", "gen": "blackwell", "after": "gb200", "announced": true }
]
```

- `after` … この gpuKey の直後に行を差し込む (見つからなければ末尾)
- `announced: true` … GPU タブの行に「発表済み」の印 (i18n `gpu.announced`) を付ける
- `data/gpu-features.json` 側にも同じ gpuKey のエントリと `sources` を足す
- 表示名 (`gpu`) は `src/scripts/gpu-data.js` の `GPU_DATASHEET_LINKS` のキーと一致させる
- インスタンスが出たら `instances.json` に足してこの項目を消す
  (同じ gpuKey が instances.json にあれば extraGpus 側は無視される)

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

#### リージョン別の提供有無と価格 (data/regions.json)

`data/regions.json` は `scripts/update-regions.mjs` が生成する。**手で編集しない。**
`availability`（提供有無）と `prices`（リージョン別価格）の 2 本を持つ。

```jsonc
"prices": {
  "p5.48xlarge": {
    "ap-northeast-1": {"od": 68.8, "cb": 4.72},  // od = インスタンス単位の $/h
    "us-east-1": {"od": 55.04, "cb": 5.19}       // cb = GPU 1 枚あたりの $/h (priceCb と同じ単位)
  }
}
```

- AWS Price List の `region_index.json` から通常リージョン (Local Zone と GovCloud を除く 34 件) を取り、各リージョンの `index.json` をストリームで走査する。`products` で Linux / Shared の提供有無を、`terms.OnDemand` で時間単価を採る。走査器は `scripts/lib/od-pricing.mjs` の `scanPriceListFull` 1 本で、`update-od-pricing.mjs`（us-east-1 のみ）と共有する
- 価格の条件は Linux / Shared / Used / preInstalledSw NA / BYOL 以外、複数該当時は最安。提供有無の判定はそれより緩く Linux / Shared だけを見る
- Capacity Blocks 側は CB 価格 JSON の `instance_types.<size>.pricing[]` から `region_code`（Local Zone は親リージョンに寄せる）と `accelerator_hourly_rate_usd` を取る
- `terms` まで読むため 1 リージョン 300〜480MB を丸ごと落とす（提供有無だけを見ていた頃の 2〜3 倍）。実測は 34 リージョンで転送 10〜15GB・2〜5 分（回線次第。CI の `timeout-minutes` は 90）
- 1 リージョンの取得失敗では止まらない。そのリージョンは前回値を保持して警告のみ（価格は前回の `od` だけ戻し、`cb` は今回の値を使う）。全リージョン失敗のときだけ終了コード 1
- `availability` / `prices` のリージョンキーは並列走査の完了順ではなくリージョンコード順に揃える。実行ごとにキー順が変わると `sameExceptGeneratedAt` が毎回「差分あり」と判定してしまうため
- UI 側はヘッダの `#price-region` で選んだリージョンの価格を `src/scripts/price-region.js` 経由で読む。既定は `us-east-1` で、`prices` に値が無ければ `instances.json` の `price` / `priceCb` に落ちる

**自動化済み**: `.github/workflows/update-regions.yml` が毎週月曜 18:00 JST の cron と `workflow_dispatch` で実行し、差分があれば main にコミットして deploy を起動する。手動実行は `gh workflow run update-regions.yml` または `node scripts/update-regions.mjs`（`--dry-run` で書き込みなし）。

### GPU 機能マトリクス (data/gpu-features.json)

`data/gpu-features.json` は**手書き**。Features タブ（`src/scripts/features-view.js`）が読む。

- `features[]` が列の並びと種類を決める。`gpus.<gpuKey>` が行で、値は `true` / `false` / `"partial"`
- `"partial"` のセルには `notes.<機能キー>` に日本語の注釈を書く。表では「△ n」と番号が付き、表の下の一覧に出る
- 機能名と説明は i18n 辞書の `features.<キー>.label` / `.desc`（ja / en / ko の 3 つとも必要）
- `sources.<gpuKey>` に根拠にした NVIDIA データシートの URL を残す
- GPU を追加したら `instances.json` の `gpuKey` と同じキーで 1 件足す。`tests/gpu-data.test.js` の "gpu-features.json covers every gpuKey" が、全 `gpuKey` の存在・未定義の機能キーが無いこと・`sources` の有無を検証する
