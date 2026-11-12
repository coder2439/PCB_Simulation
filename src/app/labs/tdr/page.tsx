import type { Metadata } from "next";
import TdrLab from "@/components/labs/TdrLab";

export const metadata: Metadata = {
  title: "TDR Lab",
  description: "Time-domain reflectometry: rise time, resolution, discontinuities and simulation-to-measurement correlation.",
};

export default function Page() {
  return <TdrLab />;
}
