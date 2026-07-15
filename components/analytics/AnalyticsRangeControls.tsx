"use client";

import { useMemo, useState } from "react";
import { CalendarRange, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  validateCustomRange,
  type AnalyticsPeriod,
  type AnalyticsRangeSelection,
} from "@/lib/analytics/calculations";

const PERIODS: Array<{ label: string; value: Exclude<AnalyticsPeriod, "custom"> }> = [
  { label: "Today", value: "today" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "6M", value: "sixMonth" },
  { label: "Year", value: "year" },
];

interface AnalyticsRangeControlsProps {
  selection: AnalyticsRangeSelection;
  now: string;
  pending: boolean;
  onPresetChange: (period: Exclude<AnalyticsPeriod, "custom">) => void;
  onCustomChange: (start: string, end: string) => void;
}

export default function AnalyticsRangeControls({
  selection,
  now,
  pending,
  onPresetChange,
  onCustomChange,
}: AnalyticsRangeControlsProps) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(selection.period === "custom" ? selection.current.start : "");
  const [end, setEnd] = useState(selection.period === "custom" ? selection.current.end : "");
  const validation = useMemo(() => validateCustomRange(start, end, now), [end, now, start]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setStart(selection.period === "custom" ? selection.current.start : "");
      setEnd(selection.period === "custom" ? selection.current.end : "");
    }
  }

  function applyCustomRange() {
    if (!validation.valid) return;
    onCustomChange(start, end);
    setOpen(false);
  }

  return (
    <div className="min-w-0 space-y-3">
      <div
        aria-label="Analytics date range"
        className="grid min-w-0 grid-cols-3 gap-1 rounded-[var(--radius-control)] border border-border bg-card p-1 sm:flex sm:w-fit sm:flex-wrap"
        role="group"
      >
        {PERIODS.map((item) => {
          const active = selection.period === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={active}
              disabled={pending}
              onClick={() => onPresetChange(item.value)}
              className="finance-focus min-h-11 min-w-0 rounded-[calc(var(--radius-control)-4px)] px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:cursor-wait disabled:opacity-65 aria-pressed:bg-active aria-pressed:text-background sm:min-w-[4.5rem]"
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={selection.period === "custom"}
          disabled={pending}
          onClick={() => handleOpenChange(true)}
          className="finance-focus col-span-1 inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-4px)] px-3 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary disabled:cursor-wait disabled:opacity-65 aria-pressed:bg-active aria-pressed:text-background sm:min-w-[5.75rem]"
        >
          <CalendarRange aria-hidden="true" className="size-4" />
          Custom
        </button>
      </div>

      <div aria-live="polite" className="min-h-5 text-xs text-text-tertiary" role="status">
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" />
            Updating analytics range…
          </span>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg overflow-y-auto p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Custom analytics range</DialogTitle>
            <DialogDescription>
              Choose an inclusive start and end date. The comparison uses the immediately preceding range with the same number of days.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-semibold text-text-primary" htmlFor="analytics-range-start">
                Start date
              </label>
              <DatePicker
                id="analytics-range-start"
                value={start}
                onChange={setStart}
                ariaLabel="Custom range start date"
                ariaDescribedBy="analytics-range-help"
                maxDate={now}
              />
              {!start ? <p className="text-xs text-text-tertiary">Required</p> : null}
            </div>

            <div className="min-w-0 space-y-2">
              <label className="text-sm font-semibold text-text-primary" htmlFor="analytics-range-end">
                End date
              </label>
              <DatePicker
                id="analytics-range-end"
                value={end}
                onChange={setEnd}
                ariaLabel="Custom range end date"
                ariaDescribedBy="analytics-range-help"
                maxDate={now}
              />
              {!end ? <p className="text-xs text-text-tertiary">Required</p> : null}
            </div>
          </div>

          <p id="analytics-range-help" className="text-xs leading-5 text-text-tertiary">
            Dates use DD/MM/YYYY. Future dates are unavailable.
          </p>
          {validation.rangeError ? (
            <p className="text-sm font-medium text-danger" role="alert">
              {validation.rangeError}
            </p>
          ) : null}

          <DialogFooter className="mt-2 -mx-5 -mb-5 sm:-mx-6 sm:-mb-6">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button disabled={!validation.valid || pending} onClick={applyCustomRange}>
              Apply range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
