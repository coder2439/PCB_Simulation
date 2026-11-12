import Link from "next/link";

export const NAV = [
  { href: "/board/", label: "3D Board" },
  { href: "/labs/", label: "Labs" },
  { href: "/interfaces/", label: "Interfaces" },
  { href: "/curriculum/", label: "Curriculum" },
  { href: "/fabrication/", label: "Fabrication" },
  { href: "/measurement/", label: "Measurement" },
];

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="SignalPath Lab home">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#0b1018" stroke="rgba(148,163,184,0.25)" />
        <path d="M5 20 C 9 20, 9 10, 13 10 S 17 22, 21 22 S 25 12, 27 12" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="27" cy="12" r="2" fill="#38bdf8" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">
        SignalPath<span className="text-[var(--muted)] font-normal"> Lab</span>
      </span>
    </Link>
  );
}
