"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  Globe2,
  LockKeyhole,
  PieChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
  Zap,
} from "lucide-react";

const ease = [0.16, 1, 0.3, 1] as const;

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease,
    },
  },
};

const features = [
  {
    icon: WalletCards,
    title: "All accounts in one place",
    text: "Track cash, bank, wallets, savings, and business money without messy spreadsheets.",
  },
  {
    icon: CreditCard,
    title: "Smart transactions",
    text: "Record income, expenses, transfers, liabilities, and payments with a clean finance flow.",
  },
  {
    icon: PieChart,
    title: "Clear money insights",
    text: "Understand where your money goes with summaries, categories, and visual breakdowns.",
  },
  {
    icon: TrendingUp,
    title: "Goals and growth",
    text: "Plan savings goals, investments, and future financial targets with confidence.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Built with secure authentication, row-level access, and user-specific finance data.",
  },
  {
    icon: Globe2,
    title: "Ready for global users",
    text: "A premium foundation for freelancers, families, founders, and finance-conscious users.",
  },
];

const stats = [
  { label: "Finance modules", value: "8+" },
  { label: "Clean dashboard", value: "100%" },
  { label: "Private workspace", value: "Secure" },
];

const previewRows = [
  { label: "Income", value: "+$4,280", tone: "text-success" },
  { label: "Expenses", value: "-$1,940", tone: "text-danger" },
  { label: "Savings", value: "$2,340", tone: "text-active" },
];

export default function RootPage() {
  return (
    <main className="chat-auth-shell min-h-dvh overflow-hidden">
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
              <BarChart3 className="h-5 w-5 text-active" />
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
              className="finance-focus rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
            >
              Features
            </a>
            <a
              href="#security"
              className="finance-focus rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
            >
              Security
            </a>
            <a
              href="#global"
              className="finance-focus rounded-xl px-3 py-2 text-sm font-medium text-text-secondary hover:bg-hover hover:text-text-primary"
            >
              Global
            </a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="finance-focus hidden rounded-2xl px-4 py-2 text-sm font-semibold text-text-secondary hover:bg-hover hover:text-text-primary sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="primary-action min-h-10 rounded-2xl px-4"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:pb-24 lg:pt-20">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left"
        >
          <motion.div
            variants={fadeUp}
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-semibold text-text-secondary shadow-theme lg:mx-0"
          >
            <Sparkles className="h-4 w-4 text-active" />
            Premium finance dashboard for smarter money control
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-bold tracking-[-0.04em] text-text-primary sm:text-5xl lg:text-7xl"
          >
            Manage your money with clarity, speed, and confidence.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-5 max-w-xl text-base leading-8 text-text-secondary sm:text-lg lg:mx-0"
          >
            Jamal&apos;s Finance helps you track accounts, expenses, income,
            goals, liabilities, and savings in one clean premium workspace —
            built to feel smooth on every device.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start"
          >
            <Link href="/login" className="chat-auth-button sm:w-auto sm:px-6">
              Start your finance workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="chat-auth-secondary sm:w-auto sm:px-6"
            >
              Explore features
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-7 flex flex-col items-center gap-3 text-sm text-text-secondary sm:flex-row sm:justify-center lg:justify-start"
          >
            {["No spreadsheet mess", "Smooth mobile UI", "Secure login"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  {item}
                </span>
              ),
            )}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, ease }}
          className="relative mx-auto w-full max-w-xl"
        >
          <div className="absolute -inset-4 rounded-[34px] bg-active/10 blur-2xl" />

          <div className="finance-panel relative overflow-hidden rounded-[30px] p-4 sm:p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">
                  Live preview
                </p>
                <h2 className="mt-1 text-xl font-bold text-text-primary">
                  Personal dashboard
                </h2>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-surface-secondary">
                <LockKeyhole className="h-5 w-5 text-active" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[22px] border border-border bg-surface-secondary p-4"
                >
                  <p className="text-2xl font-bold text-text-primary">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-text-secondary">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-card p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Monthly flow
                  </p>
                  <p className="text-xs text-text-secondary">
                    Clean view of money movement
                  </p>
                </div>
                <span className="finance-state-pill">Demo</span>
              </div>

              <div className="flex h-36 items-end gap-3">
                {[42, 68, 48, 78, 62, 88, 72].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{
                      delay: 0.25 + index * 0.06,
                      duration: 0.55,
                      ease,
                    }}
                    className="flex-1 rounded-t-2xl bg-active/20"
                  >
                    <div className="h-full rounded-t-2xl bg-active/70" />
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {previewRows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-[20px] border border-border bg-surface-secondary px-4 py-3"
                >
                  <span className="text-sm font-medium text-text-secondary">
                    {row.label}
                  </span>
                  <span className={`text-sm font-bold ${row.tone}`}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-sm font-semibold text-active"
          >
            Built for daily money control
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl"
          >
            Everything important, without the clutter.
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mt-4 leading-7 text-text-secondary"
          >
            A clean finance experience that feels simple for beginners and
            powerful enough for serious users.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={container}
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <motion.div
                key={feature.title}
                variants={fadeUp}
                className="finance-panel finance-panel-interactive p-5"
              >
                <div className="finance-icon-bubble mb-5 h-12 w-12">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {feature.text}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      <section
        id="security"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="finance-panel grid gap-8 overflow-hidden rounded-[30px] p-5 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <div className="finance-icon-bubble mb-5 h-13 w-13">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl">
              Private finance space for real users.
            </h2>
            <p className="mt-4 leading-8 text-text-secondary">
              Your finance app should feel premium, but it should also feel
              safe. This landing page keeps the public product clean while the
              dashboard remains protected behind login.
            </p>
          </motion.div>

          <div className="grid gap-3">
            {[
              "Dashboard stays protected for signed-in users only",
              "Landing page is public for visitors and search engines",
              "Clear login path without confusing redirects",
              "Clean UI system matching the existing login screen",
            ].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: index * 0.06, duration: 0.45, ease }}
                className="flex items-start gap-3 rounded-[20px] border border-border bg-surface-secondary p-4"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                <span className="text-sm font-medium leading-6 text-text-primary">
                  {item}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="global"
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Fast first impression",
              text: "Visitors instantly understand the product instead of being pushed directly to login.",
            },
            {
              icon: Globe2,
              title: "Global product feel",
              text: "Premium copy, clean spacing, and polished animations make the app feel ready for wider users.",
            },
            {
              icon: BarChart3,
              title: "Finance-first design",
              text: "The visuals speak the product language: accounts, flow, insights, savings, and control.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, ease }}
                className="finance-panel p-5"
              >
                <Icon className="mb-5 h-6 w-6 text-active" />
                <h3 className="text-lg font-bold text-text-primary">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-text-secondary">
                  {item.text}
                </p>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, ease }}
          className="mx-auto max-w-4xl rounded-[32px] border border-border bg-card p-6 text-center shadow-theme sm:p-10"
        >
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-3xl border border-border bg-surface-secondary">
            <Sparkles className="h-6 w-6 text-active" />
          </div>
          <h2 className="text-3xl font-bold tracking-[-0.03em] text-text-primary sm:text-4xl">
            Start building better money habits today.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl leading-8 text-text-secondary">
            Create your workspace, connect your finance routine, and turn daily
            money tracking into a clean premium experience.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/login" className="chat-auth-button sm:w-auto sm:px-7">
              Open Jamal&apos;s Finance
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="chat-auth-secondary sm:w-auto sm:px-7"
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
            <Link href="/login" className="hover:text-text-primary">
              Sign in
            </Link>
            <a href="#features" className="hover:text-text-primary">
              Features
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
