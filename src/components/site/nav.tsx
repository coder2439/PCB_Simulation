import Link from "next/link";

export const AUTHOR = "Leonel Jalil Miranda";

export const NAV = [
  { href: "/board/", label: "3D Board" },
  { href: "/labs/", label: "Labs" },
  { href: "/interfaces/", label: "Interfaces" },
  { href: "/curriculum/", label: "Curriculum" },
  { href: "/fabrication/", label: "Fabrication" },
  { href: "/measurement/", label: "Measurement" },
];

/** Brand block: author name large, program name underneath. */
export function Logo({ size = "lg" }: { size?: "lg" | "md" }) {
  const big = size === "lg";
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label={`SignalPath Lab by ${AUTHOR} — home`}>
      <svg width={big ? 38 : 32} height={big ? 38 : 32} viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#0b1018" stroke="rgba(148,163,184,0.25)" />
        <path d="M5 20 C 9 20, 9 10, 13 10 S 17 22, 21 22 S 25 12, 27 12" fill="none" stroke="#2dd4bf" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="27" cy="12" r="2" fill="#38bdf8" />
      </svg>
      <span className="flex min-w-0 flex-col leading-none">
        <span className={`truncate bg-gradient-to-r from-[#e7edf5] via-[#5eead4] to-[#38bdf8] bg-clip-text font-semibold tracking-tight text-transparent ${big ? "text-[19px] sm:text-[23px]" : "text-[20px]"}`}>
          {AUTHOR}
        </span>
        <span className={`mt-1.5 truncate text-[var(--muted)] ${big ? "text-[11px] sm:text-[12px]" : "text-[12px]"}`}>
          <span className="font-medium text-[var(--text)]">SignalPath Lab</span>
          <span className="hidden sm:inline"> · High-speed PCB &amp; SI/PI mentorship</span>
        </span>
      </span>
    </Link>
  );
}
