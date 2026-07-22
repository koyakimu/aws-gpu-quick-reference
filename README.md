# AWS EC2 GPU インスタンス リファレンスガイド

AWS EC2 GPUアクセラレーテッドインスタンスの包括的でインタラクティブなリファレンスガイドです。

## 特徴

- 📊 すべてのNVIDIA GPU世代に対応: Blackwell, Hopper, Ada Lovelace, Ampere, Turing, Volta
- 💰 On-Demand価格（us-east-1）とCapacity Blocks価格（東京リージョン優先）を掲載
- 🎨 世代別カラーコーディングで視覚的に識別しやすい
- 🔗 AWS公式ドキュメントへの直接リンク
- ⚡ HPC/MLワークロード計画のためのEFAバージョンとPCIe世代情報

## 使用例

- ML/AIインフラストラクチャの計画
- GPUワークロードのコスト最適化
- インスタンス選択時のスペック比較

## デプロイ

このプロジェクトはGitHub Pagesでホストされています。

**URL**: https://koyakimu.github.io/aws-gpu-quick-reference/

mainブランチへのプッシュで自動的にデプロイされます。

## ローカル開発

Vite + vite-plugin-singlefile でビルドします。ソースは `src/` 配下にモジュール分割されています。

```bash
# リポジトリをクローン
git clone https://github.com/koyakimu/aws-gpu-quick-reference.git
cd aws-gpu-quick-reference

# 依存関係をインストール
npm install

# 開発サーバー起動（HMR対応）
npm run dev

# 単体テスト
npm test

# ビルド（dist/index.html に単一HTMLを出力）
npm run build
```

## データ更新方法

`src/scripts/gpu-data.js` の `GPU_DATA` 配列を編集してください。各エントリはオブジェクト形式です：

```javascript
{
  gen: 'GPU世代',
  gpu: 'GPUモデル名',
  ec2: 'EC2インスタンスタイプ',
  size: 'インスタンスサイズ',
  count: 'GPU搭載数',
  vramPerGpu: 'GPU1基あたりVRAM容量（GB）',
  fp16Dense: 'FP16性能 Dense（TFLOPS）',
  fp8Dense: 'FP8性能 Dense（TFLOPS）',
  efa: 'EFAバージョン',
  pcie: 'PCIe世代',
  vcpu: 'vCPU数',
  mem: 'メモリ容量',
  nvme: 'NVMeストレージ',
  price: 'On-Demand時間単価',
  priceGpu: 'GPU単価',
  priceCb: 'Capacity Blocks価格',
  tokyo: '東京リージョン対応（true/false）'
}
```

GPUスペックの参照元は `data/aws-ec2-nvidia-gpu-specs.json` です。

## 公式リファレンス

- [EC2 Accelerated Computing インスタンス一覧](https://aws.amazon.com/ec2/instance-types/#Accelerated_Computing)
- [EC2 On-Demand 料金](https://aws.amazon.com/ec2/pricing/on-demand/)
- [Capacity Blocks for ML](https://aws.amazon.com/ec2/capacityblocks/)
- [Elastic Fabric Adapter (EFA)](https://aws.amazon.com/hpc/efa/)
- [EC2 ユーザーガイド - アクセラレーテッドコンピューティング](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/accelerated-computing-instances.html)
- [AWS Blog - EC2 カテゴリ（最新情報）](https://aws.amazon.com/blogs/aws/category/compute/amazon-ec2/)

## 免責事項

本ページの情報は参考用であり、正確性を保証するものではありません。価格・仕様・リージョン対応状況は予告なく変更される場合があります。最新かつ正確な情報については、必ず[AWS公式ドキュメント](https://aws.amazon.com/ec2/instance-types/)をご確認ください。本ページの情報に基づく判断・行動によって生じた損害について、作成者は一切の責任を負いません。

## ライセンス

このプロジェクトは[MITライセンス](LICENSE)の下で公開されています。

## 作成者

[koyakimu](https://github.com/koyakimu)
