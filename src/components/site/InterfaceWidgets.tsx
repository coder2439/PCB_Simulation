"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import BoardLazy from "../board/BoardLazy";
import type { FocusId } from "../board/BoardCanvas";
import { Segmented, Slider } from "../ui/controls";

export function InterfaceBoard({ focus }: { focus: FocusId }) {
  const router = useRouter();
  return <BoardLazy mode="explorer" focus={focus} onSelect={(id) => router.push(`/board/#${id}`)} showLabels={false} />;
}

export function SkewCalc({ uiPs, color }: { uiPs: number; color: string }) {
  const [mil, setMil] = useState(25);
  const [layer, setLayer] = useState<"ms" | "sl">("sl");
  const [ui, setUi] = useState(uiPs);
  const tpd = layer === "ms" ? 140 : 165; // ps/inch, Dk_eff ≈ 2.7 vs 3.8
  const skew = (mil / 1000) * tpd;
  const pct = (skew / ui) * 100;
  const tone = pct < 5 ? "var(--ok)" : pct < 15 ? "var(--power)" : "var(--danger)";
  return (
    <div className="panel p-5">
      <h3 className="text-[15px] font-medium">Length ↔ delay ↔ skew</h3>
      <p className="mt-1 text-[13px] text-[var(--muted)]">Skew budgets are written in picoseconds or fractions of a UI. Convert a routing mismatch into what the receiver actually sees.</p>
      <div className="mt-3">
        <Segmented size="sm" value={layer} onChange={setLayer} options={[{ value: "ms", label: "Microstrip ≈140 ps/in" }, { value: "sl", label: "Stripline ≈165 ps/in" }]} />
      </div>
      <Slider label="Length mismatch" value={mil} min={0} max={500} step={1} unit="mil" onChange={setMil} hint={`${(mil * 0.0254).toFixed(2)} mm`} />
      <Slider label="Unit interval" value={ui} min={15} max={1000} step={0.5} unit="ps" onChange={setUi} hint={`${(1000 / ui).toFixed(2)} Gb/s per lane`} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2.5">
          <div className="text-[11px] text-[var(--faint)]">Skew</div>
          <div className="mono text-[20px]" style={{ color }}>{skew.toFixed(2)} <span className="text-[12px] text-[var(--muted)]">ps</span></div>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2.5">
          <div className="text-[11px] text-[var(--faint)]">Fraction of UI</div>
          <div className="mono text-[20px]" style={{ color: tone }}>{pct.toFixed(1)} <span className="text-[12px] text-[var(--muted)]">%</span></div>
        </div>
      </div>
    </div>
  );
}
