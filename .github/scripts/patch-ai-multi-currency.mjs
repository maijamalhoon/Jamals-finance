import fs from "node:fs";

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Ambiguous patch target: ${label}`);
  }
  return `${source.slice(0, index)}${after}${source.slice(index + before.length)}`;
}

function patch(path, transform) {
  const original = fs.readFileSync(path, "utf8");
  const next = transform(original);
  if (next === original) throw new Error(`No changes produced for ${path}`);
  fs.writeFileSync(path, next);
}

patch("app/api/ai-insights/route.ts", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    `import {\n  BASE_CURRENCY,\n  FALLBACK_USD_PKR_RATE,\n  formatMoney,\n  isSupportedCurrency,\n  normalizeUsdToPkrRate,\n  type SupportedCurrency,\n} from "@/lib/currency";`,
    `import { BASE_CURRENCY, formatMoney } from "@/lib/currency";\nimport {\n  getServerCurrencyContext,\n  type ServerCurrencyContext,\n} from "@/lib/ai/server-currency";`,
    "main AI currency imports",
  );
  source = replaceOnce(
    source,
    `type CurrencyRequestContext = {\n  currency: SupportedCurrency;\n  rate: number;\n  live: boolean;\n};`,
    `type CurrencyRequestContext = ServerCurrencyContext;`,
    "main AI currency context type",
  );
  source = replaceOnce(
    source,
    `function formatDisplayMoney(\n  value: number,\n  context: CurrencyRequestContext,\n) {\n  return formatMoney(value, {\n    currency: context.currency,\n    usdToPkrRate: context.rate,\n  });\n}`,
    `function formatDisplayMoney(\n  value: number,\n  context: CurrencyRequestContext,\n) {\n  if (!context.usable && context.currency !== BASE_CURRENCY) return "—";\n\n  return formatMoney(value, {\n    currency: context.currency,\n    rates: context.rates,\n  });\n}`,
    "main AI money formatter",
  );
  source = replaceOnce(
    source,
    `function getCurrencyRequestContext(\n  request?: NextRequest,\n): CurrencyRequestContext {\n  const currencyParam = request?.nextUrl.searchParams.get("currency");\n  const rateParam = request?.nextUrl.searchParams.get("rate");\n  const liveParam = request?.nextUrl.searchParams.get("rateLive");\n  const requestedCurrency = currencyParam?.toUpperCase();\n\n  return {\n    currency: isSupportedCurrency(requestedCurrency)\n      ? requestedCurrency\n      : BASE_CURRENCY,\n    rate: normalizeUsdToPkrRate(\n      rateParam === null || rateParam === undefined\n        ? FALLBACK_USD_PKR_RATE\n        : Number(rateParam),\n    ),\n    live: liveParam === "1" || liveParam === "true",\n  };\n}\n\nfunction getCurrencyContextFromBody(body: unknown): CurrencyRequestContext {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency.toUpperCase()\n      : null;\n  const requestedRate =\n    isRecord(body) && typeof body.rate === "number" ? body.rate : null;\n\n  return {\n    currency: isSupportedCurrency(requestedCurrency)\n      ? requestedCurrency\n      : BASE_CURRENCY,\n    rate: normalizeUsdToPkrRate(requestedRate),\n    live: isRecord(body) && body.rateLive === true,\n  };\n}`,
    `async function getCurrencyRequestContext(\n  request?: NextRequest,\n): Promise<CurrencyRequestContext> {\n  return getServerCurrencyContext(\n    request?.nextUrl.searchParams.get("currency"),\n  );\n}\n\nasync function getCurrencyContextFromBody(\n  body: unknown,\n): Promise<CurrencyRequestContext> {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency\n      : null;\n  return getServerCurrencyContext(requestedCurrency);\n}`,
    "main AI request currency helpers",
  );
  source = source.replace(
    "const currencyContext = getCurrencyRequestContext(request);",
    "const currencyContext = await getCurrencyRequestContext(request);",
  );
  source = source.replace(
    "const currencyContext = getCurrencyContextFromBody(body);",
    "const currencyContext = await getCurrencyContextFromBody(body);",
  );
  return source;
});

patch("app/api/ai-insights/chat/route.ts", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    `import {\n  BASE_CURRENCY,\n  FALLBACK_USD_PKR_RATE,\n  formatMoney,\n  isSupportedCurrency,\n  normalizeUsdToPkrRate,\n  type SupportedCurrency,\n} from "@/lib/currency";`,
    `import { BASE_CURRENCY, formatMoney } from "@/lib/currency";\nimport {\n  getServerCurrencyContext,\n  type ServerCurrencyContext,\n} from "@/lib/ai/server-currency";`,
    "chat AI currency imports",
  );
  source = replaceOnce(
    source,
    `type CurrencyContext = {\n  currency: SupportedCurrency;\n  rate: number;\n  live: boolean;\n};`,
    `type CurrencyContext = ServerCurrencyContext;`,
    "chat AI currency context type",
  );
  source = replaceOnce(
    source,
    `function getCurrencyContextFromBody(body: unknown): CurrencyContext {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency.toUpperCase()\n      : null;\n  const requestedRate =\n    isRecord(body) && typeof body.rate === "number" ? body.rate : null;\n\n  return {\n    currency: isSupportedCurrency(requestedCurrency)\n      ? requestedCurrency\n      : BASE_CURRENCY,\n    rate: normalizeUsdToPkrRate(\n      requestedRate === null ? FALLBACK_USD_PKR_RATE : requestedRate,\n    ),\n    live: isRecord(body) && body.rateLive === true,\n  };\n}`,
    `async function getCurrencyContextFromBody(\n  body: unknown,\n): Promise<CurrencyContext> {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency\n      : null;\n  return getServerCurrencyContext(requestedCurrency);\n}`,
    "chat AI body currency helper",
  );
  source = replaceOnce(
    source,
    `function formatDisplayMoney(value: number, context: CurrencyContext) {\n  return formatMoney(value, {\n    currency: context.currency,\n    usdToPkrRate: context.rate,\n  });\n}`,
    `function formatDisplayMoney(value: number, context: CurrencyContext) {\n  if (!context.usable && context.currency !== BASE_CURRENCY) return "—";\n\n  return formatMoney(value, {\n    currency: context.currency,\n    rates: context.rates,\n  });\n}`,
    "chat AI money formatter",
  );
  source = source.replace(
    "const context = getCurrencyContextFromBody(body);",
    "const context = await getCurrencyContextFromBody(body);",
  );
  return source;
});

patch("app/api/ai-insights/exact/route.ts", (input) => {
  let source = input;
  source = replaceOnce(
    source,
    `import {\n  BASE_CURRENCY,\n  FALLBACK_USD_PKR_RATE,\n  formatMoney,\n  isSupportedCurrency,\n  normalizeUsdToPkrRate,\n  type SupportedCurrency,\n} from "@/lib/currency";`,
    `import { BASE_CURRENCY, formatMoney } from "@/lib/currency";\nimport { getServerCurrencyContext } from "@/lib/ai/server-currency";`,
    "exact AI currency imports",
  );
  source = replaceOnce(
    source,
    `type CurrencyContext = {\n  currency: SupportedCurrency;\n  rate: number;\n};\n\nfunction getCurrencyContext(body: unknown): CurrencyContext {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency.toUpperCase()\n      : null;\n  const requestedRate =\n    isRecord(body) && typeof body.rate === "number" ? body.rate : null;\n\n  return {\n    currency: isSupportedCurrency(requestedCurrency)\n      ? requestedCurrency\n      : BASE_CURRENCY,\n    rate: normalizeUsdToPkrRate(\n      requestedRate === null ? FALLBACK_USD_PKR_RATE : requestedRate,\n    ),\n  };\n}`,
    `async function getCurrencyContext(body: unknown) {\n  const requestedCurrency =\n    isRecord(body) && typeof body.currency === "string"\n      ? body.currency\n      : null;\n  return getServerCurrencyContext(requestedCurrency);\n}`,
    "exact AI currency helper",
  );
  source = source.replace(
    "const context = getCurrencyContext(body);",
    "const context = await getCurrencyContext(body);",
  );
  source = replaceOnce(
    source,
    `    const money = (value: number) =>\n      formatMoney(value, {\n        currency: context.currency,\n        usdToPkrRate: context.rate,\n      });`,
    `    const money = (value: number) =>\n      !context.usable && context.currency !== BASE_CURRENCY\n        ? "—"\n        : formatMoney(value, {\n            currency: context.currency,\n            rates: context.rates,\n          });`,
    "exact AI money formatter",
  );
  return source;
});

console.log("Patched AI currency routes.");
