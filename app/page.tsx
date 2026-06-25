"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";

type IconType = ComponentType<{ className?: string }>;

const features: Array<{
  title: string;
  description: string;
  icon: IconType;
  tone: string;
}> = [
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
      "Record income, expenses, transfers, liabilities, and payments with a fast flow.",
    icon: CreditCard,
    tone: "",
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
    tone: "",
  },
  {
    title: "Mobile-ready experience",
    description:
      "Designed for quick daily finance checks on mobile, tablet, and desktop.",
    icon: Earth,
    tone: "jf-icon-bubble-success",
  },
];

const steps = [
  {
    title: "Create your workspace",
    description: "Sign in securely and start with a clean personal dashboard.",
  },
  {
    title: "Add money activity",
    description: "Track accounts, income, expenses, goals, and liabilities.",
  },
  {
    title: "Review your progress",
    description: "Use charts and summaries to understand where money moves.",
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

const previewBars = [46, 72, 54, 88, 66, 96, 78];
const premiumEase = [0.16, 1, 0.3, 1] as const;
export default function HomePage() {
  const shouldReduceMotion = useReducedMotion();

  const revealProps =
    shouldReduceMotion ?
      {}
    : {
        initial: { opacity: 0, y: 18 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.55, ease: premiumEase },
      };

  const heroMotion =
    shouldReduceMotion ?
      {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: premiumEase },
      };

  return (
    <main className="jf-page-shell min-h-dvh overflow-hidden pb-24 sm:pb-0">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[360px] w-[680px] -translate-x-1/2 rounded-full bg-active/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[420px] rounded-full bg-success/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="finance-focus flex items-center gap-3 rounded-2xl"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-card shadow-theme">
              <ChartColumn className="h-5 w-5 text-active" />
            </span>
            <span>
              <span className="block text-sm font-bold tracking-tight text-text-primary">
                Jamal&apos;s Finance
              </span>
              <span className="block text-xs text-text-secondary">
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

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="jf-btn jf-btn-ghost hidden min-h-10 px-4 text-sm sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="jf-btn jf-btn-primary min-h-10 px-4 text-sm"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="jf-section grid items-center gap-10 pb-12 pt-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pb-20 lg:pt-16">
        <motion.div
          {...heroMotion}
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <div className="jf-badge jf-badge-active mx-auto mb-5 lg:mx-0">
            <Sparkles className="h-4 w-4" />
            Premium finance dashboard
          </div>

          <h1 className="jf-heading-xl mx-auto lg:mx-0">
            Manage your money with clarity, speed, and confidence.
          </h1>

          <p className="jf-copy mx-auto mt-5 lg:mx-0">
            Jamal&apos;s Finance helps you track accounts, expenses, income,
            goals, liabilities, investments, and savings in one clean workspace
            built to feel smooth on every device.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              href="/login"
              className="jf-btn jf-btn-primary sm:w-auto sm:px-6"
            >
              Start your finance workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="jf-btn jf-btn-secondary sm:w-auto sm:px-6"
            >
              Explore features
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm text-text-secondary lg:justify-start">
            {["No spreadsheet mess", "Mobile-first UI", "Secure login"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CircleCheck className="h-4 w-4 text-success" />
                  {item}
                </span>
              ),
            )}
          </div>
        </motion.div>

        <motion.div
          {...(shouldReduceMotion ?
            {}
          : {
              initial: { opacity: 0, y: 24, scale: 0.98 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: {
                duration: 0.7,
                delay: 0.1,
                ease: premiumEase,
              },
            })}
          className="relative mx-auto w-full max-w-xl"
        >
          <div className="absolute -inset-4 rounded-[34px] bg-active/10 blur-2xl" />

          <div className="jf-card-premium relative p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="jf-eyebrow text-[0.68rem]">Live preview</p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-text-primary">
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
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    Monthly flow
                  </p>
                  <p className="text-xs text-text-secondary">
                    Clean view of money movement
                  </p>
                </div>
                <span className="jf-badge jf-badge-active">Demo</span>
              </div>

              <div className="flex h-36 items-end gap-3">
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
        </motion.div>
      </section>

      <section id="features" className="jf-section-tight">
        <motion.div {...revealProps} className="mx-auto max-w-2xl text-center">
          <p className="jf-eyebrow justify-center">
            Built for daily money control
          </p>
          <h2 className="jf-heading-lg mx-auto mt-3">
            Everything important, without the clutter.
          </h2>
          <p className="jf-copy mx-auto mt-4">
            A clean finance experience that feels simple for beginners and
            powerful enough for serious users.
          </p>
        </motion.div>

        <div className="mt-10 jf-responsive-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                {...(shouldReduceMotion ?
                  {}
                : {
                    initial: { opacity: 0, y: 18 },
                    whileInView: { opacity: 1, y: 0 },
                    viewport: { once: true, margin: "-60px" },
                    transition: {
                      duration: 0.45,
                      delay: index * 0.04,
                      ease: premiumEase,
                    },
                  })}
                className="jf-card-premium jf-card-hover p-5"
              >
                <div className={`jf-icon-bubble mb-5 ${feature.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="workflow" className="jf-section-tight">
        <div className="jf-card-premium grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <motion.div {...revealProps}>
            <div className="jf-icon-bubble mb-5">
              <Zap className="h-6 w-6" />
            </div>
            <p className="jf-eyebrow">How it works</p>
            <h2 className="jf-heading-lg mt-3">
              A smoother routine for your daily money decisions.
            </h2>
            <p className="jf-copy mt-4">
              The goal is not just to store numbers. The goal is to help users
              understand their financial life quickly on mobile and desktop.
            </p>
          </motion.div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                {...(shouldReduceMotion ?
                  {}
                : {
                    initial: { opacity: 0, x: 18 },
                    whileInView: { opacity: 1, x: 0 },
                    viewport: { once: true },
                    transition: {
                      duration: 0.45,
                      delay: index * 0.06,
                      ease: premiumEase,
                    },
                  })}
                className="jf-card-soft flex gap-4 p-4"
              >
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="jf-section-tight">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <motion.div {...revealProps} className="jf-card-premium p-5 sm:p-8">
            <p className="jf-eyebrow">Finance modules</p>
            <h2 className="jf-heading-lg mt-3">
              One workspace for every important money area.
            </h2>
            <p className="jf-copy mt-4">
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
          </motion.div>

          <motion.div {...revealProps} className="jf-card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-text-primary">
                  Mobile focus
                </p>
                <p className="text-xs text-text-secondary">
                  Fast thumb-friendly UI
                </p>
              </div>
              <div className="jf-icon-bubble-success jf-icon-bubble">
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
          </motion.div>
        </div>
      </section>

      <section id="security" className="jf-section-tight">
        <div className="jf-card-premium grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
          <motion.div {...revealProps}>
            <div className="jf-icon-bubble-success jf-icon-bubble mb-5">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="jf-eyebrow">Security and trust</p>
            <h2 className="jf-heading-lg mt-3">
              Premium look, protected workspace.
            </h2>
            <p className="jf-copy mt-4">
              The public site explains the product clearly, while private
              finance data stays behind secure authentication.
            </p>
          </motion.div>

          <div className="grid gap-3">
            {[
              "Dashboard stays protected for signed-in users only",
              "Landing page is public for visitors and search engines",
              "Login path is clean and easy to understand",
              "Design system is ready for full app polish",
            ].map((item, index) => (
              <motion.div
                key={item}
                {...(shouldReduceMotion ?
                  {}
                : {
                    initial: { opacity: 0, x: 16 },
                    whileInView: { opacity: 1, x: 0 },
                    viewport: { once: true },
                    transition: {
                      duration: 0.4,
                      delay: index * 0.05,
                      ease: premiumEase,
                    },
                  })}
                className="jf-card-soft flex items-start gap-3 p-4"
              >
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-bold leading-6 text-text-primary">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <motion.div
          {...revealProps}
          className="jf-card-premium mx-auto max-w-4xl p-6 text-center sm:p-10"
        >
          <div className="jf-icon-bubble mx-auto mb-5 h-14 w-14">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="jf-heading-lg mx-auto">
            Start building better money habits today.
          </h2>
          <p className="jf-copy mx-auto mt-4">
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
        </motion.div>
      </section>

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
    </main>
  );
}
