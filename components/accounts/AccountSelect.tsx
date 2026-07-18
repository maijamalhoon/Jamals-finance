"use client";

import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import TouchWheelPicker, {
  useTouchWheelPickerMode,
} from "@/components/ui/touch-wheel-picker";
import { useScrollSelectBehavior } from "@/components/ui/use-scroll-select-behavior";
import scrollSelectStyles from "@/components/ui/ScrollSelect.module.css";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import AccountIdentityIcon from "@/components/accounts/AccountIdentityIcon";

export interface AccountOption {
  id: string;
  name: string;
  type: string;
  balance?: number | string | null;
  icon_key?: string | null;
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
  scrollPicker?: boolean;
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
        <span className="inline-grid size-7 shrink-0 place-items-center">
          <WalletCards size={16} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span className="truncate">{placeholder}</span>
      </span>
    );
  }

  const balance =
    account.balance === null || account.balance === undefined
      ? null
      : formatCurrency(Number(account.balance || 0));

  return (
    <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
      <AccountIdentityIcon
        name={account.name}
        iconKey={account.icon_key}
        type={account.type}
        size="sm"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text-primary">
          {account.name}
        </span>
        <span className="block truncate text-[11px] font-medium text-text-secondary">
          {formatType(account.type)}
        </span>
      </span>
      {balance ? (
        <span className="ml-2 hidden max-w-28 shrink-0 truncate text-right text-xs font-semibold text-text-primary min-[360px]:block">
          {balance}
        </span>
      ) : null}
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
  scrollPicker = false,
}: AccountSelectProps) {
  const { formatCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const touchPickerMode = useTouchWheelPickerMode(scrollPicker);
  const selectedAccount = accounts.find((account) => account.id === value);
  const unavailable = disabled || loading || accounts.length === 0;
  const scrollBehavior = useScrollSelectBehavior({
    enabled: scrollPicker,
    open,
    value,
    values: accounts.map((account) => account.id),
    onValueChange,
  });

  useEffect(() => {
    if (touchPickerMode) setOpen(false);
  }, [touchPickerMode]);

  if (scrollPicker && touchPickerMode) {
    return (
      <TouchWheelPicker
        id={id}
        value={value}
        onValueChange={onValueChange}
        options={accounts.map((account) => ({
          value: account.id,
          ariaLabel: `${account.name}, ${formatType(account.type)}`,
          content: <AccountSummary account={account} placeholder={placeholder} />,
        }))}
        ariaLabel={ariaLabel ?? placeholder}
        disabled={unavailable}
        className={cn(
          "field-input h-auto min-h-12 w-full gap-3 px-3 py-2 pr-3 text-left",
          className,
        )}
        itemClassName="px-3 py-2"
        emptyContent={
          <AccountSummary
            account={selectedAccount}
            placeholder={loading ? "Loading accounts..." : emptyText}
          />
        }
      />
    );
  }

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") onValueChange(nextValue);
      }}
      disabled={unavailable}
      open={scrollPicker ? open : undefined}
      onOpenChange={scrollPicker ? setOpen : undefined}
    >
      <SelectTrigger
        id={id}
        onWheel={scrollPicker ? scrollBehavior.onTriggerWheel : undefined}
        className={cn(
          "field-input h-auto min-h-12 w-full gap-3 px-3 py-2 pr-3 text-left",
          "data-placeholder:text-text-secondary [&>svg]:ml-1",
          scrollPicker && scrollSelectStyles.trigger,
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
        ref={scrollPicker ? scrollBehavior.contentRef : undefined}
        align="start"
        sideOffset={8}
        alignItemWithTrigger={false}
        data-scroll-touch={
          scrollPicker && scrollBehavior.isTouchScrollOnly ? "true" : undefined
        }
        onScroll={scrollPicker ? scrollBehavior.onContentScroll : undefined}
        onWheel={scrollPicker ? scrollBehavior.onContentWheel : undefined}
        onTouchStart={
          scrollPicker ? scrollBehavior.onContentTouchStart : undefined
        }
        onTouchMove={scrollPicker ? scrollBehavior.onContentTouchMove : undefined}
        className={cn(
          "z-[90] max-h-[min(18rem,var(--available-height))] max-w-[calc(100vw_-_1.5rem)] rounded-[18px] p-1.5",
          scrollPicker && scrollSelectStyles.content,
        )}
      >
        {accounts.length === 0 ? (
          <div className="px-3 py-2 text-sm text-text-secondary">
            {loading ? "Loading accounts..." : emptyText}
          </div>
        ) : (
          accounts.map((account) => {
            const balance =
              account.balance === null || account.balance === undefined
                ? null
                : formatCurrency(Number(account.balance || 0));

            return (
              <SelectItem
                key={account.id}
                value={account.id}
                data-scroll-select-value={account.id}
                className={cn(
                  "min-h-14 py-2 pr-8 pl-2.5",
                  scrollPicker && scrollSelectStyles.item,
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <AccountIdentityIcon
                    name={account.name}
                    iconKey={account.icon_key}
                    type={account.type}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {account.name}
                    </span>
                    <span className="block truncate text-[11px] text-text-secondary">
                      {formatType(account.type)}
                    </span>
                  </span>
                  {balance ? (
                    <span className="ml-auto hidden max-w-28 shrink-0 truncate text-right text-xs font-semibold text-text-primary min-[360px]:block">
                      {balance}
                    </span>
                  ) : null}
                </span>
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
}
