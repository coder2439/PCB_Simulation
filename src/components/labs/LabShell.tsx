import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function LabShell({
  eyebrow, title, intro, controls, children, module,
}: { eyebrow: string; title: string; intro: ReactNode; controls: ReactNode; children: ReactNode; module?: string }) {
  return (
    <div className="container-x pb-20 pt-8 md:pt-10">
      <Link href="/labs/" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]">
        <ArrowLeft size={14} /> All labs
      </Link>
      <header className="mb-7 max-w-3xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{eyebrow}</span>
          {module && <span className="chip !h-5 !text-[11px]">{module}</span>}
        </div>
        <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-tight md:text-[38px]">{title}</h1>
        <div className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{intro}</div>
      </header>
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="panel thin-scroll h-fit px-4 py-1 lg:sticky lg:top-[88px] lg:max-h-[calc(100vh-108px)] lg:overflow-y-auto">{controls}</aside>
        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </div>
  );
}
