import type { Metadata } from "next";
import ImpedanceLab from "@/components/labs/ImpedanceLab";

export const metadata: Metadata = {
  title: "Stackup & Impedance Lab",
  description: "Controlled-impedance calculator with cross-section, solve-for-width and Monte-Carlo fabrication yield.",
};

export default function Page() {
  return <ImpedanceLab />;
}
