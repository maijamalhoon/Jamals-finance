"use client";

import { useEffect, useId, useRef } from "react";
import { CalendarDays } from "lucide-react";
import flatpickr from "flatpickr";
import type { Instance } from "flatpickr/dist/types/instance";
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<Instance | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!inputRef.current) return;

    pickerRef.current = flatpickr(inputRef.current, {
      allowInput: false,
      appendTo: document.body,
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      disableMobile: true,
      maxDate,
      minDate,
      monthSelectorType: "static",
      nextArrow: ">",
      prevArrow: "<",
      onChange: (selectedDates) => {
        onChangeRef.current(
          selectedDates[0] ? formatDate(selectedDates[0]) : "",
        );
      },
    });

    return () => {
      pickerRef.current?.destroy();
      pickerRef.current = null;
    };
  }, [maxDate, minDate]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const selected = picker.selectedDates[0]
      ? formatDate(picker.selectedDates[0])
      : "";
    if (selected !== value) {
      picker.setDate(value || null, false);
    }
  }, [value]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    if (disabled) {
      picker.close();
    }
    inputRef.current?.toggleAttribute("disabled", Boolean(disabled));
  }, [disabled]);

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        ref={inputRef}
        value={value}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        className="w-full cursor-pointer rounded-xl border border-gray-700/50 bg-gray-800/60 px-4 py-3 pr-11 text-sm text-white outline-none transition-colors placeholder-gray-700 focus:border-cyan-300/55 focus:ring-2 focus:ring-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={placeholder}
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
        aria-hidden="true"
      />
    </div>
  );
}
