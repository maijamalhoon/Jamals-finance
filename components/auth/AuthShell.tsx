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

import ThemeSelector from "@/components/theme/ThemeSelector";

const contextItems = [
  {
    icon: ChartNoAxesCombined,
    title: "One financial workspace",
    copy: "Accounts, activity, goals, liabilities, investments, and reports stay connected.",
  },
  {
    icon: LockKeyhole,
    title: "Private after sign-in",
    copy: "Personal finance records remain inside the authenticated dashboard.",
  },
  {
    icon: ShieldCheck,
    title: "Clear session states",
    copy: "Sign-in, recovery, and onboarding keep their existing secure routing behavior.",
  },
] as const;

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
  icon: Icon = ShieldCheck,
  compact = false,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
}) {
  return (
    <main className="jf-node4-auth jf-login-polish relative min-h-dvh overflow-x-hidden bg-background text-foreground">
      <div className="jf-node4-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />

      <header className="relative z-20 mx-auto flex w-full max-w-[1180px] items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          aria-label="Jamal's Finance home"
          className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-2 text-sm font-bold text-text-primary"
        >
          <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] border border-brand/20 bg-brand/10 text-brand">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">Jamal&apos;s Finance</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeSelector />
          <Link
            href="/"
            aria-label="Return to home"
            title="Return to home"
            className="finance-focus grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary text-text-secondary shadow-[var(--shadow-xs)] hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div
        className={`relative z-10 mx-auto grid w-full max-w-[1120px] items-center gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.72fr)] lg:gap-10 lg:pb-10 ${
          compact ? "min-h-[calc(100dvh-84px)]" : "min-h-[calc(100dvh-88px)]"
        }`}
      >
        <aside className="jf-node4-auth-context hidden min-w-0 lg:block">
          <p className="text-sm font-semibold text-brand">Calm by design</p>
          <h2 className="mt-4 max-w-xl text-balance text-4xl font-semibold leading-[1.08] text-text-primary xl:text-5xl">
            Make the next money decision with a clearer picture.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-text-secondary">
            A focused personal-finance workspace for recording what happened,
            reviewing what matters, and planning the next step.
          </p>

          <div className="mt-8 grid max-w-xl gap-3">
            {contextItems.map((item) => {
              const ItemIcon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-[var(--radius-card)] border border-border bg-surface-primary/80 p-4 shadow-[var(--shadow-xs)]"
                >
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

        <section className="finance-surface motion-reveal mx-auto w-full max-w-[500px] overflow-hidden p-5 sm:p-7">
          <div className="mb-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-surface-secondary px-3 text-xs font-semibold text-text-secondary">
                {eyebrow}
              </span>
              <span className="finance-icon-container" data-size="sm">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <h1 className="text-balance text-3xl font-semibold leading-tight text-text-primary sm:text-[2.1rem]">
              {title}
            </h1>
            <p className="mt-2 text-pretty text-sm leading-6 text-text-secondary sm:text-[15px]">
              {description}
            </p>
          </div>

          {children}
        </section>
      </div>
    </main>
  );
}
