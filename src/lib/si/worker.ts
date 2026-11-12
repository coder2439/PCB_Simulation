/// <reference lib="webworker" />
import { autoTune, channelResponse, cursors, pulseResponse, simulateEye, SPU, type ChannelParams, type EqParams, type ImpairParams } from "./channel";
import { transient, type PdnParams } from "./pdn";
import { simulateTdr, type Segment, type Termination } from "./tdr";

export type WorkerRequest =
  | { id: number; kind: "channel"; p: ChannelParams; eq: EqParams; imp: ImpairParams; tune: boolean }
  | { id: number; kind: "tdr"; segs: Segment[]; term: Termination; z0: number; rise: number; measured?: { segs: Segment[]; rise: number } }
  | { id: number; kind: "pdn"; p: PdnParams; view: "board" | "die"; rise: number };

export function compute(req: WorkerRequest): { result: unknown; transfer: Transferable[] } {
  if (req.kind === "channel") return computeChannel(req);
  if (req.kind === "tdr") {
    const r = simulateTdr(req.segs, req.term, req.z0, req.rise);
    const m = req.measured ? simulateTdr(req.measured.segs, req.term, req.z0, req.measured.rise, 7, 0.006) : null;
    return { result: { ...r, measured: m }, transfer: [] };
  }
  const tr = transient(req.p, req.view, req.rise);
  return { result: tr, transfer: [tr.t.buffer, tr.v.buffer] };
}

function computeChannel(req: Extract<WorkerRequest, { kind: "channel" }>) {
  const fr = channelResponse(req.p);
  let eq = req.eq;
  if (req.tune) {
    const t = autoTune(fr, req.p.rateGbps, req.eq.dfeTaps);
    eq = { ...eq, pre: t.pre, post: t.post, ctleDb: t.ctleDb };
  }
  const pr = pulseResponse(fr, req.p.rateGbps, eq.ctleDb);
  const pr0 = req.eq.ctleDb === 0 && !req.tune ? pr : pulseResponse(fr, req.p.rateGbps, 0);
  const eye = simulateEye(pr.step, pr.pulse, pr.peakIdx, pr.window, req.p.rateGbps, eq, req.imp);

  // frequency plot: up to 2.5 × Nyquist
  const fNyq = (req.p.rateGbps * 1e9) / 2;
  let kMax = 1;
  while (kMax < fr.f.length - 1 && fr.f[kMax] < fNyq * 2.5) kMax++;
  const f = fr.f.slice(0, kMax + 1), s21 = fr.s21db.slice(0, kMax + 1), s11 = fr.s11db.slice(0, kMax + 1);
  let kN = 0;
  while (kN < fr.f.length - 1 && fr.f[kN] < fNyq) kN++;
  const ilNyq = fr.s21db[kN - 1] + ((fr.s21db[kN] - fr.s21db[kN - 1]) * (fNyq - fr.f[kN - 1])) / (fr.f[kN] - fr.f[kN - 1]);

  // pulse plot: −4 … +16 UI around main cursor, raw (pre-EQ) and equalized
  const from = Math.max(0, pr.peakIdx - 4 * SPU), to = Math.min(pr.pulse.length, pr.peakIdx + 16 * SPU);
  const n = to - from;
  const tUi = new Float64Array(n), pRaw = new Float64Array(n), pEq = new Float64Array(n);
  const c0 = 1 - eq.pre - eq.post;
  const peq = pr.pulse;
  for (let i = 0; i < n; i++) {
    const idx = from + i;
    tUi[i] = (idx - pr.peakIdx) / SPU;
    const r0 = pr0.pulse[idx - (pr.peakIdx - pr0.peakIdx)] ?? 0;
    pRaw[i] = r0;
    pEq[i] = c0 * peq[idx] - eq.pre * (peq[idx + SPU] ?? 0) - eq.post * (peq[idx - SPU] ?? 0);
  }
  const curs = cursors(pEq, pr.peakIdx - from, 2, 10);

  const result = {
    f, s21, s11, ilNyq, delayNs: fr.delayNs,
    tUi, pRaw, pEq, cursors: curs,
    eye, eq,
  };
  return { result, transfer: [f.buffer, s21.buffer, s11.buffer, tUi.buffer, pRaw.buffer, pEq.buffer, eye.density.buffer] };
}

// Worker entry
const ctx = globalThis as unknown as DedicatedWorkerGlobalScope;
if (typeof (globalThis as { document?: unknown }).document === "undefined" && typeof ctx.postMessage === "function") {
  ctx.onmessage = (e: MessageEvent<WorkerRequest>) => {
    try {
      const { result, transfer } = compute(e.data);
      ctx.postMessage({ id: e.data.id, ok: true, result }, transfer);
    } catch (err) {
      ctx.postMessage({ id: e.data.id, ok: false, error: String(err) });
    }
  };
}
