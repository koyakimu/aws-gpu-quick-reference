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
    tokyo: "Tokyo",
    cbOnly: "CB Only",
    groupInstance: "Instance",
    groupGpu: "GPU Performance",
    groupConnect: "Connectivity",
    groupSystem: "System",
    groupPrice: "Pricing",
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
    disclaimer:
      "Information on this site is for reference only. Please check the official AWS documentation for the latest accurate information.",
    source: "Data source",
  },
  notes: {
    title: "Notes",
    priceNote:
      "Reflects June 2025 price reductions. Tokyo region On-Demand pricing (USD). CB = Capacity Blocks. TBD = pricing not yet announced.",
    g7eNote:
      "Powered by NVIDIA RTX PRO 6000 Blackwell Server Edition GPU. 2.3x inference performance over G6e, 2x VRAM (96GB/GPU). Only 48xlarge supports EFA. Currently us-east-1/us-east-2 only.",
    p5CompNote: "P5en: H200 + EFAv3 + PCIe Gen5 → Latest & highest performance, On-Demand available / P5e: H200 + EFAv2 + PCIe Gen4 → CB only, lower cost than P5en / P5: H100 + EFAv2 + PCIe Gen4 → 640GB VRAM, best cost-performance",
    efaNote:
      "Elastic Fabric Adapter. Required for multi-node distributed training. Performance: v4 > v3 > v2 > v1.",
    pcieNote:
      "Gen5 offers ~2x bandwidth over Gen4. Affects CPU-GPU data transfer speeds.",
    fpNote:
      "TFLOPS values (with Sparsity enabled). FP8 mainly used for Transformer inference. T4/V100 do not support FP8. * indicates estimated values.",
    refTitle: "Official References",
    refAccelerated: "EC2 Accelerated Computing Instances",
    refOnDemand: "EC2 On-Demand Pricing",
    refCb: "Capacity Blocks for ML",
    refEfa: "Elastic Fabric Adapter (EFA)",
    refUserGuide: "EC2 User Guide - Accelerated Computing",
    refBlog: "AWS Blog - EC2 Category (Latest News)",
    disclaimerTitle: "Disclaimer",
    disclaimerText:
      "Information on this page is for reference purposes and accuracy is not guaranteed. Prices, specifications, and region availability may change without notice. Please always check the official AWS documentation for the latest and most accurate information. The author assumes no liability for any damages resulting from decisions or actions based on information on this page.",
  },
};
