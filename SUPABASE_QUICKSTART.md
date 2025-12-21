# ⚡ Supabase Quick Start - 5 Minutter Setup

**Rask guide for å få Supabase opp og kjøre på 5 minutter.**

---

## ✅ Checklist

### [ ] 1. Opprett Supabase Prosjekt (2 min)

1. Gå til [supabase.com](https://supabase.com) → New Project
2. Project name: `aurora-webapp`
3. Database password: **Generer & lagre trygt**
4. Region: `West EU (Ireland)`
5. Plan: `Free` (for testing)
6. Klikk "Create new project" → vent 1-2 min

---

### [ ] 2. Kopier API Keys (1 min)

Gå til: **Settings → API** i Supabase Dashboard

**Kopier 3 verdier:**

```env
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co

# Anon public key (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service role key (⚠️ hemmelig!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### [ ] 3. Legg til i .env.local (30 sek)

```bash
cd /Users/oysteinjorgensen/projects/aurora-webapp
nano .env.local
```

**Lim inn:**
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ditt-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-anon-key-her
SUPABASE_SERVICE_ROLE_KEY=din-service-role-key-her
```

Lagre: `Ctrl+X` → `Y` → `Enter`

---

### [ ] 4. Kjør Migrations (1 min)

**Alternativ A - CLI (raskest):**
```bash
# Install CLI (kun første gang)
npm install -g supabase

# Login
supabase login

# Link prosjekt (erstatt med din project-ref)
supabase link --project-ref ditt-project-ref

# Push migrations
supabase db push
```

**Alternativ B - Manuelt:**
1. Gå til Supabase Dashboard → SQL Editor
2. Åpne hver fil i `supabase/migrations/` i rekkefølge
3. Kopier innhold → lim inn i SQL Editor → Run
4. Gjenta for alle 9 filer

---

### [ ] 5. Test Lokalt (30 sek)

```bash
# Start dev server
npm run dev

# Test endpoints
curl http://localhost:3000/api/organizations
curl http://localhost:3000/api/api-keys

# Gå til admin dashboard
open http://localhost:3000/admin
```

**Forventet:**
- ✅ Ingen "Supabase not configured" warning
- ✅ Dashboard viser statistikk (0 hvis tom)
- ✅ API returnerer 200 OK

---

## 🎉 Ferdig!

**Supabase er nå konfigurert!**

Neste steg:
- Gå til `/admin` og opprett din første organization
- Test API key generation
- Deploy til Vercel med environment variables

---

## 📖 Full Guide

For detaljert guide med troubleshooting:
→ [SUPABASE_SETUP_GUIDE.md](./SUPABASE_SETUP_GUIDE.md)

---

## 🆘 Problemer?

**"Database not configured" melding:**
```bash
# Restart dev server
npm run dev
```

**Migration errors:**
```bash
# Reset og prøv igjen
supabase db reset
supabase db push
```

**API keys virker ikke:**
- Sjekk at du kopierte **service_role** key (ikke anon)
- Verifiser URL i `.env.local` stemmer med Supabase dashboard
