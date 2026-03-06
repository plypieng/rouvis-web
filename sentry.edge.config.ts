import * as Sentry from '@sentry/nextjs';

import { getSentryServerInitConfig } from './lib/sentry';

Sentry.init(getSentryServerInitConfig('edge'));
