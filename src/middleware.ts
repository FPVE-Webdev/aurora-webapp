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

// Temporary in-memory API key storage
// TODO Phase 3: Move to Supabase database
const VALID_API_KEYS = new Set([
  // iOS App - High priority, high rate limit
  'tro_app_aurora_watcher_v1',

  // Demo tier - For testing (will be generated dynamically later)
  'tro_demo_test_key',

  // Development/Testing
  ...(process.env.NODE_ENV === 'development' ? ['dev_test_key'] : []),
]);

// Admin credentials
const ADMIN_CREDENTIALS = {
  email: 'oystein@fpvexperience.no',
  password: 'fvp2025Tromso%',
};

/**
 * Middleware function - runs before API routes and admin routes
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes with basic auth
  if (pathname.startsWith('/admin')) {
    // Check for auth cookie
    const authCookie = request.cookies.get('admin-auth');

    if (!authCookie || authCookie.value !== 'authenticated') {
      // Check for Authorization header (basic auth)
      const authHeader = request.headers.get('authorization');

      if (authHeader) {
        const auth = authHeader.split(' ')[1];
        const [email, password] = Buffer.from(auth, 'base64').toString().split(':');

        if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
          // Set auth cookie and continue
          const response = NextResponse.next();
          response.cookies.set('admin-auth', 'authenticated', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 24 hours
          });
          return response;
        }
      }

      // Return 401 with WWW-Authenticate header
      return new NextResponse('Authentication required', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      });
    }

    return NextResponse.next();
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
          documentation: 'https://aurora.tromso.ai/docs/authentication'
        },
        { status: 401 }
      );
    }

    // Validate API key
    if (!VALID_API_KEYS.has(apiKey)) {
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
          documentation: 'https://aurora.tromso.ai/docs/authentication'
        },
        { status: 403 }
      );
    }

    // Log successful authentication
    logAuthEvent({
      path: pathname,
      apiKey,
      success: true,
    });

    // Check rate limit
    const rateLimitResult = await checkRateLimit(apiKey);
    const tierInfo = getRateLimitInfo(apiKey);

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
    '/admin/:path*',
    '/api/aurora/:path*',
  ],
};
