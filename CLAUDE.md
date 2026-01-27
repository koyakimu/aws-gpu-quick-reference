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
