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
    <div className="relative z-30 flex h-[70px] flex-shrink-0 items-center justify-around border-t border-white/[0.10] bg-[#171a21]/92 px-2 shadow-[0_-14px_42px_rgba(0,0,0,0.24)] backdrop-blur-2xl lg:hidden">
      {NAV.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={`finance-focus flex min-w-14 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 transition-colors ${
            isActive(href)
              ? "bg-white/[0.10] text-white"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </Link>
      ))}
    </div>
  );
}
