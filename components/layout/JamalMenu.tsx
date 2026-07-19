"use client";

import {
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Settings2,
  UserRound,
} from "lucide-react";
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
import {
  announceHeaderPopoverOpen,
  getHeaderPopoverSource,
  HEADER_POPOVER_OPEN_EVENT,
} from "@/lib/header-popovers";
import { createClient } from "@/lib/supabase/client";

type JamalMenuProps = {
  align?: "left" | "right";
  placement?: "bottom" | "top";
  variant?: "card" | "avatar" | "drawer" | "floating";
};

type ProfileSummary = {
  displayName: string;
  email: string;
  avatarUrl: string | null;
};

type ProfileUpdatedDetail = {
  displayName?: unknown;
  avatarUrl?: unknown;
};

const FALLBACK_PROFILE: ProfileSummary = {
  displayName: "Jamal",
  email: "",
  avatarUrl: null,
};

const MENU_ICON_STROKE_WIDTH = 2.35;

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
          email: user?.email ?? "",
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
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getProfileSummary(supabase).then((profile) => {
      if (!active) return;
      setDisplayName(profile.displayName);
      setEmail(profile.email);
      setAvatarUrl(profile.avatarUrl);
    });

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const detail = (event as CustomEvent<ProfileUpdatedDetail>).detail;
      if (!detail) return;

      if (typeof detail.displayName === "string" && detail.displayName.trim()) {
        setDisplayName(detail.displayName);
      }

      if (typeof detail.avatarUrl === "string" || detail.avatarUrl === null) {
        setAvatarUrl(detail.avatarUrl);
      }

      profileRequest = null;
    }

    window.addEventListener("jamal-profile-updated", handleProfileUpdated);
    return () =>
      window.removeEventListener("jamal-profile-updated", handleProfileUpdated);
  }, []);

  useEffect(() => {
    function handleOtherHeaderPopover(event: Event) {
      const source = getHeaderPopoverSource(event);
      if (source && source !== "profile") setMenuOpen(false);
    }

    window.addEventListener(
      HEADER_POPOVER_OPEN_EVENT,
      handleOtherHeaderPopover,
    );
    return () =>
      window.removeEventListener(
        HEADER_POPOVER_OPEN_EVENT,
        handleOtherHeaderPopover,
      );
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    profileRequest = null;
    router.push("/login");
  }

  function handleMenuOpenChange(nextOpen: boolean) {
    if (nextOpen) announceHeaderPopoverOpen("profile");
    setMenuOpen(nextOpen);
  }

  const compact = variant === "avatar";
  const drawer = variant === "drawer";
  const floating = variant === "floating";
  const headerMenu = compact || floating;
  const profileSubtitle = email || "Jamal's Finance account";

  return (
    <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
      <DropdownMenuTrigger
        data-profile-trigger
        type="button"
        aria-label={`Open profile menu for ${displayName}`}
        className={
          floating
            ? "finance-focus font-sans grid size-11 shrink-0 place-items-center rounded-[14px] border border-border bg-card/92 p-0 text-text-primary shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-elevated data-popup-open:border-brand/30 data-popup-open:bg-surface-elevated active:scale-[0.97] dark:border-border-strong/70 dark:bg-surface-elevated/92 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]"
            : compact
              ? "finance-focus font-sans flex h-11 min-w-[3.75rem] items-center justify-center gap-1 rounded-full border border-transparent bg-transparent px-1.5 text-text-secondary shadow-none hover:bg-hover hover:text-text-primary data-popup-open:bg-hover data-popup-open:text-text-primary"
              : drawer
                ? "finance-focus font-sans flex min-h-14 w-full min-w-0 items-center gap-2.5 rounded-[18px] border border-border bg-surface-secondary/75 px-3 py-2 text-left shadow-[inset_0_1px_0_rgb(255_255_255_/_0.24)] transition-[background-color,border-color,box-shadow,transform] hover:-translate-y-px hover:border-brand/25 hover:bg-surface-soft hover:shadow-[var(--shadow-xs)]"
                : "finance-focus font-sans flex min-h-11 w-full min-w-0 items-center gap-3 rounded-[var(--radius-tile)] border border-border bg-surface-primary px-3 py-2 text-left shadow-theme hover:bg-surface-soft"
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
              <UserRound
                size={17}
                strokeWidth={MENU_ICON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              />
            ) : compact ? (
              displayName.slice(0, 2).toUpperCase()
            ) : (
              <CircleDollarSign
                size={16}
                strokeWidth={MENU_ICON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              />
            )}
          </AvatarFallback>
        </Avatar>

        {floating ? (
          <span className="sr-only">{displayName}</span>
        ) : compact ? (
          <>
            <span className="sr-only">{displayName}</span>
            <ChevronDown
              size={14}
              strokeWidth={MENU_ICON_STROKE_WIDTH}
              aria-hidden="true"
            />
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
                <Settings2
                  size={15}
                  strokeWidth={MENU_ICON_STROKE_WIDTH}
                  aria-hidden="true"
                />
              </span>
            ) : null}
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        data-profile-menu
        align={align === "right" ? "end" : "start"}
        side={placement}
        sideOffset={8}
        backdropClassName={headerMenu ? "!z-20" : undefined}
        backdropStyle={
          headerMenu
            ? {
                backgroundColor:
                  "color-mix(in srgb, var(--overlay), transparent 92%)",
                backdropFilter: "blur(3px) saturate(105%)",
                WebkitBackdropFilter: "blur(3px) saturate(105%)",
              }
            : undefined
        }
        className="font-sans w-[18.5rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[18px] border border-border/65 bg-surface-elevated/98 p-1.5 shadow-[0_18px_44px_rgb(15_23_42_/_0.16)] backdrop-blur-xl dark:shadow-[0_18px_48px_rgb(0_0_0_/_0.32)]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex min-w-0 items-center gap-3 px-3 py-3">
            <Avatar className="size-9 shrink-0">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayName} />
              ) : null}
              <AvatarFallback className="bg-brand/12 text-xs font-bold text-brand">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold leading-4 text-text-primary">
                {displayName}
              </span>
              <span className="mt-0.5 block truncate text-[10px] font-medium leading-3.5 text-text-tertiary">
                {profileSubtitle}
              </span>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 my-0 bg-divider/70" />

        <DropdownMenuGroup className="py-0.5">
          <DropdownMenuItem
            onClick={() => router.push("/dashboard/settings")}
            className="min-h-[3.45rem] cursor-pointer gap-3 rounded-[13px] px-3 py-2.5 text-text-secondary transition-colors hover:bg-surface-soft/80 focus:bg-surface-soft/80 focus:text-text-primary"
          >
            <span className="profile-menu-icon grid size-8 shrink-0 place-items-center text-active">
              <Settings2
                size={18}
                strokeWidth={MENU_ICON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-semibold leading-[1.15rem] text-text-primary">
                Settings
              </span>
              <span className="mt-1 block text-[10px] font-medium leading-3.5 text-text-tertiary">
                Profile, theme and preferences
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="mx-2 my-0 bg-divider/70" />

        <DropdownMenuItem
          variant="destructive"
          onClick={handleSignOut}
          className="min-h-[3.45rem] cursor-pointer gap-3 rounded-[13px] px-3 py-2.5 transition-colors hover:bg-danger-soft/60 focus:bg-danger-soft/60"
        >
          <span className="profile-menu-icon grid size-8 shrink-0 place-items-center text-danger">
            <LogOut
              size={18}
              strokeWidth={MENU_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-semibold leading-[1.15rem] text-danger">
              Sign out
            </span>
            <span className="mt-1 block text-[10px] font-medium leading-3.5 text-text-tertiary">
              End this device session
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
