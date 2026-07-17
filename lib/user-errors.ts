type ErrorDetails = {
  code?: unknown;
  status?: unknown;
  message?: unknown;
};

export function getUserMutationError(
  error: unknown,
  fallback: string,
): string {
  const details: ErrorDetails =
    typeof error === "object" && error !== null ? error : {};
  const code = String(details.code ?? "").toLowerCase();
  const status =
    typeof details.status === "number" ? details.status : undefined;
  const message = String(details.message ?? "").toLowerCase();

  if (
    status === 401 ||
    status === 403 ||
    code.includes("jwt") ||
    message.includes("jwt expired") ||
    message.includes("not authenticated")
  ) {
    return "Your session expired. Sign in again.";
  }

  if (
    status === 429 ||
    code.includes("rate_limit") ||
    message.includes("too many requests")
  ) {
    return "Too many attempts. Wait a moment and try again.";
  }

  if (
    error instanceof TypeError ||
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout")
  ) {
    return "Check your connection and try again.";
  }

  if (status === 409 || code === "23505") {
    return "A matching record already exists.";
  }

  if (code === "23503" || code === "23514" || code === "22p02") {
    return "Some details are no longer valid. Review them and try again.";
  }

  return fallback;
}
