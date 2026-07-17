import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account access",
  description: "Sign in, create an account, or recover access to Jamal's Finance.",
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
