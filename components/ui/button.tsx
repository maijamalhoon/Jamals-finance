import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[12px] border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 ease-out outline-none select-none will-change-transform hover:-translate-y-px hover:scale-[1.015] active:translate-y-0 active:scale-[0.985] focus-visible:border-active focus-visible:ring-3 focus-visible:ring-active/30 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100 aria-invalid:border-active aria-invalid:ring-3 aria-invalid:ring-active/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 [&_svg]:ease-out [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-active text-background shadow-theme hover:shadow-[var(--shadow-soft)] hover:brightness-95",
        outline:
          "border-border bg-input text-text-primary hover:bg-hover hover:shadow-[var(--shadow-soft)] aria-expanded:bg-hover aria-expanded:text-text-primary",
        secondary:
          "border-border bg-surface-secondary text-text-primary hover:bg-hover hover:shadow-[var(--shadow-soft)] aria-expanded:bg-hover aria-expanded:text-text-primary",
        ghost:
          "text-text-secondary hover:bg-hover hover:text-text-primary aria-expanded:bg-hover aria-expanded:text-text-primary",
        destructive:
          "border-border bg-surface-secondary text-text-primary hover:bg-hover hover:shadow-[var(--shadow-soft)] focus-visible:border-active focus-visible:ring-active/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 rounded-[14px] px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-11 rounded-[14px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
