import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { INTERFACES } from "@/content/interfaces";

export const metadata: Metadata = {
  title: "Interface Library",
  description: "Design rules, pitfalls, simulation and measurement methods for PCIe, DDR4, USB 3.2, HDMI, Gigabit Ethernet and MIPI CSI-2.",
};

export default function InterfacesPage() {
  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="max-w-3xl">
        <span className="eyebrow">Interface library</span>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[44px]">From the electrical spec to layout rules.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
          Each interface page connects the standard&apos;s electrical requirements to concrete rules on the reference board, the failures you&apos;ll see when they&apos;re broken, and how to simulate and measure them.
        </p>
      </header>
      <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--line)]">
        <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_40px] gap-4 border-b border-[var(--line)] bg-[var(--panel)] px-5 py-3 text-[11.5px] uppercase tracking-wider text-[var(--faint)] md:grid">
          <span>Interface</span><span>Rate</span><span>Impedance</span><span>Core discipline</span><span />
        </div>
        {INTERFACES.map((it) => (
          <Link key={it.slug} href={`/interfaces/${it.slug}/`} className="group grid gap-2 border-b border-[var(--line)] px-5 py-5 transition-colors last:border-b-0 hover:bg-white/[0.02] md:grid-cols-[1.3fr_1fr_1fr_1fr_40px] md:items-center md:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
                <span className="text-[16px] font-medium">{it.name}</span>
              </div>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{it.tagline}</p>
            </div>
            <span className="mono text-[13px] text-[var(--text)]">{it.specs[0].value}</span>
            <span className="mono text-[13px] text-[var(--muted)]">{it.specs.find((s) => /impedance/i.test(s.label))?.value ?? "—"}</span>
            <span className="text-[13px] text-[var(--muted)]">{it.slug === "ddr" ? "Timing budget" : it.slug === "ethernet" ? "Isolation & EMI" : it.slug === "mipi" ? "Forwarded-clock skew" : it.slug === "hdmi" ? "DC-coupled TMDS" : "Loss budget & EQ"}</span>
            <ArrowRight size={16} className="hidden text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text)] md:block" />
          </Link>
        ))}
      </div>
    </div>
  );
}
