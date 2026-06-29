"use client";

import { useEffect, useMemo, useState } from "react";

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

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoToDisplay(value: string) {
  if (!isIsoDate(value)) return "";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatTypedDate(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function displayToIso(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return `${yearText}-${monthText}-${dayText}`;
}

function isWithinRange(value: string, minDate?: string, maxDate?: string) {
  if (minDate && value < minDate) return false;
  if (maxDate && value > maxDate) return false;
  return true;
}

function getDateError(value: string, minDate?: string, maxDate?: string) {
  if (!value) return "";
  if (value.length < 10) return "Enter the full date as DD/MM/YYYY.";

  const isoValue = displayToIso(value);
  if (!isoValue) return "Enter a valid date as DD/MM/YYYY.";
  if (!isWithinRange(isoValue, minDate, maxDate)) return "Enter a date in the allowed range.";

  return "";
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const formattedValue = useMemo(() => isoToDisplay(value), [value]);
  const [displayValue, setDisplayValue] = useState(formattedValue);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (value) {
      setDisplayValue(formattedValue);
      setTouched(false);
      return;
    }

    if (!touched) setDisplayValue("");
  }, [formattedValue, touched, value]);

  const error = getDateError(displayValue, minDate, maxDate);

  function handleChange(nextRawValue: string) {
    const nextDisplayValue = formatTypedDate(nextRawValue);
    const nextIsoValue = displayToIso(nextDisplayValue);

    setTouched(true);
    setDisplayValue(nextDisplayValue);

    if (nextIsoValue && isWithinRange(nextIsoValue, minDate, maxDate)) {
      onChange(nextIsoValue);
      return;
    }

    onChange("");
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Transaction date"
        aria-invalid={Boolean(touched && error)}
        maxLength={10}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => setTouched(true)}
        className="field-input"
      />

      {touched && error ? (
        <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>
      ) : null}
    </div>
  );
}
