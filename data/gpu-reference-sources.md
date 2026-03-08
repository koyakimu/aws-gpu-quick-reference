# GPU リファレンス・出典一覧

AWS EC2 GPU インスタンスに搭載されている GPU の正式名称、データシート出典、および演算性能の検証記録。

## 出典

- AWS インスタンス仕様: https://docs.aws.amazon.com/ec2/latest/instancetypes/ac.html
- NVIDIA データセンター GPU: https://www.nvidia.com/en-us/data-center/

## GPU・インスタンス対応表

| EC2 | AWS公式GPU名称 | GPU メモリ (per GPU) | フォームファクタ |
|-----|--------------|---------------------|----------------|
| P3 | NVIDIA V100 | 16 GiB | SXM2 |
| P3dn | NVIDIA V100 | 32 GiB | SXM2 |
| G4dn | NVIDIA T4 | 16 GiB | PCIe |
| G5g | NVIDIA T4g | 16 GiB | PCIe |
| G5 | NVIDIA A10G | 22 GiB | PCIe |
| G6 | NVIDIA L4 | 22 GiB | PCIe |
| G6f | NVIDIA L4 (分割) | 2-11 GiB | PCIe |
| G6e | NVIDIA L40S | 44 GiB | PCIe |
| G7e | NVIDIA RTX PRO Server 6000 | 96 GiB | PCIe |
| P4d | NVIDIA A100 | 40 GiB (320 GiB / 8 GPU) | SXM |
| P4de | NVIDIA A100 | 80 GiB (640 GiB / 8 GPU) | SXM |
| P5 | NVIDIA H100 | 80 GiB | SXM |
| P5e | NVIDIA H200 | 141 GiB | SXM |
| P5en | NVIDIA H200 | 141 GiB | SXM |
| P6-B200 | NVIDIA B200 | 179 GiB (1432 GiB / 8 GPU) | SXM |
| P6-B300 | NVIDIA B300 | 268 GiB (2148 GiB / 8 GPU) | SXM |

## データシート出典・演算性能

### V100 SXM2 (P3 / P3dn)

- **データシート**: https://images.nvidia.com/content/technologies/volta/pdf/volta-v100-datasheet-update-us-1165301-r5.pdf
- FP32: 15.7 TFLOPS
- Tensor Performance (FP16): **125 TFLOPS**
- FP16 non-TC (= 2 x FP32): 31.4 TFLOPS
- 構造的スパース性: 非対応 (Volta)

### T4 (G4dn) / T4g (G5g)

- **データシート**: https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/tesla-t4/t4-tensor-core-datasheet-951643.pdf
- FP32: 8.1 TFLOPS
- Mixed-Precision FP16/FP32 (Tensor Core): **65 TFLOPS**
- INT8: 130 TOPS
- 構造的スパース性: 非対応 (Turing)

### A10G (G5)

- **製品ページ**: https://www.nvidia.com/en-us/data-center/products/a10-gpu/
- AWS カスタム GPU (A10 ベース)
- FP16 Tensor Core with Sparsity: **125 TFLOPS** (Dense: 62.5 TFLOPS)
- 構造的スパース性: 対応 (Ampere)
- 備考: 公式データシートにTFLOPS値の記載なし。A10のスペックに準じる

### L4 (G6 / G6f)

- **製品ページ**: https://www.nvidia.com/en-us/data-center/l4/
- FP16 Tensor Core with Sparsity: **242 TFLOPS** (Dense: 121 TFLOPS)
- FP8 Tensor Core with Sparsity: **485 TFLOPS** (Dense: 242 TFLOPS)
- 構造的スパース性: 対応 (Ada Lovelace)

### L40S (G6e)

- **製品ページ**: https://www.nvidia.com/en-us/data-center/l40s/
- FP32: 91.6 TFLOPS
- FP16 Tensor Core with Sparsity: **733 TFLOPS** (Dense: 366 TFLOPS)
- FP8 Tensor Core with Sparsity: **1,466 TFLOPS** (Dense: 733 TFLOPS)
- 構造的スパース性: 対応 (Ada Lovelace)

### A100 SXM (P4d / P4de)

- **データシート**: https://www.nvidia.com/content/dam/en-zz/Solutions/Data-Center/a100/pdf/nvidia-a100-datasheet-us-nvidia-1758950-r4-web.pdf
- FP32: 19.5 TFLOPS
- TF32 Tensor Core: 156 TFLOPS | 312 TFLOPS* (*With Sparsity)
- **FP16 Tensor Core: 312 TFLOPS | 624 TFLOPS*** (*With Sparsity)
- BF16 Tensor Core: 312 TFLOPS | 624 TFLOPS*
- INT8 Tensor Core: 624 TOPS | 1,248 TOPS*
- FP16 non-TC: 78 TFLOPS (データシートに直接記載なし、アーキテクチャから導出)
- 構造的スパース性: 対応 (Ampere)
- 備考: 40GB / 80GB で演算性能は同一。メモリ帯域のみ異なる

### H100 SXM (P5)

- **製品ページ**: https://www.nvidia.com/en-us/data-center/h100/
- FP32: 67 TFLOPS
- TF32 Tensor Core with Sparsity: 989 TFLOPS (Dense: 494 TFLOPS)
- **FP16 Tensor Core with Sparsity: 1,979 TFLOPS** (Dense: 989 TFLOPS)
- **FP8 Tensor Core with Sparsity: 3,958 TFLOPS** (Dense: 1,979 TFLOPS)
- 構造的スパース性: 対応 (Hopper)

### H200 SXM (P5e / P5en)

- **製品ページ**: https://www.nvidia.com/en-us/data-center/h200/
- 演算性能は H100 SXM と同一 (GPU ダイが同じ)
- **FP16 Tensor Core with Sparsity: 1,979 TFLOPS** (Dense: 989 TFLOPS)
- **FP8 Tensor Core with Sparsity: 3,958 TFLOPS** (Dense: 1,979 TFLOPS)
- メモリ: 141 GB HBM3e (H100 の 80 GB HBM3 から増量)
- 構造的スパース性: 対応 (Hopper)

### B200 SXM (P6-B200)

- **DGX B200 ページ**: https://www.nvidia.com/en-us/data-center/dgx-b200/
- DGX B200 (8 GPU) スペックから per-GPU 算出:
  - FP4 Tensor Core: 144 PFLOPS sparse | 72 PFLOPS dense → **per GPU: 18,000 / 9,000 TFLOPS**
  - FP8 Tensor Core: 72 PFLOPS sparse → **per GPU: 9,000 TFLOPS sparse (4,500 dense)**
- FP16 Tensor Core: **2,250 TFLOPS dense | 4,500 TFLOPS sparse** (GTC 2024 発表値)
- 構造的スパース性: 対応 (Blackwell, 2:4)

### B300 SXM (P6-B300)

- **DGX B300 ページ**: https://www.nvidia.com/en-us/data-center/dgx-b300/
- DGX B300 (8 GPU) スペックから per-GPU 算出:
  - **FP4 Tensor Core: 144 PFLOPS sparse | 108 PFLOPS dense → per GPU: 18,000 / 13,500 TFLOPS**
  - FP8 Tensor Core: 72 PFLOPS sparse → **per GPU: 9,000 TFLOPS sparse (4,500 dense)**
- FP16 Tensor Core: 2,250 TFLOPS dense | 4,500 TFLOPS sparse (B200 と同一と推定)
- 構造的スパース性: 対応 (Blackwell Ultra)
- 備考: B300 の FP4 は sparse:dense 比が 1.33:1 (18000:13500)。B200 の 2:1 (18000:9000) と異なる

### RTX PRO Server 6000 (G7e)

- **データシート**: https://resources.nvidia.com/en-us-rtx-pro-6000 (PDF)
- CUDA Cores: 24,064
- Tensor Cores: 752 (5th Gen)
- FP32: 120 TFLOPS
- Peak FP4 AI: 4 PFLOPS
- RT Core: 355 TFLOPS
- **FP16 / FP8 / BF16 / TF32: 公式データシートに記載なし**
- GPU メモリ: 96 GB GDDR7 (1,597 GB/s)
- 構造的スパース性: 対応 (Blackwell)
- **推定値 (アーキテクチャ導出):**
  - 導出方法: Blackwell Tensor Core の精度別スループット比 (TF32:FP16:FP8 = 1:2:4, Sparse = 2× Dense) と公式 FP32 = 120 TFLOPS から算出
  - FP16 Tensor Core Dense: **~240 TFLOPS** | Sparse: **~480 TFLOPS**
  - FP8 Tensor Core Dense: **~480 TFLOPS** | Sparse: **~960 TFLOPS**
  - FP4 Tensor Core Sparse: **4,000 TFLOPS** (公式 "Peak FP4 AI: 4 PFLOPS") | Dense: **~2,000 TFLOPS** (= Sparse / 2)
  - 裏付け: Workstation Edition データシートに「Effective FP4 TOPS with sparsity」と明記。4 PFLOPS はスパース性有効時の値
  - WareDB (https://waredb.com/processor/nvidia-rtx-pro-6000-blackwell) の FP16 Dense: 251.90 (クロック補正後 ~240) も参照

## 更新履歴

- 2026-03-08: RTX PRO Server 6000 の FP16/FP8 をアーキテクチャ導出の推定値として復元 (*付き)
- 2026-03-07: 初版作成。全 GPU の演算性能を NVIDIA 公式データシートで検証
  - A100: FP16 TC を TF32 値 (156/312) から正しい FP16 値 (312/624) に修正
  - B300: FP4 を 14000/28000 から 13500/18000 に修正 (DGX B300 ページ準拠)
  - RTX PRO Server 6000: 公式未公開の FP16/FP8 値を削除
