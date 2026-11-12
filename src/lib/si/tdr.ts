/**
 * Time-domain reflectometry by lattice (bounce-diagram) simulation of
 * cascaded lossless transmission-line segments, followed by a Gaussian
 * rise-time filter representing the instrument + fixture bandwidth.
 */
export interface Segment { id: string; name: string; z: number; ps: number; color: string; kind: "line" | "disc" }
export type Termination = "matched" | "open" | "short" | "rx50";

export interface TdrResult {
  t: Float64Array;   // ps (round-trip time axis, as displayed by a TDR)
  z: Float64Array;   // impedance (Ω) after rise-time filter
  zIdeal: Float64Array;
  rho: Float64Array;
  bounds: { id: string; t0: number; t1: number; color: string; name: string }[];
}

const DT = 1; // ps per lattice step (one-way)

export function simulateTdr(segs: Segment[], term: Termination, z0: number, riseTimePs: number, seed = 0, noise = 0): TdrResult {
  const zs: number[] = [];
  const bounds: TdrResult["bounds"] = [];
  let tAcc = 0;
  for (const s of segs) {
    const n = Math.max(1, Math.round(s.ps / DT));
    for (let i = 0; i < n; i++) zs.push(s.z);
    bounds.push({ id: s.id, t0: tAcc * 2, t1: (tAcc + n * DT) * 2, color: s.color, name: s.name });
    tAcc += n * DT;
  }
  const n = zs.length;
  const zL = term === "matched" ? z0 : term === "open" ? 1e9 : term === "short" ? 1e-6 : z0 * 0.9;
  const gL = (zL - zs[n - 1]) / (zL + zs[n - 1]);
  const gam = new Float64Array(n - 1);
  for (let i = 0; i < n - 1; i++) gam[i] = (zs[i + 1] - zs[i]) / (zs[i + 1] + zs[i]);

  let f = new Float64Array(n), b = new Float64Array(n);
  let nf = new Float64Array(n), nb = new Float64Array(n);
  const steps = Math.round((tAcc * 2 + 300) / DT);
  const v = new Float64Array(steps);
  const vInc = 0.5;
  // first segment is the instrument's matched cable: no re-reflection at the source
  for (let k = 0; k < steps; k++) {
    v[k] = vInc + b[0];
    nf[0] = vInc;
    for (let i = 0; i < n - 1; i++) {
      const g = gam[i];
      nf[i + 1] = (1 + g) * f[i] - g * b[i + 1];
      nb[i] = g * f[i] + (1 - g) * b[i + 1];
    }
    nb[n - 1] = gL * f[n - 1];
    [f, nf] = [nf, f];
    [b, nb] = [nb, b];
  }
  // displayed axis: round-trip time; lattice gives one sample per DT of elapsed time
  const t = new Float64Array(steps);
  for (let k = 0; k < steps; k++) t[k] = k * DT;

  const filt = gaussian(v, riseTimePs / DT);
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 - 0.5; };
  const toZ = (vv: number) => {
    const rho = Math.max(-0.995, Math.min(0.995, (vv - vInc) / vInc));
    return (z0 * (1 + rho)) / (1 - rho);
  };
  const z = new Float64Array(steps), zIdeal = new Float64Array(steps), rho = new Float64Array(steps);
  for (let k = 0; k < steps; k++) {
    const vv = filt[k] + (noise ? rnd() * noise : 0);
    rho[k] = (vv - vInc) / vInc;
    z[k] = toZ(vv);
    zIdeal[k] = toZ(v[k]);
  }
  return { t, z, zIdeal, rho, bounds };
}

/** Gaussian low-pass with 10–90 % rise time = rtSamples. */
function gaussian(x: Float64Array, rtSamples: number): Float64Array {
  const sigma = Math.max(0.3, rtSamples / 2.563);
  const half = Math.ceil(sigma * 3.5);
  const k = new Float64Array(half * 2 + 1);
  let sum = 0;
  for (let i = -half; i <= half; i++) { k[i + half] = Math.exp((-i * i) / (2 * sigma * sigma)); sum += k[i + half]; }
  for (let i = 0; i < k.length; i++) k[i] /= sum;
  const out = new Float64Array(x.length);
  for (let n = 0; n < x.length; n++) {
    let acc = 0;
    for (let j = -half; j <= half; j++) {
      const idx = Math.min(x.length - 1, Math.max(0, n - j));
      acc += x[idx] * k[j + half];
    }
    out[n] = acc;
  }
  return out;
}

/** Spatial resolution of a TDR: two discontinuities closer than ≈ tr/2 merge. */
export const resolutionMm = (riseTimePs: number, dk: number) => ((riseTimePs / 2) * 0.2998) / Math.sqrt(dk);
