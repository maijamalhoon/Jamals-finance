"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  BriefcaseBusiness,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  inferAccountIconKey,
  shouldAttemptAccountLogo,
} from "@/lib/account-identity";

const ICON_MAP: Record<string, LucideIcon> = {
  bank: Landmark,
  wallet: Wallet,
  card: CreditCard,
  phone: Smartphone,
  cash: Banknote,
  business: BriefcaseBusiness,
  savings: PiggyBank,
};

const SIZE_CLASSES = {
  sm: "size-7",
  md: "size-9",
  lg: "size-12",
};

const ICON_SIZES = {
  sm: 15,
  md: 18,
  lg: 22,
};

const INITIALS_CLASSES = {
  sm: "text-[8px]",
  md: "text-[10px]",
  lg: "text-xs",
};

const LOGO_PADDING_CLASSES = {
  sm: "p-[3px]",
  md: "p-1",
  lg: "p-1.5",
};

const LOGO_RESOLVER_VERSION = "2026-07-22-1";
const LOGO_RETRY_DELAYS = [250, 700, 1_400] as const;
const loadedLogoUrls = new Set<string>();

type LogoState = "loading" | "ready" | "failed";

type AccountIdentityIconProps = {
  name?: string | null;
  iconKey?: string | null;
  type?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  forceLucide?: boolean;
};

function getLogoLookupName(name?: string | null, iconKey?: string | null) {
  if (iconKey?.startsWith("lookup:")) {
    try {
      const savedLookup = decodeURIComponent(iconKey.slice(7)).trim();
      if (savedLookup) return savedLookup;
    } catch {
      // Fall back to the current account name when a legacy value is malformed.
    }
  }

  return name?.trim() ?? "";
}

function getLogoUrl(
  lookupName: string,
  iconKey?: string | null,
  type?: string | null,
) {
  if (!lookupName) return null;

  const params = new URLSearchParams({
    name: lookupName,
    v: LOGO_RESOLVER_VERSION,
  });
  if (type?.trim()) params.set("type", type.trim());
  if (iconKey?.trim()) params.set("iconKey", iconKey.trim());

  return `/api/account-logo-image?${params.toString()}`;
}

function getAccountInitials(name?: string | null) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

export default function AccountIdentityIcon({
  name,
  iconKey,
  type,
  size = "md",
  className,
  forceLucide = false,
}: AccountIdentityIconProps) {
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoLookupName = getLogoLookupName(name, iconKey);
  const shouldLoadLogo =
    !forceLucide &&
    shouldAttemptAccountLogo(logoLookupName, iconKey, type);
  const logoUrl = useMemo(
    () =>
      shouldLoadLogo
        ? getLogoUrl(logoLookupName, iconKey, type)
        : null,
    [iconKey, logoLookupName, shouldLoadLogo, type],
  );
  const [retryCount, setRetryCount] = useState(0);
  const [logoState, setLogoState] = useState<LogoState>(() =>
    logoUrl && loadedLogoUrls.has(logoUrl) ? "ready" : "loading",
  );

  useEffect(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setRetryCount(0);
    setLogoState(
      logoUrl && loadedLogoUrls.has(logoUrl) ? "ready" : "loading",
    );

    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [logoUrl]);

  const fallbackKey = inferAccountIconKey(name, iconKey, type);
  const Icon = ICON_MAP[fallbackKey] ?? Landmark;
  const initials = getAccountInitials(name);
  const wrapperClass = cn(
    "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] border border-white/15 bg-white text-[var(--account-accent,var(--text-secondary))] shadow-sm",
    SIZE_CLASSES[size],
    className,
  );

  if (logoUrl) {
    const logoSrc = `${logoUrl}&attempt=${retryCount}`;

    return (
      <span className={wrapperClass} title={name ?? "Account"}>
        {logoState === "failed" && initials ? (
          <span
            className={cn(
              "select-none font-black tracking-[-0.04em] text-text-secondary",
              INITIALS_CLASSES[size],
            )}
            aria-hidden="true"
          >
            {initials}
          </span>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={logoSrc}
          src={logoSrc}
          alt={`${name ?? "Account"} logo`}
          className={cn(
            "absolute inset-0 block h-full w-full rounded-[24%] object-contain",
            LOGO_PADDING_CLASSES[size],
            logoState === "ready" ? "opacity-100" : "opacity-0",
          )}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => {
            loadedLogoUrls.add(logoUrl);
            setLogoState("ready");
          }}
          onError={() => {
            if (retryCount < LOGO_RETRY_DELAYS.length) {
              setLogoState("loading");
              retryTimerRef.current = setTimeout(() => {
                setRetryCount((current) => current + 1);
              }, LOGO_RETRY_DELAYS[retryCount]);
              return;
            }

            setLogoState("failed");
          }}
        />
      </span>
    );
  }

  return (
    <span className={wrapperClass} title={name ?? "Account"}>
      <Icon
        size={ICON_SIZES[size]}
        strokeWidth={forceLucide ? 2.2 : 1.8}
        aria-hidden="true"
      />
    </span>
  );
}
