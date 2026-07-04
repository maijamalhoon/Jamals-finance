import { NextRequest, NextResponse } from "next/server";
import {
  getInternationalStockPrices,
  normalizeStockSymbols,
} from "@/lib/market/stocks";

function getFriendlyError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      status: 502,
      message: "Stock quotes are temporarily unavailable.",
    };
  }

  if (error.name === "MissingConfigError") {
    return { status: 503, message: "Stock search is not configured yet." };
  }

  if (error.name === "RateLimitError") {
    return { status: 429, message: "Stock data limit reached. Try again later." };
  }

  return {
    status: 502,
    message: "Stock quotes are temporarily unavailable.",
  };
}

export async function GET(request: NextRequest) {
  const rawSymbols = request.nextUrl.searchParams.get("symbols") ?? "";
  const symbols = normalizeStockSymbols(rawSymbols.split(","));

  if (symbols.length === 0) {
    return NextResponse.json({
      prices: {},
      error: "Provide one or more stock symbols.",
    });
  }

  try {
    const result = await getInternationalStockPrices(symbols);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    const friendlyError = getFriendlyError(error);

    return NextResponse.json(
      { prices: {}, error: friendlyError.message },
      {
        status: friendlyError.status,
        headers:
          friendlyError.status === 429 ? { "Retry-After": "60" } : undefined,
      },
    );
  }
}
