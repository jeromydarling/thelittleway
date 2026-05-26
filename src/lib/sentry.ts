/**
 * Sentry initialization — federation-aware error tracking.
 *
 * Per CROS doctrine: app_slug tag for federation routing, replays masked,
 * media blocked, no PII by default. DSN from VITE_SENTRY_DSN; silently
 * no-ops when unset.
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "unknown",
    initialScope: {
      tags: {
        app_slug: "thelittleway",
        federation_phase: "adjacent",
      },
    },
    sendDefaultPii: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/[a-z]+\.lovable\.app/,
      /^https:\/\/[a-z]+\.supabase\.co/,
    ],
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}
