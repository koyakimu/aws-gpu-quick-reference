# AWS EC2 GPU インスタンス リファレンスガイド

AWS EC2 GPUアクセラレーテッドインスタンスの包括的でインタラクティブなリファレンスガイドです。

## 特徴

- 📊 すべてのNVIDIA GPU世代に対応: Blackwell, Hopper, Ada Lovelace, Ampere, Turing, Volta
- 💰 東京リージョンのOn-Demand価格とCapacity Blocks価格（2025年6月の値下げを反映）
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

ビルドツールは不要です。すべてのコード（HTML、CSS、JavaScript、データ）は `index.html` に含まれています。

```bash
# リポジトリをクローン
git clone https://github.com/koyakimu/aws-gpu-quick-reference.git

# ローカルでindex.htmlを開く
cd aws-gpu-quick-reference
open index.html  # macOS
# または
xdg-open index.html  # Linux
# または
start index.html  # Windows
```

または、簡単なHTTPサーバーを起動：

```bash
# Python 3の場合
python3 -m http.server 8000

# Node.jsの場合
npx http-server
```

ブラウザで `http://localhost:8000` を開きます。

## データ更新方法

`index.html` 内の `GPU_DATA` 配列を編集してください。各エントリは以下の形式です：

```javascript
[generation, gpuModel, ec2Type, instanceSize, gpuCount, vram, fp16, fp8,
 efaVersion, pcie, vcpu, memory, nvme, onDemandPrice, pricePerGpu, cbPrice, tokyoAvailable]
```

各フィールドの説明：
```javascript
{
  generation: 'GPU世代',
  gpuModel: 'GPUモデル名',
  ec2Type: 'EC2インスタンスタイプ',
  instanceSize: 'インスタンスサイズ',
  gpuCount: 'GPU搭載数',
  vram: 'VRAM容量（GB）',
  fp16: 'FP16性能（TFLOPS）',
  fp8: 'FP8性能（TFLOPS）',
  efaVersion: 'EFAバージョン',
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
