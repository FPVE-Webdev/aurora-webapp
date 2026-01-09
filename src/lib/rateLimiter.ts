/**
 * Rate Limiter Service using Upstash Redis
 *
 * Implements tier-based rate limiting:
 * - Demo tier: 100 requests/hour
 * - iOS App: 10,000 requests/hour
 * - Development: Unlimited (no rate limit)
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis/cloudflare';

// Check if Upstash is configured
const isConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

// Initialize Redis client (only if configured)
const redis = isConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

/**
 * Rate limit tiers based on API key
 */
export const RATE_LIMITS = {
  // Demo tier - For testing and free tier customers
  demo: {
    limit: 100,
    window: '1h' as const,
    keys: ['tro_demo_test_key'] as readonly string[],
  },

  // iOS App - High priority, production use
  ios: {
    limit: 10000,
    window: '1h' as const,
    keys: ['tro_app_aurora_watcher_v1'] as readonly string[],
  },

  // Development - Unlimited (no rate limit in dev)
  dev: {
    limit: Infinity,
    window: '1h' as const,
    keys: ['dev_test_key'] as readonly string[],
  },
};

// Cache dynamic limiters keyed by the per-hour limit to avoid recreating per request
const dynamicLimiters = new Map<number, Ratelimit>();

/**
 * Create rate limiter for a specific tier
 */
function createRateLimiter(limit: number, window: '1h') {
  if (!redis) {
    // If Redis is not configured, return null (no rate limiting)
    return null;
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    analytics: true,
    prefix: 'ratelimit:aurora',
  });
}

/**
 * Get (or create) a dynamic limiter for a custom limit returned from Supabase
 */
function getDynamicLimiter(limit: number) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return null;
  }

  if (dynamicLimiters.has(limit)) {
    return dynamicLimiters.get(limit)!;
  }

  const limiter = createRateLimiter(limit, '1h');
  if (limiter) {
    dynamicLimiters.set(limit, limiter);
  }

  return limiter;
}

// Create rate limiters for each tier
const demoLimiter = createRateLimiter(RATE_LIMITS.demo.limit, RATE_LIMITS.demo.window);
const iosLimiter = createRateLimiter(RATE_LIMITS.ios.limit, RATE_LIMITS.ios.window);

/**
 * Get the appropriate rate limiter for an API key
 */
function getRateLimiterForKey(apiKey: string) {
  // Development keys have no rate limit
  if (RATE_LIMITS.dev.keys.includes(apiKey)) {
    return null;
  }

  // iOS app gets high limit
  if (RATE_LIMITS.ios.keys.includes(apiKey)) {
    return iosLimiter;
  }

  // Demo tier gets standard limit
  if (RATE_LIMITS.demo.keys.includes(apiKey)) {
    return demoLimiter;
  }

  // Unknown key defaults to demo tier limits
  return demoLimiter;
}

/**
 * Check if a request is allowed based on rate limits
 *
 * @param apiKey - The API key making the request
 * @param limitOverride - Optional per-hour limit returned from Supabase
 * @returns Object with success status and limit info
 */
export async function checkRateLimit(apiKey: string, limitOverride?: number) {
  // If Upstash is not configured, allow all requests
  if (!isConfigured) {
    console.warn('[RATE_LIMIT] ⚠️ Upstash not configured, rate limiting disabled');
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
      pending: Promise.resolve(),
    };
  }

  const limiter =
    limitOverride && Number.isFinite(limitOverride)
      ? getDynamicLimiter(limitOverride)
      : getRateLimiterForKey(apiKey);

  // If no limiter (e.g., dev keys), allow request
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
      pending: Promise.resolve(),
    };
  }

  try {
    // Check rate limit
    const result = await limiter.limit(apiKey);

    if (!result.success) {
      console.warn(
        `[RATE_LIMIT] ❌ ${apiKey.substring(0, 15)}... exceeded limit (${result.limit} req/${RATE_LIMITS.demo.window})`
      );
    }

    return result;
  } catch (error) {
    console.error('[RATE_LIMIT] Error checking rate limit:', error);
    // On error, allow the request (fail open)
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
      pending: Promise.resolve(),
    };
  }
}

/**
 * Get rate limit info for an API key (without consuming a token)
 *
 * @param apiKey - The API key to check
 * @param limitOverride - Optional per-hour limit returned from Supabase
 * @returns Rate limit configuration
 */
export function getRateLimitInfo(apiKey: string, limitOverride?: number) {
  if (limitOverride && Number.isFinite(limitOverride)) {
    return { tier: 'custom', limit: limitOverride, window: '1h' as const };
  }

  if (RATE_LIMITS.dev.keys.includes(apiKey)) {
    return { tier: 'development', limit: Infinity, window: '1h' as const };
  }

  if (RATE_LIMITS.ios.keys.includes(apiKey)) {
    return { tier: 'ios', limit: RATE_LIMITS.ios.limit, window: RATE_LIMITS.ios.window };
  }

  if (RATE_LIMITS.demo.keys.includes(apiKey)) {
    return { tier: 'demo', limit: RATE_LIMITS.demo.limit, window: RATE_LIMITS.demo.window };
  }

  return { tier: 'unknown', limit: RATE_LIMITS.demo.limit, window: RATE_LIMITS.demo.window };
}
