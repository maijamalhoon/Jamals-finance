"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Goal,
  Landmark,
  LineChart,
  LockKeyhole,
  LucideIcon,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

type Tone =
  | "blue"
  | "cyan"
  | "emerald"
  | "gold"
  | "purple"
  | "rose"
  | "teal";

type FeatureCard = {
  title: string;
  copy: string;
  icon: LucideIcon;
  tone: Tone;
};

type ModuleCard = {
  label: string;
  copy: string;
  detail: string;
  icon: LucideIcon;
  tone: Tone;
  wide?: boolean;
};

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Security", href: "#security" },
  { label: "Modules", href: "#modules" },
] as const;

const valueBadges = [
  "Private workspace",
  "Daily money clarity",
  "Mobile-first tracking",
] as const;

const financeSymbols = [
  { value: "+", className: "left-[5%] top-[17%] text-emerald-500" },
  { value: "−", className: "right-[10%] top-[15%] text-rose-500" },
  { value: "×", className: "left-[12%] bottom-[18%] text-sky-500" },
  { value: "=", className: "right-[18%] bottom-[14%] text-teal-500" },
  { value: "%", className: "left-[50%] top-[2%] text-violet-500" },
  { value: "₨", className: "right-[38%] bottom-[6%] text-amber-500" },
  { value: "$", className: "left-[38%] bottom-[31%] text-blue-500" },
] as const;

const features: FeatureCard[] = [
  {
    title: "Accounts",
    copy: "Keep cash, wallets, savings, and other balances readable in one calm view.",
    icon: WalletCards,
    tone: "emerald",
  },
  {
    title: "Income",
    copy: "Log what came in and understand the rhythm behind your monthly inflow.",
    icon: TrendingUp,
    tone: "teal",
  },
  {
    title: "Expenses",
    copy: "Record spending without spreadsheet friction and spot where money leaks.",
    icon: TrendingDown,
    tone: "rose",
  },
  {
    title: "Goals",
    copy: "Turn savings targets into visible progress with simple next-step clarity.",
    icon: Goal,
    tone: "gold",
  },
  {
    title: "Investments",
    copy: "Track long-term positions beside the rest of your money activity.",
    icon: LineChart,
    tone: "purple",
  },
  {
    title: "Payables",
    copy: "Follow liabilities, borrowed money, deadlines, and repayment movement.",
    icon: CreditCard,
    tone: "cyan",
  },
  {
    title: "Reports and charts",
    copy: "Use visual summaries to understand categories, cash flow, and patterns.",
    icon: BarChart3,
    tone: "blue",
  },
  {
    title: "Privacy and security",
    copy: "Public marketing stays separate from authenticated, user-specific records.",
    icon: ShieldCheck,
    tone: "emerald",
  },
  {
    title: "AI Insights",
    copy: "Let the insights area turn your finance activity into clearer prompts.",
    icon: BrainCircuit,
    tone: "purple",
  },
];

const workflow = [
  {
    title: "Start secure",
    copy: "Use the existing login or signup flow before entering the private dashboard.",
  },
  {
    title: "Add your money activity",
    copy: "Record accounts, income, expenses, transfers, goals, payables, and investments.",
  },
  {
    title: "Review insights",
    copy: "Scan dashboard cards, reports, charts, and AI insights for the pattern.",
  },
  {
    title: "Build better habits",
    copy: "Use what you learn to spend intentionally, save steadily, and plan the next move.",
  },
] as const;

const modules: ModuleCard[] = [
  {
    label: "Daily Tracking",
    copy: "Income, expenses, and transactions stay close to the way money actually moves.",
    detail: "Fast entries",
    icon: ReceiptText,
    tone: "emerald",
    wide: true,
  },
  {
    label: "Transfers",
    copy: "Move money between accounts without losing the story of where it went.",
    detail: "Connected movement",
    icon: Landmark,
    tone: "blue",
  },
  {
    label: "Savings Goals",
    copy: "See progress, remaining distance, and useful motivation without clutter.",
    detail: "Progress visible",
    icon: Goal,
    tone: "gold",
  },
  {
    label: "Liabilities",
    copy: "Track what needs repayment and keep deadlines from becoming surprises.",
    detail: "Payables aware",
    icon: CreditCard,
    tone: "rose",
  },
  {
    label: "Investments",
    copy: "Keep holdings and long-term tracking in the same personal workspace.",
    detail: "Portfolio context",
    icon: LineChart,
    tone: "purple",
  },
  {
    label: "Reports",
    copy: "Charts and summaries make spending patterns easier to act on.",
    detail: "Pattern reading",
    icon: PieChart,
    tone: "cyan",
    wide: true,
  },
];

const securityNotes = [
  {
    title: "Protected entry",
    copy: "Dashboard routes stay behind the existing Supabase authentication flow.",
  },
  {
    title: "Private records",
    copy: "User-specific finance data belongs inside the authenticated workspace.",
  },
  {
    title: "Separated surface",
    copy: "The public landing page stays apart from private dashboard screens.",
  },
  {
    title: "Existing auth links",
    copy: "Login and signup paths are reused without changing backend logic.",
  },
] as const;

const previewRows = [
  {
    label: "Income recorded",
    value: "+$4,200",
    tone: "text-emerald-500",
    dot: "bg-emerald-500",
  },
  {
    label: "Groceries",
    value: "-$86",
    tone: "text-rose-500",
    dot: "bg-rose-500",
  },
  {
    label: "Savings goal",
    value: "+₨12k",
    tone: "text-amber-500",
    dot: "bg-amber-500",
  },
  {
    label: "Investment note",
    value: "+2.8%",
    tone: "text-violet-500",
    dot: "bg-violet-500",
  },
] as const;

const bars = [44, 72, 58, 86, 66, 98, 80, 112] as const;

const toneClasses: Record<Tone, string> = {
  blue:
    "from-blue-500/18 to-sky-500/8 text-blue-600 dark:text-blue-300 border-blue-500/18",
  cyan:
    "from-cyan-500/18 to-teal-500/8 text-cyan-700 dark:text-cyan-300 border-cyan-500/18",
  emerald:
    "from-emerald-500/18 to-teal-500/8 text-emerald-700 dark:text-emerald-300 border-emerald-500/18",
  gold:
    "from-amber-400/22 to-yellow-500/8 text-amber-700 dark:text-amber-300 border-amber-500/20",
  purple:
    "from-violet-500/18 to-fuchsia-500/8 text-violet-700 dark:text-violet-300 border-violet-500/18",
  rose:
    "from-rose-500/18 to-orange-500/8 text-rose-700 dark:text-rose-300 border-rose-500/18",
  teal:
    "from-teal-500/18 to-emerald-500/8 text-teal-700 dark:text-teal-300 border-teal-500/18",
};

const toneBorderClasses: Record<Tone, string> = {
  blue: "from-blue-500/34 via-white/72 to-sky-500/22 dark:via-white/10",
  cyan: "from-cyan-500/34 via-white/72 to-teal-500/22 dark:via-white/10",
  emerald:
    "from-emerald-500/34 via-white/72 to-teal-500/22 dark:via-white/10",
  gold: "from-amber-400/40 via-white/72 to-yellow-500/22 dark:via-white/10",
  purple:
    "from-violet-500/34 via-white/72 to-fuchsia-500/22 dark:via-white/10",
  rose: "from-rose-500/34 via-white/72 to-orange-500/22 dark:via-white/10",
  teal: "from-teal-500/34 via-white/72 to-emerald-500/22 dark:via-white/10",
};

const reveal: Variants = {
  hidden: { opacity: 0, y: 18, scale: 0.99 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.075, delayChildren: 0.05 },
  },
};

function MotionSection({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.18, margin: "0px 0px -8% 0px" }}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function CTAButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const base =
    "group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] px-5 text-sm font-black tracking-normal transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 active:scale-[0.985] sm:w-auto sm:text-[15px]";
  const styles =
    variant === "primary"
      ? "bg-slate-950 text-white shadow-[0_18px_50px_rgba(15,23,42,0.20)] hover:-translate-y-0.5 hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
      : variant === "secondary"
        ? "border border-slate-200/80 bg-white/74 text-slate-950 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur hover:-translate-y-0.5 hover:border-blue-300 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:border-blue-300/40"
        : "text-slate-700 hover:bg-slate-950/5 dark:text-slate-200 dark:hover:bg-white/8";

  return (
    <motion.div className="w-full sm:w-auto" whileTap={{ scale: 0.985 }} whileHover={{ y: -2 }}>
      <Link href={href} className={`${base} ${styles}`}>
        {children}
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  copy: string;
  align?: "center" | "left";
}) {
  return (
    <motion.div
      variants={reveal}
      className={
        align === "left"
          ? "max-w-2xl"
          : "mx-auto max-w-3xl text-center"
      }
    >
      <p className="inline-flex rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-black uppercase text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-slate-300">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-balance text-3xl font-black leading-[1.04] tracking-normal text-slate-950 sm:text-4xl lg:text-[2.85rem] dark:text-white">
        {title}
      </h2>
      <p className="mt-3 text-pretty text-base leading-7 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300">
        {copy}
      </p>
    </motion.div>
  );
}

function HeroPreview() {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.75, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 mx-auto mt-8 w-full max-w-5xl lg:mt-10"
      aria-label="Illustrative Jamal's Finance dashboard preview"
      >
        <div className="absolute -inset-6 rounded-[48px] bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.20),transparent_36%),radial-gradient(circle_at_78%_8%,rgba(59,130,246,0.20),transparent_34%),radial-gradient(circle_at_50%_95%,rgba(245,158,11,0.14),transparent_34%)] blur-2xl" />
      <motion.div
        animate={{ y: [0, -10, 0], rotateX: [0, 1.2, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-3 shadow-[0_32px_110px_rgba(15,23,42,0.18)] backdrop-blur-xl sm:p-4 dark:border-white/12 dark:bg-slate-950/72 dark:shadow-[0_36px_120px_rgba(0,0,0,0.42)]"
      >
        <div className="grid gap-3 lg:grid-cols-[0.86fr_1.14fr]">
          <div className="rounded-[22px] border border-slate-200/70 bg-slate-950 p-4 text-white shadow-inner dark:border-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-white/46">
                  Visual preview
                </p>
                <h3 className="mt-1 text-2xl font-black">Monthly clarity</h3>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-200">
                Preview data
              </span>
            </div>

            <div className="mt-6 rounded-[20px] border border-white/10 bg-white/8 p-4">
              <p className="text-sm font-bold text-white/54">Whole workspace</p>
              <div className="mt-2 flex items-end justify-between gap-4">
                <strong className="text-4xl font-black tracking-normal">
                  $24,850
                </strong>
                <span className="rounded-full bg-emerald-400/12 px-3 py-1 text-xs font-black text-emerald-200">
                  +12%
                </span>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <motion.span
                  initial={false}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 1.2, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-full origin-left rounded-full bg-gradient-to-r from-emerald-300 via-teal-300 to-blue-300"
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              {[
                ["Income", "$6.4k", TrendingUp, "text-emerald-200"],
                ["Expenses", "$2.1k", TrendingDown, "text-rose-200"],
                ["Goals", "72%", Goal, "text-amber-200"],
                ["AI", "3 notes", BrainCircuit, "text-violet-200"],
              ].map(([label, value, Icon, tone]) => {
                const CardIcon = Icon as LucideIcon;

                return (
                  <div
                    key={label as string}
                    className="rounded-[18px] border border-white/10 bg-white/7 p-3"
                  >
                    <CardIcon className={`h-4 w-4 ${tone}`} />
                    <p className="mt-4 text-xs font-bold text-white/46">
                      {label as string}
                    </p>
                    <strong className="text-lg font-black">{value as string}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid min-w-0 gap-3">
            <div className="grid gap-3 md:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[22px] border border-slate-200/80 bg-white/86 p-4 dark:border-white/10 dark:bg-white/8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                      Reports
                    </p>
                    <h3 className="mt-1 font-black text-slate-950 dark:text-white">
                      Cash flow rhythm
                    </h3>
                  </div>
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                </div>
                <div className="mt-5 flex h-44 items-end gap-2">
                  {bars.map((height, index) => (
                    <motion.span
                      key={`${height}-${index}`}
                      initial={false}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{
                        duration: 0.7,
                        delay: 0.36 + index * 0.055,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ height }}
                      className="min-w-0 flex-1 origin-bottom rounded-t-xl bg-gradient-to-t from-blue-600 to-cyan-300 shadow-[0_12px_30px_rgba(37,99,235,0.22)]"
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[22px] border border-slate-200/80 bg-white/86 p-4 dark:border-white/10 dark:bg-white/8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                      Activity
                    </p>
                    <h3 className="mt-1 font-black text-slate-950 dark:text-white">
                      Recent movement
                    </h3>
                  </div>
                  <ReceiptText className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="mt-4 grid gap-2">
                  {previewRows.map((row, index) => (
                    <motion.div
                      key={row.label}
                      initial={false}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.54 + index * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 text-sm font-bold dark:border-white/8 dark:bg-white/6"
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                      <span className="min-w-0 truncate text-slate-600 dark:text-slate-300">
                        {row.label}
                      </span>
                      <strong className={row.tone}>
                        {row.label === "Savings goal" ? "+Rs12k" : row.value}
                      </strong>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Accounts", "6 connected", WalletCards],
                ["Goals", "4 active", Goal],
                ["Investments", "Tracked", LineChart],
              ].map(([label, value, Icon]) => {
                const CardIcon = Icon as LucideIcon;

                return (
                  <div
                    key={label as string}
                    className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/8"
                  >
                    <CardIcon className="h-5 w-5 text-teal-500" />
                    <p className="mt-6 text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                      {label as string}
                    </p>
                    <strong className="text-lg font-black text-slate-950 dark:text-white">
                      {value as string}
                    </strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PremiumLandingPage() {
  const year = new Date().getFullYear();

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[#f6f8fb] text-slate-950 dark:bg-[#070b12] dark:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.055)_1px,transparent_1px),linear-gradient(180deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:58px_58px] opacity-70 dark:bg-[linear-gradient(90deg,rgba(226,232,240,0.045)_1px,transparent_1px),linear-gradient(180deg,rgba(226,232,240,0.035)_1px,transparent_1px)]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_8%,rgba(45,212,191,0.22),transparent_32%),radial-gradient(circle_at_80%_12%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_50%_78%,rgba(168,85,247,0.11),transparent_28%)]" />

      <header className="sticky top-3 z-50 mx-auto w-[calc(100%_-_1rem)] max-w-[1180px] rounded-[24px] border border-white/70 bg-white/74 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/72">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            href="/"
            aria-label="Jamal's Finance home"
            className="group inline-flex min-w-0 items-center gap-2.5 rounded-[18px] px-2 py-1.5 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <span className="truncate">Jamal&apos;s Finance</span>
          </Link>

          <nav
            aria-label="Landing sections"
            className="order-3 col-span-2 mt-1 flex min-w-0 gap-1 overflow-x-auto rounded-[18px] border border-slate-200/70 bg-slate-50/80 p-1 [scrollbar-width:none] lg:order-none lg:col-span-1 lg:mt-0 dark:border-white/8 dark:bg-white/6"
          >
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-2xl px-3 py-2 text-sm font-extrabold text-slate-600 transition hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="justify-self-end">
            <Link
              href="/login"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 active:scale-[0.985] dark:bg-white dark:text-slate-950"
            >
              <span className="hidden sm:inline">Start workspace</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100svh_-_5.5rem)] w-[calc(100%_-_1.25rem)] max-w-[1180px] flex-col justify-center pb-12 pt-10 sm:pb-16 lg:pt-14">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          {financeSymbols.map((symbol, index) => (
            <motion.span
              key={`${symbol.value}-${index}`}
              animate={{
                y: [0, index % 2 === 0 ? -16 : 14, 0],
                rotate: [0, index % 2 === 0 ? 7 : -7, 0],
              }}
              transition={{
                duration: 7 + index * 0.45,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className={`absolute hidden select-none rounded-[18px] border border-current/15 bg-white/60 px-3 py-1 text-3xl font-black shadow-lg backdrop-blur md:block dark:bg-white/8 ${symbol.className}`}
            >
              {["+", "-", "x", "=", "%", "Rs", "$"][index] ?? symbol.value}
            </motion.span>
          ))}
        </div>

        <motion.div
          initial={false}
          animate="visible"
          variants={stagger}
          className="relative z-10 mx-auto max-w-5xl text-center"
        >
          <motion.div
            variants={reveal}
            className="inline-flex max-w-full items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/74 px-3 py-2 text-center text-xs font-black uppercase text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/8 dark:text-slate-300"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Daily finance clarity
          </motion.div>

          <motion.h1
            variants={reveal}
            className="mx-auto mt-5 max-w-5xl text-balance text-[clamp(2.25rem,10.5vw,3rem)] font-black leading-[0.96] tracking-normal text-slate-950 sm:text-[clamp(3.35rem,6.4vw,5.75rem)] sm:leading-[0.96] dark:text-white"
          >
            <span className="block sm:inline">Your whole</span>{" "}
            <span className="block sm:inline">money life,</span>{" "}
            <span className="block sm:inline">finally in one</span>{" "}
            <span className="block sm:inline">calm workspace.</span>
          </motion.h1>

          <motion.p
            variants={reveal}
            className="mx-auto mt-5 max-w-2xl text-pretty text-base font-semibold leading-8 text-slate-600 sm:text-lg sm:leading-8 dark:text-slate-300"
          >
            Track income, expenses, savings, debts, goals, investments, reports,
            transfers, and AI insights without spreadsheet chaos.
          </motion.p>

          <motion.div
            variants={reveal}
            className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <CTAButton href="/login">Start your workspace</CTAButton>
            <CTAButton href="/dashboard" variant="secondary">
              Go to dashboard
            </CTAButton>
          </motion.div>

          <motion.div
            variants={reveal}
            className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:flex-wrap"
            aria-label="Product highlights"
          >
            {valueBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex w-full max-w-[18rem] items-center justify-center gap-2 rounded-full border border-slate-200/80 bg-white/64 px-3 py-1.5 text-sm font-bold text-slate-600 backdrop-blur sm:w-auto sm:max-w-none dark:border-white/10 dark:bg-white/7 dark:text-slate-300"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                {badge}
              </span>
            ))}
          </motion.div>
        </motion.div>

        <HeroPreview />
      </section>

      <MotionSection
        id="features"
        className="relative z-10 mx-auto w-[calc(100%_-_1.25rem)] max-w-[1180px] py-12 sm:py-16"
      >
        <SectionHeading
          eyebrow="Features"
          title="Everything important gets a place, without turning money into noise."
          copy="The landing page now speaks to the real product modules: accounts, daily activity, liabilities, savings, investments, reports, privacy, and AI-powered interpretation."
        />

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.article
                key={feature.title}
                variants={reveal}
                whileHover={{ y: -3 }}
                className={`group relative min-h-[206px] overflow-hidden rounded-[24px] border border-transparent bg-gradient-to-br p-px shadow-[0_14px_38px_rgba(15,23,42,0.065)] transition-shadow duration-300 hover:shadow-[0_20px_54px_rgba(15,23,42,0.11)] ${toneBorderClasses[feature.tone]}`}
              >
                <div className="relative flex h-full min-h-[204px] flex-col rounded-[23px] bg-white/78 p-5 backdrop-blur-xl dark:bg-slate-950/62">
                  <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/18" />
                  <div
                    className={`relative grid h-12 w-12 place-items-center overflow-hidden rounded-[18px] border bg-gradient-to-br shadow-[0_12px_26px_rgba(15,23,42,0.08)] ${toneClasses[feature.tone]}`}
                  >
                    <span className="absolute inset-1 rounded-[14px] bg-white/52 dark:bg-white/7" />
                    <Icon className="relative h-5 w-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-black text-slate-950 dark:text-white">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                    {feature.copy}
                  </p>
                  <ChevronRight className="absolute bottom-5 right-5 h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600" />
                </div>
              </motion.article>
            );
          })}
        </div>
      </MotionSection>

      <MotionSection
        id="workflow"
        className="relative z-10 mx-auto grid w-[calc(100%_-_1.25rem)] max-w-[1180px] gap-8 py-12 sm:py-16 lg:grid-cols-[0.78fr_1.22fr] lg:items-start"
      >
        <SectionHeading
          align="left"
          eyebrow="Workflow"
          title="Four moves for a calmer money routine."
          copy="The product promise is simple: enter real activity, see it clearly, and use the pattern to make the next decision easier."
        />

        <div className="grid gap-3">
          {workflow.map((step, index) => (
            <motion.article
              key={step.title}
              variants={reveal}
              className="grid gap-4 rounded-[24px] border border-slate-200/80 bg-white/72 p-5 shadow-[0_14px_44px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:grid-cols-[auto_minmax(0,1fr)] dark:border-white/10 dark:bg-white/7"
            >
              <span className="grid h-12 w-12 place-items-center rounded-[18px] border border-blue-500/20 bg-blue-500/10 text-sm font-black text-blue-600 dark:text-blue-300">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-xl font-black text-slate-950 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {step.copy}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </MotionSection>

      <MotionSection
        id="modules"
        className="relative z-10 mx-auto w-[calc(100%_-_1.25rem)] max-w-[1180px] py-12 sm:py-16"
      >
        <SectionHeading
          eyebrow="Modules"
          title="A finance workspace shaped around real daily decisions."
          copy="The bento view below highlights the areas users naturally return to: recording activity, moving money, building goals, handling liabilities, reviewing investments, and reading reports."
        />

        <div className="mt-8 grid auto-rows-[minmax(210px,auto)] gap-3 md:grid-cols-4">
          {modules.map((item) => {
            const Icon = item.icon;

            return (
              <motion.article
                key={item.label}
                variants={reveal}
                whileHover={{ y: -5 }}
                className={`relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/72 p-5 shadow-[0_14px_44px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-white/10 dark:bg-white/7 ${
                  item.wide ? "md:col-span-2" : ""
                }`}
              >
                <div
                  className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl ${toneClasses[item.tone]}`}
                />
                <div className="relative flex h-full flex-col">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-[18px] border bg-gradient-to-br ${toneClasses[item.tone]}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-auto pt-8">
                    <p className="text-xs font-black uppercase text-slate-400 dark:text-slate-500">
                      {item.detail}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {item.label}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                      {item.copy}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </MotionSection>

      <MotionSection
        id="security"
        className="relative z-10 mx-auto grid w-[calc(100%_-_1.25rem)] max-w-[1180px] gap-4 py-12 sm:py-16 lg:grid-cols-[0.96fr_1.04fr] lg:items-center"
      >
        <motion.div
          variants={reveal}
          className="relative overflow-hidden rounded-[28px] border border-blue-500/16 bg-white/78 p-5 text-slate-950 shadow-[0_20px_58px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 dark:border-white/10 dark:bg-slate-950/70 dark:text-white"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_78%_0%,rgba(59,130,246,0.12),transparent_32%)]" />
          <div className="relative">
            <div className="grid h-12 w-12 place-items-center rounded-[20px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 shadow-[0_12px_28px_rgba(16,185,129,0.12)] dark:text-emerald-200">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-6 max-w-xl text-balance text-3xl font-black leading-tight sm:text-4xl">
              Public page outside. Private workspace inside.
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-base font-medium leading-8 text-slate-600 dark:text-slate-300">
              The page is careful about trust: it says what the app does without
              pretending to be a bank. Supabase Auth protects entry, and the
              dashboard is where user-specific finance records belong.
            </p>
          </div>
        </motion.div>

        <motion.div variants={stagger} className="grid gap-3">
          {securityNotes.map((note) => (
            <motion.div
              key={note.title}
              variants={reveal}
              className="flex gap-3 rounded-[22px] border border-slate-200/80 bg-white/72 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.055)] backdrop-blur-xl dark:border-white/10 dark:bg-white/7"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[15px] border border-emerald-500/16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  {note.title}
                </h3>
                <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                  {note.copy}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </MotionSection>

      <MotionSection className="relative z-10 mx-auto w-[calc(100%_-_1.25rem)] max-w-[1180px] py-12 sm:py-16">
        <motion.div
          variants={reveal}
          className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/78 p-6 text-center shadow-[0_28px_95px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-10 lg:p-14 dark:border-white/10 dark:bg-white/7"
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/60 to-transparent" />
          <BadgeCheck className="mx-auto h-10 w-10 text-emerald-500" />
          <h2 className="mx-auto mt-6 max-w-4xl text-balance text-3xl font-black leading-[1.03] text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
            Open Jamal&apos;s Finance and make the next money decision clearer.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base font-semibold leading-8 text-slate-600 sm:text-lg dark:text-slate-300">
            Start with one account, one expense, or one savings goal. The
            workspace becomes more useful every time your activity is cleanly
            recorded.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <CTAButton href="/login">Start your workspace</CTAButton>
            <CTAButton href="/login" variant="secondary">
              Login or sign up
            </CTAButton>
          </div>
        </motion.div>
      </MotionSection>

      <footer className="relative z-10 border-t border-slate-200/80 bg-white/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
        <div className="mx-auto grid w-[calc(100%_-_1.25rem)] max-w-[1180px] gap-6 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white"
            >
              <CircleDollarSign className="h-5 w-5 text-emerald-500" />
              Jamal&apos;s Finance
            </Link>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              Built for daily clarity, private tracking, and better money
              habits.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {[
              ["Features", "#features"],
              ["Security", "#security"],
              ["Login", "/login"],
              ["Dashboard", "/dashboard"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="rounded-full px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>

          <p className="hidden">
            © {year} Jamal&apos;s Finance. Public landing page, private finance
            app.
          </p>
          <p className="text-xs font-bold text-slate-400 sm:col-span-2 dark:text-slate-500">
            {"(c)"} {year} Jamal&apos;s Finance. Public landing page, private
            finance app.
          </p>
        </div>
      </footer>
    </main>
  );
}
