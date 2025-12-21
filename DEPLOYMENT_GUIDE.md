# 🚀 Production Deployment Guide

**Aurora.tromso.ai Backend Deployment**

Complete guide for deploying the aurora-webapp to Vercel with all required services configured.

---

## 📋 Prerequisites

Before deployment, you need accounts and API keys for:

1. ✅ **GitHub** - Code repository (already set up)
2. ⏳ **Vercel** - Hosting platform
3. ⏳ **Upstash** - Redis for rate limiting
4. ⏳ **Sentry** - Error monitoring
5. ✅ **Supabase** - Backend API (already configured)

---

## 🔧 Step 1: Set Up Upstash Redis

### Why?
Rate limiting requires a fast, distributed key-value store. Upstash provides serverless Redis that works perfectly with Vercel Edge Functions.

### Setup Steps

1. **Create Upstash Account**
   - Go to https://console.upstash.com/
   - Sign up with GitHub (recommended)

2. **Create Redis Database**
   - Click "Create Database"
   - **Name:** `aurora-webapp-ratelimit`
   - **Type:** Global (for best performance worldwide)
   - **Region:** EU-West-1 (closest to Tromsø)
   - Click "Create"

3. **Get REST API Credentials**
   - Click on your database
   - Go to "REST API" tab
   - Copy:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

4. **Save for Later**
   ```bash
   UPSTASH_REDIS_REST_URL=https://example.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AXXXXxxxxx...
   ```

**Cost:** Free tier includes 10K commands/day (plenty for our use case)

---

## 🔍 Step 2: Set Up Sentry Error Monitoring

### Why?
Production errors need to be caught and reported automatically. Sentry provides real-time error tracking with stack traces, user context, and alerting.

### Setup Steps

1. **Create Sentry Account**
   - Go to https://sentry.io/
   - Sign up with GitHub (recommended)

2. **Create New Project**
   - Click "Create Project"
   - **Platform:** Next.js
   - **Project Name:** `aurora-webapp`
   - **Team:** Your default team
   - Click "Create Project"

3. **Get DSN and Tokens**
   - After creation, you'll see the DSN
   - Copy `NEXT_PUBLIC_SENTRY_DSN`

   For source maps upload:
   - Go to Settings → Projects → aurora-webapp → Client Keys (DSN)
   - Copy the DSN

   For auth token:
   - Go to Settings → Account → API → Auth Tokens
   - Click "Create New Token"
   - **Name:** `aurora-webapp-vercel`
   - **Scopes:** `project:releases`, `project:write`
   - Copy `SENTRY_AUTH_TOKEN`

   Organization slug:
   - In URL: `sentry.io/organizations/{YOUR_ORG_SLUG}/`
   - Copy `SENTRY_ORG`

4. **Save for Later**
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
   SENTRY_ORG=your-org-slug
   SENTRY_PROJECT=aurora-webapp
   SENTRY_AUTH_TOKEN=sntrys_xxxxx...
   ```

**Cost:** Free tier includes 5K errors/month (sufficient for our traffic)

---

## ☁️ Step 3: Deploy to Vercel

### Why?
Vercel is built for Next.js, provides automatic deployments from Git, and has excellent global CDN.

### Setup Steps

1. **Create Vercel Account**
   - Go to https://vercel.com/
   - Sign up with GitHub (recommended)

2. **Import Repository**
   - Click "Add New" → "Project"
   - Select `aurora-webapp` from GitHub repos
   - Click "Import"

3. **Configure Project**

   **Framework Preset:** Next.js (auto-detected)

   **Root Directory:** `./` (default)

   **Build Command:** `npm run build` (default)

   **Output Directory:** `.next` (default)

4. **Add Environment Variables**

   Click "Environment Variables" and add ALL of these:

   ```bash
   # API Configuration
   NEXT_PUBLIC_API_URL=https://tromso.ai

   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<get-from-supabase-dashboard>

   # Tromsø AI API Key (CRITICAL - get from project admin)
   TROMSO_AI_API_KEY=<your-actual-api-key>

   # Upstash Redis (from Step 1)
   UPSTASH_REDIS_REST_URL=<from-upstash>
   UPSTASH_REDIS_REST_TOKEN=<from-upstash>

   # Sentry Error Monitoring (from Step 2)
   NEXT_PUBLIC_SENTRY_DSN=<from-sentry>
   SENTRY_ORG=<your-org-slug>
   SENTRY_PROJECT=aurora-webapp
   SENTRY_AUTH_TOKEN=<from-sentry>

   # Optional: Suppress Sentry warnings
   SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes for build to complete
   - You'll get a URL like `aurora-webapp-xyz.vercel.app`

6. **Configure Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add `aurora.tromso.ai`
   - Follow DNS configuration instructions
   - Wait for DNS propagation (5-30 minutes)

---

## ✅ Step 4: Verify Deployment

### Health Check

Test the health endpoint to verify all services are connected:

```bash
curl https://aurora-webapp-xyz.vercel.app/api/health | jq '.'
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-21T12:00:00.000Z",
  "uptime": 123.45,
  "version": "1.0.0",
  "services": {
    "api": {
      "status": "ok",
      "latency": 5
    },
    "supabase": {
      "status": "ok",
      "latency": 150
    },
    "redis": {
      "status": "ok",
      "latency": 45
    },
    "sentry": {
      "status": "ok",
      "message": "Configured"
    }
  }
}
```

**All services should show "ok" status!**

---

### Test API Endpoints

Test with iOS app API key:

```bash
# Set base URL
BASE_URL="https://aurora-webapp-xyz.vercel.app/api/aurora"

# Test current conditions
curl -H "X-API-Key: tro_app_aurora_watcher_v1" \
  "$BASE_URL/now" | jq '.score'

# Test tonight forecast
curl -H "X-API-Key: tro_app_aurora_watcher_v1" \
  "$BASE_URL/tonight" | jq '.level'

# Test hourly forecast
curl -H "X-API-Key: tro_app_aurora_watcher_v1" \
  "$BASE_URL/hourly" | jq '.hourly_forecast | length'

# Test rate limit headers
curl -I -H "X-API-Key: tro_app_aurora_watcher_v1" \
  "$BASE_URL/now" | grep -i ratelimit
```

**Expected:**
- All endpoints return 200 OK
- Data is real (not mock)
- Rate limit headers show proper limits (not Infinity)

---

### Test Authentication

```bash
# No API key - should get 401
curl "$BASE_URL/now"

# Invalid API key - should get 403
curl -H "X-API-Key: invalid_key" "$BASE_URL/now"

# Valid API key - should get 200
curl -H "X-API-Key: tro_app_aurora_watcher_v1" "$BASE_URL/now"
```

---

### Test Rate Limiting

```bash
# Make 101 requests with demo key (100/hour limit)
for i in {1..101}; do
  curl -s -H "X-API-Key: tro_demo_test_key" \
    "$BASE_URL/now" | jq -r '.error // "OK"'
done
```

**Expected:** First 100 should return "OK", #101 should return "Too Many Requests"

---

### Test CORS

```bash
curl -X OPTIONS \
  -H "Origin: https://aurora-watcher.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: X-API-Key" \
  -v \
  "$BASE_URL/now" 2>&1 | grep -i access-control
```

**Expected:** Should see CORS headers in response

---

### Test Sentry Error Reporting

Trigger a test error:

```bash
# Trigger an error by requesting non-existent endpoint
curl -H "X-API-Key: tro_app_aurora_watcher_v1" \
  "$BASE_URL/nonexistent"
```

Then check Sentry dashboard:
- Go to https://sentry.io/
- Check "Issues" tab
- You should see the error reported

---

## 📊 Step 5: Monitor Production

### Vercel Dashboard

**Deployments:**
- https://vercel.com/your-team/aurora-webapp/deployments
- Shows deployment history, logs, build times

**Analytics:**
- https://vercel.com/your-team/aurora-webapp/analytics
- Shows traffic, performance, errors

**Logs:**
- https://vercel.com/your-team/aurora-webapp/logs
- Real-time function logs

---

### Upstash Dashboard

**Redis Metrics:**
- https://console.upstash.com/redis/{database-id}
- Shows command count, latency, storage usage

**Rate Limiting Stats:**
- Monitor which API keys are hitting limits
- Track total requests per hour

---

### Sentry Dashboard

**Error Tracking:**
- https://sentry.io/organizations/{org}/issues/
- Real-time error reports with stack traces

**Performance Monitoring:**
- Track API response times
- Identify slow endpoints

**Alerts:**
- Configure email alerts for critical errors
- Set up Slack integration for team notifications

---

## 🔐 Security Checklist

### Pre-Deployment

- [x] No hardcoded API keys in code
- [x] All secrets in environment variables
- [x] .env.local in .gitignore
- [x] API key authentication enabled
- [x] Rate limiting configured
- [x] CORS configured correctly
- [x] Error monitoring set up

### Post-Deployment

- [ ] Verify health check shows "healthy"
- [ ] Test all 5 API endpoints
- [ ] Verify rate limiting works
- [ ] Verify Sentry receives errors
- [ ] Test with iOS app
- [ ] Monitor logs for 24 hours
- [ ] Set up uptime monitoring (e.g., UptimeRobot)

---

## 🚨 Troubleshooting

### "unhealthy" Status in Health Check

**Problem:** `/api/health` returns `status: "unhealthy"`

**Solutions:**

1. **Check Supabase:**
   - Verify `TROMSO_AI_API_KEY` is correct
   - Test Supabase Edge Function directly
   - Check Supabase dashboard for errors

2. **Check Redis:**
   - Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
   - Test Redis connection from Upstash console
   - Check Redis is in correct region

3. **Check Sentry:**
   - Verify `NEXT_PUBLIC_SENTRY_DSN` is correct
   - Check Sentry project is active

---

### Rate Limiting Not Working

**Problem:** Rate limits show "Infinity" in production

**Solutions:**

1. Check Upstash environment variables are set
2. Verify Redis database is active in Upstash console
3. Check Vercel logs for Redis connection errors
4. Test Redis connection with `curl`:
   ```bash
   curl https://YOUR_REDIS_URL/ping \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

### Sentry Not Receiving Errors

**Problem:** Errors not appearing in Sentry dashboard

**Solutions:**

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is correct
2. Check Sentry project is active
3. Trigger a test error manually
4. Check browser console for Sentry initialization errors
5. Verify Sentry SDK version is compatible

---

### API Returns Mock Data

**Problem:** API endpoints return mock/fallback data instead of real data

**Solutions:**

1. Check `TROMSO_AI_API_KEY` is set correctly in Vercel
2. Verify Supabase Edge Functions are running
3. Check Vercel logs for Supabase connection errors
4. Test Supabase directly:
   ```bash
   curl https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora-current \
     -H "X-API-Key: YOUR_KEY"
   ```

---

## 🔄 Continuous Deployment

### Automatic Deployments

Vercel automatically deploys on every push to `main`:

```bash
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin main

# Vercel automatically builds and deploys
# Check deployment at https://vercel.com/your-team/aurora-webapp
```

### Preview Deployments

Every pull request gets a preview URL:

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git push origin feature/new-feature

# Create PR on GitHub
# Vercel creates preview deployment
# Test at: aurora-webapp-xyz-preview.vercel.app
```

---

## 📝 Environment Variables Reference

**Complete list of all required environment variables:**

```bash
# ===== PUBLIC (exposed to browser) =====
NEXT_PUBLIC_API_URL=https://tromso.ai
NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx

# ===== SERVER-ONLY (never exposed to browser) =====
TROMSO_AI_API_KEY=<critical-backend-key>
UPSTASH_REDIS_REST_URL=https://example.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXXXxxxxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=aurora-webapp
SENTRY_AUTH_TOKEN=sntrys_xxxxx

# ===== OPTIONAL =====
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

**Where to get each value:**
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase Dashboard → Settings → API
- `TROMSO_AI_API_KEY`: Project admin (critical - do not share)
- `UPSTASH_REDIS_REST_*`: Upstash Console → Database → REST API
- `NEXT_PUBLIC_SENTRY_DSN`: Sentry Project → Settings → Client Keys
- `SENTRY_AUTH_TOKEN`: Sentry Account → API Tokens

---

## 🎯 Success Criteria

Deployment is successful when:

✅ Health check returns `status: "healthy"`
✅ All 5 API endpoints return real data (not mock)
✅ Rate limiting works (verified with 101 requests)
✅ Sentry receives and reports errors
✅ CORS allows cross-origin requests
✅ iOS app can connect and fetch data
✅ Response times are <500ms (p95)
✅ No errors in Vercel logs for 24 hours

---

## 📞 Support

**Deployment Issues:**
- Vercel Status: https://www.vercel-status.com/
- Upstash Status: https://status.upstash.com/
- Sentry Status: https://status.sentry.io/

**Documentation:**
- Vercel: https://vercel.com/docs
- Upstash: https://docs.upstash.com/
- Sentry: https://docs.sentry.io/

---

**Last Updated:** 21. desember 2025
**Version:** 1.0.0
**Status:** Ready for Production Deployment 🚀
