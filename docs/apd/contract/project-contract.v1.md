---
title: AWS EC2 GPU Quick Reference — Project Contract v1
status: draft
created: 2026-02-11
specs:
  - REF-001
  - CAL-001
  - I18N-001
  - UI-001
decisions:
  - D-001
---

# Project Contract v1

## 1. 技術アーキテクチャ

### 技術スタック

| 技術 | 用途 | 理由 |
|---|---|---|
| Vite | ビルドツール | 高速、設定が軽量、静的サイト生成に最適 |
| vite-plugin-singlefile | HTML結合 | ビルド時にCSS/JSを全てインラインで1つのHTMLに結合 |
| Vanilla JS | アプリケーションロジック | フレームワーク不要。既存コードとの連続性を維持 |
| CSS Variables | テーマ管理 | ライト/ダークモード切替をCSS変数で実現 |

### ディレクトリ構成

```
aws-gpu-quick-reference/
├── src/
│   ├── index.html          # HTMLテンプレート
│   ├── styles/
│   │   ├── base.css        # リセット、タイポグラフィ、CSS変数
│   │   ├── table.css       # テーブルスタイル（世代色分け、ホバー等）
│   │   ├── calculator.css  # コスト計算ツールのスタイル
│   │   ├── header.css      # ヘッダー（言語/テーマ切替含む）
│   │   └── light-theme.css # ライトモード用オーバーライド
│   ├── scripts/
│   │   ├── main.js         # エントリーポイント（初期化・イベント登録）
│   │   ├── gpu-data.js     # GPU_DATA配列 + EC2_LINKS
│   │   ├── table.js        # テーブル描画ロジック（renderTable, setupHover）
│   │   ├── calculator.js   # コスト計算ロジック
│   │   ├── i18n.js         # 多言語切替ロジック
│   │   └── theme.js        # ライト/ダークモード切替ロジック
│   └── i18n/
│       ├── ja.js           # 日本語翻訳辞書
│       └── en.js           # 英語翻訳辞書
├── data/
│   └── aws-ec2-nvidia-gpu-specs.json  # （既存）GPUスペック参照用
├── docs/                   # APDドキュメント（既存）
├── dist/                   # ビルド出力
│   └── index.html          # 結合済み単一HTML（GitHub Pagesデプロイ対象）
├── vite.config.js          # Vite設定
├── package.json            # 依存管理
└── index.html              # （旧）移行完了後に削除
```

### ビルド & デプロイ

- `npm run dev` — Vite開発サーバー（HMR対応）
- `npm run build` — `dist/index.html` に単一HTMLを出力
- デプロイ: GitHub Actionsワークフローで `npm run build` → `dist/` をGitHub Pagesにデプロイ（自動化により人的ミス防止）

### CLAUDE.md更新計画

D-001（ビルドツール導入）に基づき、T-1（ビルド環境セットアップ）完了・動作確認後にCLAUDE.mdを更新する:
- 「ビルドツール不要」→ Vite + vite-plugin-singlefile ベースの記述に変更
- 開発コマンド（`npm run dev`, `npm run build`）を追記
- デプロイフロー（GitHub Actions経由）を追記

## 2. コンテキスト間境界（インターフェース定義）

### 共有データ: GPU_DATA

```typescript
// gpu-data.js がエクスポートする型（JSDocで記述）

/** @typedef {Object} GpuInstance
 * @property {string} gen - GPU世代キー（"blackwell" | "hopper" | "ada" | "ampere" | "turing" | "volta"）
 * @property {number} [genRows] - 世代のrowspan数（世代の最初の行のみ）
 * @property {string} gpu - GPUモデル名（"B300", "H100"等）
 * @property {boolean} [gpuNew] - NEWバッジ表示フラグ
 * @property {number} [gpuRows] - GPUモデルのrowspan数
 * @property {string} ec2 - EC2タイプ名（"P6-B300"等）
 * @property {number} [ec2Rows] - EC2タイプのrowspan数
 * @property {string} size - インスタンスサイズ（"p6-b300.48xlarge"等）
 * @property {number|string} count - GPU数（数値 or "1/8"等の分数文字列）
 * @property {number} vramPerGpu - 1GPU当たりVRAM (GB)
 * @property {number} fp16PerGpu - 1GPU当たりFP16性能 (TFLOPS)
 * @property {number} fp8PerGpu - 1GPU当たりFP8性能 (TFLOPS)
 * @property {string} efa - EFAバージョン
 * @property {string} pcie - PCIe世代
 * @property {number} vcpu - vCPU数
 * @property {string} mem - メモリ
 * @property {string} nvme - NVMeストレージ
 * @property {string|null} price - On-Demand時間単価（"$XX.XX" or null）
 * @property {string|null} priceGpu - GPU単価（"$XX.XX" or null）
 * @property {string} priceCb - CB GPU時間単価（"$XX.XX"）
 * @property {boolean} tokyo - 東京リージョン利用可否
 * @property {boolean} [est] - 推定値フラグ
 */

export const GPU_DATA = [/* ... */];
export const EC2_LINKS = {/* ... */};
```

### I18Nインターフェース: 翻訳辞書

```javascript
// i18n/ja.js, i18n/en.js が同じ構造でエクスポート

/** @typedef {Object} Translations
 * @property {Object} header - ヘッダー文言
 * @property {string} header.title - ページタイトル
 * @property {string} header.subtitle - サブタイトル
 * @property {Object} table - テーブル文言
 * @property {string} table.generation - 「世代」
 * @property {string} table.gpuModel - 「GPU」
 * @property {string} table.ec2Type - 「EC2」
 * @property {string} table.instanceSize - 「サイズ」
 * @property {string} table.gpuCount - 「GPU数」
 * @property {string} table.vram - 「VRAM」
 * @property {string} table.fp16 - 「FP16」
 * @property {string} table.fp8 - 「FP8」
 * @property {string} table.efa - 「EFA」
 * @property {string} table.pcie - 「PCIe」
 * @property {string} table.vcpu - 「vCPU」
 * @property {string} table.memory - 「メモリ」
 * @property {string} table.nvme - 「NVMe」
 * @property {string} table.onDemand - 「On-Demand」
 * @property {string} table.perGpu - 「GPU単価」
 * @property {string} table.cb - 「CB」
 * @property {string} table.tokyo - 「東京」
 * @property {string} table.cbOnly - 「CB専用」
 * @property {Object} generations - 世代ラベル
 * @property {Object} calculator - コスト計算ツール文言
 * @property {string} calculator.title - セクションタイトル
 * @property {string} calculator.instanceLabel - 「インスタンスタイプ」
 * @property {string} calculator.countLabel - 「台数」
 * @property {string} calculator.onDemandMonthly - 「On-Demand 月額」
 * @property {string} calculator.cbMonthly - 「CB 月額」
 * @property {string} calculator.cbOnly - 「CB専用」
 * @property {string} calculator.disclaimer - 注記テキスト
 * @property {Object} footer - フッター文言
 */
```

### テーマインターフェース

```javascript
// theme.js

/**
 * テーマ管理
 * - getTheme(): "dark" | "light" を返す
 * - setTheme(theme): テーマを切り替え、<html>にdata-theme属性を設定
 * - initTheme(): prefers-color-scheme + localStorage から初期テーマを決定
 */
```

CSS側: `[data-theme="light"]` セレクタでCSS変数をオーバーライド

### クロスコンテキストシナリオの技術実現

| シナリオ | 技術実現 |
|---|---|
| S-1: 言語切替時の再描画 | `i18n.setLang()` がカスタムイベント `lang-changed` を発火 → `table.js` と `calculator.js` がリスナーでUI文言を更新 |
| S-2: コスト計算のインスタンス参照 | `calculator.js` が `gpu-data.js` の `GPU_DATA` を直接importして価格を参照 |
| S-3: 新インスタンス追加 | `gpu-data.js` の `GPU_DATA` 配列にエントリ追加のみ。`table.js` と `calculator.js` が自動反映 |

## 3. 実装タスク分解

### T-1: ビルド環境セットアップ

- **コンテキスト**: インフラ
- **入力**: 既存 `index.html`
- **出力**: Viteプロジェクト構成、`package.json`、`vite.config.js`
- **参照Spec**: D-001
- **完了条件**:
  - `npm run dev` で開発サーバーが起動する
  - `npm run build` で `dist/index.html` に単一HTMLが出力される
  - 既存の見た目・機能が維持されている（リグレッションなし）

### T-2: ファイル分割（既存コードのリファクタリング）

- **コンテキスト**: REF（Reference Table）
- **入力**: T-1の出力（Viteプロジェクト）
- **出力**: `src/` 配下に分割されたCSS/JS/HTMLファイル
- **参照Spec**: REF-001
- **完了条件**:
  - 既存の `index.html` が `src/` 配下のファイルに分割されている
  - `npm run build` の出力が既存の `index.html` と同等の見た目・機能を持つ
  - `gpu-data.js` が独立モジュールとしてエクスポートされている

### T-3: 多言語対応（I18N）

- **コンテキスト**: I18N（Internationalization）
- **入力**: T-2の出力（分割済みコード）
- **出力**: `src/i18n/` 翻訳辞書、`src/scripts/i18n.js`、言語切替UI
- **参照Spec**: I18N-001（AC-1〜AC-5）
- **完了条件**:
  - 言語切替UI（日本語/English）がヘッダー右上に表示される
  - 切替で全UI文言が即座に切り替わる
  - `navigator.language` による自動判定が動作する
  - localStorage で言語設定が永続化される
  - データ値（インスタンス名、数値）は言語切替の影響を受けない

### T-4: 簡易コスト計算ツール

- **コンテキスト**: CAL（Cost Calculator）
- **入力**: T-2の出力（`gpu-data.js`）
- **出力**: `src/scripts/calculator.js`、`src/styles/calculator.css`、計算ツールUI
- **参照Spec**: CAL-001（AC-1〜AC-5）
- **完了条件**:
  - テーブル下部にコスト計算セクションが表示される
  - インスタンスタイプ選択 + 台数入力で月額（720h×単価×台数）がリアルタイム計算される
  - On-DemandとCBの月額が並べて表示される
  - CB専用インスタンスは On-Demand欄に「CB専用」表示
  - 注記が表示される

### T-5: ライト/ダークモード切替

- **コンテキスト**: UI（Visual Design）
- **入力**: T-2の出力（分割済みCSS）
- **出力**: `src/styles/light-theme.css`、`src/scripts/theme.js`、テーマ切替UI
- **参照Spec**: UI-001（AC-5）
- **完了条件**:
  - `prefers-color-scheme` に応じたテーマ自動選択が動作する
  - ヘッダーのトグルで手動切替が可能
  - ダークモード: 既存のSquid Inkベースを維持
  - ライトモード: 白系背景で全テーブル・計算ツールが視認可能
  - 世代別色分けが両テーマで適切に表示される

### T-6: ビジュアルデザイン洗練

- **コンテキスト**: UI（Visual Design）
- **入力**: T-2〜T-5の出力
- **出力**: CSS調整、レイアウト改善
- **参照Spec**: UI-001（AC-1〜AC-4）
- **完了条件**:
  - AWSブランドカラーとの親和性が維持されている
  - タイポグラフィ（等幅数値、サイズ階層）が適切
  - レスポンシブ対応（PC/タブレット/モバイル）
  - テーブルの行ホバーが滑らか
  - 言語切替・テーマ切替トグルがヘッダーに統一配置

### T-7: 結合テスト & GitHub Pagesデプロイ設定

- **コンテキスト**: インフラ
- **入力**: T-1〜T-6の出力
- **出力**: デプロイ設定、最終動作確認
- **参照Spec**: 全Spec
- **完了条件**:
  - `npm run build` で単一HTMLが正常出力される
  - GitHub Pagesへのデプロイが動作する
  - 全Specの受け入れ条件が満たされている

## 4. テスト戦略

### テスト方針

静的サイトのため、E2Eテストをメインとし、ロジックのあるモジュールに対して単体テストを実施する。

### Spec受け入れ条件 ↔ テスト対応表

| Spec | AC | テスト種別 | テスト内容 |
|---|---|---|---|
| REF-001 | AC-1 | 手動確認 | 全世代のインスタンスがテーブルに表示される |
| REF-001 | AC-2 | 手動確認 | 全17カラムが表示される |
| REF-001 | AC-3 | 手動確認 | 世代別rowspanグルーピング + 色分け |
| REF-001 | AC-4 | 手動確認 | 東京リージョン ◯/✕ 表示 |
| REF-001 | AC-5 | 手動確認 | On-Demand価格 / CB専用 / CB価格の表示 |
| REF-001 | AC-6 | 手動確認 | NEWバッジ表示 |
| CAL-001 | AC-1 | 手動確認 | 計算ツールセクションの表示 |
| CAL-001 | AC-2 | 手動確認 | インスタンス選択 + 台数入力のUI |
| CAL-001 | AC-3 | 単体テスト | `calculateMonthlyCost(price, count)` の計算結果が正しい |
| CAL-001 | AC-4 | 単体テスト | CB専用インスタンスの判定ロジック |
| CAL-001 | AC-5 | 手動確認 | 注記テキストの表示 |
| I18N-001 | AC-1 | 手動確認 | 言語切替UIの表示 |
| I18N-001 | AC-2 | 単体テスト | `detectLanguage()` の自動判定ロジック |
| I18N-001 | AC-3 | 手動確認 | 言語切替で全UI文言が切り替わる |
| I18N-001 | AC-4 | 手動確認 | 翻訳対象/非対象の正確性 |
| I18N-001 | AC-5 | 単体テスト | localStorage の読み書きロジック |
| UI-001 | AC-1 | 手動確認 | AWSカラーベースのデザイン |
| UI-001 | AC-2 | 手動確認 | テーブル視認性・ホバー |
| UI-001 | AC-3 | 手動確認 | タイポグラフィ |
| UI-001 | AC-4 | 手動確認 | レスポンシブ（PC/タブレット/モバイル） |
| UI-001 | AC-5 | 手動確認 | ライト/ダーク切替動作 |

### 単体テスト

- テストランナー: Vitest（Viteネイティブ、設定不要）
- 対象:
  - `calculator.js`: 月額計算ロジック、CB専用判定
  - `i18n.js`: 言語自動判定、localStorage読み書き
  - `gpu-data.js`: データ整合性（全エントリに必須フィールドが存在するか）

### 手動確認チェックリスト

- ビルド完了後に `dist/index.html` をブラウザで開き、上記テーブルの「手動確認」項目を一通り確認する
- PC + モバイル（またはDevToolsのレスポンシブモード）で確認

## 5. 並列実行計画

### 依存関係グラフ

```
T-1 (ビルド環境セットアップ)
 └─→ T-2 (ファイル分割)
      ├─→ T-3 (I18N)        ─┐
      ├─→ T-4 (コスト計算)    ├─→ T-6 (デザイン洗練) ─→ T-7 (結合 & デプロイ)
      └─→ T-5 (ライト/ダーク) ─┘
```

### 並列化

- **T-3, T-4, T-5** は T-2 完了後に並列実行可能
  - 各タスクは独立したファイルを生成し、相互依存しない
  - I18N (T-3) の翻訳キーはContract 2節で事前定義済み（`Translations` 型定義参照）。T-4/T-5は翻訳キーに依存せずUI要素を `data-i18n` 属性でマーク、T-3がまとめて翻訳適用する
- **T-6** は T-3, T-4, T-5 全ての完了後に実行（全UIコンポーネントが揃った状態でデザイン調整）
- **T-7** は T-6 完了後に実行

### マージ戦略

- マージ順序: T-3 → T-4 → T-5 の順で `feature/apd-v1` にマージ
- コンフリクト発生時: `src/index.html`（HTML構造追加）と `src/scripts/main.js`（import追加）でコンフリクトが予想される。後続マージ時にメンテナーが統合
- 待ち合わせ: T-3, T-4, T-5 全てのマージ完了後に T-6 のブランチを作成

### git ブランチ戦略

```
main
 └─→ feature/apd-v1             # ベースブランチ
      ├─→ feature/apd-v1/t1-build-setup
      ├─→ feature/apd-v1/t2-file-split
      ├─→ feature/apd-v1/t3-i18n          # T-2完了後に分岐
      ├─→ feature/apd-v1/t4-calculator     # T-2完了後に分岐
      ├─→ feature/apd-v1/t5-theme          # T-2完了後に分岐
      ├─→ feature/apd-v1/t6-design-polish  # T-3,4,5マージ後に分岐
      └─→ feature/apd-v1/t7-integration    # T-6マージ後に分岐
```

T-3, T-4, T-5 の並列実行時は git worktree を使用:
```bash
git worktree add ../gpu-ref-t3 feature/apd-v1/t3-i18n
git worktree add ../gpu-ref-t4 feature/apd-v1/t4-calculator
git worktree add ../gpu-ref-t5 feature/apd-v1/t5-theme
```

## 6. 成果物プレビュー

### 宣言するプレビュー

| プレビュー | 種別 | 配置先 |
|---|---|---|
| コスト計算ツールのHTML構造 | HTMLモック | `docs/apd/contract/previews/C-001/calculator-mock.html` |
| 翻訳辞書の構造サンプル | JSONサンプル | `docs/apd/contract/previews/C-001/i18n-sample.js` |
