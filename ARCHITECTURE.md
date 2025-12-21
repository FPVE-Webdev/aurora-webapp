# Aurora.tromso.ai Architecture

**Dato:** 21. desember 2025  
**Versjon:** 1.0.0

---

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AURORA ECOSYSTEM                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  aurora-watcher  │────────▶│ aurora.tromso.ai │────────▶│ Supabase Edge    │
│   (iOS App)      │  HTTP   │   (Web + API)    │  HTTP   │   Functions      │
│  Capacitor/React │         │   Next.js 15     │         │   (Backend)      │
└──────────────────┘         └──────────────────┘         └──────────────────┘
                                      │                            │
                                      │                            ▼
                                      │                    ┌──────────────────┐
                                      │                    │   External APIs  │
                                      │                    │  - NOAA (KP)     │
                                      ▼                    │  - Met.no (Vær)  │
                             ┌──────────────────┐         │  - Ovation       │
                             │   Web Browsers   │         └──────────────────┘
                             │  - Chrome        │
                             │  - Safari        │
                             └──────────────────┘
```

---

## 🎯 **KRITISK: aurora.tromso.ai er BACKEND for aurora-watcher**

### Rolle
**aurora.tromso.ai** fungerer som:
1. ✅ **Web App** - Standalone web-versjon av aurora forecast
2. ✅ **API Backend** - RESTful API for aurora-watcher iOS app
3. ✅ **Widget Platform** - Embeddable widgets for B2B kunder

### API Endpoints (Production)

Base URL: `https://aurora.tromso.ai/api/aurora`

#### GET /now
Returns current aurora conditions
```json
{
  "score": 72,
  "level": "good",
  "confidence": "high",
  "kp": 6.0,
  "weather": {
    "cloudCoverage": 30,
    "temperature": 0
  },
  "location": "Tromsø"
}
```

#### GET /tonight
Returns tonight's aurora forecast
```json
{
  "score": 72,
  "level": "good",
  "best_time": "22:00-02:00",
  "hourly_forecast": [...]
}
```

#### GET /forecast?days=3
Returns multi-day forecast (premium)

#### GET /hourly-forecast?hours=24
Returns hourly forecast for timeline

#### GET /aurora-oval
Returns live NOAA aurora oval data (for map overlay)

---

## 🔄 Data Flow

### 1. aurora-watcher (iOS) → aurora.tromso.ai
```typescript
// aurora-watcher/src/services/tromsøAIService.ts
const BASE_URL = import.meta.env.DEV 
  ? '/api/aurora'  // Dev: Proxied through Vite
  : 'https://tromso.ai/api/aurora';  // Production

// NOTE: Should be 'https://aurora.tromso.ai/api/aurora' for subdomain
```

### 2. aurora.tromso.ai → Supabase Edge Functions
```typescript
// aurora-webapp/src/app/api/aurora/*/route.ts
const SUPABASE_URL = 'https://byvcabgcjkykwptzmwsl.supabase.co/functions/v1/aurora';
const API_KEY = process.env.TROMSO_AI_API_KEY;

fetch(SUPABASE_URL, {
  headers: {
    'X-API-Key': API_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
});
```

### 3. Supabase Edge Functions → External APIs
- NOAA Space Weather API (KP Index)
- Met.no Weather API (Norge)
- NOAA Ovation Model (Aurora oval)

---

## ⚠️ NÅVÆRENDE PROBLEM

### ❌ Mock Data i Produksjon
```typescript
// aurora-webapp/src/app/api/aurora/tonight/route.ts
// PROBLEM: Returnerer hardkodet mock data!
const mockForecast = {
  score: 72,
  level: 'good',
  // ... fake data
};
```

### ✅ Løsning Needed
1. **Fjern mock data**
2. **Koble til Supabase Edge Functions**
3. **Eller: Implementer egen backend-logikk**
4. **Cache responses (5-15 min)**

---

## 🔐 Authentication

### aurora-watcher → aurora.tromso.ai
- **Public endpoints** (no auth for basic forecast)
- **API Key required** for premium features (72h forecast, push notifications)

### aurora.tromso.ai → Supabase
- **X-API-Key:** `tro_test_7930ba5f5dd246ff23b94795aa65fd5c`
- **Authorization:** `Bearer {SUPABASE_ANON_KEY}`

### Supabase → External APIs
- NOAA: No auth (public)
- Met.no: No auth (public)
- Ovation: No auth (public)

---

## 📦 Deployment Architecture

### aurora.tromso.ai (Vercel)
```
Domain: aurora.tromso.ai
Platform: Vercel
Build: next build
Runtime: Node.js 20.x
Region: fra1 (Frankfurt)
```

### aurora-watcher (iOS App)
```
Platform: iOS (Capacitor)
API Target: https://aurora.tromso.ai/api/aurora
Fallback: Local mock data (offline mode)
```

---

## 🚀 Environment Variables Needed

### aurora-webapp (.env.local)
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
TROMSO_AI_API_KEY=tro_test_7930ba5f5dd246ff23b94795aa65fd5c

# APIs (optional - if bypassing Supabase)
NOAA_API_KEY=<if_needed>
MET_NO_USER_AGENT=aurora.tromso.ai/1.0

# Premium features
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<stripe_key>
STRIPE_SECRET_KEY=<stripe_secret>
```

---

## 📊 API Rate Limits & Caching

### Caching Strategy
```typescript
// Cache duration per endpoint
/api/aurora/now        → 5 minutes
/api/aurora/tonight    → 15 minutes
/api/aurora/forecast   → 30 minutes
/api/aurora-oval       → 5 minutes (live data)
```

### Why?
- NOAA updates KP index every 3 hours
- Met.no updates forecasts every 6 hours
- Reduce load on external APIs
- Faster response for users

---

## ✅ TODO: Backend Implementation

### Priority 1: Replace Mock Data
- [ ] Connect to Supabase Edge Functions
- [ ] Implement proper error handling
- [ ] Add response caching
- [ ] Test with aurora-watcher app

### Priority 2: Enhance API
- [ ] Add `/api/aurora/spots` for all observation points
- [ ] Add `/api/aurora/live` for real-time updates
- [ ] Add rate limiting (per IP/API key)

### Priority 3: Monitoring
- [ ] Add API analytics
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring

---

## 📝 API Contract

### Request Format (aurora-watcher)
```typescript
GET /api/aurora/tonight?lang=no
Headers:
  Accept: application/json
  User-Agent: aurora-watcher/1.0.1
```

### Response Format (aurora.tromso.ai)
```typescript
{
  "status": "success",
  "data": {
    "score": 72,
    "level": "good",
    // ... forecast data
  },
  "meta": {
    "timestamp": "2025-12-21T11:30:00Z",
    "cached": true,
    "cache_age": 120
  }
}
```

---

## 🔗 Related Documentation
- `CLAUDE.md` - Tromsø AI project contract
- `MIGRATION_PLAN.md` - Feature migration plan
- `WIDGET_INTEGRATION.md` - Widget embedding guide

