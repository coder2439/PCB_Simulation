import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-start justify-center py-20">
      <span className="eyebrow">404 · open circuit</span>
      <h1 className="mt-2 text-[34px] font-semibold tracking-tight">This trace doesn&apos;t go anywhere.</h1>
      <p className="mt-3 text-[15px] text-[var(--muted)]">The page you&apos;re looking for doesn&apos;t exist. Let&apos;s route you back.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-primary">Home</Link>
        <Link href="/board/" className="btn btn-ghost">3D board</Link>
      </div>
    </div>
  );
}
