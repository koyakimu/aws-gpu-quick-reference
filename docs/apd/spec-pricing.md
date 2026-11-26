---
spec_id: "PRC-001"
context: "Pricing"
version: 1
issue_ref: null
title: "価格リージョンの選択と価格データの更新"
decision_refs: []
---

## User Story

**As a** AWS SA / Sales / GPU を検討中のお客様
**I want** 使う予定のリージョンの価格で比べたい。その価格がいつ確認されたものかも知りたい
**So that** 古い価格や別リージョンの価格で判断を誤らない

## Acceptance Criteria

### AC-001 価格リージョンの選択
- **Given**: `data/regions.json` がある
- **When**: ヘッダの「価格リージョン」でリージョンを選ぶ
- **Then**: 比較表の価格 3 列（$/h・$/GPU・$/GPU(CB)）と計算ツールの単価の既定値が、そのリージョンの値に切り替わる
- **And**: Notes の価格の説明に出るリージョン名も追従する

### AC-002 既定と保存
- **Given**: 初めてサイトを開く
- **When**: ページが読み込まれる
- **Then**: 価格リージョンは us-east-1 になる
- **And**: 選んだリージョンは localStorage に保存され、次回も使われる。保存値が一覧に無いリージョンなら us-east-1 に戻る

### AC-003 リージョンに価格が無い
- **Given**: 選んだリージョンで、あるインスタンスの On-Demand または Capacity Blocks の価格が無い
- **When**: 比較表を見る
- **Then**: その価格は「—」になる（別リージョンの価格で埋めない）
- **And**: us-east-1 を選んでいて `regions.json` に値が無いときだけ、`instances.json` の `price` / `priceCb` を使う

### AC-004 価格の最終確認日
- **Given**: サイトを開く
- **When**: ヘッダと Notes を見る
- **Then**: On-Demand 価格を最後に AWS Price List と突き合わせた日（`instances.json` の `pricingAsOf`）が、言語ごとの日付表記で出る（ja「2026年11月26日」/ en "November 26, 2026" / ko「2026년 11월 26일」）

### AC-005 On-Demand 価格の自動更新
- **Given**: `.github/workflows/update-od-pricing.yml`（毎週月曜 17:00 JST、手動実行も可）
- **When**: `scripts/update-od-pricing.mjs` が走る
- **Then**: us-east-1 の Price List から Linux / Shared の時間単価を取り、`price` と `priceGpu`（= `price` ÷ GPU 数）を更新する。東京の Price List に載っているかで `tokyo` を更新する
- **And**: 取得と検証が通れば、価格に変更が無くても `pricingAsOf` を実行日（UTC、`YYYY-MM-DD`）にする
- **And**: 差分を main にコミットしてデプロイを起動する

### AC-006 (Error Case) Price List の取得が壊れている
- **Given**: Price List が空、または価格を取れたサイズが対象の半分未満
- **When**: `update-od-pricing.mjs` が走る
- **Then**: 何も書かずに終了コード 1 で終わる（`pricingAsOf` も変えない）

### AC-007 Capacity Blocks 価格の自動更新
- **Given**: `.github/workflows/update-cb-pricing.yml`（毎日 18:00 JST、`repository_dispatch` の `cb-pricing-updated`、手動実行も可）
- **When**: `scripts/update-cb-pricing.mjs` が走る
- **Then**: CB 価格 JSON の `accelerator_hourly_rate_usd` で `priceCb` を更新する。リージョンは 東京 → us-east-1 → us-east-2 → us-west-2 → レートを持つ先頭の順で選ぶ
- **And**: フィードに東京が載っている行は `tokyo` を `true` にする（`false` には倒さない）
- **And**: フィードにあって `instances.json` に無いサイズは警告を出す（trn / inf 系は除く）

### AC-008 リージョン別価格の自動更新
- **Given**: REG-001 の週次更新
- **When**: `scripts/update-regions.mjs` が走る
- **Then**: `data/regions.json` の `prices` に、サイズ → リージョン → `od`（インスタンス単位の $/h）と `cb`（GPU 1 枚あたりの $/h）が入る

## UI Description

- ヘッダ左のサイト名の横に「価格リージョン:」とリージョンコードの選択、その右に「（価格確認日 …）」
- `regions.json` が無いビルドでは選択を出さず、既定リージョンのコードを文字で出す

## Context Boundary

### Inputs
- **From**: AWS Price List（`pricing.us-east-1.amazonaws.com`）— On-Demand 価格
- **From**: CB 価格 JSON（`koyakimu/ec2-capacity-blocks-for-ml-pricing-json`）— Capacity Blocks 価格
- **From**: `data/regions.json` — リージョンの一覧と `prices`

### Outputs
- **To**: REF-001 — 行ごとの `{ od, gpu, cb }`
- **To**: CAL-001 — 単価の既定値
- **To**: I18N-001 — 文言の置換子 `%PRICE_REGION%` / `%PRICING_AS_OF%` の値

### Dependencies
- **REG-001**: `regions.json` を生成する

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001〜AC-003 | unit | `tests/price-region.test.js` |
| AC-004 | unit | `tests/format.test.js` 日付の表記、`tests/i18n.test.js` / `tests/main-boot.test.js` 置換、`tests/gpu-data.test.js` `pricingAsOf` の形式 |
| AC-005, AC-006 | unit | `tests/update-od-pricing.test.js`（走査と反映の純関数。検証と `pricingAsOf` の書き換えは CLI 側でテストなし） |
| AC-005 | 完成後の実機確認 | `gh workflow run update-od-pricing.yml` が通り、`pricingAsOf` が実行日になる |
| AC-007 | unit | `tests/update-cb-pricing.test.js` |
| AC-008 | unit | `tests/update-regions.test.js` |

## Notes

- 価格の採り方（Linux / Shared / Used / preInstalledSw NA / BYOL 以外、複数該当時は最安）と各スクリプトの構成は CLAUDE.md の「価格更新」にある
- UltraServer と Capacity Blocks 専用のサイズは Price List に On-Demand 価格が無い。`tokyo` は CB 側と `regions.json` が持つ
