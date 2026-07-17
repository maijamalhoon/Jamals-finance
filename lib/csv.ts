const FORMULA_PREFIX = /^[=+\-@]/;

export function escapeCsvCell(value: unknown) {
  const normalized = String(value ?? "").replace(/\r\n?/g, "\n");
  const safe = FORMULA_PREFIX.test(normalized) ? `'${normalized}` : normalized;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function serializeCsv(rows: readonly (readonly unknown[])[]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
