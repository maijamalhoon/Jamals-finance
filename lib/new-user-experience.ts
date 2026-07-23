import type { SupabaseClient } from "@supabase/supabase-js";

export type NewUserExperienceCounts = {
  accounts: number;
  incomeTransactions: number;
  expenseTransactions: number;
  totalTransactions: number;
  transfers: number;
  incomeCategories: number;
  expenseCategories: number;
  goals: number;
  investments: number;
  payables: number;
};

export type NewUserExperienceState = {
  available: boolean;
  setupActive: boolean;
  counts: NewUserExperienceCounts;
};

type NewUserExperienceCountRow = {
  accounts?: number | string | null;
  income_transactions?: number | string | null;
  expense_transactions?: number | string | null;
  total_transactions?: number | string | null;
  transfers?: number | string | null;
  income_categories?: number | string | null;
  expense_categories?: number | string | null;
  goals?: number | string | null;
  investments?: number | string | null;
  payables?: number | string | null;
};

export const EMPTY_NEW_USER_EXPERIENCE_STATE: NewUserExperienceState = {
  available: false,
  setupActive: false,
  counts: {
    accounts: 0,
    incomeTransactions: 0,
    expenseTransactions: 0,
    totalTransactions: 0,
    transfers: 0,
    incomeCategories: 0,
    expenseCategories: 0,
    goals: 0,
    investments: 0,
    payables: 0,
  },
};

function normalizeCount(value: unknown) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function countOf(result: { count: number | null }) {
  return normalizeCount(result.count);
}

function reportErrors(
  stage: "core" | "details",
  results: Array<{ error: { code?: string | null } | null }>,
) {
  const errors = results.map((result) => result.error).filter(Boolean);
  if (errors.length === 0) return false;

  console.error("[new-user-experience] Setup state could not be verified", {
    stage,
    codes: errors.map((error) => error?.code ?? "unknown"),
  });
  return true;
}

function buildStateFromCountRow(
  row: NewUserExperienceCountRow,
): NewUserExperienceState {
  const coreCounts = {
    accounts: normalizeCount(row.accounts),
    incomeTransactions: normalizeCount(row.income_transactions),
    expenseTransactions: normalizeCount(row.expense_transactions),
  };
  const setupActive =
    coreCounts.accounts === 0 ||
    coreCounts.incomeTransactions === 0 ||
    coreCounts.expenseTransactions === 0;

  if (!setupActive) {
    return {
      available: true,
      setupActive: false,
      counts: {
        ...EMPTY_NEW_USER_EXPERIENCE_STATE.counts,
        ...coreCounts,
      },
    };
  }

  return {
    available: true,
    setupActive: true,
    counts: {
      ...coreCounts,
      totalTransactions: normalizeCount(row.total_transactions),
      transfers: normalizeCount(row.transfers),
      incomeCategories: normalizeCount(row.income_categories),
      expenseCategories: normalizeCount(row.expense_categories),
      goals: normalizeCount(row.goals),
      investments: normalizeCount(row.investments),
      payables: normalizeCount(row.payables),
    },
  };
}

async function loadLegacyNewUserExperienceState(
  supabase: SupabaseClient,
): Promise<NewUserExperienceState> {
  const [accountsResult, incomeResult, expensesResult] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "income"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "expense"),
  ]);

  if (reportErrors("core", [accountsResult, incomeResult, expensesResult])) {
    return EMPTY_NEW_USER_EXPERIENCE_STATE;
  }

  const coreCounts = {
    accounts: countOf(accountsResult),
    incomeTransactions: countOf(incomeResult),
    expenseTransactions: countOf(expensesResult),
  };
  const setupActive =
    coreCounts.accounts === 0 ||
    coreCounts.incomeTransactions === 0 ||
    coreCounts.expenseTransactions === 0;

  if (!setupActive) {
    return {
      available: true,
      setupActive: false,
      counts: {
        ...EMPTY_NEW_USER_EXPERIENCE_STATE.counts,
        ...coreCounts,
      },
    };
  }

  const [
    transactionsResult,
    transfersResult,
    incomeCategoriesResult,
    expenseCategoriesResult,
    goalsResult,
    investmentsResult,
    payablesResult,
  ] = await Promise.all([
    supabase.from("transactions").select("id", { count: "exact", head: true }),
    supabase
      .from("account_transfers")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("type", "income"),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("type", "expense"),
    supabase.from("goals").select("id", { count: "exact", head: true }),
    supabase.from("investments").select("id", { count: "exact", head: true }),
    supabase.from("liabilities").select("id", { count: "exact", head: true }),
  ]);

  if (
    reportErrors("details", [
      transactionsResult,
      transfersResult,
      incomeCategoriesResult,
      expenseCategoriesResult,
      goalsResult,
      investmentsResult,
      payablesResult,
    ])
  ) {
    return EMPTY_NEW_USER_EXPERIENCE_STATE;
  }

  return {
    available: true,
    setupActive: true,
    counts: {
      ...coreCounts,
      totalTransactions: countOf(transactionsResult),
      transfers: countOf(transfersResult),
      incomeCategories: countOf(incomeCategoriesResult),
      expenseCategories: countOf(expenseCategoriesResult),
      goals: countOf(goalsResult),
      investments: countOf(investmentsResult),
      payables: countOf(payablesResult),
    },
  };
}

export async function loadNewUserExperienceState(
  supabase: SupabaseClient,
): Promise<NewUserExperienceState> {
  const result = await supabase
    .rpc("get_new_user_experience_counts")
    .maybeSingle();

  if (!result.error && result.data) {
    return buildStateFromCountRow(result.data as NewUserExperienceCountRow);
  }

  console.warn(
    "[new-user-experience] Consolidated counts unavailable; using fallback.",
    { code: result.error?.code ?? "missing-data" },
  );

  return loadLegacyNewUserExperienceState(supabase);
}
