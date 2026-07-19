import type { Metadata } from "next";
import LandingScrollReveal from "@/components/landing/LandingScrollReveal";
import MathSymbolField from "@/components/landing/MathSymbolField";
import PremiumLandingPage from "@/components/landing/PremiumLandingPage";

import "./landing-polish.css";
import "./landing-preview.css";
import "./landing-sections.css";
import "./landing-responsive.css";
import "./landing-math-symbols.css";
import "./landing-icon-typography.css";
import "./landing-header-rounded.css";

// Public landing entry: all layout, preview, section, responsive, motion, and type layers load here.
export const metadata: Metadata = {
  title: "Jamal's Finance - Clear Personal Finance Tracking",
  description:
    "Track income, expenses, accounts, goals, payables, investments, reports, and insights in one focused personal finance workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Jamal's Finance - Clear Personal Finance Tracking",
    description:
      "A focused personal finance workspace for daily tracking, clearer reports, goals, investments, and more confident decisions.",
    url: "/",
    siteName: "Jamal's Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jamal's Finance - Clear Personal Finance Tracking",
    description:
      "See your money clearly across phone, tablet, laptop, and desktop.",
  },
};

export default function HomePage() {
  return (
    <>
      <LandingScrollReveal />
      <PremiumLandingPage />
      <MathSymbolField />
    </>
  );
}
