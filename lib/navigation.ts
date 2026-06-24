import {
  ArrowRightLeft,
  BarChart3,
  LayoutDashboard,
  LucideIcon,
  WalletCards,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    tone: "text-text-primary bg-surface-secondary",
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowRightLeft,
    tone: "text-violet-300 bg-violet-500/15",
  },
  {
    label: "Accounts",
    href: "/dashboard/accounts",
    icon: WalletCards,
    tone: "text-sky-300 bg-sky-500/15",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    tone: "text-blue-300 bg-blue-500/15",
  },
];

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/investments") ||
      pathname.startsWith("/dashboard/goals")
    );
  }

  if (href === "/dashboard/settings") {
    return pathname === href || pathname.startsWith("/dashboard/payables");
  }

  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
