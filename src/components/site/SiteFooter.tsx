import Link from "next/link";
import { Logo, NAV } from "./nav";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--line)] bg-[var(--bg-2)]">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--muted)]">
            A hands-on mentoring program for high-speed PCB design: stackup, routing, SI/PI simulation, fabrication and lab validation — taught on one reference board.
          </p>
        </div>
        <div>
          <div className="eyebrow !text-[var(--faint)]">Explore</div>
          <ul className="mt-3 space-y-2 text-[13.5px]">
            {NAV.map((n) => (
              <li key={n.href}><Link className="text-[var(--muted)] hover:text-[var(--text)]" href={n.href}>{n.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow !text-[var(--faint)]">Credits & notes</div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted)]">
            Component 3D models: <a className="underline decoration-white/20 underline-offset-2 hover:text-[var(--text)]" href="https://gitlab.com/kicad/libraries/kicad-packages3D" target="_blank" rel="noreferrer">KiCad packages3D</a> (CC-BY-SA 4.0), converted to compressed glTF.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--faint)]">
            Simulators are teaching models with documented assumptions — not a replacement for vendor models, field solvers or compliance tools.
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="container-x flex h-12 items-center justify-between text-[12px] text-[var(--faint)]">
          <span>HSD-REF-01 · demo prototype</span>
          <span className="mono">Next.js · three.js · WebGL</span>
        </div>
      </div>
    </footer>
  );
}
