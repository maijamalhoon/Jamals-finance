import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("claim_my_pro_trial");

  if (error) {
    const message = error.message.toLowerCase();
    const alreadyUsed = message.includes("trial_already_used");
    const alreadySubscribed = message.includes("subscription_already_active");

    return NextResponse.json(
      {
        error: alreadyUsed
          ? "This account has already used its free trial."
          : alreadySubscribed
            ? "This account already has subscription access."
            : "The trial could not be started.",
      },
      { status: alreadyUsed || alreadySubscribed ? 409 : 500 },
    );
  }

  return NextResponse.json({ subscription: data });
}
