"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  LayoutDashboard,
  WalletCards,
} from "lucide-react";
import { isNavItemActive } from "@/lib/navigation";

const NAV = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { label: "Accounts", href: "/dashboard/accounts", icon: WalletCards },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="relative z-30 grid h-[76px] flex-shrink-0 grid-cols-3 gap-1 border-t border-border bg-surface px-2 py-2 shadow-theme lg:hidden"
    >
      {NAV.map(({ label, href, icon: Icon }) => {
        const active = isNavItemActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`finance-focus group relative isolate flex min-w-0 flex-col items-center justify-center gap-1 overflow-visible rounded-[16px] px-2 py-1.5 transition-all active:scale-[0.99] ${
              active
                ? "text-active"
                : "text-text-secondary hover:bg-hover hover:text-text-primary"
            }`}
          >
            {active && (
              <motion.span
                layoutId="mobile-nav-active-pill"
                className="pointer-events-none absolute inset-[3px] rounded-[14px] border border-border bg-hover shadow-[var(--shadow)]"
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <Icon
              size={20}
              strokeWidth={2.15}
              className="relative z-10 transition-transform duration-200 group-hover:-translate-y-0.5"
            />
            <span className="relative z-10 truncate text-[10px] font-semibold leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
