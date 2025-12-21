/**
 * Edge-Compatible Logger
 *
 * Lightweight logging for Edge Runtime (middleware).
 * Edge Runtime doesn't support full Pino, so we use structured console logs.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  type: string;
  [key: string]: unknown;
}

/**
 * Format log message for Edge Runtime
 */
function log(level: LogLevel, context: LogContext) {
  const timestamp = new Date().toISOString();
  const formatted = {
    level,
    time: timestamp,
    ...context,
  };

  // In development, use pretty output
  if (process.env.NODE_ENV !== 'production') {
    const emoji = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
    };
    console.log(`${emoji[level]} [${context.type}]`, formatted);
  } else {
    // In production, use JSON
    console.log(JSON.stringify(formatted));
  }
}

/**
 * Log API request
 */
export function logApiRequest(params: {
  method: string;
  path: string;
  apiKey?: string;
  ip?: string;
}) {
  const sanitizedKey = params.apiKey ? `${params.apiKey.substring(0, 15)}...` : 'none';

  log('info', {
    type: 'api_request',
    method: params.method,
    path: params.path,
    apiKey: sanitizedKey,
    ip: params.ip,
  });
}

/**
 * Log authentication event
 */
export function logAuthEvent(params: {
  path: string;
  apiKey?: string;
  success: boolean;
  reason?: string;
}) {
  const sanitizedKey = params.apiKey ? `${params.apiKey.substring(0, 15)}...` : 'none';

  log(params.success ? 'info' : 'warn', {
    type: params.success ? 'auth_success' : 'auth_failure',
    path: params.path,
    apiKey: sanitizedKey,
    ...(params.reason && { reason: params.reason }),
  });
}

/**
 * Log rate limit event
 */
export function logRateLimitEvent(params: {
  apiKey: string;
  path: string;
  exceeded: boolean;
  remaining: number;
  limit: number;
}) {
  const sanitizedKey = `${params.apiKey.substring(0, 15)}...`;

  log(params.exceeded ? 'warn' : 'debug', {
    type: params.exceeded ? 'rate_limit_exceeded' : 'rate_limit_check',
    apiKey: sanitizedKey,
    path: params.path,
    remaining: params.remaining,
    limit: params.limit,
  });
}

/**
 * Log error
 */
export function logError(message: string, context?: Record<string, unknown>) {
  log('error', {
    type: 'error',
    message,
    ...context,
  });
}

export default {
  debug: (context: LogContext) => log('debug', context),
  info: (context: LogContext) => log('info', context),
  warn: (context: LogContext) => log('warn', context),
  error: (context: LogContext) => log('error', context),
};
