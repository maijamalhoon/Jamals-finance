import type { ErrorEvent } from "@sentry/core";

const SENSITIVE_KEY_PATTERN =
  /(account|amount|auth|balance|card|cookie|credit|cvv|debit|email|financial|iban|password|phone|secret|ssn|token|transaction|transfer|user)/i;

const SENSITIVE_STRING_PATTERNS = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\b(?:Bearer|Basic)\s+[A-Z0-9._~+/-]+=*/gi,
];

function scrubValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(scrubValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key) ? "[Filtered]" : scrubValue(nestedValue),
      ]),
    );
  }

  if (typeof value === "string") {
    return SENSITIVE_STRING_PATTERNS.reduce(
      (scrubbedValue, pattern) => scrubbedValue.replace(pattern, "[Filtered]"),
      value,
    );
  }

  return value;
}

export const tracesSampleRate =
  process.env.NODE_ENV === "development" ? 1.0 : 0.1;

export function beforeSend(event: ErrorEvent): ErrorEvent | null {
  delete event.user;

  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.headers;
    delete event.request.query_string;
    delete event.request.url;
  }

  event.contexts = scrubValue(event.contexts) as ErrorEvent["contexts"];
  delete event.extra;
  event.tags = scrubValue(event.tags) as ErrorEvent["tags"];
  event.breadcrumbs = event.breadcrumbs?.map((breadcrumb) => ({
    ...breadcrumb,
    data: scrubValue(breadcrumb.data) as typeof breadcrumb.data,
    message: breadcrumb.message ? "[Filtered]" : breadcrumb.message,
  }));

  return event;
}
