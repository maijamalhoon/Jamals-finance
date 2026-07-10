import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-[var(--jf-control-radius)] border text-sm font-semibold tracking-[-0.006em] outline-none transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-200 ease-[var(--jf-ease)] focus-visible:ring-0 active:not-aria-[haspopup]:translate-y-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-active bg-active text-background shadow-[0_10px_24px_color-mix(in_srgb,var(--active),transparent_78%)] hover:-translate-y-px hover:brightness-[1.04] active:translate-y-0 active:scale-[0.985]",
        outline:
          "border-border bg-surface text-text-primary shadow-theme hover:-translate-y-px hover:border-border-strong hover:bg-hover active:translate-y-0 active:scale-[0.985]",
        secondary:
          "border-border bg-surface-secondary text-text-primary shadow-theme hover:-translate-y-px hover:border-border-strong hover:bg-hover active:translate-y-0 active:scale-[0.985]",
        ghost:
          "border-transparent bg-transparent text-text-secondary shadow-none hover:bg-hover hover:text-text-primary active:scale-[0.985]",
        destructive:
          "border-danger/20 bg-danger/10 text-danger shadow-none hover:-translate-y-px hover:bg-danger/16 active:translate-y-0 active:scale-[0.985] dark:border-danger/25 dark:bg-danger/14",
        link:
          "h-auto min-h-0 border-transparent bg-transparent p-0 text-active shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[42px] gap-2 px-4",
        xs: "h-8 gap-1.5 rounded-xl px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 rounded-xl px-3 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2.5 px-5 text-[0.9375rem]",
        icon: "size-[42px] p-0",
        "icon-xs": "size-8 rounded-xl p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9 rounded-xl p-0",
        "icon-lg": "size-12 p-0 [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
