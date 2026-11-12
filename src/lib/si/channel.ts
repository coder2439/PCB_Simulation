/**
 * Differential SerDes channel model for teaching.
 * Frequency domain: cascaded ABCD matrices (package, breakout, vias with open
 * stubs, lossy line, AC-cap pads, connector) → S21/S11.
 * Time domain: impulse/pulse response via IFFT, TX FFE, RX CTLE, bit-by-bit
 * superposition with jitter, crosstalk and noise, DFE, eye density + metrics.
 */
import { irfft } from "./fft";
import { C_IN_PER_NS, lossDbPerIn, type Copper, type Laminate } from "./materials";

/* ---------------- complex helpers (inlined-friendly) ---------------- */
type C = [number, number];
const cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]];
const cdiv = (a: C, b: C): C => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
const ccosh = (z: C): C => [Math.cosh(z[0]) * Math.cos(z[1]), Math.sinh(z[0]) * Math.sin(z[1])];
const csinh = (z: C): C => [Math.sinh(z[0]) * Math.cos(z[1]), Math.cosh(z[0]) * Math.sin(z[1])];
type M = [C, C, C, C]; // A B C D
const mmul = (x: M, y: M): M => [
  cadd(cmul(x[0], y[0]), cmul(x[1], y[2])),
  cadd(cmul(x[0], y[1]), cmul(x[1], y[3])),
  cadd(cmul(x[2], y[0]), cmul(x[3], y[2])),
  cadd(cmul(x[2], y[1]), cmul(x[3], y[3])),
];
const shunt = (y: C): M => [[1, 0], [0, 0], y, [1, 0]];

function line(z: number, gamma: C, len: number): M {
  const gl: C = [gamma[0] * len, gamma[1] * len];
  const ch = ccosh(gl), sh = csinh(gl);
  return [ch, [sh[0] * z, sh[1] * z], [sh[0] / z, sh[1] / z], ch];
}
function openStub(z: number, gamma: C, len: number): M {
  if (len <= 0) return shunt([0, 0]);
  const gl: C = [gamma[0] * len, gamma[1] * len];
  const th = cdiv(csinh(gl), ccosh(gl));
  return shunt([th[0] / z, th[1] / z]);
}

/* ---------------- parameters ---------------- */
export interface ChannelParams {
  rateGbps: number;
  zRef: number;          // differential reference (Ω)
  zTrace: number;        // as-built differential impedance of main route
  lengthIn: number;
  laminate: Laminate;
  copper: Copper;
  wMil: number;
  viaCount: number;
  stubMil: number;       // residual stub per via
  antipadOpt: boolean;   // optimized antipad → less via capacitance
  acCap: boolean;
  acCapVoid: boolean;
  connector: boolean;
  padCapFF: number;      // die pad + ESD capacitance per side (fF, differential)
}

export interface EqParams {
  pre: number;   // c(-1) magnitude
  post: number;  // c(+1) magnitude
  ctleDb: number;
  dfeTaps: number;
}

export interface ImpairParams {
  rjPs: number;      // random jitter rms
  sjPs: number;      // sinusoidal jitter peak-to-peak
  noiseMv: number;   // rms
  xtalkSpacing: number; // s/h of aggressor; 0 = no aggressor
  swingMv: number;   // differential peak-to-peak at TX
}

export const SPU = 32; // samples per UI
const NFFT = 8192;

export interface FreqResult {
  f: Float64Array;   // Hz (one-sided, up to fs/2)
  hr: Float64Array;  // S21 real (bulk delay removed)
  hi: Float64Array;
  s21db: Float64Array;
  s11db: Float64Array;
  delayNs: number;
}

/** Build the channel S21/S11 on the FFT grid. */
export function channelResponse(p: ChannelParams): FreqResult {
  const baud = p.rateGbps * 1e9;
  const fs = baud * SPU;
  const nf = NFFT / 2 + 1;
  const f = new Float64Array(nf), hr = new Float64Array(nf), hi = new Float64Array(nf);
  const s21db = new Float64Array(nf), s11db = new Float64Array(nf);
  const dk = p.laminate.dk, sq = Math.sqrt(dk);
  const vIn = C_IN_PER_NS * 1e9 / sq; // inch/s
  const z0Odd = p.zTrace / 2;

  // segment lengths (inch)
  const pkgLen = 0.5, brkLen = 0.25, viaLen = 0.062, capLen = 0.04, connLen = 0.3;
  const trace = Math.max(0.1, p.lengthIn - brkLen * 2);
  const nVia = p.viaCount;
  const stubIn = p.stubMil / 1000;
  const zVia = p.zRef * (p.antipadOpt ? 0.92 : 0.72);
  const zCap = p.zRef * (p.acCapVoid ? 0.95 : 0.72);
  const zConn = p.zRef * 1.12;
  const zPkg = p.zRef * 1.04;
  const zBrk = p.zTrace * 1.1;

  let totalLen = 2 * pkgLen + 2 * brkLen + trace + nVia * viaLen + (p.acCap ? capLen : 0) + (p.connector ? connLen : 0);
  const delay = totalLen / vIn;

  for (let k = 0; k < nf; k++) {
    const fr = Math.max((k * fs) / NFFT, 1e5);
    f[k] = (k * fs) / NFFT;
    const w = 2 * Math.PI * fr;
    const loss = lossDbPerIn(fr, { wMil: p.wMil, z0: z0Odd, dk, df: p.laminate.df, rqUm: p.copper.rqUm });
    const aCond = loss.cond / 8.686, aDiel = loss.diel / 8.686;
    const beta = w / vIn;
    // causal skin effect: conductor loss adds an equal phase term;
    // causal constant-tanδ dielectric (Kramers–Kronig): Dk falls slowly with frequency
    const kk = -(2 / Math.PI) * aDiel * Math.log(fr / 1e9);
    const gTrace: C = [aCond + aDiel, beta + aCond + kk];
    const lp = lossDbPerIn(fr, { wMil: 3, z0: z0Odd, dk: 3.8, df: 0.012, rqUm: 0.6 });
    const gPkg: C = [lp.total / 8.686, w / (C_IN_PER_NS * 1e9 / Math.sqrt(3.8)) + lp.cond / 8.686];
    const gShort: C = [aDiel * 0.5, beta];

    const yPad: C = [0, w * p.padCapFF * 1e-15];
    let m: M = shunt(yPad);
    m = mmul(m, line(zPkg, gPkg, pkgLen));
    m = mmul(m, line(zBrk, gTrace, brkLen));
    const viaAt = (mm: M) => mmul(mmul(mm, line(zVia, gShort, viaLen)), openStub(zVia, gShort, stubIn));
    const half = Math.ceil(nVia / 2);
    for (let i = 0; i < half; i++) m = viaAt(m);
    m = mmul(m, line(p.zTrace, gTrace, trace * 0.75));
    if (p.acCap) m = mmul(m, line(zCap, gShort, capLen));
    m = mmul(m, line(p.zTrace, gTrace, trace * 0.25));
    for (let i = half; i < nVia; i++) m = viaAt(m);
    if (p.connector) m = mmul(m, line(zConn, gShort, connLen));
    m = mmul(m, line(zBrk, gTrace, brkLen));
    m = mmul(m, line(zPkg, gPkg, pkgLen));
    m = mmul(m, shunt(yPad));

    const Z = p.zRef;
    const den = cadd(cadd(m[0], [m[1][0] / Z, m[1][1] / Z]), cadd([m[2][0] * Z, m[2][1] * Z], m[3]));
    const s21 = cdiv([2, 0], den);
    const num11 = cadd(cadd(m[0], [m[1][0] / Z, m[1][1] / Z]), [-m[2][0] * Z - m[3][0], -m[2][1] * Z - m[3][1]]);
    const s11 = cdiv(num11, den);
    // remove bulk propagation delay so the pulse fits the FFT window
    const ph = w * delay;
    const rot: C = [Math.cos(ph), Math.sin(ph)];
    const h = cmul(s21, rot);
    hr[k] = h[0];
    hi[k] = h[1];
    s21db[k] = 20 * Math.log10(Math.hypot(s21[0], s21[1]) + 1e-12);
    s11db[k] = 20 * Math.log10(Math.hypot(s11[0], s11[1]) + 1e-12);
  }
  totalLen += 0;
  return { f, hr, hi, s21db, s11db, delayNs: delay * 1e9 };
}

/** CTLE: one zero, poles at Nyquist and 2.5× Nyquist; gain normalized to 0 dB at Nyquist. */
function ctle(fr: number, fNyq: number, peakDb: number): C {
  if (peakDb <= 0) return [1, 0];
  const adc = Math.pow(10, -peakDb / 20);
  const fp1 = fNyq, fp2 = fNyq * 2.5, fz = fp1 * adc;
  const num: C = [1, fr / fz];
  const d1: C = [1, fr / fp1], d2: C = [1, fr / fp2];
  const h = cdiv(num, cmul(d1, d2));
  // normalize to 0 dB at Nyquist (peaking = DC attenuation relative to Nyquist)
  const nn = cdiv([1, fNyq / fz], cmul([1, fNyq / fp1], [1, fNyq / fp2]));
  const g = 1 / Math.hypot(nn[0], nn[1]);
  return [h[0] * g, h[1] * g];
}

export interface PulseResult {
  pulse: Float64Array; // volts for a single +1 UI symbol at TX amplitude 1
  step: Float64Array;
  peakIdx: number;
  window: number;
}

const PRE_UI = 12;

/** Pulse response after TX edge filter, channel and CTLE. Amplitude normalized to 1. */
export function pulseResponse(fr: FreqResult, rateGbps: number, ctleDb: number): PulseResult {
  const baud = rateGbps * 1e9;
  const fNyq = baud / 2;
  const nf = fr.f.length;
  const hr = new Float64Array(nf), hi = new Float64Array(nf);
  const T = 1 / baud, dt = T / SPU;
  const sigma = (0.3 * T) / 2.563; // 0.3 UI 10–90 % TX edge
  const shift = PRE_UI * T;
  for (let k = 0; k < nf; k++) {
    const f = fr.f[k];
    const g = Math.exp(-2 * Math.PI * Math.PI * sigma * sigma * f * f);
    let h: C = [fr.hr[k] * g, fr.hi[k] * g];
    h = cmul(h, ctle(f, fNyq, ctleDb));
    const ph = -2 * Math.PI * f * shift;
    h = cmul(h, [Math.cos(ph), Math.sin(ph)]);
    hr[k] = h[0];
    hi[k] = h[1];
  }
  const imp = irfft(hr, hi, NFFT);
  // impulse → step (scale by dt to integrate) — irfft already returns samples of h·dt-equivalent
  const step = new Float64Array(NFFT);
  let acc = 0;
  for (let i = 0; i < NFFT; i++) { acc += imp[i]; step[i] = acc; }
  const pulse = new Float64Array(NFFT);
  for (let i = 0; i < NFFT; i++) pulse[i] = step[i] - (i >= SPU ? step[i - SPU] : 0);
  let peakIdx = 0;
  for (let i = 0; i < NFFT / 2; i++) if (pulse[i] > pulse[peakIdx]) peakIdx = i;
  void dt;
  return { pulse, step, peakIdx, window: Math.min(NFFT, (PRE_UI + 52) * SPU) };
}

/** Apply 3-tap FFE to a pulse response (linear). */
export function ffePulse(p: Float64Array, pre: number, post: number): Float64Array {
  const c0 = 1 - pre - post;
  const out = new Float64Array(p.length);
  for (let i = 0; i < p.length; i++) {
    out[i] = c0 * p[i] - pre * (i + SPU < p.length ? p[i + SPU] : 0) - post * (i >= SPU ? p[i - SPU] : 0);
  }
  return out;
}

/** Cursor values (pre/main/post) of a pulse at the best phase. */
export function cursors(p: Float64Array, peakIdx: number, nPre = 3, nPost = 12) {
  const c: number[] = [];
  for (let k = -nPre; k <= nPost; k++) {
    const i = peakIdx + k * SPU;
    c.push(i >= 0 && i < p.length ? p[i] : 0);
  }
  return c; // index nPre is the main cursor
}

/** Peak-distortion worst-case eye height (normalized), with DFE removing first N post cursors. */
export function pdaEyeHeight(p: Float64Array, peakIdx: number, dfe: number, win: number) {
  let best = -Infinity;
  for (let d = -SPU / 2; d < SPU / 2; d++) {
    const c = peakIdx + d;
    let isi = 0;
    for (let k = -PRE_UI + 1; k * SPU + c < win; k++) {
      if (k === 0) continue;
      if (k >= 1 && k <= dfe) continue;
      const i = c + k * SPU;
      if (i >= 0 && i < p.length) isi += Math.abs(p[i]);
    }
    const eh = 2 * (p[c] - isi);
    if (eh > best) best = eh;
  }
  return best;
}

/* ---------------- bit-level simulation & eye density ---------------- */

function prbs(n: number, order: 7 | 15, seed = 0x5a): Int8Array {
  const out = new Int8Array(n);
  let s = seed & ((1 << order) - 1) || 1;
  const tap = order === 7 ? 6 : 14;
  for (let i = 0; i < n; i++) {
    const b = ((s >> (order - 1)) ^ (s >> (tap - 1))) & 1;
    s = ((s << 1) | b) & ((1 << order) - 1);
    out[i] = b ? 1 : -1;
  }
  return out;
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  return { r, g: () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r()) };
}

export interface EyeResult {
  w: number;
  h: number;
  density: Float32Array;
  vRange: number;            // ± volts shown
  heightMv: number;
  widthUi: number;
  sampleUi: number;          // best sampling phase, UI relative to the main cursor
  pdaMv: number;
  mainCursorMv: number;
}

export function simulateEye(
  stepNorm: Float64Array,
  pulseNorm: Float64Array,
  peakIdx: number,
  win: number,
  rateGbps: number,
  eq: EqParams,
  imp: ImpairParams,
  opts: { bits?: number; w?: number; h?: number } = {},
): EyeResult {
  const nBits = opts.bits ?? 1200;
  const W = opts.w ?? 480, H = opts.h ?? 300;
  const A = imp.swingMv / 2 / 1000; // single-sided amplitude (V)
  const T = 1e12 / (rateGbps * 1e9); // ps per UI
  const bits = prbs(nBits + 40, 15, 0x3b1);
  const c0 = 1 - eq.pre - eq.post;
  const sym = new Float64Array(nBits + 40);
  for (let k = 0; k < sym.length; k++) {
    sym[k] = A * (c0 * bits[k] - eq.pre * (k + 1 < sym.length ? bits[k + 1] : 0) - eq.post * (k > 0 ? bits[k - 1] : 0));
  }
  const N = (nBits + 40) * SPU + win;
  const y = new Float64Array(N);
  const tail = new Float64Array(N + 1);
  const rng = makeRng(777);
  const stepEnd = stepNorm[win - 1];
  const sjAmp = (imp.sjPs / 2) / T * SPU; // samples
  // edge superposition with per-edge jitter (fractional sample shift)
  let prev = 0;
  for (let k = 0; k < sym.length; k++) {
    const d = sym[k] - prev;
    prev = sym[k];
    if (Math.abs(d) < 1e-12) continue;
    const jit = (rng.g() * imp.rjPs) / T * SPU + sjAmp * Math.sin((2 * Math.PI * k) / 97);
    const base = k * SPU;
    const ji = Math.floor(jit), jf = jit - ji;
    for (let m = 0; m < win; m++) {
      const n = base + m + ji;
      if (n < 0 || n >= N) continue;
      const s0 = stepNorm[m], s1 = m > 0 ? stepNorm[m - 1] : 0;
      y[n] += d * (s0 * (1 - jf) + s1 * jf);
    }
    const tIdx = base + win + ji;
    if (tIdx >= 0 && tIdx < N) tail[tIdx] += d * stepEnd;
  }
  let run = 0;
  for (let n = 0; n < N; n++) { run += tail[n]; y[n] += run; }

  // crosstalk (FEXT-like, ∝ derivative of the aggressor's received edge)
  if (imp.xtalkSpacing > 0) {
    const kx = 0.12 / (1 + imp.xtalkSpacing * imp.xtalkSpacing);
    const ab = prbs(nBits + 40, 7, 0x11);
    const off = Math.floor(SPU * 0.37);
    let pa = 0;
    for (let k = 0; k < ab.length; k++) {
      const d = ab[k] * A - pa;
      pa = ab[k] * A;
      if (d === 0) continue;
      const base = k * SPU + off;
      for (let m = 2; m < Math.min(win, 40 * SPU); m++) {
        const n = base + m;
        if (n >= N) break;
        y[n] += d * kx * (pulseNorm[m] - pulseNorm[m - 2]) * SPU * 0.25;
      }
    }
  }
  // noise (lightly band-limited)
  if (imp.noiseMv > 0) {
    let z = 0;
    const s = imp.noiseMv / 1000;
    for (let n = 0; n < N; n++) { z = 0.7 * z + 0.3 * rng.g() * s * 1.8; y[n] += z; }
  }

  // DFE: subtract decided-symbol feedback using cursor taps of the equalized pulse
  const pe = ffePulse(pulseNorm, eq.pre, eq.post);
  const taps: number[] = [];
  for (let t = 1; t <= eq.dfeTaps; t++) taps.push(A * (pe[peakIdx + t * SPU] ?? 0));
  const startUi = 20, endUi = nBits + 10;
  if (taps.length) {
    for (let i = startUi - 2; i < endUi + 2; i++) {
      let corr = 0;
      for (let t = 0; t < taps.length; t++) corr += bits[i - 1 - t] * taps[t];
      const c = i * SPU + peakIdx;
      for (let n = c - SPU / 2; n < c + SPU / 2; n++) if (n >= 0 && n < N) y[n] -= corr;
    }
  }

  // eye metrics at sampling phases within the centre UI
  let bestH = -Infinity, bestPh = 0;
  const heights = new Float64Array(SPU);
  for (let ph = 0; ph < SPU; ph++) {
    let min1 = Infinity, max0 = -Infinity;
    for (let i = startUi; i < endUi; i++) {
      const n = i * SPU + peakIdx - SPU / 2 + ph;
      const v = y[n];
      if (bits[i] > 0) { if (v < min1) min1 = v; } else if (v > max0) max0 = v;
    }
    heights[ph] = min1 - max0;
    if (heights[ph] > bestH) { bestH = heights[ph]; bestPh = ph; }
  }
  let open = 0;
  for (let ph = 0; ph < SPU; ph++) if (heights[ph] > 0) open++;

  // density raster: 2 UI centred on the eye
  const density = new Float32Array(W * H);
  let peak = 0;
  for (let n = startUi * SPU; n < endUi * SPU; n++) { const a = Math.abs(y[n]); if (a > peak) peak = a; }
  const vMax = Math.max(Math.min(peak, A * 1.5) * 1.18, 0.02);
  const toRow = (v: number) => ((vMax - v) / (2 * vMax)) * (H - 1);
  const xs = (W - 1) / (2 * SPU);
  for (let i = startUi; i < endUi; i++) {
    const n0 = i * SPU + peakIdx - SPU;
    let px = 0, py = toRow(y[n0]);
    for (let j = 1; j <= 2 * SPU; j++) {
      const cx = j * xs, cy = toRow(y[n0 + j]);
      const x0 = Math.round(px), x1 = Math.round(cx);
      for (let x = x0; x <= x1; x++) {
        const tt = x1 === x0 ? 1 : (x - px) / (cx - px);
        const ya = py + (cy - py) * Math.max(0, tt - 0.5 / xs / 2);
        const yb = py + (cy - py) * Math.min(1, tt + 0.5 / xs / 2);
        let r0 = Math.round(Math.min(ya, yb)), r1 = Math.round(Math.max(ya, yb));
        if (r0 < 0) r0 = 0;
        if (r1 > H - 1) r1 = H - 1;
        if (x < 0 || x >= W) continue;
        for (let r = r0; r <= r1; r++) density[r * W + x] += 1;
      }
      px = cx; py = cy;
    }
  }

  const pda = pdaEyeHeight(pe, peakIdx, eq.dfeTaps, win) * A;
  return {
    w: W, h: H, density, vRange: vMax,
    heightMv: Math.max(0, bestH) * 1000,
    widthUi: open / SPU,
    sampleUi: (bestPh - SPU / 2) / SPU,
    pdaMv: pda * 1000,
    mainCursorMv: pe[peakIdx] * A * 1000,
  };
}

/** TX FFE coefficient space, PCIe-like: |c−1| ≤ 0.15, |c+1| ≤ 0.25, boost ≤ ~9.5 dB. */
export const FFE_LIMIT = { pre: 0.15, post: 0.25, sum: 0.33 };
export const ffeBoostDb = (pre: number, post: number) => 20 * Math.log10(1 / Math.max(1e-3, 1 - 2 * (pre + post)));

/** Link-training style search over FFE + CTLE using peak-distortion analysis. */
export function autoTune(fr: FreqResult, rateGbps: number, dfeTaps: number) {
  let best = { pre: 0, post: 0, ctleDb: 0, eh: -Infinity };
  for (let ct = 0; ct <= 14; ct += 2) {
    const pr = pulseResponse(fr, rateGbps, ct);
    for (let pre = 0; pre <= FFE_LIMIT.pre + 1e-9; pre += 0.025) {
      for (let post = 0; post <= FFE_LIMIT.post + 1e-9; post += 0.025) {
        if (pre + post > FFE_LIMIT.sum + 1e-9) continue;
        const pe = ffePulse(pr.pulse, pre, post);
        const eh = pdaEyeHeight(pe, pr.peakIdx, dfeTaps, pr.window);
        if (eh > best.eh) best = { pre: +pre.toFixed(3), post: +post.toFixed(3), ctleDb: ct, eh };
      }
    }
  }
  return best;
}

/* ---------------- presets ---------------- */
export interface Preset {
  id: string;
  label: string;
  rateGbps: number;
  zRef: number;
  lengthIn: number;
  mask: { ehMv: number; ewUi: number };
  dfe: number;
  note: string;
}

export const PRESETS: Preset[] = [
  { id: "pcie3", label: "PCIe Gen3 · 8 GT/s", rateGbps: 8, zRef: 85, lengthIn: 12, mask: { ehMv: 25, ewUi: 0.3 }, dfe: 1, note: "Nyquist 4 GHz" },
  { id: "pcie4", label: "PCIe Gen4 · 16 GT/s", rateGbps: 16, zRef: 85, lengthIn: 9, mask: { ehMv: 15, ewUi: 0.3 }, dfe: 2, note: "Nyquist 8 GHz" },
  { id: "pcie5", label: "PCIe Gen5 · 32 GT/s", rateGbps: 32, zRef: 85, lengthIn: 6, mask: { ehMv: 10, ewUi: 0.3 }, dfe: 3, note: "Nyquist 16 GHz" },
  { id: "usb2", label: "USB 3.2 Gen2 · 10 Gb/s", rateGbps: 10, zRef: 90, lengthIn: 5, mask: { ehMv: 70, ewUi: 0.45 }, dfe: 1, note: "Nyquist 5 GHz" },
  { id: "hdmi", label: "HDMI 2.0 · 6 Gb/s", rateGbps: 6, zRef: 100, lengthIn: 6, mask: { ehMv: 150, ewUi: 0.6 }, dfe: 0, note: "Nyquist 3 GHz" },
  { id: "mipi", label: "MIPI D-PHY · 2.5 Gb/s", rateGbps: 2.5, zRef: 100, lengthIn: 6, mask: { ehMv: 70, ewUi: 0.6 }, dfe: 0, note: "Nyquist 1.25 GHz" },
];
