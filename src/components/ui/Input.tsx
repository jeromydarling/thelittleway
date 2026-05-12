import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-ink-300/50 bg-parchment-50/80 px-3 font-sans text-sm text-ink-900 placeholder:text-ink-300 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 dark:border-ink-700/60 dark:bg-ink-900/70 dark:text-parchment-200 dark:placeholder:text-ink-500",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
