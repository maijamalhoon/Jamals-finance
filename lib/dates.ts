export const APP_TIME_ZONE = "Asia/Karachi";

export type AppDateParts = {
  year: number;
  month: number;
  day: number;
};

const APP_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0",
  )}`;
}

export function getAppDateParts(date: Date = new Date()): AppDateParts {
  const parts = APP_DATE_FORMATTER.formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(byType.get("year")),
    month: Number(byType.get("month")),
    day: Number(byType.get("day")),
  };
}

export function getAppDateKey(date: Date = new Date()) {
  const { year, month, day } = getAppDateParts(date);
  return formatDateKey(year, month, day);
}

export function normalizeDateKey(value: Date | string | null | undefined) {
  if (!value) return null;

  if (value instanceof Date) return getAppDateKey(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : getAppDateKey(parsed);
}

export function getDaysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getPreviousMonth(year: number, month: number) {
  return month === 1 ?
      { year: year - 1, month: 12 }
    : { year, month: month - 1 };
}

export function getAppMonthRange(date: Date = new Date()) {
  const { year, month, day } = getAppDateParts(date);
  const daysInMonth = getDaysInMonth(year, month);
  const previous = getPreviousMonth(year, month);
  const previousDaysInMonth = getDaysInMonth(previous.year, previous.month);

  return {
    year,
    month,
    day,
    daysInMonth,
    firstDay: formatDateKey(year, month, 1),
    lastDay: formatDateKey(year, month, daysInMonth),
    lastFirst: formatDateKey(previous.year, previous.month, 1),
    lastLast: formatDateKey(
      previous.year,
      previous.month,
      previousDaysInMonth,
    ),
  };
}

export function formatAppMonthYear(year: number, month: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatAppMonth(
  year: number,
  month: number,
  monthFormat: "short" | "long" = "short",
) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: monthFormat,
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function formatInAppTimeZone(
  date: Date,
  options: Intl.DateTimeFormatOptions,
) {
  return date.toLocaleDateString("en-US", {
    timeZone: APP_TIME_ZONE,
    ...options,
  });
}
