import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "block w-full resize-y rounded-md border border-ink-300/50 bg-parchment-50/80 px-3 py-2 font-serif text-base text-ink-900 placeholder:text-ink-300 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 dark:border-ink-700/60 dark:bg-ink-900/70 dark:text-parchment-200 dark:placeholder:text-ink-500",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
