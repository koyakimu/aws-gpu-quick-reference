---
spec_id: "UI-001"
context: "UI"
version: 2
issue_ref: null
title: "画面構成・テーマ・表の共通動作"
decision_refs:
  - D-001
---

## User Story

**As a** AWS SA / Sales
**I want** 商談の場でそのまま見せられる、情報の密度が高く読みやすい画面がほしい
**So that** 数値を素早く拾え、ツールの見た目が提案の信頼感を損なわない

## Acceptance Criteria

### AC-001 タブ
- **Given**: サイトを開く
- **When**: タブ（比較 / リージョン / GPU）を押す、または `#compare` / `#regions` / `#features` で開く
- **Then**: 対応する画面が出て、URL のハッシュが変わる
- **And**: ハッシュが無い、または知らない値のときは比較タブが出る。`#calculator` は比較タブを出す（CAL-001）

### AC-002 並べ替え
- **Given**: いずれかの表が出ている
- **When**: 列見出しを押す
- **Then**: 押すたびに 降順 → 昇順 → 解除 と切り替わり、解除するとデータの並びに戻る
- **And**: 値の無い行は、向きによらず末尾に並ぶ
- **And**: 列見出しはキーボード（Enter / Space）でも操作できる

### AC-003 固定とスクロール
- **Given**: 表が画面より広い
- **When**: 横にスクロールする
- **Then**: 先頭列と見出し行は固定され、ページ本体は横に伸びない

### AC-004 値の無いセル
- **Given**: 値が `null` / 空のセル
- **When**: 表を見る
- **Then**: 「—」が薄い色で出る

### AC-005 テーマ
- **Given**: テーマを選んだことがない
- **When**: ページが読み込まれる
- **Then**: OS の設定（`prefers-color-scheme`）に従ってライト / ダークが決まり、保存はされない（以後も OS の設定に追従する）
- **And**: 切替ボタンで選ぶと localStorage に保存され、以後はそれが優先される

### AC-006 世代の色分け
- **Given**: 比較表または GPU スペック表が出ている
- **When**: GPU のチップを見る
- **Then**: 世代ごとに色が違う（Blackwell 紫、Hopper 青、Ada 青緑、Ampere 黄緑、Turing / Volta グレー）

### AC-007 文字と数値
- **Given**: 表が出ている
- **When**: セルを見る
- **Then**: インスタンス名と数値は等幅で、数値は右寄せ・桁が揃う（tabular-nums）。整数部は 3 桁区切り
- **And**: 画面の文言に絵文字を使わない

### AC-008 レスポンシブ
- **Given**: 幅 768px 以下の画面
- **When**: サイトを開く
- **Then**: ヘッダが 2 段になり、表は先頭列を固定した横スクロールになる。375px 幅でもヘッダの操作部品がはみ出さない

### AC-009 動きを減らす設定
- **Given**: OS で「視差効果を減らす」（`prefers-reduced-motion: reduce`）が有効
- **When**: 画面を操作する
- **Then**: 遷移のアニメーションが止まる

### AC-010 単一 HTML
- **Given**: `npm run build`
- **When**: ビルドが終わる
- **Then**: CSS・JS・データをすべて含んだ `dist/index.html` が 1 つ出る（実行時の外部依存なし）

## UI Description

- 方向は「密度重視のデータツール」。行高 約 28px、セル余白 6px × 10px、枠線 1px の角丸パネル、影は使わない
- ヘッダ: 左にサイト名と価格リージョン、中央にタブ、右に言語選択とテーマ切替
- 色・余白・文字・角丸は `src/styles/tokens.css` のトークンに置く。ライトテーマは `[data-theme="light"]` でトークンだけを再定義し、コンポーネントの CSS にテーマ分岐を書かない
- ブレークポイントは 768px の 1 つで、`base.css` に集める
- テーマ切替ボタンのラベルは「押すと切り替わる先」の名前

## Context Boundary

### Inputs
- **From**: OS のテーマ設定、localStorage（`gpu-ref-theme-pref`）、URL のハッシュ

### Outputs
- **To**: REF-001 / REG-001 / GPU-001 — 表エンジン `createTable({ columns, rows, state, ... })`（`src/scripts/table-engine.js`）。GPU データを知らない汎用の部品で、フィルタは呼び出し側が行を絞ってから渡す

### Dependencies
- **I18N-001**: タブ名、テーマ切替のラベル

## Test Strategy

### AC Coverage

| AC ID | Test Type | Description |
|-------|-----------|-------------|
| AC-001 | unit | `tests/tabs.test.js` |
| AC-002, AC-004 | unit | `tests/table-engine.test.js` |
| AC-005 | unit | `tests/theme.test.js` |
| AC-007 | unit | `tests/format.test.js`（3 桁区切り）、`tests/i18n-keys.test.js`（絵文字なし） |
| AC-003, AC-006, AC-008, AC-009 | 完成後の実機確認 | ブラウザで PC 幅と 375px 幅、ライト / ダークを見る |
| AC-010 | 完成後の実機確認 | `npm run build` が通り、`dist/index.html` が単体で開ける |

## Notes

- ビルドで 1 ファイルにまとめる方針は [D-001](decisions.md#d-001)
