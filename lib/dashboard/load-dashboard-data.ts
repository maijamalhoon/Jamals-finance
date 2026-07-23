type DashboardSupabaseClient = Awaited<
  ReturnType<(typeof import("@/lib/supabase/server"))["createClient"]>
>;

type DashboardQueryRange = {
  start: string;
  end: string;
};

type DashboardPayload = {
  period_transactions: unknown[];
  recent_transactions: unknown[];
  recent_transfers: unknown[];
  investments: unknown[];
  goals: unknown[];
  accounts: unknown[];
  setup_counts: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDashboardPayload(value: unknown): DashboardPayload | null {
  const candidate =
    Array.isArray(value) && value.length === 1 ? value[0] : value;

  if (!isRecord(candidate)) return null;

  const arrayKeys = [
    "period_transactions",
    "recent_transactions",
    "recent_transfers",
    "investments",
    "goals",
    "accounts",
  ] as const;

  if (arrayKeys.some((key) => !Array.isArray(candidate[key]))) return null;
  if (!isRecord(candidate.setup_counts)) return null;

  return candidate as DashboardPayload;
}

async function loadLegacyDashboardData(
  supabase: DashboardSupabaseClient,
  range: DashboardQueryRange,
) {
  const [
    transactionsResult,
    recentResult,
    recentTransfersResult,
    investmentsResult,
    goalsResult,
    accountsResult,
    setupCountsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, note, date, created_at, category_id, account_id, source_name, person_name, item_name, categories(id, name, color), accounts(name)",
      )
      .gte("date", range.start)
      .lte("date", range.end)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "id, type, amount, note, date, created_at, source_name, person_name, item_name, categories(id, name, color), accounts(name)",
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("account_transfers")
      .select(
        "id, amount, note, transfer_date, created_at, from_account:from_account_id(name), to_account:to_account_id(name)",
      )
      .order("transfer_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("investments")
      .select(
        "id, name, type, quantity, purchase_price, current_price, purchased_at, asset_id, symbol, image_url, price_source, current_price_original, current_price_currency, price_updated_at, price_change_24h, is_live_priced",
      )
      .order("created_at", { ascending: false }),
    supabase.from("goals").select("*").order("created_at").limit(6),
    supabase.from("accounts").select("id, balance").eq("status", "active"),
    supabase.rpc("get_dashboard_setup_counts").maybeSingle(),
  ]);

  return {
    transactionsResult,
    recentResult,
    recentTransfersResult,
    investmentsResult,
    goalsResult,
    accountsResult,
    setupCountsResult,
  };
}

export async function loadDashboardData(
  supabase: DashboardSupabaseClient,
  range: DashboardQueryRange,
) {
  const payloadResult = await supabase.rpc("get_dashboard_payload", {
    p_start: range.start,
    p_end: range.end,
  });
  const payload = normalizeDashboardPayload(payloadResult.data);

  if (!payloadResult.error && payload) {
    return {
      transactionsResult: {
        data: payload.period_transactions,
        error: null,
      },
      recentResult: {
        data: payload.recent_transactions,
        error: null,
      },
      recentTransfersResult: {
        data: payload.recent_transfers,
        error: null,
      },
      investmentsResult: {
        data: payload.investments,
        error: null,
      },
      goalsResult: {
        data: payload.goals,
        error: null,
      },
      accountsResult: {
        data: payload.accounts,
        error: null,
      },
      setupCountsResult: {
        data: payload.setup_counts,
        error: null,
      },
    };
  }

  console.warn("[dashboard] Consolidated payload unavailable; using fallback.", {
    code: payloadResult.error?.code ?? "invalid-payload",
  });

  return loadLegacyDashboardData(supabase, range);
}
