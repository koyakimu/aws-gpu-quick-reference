---
spec_id: "I18N-001"
context: "Internationalization"
version: 2
issue_ref: null
title: "多言語対応（日本語・英語・韓国語）"
decision_refs: []
---

## User Story

**As a** 日本語・英語・韓国語のいずれかで読みたい利用者
**I want** サイトの文言を自分の言語で読みたい
**So that** 海外のお客様やグローバルのチームとも、同じページを共有できる

## Acceptance Criteria

### AC-001 言語の選択
- **Given**: サイトを開く
- **When**: ヘッダ右の言語選択で 日本語 / English / 한국어 を選ぶ
- **Then**: ページを読み込み直さずに文言が切り替わる（タブ、列見出し、世代名、フィルタ、計算ツール、Notes、凡例、機能名と説明）
- **And**: `<html lang>` も切り替わる

### AC-002 初回の言語
- **Given**: 言語を選んだことがない（localStorage に保存なし）
- **When**: ページが読み込まれる
- **Then**: ブラウザの言語が `ja` で始まれば日本語、`ko` で始まれば韓国語、それ以外は英語になる

### AC-003 保存
- **Given**: 言語を選んだ
- **When**: 同じブラウザで開き直す
- **Then**: 選んだ言語が、ブラウザの言語設定より優先して使われる

### AC-004 訳さないもの
- **Given**: 言語を切り替える
- **When**: 表を見る
- **Then**: インスタンスサイズ、EC2 ファミリ名、GPU 名、リージョンコード、数値、価格は変わらない

### AC-005 言語に合わせた表記
- **Given**: 言語を切り替える
- **When**: 価格の最終確認日と計算ツールを見る
- **Then**: 日付はその言語の表記になる（PRC-001）
- **And**: 計算ツールの現地通貨が言語に合わせて切り替わる（CAL-001）

### AC-006 辞書の整合
- **Given**: `src/i18n/ja.js` / `en.js` / `ko.js`
- **When**: テストを実行する
- **Then**: 3 つの辞書のキー集合が一致すること、文言に絵文字が無いことが検証される

## UI Description

- 言語選択はヘッダ右、テーマ切替の左に置く `<select>`

## Context Boundary

### Inputs
- **From**: `navigator.language`、localStorage（`gpu-ref-lang`）、利用者の選択
- **From**: PRC-001 — 置換子 `%PRICE_REGION%` / `%PRICING_AS_OF%` の値

### Outputs
- **To**: 全コンテキスト — `t(key)` と `lang-changed` イベント

### Dependencies
- なし

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001〜AC-005 | unit | `tests/i18n.test.js` |
| AC-006 | unit | `tests/i18n-keys.test.js` |

## Notes

- 言語を足すときは、辞書を 1 つ足し、`i18n.js` の `dictionaries` と言語判定、`index.html` の選択肢、必要なら計算ツールの通貨設定を足す
