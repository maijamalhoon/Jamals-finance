import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function InlineNotice({
  tone = "info",
  className,
  ...props
}: ComponentProps<"div"> & {
  tone?: "info" | "success" | "warning" | "danger";
}) {
  return (
    <div
      data-tone={tone}
      className={cn(
        "rounded-[var(--radius-control)] border border-info/25 bg-info/10 px-4 py-3 text-sm leading-6 text-info data-[tone=danger]:border-danger/25 data-[tone=danger]:bg-danger/10 data-[tone=danger]:text-danger data-[tone=success]:border-success/25 data-[tone=success]:bg-success/10 data-[tone=success]:text-success data-[tone=warning]:border-warning/25 data-[tone=warning]:bg-warning/10 data-[tone=warning]:text-warning",
        className,
      )}
      {...props}
    />
  );
}

export { InlineNotice };
