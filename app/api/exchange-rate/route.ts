import { NextResponse } from "next/server";

import { getExchangeRateSnapshot } from "@/lib/exchange-rate";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getExchangeRateSnapshot();

  return NextResponse.json(
    {
      ...snapshot,
      /** Compatibility for existing USD/PKR consumers. */
      rate: snapshot.rates.PKR,
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800",
        "CDN-Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800",
        "Vercel-CDN-Cache-Control":
          "public, s-maxage=3600, stale-while-revalidate=86400, stale-if-error=604800",
      },
    },
  );
}
