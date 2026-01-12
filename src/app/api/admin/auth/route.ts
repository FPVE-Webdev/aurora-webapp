import { NextResponse } from 'next/server';
import { createAdminSession, setAdminSessionCookie } from '@/lib/admin-auth';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiter for login attempts (3 attempts per 15 minutes)
const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(3, '15 m'),
        analytics: true,
        prefix: 'ratelimit:admin-login',
      })
    : null;

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      );
    }

    // Rate limiting check (if configured)
    if (ratelimit) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown';
      const { success, limit, remaining, reset } = await ratelimit.limit(ip);

      if (!success) {
        return NextResponse.json(
          {
            error: 'Too many login attempts',
            message: 'Please try again later',
            reset: new Date(reset).toISOString(),
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': String(limit),
              'X-RateLimit-Remaining': String(remaining),
              'X-RateLimit-Reset': String(reset),
            },
          }
        );
      }
    }

    // Verify password
    if (password === adminPassword) {
      // Create JWT session
      const token = await createAdminSession();

      // Set httpOnly cookie
      await setAdminSessionCookie(token);

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Incorrect password' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
