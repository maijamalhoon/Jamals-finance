"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Download,
  Loader2,
  LogOut,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import {
  MAX_FINANCE_BACKUP_BYTES,
  OPEN_FINANCE_DATA_IMPORT_EVENT,
  isRecord,
  validateFinanceBackup,
} from "@/lib/data-backup";
import { mapAuthError } from "@/lib/settings/security";
import { createClient } from "@/lib/supabase/client";
import { getStoredThemePreference } from "@/lib/theme";

type DateFormat = "MMM d, yyyy" | "dd MMM yyyy" | "yyyy-MM-dd";

type SettingsDataTransferSectionProps = {
  email: string;
  displayName: string;
};

type DataActionRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
};

function DataActionRow({
  icon,
  title,
  description,
  onClick,
  disabled = false,
}: DataActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="finance-focus settings-reference-row settings-reference-row-button"
    >
      <span className="settings-reference-row-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="settings-reference-row-copy">
        <span className="settings-reference-row-title">{title}</span>
        <span className="settings-reference-row-description">{description}</span>
      </span>
      <ChevronRight
        size={18}
        strokeWidth={2.35}
        className="settings-reference-row-chevron"
        aria-hidden="true"
      />
    </button>
  );
}

export default function SettingsDataTransferSection({
  email,
  displayName,
}: SettingsDataTransferSectionProps) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const { currency } = useCurrency();
  const [profileName, setProfileName] = useState(
    displayName.trim() || email.split("@")[0]?.replace(/[._-]/g, " ") || "Jamal",
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    function handleProfileUpdate(event: Event) {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (detail?.displayName) setProfileName(detail.displayName);
    }

    window.addEventListener("jamal-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("jamal-profile-updated", handleProfileUpdate);
  }, []);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const { data, error } = await supabase.rpc("export_finance_backup");
      if (error || !isRecord(data)) {
        throw error ?? new Error("Backup could not be prepared.");
      }

      const storedDateFormat = window.localStorage.getItem("jamal-date-format");
      const dateFormat: DateFormat =
        storedDateFormat === "dd MMM yyyy" || storedDateFormat === "yyyy-MM-dd"
          ? storedDateFormat
          : "MMM d, yyyy";
      const compactMode =
        window.localStorage.getItem("jamal-compact-dashboard") === "true";
      const themeMode = getStoredThemePreference();

      const profileSnapshot = isRecord(data.profileSnapshot)
        ? data.profileSnapshot
        : {};
      const preferencesSnapshot = isRecord(data.preferencesSnapshot)
        ? data.preferencesSnapshot
        : {};

      const payload = {
        ...data,
        profileSnapshot: {
          ...profileSnapshot,
          auth: { email, displayName: profileName },
        },
        preferencesSnapshot: {
          ...preferencesSnapshot,
          client: { currency, dateFormat, compactMode, themeMode },
        },
      };

      const validation = validateFinanceBackup(payload);
      if (!validation.ok) throw new Error(validation.error);

      const serialized = JSON.stringify(validation.value, null, 2);
      const blob = new Blob([serialized], {
        type: "application/vnd.jamals-finance.backup+json",
      });

      if (blob.size > MAX_FINANCE_BACKUP_BYTES) {
        throw new Error(
          "Your complete backup is currently too large to download safely.",
        );
      }

      const url = window.URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `jamals-finance-backup-${new Date()
          .toISOString()
          .slice(0, 10)}.jfinance`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        window.URL.revokeObjectURL(url);
      }

      toast.success("Complete finance backup downloaded.");
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Could not export your finance data. Please try again.";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  function handleUpload() {
    window.dispatchEvent(new Event(OPEN_FINANCE_DATA_IMPORT_EVENT));
  }

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "local" });
    setIsSigningOut(false);

    if (error) {
      toast.error(
        mapAuthError(error, "Could not sign out this device. Please try again."),
      );
      return;
    }

    toast.success("Signed out successfully.");
    router.replace("/login");
    router.refresh();
  }

  return (
    <section className="settings-reference-section settings-reference-data">
      <h2 className="settings-reference-section-heading">
        <span aria-hidden="true">
          <Download size={19} strokeWidth={2.35} />
        </span>
        Data
      </h2>

      <div className="settings-reference-group">
        <DataActionRow
          icon={
            isExporting ? (
              <Loader2 size={21} className="animate-spin" />
            ) : (
              <Download size={21} strokeWidth={2.35} />
            )
          }
          title={isExporting ? "Preparing Backup…" : "Export Data"}
          description="Download all accounts, transactions and connected finance records"
          onClick={() => void handleExport()}
          disabled={isExporting || isSigningOut}
        />
        <DataActionRow
          icon={<Upload size={21} strokeWidth={2.35} />}
          title="Upload Data"
          description="Import a backup and safely add it to this account"
          onClick={handleUpload}
          disabled={isExporting || isSigningOut}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={isSigningOut || isExporting}
        className="finance-focus settings-reference-logout"
      >
        {isSigningOut ? (
          <Loader2 size={19} className="animate-spin" aria-hidden="true" />
        ) : (
          <LogOut size={19} strokeWidth={2.35} aria-hidden="true" />
        )}
        {isSigningOut ? "Signing Out..." : "Log Out"}
      </button>
    </section>
  );
}
