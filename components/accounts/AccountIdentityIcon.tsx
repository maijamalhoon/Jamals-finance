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
  detectAccountBrand,
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

const LOGO_RESOLVER_VERSION = "2026-07-19-3";

const DIRECT_BANK_DOMAINS = [
  { domain: "icbc.com.cn", patterns: [/^icbc$/i, /industrial\s+and\s+commercial\s+bank\s+of\s+china/i] },
  { domain: "dbs.com", patterns: [/^dbs(?:\s+bank)?$/i, /development\s+bank\s+of\s+singapore/i] },
  { domain: "ocbc.com", patterns: [/^ocbc(?:\s+bank)?$/i, /oversea[-\s]+chinese\s+banking\s+corporation/i] },
  { domain: "uobgroup.com", patterns: [/^uob(?:\s+bank)?$/i, /united\s+overseas\s+bank/i] },
  { domain: "rbc.com", patterns: [/^rbc(?:\s+bank)?$/i, /royal\s+bank\s+of\s+canada/i] },
  { domain: "td.com", patterns: [/^td(?:\s+bank)?$/i, /toronto[-\s]+dominion/i] },
  { domain: "bmo.com", patterns: [/^bmo(?:\s+bank)?$/i, /bank\s+of\s+montreal/i] },
  { domain: "cibc.com", patterns: [/^cibc$/i, /canadian\s+imperial\s+bank\s+of\s+commerce/i] },
  { domain: "commbank.com.au", patterns: [/^cba$/i, /commonwealth\s+bank\s+of\s+australia/i] },
  { domain: "nab.com.au", patterns: [/^nab$/i, /national\s+australia\s+bank/i] },
  { domain: "anz.com", patterns: [/^anz$/i, /australia\s+and\s+new\s+zealand\s+banking\s+group/i] },
  { domain: "westpac.com.au", patterns: [/^westpac$/i, /westpac\s+banking\s+corporation/i] },
  { domain: "sbi.co.in", patterns: [/^sbi$/i, /state\s+bank\s+of\s+india/i] },
  { domain: "hdfcbank.com", patterns: [/^hdfc(?:\s+bank)?$/i, /housing\s+development\s+finance\s+corporation\s+bank/i] },
  { domain: "icicibank.com", patterns: [/^icici(?:\s+bank)?$/i, /industrial\s+credit\s+and\s+investment\s+corporation\s+of\s+india/i] },
  { domain: "axisbank.com", patterns: [/^axis(?:\s+bank)?$/i] },
  { domain: "mufg.jp", patterns: [/^mufg$/i, /mitsubishi\s+ufj\s+financial\s+group/i] },
  { domain: "smbc.co.jp", patterns: [/^smbc$/i, /sumitomo\s+mitsui\s+banking\s+corporation/i] },
  { domain: "maybank.com", patterns: [/^maybank$/i, /malayan\s+banking/i] },
  { domain: "cimb.com", patterns: [/^cimb$/i, /commerce\s+international\s+merchant\s+bankers/i] },
] as const;

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

function getDirectBankDomain(name: string, iconKey?: string | null) {
  const knownBrand = detectAccountBrand(name, iconKey);
  if (knownBrand?.domain) return knownBrand.domain;

  return (
    DIRECT_BANK_DOMAINS.find(({ patterns }) =>
      patterns.some((pattern) => pattern.test(name)),
    )?.domain ?? null
  );
}

function googleFaviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
    `https://${domain}`,
  )}&sz=256`;
}

function getLogoCandidates(
  lookupName: string,
  iconKey?: string | null,
  type?: string | null,
) {
  if (!lookupName) return [];

  const params = new URLSearchParams({
    name: lookupName,
    v: LOGO_RESOLVER_VERSION,
  });
  if (type?.trim()) params.set("type", type.trim());
  if (iconKey?.trim()) params.set("iconKey", iconKey.trim());

  const apiLogoUrl = `/api/account-logo?${params.toString()}`;
  const directDomain = getDirectBankDomain(lookupName, iconKey);

  if (!directDomain) return [apiLogoUrl];

  return [
    googleFaviconUrl(directDomain),
    apiLogoUrl,
    `https://icons.duckduckgo.com/ip3/${encodeURIComponent(directDomain)}.ico`,
    `https://${directDomain}/favicon.ico`,
  ];
}

export default function AccountIdentityIcon({
  name,
  iconKey,
  type,
  size = "md",
  className,
  forceLucide = false,
}: AccountIdentityIconProps) {
  const [logoCandidateIndex, setLogoCandidateIndex] = useState(0);
  const logoLookupName = getLogoLookupName(name, iconKey);
  const shouldLoadLogo =
    !forceLucide &&
    shouldAttemptAccountLogo(logoLookupName, iconKey, type);
  const logoCandidates = useMemo(
    () =>
      shouldLoadLogo
        ? getLogoCandidates(logoLookupName, iconKey, type)
        : [],
    [iconKey, logoLookupName, shouldLoadLogo, type],
  );
  const logoUrl = logoCandidates[logoCandidateIndex] ?? null;
  const logoCandidatesKey = logoCandidates.join("|");

  useEffect(() => {
    setLogoCandidateIndex(0);
  }, [logoCandidatesKey]);

  const fallbackKey = inferAccountIconKey(name, iconKey, type);
  const Icon = ICON_MAP[fallbackKey] ?? Landmark;
  const wrapperClass = cn(
    "inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] border border-white/15 bg-white text-[var(--account-accent,var(--text-secondary))] shadow-sm",
    SIZE_CLASSES[size],
    className,
  );

  if (logoUrl) {
    return (
      <span className={wrapperClass} title={name ?? "Account"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={logoUrl}
          src={logoUrl}
          alt={`${name ?? "Account"} logo`}
          className={cn(
            "block h-full w-full rounded-[24%] object-contain",
            LOGO_PADDING_CLASSES[size],
          )}
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() =>
            setLogoCandidateIndex((currentIndex) => currentIndex + 1)
          }
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
