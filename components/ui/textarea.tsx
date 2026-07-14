import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-input min-h-28 resize-y py-3 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
