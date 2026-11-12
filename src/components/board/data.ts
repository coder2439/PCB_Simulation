/**
 * Reference board "HSD-REF-01": a PCIe x4 add-in card carrying a BGA SoC,
 * 2× DDR4, GbE PHY + MagJack, HDMI, USB-C 3.2, MIPI CSI-2 FPC and an
 * SMA test coupon. Units: millimetres. World axes: X → right, Z → toward
 * the viewer (PCIe fingers), Y → up. Board top surface at y = 0.
 */
export type Iface = "pcie" | "ddr" | "usb3" | "hdmi" | "ethernet" | "mipi" | "power" | "coupon";
export type Layer = "L1" | "L3" | "L6" | "L8";
export type V2 = [number, number];

export const IFACE_ORDER: Iface[] = ["pcie", "ddr", "usb3", "hdmi", "ethernet", "mipi", "power", "coupon"];
export const IFACE_COLOR: Record<Iface, string> = {
  pcie: "#38bdf8",
  ddr: "#fbbf24",
  usb3: "#34d399",
  hdmi: "#f472b6",
  ethernet: "#a78bfa",
  mipi: "#fb923c",
  power: "#f87171",
  coupon: "#2dd4bf",
};

export const BOARD = {
  thickness: 1.6,
  xMin: -62,
  xMax: 62,
  zMin: -35,
  zMax: 31,
  tab: { x0: -10, x1: 26, z1: 38, keyX0: 2.15, keyX1: 4.05, keyDepth: 5 },
};

/** Board outline (x, z) incl. PCIe card-edge tab with key notch. */
export function outline(): V2[] {
  const { xMin, xMax, zMin, zMax, tab } = BOARD;
  const r = 2;
  const pts: V2[] = [];
  const arc = (cx: number, cz: number, a0: number, a1: number) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + ((a1 - a0) * i) / 6;
      pts.push([cx + r * Math.cos(a), cz + r * Math.sin(a)]);
    }
  };
  arc(xMin + r, zMin + r, Math.PI, Math.PI * 1.5);
  arc(xMax - r, zMin + r, Math.PI * 1.5, Math.PI * 2);
  arc(xMax - r, zMax - r, 0, Math.PI * 0.5);
  // bottom edge with tab (going right → left)
  pts.push([tab.x1 + 1, zMax], [tab.x1, zMax + 1]);
  pts.push([tab.x1, tab.z1 - 0.6], [tab.x1 - 0.6, tab.z1]);
  pts.push([tab.keyX1, tab.z1], [tab.keyX1, tab.z1 - tab.keyDepth], [tab.keyX0, tab.z1 - tab.keyDepth], [tab.keyX0, tab.z1]);
  pts.push([tab.x0 + 0.6, tab.z1], [tab.x0, tab.z1 - 0.6]);
  pts.push([tab.x0, zMax + 1], [tab.x0 - 1, zMax]);
  arc(xMin + r, zMax - r, Math.PI * 0.5, Math.PI);
  return pts;
}

/* -------------------------------------------------------------------------- */
/*                                 components                                 */
/* -------------------------------------------------------------------------- */

export type ModelKey =
  | "soc" | "ddr" | "phy" | "pmic" | "redriver" | "rj45" | "hdmi" | "usbc" | "fpc" | "sma"
  | "c0201" | "c0402" | "c0805" | "inductor" | "xtal" | "ldo";

export interface Placement {
  x: number;
  z: number;
  /** rotation about the board normal, degrees (counter-clockwise from above) */
  rot?: number;
  bottom?: boolean;
  ref?: string;
}

export interface PartGroup {
  model: ModelKey;
  iface?: Iface;
  /** override for the ceramic body colour (used to render resistors) */
  body?: string;
  items: Placement[];
}

const range = (n: number, f: (i: number) => Placement) => Array.from({ length: n }, (_, i) => f(i));

export const SOC = { x: 4, z: -6, half: 11 };
export const DDR_POS = [{ x: 30, z: -14 }, { x: 43, z: -14 }];
export const PHY_POS = { x: -36, z: -18 };
export const MUX_POS = { x: -38, z: 19 };
export const PMIC_POS = { x: 40, z: 12 };
export const FPC_POS = { x: 8, z: -32 };

export const PARTS: PartGroup[] = [
  { model: "soc", items: [{ x: SOC.x, z: SOC.z, ref: "U1" }] },
  { model: "ddr", iface: "ddr", items: DDR_POS.map((p, i) => ({ ...p, ref: `U${3 + i}` })) },
  { model: "phy", iface: "ethernet", items: [{ ...PHY_POS, ref: "U5" }] },
  { model: "redriver", iface: "usb3", items: [{ ...MUX_POS, ref: "U6" }] },
  { model: "pmic", iface: "power", items: [{ ...PMIC_POS, ref: "U7" }] },
  { model: "rj45", iface: "ethernet", items: [{ x: -55, z: -14.45, rot: 90, ref: "J1" }] },
  { model: "hdmi", iface: "hdmi", items: [{ x: -57, z: 2, rot: 180, ref: "J2" }] },
  { model: "usbc", iface: "usb3", items: [{ x: -57.5, z: 21, rot: -90, ref: "J3" }] },
  { model: "fpc", iface: "mipi", items: [{ x: FPC_POS.x, z: FPC_POS.z, rot: 180, ref: "J4" }] },
  { model: "sma", iface: "coupon", items: [{ x: 62, z: 22, rot: 180, ref: "J6" }, { x: 62, z: 29, rot: 180, ref: "J7" }] },
  { model: "xtal", iface: "ethernet", items: [{ x: -36, z: -9, ref: "Y1" }] },
  { model: "ldo", iface: "power", items: [{ x: 48, z: -28, rot: 90, ref: "U9" }, { x: 31, z: 9, ref: "U8" }] },
  {
    model: "inductor",
    iface: "power",
    items: [
      { x: 51, z: 6.5, ref: "L1" },
      { x: 51, z: 13.5, ref: "L2" },
      { x: 32.5, z: 16, rot: 90, ref: "L3" },
    ],
  },
  {
    model: "c0805",
    iface: "power",
    items: [
      ...range(3, (i) => ({ x: 57, z: 5 + i * 2.6, rot: 90 })),
      ...range(3, (i) => ({ x: 57, z: 12.5 + i * 2.6, rot: 90 })),
      ...range(3, (i) => ({ x: 36 + i * 2.6, z: 20.5 })),
    ],
  },
  // PCIe AC-coupling caps on the four TX pairs
  {
    model: "c0201",
    iface: "pcie",
    items: [7.2, 12.2, 16.2, 20.2].flatMap((cx) => [
      { x: cx - 0.45, z: 24.5, rot: 90 },
      { x: cx + 0.45, z: 24.5, rot: 90 },
    ]),
  },
  // USB SuperSpeed TX AC caps
  {
    model: "c0201",
    iface: "usb3",
    items: [16.6, 19.4].flatMap((cz) => [
      { x: -28, z: cz - 0.42 },
      { x: -28, z: cz + 0.42 },
    ]),
  },
  // DDR VTT termination resistor network (dark body)
  { model: "c0402", iface: "ddr", body: "#1a1a1a", items: range(8, (i) => ({ x: 54.2, z: -5.6 + i * 0.75 })) },
  // decoupling (top) around DRAM + VTT + PHY + SoC corners
  {
    model: "c0402",
    iface: "power",
    items: [
      ...DDR_POS.flatMap((p) => range(4, (i) => ({ x: p.x - 3 + i * 2, z: p.z - 8.2, rot: 90 }))),
      ...range(3, (i) => ({ x: 57, z: -4.5 + i * 1.8, rot: 90 })),
      ...range(3, (i) => ({ x: PHY_POS.x - 3 + i * 2.5, z: PHY_POS.z - 5, rot: 90 })),
      { x: SOC.x - 12.4, z: SOC.z - 12.4, rot: 45 },
      { x: SOC.x + 12.4, z: SOC.z - 12.4, rot: -45 },
      { x: SOC.x - 12.4, z: SOC.z + 12.4, rot: -45 },
      { x: SOC.x + 12.4, z: SOC.z + 12.4, rot: 45 },
    ],
  },
  // bottom-side BGA decoupling array right under the SoC (shortest loop)
  {
    model: "c0201",
    iface: "power",
    items: range(36, (i) => {
      const row = Math.floor(i / 6), col = i % 6;
      return { x: SOC.x - 6.25 + col * 2.5, z: SOC.z - 6.25 + row * 2.5, rot: row % 2 ? 0 : 90, bottom: true };
    }),
  },
  {
    model: "c0402",
    iface: "power",
    items: range(12, (i) => ({ x: SOC.x - 8.8 + (i % 6) * 3.5, z: SOC.z + (i < 6 ? -9.3 : 9.3), bottom: true })),
  },
];

/* -------------------------------------------------------------------------- */
/*                                   routing                                  */
/* -------------------------------------------------------------------------- */

export interface Track { iface: Iface; layer: Layer; pts: V2[]; w: number }
export interface Via { x: number; z: number; iface: Iface; gnd?: boolean }
export interface Pour { iface: Iface; pts: V2[] }

/** Offset a polyline sideways (left normal) with mitred joins. */
export function offsetPolyline(pts: V2[], d: number): V2[] {
  if (d === 0) return pts.map((p) => [p[0], p[1]]);
  const out: V2[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const n1 = normal(i === 0 ? p : a, i === 0 ? b : p);
    const n2 = normal(i === pts.length - 1 ? a : p, i === pts.length - 1 ? p : b);
    let nx = n1[0] + n2[0], nz = n1[1] + n2[1];
    const len = Math.hypot(nx, nz) || 1;
    nx /= len; nz /= len;
    const cos = nx * n1[0] + nz * n1[1];
    const m = d / Math.max(cos, 0.35);
    out.push([p[0] + nx * m, p[1] + nz * m]);
  }
  return out;
}
function normal(a: V2, b: V2): V2 {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l = Math.hypot(dx, dz) || 1;
  return [-dz / l, dx / l];
}

/** Insert an accordion serpentine between a and b (straight segment). */
export function serpentine(a: V2, b: V2, amp: number, pitch: number, count: number): V2[] {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const ux = dx / L, uz = dz / L, nx = -uz, nz = ux;
  const half = pitch / 2;
  const span = count * half;
  const start = (L - span) / 2;
  const at = (s: number, o: number): V2 => [a[0] + ux * s + nx * o, a[1] + uz * s + nz * o];
  const c = half * 0.18;
  const pts: V2[] = [a, at(start, 0)];
  for (let k = 0; k < count; k++) {
    const s0 = start + k * half;
    const sgn = k % 2 ? -1 : 1;
    pts.push(at(s0 + c, sgn * amp), at(s0 + half - c, sgn * amp));
  }
  pts.push(at(start + span, 0), b);
  return pts;
}

const TRACKS: Track[] = [];
const VIAS: Via[] = [];
const POURS: Pour[] = [];

function pair(iface: Iface, layer: Layer, pts: V2[], w = 0.18, gap = 0.2) {
  const h = (w + gap) / 2;
  TRACKS.push({ iface, layer, pts: offsetPolyline(pts, h), w }, { iface, layer, pts: offsetPolyline(pts, -h), w });
}
function bus(iface: Iface, layer: Layer, pts: V2[], n: number, pitch: number, w = 0.14) {
  for (let i = 0; i < n; i++) TRACKS.push({ iface, layer, pts: offsetPolyline(pts, (i - (n - 1) / 2) * pitch), w });
}
function pairVias(iface: Iface, x: number, z: number, along: "x" | "z", sep = 0.75) {
  const h = sep / 2;
  if (along === "x") {
    VIAS.push({ x: x - h, z, iface }, { x: x + h, z, iface });
    VIAS.push({ x, z: z - 0.8, iface: "power", gnd: true }, { x, z: z + 0.8, iface: "power", gnd: true });
  } else {
    VIAS.push({ x, z: z - h, iface }, { x, z: z + h, iface });
    VIAS.push({ x: x - 0.8, z, iface: "power", gnd: true }, { x: x + 0.8, z, iface: "power", gnd: true });
  }
}

/* ---- PCIe x4: TX on L1 with AC caps → top fingers; RX on L3 stripline → bottom fingers */
const S = SOC;
[7.2, 12.2, 16.2, 20.2].forEach((fx, i) => {
  const sx = S.x - 3 + i * 2.2;
  const pts: V2[] = [[sx, S.z + S.half - 1.5], [sx, 7], [fx, 7 + Math.abs(fx - sx)], [fx, 23.6]];
  pair("pcie", "L1", pts, 0.18, 0.22);
  // split around the AC caps then into the fingers (finger pitch = 1.0 mm)
  TRACKS.push({ iface: "pcie", layer: "L1", pts: [[fx - 0.45, 25.4], [fx - 0.45, 30.8], [fx - 0.5, 32.6]], w: 0.18 });
  TRACKS.push({ iface: "pcie", layer: "L1", pts: [[fx + 0.45, 25.4], [fx + 0.45, 30.8], [fx + 0.5, 32.6]], w: 0.18 });
  TRACKS.push({ iface: "pcie", layer: "L1", pts: [[fx - 0.2, 23.6], [fx - 0.45, 23.9]], w: 0.18 });
  TRACKS.push({ iface: "pcie", layer: "L1", pts: [[fx + 0.2, 23.6], [fx + 0.45, 23.9]], w: 0.18 });
});
[9.2, 14.2, 18.2, 22.2].forEach((fx, i) => {
  const sx = S.x + 6 + i * 1.6;
  const pts: V2[] = [[sx, S.z + S.half - 2], [sx, 9.5 + i * 0.7], [fx, 9.5 + i * 0.7 + Math.abs(fx - sx)], [fx, 29.2]];
  pair("pcie", "L3", pts, 0.16, 0.2);
  pairVias("pcie", fx, 29.6, "x", 0.72);
  pairVias("pcie", sx, S.z + S.half - 2.4, "x", 0.72);
});

/* ---- DDR4: byte lanes on L1 with length-tuning serpentines, CA fly-by on L1 */
{
  const x0 = S.x + S.half - 0.6, x1 = DDR_POS[0].x - 4.5 + 0.4;
  for (let byte = 0; byte < 2; byte++) {
    const zc = DDR_POS[0].z - 3.2 + byte * 6.4;
    for (let k = 0; k < 10; k++) {
      const z = zc - 2.7 + k * 0.6;
      const tune = (k * 7 + byte * 3) % 5; // pseudo per-line delay deficit
      if (tune > 0 && k !== 4 && k !== 5) {
        TRACKS.push({ iface: "ddr", layer: "L1", pts: serpentine([x0, z], [x1, z], 0.2, 0.62, 2 + tune * 2), w: 0.13 });
      } else {
        TRACKS.push({ iface: "ddr", layer: "L1", pts: [[x0, z], [x1, z]], w: k === 4 || k === 5 ? 0.15 : 0.13 });
      }
    }
  }
  // second DRAM: byte lanes on inner L6, passing under U3
  for (let byte = 0; byte < 2; byte++) {
    const zc = DDR_POS[1].z - 3.2 + byte * 6.4;
    bus("ddr", "L6", [[x0, zc + 0.3], [DDR_POS[1].x - 4.5 + 0.4, zc + 0.3]], 10, 0.55, 0.13);
  }
  // CA/CMD/CLK fly-by: SoC → U3 → U4 → VTT terminations
  const zb = -4.5;
  bus("ddr", "L1", [[x0, -2.2], [x0 + 3, zb + 0.3], [54.2 - 1, zb + 0.3]], 8, 0.5, 0.12);
  for (const p of DDR_POS) {
    for (let k = 0; k < 8; k++) {
      const z = zb + 0.3 + (k - 3.5) * 0.5;
      const x = p.x - 2 + k * 0.55;
      TRACKS.push({ iface: "ddr", layer: "L1", pts: [[x, z], [x, p.z + 6.6]], w: 0.1 });
    }
  }
  // clock pair (differential) in the fly-by
  pair("ddr", "L1", [[x0, -6.4], [DDR_POS[0].x - 6, -6.4], [DDR_POS[0].x - 6, -7.2]], 0.13, 0.15);
}

/* ---- USB 3.2: SoC → AC caps → Type-C mux → receptacle */
[16.6, 19.4].forEach((z, i) => {
  pair("usb3", "L1", [[S.x - S.half + 0.6, S.z + 7 + i * 1.6], [-14, S.z + 7 + i * 1.6], [-14 - (z - S.z - 7 - i * 1.6), z], [-27.6, z]], 0.18, 0.2);
  pair("usb3", "L1", [[-28.4, z], [MUX_POS.x + 2.6, z]], 0.18, 0.44);
});
[21.8, 23.2].forEach((z, i) => {
  pair("usb3", "L1", [[S.x - S.half + 0.6, S.z + 10.4 + i * 1.6], [-12, S.z + 10.4 + i * 1.6], [-12 - (z - S.z - 10.4 - i * 1.6), z], [-31, z], [MUX_POS.x + 2.6, MUX_POS.z + 1.2 + i * 0.5]], 0.18, 0.2);
});
for (let i = 0; i < 4; i++) {
  const z = MUX_POS.z - 1.6 + i * 1.05;
  pair("usb3", "L1", [[MUX_POS.x - 2.4, z], [-46, z], [-51.6, 21 - 2.1 + i * 1.4]], 0.16, 0.18);
}

/* ---- HDMI: four TMDS pairs SoC → connector, DC-coupled */
for (let i = 0; i < 4; i++) {
  const zs = S.z - 1.2 + i * 1.6;
  const zc = 2 - 3.3 + i * 2.2;
  pair("hdmi", "L1", [[S.x - S.half + 0.6, zs], [-20, zs], [-20 - Math.abs(zc - zs), zc], [-50.5, zc]], 0.18, 0.2);
}

/* ---- Ethernet: RGMII bus SoC → PHY, four MDI pairs PHY → MagJack */
bus("ethernet", "L1", [[S.x - S.half + 0.6, -13.5], [-24, -13.5], [-27.5, -17], [PHY_POS.x + 3.3, -17]], 12, 0.45, 0.12);
for (let i = 0; i < 4; i++) {
  const z = PHY_POS.z - 2.4 + i * 1.6;
  pair("ethernet", "L1", [[PHY_POS.x - 3.3, z], [-43, z], [-46.2, -18 - 3.6 + i * 2.4]], 0.18, 0.2);
}
TRACKS.push({ iface: "ethernet", layer: "L1", pts: [[-36, -10.6], [-36, -14.3]], w: 0.14 });
TRACKS.push({ iface: "ethernet", layer: "L1", pts: [[-35, -10.6], [-35, -14.3]], w: 0.14 });

/* ---- MIPI CSI-2: clock + 4 data lanes from FPC to SoC */
for (let i = 0; i < 5; i++) {
  const xf = FPC_POS.x - 5 + i * 2.5;
  const xs = S.x - 4 + i * 2;
  pair("mipi", "L1", [[xf, FPC_POS.z + 2.8], [xf, -25.5], [xs, -25.5 + Math.abs(xs - xf) * 0.5], [xs, S.z - S.half + 0.6]], 0.17, 0.19);
}

/* ---- Test coupon: 50 Ω / 100 Ω structure between two edge SMAs (2x-thru) */
TRACKS.push({ iface: "coupon", layer: "L1", pts: [[60.4, 22], [36, 22], [34, 24], [34, 27], [36, 29], [60.4, 29]], w: 0.32 });

/* ---- Power pours: buck switch nodes & output copper */
POURS.push(
  { iface: "power", pts: [[43, 9], [48, 4.5], [54, 4.5], [54, 8.5], [48, 8.5], [43, 11]] },
  { iface: "power", pts: [[43, 13], [48, 11.5], [54, 11.5], [54, 15.5], [48, 15.5], [43, 15]] },
  { iface: "power", pts: [[55.6, 3.8], [58.4, 3.8], [58.4, 18.6], [55.6, 18.6]] },
  { iface: "power", pts: [[35, 19.4], [43.4, 19.4], [43.4, 21.6], [35, 21.6]] },
);

/* ---- GND stitching fence along the board edge + around high-speed corridors */
for (let x = -58; x <= 58; x += 3) {
  VIAS.push({ x, z: BOARD.zMin + 1.4, iface: "power", gnd: true });
  if (x < BOARD.tab.x0 - 2 || x > BOARD.tab.x1 + 2) VIAS.push({ x, z: BOARD.zMax - 1.4, iface: "power", gnd: true });
}
for (let z = -31; z <= 27; z += 3) VIAS.push({ x: BOARD.xMax - 1.4, z, iface: "power", gnd: true });
for (let z = 20.5; z <= 30.5; z += 1.2) VIAS.push({ x: 33, z, iface: "power", gnd: true });
for (let x = 36; x <= 58; x += 1.6) VIAS.push({ x, z: 25.5, iface: "power", gnd: true });

export const tracks = TRACKS;
export const vias = VIAS;
export const pours = POURS;

/** PCIe gold fingers: x positions for 32 positions per side (11 before the key). */
export const fingers: number[] = [
  ...Array.from({ length: 11 }, (_, i) => -8.5 + i),
  ...Array.from({ length: 21 }, (_, i) => 4.7 + i),
];

export const MOUNT_HOLES: V2[] = [[-57, -30.5], [57, -30.5], [-56, 27.5], [58.5, 1.5]];

/* -------------------------------------------------------------------------- */
/*                                   stackup                                  */
/* -------------------------------------------------------------------------- */

export interface StackLayer {
  id: string;
  name: string;
  kind: "signal" | "plane" | "core" | "prepreg" | "mask";
  thicknessMil: number;
  copperOz?: number;
  dk?: number;
  note: string;
}

export const STACKUP: StackLayer[] = [
  { id: "SMT", name: "Soldermask top", kind: "mask", thicknessMil: 0.8, dk: 3.5, note: "LPI, affects microstrip Z by ~1–3 Ω" },
  { id: "L1", name: "L1 · Signal (top)", kind: "signal", thicknessMil: 1.9, copperOz: 1, note: "0.5 oz + plating · microstrip: breakouts, PCIe TX, DDR, HDMI, USB, MIPI" },
  { id: "P1", name: "Prepreg 1080", kind: "prepreg", thicknessMil: 3.2, dk: 3.6, note: "thin → tight coupling to GND, narrow 85/100 Ω pairs" },
  { id: "L2", name: "L2 · GND", kind: "plane", thicknessMil: 1.2, copperOz: 1, note: "solid reference for L1 and L3 · void under magnetics" },
  { id: "C1", name: "Core", kind: "core", thicknessMil: 5, dk: 3.7, note: "" },
  { id: "L3", name: "L3 · Signal (stripline)", kind: "signal", thicknessMil: 0.6, copperOz: 0.5, note: "PCIe RX, DDR CA — low-crosstalk inner routing" },
  { id: "P2", name: "Prepreg 2116", kind: "prepreg", thicknessMil: 5.5, dk: 3.7, note: "" },
  { id: "L4", name: "L4 · Power", kind: "plane", thicknessMil: 1.2, copperOz: 1, note: "split islands: VDD_CORE, VDDQ, 3V3, 12V" },
  { id: "C2", name: "Core (center)", kind: "core", thicknessMil: 20, dk: 3.7, note: "thick center core for overall 62 mil" },
  { id: "L5", name: "L5 · GND", kind: "plane", thicknessMil: 1.2, copperOz: 1, note: "" },
  { id: "P3", name: "Prepreg 2116", kind: "prepreg", thicknessMil: 5.5, dk: 3.7, note: "" },
  { id: "L6", name: "L6 · Signal (stripline)", kind: "signal", thicknessMil: 0.6, copperOz: 0.5, note: "DDR byte lanes for U4" },
  { id: "C3", name: "Core", kind: "core", thicknessMil: 5, dk: 3.7, note: "" },
  { id: "L7", name: "L7 · GND", kind: "plane", thicknessMil: 1.2, copperOz: 1, note: "" },
  { id: "P4", name: "Prepreg 1080", kind: "prepreg", thicknessMil: 3.2, dk: 3.6, note: "" },
  { id: "L8", name: "L8 · Signal (bottom)", kind: "signal", thicknessMil: 1.9, copperOz: 1, note: "BGA decoupling, PCIe RX fingers" },
  { id: "SMB", name: "Soldermask bottom", kind: "mask", thicknessMil: 0.8, dk: 3.5, note: "" },
];

/** depth (below top surface, mm) of each copper layer for 3D placement */
export const LAYER_Y: Record<string, number> = { L1: 0, L2: -0.12, L3: -0.3, L4: -0.5, L5: -1.08, L6: -1.27, L7: -1.45, L8: -1.6 };

/* -------------------------------------------------------------------------- */
/*                                focus presets                                */
/* -------------------------------------------------------------------------- */

export interface Focus {
  id: Iface | "overview" | "stackup" | "bottom";
  label: string;
  target: [number, number, number];
  position: [number, number, number];
  anchor?: [number, number, number];
}

export const FOCI: Focus[] = [
  { id: "overview", label: "Overview", target: [0, -4, 4], position: [8, 118, 122] },
  { id: "pcie", label: "PCIe Gen4 x4", target: [13, 0, 20], position: [22, 34, 62], anchor: [14, 2, 33] },
  { id: "ddr", label: "DDR4 fly-by", target: [34, 0, -10], position: [42, 38, -50], anchor: [36, 3, -14] },
  { id: "usb3", label: "USB 3.2 Type-C", target: [-38, 0, 18], position: [-70, 30, 48], anchor: [-46, 4, 21] },
  { id: "hdmi", label: "HDMI 2.0", target: [-36, 0, 2], position: [-82, 44, 44], anchor: [-55, 9, 2] },
  { id: "ethernet", label: "Gigabit Ethernet", target: [-40, 0, -17], position: [-80, 38, -40], anchor: [-52, 15, -18] },
  { id: "mipi", label: "MIPI CSI-2", target: [6, 0, -24], position: [6, 32, -66], anchor: [8, 3, -33] },
  { id: "power", label: "PDN & regulators", target: [42, 0, 6], position: [70, 40, 34], anchor: [42, 3, 12] },
  { id: "coupon", label: "TDR / VNA coupon", target: [48, 0, 25], position: [74, 22, 52], anchor: [60, 4, 25] },
  { id: "stackup", label: "Stackup", target: [0, 0, 0], position: [-125, 58, 178] },
  { id: "bottom", label: "Bottom side", target: [4, -1.6, -2], position: [8, -60, 52] },
];
