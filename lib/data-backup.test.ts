import { describe, expect, it } from "vitest";

import {
  FINANCE_BACKUP_DATA_KEYS,
  FINANCE_BACKUP_FORMAT,
  FINANCE_BACKUP_VERSION,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
} from "./data-backup";

function makeBackup() {
  return {
    format: FINANCE_BACKUP_FORMAT,
    version: FINANCE_BACKUP_VERSION,
    backupId: "11111111-1111-1111-1111-111111111111",
    exportedAt: "2026-07-22T12:00:00.000Z",
    source: {
      ownerId: "22222222-2222-2222-2222-222222222222",
      app: "jamals-finance",
    },
    data: Object.fromEntries(FINANCE_BACKUP_DATA_KEYS.map((key) => [key, []])),
  };
}

describe("finance backup validation", () => {
  it("accepts a complete versioned backup", () => {
    expect(validateFinanceBackup(makeBackup()).ok).toBe(true);
  });

  it("rejects a backup with a missing data section", () => {
    const backup = makeBackup();
    delete (backup.data as Record<string, unknown>).transactions;

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error: "The transactions section in this backup is invalid.",
    });
  });

  it("counts all finance records", () => {
    const backup = makeBackup();
    backup.data.accounts.push({ id: "one" });
    backup.data.transactions.push({ id: "two" }, { id: "three" });

    const validation = validateFinanceBackup(backup);
    expect(validation.ok).toBe(true);
    if (validation.ok) expect(getBackupRecordCount(validation.value)).toBe(3);
  });

  it("normalizes the import RPC response", () => {
    expect(
      parseFinanceImportResult({
        ok: true,
        alreadyImported: false,
        totalAdded: "3",
        added: { accounts: 1, transactions: "2" },
        skipped: { accounts: 0 },
      }),
    ).toMatchObject({
      totalAdded: 3,
      added: { accounts: 1, transactions: 2 },
      skipped: { accounts: 0 },
    });
  });
});
