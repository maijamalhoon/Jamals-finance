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
  sm: 16,
  md: 19,
  lg: 23,
};

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

export default function AccountIdentityIcon({
  name,
  iconKey,
  type,
  size = "md",
  className,
  forceLucide = false,
}: AccountIdentityIconProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoLookupName = getLogoLookupName(name, iconKey);
  const shouldLoadLogo =
    !forceLucide &&
    shouldAttemptAccountLogo(logoLookupName, iconKey, type);
  const logoUrl = useMemo(() => {
    if (!shouldLoadLogo || !logoLookupName) return null;

    const params = new URLSearchParams({ name: logoLookupName });
    if (type?.trim()) params.set("type", type.trim());
    if (iconKey?.trim()) params.set("iconKey", iconKey.trim());

    return `/api/account-logo?${params.toString()}`;
  }, [iconKey, logoLookupName, shouldLoadLogo, type]);

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const fallbackKey = inferAccountIconKey(name, iconKey, type);
  const Icon = ICON_MAP[fallbackKey] ?? Landmark;
  const wrapperClass = cn(
    "inline-grid shrink-0 place-items-center text-[var(--account-accent,var(--text-secondary))]",
    SIZE_CLASSES[size],
    className,
  );

  if (logoUrl && !logoFailed) {
    return (
      <span className={wrapperClass} title={name ?? "Account"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`${name ?? "Account"} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setLogoFailed(true)}
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
