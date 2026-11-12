import type { FocusId } from "@/components/board/BoardCanvas";

export interface Quiz { q: string; options: string[]; answer: number; why: string }
export interface TourStep {
  id: string;
  title: string;
  focus: FocusId;
  exploded?: boolean;
  xray?: boolean;
  body: string[];
  checklist?: string[];
  quiz?: Quiz;
  lab?: { href: string; label: string };
}

export const TOUR: TourStep[] = [
  {
    id: "intro",
    title: "Meet the reference board",
    focus: "overview",
    body: [
      "HSD-REF-01 is the example project we use throughout the mentorship: an 8-layer, 1.6 mm PCIe x4 add-in card with a BGA SoC, two DDR4 devices, Gigabit Ethernet, HDMI 2.0, USB 3.2 on Type-C and a MIPI CSI-2 camera connector.",
      "One board, six interface families. Each one teaches a different discipline: loss budgets (PCIe, USB), timing budgets (DDR4), isolation and EMI (Ethernet), DC-coupled signalling (HDMI) and clock-forwarded lanes (MIPI).",
      "Click any label on the board, or use Next to follow the guided walkthrough.",
    ],
  },
  {
    id: "floorplan",
    title: "Floorplan first: placement is signal integrity",
    focus: "overview",
    body: [
      "Before routing, placement decides most of the SI outcome. Connectors sit on the bracket edge; the SoC is central so every interface leaves it in the direction of its connector; DRAM is within ~15 mm of the controller.",
      "The PMIC and inductors are grouped in the corner furthest from the sensitive channels, and the MagJack sits next to its PHY so the MDI pairs are short.",
    ],
    checklist: [
      "Each interface exits the SoC toward its connector — no crossing corridors",
      "Switching regulators away from high-speed breakout regions",
      "Room for length tuning planned before routing",
      "Test coupons and probe points placed on purpose, not as leftovers",
    ],
  },
  {
    id: "stackup",
    title: "The stackup is the first SI decision",
    focus: "stackup",
    exploded: true,
    body: [
      "Eight layers: two outer microstrip layers, two inner stripline layers, and four planes. Every signal layer is adjacent to a solid GND reference, so return current always has a short, predictable path.",
      "Thin prepreg (≈3 mil) under L1 keeps 85–100 Ω pairs narrow enough for BGA breakout. L4 carries split power islands; signals on L3 reference L2 (GND) — never route across a split in an adjacent plane.",
      "The void you can see in L2 under the MagJack is an isolation keep-out for the Ethernet magnetics.",
    ],
    quiz: {
      q: "A PCIe pair on L3 references L2 (GND) and L4 (split power). What is the main risk?",
      options: ["Higher DC resistance", "Return current crossing a split in L4 causes a discontinuity and EMI", "The pair will be faster", "Nothing — power planes are AC-grounded"],
      answer: 1,
      why: "Return current flows in both adjacent planes. Where L4 is split, part of that current must detour — creating an impedance discontinuity and common-mode radiation. Keep high-speed layers next to solid GND, or stitch with capacitors at the crossing.",
    },
    lab: { href: "/labs/impedance/", label: "Size the traces for this stackup" },
  },
  {
    id: "pcie",
    title: "PCIe Gen4 x4: a loss-budgeted channel",
    focus: "pcie",
    xray: true,
    body: [
      "TX pairs run on L1 through 0201 AC-coupling capacitors to the gold fingers. RX pairs drop to L3 stripline right after the BGA and come back to the bottom fingers near the edge — visible in x-ray mode.",
      "Every layer change is a via with a stub and a capacitive pad. Each signal via pair has GND stitching vias next to it so the return current can change planes too.",
      "At 16 GT/s the budget is ≈ −28 dB at 8 GHz die-to-die. The laminate, copper roughness and the residual via stub decide whether this channel closes.",
    ],
    checklist: [
      "AC caps placed symmetrically with plane voids under the pads",
      "GND return via within ~30 mil of every signal via",
      "Residual stub < 10 mil (backdrill or layer choice)",
      "Intra-pair skew compensated near the source of the mismatch",
    ],
    quiz: {
      q: "A via stub of 100 mil in a Dk 3.7 board resonates at roughly…",
      options: ["1.5 GHz", "15 GHz", "150 GHz", "It depends only on the drill size"],
      answer: 1,
      why: "f ≈ c / (4·L·√Dk) = 11.8 in/ns / (4 × 0.1 in × 1.92) ≈ 15 GHz — right next to Gen5's 16 GHz Nyquist, and close enough to Gen4's 8 GHz to add significant loss.",
    },
    lab: { href: "/labs/channel/", label: "Simulate this channel in the eye-diagram lab" },
  },
  {
    id: "ddr",
    title: "DDR4: closing a timing budget",
    focus: "ddr",
    body: [
      "Byte lanes run from the SoC to U3 with visible length-tuning serpentines; U4's byte lanes pass underneath on L6. The command/address bus uses fly-by topology: it visits U3, then U4, and ends at the VTT termination resistors (RN1).",
      "Matching is done in delay (ps), not length — microstrip and stripline have different propagation delay. Write leveling in the controller absorbs the intentional CK-to-DQS delay of fly-by.",
    ],
    checklist: [
      "Each byte lane (DQ, DM/DBI, DQS) on one layer, one reference",
      "Delay-matched with package pin delays included",
      "VTT termination right after the last DRAM, with its own decoupling",
      "Serpentines with spacing ≥ 3× trace width to avoid self-coupling",
    ],
    lab: { href: "/interfaces/ddr/", label: "Open the DDR4 deep dive" },
  },
  {
    id: "usb3",
    title: "USB 3.2 on Type-C: topology adds loss",
    focus: "usb3",
    body: [
      "Type-C is reversible, so the two SuperSpeed lane pairs go through a mux/redriver (U6) before the receptacle. AC-coupling caps sit on the TX pairs between the SoC and the mux.",
      "Each extra device costs connector-like discontinuities and two more via transitions. Place the mux close to the connector so its equalization covers the long host-side trace.",
    ],
    quiz: {
      q: "Where should the USB 3.2 AC-coupling capacitors be?",
      options: ["On the RX pairs at the receptacle", "On the TX pairs of each transmitter", "On both TX and RX of the same device", "USB 3.2 is DC-coupled"],
      answer: 1,
      why: "Each link partner places AC caps on its own transmitter outputs. The far-end device has caps on its TX, so you receive an already AC-coupled signal on your RX.",
    },
  },
  {
    id: "hdmi",
    title: "HDMI 2.0: read the spec, not your habits",
    focus: "hdmi",
    body: [
      "Four TMDS pairs route directly from the SoC to the HDMI connector on L1. Unlike PCIe and USB, TMDS is DC-coupled — the sink terminates each line to 3.3 V through 50 Ω — so there are no series capacitors.",
      "Low-capacitance ESD protection belongs at the connector, laid out flow-through so the pair runs straight across the device pads.",
    ],
  },
  {
    id: "ethernet",
    title: "Ethernet & MIPI: isolation and forwarded clocks",
    focus: "ethernet",
    body: [
      "The PHY (U5) sits right next to the MagJack (J1). MDI pairs are short 100 Ω pairs; under the magnetics all planes are removed except a chassis island — that's the void you saw in L2.",
      "RGMII between SoC and PHY needs a 2 ns clock delay, enabled once — in the PHY or in the MAC, never both. The MIPI CSI-2 lanes from the FPC connector (J4) must be skew-matched to their forwarded clock lane.",
    ],
    checklist: [
      "Isolation keep-out ≥ the creepage required for 1500 Vrms",
      "Bob-Smith termination to chassis",
      "CSI-2 lanes equal length and equal via count to the clock lane",
    ],
  },
  {
    id: "power",
    title: "Power integrity: the other half of SI",
    focus: "bottom",
    body: [
      "Flip the board: 36 × 0201 and 12 × 0402 capacitors sit directly under the BGA on the bottom side. That is the shortest possible current loop between capacitor and ball — mounting inductance dominates above a few MHz.",
      "The PMIC on the top side delivers VDD_CORE and VDDQ through wide pours to the L4 islands. The bulk capacitors handle the kHz–MHz range; the BGA decaps cover up to tens of MHz; above that the package and die take over.",
    ],
    quiz: {
      q: "Above ~20 MHz, what improves an MLCC's effectiveness the most?",
      options: ["Higher capacitance value", "Lower mounting inductance (via-in-pad, short loops)", "Higher voltage rating", "A larger case size"],
      answer: 1,
      why: "Above its series resonance a capacitor behaves as an inductor. Its impedance is ωL, and L is mostly mounting inductance — pads, vias and spreading in the planes.",
    },
    lab: { href: "/labs/pdn/", label: "Design the decoupling in the PDN lab" },
  },
  {
    id: "coupon",
    title: "Fabrication & measurement: close the loop",
    focus: "coupon",
    body: [
      "The SMA-terminated coupon on the right edge is a 2x-thru structure: identical launches on both ends, so the fixture can be measured and de-embedded from the DUT data.",
      "After fabrication we measure it with TDR and a VNA, compare against the pre-layout simulation, and explain every difference with a physical cause — etch, Dk, plating, or the model itself.",
    ],
    checklist: [
      "Impedance coupons on every panel, for every controlled layer",
      "2x-thru / Beatty structures for de-embedding and Dk/Df extraction",
      "Same rise-time filter on simulation and measurement before comparing",
    ],
    lab: { href: "/labs/tdr/", label: "Try correlation in the TDR lab" },
  },
];
