---
spec_id: REF-001
title: GPUインスタンス比較テーブル
context: Reference Table
status: draft
created: 2026-02-11
---

# REF-001: GPUインスタンス比較テーブル

## ユーザーストーリー

**誰が**: AWS SA / Sales / GPUを検討中のお客様
**何を**: 全世代のAWS NVIDIA GPUインスタンスのスペック・価格・リージョン情報を1つのテーブルで一覧比較したい
**なぜ**: 散在する情報を横断的に確認する手間を省き、迅速にインスタンスを比較検討するため

## 受け入れ条件

### AC-1: テーブル表示

```
Given: ユーザーがサイトにアクセスする
When: ページが読み込まれる
Then: 全世代（Blackwell〜Volta）のGPUインスタンスが1つのテーブルに表示される
```

### AC-2: 表示カラム

```
Given: テーブルが表示されている
When: ユーザーがテーブルを閲覧する
Then: 以下のカラムが表示される
  - 世代（GPU Architecture）
  - GPUモデル
  - EC2タイプ（公式ページへのリンク付き）
  - インスタンスサイズ
  - GPU数
  - VRAM（1GPU当たり + 合計）
  - FP16性能（1GPU当たり + 合計、TFLOPS）
  - FP8性能（1GPU当たり + 合計、TFLOPS）
  - EFAバージョン
  - PCIe世代
  - vCPU
  - メモリ
  - NVMe
  - On-Demand価格（/hr）
  - GPU単価（/GPU/hr）
  - Capacity Blocks価格（/GPU/hr）
  - 東京リージョン利用可否
```

### AC-3: 世代別グルーピング

```
Given: テーブルが表示されている
When: ユーザーがテーブルを閲覧する
Then: インスタンスがGPU世代ごとにグループ化され、世代セルがrowspanで結合されている
And: 各世代が視覚的に区別できる（色分け）
```

### AC-4: 東京リージョン表示

```
Given: テーブルが表示されている
When: ユーザーが東京リージョン列を確認する
Then: 利用可能なインスタンスは「◯」（緑系）、不可は「✕」（赤系）で表示される
```

### AC-5: 価格表示

```
Given: テーブルが表示されている
When: ユーザーが価格列を確認する
Then: On-Demand価格が存在するインスタンスは価格が表示される
And: CB専用インスタンスは「CB専用」と表示される
And: Capacity Blocks価格が表示される
```

### AC-6: NEWバッジ

```
Given: 新しくリリースされたGPUモデルがある
When: テーブルが表示される
Then: 該当GPUモデルに「NEW」バッジが表示される
```

## UI記述

- テーブルは横スクロール可能なコンテナ内に配置
- ヘッダーは固定（スクロール時も表示）
- 行ホバー時にハイライト表示（rowspanセルも連動）
- レスポンシブ対応（モバイルでは横スクロール）

## コンテキスト境界

- **Inputs**: GPU_DATA配列（インスタンスデータ）、EC2_LINKS（公式ページURL）
- **Outputs**: HTMLテーブル（DOM）
- **Dependencies**: なし（外部API呼び出しなし、静的データ）
