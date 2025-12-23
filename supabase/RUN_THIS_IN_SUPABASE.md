# 🚀 Kjør Dette i Supabase Dashboard

**Enkleste måten å sette opp databasen på - 2 minutter!**

---

## Steg 1: Åpne Supabase SQL Editor

1. Gå til: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu
2. Klikk **"SQL Editor"** i venstre sidebar
3. Klikk **"New Query"**

---

## Steg 2: Kopier og Kjør Setup-Filen

1. Åpne filen: `supabase/COMPLETE_SETUP.sql`
2. Kopier **HELE** innholdet (Cmd+A → Cmd+C)
3. Lim inn i SQL Editor (Cmd+V)
4. Klikk **"Run"** (eller trykk Cmd+Enter)

⏱️ Dette tar ~10 sekunder å kjøre.

---

## Steg 3: Verifiser at Alt Fungerer

### A) Sjekk Tabeller

Klikk **"Table Editor"** i venstre sidebar.

Du skal nå se **8 tabeller:**
- ✅ organizations
- ✅ users
- ✅ api_keys
- ✅ usage_analytics
- ✅ subscriptions
- ✅ invoices
- ✅ widget_instances
- ✅ notifications

### B) Sjekk at Seed Data Er Der

Gå til tabellen `organizations`:
- Du skal se **"Demo Organization"**

Gå til tabellen `api_keys`:
- Du skal se **2 API keys:**
  - `tro_demo_test_key`
  - `tro_app_aurora_watcher_v1`

---

## Steg 4: Test Lokalt

```bash
# I terminalen på Mac:
cd /Users/oysteinjorgensen/projects/aurora-webapp
npm run dev
```

Gå til: http://localhost:3000/admin

**Forventet resultat:**
- ✅ Ingen "Supabase not configured" warning
- ✅ Dashboard viser statistikk
- ✅ Organizations viser "Demo Organization"

---

## 🎉 Ferdig!

Database er nå klar med:
- ✅ Alle tabeller opprettet
- ✅ Indexes og constraints
- ✅ Row Level Security policies
- ✅ Demo data for testing
- ✅ Seed data for utvikling

---

## 🆘 Hvis Noe Går Galt

### "ERROR: relation already exists"

Dette betyr databasen har rester fra tidligere.

**Løsning:** COMPLETE_SETUP.sql resetter automatisk databasen i steg 1.
Bare kjør hele filen på nytt - den håndterer cleanup selv!

### "Permission denied"

Du mangler database-tilgang.

**Løsning:**
1. Gå til Settings → Database → Connection Pooling
2. Kopier databasepassordet
3. Prøv igjen

---

## 📚 Neste Steg

1. **Test API endpoints lokalt:**
   ```bash
   curl http://localhost:3000/api/organizations
   curl http://localhost:3000/api/api-keys
   ```

2. **Deploy til Vercel:**
   - Legg til Supabase env vars i Vercel dashboard
   - Redeploy

3. **Les mer:**
   - [SUPABASE_STATUS.md](../SUPABASE_STATUS.md) - Full oversikt
   - [SUPABASE_QUICKSTART.md](../SUPABASE_QUICKSTART.md) - CLI-metoden
   - [DATABASE_SCHEMA.md](../DATABASE_SCHEMA.md) - Schema-detaljer
