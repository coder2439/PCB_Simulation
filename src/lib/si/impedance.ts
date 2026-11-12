/**
 * Closed-form controlled-impedance estimates (all dimensions in mil).
 * Microstrip: Hammerstad–Jensen (with thickness correction) ≈ ±1–2 %.
 * Stripline: Wheeler thick-strip formula; asymmetric via the IPC-2141 parallel combination.
 * Differential coupling: IPC-2141 empirical factors (±5–8 %). Sign off with a 2D field solver.
 */
const ETA0 = 376.73;

export type Structure = "microstrip" | "stripline" | "dual-stripline";

export interface Geometry {
  structure: Structure;
  w: number;   // trace width (mil)
  s: number;   // edge-to-edge spacing (mil)
  t: number;   // copper thickness (mil)
  h1: number;  // dielectric height to nearest plane (mil)
  h2: number;  // dielectric height to far plane (stripline)
  dk: number;
  etch: number; // trapezoid: top width = w − etch (mil)
}

export interface ZResult { z0: number; zdiff: number; eeff: number; tpdPsPerIn: number }

function msZ01(u: number) {
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-Math.pow(30.666 / u, 0.7528));
  return (ETA0 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + 4 / (u * u)));
}
function msEe(u: number, er: number) {
  const a = 1 + Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) / 49 + Math.log(1 + (u / 18.1) ** 3) / 18.7;
  const b = 0.564 * Math.pow((er - 0.9) / (er + 3), 0.053);
  return (er + 1) / 2 + ((er - 1) / 2) * Math.pow(1 + 10 / u, -a * b);
}

export function microstrip(w: number, h: number, t: number, er: number) {
  const u = w / h, tn = t / h;
  const coth = (x: number) => 1 / Math.tanh(x);
  const du1 = tn > 0 ? (tn / Math.PI) * Math.log(1 + (4 * Math.E) / (tn * coth(Math.sqrt(6.517 * u)) ** 2)) : 0;
  const dur = 0.5 * (1 + 1 / Math.cosh(Math.sqrt(er - 1))) * du1;
  const u1 = u + du1, ur = u + dur;
  const ee = msEe(ur, er) * (msZ01(u1) / msZ01(ur)) ** 2;
  const z0 = msZ01(ur) / Math.sqrt(msEe(ur, er));
  return { z0, eeff: ee };
}

/** Symmetric stripline, plane-to-plane spacing b. */
export function striplineSym(w: number, b: number, t: number, er: number) {
  const x = t / b;
  const bt = b - t;
  let wp = w;
  if (x > 0) {
    const m = 2 / (1 + ((2 / 3) * x) / (1 - x));
    const dw = (x / (Math.PI * (1 - x))) * (1 - 0.5 * Math.log((x / (2 - x)) ** 2 + Math.pow((0.0796 * x) / (w / b + 1.1 * x), m)));
    wp = w + dw * bt;
  }
  const k = (4 / Math.PI) * (bt / wp);
  const q = (8 / Math.PI) * (bt / wp);
  return (30 / Math.sqrt(er)) * Math.log(1 + k * (q + Math.sqrt(q * q + 6.27)));
}

export function solve(g: Geometry): ZResult {
  const wEff = Math.max(0.5, g.w - g.etch / 2); // average width of the trapezoid
  let z0: number, eeff: number, zdiff: number;
  if (g.structure === "microstrip") {
    const r = microstrip(wEff, g.h1, g.t, g.dk);
    z0 = r.z0;
    eeff = r.eeff;
    zdiff = 2 * z0 * (1 - 0.48 * Math.exp((-0.96 * g.s) / g.h1));
  } else {
    const h2 = g.structure === "stripline" ? g.h1 : g.h2;
    const za = striplineSym(wEff, 2 * g.h1 + g.t, g.t, g.dk);
    const zb = striplineSym(wEff, 2 * h2 + g.t, g.t, g.dk);
    z0 = g.structure === "stripline" ? za : (2 * za * zb) / (za + zb);
    eeff = g.dk;
    const b = g.h1 + h2 + g.t;
    zdiff = 2 * z0 * (1 - 0.347 * Math.exp((-2.9 * g.s) / b));
  }
  return { z0, zdiff, eeff, tpdPsPerIn: 84.72 * Math.sqrt(eeff) };
}

/** Find trace width that hits a target (single-ended or differential) by bisection. */
export function solveWidth(g: Geometry, target: number, diff: boolean): number {
  let lo = 1, hi = 40;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const r = solve({ ...g, w: mid });
    const z = diff ? r.zdiff : r.z0;
    if (z > target) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Monte-Carlo fabrication spread: returns sample impedances. */
export function monteCarlo(g: Geometry, diff: boolean, n = 3000, tol = { w: 0.5, h: 0.08, dk: 0.04, t: 0.15 }) {
  const out = new Float64Array(n);
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const gauss = () => { const u = Math.max(rnd(), 1e-12), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < n; i++) {
    // tolerances interpreted as ±3σ
    const gg: Geometry = {
      ...g,
      w: g.w + (gauss() * tol.w) / 3,
      h1: g.h1 * (1 + (gauss() * tol.h) / 3),
      h2: g.h2 * (1 + (gauss() * tol.h) / 3),
      dk: g.dk * (1 + (gauss() * tol.dk) / 3),
      t: g.t * (1 + (gauss() * tol.t) / 3),
    };
    const r = solve(gg);
    out[i] = diff ? r.zdiff : r.z0;
  }
  return out;
}
