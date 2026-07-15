import {
  ArrowRightLeft,
  BarChart3,
  Bot,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  LayoutDashboard,
  type LucideIcon,
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
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Transactions",
        href: "/dashboard/transactions",
        icon: ArrowRightLeft,
      },
      {
        label: "Accounts",
        href: "/dashboard/accounts",
        icon: WalletCards,
      },
      {
        label: "Income",
        href: "/dashboard/income",
        icon: TrendingUp,
      },
      {
        label: "Expenses",
        href: "/dashboard/expenses",
        icon: TrendingDown,
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
      },
      {
        label: "Payables",
        href: "/dashboard/payables",
        icon: CreditCard,
      },
    ],
  },
  {
    label: "Growth",
    items: [
      {
        label: "Investments",
        href: "/dashboard/investments",
        icon: CircleDollarSign,
      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      {
        label: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
      {
        label: "AI Insights",
        href: "/dashboard/ai-insights",
        icon: Bot,
      },
      {
        label: "Reports",
        href: "/dashboard/reports",
        icon: FileBarChart,
      },
    ],
  },
  {
    label: "Workspace",
    items: [
      {
        label: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

const MOBILE_PRIMARY_HREFS = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/accounts",
] as const;

const mobilePrimaryHrefSet = new Set<string>(MOBILE_PRIMARY_HREFS);

export const MOBILE_PRIMARY_NAV_ITEMS = MOBILE_PRIMARY_HREFS.map(
  (href) => NAV_ITEMS.find((item) => item.href === href)!,
);

export const MOBILE_MORE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !mobilePrimaryHrefSet.has(item.href),
);

export const MOBILE_MORE_NAV_GROUPS: NavGroup[] = NAV_GROUPS.map((group) => ({
  ...group,
  items: group.items.filter((item) => !mobilePrimaryHrefSet.has(item.href)),
})).filter((group) => group.items.length > 0);

function normalizePathname(pathname: string) {
  const cleanPathname = pathname.split(/[?#]/, 1)[0] || "/";
  return cleanPathname.length > 1 && cleanPathname.endsWith("/")
    ? cleanPathname.slice(0, -1)
    : cleanPathname;
}

export function isNavItemActive(pathname: string, href: string) {
  const normalizedPathname = normalizePathname(pathname);
  const normalizedHref = normalizePathname(href);

  if (normalizedHref === "/dashboard") {
    return normalizedPathname === normalizedHref;
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

export function getActiveNavItem(pathname: string) {
  return [...NAV_ITEMS]
    .sort((left, right) => right.href.length - left.href.length)
    .find((item) => isNavItemActive(pathname, item.href));
}

export function getRouteTitle(pathname: string) {
  return getActiveNavItem(pathname)?.label ?? "Dashboard";
}

export function getRouteGroup(pathname: string) {
  const activeItem = getActiveNavItem(pathname);
  if (!activeItem) return "Overview";

  return (
    NAV_GROUPS.find((group) =>
      group.items.some((item) => item.href === activeItem.href),
    )?.label ?? "Overview"
  );
}
