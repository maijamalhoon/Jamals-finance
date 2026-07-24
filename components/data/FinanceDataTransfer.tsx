"use client";

import { APP_NAME } from "@/lib/brand";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Droplets,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import {
  FINANCE_DATA_IMPORTED_EVENT,
  MAX_FINANCE_BACKUP_BYTES,
  OPEN_FINANCE_DATA_IMPORT_EVENT,
  getBackupRecordCount,
  parseFinanceImportResult,
  validateFinanceBackup,
} from "@/lib/data-backup";
import { createClient } from "@/lib/supabase/client";

type TransferPhase =
  | "idle"
  | "dragging"
  | "validating"
  | "importing"
  | "revealing"
  | "success"
  | "error";

const ACCEPTED_FILE_EXTENSIONS = [".jfinance", ".json"];
const IMPORT_REVEAL_DURATION_MS = 4_000;

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function hasAcceptedBackupExtension(fileName: string) {
  const originalDownloadName = fileName
    .trim()
    .replace(/\s*\(\d+\)$/, "")
    .toLowerCase();

  return ACCEPTED_FILE_EXTENSIONS.some((extension) =>
    originalDownloadName.endsWith(extension),
  );
}

function getFriendlyImportError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String(error.message)
        : "";

  if (/too large|too many records/i.test(message)) {
    return "This backup is too large to import safely.";
  }

  if (/version/i.test(message)) {
    return "This backup version is not supported.";
  }

  if (/integrity|complete-data|did not pass/i.test(message)) {
    return "This backup is incomplete or was changed after export. No data was added.";
  }

  if (/relation|reference|foreign key|incomplete/i.test(message)) {
    return "This backup is incomplete or damaged. No data was changed.";
  }

  if (/fetch|network|timeout|connection|could not be verified/i.test(message)) {
    return "The import result could not be confirmed. Drop the same backup again; duplicate protection will verify it safely.";
  }

  return "This backup file is invalid or damaged. No data was changed.";
}

function getRevealDelay() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 450
    : IMPORT_REVEAL_DURATION_MS;
}

export default function FinanceDataTransfer() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const busyRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const busy =
    phase === "validating" ||
    phase === "importing" ||
    phase === "revealing";

  const clearResetTimer = useCallback(() => {
    if (!resetTimerRef.current) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
  }, []);

  const clearRevealTimer = useCallback(() => {
    if (!revealTimerRef.current) return;
    clearTimeout(revealTimerRef.current);
    revealTimerRef.current = null;
  }, []);

  const scheduleReset = useCallback(
    (delay = 1500) => {
      clearResetTimer();
      resetTimerRef.current = setTimeout(() => {
        setPhase("idle");
        setMessage("");
        setFileName("");
        resetTimerRef.current = null;
      }, delay);
    },
    [clearResetTimer],
  );

  const playReveal = useCallback(async () => {
    clearRevealTimer();
    await new Promise<void>((resolve) => {
      revealTimerRef.current = setTimeout(() => {
        revealTimerRef.current = null;
        resolve();
      }, getRevealDelay());
    });
  }, [clearRevealTimer]);

  const importFile = useCallback(
    async (file: File) => {
      if (busyRef.current) return;
      busyRef.current = true;

      clearResetTimer();
      clearRevealTimer();
      setFileName(file.name);
      setMessage("Checking every section in this backup…");
      setPhase("validating");

      if (!hasAcceptedBackupExtension(file.name)) {
        const error = "Choose a .jfinance backup file.";
        setMessage(error);
        setPhase("error");
        toast.error(error);
        busyRef.current = false;
        scheduleReset(2200);
        return;
      }

      if (file.size <= 0 || file.size > MAX_FINANCE_BACKUP_BYTES) {
        const error = "This backup is empty or too large to import safely.";
        setMessage(error);
        setPhase("error");
        toast.error(error);
        busyRef.current = false;
        scheduleReset(2200);
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(await file.text());
      } catch {
        const error = "This backup file is invalid or damaged.";
        setMessage(error);
        setPhase("error");
        toast.error(error);
        busyRef.current = false;
        scheduleReset(2200);
        return;
      }

      const validation = validateFinanceBackup(parsed);
      if (!validation.ok) {
        setMessage(validation.error);
        setPhase("error");
        toast.error(validation.error);
        busyRef.current = false;
        scheduleReset(2600);
        return;
      }

      const recordCount = getBackupRecordCount(validation.value);
      if (recordCount > 100_000) {
        const error = "This backup contains too many records to import safely.";
        setMessage(error);
        setPhase("error");
        toast.error(error);
        busyRef.current = false;
        scheduleReset(2200);
        return;
      }

      setMessage(
        recordCount === 1
          ? "Safely merging 1 finance record…"
          : `Safely merging ${recordCount.toLocaleString()} finance records…`,
      );
      setPhase("importing");

      try {
        const { data, error } = await supabase.rpc("import_finance_backup", {
          p_backup: validation.value,
        });

        if (error) throw error;

        const result = parseFinanceImportResult(data);
        if (!result) {
          throw new Error("Data import could not be verified.");
        }

        if (result.alreadyImported) {
          const successMessage =
            "This backup was already imported. No duplicate data was added.";
          setMessage(successMessage);
          setPhase("success");
          toast.info(successMessage);
          window.dispatchEvent(
            new CustomEvent(FINANCE_DATA_IMPORTED_EVENT, { detail: result }),
          );
          router.refresh();
          scheduleReset(1800);
          return;
        }

        setMessage("Your complete finance history is flowing into place…");
        setPhase("revealing");
        await playReveal();

        const restoredTotal = Object.values(result.restored ?? {}).reduce(
          (total, count) => total + count,
          0,
        );
        const successMessage =
          restoredTotal > 0
            ? `Import complete — ${result.totalAdded.toLocaleString()} finance records and ${restoredTotal.toLocaleString()} settings restored.`
            : `Import complete — ${result.totalAdded.toLocaleString()} finance records added.`;

        window.dispatchEvent(
          new CustomEvent(FINANCE_DATA_IMPORTED_EVENT, { detail: result }),
        );
        router.refresh();
        setMessage(successMessage);
        setPhase("success");
        toast.success(successMessage);
        scheduleReset(1200);
      } catch (error) {
        const friendlyError = getFriendlyImportError(error);
        setMessage(friendlyError);
        setPhase("error");
        toast.error(friendlyError);
        scheduleReset(3200);
      } finally {
        busyRef.current = false;
      }
    },
    [
      clearResetTimer,
      clearRevealTimer,
      playReveal,
      router,
      scheduleReset,
      supabase,
    ],
  );

  useEffect(() => {
    const shell = document.querySelector<HTMLElement>("[data-dashboard-shell]");
    if (phase === "revealing") {
      shell?.classList.add("is-finance-water-impact");
    } else {
      shell?.classList.remove("is-finance-water-impact");
    }

    return () => shell?.classList.remove("is-finance-water-impact");
  }, [phase]);

  useEffect(() => {
    function openPicker() {
      if (busyRef.current) return;
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
        fileInputRef.current.click();
      }
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasFiles(event) || busyRef.current) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setMessage(`Drop your ${APP_NAME} backup anywhere`);
      setPhase("dragging");
    }

    function handleDragOver(event: DragEvent) {
      if (!hasFiles(event) || busyRef.current) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }

    function handleDragLeave(event: DragEvent) {
      if (busyRef.current || dragDepthRef.current === 0) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) {
        setPhase("idle");
        setMessage("");
        setFileName("");
      }
    }

    function handleDrop(event: DragEvent) {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;

      if (busyRef.current) return;
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length !== 1) {
        const error = `Drop one ${APP_NAME} backup file at a time.`;
        setMessage(error);
        setPhase("error");
        toast.error(error);
        scheduleReset(2200);
        return;
      }

      void importFile(files[0]);
    }

    window.addEventListener(OPEN_FINANCE_DATA_IMPORT_EVENT, openPicker);
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener(OPEN_FINANCE_DATA_IMPORT_EVENT, openPicker);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      clearResetTimer();
      clearRevealTimer();
    };
  }, [
    clearResetTimer,
    clearRevealTimer,
    importFile,
    scheduleReset,
  ]);

  const visible = phase !== "idle";
  const icon =
    phase === "success" ? (
      <CheckCircle2 size={46} strokeWidth={2.2} />
    ) : phase === "error" ? (
      <AlertTriangle size={46} strokeWidth={2.2} />
    ) : phase === "validating" || phase === "importing" ? (
      <Loader2
        size={46}
        strokeWidth={2.2}
        className="finance-transfer-spin"
      />
    ) : phase === "revealing" ? (
      <Droplets size={48} strokeWidth={2.05} />
    ) : phase === "dragging" ? (
      <Upload size={48} strokeWidth={2.2} />
    ) : (
      <Database size={46} strokeWidth={2.2} />
    );

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".jfinance,.json,application/json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void importFile(file);
          event.currentTarget.value = "";
        }}
      />

      <div
        className={`finance-transfer-overlay ${visible ? "is-visible" : ""}`}
        data-phase={phase}
        aria-hidden={!visible}
        aria-live="polite"
        aria-busy={busy}
      >
        <div className="finance-transfer-water" aria-hidden="true">
          <span className="finance-transfer-wave finance-transfer-wave-one" />
          <span className="finance-transfer-wave finance-transfer-wave-two" />
          <span className="finance-transfer-wave finance-transfer-wave-three" />
          <span className="finance-transfer-ripple finance-transfer-ripple-one" />
          <span className="finance-transfer-ripple finance-transfer-ripple-two" />
        </div>

        <div className="finance-transfer-panel" role="status">
          <span className="finance-transfer-icon" aria-hidden="true">
            {icon}
          </span>
          <strong className="finance-transfer-title">
            {phase === "dragging"
              ? "Drop to Import"
              : phase === "revealing"
                ? "Fresh Water Restore"
                : phase === "success"
                  ? "Import Complete"
                  : phase === "error"
                    ? "Import Stopped"
                    : phase === "validating"
                      ? "Verifying Complete Backup"
                      : "Merging Finance History"}
          </strong>
          <span className="finance-transfer-message">{message}</span>
          {fileName ? (
            <span className="finance-transfer-file" title={fileName}>
              {fileName}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
