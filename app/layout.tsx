import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import MotionProvider from "@/components/motion/MotionProvider";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import PWARegister from "./pwa-register";
import { THEME_STORAGE_KEY } from "@/lib/theme";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteUrl = "https://jamals-finance-sable.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jamal's Finance — Premium Personal Finance Dashboard",
    template: "%s — Jamal's Finance",
  },
  description:
    "Track accounts, expenses, income, goals, liabilities, investments, and savings in one secure personal finance workspace.",
  applicationName: "Jamal's Finance",
  keywords: [
    "personal finance dashboard",
    "finance tracker",
    "expense tracker",
    "income tracker",
    "budget dashboard",
    "savings goals",
    "money management app",
    "finance management",
    "Jamal's Finance",
  ],
  authors: [{ name: "Jamal Yaqoob" }],
  creator: "Jamal Yaqoob",
  publisher: "Jamal's Finance",
  category: "Finance",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Jamal's Finance — Premium Personal Finance Dashboard",
    description:
      "Track accounts, expenses, income, goals, liabilities, investments, and savings in one secure personal finance workspace.",
    url: "/",
    siteName: "Jamal's Finance",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jamal's Finance — Premium Personal Finance Dashboard",
    description:
      "Track accounts, expenses, income, goals, liabilities, investments, and savings in one secure personal finance workspace.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fc" },
    { media: "(prefers-color-scheme: dark)", color: "#090c11" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
try {
  var savedTheme = localStorage.getItem("${THEME_STORAGE_KEY}");
  var theme = savedTheme === "light" || savedTheme === "dark" || savedTheme === "system" ? savedTheme : "system";
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  var shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", shouldUseDark);
  document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  document.documentElement.dataset.themePreference = theme;
  document.documentElement.dataset.theme = shouldUseDark ? "dark" : "light";
} catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <MotionProvider>
          <CurrencyProvider>
            {children}
            <PWARegister />
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: {
                  toast: "theme-toast",
                },
              }}
            />
          </CurrencyProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
