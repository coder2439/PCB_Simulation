"use client";

import { Cpu, Loader2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FFE_LIMIT, ffeBoostDb, PRESETS, type ChannelParams, type EqParams, type EyeResult, type ImpairParams } from "@/lib/si/channel";
import { COPPERS, LAMINATES, stubResonanceHz } from "@/lib/si/materials";
import { useCompute } from "@/lib/si/useCompute";
import EyeCanvas from "../ui/EyeCanvas";
import Plot from "../ui/Plot";
import { Assumptions, ChartCard, Experiments, Field, Group, Legend, MentorNote, Segmented, Slider, Stat, Toggle } from "../ui/controls";
import LabShell from "./LabShell";

interface ChannelOut {
  f: Float64Array; s21: Float64Array; s11: Float64Array; ilNyq: number; delayNs: number;
  tUi: Float64Array; pRaw: Float64Array; pEq: Float64Array; cursors: number[];
  eye: EyeResult; eq: EqParams; tuned: boolean;
}

const LOSS_BUDGET: Record<string, number> = { pcie3: -22, pcie4: -28, pcie5: -36, usb2: -12, hdmi: -10, mipi: -8 };

export default function ChannelLab() {
  const [presetId, setPresetId] = useState("pcie4");
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const [ch, setCh] = useState({
    lengthIn: preset.lengthIn, zTrace: preset.zRef, laminate: "mid", copper: "rtf", wMil: 5,
    viaCount: 2, stubMil: 40, antipadOpt: true, acCap: true, acCapVoid: true, connector: true, padCapFF: 150,
  });
  const [eq, setEq] = useState<EqParams>({ pre: 0.1, post: 0.1, ctleDb: 4, dfeTaps: preset.dfe });
  const [imp, setImp] = useState<ImpairParams>({ rjPs: 0.6, sjPs: 0, noiseMv: 2, xtalkSpacing: 0, swingMv: 1000 });
  const [tuneTick, setTuneTick] = useState(0);
  const [lastTuned, setLastTuned] = useState(0);

  const lam = LAMINATES.find((l) => l.id === ch.laminate)!;
  const cu = COPPERS.find((c) => c.id === ch.copper)!;
  const params: ChannelParams = {
    rateGbps: preset.rateGbps, zRef: preset.zRef, zTrace: ch.zTrace, lengthIn: ch.lengthIn, laminate: lam, copper: cu,
    wMil: ch.wMil, viaCount: ch.viaCount, stubMil: ch.stubMil, antipadOpt: ch.antipadOpt, acCap: ch.acCap,
    acCapVoid: ch.acCapVoid, connector: ch.connector, padCapFF: ch.padCapFF,
  };
  const tune = tuneTick > lastTuned;
  const req = { kind: "channel" as const, p: params, eq, imp, tune };
  const key = JSON.stringify(req) + tuneTick;
  const { data, busy } = useCompute<ChannelOut>(req, key);

  // adopt coefficients found by the auto-tuner once its result arrives
  useEffect(() => {
    if (data?.tuned && tuneTick > lastTuned) {
      setEq((e) => ({ ...e, pre: data.eq.pre, post: data.eq.post, ctleDb: data.eq.ctleDb }));
      setLastTuned(tuneTick);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const fNyq = preset.rateGbps / 2;
  const fStub = stubResonanceHz(Math.max(ch.stubMil, 1), lam.dk) / 1e9;
  const budget = LOSS_BUDGET[presetId];
  const eye = data?.eye;
  const pass = !!eye && eye.heightMv >= preset.mask.ehMv && eye.widthUi >= preset.mask.ewUi;

  const setPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setCh((c) => ({ ...c, lengthIn: p.lengthIn, zTrace: p.zRef }));
    setEq((e) => ({ ...e, dfeTaps: p.dfe }));
  };

  const experiments = [
    {
      title: "Via stub resonance & backdrilling",
      detail: "PCIe Gen4 with a 110 mil stub: a notch appears at c/(4·L·√Dk). Then drag the stub slider to 8 mil — that's what backdrilling buys you.",
      apply: () => { setPreset("pcie4"); setCh((c) => ({ ...c, stubMil: 110, viaCount: 2, laminate: "mid", lengthIn: 9 })); setTuneTick((t) => t + 1); },
    },
    {
      title: "Laminate choice at 16 GT/s",
      detail: "Same 12-inch channel on standard FR-4 with no equalization. Watch the eye close — then switch the laminate to mid-loss and press Auto-tune.",
      apply: () => { setPreset("pcie4"); setCh((c) => ({ ...c, laminate: "fr4", lengthIn: 12, stubMil: 20 })); setEq((e) => ({ ...e, pre: 0, post: 0, ctleDb: 0, dfeTaps: 0 })); },
    },
    {
      title: "Link training (TX FFE + RX CTLE)",
      detail: "Start from zero equalization, then let the auto-tuner search presets the way PCIe link training does. Compare raw vs. equalized pulse response.",
      apply: () => { setEq({ pre: 0, post: 0, ctleDb: 0, dfeTaps: 0 }); setTimeout(() => setTuneTick((t) => t + 1), 50); },
    },
    {
      title: "AC-cap pad discontinuity",
      detail: "Disable the reference-plane void under the AC-cap pads. S11 rises and ripple appears in S21 — a classic, easily-fixed layout issue.",
      apply: () => setCh((c) => ({ ...c, acCap: true, acCapVoid: false })),
    },
    {
      title: "Crosstalk vs. pair spacing",
      detail: "Enable an aggressor at spacing s = 1·h, then move it to 3·h. Crosstalk is a geometry decision you make in the stackup, not in the simulator.",
      apply: () => setImp((i) => ({ ...i, xtalkSpacing: 1 })),
    },
    {
      title: "Gen5 reality check",
      detail: "32 GT/s over 10 inches of FR-4: no equalizer saves this. This is where a retimer or low-loss laminate becomes a system decision.",
      apply: () => { setPreset("pcie5"); setCh((c) => ({ ...c, laminate: "fr4", lengthIn: 10, copper: "std" })); setTimeout(() => setTuneTick((t) => t + 1), 50); },
    },
  ];

  const controls = (
    <>
      <Group title="Interface">
        <select className="select" value={presetId} onChange={(e) => setPreset(e.target.value)} aria-label="Interface preset">
          {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <p className="mt-2 text-[12px] text-[var(--faint)]">{preset.note} · Zref {preset.zRef} Ω differential</p>
      </Group>
      <Group title="Interconnect">
        <Slider label="Trace length" value={ch.lengthIn} min={1} max={20} step={0.5} unit="in" onChange={(v) => setCh({ ...ch, lengthIn: v })} />
        <Field label="Laminate">
          <select className="select" value={ch.laminate} onChange={(e) => setCh({ ...ch, laminate: e.target.value })}>
            {LAMINATES.map((l) => <option key={l.id} value={l.id}>{l.name} — Df {l.df}</option>)}
          </select>
        </Field>
        <Field label="Copper roughness">
          <Segmented size="sm" value={ch.copper} onChange={(v) => setCh({ ...ch, copper: v })} options={COPPERS.map((c) => ({ value: c.id, label: c.id.toUpperCase() }))} />
        </Field>
        <Slider label="Trace width" value={ch.wMil} min={3} max={9} step={0.5} unit="mil" onChange={(v) => setCh({ ...ch, wMil: v })} hint="wider → lower conductor loss (needs thicker dielectric for same Z)" />
        <Slider label="As-built Zdiff" value={ch.zTrace} min={preset.zRef * 0.8} max={preset.zRef * 1.2} step={1} unit="Ω" onChange={(v) => setCh({ ...ch, zTrace: v })} hint="fab tolerance is typically ±10 %" />
      </Group>
      <Group title="Discontinuities">
        <Slider label="Layer-change vias" value={ch.viaCount} min={0} max={4} step={1} onChange={(v) => setCh({ ...ch, viaCount: v })} />
        <Slider label="Residual via stub" value={ch.stubMil} min={0} max={140} step={2} unit="mil" onChange={(v) => setCh({ ...ch, stubMil: v })} hint={`resonance ≈ ${fStub > 200 ? "> 200" : fStub.toFixed(1)} GHz`} />
        <Toggle label="Optimized via antipads" checked={ch.antipadOpt} onChange={(v) => setCh({ ...ch, antipadOpt: v })} hint="larger anti-pads reduce via capacitance" />
        <Toggle label="AC-coupling capacitors" checked={ch.acCap} onChange={(v) => setCh({ ...ch, acCap: v })} />
        {ch.acCap && <Toggle label="Plane void under cap pads" checked={ch.acCapVoid} onChange={(v) => setCh({ ...ch, acCapVoid: v })} />}
        <Toggle label="Connector in channel" checked={ch.connector} onChange={(v) => setCh({ ...ch, connector: v })} />
        <Slider label="Pad + ESD capacitance" value={ch.padCapFF} min={0} max={500} step={10} unit="fF" onChange={(v) => setCh({ ...ch, padCapFF: v })} />
      </Group>
      <Group title="Equalization">
        <button type="button" onClick={() => setTuneTick((t) => t + 1)} className="btn btn-ghost mb-2 w-full justify-center !h-9">
          <Wand2 size={15} /> Auto-tune (link training)
        </button>
        <Slider label="TX pre-cursor c(−1)" value={eq.pre} min={0} max={FFE_LIMIT.pre} step={0.005} fmt={(v) => (-v).toFixed(3)} onChange={(v) => setEq({ ...eq, pre: Math.min(v, FFE_LIMIT.sum - eq.post) })} />
        <Slider label="TX post-cursor c(+1)" value={eq.post} min={0} max={FFE_LIMIT.post} step={0.005} fmt={(v) => (-v).toFixed(3)} onChange={(v) => setEq({ ...eq, post: Math.min(v, FFE_LIMIT.sum - eq.pre) })} hint={`FFE boost ${ffeBoostDb(eq.pre, eq.post).toFixed(1)} dB · c(0) = ${(1 - eq.pre - eq.post).toFixed(3)}`} />
        <Slider label="RX CTLE peaking" value={eq.ctleDb} min={0} max={14} step={0.5} unit="dB" onChange={(v) => setEq({ ...eq, ctleDb: v })} />
        <Slider label="RX DFE taps" value={eq.dfeTaps} min={0} max={5} step={1} onChange={(v) => setEq({ ...eq, dfeTaps: v })} />
      </Group>
      <Group title="Impairments" defaultOpen={false}>
        <Slider label="TX swing" value={imp.swingMv} min={400} max={1200} step={50} unit="mVppd" onChange={(v) => setImp({ ...imp, swingMv: v })} />
        <Slider label="Random jitter" value={imp.rjPs} min={0} max={4} step={0.1} unit="ps rms" onChange={(v) => setImp({ ...imp, rjPs: v })} />
        <Slider label="Sinusoidal jitter" value={imp.sjPs} min={0} max={30} step={1} unit="ps pp" onChange={(v) => setImp({ ...imp, sjPs: v })} />
        <Slider label="Random noise" value={imp.noiseMv} min={0} max={15} step={0.5} unit="mV rms" onChange={(v) => setImp({ ...imp, noiseMv: v })} />
        <Slider label="Aggressor spacing s/h" value={imp.xtalkSpacing} min={0} max={5} step={0.25} fmt={(v) => (v === 0 ? "off" : v.toFixed(2))} onChange={(v) => setImp({ ...imp, xtalkSpacing: v })} />
      </Group>
    </>
  );

  const s21Min = useMemo(() => {
    if (!data) return -40;
    let m = 0;
    for (let i = 0; i < data.s21.length; i++) m = Math.min(m, data.s21[i]);
    return Math.max(-80, Math.floor((Math.min(m, budget ?? -10) - 6) / 10) * 10);
  }, [data, budget]);

  return (
    <LabShell
      eyebrow="Lab 02 · Signal integrity"
      module="Module 3–4"
      title="Channel loss, equalization & the eye diagram"
      intro={<p>A die-to-die differential channel built from cascaded transmission-line models: package, breakout, vias with stubs, lossy stripline, AC-cap pads and connector. Every slider re-runs the frequency-domain model and a {1200}-bit time-domain simulation in a background worker.</p>}
      controls={controls}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="IL @ Nyquist" value={data ? data.ilNyq.toFixed(1) : "—"} unit="dB" tone={data && budget && data.ilNyq < budget ? "bad" : "neutral"} sub={budget ? `budget ≈ ${budget} dB` : undefined} />
        <Stat label="Eye height" value={eye ? eye.heightMv.toFixed(0) : "—"} unit="mV" tone={eye ? (eye.heightMv >= preset.mask.ehMv ? "ok" : "bad") : "neutral"} sub={`mask ${preset.mask.ehMv} mV`} />
        <Stat label="Eye width" value={eye ? eye.widthUi.toFixed(2) : "—"} unit="UI" tone={eye ? (eye.widthUi >= preset.mask.ewUi ? "ok" : "bad") : "neutral"} sub={`mask ${preset.mask.ewUi} UI`} />
        <Stat label="Worst-case (PDA)" value={eye ? Math.max(0, eye.pdaMv).toFixed(0) : "—"} unit="mV" sub="peak distortion" />
        <Stat label="Stub resonance" value={ch.stubMil < 1 ? "—" : fStub > 99 ? ">99" : fStub.toFixed(1)} unit="GHz" tone={ch.stubMil > 0 && fStub < fNyq * 1.8 ? "warn" : "neutral"} sub={`Nyquist ${fNyq} GHz`} />
        <Stat label="Flight time" value={data ? data.delayNs.toFixed(2) : "—"} unit="ns" sub={`${(lam.dk ** 0.5 * 84.7).toFixed(0)} ps/in`} />
      </div>

      <ChartCard
        title="Eye diagram at the receiver slicer"
        sub="Density of 1200 PRBS15 bits after channel, CTLE and DFE — mask is an illustrative stand-in"
        right={
          <div className="flex items-center gap-2">
            {busy && <Loader2 size={15} className="animate-spin text-[var(--muted)]" aria-label="computing" />}
            {eye && <span className={`chip ${pass ? "!text-[var(--ok)] !border-[rgba(74,222,128,0.35)]" : "!text-[var(--danger)] !border-[rgba(248,113,113,0.4)]"}`}>{pass ? "Mask pass" : "Mask fail"}</span>}
          </div>
        }
      >
        {eye ? (
          <EyeCanvas
            density={eye.density} w={eye.w} h={eye.h} vRange={eye.vRange} height={360}
            mask={{ ehMv: preset.mask.ehMv, ewUi: preset.mask.ewUi, centerUi: eye.sampleUi, pass }}
            sample={{ ui: eye.sampleUi, heightMv: eye.heightMv }}
          />
        ) : (
          <div className="flex h-[360px] items-center justify-center text-[13px] text-[var(--faint)]"><Cpu size={16} className="mr-2" /> Simulating channel…</div>
        )}
      </ChartCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="S-parameters" sub="insertion loss SDD21 and return loss SDD11" right={<Legend items={[{ color: "#38bdf8", label: "SDD21" }, { color: "#f472b6", label: "SDD11" }]} />}>
          {data && (
            <Plot
              ariaLabel="Insertion and return loss versus frequency"
              series={[
                { x: Array.from(data.f, (v) => v / 1e9), y: data.s21, color: "#38bdf8", width: 2 },
                { x: Array.from(data.f, (v) => v / 1e9), y: data.s11, color: "#f472b6", width: 1.5 },
              ]}
              xDomain={[0, fNyq * 2.5]}
              yDomain={[s21Min, 2]}
              xLabel="frequency (GHz)"
              yLabel="dB"
              xFmt={(v) => `${+v.toFixed(1)}`}
              yFmt={(v) => `${v}`}
              vlines={[
                { v: fNyq, color: "rgba(231,237,245,0.6)", label: "Nyquist", dash: true },
                ...(ch.stubMil > 0 && fStub < fNyq * 2.5 ? [{ v: fStub, color: "#fbbf24", label: "stub λ/4", dash: true }] : []),
              ]}
              hlines={budget ? [{ v: budget, color: "rgba(248,113,113,0.7)", label: `budget ${budget} dB`, dash: true }] : []}
              hover={(x) => {
                const i = Math.round((x * 1e9) / (data.f[1] || 1));
                if (i < 0 || i >= data.f.length) return null;
                return `${x.toFixed(2)} GHz\nSDD21 ${data.s21[i].toFixed(2)} dB\nSDD11 ${data.s11[i].toFixed(1)} dB`;
              }}
            />
          )}
        </ChartCard>
        <ChartCard title="Pulse response & cursors" sub="single-bit response before and after equalization" right={<Legend items={[{ color: "#5c6a7e", label: "raw", dash: true }, { color: "#2dd4bf", label: "equalized" }, { color: "#fbbf24", label: "cursors" }]} />}>
          {data && (
            <Plot
              ariaLabel="Pulse response before and after equalization"
              series={[
                { x: data.tUi, y: Array.from(data.pRaw, (v) => v * imp.swingMv / 2), color: "#5c6a7e", dash: [5, 4], width: 1.5 },
                { x: data.tUi, y: Array.from(data.pEq, (v) => v * imp.swingMv / 2), color: "#2dd4bf", width: 2 },
                { x: data.cursors.map((_, i) => i - 2), y: data.cursors.map((v) => v * imp.swingMv / 2), color: "#fbbf24", stems: true },
              ]}
              xDomain={[-3, 12]}
              yDomain={[-0.15 * imp.swingMv / 2, 1.0 * imp.swingMv / 2]}
              xLabel="time relative to main cursor (UI)"
              yLabel="mV"
              xFmt={(v) => `${v}`}
              yFmt={(v) => `${v}`}
              hover={(x) => {
                const k = Math.round(x);
                const c = data.cursors[k + 2];
                return c === undefined ? null : `cursor ${k >= 0 ? "+" : ""}${k}\n${(c * imp.swingMv / 2).toFixed(1)} mV`;
              }}
            />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Experiments items={experiments} />
        <div className="space-y-5">
          <MentorNote title="How to read this">
            <p><strong>Start with S21 at Nyquist.</strong> It tells you how much the fundamental of a 1010… pattern is attenuated — the single best predictor of how hard the equalizer has to work.</p>
            <p><strong>Then look at the pulse response.</strong> The yellow stems are the values seen at each bit time. Everything that is not the main cursor is inter-symbol interference: FFE and CTLE shrink pre/post cursors, DFE cancels the first few post cursors exactly.</p>
            <p><strong>The eye is the consequence, not the cause.</strong> When it closes, go back to S21/S11 to find <em>which structure</em> is to blame — length, laminate, stub, or a capacitive pad.</p>
          </MentorNote>
          <Assumptions
            items={[
              "Differential mode only; no mode conversion (SCD21) or skew-induced common mode.",
              "Loss uses Bogatin's conductor-loss approximation with Hammerstad roughness and a constant-tanδ dielectric with a causal (Kramers–Kronig) phase term.",
              "Vias are modeled as short low-Z sections plus an open λ/4 stub, not a 3D field-solved structure.",
              "Packages are generic; real designs use vendor S-parameters and IBIS-AMI models.",
              "Eye from ~1200 bits — fine for intuition, but compliance needs statistical/BER-extrapolated eyes (1e-12) and the spec's reference equalizer.",
              "Crosstalk is a heuristic FEXT model scaled by 1/(1+(s/h)²); extract coupled lines for signoff.",
            ]}
          />
        </div>
      </div>
    </LabShell>
  );
}
