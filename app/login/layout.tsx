import type { Metadata } from "next";

import { APP_NAME } from "@/lib/brand";

import "../auth-clean.css";
import "../auth-clean-fixes.css";
import "../auth-control-alignment.css";
import "../auth-responsive-architecture.css";
import "../auth-adornment-alignment-fix.css";
import "../auth-action-runtime.css";

export const metadata: Metadata = {
  title: "Account access",
  description: `Sign in, create an account, or recover access to ${APP_NAME}.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
