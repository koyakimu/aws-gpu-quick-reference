# AWS EC2 GPU インスタンス リファレンスガイド

NVIDIA GPU を載せた AWS EC2 インスタンスを、スペック・価格・提供リージョンで横断比較する静的サイトです。

**URL**: https://koyakimu.github.io/aws-gpu-quick-reference/

## できること

- **比較**: Blackwell から Volta まで全世代のインスタンスを 1 つの表で比較。演算性能（FP32 / TF32 / BF16 / FP16 / FP8 / FP4 / INT8）、VRAM、EFA、PCIe、vCPU、メモリ、NVMe、On-Demand と Capacity Blocks の価格
- **リージョン**: インスタンスごとの提供リージョンを On-Demand / Capacity Blocks 別に表示
- **GPU**: GPU 単体のデータシート値と、機能（FP8、FP4、NVLink、MIG など）への対応
- **価格リージョンの切替**: ヘッダで選んだリージョンの価格で比較
- **計算ツール**: 台数と日数から概算コストを算出（USD と JPY / KRW）
- 日本語 / English / 한국어、ライト / ダークテーマ

## データの更新

データは `data/` の JSON が正です。

| データ | ファイル | 更新 |
|---|---|---|
| インスタンスと On-Demand 価格 | `data/instances.json` | 週次（GitHub Actions、`scripts/update-od-pricing.mjs`） |
| Capacity Blocks 価格 | `data/instances.json` の `priceCb` | 日次（`scripts/update-cb-pricing.mjs`） |
| リージョン別の提供有無と価格 | `data/regions.json` | 週次（`scripts/update-regions.mjs`。生成物のため手で編集しない） |
| GPU スペック、機能マトリクス | `data/gpu-specs.json`、`data/gpu-features.json` | 手作業（NVIDIA 公式データシートの値だけを入れる） |

インスタンスや GPU の追加手順とフィールドの意味は [CLAUDE.md](CLAUDE.md)、機能の仕様は [docs/apd/](docs/apd/) にあります。

## ローカル開発

Vite + vite-plugin-singlefile で、単一の HTML にビルドします。

```bash
git clone https://github.com/koyakimu/aws-gpu-quick-reference.git
cd aws-gpu-quick-reference
npm install

npm run dev      # 開発サーバー（HMR）
npm test         # 単体テスト（Vitest）
npm run build    # dist/index.html に単一 HTML を出力
```

main ブランチへの push で GitHub Pages にデプロイされます。

## 公式リファレンス

- [EC2 Accelerated Computing インスタンス一覧](https://aws.amazon.com/ec2/instance-types/#Accelerated_Computing)
- [EC2 On-Demand 料金](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Capacity Blocks for ML](https://aws.amazon.com/ec2/capacityblocks/)
- [Elastic Fabric Adapter (EFA)](https://aws.amazon.com/hpc/efa/)
- [EC2 ユーザーガイド - アクセラレーテッドコンピューティング](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/accelerated-computing-instances.html)

## 免責事項

本ページの情報は参考用であり、正確性を保証するものではありません。価格・仕様・リージョン対応状況は予告なく変更される場合があります。最新かつ正確な情報については、必ず[AWS公式ドキュメント](https://aws.amazon.com/ec2/instance-types/)をご確認ください。本ページの情報に基づく判断・行動によって生じた損害について、作成者は一切の責任を負いません。

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 作成者

[koyakimu](https://github.com/koyakimu)
