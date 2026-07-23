export type AdvancedFinanceIntent =
  | { kind: "monthly_average" }
  | {
      kind: "peak_spending";
      dimension: "date" | "month" | "category";
    }
  | {
      kind: "flow_map";
      direction: "income" | "expense" | "both";
    }
  | {
      kind: "projection";
      years: number | null;
      annualReturnPct: number | null;
      inflationPct: number | null;
    }
  | {
      kind: "inflation";
      years: number | null;
      inflationPct: number | null;
      amount: number | null;
    };

export type AdvancedFinanceTransaction = {
  amount: number;
  date: string;
  type: string;
  category?: string | null;
  account?: string | null;
  sourceName?: string | null;
  personName?: string | null;
  itemName?: string | null;
  note?: string | null;
};

export type RankedAmount = {
  label: string;
  amount: number;
};

export type FinanceHistoryAnalysis = {
  firstDate: string | null;
  lastDate: string | null;
  monthCount: number;
  totals: {
    income: number;
    expenses: number;
    savings: number;
  };
  monthlyAverage: {
    income: number;
    expenses: number;
    savings: number;
  };
  peakSpending: {
    date: RankedAmount | null;
    month: RankedAmount | null;
    category: RankedAmount | null;
  };
  incomeSources: RankedAmount[];
  expenseDestinations: RankedAmount[];
};

const ADVANCED_REPLACEMENTS: readonly [RegExp, string][] = [
  // Roman Urdu.
  [/\b(?:bachat|saving|savings)\b/giu, "savings"],
  [/\b(?:ausat|average|avg)\b/giu, "average"],
  [/\b(?:har\s+mahina|mahina\s+war|monthly)\b/giu, "monthly"],
  [/\b(?:sab\s+se\s+zyada|sabse\s+zyada|highest|maximum|biggest)\b/giu, "highest"],
  [/\b(?:kis\s+din|which\s+date|which\s+day)\b/giu, "which date"],
  [/\b(?:kis\s+mahine|which\s+month)\b/giu, "which month"],
  [/\b(?:kahan\s+se\s+(?:aya|aaya)|paisa\s+kahan\s+se|money\s+source)\b/giu, "where money came from"],
  [/\b(?:kahan\s+(?:gaya|kharch\s+hua|spend\s+hua)|money\s+went)\b/giu, "where money went"],
  [/\b(?:mehngai|mehangai|inflation)\b/giu, "inflation"],
  [/\b(?:asal\s+qeemat|real\s+value|purchasing\s+power)\b/giu, "real value"],
  [/\b(?:saal|years?)\b/giu, "years"],

  // Urdu script.
  [/(?:بچت)/gu, " savings "],
  [/(?:اوسط)/gu, " average "],
  [/(?:ماہانہ|ہر\s+مہینے)/gu, " monthly "],
  [/(?:سب\s+سے\s+زیادہ)/gu, " highest "],
  [/(?:کس\s+دن)/gu, " which date "],
  [/(?:کس\s+مہینے)/gu, " which month "],
  [/(?:پیسہ\s+کہاں\s+سے\s+آیا)/gu, " where money came from "],
  [/(?:پیسہ\s+کہاں\s+خرچ\s+ہوا|پیسہ\s+کہاں\s+گیا)/gu, " where money went "],
  [/(?:مہنگائی)/gu, " inflation "],
  [/(?:حقیقی\s+قدر|اصل\s+قدر)/gu, " real value "],
  [/(?:سال)/gu, " years "],

  // Hindi.
  [/(?:बचत)/gu, " savings "],
  [/(?:औसत)/gu, " average "],
  [/(?:मासिक|हर\s+महीने)/gu, " monthly "],
  [/(?:सबसे\s+ज़्यादा|सबसे\s+ज्यादा)/gu, " highest "],
  [/(?:किस\s+दिन)/gu, " which date "],
  [/(?:किस\s+महीने)/gu, " which month "],
  [/(?:पैसा\s+कहाँ\s+से\s+आया)/gu, " where money came from "],
  [/(?:पैसा\s+कहाँ\s+खर्च\s+हुआ|पैसा\s+कहाँ\s+गया)/gu, " where money went "],
  [/(?:महंगाई|मुद्रास्फीति)/gu, " inflation "],
  [/(?:वास्तविक\s+मूल्य|खरीद\s+शक्ति)/gu, " real value "],
  [/(?:साल|वर्ष)/gu, " years "],

  // Arabic.
  [/(?:ادخار|مدخرات)/gu, " savings "],
  [/(?:متوسط)/gu, " average "],
  [/(?:شهري|كل\s+شهر)/gu, " monthly "],
  [/(?:الأعلى|أكبر\s+إنفاق|أكثر\s+إنفاق)/gu, " highest spending "],
  [/(?:أي\s+يوم|أي\s+تاريخ)/gu, " which date "],
  [/(?:أي\s+شهر)/gu, " which month "],
  [/(?:من\s+أين\s+جاء\s+المال)/gu, " where money came from "],
  [/(?:أين\s+ذهب\s+المال|أين\s+أُنفِق\s+المال)/gu, " where money went "],
  [/(?:تضخم)/gu, " inflation "],
  [/(?:القيمة\s+الحقيقية|القوة\s+الشرائية)/gu, " real value "],
  [/(?:سنوات|سنة)/gu, " years "],

  // Spanish.
  [/\b(?:ahorro|ahorros)\b/giu, "savings"],
  [/\bpromedio\b/giu, "average"],
  [/\bmensual\b/giu, "monthly"],
  [/\b(?:más\s+alto|mayor|máximo)\b/giu, "highest"],
  [/\bqué\s+(?:día|fecha)\b/giu, "which date"],
  [/\bqué\s+mes\b/giu, "which month"],
  [/\bde\s+dónde\s+vino\s+el\s+dinero\b/giu, "where money came from"],
  [/\badónde\s+fue\s+el\s+dinero\b/giu, "where money went"],
  [/\binflación\b/giu, "inflation"],
  [/\b(?:valor\s+real|poder\s+adquisitivo)\b/giu, "real value"],
  [/\baños?\b/giu, "years"],
];

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeAdvancedFinanceQuestion(question: string) {
  return normalizeWhitespace(
    ADVANCED_REPLACEMENTS.reduce(
      (value, [pattern, replacement]) => value.replace(pattern, replacement),
      question.normalize("NFKC"),
    ),
  ).slice(0, 500);
}

function extractYears(question: string) {
  const match = question.match(/\b(\d{1,3})\s*years?\b/i);
  if (!match) return null;
  const years = Number(match[1]);
  return Number.isFinite(years) && years > 0 && years <= 100 ? years : null;
}

function extractPercent(question: string, nearby: RegExp) {
  const directional = question.match(nearby);
  if (directional?.[1]) {
    const value = Number(directional[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 100) return value;
  }
  return null;
}

function extractExplicitAmount(question: string) {
  const currencyAmount = question.match(
    /(?:pkr|usd|inr|eur|gbp|jpy|cny|rs\.?|₨|\$|€|£|₹)\s*([\d,]+(?:\.\d+)?)/i,
  );
  const trailingCurrency = question.match(
    /([\d,]+(?:\.\d+)?)\s*(?:pkr|usd|inr|eur|gbp|jpy|cny)\b/i,
  );
  const raw = currencyAmount?.[1] ?? trailingCurrency?.[1];
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseAdvancedFinanceIntent(
  rawQuestion: string,
): AdvancedFinanceIntent | null {
  const question = normalizeAdvancedFinanceQuestion(rawQuestion).toLowerCase();
  const asksAverage = /\b(?:average|monthly average|on average)\b/.test(question);
  const hasCoreFlow = /\b(?:income|spending|expenses|savings|cash flow)\b/.test(
    question,
  );

  if (asksAverage && hasCoreFlow) {
    return { kind: "monthly_average" };
  }

  if (
    /\b(?:highest|most|maximum|biggest|top)\b/.test(question) &&
    /\b(?:spend|spent|spending|expense|expenses)\b/.test(question)
  ) {
    const dimension =
      /\b(?:month|monthly)\b/.test(question)
        ? "month"
        : /\b(?:category|where|on what)\b/.test(question)
          ? "category"
          : "date";
    return { kind: "peak_spending", dimension };
  }

  const asksIncomeSource =
    /\b(?:where money came from|income source|source of income|earned from)\b/.test(
      question,
    );
  const asksExpenseDestination =
    /\b(?:where money went|where.*spent|spent on|expense destination)\b/.test(
      question,
    );
  if (asksIncomeSource || asksExpenseDestination) {
    return {
      kind: "flow_map",
      direction:
        asksIncomeSource && asksExpenseDestination
          ? "both"
          : asksIncomeSource
            ? "income"
            : "expense",
    };
  }

  const years = extractYears(question);
  const inflationPct = extractPercent(
    question,
    /(?:inflation|at)\s*(?:rate\s*)?(?:of\s*)?(\d+(?:\.\d+)?)\s*%/i,
  );
  const annualReturnPct = extractPercent(
    question,
    /(?:return|growth|profit|interest)\s*(?:rate\s*)?(?:of\s*)?(\d+(?:\.\d+)?)\s*%/i,
  );
  const asksInflation = /\b(?:inflation|real value|purchasing power)\b/.test(
    question,
  );
  const asksProjection =
    /\b(?:future|projection|projected|after|in)\b/.test(question) &&
    /\b(?:savings|balance|money|wealth|net worth)\b/.test(question) &&
    (years !== null || /\bprojection\b/.test(question));

  if (asksProjection) {
    return {
      kind: "projection",
      years,
      annualReturnPct,
      inflationPct,
    };
  }

  if (asksInflation) {
    return {
      kind: "inflation",
      years,
      inflationPct,
      amount: extractExplicitAmount(question),
    };
  }

  return null;
}

function finiteAmount(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function monthIndex(date: string) {
  const match = /^(\d{4})-(\d{2})/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
}

function rankMap(map: Map<string, number>, limit = 5): RankedAmount[] {
  return Array.from(map.entries())
    .filter(([, amount]) => amount > 0)
    .map(([label, amount]) => ({ label, amount: finiteAmount(amount) }))
    .sort((left, right) => right.amount - left.amount)
    .slice(0, limit);
}

function preferredLabel(...values: (string | null | undefined)[]) {
  return values.find((value) => value?.trim())?.trim() || "Unspecified";
}

export function analyzeFinanceHistory(
  transactions: AdvancedFinanceTransaction[],
): FinanceHistoryAnalysis {
  const valid = transactions.filter(
    (transaction) =>
      /^\d{4}-\d{2}-\d{2}$/.test(transaction.date) &&
      Number.isFinite(transaction.amount) &&
      transaction.amount >= 0,
  );
  const sortedDates = valid.map((transaction) => transaction.date).sort();
  const firstDate = sortedDates[0] ?? null;
  const lastDate = sortedDates.at(-1) ?? null;
  const firstMonth = firstDate ? monthIndex(firstDate) : null;
  const lastMonth = lastDate ? monthIndex(lastDate) : null;
  const monthCount =
    firstMonth !== null && lastMonth !== null
      ? Math.max(1, lastMonth - firstMonth + 1)
      : 0;

  let income = 0;
  let grossExpenses = 0;
  let refunds = 0;
  const dayMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const incomeSourceMap = new Map<string, number>();
  const expenseDestinationMap = new Map<string, number>();

  for (const transaction of valid) {
    const amount = finiteAmount(transaction.amount);
    if (transaction.type === "income") {
      income += amount;
      const source = preferredLabel(
        transaction.sourceName,
        transaction.note,
        transaction.category,
        transaction.account,
      );
      incomeSourceMap.set(source, (incomeSourceMap.get(source) ?? 0) + amount);
      continue;
    }

    if (transaction.type !== "expense" && transaction.type !== "refund") {
      continue;
    }

    const direction = transaction.type === "refund" ? -1 : 1;
    if (direction > 0) grossExpenses += amount;
    else refunds += amount;

    const signedAmount = direction * amount;
    const month = transaction.date.slice(0, 7);
    const category = preferredLabel(transaction.category);
    dayMap.set(transaction.date, (dayMap.get(transaction.date) ?? 0) + signedAmount);
    monthMap.set(month, (monthMap.get(month) ?? 0) + signedAmount);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + signedAmount);

    const destination = preferredLabel(
      transaction.itemName,
      transaction.personName,
      transaction.note,
      transaction.category,
      transaction.account,
    );
    expenseDestinationMap.set(
      destination,
      (expenseDestinationMap.get(destination) ?? 0) + signedAmount,
    );
  }

  const expenses = grossExpenses - refunds;
  const savings = income - expenses;
  const divisor = monthCount || 1;

  return {
    firstDate,
    lastDate,
    monthCount,
    totals: { income, expenses, savings },
    monthlyAverage: {
      income: income / divisor,
      expenses: expenses / divisor,
      savings: savings / divisor,
    },
    peakSpending: {
      date: rankMap(dayMap, 1)[0] ?? null,
      month: rankMap(monthMap, 1)[0] ?? null,
      category: rankMap(categoryMap, 1)[0] ?? null,
    },
    incomeSources: rankMap(incomeSourceMap),
    expenseDestinations: rankMap(expenseDestinationMap),
  };
}

export function projectSavings({
  startingBalance,
  monthlyContribution,
  years,
  annualReturnPct = 0,
  inflationPct,
}: {
  startingBalance: number;
  monthlyContribution: number;
  years: number;
  annualReturnPct?: number;
  inflationPct?: number | null;
}) {
  const months = Math.max(0, Math.round(years * 12));
  const monthlyRate = annualReturnPct / 100 / 12;
  const growth = monthlyRate === 0 ? 1 : (1 + monthlyRate) ** months;
  const contributions =
    monthlyRate === 0
      ? monthlyContribution * months
      : monthlyContribution * ((growth - 1) / monthlyRate);
  const nominal = startingBalance * growth + contributions;
  const real =
    inflationPct !== null && inflationPct !== undefined
      ? nominal / (1 + inflationPct / 100) ** years
      : null;

  return {
    nominal: finiteAmount(nominal),
    real: real === null ? null : finiteAmount(real),
    months,
  };
}

export function inflationAdjustedValue({
  amount,
  years,
  inflationPct,
}: {
  amount: number;
  years: number;
  inflationPct: number;
}) {
  if (years < 0 || inflationPct < 0) return Number.NaN;
  return amount / (1 + inflationPct / 100) ** years;
}
