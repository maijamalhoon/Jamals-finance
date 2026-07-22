"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
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
  | "success"
  | "error";

const ACCEPTED_FILE_EXTENSIONS = [".jfinance", ".json"];

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
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

  if (/relation|reference|foreign key|incomplete/i.test(message)) {
    return "This backup is incomplete or damaged. No data was changed.";
  }

  return "This backup file is invalid or damaged. No data was changed.";
}

export default function FinanceDataTransfer() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const busyRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<TransferPhase>("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const busy = phase === "validating" || phase === "importing";

  const clearResetTimer = useCallback(() => {
    if (!resetTimerRef.current) return;
    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = null;
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

  const importFile = useCallback(
    async (file: File) => {
      if (busyRef.current) return;
      busyRef.current = true;

      clearResetTimer();
      setFileName(file.name);
      setMessage("Checking backup file…");
      setPhase("validating");

      const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
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
        scheduleReset(2200);
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
          ? "Securely adding 1 finance record…"
          : `Securely adding ${recordCount.toLocaleString()} finance records…`,
      );
      setPhase("importing");

      const { data, error } = await supabase.rpc("import_finance_backup", {
        p_backup: validation.value,
      });

      if (error) {
        const friendlyError = getFriendlyImportError(error);
        setMessage(friendlyError);
        setPhase("error");
        toast.error(friendlyError);
        busyRef.current = false;
        scheduleReset(2600);
        return;
      }

      const result = parseFinanceImportResult(data);
      if (!result) {
        const friendlyError =
          "Data import could not be verified. No partial import was kept.";
        setMessage(friendlyError);
        setPhase("error");
        toast.error(friendlyError);
        busyRef.current = false;
        scheduleReset(2600);
        return;
      }

      if (result.alreadyImported) {
        const successMessage =
          "This backup was already imported. No duplicate data was added.";
        setMessage(successMessage);
        setPhase("success");
        toast.info(successMessage);
      } else {
        const successMessage = `Data imported successfully — ${result.totalAdded.toLocaleString()} records added.`;
        setMessage(successMessage);
        setPhase("success");
        toast.success(successMessage);
      }

      busyRef.current = false;
      window.dispatchEvent(
        new CustomEvent(FINANCE_DATA_IMPORTED_EVENT, { detail: result }),
      );
      router.refresh();
      scheduleReset(1800);
    },
    [clearResetTimer, router, scheduleReset, supabase],
  );

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
      setMessage("Drop your Jamal’s Finance backup anywhere");
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
        const error = "Drop one Jamal’s Finance backup file at a time.";
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
    };
  }, [clearResetTimer, importFile, scheduleReset]);

  const visible = phase !== "idle";
  const icon =
    phase === "success" ? (
      <CheckCircle2 size={44} strokeWidth={2.2} />
    ) : phase === "error" ? (
      <AlertTriangle size={44} strokeWidth={2.2} />
    ) : phase === "validating" || phase === "importing" ? (
      <Loader2
        size={44}
        strokeWidth={2.2}
        className="finance-transfer-spin"
      />
    ) : phase === "dragging" ? (
      <Upload size={44} strokeWidth={2.2} />
    ) : (
      <Database size={44} strokeWidth={2.2} />
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
        <div className="finance-transfer-ambient" aria-hidden="true" />
        <div className="finance-transfer-sweep" aria-hidden="true" />
        <div className="finance-transfer-panel" role="status">
          <span className="finance-transfer-icon" aria-hidden="true">
            {icon}
          </span>
          <strong className="finance-transfer-title">
            {phase === "dragging"
              ? "Upload Data"
              : phase === "success"
                ? "Import Complete"
                : phase === "error"
                  ? "Import Stopped"
                  : "Updating Finance Data"}
          </strong>
          <span className="finance-transfer-message">{message}</span>
          {fileName ? (
            <span className="finance-transfer-file" title={fileName}>
              {fileName}
            </span>
          ) : null}
          {busy ? (
            <span className="finance-transfer-progress" aria-hidden="true">
              <span />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );
}
