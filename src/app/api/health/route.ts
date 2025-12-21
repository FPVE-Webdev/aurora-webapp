/**
 * Health Check Endpoint
 *
 * Returns the health status of the API and its dependencies.
 * Used by monitoring tools and load balancers.
 *
 * GET /api/health
 */

import { NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    api: ServiceStatus;
    supabase: ServiceStatus;
    redis?: ServiceStatus;
    sentry?: ServiceStatus;
  };
}

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'down';
  message?: string;
  latency?: number;
}

/**
 * Check Supabase connectivity
 */
async function checkSupabase(): Promise<ServiceStatus> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.TROMSO_AI_API_KEY;

  if (!supabaseUrl || !apiKey) {
    return {
      status: 'down',
      message: 'Configuration missing',
    };
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${supabaseUrl}/functions/v1/aurora-current`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        latency,
      };
    } else {
      return {
        status: 'degraded',
        message: `HTTP ${response.status}`,
        latency,
      };
    }
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Upstash Redis connectivity
 */
async function checkRedis(): Promise<ServiceStatus> {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    return {
      status: 'down',
      message: 'Configuration missing',
    };
  }

  try {
    const startTime = Date.now();
    const response = await fetch(`${redisUrl}/ping`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${redisToken}`,
      },
      signal: AbortSignal.timeout(3000), // 3s timeout
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'ok',
        latency,
      };
    } else {
      return {
        status: 'degraded',
        message: `HTTP ${response.status}`,
        latency,
      };
    }
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Sentry configuration
 */
function checkSentry(): ServiceStatus {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    return {
      status: 'down',
      message: 'Configuration missing',
    };
  }

  return {
    status: 'ok',
    message: 'Configured',
  };
}

/**
 * GET /api/health
 *
 * Returns health status of the API and all dependencies.
 */
export async function GET() {
  const startTime = Date.now();

  // Check all services in parallel
  const [supabase, redis] = await Promise.all([checkSupabase(), checkRedis()]);

  const sentry = checkSentry();

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Critical services (must be OK)
  if (supabase.status === 'down') {
    overallStatus = 'unhealthy';
  }

  // Optional services (degraded if down)
  if (redis.status === 'down' || sentry.status === 'down') {
    if (overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime ? process.uptime() : 0,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      api: {
        status: 'ok',
        latency: Date.now() - startTime,
      },
      supabase,
      redis,
      sentry,
    },
  };

  // Return appropriate HTTP status code
  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthStatus, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'Content-Type': 'application/json',
    },
  });
}
