export type BillingPlanCatalogItem = {
  code: string;
  name: string;
  kind: "free" | "paid";
  billingInterval: "free" | "month" | "year" | "one_time";
  priceMajor: number | null;
  currency: string | null;
  currencyExponent: number;
  isActive: boolean;
  totalUsers: number;
  trialUsers: number;
  activeUsers: number;
  pastDueUsers: number;
  cancelledUsers: number;
  editable: boolean;
};

export type BillingOperationsSnapshot = {
  operationsAllowed: boolean;
  providerConnected: boolean;
  planCatalog: BillingPlanCatalogItem[];
  webhooks: {
    received24h: number;
    pending: number;
    processed24h: number;
    failed24h: number;
    ignored24h: number;
    lastReceivedAt: string | null;
    lastProcessedAt: string | null;
    expiredPending: number;
  };
  auditEvents30d: number;
  expiredAuditPending: number;
  rawWebhookPayloadStored: false;
  cardDataStored: false;
  featureLimitsAttached: false;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCount(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : null;
}

function readMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000
    ? amount
    : null;
}

function readString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maximumLength
    ? normalized
    : null;
}

function readNullableDate(value: unknown) {
  if (value === null) return null;
  const parsed = readString(value, 64);
  return parsed && !Number.isNaN(Date.parse(parsed)) ? parsed : undefined;
}

function readPlanCatalog(value: unknown): BillingPlanCatalogItem[] | null {
  if (!Array.isArray(value) || value.length > 40) return null;

  const parsed: BillingPlanCatalogItem[] = [];
  for (const item of value) {
    if (!isRecord(item)) return null;

    const code = readString(item.code, 40);
    const name = readString(item.name, 80);
    const kind = item.kind;
    const billingInterval = item.billingInterval;
    const currency = item.currency === null ? null : readString(item.currency, 3);
    const currencyExponent = readCount(item.currencyExponent);
    const totalUsers = readCount(item.totalUsers);
    const trialUsers = readCount(item.trialUsers);
    const activeUsers = readCount(item.activeUsers);
    const pastDueUsers = readCount(item.pastDueUsers);
    const cancelledUsers = readCount(item.cancelledUsers);
    const priceMajor = item.priceMajor === null ? null : readMoney(item.priceMajor);

    if (
      !code?.match(/^[a-z0-9][a-z0-9_-]{1,39}$/) ||
      !name ||
      (kind !== "free" && kind !== "paid") ||
      !["free", "month", "year", "one_time"].includes(
        String(billingInterval),
      ) ||
      currencyExponent === null ||
      currencyExponent > 3 ||
      totalUsers === null ||
      trialUsers === null ||
      activeUsers === null ||
      pastDueUsers === null ||
      cancelledUsers === null ||
      typeof item.isActive !== "boolean" ||
      typeof item.editable !== "boolean"
    ) {
      return null;
    }

    if (kind === "free") {
      if (
        code !== "free" ||
        billingInterval !== "free" ||
        priceMajor !== 0 ||
        currency !== null ||
        item.editable
      ) {
        return null;
      }
    } else if (
      billingInterval === "free" ||
      priceMajor === null ||
      priceMajor <= 0 ||
      !currency?.match(/^[A-Z]{3}$/)
    ) {
      return null;
    }

    if (
      trialUsers + activeUsers + pastDueUsers + cancelledUsers > totalUsers
    ) {
      return null;
    }

    parsed.push({
      code,
      name,
      kind,
      billingInterval: billingInterval as BillingPlanCatalogItem["billingInterval"],
      priceMajor,
      currency,
      currencyExponent,
      isActive: item.isActive,
      totalUsers,
      trialUsers,
      activeUsers,
      pastDueUsers,
      cancelledUsers,
      editable: item.editable,
    });
  }

  return parsed;
}

export function parseBillingOperationsSnapshot(
  value: unknown,
): BillingOperationsSnapshot | null {
  if (!isRecord(value) || !isRecord(value.billingOperations)) return null;

  const operations = value.billingOperations;
  const webhooks = operations.webhooks;
  const planCatalog = readPlanCatalog(operations.planCatalog);

  if (
    typeof operations.operationsAllowed !== "boolean" ||
    typeof operations.providerConnected !== "boolean" ||
    !isRecord(webhooks) ||
    !planCatalog ||
    operations.rawWebhookPayloadStored !== false ||
    operations.cardDataStored !== false ||
    operations.featureLimitsAttached !== false
  ) {
    return null;
  }

  const received24h = readCount(webhooks.received24h);
  const pending = readCount(webhooks.pending);
  const processed24h = readCount(webhooks.processed24h);
  const failed24h = readCount(webhooks.failed24h);
  const ignored24h = readCount(webhooks.ignored24h);
  const expiredPending = readCount(webhooks.expiredPending);
  const auditEvents30d = readCount(operations.auditEvents30d);
  const expiredAuditPending = readCount(operations.expiredAuditPending);
  const lastReceivedAt = readNullableDate(webhooks.lastReceivedAt);
  const lastProcessedAt = readNullableDate(webhooks.lastProcessedAt);

  if (
    [
      received24h,
      pending,
      processed24h,
      failed24h,
      ignored24h,
      expiredPending,
      auditEvents30d,
      expiredAuditPending,
    ].some((count) => count === null) ||
    lastReceivedAt === undefined ||
    lastProcessedAt === undefined
  ) {
    return null;
  }

  return {
    operationsAllowed: operations.operationsAllowed,
    providerConnected: operations.providerConnected,
    planCatalog,
    webhooks: {
      received24h: received24h!,
      pending: pending!,
      processed24h: processed24h!,
      failed24h: failed24h!,
      ignored24h: ignored24h!,
      lastReceivedAt,
      lastProcessedAt,
      expiredPending: expiredPending!,
    },
    auditEvents30d: auditEvents30d!,
    expiredAuditPending: expiredAuditPending!,
    rawWebhookPayloadStored: false,
    cardDataStored: false,
    featureLimitsAttached: false,
  };
}

export function formatPlanPrice(plan: BillingPlanCatalogItem) {
  if (plan.kind === "free" || plan.priceMajor === null || !plan.currency) {
    return "Free";
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: plan.currency,
      minimumFractionDigits: plan.currencyExponent,
      maximumFractionDigits: plan.currencyExponent,
    }).format(plan.priceMajor);
  } catch {
    return `${plan.currency} ${plan.priceMajor.toFixed(plan.currencyExponent)}`;
  }
}
