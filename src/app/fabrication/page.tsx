import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckSquare, FileText, Ruler } from "lucide-react";
import { STACKUP } from "@/components/board/data";
import { COPPERS, LAMINATES, lossDbPerIn } from "@/lib/si/materials";

export const metadata: Metadata = {
  title: "Fabrication & Stackup",
  description: "Stackup design, laminate selection, fabrication notes, tolerances, backdrilling and impedance coupons for high-speed PCBs.",
};

const KIND_COLOR: Record<string, string> = { signal: "#e39a63", plane: "#c98552", core: "rgba(201,183,122,0.45)", prepreg: "rgba(201,183,122,0.28)", mask: "#1f6a4c" };

const TOLERANCES = [
  ["Controlled impedance", "±10 % standard · ±7 % / ±5 % premium", "state per layer, per reference"],
  ["Trace width (etched)", "±0.5 mil (≈ ±10 % at 5 mil)", "outer layers vary more (plating)"],
  ["Dielectric thickness", "±10 % pressed prepreg", "depends on copper density nearby"],
  ["Layer-to-layer registration", "±3 mil", "drives anti-pad and annular-ring rules"],
  ["Backdrill depth", "residual stub 6–12 mil typical", "specify max stub, not drill depth"],
  ["Board thickness", "±10 %", "PCIe CEM card edge 1.57 mm ± 0.13 mm"],
];

const FAB_NOTES = `1.  MATERIAL: mid-loss laminate, Dk ≈ 3.6–3.7 / Df ≤ 0.010 @ 10 GHz
    (FR408HR-class or approved equivalent). Tg ≥ 170 °C, lead-free compatible.
2.  STACKUP: 8 layers, 1.60 mm ±10 % finished. Per drawing HSD-REF-01-STK.
    Fabricator may adjust dielectric thickness to meet impedance; submit
    stackup for approval before build.
3.  IMPEDANCE CONTROL (±10 %), verified by coupon TDR:
      L1  85 Ω diff  (ref L2)     L1  90 Ω diff (ref L2)    L1 100 Ω diff (ref L2)
      L3  85 Ω diff  (ref L2/L4)  L6  40 Ω SE   (ref L5/L7)
    Trace widths on artwork are nominal; fabricator to compensate.
4.  BACKDRILL: nets in class PCIE_RX on L3 — max residual stub 10 mil.
5.  VIA-IN-PAD under U1: filled and capped, IPC-4761 Type VII.
6.  FINISH: ENIG. Card-edge fingers: hard gold 30 µin min over nickel,
    45° × 0.5 mm bevel, no soldermask on fingers.
7.  SOLDERMASK: LPI green, both sides. Silkscreen white.
8.  COUPONS: impedance coupon per controlled layer + 2x-thru coupon on
    panel rails. Supply TDR report with shipment.
9.  ACCEPTANCE: IPC-6012 Class 2. Electrical test 100 %.`;

const DFM = [
  "Stackup and impedance table approved by the fab before routing starts",
  "Anti-pad sizes on high-speed vias agreed (and non-functional pads removed)",
  "Backdrill nets and maximum stub defined in the fab notes",
  "Copper balance on each layer to avoid warp and thickness variation",
  "Test coupons on panel rails for every controlled-impedance structure",
  "Card-edge bevel and hard-gold plating called out (PCIe)",
  "Via-in-pad filled & capped where it's under fine-pitch BGA",
  "Drill-to-copper clearances checked against registration tolerance",
];

export default function FabricationPage() {
  const total = STACKUP.reduce((a, l) => a + l.thicknessMil, 0);
  const lossAt = (dk: number, df: number, fG: number) => lossDbPerIn(fG * 1e9, { wMil: 5, z0: 42.5, dk, df, rqUm: COPPERS[1].rqUm }).total;

  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="max-w-3xl">
        <span className="eyebrow">Fabrication</span>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[44px]">The stackup is a contract with your fabricator.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
          Simulation assumes geometry and materials. Fabrication decides whether those assumptions are true. This page shows the HSD-REF-01 stackup, material trade-offs and the notes that make the board buildable as designed.
        </p>
      </header>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-medium">HSD-REF-01 · 8-layer stackup</h2>
            <span className="mono text-[12.5px] text-[var(--muted)]">{total.toFixed(1)} mil ≈ {(total * 0.0254).toFixed(2)} mm</span>
          </div>
          <div className="mt-4 space-y-[3px]">
            {STACKUP.map((l) => (
              <div key={l.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
                <div className="flex items-center gap-3 overflow-hidden rounded-md" style={{ background: KIND_COLOR[l.kind], minHeight: Math.max(18, l.thicknessMil * 2.2) }}>
                  <span className={`truncate px-3 text-[12.5px] ${l.kind === "signal" || l.kind === "plane" ? "font-medium text-black/80" : "text-[var(--text)]"}`}>{l.name}</span>
                </div>
                <span className="mono w-[110px] text-right text-[11.5px] text-[var(--muted)]">{l.thicknessMil} mil{l.dk ? ` · Dk ${l.dk}` : ""}{l.copperOz ? ` · ${l.copperOz} oz` : ""}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {STACKUP.filter((l) => l.note).map((l) => (
            <div key={l.id} className="flex gap-3 border-b border-[var(--line)] pb-3 last:border-b-0">
              <span className="mono w-10 shrink-0 text-[12.5px] text-[var(--copper)]">{l.id}</span>
              <p className="text-[13.5px] leading-relaxed text-[var(--muted)]">{l.note}</p>
            </div>
          ))}
          <Link href="/labs/impedance/" className="inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent)] hover:underline">Calculate impedances for this stackup <ArrowRight size={14} /></Link>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="text-[24px] font-semibold tracking-tight">Laminate choice: loss vs. cost</h2>
        <p className="mt-2 max-w-3xl text-[14.5px] text-[var(--muted)]">Estimated attenuation of a 5 mil, 85 Ω stripline with RTF copper — the same model used in the channel lab. Representative values; use your laminate's construction-specific data.</p>
        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)]">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <thead className="bg-[var(--panel)] text-[11.5px] uppercase tracking-wider text-[var(--faint)]">
              <tr>
                <th className="px-4 py-3 font-medium">Class</th><th className="px-4 py-3 font-medium">Example</th><th className="px-4 py-3 font-medium">Dk</th><th className="px-4 py-3 font-medium">Df</th>
                <th className="px-4 py-3 font-medium">dB/in @ 4 GHz</th><th className="px-4 py-3 font-medium">@ 8 GHz</th><th className="px-4 py-3 font-medium">@ 16 GHz</th><th className="px-4 py-3 font-medium">Rel. cost</th>
              </tr>
            </thead>
            <tbody>
              {LAMINATES.map((l) => (
                <tr key={l.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 text-[var(--text)]">{l.name}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">{l.example}</td>
                  <td className="mono px-4 py-3">{l.dk}</td>
                  <td className="mono px-4 py-3">{l.df}</td>
                  {[4, 8, 16].map((f) => <td key={f} className="mono px-4 py-3 text-[var(--accent-2)]">{lossAt(l.dk, l.df, f).toFixed(2)}</td>)}
                  <td className="mono px-4 py-3 text-[var(--muted)]">{l.relCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="flex items-center gap-2 text-[24px] font-semibold tracking-tight"><FileText size={20} className="text-[var(--accent)]" /> Fab notes (template)</h2>
          <p className="mt-2 text-[14.5px] text-[var(--muted)]">Specify requirements and let the fab choose the means. Ambiguity here is the most common reason a board doesn&apos;t match its simulation.</p>
          <pre className="thin-scroll mono mt-4 overflow-x-auto rounded-xl border border-[var(--line)] bg-[#04060a] p-5 text-[12.5px] leading-relaxed text-[#c3cddb]">{FAB_NOTES}</pre>
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="flex items-center gap-2 text-[20px] font-semibold tracking-tight"><Ruler size={18} className="text-[var(--power)]" /> Typical tolerances</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
              {TOLERANCES.map(([a, b, c]) => (
                <div key={a} className="border-b border-[var(--line)] px-4 py-3 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13.5px] text-[var(--text)]">{a}</span>
                    <span className="mono text-[12.5px] text-[var(--accent)]">{b}</span>
                  </div>
                  <div className="text-[12px] text-[var(--faint)]">{c}</div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-[var(--faint)]">Typical capability; confirm with your fabricator&apos;s capability sheet.</p>
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="flex items-center gap-2 text-[18px] font-medium"><CheckSquare size={18} className="text-[var(--ok)]" /> DFM review checklist</h2>
          <ul className="mt-4 space-y-2.5">
            {DFM.map((d) => <li key={d} className="flex gap-2.5 text-[13.5px] text-[var(--muted)]"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-sm border border-[var(--ok)]" />{d}</li>)}
          </ul>
        </div>
        <div className="panel p-6">
          <h2 className="text-[18px] font-medium">Coupons: the board that tests the board</h2>
          <div className="lesson mt-3 space-y-3 text-[14px]">
            <p><strong>Impedance coupons</strong> replicate each controlled structure (same layer, width, spacing, reference) on the panel rail. The fab measures them with TDR and ships the report.</p>
            <p><strong>2x-thru coupons</strong> — like J6/J7 on HSD-REF-01 — let you characterize and de-embed launches, then extract the real Dk/Df and loss of the as-built material.</p>
            <p><strong>Backdrill coupons</strong> verify residual stub length by cross-section on a sample basis.</p>
          </div>
          <Link href="/measurement/" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--accent)] hover:underline">How we measure them <ArrowRight size={14} /></Link>
        </div>
      </section>
    </div>
  );
}
