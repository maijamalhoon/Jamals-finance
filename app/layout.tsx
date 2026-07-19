import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./icon-system.css";
import "./finance-form-unification.css";
import "./finance-form-theme-refinement.css";
import "./finance-form-final-polish.css";
import "./finance-form-content-fit.css";
import "./auth-clean.css";
import "./auth-clean-fixes.css";
import "./light-background-tuning.css";
import "./interaction-lock.css";
import "./auth-control-alignment.css";
// Authentication-only responsive layer; kept after legacy auth corrections.
import "./auth-responsive-architecture.css";
import "./scrollbar-visibility.css";
import "./public-icon-surface-cleanup.css";
import { Toaster } from "sonner";
import MotionProvider from "@/components/motion/MotionProvider";
import { CURRENCY_STORAGE_KEY } from "@/lib/currency";
import ChartTooltipAutoDismiss from "@/components/charts/ChartTooltipAutoDismiss";
import PWARegister from "./pwa-register";
import {
  THEME_BOOTSTRAP_SCRIPT,
  THEME_VIEWPORT_COLORS,
} from "@/lib/theme";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const siteUrl = "https://jamals-finance-sable.vercel.app";

const CURRENCY_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const key = ${JSON.stringify(CURRENCY_STORAGE_KEY)};
    const saved = window.localStorage.getItem(key);
    if (saved !== "PKR" && saved !== "USD") return;

    const cookieEntry = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(key + "="));
    const cookieValue = cookieEntry
      ? decodeURIComponent(cookieEntry.slice(key.length + 1))
      : null;
    const syncKey = key + "-cookie-sync";

    if (cookieValue === saved) {
      window.sessionStorage.removeItem(syncKey);
      return;
    }

    if (window.sessionStorage.getItem(syncKey) === saved) return;

    window.sessionStorage.setItem(syncKey, saved);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = key + "=" + encodeURIComponent(saved) + "; Path=/; Max-Age=31536000; SameSite=Lax" + secure;
    window.location.replace(window.location.href);
  } catch {}
})();
`;

const INTERACTION_LOCK_SCRIPT = `
(() => {
  try {
    const marker = "__jfInteractionLockInstalled";
    if (window[marker]) return;
    window[marker] = true;

    const preventNativeInteraction = (event) => event.preventDefault();

    document.addEventListener("contextmenu", preventNativeInteraction, {
      capture: true,
    });
    document.addEventListener("dragstart", preventNativeInteraction, {
      capture: true,
    });
    document.addEventListener("selectstart", preventNativeInteraction, {
      capture: true,
    });
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button === 2) event.preventDefault();
      },
      { capture: true },
    );
  } catch {}
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Jamal's Finance — Calm Personal Finance Workspace",
    template: "%s — Jamal's Finance",
  },
  verification: {
    google: "W-UmHqy2sJyd2xbsdPdPeqJLOhLS2cf_aszWJf15aMk",
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
    title: "Jamal's Finance — Calm Personal Finance Workspace",
    description:
      "Track accounts, expenses, income, goals, liabilities, investments, and savings in one secure personal finance workspace.",
    url: "/",
    siteName: "Jamal's Finance",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jamal's Finance — Calm Personal Finance Workspace",
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
  themeColor: THEME_VIEWPORT_COLORS.light,
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
            __html: THEME_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: CURRENCY_BOOTSTRAP_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: INTERACTION_LOCK_SCRIPT,
          }}
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <MotionProvider>
          {children}
          <ChartTooltipAutoDismiss />
          <PWARegister />
          <Toaster
            position="top-right"
            toastOptions={{
              classNames: {
                toast: "theme-toast",
              },
            }}
          />
        </MotionProvider>
      </body>
    </html>
  );
}
