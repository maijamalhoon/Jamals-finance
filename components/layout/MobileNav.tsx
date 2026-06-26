"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Target,
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
  { label: "Goals", href: "/dashboard/goals", icon: Target },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="jf-mobile-nav-shell fixed inset-x-3 bottom-3 z-50 lg:hidden"
    >
      <div className="grid grid-cols-4 gap-1 rounded-[26px] border border-border/80 bg-card/94 p-1.5 shadow-theme backdrop-blur-2xl supports-[backdrop-filter]:bg-card/82">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = isNavItemActive(pathname, href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`finance-focus relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-1.5 text-[10px] font-bold transition active:scale-[0.98] ${
                active ?
                  "bg-active text-background shadow-[0_14px_28px_rgba(59,130,246,0.22)]"
                : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
              }`}
            >
              {active ?
                <span className="absolute inset-x-5 -top-1 h-1 rounded-full bg-background/80" />
              : null}
              <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="max-w-full truncate leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
