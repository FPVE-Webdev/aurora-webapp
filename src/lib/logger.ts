/**
 * Structured Logging with Pino
 *
 * Provides consistent, structured logging across the application.
 * In production, logs are JSON for easy parsing by log aggregators.
 * In development, logs are pretty-printed for readability.
 */

import pino from 'pino';

/**
 * Create a Pino logger instance
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

  // Base configuration
  base: {
    env: process.env.NODE_ENV || 'development',
  },

  // Timestamp formatting
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty printing in development
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),

  // Redact sensitive fields
  redact: {
    paths: [
      'apiKey',
      'X-API-Key',
      'TROMSO_AI_API_KEY',
      'password',
      'token',
      'secret',
      '*.apiKey',
      '*.password',
      '*.token',
      '*.secret',
    ],
    remove: true,
  },
});

/**
 * Log levels:
 * - fatal (60): The service/app is going to stop or become unusable
 * - error (50): Fatal for a particular request, but service continues
 * - warn (40): A note on something that should probably be looked at
 * - info (30): Detail on regular operation
 * - debug (20): Anything else (verbose, diagnostic)
 * - trace (10): Very detailed diagnostic info
 */

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

/**
 * API request logger
 */
export function logApiRequest(params: {
  method: string;
  path: string;
  apiKey?: string;
  ip?: string;
  userAgent?: string;
}) {
  const sanitizedKey = params.apiKey ? `${params.apiKey.substring(0, 15)}...` : 'none';

  logger.info({
    type: 'api_request',
    method: params.method,
    path: params.path,
    apiKey: sanitizedKey,
    ip: params.ip,
    userAgent: params.userAgent,
  });
}

/**
 * API response logger
 */
export function logApiResponse(params: {
  method: string;
  path: string;
  status: number;
  duration: number;
  cached?: boolean;
}) {
  logger.info({
    type: 'api_response',
    method: params.method,
    path: params.path,
    status: params.status,
    duration: params.duration,
    cached: params.cached,
  });
}

/**
 * Rate limit event logger
 */
export function logRateLimitEvent(params: {
  apiKey: string;
  path: string;
  tier: string;
  exceeded: boolean;
  remaining: number;
  limit: number;
}) {
  const sanitizedKey = `${params.apiKey.substring(0, 15)}...`;

  if (params.exceeded) {
    logger.warn({
      type: 'rate_limit_exceeded',
      apiKey: sanitizedKey,
      path: params.path,
      tier: params.tier,
      limit: params.limit,
    });
  } else {
    logger.debug({
      type: 'rate_limit_check',
      apiKey: sanitizedKey,
      path: params.path,
      tier: params.tier,
      remaining: params.remaining,
      limit: params.limit,
    });
  }
}

/**
 * Authentication event logger
 */
export function logAuthEvent(params: {
  path: string;
  apiKey?: string;
  success: boolean;
  reason?: string;
}) {
  const sanitizedKey = params.apiKey ? `${params.apiKey.substring(0, 15)}...` : 'none';

  if (params.success) {
    logger.info({
      type: 'auth_success',
      path: params.path,
      apiKey: sanitizedKey,
    });
  } else {
    logger.warn({
      type: 'auth_failure',
      path: params.path,
      apiKey: sanitizedKey,
      reason: params.reason,
    });
  }
}

/**
 * Error logger with context
 */
export function logError(error: Error, context?: Record<string, unknown>) {
  logger.error({
    type: 'error',
    error: {
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    ...context,
  });
}

/**
 * Export the default logger for direct use
 */
export default logger;
