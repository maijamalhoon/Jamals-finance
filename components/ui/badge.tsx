import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex min-h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-semibold leading-none whitespace-nowrap transition-all focus-visible:border-active focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-active/30 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-danger aria-invalid:ring-danger/20 dark:aria-invalid:ring-danger/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-active text-background [a]:hover:bg-active/90",
        secondary:
          "border-border bg-surface-secondary text-text-primary [a]:hover:bg-hover",
        destructive:
          "bg-danger/10 text-danger focus-visible:ring-danger/20 dark:bg-danger/20 dark:focus-visible:ring-danger/40 [a]:hover:bg-danger/20",
        outline:
          "border-border bg-card text-text-primary [a]:hover:bg-hover [a]:hover:text-text-primary",
        ghost:
          "text-text-secondary hover:bg-hover hover:text-text-primary",
        link: "text-active underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
