# AWS GPU Quick Reference 刷新 設計書

作成日: 2026-09-07
状態: ユーザー承認待ち

## 1. 目的と範囲

「AWS EC2 GPU インスタンスの比較表」を、データ更新・新機能追加・デザイン全面刷新の 3 軸で作り直す。

含むもの:

- データ更新: On-Demand 価格の再取得、不足インスタンスの追加（UltraServer 含む）、依存パッケージ更新、テスト補強
- 新機能 1: 全リージョンでの提供有無（On-Demand / Capacity Blocks 別）
- 新機能 2: GPU 機能対応マトリクス（世代 × 機能）
- デザイン: 「密度重視のデータツール」方向で全面刷新。既存の見た目は維持しない

含まないもの:

- Trainium / Inferentia / AMD GPU（サイトは NVIDIA GPU 搭載 EC2 に限定する）
- AZ 単位の提供有無（リージョン粒度まで）
- ユースケース別の「選び方」文章ガイド
- フレームワーク導入・表ライブラリ導入（案 1「素の JS + 自前の表エンジン」で進める）

## 2. 全体方針

- Vite + vite-plugin-singlefile による単一 HTML 配布、実行時依存ゼロを維持する
- データの正は `data/*.json` に置き、JS は JSON を import する薄い層にする
- 表は 1 つの表エンジン（`src/scripts/table-engine.js`）で描き、比較表・リージョン表・機能マトリクスの 3 つがそれを共有する
- 4 つの画面（Compare / Regions / Features / Calculator）は URL ハッシュで切り替えるタブにする
- 既存の CB 価格自動更新ワークフローと同じ形で、リージョン提供有無も GitHub Actions で自動更新する

## 3. 実装順序（PR 分割）

依存関係に沿って 5 本に分ける。各 PR は単独でマージ可能な状態にする。

| # | ブランチ | 内容 |
|---|---|---|
| 1 | `chore/foundation` | 依存パッケージ更新、テスト補強（i18n キー整合、表描画の DOM テスト）、`.superpowers/` の gitignore |
| 2 | `feat/data-json` | JSON を正にする移行、On-Demand 価格再取得、不足インスタンス追加、`pricingAsOf` のビルド時埋め込み |
| 3 | `feat/design-renewal` | デザイントークン、テーマ、タブ、表エンジン、比較表の操作 4 種 |
| 4 | `feat/region-availability` | 取得スクリプト、Actions ワークフロー、Regions タブ、リージョンフィルタ |
| 5 | `feat/gpu-features` | `gpu-features.json`、Features タブ、整合テスト |

PR 3 は PR 2 のデータ構造に依存する。PR 4 と PR 5 は PR 3 の表エンジンに依存する。PR 4 と PR 5 は互いに独立で並列に進められる。

## 4. データモデル

### 4.1 `data/instances.json`

現在の `GPU_DATA` を移す。1 レコードが 1 インスタンスサイズ。**すべてのレコードが `gen` / `gpu` / `ec2` を持つ**（現状は rowspan 前提で先頭行だけが持っている）。`genRows` / `gpuRows` / `ec2Rows` は削除し、結合は描画側で必要なら計算する。

```json
{
  "pricingAsOf": "2026-09",
  "pricingRegion": "us-east-1",
  "instances": [
    {
      "gen": "blackwell",
      "gpu": "B200",
      "gpuKey": "b200",
      "ec2": "P6-B200",
      "size": "p6-b200.48xlarge",
      "unit": "instance",
      "count": 8,
      "vramPerGpu": 180,
      "fp16NonTc": null,
      "fp16Dense": 2250, "fp16Sparse": 4500,
      "fp8Dense": 4500, "fp8Sparse": 9000,
      "fp4Dense": 9000, "fp4Sparse": 18000,
      "est": false,
      "efa": "v4 3200G",
      "pcie": "Gen5",
      "vcpu": 192,
      "mem": "2TB",
      "nvme": "30TB",
      "price": 113.93,
      "priceGpu": 14.24,
      "priceCb": 12.36,
      "tokyo": false
    }
  ]
}
```

フィールドの変更点:

- `gpuKey`: `gpu-features.json` と結合するキー。小文字英数字（`b300`, `b200`, `rtx-pro-6000`, `h200`, `h100`, `l40s`, `l4`, `a100-40`, `a100-80`, `a10g`, `t4`, `t4g`, `v100`）
- `unit`: `"instance"` または `"ultraserver"`。UltraServer（`u-p6e-gb200x72` など）は `count` が GPU 総数、`size` が UltraServer 種別名。価格は UltraServer 全体の時間単価
- `price` / `priceGpu` / `priceCb`: **数値**に変える。`null` は「提供なし」。文字列 `"$113.93"` / `"-"` / `"TBD"` はやめる。表示時に整形する
- `count`: 数値または分数文字列（`"1/8"`）。現状維持
- `gpuNew`: 削除。「新しい」の判定は `gen` と追加日で足りる。代わりに `addedAt: "2026-09"` を持たせ、直近 3 か月以内なら NEW バッジを出す

`src/scripts/gpu-data.js` は次だけを export する:

- `GPU_DATA`（`instances` 配列そのまま）
- `EC2_LINKS`、`GPU_DATASHEET_LINKS`（現状維持）
- `PRICING_META`（`pricingAsOf`, `pricingRegion`）

### 4.2 `data/regions.json`（スクリプト生成、手で編集しない）

```json
{
  "generatedAt": "2026-09-07T09:00:00Z",
  "regions": [
    { "code": "us-east-1", "name": "US East (N. Virginia)" }
  ],
  "availability": {
    "p5.48xlarge": { "us-east-1": "both", "ap-northeast-1": "cb" }
  }
}
```

- 値は `"od"` / `"cb"` / `"both"`。無いリージョンはキー自体を書かない
- `regions` の順序は AWS の地理グループ順（北米 → 南米 → 欧州 → 中東・アフリカ → アジア太平洋）に固定し、スクリプト内の定数で並べる

### 4.3 `data/gpu-features.json`（手書き）

```json
{
  "features": [
    { "key": "fp8", "since": "hopper" },
    { "key": "fp4", "since": "blackwell" },
    { "key": "nvlink" },
    { "key": "mig" },
    { "key": "transformerEngine" },
    { "key": "confidentialCompute" },
    { "key": "nvenc" },
    { "key": "rtCores" },
    { "key": "ecc" }
  ],
  "gpus": {
    "h100": {
      "fp8": true, "fp4": false, "nvlink": true, "mig": true,
      "transformerEngine": true, "confidentialCompute": true,
      "nvenc": false, "rtCores": false, "ecc": true,
      "notes": { "nvenc": "NVDEC/JPEG デコーダのみ" }
    }
  }
}
```

- 値は `true` / `false` / `"partial"`。`"partial"` のセルには `notes[<feature>]` の注釈を番号付きで表の下に出す
- 機能名と説明文は i18n 辞書に持つ（`features.fp8.label`, `features.fp8.desc`）

### 4.4 `data/aws-ec2-nvidia-gpu-specs.json`

参照用に残すが、アプリからは読まない。`instances.json` と重複する演算性能はテストで一致を検証する（9 節）。

## 5. 表エンジン

### 5.1 インターフェース

```js
// src/scripts/table-engine.js
createTable({ columns, rows, state, onStateChange, i18n }) -> { el, update(rows, state) }
```

- `columns`: `{ key, group, labelKey, type, sortable, sticky, align, format, width }[]`
  - `type`: `"text" | "number" | "price" | "flag" | "availability" | "feature"`
  - `format`: 任意。セル値を文字列や DOM に整形する関数
- `rows`: プレーンなオブジェクト配列。列の `key` で値を引く
- `state`: `{ sortKey, sortDir, hiddenGroups }`。フィルタは呼び出し側が `rows` を絞ってから渡す（エンジンはフィルタを知らない）
- ソートの比較: `number` / `price` は数値比較で `null` は常に末尾、`text` は `localeCompare`、`flag` は `true` が先

### 5.2 比較表（Compare）

- 列グループ: Instance / GPU / Performance / Connect / System / Price。グループ単位で表示切替
- 既定の並びは現状と同じ「世代 → ファミリ → サイズ」。ソートを解除するとこの並びに戻る
- フィルタ: 世代（複数選択のトグル）、ファミリ（複数選択）、リージョン（単一選択、`regions.json` があるときだけ表示）。リージョンを選ぶと、そのリージョンで提供のない行を隠す
- 状態の保存: `hiddenGroups` と世代フィルタは localStorage に保存する。ソートとリージョンは保存しない
- 固定: 先頭列（Instance）と `<thead>` を `position: sticky` で固定
- rowspan による結合は廃止し、各行に GPU チップとファミリを表示する（モック D の形）
- 行数表示: 「12 / 47 rows」の形でフィルタ結果数を表示

### 5.3 リージョン表（Regions）

- 行 = インスタンス、列 = リージョン。セルは `od` / `cb` / `both` / 空
- 先頭列固定。リージョン列の見出しは地理グループごとに上段見出しを付ける
- 世代・ファミリのフィルタは Compare と共有する（同じ state オブジェクト）
- `generatedAt` を表の下に表示する

### 5.4 機能マトリクス（Features）

- 行 = GPU（`gpuKey` ごとに 1 行）、列 = 機能
- セルは `true` = ✓、`false` = 空、`"partial"` = △ と注釈番号
- 行のリンク先は `GPU_DATASHEET_LINKS`

### 5.5 タブ

- `#compare` `#regions` `#features` `#calculator`。既定は `#compare`
- `hashchange` で切替。ハッシュがあれば初期表示で対応タブを開く
- 非表示タブの DOM は描画したまま `hidden` 属性で隠す（切替時の再描画を避ける）

## 6. デザイン

方向は brainstorming の折衷案 D で確定。モックは `.superpowers/brainstorm/95289-1788758443/content/visual-style-v2.html`。

### 6.1 トークン（`src/styles/tokens.css` を新設）

- 色（ダーク既定、ライトは `[data-theme="light"]` で再定義）
  - `--bg` `#161719`、`--bg-raised` `#1b1d20`、`--bg-hover` `#1c1e22`
  - `--line` `#2a2c30`、`--line-soft` `#222428`
  - `--fg` `#d4d6da`、`--fg-strong` `#f2f3f5`、`--fg-muted` `#8b8f97`、`--fg-dim` `#5c6068`
  - `--accent` `#f5b95a`（ライトでは `#a35f00`）、`--accent-bg` `#221e15`
  - 世代チップ 4 組（`--chip-<gen>-fg / -bg / -line`）: blackwell 紫、hopper 青、ada 青緑、ampere 黄緑。turing / volta はグレー
- 余白スケール: `--sp-1: 4px` から `--sp-6: 32px`（4 / 8 / 12 / 16 / 24 / 32）
- 文字スケール: `--fs-xs: 11px`, `--fs-sm: 12.5px`, `--fs-md: 13px`, `--fs-lg: 15px`, `--fs-xl: 20px`
- 書体: 本文はシステムサンセリフ、インスタンス名と数値は `--font-mono`（SF Mono, Menlo, JetBrains Mono, ui-monospace）。数値列は `font-variant-numeric: tabular-nums`
- 角丸 `--radius: 5px`、表の枠 `--radius-lg: 7px`。影は使わない

### 6.2 テーマ

- 初回は `prefers-color-scheme` に従う。切替ボタンで固定すると localStorage に保存し、以後はそれを優先
- `light-theme.css` は廃止し、`tokens.css` 内の `[data-theme="light"]` ブロックでトークンだけ再定義する。コンポーネント CSS にテーマ分岐を書かない
- `prefers-reduced-motion: reduce` で遷移を無効化

### 6.3 レイアウト

- ヘッダ: 左にテキストロゴ「AWS GPU Reference」と `pricing 2026-09 · us-east-1` の等幅表記、右にタブ、その右に言語・テーマ切替。絵文字は使わない
- フィルタバー: タブの下。世代トグル、ファミリ選択、リージョン選択、列切替、右端に行数
- 表: 枠線 1px の角丸パネル。行高は約 28px、セル余白 6px × 10px
- 計算ツール: 既存のロジックを維持し、見た目だけトークンに合わせる
- ブレークポイントは `768px` の 1 つ。`base.css` に集約し、各ファイルの重複を消す。モバイルではヘッダを 2 段にし、表は先頭列固定の横スクロール

### 6.4 CSS ファイル構成

```
src/styles/
├── tokens.css      # 色・余白・文字・角丸（ダーク + ライト）
├── base.css        # リセット、body、共通メディアクエリ
├── header.css      # ヘッダ、タブ、フィルタバー
├── table.css       # 表エンジンの共通スタイル、固定列、ソート表示、チップ
└── calculator.css
```

## 7. リージョン提供有無の取得

### 7.1 `scripts/update-regions.mjs`

1. `https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/region_index.json` からリージョン一覧を取得
2. 各リージョンの `.../current/<region>/index.json` を**逐次**取得（並列 3 まで）。`products` を走査し、`instances.json` にある `size` が `attributes.instanceType` として現れれば On-Demand 提供ありとする。`attributes.operatingSystem === "Linux"` かつ `tenancy === "Shared"` の製品だけを見る
3. CB 価格 JSON（既存 URL）の `instance_types.<size>.pricing[].region` から CB 提供リージョンを取る
4. 合成して `data/regions.json` を書く。既存ファイルと `generatedAt` 以外が同じなら書き換えない（差分なしを終了コードで返す）
5. 取得失敗したリージョンがあれば、そのリージョンは前回の値を保持し、標準エラーに警告を出して終了コード 0 で終える（1 リージョンの失敗で全体を止めない）。全リージョン失敗なら終了コード 1

UltraServer（`unit: "ultraserver"`）は Price List に載らないため、CB 価格 JSON だけで判定する。

### 7.2 `.github/workflows/update-regions.yml`

- 週 1 回（月曜 18:00 JST）と `workflow_dispatch`、および `repository_dispatch`（`cb-pricing-updated`）
- `update-cb-pricing.yml` と同じ手順: スクリプト実行 → 差分があれば main にコミット → deploy を起動
- Node 標準の `fetch` を使い、依存パッケージを増やさない

## 8. データ更新（PR 2 の作業内容）

- On-Demand 価格: Price List の us-east-1 ファイルから全 `size` の Linux / Shared の時間単価を取り、`price` を更新。`priceGpu` は `price / count` で再計算。東京の有無は同様に ap-northeast-1 ファイルで判定し `tokyo` を更新。この処理も `scripts/update-od-pricing.mjs` として残す（自動化は今回の範囲外、手動実行のみ）
- 不足インスタンス: AWS の GPU インスタンス一覧（p6e-gb200 UltraServer、その他 2026-09 時点で公開済みのもの）と突き合わせて追加。演算性能は NVIDIA データシートから取り、`data/aws-ec2-nvidia-gpu-specs.json` にも同じ値を追記する
- `pricingAsOf`: `vite.config.js` で `instances.json` から読み、`%PRICING_AS_OF%` としてテンプレートに埋め込む。`en.js` / `ja.js` / `ko.js` の「Updated July 2026」相当の文言は置換子付きの文言に変える
- ヘッダの `%BUILD_DATE%` は「サイト更新日」として残す

## 9. テスト

既存 4 ファイルに加えて:

- `tests/i18n-keys.test.js`: `ja` / `en` / `ko` のキー集合が一致する
- `tests/table-engine.test.js`: ソート（数値・価格・null 末尾・テキスト）、列グループの表示切替、sticky クラス付与、`update` で行が差し替わる
- `tests/tabs.test.js`: ハッシュとタブの対応、初期表示
- `tests/gpu-data.test.js` に追加: 全レコードが `gen` / `gpu` / `gpuKey` / `ec2` を持つ、価格が数値か null、`gpuKey` が `gpu-features.json` に存在する、`instances.json` の演算性能が `aws-ec2-nvidia-gpu-specs.json` と一致する
- `tests/update-regions.test.js`: Price List と CB JSON のサンプルを固定入力にして合成結果を検証（ネットワークは使わない）
- `tests/theme.test.js`: `prefers-color-scheme` と localStorage の優先順位

## 10. エラー処理

- `regions.json` が無い、または読めないビルドでも Compare / Features / Calculator は動く。Regions タブは「データ未生成」の表示にし、リージョンフィルタは出さない
- `gpu-features.json` に無い `gpuKey` があればテストで落とす（実行時には空行にしない）
- 価格が `null` の行は Calculator の選択肢から除外する（現状の `isCbOnly` 相当の判定を数値 null に合わせて書き直す）

## 11. 未決事項

なし。実装中に判断が必要になった場合はこの文書に追記する。
