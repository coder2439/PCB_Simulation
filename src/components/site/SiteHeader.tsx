"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Logo, NAV } from "./nav";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const active = (h: string) => path === h || path === h.slice(0, -1) || (h !== "/" && path.startsWith(h));

  return (
    <header className={`sticky top-0 z-50 transition-colors ${scrolled || open ? "border-b border-[var(--line)] bg-[rgba(5,7,11,0.82)] backdrop-blur-xl" : "border-b border-transparent"}`}>
      <div className="container-x flex h-[72px] items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-0.5 xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors ${active(n.href) ? "bg-white/[0.06] text-[var(--text)]" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/curriculum/#engagement" className="btn btn-primary hidden !h-9 md:inline-flex">Start mentoring</Link>
          <button type="button" className="btn btn-ghost !h-9 !px-2.5 xl:hidden" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="container-x grid gap-1 pb-4 xl:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 text-[15px] ${active(n.href) ? "bg-white/[0.06] text-[var(--text)]" : "text-[var(--muted)]"}`}>
              {n.label}
            </Link>
          ))}
          <Link href="/curriculum/#engagement" onClick={() => setOpen(false)} className="btn btn-primary mt-2 justify-center">Start mentoring</Link>
        </nav>
      )}
    </header>
  );
}
