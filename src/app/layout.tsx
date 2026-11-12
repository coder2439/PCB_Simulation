import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import SiteFooter from "@/components/site/SiteFooter";
import SiteHeader from "@/components/site/SiteHeader";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "SignalPath Lab — High-Speed PCB & SI/PI Mentorship by Leonel Jalil Miranda",
    template: "%s · SignalPath Lab",
  },
  description:
    "Hands-on mentoring for high-speed PCB design: stackup, controlled impedance, PCIe, DDR4, USB 3.2, HDMI, Ethernet and MIPI CSI-2, SI/PI simulation, fabrication and lab validation on a real reference board.",
  authors: [{ name: "Leonel Jalil Miranda" }],
  creator: "Leonel Jalil Miranda",
  keywords: ["High-speed PCB", "Signal Integrity", "Power Integrity", "SI/PI", "PCIe", "DDR4", "USB 3.2", "HDMI", "MIPI CSI-2", "TDR", "VNA", "eye diagram", "PDN"],
  openGraph: {
    title: "SignalPath Lab — High-Speed PCB & SI/PI Mentorship",
    description: "Learn high-speed PCB design on a real reference board: interactive 3D board, SI/PI labs and a structured mentoring curriculum.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-black">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
