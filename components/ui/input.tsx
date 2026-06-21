import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[12px] border border-border bg-input px-3 py-2 text-base text-text-primary transition-all duration-200 ease-out outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-primary placeholder:text-text-secondary hover:bg-hover focus-visible:border-active focus-visible:bg-surface focus-visible:ring-3 focus-visible:ring-active/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-text-secondary disabled:opacity-60 aria-invalid:border-active aria-invalid:ring-3 aria-invalid:ring-active/25 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
