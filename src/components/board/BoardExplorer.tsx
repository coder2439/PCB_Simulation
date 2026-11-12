"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircuitBoard, Eye, GraduationCap, Layers, RotateCcw, ScanLine, Sparkles, Tags, X as XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getInterface, type InterfaceSlug } from "@/content/interfaces";
import { TOUR, type Quiz } from "@/content/tour";
import type { FocusId } from "./BoardCanvas";
import BoardLazy from "./BoardLazy";
import { FOCI, IFACE_COLOR, STACKUP, type Iface } from "./data";

const IFACE_TO_SLUG: Partial<Record<Iface, InterfaceSlug>> = { pcie: "pcie", ddr: "ddr", usb3: "usb3", hdmi: "hdmi", ethernet: "ethernet", mipi: "mipi" };

export default function BoardExplorer() {
  const [mode, setMode] = useState<"tour" | "explore">("tour");
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<FocusId>("overview");
  const [xray, setXray] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [labels, setLabels] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  // deep link: /board/#pcie
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && FOCI.some((f) => f.id === h)) {
      setMode("explore");
      setFocus(h as FocusId);
      if (h === "stackup") setExploded(true);
    }
  }, []);

  const goStep = useCallback((i: number) => {
    const s = TOUR[Math.max(0, Math.min(TOUR.length - 1, i))];
    setStep(TOUR.indexOf(s));
    setFocus(s.focus);
    setExploded(!!s.exploded);
    setXray(!!s.xray);
    setShowAll(false);
    setPanelOpen(true);
  }, []);

  useEffect(() => {
    if (mode !== "tour") return;
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") goStep(step + 1);
      if (e.key === "ArrowLeft") goStep(step - 1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [mode, step, goStep]);

  const select = (id: FocusId) => {
    if (mode === "tour") setMode("explore");
    setFocus(id);
    setExploded(id === "stackup");
    if (id !== "stackup" && exploded) setExploded(false);
    setPanelOpen(true);
    history.replaceState(null, "", `#${id}`);
  };

  const cur = TOUR[step];

  return (
    <div className="relative h-[calc(100dvh-60px)] min-h-[560px] w-full overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#0d1622_0%,#05070b_70%)]">
      <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
      <div className="absolute inset-0">
        <BoardLazy mode="explorer" focus={focus} onSelect={select} xray={xray} exploded={exploded} showLabels={labels} showAll={showAll} />
      </div>

      {/* top-left: mode switch + focus chips */}
      <div className="pointer-events-none absolute left-3 right-3 top-3 flex flex-col gap-2 md:left-5 md:top-5 md:right-auto">
        <div className="pointer-events-auto flex w-fit items-center gap-1 rounded-xl border border-[var(--line)] bg-black/60 p-1 backdrop-blur-md">
          <button type="button" onClick={() => { setMode("tour"); goStep(step); }} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] ${mode === "tour" ? "bg-white/10 text-white" : "text-[var(--muted)] hover:text-white"}`}>
            <GraduationCap size={15} /> Guided tour
          </button>
          <button type="button" onClick={() => setMode("explore")} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] ${mode === "explore" ? "bg-white/10 text-white" : "text-[var(--muted)] hover:text-white"}`}>
            <CircuitBoard size={15} /> Explore
          </button>
        </div>
        {mode === "explore" && (
          <div className="pointer-events-auto flex max-w-[640px] flex-wrap gap-1.5">
            {FOCI.map((f) => {
              const c = IFACE_COLOR[f.id as Iface];
              return (
                <button key={f.id} type="button" onClick={() => select(f.id)} className={`flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[12px] backdrop-blur-md transition-colors ${focus === f.id ? "border-white/40 bg-black/75 text-white" : "border-white/10 bg-black/50 text-slate-300 hover:text-white"}`}>
                  {c && <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />}
                  {f.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* bottom toolbar */}
      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-[var(--line)] bg-black/65 p-1 backdrop-blur-md md:bottom-5 max-md:bottom-[calc(min(46dvh,420px)+12px)]">
        <ToolBtn on={xray} onClick={() => { setXray(!xray); setExploded(false); }} icon={<ScanLine size={15} />} label="X-ray" />
        <ToolBtn on={exploded} onClick={() => { setExploded(!exploded); if (!exploded) setFocus("stackup"); else setFocus("overview"); }} icon={<Layers size={15} />} label="Stackup" />
        <ToolBtn on={showAll} onClick={() => setShowAll(!showAll)} icon={<Sparkles size={15} />} label="All signals" />
        <ToolBtn on={labels} onClick={() => setLabels(!labels)} icon={<Tags size={15} />} label="Labels" />
        <ToolBtn on={false} onClick={() => { setFocus("overview"); setExploded(false); setXray(false); }} icon={<RotateCcw size={15} />} label="Reset" />
      </div>

      {/* right panel / bottom sheet */}
      {panelOpen ? (
        <aside className="fade-up absolute inset-x-0 bottom-0 z-20 max-h-[min(46dvh,420px)] overflow-hidden rounded-t-2xl border border-[var(--line)] bg-[rgba(8,11,17,0.9)] backdrop-blur-xl md:inset-x-auto md:bottom-5 md:right-5 md:top-5 md:max-h-none md:w-[400px] md:rounded-2xl">
          <div className="thin-scroll flex h-full max-h-[inherit] flex-col overflow-y-auto">
            <button type="button" onClick={() => setPanelOpen(false)} className="absolute right-3 top-3 rounded-md p-1 text-[var(--faint)] hover:text-white" aria-label="Hide panel"><XIcon size={16} /></button>
            {mode === "tour" ? (
              <TourPanel stepIdx={step} onStep={goStep} />
            ) : (
              <ExplorePanel focus={focus} />
            )}
          </div>
        </aside>
      ) : (
        <button type="button" onClick={() => setPanelOpen(true)} className="btn btn-ghost absolute bottom-5 right-5 z-20 !bg-black/70 backdrop-blur-md">
          <Eye size={15} /> Show {mode === "tour" ? "lesson" : "details"}
        </button>
      )}

      <p className="pointer-events-none absolute bottom-5 left-5 hidden text-[11.5px] text-[var(--faint)] lg:block">
        Drag to orbit · right-drag to pan · scroll to zoom {mode === "tour" && <>· <span className="kbd">←</span> <span className="kbd">→</span> steps</>}
      </p>
      {cur && null}
    </div>
  );
}

function ToolBtn({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] transition-colors ${on ? "bg-[rgba(45,212,191,0.16)] text-[var(--accent)]" : "text-[var(--muted)] hover:bg-white/5 hover:text-white"}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function TourPanel({ stepIdx, onStep }: { stepIdx: number; onStep: (i: number) => void }) {
  const s = TOUR[stepIdx];
  return (
    <div className="flex flex-1 flex-col p-5" key={s.id}>
      <div className="flex items-center gap-2">
        <span className="eyebrow">Lesson {stepIdx + 1} / {TOUR.length}</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {TOUR.map((t, i) => (
          <button key={t.id} type="button" tabIndex={-1} onClick={() => onStep(i)} className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIdx ? "bg-[var(--accent)]" : "bg-white/10 hover:bg-white/20"}`} />
        ))}
      </div>
      <h2 className="mt-4 pr-6 text-[20px] font-semibold leading-snug tracking-tight">{s.title}</h2>
      <div className="lesson mt-3 space-y-3 text-[14px]">
        {s.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
      {s.checklist && (
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 p-3.5">
          <div className="mb-2 text-[11.5px] uppercase tracking-wider text-[var(--faint)]">Design-review checklist</div>
          <ul className="space-y-1.5">
            {s.checklist.map((c) => (
              <li key={c} className="flex gap-2 text-[13px] text-[var(--muted)]"><Check size={14} className="mt-0.5 shrink-0 text-[var(--ok)]" />{c}</li>
            ))}
          </ul>
        </div>
      )}
      {s.quiz && <QuizCard quiz={s.quiz} key={s.id + "q"} />}
      {s.lab && (
        <Link href={s.lab.href} className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent)] hover:underline">
          {s.lab.label} <ArrowRight size={14} />
        </Link>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <button type="button" onClick={() => onStep(stepIdx - 1)} disabled={stepIdx === 0} className="btn btn-ghost !h-9 disabled:opacity-40"><ArrowLeft size={15} /> Back</button>
        {stepIdx < TOUR.length - 1 ? (
          <button type="button" onClick={() => onStep(stepIdx + 1)} className="btn btn-primary !h-9">Next <ArrowRight size={15} /></button>
        ) : (
          <Link href="/curriculum/" className="btn btn-primary !h-9">See the curriculum <ArrowRight size={15} /></Link>
        )}
      </div>
    </div>
  );
}

function QuizCard({ quiz }: { quiz: Quiz }) {
  const [pick, setPick] = useState<number | null>(null);
  return (
    <div className="mt-4 rounded-xl border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.05)] p-3.5">
      <div className="mb-2 text-[11.5px] uppercase tracking-wider text-[var(--power)]">Check your understanding</div>
      <p className="text-[13.5px] text-[var(--text)]">{quiz.q}</p>
      <div className="mt-2.5 space-y-1.5">
        {quiz.options.map((o, i) => {
          const state = pick === null ? "idle" : i === quiz.answer ? "right" : i === pick ? "wrong" : "idle";
          return (
            <button
              key={o}
              type="button"
              disabled={pick !== null}
              onClick={() => setPick(i)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-[13px] transition-colors ${
                state === "right" ? "border-[rgba(74,222,128,0.5)] bg-[rgba(74,222,128,0.08)] text-[var(--text)]" : state === "wrong" ? "border-[rgba(248,113,113,0.5)] bg-[rgba(248,113,113,0.08)] text-[var(--text)]" : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--line-2)] hover:text-[var(--text)]"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {pick !== null && <p className="mt-3 text-[13px] leading-relaxed text-[var(--muted)]"><strong className="text-[var(--text)]">{pick === quiz.answer ? "Correct. " : "Not quite. "}</strong>{quiz.why}</p>}
    </div>
  );
}

const EXTRA: Record<string, { title: string; color: string; body: string[]; link?: { href: string; label: string } }> = {
  overview: {
    title: "HSD-REF-01 reference board",
    color: "var(--accent)",
    body: [
      "8-layer, 1.6 mm PCIe x4 add-in card. All component models are real package geometries (KiCad 3D library) placed on a procedurally routed board.",
      "Select an interface to see its routing, the rules behind it and the matching simulation lab.",
    ],
  },
  power: {
    title: "PDN & regulators",
    color: "var(--c-power)",
    body: [
      "U7 (PMIC) with inductors L1–L3 generates VDD_CORE and VDDQ from the 12 V PCIe rail. Switch-node copper is kept small to limit radiated noise; output pours feed the L4 power islands.",
      "Bulk 0805 capacitors near the inductors cover the kHz–MHz range; the BGA decoupling on the bottom side covers up to tens of MHz.",
    ],
    link: { href: "/labs/pdn/", label: "Open the PDN lab" },
  },
  coupon: {
    title: "TDR / VNA test coupon",
    color: "var(--c-coupon)",
    body: [
      "Edge-launch SMAs (J6, J7) on a 2x-thru coupon. Measure the coupon to verify impedance, extract Dk/Df and de-embed fixtures before trusting any measurement of the real interfaces.",
    ],
    link: { href: "/labs/tdr/", label: "Open the TDR lab" },
  },
  stackup: {
    title: "8-layer stackup",
    color: "var(--copper)",
    body: ["Signal layers L1/L3/L6/L8 each sit next to a solid reference. L4 carries split power islands; L2 has a void under the Ethernet magnetics."],
    link: { href: "/fabrication/", label: "Stackup & fab notes" },
  },
  bottom: {
    title: "Bottom side",
    color: "var(--c-power)",
    body: ["BGA decoupling directly under the SoC (36 × 0201, 12 × 0402) and the PCIe RX fingers on side B."],
    link: { href: "/labs/pdn/", label: "Why caps go under the BGA" },
  },
};

function ExplorePanel({ focus }: { focus: FocusId }) {
  const slug = IFACE_TO_SLUG[focus as Iface];
  const info = slug ? getInterface(slug) : null;
  if (!info) {
    const e = EXTRA[focus] ?? EXTRA.overview;
    return (
      <div className="p-5">
        <span className="eyebrow" style={{ color: e.color }}>Board region</span>
        <h2 className="mt-2 pr-6 text-[20px] font-semibold tracking-tight">{e.title}</h2>
        <div className="lesson mt-3 space-y-3 text-[14px]">{e.body.map((b, i) => <p key={i}>{b}</p>)}</div>
        {focus === "stackup" && (
          <div className="mt-4 space-y-1">
            {STACKUP.filter((l) => l.kind === "signal" || l.kind === "plane").map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-[var(--line)] bg-black/20 px-2.5 py-1.5 text-[12.5px]">
                <span className="text-[var(--text)]">{l.name}</span>
                <span className="mono text-[var(--faint)]">{l.copperOz} oz</span>
              </div>
            ))}
          </div>
        )}
        {e.link && <Link href={e.link.href} className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent)] hover:underline">{e.link.label} <ArrowRight size={14} /></Link>}
      </div>
    );
  }
  return (
    <div className="p-5">
      <span className="eyebrow" style={{ color: info.color }}>{info.standard}</span>
      <h2 className="mt-2 pr-6 text-[20px] font-semibold tracking-tight">{info.name}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--muted)]">{info.summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {info.specs.slice(0, 4).map((s) => (
          <div key={s.label} className="rounded-lg border border-[var(--line)] bg-black/20 px-2.5 py-2">
            <div className="text-[11px] text-[var(--faint)]">{s.label}</div>
            <div className="mono mt-0.5 text-[12.5px] text-[var(--text)]">{s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <div className="mb-2 text-[11.5px] uppercase tracking-wider text-[var(--faint)]">Key layout rules</div>
        <ul className="space-y-2">
          {info.rules.slice(0, 3).map((r) => (
            <li key={r.title} className="text-[13px]"><span className="text-[var(--text)]">{r.title}.</span> <span className="text-[var(--muted)]">{r.detail}</span></li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {info.parts.map((p) => <span key={p} className="chip mono !text-[11px]">{p}</span>)}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={`/interfaces/${info.slug}/`} className="btn btn-primary !h-9">Deep dive <ArrowRight size={15} /></Link>
        <Link href={info.labHint.href} className="btn btn-ghost !h-9">Open lab</Link>
      </div>
    </div>
  );
}
