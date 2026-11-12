export interface Module {
  n: number;
  title: string;
  sessions: string;
  goal: string;
  topics: string[];
  handsOn: string[];
  deliverable: string;
  links?: { href: string; label: string }[];
}

export const MODULES: Module[] = [
  {
    n: 1,
    title: "High-speed fundamentals",
    sessions: "2 sessions",
    goal: "Know when a net becomes a transmission line and how to reason about return current.",
    topics: ["Rise time vs. bandwidth (0.35 / tr), knee frequency", "Transmission lines, characteristic impedance, propagation delay", "Reflections, termination strategies", "Return current paths and loop inductance"],
    handsOn: ["Define the example board: interfaces, data rates, devices and measurable goals", "Hand calculations checked against the impedance lab"],
    deliverable: "Board requirements sheet with SI/PI acceptance criteria",
    links: [{ href: "/labs/tdr/", label: "TDR lab" }],
  },
  {
    n: 2,
    title: "Stackup, materials & controlled impedance",
    sessions: "2 sessions",
    goal: "Design a manufacturable stackup together with the fabricator.",
    topics: ["Laminate selection: Dk, Df, glass style, resin content", "Copper roughness and its effect on loss", "Microstrip vs. stripline, coupling choices", "Impedance tables, tolerances and coupons"],
    handsOn: ["Build the 8-layer stackup for HSD-REF-01", "Request and review a fab stackup proposal"],
    deliverable: "Approved stackup + impedance table",
    links: [{ href: "/labs/impedance/", label: "Impedance lab" }, { href: "/fabrication/", label: "Fabrication guide" }],
  },
  {
    n: 3,
    title: "Placement, routing & layer transitions",
    sessions: "2 sessions",
    goal: "Route differential pairs and buses that behave like the model.",
    topics: ["Differential pairs: coupling, skew, serpentine rules", "Vias: stubs, anti-pads, return vias, backdrilling", "Reference-plane changes and stitching", "Crosstalk: spacing, parallel length, layer choice"],
    handsOn: ["Live design review of the 3D board, interface by interface", "Route a PCIe lane and justify every via"],
    deliverable: "Constraint set (rules) in your CAD tool",
    links: [{ href: "/board/", label: "3D board walkthrough" }],
  },
  {
    n: 4,
    title: "Interface deep dives",
    sessions: "3 sessions",
    goal: "Translate each standard's electrical spec into layout rules.",
    topics: ["SerDes channels: PCIe, USB 3.2, HDMI", "Parallel memory: DDR4 timing budget, fly-by, ODT, VTT", "Ethernet magnetics & isolation; MIPI D-PHY lanes"],
    handsOn: ["Read a real design guide and derive the rules", "Delay-matching exercise with package pin delays"],
    deliverable: "Per-interface rule sheets",
    links: [{ href: "/interfaces/", label: "Interface library" }],
  },
  {
    n: 5,
    title: "Signal-integrity simulation",
    sessions: "3 sessions",
    goal: "Simulate before fabrication and trust the result for the right reasons.",
    topics: ["S-parameters: reading, causality, passivity, cascading", "2D/3D extraction of traces, vias, connectors", "IBIS and IBIS-AMI models, channel simulation", "Eye diagrams, BER contours, compliance masks"],
    handsOn: ["Pre-layout what-if sweeps (length, material, stub)", "Post-layout extraction of one PCIe lane"],
    deliverable: "Channel simulation report with margin",
    links: [{ href: "/labs/channel/", label: "Channel & eye lab" }],
  },
  {
    n: 6,
    title: "Power integrity",
    sessions: "2 sessions",
    goal: "Design a PDN that meets its target impedance and droop budget.",
    topics: ["Target impedance and its limits", "Capacitor selection, mounting inductance, anti-resonances", "Plane capacitance and spreading inductance", "DC IR drop, current density, thermal"],
    handsOn: ["Decoupling plan for VDD_CORE and VDDQ", "IR-drop review of the power islands"],
    deliverable: "PDN report: |Z(f)|, droop, IR drop",
    links: [{ href: "/labs/pdn/", label: "PDN lab" }],
  },
  {
    n: 7,
    title: "Fabrication & assembly",
    sessions: "1–2 sessions",
    goal: "Release data a fabricator can build without guessing.",
    topics: ["Fab drawing & notes, impedance control language", "Backdrill, via-in-pad, filled vias, surface finishes", "Gold fingers, chamfer, panelization, coupons", "DFM / DFA review with the fab"],
    handsOn: ["Write the fab notes for HSD-REF-01", "Review a real DFM report"],
    deliverable: "Complete fab package",
    links: [{ href: "/fabrication/", label: "Fabrication guide" }],
  },
  {
    n: 8,
    title: "Measurement & correlation",
    sessions: "2–3 sessions",
    goal: "Validate the board and close the loop with simulation.",
    topics: ["TDR/TDT, VNA calibration (SOLT, TRL), de-embedding (2x-thru)", "Real-time scope measurements, probing, bandwidth", "PDN measurement (2-port shunt-through)", "Correlation methodology and reporting"],
    handsOn: ["Measure the coupon and one interface", "Write the correlation report"],
    deliverable: "Measured-vs-simulated correlation report",
    links: [{ href: "/measurement/", label: "Measurement guide" }, { href: "/labs/tdr/", label: "TDR lab" }],
  },
];

export const TOOLS = {
  cad: ["Altium Designer", "Cadence Allegro / OrCAD X", "KiCad", "Siemens Xpedition / PADS"],
  sim: ["Siemens HyperLynx", "Ansys SIwave / HFSS", "Cadence Sigrity / Clarity", "Keysight ADS / SIPro", "Polar Si9000 (impedance)", "Open source: openEMS, scikit-rf, Qucs-S"],
  lab: ["Real-time oscilloscope + differential probes", "TDR / sampling scope", "Vector network analyzer (2/4-port)", "Power-rail probe & PDN fixtures", "Near-field EMI probes"],
};

export const DISCOVERY = [
  "Which PCB CAD tool do you use (or want to learn)?",
  "Which SI/PI simulator licenses do you have access to — or should we work with open-source tools?",
  "What lab equipment is available (scope bandwidth, VNA/TDR, probes)?",
  "Is fabrication and assembly of the example board part of the plan?",
  "Which interface matters most for your own products?",
  "Preferred cadence: weekly sessions, or an intensive block?",
];
