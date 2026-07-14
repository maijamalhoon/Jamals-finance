import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Goal,
  Landmark,
  LineChart,
  LockKeyhole,
  Menu,
  PieChart,
  ReceiptText,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import ThemeSelector from "@/components/theme/ThemeSelector";

type Capability = {
  title: string;
  copy: string;
  icon: LucideIcon;
  tone: "brand" | "success" | "danger" | "warning" | "info" | "investment";
};

const navigation = [
  { label: "Capabilities", href: "#capabilities" },
  { label: "Workflow", href: "#workflow" },
  { label: "Preview", href: "#preview" },
  { label: "Privacy", href: "#privacy" },
] as const;

const capabilities: Capability[] = [
  {
    title: "Accounts",
    copy: "Keep cash, wallet, savings, and other account balances in one readable view.",
    icon: WalletCards,
    tone: "brand",
  },
  {
    title: "Transactions",
    copy: "Record daily money movement with account, category, date, and reference context.",
    icon: ArrowLeftRight,
    tone: "info",
  },
  {
    title: "Income",
    copy: "Log money coming in and review it alongside the rest of your activity.",
    icon: TrendingUp,
    tone: "success",
  },
  {
    title: "Expenses",
    copy: "Capture spending honestly without turning unavailable information into zeroes.",
    icon: TrendingDown,
    tone: "danger",
  },
  {
    title: "Budget context",
    copy: "Use categories, spending views, and reports to understand budget pressure; there is no fake bank-sync claim.",
    icon: Gauge,
    tone: "warning",
  },
  {
    title: "Recurring obligations",
    copy: "Use transaction history and payable due dates to keep recurring bills visible in your review routine.",
    icon: CalendarClock,
    tone: "warning",
  },
  {
    title: "Goals",
    copy: "Track savings targets with visible progress and remaining-distance context.",
    icon: Target,
    tone: "success",
  },
  {
    title: "Debt and payables",
    copy: "Record liabilities, repayments, deadlines, and outstanding balances without hiding their meaning.",
    icon: CreditCard,
    tone: "danger",
  },
  {
    title: "Investments",
    copy: "Review holdings beside the rest of your personal finance picture.",
    icon: LineChart,
    tone: "investment",
  },
  {
    title: "Analytics",
    copy: "Read existing finance summaries and charts without fabricated trends or unsupported calculations.",
    icon: BarChart3,
    tone: "brand",
  },
  {
    title: "Reports",
    copy: "Move from individual entries to category and cash-flow summaries that support review.",
    icon: PieChart,
    tone: "info",
  },
  {
    title: "AI insights",
    copy: "Use the dedicated insights area to interpret available finance context when the service is available.",
    icon: BrainCircuit,
    tone: "investment",
  },
  {
    title: "Settings and security",
    copy: "Manage profile, preferences, categories, password, and real session actions from authenticated settings.",
    icon: Settings,
    tone: "brand",
  },
];

const toneClasses: Record<Capability["tone"], string> = {
  brand: "border-brand/20 bg-brand/10 text-brand",
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-danger/20 bg-danger/10 text-danger",
  warning: "border-warning/20 bg-warning/10 text-warning",
  info: "border-info/20 bg-info/10 text-info",
  investment: "border-investment/20 bg-investment/10 text-investment",
};

const previewBars = [42, 58, 49, 72, 62, 84, 68, 76] as const;

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <p className="text-sm font-semibold text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-7 text-text-secondary sm:text-lg">
        {copy}
      </p>
    </div>
  );
}

function CTA({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`finance-focus group inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-button)] px-5 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-duration-fast)] active:translate-y-px ${
        secondary
          ? "border border-border bg-surface-primary text-text-primary shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-surface-soft"
          : "border border-brand bg-brand text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-brand-hover"
      }`}
    >
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

function ProductPreview() {
  return (
    <figure
      className="finance-surface relative overflow-hidden p-3 sm:p-4"
      aria-labelledby="product-preview-caption"
    >
      <div className="grid gap-3 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="rounded-[var(--radius-card)] border border-brand/25 bg-brand p-5 text-primary-foreground">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                Illustrative preview
              </p>
              <h3 className="mt-2 text-xl font-semibold">Monthly overview</h3>
            </div>
            <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold">
              Demo values
            </span>
          </div>

          <div className="mt-8 rounded-[var(--radius-control)] border border-current/15 bg-background/10 p-4">
            <p className="text-sm opacity-80">Illustrative balance</p>
            <p className="finance-amount mt-2 text-3xl font-semibold">PKR 248,500</p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-control)] border border-current/15 bg-background/10 p-3">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              <p className="mt-3 text-xs opacity-80">Income</p>
              <p className="finance-amount mt-1 font-semibold">+ PKR 64,000</p>
            </div>
            <div className="rounded-[var(--radius-control)] border border-current/15 bg-background/10 p-3">
              <TrendingDown className="h-4 w-4" aria-hidden="true" />
              <p className="mt-3 text-xs opacity-80">Expenses</p>
              <p className="finance-amount mt-1 font-semibold">- PKR 21,300</p>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-tertiary">Cash-flow pattern</p>
                <h3 className="mt-1 font-semibold text-text-primary">Eight-period view</h3>
              </div>
              <BarChart3 className="h-5 w-5 text-brand" aria-hidden="true" />
            </div>
            <div
              className="mt-6 flex h-44 items-end gap-2 border-b border-chart-grid"
              role="img"
              aria-label="Illustrative cash-flow bars varying between 42 and 84 percent"
            >
              {previewBars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="min-w-0 flex-1 rounded-t-md bg-chart-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-border bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-text-tertiary">Recent activity</p>
                <h3 className="mt-1 font-semibold text-text-primary">Clear entries</h3>
              </div>
              <ReceiptText className="h-5 w-5 text-info" aria-hidden="true" />
            </div>

            <div className="mt-5 grid gap-2">
              {[
                ["Income recorded", "+ PKR 40,000", "success"],
                ["Household expense", "- PKR 8,600", "danger"],
                ["Goal contribution", "+ PKR 12,000", "warning"],
              ].map(([label, value, tone]) => (
                <div
                  key={label}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-[var(--radius-control)] border border-border bg-surface-primary px-3 py-3 text-sm"
                >
                  <span className="min-w-0 truncate text-text-secondary">{label}</span>
                  <span
                    className={`finance-amount font-semibold ${
                      tone === "success"
                        ? "text-success"
                        : tone === "danger"
                          ? "text-danger"
                          : "text-warning"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <figcaption id="product-preview-caption" className="sr-only">
        A static, illustrative product preview. Values shown are demonstration data, not a live account.
      </figcaption>
    </figure>
  );
}

export default function PremiumLandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="jf-node4-landing relative min-h-dvh overflow-x-clip bg-background text-foreground">
      <div className="jf-node4-landing-ambient pointer-events-none absolute inset-x-0 top-0 h-[48rem]" aria-hidden="true" />

      <header className="sticky top-0 z-50 border-b border-divider bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="finance-focus inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-control)] px-1 text-sm font-bold text-text-primary"
          >
            <span className="grid h-9 w-9 place-items-center rounded-[var(--radius-control)] border border-brand/20 bg-brand/10 text-brand">
              <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="hidden min-[360px]:inline">Jamal&apos;s Finance</span>
          </Link>

          <nav aria-label="Landing page" className="ml-auto hidden items-center gap-1 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="finance-focus inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-text-secondary hover:bg-surface-soft hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-3">
            <ThemeSelector />
            <Link
              href="/login"
              className="finance-focus hidden min-h-11 items-center rounded-[var(--radius-button)] px-3 text-sm font-semibold text-text-secondary hover:bg-surface-soft hover:text-text-primary sm:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/login"
              className="finance-focus hidden min-h-11 items-center gap-2 rounded-[var(--radius-button)] bg-brand px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-brand-hover md:inline-flex"
            >
              Start your workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <details className="relative lg:hidden">
              <summary className="finance-focus grid h-11 w-11 cursor-pointer list-none place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary text-text-primary shadow-[var(--shadow-xs)] [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" aria-hidden="true" />
                <span className="sr-only">Open navigation</span>
              </summary>
              <nav
                aria-label="Mobile landing page"
                className="finance-surface absolute right-0 top-13 grid w-[min(82vw,280px)] gap-1 p-2"
              >
                {navigation.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="finance-focus inline-flex min-h-11 items-center justify-between rounded-[var(--radius-control)] px-3 text-sm font-semibold text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                  >
                    {item.label}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
                <Link
                  href="/login"
                  className="finance-focus mt-1 inline-flex min-h-11 items-center justify-center rounded-[var(--radius-button)] bg-brand px-4 text-sm font-semibold text-primary-foreground"
                >
                  Login or sign up
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-10 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] lg:items-center lg:pt-24">
        <div className="min-w-0">
          <p className="inline-flex min-h-8 items-center gap-2 rounded-full border border-border bg-surface-primary px-3 text-xs font-semibold text-text-secondary shadow-[var(--shadow-xs)]">
            <Sparkles className="h-4 w-4 text-warning" aria-hidden="true" />
            Personal finance, without the noise
          </p>
          <h1 className="mt-6 max-w-3xl text-balance text-[clamp(2.5rem,7vw,4.9rem)] font-semibold leading-[0.98] tracking-[-0.04em] text-text-primary">
            One calm place for your whole money picture.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-8 text-text-secondary sm:text-lg">
            Record income and spending, follow goals and liabilities, review investments,
            and understand the activity you actually entered—without fake bank connections or fabricated trends.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <CTA href="/login">Start your workspace</CTA>
            <CTA href="/login" secondary>Login or sign up</CTA>
          </div>

          <div className="mt-6 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
            {[
              "Private authenticated workspace",
              "System, Light, and Dark themes",
              "Designed for phone and desktop",
              "Illustrative previews clearly labeled",
            ].map((item) => (
              <span key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <ProductPreview />
      </section>

      <section aria-label="Product values" className="relative z-10 border-y border-divider bg-surface-primary/70">
        <div className="mx-auto grid w-full max-w-[1180px] divide-y divide-divider px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          {[
            [ShieldCheck, "Private by context", "Public marketing stays separate from authenticated finance records."],
            [Landmark, "Financially credible", "Unavailable data is not presented as zero or as a fabricated success."],
            [WalletCards, "Responsive access", "The workspace is shaped for touch, keyboard, narrow screens, and desktop."],
          ].map(([Icon, title, copy]) => {
            const ValueIcon = Icon as LucideIcon;
            return (
              <div key={title as string} className="flex gap-3 py-5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
                <span className="finance-icon-container" data-size="sm">
                  <ValueIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-sm font-semibold text-text-primary">{title as string}</strong>
                  <span className="mt-1 block text-sm leading-6 text-text-secondary">{copy as string}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section id="capabilities" className="relative z-10 mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 sm:py-24">
        <SectionHeading
          eyebrow="Product capabilities"
          title="A connected workspace for daily tracking and thoughtful review."
          copy="Each area has a clear purpose. Dedicated modules stay honest about what exists today, while categories, payables, and reports provide context for budgets and recurring obligations."
        />

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <article key={capability.title} className="finance-surface finance-hover-lift min-w-0 p-5">
                <span className={`grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border ${toneClasses[capability.tone]}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-text-primary">{capability.title}</h3>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{capability.copy}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="relative z-10 border-y border-divider bg-surface-secondary/70">
        <div className="mx-auto grid w-full max-w-[1180px] gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.78fr_1.22fr]">
          <SectionHeading
            align="left"
            eyebrow="Simple workflow"
            title="Set up, record, and review—without ceremony."
            copy="The product becomes useful through accurate entries and repeatable review, not through decorative automation claims."
          />

          <ol className="grid gap-3">
            {[
              ["01", "Set up your context", "Complete the existing onboarding flow, then add the accounts and categories that match your life."],
              ["02", "Record daily activity", "Capture income, expenses, transfers, goals, payables, and investments as they happen."],
              ["03", "Review what changed", "Use the dashboard, analytics, reports, and available AI insights to understand the recorded pattern."],
            ].map(([number, title, copy]) => (
              <li key={number} className="finance-surface grid gap-4 p-5 sm:grid-cols-[auto_minmax(0,1fr)]">
                <span className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-brand/20 bg-brand/10 text-sm font-semibold text-brand">
                  {number}
                </span>
                <span>
                  <strong className="block text-lg font-semibold text-text-primary">{title}</strong>
                  <span className="mt-2 block text-sm leading-6 text-text-secondary">{copy}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="preview" className="relative z-10 mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <SectionHeading
          align="left"
          eyebrow="Illustrative analytics preview"
          title="See the shape of activity without mistaking a demo for your data."
          copy="This preview demonstrates hierarchy only. The authenticated product calculates summaries from the finance records available to the signed-in user."
        />
        <ProductPreview />
      </section>

      <section id="privacy" className="relative z-10 border-y border-divider bg-surface-primary/70">
        <div className="mx-auto grid w-full max-w-[1180px] gap-8 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="finance-icon-container" data-size="lg">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="mt-6 max-w-xl text-balance text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
              Trust comes from precise behavior, not oversized badges.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-text-secondary">
              Jamal&apos;s Finance uses the existing Supabase authentication flow for protected entry.
              Recovery, callback, deep-link, and current-device session behavior remain part of that established contract.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              ["Authenticated routes", "Personal dashboard content is loaded after the existing session checks complete."],
              ["Purpose-bound recovery", "Password recovery keeps its established recovery-event and marker checks before allowing an update."],
              ["Truthful data states", "Missing or unavailable finance data is not turned into a zero, success state, or invented trend."],
              ["No unsupported claims", "The product does not claim certifications, automatic bank connections, or offline writes that are not implemented."],
            ].map(([title, copy]) => (
              <div key={title} className="finance-surface flex gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                <span>
                  <strong className="block text-sm font-semibold text-text-primary">{title}</strong>
                  <span className="mt-1 block text-sm leading-6 text-text-secondary">{copy}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6 sm:py-24">
        <div className="finance-surface jf-node4-cta overflow-hidden p-6 text-center sm:p-10 lg:p-14">
          <Goal className="mx-auto h-9 w-9 text-brand" aria-hidden="true" />
          <h2 className="mx-auto mt-5 max-w-3xl text-balance text-3xl font-semibold leading-tight text-text-primary sm:text-5xl">
            Start with one accurate entry. Build clarity from there.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-7 text-text-secondary sm:text-lg">
            Open your workspace, add the finance context that matters, and let a cleaner record support the next decision.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CTA href="/login">Start your workspace</CTA>
            <CTA href="/login" secondary>Login or sign up</CTA>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-divider bg-surface-primary/60">
        <div className="mx-auto grid w-full max-w-[1180px] gap-6 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <div>
            <Link href="/" className="finance-focus inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] text-sm font-bold text-text-primary">
              <CircleDollarSign className="h-5 w-5 text-brand" aria-hidden="true" />
              Jamal&apos;s Finance
            </Link>
            <p className="mt-1 max-w-xl text-sm leading-6 text-text-secondary">
              A private personal-finance workspace for accurate daily tracking and clearer review.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-1 sm:justify-end">
            {[
              ["Capabilities", "#capabilities"],
              ["Privacy", "#privacy"],
              ["Login", "/login"],
              ["Dashboard", "/dashboard"],
            ].map(([label, href]) => (
              <Link key={label} href={href} className="finance-focus inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-semibold text-text-secondary hover:bg-surface-soft hover:text-text-primary">
                {label}
              </Link>
            ))}
          </nav>

          <p className="text-xs text-text-tertiary sm:col-span-2">
            © {year} Jamal&apos;s Finance. Public landing page; authenticated finance workspace.
          </p>
        </div>
      </footer>
    </main>
  );
}
