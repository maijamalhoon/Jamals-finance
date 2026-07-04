import { NextRequest, NextResponse } from "next/server";
import { getCryptoPrices, normalizeCryptoIds } from "@/lib/market/crypto";

export async function GET(request: NextRequest) {
  const rawIds = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = normalizeCryptoIds(rawIds.split(","));

  if (ids.length === 0) {
    return NextResponse.json({
      prices: {},
      live: false,
      error: "Provide one or more CoinGecko ids.",
    });
  }

  try {
    const result = await getCryptoPrices(ids);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    const isRateLimit =
      error instanceof Error && error.name === "RateLimitError";

    return NextResponse.json(
      {
        prices: {},
        live: false,
        error: isRateLimit
          ? "CoinGecko is rate limiting price requests. Please wait a moment and try again."
          : "Crypto prices are temporarily unavailable.",
      },
      {
        status: isRateLimit ? 429 : 502,
        headers: isRateLimit ? { "Retry-After": "60" } : undefined,
      },
    );
  }
}
