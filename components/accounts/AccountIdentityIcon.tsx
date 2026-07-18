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

export default function AccountIdentityIcon({
  name,
  iconKey,
  type,
  size = "md",
  className,
  forceLucide = false,
}: AccountIdentityIconProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const shouldLoadLogo =
    !forceLucide && shouldAttemptAccountLogo(name, iconKey, type);
  const logoUrl = useMemo(
    () =>
      shouldLoadLogo && name?.trim()
        ? `/api/account-logo?name=${encodeURIComponent(name.trim())}`
        : null,
    [name, shouldLoadLogo],
  );

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
