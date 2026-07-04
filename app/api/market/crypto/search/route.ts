import { NextRequest, NextResponse } from "next/server";
import { searchCryptoAssets } from "@/lib/market/crypto";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      results: [],
      live: false,
      error: "Type at least 2 characters to search crypto assets.",
    });
  }

  try {
    const results = await searchCryptoAssets(query);

    return NextResponse.json(
      { results, live: true },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const isRateLimit =
      error instanceof Error && error.name === "RateLimitError";

    return NextResponse.json(
      {
        results: [],
        live: false,
        error: isRateLimit
          ? "CoinGecko is rate limiting requests. Please wait a moment and try again."
          : "Crypto search is temporarily unavailable.",
      },
      {
        status: isRateLimit ? 429 : 502,
        headers: isRateLimit ? { "Retry-After": "60" } : undefined,
      },
    );
  }
}
