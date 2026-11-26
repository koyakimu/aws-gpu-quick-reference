---
spec_id: "CAL-001"
context: "Cost Calculator"
version: 2
issue_ref: null
title: "簡易コスト計算ツール"
decision_refs: []
---

## User Story

**As a** AWS SA / Sales / GPU を検討中のお客様
**I want** インスタンスと台数・日数を入れて、概算コストをその場で出したい
**So that** 商談や選定の最中に、ざっくりしたコスト感をすぐにつかめる

## Acceptance Criteria

### AC-001 置き場所
- **Given**: Compare タブを開く
- **When**: 「計算」を押す
- **Then**: 表の上に畳んであった計算ツールが開く
- **And**: `#calculator` で開いたときは、Compare タブが出て計算ツールが開いた状態になる

### AC-002 入力
- **Given**: 計算ツールが開いている
- **When**: 入力欄を見る
- **Then**: インスタンス（「サイズ (GPU x数)」の形）、台数（既定 1）、日数（既定 30）、On-Demand 単価、CB 単価（どちらも $/GPU/h）を入力できる
- **And**: On-Demand と Capacity Blocks の両方の価格が無いインスタンスは選択肢に出ない

### AC-003 計算
- **Given**: インスタンスと台数・日数を入れている
- **When**: いずれかの入力を変える
- **Then**: ボタンを押さなくても、次の 4 つが USD で出る
  - On-Demand 月額 = 単価 × 720 時間 × GPU 数 × 台数
  - On-Demand 日数指定 = 単価 × 24 時間 × 日数 × GPU 数 × 台数
  - CB 月額、CB 日数指定（同じ式で CB 単価を使う）
- **And**: 月額は 720 時間 / 月で計算している旨の注記が出る

### AC-004 単価の既定値と上書き
- **Given**: インスタンスを選んだ
- **When**: 単価の欄を見る
- **Then**: ヘッダで選んだ価格リージョン（PRC-001）の $/GPU と CB 単価が既定値として入る
- **And**: 単価を書き換えると、結果に既定値での金額と差額が併記される。リセットで既定値に戻る
- **And**: 価格リージョンを変えると、既定値が引き直される

### AC-005 片方の価格が無いインスタンス
- **Given**: Capacity Blocks 専用のインスタンス（On-Demand 価格なし）を選んだ
- **When**: 結果を見る
- **Then**: On-Demand 側は「CB専用」になり、Capacity Blocks 側だけが計算される
- **And**: Capacity Blocks 価格が無いインスタンスでは、CB 側が「-」になる

### AC-006 現地通貨
- **Given**: 表示言語が日本語または韓国語
- **When**: 結果を見る
- **Then**: USD の隣に JPY / KRW の列が出る。為替レートを入力でき、既定は 150（JPY）/ 1400（KRW）
- **And**: 英語では現地通貨の列と為替レートの欄は出ない

### AC-007 注記
- **Given**: 計算ツールが開いている
- **When**: 下部を見る
- **Then**: 概算値であること、RI / Savings Plans 等の割引を含まないこと、正確な料金は AWS 公式を確認することが出る

## UI Description

- `<details>` で畳む。入力を横に並べ、その下に USD と現地通貨の 2 列で結果を出す
- 単価の欄の下に既定値を小さく出し、上書き中はリセットボタンを出す

## Context Boundary

### Inputs
- **From**: `data/instances.json` — 選択肢、GPU 数
- **From**: PRC-001 — 単価の既定値（選択中のリージョン）
- **From**: I18N-001 — 表示言語（現地通貨の有無）

### Outputs
- なし（画面表示だけ）

### Dependencies
- **PRC-001**、**I18N-001**

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-002〜AC-006 | unit | `tests/calculator.test.js` |
| AC-001 | unit | `tests/tabs.test.js`（`#calculator` の扱い）、`tests/main-boot.test.js` |
| AC-007 | unit | `tests/i18n-keys.test.js`（文言が 3 言語にあること） |

## Notes

- 為替レートは固定の既定値で、自動取得はしない
