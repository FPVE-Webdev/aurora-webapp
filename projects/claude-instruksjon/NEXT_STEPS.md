# 🚀 Neste Steg: Fase 1-7 Implementeringsplan

**Sist oppdatert:** 21. desember 2025
**Status:** Fase 0 fullført ✅, Fase 1 pending

---

## 📊 Oversikt

| Fase | Navn | Status | Estimat | Prioritet |
|------|------|--------|---------|-----------|
| 0 | Kritiske Fixes | ✅ Fullført | 2-3 timer | 🔴 Kritisk |
| 1 | Security Foundation | ⏳ Pending | 1 uke | 🔴 Kritisk |
| 2 | iOS App Integration | 📋 Planlagt | 1 uke | 🔴 Kritisk |
| 3 | Multi-Tenant Backend | 📋 Planlagt | 2 uker | 🟡 Høy |
| 4 | Widget SDK | 📋 Planlagt | 2 uker | 🟡 Høy |
| 5 | Customer Portal | 📋 Planlagt | 1 uke | 🟡 Medium |
| 6 | Billing & Advanced | 📋 Planlagt | 2 uker | 🟢 Lav |
| 7 | Testing & Launch | 📋 Planlagt | 1 uke | 🟡 Medium |

**Total estimat:** 10-12 uker fra nå

---

## 🔐 FASE 1: Security Foundation (UKE 1)

**Mål:** Gjøre API-et sikkert nok for både iOS app og widgets

### Oppgaver

#### 1.1 API Key Authentication Middleware

**Fil:** `src/middleware.ts` (ny)

**Implementering:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// API keys database (temporary - move to Supabase in Phase 3)
const VALID_API_KEYS = new Set([
  'tro_app_aurora_watcher_v1',  // iOS app
  'tro_demo_xxx',                // Demo tier
  // More keys added dynamically in Phase 3
]);

export function middleware(request: NextRequest) {
  // Only protect /api/aurora/* routes
  if (request.nextUrl.pathname.startsWith('/api/aurora')) {
    const apiKey = request.headers.get('X-API-Key');

    if (!apiKey || !VALID_API_KEYS.has(apiKey)) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid API key' },
        { status: 401 }
      );
    }

    // Log request
    console.log(`[API] ${apiKey} → ${request.nextUrl.pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/aurora/:path*',
};
```

**Test:**
```bash
curl -H "X-API-Key: tro_app_aurora_watcher_v1" http://localhost:3000/api/aurora/now
# Should work

curl http://localhost:3000/api/aurora/now
# Should return 401
```

**Estimat:** 4 timer

---

#### 1.2 CORS Configuration

**Fil:** `vercel.json` (ny)

**Implementering:**
```json
{
  "headers": [
    {
      "source": "/api/aurora/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-API-Key, Content-Type"
        },
        {
          "key": "Access-Control-Max-Age",
          "value": "86400"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/health"
    }
  ]
}
```

**For production (stricter):**
```json
{
  "headers": [
    {
      "source": "/api/aurora/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://aurora-watcher.app,https://*.tromso.ai"
        }
      ]
    }
  ]
}
```

**Test:**
```bash
curl -H "Origin: https://aurora-watcher.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     http://localhost:3000/api/aurora/now
# Should return CORS headers
```

**Estimat:** 2 timer

---

#### 1.3 Rate Limiting

**Installasjon:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Fil:** `src/lib/rateLimiter.ts` (ny)

**Implementering:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limits per tier
export const rateLimiters = {
  demo: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 req/hour
    analytics: true,
  }),

  ios_app: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10000, '1 h'), // 10K req/hour
    analytics: true,
  }),

  basic: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'), // 1K req/hour
    analytics: true,
  }),

  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5000, '1 h'), // 5K req/hour
    analytics: true,
  }),
};

export async function checkRateLimit(apiKey: string) {
  // Determine tier based on API key prefix
  let limiter = rateLimiters.demo;

  if (apiKey.startsWith('tro_app_')) {
    limiter = rateLimiters.ios_app;
  } else if (apiKey.startsWith('tro_basic_')) {
    limiter = rateLimiters.basic;
  } else if (apiKey.startsWith('tro_pro_')) {
    limiter = rateLimiters.pro;
  }

  const { success, limit, remaining, reset } = await limiter.limit(apiKey);

  return {
    allowed: success,
    limit,
    remaining,
    reset,
  };
}
```

**Oppdater middleware:**
```typescript
import { checkRateLimit } from '@/lib/rateLimiter';

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/aurora')) {
    const apiKey = request.headers.get('X-API-Key');

    // ... API key validation

    // Rate limiting
    const { allowed, limit, remaining, reset } = await checkRateLimit(apiKey);

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit,
          reset: new Date(reset).toISOString()
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
    }

    // Add rate limit headers to response
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  }
}
```

**Environment variables:**
```env
# .env.local
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxx
```

**Setup Upstash:**
1. Gå til https://upstash.com
2. Opprett Redis database (gratis tier)
3. Kopier REST URL og token
4. Legg til i Vercel environment variables

**Test:**
```bash
# Test rate limiting
for i in {1..150}; do
  curl -H "X-API-Key: tro_demo_xxx" http://localhost:3000/api/aurora/now
  echo "Request $i"
done
# Should start returning 429 after 100 requests
```

**Estimat:** 6 timer (inkludert Upstash setup)

---

#### 1.4 Error Monitoring med Sentry

**Installasjon:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

**Konfigurering:**

**`sentry.client.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**`sentry.server.config.ts`:**
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**Oppdater API routes:**
```typescript
// src/app/api/aurora/now/route.ts
import * as Sentry from '@sentry/nextjs';

export async function GET(request: Request) {
  try {
    // ... existing code
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        endpoint: '/api/aurora/now',
        apiKey: apiKey?.substring(0, 10) + '...', // Partial key for debugging
      },
    });

    console.error('❌ Failed to fetch:', error);
    // ... fallback
  }
}
```

**Environment variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

**Setup:**
1. Opprett konto på https://sentry.io
2. Opprett nytt Next.js prosjekt
3. Kopier DSN
4. Legg til i Vercel environment variables

**Estimat:** 3 timer

---

#### 1.5 Strukturert Logging med Pino

**Installasjon:**
```bash
npm install pino pino-pretty
```

**Fil:** `src/lib/logger.ts` (ny)

**Implementering:**
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Convenience methods
export const log = {
  info: (msg: string, data?: any) => logger.info(data, msg),
  warn: (msg: string, data?: any) => logger.warn(data, msg),
  error: (msg: string, data?: any) => logger.error(data, msg),
  debug: (msg: string, data?: any) => logger.debug(data, msg),
};
```

**Bruk i API routes:**
```typescript
import { log } from '@/lib/logger';

// BEFORE
console.log('✅ Fetched fresh data');
console.error('❌ Failed to fetch');

// AFTER
log.info('Fetched fresh aurora data', {
  endpoint: '/api/aurora/now',
  cached: false,
  responseTime: '245ms',
});

log.error('Failed to fetch from Supabase', {
  endpoint: '/api/aurora/now',
  error: error.message,
  statusCode: response.status,
});
```

**Estimat:** 2 timer

---

#### 1.6 Health Check Endpoint

**Fil:** `src/app/api/health/route.ts` (ny)

**Implementering:**
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      api: 'operational',
      supabase: await checkSupabase(),
      redis: await checkRedis(),
    },
  };

  const allHealthy = Object.values(health.services).every(s => s === 'operational');

  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
  });
}

async function checkSupabase() {
  try {
    const response = await fetch(
      'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora/now',
      { headers: { 'X-API-Key': process.env.TROMSO_AI_API_KEY! } }
    );
    return response.ok ? 'operational' : 'degraded';
  } catch {
    return 'down';
  }
}

async function checkRedis() {
  try {
    // Ping Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    await redis.ping();
    return 'operational';
  } catch {
    return 'down';
  }
}
```

**Test:**
```bash
curl http://localhost:3000/api/health
```

**Estimat:** 1 time

---

### Fase 1 Checklist

- [ ] API Key Authentication Middleware (4 timer)
- [ ] CORS Configuration (2 timer)
- [ ] Rate Limiting med Upstash (6 timer)
- [ ] Sentry Error Monitoring (3 timer)
- [ ] Pino Structured Logging (2 timer)
- [ ] Health Check Endpoint (1 time)

**Total estimat:** ~18 timer (2-3 dager)

---

## 📱 FASE 2: iOS App Integration (UKE 2)

**Mål:** Aurora-watcher iOS app kan koble til sikkert API

### 2.1 Dedikert iOS App API Key

**Generer key:**
```
tro_app_aurora_watcher_v1_[random32chars]
```

**Legg til i middleware whitelist:**
```typescript
const VALID_API_KEYS = new Set([
  'tro_app_aurora_watcher_v1_abc123...',
]);
```

**Konfigurer rate limit:**
- Limit: 10,000 requests/hour
- No domain restriction
- Tracking: Log usage for analysis

**Estimat:** 1 time

---

### 2.2 Mobile-Optimized Endpoint

**Fil:** `src/app/api/v1/mobile/current/route.ts` (ny)

**Implementering:**
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get('lat') || '69.65');
  const lon = parseFloat(searchParams.get('lon') || '18.96');
  const lang = searchParams.get('lang') || 'no';

  // Fetch aurora + weather in parallel
  const [auroraData, weatherData] = await Promise.all([
    tromsøAIService.getTonight(lang),
    weatherService.getWeather(lat, lon),
  ]);

  // Return consolidated, minimal payload
  return NextResponse.json({
    aurora: {
      score: auroraData.score,
      level: auroraData.level,
      headline: auroraData.headline,
      bestTime: auroraData.best_time,
    },
    weather: {
      cloudCoverage: weatherData.cloudCoverage,
      temperature: weatherData.temperature,
    },
    meta: {
      timestamp: new Date().toISOString(),
      cached: true,
    },
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=600',
    },
  });
}
```

**Estimat:** 3 timer

---

### 2.3 Testing med iOS App

**Tasks:**
1. Oppdater aurora-watcher `tromsoAIService.ts`:
   ```typescript
   const BASE_URL = 'https://aurora.tromso.ai/api/aurora';
   const API_KEY = 'tro_app_aurora_watcher_v1_xxx';
   ```

2. Test alle endepunkter fra iOS simulator

3. Verifiser caching fungerer

4. Test offline fallback

**Estimat:** 8 timer

---

### Fase 2 Checklist

- [ ] Generer iOS app API key (1 time)
- [ ] Mobile-optimized endpoint (3 timer)
- [ ] Update aurora-watcher app (2 timer)
- [ ] Testing med iOS simulator (6 timer)

**Total estimat:** ~12 timer (1.5 dag)

---

## 🏢 FASE 3-7: Multi-Tenant, Widgets, Portal, Billing

*Se [WIDGET_INTEGRATION.md](./WIDGET_INTEGRATION.md) for full plan*

### Fase 3: Multi-Tenant Backend (2 uker)
- Supabase database schema
- API key CRUD
- Usage tracking

### Fase 4: Widget SDK (2 uker)
- Widget base classes
- UMD bundles
- CDN hosting

### Fase 5: Customer Portal (1 uke)
- Dashboard UI
- Supabase Auth

### Fase 6: Billing (2 uker)
- Stripe integration
- Webhooks

### Fase 7: Launch (1 uke)
- Testing
- Beta customers

---

## 🎯 Umiddelbare Neste Steg (FASE 1)

**Før du starter:**
1. Les denne filen grundig
2. Sjekk at Fase 0 er commit og pushet
3. Opprett Upstash Redis database
4. Opprett Sentry prosjekt
5. Legg til environment variables i Vercel

**Start med:**
1. API Key Authentication Middleware (enklest først)
2. Health Check Endpoint (for å teste middleware)
3. CORS Configuration
4. Rate Limiting
5. Sentry
6. Pino Logging

**Estimat for Fase 1:** 2-3 dager full arbeid

---

**Lykke til med Fase 1!** 🚀
