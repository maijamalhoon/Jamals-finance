"use client";

import { type CSSProperties, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Pencil,
  ScrollText,
} from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import AccountModal, { ExistingAccount } from "./AccountModal";
import AccountIdentityIcon from "./AccountIdentityIcon";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { getAccountAccentColor } from "@/lib/theme-colors";
import { detectAccountBrand } from "@/lib/account-identity";
import { getUserMutationError } from "@/lib/user-errors";

function getCardVars(accent: string) {
  return {
    "--account-accent": accent,
  } as CSSProperties;
}

type AccountCardProps = {
  account: ExistingAccount;
};

export default function AccountCard({ account }: AccountCardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { formatCurrency } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  const brand = detectAccountBrand(account.name, account.icon_key);
  const accent = brand?.accentColor ?? getAccountAccentColor(account.accent_color);
  const archived = account.status === "archived";
  const identityRenderKey = [
    account.id,
    account.name,
    account.icon_key ?? "",
    account.type ?? "",
  ].join(":");

  async function handleStatusChange() {
    if (changingStatus) return;
    const action = archived ? "restore" : "archive";
    if (!confirm(`${archived ? "Restore" : "Archive"} "${account.name}"?`)) {
      return;
    }

    setChangingStatus(true);

    const { error } = await supabase.rpc("set_account_archived", {
      p_account_id: account.id,
      p_archived: !archived,
    });

    if (error) {
      toast.error(
        getUserMutationError(
          error,
          `Account could not be ${action}d. Try again.`,
        ),
      );
      setChangingStatus(false);
      return;
    }

    toast.success(archived ? "Account restored" : "Account archived");
    router.refresh();
  }

  return (
    <>
      <article
        className="account-card-shell finance-panel-interactive group relative flex h-full w-full min-w-0 flex-col overflow-hidden rounded-[var(--oneui-card-radius)] border p-4"
        style={getCardVars(accent)}
      >
        <div
          aria-hidden="true"
          className="account-card-glow pointer-events-none absolute -right-12 -top-14 h-32 w-32 rounded-full blur-3xl"
        />

        <div
          aria-hidden="true"
          className="account-card-line pointer-events-none absolute inset-x-5 top-0 h-px"
        />

        <div className="absolute right-3 top-3 z-10 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {!archived ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="icon-button"
              aria-label="Edit account"
            >
              <Pencil size={13} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={handleStatusChange}
            disabled={changingStatus}
            aria-busy={changingStatus || undefined}
            className="icon-button"
            aria-label={archived ? "Restore account" : "Archive account"}
            title={archived ? "Restore account" : "Archive account"}
          >
            {archived ? (
              <ArchiveRestore size={13} aria-hidden="true" />
            ) : (
              <Archive size={13} aria-hidden="true" />
            )}
          </button>
        </div>

        <div className="relative flex min-w-0 items-center gap-3 pr-16">
          <AccountIdentityIcon
            key={identityRenderKey}
            name={account.name}
            iconKey={account.icon_key}
            type={account.type}
            size="md"
          />

          <p className="line-clamp-2 min-w-0 break-words text-sm font-bold leading-5 text-text-primary">
            {account.name}
          </p>
        </div>

        <div className="finance-panel-soft relative mt-4 min-w-0 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-text-secondary">
            Balance
          </p>

          <p className="finance-amount mt-1 break-words text-xl font-black tracking-normal text-text-primary [overflow-wrap:anywhere]">
            {formatCurrency(Number(account.balance ?? 0))}
          </p>
        </div>

        <Link
          href={`/dashboard/accounts/${account.id}`}
          className="finance-focus relative mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface-secondary px-3 text-[11px] font-bold text-text-primary hover:bg-hover"
        >
          <ScrollText size={13} aria-hidden="true" />
          View history
        </Link>
      </article>

      {!archived ? (
        <AccountModal
          open={editOpen}
          account={account}
          onClose={() => setEditOpen(false)}
          onSuccess={() => {
            setEditOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
