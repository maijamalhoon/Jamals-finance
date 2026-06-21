"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Target,
  WalletCards,
} from "lucide-react";

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

  function isActive(href: string) {
    return (
      pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
    );
  }

  return (
    <div className="relative z-30 flex h-[74px] flex-shrink-0 items-center justify-around border-t border-border bg-surface px-2 shadow-theme lg:hidden">
      {NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={`finance-focus relative flex min-w-14 flex-col items-center gap-1 rounded-[14px] px-2 py-1.5 transition-all hover:-translate-y-px active:translate-y-0 active:scale-[0.99] ${
            isActive(href)
              ? "bg-hover text-active"
              : "text-text-secondary hover:bg-hover hover:text-text-primary"
          }`}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </Link>
      ))}
    </div>
  );
}
