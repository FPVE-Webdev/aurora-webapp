/**
 * Next.js Client-Side Instrumentation File
 *
 * This file is used to initialize Sentry for client-side (browser) code.
 * Replaces sentry.client.config.ts for Turbopack compatibility.
 */

import * as Sentry from '@sentry/nextjs';

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

export async function register() {
  // Only initialize Sentry if DSN is configured
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,

      // Environment
      environment: process.env.NODE_ENV || 'development',

      // Sample rate for error events
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Replay session sampling
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Filter out browser extension errors and other noise
      beforeSend(event, hint) {
        const error = hint.originalException;

        // Filter out browser extension errors
        if (error && typeof error === 'object' && 'message' in error) {
          const message = String(error.message);
          if (
            message.includes('chrome-extension://') ||
            message.includes('moz-extension://') ||
            message.includes('safari-extension://')
          ) {
            return null;
          }
        }

        return event;
      },

      // Integration configuration
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
  } else if (process.env.NODE_ENV === 'development') {
    console.warn('[SENTRY] ⚠️ NEXT_PUBLIC_SENTRY_DSN not set, error monitoring disabled');
  }
}
