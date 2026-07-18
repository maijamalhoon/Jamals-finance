import type { CSSProperties } from "react";

export type AccountBrand = {
  key: string;
  label: string;
  mark: string;
  patterns: RegExp[];
  accentColor: string;
  accentValue: "blue" | "green" | "orange" | "purple" | "cyan" | "rose" | "amber" | "slate";
  legacyType: string;
};

const ACCOUNT_BRANDS: AccountBrand[] = [
  {
    key: "ubl",
    label: "UBL",
    mark: "UBL",
    patterns: [/\bubl\b/i, /united\s+bank/i],
    accentColor: "#1F5AA6",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "hbl",
    label: "HBL",
    mark: "HBL",
    patterns: [/\bhbl\b/i, /habib\s+bank\s+limited/i],
    accentColor: "#007A5E",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "meezan",
    label: "Meezan Bank",
    mark: "MB",
    patterns: [/meezan/i],
    accentColor: "#6E2B78",
    accentValue: "purple",
    legacyType: "bank",
  },
  {
    key: "allied",
    label: "Allied Bank",
    mark: "ABL",
    patterns: [/\babl\b/i, /allied\s+bank/i],
    accentColor: "#156B42",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "mcb",
    label: "MCB Bank",
    mark: "MCB",
    patterns: [/\bmcb\b/i, /muslim\s+commercial\s+bank/i],
    accentColor: "#C62828",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "bank-alfalah",
    label: "Bank Alfalah",
    mark: "BAF",
    patterns: [/alfalah/i],
    accentColor: "#B12430",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "habib-metro",
    label: "HabibMetro",
    mark: "HM",
    patterns: [/habib\s*metro/i, /habib\s+metropolitan/i],
    accentColor: "#176A45",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "bank-al-habib",
    label: "Bank AL Habib",
    mark: "BAH",
    patterns: [/bank\s+al\s+habib/i, /\bbahl\b/i],
    accentColor: "#1C4E8A",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "standard-chartered",
    label: "Standard Chartered",
    mark: "SC",
    patterns: [/standard\s+chartered/i, /\bscb\b/i],
    accentColor: "#087E8B",
    accentValue: "cyan",
    legacyType: "bank",
  },
  {
    key: "faysal",
    label: "Faysal Bank",
    mark: "FBL",
    patterns: [/faysal/i, /\bfbl\b/i],
    accentColor: "#166B4A",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "askari",
    label: "Askari Bank",
    mark: "AKBL",
    patterns: [/askari/i, /\bakbl\b/i],
    accentColor: "#315D3D",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "js-bank",
    label: "JS Bank",
    mark: "JS",
    patterns: [/\bjs\s*bank\b/i],
    accentColor: "#E07128",
    accentValue: "orange",
    legacyType: "bank",
  },
  {
    key: "nbp",
    label: "National Bank of Pakistan",
    mark: "NBP",
    patterns: [/\bnbp\b/i, /national\s+bank\s+of\s+pakistan/i],
    accentColor: "#1A6B45",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "jazzcash",
    label: "JazzCash",
    mark: "JC",
    patterns: [/jazz\s*cash/i],
    accentColor: "#D6242F",
    accentValue: "rose",
    legacyType: "jazzcash",
  },
  {
    key: "easypaisa",
    label: "Easypaisa",
    mark: "EP",
    patterns: [/easy\s*paisa/i],
    accentColor: "#169B62",
    accentValue: "green",
    legacyType: "easypaisa",
  },
  {
    key: "sadapay",
    label: "SadaPay",
    mark: "SP",
    patterns: [/sada\s*pay/i],
    accentColor: "#E56B68",
    accentValue: "rose",
    legacyType: "sadapay",
  },
  {
    key: "nayapay",
    label: "NayaPay",
    mark: "NP",
    patterns: [/naya\s*pay/i],
    accentColor: "#4755C7",
    accentValue: "blue",
    legacyType: "nayapay",
  },
];

export function detectAccountBrand(
  name?: string | null,
  iconKey?: string | null,
): AccountBrand | null {
  const storedKey = iconKey?.startsWith("brand:") ? iconKey.slice(6) : null;
  const stored = storedKey
    ? ACCOUNT_BRANDS.find((brand) => brand.key === storedKey)
    : null;

  const cleanName = name?.trim() ?? "";
  const matched = cleanName
    ? ACCOUNT_BRANDS.find((brand) =>
        brand.patterns.some((pattern) => pattern.test(cleanName)),
      )
    : null;

  return matched ?? stored ?? null;
}

export function getAutomaticAccountVisual(
  name: string,
  current?: {
    iconKey?: string | null;
    accentColor?: string | null;
    type?: string | null;
  },
) {
  const brand = detectAccountBrand(name, current?.iconKey);

  if (brand) {
    return {
      brand,
      iconKey: `brand:${brand.key}`,
      accentColor: brand.accentValue,
      legacyType: brand.legacyType,
    };
  }

  return {
    brand: null,
    iconKey: current?.iconKey || "bank",
    accentColor: current?.accentColor || "blue",
    legacyType: current?.type || "bank",
  };
}

export function AccountBrandMark({
  brand,
  size = "md",
  className = "",
}: {
  brand: AccountBrand;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass =
    size === "sm"
      ? "h-7 min-w-7 px-1 text-[9px] rounded-[9px]"
      : size === "lg"
        ? "h-12 min-w-12 px-1.5 text-[11px] rounded-[16px]"
        : "h-9 min-w-9 px-1.5 text-[10px] rounded-[12px]";

  return (
    <span
      aria-label={`${brand.label} logo`}
      title={brand.label}
      className={`inline-flex shrink-0 items-center justify-center border font-black tracking-[-0.04em] ${sizeClass} ${className}`}
      style={
        {
          color: brand.accentColor,
          borderColor: `color-mix(in srgb, ${brand.accentColor}, transparent 65%)`,
          background: `color-mix(in srgb, ${brand.accentColor}, transparent 90%)`,
          "--account-brand-color": brand.accentColor,
        } as CSSProperties
      }
    >
      {brand.mark}
    </span>
  );
}
