import { getPricingTier } from "./catalog";
import type {
  BillingCycle,
  BusinessPlanDefinition,
  BusinessPlanKey,
  BusinessRegionalPlanPrices,
  PricedBusinessPlanKey,
  PricingTierKey,
} from "./types";

export const BUSINESS_TRIAL_LENGTH_DAYS = 14;

export const BUSINESS_PLAN_ORDER: BusinessPlanKey[] = [
  "business_free",
  "solo",
  "starter",
  "growth",
  "scale",
  "enterprise",
];

export const BUSINESS_PLANS: Record<BusinessPlanKey, BusinessPlanDefinition> = {
  business_free: {
    key: "business_free",
    name: "Business Free",
    description: "Create one business workspace and prepare its core records before upgrading.",
    includedSeats: 1,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      ai_insights: 0,
    },
  },
  solo: {
    key: "solo",
    name: "Solo",
    description: "For a one-person business, freelancer, shop owner, or independent professional.",
    includedSeats: 2,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: false,
      inventory_ready: true,
      crm_ready: true,
      ai_insights: 20,
    },
  },
  starter: {
    key: "starter",
    name: "Starter",
    description: "For a small team that needs shared operations, controls, and optional industry modules.",
    includedSeats: 5,
    includedBranches: 1,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      approval_workflows: true,
      ai_insights: 50,
    },
  },
  growth: {
    key: "growth",
    name: "Growth",
    description: "For a growing company with departments, branches, automation, and deeper reporting.",
    includedSeats: 15,
    includedBranches: 3,
    recommended: true,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
      ai_insights: 150,
    },
  },
  scale: {
    key: "scale",
    name: "Scale",
    description: "For a large company that needs stronger governance, API access, and many operating teams.",
    includedSeats: 50,
    includedBranches: 10,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
      api_access: true,
      priority_support: true,
      ai_insights: 500,
    },
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    description: "For groups of companies requiring custom seats, consolidated billing, and contract controls.",
    includedSeats: null,
    includedBranches: null,
    customPricing: true,
    features: {
      business_core: true,
      invoicing: true,
      expenses: true,
      contacts: true,
      basic_reports: true,
      advanced_reports: true,
      inventory_ready: true,
      crm_ready: true,
      branch_management: true,
      department_controls: true,
      approval_workflows: true,
      audit_log: true,
      api_access: true,
      consolidated_reporting: true,
      priority_support: true,
      ai_insights: 2000,
    },
  },
};

export const BUSINESS_REGIONAL_PRICES: Record<
  PricingTierKey,
  BusinessRegionalPlanPrices
> = {
  A: {
    solo: { monthly: 7.99, annual: 72 },
    starter: { monthly: 19.99, annual: 180 },
    growth: { monthly: 59, annual: 540 },
    scale: { monthly: 149, annual: 1380 },
  },
  B: {
    solo: { monthly: 6.99, annual: 60 },
    starter: { monthly: 16.99, annual: 144 },
    growth: { monthly: 49, annual: 420 },
    scale: { monthly: 119, annual: 1080 },
  },
  C: {
    solo: { monthly: 4.99, annual: 45 },
    starter: { monthly: 12.99, annual: 108 },
    growth: { monthly: 39, annual: 336 },
    scale: { monthly: 99, annual: 900 },
  },
  D: {
    solo: { monthly: 3.99, annual: 36 },
    starter: { monthly: 9.99, annual: 84 },
    growth: { monthly: 29, annual: 252 },
    scale: { monthly: 79, annual: 720 },
  },
  E: {
    solo: { monthly: 2.99, annual: 27 },
    starter: { monthly: 7.99, annual: 66 },
    growth: { monthly: 22, annual: 192 },
    scale: { monthly: 59, annual: 540 },
  },
};

export const BUSINESS_MODULES = [
  {
    code: "retail_pos",
    name: "Retail & POS",
    description: "Point-of-sale workflows for shops and retail operations.",
  },
  {
    code: "dealership",
    name: "Dealership",
    description: "Stock units, deals, commissions, and dealership operations.",
  },
  {
    code: "inventory",
    name: "Advanced Inventory",
    description: "Warehouses, stock controls, purchasing, and movement history.",
  },
  {
    code: "crm",
    name: "CRM",
    description: "Leads, customers, opportunities, and follow-up workflows.",
  },
  {
    code: "payroll",
    name: "Payroll",
    description: "Employees, pay cycles, allowances, and payroll controls.",
  },
  {
    code: "manufacturing",
    name: "Manufacturing",
    description: "Production, materials, work orders, and costing foundations.",
  },
  {
    code: "construction",
    name: "Construction",
    description: "Projects, sites, contractors, budgets, and progress tracking.",
  },
  {
    code: "advanced_accounting",
    name: "Advanced Accounting",
    description: "Stronger controls, closing workflows, and advanced statements.",
  },
  {
    code: "consolidated_reporting",
    name: "Consolidated Reporting",
    description: "Group-level reporting across connected companies.",
  },
] as const;

export type BusinessModuleCode = (typeof BUSINESS_MODULES)[number]["code"];

export function businessPlanKeyFromPlanCode(
  planCode: string,
): BusinessPlanKey | null {
  if (planCode === "business_free") return "business_free";
  if (planCode === "enterprise_contract" || planCode === "enterprise") {
    return "enterprise";
  }

  for (const planKey of ["solo", "starter", "growth", "scale"] as const) {
    if (planCode === planKey || planCode.startsWith(`${planKey}_`)) {
      return planKey;
    }
  }

  return null;
}

export function getBusinessPlanPrice(
  planKey: PricedBusinessPlanKey,
  countryCode: string | null | undefined,
  billingCycle: BillingCycle,
): number {
  return BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][planKey][billingCycle];
}

export function getBusinessAnnualSavingsPercent(
  planKey: PricedBusinessPlanKey,
  countryCode?: string | null,
): number {
  const prices = BUSINESS_REGIONAL_PRICES[getPricingTier(countryCode)][planKey];
  return Math.round((1 - prices.annual / (prices.monthly * 12)) * 100);
}
