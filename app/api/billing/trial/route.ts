import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
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

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("claim_pro_trial", {
      target_user_id: user.id,
    });

    if (error) {
      const alreadyUsed = error.message.toLowerCase().includes("trial_already_used");
      return NextResponse.json(
        { error: alreadyUsed ? "This account has already used its free trial." : "The trial could not be started." },
        { status: alreadyUsed ? 409 : 500 },
      );
    }

    return NextResponse.json({ subscription: data });
  } catch {
    return NextResponse.json(
      { error: "Billing is not configured on this environment." },
      { status: 503 },
    );
  }
}
