import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-parchment-50 hover:bg-accent-dark dark:bg-accent-muted dark:hover:bg-accent",
        outline:
          "border border-ink-300/60 bg-transparent text-ink-800 hover:bg-parchment-200 dark:border-ink-500/60 dark:text-parchment-200 dark:hover:bg-ink-800",
        ghost:
          "text-ink-700 hover:bg-parchment-200 dark:text-parchment-200 dark:hover:bg-ink-800",
        subtle:
          "bg-parchment-200 text-ink-800 hover:bg-parchment-300 dark:bg-ink-800 dark:text-parchment-200 dark:hover:bg-ink-700",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
