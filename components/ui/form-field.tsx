import * as React from "react";

import { cn } from "@/lib/utils";

function FormField({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-1.5", className)} {...props} />;
}

function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("field-label", className)} {...props} />;
}

function FieldMessage({
  className,
  tone = "helper",
  ...props
}: React.ComponentProps<"p"> & {
  tone?: "helper" | "error" | "success";
}) {
  return (
    <p
      data-tone={tone}
      className={cn(
        "text-xs leading-5 text-text-secondary data-[tone=error]:font-medium data-[tone=error]:text-danger data-[tone=success]:font-medium data-[tone=success]:text-success",
        className,
      )}
      {...props}
    />
  );
}

export { FieldMessage, FormField, FormLabel };
