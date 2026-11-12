"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface Props {
  density: Float32Array;
  w: number;
  h: number;
  vRange: number; // ± volts
  mask?: { ehMv: number; ewUi: number; centerUi: number; pass: boolean };
  sample?: { ui: number; heightMv: number };
  height?: number;
}

// perceptual "persistence" LUT: transparent → deep blue → teal → amber → white
function buildLut() {
  const stops: [number, number, number, number][] = [
    [0, 5, 7, 11], [0.12, 14, 38, 82], [0.32, 18, 120, 150], [0.55, 45, 212, 191], [0.78, 251, 191, 36], [1, 255, 250, 235],
  ];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [ta, ra, ga, ba] = stops[k], [tb, rb, gb, bb] = stops[k + 1];
    const u = (t - ta) / (tb - ta);
    lut[i * 3] = ra + (rb - ra) * u;
    lut[i * 3 + 1] = ga + (gb - ga) * u;
    lut[i * 3 + 2] = ba + (bb - ba) * u;
  }
  return lut;
}
const LUT = typeof window !== "undefined" ? buildLut() : new Uint8ClampedArray(768);

const M = { l: 54, r: 14, t: 14, b: 36 };

export default function EyeCanvas({ density, w, h, vRange, mask, sample, height = 340 }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [cw, setCw] = useState(640);
  const H = height;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const img = useMemo(() => {
    if (typeof document === "undefined") return null;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const g = off.getContext("2d")!;
    const data = g.createImageData(w, h);
    let max = 0;
    for (let i = 0; i < density.length; i++) if (density[i] > max) max = density[i];
    const lm = Math.log1p(max || 1);
    for (let i = 0; i < density.length; i++) {
      const d = density[i];
      const o = i * 4;
      if (d <= 0) { data.data[o + 3] = 0; continue; }
      const t = Math.min(1, Math.log1p(d) / lm);
      const li = Math.round(t * 255) * 3;
      data.data[o] = LUT[li];
      data.data[o + 1] = LUT[li + 1];
      data.data[o + 2] = LUT[li + 2];
      data.data[o + 3] = Math.min(255, 70 + t * 400);
    }
    g.putImageData(data, 0, 0);
    return off;
  }, [density, w, h]);

  useEffect(() => {
    const c = cv.current;
    if (!c || !img) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = cw * dpr;
    c.height = H * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, H);
    const pw = cw - M.l - M.r, ph = H - M.t - M.b;
    const X = (ui: number) => M.l + ((ui + 1) / 2) * pw; // −1 … +1 UI
    const Y = (mv: number) => M.t + ((vRange * 1000 - mv) / (2 * vRange * 1000)) * ph;
    g.fillStyle = "#04060a";
    g.fillRect(M.l, M.t, pw, ph);

    // grid
    g.strokeStyle = "rgba(148,163,184,0.09)";
    g.lineWidth = 1;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "monospace";
    g.font = `10.5px ${mono}, monospace`;
    g.fillStyle = "rgba(141,154,174,0.95)";
    g.textAlign = "center";
    g.textBaseline = "top";
    for (let u = -1; u <= 1.001; u += 0.25) {
      const x = Math.round(X(u)) + 0.5;
      g.beginPath(); g.moveTo(x, M.t); g.lineTo(x, M.t + ph); g.stroke();
      if (Math.abs(u * 2 - Math.round(u * 2)) < 1e-6) g.fillText(`${u > 0 ? "+" : ""}${u.toFixed(1)} UI`, x, M.t + ph + 7);
    }
    const vmv = vRange * 1000;
    const step = vmv > 400 ? 200 : vmv > 200 ? 100 : vmv > 80 ? 50 : 20;
    g.textAlign = "right";
    g.textBaseline = "middle";
    for (let mv = -Math.floor(vmv / step) * step; mv <= vmv; mv += step) {
      const y = Math.round(Y(mv)) + 0.5;
      g.beginPath(); g.moveTo(M.l, y); g.lineTo(M.l + pw, y); g.stroke();
      g.fillText(`${mv}`, M.l - 8, y);
    }
    g.save();
    g.translate(11, M.t + ph / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = "center";
    g.fillStyle = "rgba(141,154,174,0.8)";
    g.fillText("differential voltage (mV)", 0, 0);
    g.restore();

    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.globalCompositeOperation = "lighter";
    g.drawImage(img, M.l, M.t, pw, ph);
    g.globalCompositeOperation = "source-over";

    if (mask) {
      const c = mask.centerUi, ew = mask.ewUi, eh = mask.ehMv;
      g.beginPath();
      g.moveTo(X(c - ew / 2), Y(0));
      g.lineTo(X(c - ew / 4), Y(eh / 2));
      g.lineTo(X(c + ew / 4), Y(eh / 2));
      g.lineTo(X(c + ew / 2), Y(0));
      g.lineTo(X(c + ew / 4), Y(-eh / 2));
      g.lineTo(X(c - ew / 4), Y(-eh / 2));
      g.closePath();
      g.fillStyle = mask.pass ? "rgba(74,222,128,0.14)" : "rgba(248,113,113,0.22)";
      g.strokeStyle = mask.pass ? "rgba(74,222,128,0.9)" : "rgba(248,113,113,0.95)";
      g.lineWidth = 1.5;
      g.fill();
      g.stroke();
    }
    if (sample && sample.heightMv > 0) {
      const x = X(sample.ui);
      g.strokeStyle = "rgba(231,237,245,0.7)";
      g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(x, Y(sample.heightMv / 2)); g.lineTo(x, Y(-sample.heightMv / 2)); g.stroke();
      g.setLineDash([]);
      g.fillStyle = "#e7edf5";
      [sample.heightMv / 2, -sample.heightMv / 2].forEach((mv) => { g.beginPath(); g.arc(x, Y(mv), 2.5, 0, Math.PI * 2); g.fill(); });
    }
    g.strokeStyle = "rgba(148,163,184,0.22)";
    g.strokeRect(M.l + 0.5, M.t + 0.5, pw, ph);
    g.fillStyle = "rgba(141,154,174,0.8)";
    g.textAlign = "center";
    g.textBaseline = "bottom";
    g.fillText("time (unit intervals)", M.l + pw / 2, H - 2);
  }, [img, cw, H, vRange, mask, sample]);

  return (
    <div ref={wrap} className="relative w-full" style={{ height: H }}>
      <canvas ref={cv} role="img" aria-label="Eye diagram density plot" style={{ width: cw, height: H, display: "block" }} />
    </div>
  );
}
