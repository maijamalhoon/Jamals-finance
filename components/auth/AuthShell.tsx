import "@/app/auth-experience.css";
import "@/app/auth-mobile-refinement.css";

import Link from "next/link";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  CircleDollarSign,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

const trustItems = [
  {
    icon: ChartNoAxesCombined,
    title: "One clear financial view",
    copy: "Accounts, activity, goals, liabilities, investments, and reports stay connected.",
  },
  {
    icon: LockKeyhole,
    title: "Private after sign-in",
    copy: "Your personal finance records remain inside the authenticated workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Honest account states",
    copy: "Sign-in, recovery, and profile setup explain what is happening without exposing private details.",
  },
] as const;

export default function AuthShell({
  children,
  eyebrow,
  progress,
  title,
  description,
  icon: Icon = ShieldCheck,
  compact = false,
  minimal = false,
}: {
  children: ReactNode;
  eyebrow: string;
  progress?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
  minimal?: boolean;
}) {
  const contextEyebrow = minimal ? "Secure account access" : "Calm by design";
  const contextTitle = minimal
    ? "A clearer money picture starts with protected access."
    : "Make the next money decision with a clearer picture.";
  const contextCopy = minimal
    ? "Sign in, create your workspace, or recover access without leaving the focused finance experience."
    : "A focused personal-finance workspace for recording what happened, reviewing what matters, and planning the next step.";

  return (
    <main
      className="jf-auth-root relative flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background text-text-primary"
      data-auth-root
      data-auth-minimal={minimal || undefined}
      data-auth-compact={compact || undefined}
    >
      <div className="jf-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="jf-auth-header relative z-20 mx-auto flex w-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Jamal's Finance home"
          className="finance-focus inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] px-1 text-sm font-bold text-text-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-brand/25 bg-brand/10 text-brand">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate">Jamal&apos;s Finance</span>
        </Link>

        <Link
          href="/"
          aria-label="Return to Jamal's Finance home"
          className="finance-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-primary px-3 text-sm font-semibold text-text-secondary shadow-[var(--shadow-xs)] transition-colors hover:bg-surface-soft hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Return home</span>
        </Link>
      </header>

      <div
        className={`jf-auth-layout relative z-10 mx-auto grid w-full min-w-0 flex-1 items-center px-4 sm:px-6 lg:px-8 ${
          compact ? "jf-auth-layout-compact" : ""
        }`}
      >
        <aside className="jf-auth-context min-w-0" aria-label="Why use Jamal's Finance">
          <p className="auth-context-eyebrow">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {contextEyebrow}
          </p>
          <h2 className="auth-context-title">{contextTitle}</h2>
          <p className="auth-context-copy">{contextCopy}</p>

          <div className="auth-showcase-panel" aria-hidden="true">
            <div className="auth-showcase-head">
              <strong>Private finance workspace</strong>
              <span>
                <ShieldCheck className="h-4 w-4" /> Protected
              </span>
            </div>
            <div className="auth-showcase-grid">
              <div className="auth-showcase-tile">
                <ChartNoAxesCombined className="h-5 w-5" />
                <span>Clear activity</span>
              </div>
              <div className="auth-showcase-tile">
                <LockKeyhole className="h-5 w-5" />
                <span>Secure access</span>
              </div>
              <div className="auth-showcase-tile">
                <CircleDollarSign className="h-5 w-5" />
                <span>Money context</span>
              </div>
            </div>
          </div>

          <div className="auth-trust-list">
            {trustItems.map((item) => {
              const ItemIcon = item.icon;

              return (
                <div key={item.title} className="auth-trust-item">
                  <span className="finance-icon-container" data-size="sm">
                    <ItemIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold text-text-primary">
                      {item.title}
                    </strong>
                    <span className="mt-1 block text-sm leading-6 text-text-secondary">
                      {item.copy}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="jf-auth-card motion-reveal mx-auto w-full min-w-0 p-5 sm:p-7">
          <div className="mb-5 min-w-0">
            <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="auth-eyebrow">{eyebrow}</span>
                {progress ? <span className="auth-progress">{progress}</span> : null}
              </div>
              <span className="finance-icon-container shrink-0" data-size="sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <h1 className="break-words text-balance text-[1.8rem] font-semibold leading-tight text-text-primary sm:text-[2.05rem]">
              {title}
            </h1>
            <p className="mt-2 break-words text-pretty text-sm leading-6 text-text-secondary sm:text-[15px]">
              {description}
            </p>
          </div>

          {children}
        </section>
      </div>

      {minimal ? (
        <footer className="jf-auth-footer relative z-10 mx-auto flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-text-tertiary">
          <span>Jamal&apos;s Finance account access</span>
          <Link
            href="/#privacy"
            className="finance-focus inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-2 font-semibold text-text-secondary hover:text-text-primary"
          >
            Privacy
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
