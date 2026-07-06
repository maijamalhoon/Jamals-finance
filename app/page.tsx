import type { ComponentType, CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  Gauge,
  Goal,
  Landmark,
  LineChart,
  LockKeyhole,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

type ValueSignal = {
  label: string;
  detail: string;
  icon: IconType;
};

type Feature = {
  title: string;
  description: string;
  icon: IconType;
  tone: "mint" | "blue" | "gold" | "rose" | "violet" | "cyan";
};

const valueSignals: ValueSignal[] = [
  {
    label: "Track income",
    detail: "Know what came in this month.",
    icon: TrendingUp,
  },
  {
    label: "Track expenses",
    detail: "See where money is going.",
    icon: TrendingDown,
  },
  {
    label: "Set goals",
    detail: "Build progress with clarity.",
    icon: Goal,
  },
  {
    label: "Manage investments",
    detail: "Watch movement in one view.",
    icon: LineChart,
  },
  {
    label: "View reports",
    detail: "Understand patterns faster.",
    icon: BarChart3,
  },
  {
    label: "AI insights",
    detail: "Get smarter finance prompts.",
    icon: BrainCircuit,
  },
  {
    label: "Mobile friendly",
    detail: "Thumb-ready daily tracking.",
    icon: Smartphone,
  },
  {
    label: "Private workspace",
    detail: "Protected app routes and sessions.",
    icon: ShieldCheck,
  },
];

const features: Feature[] = [
  {
    title: "Your balance stays obvious",
    description:
      "Accounts, cash, savings, and wallet totals are presented clearly so you can understand your position in seconds.",
    icon: WalletCards,
    tone: "mint",
  },
  {
    title: "Daily entries feel fast",
    description:
      "Income and expenses are built around quick action flows, not spreadsheet-style friction.",
    icon: ReceiptText,
    tone: "blue",
  },
  {
    title: "Goals show real progress",
    description:
      "Savings targets become visible milestones with progress, remaining amounts, and momentum.",
    icon: Goal,
    tone: "gold",
  },
  {
    title: "Investments stay connected",
    description:
      "Keep investment tracking next to the rest of your financial life instead of in a separate mental drawer.",
    icon: LineChart,
    tone: "violet",
  },
  {
    title: "Reports explain the pattern",
    description:
      "Categories, charts, and summaries help you spot habits before they become surprises.",
    icon: PieChart,
    tone: "rose",
  },
  {
    title: "Insights point to decisions",
    description:
      "The AI insights area is designed to turn your finance activity into clearer next steps.",
    icon: BrainCircuit,
    tone: "cyan",
  },
];

const workflow = [
  {
    title: "Add your money data",
    description:
      "Create accounts, add income, record expenses, and set goals from protected app screens.",
  },
  {
    title: "Track and understand",
    description:
      "Review balances, transactions, reports, goals, investments, and trends in one connected dashboard.",
  },
  {
    title: "Improve your decisions",
    description:
      "Use the patterns you see to adjust spending, save with purpose, and plan the next move.",
  },
];

const previewTransactions = [
  { name: "Salary received", amount: "+$4,200", tone: "income" },
  { name: "Groceries", amount: "-$86", tone: "expense" },
  { name: "Goal transfer", amount: "+$300", tone: "goal" },
  { name: "Investment update", amount: "+2.8%", tone: "investment" },
];

const chartBars = [42, 66, 54, 78, 61, 88, 72, 96, 82, 104] as const;

function delayStyle(delay: number) {
  return { "--jf-lp-delay": `${delay}ms` } as CSSProperties;
}

function barStyle(height: number, delay: number) {
  return {
    "--jf-lp-bar-height": `${height}px`,
    "--jf-lp-delay": `${delay}ms`,
  } as CSSProperties;
}

export default function HomePage() {
  return (
    <main className="jf-lp">
      <header className="jf-lp-nav" aria-label="Primary navigation">
        <Link href="/" className="jf-lp-brand" aria-label="Jamals Finance home">
          <span className="jf-lp-brand-mark" aria-hidden="true">
            <CircleDollarSign className="jf-lp-brand-icon" />
          </span>
          <span>Jamals Finance</span>
        </Link>

        <nav className="jf-lp-nav-links" aria-label="Landing sections">
          <a href="#value">Value</a>
          <a href="#features">Features</a>
          <a href="#preview">Preview</a>
          <a href="#trust">Trust</a>
        </nav>

        <Link href="/login" className="jf-lp-nav-cta">
          Open app
          <ArrowRight className="jf-lp-inline-icon" />
        </Link>
      </header>

      <section className="jf-lp-hero" aria-labelledby="landing-title">
        <div className="jf-lp-ledger" aria-hidden="true" />

        <div className="jf-lp-hero-copy">
          <div className="jf-lp-proof-badge">
            <BadgeCheck className="jf-lp-badge-icon" />
            Daily finance clarity
          </div>

          <h1 id="landing-title">Jamals Finance</h1>

          <p className="jf-lp-hero-lead">
            Track income, expenses, goals, reports, and smarter decisions in
            one clean workspace on phone or desktop.
          </p>

          <div className="jf-lp-hero-actions">
            <Link href="/login" className="jf-lp-primary-action">
              Start using the app
              <ArrowRight className="jf-lp-action-icon" />
            </Link>
            <a href="#features" className="jf-lp-secondary-action">
              Explore features
              <ChevronDown className="jf-lp-action-icon" />
            </a>
          </div>

          <div className="jf-lp-trust-strip" aria-label="Product highlights">
            <span>
              <CheckCircle2 className="jf-lp-check-icon" />
              Clear total balance
            </span>
            <span>
              <CheckCircle2 className="jf-lp-check-icon" />
              Reports and insights
            </span>
            <span>
              <CheckCircle2 className="jf-lp-check-icon" />
              Protected workspace
            </span>
          </div>
        </div>

        <div className="jf-lp-hero-stage" aria-label="Animated app preview">
          <FinancePreview />
        </div>
      </section>

      <section className="jf-lp-value" id="value" aria-labelledby="value-title">
        <div className="jf-lp-section-head jf-lp-section-head-row">
          <div>
            <span className="jf-lp-eyebrow">5-second value</span>
            <h2 id="value-title">A visitor should understand it immediately.</h2>
          </div>
          <p>
            Jamals Finance is for seeing your money clearly, recording daily
            movement quickly, and making better decisions without clutter.
          </p>
        </div>

        <div className="jf-lp-value-grid">
          {valueSignals.map((item, index) => {
            const Icon = item.icon;

            return (
              <article
                className="jf-lp-value-card"
                key={item.label}
                style={delayStyle(index * 55)}
              >
                <span className="jf-lp-value-icon">
                  <Icon className="jf-lp-card-icon" />
                </span>
                <div>
                  <h3>{item.label}</h3>
                  <p>{item.detail}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className="jf-lp-section"
        id="features"
        aria-labelledby="features-title"
      >
        <div className="jf-lp-section-head">
          <span className="jf-lp-eyebrow">Feature showcase</span>
          <h2 id="features-title">Built around the real app experience.</h2>
          <p>
            Every section points to product concepts already present in the
            dashboard: balances, transactions, goals, investments, reports, and
            AI insights.
          </p>
        </div>

        <div className="jf-lp-feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <article
                className="jf-lp-feature-card"
                data-tone={feature.tone}
                key={feature.title}
                style={delayStyle(index * 65)}
              >
                <span className="jf-lp-feature-icon">
                  <Icon className="jf-lp-card-icon" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="jf-lp-flow" aria-labelledby="flow-title">
        <div className="jf-lp-section-head jf-lp-flow-copy">
          <span className="jf-lp-eyebrow">How it works</span>
          <h2 id="flow-title">Three simple moves, repeated whenever life changes.</h2>
          <p>
            The app keeps the routine simple: record the activity, understand
            the pattern, then adjust with confidence.
          </p>
        </div>

        <div className="jf-lp-flow-steps">
          {workflow.map((step, index) => (
            <article
              className="jf-lp-step-card"
              key={step.title}
              style={delayStyle(index * 90)}
            >
              <span className="jf-lp-step-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="jf-lp-preview-section"
        id="preview"
        aria-labelledby="preview-title"
      >
        <div className="jf-lp-preview-copy">
          <span className="jf-lp-eyebrow">Dashboard preview</span>
          <h2 id="preview-title">The landing page now previews the product, not a generic SaaS graphic.</h2>
          <p>
            The visual language mirrors the finance workspace: balance, income,
            expenses, transactions, goals, investments, and monthly reports.
          </p>
        </div>

        <div className="jf-lp-wide-preview" aria-label="Jamals Finance app mockup">
          <FinancePreview variant="wide" />
        </div>
      </section>

      <section className="jf-lp-trust" id="trust" aria-labelledby="trust-title">
        <div>
          <span className="jf-lp-eyebrow">Trust and clarity</span>
          <h2 id="trust-title">Private by design, clear by default.</h2>
          <p>
            The public page stays open for visitors. Personal data stays inside
            protected dashboard routes backed by the existing authentication
            flow and user-specific records.
          </p>
        </div>

        <div className="jf-lp-trust-list">
          {[
            "Start from the existing login and signup flow.",
            "Keep dashboard routes protected behind authentication.",
            "Stay in control of what you add and review.",
            "Use the app comfortably on phone, tablet, or desktop.",
          ].map((item) => (
            <div className="jf-lp-trust-item" key={item}>
              <LockKeyhole className="jf-lp-trust-icon" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="jf-lp-final" aria-labelledby="final-title">
        <span className="jf-lp-eyebrow">Ready when you are</span>
        <h2 id="final-title">Open Jamals Finance and make your next money decision clearer.</h2>
        <p>
          Start with one account, one expense, or one savings goal. The
          dashboard gets more useful with every clean entry.
        </p>
        <Link href="/login" className="jf-lp-primary-action">
          Get started
          <ArrowRight className="jf-lp-action-icon" />
        </Link>
      </section>

      <LandingPageStyles />
    </main>
  );
}

function FinancePreview({ variant = "hero" }: { variant?: "hero" | "wide" }) {
  return (
    <div className="jf-lp-preview" data-variant={variant}>
      <div className="jf-lp-preview-top">
        <div>
          <span>Dashboard</span>
          <strong>Monthly clarity</strong>
        </div>
        <span className="jf-lp-live-pill">Live</span>
      </div>

      <div className="jf-lp-balance-card">
        <div>
          <span>Total balance</span>
          <strong>$24,850</strong>
        </div>
        <div className="jf-lp-balance-meter" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="jf-lp-mini-grid">
        <div className="jf-lp-mini-card" data-tone="income">
          <TrendingUp className="jf-lp-mini-icon" />
          <span>Income</span>
          <strong>$6,420</strong>
        </div>
        <div className="jf-lp-mini-card" data-tone="expense">
          <CreditCard className="jf-lp-mini-icon" />
          <span>Expenses</span>
          <strong>$2,180</strong>
        </div>
        <div className="jf-lp-mini-card" data-tone="goal">
          <Goal className="jf-lp-mini-icon" />
          <span>Goals</span>
          <strong>72%</strong>
        </div>
        <div className="jf-lp-mini-card" data-tone="invest">
          <Gauge className="jf-lp-mini-icon" />
          <span>Investments</span>
          <strong>+4.6%</strong>
        </div>
      </div>

      <div className="jf-lp-chart-panel">
        <div className="jf-lp-chart-head">
          <div>
            <span>Reports</span>
            <strong>Cash flow rhythm</strong>
          </div>
          <BarChart3 className="jf-lp-chart-icon" />
        </div>
        <div className="jf-lp-chart" aria-hidden="true">
          {chartBars.map((height, index) => (
            <span
              key={`${height}-${index}`}
              style={barStyle(height, index * 70)}
            />
          ))}
        </div>
      </div>

      <div className="jf-lp-transaction-panel">
        <div className="jf-lp-chart-head">
          <div>
            <span>Transactions</span>
            <strong>Recent movement</strong>
          </div>
          <Landmark className="jf-lp-chart-icon" />
        </div>

        <div className="jf-lp-transaction-list">
          {previewTransactions.map((transaction, index) => (
            <div
              className="jf-lp-transaction"
              data-tone={transaction.tone}
              key={transaction.name}
              style={delayStyle(index * 95)}
            >
              <span className="jf-lp-transaction-dot" />
              <span>{transaction.name}</span>
              <strong>{transaction.amount}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingPageStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.jf-lp {
  --jf-lp-bg: #f6f8fb;
  --jf-lp-ink: #0b1220;
  --jf-lp-muted: #526070;
  --jf-lp-soft: #718096;
  --jf-lp-panel: rgba(255, 255, 255, 0.88);
  --jf-lp-panel-strong: #ffffff;
  --jf-lp-line: rgba(15, 23, 42, 0.13);
  --jf-lp-line-soft: rgba(15, 23, 42, 0.08);
  --jf-lp-blue: #2563eb;
  --jf-lp-teal: #0f766e;
  --jf-lp-mint: #0f9f6e;
  --jf-lp-gold: #b7791f;
  --jf-lp-rose: #be3455;
  --jf-lp-violet: #6d5bd0;
  --jf-lp-cyan: #0284c7;
  --jf-lp-radius: 1rem;
  --jf-lp-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
  --jf-lp-ease: cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  min-height: 100svh;
  overflow-x: clip;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.045) 1px, transparent 1px),
    linear-gradient(180deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px),
    var(--jf-lp-bg);
  background-size: 64px 64px;
  color: var(--jf-lp-ink);
  font-family: inherit;
}

.dark .jf-lp {
  --jf-lp-bg: #080d13;
  --jf-lp-ink: #f7fafc;
  --jf-lp-muted: #bac6d4;
  --jf-lp-soft: #8fa0b4;
  --jf-lp-panel: rgba(15, 23, 42, 0.76);
  --jf-lp-panel-strong: #111a24;
  --jf-lp-line: rgba(226, 232, 240, 0.16);
  --jf-lp-line-soft: rgba(226, 232, 240, 0.09);
  --jf-lp-blue: #78a8ff;
  --jf-lp-teal: #5eead4;
  --jf-lp-mint: #72f0b6;
  --jf-lp-gold: #f6c76d;
  --jf-lp-rose: #fb8da7;
  --jf-lp-violet: #c4b5fd;
  --jf-lp-cyan: #67d5ff;
  --jf-lp-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
  background:
    linear-gradient(90deg, rgba(226, 232, 240, 0.045) 1px, transparent 1px),
    linear-gradient(180deg, rgba(226, 232, 240, 0.04) 1px, transparent 1px),
    var(--jf-lp-bg);
  background-size: 64px 64px;
}

.jf-lp *,
.jf-lp *::before,
.jf-lp *::after {
  box-sizing: border-box;
}

.jf-lp a {
  text-decoration: none;
}

.jf-lp-nav {
  position: sticky;
  top: 0.75rem;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 0.55rem;
  border: 1px solid var(--jf-lp-line);
  border-radius: var(--jf-lp-radius);
  background: color-mix(in srgb, var(--jf-lp-panel-strong), transparent 12%);
  box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(18px) saturate(1.08);
}

.dark .jf-lp-nav {
  background: color-mix(in srgb, var(--jf-lp-panel-strong), transparent 8%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}

.jf-lp-brand,
.jf-lp-nav-cta,
.jf-lp-nav-links a,
.jf-lp-primary-action,
.jf-lp-secondary-action {
  -webkit-tap-highlight-color: transparent;
}

.jf-lp-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  color: var(--jf-lp-ink);
  font-size: 0.98rem;
  font-weight: 850;
}

.jf-lp-brand-mark {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--jf-lp-mint), transparent 68%);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--jf-lp-mint), transparent 88%);
  color: var(--jf-lp-mint);
}

.jf-lp-brand-icon,
.jf-lp-inline-icon,
.jf-lp-action-icon,
.jf-lp-badge-icon,
.jf-lp-check-icon,
.jf-lp-card-icon,
.jf-lp-mini-icon,
.jf-lp-chart-icon,
.jf-lp-trust-icon {
  width: 1rem;
  height: 1rem;
  flex: 0 0 auto;
}

.jf-lp-brand-icon {
  width: 1.2rem;
  height: 1.2rem;
}

.jf-lp-nav-links {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.2rem;
  border: 1px solid var(--jf-lp-line-soft);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--jf-lp-bg), var(--jf-lp-panel-strong) 46%);
}

.jf-lp-nav-links a {
  border-radius: 0.7rem;
  color: var(--jf-lp-muted);
  font-size: 0.88rem;
  font-weight: 750;
  padding: 0.55rem 0.75rem;
  transition:
    color 180ms var(--jf-lp-ease),
    background-color 180ms var(--jf-lp-ease);
}

.jf-lp-nav-links a:hover {
  background: color-mix(in srgb, var(--jf-lp-blue), transparent 90%);
  color: var(--jf-lp-ink);
}

.jf-lp-nav-cta {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.35rem;
  border-radius: 0.85rem;
  padding: 0.62rem 0.85rem;
  background: var(--jf-lp-ink);
  color: var(--jf-lp-bg);
  font-size: 0.88rem;
  font-weight: 850;
  transition:
    transform 180ms var(--jf-lp-ease),
    box-shadow 180ms var(--jf-lp-ease);
}

.jf-lp-nav-cta:hover {
  box-shadow: 0 14px 30px rgba(37, 99, 235, 0.18);
  transform: translateY(-1px);
}

.jf-lp-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(380px, 1.05fr);
  align-items: center;
  gap: clamp(1.5rem, 4vw, 4rem);
  width: min(1180px, calc(100% - 2rem));
  min-height: min(820px, calc(100svh - 2.25rem));
  margin: 0 auto;
  padding: clamp(2rem, 5vw, 4.5rem) 0 clamp(1.7rem, 4vw, 3rem);
}

.jf-lp-ledger {
  position: absolute;
  inset: 9% 46% auto auto;
  width: min(36rem, 50vw);
  height: min(36rem, 50vw);
  border: 1px solid var(--jf-lp-line-soft);
  border-radius: 1.4rem;
  opacity: 0.45;
  pointer-events: none;
  transform: rotate(-6deg);
}

.jf-lp-ledger::before,
.jf-lp-ledger::after {
  content: "";
  position: absolute;
  inset: 12%;
  border: 1px solid var(--jf-lp-line-soft);
  border-radius: 1rem;
}

.jf-lp-ledger::after {
  inset: 24%;
  border-radius: 0.8rem;
}

.jf-lp-hero-copy,
.jf-lp-hero-stage,
.jf-lp-value-card,
.jf-lp-feature-card,
.jf-lp-step-card,
.jf-lp-trust,
.jf-lp-final {
  animation: jfLpReveal 680ms var(--jf-lp-ease) both;
}

.jf-lp-hero-copy {
  position: relative;
  z-index: 1;
  max-width: 640px;
}

.jf-lp-proof-badge,
.jf-lp-eyebrow {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--jf-lp-line);
  border-radius: 0.85rem;
  background: var(--jf-lp-panel);
  color: var(--jf-lp-muted);
  font-size: 0.8rem;
  font-weight: 850;
  line-height: 1.3;
  padding: 0.48rem 0.65rem;
  white-space: normal;
}

.jf-lp-badge-icon {
  color: var(--jf-lp-mint);
}

.jf-lp-hero h1 {
  max-width: 11ch;
  margin: 1rem 0 0;
  color: var(--jf-lp-ink);
  font-size: clamp(3.2rem, 8vw, 7rem);
  font-weight: 850;
  letter-spacing: 0;
  line-height: 0.88;
  text-wrap: balance;
}

.jf-lp-hero-lead {
  max-width: 620px;
  margin: 1.15rem 0 0;
  color: var(--jf-lp-muted);
  font-size: clamp(1rem, 1.55vw, 1.2rem);
  font-weight: 520;
  line-height: 1.7;
}

.jf-lp-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.55rem;
}

.jf-lp-primary-action,
.jf-lp-secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-height: 3.15rem;
  border-radius: 0.95rem;
  padding: 0.9rem 1rem;
  font-size: 0.98rem;
  font-weight: 900;
  transition:
    transform 180ms var(--jf-lp-ease),
    border-color 180ms var(--jf-lp-ease),
    box-shadow 180ms var(--jf-lp-ease),
    background-color 180ms var(--jf-lp-ease);
}

.jf-lp-primary-action {
  border: 1px solid color-mix(in srgb, var(--jf-lp-blue), transparent 38%);
  background: linear-gradient(135deg, var(--jf-lp-blue), var(--jf-lp-teal));
  color: #ffffff;
  box-shadow: 0 18px 42px color-mix(in srgb, var(--jf-lp-blue), transparent 76%);
}

.jf-lp-secondary-action {
  border: 1px solid var(--jf-lp-line);
  background: var(--jf-lp-panel);
  color: var(--jf-lp-ink);
}

.jf-lp-primary-action:hover,
.jf-lp-secondary-action:hover {
  transform: translateY(-2px);
}

.jf-lp-secondary-action:hover {
  border-color: color-mix(in srgb, var(--jf-lp-blue), var(--jf-lp-line) 48%);
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.1);
}

.jf-lp-trust-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 1rem;
}

.jf-lp-trust-strip span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--jf-lp-muted);
  font-size: 0.88rem;
  font-weight: 760;
}

.jf-lp-check-icon {
  color: var(--jf-lp-mint);
}

.jf-lp-hero-stage {
  animation-delay: 110ms;
}

.jf-lp-preview {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--jf-lp-line);
  border-radius: 1.15rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--jf-lp-panel-strong), transparent 6%), var(--jf-lp-panel)),
    var(--jf-lp-panel-strong);
  box-shadow: var(--jf-lp-shadow);
  padding: clamp(0.8rem, 2vw, 1.05rem);
  transform: translateZ(0);
}

.jf-lp-preview::before {
  content: "";
  position: absolute;
  inset: 0 0 auto 0;
  height: 0.28rem;
  background: linear-gradient(90deg, var(--jf-lp-mint), var(--jf-lp-blue), var(--jf-lp-gold), var(--jf-lp-rose));
}

.jf-lp-preview[data-variant="hero"] {
  max-width: 560px;
  margin-left: auto;
  animation: jfLpFloat 7600ms ease-in-out infinite;
}

.jf-lp-preview[data-variant="hero"] .jf-lp-transaction-panel {
  display: none;
}

.jf-lp-preview[data-variant="wide"] {
  display: grid;
  grid-template-columns: minmax(260px, 0.9fr) minmax(320px, 1.1fr);
  gap: 0.9rem;
}

.jf-lp-preview-top,
.jf-lp-balance-card,
.jf-lp-mini-card,
.jf-lp-chart-panel,
.jf-lp-transaction-panel,
.jf-lp-value-card,
.jf-lp-feature-card,
.jf-lp-step-card,
.jf-lp-trust,
.jf-lp-final {
  border: 1px solid var(--jf-lp-line);
  background: var(--jf-lp-panel);
}

.jf-lp-preview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 0.9rem;
  padding: 0.75rem;
}

.jf-lp-preview-top span,
.jf-lp-balance-card span,
.jf-lp-mini-card span,
.jf-lp-chart-head span {
  display: block;
  color: var(--jf-lp-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.jf-lp-preview-top strong,
.jf-lp-chart-head strong {
  display: block;
  margin-top: 0.08rem;
  color: var(--jf-lp-ink);
  font-size: 0.96rem;
}

.jf-lp-live-pill {
  border-radius: 999px;
  background: color-mix(in srgb, var(--jf-lp-mint), transparent 84%);
  color: var(--jf-lp-mint) !important;
  padding: 0.38rem 0.55rem;
}

.jf-lp-balance-card {
  display: grid;
  gap: 0.9rem;
  margin-top: 0.75rem;
  border-radius: 1rem;
  padding: 1rem;
}

.jf-lp-balance-card strong {
  display: block;
  margin-top: 0.15rem;
  color: var(--jf-lp-ink);
  font-size: clamp(2.2rem, 5vw, 3.6rem);
  letter-spacing: 0;
  line-height: 1;
}

.jf-lp-balance-meter {
  height: 0.65rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--jf-lp-line), transparent 54%);
}

.jf-lp-balance-meter span {
  display: block;
  width: 78%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--jf-lp-mint), var(--jf-lp-blue));
  transform-origin: left center;
  animation: jfLpMeter 1800ms var(--jf-lp-ease) both;
}

.jf-lp-mini-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.jf-lp-mini-card {
  min-width: 0;
  border-radius: 0.95rem;
  padding: 0.8rem;
  transition:
    transform 180ms var(--jf-lp-ease),
    border-color 180ms var(--jf-lp-ease);
}

.jf-lp-mini-card:hover {
  border-color: color-mix(in srgb, currentColor, var(--jf-lp-line) 54%);
  transform: translateY(-2px);
}

.jf-lp-mini-card[data-tone="income"] { color: var(--jf-lp-mint); }
.jf-lp-mini-card[data-tone="expense"] { color: var(--jf-lp-rose); }
.jf-lp-mini-card[data-tone="goal"] { color: var(--jf-lp-gold); }
.jf-lp-mini-card[data-tone="invest"] { color: var(--jf-lp-violet); }

.jf-lp-mini-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: currentColor;
}

.jf-lp-mini-card span {
  margin-top: 0.55rem;
}

.jf-lp-mini-card strong {
  display: block;
  margin-top: 0.12rem;
  color: var(--jf-lp-ink);
  font-size: clamp(1rem, 2vw, 1.2rem);
  letter-spacing: 0;
}

.jf-lp-chart-panel,
.jf-lp-transaction-panel {
  margin-top: 0.75rem;
  border-radius: 1rem;
  padding: 0.85rem;
}

.jf-lp-preview[data-variant="wide"] .jf-lp-chart-panel,
.jf-lp-preview[data-variant="wide"] .jf-lp-transaction-panel {
  margin-top: 0;
}

.jf-lp-preview[data-variant="wide"] .jf-lp-preview-top,
.jf-lp-preview[data-variant="wide"] .jf-lp-balance-card,
.jf-lp-preview[data-variant="wide"] .jf-lp-mini-grid {
  grid-column: 1;
}

.jf-lp-preview[data-variant="wide"] .jf-lp-chart-panel {
  grid-column: 2;
  grid-row: 1 / span 3;
}

.jf-lp-preview[data-variant="wide"] .jf-lp-transaction-panel {
  grid-column: 1 / -1;
}

.jf-lp-chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.jf-lp-chart-icon {
  color: var(--jf-lp-blue);
}

.jf-lp-chart {
  display: flex;
  align-items: end;
  gap: clamp(0.3rem, 1vw, 0.52rem);
  height: 132px;
  margin-top: 0.9rem;
  padding: 0.15rem 0.1rem 0;
}

.jf-lp-preview[data-variant="wide"] .jf-lp-chart {
  height: 255px;
}

.jf-lp-chart span {
  flex: 1;
  min-width: 0;
  height: var(--jf-lp-bar-height);
  border-radius: 0.55rem 0.55rem 0.22rem 0.22rem;
  background: linear-gradient(180deg, color-mix(in srgb, var(--jf-lp-blue), white 24%), var(--jf-lp-blue));
  box-shadow: 0 12px 28px color-mix(in srgb, var(--jf-lp-blue), transparent 78%);
  transform-origin: bottom center;
  animation: jfLpBar 900ms var(--jf-lp-ease) both;
  animation-delay: var(--jf-lp-delay);
}

.jf-lp-transaction-list {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.jf-lp-transaction {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.55rem;
  border: 1px solid var(--jf-lp-line-soft);
  border-radius: 0.8rem;
  padding: 0.55rem 0.65rem;
  color: var(--jf-lp-muted);
  font-size: 0.86rem;
  font-weight: 760;
  opacity: 0;
  transform: translateY(8px);
  animation: jfLpTransaction 640ms var(--jf-lp-ease) both;
  animation-delay: calc(520ms + var(--jf-lp-delay));
}

.jf-lp-transaction strong {
  color: var(--jf-lp-ink);
  font-variant-numeric: tabular-nums;
}

.jf-lp-transaction-dot {
  width: 0.58rem;
  height: 0.58rem;
  border-radius: 999px;
  background: currentColor;
}

.jf-lp-transaction[data-tone="income"] { color: var(--jf-lp-mint); }
.jf-lp-transaction[data-tone="expense"] { color: var(--jf-lp-rose); }
.jf-lp-transaction[data-tone="goal"] { color: var(--jf-lp-gold); }
.jf-lp-transaction[data-tone="investment"] { color: var(--jf-lp-violet); }

.jf-lp-value,
.jf-lp-section,
.jf-lp-flow,
.jf-lp-preview-section,
.jf-lp-trust,
.jf-lp-final {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
}

.jf-lp-value,
.jf-lp-section,
.jf-lp-flow,
.jf-lp-preview-section {
  padding: clamp(3.5rem, 8vw, 6.5rem) 0;
}

.jf-lp-section-head {
  max-width: 760px;
  margin: 0 auto 1.9rem;
  text-align: center;
}

.jf-lp-section-head-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(240px, 0.74fr);
  align-items: end;
  max-width: none;
  gap: 1.5rem;
  text-align: left;
}

.jf-lp-section-head h2,
.jf-lp-preview-copy h2,
.jf-lp-trust h2,
.jf-lp-final h2 {
  margin: 0.85rem 0 0;
  color: var(--jf-lp-ink);
  font-size: clamp(2rem, 4.8vw, 4rem);
  font-weight: 820;
  letter-spacing: 0;
  line-height: 1.02;
  text-wrap: balance;
}

.jf-lp-section-head p,
.jf-lp-preview-copy p,
.jf-lp-trust p,
.jf-lp-final p,
.jf-lp-value-card p,
.jf-lp-feature-card p,
.jf-lp-step-card p {
  margin: 0;
  color: var(--jf-lp-muted);
  line-height: 1.65;
}

.jf-lp-section-head p {
  margin-top: 0.9rem;
  font-size: 1rem;
}

.jf-lp-section-head-row > p {
  margin-top: 0;
}

.jf-lp-value-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.jf-lp-value-card,
.jf-lp-feature-card,
.jf-lp-step-card {
  animation-delay: var(--jf-lp-delay);
}

.jf-lp-value-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-height: 7.6rem;
  border-radius: 1rem;
  padding: 0.95rem;
  transition:
    transform 180ms var(--jf-lp-ease),
    border-color 180ms var(--jf-lp-ease),
    box-shadow 180ms var(--jf-lp-ease);
}

.jf-lp-value-card:hover,
.jf-lp-feature-card:hover,
.jf-lp-step-card:hover {
  border-color: color-mix(in srgb, var(--jf-lp-blue), var(--jf-lp-line) 48%);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.1);
  transform: translateY(-2px);
}

.jf-lp-value-icon,
.jf-lp-feature-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--jf-lp-blue), transparent 72%);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--jf-lp-blue), transparent 91%);
  color: var(--jf-lp-blue);
}

.jf-lp-value-icon {
  width: 2.5rem;
  height: 2.5rem;
}

.jf-lp-value-card h3,
.jf-lp-feature-card h3,
.jf-lp-step-card h3 {
  margin: 0;
  color: var(--jf-lp-ink);
  font-size: 1rem;
  font-weight: 850;
  letter-spacing: 0;
}

.jf-lp-value-card p {
  margin-top: 0.25rem;
  font-size: 0.9rem;
}

.jf-lp-feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.jf-lp-feature-card {
  position: relative;
  min-height: 15rem;
  overflow: hidden;
  border-radius: 1rem;
  padding: 1rem;
}

.jf-lp-feature-card::after {
  content: "";
  position: absolute;
  inset: auto 1rem 1rem 1rem;
  height: 0.26rem;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.22;
  transform: scaleX(0.42);
  transform-origin: left center;
  transition: transform 220ms var(--jf-lp-ease);
}

.jf-lp-feature-card:hover::after {
  transform: scaleX(1);
}

.jf-lp-feature-card[data-tone="mint"] { color: var(--jf-lp-mint); }
.jf-lp-feature-card[data-tone="blue"] { color: var(--jf-lp-blue); }
.jf-lp-feature-card[data-tone="gold"] { color: var(--jf-lp-gold); }
.jf-lp-feature-card[data-tone="rose"] { color: var(--jf-lp-rose); }
.jf-lp-feature-card[data-tone="violet"] { color: var(--jf-lp-violet); }
.jf-lp-feature-card[data-tone="cyan"] { color: var(--jf-lp-cyan); }

.jf-lp-feature-icon {
  width: 3rem;
  height: 3rem;
  border-color: color-mix(in srgb, currentColor, transparent 72%);
  background: color-mix(in srgb, currentColor, transparent 90%);
}

.jf-lp-feature-card h3 {
  margin-top: 1.2rem;
  font-size: 1.15rem;
}

.jf-lp-feature-card p {
  margin-top: 0.6rem;
}

.jf-lp-flow {
  display: grid;
  grid-template-columns: minmax(0, 0.82fr) minmax(320px, 1fr);
  gap: clamp(1.25rem, 4vw, 3rem);
  align-items: start;
}

.jf-lp-flow-copy {
  margin: 0;
  text-align: left;
}

.jf-lp-flow-steps {
  display: grid;
  gap: 0.75rem;
}

.jf-lp-step-card {
  border-radius: 1rem;
  padding: 1rem;
}

.jf-lp-step-number {
  display: inline-flex;
  color: var(--jf-lp-blue);
  font-size: 0.9rem;
  font-weight: 950;
}

.jf-lp-step-card h3 {
  margin-top: 0.65rem;
}

.jf-lp-step-card p {
  margin-top: 0.4rem;
}

.jf-lp-preview-section {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(420px, 1.25fr);
  gap: clamp(1.2rem, 4vw, 3rem);
  align-items: center;
}

.jf-lp-preview-copy p {
  margin-top: 0.9rem;
}

.jf-lp-wide-preview {
  min-width: 0;
}

.jf-lp-trust {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(280px, 1fr);
  gap: clamp(1.25rem, 4vw, 3rem);
  align-items: center;
  border-radius: 1rem;
  padding: clamp(1.2rem, 4vw, 2.2rem);
}

.jf-lp-trust p {
  margin-top: 0.9rem;
}

.jf-lp-trust-list {
  display: grid;
  gap: 0.65rem;
}

.jf-lp-trust-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 3.2rem;
  border: 1px solid var(--jf-lp-line-soft);
  border-radius: 0.85rem;
  background: color-mix(in srgb, var(--jf-lp-panel-strong), transparent 28%);
  color: var(--jf-lp-muted);
  font-weight: 760;
  padding: 0.75rem;
}

.jf-lp-trust-icon {
  color: var(--jf-lp-mint);
}

.jf-lp-final {
  display: grid;
  justify-items: center;
  gap: 0.95rem;
  margin-top: clamp(3.5rem, 8vw, 6.5rem);
  margin-bottom: clamp(2rem, 6vw, 4rem);
  border-radius: 1rem;
  padding: clamp(1.4rem, 6vw, 3.2rem);
  text-align: center;
}

.jf-lp-final h2 {
  max-width: 850px;
  margin-top: 0;
}

.jf-lp-final p {
  max-width: 620px;
}

@keyframes jfLpReveal {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes jfLpFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes jfLpMeter {
  from {
    transform: scaleX(0.18);
  }
  to {
    transform: scaleX(1);
  }
}

@keyframes jfLpBar {
  from {
    opacity: 0.45;
    transform: scaleY(0.24);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

@keyframes jfLpTransaction {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1050px) {
  .jf-lp-nav {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .jf-lp-nav-links {
    display: none;
  }

  .jf-lp-hero,
  .jf-lp-preview-section,
  .jf-lp-flow,
  .jf-lp-trust {
    grid-template-columns: 1fr;
  }

  .jf-lp-hero {
    min-height: auto;
    padding-top: clamp(2rem, 5vw, 3rem);
  }

  .jf-lp-hero-copy {
    max-width: 820px;
    text-align: center;
    margin: 0 auto;
  }

  .jf-lp-hero h1 {
    max-width: none;
  }

  .jf-lp-proof-badge,
  .jf-lp-hero-actions,
  .jf-lp-trust-strip {
    justify-content: center;
    margin-left: auto;
    margin-right: auto;
  }

  .jf-lp-preview[data-variant="hero"] {
    margin: 0 auto;
  }

  .jf-lp-value-grid,
  .jf-lp-feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .jf-lp {
    background-size: 42px 42px;
  }

  .jf-lp-nav {
    top: 0.5rem;
    width: calc(100% - 1rem);
    max-width: 1180px;
    gap: 0.5rem;
  }

  .jf-lp-brand {
    gap: 0.5rem;
    font-size: 0.92rem;
  }

  .jf-lp-brand-mark {
    width: 2.15rem;
    height: 2.15rem;
    border-radius: 0.75rem;
  }

  .jf-lp-nav-cta {
    min-height: 2.25rem;
    padding-inline: 0.65rem;
    font-size: 0.82rem;
  }

  .jf-lp-nav-cta .jf-lp-inline-icon {
    display: none;
  }

  .jf-lp-hero,
  .jf-lp-value,
  .jf-lp-section,
  .jf-lp-flow,
  .jf-lp-preview-section,
  .jf-lp-trust,
  .jf-lp-final {
    width: calc(100% - 1.35rem);
    max-width: 1180px;
  }

  .jf-lp-hero {
    gap: 1.25rem;
    padding-top: 1.55rem;
  }

  .jf-lp-proof-badge {
    max-width: 100%;
    justify-content: center;
    text-align: center;
  }

  .jf-lp-hero h1 {
    font-size: clamp(2.35rem, 14.5vw, 3.65rem);
    line-height: 0.94;
  }

  .jf-lp-hero-lead {
    font-size: 0.98rem;
    line-height: 1.58;
    overflow-wrap: anywhere;
  }

  .jf-lp-hero-actions {
    display: grid;
    grid-template-columns: 1fr;
    margin-top: 1.15rem;
  }

  .jf-lp-primary-action,
  .jf-lp-secondary-action {
    width: 100%;
    min-height: 3.1rem;
  }

  .jf-lp-trust-strip {
    justify-content: flex-start;
    text-align: left;
  }

  .jf-lp-trust-strip span {
    width: 100%;
  }

  .jf-lp-ledger {
    display: none;
  }

  .jf-lp-preview[data-variant="hero"] {
    animation: none;
  }

  .jf-lp-mini-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .jf-lp-chart {
    height: 112px;
  }

  .jf-lp-section-head,
  .jf-lp-section-head-row,
  .jf-lp-flow-copy,
  .jf-lp-preview-copy {
    display: block;
    text-align: left;
  }

  .jf-lp-section-head-row > p {
    margin-top: 0.9rem;
  }

  .jf-lp-section-head h2,
  .jf-lp-preview-copy h2,
  .jf-lp-trust h2,
  .jf-lp-final h2 {
    font-size: clamp(2rem, 11vw, 3rem);
    line-height: 1.04;
  }

  .jf-lp-value-grid,
  .jf-lp-feature-grid {
    grid-template-columns: 1fr;
  }

  .jf-lp-value-card {
    min-height: auto;
  }

  .jf-lp-feature-card {
    min-height: 12.5rem;
  }

  .jf-lp-preview[data-variant="wide"] {
    display: block;
  }

  .jf-lp-preview[data-variant="wide"] .jf-lp-chart-panel,
  .jf-lp-preview[data-variant="wide"] .jf-lp-transaction-panel {
    margin-top: 0.75rem;
  }

  .jf-lp-preview[data-variant="wide"] .jf-lp-chart {
    height: 140px;
  }

  .jf-lp-trust-item {
    align-items: flex-start;
  }
}

@media (max-width: 380px) {
  .jf-lp-brand span:last-child {
    max-width: 7.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .jf-lp-nav-cta {
    padding-inline: 0.55rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .jf-lp *,
  .jf-lp *::before,
  .jf-lp *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.001ms !important;
  }
}
        `,
      }}
    />
  );
}
