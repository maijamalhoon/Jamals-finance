"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, LogOut, Moon, Settings, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { panelVariants } from "@/components/motion/animation-config";

type JamalMenuProps = {
  align?: "left" | "right";
  placement?: "bottom" | "top";
};

function applyTheme(nextDark: boolean) {
  document.documentElement.classList.toggle("dark", nextDark);
  document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
}

export default function JamalMenu({
  align = "right",
  placement = "bottom",
}: JamalMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [displayName, setDisplayName] = useState("Jamal");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("jamal-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = savedTheme ? savedTheme === "dark" : prefersDark;

    applyTheme(shouldUseDark);
    setIsDark(shouldUseDark);
  }, []);

  useEffect(() => {
    async function loadUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const metadata = user?.user_metadata ?? {};

      setDisplayName(
        metadata.full_name ||
          metadata.name ||
          metadata.display_name ||
          "Jamal",
      );
      setAvatarUrl(metadata.avatar_url || metadata.picture || null);
    }

    loadUserProfile();
  }, [supabase]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    applyTheme(nextDark);
    localStorage.setItem("jamal-theme", nextDark ? "dark" : "light");
    setIsDark(nextDark);
    setOpen(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="finance-focus finance-interactive-tile flex w-full items-center gap-3 border-border bg-card px-3 py-2.5 text-left shadow-theme"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <Avatar className="size-10">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-active text-sm font-bold text-background">
            <BarChart3 size={15} />
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-text-primary">
            {displayName}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`finance-surface absolute z-[130] w-56 overflow-hidden p-2 ${
              align === "right" ? "right-0" : "left-0"
            } ${
              placement === "top"
                ? "bottom-[calc(100%+10px)]"
                : "top-[calc(100%+10px)]"
            }`}
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard/settings");
                setOpen(false);
              }}
              className="finance-focus finance-interactive-tile flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold"
              role="menuitem"
            >
              <Settings size={15} />
              Settings
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="finance-focus finance-interactive-tile flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold"
              role="menuitem"
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
              {isDark ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="finance-focus finance-interactive-tile flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold"
              role="menuitem"
            >
              <LogOut size={15} />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
