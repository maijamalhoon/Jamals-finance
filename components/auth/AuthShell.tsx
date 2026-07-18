import "@/app/auth-experience.css";
import "@/app/auth-mobile-refinement.css";
import "@/app/auth-responsive-final.css";
import "@/app/auth-premium-redesign.css";
import "@/app/landing-math-symbols.css";
import "@/app/auth-form-composition.css";
import "@/app/auth-spacing-guard.css";
import "@/app/auth-artist-touch.css";
import "@/app/auth-type-icon-system.css";

import Link from "next/link";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  CircleDollarSign,
  Landmark,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import MathSymbolField from "@/components/landing/MathSymbolField";

type AuthTheme = "login" | "signup" | "recovery" | "onboarding";

type VisualItem = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type AuthVisual = {
  eyebrow: string;
  title: string;
  copy: string;
  badge: string;
  icon: LucideIcon;
  headline: string;
  trend: string;
  items: VisualItem[];
};

const authVisuals: Record<AuthTheme, AuthVisual> = {
  login: {
    eyebrow: "Protected finance access",
    title: "Your money workspace is ready when you are.",
    copy: "Return to one connected view of accounts, activity, goals, payables, investments, and reports.",
    badge: "Private access",
    icon: LockKeyhole,
    headline: "One clear financial view",
    trend: "Secure session checks",
    items: [
      { icon: WalletCards, label: "Accounts", value: "Connected" },
      { icon: ReceiptText, label: "Activity", value: "Organized" },
      { icon: ChartNoAxesCombined, label: "Insights", value: "Readable" },
    ],
  },
  signup: {
    eyebrow: "A clean financial start",
    title: "Build a workspace around your real money context.",
    copy: "Create the account first, then add only the profile and finance details needed to make your dashboard useful.",
    badge: "New workspace",
    icon: Sparkles,
    headline: "Simple setup, useful result",
    trend: "No invented activity",
    items: [
      { icon: ShieldCheck, label: "Account", value: "Protected" },
      { icon: Landmark, label: "First account", value: "Optional" },
      { icon: Target, label: "Workspace", value: "Personal" },
    ],
  },
  recovery: {
    eyebrow: "Secure account recovery",
    title: "Recover access without losing your place.",
    copy: "Recovery states stay clear and private while the existing link checks, session binding, and password rules do their work.",
    badge: "Verified flow",
    icon: ShieldCheck,
    headline: "Careful recovery checks",
    trend: "No account details exposed",
    items: [
      { icon: LockKeyhole, label: "Link", value: "Verified" },
      { icon: ShieldCheck, label: "Password", value: "Protected" },
      { icon: ChartNoAxesCombined, label: "Return", value: "Seamless" },
    ],
  },
  onboarding: {
    eyebrow: "Guided workspace setup",
    title: "Four calm steps to a useful finance dashboard.",
    copy: "Profile, account context, module orientation, and completion stay together in one responsive setup journey.",
    badge: "Guided setup",
    icon: Target,
    headline: "A workspace built around you",
    trend: "Progress saved by account",
    items: [
      { icon: ShieldCheck, label: "Profile", value: "Personal" },
      { icon: Landmark, label: "Account", value: "Connected" },
      { icon: ChartNoAxesCombined, label: "Dashboard", value: "Ready" },
    ],
  },
};

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Existing security preserved",
    copy: "Authentication, validation, redirects, and session behavior remain unchanged.",
  },
  {
    icon: CircleDollarSign,
    title: "Real finance context",
    copy: "The experience reflects the accounts and activity you choose to record.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Comfortable on every screen",
    copy: "Layouts adapt from compact phones to tablets, laptops, and wide displays.",
  },
] as const;

function resolveAuthTheme(eyebrow: string, minimal: boolean): AuthTheme {
  if (!minimal) return "onboarding";

  const value = eyebrow.toLowerCase();
  if (
    value.includes("recovery") ||
    value.includes("password updated") ||
    value.includes("checking link") ||
    value.includes("link unavailable") ||
    value.includes("temporary interruption") ||
    value.includes("saving securely")
  ) {
    return "recovery";
  }

  if (
    value.includes("new account") ||
    value.includes("account details") ||
    value.includes("email confirmation")
  ) {
    return "signup";
  }

  return "login";
}

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
  const theme = resolveAuthTheme(eyebrow, minimal);
  const visual = authVisuals[theme];
  const VisualIcon = visual.icon;

  return (
    <main
      className="jf-auth-root relative flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-background text-text-primary"
      data-auth-root
      data-auth-theme={theme}
      data-auth-minimal={minimal || undefined}
      data-auth-compact={compact || undefined}
    >
      <div className="jf-auth-ambient pointer-events-none absolute inset-0" aria-hidden="true" />
      <MathSymbolField variant="auth" />

      <header className="jf-auth-header relative z-20 mx-auto flex w-full min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Jamal's Finance home"
          className="finance-focus jf-auth-brand inline-flex min-h-11 min-w-0 items-center gap-2.5 text-sm font-bold text-text-primary"
        >
          <span className="jf-auth-brand-mark grid h-9 w-9 shrink-0 place-items-center text-brand">
            <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate">Jamal&apos;s Finance</span>
        </Link>

        <Link
          href="/"
          aria-label="Return to Jamal's Finance home"
          className="finance-focus jf-auth-home-link inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-sm font-semibold text-text-secondary transition-colors hover:text-text-primary"
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
        <aside className="jf-auth-context min-w-0" aria-label={`${visual.eyebrow} overview`}>
          <p className="auth-context-eyebrow">
            <VisualIcon className="h-4 w-4" aria-hidden="true" />
            {visual.eyebrow}
          </p>
          <h2 className="auth-context-title">{visual.title}</h2>
          <p className="auth-context-copy">{visual.copy}</p>

          <div className="auth-showcase-panel" aria-hidden="true">
            <div className="auth-showcase-head">
              <span className="auth-showcase-title">
                <VisualIcon className="h-4 w-4" />
                <strong>{visual.headline}</strong>
              </span>
              <span className="auth-showcase-badge">
                <span />
                {visual.badge}
              </span>
            </div>

            <div className="auth-showcase-balance">
              <span>
                <small>Workspace status</small>
                <strong>{visual.trend}</strong>
              </span>
              <span className="auth-showcase-orbit">
                <CircleDollarSign className="h-6 w-6" />
              </span>
            </div>

            <div className="auth-showcase-chart">
              <span style={{ height: "38%" }} />
              <span style={{ height: "52%" }} />
              <span style={{ height: "44%" }} />
              <span style={{ height: "68%" }} />
              <span style={{ height: "61%" }} />
              <span style={{ height: "79%" }} />
              <span style={{ height: "72%" }} />
            </div>

            <div className="auth-showcase-grid">
              {visual.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} className="auth-showcase-tile">
                    <ItemIcon className="h-4 w-4" />
                    <span>
                      <small>{item.label}</small>
                      <strong>{item.value}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="auth-trust-list">
            {trustItems.map((item) => {
              const ItemIcon = item.icon;

              return (
                <div key={item.title} className="auth-trust-item">
                  <span className="auth-trust-icon">
                    <ItemIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong>{item.title}</strong>
                    <span>{item.copy}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="jf-auth-card motion-reveal mx-auto w-full min-w-0 p-5 sm:p-7">
          <div className="jf-auth-card-head min-w-0">
            <div className="jf-auth-card-meta mb-4 flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="auth-eyebrow">{eyebrow}</span>
                {progress ? <span className="auth-progress">{progress}</span> : null}
              </div>
              <span className="jf-auth-card-icon shrink-0">
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

          <div className="jf-auth-card-body">{children}</div>
        </section>
      </div>

      {minimal ? (
        <footer className="jf-auth-footer relative z-10 mx-auto flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs text-text-tertiary">
          <span>Jamal&apos;s Finance account access</span>
          <Link
            href="/#privacy"
            className="finance-focus inline-flex min-h-11 items-center px-2 font-semibold text-text-secondary hover:text-text-primary"
          >
            Privacy
          </Link>
        </footer>
      ) : null}
    </main>
  );
}
