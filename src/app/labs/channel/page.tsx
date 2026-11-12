import type { Metadata } from "next";
import ChannelLab from "@/components/labs/ChannelLab";

export const metadata: Metadata = {
  title: "Channel & Eye Diagram Lab",
  description: "Simulate insertion loss, via stubs, equalization and eye diagrams for PCIe, USB, HDMI and MIPI channels.",
};

export default function Page() {
  return <ChannelLab />;
}
