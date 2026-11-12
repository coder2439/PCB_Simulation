import type { Metadata } from "next";
import PdnLab from "@/components/labs/PdnLab";

export const metadata: Metadata = {
  title: "PDN & Decoupling Lab",
  description: "Target impedance, decoupling capacitor selection, mounting inductance and load-step droop.",
};

export default function Page() {
  return <PdnLab />;
}
