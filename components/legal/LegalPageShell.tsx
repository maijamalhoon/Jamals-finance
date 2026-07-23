import Link from "next/link";
import { ArrowLeft, CircleDollarSign, ShieldCheck } from "@/components/icons/jalvoro/compat";
import type { ReactNode } from "react";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  children: ReactNode;
};

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border/70 py-7 first:border-t-0 first:pt-0 sm:py-9">
      <h2 className="text-lg font-semibold tracking-tight text-text-primary sm:text-xl">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-text-secondary">
        {children}
      </div>
    </section>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5 marker:text-active">{children}</ul>;
}

export default function LegalPageShell({
  eyebrow,
  title,
  summary,
  effectiveDate,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-dvh bg-background text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/92 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="finance-focus inline-flex min-w-0 items-center gap-2.5 font-semibold">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-active/10 text-active">
              <CircleDollarSign size={20} aria-hidden="true" />
            </span>
            <span className="truncate">Jamal&apos;s Finance</span>
          </Link>

          <Link
            href="/"
            className="finance-focus inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-surface-secondary px-4 text-sm font-semibold text-text-primary hover:bg-hover"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Home
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-active">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-text-secondary sm:text-lg">{summary}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
            <span>Effective {effectiveDate}</span>
            <span aria-hidden="true">•</span>
            <span>Last reviewed {effectiveDate}</span>
          </div>
        </div>

        <aside className="mt-8 flex max-w-3xl items-start gap-3 rounded-[20px] bg-info/10 px-4 py-4 text-sm leading-6 text-text-secondary sm:px-5">
          <ShieldCheck className="mt-0.5 shrink-0 text-info" size={18} aria-hidden="true" />
          <p>
            This is the service&apos;s current operational notice. It describes the product as implemented today and will be updated when providers, features, or legal obligations change.
          </p>
        </aside>

        <article className="mt-10 max-w-3xl">{children}</article>

        <footer className="mt-12 border-t border-border/70 pt-7 text-sm text-text-secondary">
          <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label="Legal navigation">
            <Link className="finance-focus font-semibold hover:text-text-primary" href="/privacy">
              Privacy
            </Link>
            <Link className="finance-focus font-semibold hover:text-text-primary" href="/terms">
              Terms
            </Link>
            <Link className="finance-focus font-semibold hover:text-text-primary" href="/disclosures">
              Disclosures
            </Link>
            <Link className="finance-focus font-semibold hover:text-text-primary" href="/support">
              Support
            </Link>
          </nav>
          <p className="mt-5">© {new Date().getFullYear()} Jamal&apos;s Finance.</p>
        </footer>
      </div>
    </main>
  );
}
