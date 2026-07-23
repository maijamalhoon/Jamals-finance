export const BRAND = {
  version: 1,
  internalId: "jf-platform",
  name: "JALVORO",
  displayName: "JALVORO",
  shortName: "Jalvoro",
  legalName: "JALVORO",
  tagline: "Everything you run. One place.",
  description:
    "One connected platform for personal finance, shops, teams, and business operations.",
  productFamily: {
    personal: "Jalvoro Personal",
    business: "Jalvoro Business",
    pos: "Jalvoro POS",
    erp: "Jalvoro ERP",
    crm: "Jalvoro CRM",
  },
  assets: {
    logoMark: "/brand/logo-mark.svg",
    wordmark: "/brand/wordmark.svg",
    appIcon: "/brand/app-icon.svg",
  },
  iconSystem: {
    family: "jalvoro-icons-v1",
    style: "rounded-monoline",
    grid: 24,
    strokeWidth: 2.4,
    lineCap: "round",
    lineJoin: "round",
  },
} as const;

export type BrandConfig = typeof BRAND;
