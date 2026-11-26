---
project_name: "AWS EC2 GPU Quick Reference"
version: 2
---

# AWS EC2 GPU Quick Reference

NVIDIA GPU を載せた AWS EC2 インスタンスを、スペック・価格・提供リージョンで横断比較する静的サイト。
https://koyakimu.github.io/aws-gpu-quick-reference/

## Who: 誰のため

- **AWS Solutions Architect (SA)**: GPU インスタンスの提案時に、スペック・価格・リージョン情報を素早く参照したい
- **AWS Sales**: 商談中に GPU インスタンスの概要をその場で見せ、議論に使いたい
- **AWS で GPU を使いたいお客様**: ML/AI ワークロードに合うインスタンスを、スペックと価格の両面から自分で比べたい

**共通の課題**: GPU インスタンスの情報が AWS 公式ドキュメント、料金ページ、NVIDIA のデータシート、ブログ記事に散らばっていて、横断比較に時間がかかる。

## Why: なぜ必要か

- AI/ML の需要で GPU インスタンスの世代とバリエーションが増え続け（Volta〜Blackwell）、全体像をつかみにくい
- 既存の手段の限界
  - **AWS 公式ドキュメント**: インスタンスタイプごとにページが分かれ、GPU 世代をまたいだ比較ができない
  - **AWS 料金ページ**: スペックと価格が別ページで、突き合わせが手間
  - **instances.vantage.sh**: 全 EC2 が対象で、精度別の演算性能・EFA バージョン・Capacity Blocks 価格が足りない
  - **ブログ記事**: 執筆時点の情報で古くなる

## What: 何ができるか

| 機能 | Spec |
|---|---|
| 全世代のインスタンスを 1 つの表で比較する（Compare タブ） | [REF-001](spec-gpu-comparison-table.md) |
| インスタンスごとの提供リージョンを On-Demand / Capacity Blocks 別に見る（Regions タブ） | [REG-001](spec-region-availability.md) |
| GPU 単体のデータシート値と機能対応を見る（GPU タブ） | [GPU-001](spec-gpu-specs-features.md) |
| 価格を見るリージョンを切り替える。価格は自動で更新され、最終確認日が出る | [PRC-001](spec-pricing.md) |
| 台数・日数から概算コストを出す（計算ツール） | [CAL-001](spec-cost-calculator.md) |
| 日本語・英語・韓国語で見る | [I18N-001](spec-i18n.md) |
| タブ・テーマ・表の共通操作・レスポンシブ | [UI-001](spec-visual-design.md) |

## What Not: 何をやらないか

1. **NVIDIA 以外のアクセラレータ**（Trainium / Inferentia / AMD GPU）は載せない。スペック体系が違うため
2. **AZ 単位の提供有無**は扱わない（リージョン粒度まで。Local Zone のみの Capacity Blocks は親リージョンに寄せる）
3. **リアルタイムの価格連動**はしない。GitHub Actions の定期実行で更新し、最終確認日を表示する
4. **インスタンスの起動・予約**はしない（情報参照だけ）
5. **ベンチマーク結果**は載せない。演算性能は NVIDIA 公式データシートの値だけ
6. **RI / Savings Plans / Spot** の価格は扱わない（On-Demand と Capacity Blocks のみ）
7. **ログイン・サーバーサイド処理**は持たない。単一 HTML の静的サイトのまま保つ
8. **ユースケース別の選び方ガイド**（文章）は書かない

## FAQ

1. **なぜ静的な単一 HTML なのか**
   GitHub Pages で無料配信でき、バックエンドが無いので運用も攻撃面も小さい。ページを保存すればオフラインでも使える。開発時はファイルを分け、ビルドで 1 ファイルにまとめる（[D-001](decisions.md#d-001)）。

2. **データはどう更新されるか**
   On-Demand 価格は週次、Capacity Blocks 価格は日次、リージョン別の提供有無と価格は週次で GitHub Actions が取得し、差分を main にコミットしてデプロイする。GPU スペックと機能マトリクスは NVIDIA のデータシートから手で入れる。

3. **価格は正確か**
   AWS Price List と Capacity Blocks の価格データが情報源で、最後に突き合わせた日を表示する。最終確認は AWS 公式を見てもらう。

4. **演算性能の値はどこから来るか**
   NVIDIA 公式データシート / 製品ページの記載だけ。載っていない項目は「—」にし、推定では埋めない。丸めた公称値から求めた概算には * を付ける。

5. **新しいインスタンスはどう足すか**
   `data/instances.json` に 1 行足す。GPU が新しければ先に `data/gpu-specs.json` と `data/gpu-features.json` に足す。手順は CLAUDE.md にある。

6. **モバイルで使えるか**
   使える。表は先頭列を固定した横スクロールになる。列が多いので PC / タブレットを勧める。

## Success Criteria

- AWS SA / Sales が商談中のリファレンスとして使っている
- インスタンス選定が速くなったという声がお客様から出る
- 掲載価格と AWS 公式の差が、自動更新の周期（最長 1 週間）を超えて残らない
