"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { CAP_TYPES, DEFAULT_PDN, planeCap, sweep, targetZ, type Mounting, type PdnParams } from "@/lib/si/pdn";
import { useCompute } from "@/lib/si/useCompute";
import Plot from "../ui/Plot";
import { Assumptions, ChartCard, Experiments, Field, Group, Legend, MentorNote, Segmented, Slider, Stat, Toggle } from "../ui/controls";
import LabShell from "./LabShell";

const RAILS = {
  core: { label: "VDD_CORE", vdd: 0.9, ripplePct: 3, stepA: 5 },
  vddq: { label: "VDDQ (DDR4)", vdd: 1.2, ripplePct: 5, stepA: 2.5 },
  io: { label: "3V3 I/O", vdd: 3.3, ripplePct: 5, stepA: 1 },
} as const;

export default function PdnLab() {
  const [rail, setRail] = useState<keyof typeof RAILS>("core");
  const [p, setP] = useState<PdnParams>(DEFAULT_PDN);
  const [view, setView] = useState<"board" | "die">("board");
  const [zoom, setZoom] = useState<"full" | "first">("full");
  const [rise, setRise] = useState(2);

  const pp: PdnParams = { ...p, includePkg: view === "die" };
  const zt = targetZ(pp);
  const sw = useMemo(() => sweep(pp, view), [pp, view]); // fast (< 2 ms)
  const swBoard = useMemo(() => (view === "die" ? sweep({ ...pp }, "board") : null), [pp, view]);
  const fMax = view === "die" ? 1e9 : 5e7;
  const viol = useMemo(() => {
    let worst = 0, fw = 0;
    for (let i = 0; i < sw.f.length; i++) {
      if (sw.f[i] > fMax) break;
      const r = sw.z[i] / zt;
      if (r > worst) { worst = r; fw = sw.f[i]; }
    }
    return { worst, fw };
  }, [sw, zt, fMax]);

  const req = { kind: "pdn" as const, p: { ...pp, includePkg: true }, view: "die" as const, rise };
  const { data: tr, busy } = useCompute<{ t: Float64Array; v: Float64Array; dt: number }>(req, JSON.stringify(req));
  const droop = useMemo(() => {
    if (!tr) return null;
    let mn = 0, mx = 0;
    for (const v of tr.v) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    return { min: mn * 1000, max: mx * 1000 };
  }, [tr]);
  const tol = p.vdd * p.ripplePct * 10; // mV

  const nCaps = CAP_TYPES.reduce((a, c) => a + (p.counts[c.id] ?? 0), 0);
  const setCount = (id: string, n: number) => setP({ ...p, counts: { ...p.counts, [id]: n } });
  const setRailP = (k: keyof typeof RAILS) => { setRail(k); setP({ ...p, vdd: RAILS[k].vdd, ripplePct: RAILS[k].ripplePct, stepA: RAILS[k].stepA }); };

  const experiments = [
    { title: "Find the violation", detail: "The default bank fails between ~1 and 30 MHz. Add 1 µF and 100 nF capacitors until the curve sits below the dashed target line.", apply: () => { setView("board"); setP({ ...DEFAULT_PDN }); setRail("core"); } },
    { title: "Mounting inductance beats capacitance", detail: "Switch mounting from 'short trace' to 'long trace'. Same capacitors, same count — but every MLCC resonance moves down and up. Then try via-in-pad.", apply: () => setP({ ...p, mounting: "long-trace" }) },
    { title: "Anti-resonance between values", detail: "Only 22 µF and 10 nF: the parallel resonance between them makes a sharp peak. Fill the gap with intermediate values instead of more of the same.", apply: () => setP({ ...p, counts: { bulk: 2, "22u": 4, "4u7": 0, "1u": 0, "100n": 0, "10n": 6 } }) },
    { title: "What the die actually sees", detail: "Switch to 'At die'. The package inductance resonates with on-die capacitance around 50–100 MHz — board capacitors cannot fix it; that is a package/silicon decision.", apply: () => setView("die") },
    { title: "Thin plane dielectric", detail: "Reduce PWR–GND spacing from 4 mil to 2 mil: more plane capacitance and less spreading inductance. Cheap at the stackup stage, impossible later.", apply: () => setP({ ...p, planeSpacingMil: 2 }) },
  ];

  const controls = (
    <>
      <Group title="Rail & load">
        <Segmented size="sm" value={rail} onChange={setRailP} options={Object.entries(RAILS).map(([k, v]) => ({ value: k as keyof typeof RAILS, label: v.label }))} />
        <Slider label="Voltage" value={p.vdd} min={0.6} max={3.3} step={0.05} unit="V" onChange={(v) => setP({ ...p, vdd: v })} />
        <Slider label="Allowed ripple" value={p.ripplePct} min={1} max={10} step={0.5} unit="%" onChange={(v) => setP({ ...p, ripplePct: v })} />
        <Slider label="Load step ΔI" value={p.stepA} min={0.5} max={20} step={0.5} unit="A" onChange={(v) => setP({ ...p, stepA: v })} />
        <Slider label="Load-step edge" value={rise} min={1} max={50} step={1} unit="ns" onChange={setRise} />
      </Group>
      <Group title="Decoupling bank">
        {CAP_TYPES.map((c) => (
          <Slider key={c.id} label={`${c.label} · ${c.pkg}`} value={p.counts[c.id] ?? 0} min={0} max={c.id === "bulk" ? 6 : 24} step={1} onChange={(v) => setCount(c.id, v)} />
        ))}
        <Field label="Capacitor mounting">
          <Segmented size="sm" value={p.mounting} onChange={(v: Mounting) => setP({ ...p, mounting: v })} options={[{ value: "via-in-pad", label: "Via-in-pad" }, { value: "short-trace", label: "Short trace" }, { value: "long-trace", label: "Long trace" }]} />
        </Field>
      </Group>
      <Group title="Planes & VRM" defaultOpen={false}>
        <Slider label="Plane-pair area" value={p.planeAreaCm2} min={5} max={150} step={5} unit="cm²" onChange={(v) => setP({ ...p, planeAreaCm2: v })} />
        <Slider label="PWR–GND spacing" value={p.planeSpacingMil} min={1} max={12} step={0.5} unit="mil" onChange={(v) => setP({ ...p, planeSpacingMil: v })} hint={`plane C ≈ ${(planeCap(p) * 1e9).toFixed(2)} nF`} />
        <Slider label="VRM effective L" value={p.vrmL * 1e9} min={2} max={60} step={1} unit="nH" onChange={(v) => setP({ ...p, vrmL: v * 1e-9 })} hint="set by the regulator's control-loop bandwidth" />
      </Group>
      <Group title="Observation point">
        <Toggle label="At die (include package)" checked={view === "die"} onChange={(v) => setView(v ? "die" : "board")} hint={`L_pkg ${(p.pkgL * 1e12).toFixed(0)} pH · C_die ${(p.dieC * 1e9).toFixed(0)} nF`} />
      </Group>
    </>
  );

  const zmin = 1e-4, zmax = 1;
  return (
    <LabShell
      eyebrow="Lab 04 · Power integrity"
      module="Module 4"
      title="PDN impedance & decoupling"
      intro={<p>A rail is stable when its impedance stays below <span className="mono text-[var(--text)]">Z_target = V · ripple / ΔI</span> over the frequencies the load current contains. Each capacitor only helps around its own series resonance — the art is choosing values, counts and mounting so the parallel combination stays flat.</p>}
      controls={controls}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Target impedance" value={(zt * 1000).toFixed(2)} unit="mΩ" sub={`${p.vdd} V · ${p.ripplePct}% · ${p.stepA} A`} />
        <Stat label="Worst |Z| / target" value={viol.worst.toFixed(2)} unit="×" tone={viol.worst <= 1 ? "ok" : viol.worst < 1.5 ? "warn" : "bad"} sub={viol.worst > 1 ? `at ${fmtF(viol.fw)}` : `up to ${fmtF(fMax)}`} />
        <Stat label="Peak droop" value={droop ? Math.abs(droop.min).toFixed(1) : "—"} unit="mV" tone={droop ? (Math.abs(droop.min) <= tol ? "ok" : "bad") : "neutral"} sub={`allowed ±${tol.toFixed(1)} mV`} />
        <Stat label="Capacitor count" value={`${nCaps}`} sub={`${p.mounting.replace("-", " ")} mounting`} />
      </div>

      <ChartCard
        title="PDN impedance |Z(f)|"
        sub={view === "die" ? "seen from the die (board + package + on-die capacitance)" : "seen from the BGA balls"}
        right={<Legend items={[{ color: "#f87171", label: "|Z| " + (view === "die" ? "at die" : "at BGA") }, ...(swBoard ? [{ color: "#5c6a7e", label: "at BGA", dash: true }] : []), { color: "#fbbf24", label: "target", dash: true }]} />}
      >
        <Plot
          ariaLabel="PDN impedance versus frequency"
          height={360}
          series={[
            ...(swBoard ? [{ x: swBoard.f, y: swBoard.z, color: "#5c6a7e", width: 1.5, dash: [5, 4] }] : []),
            { x: sw.f, y: sw.z, color: "#f87171", width: 2.2 },
          ]}
          xLog
          yLog
          xDomain={[1e3, 1e9]}
          yDomain={[zmin, zmax]}
          xLabel="frequency (Hz)"
          yLabel="|Z| (Ω)"
          xFmt={(v) => fmtF(v)}
          yFmt={(v) => (v >= 1 ? `${v} Ω` : `${+(v * 1000).toPrecision(3)} m`)}
          hlines={[{ v: zt, color: "#fbbf24", dash: true, label: `Z_target ${(zt * 1000).toFixed(2)} mΩ` }]}
          xBands={[{ from: fMax, to: 1e9, color: "rgba(148,163,184,0.04)" }]}
          hover={(f) => {
            let i = 0;
            while (i < sw.f.length - 1 && sw.f[i] < f) i++;
            return `${fmtF(sw.f[i])}\n|Z| ${(sw.z[i] * 1000).toFixed(2)} mΩ\n${(sw.z[i] / zt).toFixed(2)} × target`;
          }}
        />
      </ChartCard>

      <ChartCard
        title="Load-step response"
        sub={`voltage at the die · ${p.stepA} A step at t = 0.5 µs, ${rise} ns edge · tolerance ±${tol.toFixed(1)} mV`}
        right={
          <div className="flex items-center gap-2">
            {busy && <Loader2 size={15} className="animate-spin text-[var(--muted)]" />}
            <div className="w-[190px]"><Segmented size="sm" value={zoom} onChange={setZoom} options={[{ value: "full", label: "0–7 µs" }, { value: "first", label: "First 300 ns" }]} /></div>
          </div>
        }
      >
        {tr && (
          <Plot
            ariaLabel="Rail voltage deviation after a load step"
            height={260}
            series={[{ x: Array.from(tr.t, (t) => t * 1e6), y: Array.from(tr.v, (v) => v * 1000), color: "#38bdf8", width: 1.8 }]}
            xDomain={zoom === "full" ? [0, 7] : [0.45, 0.8]}
            yDomain={[Math.min(-tol * 1.6, (droop?.min ?? 0) * 1.15), Math.max(tol * 1.6, (droop?.max ?? 0) * 1.15)]}
            xLabel="time (µs)"
            yLabel="ΔV (mV)"
            xFmt={(v) => `${+v.toFixed(2)}`}
            yFmt={(v) => `${+v.toFixed(0)}`}
            yBands={[{ from: -tol, to: tol, color: "rgba(74,222,128,0.07)" }]}
            hlines={[{ v: -tol, color: "rgba(74,222,128,0.5)", dash: true, label: `−${tol.toFixed(1)} mV` }, { v: tol, color: "rgba(74,222,128,0.5)", dash: true }]}
          />
        )}
      </ChartCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Experiments items={experiments} />
        <div className="space-y-5">
          <MentorNote>
            <p><strong>Above a few MHz, capacitance stops mattering and inductance takes over.</strong> A 0402 capacitor with a long trace to its via is worse than a smaller value mounted via-in-pad. Count mounting loops, not microfarads.</p>
            <p><strong>Target impedance is a starting point, not a law.</strong> Real load current has a spectrum; time-domain droop with the actual current profile (from the SoC vendor) is the real acceptance test.</p>
          </MentorNote>
          <Assumptions
            items={[
              "Lumped model: each capacitor bank is an ideal series RLC; plane cavity resonances and spreading geometry are not spatially modeled.",
              "VRM is represented by R + L above its loop bandwidth; there is no control-loop dynamics.",
              "MLCC DC-bias and temperature derating are not applied — always derate per datasheet at the actual rail voltage.",
              "Package and die values are generic placeholders; use the SoC vendor's PDN model in real work.",
              "Transient uses a trapezoidal current step (no spectral load profile).",
            ]}
          />
        </div>
      </div>
    </LabShell>
  );
}

function fmtF(f: number) {
  if (f >= 1e9) return `${+(f / 1e9).toPrecision(3)} GHz`;
  if (f >= 1e6) return `${+(f / 1e6).toPrecision(3)} MHz`;
  if (f >= 1e3) return `${+(f / 1e3).toPrecision(3)} kHz`;
  return `${f} Hz`;
}
