/**
 * Next.js Middleware - API Key Authentication & Security
 *
 * This middleware runs on EVERY request to /api/aurora/* endpoints.
 * It validates API keys and enforces rate limiting.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkRateLimit, getRateLimitInfo } from './lib/rateLimiter';
import { logAuthEvent, logRateLimitEvent } from './lib/edgeLogger';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';

type VerifiedKey = {
  organization_id: string | null;
  rate_limit_tier: string | null;
  rate_limit_per_hour: number | null;
  allowed_origins: string[] | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Edge-safe Supabase client for key verification (read-only)
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// Admin authentication
const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-in-production'
);
const ADMIN_COOKIE_NAME = 'admin_session';

// Fallback static keys only used if Supabase is not configured to avoid downtime
const FALLBACK_API_KEYS = new Set([
  'tro_app_aurora_watcher_v1',
  'tro_demo_test_key',
  ...(process.env.NODE_ENV === 'development' ? ['dev_test_key'] : []),
]);

async function verifyApiKey(apiKey: string): Promise<VerifiedKey | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('verify_api_key', { p_key: apiKey });

  if (error) {
    console.error('[middleware] verify_api_key failed:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0] as VerifiedKey;
  return {
    organization_id: row.organization_id ?? null,
    rate_limit_tier: row.rate_limit_tier ?? null,
    rate_limit_per_hour: row.rate_limit_per_hour ?? null,
    allowed_origins: (row.allowed_origins as unknown as string[]) ?? null,
  };
}

/**
 * Middleware function - runs before API routes and admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes with JWT session validation
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    // No token - allow access (layout will show login screen)
    if (!token) {
      return NextResponse.next();
    }

    // Verify token
    try {
      await jwtVerify(token, ADMIN_JWT_SECRET);
      // Token is valid, allow access
      return NextResponse.next();
    } catch (error) {
      // Token invalid or expired - clear cookie and continue
      const response = NextResponse.next();
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }
  }

  // Protect /api/admin/* routes (except /api/admin/auth - login endpoint)
  if (pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth')) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin authentication required' },
        { status: 401 }
      );
    }

    try {
      await jwtVerify(token, ADMIN_JWT_SECRET);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired session' },
        { status: 401 }
      );
    }
  }

  // Only protect /api/aurora/* routes
  if (pathname.startsWith('/api/aurora')) {
    // Allow OPTIONS requests (CORS preflight) without authentication
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,OPTIONS,HEAD',
          'Access-Control-Allow-Headers': 'X-API-Key, Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Extract API key from header
    const apiKey = request.headers.get('X-API-Key');

    // Check if request is from same origin (browser client)
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // Allow requests from same origin (our own web app)
    const isSameOrigin =
      (origin && origin.includes(host || '')) ||
      (referer && referer.includes(host || '')) ||
      (!origin && !referer); // Server-side requests

    // Allow same-origin requests in development mode
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.next();
    }

    // In production, allow requests from our own domain (same-origin or our production URL)
    if (isSameOrigin) {
      return NextResponse.next();
    }

    // Check if API key is provided
    if (!apiKey) {
      logAuthEvent({
        path: pathname,
        success: false,
        reason: 'missing_api_key',
      });

      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'API key is required. Please provide X-API-Key header.',
          documentation: 'https://aurora.tromso.ai/docs/authentication',
        },
        { status: 401 }
      );
    }

    // Verify API key via Supabase (preferred) with fallback to static keys if Supabase is unavailable
    const verified = await verifyApiKey(apiKey);
    const apiKeyValid = verified !== null || (!supabase && FALLBACK_API_KEYS.has(apiKey));

    if (!apiKeyValid) {
      logAuthEvent({
        path: pathname,
        apiKey,
        success: false,
        reason: 'invalid_api_key',
      });

      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Invalid API key.',
          documentation: 'https://aurora.tromso.ai/docs/authentication',
        },
        { status: 403 }
      );
    }

    // Enforce allowed origins from Supabase if provided (always allow same-origin)
    const allowedOrigins = verified?.allowed_origins;
    if (
      allowedOrigins &&
      allowedOrigins.length > 0 &&
      !allowedOrigins.some((originPattern) => origin?.includes(originPattern))
    ) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Origin not allowed for this API key' },
        { status: 403 }
      );
    }

    // Log successful authentication
    logAuthEvent({
      path: pathname,
      apiKey,
      success: true,
    });

    // Check rate limit (use Supabase-provided per-hour limit when available)
    const rateLimitResult = await checkRateLimit(apiKey, verified?.rate_limit_per_hour ?? undefined);
    const tierInfo = getRateLimitInfo(apiKey, verified?.rate_limit_per_hour ?? undefined);

    // Log rate limit check
    logRateLimitEvent({
      apiKey,
      path: pathname,
      exceeded: !rateLimitResult.success,
      remaining: rateLimitResult.remaining,
      limit: rateLimitResult.limit,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit: rateLimitResult.limit,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': String(rateLimitResult.remaining),
            'X-RateLimit-Reset': String(rateLimitResult.reset),
          },
        }
      );
    }

    // Add rate limit headers to successful response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', String(rateLimitResult.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.reset));

    return response;
  }

  // For all other routes, continue without authentication
  return NextResponse.next();
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/api/admin/:path*',
    '/api/aurora/:path*',
  ],
};
