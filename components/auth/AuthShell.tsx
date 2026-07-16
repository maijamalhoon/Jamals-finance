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
}: {
  children: ReactNode;
  eyebrow: string;
  progress?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <main
      className="jf-auth-root relative flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background text-text-primary"
      data-auth-root
    >
      <div className="jf-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="jf-auth-header relative z-20 mx-auto flex w-full max-w-[1240px] min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Jamals Finance home"
          className="finance-focus inline-flex min-h-11 min-w-0 items-center gap-2.5 rounded-[var(--radius-control)] px-1 text-sm font-bold text-text-primary"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-brand/25 bg-brand/10 text-brand">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate">Jamals Finance</span>
        </Link>

        <Link
          href="/"
          aria-label="Return to Jamals Finance home"
          className="finance-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface-primary px-3 text-sm font-semibold text-text-secondary shadow-[var(--shadow-xs)] transition-colors hover:bg-surface-soft hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Return home</span>
        </Link>
      </header>

      <div
        className={`jf-auth-layout relative z-10 mx-auto grid w-full max-w-[1180px] min-w-0 flex-1 items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(460px,480px)] lg:px-8 xl:gap-14 ${
          compact ? "jf-auth-layout-compact" : ""
        }`}
      >
        <aside className="jf-auth-context hidden min-w-0 lg:block" aria-label="Why use Jamals Finance">
          <p className="text-sm font-semibold text-brand">Calm by design</p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-semibold leading-[1.08] text-text-primary xl:text-[2.8rem]">
            Make the next money decision with a clearer picture.
          </h2>
          <p className="mt-4 max-w-xl text-pretty text-base leading-7 text-text-secondary">
            A focused personal-finance workspace for recording what happened,
            reviewing what matters, and planning the next step.
          </p>

          <div className="mt-7 grid max-w-xl gap-3">
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

        <section className="jf-auth-card motion-reveal mx-auto w-full max-w-[480px] min-w-0 p-5 sm:p-7">
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
    </main>
  );
}
