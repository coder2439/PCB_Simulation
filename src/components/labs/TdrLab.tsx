"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { resolutionMm, type Segment, type TdrResult, type Termination } from "@/lib/si/tdr";
import { useCompute } from "@/lib/si/useCompute";
import Plot from "../ui/Plot";
import { Assumptions, ChartCard, Experiments, Field, Group, Legend, MentorNote, Segmented, Slider, Stat, Toggle } from "../ui/controls";
import LabShell from "./LabShell";

type Out = TdrResult & { measured: TdrResult | null };

const RISES = [10, 17, 35, 50, 100, 200];

export default function TdrLab() {
  const [z, setZ] = useState({ launch: 116, trace1: 100, via: 66, trace2: 97, cap: 78, conn: 118 });
  const [rise, setRise] = useState(35);
  const [term, setTerm] = useState<Termination>("matched");
  const [ideal, setIdeal] = useState(true);
  const [measured, setMeasured] = useState(false);
  const [gate, setGate] = useState(false);

  const segs: Segment[] = useMemo(
    () => [
      { id: "cable", name: "Instrument cable", z: 100, ps: 220, color: "rgba(148,163,184,0.05)", kind: "line" },
      { id: "launch", name: "SMA launch", z: z.launch, ps: 28, color: "rgba(56,189,248,0.16)", kind: "disc" },
      { id: "t1", name: "Microstrip L1", z: z.trace1, ps: 260, color: "rgba(148,163,184,0.03)", kind: "line" },
      { id: "via", name: "Via L1→L3", z: z.via, ps: 14, color: "rgba(251,191,36,0.2)", kind: "disc" },
      { id: "t2", name: "Stripline L3", z: z.trace2, ps: 420, color: "rgba(148,163,184,0.05)", kind: "line" },
      { id: "cap", name: "AC-cap pads", z: z.cap, ps: 10, color: "rgba(244,114,182,0.22)", kind: "disc" },
      { id: "t3", name: "Microstrip L1", z: 100, ps: 150, color: "rgba(148,163,184,0.03)", kind: "line" },
      { id: "conn", name: "Connector", z: z.conn, ps: 42, color: "rgba(167,139,250,0.2)", kind: "disc" },
      { id: "load", name: "Cable / load side", z: 100, ps: 160, color: "rgba(148,163,184,0.05)", kind: "line" },
    ],
    [z],
  );
  // a "measured" board: etch +4 %, via slightly more capacitive, different real launch, 35 ps scope
  const mSegs: Segment[] = useMemo(
    () => segs.map((s) => ({
      ...s,
      z: s.id === "t1" || s.id === "t2" || s.id === "t3" ? s.z * 1.035 : s.id === "via" ? s.z - 4 : s.id === "launch" ? s.z + 9 : s.z,
    })),
    [segs],
  );

  const req = { kind: "tdr" as const, segs, term, z0: 100, rise, measured: measured ? { segs: mSegs, rise: 35 } : undefined };
  const { data, busy } = useCompute<Out>(req, JSON.stringify(req));

  const gateStart = 2 * (220 + 28 + 12); // after the launch, round-trip ps
  const series = useMemo(() => {
    if (!data) return [];
    const s = [];
    if (ideal) s.push({ x: data.t, y: data.zIdeal, color: "rgba(141,154,174,0.55)", width: 1.25, dash: [4, 4] });
    s.push({ x: data.t, y: data.z, color: "#2dd4bf", width: 2.2 });
    if (data.measured) {
      const m = data.measured;
      if (gate) {
        const t = m.t.filter((tt) => tt >= gateStart);
        const off = m.t.length - t.length;
        s.push({ x: t, y: m.z.slice(off), color: "#fbbf24", width: 1.75 });
      } else s.push({ x: m.t, y: m.z, color: "#fbbf24", width: 1.75 });
    }
    return s;
  }, [data, ideal, gate, gateStart]);

  const corr = useMemo(() => {
    if (!data?.measured) return null;
    let se = 0, n = 0, maxE = 0;
    const end = data.bounds[data.bounds.length - 2].t1;
    for (let i = 0; i < data.t.length; i++) {
      if (data.t[i] < (gate ? gateStart : 440) || data.t[i] > end) continue;
      const e = data.measured.z[i] - data.z[i];
      se += e * e; n++;
      maxE = Math.max(maxE, Math.abs(e));
    }
    return { rms: Math.sqrt(se / Math.max(1, n)), max: maxE };
  }, [data, gate, gateStart]);

  const viaMin = useMemo(() => {
    if (!data) return null;
    const b = data.bounds.find((x) => x.id === "via")!;
    let m = Infinity;
    for (let i = 0; i < data.t.length; i++) if (data.t[i] > b.t0 - 60 && data.t[i] < b.t1 + 60) m = Math.min(m, data.z[i]);
    return m;
  }, [data]);

  const tMax = data ? data.t[data.t.length - 1] : 2600;
  const yMax = term === "open" ? 200 : 150;
  const yMin = term === "short" ? 0 : 50;
  const res = resolutionMm(rise, 3.7);

  const experiments = [
    { title: "Rise time sets resolution", detail: "Switch to a 200 ps edge: the via dip (14 ps long) almost vanishes and its depth is badly under-reported. Then go to 17 ps.", apply: () => { setRise(200); setTerm("matched"); } },
    { title: "Fix the via with anti-pads", detail: "A 66 Ω via is too capacitive. Larger anti-pads and removed non-functional pads raise it toward 92 Ω — try it on the via slider.", apply: () => { setRise(17); setZ((v) => ({ ...v, via: 66 })); } },
    { title: "Find the end of the line", detail: "Open and short terminations make the far end obvious: everything after it is just the instrument waiting for reflections to settle.", apply: () => setTerm("open") },
    { title: "Correlate with a measured board", detail: "Overlay a (synthetic) measured board. The launch differs and traces are 3.5 % high from etching — then time-gate the fixture out to compare only the DUT.", apply: () => { setMeasured(true); setGate(false); setRise(35); setTerm("matched"); } },
  ];

  const controls = (
    <>
      <Group title="Instrument">
        <Field label="Rise time (10–90 %)">
          <Segmented size="sm" value={rise} onChange={setRise} options={RISES.map((r) => ({ value: r, label: `${r}` }))} />
        </Field>
        <p className="-mt-0.5 text-[11.5px] text-[var(--faint)]">ps · resolution ≈ {res.toFixed(1)} mm in Dk 3.7</p>
        <Field label="Far-end termination">
          <Segmented size="sm" value={term} onChange={setTerm} options={[{ value: "matched", label: "100 Ω" }, { value: "rx50", label: "RX 90 Ω" }, { value: "open", label: "Open" }, { value: "short", label: "Short" }]} />
        </Field>
        <Toggle label="Show ideal (infinite bandwidth)" checked={ideal} onChange={setIdeal} />
      </Group>
      <Group title="Discontinuities (Ω differential)">
        <Slider label="SMA launch" value={z.launch} min={85} max={135} step={1} unit="Ω" onChange={(v) => setZ({ ...z, launch: v })} hint="pad/pin inductance → high-Z spike" />
        <Slider label="Microstrip L1" value={z.trace1} min={85} max={115} step={1} unit="Ω" onChange={(v) => setZ({ ...z, trace1: v })} />
        <Slider label="Via L1→L3" value={z.via} min={50} max={100} step={1} unit="Ω" onChange={(v) => setZ({ ...z, via: v })} hint="barrel + pad capacitance → low-Z dip" />
        <Slider label="Stripline L3" value={z.trace2} min={85} max={115} step={1} unit="Ω" onChange={(v) => setZ({ ...z, trace2: v })} />
        <Slider label="AC-cap pads" value={z.cap} min={60} max={100} step={1} unit="Ω" onChange={(v) => setZ({ ...z, cap: v })} hint="void the plane under the pads → ~95 Ω" />
        <Slider label="Connector" value={z.conn} min={90} max={135} step={1} unit="Ω" onChange={(v) => setZ({ ...z, conn: v })} />
      </Group>
      <Group title="Correlation">
        <Toggle label="Overlay measured board" checked={measured} onChange={setMeasured} hint="synthetic data for teaching, not a real measurement" />
        {measured && <Toggle label="Time-gate the fixture" checked={gate} onChange={setGate} hint="removes launch effects before comparing" />}
      </Group>
    </>
  );

  return (
    <LabShell
      eyebrow="Lab 03 · Measurement"
      module="Module 5–6"
      title="TDR: seeing impedance in time"
      intro={<p>A step travels down the channel and every impedance change reflects part of it back. Time on the display is round-trip time, so a feature 10 mm into a stripline shows up ≈ 130 ps after the launch. The instrument&apos;s rise time decides what you can and cannot see.</p>}
      controls={controls}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Spatial resolution" value={res.toFixed(1)} unit="mm" sub={`${rise} ps edge`} />
        <Stat label="Via reads as" value={viaMin ? viaMin.toFixed(0) : "—"} unit="Ω" tone={viaMin && Math.abs(viaMin - z.via) > 6 ? "warn" : "neutral"} sub={`actual ${z.via} Ω`} />
        <Stat label="Worst deviation" value={data ? Math.max(...[z.launch, z.via, z.cap, z.conn].map((v) => Math.abs(v - 100))).toFixed(0) : "—"} unit="Ω" sub="from 100 Ω" />
        <Stat label="Sim ↔ measured" value={corr ? corr.rms.toFixed(1) : "—"} unit="Ω rms" tone={corr ? (corr.rms < 2 ? "ok" : corr.rms < 4 ? "warn" : "bad") : "neutral"} sub={corr ? `max ${corr.max.toFixed(1)} Ω` : "enable overlay"} />
      </div>

      <ChartCard
        title="Differential impedance profile"
        sub="round-trip time · segments shaded underneath"
        right={
          <div className="flex items-center gap-3">
            {busy && <Loader2 size={15} className="animate-spin text-[var(--muted)]" />}
            <Legend items={[{ color: "#2dd4bf", label: `simulated (${rise} ps)` }, ...(ideal ? [{ color: "rgba(141,154,174,0.8)", label: "ideal", dash: true }] : []), ...(measured ? [{ color: "#fbbf24", label: gate ? "measured (gated)" : "measured" }] : [])]} />
          </div>
        }
      >
        {data && (
          <Plot
            ariaLabel="TDR impedance versus time"
            height={380}
            series={series}
            xDomain={[300, Math.min(tMax, 2780)]}
            yDomain={[yMin, yMax]}
            xLabel="round-trip time (ps)"
            yLabel="Zdiff (Ω)"
            xFmt={(v) => `${v}`}
            yFmt={(v) => `${v}`}
            xBands={data.bounds.filter((b) => b.id !== "cable").map((b) => ({ from: b.t0, to: b.t1, color: b.color }))}
            hlines={[{ v: 100, color: "rgba(231,237,245,0.25)", dash: true }, { v: 110, color: "rgba(74,222,128,0.25)", dash: true, label: "±10 %" }, { v: 90, color: "rgba(74,222,128,0.25)", dash: true }]}
            vlines={gate && measured ? [{ v: gateStart, color: "#fbbf24", label: "gate", dash: true }] : []}
            hover={(x) => {
              const i = Math.round(x);
              if (i < 0 || i >= data.t.length) return null;
              const seg = data.bounds.find((b) => x >= b.t0 && x < b.t1);
              return `${x.toFixed(0)} ps · ${seg?.name ?? ""}\nsim ${data.z[i].toFixed(1)} Ω` + (data.measured ? `\nmeas ${data.measured.z[i].toFixed(1)} Ω` : "");
            }}
          />
        )}
        <div className="mt-3 flex flex-wrap gap-1.5 px-1">
          {segs.filter((s) => s.id !== "cable").map((s) => (
            <span key={s.id} className="chip !h-6" style={{ background: s.color }}>
              {s.name}
              <span className="mono text-[var(--text)]">{Math.round(s.z)}Ω</span>
            </span>
          ))}
        </div>
      </ChartCard>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Experiments items={experiments} />
        <div className="space-y-5">
          <MentorNote>
            <p><strong>Read TDR like a map.</strong> Up = inductive / high impedance (narrow traces, pins, launches). Down = capacitive / low impedance (pads, vias, stubs). Width tells you length, depth tells you severity — <em>only if</em> the feature is longer than about half the rise time.</p>
            <p><strong>Correlation is a process, not a plot.</strong> Agree on the reference plane, de-embed or time-gate the fixture, use the same rise-time filter on both curves, then explain every remaining difference with a physical cause (etch, Dk, plating).</p>
          </MentorNote>
          <Assumptions
            items={[
              "Lossless lattice (bounce-diagram) simulation; real traces add a slowly rising baseline from series resistance.",
              "Each discontinuity is a short uniform line section; real vias and connectors are 3D structures.",
              "Instrument + fixture bandwidth is modeled as a Gaussian rise-time filter.",
              "Multiple reflections are included, so downstream readings are slightly 'masked' by upstream mismatches — as on a real TDR.",
              "The 'measured' curve is synthetic (perturbed model + noise) for teaching correlation.",
            ]}
          />
        </div>
      </div>
    </LabShell>
  );
}
