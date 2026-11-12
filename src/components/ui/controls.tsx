"use client";

import { ChevronDown, FlaskConical, GraduationCap, Info } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export function Slider({
  label, value, min, max, step = 1, onChange, fmt, unit, hint,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; fmt?: (v: number) => string; unit?: string; hint?: string;
}) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="py-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] text-[var(--muted)]">{label}</label>
        <span className="mono tnum text-[13px] text-[var(--text)]">
          {fmt ? fmt(value) : value}
          {unit && <span className="ml-0.5 text-[var(--faint)]">{unit}</span>}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
        aria-describedby={hint ? `${id}-h` : undefined}
      />
      {hint && <p id={`${id}-h`} className="-mt-0.5 text-[11.5px] leading-snug text-[var(--faint)]">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-start justify-between gap-3 rounded-lg py-2 text-left"
    >
      <span>
        <span className="block text-[13px] text-[var(--text)]">{label}</span>
        {hint && <span className="block text-[11.5px] leading-snug text-[var(--faint)]">{hint}</span>}
      </span>
      <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors ${checked ? "border-transparent bg-[var(--accent)]" : "border-[var(--line-2)] bg-white/5"}`}>
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export function Segmented<T extends string | number>({
  options, value, onChange, size = "md",
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; size?: "sm" | "md" }) {
  return (
    <div className="flex w-full flex-wrap gap-1 rounded-lg border border-[var(--line)] bg-black/20 p-1" role="radiogroup">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={`flex-1 whitespace-nowrap rounded-md px-2.5 ${size === "sm" ? "h-7 text-[12px]" : "h-8 text-[12.5px]"} transition-colors ${
            o.value === value ? "bg-[var(--panel-3)] text-[var(--text)] shadow-[inset_0_0_0_1px_var(--line-2)]" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="mb-1.5 text-[13px] text-[var(--muted)]">{label}</div>
      {children}
    </div>
  );
}

export function Stat({ label, value, unit, tone = "neutral", sub }: { label: string; value: string; unit?: string; tone?: "neutral" | "ok" | "bad" | "warn"; sub?: string }) {
  const c = tone === "ok" ? "var(--ok)" : tone === "bad" ? "var(--danger)" : tone === "warn" ? "var(--power)" : "var(--text)";
  return (
    <div className="rounded-xl border border-[var(--line)] bg-black/20 px-3.5 py-3">
      <div className="text-[11.5px] uppercase tracking-wider text-[var(--faint)]">{label}</div>
      <div className="mono tnum mt-1 text-[20px] leading-none" style={{ color: c }}>
        {value}
        {unit && <span className="ml-1 text-[12px] text-[var(--muted)]">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-[11.5px] text-[var(--faint)]">{sub}</div>}
    </div>
  );
}

export function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[var(--line)] first:border-t-0">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-3 text-left" aria-expanded={open}>
        <span className="eyebrow !text-[var(--muted)]">{title}</span>
        <ChevronDown size={15} className={`text-[var(--faint)] transition-transform ${open ? "" : "-rotate-90"}`} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export function MentorNote({ title = "Mentor note", children }: { title?: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[rgba(45,212,191,0.25)] bg-[linear-gradient(135deg,rgba(45,212,191,0.08),rgba(56,189,248,0.03))] p-4">
      <div className="mb-2 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-[var(--accent)]">
        <GraduationCap size={15} /> {title}
      </div>
      <div className="lesson text-[14px]">{children}</div>
    </div>
  );
}

export interface Experiment { title: string; detail: string; apply: () => void }

export function Experiments({ items }: { items: Experiment[] }) {
  const [done, setDone] = useState<number | null>(null);
  return (
    <div className="panel p-4">
      <div className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-wider text-[var(--power)]">
        <FlaskConical size={15} /> Guided experiments
      </div>
      <ol className="space-y-2">
        {items.map((x, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => { x.apply(); setDone(i); }}
              className={`group w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${done === i ? "border-[rgba(251,191,36,0.45)] bg-[rgba(251,191,36,0.06)]" : "border-[var(--line)] hover:border-[var(--line-2)] hover:bg-white/[0.02]"}`}
            >
              <div className="flex items-center gap-2 text-[13.5px] text-[var(--text)]">
                <span className="mono flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line-2)] text-[10.5px] text-[var(--muted)]">{i + 1}</span>
                {x.title}
              </div>
              <p className="mt-1 pl-7 text-[12.5px] leading-relaxed text-[var(--muted)]">{x.detail}</p>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Assumptions({ items }: { items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="panel">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3 text-left" aria-expanded={open}>
        <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]"><Info size={15} /> Model assumptions & limitations</span>
        <ChevronDown size={15} className={`text-[var(--faint)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="space-y-1.5 px-4 pb-4 text-[13px] leading-relaxed text-[var(--muted)]">
          {items.map((t, i) => (
            <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--faint)]" />{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ChartCard({ title, right, children, sub }: { title: string; right?: ReactNode; children: ReactNode; sub?: string }) {
  return (
    <section className="panel p-3 sm:p-4">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h3 className="text-[14px] font-medium text-[var(--text)]">{title}</h3>
          {sub && <p className="text-[12px] text-[var(--faint)]">{sub}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

export function Legend({ items }: { items: { color: string; label: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
          <span className="inline-block h-0 w-4 border-t-2" style={{ borderColor: it.color, borderStyle: it.dash ? "dashed" : "solid" }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
