---
spec_id: "REF-001"
context: "Compare"
version: 3
issue_ref: null
title: "GPU インスタンス比較表（Compare タブ）"
decision_refs: []
---

## User Story

**As a** AWS SA / Sales / GPU を検討中のお客様
**I want** 全世代の NVIDIA GPU 搭載 EC2 インスタンスのスペックと価格を 1 つの表で比べたい
**So that** 散らばった情報を突き合わせる手間なく、候補を絞り込める

## Acceptance Criteria

### AC-001 全インスタンスの表示
- **Given**: サイトを開く（ハッシュなし、または `#compare`）
- **When**: ページが読み込まれる
- **Then**: `data/instances.json` の全行（1 行 = 1 インスタンスサイズ、UltraServer を含む）が Compare タブの表に出る

### AC-002 列と列グループ
- **Given**: 比較表が出ている
- **When**: 表を見る
- **Then**: 次の列が、この順のグループで並ぶ

| グループ | 列 |
|---|---|
| GPU | GPU（先頭の固定列。世代色のチップで、データシートがあればリンク）、数、VRAM 合計 (GB) |
| Instance | EC2 ファミリ（公式ページへのリンク）、サイズ |
| Performance | FP16 CUDA、FP32、TF32 Dense、BF16 Dense / Sparse、FP16 Dense / Sparse、FP8 Dense / Sparse、FP4 Dense / Sparse、INT8 Dense / Sparse (TOPS) |
| Connect | EFA、PCIe |
| System | vCPU、Mem、NVMe |
| Price | $/h（On-Demand）、$/GPU、$/GPU(CB)、東京 |

### AC-003 VRAM はインスタンス全体の値
- **Given**: 比較表が出ている
- **When**: VRAM 合計の列を見る
- **Then**: GPU 数 × 1 GPU あたりの VRAM が出る（g6e.48xlarge は 384、p5.48xlarge は 640）
- **And**: GPU 数が分数のサイズ（g6f など）は実際に使える量が出る（g6f.large は 3）

### AC-004 演算性能の値
- **Given**: 比較表が出ている
- **When**: Performance の列を見る
- **Then**: 値は 1 GPU あたりで、単位は TFLOPS（INT8 のみ TOPS）
- **And**: FP32 / TF32 / BF16 / INT8 は `data/gpu-specs.json`（NVIDIA データシートの値）から引かれ、記載の無い項目は「—」になる（T4・V100 の BF16 など）
- **And**: 概算値の行（`est: true`）は FP16 / FP8 / FP4 の値に * が付く

### AC-005 既定の並びと世代の帯
- **Given**: 並べ替えをしていない
- **When**: 表を見る
- **Then**: 世代の新しい順（Blackwell → Volta）に並び、世代ごとに帯の見出し行が入る
- **And**: 同じ GPU・同じファミリが続く行では、2 行目以降の GPU とファミリが空欄になる
- **And**: 並べ替え中は帯と空欄化をやめ、全行に GPU とファミリを出す

### AC-006 フィルタ
- **Given**: 比較表が出ている
- **When**: 世代のトグル、またはファミリのチェックボックスを操作する
- **Then**: 選んだ世代・ファミリの行だけが残る（どちらも複数選択。何も選ばなければ全行）
- **And**: 行数が「{表示} / {全体} 行」の形で出る
- **And**: 条件に合う行が無ければ、その旨のメッセージが出る

### AC-007 選択リージョンで提供のある行だけに絞る
- **Given**: `data/regions.json` がある
- **When**: 「選択リージョンで提供のみ」にチェックを入れる
- **Then**: ヘッダで選んだ価格リージョン（PRC-001）で On-Demand か Capacity Blocks の提供がある行だけが残る
- **And**: 価格リージョンを変えると、絞り込みも追従する

### AC-008 列グループの表示切替
- **Given**: 比較表が出ている
- **When**: 「列」メニューでグループのチェックを外す
- **Then**: そのグループの列が隠れる

### AC-009 状態の保存
- **Given**: 世代フィルタと列グループの表示を変えた
- **When**: ページを開き直す
- **Then**: 世代フィルタと列グループの表示は復元される
- **And**: 並べ替え、ファミリ、「選択リージョンで提供のみ」は復元されない

### AC-010 価格の表示
- **Given**: 比較表が出ている
- **When**: Price の列を見る
- **Then**: ヘッダで選んだ価格リージョンの On-Demand（インスタンス単位）、GPU 1 枚あたり、Capacity Blocks（GPU 1 枚あたり）が小数 2 桁で出る
- **And**: On-Demand が無く Capacity Blocks だけある行は、On-Demand の列に「CB専用」と出る
- **And**: どちらも無い価格は「—」になる

### AC-011 東京リージョン
- **Given**: 比較表が出ている
- **When**: 東京の列を見る
- **Then**: On-Demand か Capacity Blocks のどちらかで東京から使える行に ✓ が出る

### AC-012 (Error Case) リージョンデータが無い
- **Given**: `data/regions.json` が無い状態でビルドした
- **When**: 比較表を開く
- **Then**: 表は出る。「選択リージョンで提供のみ」は出ず、価格は `instances.json` の値（us-east-1）になる

## UI Description

- 計算ツール（CAL-001）は表の上に畳んで置く
- その下にフィルタバー: 世代トグル、ファミリ、列、「選択リージョンで提供のみ」、右端に行数
- 表の下に Notes（価格・EFA・PCIe・演算性能の読み方、公式リファレンス、免責事項、データの最終確認日。確認日の中身は PRC-001 AC-004）
- 並べ替え、固定列、横スクロールは表の共通動作（UI-001）

## Context Boundary

### Inputs
- **From**: `data/instances.json` — インスタンスの行。`src/scripts/gpu-data.js` が `GPU_DATA` として渡す
- **From**: `data/gpu-specs.json` — FP32 / TF32 / BF16 / INT8 の値（GPU-001 と共有）
- **From**: PRC-001 — 選択中の価格リージョンと、そのリージョンの価格
- **From**: `data/regions.json` — リージョンごとの提供有無（REG-001 と共有）

### Outputs
- **To**: REG-001 — 世代・ファミリのフィルタ状態（`compare-state-changed` イベント）

### Dependencies
- **UI-001**: 表エンジン（`src/scripts/table-engine.js`）
- **PRC-001**: 価格リージョン

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001, AC-002 | unit | `tests/compare-view.test.js` 列定義と描画、`tests/gpu-data.test.js` データの形 |
| AC-003, AC-010 | unit | `tests/compare-view.test.js` VRAM と価格セルの整形 |
| AC-004 | unit | `tests/gpu-specs.test.js` スペック列と「—」、`tests/gpu-data.test.js` データシートとの一致 |
| AC-005 | unit | `tests/table-engine.test.js` 帯と繰り返しの省略 |
| AC-006〜AC-009, AC-012 | unit | `tests/compare-view.test.js` フィルタ、状態の保存、リージョン絞り込み |
| AC-011 | unit | `tests/update-od-pricing.test.js` / `tests/update-cb-pricing.test.js` の `tokyo` 判定 |

## Notes

- `instances.json` の `vramPerGpu` は 1 GPU あたりのまま持ち、表示のときに GPU 数を掛ける
- `addedAt` は今の UI では使っていない（NEW バッジは 2026-09 のリニューアルでやめた）
