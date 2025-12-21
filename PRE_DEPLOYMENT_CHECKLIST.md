# ✅ Pre-Deployment Checklist

**Before deploying aurora-webapp to production**

Quick reference checklist to ensure everything is ready for deployment.

---

## 🔐 Security

- [x] No hardcoded API keys in code
- [x] No secrets in git history
- [x] `.env.local` in `.gitignore`
- [x] `.env.example` created and up-to-date
- [x] API key authentication implemented
- [x] Rate limiting configured
- [x] CORS headers configured
- [ ] All environment variables documented
- [ ] Production API keys obtained

---

## 🔑 Services Setup

### Upstash Redis (Rate Limiting)
- [ ] Account created at https://console.upstash.com/
- [ ] Redis database created (Global, EU-West-1)
- [ ] `UPSTASH_REDIS_REST_URL` obtained
- [ ] `UPSTASH_REDIS_REST_TOKEN` obtained
- [ ] Tested connection from console

### Sentry (Error Monitoring)
- [ ] Account created at https://sentry.io/
- [ ] Project created (Next.js, name: aurora-webapp)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` obtained
- [ ] `SENTRY_ORG` slug noted
- [ ] `SENTRY_PROJECT` name confirmed
- [ ] `SENTRY_AUTH_TOKEN` created (with project:releases scope)

### Supabase (Backend API)
- [x] Supabase project exists
- [x] Edge Functions deployed
- [ ] `TROMSO_AI_API_KEY` obtained from admin
- [x] `NEXT_PUBLIC_SUPABASE_URL` confirmed
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` obtained

### Vercel (Hosting)
- [ ] Account created at https://vercel.com/
- [ ] Connected to GitHub repository
- [ ] Custom domain DNS configured (optional)

---

## 📝 Environment Variables Checklist

Create a file named `production-env-vars.txt` (DO NOT COMMIT) with:

```bash
# Public
NEXT_PUBLIC_API_URL=https://tromso.ai
NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=________
NEXT_PUBLIC_SENTRY_DSN=________

# Server-only
TROMSO_AI_API_KEY=________
UPSTASH_REDIS_REST_URL=________
UPSTASH_REDIS_REST_TOKEN=________
SENTRY_ORG=________
SENTRY_PROJECT=aurora-webapp
SENTRY_AUTH_TOKEN=________

# Optional
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

**Checklist:**
- [ ] All `________` placeholders filled in
- [ ] Values tested locally in `.env.local`
- [ ] File stored securely (password manager, not in git)
- [ ] Ready to paste into Vercel dashboard

---

## 🧪 Local Testing

### Build Verification
- [x] `npm run build` succeeds without errors
- [x] No TypeScript errors
- [x] No ESLint errors
- [x] Bundle size is reasonable (<250 kB middleware)

### Functionality Testing
- [x] All 5 API endpoints work locally
- [x] API key authentication blocks unauthenticated requests
- [x] Rate limiting works (or gracefully degrades)
- [x] CORS preflight requests handled
- [x] Health check endpoint responds
- [x] Sentry initialization works (check console)

### Test Commands
```bash
# Build
npm run build

# Start production server locally
npm start

# Test endpoints
curl -H "X-API-Key: tro_app_aurora_watcher_v1" http://localhost:3000/api/aurora/now
curl -H "X-API-Key: tro_app_aurora_watcher_v1" http://localhost:3000/api/aurora/tonight
curl http://localhost:3000/api/health
```

- [ ] All test commands executed successfully
- [ ] No errors in console
- [ ] Data structure matches documentation

---

## 📚 Documentation

### Required Files
- [x] `README.md` - Project overview and quick start
- [x] `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- [x] `PRE_DEPLOYMENT_CHECKLIST.md` - This file
- [x] `IOS_APP_INTEGRATION.md` - iOS app integration guide
- [x] `.env.example` - Environment variables template
- [x] `ARCHITECTURE.md` - System architecture
- [x] `WIDGET_INTEGRATION.md` - B2B widget platform plan

### Phase Completion Reports
- [x] `PHASE_0_COMPLETION.md` - Critical fixes
- [x] `PHASE_2_COMPLETION.md` - iOS integration
- [ ] `PHASE_3_COMPLETION.md` - Production deployment (after deploy)

---

## 🔄 Git Status

- [x] All changes committed
- [x] Working tree clean
- [x] Latest changes pushed to `main`
- [x] No uncommitted secrets
- [x] Git history clean (no leaked secrets)

**Verify:**
```bash
git status  # Should show "working tree clean"
git log --oneline -5  # Review recent commits
grep -r "tro_test_" src/  # Should return nothing
```

---

## 🚀 Deployment Readiness

### Code Quality
- [x] TypeScript strict mode enabled
- [x] No console.warn or console.error in production code
- [x] Error boundaries implemented (Sentry)
- [x] Graceful degradation for missing services
- [x] Proper HTTP status codes (401, 403, 429, 500, 503)

### Performance
- [x] API caching configured (5-30 min TTL)
- [x] Rate limiting configured (10K/hour for iOS)
- [x] Response size optimized (<10 KB JSON)
- [x] Middleware optimized (<100 KB)

### Monitoring
- [x] Health check endpoint implemented
- [x] Structured logging configured (Pino)
- [x] Error tracking configured (Sentry)
- [x] Rate limit metrics tracked (Upstash)

---

## 📱 iOS App Readiness

- [x] API endpoints documented
- [x] Swift code examples provided
- [x] Response schemas documented
- [x] Error handling guide created
- [x] Rate limiting explained
- [x] Migration checklist provided

---

## ⚠️ Critical Pre-Flight Checks

**STOP! Do not deploy until ALL of these are checked:**

### 1. Environment Variables
- [ ] `TROMSO_AI_API_KEY` is the REAL production key (not test key)
- [ ] All Upstash credentials are from production database
- [ ] Sentry DSN is from production project (not test)

### 2. API Keys in Code
```bash
# Run this command - should return NOTHING:
grep -r "tro_test_" src/ --exclude-dir=node_modules
grep -r "tro_demo_" src/ --exclude-dir=node_modules
grep -r "dev_test_key" src/ --exclude-dir=node_modules
```
- [ ] No hardcoded keys found

### 3. Rate Limiting
- [ ] Upstash Redis is in correct region (EU-West-1 for low latency)
- [ ] Rate limits match requirements:
  - iOS App: 10,000/hour ✓
  - Demo: 100/hour ✓
  - Dev: Unlimited (only in NODE_ENV=development) ✓

### 4. CORS Configuration
- [ ] `vercel.json` has correct CORS headers
- [ ] Wildcard origin (`*`) is intentional for public API
- [ ] CORS preflight (OPTIONS) bypasses authentication

### 5. Error Handling
- [ ] All API routes have try/catch blocks
- [ ] Sentry captures exceptions
- [ ] Health check returns proper status
- [ ] 4xx/5xx responses have clear error messages

---

## 🎯 Deployment Day Actions

### Before Deployment

1. **Final Code Review**
   ```bash
   git log --oneline -10
   git diff origin/main
   ```

2. **Final Local Test**
   ```bash
   npm run build
   npm start
   curl http://localhost:3000/api/health
   ```

3. **Backup Environment Variables**
   - Save `production-env-vars.txt` to password manager
   - Have values ready to paste into Vercel

### During Deployment

4. **Deploy to Vercel**
   - Import project from GitHub
   - Configure build settings
   - Add ALL environment variables
   - Click "Deploy"
   - Wait for build (2-3 minutes)

5. **Immediate Verification**
   ```bash
   # Replace with your actual Vercel URL
   BASE_URL="https://aurora-webapp-xyz.vercel.app"

   # Health check
   curl $BASE_URL/api/health | jq '.status'
   # Should return: "healthy"

   # Test API endpoint
   curl -H "X-API-Key: tro_app_aurora_watcher_v1" \
     $BASE_URL/api/aurora/now | jq '.score'
   # Should return: a number (not "Unauthorized")
   ```

### After Deployment

6. **Monitor for 30 Minutes**
   - Watch Vercel logs for errors
   - Check Sentry for incoming error reports
   - Monitor Upstash for rate limit activity

7. **Test from iOS App**
   - Update iOS app base URL to production
   - Make test requests
   - Verify data is correct
   - Check push notifications trigger

8. **Create Phase 3 Completion Report**
   ```bash
   # Document what was deployed and verification results
   ```

---

## 🚨 Rollback Plan

**If deployment fails:**

1. **Immediate Rollback in Vercel**
   - Go to Deployments tab
   - Click "..." on previous working deployment
   - Click "Promote to Production"

2. **Investigate Issues**
   - Check Vercel build logs
   - Check runtime logs
   - Verify environment variables
   - Test health check endpoint

3. **Fix and Redeploy**
   - Fix issues locally
   - Test with production environment variables
   - Commit fixes
   - Redeploy to Vercel

**Most common issues:**
- Missing environment variables → Add in Vercel dashboard
- Wrong API key → Update `TROMSO_AI_API_KEY`
- Upstash connection error → Check Redis credentials
- Sentry not working → Verify DSN is correct

---

## ✅ Final Sign-Off

**Deployment is GO when:**

- [ ] All security checks passed
- [ ] All services set up and tested
- [ ] All environment variables ready
- [ ] Local testing successful
- [ ] Documentation complete
- [ ] Git status clean
- [ ] Critical pre-flight checks passed
- [ ] Team notified of deployment
- [ ] Rollback plan understood

**Signed off by:** _________________

**Date:** _________________

**Ready to deploy:** [ ] YES  [ ] NO

---

**Last Updated:** 21. desember 2025
**Version:** 1.0.0
