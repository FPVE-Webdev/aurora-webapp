# 📚 Aurora-Webapp Claude Instruksjon Index

> Komplett dokumentasjonssamling for Aurora.tromso.ai prosjektet

**Sist oppdatert:** 21. desember 2025
**Versjon:** 1.0.0
**Status:** Fase 0 fullført ✅

---

## 🎯 Quick Start for New Sessions

Når du starter en ny Claude Code session, les disse filene i rekkefølge:

1. **[INDEX.md](./INDEX.md)** (denne filen) - Oversikt over alt
2. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Systemarkitektur og dataflyt
3. **[PHASE_0_COMPLETION.md](./PHASE_0_COMPLETION.md)** - Hva som er gjort så langt
4. **[NEXT_STEPS.md](./NEXT_STEPS.md)** - Hva som skal gjøres videre

---

## 📁 Dokumentoversikt

### Core Documentation

| Fil | Beskrivelse | Status | Prioritet |
|-----|-------------|--------|-----------|
| **ARCHITECTURE.md** | Systemarkitektur, API endpoints, dataflyt | ✅ Ferdig | 🔴 Kritisk |
| **WIDGET_INTEGRATION.md** | Full B2B SaaS widget-plattform plan (7 uker) | 📋 Planlagt | 🟡 Medium |
| **PRE_DEPLOY_CHECKLIST.md** | Deployment sjekkliste og requirements | ✅ Ferdig | 🟢 Lav |
| **MIGRATION_PLAN.md** | Feature migration fra tromso-ai hovedprosjekt | 📋 Planlagt | 🟡 Medium |
| **BACKEND_INTEGRATION.md** | Backend integrasjonsstrategi | 📋 Planlagt | 🟡 Medium |

### Phase Documentation

| Fil | Beskrivelse | Status |
|-----|-------------|--------|
| **PHASE_0_COMPLETION.md** | Fase 0: Kritiske fixes (mappestruktur, security) | ✅ Fullført |
| **NEXT_STEPS.md** | Fase 1-7 implementeringsplan | 📋 Pending |

---

## 🏗️ Prosjektstatus

### ✅ Fase 0: Kritiske Fixes (Fullført)

**Gjennomført 21. desember 2025**

- [x] Fikset dobbeltkapslet mappestruktur (aurora-webapp/aurora-webapp/ → root)
- [x] Fjernet hardkodede API keys fra alle route files
- [x] Laget .env.example template
- [x] Laget omfattende README.md
- [x] Verifisert production build fungerer

**Commit:** `1748d11`
**Files changed:** 20 files
**Additions:** +2324 lines

### 🔄 Neste Fase: Fase 1 - Security Foundation

**Planlagt oppstart:** Når godkjent av bruker

**Hovedoppgaver:**
1. API Key Authentication Middleware
2. CORS Configuration
3. Rate Limiting
4. Error Monitoring (Sentry)

**Estimat:** 1 uke

---

## 📊 Prosjektarkitektur (Quick Reference)

### Tech Stack
```
Frontend:  Next.js 15.5 + React 19 + TypeScript 5
Styling:   Tailwind CSS 3.4
State:     React Query (@tanstack/react-query)
Maps:      Leaflet 1.9.4
Backend:   Supabase Edge Functions
Hosting:   Vercel
```

### API Endpoints (5 total)
```
GET /api/aurora/now        - Current conditions (5 min cache)
GET /api/aurora/tonight    - Tonight's forecast (15 min cache)
GET /api/aurora/forecast   - Multi-day forecast (30 min cache)
GET /api/aurora/hourly     - Hourly timeline (15 min cache)
GET /api/aurora/oval       - Live aurora oval (5 min cache)
```

### Environment Variables
```bash
# Required
NEXT_PUBLIC_API_URL=https://tromso.ai
TROMSO_AI_API_KEY=<your-key>

# Optional
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-key>
```

---

## 🎯 Målsetninger

### Kort sikt (Fase 1-2, Uke 1-2)
- ✅ Sikker backend for iOS app (aurora-watcher)
- ⏳ API key authentication
- ⏳ CORS konfigurert
- ⏳ Basic rate limiting

### Mellomlang sikt (Fase 3-4, Uke 3-6)
- ⏳ Multi-tenant database
- ⏳ Widget SDK implementert
- ⏳ 2-3 widgets klare for beta

### Lang sikt (Fase 5-7, Uke 7-10)
- ⏳ Customer portal
- ⏳ Stripe billing
- ⏳ Production launch med 5 beta-kunder

---

## 🔐 Sikkerhetsstatus

### ✅ Fikset i Fase 0
- Ingen hardkodede secrets i kode
- Environment-basert konfigurasjon
- .env.example dokumentasjon
- Build validation

### ⏳ Gjenstår (Fase 1)
- API key validering
- CORS headers
- Rate limiting
- Request logging
- Error monitoring

---

## 📝 Viktige Kommandoer

### Development
```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # TypeScript validation
```

### Git
```bash
git status           # Check current state
git log --oneline -5 # View recent commits
git diff             # View uncommitted changes
```

### Deployment
```bash
vercel --yes         # Deploy to Vercel
vercel --prod        # Deploy to production
```

---

## 🗂️ Filstruktur (Viktige paths)

```
aurora-webapp/
├── src/
│   ├── app/
│   │   ├── api/aurora/          # 5 API route handlers
│   │   ├── page.tsx             # Home page
│   │   ├── live/                # Live map page
│   │   └── forecast/            # Forecast page
│   ├── components/
│   │   ├── aurora/              # Aurora visualisering
│   │   ├── map/                 # Kart komponenter
│   │   └── ui/                  # Delte UI komponenter
│   ├── hooks/
│   │   ├── useAuroraData.ts     # Main data hook
│   │   └── useAuroraLive.ts     # Live oval data
│   ├── services/
│   │   └── tromsoAIService.ts   # API client
│   └── types/
│       ├── aurora.ts            # Type definitions
│       └── tromsoAI.ts          # API response types
├── projects/claude-instruksjon/ # Denne mappen!
├── .env.local                   # Environment variables (GITIGNORED)
├── .env.example                 # Template
├── README.md                    # Project documentation
└── package.json                 # Dependencies
```

---

## 🚨 Kritisk Informasjon for Nye Sessions

### DO's ✅
- Les ARCHITECTURE.md først for å forstå systemet
- Sjekk PHASE_0_COMPLETION.md for status
- Bruk .env.example som referanse for environment vars
- Test alltid med `npm run build` før commit
- Følg faseplanen i NEXT_STEPS.md

### DON'Ts ❌
- **ALDRI** hardkode API keys i kode
- **ALDRI** committe .env.local til git
- **ALDRI** endre mappestruktur uten å oppdatere dokumentasjon
- **ALDRI** deploy til production uten testing

---

## 📞 Kontakt & Support

### For spørsmål om:
- **Arkitektur:** Les ARCHITECTURE.md
- **Widget-plattform:** Les WIDGET_INTEGRATION.md
- **Deployment:** Les PRE_DEPLOY_CHECKLIST.md
- **Neste steg:** Les NEXT_STEPS.md

### Bruker
- **Navn:** Øystein Jørgensen
- **Location:** Tromsø, Norway
- **Timezone:** Europe/Oslo (CET/CEST)
- **Global Claude config:** `/Users/oysteinjorgensen/.claude/CLAUDE.md`

---

## 🔄 Versjonering

| Versjon | Dato | Endringer |
|---------|------|-----------|
| 1.0.0 | 2025-12-21 | Initial dokumentasjon etter Fase 0 |

---

## 🎓 Læringsmål for AI Assistenter

Når du jobber med dette prosjektet:

1. **Forstå konteksten:**
   - Dette er et dual-purpose prosjekt (iOS backend + B2B SaaS)
   - Security er prioritet #1
   - Følg den faserte implementeringsplanen

2. **Jobb systematisk:**
   - Fullfør én fase før du går til neste
   - Test alltid før commit
   - Dokumenter alle endringer

3. **Kommuniser tydelig:**
   - Forklar hva du gjør og hvorfor
   - Gi estimater for tidsbruk
   - Spør hvis noe er uklart

4. **Vær proaktiv:**
   - Foreslå forbedringer
   - Identifiser potensielle problemer
   - Hold oversikt over todos

---

**Built with ❤️ in Tromsø, Norway** 🇳🇴
