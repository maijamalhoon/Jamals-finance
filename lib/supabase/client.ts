import { createBrowserClient } from "@supabase/ssr";

import {
  CURRENCY_STORAGE_KEY,
  EXCHANGE_RATE_STORAGE_KEY,
  FALLBACK_CURRENCY_RATES,
  isSupportedCurrency,
  isValidCurrencyRates,
  type CurrencyRates,
  type SupportedCurrency,
} from "@/lib/currency";
import { prepareMoneyInput } from "@/lib/currency-input";

export const SUPABASE_BROWSER_AUTH_OPTIONS = Object.freeze({
  detectSessionInUrl: false,
} as const);

type JsonRecord = Record<string, unknown>;

type CurrencyContext = {
  currency: SupportedCurrency;
  rates: CurrencyRates;
};

function readCurrencyContext(): CurrencyContext {
  if (typeof window === "undefined") {
    return { currency: "PKR", rates: FALLBACK_CURRENCY_RATES };
  }

  const storedCurrency = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
  const currency = isSupportedCurrency(storedCurrency) ? storedCurrency : "PKR";

  try {
    const raw = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as { rates?: unknown }) : null;
    if (parsed && isValidCurrencyRates(parsed.rates)) {
      return { currency, rates: parsed.rates };
    }
  } catch {
    // Use the validated emergency matrix below.
  }

  return { currency, rates: FALLBACK_CURRENCY_RATES };
}

function hasAnyKey(row: JsonRecord, keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(row, key));
}

function normalizeField(
  row: JsonRecord,
  amountField: string,
  metadata: {
    originalField: string;
    currencyField: string;
    rateField: string;
  },
  context: CurrencyContext,
) {
  if (!Object.prototype.hasOwnProperty.call(row, amountField)) return row;
  if (
    hasAnyKey(row, [
      metadata.originalField,
      metadata.currencyField,
      metadata.rateField,
    ])
  ) {
    return row;
  }

  const prepared = prepareMoneyInput(
    row[amountField] as string | number | null | undefined,
    context.currency,
    context.rates,
  );
  if (!prepared) return row;

  return {
    ...row,
    [amountField]: prepared.amountPkr,
    [metadata.originalField]: prepared.originalAmount,
    [metadata.currencyField]: prepared.currency,
    [metadata.rateField]: prepared.exchangeRateToPkr,
  };
}

function normalizeFinancialMutation(table: string, row: JsonRecord) {
  const context = readCurrencyContext();

  switch (table) {
    case "transactions":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "account_transfers":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "accounts":
      return normalizeField(
        row,
        "balance",
        {
          originalField: "opening_balance_original",
          currencyField: "opening_currency",
          rateField: "opening_exchange_rate_to_pkr",
        },
        context,
      );

    case "goals":
      return normalizeField(
        row,
        "target_amount",
        {
          originalField: "target_amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "goal_contributions":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "liability_payments":
      return normalizeField(
        row,
        "amount",
        {
          originalField: "amount_original",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

    case "liabilities": {
      const normalized = normalizeField(
        row,
        "original_value",
        {
          originalField: "original_value_input",
          currencyField: "currency",
          rateField: "exchange_rate_to_pkr",
        },
        context,
      );

      const original = prepareMoneyInput(
        row.original_value as string | number | null | undefined,
        context.currency,
        context.rates,
      );
      if (!original) return normalized;

      let next = normalized;
      for (const field of ["paid_amount", "remaining_amount"] as const) {
        if (!Object.prototype.hasOwnProperty.call(row, field)) continue;
        const value = prepareMoneyInput(
          row[field] as string | number | null | undefined,
          context.currency,
          context.rates,
        );
        if (value) next = { ...next, [field]: value.amountPkr };
      }
      return next;
    }

    default:
      return row;
  }
}

function normalizePayload(table: string, payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.map((row) =>
      row && typeof row === "object"
        ? normalizeFinancialMutation(table, row as JsonRecord)
        : row,
    );
  }

  if (payload && typeof payload === "object") {
    return normalizeFinancialMutation(table, payload as JsonRecord);
  }

  return payload;
}

function wrapTableBuilder<T extends object>(table: string, builder: T): T {
  return new Proxy(builder, {
    get(target, property, receiver) {
      if (
        property === "insert" ||
        property === "update" ||
        property === "upsert"
      ) {
        const method = Reflect.get(target, property, target) as (
          payload: unknown,
          options?: unknown,
        ) => unknown;

        return (payload: unknown, options?: unknown) =>
          method.call(target, normalizePayload(table, payload), options);
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase browser configuration is unavailable.");
  }

  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: SUPABASE_BROWSER_AUTH_OPTIONS,
  });

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "from") {
        return (table: string) =>
          wrapTableBuilder(
            table,
            target.from(table as never) as unknown as object,
          );
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as typeof client;
}
