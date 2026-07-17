export type TransferAmountIssue = "missing" | "invalid" | "exceeds-balance";

const BALANCE_EPSILON = 1e-9;

export function getAvailableTransferBalance(
  value: number | string | null | undefined,
) {
  const balance = Number(value ?? 0);
  return Number.isFinite(balance) && balance > 0 ? balance : 0;
}

export function getTransferAmountIssue(
  value: string,
  availableBalance: number,
): TransferAmountIssue | null {
  if (!value.trim()) return "missing";

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) return "invalid";
  if (amount - availableBalance > BALANCE_EPSILON) return "exceeds-balance";

  return null;
}

export function getMaximumTransferInput(availableBalance: number) {
  const safeBalance = getAvailableTransferBalance(availableBalance);
  return safeBalance > 0 ? String(safeBalance) : "";
}
