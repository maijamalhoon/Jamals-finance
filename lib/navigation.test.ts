import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  getActiveNavItem,
  getRouteGroup,
  getRouteTitle,
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
      expect(Object.values(item).some((value) => typeof value === "string" && value.includes("text-"))).toBe(false);
      expect(Object.values(item).some((value) => typeof value === "string" && value.includes("bg-"))).toBe(false);
    }
  });

  it("activates Dashboard only at the exact root", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavItemActive("/dashboard/transactions", "/dashboard")).toBe(false);
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
  const jamalMenuSource = readFileSync(
    new URL("../components/layout/JamalMenu.tsx", import.meta.url),
    "utf8",
  );

  it("mounts Sidebar in the authenticated dashboard layout", () => {
    expect(layoutSource).toContain("<Sidebar />");
  });

  it("uses one shared NotificationCenter from both headers", () => {
    expect(headerSource).toContain("<NotificationCenter");
    expect(mobileHeaderSource).toContain("<NotificationCenter");
    expect(`${headerSource}\n${mobileHeaderSource}`).not.toContain(
      "No new notifications",
    );
  });

  it("uses accessible primitives for More and the profile menu", () => {
    expect(mobileNavSource).toContain("<Sheet");
    expect(mobileNavSource).not.toContain("AnimatePresence");
    expect(jamalMenuSource).toContain("<DropdownMenu");
    expect(jamalMenuSource).not.toContain('role="dialog"');
  });

  it("removes duplicated desktop primary navigation from Header", () => {
    expect(headerSource).not.toContain("DESKTOP_PRIMARY_NAV_ITEMS");
    expect(headerSource).not.toContain("DESKTOP_SECONDARY_NAV_ITEMS");
    expect(headerSource).not.toContain(">Pages<");
  });
});
