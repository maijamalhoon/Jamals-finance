import type { Metadata } from "next";
import PremiumLandingPage from "@/components/landing/PremiumLandingPage";

import "./landing-enhancements.css";

export const metadata: Metadata = {
  title: "Jamal's Finance - Calm Personal Finance Workspace",
  description:
    "Track accounts, income, expenses, goals, liabilities, investments, reports, and AI insights in a private mobile-first finance workspace.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Jamal's Finance - Calm Personal Finance Workspace",
    description:
      "A private personal finance workspace for daily money tracking, dashboard insights, goals, reports, and AI-powered clarity.",
    url: "/",
    siteName: "Jamal's Finance",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jamal's Finance - Calm Personal Finance Workspace",
    description:
      "Track your whole money life in one private, mobile-first finance dashboard.",
  },
};

export default function HomePage() {
  return <PremiumLandingPage />;
}
