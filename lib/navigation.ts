import {
  ArrowLeftRight,
  BarChart2,
  FileText,
  HandCoins,
  LayoutDashboard,
  LucideIcon,
  PiggyBank,
  ReceiptText,
  Target,
  TrendingDown,
  TrendingUp,
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
    label: "Income",
    href: "/dashboard/income",
    icon: TrendingUp,
    tone: "text-emerald-300 bg-emerald-500/15",
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: TrendingDown,
    tone: "text-rose-300 bg-rose-500/15",
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
    label: "Reports",
    href: "/dashboard/reports",
    icon: FileText,
    tone: "text-orange-300 bg-orange-500/15",
  },
];

export const QUICK_ACTION_ITEMS = [
  {
    label: "Income",
    href: "/dashboard/income",
    icon: TrendingUp,
    tone: "text-emerald-300 bg-emerald-500/15",
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    icon: TrendingDown,
    tone: "text-rose-300 bg-rose-500/15",
  },
  {
    label: "Savings",
    href: "/dashboard/goals",
    icon: PiggyBank,
    tone: "text-lime-300 bg-lime-500/15",
  },
  {
    label: "Bills",
    href: "/dashboard/transactions?search=bill",
    icon: ReceiptText,
    tone: "text-orange-300 bg-orange-500/15",
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
