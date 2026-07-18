export type AccountIconKey =
  | "bank"
  | "wallet"
  | "card"
  | "phone"
  | "cash"
  | "business"
  | "savings";

export type AccountBrand = {
  key: string;
  label: string;
  domain: string;
  patterns: RegExp[];
  accentColor: string;
  accentValue:
    | "blue"
    | "green"
    | "orange"
    | "purple"
    | "cyan"
    | "rose"
    | "amber"
    | "slate";
  legacyType: string;
};

const ACCOUNT_BRANDS: AccountBrand[] = [
  {
    key: "ubl",
    label: "United Bank Limited",
    domain: "ubldigital.com",
    patterns: [/\bubl\b/i, /united\s+bank\s+limited/i],
    accentColor: "#1F5AA6",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "hbl",
    label: "Habib Bank Limited",
    domain: "hbl.com",
    patterns: [/\bhbl\b/i, /habib\s+bank\s+limited/i],
    accentColor: "#007A5E",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "meezan",
    label: "Meezan Bank",
    domain: "meezanbank.com",
    patterns: [/meezan/i],
    accentColor: "#6E2B78",
    accentValue: "purple",
    legacyType: "bank",
  },
  {
    key: "allied",
    label: "Allied Bank",
    domain: "abl.com",
    patterns: [/\babl\b/i, /allied\s+bank/i],
    accentColor: "#156B42",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "mcb",
    label: "MCB Bank",
    domain: "mcb.com.pk",
    patterns: [/\bmcb\b/i, /muslim\s+commercial\s+bank/i],
    accentColor: "#C62828",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "bank-alfalah",
    label: "Bank Alfalah",
    domain: "bankalfalah.com",
    patterns: [/alfalah/i],
    accentColor: "#B12430",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "habib-metro",
    label: "Habib Metropolitan Bank",
    domain: "habibmetro.com",
    patterns: [/habib\s*metro/i, /habib\s+metropolitan/i],
    accentColor: "#176A45",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "bank-al-habib",
    label: "Bank AL Habib",
    domain: "bankalhabib.com",
    patterns: [/bank\s+al\s+habib/i, /\bbahl\b/i],
    accentColor: "#1C4E8A",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "standard-chartered",
    label: "Standard Chartered",
    domain: "sc.com",
    patterns: [/standard\s+chartered/i, /\bscb\b/i],
    accentColor: "#087E8B",
    accentValue: "cyan",
    legacyType: "bank",
  },
  {
    key: "faysal",
    label: "Faysal Bank",
    domain: "faysalbank.com",
    patterns: [/faysal/i, /\bfbl\b/i],
    accentColor: "#166B4A",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "askari",
    label: "Askari Bank",
    domain: "askaribank.com",
    patterns: [/askari/i, /\bakbl\b/i],
    accentColor: "#315D3D",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "js-bank",
    label: "JS Bank",
    domain: "jsbl.com",
    patterns: [/\bjs\s*bank\b/i],
    accentColor: "#E07128",
    accentValue: "orange",
    legacyType: "bank",
  },
  {
    key: "nbp",
    label: "National Bank of Pakistan",
    domain: "nbp.com.pk",
    patterns: [/\bnbp\b/i, /national\s+bank\s+of\s+pakistan/i],
    accentColor: "#1A6B45",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "bank-of-punjab",
    label: "The Bank of Punjab",
    domain: "bop.com.pk",
    patterns: [/bank\s+of\s+punjab/i, /\bbop\b/i],
    accentColor: "#147A4B",
    accentValue: "green",
    legacyType: "bank",
  },
  {
    key: "bank-of-america",
    label: "Bank of America",
    domain: "bankofamerica.com",
    patterns: [/bank\s+of\s+america/i, /\bbofa\b/i],
    accentColor: "#C41230",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "chase",
    label: "JPMorgan Chase",
    domain: "chase.com",
    patterns: [/jpmorgan/i, /jp\s*morgan/i, /\bchase\b/i],
    accentColor: "#1261A0",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "wells-fargo",
    label: "Wells Fargo",
    domain: "wellsfargo.com",
    patterns: [/wells\s+fargo/i],
    accentColor: "#B31E2F",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "citi",
    label: "Citibank",
    domain: "citi.com",
    patterns: [/\bciti(?:bank)?\b/i],
    accentColor: "#056DAE",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "hsbc",
    label: "HSBC",
    domain: "hsbc.com",
    patterns: [/\bhsbc\b/i],
    accentColor: "#DB0011",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "barclays",
    label: "Barclays",
    domain: "barclays.com",
    patterns: [/barclays/i],
    accentColor: "#00AEEF",
    accentValue: "cyan",
    legacyType: "bank",
  },
  {
    key: "deutsche-bank",
    label: "Deutsche Bank",
    domain: "db.com",
    patterns: [/deutsche\s+bank/i],
    accentColor: "#0018A8",
    accentValue: "blue",
    legacyType: "bank",
  },
  {
    key: "ubs",
    label: "UBS",
    domain: "ubs.com",
    patterns: [/\bubs\b/i],
    accentColor: "#D10A11",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "santander",
    label: "Santander",
    domain: "santander.com",
    patterns: [/santander/i],
    accentColor: "#EC0000",
    accentValue: "rose",
    legacyType: "bank",
  },
  {
    key: "jazzcash",
    label: "JazzCash",
    domain: "jazzcash.com.pk",
    patterns: [/jazz\s*cash/i],
    accentColor: "#D6242F",
    accentValue: "rose",
    legacyType: "jazzcash",
  },
  {
    key: "easypaisa",
    label: "Easypaisa",
    domain: "easypaisa.com.pk",
    patterns: [/easy\s*paisa/i],
    accentColor: "#169B62",
    accentValue: "green",
    legacyType: "easypaisa",
  },
  {
    key: "sadapay",
    label: "SadaPay",
    domain: "sadapay.pk",
    patterns: [/sada\s*pay/i],
    accentColor: "#E56B68",
    accentValue: "rose",
    legacyType: "sadapay",
  },
  {
    key: "nayapay",
    label: "NayaPay",
    domain: "nayapay.com",
    patterns: [/naya\s*pay/i],
    accentColor: "#4755C7",
    accentValue: "blue",
    legacyType: "nayapay",
  },
  {
    key: "paypal",
    label: "PayPal",
    domain: "paypal.com",
    patterns: [/pay\s*pal/i],
    accentColor: "#003087",
    accentValue: "blue",
    legacyType: "wallet",
  },
  {
    key: "venmo",
    label: "Venmo",
    domain: "venmo.com",
    patterns: [/venmo/i],
    accentColor: "#008CFF",
    accentValue: "cyan",
    legacyType: "wallet",
  },
  {
    key: "cash-app",
    label: "Cash App",
    domain: "cash.app",
    patterns: [/cash\s+app/i],
    accentColor: "#00D64F",
    accentValue: "green",
    legacyType: "wallet",
  },
  {
    key: "wise",
    label: "Wise",
    domain: "wise.com",
    patterns: [/\bwise\b/i, /transferwise/i],
    accentColor: "#163300",
    accentValue: "green",
    legacyType: "wallet",
  },
  {
    key: "revolut",
    label: "Revolut",
    domain: "revolut.com",
    patterns: [/revolut/i],
    accentColor: "#191C1F",
    accentValue: "slate",
    legacyType: "wallet",
  },
  {
    key: "payoneer",
    label: "Payoneer",
    domain: "payoneer.com",
    patterns: [/payoneer/i],
    accentColor: "#D74931",
    accentValue: "orange",
    legacyType: "wallet",
  },
];

const GENERIC_ICON_KEYS = new Set<AccountIconKey>([
  "bank",
  "wallet",
  "card",
  "phone",
  "cash",
  "business",
  "savings",
]);

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

export function inferAccountIconKey(
  name?: string | null,
  iconKey?: string | null,
  type?: string | null,
): AccountIconKey {
  const cleanName = name?.trim().toLowerCase() ?? "";

  if (/\b(cash|petty cash|cash box|cash in hand)\b/.test(cleanName)) {
    return "cash";
  }
  if (/\b(wallet|purse)\b/.test(cleanName)) return "wallet";
  if (/\b(card|credit card|debit card)\b/.test(cleanName)) return "card";
  if (/\b(phone|mobile|sim)\b/.test(cleanName)) return "phone";
  if (/\b(business|company|corporate|shop|store)\b/.test(cleanName)) {
    return "business";
  }
  if (/\b(saving|savings|deposit|reserve)\b/.test(cleanName)) {
    return "savings";
  }
  if (/\b(bank|credit union|finance|financial)\b/.test(cleanName)) {
    return "bank";
  }

  const storedIcon = iconKey?.replace(/^brand:/, "") as AccountIconKey | undefined;
  if (storedIcon && GENERIC_ICON_KEYS.has(storedIcon)) return storedIcon;

  const storedType = type as AccountIconKey | undefined;
  if (storedType && GENERIC_ICON_KEYS.has(storedType)) return storedType;

  return "bank";
}

export function shouldAttemptAccountLogo(
  name?: string | null,
  iconKey?: string | null,
  type?: string | null,
) {
  if (detectAccountBrand(name, iconKey)) return true;

  const cleanName = name?.trim().toLowerCase() ?? "";
  if (!cleanName) return false;

  const genericOnly = /^(my\s+)?(cash|wallet|card|phone|mobile|business|savings?|account)$/i.test(
    cleanName,
  );
  if (genericOnly) return false;

  return /\b(bank|credit union|microfinance|financial|finance|payments?|pay|wallet)\b/i.test(
    `${cleanName} ${type ?? ""}`,
  );
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

  const iconKey = inferAccountIconKey(name, current?.iconKey, current?.type);
  const legacyType =
    iconKey === "savings" || iconKey === "card" || iconKey === "phone"
      ? "bank"
      : iconKey;

  return {
    brand: null,
    iconKey,
    accentColor: current?.accentColor || "blue",
    legacyType,
  };
}
