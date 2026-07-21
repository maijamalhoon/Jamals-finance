"use client";

import { useEffect, useMemo, useState } from "react";
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

const LOGO_PADDING_CLASSES = {
  sm: "p-[3px]",
  md: "p-1",
  lg: "p-1.5",
};

const LOGO_RESOLVER_VERSION = "2026-07-21-1";

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

export default function AccountIdentityIcon({
  name,
  iconKey,
  type,
  size = "md",
  className,
  forceLucide = false,
}: AccountIdentityIconProps) {
  const [logoState, setLogoState] = useState<LogoState>("loading");
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

  useEffect(() => {
    setLogoState("loading");
  }, [logoUrl]);

  const fallbackKey = inferAccountIconKey(name, iconKey, type);
  const Icon = ICON_MAP[fallbackKey] ?? Landmark;
  const wrapperClass = cn(
    "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] border border-white/15 bg-white text-[var(--account-accent,var(--text-secondary))] shadow-sm",
    SIZE_CLASSES[size],
    className,
  );

  if (logoUrl && logoState !== "failed") {
    return (
      <span className={wrapperClass} title={name ?? "Account"}>
        {logoState !== "ready" ? (
          <Icon
            size={ICON_SIZES[size]}
            strokeWidth={1.8}
            aria-hidden="true"
          />
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={logoUrl}
          src={logoUrl}
          alt={`${name ?? "Account"} logo`}
          className={cn(
            "absolute inset-0 block h-full w-full rounded-[24%] object-contain transition-opacity duration-150",
            LOGO_PADDING_CLASSES[size],
            logoState === "ready" ? "opacity-100" : "opacity-0",
          )}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLogoState("ready")}
          onError={() => setLogoState("failed")}
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
