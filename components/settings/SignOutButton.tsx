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
    <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
      <h3 className="text-white font-medium text-sm mb-1">Account</h3>
      <p className="text-gray-500 text-xs mb-4">
        Sign out of Jamal's Finance on this device
      </p>
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-red-600/20 border border-gray-700/50 hover:border-red-500/30 text-gray-300 hover:text-red-400 text-sm font-medium rounded-xl transition-all"
      >
        <LogOut size={15} />
        Sign Out
      </button>
    </div>
  );
}
