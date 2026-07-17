export type PaginationState = {
  currentPage: number;
  endIndex: number;
  pageSize: number;
  startIndex: number;
  totalItems: number;
  totalPages: number;
};

function toPositiveInteger(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function getPaginationState(
  totalItems: number,
  requestedPage: string | number | null | undefined,
  requestedPageSize = 20,
): PaginationState {
  const safeTotal = Math.max(0, Math.floor(Number(totalItems) || 0));
  const pageSize = Math.max(1, Math.floor(Number(requestedPageSize) || 20));
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const currentPage = Math.min(toPositiveInteger(requestedPage), totalPages);
  const startIndex = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, safeTotal);

  return {
    currentPage,
    endIndex,
    pageSize,
    startIndex,
    totalItems: safeTotal,
    totalPages,
  };
}
