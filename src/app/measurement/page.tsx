import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Cable, Gauge, Radar, ScanLine, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Measurement & Correlation",
  description: "Validating high-speed PCBs: TDR, VNA calibration and de-embedding, real-time oscilloscopes, PDN measurements and simulation-to-measurement correlation.",
};

const INSTRUMENTS = [
  { icon: ScanLine, name: "TDR / TDT", use: "Impedance profile, discontinuity location, coupon verification", watch: "Rise time sets resolution; apply the same filter to simulation" },
  { icon: Radar, name: "Vector network analyzer", use: "S-parameters (IL, RL, NEXT/FEXT, mode conversion), Dk/Df extraction", watch: "Calibration plane, de-embedding, frequency range ≥ 2–3× Nyquist" },
  { icon: Activity, name: "Real-time oscilloscope", use: "Eye diagrams, jitter decomposition, compliance tests, DDR read/write eyes", watch: "Bandwidth ≥ ~2.5× Nyquist, probe loading, trigger/separation" },
  { icon: Zap, name: "PDN measurement", use: "Rail impedance (2-port shunt-through), ripple and load-step droop", watch: "Ground-loop error at mΩ levels; use a common-mode isolator" },
  { icon: Cable, name: "Probes & fixtures", use: "Solder-in / browser differential probes, interposers, SMA launches", watch: "Every fixture is part of the measurement until de-embedded" },
  { icon: Gauge, name: "Near-field probes", use: "Locate EMI sources: common-mode on pairs, regulator hot-loops, MagJack area", watch: "Relative comparisons only — not compliance" },
];

const FLOW = [
  ["Plan", "Define what to measure, at which reference plane, with which acceptance criteria — before the board is built."],
  ["Calibrate", "SOLT/TRL or e-cal at the cable ends; verify with a known standard."],
  ["Characterize fixtures", "Measure the 2x-thru coupon to model launches and traces you want to remove."],
  ["Measure the DUT", "Same setup, same settings; record environment and instrument state."],
  ["De-embed / gate", "Remove fixture effects (IEEE P370-style 2x-thru, AFR) or time-gate in TDR."],
  ["Compare & explain", "Overlay on simulation with matched bandwidth; attribute each difference to a physical cause."],
];

const CRITERIA = [
  ["Insertion loss", "within ≈ 0.5–1 dB up to Nyquist", "systematic slope → Df / roughness model"],
  ["Return loss / TDR", "within ≈ ±2–3 Ω on the line", "offset → etch, Dk or reference-plane mismatch"],
  ["Discontinuity location", "within a fraction of the rise time", "shift → Dk_eff or launch definition"],
  ["Eye height / width", "trend-level agreement, same equalization", "different → models (IBIS-AMI), jitter, crosstalk"],
  ["PDN |Z(f)|", "resonance frequencies within ≈ 10–20 %", "shift → mounting inductance or derating"],
];

export default function MeasurementPage() {
  return (
    <div className="container-x pb-24 pt-10 md:pt-14">
      <header className="max-w-3xl">
        <span className="eyebrow">Measurement</span>
        <h1 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight md:text-[44px]">A simulation you never measured is a hypothesis.</h1>
        <p className="mt-4 text-[16px] leading-relaxed text-[var(--muted)]">
          The last part of the program closes the loop: measure the fabricated board, compare with simulation and learn which models to trust. Methods are adapted to the equipment you have access to.
        </p>
      </header>

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INSTRUMENTS.map(({ icon: Icon, name, use, watch }) => (
          <div key={name} className="panel p-5">
            <Icon size={20} className="text-[var(--accent)]" />
            <h2 className="mt-3 text-[16px] font-medium">{name}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--muted)]">{use}</p>
            <p className="mt-3 border-t border-[var(--line)] pt-3 text-[12.5px] text-[var(--faint)]"><span className="text-[var(--power)]">Watch out · </span>{watch}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-[24px] font-semibold tracking-tight">Measurement workflow</h2>
        <ol className="mt-6 grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          {FLOW.map(([t, d], i) => (
            <li key={t} className="panel relative p-4">
              <span className="mono text-[11px] text-[var(--faint)]">STEP {i + 1}</span>
              <h3 className="mt-1 text-[14.5px] font-medium">{t}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted)]">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="correlation" className="mt-16 grid scroll-mt-24 gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h2 className="text-[24px] font-semibold tracking-tight">Correlation targets</h2>
          <p className="mt-2 text-[14.5px] text-[var(--muted)]">Rules of thumb used to decide whether a model is &quot;good enough&quot; — and where to look when it isn&apos;t.</p>
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--line)]">
            <table className="w-full min-w-[560px] text-left text-[13.5px]">
              <thead className="bg-[var(--panel)] text-[11.5px] uppercase tracking-wider text-[var(--faint)]">
                <tr><th className="px-4 py-3 font-medium">Metric</th><th className="px-4 py-3 font-medium">Typical agreement</th><th className="px-4 py-3 font-medium">If not, suspect…</th></tr>
              </thead>
              <tbody>
                {CRITERIA.map(([a, b, c]) => (
                  <tr key={a} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 text-[var(--text)]">{a}</td>
                    <td className="mono px-4 py-3 text-[12.5px] text-[var(--accent)]">{b}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel p-6">
          <h3 className="text-[16px] font-medium">Try it before the bench</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted)]">The TDR lab overlays a (synthetic) measured board on the simulation. Practice time-gating the fixture, matching rise times and explaining the residual error — then do the same with real data from your coupon.</p>
          <Link href="/labs/tdr/" className="btn btn-primary mt-5">Open the TDR lab <ArrowRight size={16} /></Link>
          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <h4 className="text-[13px] uppercase tracking-wider text-[var(--faint)]">Common sources of disagreement</h4>
            <ul className="mt-3 space-y-1.5 text-[13.5px] text-[var(--muted)]">
              {["Different reference planes in model and measurement", "Un-modeled launch / connector footprint", "Datasheet Dk/Df instead of as-built values", "Copper roughness model too optimistic", "Probe loading and bandwidth limits", "MLCC derating at DC bias (PDN)"].map((x) => (
                <li key={x} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--faint)]" />{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
