import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2, FileCheck2, HelpCircle, Layers3, Rocket, Target } from "lucide-react";
import { DISCOVERY, MODULES, TOOLS } from "@/content/curriculum";

export const metadata: Metadata = {
  title: "Mentoring Curriculum",
  description: "Eight-module high-speed PCB mentoring program: fundamentals, stackup, routing, interfaces, SI and PI simulation, fabrication, and measurement.",
};

const ENGAGEMENTS = [
  { icon: Target, title: "Focused sprint", fit: "One interface or one problem", detail: "4–6 sessions on a single topic — e.g. a PCIe Gen4 channel, DDR4 timing closure or a PDN that keeps failing. Ideal when you already have a design in progress.", items: ["Scoping call + design review", "Targeted simulation exercises", "Written recommendations"] },
  { icon: Layers3, title: "Core program", fit: "All 8 modules on HSD-REF-01", detail: "The complete curriculum on the reference board, with homework and deliverables after each module. Builds a full mental model of the workflow.", items: ["~18 sessions", "Stackup, rules, SI & PI reports", "Templates you keep"], featured: true },
  { icon: Rocket, title: "Full project", fit: "Design → fab → measurement", detail: "Everything in the core program, plus guidance through a real fabrication run and bench validation of your own board or the reference design.", items: ["Fab package review", "Measurement planning", "Correlation report"] },
];

export default function CurriculumPage() {
  return (
    <div className="pb-24">
      <section className="container-x pt-10 md:pt-14">
        <div className="max-w-3xl">
          <span className="eyebrow">Curriculum</span>
          <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[44px]">Eight modules, one board, a complete workflow.</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
            The modules follow the order a real project runs in. Each one ends with a deliverable that becomes part of the reference design package — and a template for your own products.
          </p>
        </div>
      </section>

      <section className="container-x mt-12">
        <ol className="relative space-y-4 before:absolute before:bottom-6 before:left-[19px] before:top-6 before:w-px before:bg-[var(--line-2)] md:before:left-[23px]">
          {MODULES.map((m) => (
            <li key={m.n} className="relative grid gap-4 pl-12 md:pl-16">
              <span className="mono absolute left-0 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-2)] bg-[var(--panel)] text-[13px] text-[var(--accent)] md:h-12 md:w-12">{String(m.n).padStart(2, "0")}</span>
              <article className="panel grid gap-5 p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[19px] font-semibold tracking-tight">{m.title}</h2>
                    <span className="chip !h-6"><CalendarClock size={12} /> {m.sessions}</span>
                  </div>
                  <p className="mt-2 text-[14.5px] text-[var(--text)]">{m.goal}</p>
                  <ul className="mt-3 space-y-1.5">
                    {m.topics.map((t) => <li key={t} className="flex gap-2 text-[13.5px] text-[var(--muted)]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--faint)]" />{t}</li>)}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3.5">
                    <div className="text-[11.5px] uppercase tracking-wider text-[var(--faint)]">Hands-on</div>
                    <ul className="mt-2 space-y-1.5">
                      {m.handsOn.map((h) => <li key={h} className="flex gap-2 text-[13.5px] text-[var(--muted)]"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />{h}</li>)}
                    </ul>
                  </div>
                  <div className="flex items-start gap-2 rounded-xl border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.05)] p-3.5 text-[13.5px]">
                    <FileCheck2 size={15} className="mt-0.5 shrink-0 text-[var(--power)]" />
                    <span><span className="text-[var(--faint)]">Deliverable · </span><span className="text-[var(--text)]">{m.deliverable}</span></span>
                  </div>
                  {m.links && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      {m.links.map((l) => <Link key={l.href} href={l.href} className="inline-flex items-center gap-1 text-[13px] text-[var(--accent)] hover:underline">{l.label} <ArrowRight size={13} /></Link>)}
                    </div>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-x mt-20 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div>
          <span className="eyebrow">Session format</span>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight">What a 90-minute session looks like</h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-[var(--muted)]">Short theory, long practice. Most of the time is spent in the CAD tool, the simulator or on the bench — with the reasoning spoken out loud.</p>
        </div>
        <div className="panel overflow-hidden">
          {[
            ["10 min", "Review", "Homework and questions from your own designs"],
            ["25 min", "Concept", "One idea, explained on the reference board and in the labs"],
            ["45 min", "Hands-on", "You drive: route, simulate, measure — I review and challenge"],
            ["10 min", "Wrap-up", "Decisions recorded, homework, plan for next session"],
          ].map(([t, h, d]) => (
            <div key={h} className="grid grid-cols-[80px_1fr] gap-4 border-b border-[var(--line)] px-5 py-4 last:border-b-0">
              <span className="mono text-[13px] text-[var(--accent)]">{t}</span>
              <div><div className="text-[14.5px] font-medium">{h}</div><div className="text-[13.5px] text-[var(--muted)]">{d}</div></div>
            </div>
          ))}
        </div>
      </section>

      <section id="engagement" className="container-x mt-20 scroll-mt-24">
        <div className="max-w-2xl">
          <span className="eyebrow">Engagement options</span>
          <h2 className="mt-2 text-[26px] font-semibold tracking-tight md:text-[32px]">Shaped around what you need to ship.</h2>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {ENGAGEMENTS.map(({ icon: Icon, title, fit, detail, items, featured }) => (
            <div key={title} className={`panel relative flex flex-col p-6 ${featured ? "!border-[rgba(45,212,191,0.4)] shadow-[0_0_0_1px_rgba(45,212,191,0.15),0_20px_60px_-30px_rgba(45,212,191,0.4)]" : ""}`}>
              {featured && <span className="chip absolute right-4 top-4 !border-[rgba(45,212,191,0.4)] !text-[var(--accent)]">Recommended</span>}
              <Icon size={22} className="text-[var(--accent)]" />
              <h3 className="mt-4 text-[18px] font-semibold">{title}</h3>
              <p className="text-[13px] text-[var(--faint)]">{fit}</p>
              <p className="mt-3 text-[14px] leading-relaxed text-[var(--muted)]">{detail}</p>
              <ul className="mt-4 space-y-1.5">
                {items.map((i) => <li key={i} className="flex gap-2 text-[13.5px] text-[var(--text)]"><CheckCircle2 size={14} className="mt-0.5 text-[var(--ok)]" />{i}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="panel p-6">
            <h3 className="flex items-center gap-2 text-[16px] font-medium"><HelpCircle size={18} className="text-[var(--power)]" /> Before the first session, I&apos;ll ask you</h3>
            <ol className="mt-4 space-y-2.5">
              {DISCOVERY.map((q, i) => (
                <li key={q} className="flex gap-3 text-[14px] text-[var(--muted)]"><span className="mono text-[12px] text-[var(--faint)]">{String(i + 1).padStart(2, "0")}</span>{q}</li>
              ))}
            </ol>
          </div>
          <div className="panel p-6">
            <h3 className="text-[16px] font-medium">Toolchains we can work in</h3>
            {Object.entries({ "PCB CAD": TOOLS.cad, "Simulation": TOOLS.sim, "Lab": TOOLS.lab }).map(([k, l]) => (
              <div key={k} className="mt-4">
                <div className="text-[11.5px] uppercase tracking-wider text-[var(--faint)]">{k}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{l.map((t) => <span key={t} className="chip">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
