import type { Metadata } from "next";

import { APP_NAME } from "@/lib/brand";

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
