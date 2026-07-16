"use client";

import { WalletCards } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  balance?: number | string | null;
}

interface AccountSelectProps {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  accounts: AccountOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  className?: string;
}

function formatType(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AccountSummary({
  account,
  placeholder,
}: {
  account?: AccountOption;
  placeholder: string;
}) {
  const { formatCurrency } = useCurrency();

  if (!account) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3 text-text-secondary">
        <span className="finance-icon-container" data-size="sm">
          <WalletCards size={15} />
        </span>
        <span className="truncate">{placeholder}</span>
      </span>
    );
  }

  const balance =
    account.balance === null || account.balance === undefined ?
      null
    : formatCurrency(Number(account.balance || 0));

  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <span className="finance-icon-container" data-size="sm">
        <WalletCards size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {account.name}
        </span>
        <span className="block truncate text-[11px] font-medium text-text-secondary">
          {formatType(account.type)}
        </span>
      </span>
      {balance && (
        <span className="ml-2 hidden max-w-28 shrink-0 truncate text-right text-xs font-semibold text-text-primary min-[360px]:block">
          {balance}
        </span>
      )}
    </span>
  );
}

export default function AccountSelect({
  id,
  value,
  onValueChange,
  accounts,
  placeholder = "Select account",
  ariaLabel,
  disabled,
  loading,
  emptyText = "No accounts found",
  className,
}: AccountSelectProps) {
  const { formatCurrency } = useCurrency();
  const selectedAccount = accounts.find((account) => account.id === value);
  const unavailable = disabled || loading || accounts.length === 0;

  return (
    <Select
      value={value || undefined}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") {
          onValueChange(nextValue);
        }
      }}
      disabled={unavailable}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "field-input h-auto min-h-12 w-full gap-3 px-3 py-2 pr-3 text-left",
          "data-placeholder:text-text-secondary [&>svg]:ml-1",
          className,
        )}
        aria-label={ariaLabel ?? placeholder}
      >
        <AccountSummary
          account={selectedAccount}
          placeholder={loading ? "Loading accounts..." : placeholder}
        />
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={8}
        alignItemWithTrigger={false}
        className="z-[90] max-h-[min(18rem,var(--available-height))] max-w-[calc(100vw_-_1.5rem)] rounded-[18px] p-1.5"
      >
        {accounts.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">
            {loading ? "Loading accounts..." : emptyText}
          </div>
        ) : (
          accounts.map((account) => {
            const balance =
              account.balance === null || account.balance === undefined ?
                null
              : formatCurrency(Number(account.balance || 0));

            return (
              <SelectItem
                key={account.id}
                value={account.id}
                className="min-h-14 py-2 pr-8 pl-2.5"
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="finance-icon-container" data-size="sm">
                    <WalletCards size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {account.name}
                    </span>
                    <span className="block truncate text-[11px] text-text-secondary">
                      {formatType(account.type)}
                    </span>
                  </span>
                  {balance && (
                    <span className="ml-auto hidden max-w-28 shrink-0 truncate text-right text-xs font-semibold text-text-primary min-[360px]:block">
                      {balance}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
