"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { getAppDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function toDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  disabled,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedDate = toDate(value);
  const [inputValue, setInputValue] = useState(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());
  const [isCompact, setIsCompact] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState({
    left: 0,
    top: 0,
    width: 320,
    maxHeight: 420,
  });

  const min = toDate(minDate);
  const max = toDate(maxDate);
  const today = toDate(getAppDateKey()) ?? new Date();

  useEffect(() => {
    const nextSelectedDate = toDate(value);
    if (nextSelectedDate) setViewDate(nextSelectedDate);
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsCompact(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || isCompact) return;

    function updatePosition() {
      const trigger = inputRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const gutter = 12;
      const width = Math.min(320, window.innerWidth - gutter * 2);
      const left = Math.min(
        Math.max(rect.left, gutter),
        window.innerWidth - width - gutter,
      );
      const spaceBelow = window.innerHeight - rect.bottom - gutter;
      const spaceAbove = rect.top - gutter;
      const estimatedHeight = 372;
      const placeBelow = spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove;
      const maxHeight = Math.max(
        280,
        Math.min(420, (placeBelow ? spaceBelow : spaceAbove) - 4),
      );
      const top =
        placeBelow ? rect.bottom + 8 : Math.max(gutter, rect.top - maxHeight - 8);

      setPopoverStyle({ left, top, width, maxHeight });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isCompact]);

  const days = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + index);
      return day;
    });
  }, [viewDate]);

  function moveMonth(amount: number) {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + amount);
      return next;
    });
  }

  function isDisabled(day: Date) {
    if (min && day < min) return true;
    if (max && day > max) return true;
    return false;
  }

  function commitTypedDate(nextValue: string) {
    setInputValue(nextValue);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) return;

    const parsed = toDate(nextValue);
    if (!parsed || formatDate(parsed) !== nextValue || isDisabled(parsed)) return;

    setViewDate(parsed);
    onChange(nextValue);
  }

  function resetInvalidTypedDate() {
    if (!inputValue || inputValue === value) return;

    const parsed = toDate(inputValue);
    const valid =
      /^\d{4}-\d{2}-\d{2}$/.test(inputValue) &&
      parsed &&
      formatDate(parsed) === inputValue &&
      !isDisabled(parsed);

    if (!valid) setInputValue(value);
  }

  const calendar = (
    <div
      ref={popoverRef}
      className={cn(
        "finance-date-popover overflow-y-auto rounded-[20px] border border-border bg-card p-3 text-text-primary shadow-theme",
        isCompact
          ? "relative z-10 mt-2 w-full"
          : "fixed z-[90] overflow-hidden",
      )}
      style={
        isCompact
          ? { maxHeight: "min(24rem, 62dvh)" }
          : {
              left: popoverStyle.left,
              top: popoverStyle.top,
              width: popoverStyle.width,
              maxHeight: popoverStyle.maxHeight,
            }
      }
      role="dialog"
      aria-label="Choose date"
    >
      <div className="mb-3 flex items-center justify-between rounded-[16px] border border-border bg-muted px-2 py-2">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="icon-button h-9 w-9 rounded-[14px]"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">
            {viewDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-[11px] text-text-secondary">Pick a date</p>
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="icon-button h-9 w-9 rounded-[14px]"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pb-1">
        {WEEKDAYS.map((weekday, index) => (
          <div
            key={`${weekday}-${index}`}
            className="grid h-7 place-items-center text-[11px] font-semibold text-text-secondary"
          >
            {weekday}
          </div>
        ))}
        {days.map((day) => {
          const outside = day.getMonth() !== viewDate.getMonth();
          const selected = selectedDate ? sameDay(day, selectedDate) : false;
          const current = sameDay(day, today);
          const unavailable = isDisabled(day);

          return (
            <button
              key={formatDate(day)}
              type="button"
              disabled={unavailable}
              onClick={() => {
                const nextValue = formatDate(day);
                onChange(nextValue);
                setInputValue(nextValue);
                setOpen(false);
              }}
              className={cn(
                "finance-focus grid h-9 place-items-center rounded-[13px] text-sm font-medium transition-all sm:h-10 sm:rounded-[15px]",
                outside && "text-text-secondary",
                !outside && "text-text-primary hover:bg-hover",
                current && "ring-1 ring-border",
                selected &&
                  "bg-active text-background hover:bg-active hover:text-background",
                unavailable && "cursor-not-allowed opacity-30",
              )}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const nextValue = formatDate(today);
            onChange(nextValue);
            setInputValue(nextValue);
            setViewDate(today);
            setOpen(false);
          }}
          className="finance-focus flex-1 rounded-[14px] border border-border bg-muted px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-hover"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="finance-focus flex-1 rounded-[14px] border border-active bg-active px-3 py-2 text-xs font-semibold text-background transition-colors hover:bg-active"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div
        className={cn(
          "field-input finance-focus flex items-center justify-between gap-3 px-3 text-left",
          !value && "text-text-secondary",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Transaction date"
          pattern="\d{4}-\d{2}-\d{2}"
          onFocus={() => setOpen(true)}
          onChange={(event) => commitTypedDate(event.target.value)}
          onBlur={resetInvalidTypedDate}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              resetInvalidTypedDate();
              setOpen(false);
            }
          }}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            if (nextOpen) inputRef.current?.focus();
          }}
          className="finance-focus grid h-8 w-8 shrink-0 place-items-center rounded-[12px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:cursor-not-allowed"
          aria-label={open ? "Close calendar" : "Open calendar"}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <CalendarDays size={16} aria-hidden="true" />
        </button>
      </div>

      {open && !disabled && (isCompact ? calendar : createPortal(calendar, document.body))}
    </div>
  );
}
