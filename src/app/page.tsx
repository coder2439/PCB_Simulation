import Link from "next/link";
import { ArrowRight, Box, ClipboardCheck, Cpu, Factory, Gauge, GraduationCap, MonitorPlay, Ruler, Waves, Wrench } from "lucide-react";
import HeroBoard from "@/components/site/HeroBoard";
import { LABS } from "@/components/site/labsData";
import { INTERFACES } from "@/content/interfaces";
import { TOOLS } from "@/content/curriculum";

const LOOP = [
  { icon: ClipboardCheck, title: "Define", text: "Interfaces, data rates, devices and measurable SI/PI goals for the example board.", href: "/curriculum/" },
  { icon: Ruler, title: "Design", text: "Stackup, impedance, placement, return paths, differential routing and via strategy.", href: "/board/" },
  { icon: Waves, title: "Simulate", text: "Channel loss, reflections, crosstalk, eye diagrams and PDN impedance — before fab.", href: "/labs/" },
  { icon: Factory, title: "Fabricate", text: "Materials, tolerances, backdrill, coupons and a fab package the vendor can't misread.", href: "/fabrication/" },
  { icon: Gauge, title: "Measure", text: "TDR, VNA and scope measurements with proper calibration and de-embedding.", href: "/measurement/" },
  { icon: Wrench, title: "Review", text: "Correlate, explain the differences, and turn findings into reusable rules.", href: "/measurement/#correlation" },
];

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-70" />
        <div className="pointer-events-none absolute -right-40 top-10 h-[620px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(45,212,191,0.12),transparent)]" />
        <div className="container-x relative grid items-center gap-6 pb-10 pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:pb-14 lg:pt-14">
          <div className="fade-up relative z-10">
            <span className="chip !border-[rgba(45,212,191,0.35)] !text-[var(--accent)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" style={{ animation: "pulse-dot 2s infinite" }} />
              High-speed PCB · SI/PI mentorship
            </span>
            <h1 className="mt-5 text-[38px] font-semibold leading-[1.05] tracking-tight md:text-[54px]">
              Learn high-speed design on a <span className="bg-gradient-to-r from-[#2dd4bf] to-[#38bdf8] bg-clip-text text-transparent">real board</span> — from stackup to eye diagram.
            </h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-[var(--muted)]">
              A hands-on mentoring program that walks one reference design through the full workflow: PCIe, DDR4, USB 3.2, HDMI, Ethernet and MIPI CSI-2 — designed, simulated, fabricated and measured, with the reasoning behind every decision.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/board/" className="btn btn-primary !h-11 !px-5">
                <Box size={17} /> Explore the 3D board
              </Link>
              <Link href="/labs/channel/" className="btn btn-ghost !h-11 !px-5">
                <MonitorPlay size={17} /> Try the eye-diagram lab
              </Link>
            </div>
            <dl className="mt-9 grid max-w-lg grid-cols-4 gap-4 border-t border-[var(--line)] pt-6">
              {[["8", "layer board"], ["6", "interfaces"], ["4", "live labs"], ["8", "modules"]].map(([v, l]) => (
                <div key={l}>
                  <dt className="mono text-[26px] leading-none text-[var(--text)]">{v}</dt>
                  <dd className="mt-1.5 text-[12px] text-[var(--faint)]">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative -mx-5 h-[400px] sm:h-[480px] lg:mx-0 lg:h-[600px]">
            <HeroBoard />
            <p className="pointer-events-none absolute bottom-2 right-4 text-[11.5px] text-[var(--faint)]">Real package models · drag to rotate · click a label</p>
          </div>
        </div>
      </section>

      {/* LOOP */}
      <section className="container-x py-20">
        <div className="max-w-2xl">
          <span className="eyebrow">The engineering loop</span>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight md:text-[36px]">One project, the complete workflow.</h2>
          <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--muted)]">
            Instead of disconnected theory, every concept is anchored to the same reference board — so you see how a stackup choice shows up as an S-parameter, an eye opening and finally a TDR trace on the bench.
          </p>
        </div>
        <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {LOOP.map(({ icon: Icon, title, text, href }, i) => (
            <li key={title}>
              <Link href={href} className="panel group relative flex h-full flex-col p-4 transition-colors hover:border-[var(--line-2)]">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line-2)] bg-black/30 text-[var(--accent)]"><Icon size={17} /></span>
                  <span className="mono text-[11px] text-[var(--faint)]">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-[15px] font-medium">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{text}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {/* INTERFACES */}
      <section className="border-y border-[var(--line)] bg-[var(--bg-2)]">
        <div className="container-x py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="eyebrow">Interfaces covered</span>
              <h2 className="mt-2 text-[28px] font-semibold tracking-tight md:text-[36px]">Six interfaces, six different lessons.</h2>
            </div>
            <Link href="/interfaces/" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--accent)] hover:underline">Interface library <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTERFACES.map((it) => (
              <Link key={it.slug} href={`/interfaces/${it.slug}/`} className="panel group relative overflow-hidden p-5 transition-colors hover:border-[var(--line-2)]">
                <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${it.color}, transparent)` }} />
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
                  <h3 className="text-[16.5px] font-medium">{it.name}</h3>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{it.tagline}</p>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {it.specs.slice(0, 2).map((s) => (
                    <div key={s.label} className="rounded-lg border border-[var(--line)] bg-black/20 px-2.5 py-2">
                      <dt className="text-[11px] text-[var(--faint)]">{s.label}</dt>
                      <dd className="mono mt-0.5 text-[12.5px]">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] text-[var(--muted)] group-hover:text-[var(--text)]">Rules, pitfalls & measurements <ArrowRight size={14} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* LABS */}
      <section className="container-x py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="eyebrow">Interactive labs</span>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight md:text-[36px]">Turn the knobs before you spend money on a spin.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--muted)]">Guided experiments in each lab reproduce classic failures — stub resonances, capacitive pads, PDN anti-resonances — so you recognize them in your own designs.</p>
          </div>
          <Link href="/labs/" className="inline-flex items-center gap-1.5 text-[14px] text-[var(--accent)] hover:underline">All labs <ArrowRight size={15} /></Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LABS.map(({ href, n, title, Preview, color }) => (
            <Link key={href} href={href} className="panel group overflow-hidden transition-colors hover:border-[var(--line-2)]">
              <div className="h-32 border-b border-[var(--line)] p-4"><Preview /></div>
              <div className="p-4">
                <span className="mono text-[11px] text-[var(--faint)]">LAB {n}</span>
                <h3 className="mt-1 flex items-center gap-2 text-[15px] font-medium"><span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />{title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MENTORING FORMAT */}
      <section className="border-t border-[var(--line)] bg-[var(--bg-2)]">
        <div className="container-x grid gap-12 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <span className="eyebrow">How the mentoring works</span>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight md:text-[36px]">Taught like a design review, not a lecture.</h2>
            <div className="mt-8 space-y-6">
              {[
                { icon: GraduationCap, t: "Live 1:1 sessions", d: "Screen-shared sessions on the reference board and, as soon as you're ready, on your own designs. Every decision is explained — and challenged." },
                { icon: Cpu, t: "Your tools, your lab", d: "Altium, Allegro or KiCad; HyperLynx, SIwave, Sigrity or open-source. Measurements are planned around the equipment you actually have." },
                { icon: ClipboardCheck, t: "Real deliverables", d: "A stackup, rule set, simulation report, fab package and correlation report — reusable templates for your next board." },
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line-2)] bg-black/30 text-[var(--accent)]"><Icon size={18} /></span>
                  <div>
                    <h3 className="text-[15.5px] font-medium">{t}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-[var(--muted)]">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel p-6">
            <h3 className="text-[15px] font-medium">Tool-agnostic by design</h3>
            {Object.entries({ "PCB CAD": TOOLS.cad, "SI/PI simulation": TOOLS.sim, "Lab equipment": TOOLS.lab }).map(([k, list]) => (
              <div key={k} className="mt-5">
                <div className="text-[11.5px] uppercase tracking-wider text-[var(--faint)]">{k}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{list.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              </div>
            ))}
            <Link href="/curriculum/" className="btn btn-primary mt-7">See the 8-module curriculum <ArrowRight size={16} /></Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-x py-20">
        <div className="panel relative overflow-hidden p-8 md:p-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.18),transparent)]" />
          <div className="relative max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-tight md:text-[34px]">Start with the reference board — finish with your own.</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--muted)]">The first session is a scoping call: your tools, your lab, the interface that matters most to you. The plan is then tailored around it.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/curriculum/#engagement" className="btn btn-primary !h-11 !px-5">Plan the engagement <ArrowRight size={16} /></Link>
              <Link href="/board/" className="btn btn-ghost !h-11 !px-5">Take the guided tour</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
