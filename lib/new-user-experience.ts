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

function countOf(result: { count: number | null }) {
  return Math.max(0, Number(result.count ?? 0));
}

export async function loadNewUserExperienceState(
  supabase: SupabaseClient,
): Promise<NewUserExperienceState> {
  const [
    accountsResult,
    incomeResult,
    expensesResult,
    transactionsResult,
    transfersResult,
    incomeCategoriesResult,
    expenseCategoriesResult,
    goalsResult,
    investmentsResult,
    payablesResult,
  ] = await Promise.all([
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "income"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "expense"),
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
    supabase.from("payables").select("id", { count: "exact", head: true }),
  ]);

  const results = [
    accountsResult,
    incomeResult,
    expensesResult,
    transactionsResult,
    transfersResult,
    incomeCategoriesResult,
    expenseCategoriesResult,
    goalsResult,
    investmentsResult,
    payablesResult,
  ];
  const errors = results.map((result) => result.error).filter(Boolean);

  if (errors.length > 0) {
    console.error("[new-user-experience] Setup state could not be verified", {
      codes: errors.map((error) => error?.code ?? "unknown"),
    });
    return EMPTY_NEW_USER_EXPERIENCE_STATE;
  }

  const counts: NewUserExperienceCounts = {
    accounts: countOf(accountsResult),
    incomeTransactions: countOf(incomeResult),
    expenseTransactions: countOf(expensesResult),
    totalTransactions: countOf(transactionsResult),
    transfers: countOf(transfersResult),
    incomeCategories: countOf(incomeCategoriesResult),
    expenseCategories: countOf(expenseCategoriesResult),
    goals: countOf(goalsResult),
    investments: countOf(investmentsResult),
    payables: countOf(payablesResult),
  };

  return {
    available: true,
    setupActive:
      counts.accounts === 0 ||
      counts.incomeTransactions === 0 ||
      counts.expenseTransactions === 0,
    counts,
  };
}
