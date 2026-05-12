import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-md border border-ink-300/40 bg-parchment-50/70 shadow-[0_1px_0_rgba(0,0,0,0.02)] dark:border-ink-700/60 dark:bg-ink-800/70",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardBody = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-5", className)} {...props} />
));
CardBody.displayName = "CardBody";
