import { useState } from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  /** Already a full canonical URL. */
  url: string;
  title: string;
  /** Optional teaser text shown by the OS share sheet. */
  text?: string;
}

/**
 * Native Web Share button. Mobile gets the OS share sheet; desktop falls back
 * to copying the link to clipboard with a brief "Copied" confirmation.
 *
 * No-ops silently if both APIs are unavailable (very rare; only ancient
 * browsers without secure context).
 */
export function ShareButton({ url, title, text }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const data = { url, title, text };
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share(data);
        return;
      } catch (err) {
        // User cancelled — that's not an error worth handling.
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard not available — nothing to do.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={share}
      title={copied ? "Link copied" : "Share this day"}
      aria-label="Share this day"
      className="h-11 w-11"
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent dark:text-accent-muted" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
    </Button>
  );
}
