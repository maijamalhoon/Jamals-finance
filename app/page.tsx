import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChartColumn,
  ChartLine,
  ChartPie,
  CircleCheck,
  CreditCard,
  Earth,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

type Feature = {
  title: string;
  description: string;
  icon: IconType;
  tone?: string;
};

const features: Feature[] = [
  {
    title: "All accounts together",
    description:
      "Track bank, cash, wallets, savings, and business money from one clean workspace.",
    icon: WalletCards,
    tone: "jf-icon-bubble-success",
  },
  {
    title: "Smart transactions",
    description:
      "Record income, expenses, transfers, liabilities, and payments with a fast daily flow.",
    icon: CreditCard,
  },
  {
    title: "Clear insights",
    description:
      "Understand your money movement with summaries, categories, and readable charts.",
    icon: ChartPie,
    tone: "jf-icon-bubble-warning",
  },
  {
    title: "Goals and growth",
    description:
      "Plan savings, investments, and future targets with confidence and clarity.",
    icon: TrendingUp,
    tone: "jf-icon-bubble-success",
  },
  {
    title: "Private by design",
    description:
      "Your dashboard stays protected behind secure authentication and user-specific data.",
    icon: ShieldCheck,
  },
  {
    title: "Mobile-ready experience",
    description:
      "Designed for quick finance checks on mobile, tablet, and desktop devices.",
    icon: Earth,
    tone: "jf-icon-bubble-success",
  },
];

const steps = [
  {
    title: "Create your workspace",
    description:
      "Sign in securely and start with a focused personal dashboard.",
  },
  {
    title: "Add money activity",
    description:
      "Track accounts, income, expenses, transfers, goals, and liabilities.",
  },
  {
    title: "Review progress",
    description:
      "Use cards, summaries, and charts to see where your money is moving.",
  },
];

const modules = [
  "Accounts",
  "Income",
  "Expenses",
  "Transactions",
  "Goals",
  "Investments",
  "Payables",
  "Reports",
];

const previewBars = [44, 68, 52, 84, 62, 92, 74] as const;

export default function HomePage() {
  return (
    <main className="jf-page-shell min-h-dvh overflow-x-hidden pb-24 text-text-primary sm:pb-0">
      <Header />

      <section className="mx-auto grid w-full max-w-7xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:px-8 lg:pb-20 lg:pt-16">
        <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
          <div className="jf-badge jf-badge-active mx-auto mb-5 lg:mx-0">
            <Sparkles className="h-4 w-4" />
            Premium finance dashboard
          </div>

          <h1 className="mx-auto max-w-[780px] text-[clamp(2.45rem,11vw,5.2rem)] font-black leading-[0.94] tracking-[-0.065em] text-text-primary lg:mx-0">
            Manage your money with clarity, speed, and confidence.
          </h1>

          <p className="mx-auto mt-5 max-w-[650px] text-base leading-8 text-text-secondary sm:text-lg lg:mx-0">
            Jamal&apos;s Finance helps you track accounts, expenses, income,
            goals, liabilities, investments, and savings in one secure workspace
            that feels smooth on every device.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/login"
              className="jf-btn jf-btn-primary sm:w-auto sm:px-6"
            >
              Start your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="jf-btn jf-btn-secondary sm:w-auto sm:px-6"
            >
              Explore features
            </a>
          </div>

          <div className="mt-7 grid gap-3 text-sm text-text-secondary sm:flex sm:flex-wrap sm:items-center sm:justify-center lg:justify-start">
            {[
              "No spreadsheet mess",
              "Mobile-first UI",
              "Secure private login",
            ].map((item) => (
              <span
                key={item}
                className="inline-flex items-center justify-center gap-2 sm:justify-start"
              >
                <CircleCheck className="h-4 w-4 shrink-0 text-success" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <DashboardPreview />
        </div>
      </section>

      <section
        id="features"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="jf-eyebrow justify-center">
            Built for daily money control
          </p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
            Everything important, without the clutter.
          </h2>
          <p className="mt-4 text-base leading-8 text-text-secondary sm:text-lg">
            A clean finance experience that feels simple for beginners and
            powerful enough for serious users.
          </p>
        </div>

        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="jf-card-premium jf-card-hover p-5 sm:p-6"
              >
                <div className={`jf-icon-bubble mb-5 ${feature.tone ?? ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="workflow"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
      >
        <div className="jf-card-premium grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <div>
            <div className="jf-icon-bubble mb-5">
              <Zap className="h-6 w-6" />
            </div>
            <p className="jf-eyebrow">How it works</p>
            <h2 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
              A smoother routine for daily money decisions.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
              The goal is not just to store numbers. The goal is to help users
              understand their financial life quickly on mobile and desktop.
            </p>
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step.title} className="jf-card-soft flex gap-4 p-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-active text-sm font-black text-background">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-text-secondary">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-16">
        <div className="jf-card-premium p-5 sm:p-8">
          <p className="jf-eyebrow">Finance modules</p>
          <h2 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
            One workspace for every money area.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
            Each module should feel connected, fast, and easy to understand,
            especially on mobile screens.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {modules.map((module) => (
              <span key={module} className="jf-badge">
                <BadgeCheck className="h-3.5 w-3.5 text-success" />
                {module}
              </span>
            ))}
          </div>
        </div>

        <div className="jf-card p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-text-primary">
                Mobile focus
              </p>
              <p className="text-xs text-text-secondary">
                Fast thumb-friendly UI
              </p>
            </div>
            <div className="jf-icon-bubble jf-icon-bubble-success">
              <ChartLine className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3">
            {[
              "Readable cards on small screens",
              "Clear CTAs with large tap area",
              "No horizontal scroll",
              "Reduced motion support",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl bg-surface-secondary p-3"
              >
                <CircleCheck className="h-4 w-4 shrink-0 text-success" />
                <span className="text-sm font-semibold text-text-primary">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="security"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16"
      >
        <div className="jf-card-premium grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
          <div>
            <div className="jf-icon-bubble jf-icon-bubble-success mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="jf-eyebrow">Security and trust</p>
            <h2 className="mt-3 text-[clamp(2rem,6vw,3.75rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
              Premium look, protected workspace.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
              The public site explains the product clearly, while private
              finance data stays behind secure authentication.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Dashboard stays protected for signed-in users only",
              "Landing page is public for visitors and search engines",
              "Login path is clean and easy to understand",
              "Design system is ready for full app polish",
            ].map((item) => (
              <div
                key={item}
                className="jf-card-soft flex items-start gap-3 p-4"
              >
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-bold leading-6 text-text-primary">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="jf-card-premium mx-auto max-w-4xl p-6 text-center sm:p-10">
          <div className="jf-icon-bubble mx-auto mb-5 h-14 w-14">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="mx-auto max-w-3xl text-[clamp(2rem,6vw,3.75rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
            Start building better money habits today.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-text-secondary sm:text-lg">
            Create your workspace, connect your finance routine, and turn daily
            money tracking into a clean premium experience.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/login"
              className="jf-btn jf-btn-primary sm:w-auto sm:px-7"
            >
              Open Jamal&apos;s Finance
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="jf-btn jf-btn-secondary sm:w-auto sm:px-7"
            >
              View features
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <MobileStickyCta />
    </main>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="finance-focus flex min-w-0 items-center gap-3 rounded-2xl"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-card shadow-theme">
            <ChartColumn className="h-5 w-5 text-active" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight text-text-primary">
              Jamal&apos;s Finance
            </span>
            <span className="block truncate text-xs text-text-secondary">
              Personal money OS
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href="#features"
            className="jf-btn jf-btn-ghost min-h-10 px-3 text-sm"
          >
            Features
          </a>
          <a
            href="#workflow"
            className="jf-btn jf-btn-ghost min-h-10 px-3 text-sm"
          >
            How it works
          </a>
          <a
            href="#security"
            className="jf-btn jf-btn-ghost min-h-10 px-3 text-sm"
          >
            Security
          </a>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card text-text-secondary md:hidden">
            <Menu className="h-4 w-4" />
          </span>
          <Link
            href="/login"
            className="jf-btn jf-btn-primary min-h-10 px-4 text-sm sm:w-auto"
          >
            Get started
            <ArrowRight className="hidden h-4 w-4 sm:block" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-4 rounded-[34px] bg-active/10 blur-2xl" />

      <div className="jf-card-premium relative p-4 sm:p-5 lg:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="jf-eyebrow text-[0.68rem]">Live preview</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary sm:text-2xl">
              Personal dashboard
            </h2>
          </div>
          <div className="jf-icon-bubble">
            <LockKeyhole className="h-5 w-5" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["8+", "Finance modules"],
            ["100%", "Clean dashboard"],
            ["Secure", "Private workspace"],
          ].map(([value, label]) => (
            <div key={label} className="jf-card-soft p-4">
              <p className="text-2xl font-black tracking-tight text-text-primary">
                {value}
              </p>
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="jf-card mt-4 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-text-primary">
                Monthly flow
              </p>
              <p className="text-xs text-text-secondary">
                Clean money movement
              </p>
            </div>
            <span className="jf-badge jf-badge-active">Demo</span>
          </div>

          <div className="flex h-28 items-end gap-2 sm:h-36 sm:gap-3">
            {previewBars.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-t-2xl bg-active/20"
                style={{ height: `${height}%` }}
              >
                <div className="h-full rounded-t-2xl bg-active/70" />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {[
            ["Income", "+$4,280", "text-success"],
            ["Expenses", "-$1,940", "text-danger"],
            ["Savings", "$2,340", "text-active"],
          ].map(([label, value, color]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-[20px] border border-border bg-surface-secondary px-4 py-3"
            >
              <span className="text-sm font-medium text-text-secondary">
                {label}
              </span>
              <span className={`text-sm font-black ${color}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 text-center text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p>© 2026 Jamal&apos;s Finance. Built for smarter money control.</p>
        <div className="flex justify-center gap-4">
          <Link className="hover:text-text-primary" href="/login">
            Sign in
          </Link>
          <a href="#features" className="hover:text-text-primary">
            Features
          </a>
        </div>
      </div>
    </footer>
  );
}

function MobileStickyCta() {
  return (
    <div className="fixed inset-x-3 bottom-3 z-40 rounded-[22px] border border-border bg-card/95 p-2 shadow-theme backdrop-blur-xl sm:hidden">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Link href="/login" className="jf-btn jf-btn-primary">
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>
        <a href="#features" className="jf-btn jf-btn-secondary px-4">
          Features
        </a>
      </div>
    </div>
  );
}
