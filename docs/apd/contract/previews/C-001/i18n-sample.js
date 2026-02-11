// I18N-001: 翻訳辞書の構造サンプル

// --- ja.js ---
export const ja = {
  header: {
    title: "AWS EC2 GPU インスタンス リファレンスガイド",
    subtitle: "全世代のNVIDIA GPUインスタンスを一覧比較",
    updated: "更新日",
  },
  table: {
    generation: "世代",
    gpuModel: "GPU",
    ec2Type: "EC2",
    instanceSize: "サイズ",
    gpuCount: "GPU数",
    vram: "VRAM (GB)",
    fp16: "FP16 (TFLOPS)",
    fp8: "FP8 (TFLOPS)",
    efa: "EFA",
    pcie: "PCIe",
    vcpu: "vCPU",
    memory: "メモリ",
    nvme: "NVMe",
    onDemand: "On-Demand ($/hr)",
    perGpu: "GPU単価 ($/GPU/hr)",
    cb: "CB ($/GPU/hr)",
    tokyo: "東京",
    cbOnly: "CB専用",
  },
  generations: {
    blackwell: "Blackwell",
    hopper: "Hopper",
    ada: "Ada Lovelace",
    ampere: "Ampere",
    turing: "Turing",
    volta: "Volta",
  },
  calculator: {
    title: "簡易コスト計算",
    instanceLabel: "インスタンスタイプ",
    countLabel: "台数",
    onDemandMonthly: "On-Demand 月額",
    cbMonthly: "Capacity Blocks 月額",
    cbOnly: "CB専用",
    disclaimer:
      "概算値です。RI/Savings Plans等の割引は含まれません。正確な料金はAWS公式をご確認ください。",
  },
  theme: {
    dark: "ダーク",
    light: "ライト",
  },
  footer: {
    disclaimer: "本サイトの情報は参考値です。最新の正確な情報はAWS公式ドキュメントをご確認ください。",
    source: "データソース",
  },
};

// --- en.js ---
export const en = {
  header: {
    title: "AWS EC2 GPU Instance Reference Guide",
    subtitle: "Compare all generations of NVIDIA GPU instances at a glance",
    updated: "Last updated",
  },
  table: {
    generation: "Generation",
    gpuModel: "GPU",
    ec2Type: "EC2",
    instanceSize: "Size",
    gpuCount: "GPUs",
    vram: "VRAM (GB)",
    fp16: "FP16 (TFLOPS)",
    fp8: "FP8 (TFLOPS)",
    efa: "EFA",
    pcie: "PCIe",
    vcpu: "vCPU",
    memory: "Memory",
    nvme: "NVMe",
    onDemand: "On-Demand ($/hr)",
    perGpu: "Per GPU ($/GPU/hr)",
    cb: "CB ($/GPU/hr)",
    tokyo: "Tokyo",
    cbOnly: "CB Only",
  },
  generations: {
    blackwell: "Blackwell",
    hopper: "Hopper",
    ada: "Ada Lovelace",
    ampere: "Ampere",
    turing: "Turing",
    volta: "Volta",
  },
  calculator: {
    title: "Cost Calculator",
    instanceLabel: "Instance Type",
    countLabel: "Number of Instances",
    onDemandMonthly: "On-Demand Monthly",
    cbMonthly: "Capacity Blocks Monthly",
    cbOnly: "CB Only",
    disclaimer:
      "Estimated values. Does not include RI/Savings Plans discounts. Please verify with the official AWS pricing page.",
  },
  theme: {
    dark: "Dark",
    light: "Light",
  },
  footer: {
    disclaimer: "Information on this site is for reference only. Please check the official AWS documentation for the latest accurate information.",
    source: "Data source",
  },
};
