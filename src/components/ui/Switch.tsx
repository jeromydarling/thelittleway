import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, checked, ...props }, ref) => (
    <label
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        {...props}
      />
      <span className="absolute inset-0 rounded-full bg-ink-300/60 transition-colors peer-checked:bg-accent dark:bg-ink-700 dark:peer-checked:bg-accent-muted" />
      <span className="absolute left-0.5 h-5 w-5 rounded-full bg-parchment-50 shadow transition-transform peer-checked:translate-x-5" />
    </label>
  ),
);
Switch.displayName = "Switch";
