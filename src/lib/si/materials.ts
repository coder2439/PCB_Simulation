export interface Laminate { id: string; name: string; example: string; dk: number; df: number; relCost: string }
export interface Copper { id: string; name: string; rqUm: number }

/** Representative values for teaching. Use the laminate vendor's construction-specific data for design. */
export const LAMINATES: Laminate[] = [
  { id: "fr4", name: "Standard FR-4", example: "generic Tg150–170 FR-4", dk: 4.2, df: 0.02, relCost: "1×" },
  { id: "mid", name: "Mid-loss", example: "FR408HR / IT-170GRA class", dk: 3.65, df: 0.0092, relCost: "≈1.3–1.6×" },
  { id: "low", name: "Low-loss", example: "Megtron 6 / IT-968 class", dk: 3.4, df: 0.003, relCost: "≈2.5–3×" },
  { id: "ultra", name: "Ultra-low-loss", example: "Megtron 7 / Tachyon-100G class", dk: 3.3, df: 0.0017, relCost: "≈3.5–5×" },
];

export const COPPERS: Copper[] = [
  { id: "std", name: "Standard (STD)", rqUm: 2.5 },
  { id: "rtf", name: "Reverse-treated (RTF)", rqUm: 1.2 },
  { id: "hvlp", name: "HVLP / VLP-2", rqUm: 0.4 },
];

export const C_IN_PER_NS = 11.8; // speed of light, inch/ns
export const MIL_PER_MM = 39.37;

/** Skin depth of copper in µm. */
export const skinDepthUm = (fHz: number) => 2.09 / Math.sqrt(Math.max(fHz, 1) / 1e9);

/** Hammerstad roughness correction factor (saturates at 2). */
export const roughness = (fHz: number, rqUm: number) => 1 + (2 / Math.PI) * Math.atan(1.4 * (rqUm / skinDepthUm(fHz)) ** 2);

/**
 * Attenuation in dB/inch for a stripline-like trace.
 * Conductor: ≈ 36/(w·Z0)·√f (Bogatin rule of thumb, w in mil, Z0 single-ended/odd-mode, f in GHz) × roughness.
 * Dielectric: 2.3 · f · Df · √Dk.
 */
export function lossDbPerIn(fHz: number, opts: { wMil: number; z0: number; dk: number; df: number; rqUm: number }) {
  const fG = fHz / 1e9;
  const cond = (36 / (opts.wMil * opts.z0)) * Math.sqrt(Math.max(fG, 0)) * roughness(fHz, opts.rqUm);
  const diel = 2.3 * fG * opts.df * Math.sqrt(opts.dk);
  return { cond, diel, total: cond + diel };
}

/** Quarter-wave via-stub resonance in Hz. */
export const stubResonanceHz = (stubMil: number, dk: number) => (C_IN_PER_NS * 1e9) / (4 * (stubMil / 1000) * Math.sqrt(dk));
