# CLAUDE.md

AWS EC2 GPUインスタンスの比較表を表示する静的Webサイト。

## 構成

- 全て `index.html` に含まれる（CSS、HTML、JS、データ）
- ビルドツール不要
- デプロイ: mainブランチにpush（GitHub Pages）

## データ更新

`GPU_DATA` 配列を編集。各エントリ:
```javascript
[generation, gpuModel, ec2Type, instanceSize, gpuCount, vram, fp16, fp8,
 efaVersion, pcie, vcpu, memory, nvme, onDemandPrice, pricePerGpu, cbPrice, tokyoAvailable]
```

### CB (Capacity Blocks) 価格更新

CB価格データソース:
https://raw.githubusercontent.com/koyakimu/ec2-capacity-blocks-for-ml-pricing-json/refs/heads/main/data/pricing.json

JSONの `instance_types.<インスタンス名>.pricing` 配列から `accelerator_hourly_rate_usd` を参照し、`GPU_DATA` の `priceCb` フィールドを更新する。
- 東京リージョン（ap-northeast-1）がある場合はその値を使用
- ない場合は最も一般的なリージョン（us-east-1等）を使用
- 価格は小数点第2位まで表示（例: $3.93）
