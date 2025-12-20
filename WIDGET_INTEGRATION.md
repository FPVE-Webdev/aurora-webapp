# Aurora Widget & Integration Plan

## Executive Summary

Dette dokumentet beskriver widget-systemet for aurora.tromso.ai, integrasjon med tromso.ai B2B SaaS-plattformen, og nødvendige tilpasninger i aurora-watcher iOS-appen.

**Mål:**
- Tilby embeddable aurora widgets til hoteller og operatører (B2B SaaS)
- Gi gratis demo-versjon for testing
- Premium features for betalende kunder
- Koble aurora-watcher iOS app mot tromso.ai API

---

## 1. Widget-system (B2B SaaS)

### 1.1 Widget-typer

#### A. Aurora Forecast Widget (Basis)
**Beskrivelse:** Kompakt nordlysprognose med KP-indeks, skydekke og sannsynlighet.

**Funksjoner:**
- Live KP-indeks med fargekodet gauge
- Skydekke fra MET.no
- Nordlyssannsynlighet (%)
- Best viewing time (time på døgnet)
- Auto-refresh hver 5. minutt

**Størrelse:** 320x240px (responsiv)

**Kodeeksempel:**
```html
<script src="https://widgets.tromso.ai/aurora-widget.js"></script>
<div id="aurora-forecast"
     data-api-key="YOUR_API_KEY"
     data-location="tromso"
     data-theme="dark"></div>
```

**Pricing:**
- Free Demo: Maks 1000 visninger/måned, "Powered by Tromsø.AI" badge
- Basic: 3500 NOK/mnd - 50K visninger, fjern badge
- Premium: 7000 NOK/mnd - Unlimited, custom branding

---

#### B. Interactive Map Widget (Premium)
**Beskrivelse:** Fullverdig interaktivt kart med 30+ observasjonssteder.

**Funksjoner:**
- Leaflet-kart med aurora oval overlay
- 30+ observation spots (Troms, Finnmark, Nordland)
- 12-timers animasjon med timeline scrubber
- Spot selector (region → location)
- Real-time oppdateringer

**Størrelse:** 100% width x 600px height (responsiv)

**Kodeeksempel:**
```html
<script src="https://widgets.tromso.ai/aurora-map.js"></script>
<div id="aurora-map"
     data-api-key="YOUR_API_KEY"
     data-default-location="tromso"
     data-show-timeline="true"
     data-theme="dark"></div>
```

**Pricing:**
- Kun Premium: 10000 NOK/mnd - Unlimited, full customization

---

#### C. AI Chat Widget (Premium+)
**Beskrivelse:** AI-assistent som svarer på nordlysspørsmål.

**Funksjoner:**
- Kontekst-bevisst chatbot
- Svar på vanlige spørsmål
- Personaliserte anbefalinger
- Rate limiting (3s mellom spørsmål)
- Multilingual (NO/EN)

**Kodeeksempel:**
```html
<script src="https://widgets.tromso.ai/aurora-chat.js"></script>
<div id="aurora-chat"
     data-api-key="YOUR_API_KEY"
     data-language="no"
     data-position="bottom-right"></div>
```

**Pricing:**
- Kun Premium+: 12000 NOK/mnd - Custom AI training, branding

---

### 1.2 Widget SDK Architecture

```
widgets/
├── sdk/
│   ├── core/
│   │   ├── api-client.ts          # API communication
│   │   ├── auth.ts                # API key validation
│   │   ├── cache.ts               # Client-side caching
│   │   └── config.ts              # Widget configuration
│   ├── widgets/
│   │   ├── aurora-forecast/
│   │   │   ├── AuroraForecast.tsx
│   │   │   ├── styles.css
│   │   │   └── index.ts
│   │   ├── aurora-map/
│   │   │   ├── AuroraMap.tsx
│   │   │   ├── MapControls.tsx
│   │   │   ├── styles.css
│   │   │   └── index.ts
│   │   └── aurora-chat/
│   │       ├── AuroraChat.tsx
│   │       ├── ChatBubble.tsx
│   │       ├── styles.css
│   │       └── index.ts
│   └── vanilla/
│       ├── aurora-widget.js       # UMD bundle (forecast)
│       ├── aurora-map.js          # UMD bundle (map)
│       └── aurora-chat.js         # UMD bundle (chat)
└── embed/
    ├── index.html                 # Widget demos
    └── examples/
```

**Build Process:**
```bash
# Vite config for UMD bundles
npm run widgets:build

# Output:
# dist/aurora-widget.js (Forecast Widget)
# dist/aurora-map.js (Map Widget)
# dist/aurora-chat.js (Chat Widget)
```

---

## 2. Free Demo vs Premium

### 2.1 Free Demo (Gratis Testing)

**Formål:** La potensielle kunder teste widgets før kjøp.

**Begrensninger:**
- Maks 1000 widget-visninger/måned
- "Powered by Tromsø.AI" badge (ikke fjernbar)
- Kun 1 location (Tromsø)
- 4-timers prognose (ikke 12t)
- Ingen custom branding
- Standard refresh rate (5 min)

**Registrering:**
```
1. Gå til tromso.ai/demo
2. Oppgi e-post og firmanavn
3. Få demo API key umiddelbart
4. Test widgets i 30 dager
```

**Demo API Key Format:**
```
tro_demo_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### 2.2 Premium (Betalt Abonnement)

**Premium Basic (3500 NOK/mnd):**
- Aurora Forecast Widget
- 50 000 visninger/måned
- Fjern "Powered by" badge
- Alle 30+ locations
- 12-timers prognose
- Custom farger/theme

**Premium Pro (7000 NOK/mnd):**
- Alt fra Basic
- Interactive Map Widget
- Unlimited visninger
- Custom branding (logo, colors)
- Priority support
- API access (REST endpoints)

**Premium Enterprise (10 000+ NOK/mnd):**
- Alt fra Pro
- AI Chat Widget
- Custom AI training (hotellets FAQ)
- Dedikert support
- SLA garantier
- White-label løsning

---

### 2.3 Feature Matrix

| Feature | Free Demo | Basic | Pro | Enterprise |
|---------|-----------|-------|-----|------------|
| Forecast Widget | ✅ | ✅ | ✅ | ✅ |
| Map Widget | ❌ | ❌ | ✅ | ✅ |
| AI Chat Widget | ❌ | ❌ | ❌ | ✅ |
| Visninger/måned | 1K | 50K | Unlimited | Unlimited |
| Locations | 1 (Tromsø) | 30+ | 30+ | 30+ + Custom |
| Prognose | 4t | 12t | 12t | 12t + 7-day |
| Branding | Badge | Fjern badge | Custom | White-label |
| Support | Community | Email | Priority | Dedikert |
| API Access | ❌ | ❌ | ✅ | ✅ |
| Pris | Gratis | 3500 NOK/mnd | 7000 NOK/mnd | Custom |

---

## 3. Aurora-Watcher iOS App Tilpasninger

### 3.1 Current State (Standalone)

**Nåværende arkitektur:**
```
aurora-watcher/
├── src/
│   ├── services/
│   │   ├── TromsoAIService.ts      # Direct API calls
│   │   ├── WeatherService.ts       # MET.no integration
│   │   └── NOAAService.ts          # NOAA KP data
│   └── hooks/
│       ├── useAuroraData.ts        # Local caching
│       └── useAuroraLive.ts        # Live oval
```

**Problem:**
- Hardcoded API URLs
- Ingen API key authentication
- Lokal caching (ikke sentralisert)
- Ingen usage tracking

---

### 3.2 Målarkitektur (Tromso.AI Integration)

**Ny arkitektur:**
```
aurora-watcher/
├── src/
│   ├── config/
│   │   └── api.config.ts           # NEW: Centralized API config
│   ├── services/
│   │   ├── TromsoAIClient.ts       # NEW: Unified API client
│   │   ├── AuthService.ts          # NEW: API key management
│   │   └── CacheService.ts         # NEW: Optimized caching
│   └── hooks/
│       ├── useAuroraData.ts        # UPDATED: Use TromsoAIClient
│       └── useAuroraLive.ts        # UPDATED: Use TromsoAIClient
```

---

### 3.3 Nødvendige Endringer

#### A. API Configuration (api.config.ts)
```typescript
// src/config/api.config.ts
export const API_CONFIG = {
  baseURL: 'https://tromso.ai',
  endpoints: {
    aurora: {
      now: '/api/aurora/now',
      tonight: '/api/aurora/tonight',
      forecast: '/api/aurora/forecast',
      hourly: '/api/aurora/hourly-forecast',
      oval: '/api/aurora/aurora-oval',
    },
    chat: '/api/chat',
    trips: '/api/trip',
  },
  // App-specific API key (free tier for aurora-watcher users)
  apiKey: process.env.TROMSO_AI_API_KEY || 'tro_app_default_key',
  caching: {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxAge: 10 * 60 * 1000, // 10 minutes
  },
};
```

---

#### B. Unified API Client (TromsoAIClient.ts)
```typescript
// src/services/TromsoAIClient.ts
import { API_CONFIG } from '@/config/api.config';

class TromsoAIClient {
  private baseURL: string;
  private apiKey: string;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.apiKey = API_CONFIG.apiKey;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      ...options?.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Aurora endpoints
  async getAuroraNow(language: 'no' | 'en' = 'no') {
    return this.request(`${API_CONFIG.endpoints.aurora.now}?lang=${language}`);
  }

  async getAuroraTonight(language: 'no' | 'en' = 'no') {
    return this.request(`${API_CONFIG.endpoints.aurora.tonight}?lang=${language}`);
  }

  async getAuroraForecast(days: number = 3, language: 'no' | 'en' = 'no') {
    return this.request(
      `${API_CONFIG.endpoints.aurora.forecast}?days=${days}&lang=${language}`
    );
  }

  async getHourlyForecast(hours: number = 12, location?: string) {
    const params = new URLSearchParams({ hours: hours.toString() });
    if (location) params.append('location', location);

    return this.request(
      `${API_CONFIG.endpoints.aurora.hourly}?${params.toString()}`
    );
  }

  async getAuroraOval(resolution: 'low' | 'medium' | 'high' = 'medium') {
    return this.request(
      `${API_CONFIG.endpoints.aurora.oval}?resolution=${resolution}`
    );
  }

  // Chat endpoint
  async sendChatMessage(message: string, language: 'no' | 'en' = 'no') {
    return this.request(API_CONFIG.endpoints.chat, {
      method: 'POST',
      body: JSON.stringify({ message, language }),
    });
  }
}

export const tromsoAIClient = new TromsoAIClient();
```

---

#### C. Update useAuroraData Hook
```typescript
// src/hooks/useAuroraData.ts (BEFORE)
import { tromsøAIService } from '@/services/TromsoAIService';

export function useAuroraData() {
  // Direct service calls
  const forecast = await tromsøAIService.getTonight(language);
  // ...
}
```

```typescript
// src/hooks/useAuroraData.ts (AFTER)
import { tromsoAIClient } from '@/services/TromsoAIClient';

export function useAuroraData() {
  // Unified client calls
  const forecast = await tromsoAIClient.getAuroraTonight(language);
  // ...
}
```

---

#### D. Environment Variables
```bash
# .env.local (aurora-watcher)
TROMSO_AI_API_KEY=tro_app_aurora_watcher_v1

# This key has:
# - Free tier access to all aurora endpoints
# - Rate limit: 1000 requests/hour per user
# - No billing (sponsored by tromso.ai)
```

---

### 3.4 Migration Checklist

**Phase 1: API Client Setup (Day 1)**
- [ ] Create `src/config/api.config.ts`
- [ ] Implement `TromsoAIClient.ts`
- [ ] Add API key to `.env.local`
- [ ] Test API connectivity

**Phase 2: Service Migration (Day 2)**
- [ ] Update `useAuroraData.ts` to use TromsoAIClient
- [ ] Update `useAuroraLive.ts` to use TromsoAIClient
- [ ] Remove old `TromsoAIService.ts`
- [ ] Remove old `WeatherService.ts` (now handled by API)
- [ ] Remove `NOAAService.ts` (now handled by API)

**Phase 3: Testing (Day 3)**
- [ ] Test all aurora data endpoints
- [ ] Test aurora oval updates
- [ ] Test caching behavior
- [ ] Test offline mode (fallback)
- [ ] Test error handling

**Phase 4: Deployment (Day 4)**
- [ ] Build iOS app with new API client
- [ ] Submit to App Store review
- [ ] Monitor API usage
- [ ] Verify no breaking changes

---

### 3.5 Breaking Changes & Migration Path

**Breaking Changes:**
1. API URL endret fra direkte NOAA/MET.no til tromso.ai proxy
2. Response format standardisert (alle responses wrappet i `{ success, data, error }`)
3. Caching nå server-side (5 min TTL)

**Migration Path for Users:**
- Ingen endringer nødvendig for sluttbrukere
- App vil automatisk bruke nye API-endepunkter
- Eksisterende cache vil bli invalidert ved første oppstart
- Gradvis utrulling via App Store

---

## 4. Widget Implementation Plan

### 4.1 Widget SDK Development (Week 1-2)

**Dag 1-3: Core SDK**
```typescript
// widgets/sdk/core/widget-base.ts
export abstract class WidgetBase {
  protected container: HTMLElement;
  protected config: WidgetConfig;
  protected apiClient: APIClient;

  constructor(elementId: string, config: WidgetConfig) {
    this.container = document.getElementById(elementId)!;
    this.config = config;
    this.apiClient = new APIClient(config.apiKey);
  }

  abstract render(): void;
  abstract destroy(): void;
}
```

**Dag 4-7: Aurora Forecast Widget**
- Implement `AuroraForecast.tsx`
- Add CSS styling (embedded)
- Build UMD bundle
- Test embedding on demo site

**Dag 8-10: Aurora Map Widget**
- Implement `AuroraMap.tsx`
- Integrate Leaflet
- Add timeline scrubber
- Build UMD bundle

**Dag 11-14: Aurora Chat Widget**
- Implement `AuroraChat.tsx`
- Add chat UI
- Connect to `/api/chat` endpoint
- Build UMD bundle

---

### 4.2 Widget Hosting & CDN

**CDN Structure:**
```
https://widgets.tromso.ai/
├── aurora-widget.js         # Forecast widget (v1.0.0)
├── aurora-map.js            # Map widget (v1.0.0)
├── aurora-chat.js           # Chat widget (v1.0.0)
├── aurora-widget.min.js     # Minified versions
├── aurora-map.min.js
├── aurora-chat.min.js
└── versions/
    ├── v1.0.0/
    ├── v1.1.0/
    └── latest/              # Symlink to latest stable
```

**Hosting:** Vercel Edge Network (automatic CDN distribution)

---

### 4.3 Customer Onboarding Flow

```
1. Customer visits tromso.ai
   └─> Clicks "Start Free Demo"

2. Fills out form:
   - Business name
   - Email
   - Website URL
   - Use case (hotel/operator/tour)

3. Receives demo API key instantly via email

4. Gets documentation:
   - Quick start guide
   - Widget code snippets
   - Customization options

5. Embeds widget on their site:
   <script src="https://widgets.tromso.ai/aurora-widget.js"></script>
   <div id="aurora-forecast" data-api-key="tro_demo_xxx"></div>

6. After 30 days or 1K views:
   - Upgrade prompt
   - Stripe checkout
   - Get production API key
```

---

## 5. API Endpoints for Widgets

### 5.1 Widget-Specific Endpoints

**GET `/api/widget/aurora/forecast`**
```typescript
// Query params:
?apiKey=tro_xxx
&location=tromso
&hours=12
&theme=dark

// Response:
{
  success: true,
  data: {
    currentProbability: 75,
    kpIndex: 5.2,
    weather: {
      cloudCoverage: 20,
      temperature: -5,
      windSpeed: 3
    },
    hourlyForecast: [...],
    bestViewingTime: "23:00"
  }
}
```

**GET `/api/widget/aurora/map-data`**
```typescript
// Query params:
?apiKey=tro_xxx
&spots=all
&hours=12

// Response:
{
  success: true,
  data: {
    spots: [...],
    auroraOval: [...coordinates],
    currentKp: 5.2
  }
}
```

---

### 5.2 Rate Limiting

| Tier | Requests/hour | Concurrent | Cache TTL |
|------|---------------|------------|-----------|
| Demo | 100 | 5 | 10 min |
| Basic | 1000 | 20 | 5 min |
| Pro | 5000 | 50 | 5 min |
| Enterprise | Unlimited | Unlimited | Custom |

---

## 6. Monitoring & Analytics

### 6.1 Widget Usage Tracking

**Metrics to Track:**
- Widget loads per customer
- API calls per endpoint
- Average response time
- Error rates
- Geographic distribution
- Peak usage times

**Implementation:**
```typescript
// Automatic tracking in widget SDK
class APIClient {
  async request(endpoint, options) {
    // Track request
    await fetch('https://tromso.ai/api/analytics/track', {
      method: 'POST',
      headers: { 'X-API-Key': this.apiKey },
      body: JSON.stringify({
        event: 'widget_request',
        endpoint,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      }),
    });

    // Make actual request
    return fetch(endpoint, options);
  }
}
```

---

### 6.2 Customer Dashboard

**URL:** https://tromso.ai/dashboard

**Features:**
- Real-time usage statistics
- API key management
- Billing & invoices
- Widget customization
- Support tickets

---

## 7. Pricing & Business Model

### 7.1 Pricing Strategy

**Free Demo:**
- Purpose: Lead generation
- Conversion rate target: 20%
- Average time to conversion: 14 days

**Paid Tiers:**
- Basic: 3500 NOK/mnd (~350 EUR/mnd)
- Pro: 7000 NOK/mnd (~700 EUR/mnd)
- Enterprise: Custom (10K+ NOK/mnd)

**Target Market:**
- 50-100 hotels in Northern Norway
- 20-30 tour operators
- 10-15 DMOs (Destination Management Organizations)

**Revenue Projection (Year 1):**
- 30 Basic customers: 30 × 3500 × 12 = 1,260,000 NOK
- 10 Pro customers: 10 × 7000 × 12 = 840,000 NOK
- 5 Enterprise: 5 × 12000 × 12 = 720,000 NOK
- **Total ARR: ~2.8M NOK**

---

## 8. Implementation Timeline

### Week 1-2: Widget SDK
- Core SDK architecture
- Aurora Forecast Widget
- Build system (Vite UMD)

### Week 3: Customer Portal
- Dashboard UI
- API key management
- Usage tracking

### Week 4: Billing
- Stripe integration
- Subscription management
- Invoicing

### Week 5-6: Advanced Widgets
- Aurora Map Widget
- AI Chat Widget
- Customization options

### Week 7: Testing & Launch
- Beta testing (5 customers)
- Bug fixes
- Public launch

**Total:** 7 weeks to MVP

---

## 9. Technical Requirements

### 9.1 Widget SDK Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "leaflet": "^1.9.4",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "typescript": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```

### 9.2 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### 9.3 Bundle Sizes

| Widget | Gzipped | Raw |
|--------|---------|-----|
| Forecast | 15 KB | 45 KB |
| Map | 85 KB | 250 KB |
| Chat | 20 KB | 60 KB |

---

## 10. Security Considerations

### 10.1 API Key Security

**Best Practices:**
- API keys are domain-restricted
- Keys can be rotated via dashboard
- Keys expire after 365 days (auto-renewal)
- Rate limiting per key

**Domain Restriction Example:**
```typescript
// API validates request origin
if (!allowedDomains.includes(request.origin)) {
  return { error: 'Unauthorized domain' };
}
```

### 10.2 Data Privacy

- No personal data stored in widgets
- GDPR compliant
- Cookie-less tracking
- Anonymous usage metrics

---

## 11. Support & Documentation

### 11.1 Documentation Structure

```
docs.tromso.ai/
├── Getting Started
│   ├── Quick Start Guide
│   ├── Widget Installation
│   └── API Key Setup
├── Widgets
│   ├── Aurora Forecast Widget
│   ├── Aurora Map Widget
│   └── Aurora Chat Widget
├── Customization
│   ├── Themes & Styling
│   ├── Localization
│   └── Advanced Options
├── API Reference
│   ├── Endpoints
│   ├── Authentication
│   └── Rate Limits
└── Troubleshooting
    ├── Common Issues
    ├── Browser Support
    └── Contact Support
```

### 11.2 Support Channels

- Email: support@tromso.ai
- Documentation: docs.tromso.ai
- Community: Discord server
- Enterprise: Dedicated Slack channel

---

## 12. Success Metrics

### 12.1 KPIs

**Business Metrics:**
- Monthly Recurring Revenue (MRR)
- Customer Acquisition Cost (CAC)
- Customer Lifetime Value (LTV)
- Churn Rate

**Technical Metrics:**
- Widget load time (<2s)
- API response time (<200ms)
- Uptime (99.9%+)
- Error rate (<0.1%)

**Usage Metrics:**
- Daily Active Widgets (DAW)
- Average requests per widget
- Geographic distribution
- Peak usage hours

---

## 13. Next Steps

### Immediate (Week 1)
1. Set up widget SDK repository
2. Implement core SDK base classes
3. Create Aurora Forecast Widget
4. Build UMD bundle system

### Short-term (Month 1)
1. Launch widget demo site
2. Implement customer dashboard
3. Set up Stripe billing
4. Beta test with 5 customers

### Long-term (Quarter 1)
1. Launch public widget marketplace
2. Add advanced widgets (Map, Chat)
3. Integrate aurora-watcher iOS app
4. Scale to 30+ customers

---

**Document Version:** 1.0
**Last Updated:** 2025-12-20
**Author:** Claude Code + Øystein Jørgensen
**Status:** Ready for Implementation
