import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  CircleDollarSign,
  CreditCard,
  Goal,
  Landmark,
  LineChart,
  LockKeyhole,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  title: string;
  copy: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "red" | "violet" | "amber" | "cyan";
};

const navigation = [
  { label: "Features", href: "#capabilities" },
  { label: "How it works", href: "#workflow" },
  { label: "Insights", href: "#preview" },
  { label: "Privacy", href: "#privacy" },
] as const;

const features: Feature[] = [
  {
    title: "Income and expenses",
    copy: "Record daily money movement quickly, with the account, category, date, and note that give it meaning.",
    icon: ArrowLeftRight,
    tone: "green",
  },
  {
    title: "Accounts and transfers",
    copy: "Keep cash, savings, wallets, and transfers connected in one clear view of your total position.",
    icon: WalletCards,
    tone: "blue",
  },
  {
    title: "Goals and payables",
    copy: "See progress, remaining amounts, due dates, and obligations before they become surprises.",
    icon: Target,
    tone: "amber",
  },
  {
    title: "Investment tracking",
    copy: "Review investments beside the rest of your finances instead of managing a disconnected picture.",
    icon: LineChart,
    tone: "violet",
  },
  {
    title: "Reports and cash flow",
    copy: "Turn recorded activity into readable category, balance, and cash-flow patterns for faster review.",
    icon: PieChart,
    tone: "cyan",
  },
  {
    title: "AI-assisted insights",
    copy: "Use the dedicated insights area for useful observations and prompts when the AI service is available.",
    icon: BrainCircuit,
    tone: "red",
  },
];

const activity = [
  { label: "Salary received", detail: "Main account", value: "+ USD 42,000", tone: "positive" },
  { label: "Household expense", detail: "Essentials", value: "- USD 8,600", tone: "negative" },
  { label: "Goal contribution", detail: "Emergency fund", value: "+ USD 12,000", tone: "positive" },
] as const;

const chartBars = [44, 58, 52, 69, 61, 78, 72] as const;

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="finance-focus jf-brand" aria-label="Jamal's Finance home">
      <span className="jf-brand-mark" aria-hidden="true">
        <CircleDollarSign />
      </span>
      <span className={compact ? "sr-only sm:not-sr-only" : ""}>Jamal&apos;s Finance</span>
    </Link>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="finance-focus jf-button jf-button-primary">
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="finance-focus jf-button jf-button-secondary">
      <span>{children}</span>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`jf-section-heading ${align === "center" ? "jf-section-heading-center" : ""}`}>
      <p className="jf-eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="jf-section-copy">{copy}</p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <figure className="jf-dashboard-preview" aria-labelledby="dashboard-preview-caption">
      <div className="jf-preview-topbar">
        <div>
          <p>Dashboard</p>
          <strong>Monthly clarity</strong>
        </div>
        <span className="jf-live-pill"><span />Live preview</span>
      </div>

      <div className="jf-preview-balance">
        <div>
          <p>Total balance</p>
          <strong>USD 248,500</strong>
          <span><TrendingUp aria-hidden="true" /> 8.4% this month</span>
        </div>
        <div className="jf-balance-orbit" aria-hidden="true">
          <CircleDollarSign />
        </div>
      </div>

      <div className="jf-preview-metrics">
        <div data-tone="green">
          <span><TrendingUp aria-hidden="true" /></span>
          <p>Income</p>
          <strong>USD 64,000</strong>
        </div>
        <div data-tone="red">
          <span><TrendingDown aria-hidden="true" /></span>
          <p>Expenses</p>
          <strong>USD 21,300</strong>
        </div>
        <div data-tone="cyan">
          <span><Goal aria-hidden="true" /></span>
          <p>Goals</p>
          <strong>72%</strong>
        </div>
      </div>

      <div className="jf-preview-grid">
        <div className="jf-chart-panel">
          <div className="jf-panel-heading">
            <div>
              <p>Cash flow</p>
              <strong>Income stays ahead</strong>
            </div>
            <BarChart3 aria-hidden="true" />
          </div>

          <div className="jf-chart" role="img" aria-label="Illustrative seven-period cash-flow chart">
            <span className="jf-chart-gridline" data-line="1" />
            <span className="jf-chart-gridline" data-line="2" />
            <span className="jf-chart-gridline" data-line="3" />
            <svg viewBox="0 0 640 220" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="jf-chart-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="jf-chart-area" d="M0 176 C55 166 80 124 132 132 C188 140 214 82 270 96 C330 111 350 54 414 70 C474 85 506 36 562 50 C598 59 618 38 640 28 L640 220 L0 220 Z" />
              <path className="jf-chart-line" d="M0 176 C55 166 80 124 132 132 C188 140 214 82 270 96 C330 111 350 54 414 70 C474 85 506 36 562 50 C598 59 618 38 640 28" />
            </svg>
            <div className="jf-chart-labels" aria-hidden="true">
              <span>W1</span><span>W2</span><span>W3</span><span>W4</span><span>W5</span><span>W6</span><span>W7</span>
            </div>
          </div>
        </div>

        <div className="jf-activity-panel">
          <div className="jf-panel-heading">
            <div>
              <p>Recent activity</p>
              <strong>Latest movement</strong>
            </div>
            <ReceiptText aria-hidden="true" />
          </div>

          <div className="jf-activity-list">
            {activity.map((item) => (
              <div key={item.label}>
                <span className={`jf-activity-dot jf-activity-dot-${item.tone}`} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <b className={item.tone === "positive" ? "jf-positive" : "jf-negative"}>{item.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption id="dashboard-preview-caption" className="sr-only">
        An illustrative dashboard preview using demonstration values, not a live user account.
      </figcaption>
    </figure>
  );
}

function InsightVisual() {
  return (
    <div className="jf-insight-visual jf-reveal" role="img" aria-label="Illustrative monthly spending and savings visual">
      <div className="jf-insight-header">
        <div>
          <p>Monthly pattern</p>
          <strong>Where your money moved</strong>
        </div>
        <span>Illustrative</span>
      </div>

      <div className="jf-insight-content">
        <div className="jf-donut" aria-hidden="true">
          <span><strong>34%</strong><small>saved</small></span>
        </div>

        <div className="jf-insight-bars">
          {[
            ["Needs", 76, "blue"],
            ["Goals", 62, "green"],
            ["Lifestyle", 44, "violet"],
          ].map(([label, value, tone]) => (
            <div key={label as string}>
              <span><strong>{label as string}</strong><small>{value}%</small></span>
              <i><b data-tone={tone as string} style={{ width: `${value}%` }} /></i>
            </div>
          ))}
        </div>
      </div>

      <div className="jf-mini-bars" aria-hidden="true">
        {chartBars.map((height, index) => (
          <span key={`${height}-${index}`} style={{ height: `${height}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function PremiumLandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="jf-node4-landing">
      <div className="jf-landing-ambient" aria-hidden="true" />

      <header className="jf-landing-header">
        <div className="jf-header-inner">
          <BrandMark compact />

          <nav className="jf-desktop-nav" aria-label="Landing page navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href} className="finance-focus">{item.label}</a>
            ))}
          </nav>

          <div className="jf-header-actions">
            <Link href="/login" className="finance-focus jf-header-login">Sign in</Link>
            <Link href="/login?mode=signup" className="finance-focus jf-header-cta">
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <section className="jf-hero">
        <div className="jf-hero-copy">
          <p className="jf-hero-badge"><Sparkles aria-hidden="true" /> Daily money clarity</p>
          <h1>See your money clearly. <span>Act with confidence.</span></h1>
          <p className="jf-hero-description">
            Track income, expenses, accounts, goals, payables, and investments in one focused workspace built for everyday decisions.
          </p>

          <div className="jf-hero-actions">
            <PrimaryButton href="/login?mode=signup">Create your workspace</PrimaryButton>
            <SecondaryButton href="/login">Sign in</SecondaryButton>
          </div>

          <div className="jf-hero-proof" aria-label="Product highlights">
            <span><Check aria-hidden="true" /> Quick daily entries</span>
            <span><Check aria-hidden="true" /> Clear reports</span>
            <span><Check aria-hidden="true" /> Private workspace</span>
          </div>
        </div>

        <DashboardPreview />
      </section>

      <section className="jf-value-rail" aria-label="Product values">
        <div>
          {[
            [ShieldCheck, "Private by design", "Your personal workspace stays behind the existing authentication flow."],
            [Landmark, "Built for real tracking", "Every summary starts with the finance activity you choose to record."],
            [WalletCards, "Comfortable everywhere", "Responsive layouts stay useful across phone, tablet, laptop, and large screens."],
          ].map(([Icon, title, copy]) => {
            const ValueIcon = Icon as LucideIcon;
            return (
              <div key={title as string} className="jf-value-item jf-reveal">
                <ValueIcon aria-hidden="true" />
                <span><strong>{title as string}</strong><small>{copy as string}</small></span>
              </div>
            );
          })}
        </div>
      </section>

      <section id="capabilities" className="jf-section jf-capabilities">
        <div className="jf-reveal">
          <SectionHeading
            eyebrow="Focused features"
            title="Everything important, without dashboard clutter."
            copy="The landing page now highlights the core experience instead of presenting every module as another oversized card."
          />
        </div>

        <div className="jf-feature-list">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="jf-feature jf-reveal" data-tone={feature.tone}>
                <span className="jf-feature-icon"><Icon aria-hidden="true" /></span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                </div>
                <ArrowRight className="jf-feature-arrow" aria-hidden="true" />
              </article>
            );
          })}
        </div>
      </section>

      <section id="preview" className="jf-section jf-insights-section">
        <div className="jf-insights-copy jf-reveal">
          <SectionHeading
            eyebrow="Readable insights"
            title="Charts should explain the pattern—not decorate the page."
            copy="Clear labels, honest demo states, and restrained motion make financial visuals easier to understand on every screen size."
          />

          <div className="jf-insight-points">
            <span><BarChart3 aria-hidden="true" /><b>Readable trends</b><small>Simple hierarchy keeps the most important movement obvious.</small></span>
            <span><PieChart aria-hidden="true" /><b>Useful categories</b><small>Spending context stays connected to the entries behind it.</small></span>
            <span><BrainCircuit aria-hidden="true" /><b>Helpful prompts</b><small>Insights support decisions without inventing financial activity.</small></span>
          </div>
        </div>

        <InsightVisual />
      </section>

      <section id="workflow" className="jf-workflow-section">
        <div className="jf-section">
          <div className="jf-reveal">
            <SectionHeading
              eyebrow="Simple workflow"
              title="Record. Understand. Adjust."
              copy="A repeatable three-step rhythm keeps the product useful without adding unnecessary complexity."
              align="center"
            />
          </div>

          <ol className="jf-workflow-list">
            {[
              ["01", "Record what changed", "Add income, expenses, transfers, goals, payables, and investments as they happen.", ReceiptText],
              ["02", "Understand the pattern", "Review balances, cash flow, categories, reports, and progress in one connected workspace.", BarChart3],
              ["03", "Make the next move", "Use the clearer picture to adjust spending, save with purpose, and plan with confidence.", Goal],
            ].map(([number, title, copy, Icon]) => {
              const StepIcon = Icon as LucideIcon;
              return (
                <li key={number as string} className="jf-workflow-step jf-reveal">
                  <span className="jf-step-number">{number as string}</span>
                  <span className="jf-step-icon"><StepIcon aria-hidden="true" /></span>
                  <h3>{title as string}</h3>
                  <p>{copy as string}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section id="privacy" className="jf-section jf-privacy-section">
        <div className="jf-privacy-copy jf-reveal">
          <span className="jf-privacy-icon"><LockKeyhole aria-hidden="true" /></span>
          <SectionHeading
            eyebrow="Privacy and control"
            title="Your financial workspace stays yours."
            copy="The public landing page remains separate from protected finance routes, while the existing authentication and session behavior stays unchanged."
          />
        </div>

        <div className="jf-privacy-list">
          {[
            [ShieldCheck, "Protected workspace", "Personal dashboard content loads after the existing session checks complete."],
            [CreditCard, "Your entries, your context", "The product works from the accounts, categories, and activity you choose to add."],
            [BrainCircuit, "Truthful insight states", "Unavailable information is not shown as a fake zero, success, or invented trend."],
          ].map(([Icon, title, copy]) => {
            const PrivacyIcon = Icon as LucideIcon;
            return (
              <div key={title as string} className="jf-privacy-item jf-reveal">
                <PrivacyIcon aria-hidden="true" />
                <span><strong>{title as string}</strong><small>{copy as string}</small></span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="jf-section jf-cta-section">
        <div className="jf-final-cta jf-reveal">
          <span className="jf-cta-icon"><Goal aria-hidden="true" /></span>
          <div>
            <p className="jf-eyebrow">Ready when you are</p>
            <h2>Your next clear money decision starts with one entry.</h2>
            <p>Open your workspace, add the finance context that matters, and build clarity from there.</p>
          </div>
          <PrimaryButton href="/login?mode=signup">Get started</PrimaryButton>
        </div>
      </section>

      <footer className="jf-landing-footer">
        <div>
          <div className="jf-footer-brand jf-reveal">
            <BrandMark />
            <p>A focused personal-finance workspace for cleaner tracking and more confident review.</p>
          </div>

          <nav className="jf-footer-nav jf-reveal" aria-label="Footer navigation">
            <div>
              <strong>Product</strong>
              <a href="#capabilities">Features</a>
              <a href="#workflow">How it works</a>
              <a href="#privacy">Privacy</a>
            </div>
            <div>
              <strong>Workspace</strong>
              <Link href="/login">Sign in</Link>
              <Link href="/login?mode=signup">Create account</Link>
              <Link href="/dashboard">Dashboard</Link>
            </div>
          </nav>

          <p className="jf-footer-bottom jf-reveal">© {year} Jamal&apos;s Finance. Built for clear daily money decisions.</p>
        </div>
      </footer>
    </main>
  );
}
