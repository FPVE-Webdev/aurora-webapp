# ⚡ Quick Reference - Aurora-Webapp

> Rask referanse for vanlige kommandoer og informasjon

---

## 🚀 Vanlige Kommandoer

### Development
```bash
npm run dev              # Start dev server på :3000
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # TypeScript check
```

### Git
```bash
git status               # Sjekk status
git log --oneline -10    # Siste 10 commits
git diff                 # Se endringer
git add -A               # Stage alle endringer
git commit -m "msg"      # Commit
git push origin main     # Push til remote
```

### Deployment
```bash
vercel --yes             # Deploy til Vercel
vercel --prod            # Deploy til production
vercel logs              # Se logs
```

---

## 📁 Viktige Paths

```
src/app/api/aurora/           # API routes (5 endpoints)
src/components/aurora/        # Aurora komponenter
src/hooks/useAuroraData.ts    # Main data hook
src/services/tromsoAIService.ts  # API client
projects/claude-instruksjon/  # Denne mappen!
```

---

## 🔑 Environment Variables

```env
# Required
NEXT_PUBLIC_API_URL=https://tromso.ai
TROMSO_AI_API_KEY=<key>

# Optional
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

---

## 🔌 API Endpoints

```
GET /api/aurora/now        # 5 min cache
GET /api/aurora/tonight    # 15 min cache
GET /api/aurora/forecast   # 30 min cache
GET /api/aurora/hourly     # 15 min cache
GET /api/aurora/oval       # 5 min cache
```

**Test lokalt:**
```bash
curl http://localhost:3000/api/aurora/now?lang=no
```

---

## 📊 Prosjektstatus

**Fase 0:** ✅ Fullført (21. des 2025)
**Fase 1:** ⏳ Pending (Security Foundation)

**Siste commit:** `1748d11`
**Branch:** `main`

---

## 🎯 Neste Oppgaver (Fase 1)

1. API Key Authentication Middleware
2. CORS Configuration
3. Rate Limiting (Upstash)
4. Error Monitoring (Sentry)
5. Structured Logging (Pino)
6. Health Check Endpoint

**Estimat:** 2-3 dager

---

## 🔧 Feilsøking

### Build feil
```bash
rm -rf .next
npm run build
```

### TypeScript errors
```bash
npx tsc --noEmit
```

### Dependency issues
```bash
rm -rf node_modules package-lock.json
npm install
```

### API key ikke funker
```bash
# Sjekk at .env.local eksisterer
cat .env.local

# Sjekk at variabelen er satt
echo $TROMSO_AI_API_KEY
```

---

## 📚 Dokumentasjon

| Fil | Beskrivelse |
|-----|-------------|
| [INDEX.md](./INDEX.md) | Hovedoversikt |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System arkitektur |
| [PHASE_0_COMPLETION.md](./PHASE_0_COMPLETION.md) | Hva som er gjort |
| [NEXT_STEPS.md](./NEXT_STEPS.md) | Hva som skal gjøres |
| [WIDGET_INTEGRATION.md](./WIDGET_INTEGRATION.md) | Widget plan |

---

## 🚨 Viktig å Huske

- ❌ ALDRI hardkod API keys
- ❌ ALDRI commit .env.local
- ✅ Test alltid med `npm run build` før commit
- ✅ Følg faseplanen
- ✅ Oppdater dokumentasjon

---

## 📞 Support

**Bruker:** Øystein Jørgensen
**Location:** Tromsø, Norway
**Email:** support@tromso.ai

**Global config:** `/Users/oysteinjorgensen/.claude/CLAUDE.md`
**Project config:** `/Users/oysteinjorgensen/projects/aurora-webapp/CLAUDE.md`

---

**Last updated:** 21. desember 2025
