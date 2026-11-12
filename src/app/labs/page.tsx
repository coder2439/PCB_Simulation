import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import { LABS } from "@/components/site/labsData";

export const metadata: Metadata = {
  title: "Interactive SI/PI Labs",
  description: "Four browser-based labs: stackup & impedance, channel loss & eye diagrams, TDR, and PDN decoupling.",
};


export default function LabsPage() {
  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="max-w-3xl">
        <span className="eyebrow">Interactive labs</span>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[44px]">Simulate first. Then build.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
          Each lab isolates one engineering decision from the reference board and lets you change it in real time. They are teaching models — every lab lists its assumptions — used in the sessions alongside professional tools like HyperLynx, SIwave or Sigrity.
        </p>
      </header>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {LABS.map(({ href, n, title, text, skills, Preview, color }) => (
          <Link key={href} href={href} className="panel group flex flex-col overflow-hidden transition-colors hover:border-[var(--line-2)]">
            <div className="relative h-44 border-b border-[var(--line)] bg-[radial-gradient(ellipse_at_50%_40%,rgba(45,212,191,0.06),transparent_70%)] p-6">
              <Preview />
              <span className="mono absolute left-4 top-3 text-[11px] text-[var(--faint)]">LAB {n}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h2 className="flex items-center gap-2 text-[18px] font-medium tracking-tight">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {title}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">{text}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills.map((s) => <span key={s} className="chip">{s}</span>)}
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent)]">
                Open lab <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="panel mt-8 flex items-start gap-3 p-5 text-[13.5px] text-[var(--muted)]">
        <Cpu size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <p>
          Everything runs locally in your browser. Heavy simulations (FFT-based channel models, 1200-bit eye diagrams, lattice TDR, PDN transients) execute in a Web Worker, so the controls stay responsive while you drag.
        </p>
      </div>
    </div>
  );
}
