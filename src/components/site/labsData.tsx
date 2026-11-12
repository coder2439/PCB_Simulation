import { EyePreview, ImpedancePreview, PdnPreview, TdrPreview } from "./LabPreviews";

export const LABS = [
  {
    href: "/labs/impedance/",
    n: "01",
    title: "Stackup & controlled impedance",
    text: "Microstrip and stripline impedance, solve-for-width, and Monte-Carlo fabrication yield.",
    skills: ["Stackup design", "Fab tolerances", "Coupling choices"],
    Preview: ImpedancePreview,
    color: "var(--copper)",
  },
  {
    href: "/labs/channel/",
    n: "02",
    title: "Channel loss, equalization & eye",
    text: "Cascade package, vias, stubs, AC caps and laminate loss; train FFE/CTLE/DFE and watch the eye open.",
    skills: ["S-parameters", "Via stubs", "Equalization", "Eye masks"],
    Preview: EyePreview,
    color: "var(--c-pcie)",
  },
  {
    href: "/labs/tdr/",
    n: "03",
    title: "TDR & correlation",
    text: "Locate impedance discontinuities in time, understand rise-time resolution and correlate with measurement.",
    skills: ["TDR reading", "Resolution", "De-embedding"],
    Preview: TdrPreview,
    color: "var(--accent)",
  },
  {
    href: "/labs/pdn/",
    n: "04",
    title: "PDN impedance & decoupling",
    text: "Meet a target impedance with real capacitor parasitics, then verify the load-step droop in time.",
    skills: ["Target impedance", "Mounting inductance", "Droop"],
    Preview: PdnPreview,
    color: "var(--c-power)",
  },
];
