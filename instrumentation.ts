/**
 * Next.js Instrumentation File
 *
 * This file is used to initialize Sentry for server-side and edge runtime.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side initialization
    const Sentry = await import('@sentry/nextjs');
    const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

    if (SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

        beforeSend(event) {
          // Remove API keys from breadcrumbs and context
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
              if (breadcrumb.data && typeof breadcrumb.data === 'object') {
                const data = { ...breadcrumb.data };
                if ('X-API-Key' in data) {
                  data['X-API-Key'] = '[REDACTED]';
                }
                if ('TROMSO_AI_API_KEY' in data) {
                  data['TROMSO_AI_API_KEY'] = '[REDACTED]';
                }
                return { ...breadcrumb, data };
              }
              return breadcrumb;
            });
          }
          return event;
        },
      });
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime initialization
    const Sentry = await import('@sentry/nextjs');
    const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

    if (SENTRY_DSN) {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

        beforeSend(event) {
          // Remove API keys from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
              if (breadcrumb.data && typeof breadcrumb.data === 'object') {
                const data = { ...breadcrumb.data };
                if ('X-API-Key' in data) {
                  data['X-API-Key'] = '[REDACTED]';
                }
                return { ...breadcrumb, data };
              }
              return breadcrumb;
            });
          }
          return event;
        },
      });
    }
  }
}
