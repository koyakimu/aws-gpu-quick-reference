// データの正は data/instances.json。このファイルは JSON を読むだけの薄い層にする。
// Vite は JSON import をバンドルにインライン化するので、単一 HTML 配布のままでよい。
import instancesFile from "../../data/instances.json";

export const EC2_LINKS = {
    "P6-B300": "https://aws.amazon.com/ec2/instance-types/p6/",
    "P6-B200": "https://aws.amazon.com/ec2/instance-types/p6/",
    "P6e-GB200": "https://aws.amazon.com/ec2/instance-types/p6/",
    G7e: "https://aws.amazon.com/ec2/instance-types/g7e/",
    G7: "https://aws.amazon.com/ec2/instance-types/g7/",
    P5en: "https://aws.amazon.com/ec2/instance-types/p5/",
    P5e: "https://aws.amazon.com/ec2/instance-types/p5/",
    P5: "https://aws.amazon.com/ec2/instance-types/p5/",
    G6e: "https://aws.amazon.com/ec2/instance-types/g6e/",
    G6: "https://aws.amazon.com/ec2/instance-types/g6/",
    G6f: "https://aws.amazon.com/ec2/instance-types/g6/",
    Gr6: "https://aws.amazon.com/ec2/instance-types/g6/",
    Gr6f: "https://aws.amazon.com/ec2/instance-types/g6/",
    P4d: "https://aws.amazon.com/ec2/instance-types/p4/",
    P4de: "https://aws.amazon.com/ec2/instance-types/p4/",
    G5: "https://aws.amazon.com/ec2/instance-types/g5/",
    G4dn: "https://aws.amazon.com/ec2/instance-types/g4/",
    G5g: "https://aws.amazon.com/ec2/instance-types/g5g/",
    P3: "https://aws.amazon.com/ec2/instance-types/p3/",
    P3dn: "https://aws.amazon.com/ec2/instance-types/p3/",
};

export const GPU_DATASHEET_LINKS = {
    "B300": "https://www.nvidia.com/en-us/data-center/dgx-b300/",
    "B200": "https://www.nvidia.com/en-us/data-center/dgx-b200/",
    "GB200": "https://www.nvidia.com/en-us/data-center/gb200-nvl72/",
    // GB300 は AWS のインスタンス型が未公開だが、GPU タブには行として出す。
    "GB300": "https://www.nvidia.com/en-us/data-center/gb300-nvl72/",
    "RTX PRO": "https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/",
    "RTX PRO 4500": "https://www.nvidia.com/en-us/data-center/rtx-pro-4500-blackwell-server-edition/",
    "H200": "https://www.nvidia.com/en-us/data-center/h200/",
    "H100": "https://www.nvidia.com/en-us/data-center/h100/",
    "L40S": "https://www.nvidia.com/en-us/data-center/l40s/",
    "L4": "https://www.nvidia.com/en-us/data-center/l4/",
    "A100 40GB": "https://www.nvidia.com/en-us/data-center/a100/",
    "A100 80GB": "https://www.nvidia.com/en-us/data-center/a100/",
    "A10G": "https://www.nvidia.com/en-us/data-center/products/a10-gpu/",
    "T4": "https://www.nvidia.com/en-us/data-center/tesla-t4/",
    "T4G": "https://www.nvidia.com/en-us/data-center/tesla-t4/",
    "V100": "https://www.nvidia.com/en-us/data-center/v100/",
};

export const GPU_DATA = instancesFile.instances;

export const PRICING_META = {
  pricingAsOf: instancesFile.pricingAsOf,
  pricingRegion: instancesFile.pricingRegion,
};
