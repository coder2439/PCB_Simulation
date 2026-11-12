import type { Metadata } from "next";
import BoardExplorer from "@/components/board/BoardExplorer";

export const metadata: Metadata = {
  title: "3D Reference Board",
  description: "Interactive 3D walkthrough of an 8-layer high-speed reference board: PCIe, DDR4, USB 3.2, HDMI, Ethernet, MIPI CSI-2 and PDN.",
};

export default function Page() {
  return <BoardExplorer />;
}
