import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DESKTOP_MORE_NAV_GROUPS,
  DESKTOP_MORE_NAV_ITEMS,
  DESKTOP_PRIMARY_NAV_ITEMS,
  getActiveNavItem,
  getRouteGroup,
  getRouteTitle,
  isDesktopMoreActive,
  isNavItemActive,
  MOBILE_MORE_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_ITEMS,
  NAV_GROUPS,
  NAV_ITEMS,
} from "./navigation";

const expectedGroups = [
  { label: "Overview", items: ["Dashboard"] },
  {
    label: "Money",
    items: ["Transactions", "Accounts", "Income", "Expenses"],
  },
  { label: "Planning", items: ["Goals", "Payables"] },
  { label: "Growth", items: ["Investments"] },
  {
    label: "Intelligence",
    items: ["Analytics", "AI Insights", "Reports"],
  },
  { label: "Workspace", items: ["Settings"] },
];

const expectedRoutes = [
  ["Dashboard", "/dashboard"],
  ["Transactions", "/dashboard/transactions"],
  ["Accounts", "/dashboard/accounts"],
  ["Income", "/dashboard/income"],
  ["Expenses", "/dashboard/expenses"],
  ["Goals", "/dashboard/goals"],
  ["Payables", "/dashboard/payables"],
  ["Investments", "/dashboard/investments"],
  ["Analytics", "/dashboard/analytics"],
  ["AI Insights", "/dashboard/ai-insights"],
  ["Reports", "/dashboard/reports"],
  ["Settings", "/dashboard/settings"],
];

const expectedDesktopPrimaryRoutes = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/accounts",
  "/dashboard/income",
  "/dashboard/expenses",
  "/dashboard/analytics",
];

const expectedDesktopMoreGroups = [
  { label: "Planning", items: ["Goals", "Payables"] },
  { label: "Growth", items: ["Investments"] },
  { label: "Intelligence", items: ["AI Insights", "Reports"] },
  { label: "Workspace", items: ["Settings"] },
];

describe("dashboard navigation hierarchy", () => {
  it("uses the exact approved groups, order, and membership", () => {
    expect(
      NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.map((item) => item.label),
      })),
    ).toEqual(expectedGroups);
  });

  it("preserves the exact route membership", () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href])).toEqual(
      expectedRoutes,
    );
  });

  it("keeps styling out of navigation data", () => {
    for (const item of NAV_ITEMS) {
      expect(item).not.toHaveProperty("tone");
      expect(
        Object.values(item).some(
          (value) => typeof value === "string" && value.includes("text-"),
        ),
      ).toBe(false);
      expect(
        Object.values(item).some(
          (value) => typeof value === "string" && value.includes("bg-"),
        ),
      ).toBe(false);
    }
  });

  it("activates Dashboard only at the exact root", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavItemActive("/dashboard/transactions", "/dashboard")).toBe(
      false,
    );
    expect(isNavItemActive("/dashboarding", "/dashboard")).toBe(false);
  });

  it("activates nested feature routes and prefers the longest valid match", () => {
    expect(
      isNavItemActive(
        "/dashboard/transactions/receipt/abc",
        "/dashboard/transactions",
      ),
    ).toBe(true);
    expect(getActiveNavItem("/dashboard/accounts/example")?.label).toBe(
      "Accounts",
    );
  });

  it("rejects unrelated prefixes", () => {
    expect(
      isNavItemActive(
        "/dashboard/transactions-archive",
        "/dashboard/transactions",
      ),
    ).toBe(false);
    expect(isNavItemActive("/dashboard/goals-old", "/dashboard/goals")).toBe(
      false,
    );
  });

  it("resolves route titles and groups for nested routes", () => {
    expect(getRouteTitle("/dashboard/ai-insights/history")).toBe("AI Insights");
    expect(getRouteTitle("/dashboard/transactions/receipt-id")).toBe(
      "Transaction receipt",
    );
    expect(getRouteTitle("/dashboard/accounts/account-id")).toBe(
      "Account details",
    );
    expect(getRouteGroup("/dashboard/ai-insights/history")).toBe(
      "Intelligence",
    );
    expect(getRouteTitle("/dashboard/unknown")).toBe("Dashboard");
  });

  it("uses Dashboard, Transactions, and Accounts as mobile-primary routes", () => {
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Dashboard",
      "Transactions",
      "Accounts",
    ]);
  });

  it("uses the exact desktop-primary routes and order", () => {
    expect(DESKTOP_PRIMARY_NAV_ITEMS.map((item) => item.href)).toEqual(
      expectedDesktopPrimaryRoutes,
    );
  });

  it("places every remaining desktop route in More exactly once", () => {
    const primaryHrefs = new Set(expectedDesktopPrimaryRoutes);
    const expectedMoreHrefs = NAV_ITEMS.filter(
      (item) => !primaryHrefs.has(item.href),
    ).map((item) => item.href);
    const actualMoreHrefs = DESKTOP_MORE_NAV_ITEMS.map((item) => item.href);

    expect(actualMoreHrefs).toEqual(expectedMoreHrefs);
    expect(new Set(actualMoreHrefs).size).toBe(actualMoreHrefs.length);
    expect(
      DESKTOP_MORE_NAV_GROUPS.map((group) => ({
        label: group.label,
        items: group.items.map((item) => item.label),
      })),
    ).toEqual(expectedDesktopMoreGroups);
  });

  it("activates desktop More for nested owning routes only", () => {
    expect(isDesktopMoreActive("/dashboard/goals/example")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/payables/example")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/investments/example")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/ai-insights/history")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/reports/archive")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/settings/profile")).toBe(true);
    expect(isDesktopMoreActive("/dashboard/analytics")).toBe(false);
    expect(isDesktopMoreActive("/dashboard/goals-old")).toBe(false);
  });

  it("places every remaining route in More exactly once", () => {
    const primaryHrefs = new Set(
      MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href),
    );
    const expectedMoreHrefs = NAV_ITEMS.filter(
      (item) => !primaryHrefs.has(item.href),
    ).map((item) => item.href);
    const actualMoreHrefs = MOBILE_MORE_NAV_ITEMS.map((item) => item.href);

    expect(actualMoreHrefs).toEqual(expectedMoreHrefs);
    expect(new Set(actualMoreHrefs).size).toBe(actualMoreHrefs.length);
  });
});

describe("dashboard shell contracts", () => {
  const layoutSource = readFileSync(
    new URL("../app/dashboard/layout.tsx", import.meta.url),
    "utf8",
  );
  const responsiveHeaderSource = readFileSync(
    new URL(
      "../components/layout/ResponsiveDashboardHeader.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const headerSource = readFileSync(
    new URL("../components/layout/Header.tsx", import.meta.url),
    "utf8",
  );
  const mobileHeaderSource = readFileSync(
    new URL("../components/layout/MobileHeader.tsx", import.meta.url),
    "utf8",
  );
  const mobileNavSource = readFileSync(
    new URL("../components/layout/MobileNav.tsx", import.meta.url),
    "utf8",
  );
  const notificationCenterSource = readFileSync(
    new URL("../components/layout/NotificationCenter.tsx", import.meta.url),
    "utf8",
  );
  const jamalMenuSource = readFileSync(
    new URL("../components/layout/JamalMenu.tsx", import.meta.url),
    "utf8",
  );
  const globalsSource = readFileSync(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );
  const sidebarPath = new URL(
    "../components/layout/Sidebar.tsx",
    import.meta.url,
  );

  it("fully removes the desktop Sidebar architecture", () => {
    expect(layoutSource).not.toContain("Sidebar");
    expect(existsSync(sidebarPath)).toBe(false);
    for (const selector of [
      "jf-dashboard-sidebar-wrap",
      "jf-sidebar-link",
      "jf-sidebar-icon",
      "jf-sidebar-pill",
      "jf-sidebar-line",
      "data-desktop-sidebar",
    ]) {
      expect(globalsSource).not.toContain(selector);
    }
  });

  it("streams one shared notification promise into only the active header", () => {
    expect(layoutSource).toContain(
      "const notificationStatePromise = loadDashboardNotifications();",
    );
    expect(layoutSource).not.toContain("await loadDashboardNotifications()");
    expect(layoutSource).toContain(
      "statePromise={notificationStatePromise}",
    );
    expect(
      layoutSource.match(/notificationSlot={notificationSlot}/g) ?? [],
    ).toHaveLength(1);
    expect(
      responsiveHeaderSource.match(/notificationSlot={notificationSlot}/g) ??
        [],
    ).toHaveLength(2);
    expect(responsiveHeaderSource).toContain(
      'window.matchMedia("(min-width: 1024px)")',
    );
    expect(headerSource).toContain("{notificationSlot}");
    expect(mobileHeaderSource).toContain("{notificationSlot}");
    expect(`${headerSource}\n${mobileHeaderSource}`).not.toContain(
      "No new notifications",
    );
  });

  it("uses one minimal mobile header with a complete left navigation drawer", () => {
    expect(layoutSource).not.toContain("<MobileNav />");
    expect(mobileHeaderSource).toContain("<MobileNav />");
    expect(mobileHeaderSource).not.toContain("<JamalMenu");
    expect(mobileNavSource).toContain("data-mobile-navigation-drawer");
    expect(mobileNavSource).toContain('side="left"');
    expect(mobileNavSource).toContain("NAV_GROUPS.map");
    expect(mobileNavSource).toContain('<JamalMenu align="left"');
    expect(mobileNavSource).toContain('aria-label="Open navigation menu"');
    expect(mobileNavSource).toContain('aria-label="Close navigation menu"');
    expect(mobileNavSource).not.toContain("fixed inset-x");
  });

  it("guarantees a 44px notification loading and Retry target", () => {
    expect(notificationCenterSource).toContain(
      'aria-label="Loading current alerts"',
    );
    expect(notificationCenterSource).toContain('className="mt-4 min-h-11"');
  });

  it("uses accessible primitives for More and the profile menu", () => {
    expect(mobileNavSource).toContain("<Sheet");
    expect(mobileNavSource).not.toContain("AnimatePresence");
    expect(headerSource).toContain("<DropdownMenu>");
    expect(headerSource).toContain("<DropdownMenuTrigger");
    expect(headerSource).toContain("DESKTOP_MORE_NAV_GROUPS");
    expect(jamalMenuSource).toContain("<DropdownMenu");
    expect(headerSource).not.toContain('role="dialog"');
    expect(jamalMenuSource).not.toContain('role="dialog"');
  });

  it("keeps the profile identity label inside a valid dropdown group", () => {
    const identityGroup = jamalMenuSource.match(
      /<DropdownMenuGroup>\s*<DropdownMenuLabel[\s\S]*?<\/DropdownMenuLabel>\s*<\/DropdownMenuGroup>/,
    );

    expect(jamalMenuSource).toContain("DropdownMenuGroup,");
    expect(identityGroup).not.toBeNull();
    expect(jamalMenuSource).not.toContain('role="dialog"');
    expect(jamalMenuSource).not.toContain("AnimatePresence");
    expect(jamalMenuSource).toContain('router.push("/dashboard/settings")');
    expect(jamalMenuSource).toContain("Settings");
    expect(jamalMenuSource).toContain("Sign Out");
    expect(jamalMenuSource).toMatch(
      /<DropdownMenuItem\s+variant="destructive"[\s\S]*?Sign Out[\s\S]*?<\/DropdownMenuItem>/,
    );
  });

  it("contains shared profile request failures before effects consume them", () => {
    const sharedProfileRequest = jamalMenuSource.match(
      /profileRequest = supabase\.auth[\s\S]*?return profileRequest;/,
    )?.[0];

    expect(sharedProfileRequest).toBeDefined();
    expect(sharedProfileRequest).toContain("if (error) throw error;");
    expect(sharedProfileRequest).toContain(".catch(() => {");
    expect(sharedProfileRequest).toContain("profileRequest = null;");
    expect(jamalMenuSource).not.toContain("console.");
  });

  it("uses accessible desktop menus and one transaction search control", () => {
    expect(headerSource).toContain("DESKTOP_PRIMARY_NAV_ITEMS.map");
    expect(headerSource).toContain("DESKTOP_NAV_MENU_ENTRIES");
    expect(headerSource).toContain('action: "add-income"');
    expect(headerSource).toContain('action: "add-expense"');
    expect(headerSource).toContain(
      'aria-label="Desktop dashboard navigation"',
    );
    expect(headerSource.match(/<DropdownMenu(?=[\s>])/g) ?? []).toHaveLength(2);

    const sheetSearchCount = (headerSource.match(/<Sheet(?=[\s>])/g) ?? [])
      .length;
    const hasInlineSearch = headerSource.includes(
      'id="desktop-inline-transaction-search"',
    );
    expect(sheetSearchCount === 1 || hasInlineSearch).toBe(true);

    expect(headerSource).toContain('"Open transaction search"');
    expect(headerSource).toContain('"Close transaction search"');
    expect(headerSource).toContain(
      'aria-label="Open more dashboard navigation"',
    );
    expect(headerSource).not.toContain(">Pages<");
  });

  it("shows focus treatment only for keyboard-visible focus", () => {
    expect(globalsSource).toContain("-webkit-tap-highlight-color: transparent");
    expect(globalsSource).toContain(".finance-focus:focus-visible");
    expect(globalsSource).not.toContain(
      ":where(.finance-control, .finance-focus):focus-within",
    );
  });
});
