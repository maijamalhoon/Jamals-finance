"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import DatePicker from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  FinanceModalBody,
  FinanceModalFooter,
  FinanceFormField,
  FinanceModalHeader,
  financeCancelButtonClass,
  financeErrorClass,
  financeModalContentClass,
} from "@/components/ui/finance-modal";
import {
  validateCustomRange,
  type AnalyticsPeriod,
  type AnalyticsRangeSelection,
} from "@/lib/analytics/calculations";

const PERIODS: Array<{
  label: string;
  ariaLabel: string;
  value: Exclude<AnalyticsPeriod, "custom" | "today" | "sixMonth">;
}> = [
  { label: "W", ariaLabel: "Week", value: "week" },
  { label: "M", ariaLabel: "Month", value: "month" },
  { label: "Y", ariaLabel: "Year", value: "year" },
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
  const [headingActions, setHeadingActions] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(selection.period === "custom" ? selection.current.start : "");
  const [end, setEnd] = useState(selection.period === "custom" ? selection.current.end : "");
  const validation = useMemo(() => validateCustomRange(start, end, now), [end, now, start]);

  useEffect(() => {
    setHeadingActions(document.getElementById("jf-analytics-heading-actions"));
  }, []);

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

  const compactControls = (
    <>
      <div
        aria-busy={pending}
        aria-label="Analytics date range"
        className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-[13px] border-0 bg-surface-primary p-1 shadow-sm sm:h-10 sm:rounded-[14px]"
        role="group"
      >
        {PERIODS.map((item) => {
          const active = selection.period === item.value;
          return (
            <button
              key={item.value}
              type="button"
              aria-label={item.ariaLabel}
              aria-pressed={active}
              disabled={pending}
              onClick={() => onPresetChange(item.value)}
              className="finance-focus grid size-7 shrink-0 place-items-center rounded-[9px] border-0 bg-transparent text-[11px] font-bold text-text-secondary transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-text-primary active:scale-95 disabled:cursor-wait disabled:opacity-55 aria-pressed:bg-active aria-pressed:text-background sm:size-8 sm:rounded-[10px] sm:text-xs"
            >
              {item.label}
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Custom date range"
          aria-pressed={selection.period === "custom"}
          disabled={pending}
          onClick={() => handleOpenChange(true)}
          className="finance-focus grid size-7 shrink-0 place-items-center rounded-[9px] border-0 bg-transparent text-text-secondary transition-[background-color,color,transform] duration-150 hover:bg-hover hover:text-text-primary active:scale-95 disabled:cursor-wait disabled:opacity-55 aria-pressed:bg-active aria-pressed:text-background sm:size-8 sm:rounded-[10px]"
        >
          <CalendarRange aria-hidden="true" className="size-3.5 sm:size-4" />
        </button>
      </div>
      <span aria-live="polite" className="sr-only" role="status">
        {pending ? "Updating analytics range" : ""}
      </span>
    </>
  );

  return (
    <>
      {headingActions ? createPortal(compactControls, headingActions) : null}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className={`${financeModalContentClass} sm:[--finance-modal-max-width:32rem]`}>
          <FinanceModalHeader
            title="Custom analytics range"
            description="Choose an inclusive range. Comparison uses the immediately preceding period with the same number of days."
            icon={CalendarRange}
            tone="info"
          />

          <FinanceModalBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <FinanceFormField
                label="Start date"
                htmlFor="analytics-range-start"
                hint={!start ? "Required" : undefined}
              >
                <DatePicker
                  id="analytics-range-start"
                  value={start}
                  onChange={setStart}
                  ariaLabel="Custom range start date"
                  ariaDescribedBy="analytics-range-help"
                  maxDate={now}
                />
              </FinanceFormField>

              <FinanceFormField
                label="End date"
                htmlFor="analytics-range-end"
                hint={!end ? "Required" : undefined}
              >
                <DatePicker
                  id="analytics-range-end"
                  value={end}
                  onChange={setEnd}
                  ariaLabel="Custom range end date"
                  ariaDescribedBy="analytics-range-help"
                  maxDate={now}
                />
              </FinanceFormField>
            </div>

            <p
              id="analytics-range-help"
              className="rounded-[var(--oneui-control-radius)] border border-info/20 bg-info/10 px-3 py-2.5 text-xs leading-5 text-text-secondary"
            >
              Dates use DD/MM/YYYY. Future dates are unavailable.
            </p>
            {validation.rangeError ? (
              <p className={financeErrorClass} role="alert">
                {validation.rangeError}
              </p>
            ) : null}
          </FinanceModalBody>

          <FinanceModalFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className={financeCancelButtonClass}
            >
              Cancel
            </Button>
            <Button
              disabled={!validation.valid || pending}
              onClick={applyCustomRange}
              className="primary-action w-full"
            >
              Apply range
            </Button>
          </FinanceModalFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
