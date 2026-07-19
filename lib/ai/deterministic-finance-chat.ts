export type FinanceDateRange = {
  start: string;
  end: string;
  label: string;
  explicit: boolean;
};

export type DeterministicFinanceIntent =
  | { kind: "spending"; range: FinanceDateRange }
  | { kind: "income"; range: FinanceDateRange }
  | { kind: "accounts" }
  | { kind: "payables" }
  | { kind: "asset-profit"; range: FinanceDateRange | null };

export type FinanceTransactionRecord = {
  amount?: number | string | null;
  date?: string | null;
  type?: string | null;
};

export type FinanceInvestmentRecord = {
  id?: string | null;
  name?: string | null;
  symbol?: string | null;
  asset_id?: string | null;
  quantity?: number | string | null;
  purchase_price?: number | string | null;
  current_price?: number | string | null;
  purchased_at?: string | null;
};

export type FinanceAccountRecord = {
  status?: string | null;
};

export type FinancePayableRecord = {
  remaining_amount?: number | string | null;
  status?: string | null;
};

export type DeterministicFinanceData = {
  transactions?: FinanceTransactionRecord[];
  investments?: FinanceInvestmentRecord[];
  accounts?: FinanceAccountRecord[];
  payables?: FinancePayableRecord[];
};

export type DeterministicFinanceAnswer = {
  answer: string;
  followUps: string[];
};

type DateParts = { year: number; month: number; day: number };

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateKey(parts: DateParts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function fromDate(date: Date): DateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function toDate(parts: DateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(parts: DateParts, amount: number) {
  const date = toDate(parts);
  date.setUTCDate(date.getUTCDate() + amount);
  return fromDate(date);
}

function addMonths(parts: DateParts, amount: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + amount, 1));
  return fromDate(date);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function isValidDate(parts: DateParts) {
  const date = toDate(parts);
  return (
    date.getUTCFullYear() === parts.year &&
    date.getUTCMonth() + 1 === parts.month &&
    date.getUTCDate() === parts.day
  );
}

function formatDate(parts: DateParts) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(toDate(parts));
}

function formatMonth(parts: Pick<DateParts, "year" | "month">) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
}

function singleDayRange(
  parts: DateParts,
  label = formatDate(parts),
): FinanceDateRange {
  const key = formatDateKey(parts);
  return { start: key, end: key, label, explicit: true };
}

function monthRange(year: number, month: number, explicit = true): FinanceDateRange {
  return {
    start: formatDateKey({ year, month, day: 1 }),
    end: formatDateKey({ year, month, day: daysInMonth(year, month) }),
    label: formatMonth({ year, month }),
    explicit,
  };
}

function yearRange(year: number): FinanceDateRange {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    label: String(year),
    explicit: true,
  };
}

function weekRange(reference: DateParts, offsetWeeks = 0): FinanceDateRange {
  const weekday = toDate(reference).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = addDays(reference, mondayOffset + offsetWeeks * 7);
  const end = addDays(start, 6);
  return {
    start: formatDateKey(start),
    end: formatDateKey(end),
    label: `${formatDate(start)} to ${formatDate(end)}`,
    explicit: true,
  };
}

function parseMonthNameRange(question: string, now: DateParts) {
  const monthPattern = Object.keys(MONTHS).join("|");
  const dayFirst = question.match(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthPattern})(?:\\s+(\\d{4}))?\\b`,
      "i",
    ),
  );

  if (dayFirst) {
    const parts = {
      year: Number(dayFirst[3] ?? now.year),
      month: MONTHS[dayFirst[2].toLowerCase()],
      day: Number(dayFirst[1]),
    };
    return isValidDate(parts) ? singleDayRange(parts) : null;
  }

  const monthFirst = question.match(
    new RegExp(
      `\\b(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`,
      "i",
    ),
  );

  if (monthFirst) {
    const parts = {
      year: Number(monthFirst[3] ?? now.year),
      month: MONTHS[monthFirst[1].toLowerCase()],
      day: Number(monthFirst[2]),
    };
    return isValidDate(parts) ? singleDayRange(parts) : null;
  }

  const monthOnly = question.match(
    new RegExp(`\\b(${monthPattern})(?:\\s+(\\d{4}))?\\b`, "i"),
  );

  if (!monthOnly) return null;

  return monthRange(
    Number(monthOnly[2] ?? now.year),
    MONTHS[monthOnly[1].toLowerCase()],
  );
}

export function parseFinanceDateRange(
  question: string,
  now: DateParts,
): FinanceDateRange | null {
  const normalized = question.toLowerCase().replace(/[,]/g, " ");

  if (/\btoday\b/.test(normalized)) return singleDayRange(now, "today");
  if (/\byesterday\b/.test(normalized)) {
    return singleDayRange(addDays(now, -1), "yesterday");
  }

  if (/\bthis\s+week\b/.test(normalized)) return weekRange(now);
  if (/\blast\s+week\b|\bprevious\s+week\b/.test(normalized)) {
    return weekRange(now, -1);
  }

  if (/\bthis\s+month\b|\bcurrent\s+month\b/.test(normalized)) {
    return monthRange(now.year, now.month);
  }
  if (/\blast\s+month\b|\bprevious\s+month\b/.test(normalized)) {
    const previous = addMonths(now, -1);
    return monthRange(previous.year, previous.month);
  }

  if (/\bthis\s+year\b|\bcurrent\s+year\b/.test(normalized)) {
    return yearRange(now.year);
  }
  if (/\blast\s+year\b|\bprevious\s+year\b/.test(normalized)) {
    return yearRange(now.year - 1);
  }

  const lastDays = normalized.match(/\blast\s+(\d{1,3})\s+days?\b/);
  if (lastDays) {
    const count = Math.max(1, Math.min(366, Number(lastDays[1])));
    const start = addDays(now, -(count - 1));
    return {
      start: formatDateKey(start),
      end: formatDateKey(now),
      label: `the last ${count} days (${formatDate(start)} to ${formatDate(now)})`,
      explicit: true,
    };
  }

  const iso = normalized.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) {
    const parts = {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    };
    return isValidDate(parts) ? singleDayRange(parts) : null;
  }

  const dmy = normalized.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dmy) {
    const parts = {
      year: Number(dmy[3]),
      month: Number(dmy[2]),
      day: Number(dmy[1]),
    };
    return isValidDate(parts) ? singleDayRange(parts) : null;
  }

  const namedRange = parseMonthNameRange(normalized, now);
  if (namedRange) return namedRange;

  const weekdayMatch = normalized.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  if (weekdayMatch) {
    const requested = WEEKDAYS[weekdayMatch[1]];
    const current = toDate(now).getUTCDay();
    const offset = -((current - requested + 7) % 7);
    const date = addDays(now, offset);
    return singleDayRange(date, `the most recent ${weekdayMatch[1]}`);
  }

  const yearMatch = normalized.match(/\b(20\d{2}|19\d{2})\b/);
  return yearMatch ? yearRange(Number(yearMatch[1])) : null;
}

export function parseDeterministicFinanceQuestion(
  question: string,
  now: DateParts,
): DeterministicFinanceIntent | null {
  const normalized = normalizeText(question);
  const range = parseFinanceDateRange(question, now);

  if (
    /\b(account|accounts)\b/.test(normalized) &&
    /\b(how many|count|number)\b/.test(normalized)
  ) {
    return { kind: "accounts" };
  }

  if (
    /\b(payable|payables|liability|liabilities|debt|debts|owe|owed|due)\b/.test(
      normalized,
    )
  ) {
    return { kind: "payables" };
  }

  if (/\b(profit|loss|pnl|gain|return)\b/.test(normalized)) {
    return { kind: "asset-profit", range };
  }

  if (
    /\b(spend|spent|spending|expense|expenses|kharch|kharach)\b/.test(
      normalized,
    )
  ) {
    return {
      kind: "spending",
      range: range ?? monthRange(now.year, now.month, false),
    };
  }

  if (
    /\b(earn|earned|earning|earnings|income|revenue|kamai|kamaya)\b/.test(
      normalized,
    )
  ) {
    return {
      kind: "income",
      range: range ?? monthRange(now.year, now.month, false),
    };
  }

  return null;
}

function inRange(date: string | null | undefined, range: FinanceDateRange) {
  if (!date) return false;
  const key = date.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && key >= range.start && key <= range.end;
}

function getAssetMatch(
  question: string,
  investments: FinanceInvestmentRecord[],
) {
  const normalizedQuestion = ` ${normalizeText(question)} `;
  const identifiers = investments
    .flatMap((investment) =>
      [investment.name, investment.symbol, investment.asset_id]
        .map((value) => normalizeText(value))
        .filter((value) => value.length >= 3)
        .map((value) => ({ value, investment })),
    )
    .sort((left, right) => right.value.length - left.value.length);

  const matchedIdentifier = identifiers.find(({ value }) =>
    normalizedQuestion.includes(` ${value} `),
  )?.value;

  if (!matchedIdentifier) return null;

  return investments.filter((investment) =>
    [investment.name, investment.symbol, investment.asset_id]
      .map((value) => normalizeText(value))
      .includes(matchedIdentifier),
  );
}

function uniqueAssetNames(investments: FinanceInvestmentRecord[]) {
  return Array.from(
    new Set(
      investments
        .map(
          (investment) =>
            investment.name?.trim() || investment.symbol?.trim(),
        )
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export function buildDeterministicFinanceAnswer({
  intent,
  question,
  data,
  money,
}: {
  intent: DeterministicFinanceIntent;
  question: string;
  data: DeterministicFinanceData;
  money: (value: number) => string;
}): DeterministicFinanceAnswer {
  if (intent.kind === "spending" || intent.kind === "income") {
    const transactions = (data.transactions ?? []).filter((transaction) =>
      inRange(transaction.date, intent.range),
    );

    if (intent.kind === "income") {
      const incomeRows = transactions.filter(
        (transaction) => transaction.type === "income",
      );
      const total = incomeRows.reduce(
        (sum, transaction) =>
          sum + (toFiniteNumber(transaction.amount) ?? 0),
        0,
      );
      return {
        answer: `You earned ${money(total)} during ${intent.range.label}, across ${incomeRows.length} recorded income transaction${incomeRows.length === 1 ? "" : "s"}.`,
        followUps: [
          "How much did I spend in the same period?",
          "How many accounts do I have?",
        ],
      };
    }

    const expenseRows = transactions.filter(
      (transaction) => transaction.type === "expense",
    );
    const refundRows = transactions.filter(
      (transaction) => transaction.type === "refund",
    );
    const grossExpenses = expenseRows.reduce(
      (sum, transaction) => sum + (toFiniteNumber(transaction.amount) ?? 0),
      0,
    );
    const refunds = refundRows.reduce(
      (sum, transaction) => sum + (toFiniteNumber(transaction.amount) ?? 0),
      0,
    );
    const netSpending = grossExpenses - refunds;

    return {
      answer:
        refunds > 0
          ? `Your net spending during ${intent.range.label} was ${money(netSpending)}: ${money(grossExpenses)} in expenses minus ${money(refunds)} in refunds, across ${expenseRows.length} expense transaction${expenseRows.length === 1 ? "" : "s"}.`
          : `You spent ${money(netSpending)} during ${intent.range.label}, across ${expenseRows.length} recorded expense transaction${expenseRows.length === 1 ? "" : "s"}.`,
      followUps: [
        "How much did I earn in the same period?",
        "How much is currently payable?",
      ],
    };
  }

  if (intent.kind === "accounts") {
    const accounts = data.accounts ?? [];
    const active = accounts.filter((account) => account.status === "active").length;
    const inactive = accounts.length - active;
    return {
      answer:
        inactive > 0
          ? `You have ${accounts.length} accounts in total: ${active} active and ${inactive} inactive or archived.`
          : `You have ${active} active account${active === 1 ? "" : "s"}.`,
      followUps: [
        "What is my current net balance?",
        "How much is currently payable?",
      ],
    };
  }

  if (intent.kind === "payables") {
    const outstanding = (data.payables ?? []).filter(
      (payable) => (toFiniteNumber(payable.remaining_amount) ?? 0) > 0,
    );
    const total = outstanding.reduce(
      (sum, payable) =>
        sum + (toFiniteNumber(payable.remaining_amount) ?? 0),
      0,
    );
    const overdue = outstanding.filter(
      (payable) => payable.status === "overdue",
    ).length;

    return {
      answer:
        total > 0
          ? `Your current payable amount is ${money(total)} across ${outstanding.length} outstanding record${outstanding.length === 1 ? "" : "s"}; ${overdue} ${overdue === 1 ? "is" : "are"} overdue.`
          : "You currently have no outstanding payable amount recorded.",
      followUps: [
        "How many payable records are overdue?",
        "How many accounts do I have?",
      ],
    };
  }

  const investments = data.investments ?? [];
  const matched = getAssetMatch(question, investments);
  const questionHasAssetCue =
    /\b(on|for|asset|stock|crypto|coin|share|investment)\b/.test(
      normalizeText(question),
    );

  if (!matched && questionHasAssetCue) {
    const names = uniqueAssetNames(investments).slice(0, 6);
    return {
      answer:
        names.length > 0
          ? `I could not match an exact recorded asset name in your question. Your recorded assets include: ${names.join(", ")}.`
          : "You do not have any recorded investment assets yet.",
      followUps: names
        .slice(0, 2)
        .map((name) => `How much profit do I have on ${name}?`),
    };
  }

  const selected = (matched ?? investments).filter((investment) =>
    intent.range ? inRange(investment.purchased_at, intent.range) : true,
  );
  const label =
    matched?.[0]?.name?.trim() ||
    matched?.[0]?.symbol?.trim() ||
    "your portfolio";

  if (selected.length === 0) {
    return {
      answer: intent.range
        ? `No recorded ${label} investment positions were purchased during ${intent.range.label}.`
        : "You do not have any recorded investment positions yet.",
      followUps: [
        "How much is currently payable?",
        "How many accounts do I have?",
      ],
    };
  }

  const invalidPosition = selected.some((investment) => {
    const quantity = toFiniteNumber(investment.quantity);
    const purchasePrice = toFiniteNumber(investment.purchase_price);
    const currentPrice = toFiniteNumber(investment.current_price);
    return (
      quantity === null ||
      quantity <= 0 ||
      purchasePrice === null ||
      purchasePrice < 0 ||
      currentPrice === null ||
      currentPrice <= 0
    );
  });

  if (invalidPosition) {
    return {
      answer: `An exact profit calculation for ${label} is not available because one or more matched positions are missing a valid quantity, purchase price, or current price.`,
      followUps: [
        "How many accounts do I have?",
        "How much is currently payable?",
      ],
    };
  }

  const invested = selected.reduce(
    (sum, investment) =>
      sum +
      (toFiniteNumber(investment.quantity) ?? 0) *
        (toFiniteNumber(investment.purchase_price) ?? 0),
    0,
  );
  const currentValue = selected.reduce(
    (sum, investment) =>
      sum +
      (toFiniteNumber(investment.quantity) ?? 0) *
        (toFiniteNumber(investment.current_price) ?? 0),
    0,
  );
  const pnl = currentValue - invested;
  const percentage = invested > 0 ? (pnl / invested) * 100 : 0;
  const direction = pnl >= 0 ? "profit" : "loss";
  const periodText = intent.range
    ? ` for positions purchased during ${intent.range.label}`
    : "";

  return {
    answer: `Based on recorded current prices, ${label}${periodText} has an unrealized ${direction} of ${money(Math.abs(pnl))} (${Math.abs(percentage).toFixed(2)}%). Recorded cost is ${money(invested)} and current value is ${money(currentValue)}.${intent.range ? " This is a current unrealized result for positions bought in that period, not historical or realized profit for the period." : ""}`,
    followUps: [
      "How much is currently payable?",
      "How many accounts do I have?",
    ],
  };
}
