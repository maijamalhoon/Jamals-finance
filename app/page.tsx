import type { ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BellRing,
  CircleCheck,
  CreditCard,
  Earth,
  Goal,
  Landmark,
  Layers3,
  LockKeyhole,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Smartphone,
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
  accent: "mint" | "blue" | "gold" | "rose";
};

const features: Feature[] = [
  {
    title: "All money in one place",
    description:
      "Track bank, cash, wallets, savings, business money, and transfers from one clean workspace.",
    icon: WalletCards,
    accent: "mint",
  },
  {
    title: "Fast daily entries",
    description:
      "Add income, expenses, liabilities, payables, and payments quickly without spreadsheet clutter.",
    icon: ReceiptText,
    accent: "blue",
  },
  {
    title: "Clear visual reports",
    description:
      "Readable cards, charts, categories, and summaries help users understand where money is moving.",
    icon: PieChart,
    accent: "gold",
  },
  {
    title: "Private finance workspace",
    description:
      "Dashboard routes stay protected with login, RLS-backed data access, and user-specific records.",
    icon: ShieldCheck,
    accent: "rose",
  },
];

const modules = [
  { label: "Accounts", icon: Landmark },
  { label: "Income", icon: TrendingUp },
  { label: "Expenses", icon: CreditCard },
  { label: "Transactions", icon: ReceiptText },
  { label: "Goals", icon: Goal },
  { label: "Investments", icon: BarChart3 },
  { label: "Payables", icon: BellRing },
  { label: "Reports", icon: Layers3 },
];

const workflow = [
  {
    title: "Start secure",
    description:
      "Create your workspace and keep private finance data behind protected dashboard routes.",
  },
  {
    title: "Record activity",
    description:
      "Add accounts, income, expenses, transfers, goals, investments, and payables in one flow.",
  },
  {
    title: "Review progress",
    description:
      "Use clean summaries and charts to make better daily money decisions.",
  },
];

const previewBars = [42, 62, 48, 76, 58, 88, 70, 94] as const;

export default function HomePage() {
  return (
    <main className="jf-landing">
      <section className="jf-hero-shell" id="top">
        <div className="jf-orb jf-orb-one" />
        <div className="jf-orb jf-orb-two" />
        <div className="jf-grid-overlay" />

        <nav className="jf-nav" aria-label="Main navigation">
          <Link
            href="#top"
            className="jf-brand"
            aria-label="Jamal's Finance home"
          >
            <span className="jf-brand-mark">
              <Sparkles className="jf-brand-icon" />
            </span>
            <span>Jamals Finance</span>
          </Link>

          <div className="jf-nav-links">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#security">Security</a>
          </div>

          <Link href="/login" className="jf-nav-cta">
            Login / Sign up
          </Link>
        </nav>

        <div className="jf-hero">
          <div className="jf-hero-copy">
            <div className="jf-badge">
              <BadgeCheck className="jf-badge-icon" />
              Premium finance dashboard
            </div>

            <h1>Manage your money with clarity, speed, and confidence.</h1>

            <p className="jf-hero-text">
              Jamal&apos;s Finance brings accounts, expenses, income, goals,
              liabilities, investments, and savings into one smooth workspace
              made for daily use.
            </p>

            <div className="jf-hero-actions">
              <Link href="/login" className="jf-primary-btn">
                Start your workspace
                <ArrowRight className="jf-btn-icon" />
              </Link>
              <a href="#features" className="jf-secondary-btn">
                Explore features
              </a>
            </div>

            <div className="jf-trust-row" aria-label="Product highlights">
              {[
                "No spreadsheet mess",
                "Mobile-first UI",
                "Secure private login",
              ].map((item) => (
                <span key={item}>
                  <CircleCheck className="jf-trust-icon" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="jf-hero-visual" aria-label="Dashboard preview">
            <div className="jf-device-card">
              <div className="jf-device-topbar">
                <span />
                <span />
                <span />
                <p>Live workspace</p>
              </div>

              <div className="jf-balance-panel">
                <div>
                  <p>Net balance</p>
                  <strong>$24,850</strong>
                </div>
                <span className="jf-live-pill">Live</span>
              </div>

              <div className="jf-metric-grid">
                <div className="jf-mini-card">
                  <span className="jf-icon-dot jf-mint">
                    <TrendingUp className="jf-mini-icon" />
                  </span>
                  <p>Growth</p>
                  <strong>+18.4%</strong>
                </div>
                <div className="jf-mini-card">
                  <span className="jf-icon-dot jf-blue">
                    <Zap className="jf-mini-icon" />
                  </span>
                  <p>Saved time</p>
                  <strong>4.8h</strong>
                </div>
              </div>

              <div className="jf-chart-card">
                <div className="jf-chart-head">
                  <div>
                    <strong>Cash flow</strong>
                    <p>Monthly rhythm</p>
                  </div>
                  <LockKeyhole className="jf-chart-lock" />
                </div>
                <div className="jf-bars" aria-hidden="true">
                  {previewBars.map((height, index) => (
                    <span
                      key={`${height}-${index}`}
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="jf-floating-card jf-floating-left">
              <Smartphone className="jf-floating-icon" />
              <div>
                <strong>Mobile ready</strong>
                <p>Fast thumb-friendly screens</p>
              </div>
            </div>

            <div className="jf-floating-card jf-floating-right">
              <Earth className="jf-floating-icon" />
              <div>
                <strong>Global polish</strong>
                <p>Clean, scalable product base</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="jf-section jf-stats-section"
        aria-label="Product stats"
      >
        {[
          ["8+", "Finance modules"],
          ["24/7", "Secure access"],
          ["100%", "Private workspace focus"],
          ["Fast", "Mobile experience"],
        ].map(([value, label]) => (
          <div className="jf-stat-card" key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="jf-section" id="features">
        <div className="jf-section-heading">
          <span className="jf-eyebrow">Built for daily money control</span>
          <h2>Everything important, without the clutter.</h2>
          <p>
            A finance experience that feels simple for beginners and still
            powerful enough for serious users.
          </p>
        </div>

        <div className="jf-feature-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                className={`jf-feature-card jf-accent-${feature.accent}`}
                key={feature.title}
              >
                <span className="jf-feature-icon-wrap">
                  <Icon className="jf-feature-icon" />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="jf-section jf-workflow-section" id="workflow">
        <div className="jf-section-heading jf-left-heading">
          <span className="jf-eyebrow">How it works</span>
          <h2>A smoother routine for daily money decisions.</h2>
          <p>
            The goal is not just to store numbers. The goal is to help users
            understand their financial life quickly on mobile and desktop.
          </p>
        </div>

        <div className="jf-workflow-grid">
          {workflow.map((step, index) => (
            <article className="jf-step-card" key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jf-section jf-modules-section">
        <div className="jf-section-heading">
          <span className="jf-eyebrow">Finance modules</span>
          <h2>One connected workspace for every money area.</h2>
          <p>
            Every module should feel connected, fast, and easy to understand,
            especially on mobile screens.
          </p>
        </div>

        <div className="jf-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <div className="jf-module-pill" key={module.label}>
                <Icon className="jf-module-icon" />
                {module.label}
              </div>
            );
          })}
        </div>
      </section>

      <section className="jf-section jf-security-section" id="security">
        <div className="jf-security-card">
          <div>
            <span className="jf-eyebrow">Security and trust</span>
            <h2>Premium look, protected workspace.</h2>
            <p>
              The public landing page explains the product clearly, while
              private finance data stays behind secure authentication and
              user-specific access.
            </p>
          </div>

          <div className="jf-security-list">
            {[
              "Dashboard stays protected for signed-in users only",
              "Landing page remains public for visitors and search engines",
              "Login and signup flow stays clean and focused",
              "Design system is ready for full UI polish",
            ].map((item) => (
              <div key={item}>
                <ShieldCheck className="jf-security-icon" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="jf-final-cta">
        <div className="jf-final-glow" />
        <span className="jf-eyebrow">Ready for the next phase</span>
        <h2>Start building better money habits today.</h2>
        <p>
          Create your workspace, connect your finance routine, and turn daily
          money tracking into a clean premium experience.
        </p>
        <Link href="/login" className="jf-primary-btn">
          Open Jamal&apos;s Finance
          <ArrowRight className="jf-btn-icon" />
        </Link>
      </section>

      <LandingPageStyles />
    </main>
  );
}

function LandingPageStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.jf-landing {
  --jf-bg: #050b14;
  --jf-bg-start: #06101c;
  --jf-bg-mid: #050b14;
  --jf-bg-end: #03070d;
  --jf-panel: rgba(255, 255, 255, 0.075);
  --jf-panel-strong: rgba(255, 255, 255, 0.11);
  --jf-border: rgba(255, 255, 255, 0.14);
  --jf-text: #f5f8ff;
  --jf-muted: rgba(235, 242, 255, 0.72);
  --jf-soft: rgba(235, 242, 255, 0.52);
  --jf-green: #37f1a5;
  --jf-blue: #7cc7ff;
  --jf-gold: #ffd35a;
  --jf-rose: #ff8db3;
}

:root:not(.dark) .jf-landing {
  --jf-bg: #f8fafc;
  --jf-bg-start: #f3f8ff;
  --jf-bg-mid: #f8fafc;
  --jf-bg-end: #eef4fb;
  --jf-panel: rgba(255, 255, 255, 0.78);
  --jf-panel-strong: rgba(255, 255, 255, 0.92);
  --jf-border: rgba(15, 23, 42, 0.12);
  --jf-text: #101828;
  --jf-muted: rgba(71, 84, 103, 0.82);
  --jf-soft: rgba(102, 112, 133, 0.7);
  --jf-green: #168a53;
  --jf-blue: #2563eb;
  --jf-gold: #b76a00;
  --jf-rose: #dc2626;
}

html {
  scroll-behavior: smooth;
}

.jf-landing {
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 10%, rgba(55, 241, 165, 0.16), transparent 28rem),
    radial-gradient(circle at 82% 20%, rgba(124, 199, 255, 0.16), transparent 30rem),
    linear-gradient(180deg, var(--jf-bg-start) 0%, var(--jf-bg-mid) 42%, var(--jf-bg-end) 100%);
  color: var(--jf-text);
  font-family: inherit;
}

:root:not(.dark) .jf-landing {
  background:
    radial-gradient(circle at 15% 10%, rgba(22, 138, 83, 0.1), transparent 28rem),
    radial-gradient(circle at 82% 20%, rgba(37, 99, 235, 0.1), transparent 30rem),
    linear-gradient(180deg, var(--jf-bg-start) 0%, var(--jf-bg-mid) 42%, var(--jf-bg-end) 100%);
}

.jf-hero-shell {
  position: relative;
  min-height: 100vh;
  padding: 1.25rem clamp(1rem, 3vw, 2rem) 5rem;
  isolation: isolate;
}

.jf-grid-overlay {
  position: absolute;
  inset: 0;
  z-index: -3;
  background-image:
    linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 88%);
}

:root:not(.dark) .jf-grid-overlay {
  background-image:
    linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px);
}

.jf-orb {
  position: absolute;
  z-index: -2;
  border-radius: 999px;
  filter: blur(36px);
  opacity: 0.9;
}

.jf-orb-one {
  left: -8rem;
  top: 12rem;
  width: 22rem;
  height: 22rem;
  background: rgba(55, 241, 165, 0.22);
}

.jf-orb-two {
  right: -9rem;
  top: 8rem;
  width: 28rem;
  height: 28rem;
  background: rgba(124, 199, 255, 0.18);
}

.jf-nav {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 999px;
  background: rgba(5, 11, 20, 0.72);
  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(18px);
}

:root:not(.dark) .jf-nav {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 20px 70px rgba(15, 23, 42, 0.1);
}

.jf-brand,
.jf-nav-links a,
.jf-nav-cta,
.jf-primary-btn,
.jf-secondary-btn {
  text-decoration: none;
}

.jf-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--jf-text);
  font-weight: 800;
  letter-spacing: -0.02em;
}

.jf-brand-mark {
  display: grid;
  width: 2.35rem;
  height: 2.35rem;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(55,241,165,0.2), rgba(124,199,255,0.18));
  border: 1px solid rgba(255,255,255,0.14);
}

.jf-brand-icon {
  width: 1.1rem;
  height: 1.1rem;
  color: var(--jf-gold);
}

.jf-nav-links {
  display: flex;
  gap: 0.35rem;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
}

:root:not(.dark) .jf-nav-links {
  background: rgba(15, 23, 42, 0.055);
}

.jf-nav-links a {
  color: var(--jf-muted);
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.65rem 0.9rem;
  border-radius: 999px;
  transition: 180ms ease;
}

.jf-nav-links a:hover {
  color: var(--jf-text);
  background: rgba(255,255,255,0.08);
}

:root:not(.dark) .jf-nav-links a:hover {
  background: rgba(15, 23, 42, 0.07);
}

.jf-nav-cta {
  color: #06101c;
  font-size: 0.9rem;
  font-weight: 900;
  padding: 0.72rem 1rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--jf-green), var(--jf-gold));
  box-shadow: 0 16px 40px rgba(55, 241, 165, 0.2);
}

.jf-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 0.92fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4.5rem);
  width: min(1180px, 100%);
  min-height: calc(100vh - 6.5rem);
  margin: 0 auto;
  padding-top: clamp(2.5rem, 5vh, 5rem);
}

.jf-hero-copy {
  max-width: 650px;
}

.jf-badge,
.jf-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  width: fit-content;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.075);
  color: rgba(245,248,255,0.86);
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.01em;
}

:root:not(.dark) .jf-badge,
:root:not(.dark) .jf-eyebrow {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.72);
  color: var(--jf-muted);
}

.jf-badge {
  padding: 0.55rem 0.75rem;
  margin-bottom: 1.4rem;
}

.jf-badge-icon {
  width: 1rem;
  height: 1rem;
  color: var(--jf-green);
}

.jf-hero h1 {
  margin: 0;
  color: var(--jf-text);
  font-size: clamp(3rem, 7vw, 6.7rem);
  line-height: 0.94;
  letter-spacing: -0.075em;
  text-wrap: balance;
}

.jf-hero-text {
  max-width: 610px;
  margin: 1.5rem 0 0;
  color: var(--jf-muted);
  font-size: clamp(1.04rem, 1.8vw, 1.28rem);
  line-height: 1.75;
}

.jf-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 2rem;
}

.jf-primary-btn,
.jf-secondary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 3.35rem;
  border-radius: 999px;
  padding: 0.95rem 1.25rem;
  font-weight: 950;
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.jf-primary-btn {
  color: #04100b;
  background: linear-gradient(135deg, var(--jf-green), var(--jf-gold));
  box-shadow: 0 18px 48px rgba(55, 241, 165, 0.24);
}

.jf-secondary-btn {
  color: var(--jf-text);
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.075);
}

:root:not(.dark) .jf-secondary-btn {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.76);
}

.jf-primary-btn:hover,
.jf-secondary-btn:hover,
.jf-nav-cta:hover {
  transform: translateY(-2px);
}

.jf-btn-icon {
  width: 1.05rem;
  height: 1.05rem;
}

.jf-trust-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-top: 1.35rem;
}

.jf-trust-row span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: rgba(245,248,255,0.76);
  font-size: 0.92rem;
  font-weight: 800;
}

.jf-trust-icon {
  width: 1rem;
  height: 1rem;
  color: var(--jf-green);
}

.jf-hero-visual {
  position: relative;
  min-height: 640px;
}

.jf-device-card {
  position: absolute;
  inset: 4rem 0 auto auto;
  width: min(100%, 520px);
  min-height: 560px;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 2.1rem;
  padding: 1.05rem;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.06)),
    rgba(6, 14, 26, 0.82);
  box-shadow: 0 40px 120px rgba(0,0,0,0.42);
  backdrop-filter: blur(22px);
  animation: jfFloat 7s ease-in-out infinite;
}

:root:not(.dark) .jf-device-card {
  border-color: var(--jf-border);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.72)),
    rgba(255, 255, 255, 0.84);
  box-shadow: 0 34px 100px rgba(15, 23, 42, 0.14);
}

.jf-device-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(55,241,165,0.7), transparent 36%, rgba(255,211,90,0.62));
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.jf-device-topbar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.65rem 1rem;
  color: var(--jf-soft);
  font-size: 0.78rem;
  font-weight: 800;
}

.jf-device-topbar span {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
}

.jf-device-topbar p {
  margin: 0 0 0 auto;
}

.jf-balance-panel,
.jf-mini-card,
.jf-chart-card,
.jf-floating-card,
.jf-feature-card,
.jf-step-card,
.jf-stat-card,
.jf-security-card {
  border: 1px solid var(--jf-border);
  background: var(--jf-panel);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}

:root:not(.dark) .jf-balance-panel,
:root:not(.dark) .jf-mini-card,
:root:not(.dark) .jf-chart-card,
:root:not(.dark) .jf-floating-card,
:root:not(.dark) .jf-feature-card,
:root:not(.dark) .jf-step-card,
:root:not(.dark) .jf-stat-card,
:root:not(.dark) .jf-security-card {
  border-color: var(--jf-border);
  background: var(--jf-panel);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.78),
    0 18px 48px rgba(15, 23, 42, 0.06);
}

.jf-balance-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 145px;
  padding: 1.15rem;
  border-radius: 1.5rem;
}

.jf-balance-panel p,
.jf-mini-card p,
.jf-chart-head p,
.jf-floating-card p,
.jf-feature-card p,
.jf-step-card p,
.jf-section-heading p,
.jf-security-card p,
.jf-final-cta p {
  margin: 0;
  color: var(--jf-muted);
  line-height: 1.65;
}

.jf-balance-panel strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 3rem;
  letter-spacing: -0.06em;
}

.jf-live-pill {
  color: #052016;
  background: var(--jf-green);
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 950;
}

.jf-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 0.85rem;
}

.jf-mini-card {
  min-height: 150px;
  border-radius: 1.35rem;
  padding: 1rem;
}

.jf-icon-dot {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.16);
}

.jf-mint { background: rgba(55,241,165,0.14); color: var(--jf-green); }
.jf-blue { background: rgba(124,199,255,0.14); color: var(--jf-blue); }

.jf-mini-icon {
  width: 1.15rem;
  height: 1.15rem;
}

.jf-mini-card p {
  margin-top: 1.05rem;
  font-size: 0.85rem;
  font-weight: 800;
}

.jf-mini-card strong {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.85rem;
  letter-spacing: -0.055em;
}

.jf-chart-card {
  margin-top: 0.85rem;
  border-radius: 1.5rem;
  padding: 1rem;
}

.jf-chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.jf-chart-head strong {
  font-size: 1rem;
}

.jf-chart-lock {
  width: 1.15rem;
  height: 1.15rem;
  color: var(--jf-green);
}

.jf-bars {
  display: flex;
  align-items: end;
  gap: 0.55rem;
  height: 150px;
  padding-top: 1.1rem;
}

.jf-bars span {
  flex: 1;
  min-width: 0;
  border-radius: 999px 999px 0.55rem 0.55rem;
  background: linear-gradient(180deg, #eef7ff, #7dbdff);
  box-shadow: 0 10px 30px rgba(124,199,255,0.22);
}

.jf-floating-card {
  position: absolute;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  width: max-content;
  max-width: 280px;
  padding: 0.85rem 1rem;
  border-radius: 1.2rem;
  background: rgba(8, 18, 32, 0.78);
  backdrop-filter: blur(18px);
}

:root:not(.dark) .jf-floating-card {
  background: rgba(255, 255, 255, 0.84);
}

.jf-floating-left {
  left: -1rem;
  bottom: 5rem;
}

.jf-floating-right {
  right: -1rem;
  top: 1rem;
}

.jf-floating-icon {
  width: 1.35rem;
  height: 1.35rem;
  color: var(--jf-gold);
}

.jf-floating-card strong {
  display: block;
  font-size: 0.92rem;
}

.jf-floating-card p {
  font-size: 0.8rem;
}

.jf-section {
  width: min(1180px, calc(100% - 2rem));
  margin: 0 auto;
  padding: clamp(4rem, 8vw, 7rem) 0;
}

.jf-stats-section {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
  padding-top: 0;
}

.jf-stat-card {
  border-radius: 1.35rem;
  padding: 1.35rem;
  background: rgba(255,255,255,0.06);
}

.jf-stat-card strong {
  display: block;
  font-size: clamp(2rem, 4vw, 3.3rem);
  letter-spacing: -0.06em;
}

.jf-stat-card span {
  color: var(--jf-muted);
  font-size: 0.92rem;
  font-weight: 800;
}

.jf-section-heading {
  max-width: 720px;
  margin: 0 auto 2.3rem;
  text-align: center;
}

.jf-left-heading {
  margin-left: 0;
  text-align: left;
}

.jf-eyebrow {
  padding: 0.45rem 0.68rem;
  margin-bottom: 0.95rem;
  color: var(--jf-green);
}

.jf-section-heading h2,
.jf-security-card h2,
.jf-final-cta h2 {
  margin: 0;
  color: var(--jf-text);
  font-size: clamp(2.2rem, 5vw, 4.5rem);
  line-height: 1;
  letter-spacing: -0.065em;
  text-wrap: balance;
}

.jf-section-heading p {
  margin-top: 1rem;
  font-size: 1.05rem;
}

.jf-feature-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.jf-feature-card {
  position: relative;
  min-height: 310px;
  overflow: hidden;
  border-radius: 1.6rem;
  padding: 1.25rem;
  background: rgba(255,255,255,0.065);
}

.jf-feature-card::after {
  content: "";
  position: absolute;
  inset: auto -30% -35% -30%;
  height: 55%;
  opacity: 0.18;
  background: radial-gradient(circle, currentColor, transparent 62%);
}

.jf-accent-mint { color: var(--jf-green); }
.jf-accent-blue { color: var(--jf-blue); }
.jf-accent-gold { color: var(--jf-gold); }
.jf-accent-rose { color: var(--jf-rose); }

.jf-feature-icon-wrap {
  display: grid;
  width: 3.1rem;
  height: 3.1rem;
  place-items: center;
  border-radius: 1rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
}

:root:not(.dark) .jf-feature-icon-wrap {
  border-color: var(--jf-border);
  background: rgba(15, 23, 42, 0.045);
}

.jf-feature-icon {
  width: 1.45rem;
  height: 1.45rem;
}

.jf-feature-card h3,
.jf-step-card h3 {
  margin: 1.3rem 0 0.65rem;
  color: var(--jf-text);
  font-size: 1.2rem;
  letter-spacing: -0.035em;
}

.jf-feature-card p,
.jf-step-card p {
  color: rgba(235,242,255,0.68);
}

.jf-workflow-section {
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: start;
}

.jf-workflow-grid {
  display: grid;
  gap: 0.9rem;
}

.jf-step-card {
  border-radius: 1.45rem;
  padding: 1.15rem;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.055));
}

.jf-step-card span {
  display: inline-flex;
  color: var(--jf-green);
  font-weight: 950;
  letter-spacing: -0.04em;
}

.jf-module-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.jf-module-pill {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-height: 4.4rem;
  border: 1px solid rgba(255,255,255,0.13);
  border-radius: 1.25rem;
  padding: 0.95rem 1rem;
  background: rgba(255,255,255,0.06);
  color: var(--jf-text);
  font-weight: 900;
}

:root:not(.dark) .jf-module-pill {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.72);
}

.jf-module-icon {
  width: 1.2rem;
  height: 1.2rem;
  color: var(--jf-blue);
}

.jf-security-card {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: clamp(1.5rem, 4vw, 3rem);
  align-items: center;
  border-radius: 2rem;
  padding: clamp(1.4rem, 4vw, 3rem);
  background:
    radial-gradient(circle at top left, rgba(55,241,165,0.12), transparent 28rem),
    rgba(255,255,255,0.065);
}

.jf-security-card p {
  margin-top: 1rem;
}

.jf-security-list {
  display: grid;
  gap: 0.85rem;
}

.jf-security-list div {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 1.1rem;
  padding: 0.9rem;
  background: rgba(255,255,255,0.055);
  color: rgba(245,248,255,0.84);
  font-weight: 800;
}

:root:not(.dark) .jf-security-list div {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.7);
  color: var(--jf-text);
}

.jf-security-icon {
  flex: 0 0 auto;
  width: 1.15rem;
  height: 1.15rem;
  color: var(--jf-green);
}

.jf-final-cta {
  position: relative;
  width: min(980px, calc(100% - 2rem));
  margin: 0 auto 5rem;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 2rem;
  padding: clamp(2rem, 6vw, 4rem);
  text-align: center;
  background: rgba(255,255,255,0.075);
  box-shadow: 0 30px 100px rgba(0,0,0,0.28);
}

:root:not(.dark) .jf-final-cta {
  border-color: var(--jf-border);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.12);
}

.jf-final-glow {
  position: absolute;
  inset: -70% 15% auto;
  height: 16rem;
  border-radius: 999px;
  background: rgba(55,241,165,0.18);
  filter: blur(38px);
}

.jf-final-cta .jf-eyebrow,
.jf-final-cta .jf-primary-btn {
  position: relative;
}

.jf-final-cta h2,
.jf-final-cta p {
  position: relative;
}

.jf-final-cta p {
  max-width: 620px;
  margin: 1rem auto 1.5rem;
}

@keyframes jfFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@media (max-width: 1050px) {
  .jf-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .jf-hero-copy {
    max-width: 850px;
    text-align: center;
    margin: 0 auto;
  }

  .jf-badge,
  .jf-hero-actions,
  .jf-trust-row {
    justify-content: center;
    margin-left: auto;
    margin-right: auto;
  }

  .jf-hero-visual {
    min-height: 590px;
  }

  .jf-device-card {
    inset: 1rem 50% auto auto;
    transform: translateX(50%);
    animation: none;
  }

  .jf-floating-left {
    left: calc(50% - 290px);
  }

  .jf-floating-right {
    right: calc(50% - 290px);
  }

  .jf-feature-grid,
  .jf-module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .jf-workflow-section,
  .jf-security-card {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .jf-hero-shell {
    min-height: auto;
    padding-bottom: 3rem;
  }

  .jf-nav {
    border-radius: 1.3rem;
  }

  .jf-nav-links {
    display: none;
  }

  .jf-nav-cta {
    padding-inline: 0.8rem;
    font-size: 0.8rem;
  }

  .jf-hero {
    padding-top: 2.25rem;
    gap: 1.7rem;
  }

  .jf-hero h1 {
    font-size: clamp(2.65rem, 15vw, 4.5rem);
  }

  .jf-hero-actions {
    flex-direction: column;
  }

  .jf-primary-btn,
  .jf-secondary-btn {
    width: 100%;
  }

  .jf-trust-row {
    align-items: center;
    flex-direction: column;
  }

  .jf-hero-visual {
    min-height: auto;
  }

  .jf-device-card {
    position: relative;
    inset: auto;
    width: 100%;
    min-height: auto;
    transform: none;
  }

  .jf-floating-card {
    display: none;
  }

  .jf-balance-panel strong {
    font-size: 2.3rem;
  }

  .jf-bars {
    height: 115px;
  }

  .jf-stats-section,
  .jf-feature-grid,
  .jf-module-grid {
    grid-template-columns: 1fr;
  }

  .jf-section {
    width: min(100% - 1rem, 1180px);
    padding-block: 3.6rem;
  }

  .jf-section-heading,
  .jf-left-heading {
    text-align: left;
  }

  .jf-section-heading {
    margin-left: 0;
  }

  .jf-feature-card {
    min-height: 245px;
  }

  .jf-security-list div {
    align-items: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
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
