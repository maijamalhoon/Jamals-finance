import { NextResponse } from "next/server";
import { getUsdToPkrRate } from "@/lib/exchange-rate";

export async function GET() {
  const rate = await getUsdToPkrRate();

  return NextResponse.json(rate);
}
