import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius-button)] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--motion-duration-fast)] outline-none select-none focus-visible:shadow-[var(--focus-ring)] active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/60 dark:aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-xs)] hover:bg-primary-hover active:bg-primary-active",
        outline:
          "border-border bg-surface text-text-primary shadow-[var(--shadow-xs)] hover:border-border-strong hover:bg-surface-tinted aria-expanded:bg-surface-tinted",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[var(--shadow-xs)] hover:bg-secondary-hover active:bg-secondary-hover aria-expanded:bg-secondary-hover aria-expanded:text-secondary-foreground",
        ghost:
          "text-text-secondary hover:bg-primary-soft hover:text-text-primary aria-expanded:bg-primary-soft aria-expanded:text-text-primary",
        destructive:
          "bg-danger text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--danger),black_6%)] active:bg-[color-mix(in_srgb,var(--danger),black_10%)]",
        success:
          "bg-success text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--success),black_6%)] active:bg-[color-mix(in_srgb,var(--success),black_10%)]",
        income:
          "bg-income text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--income),black_6%)] active:bg-[color-mix(in_srgb,var(--income),black_10%)]",
        warning:
          "bg-warning text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--warning),black_6%)] active:bg-[color-mix(in_srgb,var(--warning),black_10%)]",
        payables:
          "bg-payables text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--payables),black_6%)] active:bg-[color-mix(in_srgb,var(--payables),black_10%)]",
        transfer:
          "bg-transfer text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--transfer),black_6%)] active:bg-[color-mix(in_srgb,var(--transfer),black_10%)]",
        investment:
          "bg-investment text-[var(--status-foreground)] shadow-[var(--shadow-xs)] hover:bg-[color-mix(in_srgb,var(--investment),black_6%)] active:bg-[color-mix(in_srgb,var(--investment),black_10%)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "min-h-11 gap-2 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "min-h-9 gap-1.5 rounded-[min(var(--radius-md),12px)] px-3 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "min-h-12 gap-2 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-11",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-9 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
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
  loading = false,
  loadingLabel,
  disabled,
  children,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
    loadingLabel?: string
  }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {loading ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
