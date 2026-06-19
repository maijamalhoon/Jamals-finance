"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

function displayDate(value: string) {
  const date = toDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  placeholder = "Select date",
  disabled,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDate = toDate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate ?? new Date());

  const min = toDate(minDate);
  const max = toDate(maxDate);
  const today = new Date();

  useEffect(() => {
    const nextSelectedDate = toDate(value);
    if (nextSelectedDate) setViewDate(nextSelectedDate);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "field-input finance-focus flex cursor-pointer items-center justify-between gap-3 pr-3 text-left",
          !value && "text-slate-500",
          disabled && "cursor-not-allowed opacity-50",
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{value ? displayDate(value) : placeholder}</span>
        <CalendarDays size={16} className="text-slate-400" aria-hidden="true" />
      </button>

      {open && !disabled && (
        <div
          className="finance-date-popover absolute left-0 top-[calc(100%+10px)] z-[160] w-[320px] overflow-hidden rounded-[28px] border border-white/[0.13] bg-[#171b23]/95 p-3 text-white shadow-[0_28px_90px_rgba(0,0,0,0.46)] backdrop-blur-2xl"
          role="dialog"
          aria-label="Choose date"
        >
          <div className="mb-3 flex items-center justify-between rounded-[22px] border border-white/[0.08] bg-white/[0.055] px-2 py-2">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="icon-button h-9 w-9 rounded-[16px]"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-white">
                {viewDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-[11px] text-slate-500">Pick transaction date</p>
            </div>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="icon-button h-9 w-9 rounded-[16px]"
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 px-1 pb-1">
            {WEEKDAYS.map((weekday, index) => (
              <div
                key={`${weekday}-${index}`}
                className="grid h-8 place-items-center text-[11px] font-semibold text-slate-500"
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
                    onChange(formatDate(day));
                    setOpen(false);
                  }}
                  className={cn(
                    "finance-focus grid h-10 place-items-center rounded-[16px] text-sm font-medium transition-all",
                    outside && "text-slate-700",
                    !outside && "text-slate-300 hover:bg-white/[0.08] hover:text-white",
                    current && "ring-1 ring-cyan-200/45",
                    selected &&
                      "bg-white text-[#101318] shadow-[0_12px_28px_rgba(0,0,0,0.26)] hover:bg-white hover:text-[#101318]",
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
                onChange(formatDate(today));
                setViewDate(today);
                setOpen(false);
              }}
              className="finance-focus flex-1 rounded-[18px] border border-white/[0.10] bg-white/[0.07] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.11]"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="finance-focus flex-1 rounded-[18px] border border-white/[0.10] bg-white text-[#101318] px-3 py-2 text-xs font-semibold transition-colors hover:bg-slate-100"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
