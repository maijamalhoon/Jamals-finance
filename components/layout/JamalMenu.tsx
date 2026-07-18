"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

type JamalMenuProps = {
  align?: "left" | "right";
  placement?: "bottom" | "top";
  variant?: "card" | "avatar" | "drawer" | "floating";
};

type ProfileSummary = {
  displayName: string;
  avatarUrl: string | null;
};

const FALLBACK_PROFILE: ProfileSummary = {
  displayName: "Jamal",
  avatarUrl: null,
};

const GLASS_EASE = [0.22, 1, 0.36, 1] as const;

let profileRequest: Promise<ProfileSummary> | null = null;

function getProfileSummary(supabase: ReturnType<typeof createClient>) {
  if (!profileRequest) {
    profileRequest = supabase.auth
      .getUser()
      .then(({ data: { user }, error }) => {
        if (error) throw error;

        const metadata = user?.user_metadata ?? {};

        return {
          displayName:
            metadata.full_name ||
            metadata.name ||
            metadata.display_name ||
            FALLBACK_PROFILE.displayName,
          avatarUrl: metadata.avatar_url || metadata.picture || null,
        };
      })
      .catch(() => {
        profileRequest = null;
        return FALLBACK_PROFILE;
      });
  }

  return profileRequest;
}

export default function JamalMenu({
  align = "right",
  placement = "bottom",
  variant = "card",
}: JamalMenuProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState("Jamal");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getProfileSummary(supabase).then((profile) => {
      if (!active) return;
      setDisplayName(profile.displayName);
      setAvatarUrl(profile.avatarUrl);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    profileRequest = null;
    router.push("/login");
  }

  const compact = variant === "avatar";
  const drawer = variant === "drawer";
  const floating = variant === "floating";
  const glassTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.24, ease: GLASS_EASE };

  return (
    <>
      {floating && typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {menuOpen ? (
                <motion.div
                  key="floating-profile-glass"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={glassTransition}
                  onPointerDown={() => setMenuOpen(false)}
                  className="fixed inset-0 z-30 bg-[rgb(41_86_200_/_0.07)] backdrop-saturate-105 dark:bg-[rgb(41_86_200_/_0.1)] lg:hidden"
                />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}

      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          type="button"
          aria-label={`Open profile menu for ${displayName}`}
          className={
            floating
              ? "finance-focus grid size-11 shrink-0 place-items-center rounded-[14px] border border-border bg-card/92 p-0 text-text-primary shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-elevated data-popup-open:border-brand/30 data-popup-open:bg-surface-elevated active:scale-[0.97] dark:border-border-strong/70 dark:bg-surface-elevated/92 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]"
              : compact
                ? "finance-focus flex h-11 min-w-[3.75rem] items-center justify-center gap-1 rounded-full border border-transparent bg-transparent px-1.5 text-text-secondary shadow-none hover:bg-hover hover:text-text-primary data-popup-open:bg-hover data-popup-open:text-text-primary"
                : drawer
                  ? "finance-focus flex min-h-14 w-full min-w-0 items-center gap-2.5 rounded-[18px] border border-border bg-surface-secondary/75 px-3 py-2 text-left shadow-[inset_0_1px_0_rgb(255_255_255_/_0.24)] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-px hover:border-brand/25 hover:bg-surface-soft hover:shadow-[var(--shadow-xs)]"
                  : "finance-focus flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[var(--radius-tile)] border border-border bg-surface-primary px-3 py-2 text-left shadow-theme hover:bg-surface-soft"
          }
        >
          <Avatar className={floating ? "size-8" : "size-9"}>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback
              className={
                floating
                  ? "bg-brand/12 text-brand"
                  : compact
                    ? "bg-success/18 text-sm font-bold text-success"
                    : "bg-brand text-sm font-bold text-primary-foreground"
              }
            >
              {floating ? (
                <UserRound size={16} strokeWidth={2.15} aria-hidden="true" />
              ) : compact ? (
                displayName.slice(0, 2).toUpperCase()
              ) : (
                <CircleDollarSign size={15} aria-hidden="true" />
              )}
            </AvatarFallback>
          </Avatar>

          {floating ? (
            <span className="sr-only">{displayName}</span>
          ) : compact ? (
            <>
              <span className="sr-only">{displayName}</span>
              <ChevronDown size={14} strokeWidth={2.1} aria-hidden="true" />
            </>
          ) : (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-text-primary">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
                  Profile and account
                </span>
              </span>
              {drawer ? (
                <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-primary text-text-secondary">
                  <Settings size={15} strokeWidth={2.1} aria-hidden="true" />
                </span>
              ) : null}
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={align === "right" ? "end" : "start"}
          side={placement}
          sideOffset={8}
          className="w-56 rounded-[var(--radius-tile)] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-soft)]"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-2.5 py-2">
              <span className="block truncate text-xs font-bold text-text-primary">
                {displayName}
              </span>
              <span className="mt-0.5 block text-[10px] font-medium text-text-tertiary">
                Jamal&apos;s Finance
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="min-h-11 cursor-pointer gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-semibold text-text-secondary focus:bg-hover focus:text-text-primary"
            >
              <Settings size={16} aria-hidden="true" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleSignOut}
            className="min-h-11 cursor-pointer gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-semibold"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
