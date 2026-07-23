import { NextResponse } from "next/server";

import { getCurrentBillingAccess } from "@/lib/billing/server-access";

export async function GET() {
  const access = await getCurrentBillingAccess();

  if (access.state === "unauthenticated") {
    return NextResponse.json(access, { status: 401 });
  }

  if (access.state === "unavailable") {
    return NextResponse.json(access, { status: 503 });
  }

  return NextResponse.json(access, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
