"use client";

import { BarChart3, LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  variant?: "card" | "avatar";
};

type ProfileSummary = {
  displayName: string;
  avatarUrl: string | null;
};

const FALLBACK_PROFILE: ProfileSummary = {
  displayName: "Jamal",
  avatarUrl: null,
};

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
  const supabase = useMemo(() => createClient(), []);
  const [displayName, setDisplayName] = useState("Jamal");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        aria-label={`Open profile menu for ${displayName}`}
        className={
          compact
            ? "finance-focus finance-control relative grid h-11 w-11 place-items-center rounded-[var(--radius-control)] p-0 shadow-theme"
            : "finance-focus flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[var(--radius-tile)] border border-border bg-surface-primary px-3 py-2 text-left shadow-theme hover:bg-surface-soft"
        }
      >
        <Avatar className={compact ? "size-8" : "size-9"}>
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
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
            <span className="mt-0.5 block truncate text-[11px] text-text-secondary">
              Profile and account
            </span>
          </span>
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
              Jamals Finance
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
  );
}
