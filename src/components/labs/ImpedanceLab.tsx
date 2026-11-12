"use client";

import { Crosshair } from "lucide-react";
import { useMemo, useState } from "react";
import { monteCarlo, solve, solveWidth, type Geometry, type Structure } from "@/lib/si/impedance";
import Plot from "../ui/Plot";
import { Assumptions, ChartCard, Experiments, Field, Group, MentorNote, Segmented, Slider, Stat } from "../ui/controls";
import LabShell from "./LabShell";

const STRUCT_LABEL: Record<Structure, string> = {
  microstrip: "Microstrip (outer)",
  stripline: "Stripline (centered)",
  "dual-stripline": "Offset stripline",
};

export default function ImpedanceLab() {
  const [g, setG] = useState<Geometry>({ structure: "microstrip", w: 7, s: 6, t: 1.9, h1: 3.2, h2: 5.5, dk: 3.6, etch: 0.5 });
  const [diff, setDiff] = useState(true);
  const [target, setTarget] = useState(85);
  const [tolPct, setTolPct] = useState(10);
  const r = useMemo(() => solve(g), [g]);
  const z = diff ? r.zdiff : r.z0;
  const err = ((z - target) / target) * 100;

  const mc = useMemo(() => monteCarlo(g, diff, 2500), [g, diff]);
  const hist = useMemo(() => {
    const lo = target * 0.75, hi = target * 1.25, bins = 60;
    const counts = new Float64Array(bins);
    let inTol = 0;
    for (const v of mc) {
      const b = Math.floor(((v - lo) / (hi - lo)) * bins);
      if (b >= 0 && b < bins) counts[b]++;
      if (Math.abs(v - target) <= (target * tolPct) / 100) inTol++;
    }
    const x = Array.from({ length: bins }, (_, i) => lo + ((i + 0.5) * (hi - lo)) / bins);
    const max = Math.max(...counts);
    let mean = 0;
    for (const v of mc) mean += v;
    mean /= mc.length;
    let sd = 0;
    for (const v of mc) sd += (v - mean) ** 2;
    sd = Math.sqrt(sd / mc.length);
    return { x, y: Array.from(counts, (c) => c / max), yieldPct: (inTol / mc.length) * 100, mean, sd, lo, hi };
  }, [mc, target, tolPct]);

  const fitWidth = () => setG({ ...g, w: +solveWidth(g, target, diff).toFixed(2) });

  const presets = [
    { label: "L1 · 85 Ω PCIe", g: { structure: "microstrip" as const, t: 1.9, h1: 3.2, dk: 3.6, s: 6 }, t: 85 },
    { label: "L3 · 85 Ω stripline", g: { structure: "dual-stripline" as const, t: 0.6, h1: 5, h2: 5.5, dk: 3.7, s: 6 }, t: 85 },
    { label: "L1 · 90 Ω USB", g: { structure: "microstrip" as const, t: 1.9, h1: 3.2, dk: 3.6, s: 7 }, t: 90 },
    { label: "L1 · 100 Ω HDMI/MIPI", g: { structure: "microstrip" as const, t: 1.9, h1: 3.2, dk: 3.6, s: 8 }, t: 100 },
    { label: "L1 · 40 Ω DDR4 SE", g: { structure: "microstrip" as const, t: 1.9, h1: 3.2, dk: 3.6, s: 6 }, t: 40, se: true },
  ];

  const experiments = [
    { title: "Hit 85 Ω on the top layer", detail: "Load the L1 PCIe preset, then press 'Solve width' — this is how a stackup is closed with the fab before layout starts.", apply: () => { const p = presets[0]; const ng = { ...g, ...p.g }; setDiff(true); setTarget(85); setG({ ...ng, w: +solveWidth(ng, 85, true).toFixed(2) }); } },
    { title: "Why thin prepreg matters", detail: "Double the dielectric height h₁ from 3.2 to 6.4 mil. To keep 85 Ω the trace must get much wider — bad for BGA breakout density.", apply: () => setG({ ...g, structure: "microstrip", h1: 6.4 }) },
    { title: "Loose vs. tight coupling", detail: "Increase spacing s from 5 to 15 mil. Zdiff approaches 2×Z0 — the pair is barely coupled and will be more sensitive to nearby aggressors.", apply: () => { setDiff(true); setG({ ...g, s: 15 }); } },
    { title: "Manufacturing yield", detail: "Watch the histogram: ±0.5 mil etch tolerance on a 4 mil trace moves Z far more than on an 8 mil trace. Narrow traces cost yield.", apply: () => { setG({ ...g, structure: "dual-stripline", w: 3.6, h1: 4, h2: 4, t: 0.6, dk: 3.7 }); setTolPct(10); } },
  ];

  const controls = (
    <>
      <Group title="Structure">
        <Segmented size="sm" value={g.structure} onChange={(v) => setG({ ...g, structure: v })} options={(Object.keys(STRUCT_LABEL) as Structure[]).map((k) => ({ value: k, label: k === "microstrip" ? "Microstrip" : k === "stripline" ? "Stripline" : "Offset SL" }))} />
        <div className="mt-2">
          <Segmented size="sm" value={diff ? "d" : "s"} onChange={(v) => setDiff(v === "d")} options={[{ value: "d", label: "Differential" }, { value: "s", label: "Single-ended" }]} />
        </div>
        <Field label="Quick presets (HSD-REF-01 stackup)">
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.label} type="button" className="chip hover:!text-[var(--text)] hover:!border-[var(--line-2)]" onClick={() => { const ng = { ...g, ...p.g }; setDiff(!p.se); setTarget(p.t); setG({ ...ng, w: +solveWidth(ng, p.t, !p.se).toFixed(2) }); }}>
                {p.label}
              </button>
            ))}
          </div>
        </Field>
      </Group>
      <Group title="Geometry (mil)">
        <Slider label="Trace width w" value={g.w} min={2} max={20} step={0.05} unit="mil" fmt={(v) => v.toFixed(2)} onChange={(v) => setG({ ...g, w: v })} />
        {diff && <Slider label="Spacing s (edge-edge)" value={g.s} min={3} max={25} step={0.25} unit="mil" onChange={(v) => setG({ ...g, s: v })} />}
        <Slider label={g.structure === "microstrip" ? "Height to plane h₁" : "Height to near plane h₁"} value={g.h1} min={2} max={12} step={0.1} unit="mil" onChange={(v) => setG({ ...g, h1: v })} />
        {g.structure === "dual-stripline" && <Slider label="Height to far plane h₂" value={g.h2} min={2} max={20} step={0.1} unit="mil" onChange={(v) => setG({ ...g, h2: v })} />}
        <Slider label="Copper thickness t" value={g.t} min={0.4} max={2.8} step={0.05} unit="mil" hint="0.5 oz ≈ 0.6 mil · 1 oz ≈ 1.2 mil · outer layers add plating" onChange={(v) => setG({ ...g, t: v })} />
        <Slider label="Etch factor (w − w_top)" value={g.etch} min={0} max={2} step={0.05} unit="mil" onChange={(v) => setG({ ...g, etch: v })} />
        <Slider label="Dielectric constant Dk" value={g.dk} min={3} max={4.6} step={0.01} onChange={(v) => setG({ ...g, dk: v })} hint="use the resin-content-specific value from the laminate datasheet" />
      </Group>
      <Group title="Target">
        <Slider label="Target impedance" value={target} min={30} max={120} step={1} unit="Ω" onChange={setTarget} />
        <Slider label="Fab tolerance" value={tolPct} min={5} max={15} step={1} unit="%" onChange={setTolPct} />
        <button type="button" onClick={fitWidth} className="btn btn-primary mt-2 w-full justify-center !h-9"><Crosshair size={15} /> Solve width for {target} Ω</button>
      </Group>
    </>
  );

  return (
    <LabShell
      eyebrow="Lab 01 · Stackup"
      module="Module 2"
      title="Stackup & controlled impedance"
      intro={<p>Before a single trace is routed, the stackup and trace geometry must be agreed with the fabricator. This lab uses closed-form models — the same equations behind most online calculators — and shows why the final word belongs to a field solver and the fab's own modeling.</p>}
      controls={controls}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={diff ? "Zdiff" : "Z0"} value={z.toFixed(1)} unit="Ω" tone={Math.abs(err) <= 3 ? "ok" : Math.abs(err) <= tolPct ? "warn" : "bad"} sub={`${err >= 0 ? "+" : ""}${err.toFixed(1)} % vs target`} />
        <Stat label={diff ? "Z odd ≈ Zdiff/2" : "Z0 (single)"} value={(diff ? r.zdiff / 2 : r.z0).toFixed(1)} unit="Ω" sub={`uncoupled Z0 ${r.z0.toFixed(1)} Ω`} />
        <Stat label="Effective Dk" value={r.eeff.toFixed(2)} sub={g.structure === "microstrip" ? "fields partly in air" : "fully embedded"} />
        <Stat label="Propagation delay" value={r.tpdPsPerIn.toFixed(0)} unit="ps/in" sub={`${(r.tpdPsPerIn / 25.4).toFixed(2)} ps/mm`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <ChartCard title="Cross-section" sub={STRUCT_LABEL[g.structure] + (diff ? " · edge-coupled pair" : "")}>
          <CrossSection g={g} diff={diff} />
        </ChartCard>
        <ChartCard title="Fabrication spread (Monte-Carlo)" sub="2500 builds: w ±0.5 mil, h ±8 %, Dk ±4 %, t ±15 % (3σ)">
          <Plot
            ariaLabel="Histogram of impedance across fabrication tolerances"
            height={238}
            series={[{ x: hist.x, y: hist.y, color: "#2dd4bf", width: 1.5, fill: "rgba(45,212,191,0.18)" }]}
            xDomain={[hist.lo, hist.hi]}
            yDomain={[0, 1.1]}
            xLabel="impedance (Ω)"
            yLabel="relative count"
            xFmt={(v) => `${Math.round(v)}`}
            yFmt={() => ""}
            xBands={[{ from: target * (1 - tolPct / 100), to: target * (1 + tolPct / 100), color: "rgba(74,222,128,0.07)" }]}
            vlines={[{ v: target, color: "rgba(231,237,245,0.6)", label: `target ${target} Ω`, dash: true }]}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 px-1 text-[12.5px]">
            <div><div className="text-[var(--faint)]">Yield in ±{tolPct}%</div><div className={`mono text-[15px] ${hist.yieldPct > 99 ? "text-[var(--ok)]" : hist.yieldPct > 90 ? "text-[var(--power)]" : "text-[var(--danger)]"}`}>{hist.yieldPct.toFixed(1)} %</div></div>
            <div><div className="text-[var(--faint)]">Mean</div><div className="mono text-[15px]">{hist.mean.toFixed(1)} Ω</div></div>
            <div><div className="text-[var(--faint)]">σ</div><div className="mono text-[15px]">{hist.sd.toFixed(2)} Ω</div></div>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Experiments items={experiments} />
        <div className="space-y-5">
          <MentorNote>
            <p><strong>The fab owns the final numbers.</strong> Send them target impedances, layers and reference planes — not trace widths. They adjust widths for their actual prepreg pressed thickness and resin content, then confirm with impedance coupons on the panel.</p>
            <p><strong>Tightly coupled vs. loosely coupled pairs</strong> is a trade-off: tight coupling keeps the pair compact and rejects common-mode noise, loose coupling is more forgiving to spacing variation. Both are fine if the field solver and the fab agree.</p>
          </MentorNote>
          <Assumptions
            items={[
              "Microstrip uses Hammerstad–Jensen with thickness correction (≈1–2 % vs. field solver); soldermask is not included (typically −1 to −3 Ω).",
              "Stripline uses Wheeler's thick-strip formula; offset stripline combines two symmetric solutions (IPC-2141 method).",
              "Differential coupling factors are empirical IPC-2141 fits (±5–8 %).",
              "Dk is assumed frequency-independent; glass-weave and resin-rich regions are not modeled.",
              "Trapezoidal etching is approximated by the average trace width.",
            ]}
          />
        </div>
      </div>
    </LabShell>
  );
}

function CrossSection({ g, diff }: { g: Geometry; diff: boolean }) {
  // scale: fit the structure in a 560×250 viewbox
  const W = 560, H = 250;
  const total = g.structure === "microstrip" ? g.h1 + g.t + 6 : g.h1 + g.t + (g.structure === "stripline" ? g.h1 : g.h2);
  const width = diff ? 2 * g.w + g.s : g.w;
  const k = Math.min((H - 70) / total, (W - 140) / Math.max(width * 1.8, 20));
  const cx = W / 2;
  const planeH = 9;
  const yTopPlane = 30;
  const cuY = g.structure === "microstrip" ? H - 40 - planeH - g.h1 * k - g.t * k : yTopPlane + planeH + (g.structure === "stripline" ? g.h1 : g.h2) * k;
  const bottomPlaneY = g.structure === "microstrip" ? H - 40 - planeH : cuY + g.t * k + g.h1 * k;
  const traces = diff ? [cx - (g.s / 2 + g.w) * k, cx + (g.s / 2) * k] : [cx - (g.w / 2) * k];
  const topW = Math.max(0.3, g.w - g.etch) * k;
  const dim = (x1: number, x2: number, y: number, label: string) => (
    <g>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke="#8d9aae" strokeWidth="1" markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={(x1 + x2) / 2} y={y - 5} textAnchor="middle" fontSize="11" fill="#8d9aae" className="mono">{label}</text>
    </g>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Trace cross-section">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#8d9aae" /></marker>
        <linearGradient id="cu" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f0b07c" /><stop offset="1" stopColor="#c9804e" /></linearGradient>
        <pattern id="glass" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 L8 0" stroke="rgba(201,183,122,0.08)" strokeWidth="1" /></pattern>
      </defs>
      {/* dielectric */}
      <rect x="40" y={g.structure === "microstrip" ? cuY + g.t * k : yTopPlane + planeH} width={W - 80} height={g.structure === "microstrip" ? bottomPlaneY - cuY - g.t * k : bottomPlaneY - yTopPlane - planeH} fill="rgba(201,183,122,0.14)" />
      <rect x="40" y={g.structure === "microstrip" ? cuY + g.t * k : yTopPlane + planeH} width={W - 80} height={g.structure === "microstrip" ? bottomPlaneY - cuY - g.t * k : bottomPlaneY - yTopPlane - planeH} fill="url(#glass)" />
      {g.structure !== "microstrip" && <rect x="40" y={yTopPlane} width={W - 80} height={planeH} fill="url(#cu)" opacity="0.85" />}
      <rect x="40" y={bottomPlaneY} width={W - 80} height={planeH} fill="url(#cu)" opacity="0.85" />
      <text x="46" y={bottomPlaneY + planeH + 14} fontSize="11" fill="#5c6a7e" className="mono">GND reference</text>
      {g.structure !== "microstrip" && <text x="46" y={yTopPlane - 6} fontSize="11" fill="#5c6a7e" className="mono">GND / PWR reference</text>}
      {traces.map((x, i) => (
        <path key={i} d={`M${x},${cuY + g.t * k} L${x + g.w * k},${cuY + g.t * k} L${x + g.w * k - (g.w * k - topW) / 2},${cuY} L${x + (g.w * k - topW) / 2},${cuY} Z`} fill="url(#cu)" />
      ))}
      {diff && <text x={cx} y={cuY - 26} textAnchor="middle" fontSize="11" fill="#2dd4bf" className="mono">P · N</text>}
      {dim(traces[0], traces[0] + g.w * k, cuY - 10, `w ${g.w.toFixed(2)}`)}
      {diff && dim(traces[0] + g.w * k, traces[1], cuY + g.t * k + 16, `s ${g.s}`)}
      {/* h1 dimension */}
      <line x1={W - 70} x2={W - 70} y1={g.structure === "microstrip" ? cuY + g.t * k : cuY + g.t * k} y2={bottomPlaneY} stroke="#8d9aae" markerStart="url(#arr)" markerEnd="url(#arr)" />
      <text x={W - 64} y={(cuY + g.t * k + bottomPlaneY) / 2 + 4} fontSize="11" fill="#8d9aae" className="mono">h₁ {g.h1}</text>
      {g.structure === "dual-stripline" && (
        <>
          <line x1={W - 70} x2={W - 70} y1={yTopPlane + planeH} y2={cuY} stroke="#8d9aae" markerStart="url(#arr)" markerEnd="url(#arr)" />
          <text x={W - 64} y={(yTopPlane + planeH + cuY) / 2 + 4} fontSize="11" fill="#8d9aae" className="mono">h₂ {g.h2}</text>
        </>
      )}
      <text x="46" y={g.structure === "microstrip" ? cuY - 30 : yTopPlane + planeH + 16} fontSize="11" fill="#5c6a7e" className="mono">Dk {g.dk.toFixed(2)}</text>
    </svg>
  );
}
