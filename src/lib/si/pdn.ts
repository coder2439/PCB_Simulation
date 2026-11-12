/**
 * Lumped PDN impedance model: VRM (R + L) ∥ bulk ∥ MLCC banks (ESR/ESL/C +
 * mounting inductance) ∥ plane capacitance, optionally seen from the die
 * through package inductance with on-die capacitance.
 */
import { fft } from "./fft";

export interface CapType { id: string; label: string; c: number; esr: number; esl: number; pkg: string }

export const CAP_TYPES: CapType[] = [
  { id: "bulk", label: "330 µF polymer", c: 330e-6, esr: 6e-3, esl: 1.2e-9, pkg: "7343" },
  { id: "22u", label: "22 µF X5R", c: 22e-6, esr: 3e-3, esl: 0.35e-9, pkg: "0805" },
  { id: "4u7", label: "4.7 µF X5R", c: 4.7e-6, esr: 5e-3, esl: 0.28e-9, pkg: "0603" },
  { id: "1u", label: "1 µF X5R", c: 1e-6, esr: 10e-3, esl: 0.22e-9, pkg: "0402" },
  { id: "100n", label: "100 nF X7R", c: 100e-9, esr: 25e-3, esl: 0.16e-9, pkg: "0201" },
  { id: "10n", label: "10 nF X7R", c: 10e-9, esr: 60e-3, esl: 0.16e-9, pkg: "0201" },
];

export type Mounting = "via-in-pad" | "short-trace" | "long-trace";
export const MOUNT_L: Record<Mounting, number> = { "via-in-pad": 0.12e-9, "short-trace": 0.45e-9, "long-trace": 1.2e-9 };

export interface PdnParams {
  vdd: number;
  ripplePct: number;
  stepA: number;
  counts: Record<string, number>;
  mounting: Mounting;
  planeAreaCm2: number;
  planeSpacingMil: number;
  planeDk: number;
  vrmL: number;   // H
  vrmR: number;   // Ω
  includePkg: boolean;
  pkgL: number;   // H
  dieC: number;   // F
  dieR: number;   // Ω
}

export const DEFAULT_PDN: PdnParams = {
  vdd: 0.9,
  ripplePct: 3,
  stepA: 5,
  counts: { bulk: 2, "22u": 2, "4u7": 0, "1u": 2, "100n": 4, "10n": 0 },
  mounting: "short-trace",
  planeAreaCm2: 30,
  planeSpacingMil: 4,
  planeDk: 3.8,
  vrmL: 15e-9,
  vrmR: 0.4e-3,
  includePkg: false,
  pkgL: 25e-12,
  dieC: 250e-9,
  dieR: 1.5e-3,
};

export const targetZ = (p: PdnParams) => (p.vdd * p.ripplePct) / 100 / p.stepA;
export const planeCap = (p: PdnParams) => (8.854e-12 * p.planeDk * p.planeAreaCm2 * 1e-4) / (p.planeSpacingMil * 25.4e-6);
/** spreading inductance between cap pads and BGA scales with plane-pair spacing */
const spreadL = (p: PdnParams) => 0.03e-9 * (p.planeSpacingMil / 4);

/** Complex impedance at f (Hz): returns [re, im]. */
export function zAt(p: PdnParams, f: number, view: "board" | "die" = "board"): [number, number] {
  const w = 2 * Math.PI * Math.max(f, 1);
  // admittance sum
  let yr = 0, yi = 0;
  const addZ = (r: number, x: number) => { const d = r * r + x * x; yr += r / d; yi += -x / d; };
  addZ(p.vrmR, w * p.vrmL);
  for (const ct of CAP_TYPES) {
    const n = p.counts[ct.id] ?? 0;
    if (!n) continue;
    const lm = ct.id === "bulk" ? 0.6e-9 : MOUNT_L[p.mounting];
    const L = ct.esl + lm + spreadL(p);
    addZ(ct.esr / n, (w * L - 1 / (w * ct.c)) / n);
  }
  const cp = planeCap(p);
  addZ(0.2e-3, w * 5e-12 - 1 / (w * cp));
  let d = yr * yr + yi * yi;
  let zr = yr / d, zi = -yi / d;
  if (view === "die" && p.includePkg) {
    zr += 0.3e-3;
    zi += w * p.pkgL;
    // ∥ on-die capacitance
    const yr2 = zr / (zr * zr + zi * zi), yi2 = -zi / (zr * zr + zi * zi);
    const dr = p.dieR, dx = -1 / (w * p.dieC), dd = dr * dr + dx * dx;
    const tr = yr2 + dr / dd, ti = yi2 - dx / dd;
    d = tr * tr + ti * ti;
    zr = tr / d;
    zi = -ti / d;
  }
  return [zr, zi];
}

export function sweep(p: PdnParams, view: "board" | "die", n = 360, f0 = 1e3, f1 = 1e9) {
  const f = new Float64Array(n), z = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    f[i] = f0 * Math.pow(f1 / f0, i / (n - 1));
    const c = zAt(p, f[i], view);
    z[i] = Math.hypot(c[0], c[1]);
  }
  return { f, z };
}

/** Voltage response to a load-current step (trapezoid, rise trPs). */
export function transient(p: PdnParams, view: "board" | "die", riseNs = 1) {
  const N = 1 << 14;
  const dt = 1e-9;
  const T = N * dt;
  const ir = new Float64Array(N), ii = new Float64Array(N);
  const tOn = 0.5e-6, tOff = T / 2 + tOn;
  const rs = Math.max(1, Math.round((riseNs * 1e-9) / dt));
  for (let n = 0; n < N; n++) {
    const t = n * dt;
    let i = 0;
    if (t >= tOn && t < tOff) i = Math.min(1, (t - tOn) / (rs * dt));
    else if (t >= tOff) i = Math.max(0, 1 - (t - tOff) / (rs * dt));
    ir[n] = i * p.stepA;
  }
  fft(ir, ii);
  for (let k = 0; k <= N / 2; k++) {
    const f = k / T;
    const [zr, zi] = k === 0 ? [p.vrmR, 0] : zAt(p, f, view);
    const a = ir[k], b = ii[k];
    ir[k] = a * zr - b * zi;
    ii[k] = a * zi + b * zr;
    if (k > 0 && k < N / 2) { ir[N - k] = ir[k]; ii[N - k] = -ii[k]; }
  }
  fft(ir, ii, true);
  // voltage deviation (negative = droop); return first 7 µs
  const keep = Math.round(7e-6 / dt);
  const t = new Float64Array(keep), v = new Float64Array(keep);
  const dc = ir[Math.round(0.4e-6 / dt)];
  for (let n = 0; n < keep; n++) { t[n] = n * dt; v[n] = -(ir[n] - dc); }
  return { t, v, dt };
}
