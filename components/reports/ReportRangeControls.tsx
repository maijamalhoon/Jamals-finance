"use client";

import { useEffect, useState, useTransition } from "react";
import { CalendarRange, Printer } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";
import { Button } from "@/components/ui/button";

type ReportPeriod = "week" | "month" | "sixMonth" | "year" | "custom";

export default function ReportRangeControls({
  period,
  start,
  end,
}: {
  period: ReportPeriod;
  start: string;
  end: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startNavigation] = useTransition();
  const [customStart, setCustomStart] = useState(start);
  const [customEnd, setCustomEnd] = useState(end);
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(period);
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomStart(start);
    setCustomEnd(end);
    setSelectedPeriod(period);
    setError("");
  }, [start, end, period]);

  function navigate(next: URLSearchParams) {
    startNavigation(() => {
      const query = next.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  }

  function selectPeriod(nextPeriod: ReportPeriod) {
    setSelectedPeriod(nextPeriod);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    params.delete("from");
    params.delete("to");
    setError("");

    if (nextPeriod !== "custom") navigate(params);
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) {
      setError("Choose both report dates.");
      return;
    }
    if (customStart > customEnd) {
      setError("Start date must be before or equal to end date.");
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("from", customStart);
    params.set("to", customEnd);
    setError("");
    navigate(params);
  }

  return (
    <div className="finance-panel min-w-0 p-3 print:hidden sm:p-4" aria-busy={pending || undefined}>
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-semibold text-text-secondary">Report period</span>
            <select
              value={selectedPeriod}
              onChange={(event) => selectPeriod(event.target.value as ReportPeriod)}
              className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="week">Weekly report</option>
              <option value="month">Monthly report</option>
              <option value="sixMonth">Six-month report</option>
              <option value="year">Year-to-date report</option>
              <option value="custom">Custom date report</option>
            </select>
          </label>

          {selectedPeriod === "custom" ? (
            <>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-text-secondary">From</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-text-secondary">To</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="finance-control finance-focus h-11 w-full px-3 text-sm text-text-primary outline-none"
                />
              </label>
            </>
          ) : (
            <div className="finance-panel-soft flex min-h-11 items-center gap-2 px-3 text-xs text-text-secondary sm:col-span-2">
              <CalendarRange aria-hidden="true" size={15} className="shrink-0 text-info" />
              <span>{start} to {end}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedPeriod === "custom" ? (
            <Button type="button" onClick={applyCustomRange} disabled={pending}>
              Apply range
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden="true" size={15} />
            Print report
          </Button>
        </div>
      </div>

      <div className="mt-2 min-h-5" aria-live="polite">
        {error ? (
          <p className="text-xs font-medium text-danger">{error}</p>
        ) : (
          <BackgroundRefreshStatus refreshing={pending} label="Preparing report..." />
        )}
      </div>
    </div>
  );
}
