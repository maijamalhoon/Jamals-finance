import { NextRequest, NextResponse } from "next/server";
import { searchInternationalStocks } from "@/lib/market/stocks";

function getFriendlyError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      status: 502,
      message: "Stock search is temporarily unavailable.",
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
    message: "Stock search is temporarily unavailable.",
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({
      results: [],
      error: "Type at least 2 characters to search stocks.",
    });
  }

  try {
    const results = await searchInternationalStocks(query);

    return NextResponse.json(
      { results },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    const friendlyError = getFriendlyError(error);

    return NextResponse.json(
      { results: [], error: friendlyError.message },
      {
        status: friendlyError.status,
        headers:
          friendlyError.status === 429 ? { "Retry-After": "60" } : undefined,
      },
    );
  }
}
