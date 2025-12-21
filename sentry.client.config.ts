/**
 * Sentry Client-Side Configuration
 *
 * This file configures Sentry error tracking for client-side (browser) code.
 */

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is configured
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Release tracking
    // TODO: Set this to your actual release version
    // release: 'aurora-webapp@1.0.0',

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
