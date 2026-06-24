import {
  ArrowLeftRight,
  BarChart2,
  BarChart3,
  HandCoins,
  LayoutDashboard,
  LucideIcon,
  Target,
  Wallet,
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
    icon: ArrowLeftRight,
    tone: "text-violet-300 bg-violet-500/15",
  },
  {
    label: "Payables",
    href: "/dashboard/payables",
    icon: HandCoins,
    tone: "text-amber-300 bg-amber-500/15",
  },
  {
    label: "Investment Overview",
    href: "/dashboard/investments",
    icon: BarChart2,
    tone: "text-amber-300 bg-amber-500/15",
  },
  {
    label: "Accounts",
    href: "/dashboard/accounts",
    icon: Wallet,
    tone: "text-sky-300 bg-sky-500/15",
  },
  {
    label: "Goals",
    href: "/dashboard/goals",
    icon: Target,
    tone: "text-lime-300 bg-lime-500/15",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    tone: "text-blue-300 bg-blue-500/15",
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
