"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="finance-panel p-5">
      <h3 className="mb-1 text-sm font-semibold text-white">Account</h3>
      <p className="mb-4 text-xs text-slate-500">
        Sign out of Jamal's Finance on this device
      </p>
      <button onClick={handleSignOut} className="danger-action">
        <LogOut size={15} />
        Sign Out
      </button>
    </div>
  );
}
