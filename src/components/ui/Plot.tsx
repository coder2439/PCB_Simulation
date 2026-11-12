"use client";

import { useEffect, useRef, useState } from "react";

export interface Series {
  x: ArrayLike<number>;
  y: ArrayLike<number>;
  color: string;
  width?: number;
  dash?: number[];
  label?: string;
  fill?: string;
  stems?: boolean;
}
export interface Line { v: number; color: string; label?: string; dash?: boolean }
export interface Band { from: number; to: number; color: string; label?: string }

export interface PlotProps {
  series: Series[];
  xDomain: [number, number];
  yDomain: [number, number];
  xLog?: boolean;
  yLog?: boolean;
  xLabel?: string;
  yLabel?: string;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  vlines?: Line[];
  hlines?: Line[];
  xBands?: Band[];
  yBands?: Band[];
  height?: number;
  hover?: (x: number) => string | null;
  ariaLabel: string;
}

const M = { l: 54, r: 14, t: 14, b: 36 };

function niceTicks(a: number, b: number, n = 6) {
  const span = b - a;
  const step0 = span / n;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-6; v += step) out.push(+v.toPrecision(12));
  return out;
}
function logTicks(a: number, b: number) {
  const out: number[] = [];
  for (let e = Math.floor(Math.log10(a)); e <= Math.ceil(Math.log10(b)); e++) {
    const v = Math.pow(10, e);
    if (v >= a * 0.999 && v <= b * 1.001) out.push(v);
  }
  return out;
}

export function engFmt(v: number, unit = "") {
  const a = Math.abs(v);
  const pre: [number, string][] = [[1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""], [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"]];
  for (const [s, p] of pre) if (a >= s * 0.999) return `${+(v / s).toPrecision(3)}${p}${unit}`;
  return `${+v.toPrecision(3)}${unit}`;
}

let monoFont = "";
function font(size: number) {
  if (!monoFont && typeof window !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim();
    monoFont = v ? `${v}, ui-monospace, monospace` : "ui-monospace, monospace";
  }
  return `${size}px ${monoFont}`;
}

export default function Plot(p: PlotProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(600);
  const [hx, setHx] = useState<number | null>(null);
  const H = p.height ?? 260;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = w * dpr;
    c.height = H * dpr;
    const g = c.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, H);
    const pw = w - M.l - M.r, ph = H - M.t - M.b;
    const [x0, x1] = p.xDomain, [y0, y1] = p.yDomain;
    const X = (v: number) => M.l + (p.xLog ? (Math.log10(v) - Math.log10(x0)) / (Math.log10(x1) - Math.log10(x0)) : (v - x0) / (x1 - x0)) * pw;
    const Y = (v: number) => M.t + (1 - (p.yLog ? (Math.log10(Math.max(v, 1e-30)) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0)) : (v - y0) / (y1 - y0))) * ph;

    // bands
    for (const b of p.xBands ?? []) {
      g.fillStyle = b.color;
      g.fillRect(X(b.from), M.t, X(b.to) - X(b.from), ph);
    }
    for (const b of p.yBands ?? []) {
      const ya = Y(Math.min(y1, Math.max(y0, b.to))), yb = Y(Math.max(y0, Math.min(y1, b.from)));
      g.fillStyle = b.color;
      g.fillRect(M.l, ya, pw, yb - ya);
    }

    // grid + ticks
    g.font = font(10.5);
    g.lineWidth = 1;
    const xt = p.xLog ? logTicks(x0, x1) : niceTicks(x0, x1, Math.max(3, Math.round(pw / 90)));
    const yt = p.yLog ? logTicks(y0, y1) : niceTicks(y0, y1, Math.max(3, Math.round(ph / 46)));
    g.strokeStyle = "rgba(148,163,184,0.10)";
    g.fillStyle = "rgba(141,154,174,0.95)";
    g.textAlign = "center";
    g.textBaseline = "top";
    for (const t of xt) {
      const x = Math.round(X(t)) + 0.5;
      g.beginPath(); g.moveTo(x, M.t); g.lineTo(x, M.t + ph); g.stroke();
      g.fillText(p.xFmt ? p.xFmt(t) : engFmt(t), x, M.t + ph + 7);
    }
    if (p.xLog) {
      g.strokeStyle = "rgba(148,163,184,0.05)";
      for (let e = Math.floor(Math.log10(x0)); e < Math.ceil(Math.log10(x1)); e++)
        for (let m = 2; m < 10; m++) {
          const v = m * Math.pow(10, e);
          if (v <= x0 || v >= x1) continue;
          const x = Math.round(X(v)) + 0.5;
          g.beginPath(); g.moveTo(x, M.t); g.lineTo(x, M.t + ph); g.stroke();
        }
    }
    g.strokeStyle = "rgba(148,163,184,0.10)";
    g.textAlign = "right";
    g.textBaseline = "middle";
    for (const t of yt) {
      const y = Math.round(Y(t)) + 0.5;
      g.beginPath(); g.moveTo(M.l, y); g.lineTo(M.l + pw, y); g.stroke();
      g.fillText(p.yFmt ? p.yFmt(t) : engFmt(t), M.l - 8, y);
    }
    // axes labels
    g.fillStyle = "rgba(141,154,174,0.8)";
    g.textAlign = "center";
    g.textBaseline = "bottom";
    if (p.xLabel) g.fillText(p.xLabel, M.l + pw / 2, H - 2);
    if (p.yLabel) {
      g.save();
      g.translate(11, M.t + ph / 2);
      g.rotate(-Math.PI / 2);
      g.textBaseline = "middle";
      g.fillText(p.yLabel, 0, 0);
      g.restore();
    }

    // clip to plot area
    g.save();
    g.beginPath();
    g.rect(M.l, M.t, pw, ph);
    g.clip();

    for (const l of p.hlines ?? []) {
      const y = Math.round(Y(l.v)) + 0.5;
      g.strokeStyle = l.color;
      g.setLineDash(l.dash ? [5, 4] : []);
      g.lineWidth = 1.25;
      g.beginPath(); g.moveTo(M.l, y); g.lineTo(M.l + pw, y); g.stroke();
      if (l.label) { g.fillStyle = l.color; g.textAlign = "right"; g.textBaseline = "bottom"; g.font = font(10.5); g.fillText(l.label, M.l + pw - 6, y - 4); }
    }
    for (const l of p.vlines ?? []) {
      const x = Math.round(X(l.v)) + 0.5;
      g.strokeStyle = l.color;
      g.setLineDash(l.dash ? [5, 4] : []);
      g.lineWidth = 1.25;
      g.beginPath(); g.moveTo(x, M.t); g.lineTo(x, M.t + ph); g.stroke();
      if (l.label) { g.fillStyle = l.color; g.textAlign = "left"; g.textBaseline = "top"; g.font = font(10.5); g.fillText(l.label, x + 5, M.t + 5); }
    }
    g.setLineDash([]);

    for (const s of p.series) {
      const n = Math.min(s.x.length, s.y.length);
      if (!n) continue;
      g.strokeStyle = s.color;
      g.lineWidth = s.width ?? 1.75;
      g.setLineDash(s.dash ?? []);
      g.lineJoin = "round";
      if (s.stems) {
        for (let i = 0; i < n; i++) {
          const x = X(s.x[i]), y = Y(s.y[i]);
          g.beginPath(); g.moveTo(x, Y(0)); g.lineTo(x, y); g.stroke();
          g.fillStyle = s.color;
          g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill();
        }
        continue;
      }
      g.beginPath();
      // decimate to ~2 points per pixel
      const stride = Math.max(1, Math.floor(n / (pw * 2)));
      for (let i = 0; i < n; i += stride) {
        const x = X(s.x[i]), y = Y(s.y[i]);
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
      if (s.fill) {
        g.lineTo(X(s.x[n - 1]), Y(p.yLog ? y0 : Math.max(y0, 0)));
        g.lineTo(X(s.x[0]), Y(p.yLog ? y0 : Math.max(y0, 0)));
        g.closePath();
        g.fillStyle = s.fill;
        g.fill();
      }
    }
    g.setLineDash([]);

    // hover crosshair
    if (hx !== null && p.hover) {
      const xv = p.xLog ? Math.pow(10, Math.log10(x0) + ((hx - M.l) / pw) * (Math.log10(x1) - Math.log10(x0))) : x0 + ((hx - M.l) / pw) * (x1 - x0);
      const txt = p.hover(xv);
      if (txt) {
        g.strokeStyle = "rgba(231,237,245,0.35)";
        g.beginPath(); g.moveTo(hx + 0.5, M.t); g.lineTo(hx + 0.5, M.t + ph); g.stroke();
        g.font = font(11);
        const lines = txt.split("\n");
        const tw = Math.max(...lines.map((l) => g.measureText(l).width)) + 16;
        const th = lines.length * 16 + 8;
        const bx = hx + 12 + tw > M.l + pw ? hx - 12 - tw : hx + 12;
        g.fillStyle = "rgba(8,11,17,0.92)";
        g.strokeStyle = "rgba(148,163,184,0.25)";
        g.beginPath();
        g.roundRect(bx, M.t + 8, tw, th, 6);
        g.fill(); g.stroke();
        g.fillStyle = "#e7edf5";
        g.textAlign = "left";
        g.textBaseline = "top";
        lines.forEach((l, i) => g.fillText(l, bx + 8, M.t + 13 + i * 16));
      }
    }
    g.restore();
    g.strokeStyle = "rgba(148,163,184,0.22)";
    g.strokeRect(M.l + 0.5, M.t + 0.5, pw, ph);
  }, [p, w, H, hx]);

  return (
    <div ref={wrap} className="relative w-full" style={{ height: H }}>
      <canvas
        ref={cv}
        role="img"
        aria-label={p.ariaLabel}
        style={{ width: w, height: H, display: "block" }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - r.left;
          setHx(x >= M.l && x <= w - M.r ? x : null);
        }}
        onMouseLeave={() => setHx(null)}
      />
    </div>
  );
}
