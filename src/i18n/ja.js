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
    gpuCount: "数",
    vram: "VRAM",
    fp16: "FP16",
    fp8: "FP8",
    efa: "EFA",
    pcie: "PCIe",
    vcpu: "vCPU",
    memory: "Mem",
    nvme: "NVMe",
    onDemand: "$/h",
    perGpu: "$/GPU",
    cb: "$/GPU(CB)",
    tokyo: "東京",
    cbOnly: "CB専用",
    groupInstance: "インスタンス",
    groupGpu: "GPU性能",
    groupConnect: "接続",
    groupSystem: "システム",
    groupPrice: "価格",
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
    disclaimer:
      "本サイトの情報は参考値です。最新の正確な情報はAWS公式ドキュメントをご確認ください。",
    source: "データソース",
  },
  notes: {
    title: "Notes",
    priceNote:
      "2025年6月の値下げ反映済み。東京リージョン On-Demand 価格 (USD)。CB = Capacity Blocks。TBD = 価格未発表。",
    g7eNote:
      "NVIDIA RTX PRO 6000 Blackwell Server Edition GPU搭載。G6eの2.3倍の推論性能、2倍のVRAM (96GB/GPU)。48xlargeのみEFA対応。現在 us-east-1/us-east-2 のみ。",
    p5CompNote: "P5en: H200 + EFAv3 + PCIe Gen5 → 最新・最高性能、On-Demand利用可 / P5e: H200 + EFAv2 + PCIe Gen4 → CB専用、P5enより低コスト / P5: H100 + EFAv2 + PCIe Gen4 → VRAM 640GB、最もコスパ良好",
    efaNote:
      "Elastic Fabric Adapter。マルチノード分散学習に必須。v4 > v3 > v2 > v1 の順で高性能。",
    pcieNote:
      "Gen5はGen4の約2倍の帯域幅。CPU-GPU間のデータ転送速度に影響。",
    fpNote:
      "TFLOPS値（Sparsity有効時）。FP8は主にTransformer推論で使用。T4/V100はFP8非対応。*付きは予想値。",
    refTitle: "公式リファレンス",
    refAccelerated: "EC2 Accelerated Computing インスタンス一覧",
    refOnDemand: "EC2 On-Demand 料金",
    refCb: "Capacity Blocks for ML",
    refEfa: "Elastic Fabric Adapter (EFA)",
    refUserGuide: "EC2 ユーザーガイド - アクセラレーテッドコンピューティング",
    refBlog: "AWS Blog - EC2 カテゴリ（最新情報）",
    disclaimerTitle: "免責事項",
    disclaimerBefore:
      "本ページの情報は参考用であり、正確性を保証するものではありません。価格・仕様・リージョン対応状況は予告なく変更される場合があります。最新かつ正確な情報については、必ず",
    disclaimerLink: "AWS公式ドキュメント",
    disclaimerAfter:
      "をご確認ください。本ページの情報に基づく判断・行動によって生じた損害について、作成者は一切の責任を負いません。",
  },
};
