---
spec_id: "REG-001"
context: "Regions"
version: 2
issue_ref: null
title: "リージョン別の提供状況（Regions タブ）"
decision_refs: []
---

## User Story

**As a** AWS SA / Sales / GPU を検討中のお客様
**I want** あるインスタンスがどのリージョンで、On-Demand と Capacity Blocks のどちらで使えるかを一覧で見たい
**So that** 使いたいリージョンで調達できる候補をすぐに見分けられる

## Acceptance Criteria

### AC-001 提供状況の表
- **Given**: `data/regions.json` がある
- **When**: Regions タブ（`#regions`）を開く
- **Then**: 行 = インスタンスサイズ、列 = リージョンの表が出る
- **And**: セルには On-Demand で提供があれば「OD」、Capacity Blocks で提供があれば「CB」のピルが出る（両方なら 2 つ並ぶ）。どちらも無ければ「—」

### AC-002 リージョンの並びと地理グループ
- **Given**: Regions の表が出ている
- **When**: 列を見る
- **Then**: リージョンは北米 → 南米 → 欧州 → 中東・アフリカ → アジア太平洋の順に並び、見出しはリージョンコード、ツールチップに正式名が出る
- **And**: 表の上のバーで、地理グループ単位に列の表示を切り替えられる

### AC-003 フィルタを Compare と共有する
- **Given**: Compare タブで世代またはファミリを絞っている
- **When**: Regions タブを開く
- **Then**: 同じ絞り込みが効いている。Regions 側で変えると Compare 側にも反映される
- **And**: 価格リージョンの選択（PRC-001）はこの表の列を絞らない

### AC-004 凡例と生成日
- **Given**: Regions の表が出ている
- **When**: 表の下を見る
- **Then**: OD / CB / — の凡例、データの確認日（`generatedAt` の UTC の日付）、Local Zone の注記が出る

### AC-005 Local Zone の扱い
- **Given**: Capacity Blocks が Local Zone でのみ提供されるインスタンスがある
- **When**: 表を見る
- **Then**: その提供は親リージョンの列に含まれる

### AC-006 (Error Case) データが無い
- **Given**: `data/regions.json` が無い状態でビルドした
- **When**: Regions タブを開く
- **Then**: 表の代わりに「データはまだ生成されていません」と出る。ほかのタブは動く

### AC-007 データの自動更新
- **Given**: `.github/workflows/update-regions.yml`（毎週月曜 18:37 JST、手動実行も可）
- **When**: `scripts/update-regions.mjs` が走る
- **Then**: AWS Price List の通常リージョン（Local Zone と GovCloud を除く）を走査し、Linux / Shared の提供有無と On-Demand 時間単価を取る。Capacity Blocks は CB 価格 JSON から取る
- **And**: 全リージョンの取得が通れば、データに差分が無くても `generatedAt` を実行日時にして `data/regions.json` を書き換え、main にコミットしてデプロイを起動する

### AC-008 (Error Case) 一部のリージョンの取得に失敗
- **Given**: 更新中に 1 つ以上のリージョンの取得が失敗した
- **When**: スクリプトが終わる
- **Then**: 失敗したリージョンは前回の値を保ち、警告を出して終了コード 0 で終わる
- **And**: ほかのリージョンにも差分が無ければ `generatedAt` は進めない（全リージョンを確認できていないため）
- **And**: 全リージョンが失敗したときだけ終了コード 1 で終わり、ファイルは書き換えない

## UI Description

- フィルタバー（世代トグル、ファミリ、行数）は Compare と同じ見た目。その下に地理グループの切替バー
- 先頭列（インスタンスサイズ）を固定し、横スクロールする
- 2 段見出し（地理グループを上段）は表エンジンが 1 段しか描けないため採らず、グループ単位の切替バーで代える

## Context Boundary

### Inputs
- **From**: `data/regions.json` — `regions`（コードと名前）、`availability`（サイズ → リージョン → `od` / `cb` / `both`）、`generatedAt`
- **From**: REF-001 — 世代・ファミリのフィルタ状態
- **From**: AWS Price List / CB 価格 JSON — 更新スクリプトの入力

### Outputs
- **To**: REF-001 — 「選択リージョンで提供のみ」の判定に使う `availability`
- **To**: PRC-001 — リージョン別価格（同じ `regions.json` の `prices`）と、価格リージョンの選択肢

### Dependencies
- **UI-001**: 表エンジン

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001〜AC-004, AC-006 | unit | `tests/regions-view.test.js` |
| AC-005, AC-007, AC-008 | unit | `tests/update-regions.test.js`（Price List と CB JSON の固定入力。ネットワークは使わない） |
| AC-007 | 完成後の実機確認 | `gh workflow run update-regions.yml` が通り、`generatedAt` が実行日時になる |

## Notes

- `data/regions.json` は生成物。手で編集しない
- 取得条件、所要時間、キー順の決まりは CLAUDE.md の「リージョン別の提供有無と価格」にある
