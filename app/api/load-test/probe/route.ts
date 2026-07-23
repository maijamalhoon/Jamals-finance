import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const STAGING_SUPABASE_URL = "https://zqhdwjivyfzeoqvahjme.supabase.co";
const STAGING_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_O0_zho3B-DZsh4P85nTBGA_fNWXEczT";
const MAX_SYNTHETIC_USERS = 1000;

function normalizeUserNumber(value: string | null) {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(MAX_SYNTHETIC_USERS, Math.max(1, parsed));
}

async function resolveSyntheticUserUuid(userNumber: number) {
  const response = await fetch(
    `${STAGING_SUPABASE_URL}/rest/v1/rpc/load_test_user_uuid`,
    {
      method: "POST",
      headers: {
        apikey: STAGING_SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${STAGING_SUPABASE_PUBLISHABLE_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_user_number: userNumber }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Synthetic user lookup failed with ${response.status}.`);
  }

  return (await response.json()) as string;
}

export async function GET(request: NextRequest) {
  const startedAt = performance.now();
  const userNumber = normalizeUserNumber(
    request.nextUrl.searchParams.get("user"),
  );

  try {
    const userId = await resolveSyntheticUserUuid(userNumber);
    const supabase = createClient(
      STAGING_SUPABASE_URL,
      STAGING_SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );

    const today = new Date();
    const periodEnd = today.toISOString().slice(0, 10);
    const periodStartDate = new Date(today);
    periodStartDate.setUTCFullYear(periodStartDate.getUTCFullYear() - 1);
    const periodStart = periodStartDate.toISOString().slice(0, 10);

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
        .eq("user_id", userId)
        .gte("date", periodStart)
        .lte("date", periodEnd)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select(
          "id, type, amount, note, date, created_at, source_name, person_name, item_name, categories(id, name, color), accounts(name)",
        )
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("account_transfers")
        .select(
          "id, amount, note, transfer_date, created_at, from_account:from_account_id(name), to_account:to_account_id(name)",
        )
        .eq("user_id", userId)
        .order("transfer_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("investments")
        .select(
          "id, name, type, quantity, purchase_price, current_price, purchased_at, asset_id, symbol, image_url, price_source, current_price_original, current_price_currency, price_updated_at, price_change_24h, is_live_priced",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at")
        .limit(6),
      supabase
        .from("accounts")
        .select("id, balance")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase
        .rpc("load_test_dashboard_setup_counts", { p_user_id: userId })
        .maybeSingle(),
    ]);

    const results = {
      transactions: transactionsResult,
      recent: recentResult,
      transfers: recentTransfersResult,
      investments: investmentsResult,
      goals: goalsResult,
      accounts: accountsResult,
      setup: setupCountsResult,
    };

    const failures = Object.entries(results)
      .filter(([, result]) => result.error)
      .map(([area, result]) => ({
        area,
        code: result.error?.code ?? "unknown",
      }));

    if (failures.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          isolatedStaging: true,
          userNumber,
          failures,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        },
        {
          status: 502,
          headers: {
            "cache-control": "no-store",
            "x-jf-load-test": "isolated-staging",
          },
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        isolatedStaging: true,
        userNumber,
        rows: {
          transactions: transactionsResult.data?.length ?? 0,
          recent: recentResult.data?.length ?? 0,
          transfers: recentTransfersResult.data?.length ?? 0,
          investments: investmentsResult.data?.length ?? 0,
          goals: goalsResult.data?.length ?? 0,
          accounts: accountsResult.data?.length ?? 0,
        },
        setup: setupCountsResult.data,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-jf-load-test": "isolated-staging",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        isolatedStaging: true,
        userNumber,
        error: error instanceof Error ? error.message : "Unknown staging error.",
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      },
      {
        status: 500,
        headers: {
          "cache-control": "no-store",
          "x-jf-load-test": "isolated-staging",
        },
      },
    );
  }
}
