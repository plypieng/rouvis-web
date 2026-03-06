import * as Sentry from '@sentry/nextjs';

import { getSentryBrowserInitConfig } from './lib/sentry';

Sentry.init({
  ...getSentryBrowserInitConfig(),
  integrations: typeof Sentry.replayIntegration === 'function'
    ? [Sentry.replayIntegration()]
    : [],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
