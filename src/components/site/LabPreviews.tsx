/** Lightweight decorative SVG previews for the lab cards (no JS). */
export function EyePreview() {
  const paths: string[] = [];
  for (let i = 0; i < 18; i++) {
    const a = 28 + (i % 3) * 2 + (i * 7) % 5;
    const up = i % 2 === 0;
    const y0 = up ? 30 + a : 90 - a, y1 = up ? 90 - a : 30 + a;
    paths.push(`M0 ${y0} C 40 ${y0}, 60 ${y1}, 100 ${y1} S 160 ${y0}, 200 ${y0}`);
  }
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#2dd4bf" strokeOpacity={0.12 + (i % 4) * 0.06} strokeWidth="1.4" />)}
      <path d="M70 60 L85 46 L115 46 L130 60 L115 74 L85 74 Z" fill="rgba(74,222,128,0.12)" stroke="#4ade80" strokeWidth="1" />
    </svg>
  );
}
export function ImpedancePreview() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <rect x="10" y="92" width="180" height="8" fill="#c98552" opacity="0.8" />
      <rect x="10" y="62" width="180" height="30" fill="rgba(201,183,122,0.14)" />
      <path d="M62 62 L96 62 L92 52 L66 52 Z" fill="#e39a63" />
      <path d="M104 62 L138 62 L134 52 L108 52 Z" fill="#e39a63" />
      <path d="M79 52 C 79 30, 121 30, 121 52" fill="none" stroke="#38bdf8" strokeOpacity="0.6" strokeDasharray="3 3" />
      <path d="M79 62 L 79 92 M121 62 L121 92" stroke="#2dd4bf" strokeOpacity="0.5" strokeDasharray="2 3" />
      <text x="100" y="24" textAnchor="middle" fontSize="11" fill="#8d9aae" fontFamily="monospace">Zdiff 85.0 Ω</text>
    </svg>
  );
}
export function TdrPreview() {
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <path d="M0 60 H200" stroke="rgba(148,163,184,0.25)" strokeDasharray="3 3" />
      <path d="M0 60 H30 C 34 60, 36 38, 40 38 C 44 38, 46 60, 50 60 H 90 C 94 60, 96 86, 100 86 C 104 86, 106 64, 110 64 H 140 C 143 64, 145 76, 148 76 C 151 76, 153 60, 156 60 H 172 C 175 60, 177 44, 180 44 C 183 44, 185 60, 188 60 H200" fill="none" stroke="#2dd4bf" strokeWidth="2" />
      <path d="M0 60 H30 C 34 60, 36 42, 40 42 C 44 42, 46 61, 50 61 H 90 C 94 61, 96 82, 100 82 C 104 82, 106 66, 110 66 H 140 C 143 66, 145 73, 148 73 C 151 73, 153 61, 156 61 H 172 C 175 61, 177 47, 180 47 C 183 47, 185 61, 188 61 H200" fill="none" stroke="#fbbf24" strokeWidth="1.4" strokeOpacity="0.8" />
    </svg>
  );
}
export function PdnPreview() {
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const x = i * 2;
    const t = i / 100;
    const y = 70 - 30 * Math.sin(t * Math.PI * 3.2) * Math.exp(-t * 0.6) + (t > 0.8 ? -(t - 0.8) * 160 : 0);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <path d="M0 64 H200" stroke="#fbbf24" strokeDasharray="4 3" strokeOpacity="0.8" />
      <polyline points={pts.join(" ")} fill="none" stroke="#f87171" strokeWidth="2" />
    </svg>
  );
}
