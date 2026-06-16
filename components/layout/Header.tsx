"use client";

import {
  Bell,
  ChevronDown,
  Search,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const router = useRouter();
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(query.trim())}`,
    );
    setQuery("");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="h-16 border-b border-white/[0.08] bg-[#0d121f]/95 flex items-center justify-between px-6 flex-shrink-0 backdrop-blur">
      <div>
        <h1 className="text-white font-semibold text-base">
          {getGreeting()}, Jamal
        </h1>
        <p className="text-slate-400 text-xs">Here's your financial overview</p>
      </div>

      <div className="flex items-center gap-3">
        <form
          onSubmit={handleSearch}
          className="finance-control flex items-center gap-2 px-3 py-2 w-60"
        >
          <Search size={13} className="text-slate-500 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            className="bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none w-full"
          />
        </form>

        <div className="finance-control flex items-center gap-2 px-3 py-2 text-xs text-slate-300">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          <ChevronDown size={12} className="text-slate-500" />
        </div>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => {
              setBellOpen((p) => !p);
              setProfileOpen(false);
            }}
            className="finance-control relative w-9 h-9 flex items-center justify-center"
            aria-label="Open notifications"
          >
            <Bell size={15} className="text-slate-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full border-2 border-[#0d121f]" />
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-72 finance-panel z-50 overflow-hidden">
              <div className="p-4 border-b border-white/[0.08]">
                <p className="text-white text-sm font-semibold">
                  Notifications
                </p>
              </div>
              <div className="p-4 text-center py-8">
                <Bell size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No new notifications</p>
                <p className="text-slate-600 text-xs mt-1">
                  You're all caught up
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setProfileOpen((p) => !p);
              setBellOpen(false);
            }}
            className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-indigo-950/30"
            aria-label="Open profile menu"
          >
            J
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-11 w-52 finance-panel z-50 overflow-hidden">
              <div className="p-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    J
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">Jamal</p>
                    <p className="text-slate-500 text-xs truncate">
                      jamal@example.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={() => {
                    router.push("/dashboard/settings");
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors text-sm"
                >
                  <Settings size={15} />
                  Settings
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-sm"
                >
                  <LogOut size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
