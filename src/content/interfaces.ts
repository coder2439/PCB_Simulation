export type InterfaceSlug = "pcie" | "ddr" | "usb3" | "hdmi" | "ethernet" | "mipi";

export interface Spec { label: string; value: string; note?: string }
export interface Rule { title: string; detail: string }
export interface Pitfall { problem: string; symptom: string; fix: string }

export interface InterfaceInfo {
  slug: InterfaceSlug;
  name: string;
  tagline: string;
  color: string;
  standard: string;
  signaling: string;
  specs: Spec[];
  summary: string;
  challenges: string[];
  rules: Rule[];
  pitfalls: Pitfall[];
  simulate: string[];
  measure: string[];
  /** default skew budget helper: UI in ps of the fastest common rate */
  uiPs: number;
  labHint: { href: string; label: string };
  /** reference designators on the demo board */
  parts: string[];
}

export const INTERFACES: InterfaceInfo[] = [
  {
    slug: "pcie",
    name: "PCI Express",
    tagline: "Loss-budgeted SerDes channel through vias, AC caps and a card edge",
    color: "var(--c-pcie)",
    standard: "PCIe Base / CEM — Gen3 · Gen4 · Gen5",
    signaling: "NRZ differential, 128b/130b, embedded clock + 100 MHz HCSL REFCLK",
    uiPs: 31.25,
    specs: [
      { label: "Data rate / lane", value: "8 · 16 · 32 GT/s", note: "Gen3 · Gen4 · Gen5" },
      { label: "Nyquist frequency", value: "4 · 8 · 16 GHz" },
      { label: "Differential impedance", value: "85 Ω (100 Ω tolerated)", note: "±10% fab tolerance typical" },
      { label: "Typical end-to-end loss budget", value: "≈ −22 · −28 · −36 dB", note: "at Nyquist, die-to-die, incl. packages" },
      { label: "AC coupling (TX side)", value: "176–265 nF", note: "0201/0402, placed symmetric in pair" },
      { label: "Intra-pair skew", value: "≤ 5 mil (≈ 0.8 ps)", note: "match close to the mismatch source" },
      { label: "Equalization", value: "TX FFE presets + RX CTLE / DFE", note: "link training adapts per lane" },
    ],
    summary:
      "PCIe teaches channel thinking: every structure between the two dies — package, BGA breakout, vias, AC caps, connector — spends part of a fixed insertion-loss budget and adds reflections. At Gen4+ the via stub and the material's dissipation factor usually dominate the design decisions.",
    challenges: [
      "Insertion loss at Nyquist grows with length, Df and copper roughness — Gen4/5 often forces a mid/low-loss laminate.",
      "Via stubs resonate at f ≈ c / (4·Lstub·√Dk); a 60 mil stub notches near 25 GHz — fatal for Gen5.",
      "AC-cap pads are wider than the trace → capacitive dip; needs a reference-plane void beneath.",
      "Card-edge fingers and connector add a large discontinuity you must model, not ignore.",
    ],
    rules: [
      { title: "Route on stripline for long runs", detail: "Inner layers avoid the far-end crosstalk and dispersion of microstrip and are shielded from EMI. Keep breakout on top short." },
      { title: "Backdrill or blind vias at Gen4+", detail: "Target residual stub < 10 mil. Alternatively choose the layer that leaves the shortest stub (L1→L6 instead of L1→L3 on an 8-layer)." },
      { title: "Stitch every layer-change", detail: "Place 1–2 GND return vias within ~30 mil of each signal via pair so return current follows the transition." },
      { title: "Use polarity inversion, not crossovers", detail: "PCIe allows P/N inversion per lane and lane reversal — use it to avoid via-heavy swaps." },
      { title: "Match intra-pair skew locally", detail: "Compensate at the bend that created it with small serpentines, never at the far end of the channel." },
    ],
    pitfalls: [
      { problem: "Long via stub on a thick board", symptom: "Deep S21 notch below 1.5× Nyquist, closed eye even with DFE", fix: "Backdrill, change layer pair, or move to blind/buried vias" },
      { problem: "Standard FR-4 for a 10-inch Gen4 run", symptom: "Loss far beyond −28 dB; link trains down to Gen3", fix: "Mid-loss laminate (Df ≈ 0.008) and HVLP copper, or add a retimer" },
      { problem: "Solid plane under 0402 AC-cap pads", symptom: "15–20 Ω impedance dip on TDR at cap location", fix: "Cut-out under the pads on the adjacent reference layer, model it in 3D" },
    ],
    simulate: [
      "Extract S-parameters of breakout + vias (3D) and traces (2D) → cascade to a full channel.",
      "Check insertion loss, return loss and ILD against the spec channel mask.",
      "Run a statistical / bit-by-bit eye with IBIS-AMI TX/RX models and preset sweep.",
      "Sweep fab corners: Dk ±5%, width ±0.5 mil, residual stub length.",
    ],
    measure: [
      "VNA 4-port measurement on a 2x-thru coupon; de-embed fixtures (e.g., 2x-thru / AFR methods).",
      "TDR at 20–35 ps rise time to localize via and AC-cap discontinuities.",
      "Compliance using the PCI-SIG CBB/CLB fixtures and a real-time scope ≥ 2.5× Nyquist bandwidth.",
    ],
    labHint: { href: "/labs/channel", label: "Open Channel & Eye lab with PCIe Gen4" },
    parts: ["J5 · PCIe x4 edge", "C120–C127 · AC caps", "U1 · SoC"],
  },
  {
    slug: "ddr",
    name: "DDR4 Memory",
    tagline: "Timing-budgeted parallel bus: fly-by topology, length matching and ODT",
    color: "var(--c-ddr)",
    standard: "JEDEC JESD79-4 (DDR4-1600 … 3200)",
    signaling: "Single-ended POD12 DQ/CA, differential CK and DQS, source-synchronous",
    uiPs: 312.5,
    specs: [
      { label: "Data rate", value: "1600–3200 MT/s", note: "UI = 625 … 312.5 ps" },
      { label: "Single-ended impedance", value: "40–50 Ω", note: "follow SoC vendor; DQS/CK 80–100 Ω diff" },
      { label: "Topology", value: "Fly-by CA/CK, point-to-point DQ" },
      { label: "Termination", value: "ODT for DQ, VTT (0.6 V) pull-ups for CA" },
      { label: "DQ ↔ DQS matching (byte)", value: "typ. ±5 ps", note: "vendor guide is the authority" },
      { label: "CA ↔ CK matching", value: "typ. ±10 ps", note: "write leveling absorbs fly-by delay" },
      { label: "Rails", value: "VDDQ 1.2 V · VPP 2.5 V · VTT 0.6 V" },
    ],
    summary:
      "DDR is a timing problem disguised as a routing problem. Instead of an eye after equalization you close a setup/hold budget: driver, flight-time skew, crosstalk-induced jitter, SSO noise on VDDQ and VREF all consume picoseconds. Length matching is just the visible part of that budget.",
    challenges: [
      "Byte-lane skew budget of a few ps translates to ~30 mil — match in delay, not length, when layers differ.",
      "Simultaneous switching output (SSO) noise on VDDQ collapses margins — PI and SI are coupled.",
      "Fly-by stubs and VTT termination placement set CA signal quality.",
      "Crosstalk between dense single-ended DQ lines needs ≥ 2–3× trace-to-plane spacing.",
    ],
    rules: [
      { title: "Route each byte lane on one layer", detail: "Keep DQ[7:0], DM/DBI and DQS of a byte on the same layer and reference so propagation delay is identical." },
      { title: "Match in time (ps), not in mm", detail: "Microstrip and stripline have different Dk_eff → different ps/inch. Include package pin-delay files from the vendor." },
      { title: "Fly-by with short stubs", detail: "Daisy-chain CA/CK from the controller through each DRAM; keep stubs < 1.5 mm and terminate to VTT after the last device." },
      { title: "Solid reference for the whole bus", detail: "Reference to GND (or VDDQ consistently). Never route a byte across a plane split." },
      { title: "Decouple VDDQ per device", detail: "Several 0201/0402 caps at the DRAM balls plus bulk; the DQ return current flows in this PDN." },
    ],
    pitfalls: [
      { problem: "Matching in length across mixed layers", symptom: "Training passes at low speed, fails at 3200 MT/s", fix: "Use delay-based matching rules with per-layer propagation delay" },
      { problem: "VTT resistors far from last DRAM", symptom: "Ringing on CA lines, ODT-off reflections", fix: "Place VTT termination right after the last device with its own decoupling" },
      { problem: "Insufficient VDDQ decoupling", symptom: "Data-dependent errors, eye collapses during bursts", fix: "PDN target-impedance design for the VDDQ rail including SSO current" },
    ],
    simulate: [
      "Pre-layout: topology sweep with IBIS models (ODT, drive strength, stub length).",
      "Post-layout: coupled extraction of a whole byte lane incl. crosstalk + SSO with power-aware IBIS.",
      "Timing budget spreadsheet: tDQSS, tDS/tDH vs. simulated skew and jitter.",
    ],
    measure: [
      "Active probes ≤ 0.5 pF on DRAM ball vias (interposer if available).",
      "Read/write separation by DQS preamble triggering; eye per byte lane.",
      "VDDQ ripple measurement with a power-rail probe during memory stress test.",
    ],
    labHint: { href: "/labs/pdn", label: "Design the VDDQ decoupling in the PDN lab" },
    parts: ["U3, U4 · DDR4 x16", "RN1 · VTT terminations", "U9 · VTT regulator"],
  },
  {
    slug: "usb3",
    name: "USB 3.2 (Type-C)",
    tagline: "SuperSpeed pairs through a Type-C mux, AC caps and a mid-mount receptacle",
    color: "var(--c-usb)",
    standard: "USB 3.2 Gen1 / Gen2, USB Type-C",
    signaling: "NRZ differential, 8b/10b (Gen1) · 128b/132b (Gen2)",
    uiPs: 100,
    specs: [
      { label: "Data rate", value: "5 Gb/s · 10 Gb/s", note: "Gen1 · Gen2 (x1)" },
      { label: "Nyquist frequency", value: "2.5 · 5 GHz" },
      { label: "Differential impedance", value: "90 Ω ±10%" },
      { label: "AC coupling", value: "75–265 nF on TX", note: "RX caps are inside the far-end device" },
      { label: "Intra-pair skew", value: "≤ 5 mil" },
      { label: "Orientation", value: "2 SS lane pairs → mux / redriver for flip" },
    ],
    summary:
      "USB on Type-C adds a topology problem: the plug can be inserted two ways, so SuperSpeed lanes pass through a mux or redriver. Each extra device costs loss and two more via transitions, and the receptacle sits right where ESD protection and EMI filtering have to live.",
    challenges: [
      "Short host budget at Gen2 — breakout, mux, ESD and connector each cost dB.",
      "ESD diodes add capacitance (pick < 0.3 pF parts and route through the pad).",
      "Type-C mid-mount connectors have a large via field with pin-to-pin crosstalk.",
      "Common-mode conversion from skew leads directly to radiated EMI.",
    ],
    rules: [
      { title: "Place mux/redriver near the connector", detail: "Shortest possible connector-side trace; the redriver EQ is set for the remaining host channel." },
      { title: "Route-through ESD footprints", detail: "Run the pair straight across the ESD pads — no stubs to the protection device." },
      { title: "Keep USB2 D+/D− separate", detail: "90 Ω as well, but slow — keep it away from SS pairs to avoid coupling into them." },
      { title: "Ground vias at connector shell", detail: "Stitch the receptacle shell and GND pins densely to the reference planes." },
    ],
    pitfalls: [
      { problem: "Stubby ESD connection", symptom: "Resonance dip in S21 near 7–9 GHz, Gen2 compliance fails", fix: "Flow-through ESD layout, smaller pads, void under pads" },
      { problem: "Skew from asymmetric breakout", symptom: "High SCD21, radiated emissions at 2.5/5 GHz", fix: "Symmetric breakout; compensate skew at the bend" },
    ],
    simulate: [
      "Include connector + mux S-parameter models from the vendor in the channel.",
      "Check return loss and mode conversion (SDD11, SCD21) — not only insertion loss.",
    ],
    measure: [
      "Compliance fixtures (host test fixture) with real-time scope and SigTest-style analysis.",
      "VNA on the Type-C receptacle footprint via a test coupon for de-embedding.",
    ],
    labHint: { href: "/labs/channel", label: "Simulate a USB 3.2 Gen2 channel" },
    parts: ["J3 · USB-C receptacle", "U6 · SS mux / redriver", "C140–C143 · AC caps"],
  },
  {
    slug: "hdmi",
    name: "HDMI 2.0",
    tagline: "DC-coupled TMDS pairs with ESD at the connector and controlled skew",
    color: "var(--c-hdmi)",
    standard: "HDMI 2.0 (TMDS)",
    signaling: "TMDS current-mode differential, 3 data + 1 clock pair, sink pull-up to 3.3 V",
    uiPs: 166.7,
    specs: [
      { label: "Data rate / lane", value: "up to 6 Gb/s", note: "18 Gb/s aggregate" },
      { label: "Nyquist frequency", value: "3 GHz" },
      { label: "Differential impedance", value: "100 Ω ±10%" },
      { label: "Coupling", value: "DC-coupled", note: "no AC caps — 50 Ω pull-ups at sink" },
      { label: "Intra-pair skew", value: "≤ 5 mil" },
      { label: "Low-speed", value: "DDC (I²C), CEC, HPD, +5 V" },
    ],
    summary:
      "HDMI is a good lesson in reading the electrical spec carefully: TMDS is DC-coupled, so unlike PCIe and USB there are no AC-coupling caps, and the source must survive hot-plug ESD events through the connector. The board's job is clean 100 Ω pairs with minimum skew from SoC to connector.",
    challenges: [
      "ESD protection must be low capacitance and placed at the connector.",
      "Connector pin field breaks pair coupling — keep the uncoupled length short.",
      "Inter-pair skew is tolerated but intra-pair skew turns into EMI.",
    ],
    rules: [
      { title: "No AC-coupling capacitors", detail: "TMDS is DC-coupled; adding caps breaks the sink termination scheme." },
      { title: "ESD array at the connector", detail: "Route-through, low-capacitance devices; keep their GND return short to the connector shell." },
      { title: "Shortest symmetric route", detail: "Keep all four pairs on the same layer with matched via counts." },
    ],
    pitfalls: [
      { problem: "AC caps added by habit", symptom: "Link doesn't come up / no sink detection", fix: "Remove — DC-coupled interface" },
      { problem: "Unequal via count between pairs", symptom: "Inter-pair skew, worse eye on one lane", fix: "Same layer transitions on every pair" },
    ],
    simulate: [
      "SoC IBIS + channel + connector model → eye at the TP2 reference point vs. the HDMI mask.",
      "Return loss including the ESD capacitance.",
    ],
    measure: [
      "TPA/TPB compliance fixtures with a differential probe and HDMI analysis software.",
      "TDR of the connector footprint for impedance through the pin field.",
    ],
    labHint: { href: "/labs/tdr", label: "See connector & ESD discontinuities in the TDR lab" },
    parts: ["J2 · HDMI type A", "U1 · SoC TMDS PHY"],
  },
  {
    slug: "ethernet",
    name: "Gigabit Ethernet",
    tagline: "RGMII to the PHY, 100 Ω MDI pairs to the MagJack, isolation and EMI",
    color: "var(--c-ethernet)",
    standard: "IEEE 802.3ab 1000BASE-T + RGMII",
    signaling: "MDI: PAM-5 on 4 pairs (125 MBd); RGMII: 125 MHz DDR single-ended",
    uiPs: 4000,
    specs: [
      { label: "MDI impedance", value: "100 Ω differential" },
      { label: "RGMII", value: "125 MHz, 50 Ω SE", note: "2 ns TX/RX clock delay (PHY or MAC)" },
      { label: "Isolation", value: "1500 Vrms", note: "via magnetics, keep-out under transformer" },
      { label: "Bob-Smith termination", value: "75 Ω + 1 nF / 2 kV to chassis" },
      { label: "PHY reference clock", value: "25 MHz crystal" },
    ],
    summary:
      "Ethernet looks slow, but it is a great vehicle for return paths, isolation and EMI. The PHY-to-magnetics region, the chassis ground strategy and the RGMII clock-delay setting are where most bring-up and EMC failures come from.",
    challenges: [
      "Isolation gap and plane void under the magnetics — high voltage creepage rules.",
      "RGMII needs a 2 ns clock skew — enabled either in PHY, MAC or by trace delay (never two of them).",
      "Common-mode noise on MDI pairs radiates via the cable → EMC failures.",
    ],
    rules: [
      { title: "PHY close to the MagJack", detail: "MDI pairs short and symmetric, 100 Ω, on one layer with no vias if possible." },
      { title: "Void under the magnetics", detail: "Remove all planes under the transformer/RJ45 except chassis ground; keep isolation distance." },
      { title: "Decide RGMII delay once", detail: "Document whether the PHY or MAC inserts the 2 ns delay; route clock length-matched to data." },
    ],
    pitfalls: [
      { problem: "RGMII delay inserted twice", symptom: "Link up but CRC errors / no traffic", fix: "Disable delay in either PHY strap or MAC device tree" },
      { problem: "Digital GND under magnetics", symptom: "Failed hipot, radiated emissions", fix: "Void + chassis island + Bob-Smith network" },
    ],
    simulate: [
      "RGMII timing with IBIS: setup/hold at PHY and MAC including clock delay.",
      "Crosstalk check MDI pairs vs. switching regulator nodes.",
    ],
    measure: [
      "IEEE 802.3 compliance test modes (PHY test registers) with a disturber-free fixture.",
      "Near-field probe scan for common-mode emission around the MagJack.",
    ],
    labHint: { href: "/labs/impedance", label: "Size 100 Ω MDI pairs in the impedance lab" },
    parts: ["J1 · RJ45 MagJack", "U5 · GbE PHY", "Y1 · 25 MHz crystal"],
  },
  {
    slug: "mipi",
    name: "MIPI CSI-2 (D-PHY)",
    tagline: "Camera lanes through an FPC connector with tight lane-to-lane skew",
    color: "var(--c-mipi)",
    standard: "MIPI CSI-2 over D-PHY v1.2",
    signaling: "HS: SLVS-200 differential · LP: 1.2 V LVCMOS single-ended",
    uiPs: 400,
    specs: [
      { label: "Data rate / lane", value: "up to 2.5 Gb/s", note: "D-PHY v1.2" },
      { label: "Lanes", value: "1 clock + 1–4 data" },
      { label: "Differential impedance", value: "100 Ω ±10%" },
      { label: "HS swing", value: "≈ 200 mV common-mode" },
      { label: "Lane-to-lane skew", value: "tight — fraction of UI", note: "clock is forwarded" },
      { label: "Connector", value: "22-pin 0.5 mm FPC" },
    ],
    summary:
      "CSI-2 uses a forwarded clock, so skew between the clock lane and data lanes matters more than absolute loss. The FPC cable and connector are usually the worst discontinuities, and the dual-mode (HS/LP) receiver means you cannot add anything that loads the LP single-ended mode.",
    challenges: [
      "FPC impedance depends on cable stackup — specify it, don't assume it.",
      "Lane-to-lane skew budget is shared between board, connector and cable.",
      "No series components allowed in the pair (dual HS/LP modes).",
    ],
    rules: [
      { title: "Match all lanes to the clock lane", detail: "Equal length and equal via count per lane; reference the same plane." },
      { title: "GND pins between lanes", detail: "Use connector pinouts with GND between pairs; mirror on the FPC." },
      { title: "Keep pair coupling through the connector", detail: "Minimize the uncoupled breakout at the FPC pads." },
    ],
    pitfalls: [
      { problem: "Unknown FPC impedance", symptom: "Image artifacts at high lane rates", fix: "Specify FPC stackup (100 Ω) and test with TDR" },
      { problem: "Clock lane routed on a different layer", symptom: "Data/clock skew at RX, intermittent CRC errors", fix: "Same layer and via count for clock and data" },
    ],
    simulate: [
      "Clock-forwarded timing: skew between clock and data lanes incl. FPC model.",
      "HS eye with SLVS models; LP mode signal levels for the same channel.",
    ],
    measure: [
      "D-PHY protocol analyzer or scope with HS/LP decoding.",
      "TDR of the FPC cable + connector assembly.",
    ],
    labHint: { href: "/labs/tdr", label: "Inspect the FPC connector in the TDR lab" },
    parts: ["J4 · FH12 22-pin FPC", "U1 · SoC CSI-2 RX"],
  },
];

export const getInterface = (slug: string) => INTERFACES.find((i) => i.slug === slug);
