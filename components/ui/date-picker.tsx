"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
} from "react";
import { CalendarDays } from "lucide-react";

import { financeFieldErrorClass } from "@/components/ui/finance-modal";
import { useTouchWheelPickerMode } from "@/components/ui/touch-wheel-picker";
import { cn } from "@/lib/utils";

const DATE_WHEEL_RANGE = 8;
const MOMENTUM_WINDOW_MS = 220;
const MAX_MOMENTUM_DAYS = 4;

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
  scrollPicker?: boolean;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isoToDisplay(value: string) {
  if (!isIsoDate(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function isoToDate(value: string) {
  if (!isIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12);

  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : null;
}

function dateToIso(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayIso() {
  return dateToIso(new Date());
}

function addIsoDays(value: string, days: number) {
  const parsed = isoToDate(value) ?? isoToDate(getTodayIso())!;
  parsed.setDate(parsed.getDate() + days);
  return dateToIso(parsed);
}

function daysBetween(start: string, end: string) {
  const first = isoToDate(start);
  const second = isoToDate(end);
  if (!first || !second) return 0;

  const firstUtc = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate());
  const secondUtc = Date.UTC(second.getFullYear(), second.getMonth(), second.getDate());
  return Math.round((secondUtc - firstUtc) / 86_400_000);
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

function clampIsoDate(value: string, minDate?: string, maxDate?: string) {
  if (minDate && value < minDate) return minDate;
  if (maxDate && value > maxDate) return maxDate;
  return value;
}

function getDateError(value: string, minDate?: string, maxDate?: string) {
  if (!value) return "";
  if (value.length < 10) return "Enter the full date as DD/MM/YYYY.";

  const isoValue = displayToIso(value);
  if (!isoValue) return "Enter a valid date as DD/MM/YYYY.";
  if (!isWithinRange(isoValue, minDate, maxDate)) {
    return "Enter a date in the allowed range.";
  }

  return "";
}

function DateWheelField({
  id,
  value,
  onChange,
  ariaLabel,
  ariaDescribedBy,
  disabled,
  minDate,
  maxDate,
  openCalendar,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  ariaDescribedBy?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  openCalendar: () => void;
}) {
  const currentValue = isIsoDate(value) ? value : getTodayIso();
  const baseValueRef = useRef(currentValue);
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const movedRef = useRef(false);
  const positionRef = useRef(0);
  const settleTimerRef = useRef<number | null>(null);
  const isSettlingRef = useRef(false);
  const [position, setPosition] = useState(0);
  const [transitionMs, setTransitionMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isDragging || isSettlingRef.current) return;
    clearSettleTimer();
    baseValueRef.current = currentValue;
    positionRef.current = 0;
    setTransitionMs(0);
    setPosition(0);
  }, [clearSettleTimer, currentValue, isDragging]);

  useEffect(() => () => clearSettleTimer(), [clearSettleTimer]);

  const commitOffset = useCallback(
    (offset: number) => {
      const baseValue = baseValueRef.current;
      const nextValue = clampIsoDate(
        addIsoDays(baseValue, offset),
        minDate,
        maxDate,
      );

      baseValueRef.current = nextValue;
      positionRef.current = 0;
      isSettlingRef.current = false;
      setTransitionMs(0);
      setPosition(0);
      if (nextValue !== value) onChange(nextValue);
    },
    [maxDate, minDate, onChange, value],
  );

  const settleAt = useCallback(
    (requestedOffset: number, duration = 260) => {
      clearSettleTimer();
      const baseValue = baseValueRef.current;
      const boundedValue = clampIsoDate(
        addIsoDays(baseValue, requestedOffset),
        minDate,
        maxDate,
      );
      const targetOffset = clamp(
        daysBetween(baseValue, boundedValue),
        -DATE_WHEEL_RANGE,
        DATE_WHEEL_RANGE,
      );
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const nextDuration = reducedMotion ? 0 : duration;

      isSettlingRef.current = true;
      positionRef.current = targetOffset;
      setTransitionMs(nextDuration);
      setPosition(targetOffset);

      if (nextDuration === 0) {
        commitOffset(targetOffset);
        return;
      }

      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        commitOffset(targetOffset);
      }, nextDuration + 24);
    },
    [clearSettleTimer, commitOffset, maxDate, minDate],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled || event.button !== 0 || !event.isPrimary) return;

      clearSettleTimer();
      isSettlingRef.current = false;
      baseValueRef.current = isIsoDate(value) ? value : getTodayIso();
      positionRef.current = 0;
      setPosition(0);
      setTransitionMs(0);
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      lastYRef.current = event.clientY;
      lastTimeRef.current = performance.now();
      velocityRef.current = 0;
      movedRef.current = false;
      setIsDragging(true);
    },
    [clearSettleTimer, disabled, value],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId || disabled) return;

      event.preventDefault();
      const height = Math.max(1, event.currentTarget.clientHeight);
      const now = performance.now();
      const deltaFromStart = startYRef.current - event.clientY;
      const nextPosition = clamp(
        deltaFromStart / height,
        -DATE_WHEEL_RANGE,
        DATE_WHEEL_RANGE,
      );
      const elapsed = Math.max(1, now - lastTimeRef.current);
      const instantVelocity =
        (lastYRef.current - event.clientY) / height / elapsed;

      velocityRef.current = velocityRef.current * 0.58 + instantVelocity * 0.42;
      lastYRef.current = event.clientY;
      lastTimeRef.current = now;
      movedRef.current = movedRef.current || Math.abs(deltaFromStart) > 4;
      positionRef.current = nextPosition;
      setPosition(nextPosition);
    },
    [disabled],
  );

  const finishGesture = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, cancelled = false) => {
      if (pointerIdRef.current !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      pointerIdRef.current = null;
      setIsDragging(false);

      if (!movedRef.current && !cancelled) {
        positionRef.current = 0;
        setPosition(0);
        openCalendar();
        return;
      }

      const idleFor = performance.now() - lastTimeRef.current;
      const velocity = cancelled || idleFor > 90 ? 0 : velocityRef.current;
      const momentum = clamp(
        velocity * MOMENTUM_WINDOW_MS,
        -MAX_MOMENTUM_DAYS,
        MAX_MOMENTUM_DAYS,
      );
      const targetOffset = Math.round(
        clamp(
          positionRef.current + momentum,
          -DATE_WHEEL_RANGE,
          DATE_WHEEL_RANGE,
        ),
      );
      const distance = Math.abs(targetOffset - positionRef.current);
      const duration = Math.round(clamp(210 + distance * 72, 210, 520));

      settleAt(targetOffset, duration);
    },
    [openCalendar, settleAt],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openCalendar();
        return;
      }

      const direction =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 1
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -1
            : 0;
      if (!direction) return;

      event.preventDefault();
      baseValueRef.current = isIsoDate(value) ? value : getTodayIso();
      settleAt(direction, 220);
    },
    [disabled, openCalendar, settleAt, value],
  );

  const offsets = Array.from(
    { length: DATE_WHEEL_RANGE * 2 + 1 },
    (_, index) => index - DATE_WHEEL_RANGE,
  );
  const trackStyle = {
    transform: `translate3d(0, ${-(DATE_WHEEL_RANGE + position) * 100}%, 0)`,
    transition:
      transitionMs > 0
        ? `transform ${transitionMs}ms cubic-bezier(0.22, 0.72, 0.2, 1)`
        : "none",
  } satisfies CSSProperties;

  return (
    <div
      id={id}
      role="spinbutton"
      aria-label={ariaLabel}
      aria-valuetext={isoToDisplay(currentValue)}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      className="field-input relative w-full cursor-ns-resize overflow-hidden p-0 touch-none select-none"
      data-dragging={isDragging ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => finishGesture(event)}
      onPointerCancel={(event) => finishGesture(event, true)}
      onKeyDown={handleKeyDown}
    >
      <div aria-hidden="true" className="invisible flex h-full items-center px-3 pr-11">
        {isoToDisplay(currentValue)}
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full will-change-transform"
        style={trackStyle}
      >
        {offsets.map((offset) => (
          <div
            key={offset}
            className="flex h-full w-full items-center px-3 pr-11 text-text-primary"
          >
            {isoToDisplay(addIsoDays(baseValueRef.current, offset))}
          </div>
        ))}
      </div>
      <CalendarDays
        aria-hidden="true"
        size={17}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-secondary"
      />
    </div>
  );
}

export default function DatePicker({
  id,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  ariaLabel = "Date",
  ariaDescribedBy,
  disabled,
  className,
  minDate,
  maxDate,
  scrollPicker = true,
}: DatePickerProps) {
  const formattedValue = useMemo(() => isoToDisplay(value), [value]);
  const [displayValue, setDisplayValue] = useState(formattedValue);
  const [touched, setTouched] = useState(false);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);
  const wheelLockRef = useRef(0);
  const touchPickerMode = useTouchWheelPickerMode(scrollPicker);

  useEffect(() => {
    if (value) {
      setDisplayValue(formattedValue);
      setTouched(false);
      return;
    }
    if (!touched) setDisplayValue("");
  }, [formattedValue, touched, value]);

  const error = getDateError(displayValue, minDate, maxDate);
  const internalErrorId = id ? `${id}-error` : undefined;
  const describedBy =
    [ariaDescribedBy, touched && error ? internalErrorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const input = nativeInputRef.current as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") input.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  }, [disabled]);

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

  function handleNativeChange(nextValue: string) {
    if (!nextValue || !isWithinRange(nextValue, minDate, maxDate)) return;
    setTouched(false);
    setDisplayValue(isoToDisplay(nextValue));
    onChange(nextValue);
  }

  function handleWheel(event: ReactWheelEvent<HTMLInputElement>) {
    if (!scrollPicker || disabled || Math.abs(event.deltaY) < 2) return;

    event.preventDefault();
    event.stopPropagation();
    const now = performance.now();
    if (now - wheelLockRef.current < 110) return;
    wheelLockRef.current = now;

    const baseValue = isIsoDate(value) ? value : getTodayIso();
    const direction = event.deltaY > 0 ? 1 : -1;
    const nextValue = clampIsoDate(
      addIsoDays(baseValue, direction),
      minDate,
      maxDate,
    );
    if (nextValue !== value) onChange(nextValue);
  }

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {touchPickerMode ? (
          <DateWheelField
            id={id}
            value={value}
            onChange={onChange}
            ariaLabel={ariaLabel}
            ariaDescribedBy={describedBy}
            disabled={disabled}
            minDate={minDate}
            maxDate={maxDate}
            openCalendar={openCalendar}
          />
        ) : (
          <>
            <input
              id={id}
              type="text"
              inputMode="numeric"
              value={displayValue}
              disabled={disabled}
              placeholder={placeholder}
              aria-label={ariaLabel}
              aria-describedby={describedBy}
              aria-invalid={Boolean(touched && error)}
              maxLength={10}
              onChange={(event) => handleChange(event.target.value)}
              onBlur={() => setTouched(true)}
              onClick={openCalendar}
              onWheel={handleWheel}
              className="field-input pr-11 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20"
            />
            <button
              type="button"
              aria-label={`Open ${ariaLabel.toLowerCase()} calendar`}
              disabled={disabled}
              onClick={openCalendar}
              className="finance-focus absolute top-1/2 right-1.5 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:pointer-events-none disabled:opacity-50"
            >
              <CalendarDays aria-hidden="true" size={17} />
            </button>
          </>
        )}

        <input
          ref={nativeInputRef}
          type="date"
          value={isIsoDate(value) ? value : ""}
          min={minDate}
          max={maxDate}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => handleNativeChange(event.target.value)}
          className="pointer-events-none absolute right-0 bottom-0 h-px w-px opacity-0"
        />
      </div>

      {touched && error ? (
        <p id={internalErrorId} className={financeFieldErrorClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
