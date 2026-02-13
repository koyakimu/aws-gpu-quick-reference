export const ko = {
  header: {
    title: "AWS EC2 GPU 인스턴스 레퍼런스 가이드",
    subtitle: "전 세대 NVIDIA GPU 인스턴스를 한눈에 비교",
    updated: "업데이트",
  },
  table: {
    generation: "세대",
    gpuModel: "GPU",
    ec2Type: "EC2",
    instanceSize: "사이즈",
    gpuCount: "수",
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
    tokyo: "도쿄",
    cbOnly: "CB 전용",
    groupInstance: "인스턴스",
    groupGpu: "GPU 성능",
    groupConnect: "연결",
    groupSystem: "시스템",
    groupPrice: "가격",
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
    title: "간이 비용 계산",
    instanceLabel: "인스턴스 유형",
    countLabel: "대수",
    onDemandMonthly: "On-Demand 월간 비용",
    cbMonthly: "Capacity Blocks 월간 비용",
    cbOnly: "CB 전용",
    disclaimer:
      "추정치입니다. RI/Savings Plans 등의 할인은 포함되지 않습니다. 정확한 요금은 AWS 공식 사이트를 확인하세요.",
  },
  theme: {
    dark: "다크",
    light: "라이트",
  },
  footer: {
    disclaimer:
      "본 사이트의 정보는 참고용입니다. 최신 정확한 정보는 AWS 공식 문서를 확인하세요.",
    source: "데이터 소스",
  },
  notes: {
    title: "Notes",
    priceNote:
      "2025년 6월 가격 인하 반영. 도쿄 리전 On-Demand 가격 (USD). CB = Capacity Blocks. TBD = 가격 미발표.",
    g7eNote:
      "NVIDIA RTX PRO 6000 Blackwell Server Edition GPU 탑재. G6e 대비 2.3배 추론 성능, 2배 VRAM (96GB/GPU). 48xlarge만 EFA 지원. 현재 us-east-1/us-east-2만 가능.",
    p5CompNote: "P5en: H200 + EFAv3 + PCIe Gen5 → 최신·최고 성능, On-Demand 이용 가능 / P5e: H200 + EFAv2 + PCIe Gen4 → CB 전용, P5en보다 저렴 / P5: H100 + EFAv2 + PCIe Gen4 → VRAM 640GB, 가성비 우수",
    efaNote:
      "Elastic Fabric Adapter. 멀티노드 분산 학습에 필수. v4 > v3 > v2 > v1 순으로 고성능.",
    pcieNote:
      "Gen5는 Gen4의 약 2배 대역폭. CPU-GPU 간 데이터 전송 속도에 영향.",
    fpNote:
      "TFLOPS 값 (Sparsity 활성화 시). FP8은 주로 Transformer 추론에 사용. T4/V100은 FP8 미지원. *는 예상 값.",
    refTitle: "공식 레퍼런스",
    refAccelerated: "EC2 Accelerated Computing 인스턴스 목록",
    refOnDemand: "EC2 On-Demand 요금",
    refCb: "Capacity Blocks for ML",
    refEfa: "Elastic Fabric Adapter (EFA)",
    refUserGuide: "EC2 사용자 가이드 - 가속 컴퓨팅",
    refBlog: "AWS Blog - EC2 카테고리 (최신 정보)",
    disclaimerTitle: "면책 조항",
    disclaimerBefore:
      "본 페이지의 정보는 참고용이며, 정확성을 보장하지 않습니다. 가격·사양·리전 지원 현황은 사전 통지 없이 변경될 수 있습니다. 최신 정확한 정보는 반드시 ",
    disclaimerLink: "AWS 공식 문서",
    disclaimerAfter:
      "를 확인하세요. 본 페이지의 정보에 기반한 판단·행동으로 인한 손해에 대해 작성자는 일체의 책임을 지지 않습니다.",
  },
};
