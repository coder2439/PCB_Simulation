import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, ArrowRight, Box, Gauge, Waves } from "lucide-react";
import { InterfaceBoard, SkewCalc } from "@/components/site/InterfaceWidgets";
import { getInterface, INTERFACES } from "@/content/interfaces";

export const dynamicParams = false;

export function generateStaticParams() {
  return INTERFACES.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: PageProps<"/interfaces/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const it = getInterface(slug);
  return it ? { title: `${it.name} layout & SI`, description: it.summary } : {};
}

export default async function InterfacePage({ params }: PageProps<"/interfaces/[slug]">) {
  const { slug } = await params;
  const it = getInterface(slug);
  if (!it) notFound();
  const idx = INTERFACES.indexOf(it);
  const prev = INTERFACES[(idx + INTERFACES.length - 1) % INTERFACES.length];
  const next = INTERFACES[(idx + 1) % INTERFACES.length];

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at 80% 20%, color-mix(in srgb, ${it.color} 14%, transparent), transparent 60%)` }} />
        <div className="container-x relative grid gap-6 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:pt-10">
          <div className="pb-6 lg:pb-12">
            <Link href="/interfaces/" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"><ArrowLeft size={14} /> Interface library</Link>
            <div className="mt-6 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
              <span className="eyebrow" style={{ color: it.color }}>{it.standard}</span>
            </div>
            <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[46px]">{it.name}</h1>
            <p className="mt-2 text-[16px] text-[var(--text)]">{it.tagline}</p>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-[var(--muted)]">{it.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">{it.signaling}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/board/#${it.slug}`} className="btn btn-primary"><Box size={16} /> View on the 3D board</Link>
              <Link href={it.labHint.href} className="btn btn-ghost"><Waves size={16} /> {it.labHint.label}</Link>
            </div>
          </div>
          <div className="relative mb-8 h-[340px] overflow-hidden rounded-2xl border border-[var(--line)] bg-[radial-gradient(ellipse_at_50%_40%,#0d1622,#05070b_75%)] sm:h-[420px] lg:mb-10 lg:h-auto lg:min-h-[440px]">
            <InterfaceBoard focus={it.slug} />
          </div>
        </div>
      </section>

      <div className="container-x mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold tracking-tight">Key electrical requirements</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
              <table className="w-full text-left text-[13.5px]">
                <tbody>
                  {it.specs.map((s) => (
                    <tr key={s.label} className="border-b border-[var(--line)] last:border-b-0">
                      <th scope="row" className="w-[42%] bg-[var(--panel)] px-4 py-3 font-normal text-[var(--muted)]">{s.label}</th>
                      <td className="px-4 py-3">
                        <span className="mono text-[var(--text)]">{s.value}</span>
                        {s.note && <span className="block text-[12px] text-[var(--faint)]">{s.note}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[12px] text-[var(--faint)]">Typical values for teaching; the current revision of the specification and the silicon vendor's design guide are always authoritative.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold tracking-tight">Why it's hard</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {it.challenges.map((c) => (
                <li key={c} className="panel p-4 text-[14px] leading-relaxed text-[var(--muted)]">{c}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold tracking-tight">Layout rules on HSD-REF-01</h2>
            <ol className="mt-4 space-y-3">
              {it.rules.map((r, i) => (
                <li key={r.title} className="flex gap-4">
                  <span className="mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px]" style={{ borderColor: it.color, color: it.color }}>{i + 1}</span>
                  <div>
                    <h3 className="text-[15px] font-medium">{r.title}</h3>
                    <p className="mt-0.5 text-[14px] leading-relaxed text-[var(--muted)]">{r.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-[22px] font-semibold tracking-tight"><AlertTriangle size={20} className="text-[var(--power)]" /> Failure modes & mitigations</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--line)]">
              <table className="w-full min-w-[620px] text-left text-[13.5px]">
                <thead className="bg-[var(--panel)] text-[11.5px] uppercase tracking-wider text-[var(--faint)]">
                  <tr><th className="px-4 py-3 font-medium">Design problem</th><th className="px-4 py-3 font-medium">What you observe</th><th className="px-4 py-3 font-medium">Mitigation</th></tr>
                </thead>
                <tbody>
                  {it.pitfalls.map((p) => (
                    <tr key={p.problem} className="border-t border-[var(--line)] align-top">
                      <td className="px-4 py-3 text-[var(--text)]">{p.problem}</td>
                      <td className="px-4 py-3 text-[var(--muted)]">{p.symptom}</td>
                      <td className="px-4 py-3 text-[var(--ok)]">{p.fix}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="panel p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-medium"><Waves size={16} className="text-[var(--accent-2)]" /> How we simulate it</h3>
              <ul className="mt-3 space-y-2">
                {it.simulate.map((s) => <li key={s} className="flex gap-2 text-[13.5px] leading-relaxed text-[var(--muted)]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent-2)]" />{s}</li>)}
              </ul>
            </div>
            <div className="panel p-5">
              <h3 className="flex items-center gap-2 text-[15px] font-medium"><Gauge size={16} className="text-[var(--accent)]" /> How we measure it</h3>
              <ul className="mt-3 space-y-2">
                {it.measure.map((s) => <li key={s} className="flex gap-2 text-[13.5px] leading-relaxed text-[var(--muted)]"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />{s}</li>)}
              </ul>
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-[76px] lg:h-fit">
          <SkewCalc uiPs={it.uiPs} color={it.color} />
          <div className="panel p-5">
            <h3 className="text-[15px] font-medium">On the reference board</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">{it.parts.map((p) => <span key={p} className="chip mono !text-[11.5px]">{p}</span>)}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/interfaces/${prev.slug}/`} className="panel p-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"><ArrowLeft size={14} className="mb-1" />{prev.name}</Link>
            <Link href={`/interfaces/${next.slug}/`} className="panel p-3 text-right text-[13px] text-[var(--muted)] hover:text-[var(--text)]"><ArrowRight size={14} className="mb-1 ml-auto" />{next.name}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
