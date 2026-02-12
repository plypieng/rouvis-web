import * as Sentry from "@sentry/nextjs";
export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

function isSentryExampleEnabled(): boolean {
  const rawFlags = [
    process.env.SENTRY_EXAMPLE_ENABLED,
    process.env.NEXT_PUBLIC_SENTRY_EXAMPLE_ENABLED,
  ];
  return rawFlags.some(flag => ['1', 'true', 'yes', 'on'].includes((flag || '').trim().toLowerCase()));
}

// A faulty API route to test Sentry's error monitoring
export function GET() {
  if (!isSentryExampleEnabled()) {
    return new Response('Not Found', { status: 404 });
  }

  Sentry.logger.info("Sentry example API called");
  throw new SentryExampleAPIError(
    "This error is raised on the backend called by the example page.",
  );
}
