---
spec_id: "GPU-001"
context: "GPU"
version: 1
issue_ref: null
title: "GPU スペックと機能マトリクス（GPU タブ）"
decision_refs: []
---

## User Story

**As a** AWS SA / GPU を検討中のお客様
**I want** GPU 単体の演算性能・メモリ・消費電力と、機能への対応を GPU ごとに比べたい
**So that** インスタンスを選ぶ前に、ワークロードに合う GPU を見極められる

## Acceptance Criteria

### AC-001 GPU スペック表
- **Given**: `data/gpu-specs.json` がある
- **When**: GPU タブ（`#features`）を開く
- **Then**: 上段に、行 = GPU（`gpuKey` ごとに 1 行、世代の新しい順）、列 = データシートの数値の表が出る
- **And**: 列は Compute（FP64 / FP64 TC / FP32 / TF32 / BF16 / FP16 / FP8 / FP6 / FP4 / INT8。Tensor Core の値は Dense と Sparse）、Memory（容量 GB、帯域 GB/s）、Power（TDP W）の 3 グループで、グループ単位に表示を切り替えられる
- **And**: 単位は TFLOPS（INT8 のみ TOPS）で、その旨の注記が表の下に出る

### AC-002 データシートに無い値
- **Given**: ある GPU のデータシートに載っていない項目がある
- **When**: スペック表を見る
- **Then**: そのセルは「—」になる（0 や推定値で埋めない）

### AC-003 機能マトリクス
- **Given**: `data/gpu-features.json` がある
- **When**: GPU タブを開く
- **Then**: 下段に、行 = GPU、列 = 機能（FP8、FP4、NVLink、MIG、Transformer Engine、Confidential Compute、NVENC、RT コア、ECC）の表が出る
- **And**: セルは対応 = ✓、非対応 = 空欄、部分対応 = △ と注釈番号。注釈は表の下に番号順で並ぶ

### AC-004 GPU 名のリンク
- **Given**: どちらかの表が出ている
- **When**: 先頭列を見る
- **Then**: GPU 名は NVIDIA のデータシート / 製品ページへのリンクになる（リンクが無ければ文字だけ）

### AC-005 インスタンスがまだ無い GPU
- **Given**: AWS が採用を発表済みで、インスタンス型名と価格が未公開の GPU が `gpu-specs.json` の `extraGpus` にある
- **When**: GPU タブを開く
- **Then**: その GPU が指定の位置に行として出て、「発表済み」の印が付く
- **And**: 同じ `gpuKey` が `instances.json` に現れたら、通常の行として扱われる

### AC-006 (Error Case) データが無い
- **Given**: `gpu-specs.json` または `gpu-features.json` が無い状態でビルドした
- **When**: GPU タブを開く
- **Then**: 無い方の表の代わりに「データはまだ生成されていません」と出る。もう一方の表とほかのタブは動く

### AC-007 データの整合
- **Given**: `instances.json` に `gpuKey` がある
- **When**: テストを実行する
- **Then**: すべての `gpuKey` が `gpu-specs.json` と `gpu-features.json` にあり、`source` / `sources` が URL で、数値は正数か `null`、未定義の機能キーが無いことが検証される

## UI Description

- タブの名前は「GPU」。上段が GPU スペック、下段が機能マトリクス
- 上段の「列」メニューで Compute / Memory / Power を切り替える。1 段目のヘッダにグループ名が出る
- 先頭列は世代色のチップ（比較表と同じ見た目）

## Context Boundary

### Inputs
- **From**: `data/gpu-specs.json` — GPU ごとの数値、`source`、`notes`、`extraGpus`（手書き）
- **From**: `data/gpu-features.json` — 機能の列定義と GPU ごとの対応（手書き）
- **From**: `data/instances.json` — 行の並び（`gpuKey` の登場順）と GPU 名

### Outputs
- **To**: REF-001 — 比較表の FP32 / TF32 / BF16 / INT8 列

### Dependencies
- **UI-001**: 表エンジン
- **I18N-001**: 機能名と説明（`features.<キー>.label` / `.desc`）

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001, AC-002, AC-005, AC-006 | unit | `tests/gpu-specs.test.js` |
| AC-003, AC-004, AC-006 | unit | `tests/features-view.test.js` |
| AC-007 | unit | `tests/gpu-specs.test.js`、`tests/gpu-data.test.js` |

## Notes

- 値は NVIDIA 公式データシート / 製品ページの記載だけを入れる。編集の決まりは CLAUDE.md の「GPU スペック」「GPU 機能マトリクス」にある
- `data/aws-ec2-nvidia-gpu-specs.json` は `instances.json` の演算性能を検証する別のファイルで、表示には使わない
