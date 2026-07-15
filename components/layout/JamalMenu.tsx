"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { panelVariants } from "@/components/motion/animation-config";

type JamalMenuProps = {
  align?: "left" | "right";
  placement?: "bottom" | "top";
  variant?: "card" | "avatar";
};

export default function JamalMenu({
  align = "right",
  placement = "bottom",
  variant = "card",
}: JamalMenuProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Jamal");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const compact = variant === "avatar";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          compact
            ? "finance-focus finance-control relative grid h-11 w-11 place-items-center overflow-visible rounded-[15px] p-0 shadow-theme"
            : "finance-focus finance-interactive-tile flex w-full items-center gap-3 border-border bg-card px-3 py-2.5 text-left shadow-theme"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open profile menu"
      >
        <Avatar className={compact ? "size-8" : "size-10"}>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
          <AvatarFallback className="bg-brand text-sm font-bold text-primary-foreground">
            <BarChart3 size={15} aria-hidden="true" />
          </AvatarFallback>
        </Avatar>

        {compact ? (
          <span className="sr-only">{displayName}</span>
        ) : (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-text-primary">
              {displayName}
            </span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={panelVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`finance-surface absolute z-[130] w-[min(14rem,calc(100vw-1.5rem))] overflow-hidden p-2 ${
              align === "right" ? "right-0" : "left-0"
            } ${
              placement === "top"
                ? "bottom-[calc(100%+10px)]"
                : "top-[calc(100%+10px)]"
            }`}
            role="dialog"
            aria-label="Profile menu"
          >
            <button
              type="button"
              onClick={() => {
                router.push("/dashboard/settings");
                setOpen(false);
              }}
              className="finance-focus finance-interactive-tile flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold"
            >
              <Settings size={15} aria-hidden="true" />
              Settings
            </button>
            <div className="my-1 border-t border-divider" />
            <button
              type="button"
              onClick={handleSignOut}
              className="finance-focus finance-interactive-tile flex w-full items-center gap-3 px-3 py-2 text-left text-sm font-semibold"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign Out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
