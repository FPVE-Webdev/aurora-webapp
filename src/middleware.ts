/**
 * Next.js Middleware - API Key Authentication & Security
 *
 * This middleware runs on EVERY request to /api/aurora/* endpoints.
 * It validates API keys and will later add rate limiting.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

/**
 * Middleware function - runs before API routes
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/aurora/* routes
  if (pathname.startsWith('/api/aurora')) {
    // Extract API key from header
    const apiKey = request.headers.get('X-API-Key');

    // Check if API key is provided
    if (!apiKey) {
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
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Invalid API key.',
          documentation: 'https://aurora.tromso.ai/docs/authentication'
        },
        { status: 403 }
      );
    }

    // Log successful authentication (basic logging for now)
    console.log(`[AUTH] ✅ ${apiKey.substring(0, 15)}... → ${pathname}`);

    // Continue to API route
    return NextResponse.next();
  }

  // For all other routes, continue without authentication
  return NextResponse.next();
}

/**
 * Configure which routes this middleware should run on
 */
export const config = {
  matcher: [
    '/api/aurora/:path*',
  ],
};
