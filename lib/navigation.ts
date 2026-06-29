import {
  ArrowRightLeft,
  BarChart3,
  Bot,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  LucideIcon,
  Settings,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
  mobilePrimary?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        tone: "text-text-primary bg-surface-secondary",
        mobilePrimary: true,
      },
      {
        label: "Transactions",
        href: "/dashboard/transactions",
        icon: ArrowRightLeft,
        tone: "text-violet-300 bg-violet-500/15",
        mobilePrimary: true,
      },
      {
        label: "Accounts",
        href: "/dashboard/accounts",
        icon: WalletCards,
        tone: "text-sky-300 bg-sky-500/15",
        mobilePrimary: true,
      },
    ],
  },
  {
    label: "Money Flow",
    items: [
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
        icon: CreditCard,
        tone: "text-amber-300 bg-amber-500/15",
      },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        label: "Goals",
        href: "/dashboard/goals",
        icon: Target,
        tone: "text-orange-300 bg-orange-500/15",
      },
      {
        label: "Investments",
        href: "/dashboard/investments",
        icon: CircleDollarSign,
        tone: "text-purple-300 bg-purple-500/15",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        tone: "text-blue-300 bg-blue-500/15",
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
        tone: "text-cyan-300 bg-cyan-500/15",
      },
      {
        label: "AI Insights",
        href: "/dashboard/ai-insights",
        icon: Bot,
        tone: "text-indigo-300 bg-indigo-500/15",
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        tone: "text-slate-300 bg-slate-500/15",
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const MOBILE_PRIMARY_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => item.mobilePrimary,
);

export const MOBILE_MORE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !item.mobilePrimary,
);

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}
