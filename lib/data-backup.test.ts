import { describe, expect, it } from "vitest";

import {
  FINANCE_BACKUP_DATA_KEYS,
  FINANCE_BACKUP_FORMAT,
  FINANCE_BACKUP_VERSION,
  type FinanceBackup,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
  withFinanceBackupManifest,
} from "./data-backup";

function makeBackup(): FinanceBackup {
  return {
    format: FINANCE_BACKUP_FORMAT,
    version: FINANCE_BACKUP_VERSION,
    backupId: "11111111-1111-1111-1111-111111111111",
    exportedAt: "2026-07-22T12:00:00.000Z",
    source: {
      ownerId: "22222222-2222-2222-2222-222222222222",
      app: "jamals-finance",
    },
    data: Object.fromEntries(
      FINANCE_BACKUP_DATA_KEYS.map((key) => [key, [] as unknown[]]),
    ) as FinanceBackup["data"],
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

  it("adds and validates a complete-data manifest", () => {
    const validation = validateFinanceBackup(makeBackup());
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    validation.value.data.accounts.push({ id: "one" });
    validation.value.data.goals.push({ id: "two" });

    const backup = withFinanceBackupManifest(validation.value);
    expect(backup.manifest).toMatchObject({
      totalRecords: 2,
      recordCounts: { accounts: 1, goals: 1 },
    });
    expect(validateFinanceBackup(backup).ok).toBe(true);
  });

  it("rejects a backup whose manifest no longer matches its data", () => {
    const validation = validateFinanceBackup(makeBackup());
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;

    const backup = withFinanceBackupManifest(validation.value);
    backup.data.transactions.push({ id: "added-after-export" });

    expect(validateFinanceBackup(backup)).toEqual({
      ok: false,
      error:
        "The transactions section did not pass the backup integrity check.",
    });
  });

  it("normalizes the import RPC response", () => {
    expect(
      parseFinanceImportResult({
        ok: true,
        alreadyImported: false,
        totalAdded: "3",
        added: { accounts: 1, transactions: "2" },
        skipped: { accounts: 0 },
        restored: { notificationPreferences: "1" },
      }),
    ).toMatchObject({
      totalAdded: 3,
      added: { accounts: 1, transactions: 2 },
      skipped: { accounts: 0 },
      restored: { notificationPreferences: 1 },
    });
  });
});
