export const FINANCE_BACKUP_FORMAT = "jamals-finance-backup";
export const FINANCE_BACKUP_VERSION = 1;
export const MAX_FINANCE_BACKUP_BYTES = 25 * 1024 * 1024;
export const OPEN_FINANCE_DATA_IMPORT_EVENT = "jamal-open-data-import";
export const FINANCE_DATA_IMPORTED_EVENT = "jamal-finance-data-imported";

export const FINANCE_BACKUP_DATA_KEYS = [
  "accounts",
  "categories",
  "investments",
  "goals",
  "liabilities",
  "goalContributions",
  "transactions",
  "accountTransfers",
  "liabilityPayments",
  "investmentWithdrawals",
] as const;

type BackupDataKey = (typeof FINANCE_BACKUP_DATA_KEYS)[number];

type JsonRecord = Record<string, unknown>;

export type FinanceBackup = JsonRecord & {
  format: typeof FINANCE_BACKUP_FORMAT;
  version: typeof FINANCE_BACKUP_VERSION;
  backupId: string;
  exportedAt: string;
  source: JsonRecord & {
    ownerId: string;
  };
  data: Record<BackupDataKey, unknown[]>;
};

export type FinanceImportResult = {
  ok: boolean;
  alreadyImported: boolean;
  backupId?: string;
  totalAdded: number;
  added: Record<string, number>;
  skipped: Record<string, number>;
};

export type BackupValidationResult =
  | { ok: true; value: FinanceBackup }
  | { ok: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFinanceBackup(value: unknown): BackupValidationResult {
  if (!isRecord(value)) {
    return { ok: false, error: "This backup file is invalid or damaged." };
  }

  if (value.format !== FINANCE_BACKUP_FORMAT) {
    return { ok: false, error: "This is not a Jamal’s Finance backup file." };
  }

  if (value.version !== FINANCE_BACKUP_VERSION) {
    return { ok: false, error: "This backup version is not supported." };
  }

  if (
    typeof value.backupId !== "string" ||
    !UUID_PATTERN.test(value.backupId)
  ) {
    return { ok: false, error: "This backup file has an invalid identity." };
  }

  if (
    typeof value.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(value.exportedAt))
  ) {
    return { ok: false, error: "This backup file has an invalid export date." };
  }

  if (
    !isRecord(value.source) ||
    typeof value.source.ownerId !== "string" ||
    !UUID_PATTERN.test(value.source.ownerId)
  ) {
    return { ok: false, error: "This backup file has an invalid owner identity." };
  }

  if (!isRecord(value.data)) {
    return { ok: false, error: "This backup file does not contain finance data." };
  }

  for (const key of FINANCE_BACKUP_DATA_KEYS) {
    if (!Array.isArray(value.data[key])) {
      return {
        ok: false,
        error: `The ${key} section in this backup is invalid.`,
      };
    }
  }

  return { ok: true, value: value as FinanceBackup };
}

export function getBackupRecordCount(backup: FinanceBackup) {
  return FINANCE_BACKUP_DATA_KEYS.reduce(
    (total, key) => total + backup.data[key].length,
    0,
  );
}

export function parseFinanceImportResult(value: unknown): FinanceImportResult | null {
  if (!isRecord(value) || value.ok !== true) return null;

  const added = isRecord(value.added) ? value.added : {};
  const skipped = isRecord(value.skipped) ? value.skipped : {};

  const normalizeCounts = (counts: JsonRecord) =>
    Object.fromEntries(
      Object.entries(counts).map(([key, count]) => [
        key,
        Number.isFinite(Number(count)) ? Math.max(0, Number(count)) : 0,
      ]),
    );

  const parsedAdded = normalizeCounts(added);
  const totalAdded = Number(value.totalAdded);

  return {
    ok: true,
    alreadyImported: value.alreadyImported === true,
    backupId: typeof value.backupId === "string" ? value.backupId : undefined,
    totalAdded: Number.isFinite(totalAdded)
      ? Math.max(0, totalAdded)
      : Object.values(parsedAdded).reduce((sum, count) => sum + count, 0),
    added: parsedAdded,
    skipped: normalizeCounts(skipped),
  };
}
