import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--oneui-button-radius)] border border-transparent bg-clip-padding text-sm font-semibold leading-none whitespace-nowrap transition-all duration-200 ease-out outline-none select-none will-change-transform hover:-translate-y-px active:translate-y-0 active:scale-[0.985] focus-visible:border-active focus-visible:ring-3 focus-visible:ring-active/30 disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-active aria-invalid:ring-3 aria-invalid:ring-active/25 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 [&_svg]:ease-out [&_svg:not([class*='size-'])]:size-4",
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
          "h-[var(--oneui-control-height)] gap-1.5 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[calc(var(--oneui-button-radius)-0.25rem)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-[var(--oneui-control-height-sm)] gap-1 rounded-[calc(var(--oneui-button-radius)-0.125rem)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-[var(--oneui-control-height-lg)] gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-[var(--oneui-control-height)]",
        "icon-xs":
          "size-6 rounded-[calc(var(--oneui-button-radius)-0.25rem)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-[var(--oneui-control-height-sm)] rounded-[calc(var(--oneui-button-radius)-0.125rem)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-[var(--oneui-control-height-lg)]",
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
