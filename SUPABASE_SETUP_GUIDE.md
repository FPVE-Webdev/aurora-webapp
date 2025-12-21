# 🗄️ Supabase Setup Guide - Aurora WebApp B2B Platform

Komplett guide for å sette opp Supabase-database for B2B multi-tenant funksjoner.

---

## 📋 Innhold

1. [Forutsetninger](#forutsetninger)
2. [Steg 1: Opprett Supabase Prosjekt](#steg-1-opprett-supabase-prosjekt)
3. [Steg 2: Hent API Nøkler](#steg-2-hent-api-nøkler)
4. [Steg 3: Konfigurer Environment Variables](#steg-3-konfigurer-environment-variables)
5. [Steg 4: Kjør Database Migrations](#steg-4-kjør-database-migrations)
6. [Steg 5: Verifiser Oppsettet](#steg-5-verifiser-oppsettet)
7. [Troubleshooting](#troubleshooting)

---

## Forutsetninger

- Node.js 20.x eller høyere installert
- Git installert
- Gratis eller betalt Supabase-konto ([supabase.com](https://supabase.com))

---

## Steg 1: Opprett Supabase Prosjekt

### 1.1 Gå til Supabase Dashboard

1. Besøk [https://supabase.com](https://supabase.com)
2. Klikk "Start your project" eller "Sign in" hvis du allerede har konto
3. Logg inn med GitHub, Google eller email

### 1.2 Opprett Nytt Prosjekt

1. Klikk på "New Project" i dashboard
2. Velg organisation (eller opprett ny)
3. Fyll inn prosjektdetaljer:
   - **Project Name:** `aurora-webapp` (eller ønsket navn)
   - **Database Password:** Generer et sterkt passord (lagre dette trygt!)
   - **Region:** `West EU (Ireland)` eller nærmeste region til Tromsø
   - **Pricing Plan:** Velg "Free" for testing eller "Pro" for produksjon

4. Klikk "Create new project"
5. Vent 1-2 minutter mens prosjektet provisjoneres

### 1.3 Noter Project Reference ID

Når prosjektet er klart:
- Du vil se en URL som `https://[project-ref].supabase.co`
- **Project Ref ID** er delen før `.supabase.co`
- **Eksempel:** Hvis URL er `https://byvcabgcjkykwptzmwsl.supabase.co`, er project ref `byvcabgcjkykwptzmwsl`

---

## Steg 2: Hent API Nøkler

### 2.1 Naviger til Settings

1. I Supabase dashboard, klikk på ditt prosjekt
2. Gå til "Settings" (tannhjul-ikon i venstre sidebar)
3. Klikk på "API" under "Project Settings"

### 2.2 Kopier Nøklene

Du trenger **3 verdier**:

#### A) Project URL
```
Location: Settings → API → Configuration → Project URL
Example: https://byvcabgcjkykwptzmwsl.supabase.co
```
**Lagre denne som:** `NEXT_PUBLIC_SUPABASE_URL`

#### B) Anon Public Key
```
Location: Settings → API → Project API keys → anon public
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**Lagre denne som:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### C) Service Role Key (⚠️ Hemmelig!)
```
Location: Settings → API → Project API keys → service_role
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
**⚠️ VIKTIG:** Denne nøkkelen har **full database-tilgang** - del den ALDRI offentlig!

**Lagre denne som:** `SUPABASE_SERVICE_ROLE_KEY`

---

## Steg 3: Konfigurer Environment Variables

### 3.1 Lokal Utvikling (.env.local)

1. Åpne prosjektet i terminal:
   ```bash
   cd /Users/oysteinjorgensen/projects/aurora-webapp
   ```

2. Åpne `.env.local` i editor:
   ```bash
   nano .env.local
   ```

3. Legg til Supabase-konfigurasjon:
   ```env
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=https://byvcabgcjkykwptzmwsl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNhYmdjamd5a3dwdHptd3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3OTU2MTIsImV4cCI6MjA1MDM3MTYxMn0.XXXXX
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5dmNhYmdjamd5a3dwdHptd3NsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc5NTYxMiwiZXhwIjoyMDUwMzcxNjEyfQ.XXXXX
   ```

4. Erstatt verdiene med dine egne nøkler fra Steg 2
5. Lagre filen (Ctrl+X, deretter Y, deretter Enter i nano)

### 3.2 Produksjon (Vercel)

Når du skal deploye til produksjon:

1. Gå til [vercel.com](https://vercel.com)
2. Velg ditt prosjekt (aurora-webapp)
3. Gå til "Settings" → "Environment Variables"
4. Legg til de samme 3 variablene:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

5. Velg environment: "Production", "Preview", og "Development"
6. Klikk "Save"
7. Redeploy prosjektet for å aktivere

---

## Steg 4: Kjør Database Migrations

Du har **2 alternativer** for å kjøre migrations:

### Alternativ A: Supabase CLI (Anbefalt)

#### 4.1 Installer Supabase CLI

```bash
npm install -g supabase
```

Eller med Homebrew (macOS):
```bash
brew install supabase/tap/supabase
```

#### 4.2 Login til Supabase

```bash
supabase login
```

Dette åpner en browser - godkjenn tilgang.

#### 4.3 Link til Prosjektet

```bash
cd /Users/oysteinjorgensen/projects/aurora-webapp
supabase link --project-ref byvcabgcjkykwptzmwsl
```

Erstatt `byvcabgcjkykwptzmwsl` med din project ref fra Steg 1.3.

Du vil bli bedt om database-passord - bruk passordet fra Steg 1.2.

#### 4.4 Push Migrations til Database

```bash
supabase db push
```

Dette kjører alle migrations i `supabase/migrations/` i riktig rekkefølge.

**Forventet output:**
```
Applying migration 20251221_001_create_organizations.sql...
Applying migration 20251221_002_create_users.sql...
Applying migration 20251221_003_create_api_keys.sql...
...
All migrations applied successfully!
```

---

### Alternativ B: Manuell SQL (Supabase Dashboard)

Hvis du ikke kan bruke CLI:

#### 4.1 Åpne SQL Editor

1. Gå til Supabase Dashboard
2. Velg ditt prosjekt
3. Klikk "SQL Editor" i venstre sidebar

#### 4.2 Kjør Migrations i Rekkefølge

Kjør hver fil **i denne rekkefølgen**:

1. **Organizations** (`20251221_001_create_organizations.sql`)
   - Åpne filen i VS Code eller editor
   - Kopier hele innholdet
   - Lim inn i SQL Editor
   - Klikk "Run" (Ctrl/Cmd + Enter)
   - Vent på "Success" melding

2. **Users** (`20251221_002_create_users.sql`)
   - Gjenta prosessen

3. **API Keys** (`20251221_003_create_api_keys.sql`)

4. **Usage Analytics** (`20251221_004_create_usage_analytics.sql`)

5. **Subscriptions** (`20251221_005_create_subscriptions.sql`)

6. **Invoices** (`20251221_006_create_invoices.sql`)

7. **Widget Instances** (`20251221_007_create_widget_instances.sql`)

8. **Notifications** (`20251221_008_create_notifications.sql`)

9. **Seed Data** (`20251221_009_seed_data.sql`)
   - Dette legger inn test-data for utvikling

**⚠️ VIKTIG:** Kjør migrations i denne rekkefølgen! De har avhengigheter mellom seg.

---

## Steg 5: Verifiser Oppsettet

### 5.1 Sjekk Tabeller i Supabase

1. Gå til "Table Editor" i Supabase Dashboard
2. Du skal nå se følgende tabeller:
   - ✅ `organizations`
   - ✅ `users`
   - ✅ `api_keys`
   - ✅ `usage_analytics`
   - ✅ `subscriptions`
   - ✅ `invoices`
   - ✅ `widget_instances`
   - ✅ `notifications`

### 5.2 Test Lokalt

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Gå til admin dashboard:
   ```
   http://localhost:3000/admin
   ```

3. **Forventet resultat:**
   - Ingen "Supabase not configured" advarsel
   - Dashboard viser statistikk (selv om 0 hvis tom database)
   - Organisations-siden viser tom liste med "Create Organization" knapp

4. Test API endpoints:
   ```bash
   # Organizations
   curl http://localhost:3000/api/organizations

   # API Keys
   curl http://localhost:3000/api/api-keys

   # Analytics
   curl http://localhost:3000/api/analytics
   ```

   **Forventet:** HTTP 200 med JSON array (kan være tom `[]`)

### 5.3 Test Seed Data (hvis kjørt)

Hvis du kjørte `20251221_009_seed_data.sql`:

1. Gå til `/admin/organizations`
2. Du skal se 2 test-organisasjoner:
   - **Tromsø Tours AS** (premium tier)
   - **Arctic Adventures** (basic tier)

3. Gå til `/admin/api-keys`
4. Du skal se 3 test API keys

---

## 🎉 Ferdig!

Supabase er nå konfigurert! Du kan nå:

- ✅ Opprette organisasjoner via admin dashboard
- ✅ Generere API keys
- ✅ Spore usage analytics
- ✅ Administrere subscriptions

---

## Troubleshooting

### Problem: "Database not configured" i admin dashboard

**Årsak:** Environment variables er ikke lastet

**Løsning:**
```bash
# Restart dev server
npm run dev
```

Eller sjekk at `.env.local` inneholder riktige verdier.

---

### Problem: "Invalid API key" eller "Authentication failed"

**Årsak:** Feil API keys eller manglende konfigurasjon

**Løsning:**

1. Gå til Supabase Dashboard → Settings → API
2. Verifiser at du kopierte **service_role** key (ikke anon key)
3. Sjekk at NEXT_PUBLIC_SUPABASE_URL stemmer med Project URL

---

### Problem: Migration feilet med "relation already exists"

**Årsak:** Migration har allerede blitt kjørt

**Løsning:**

**Metode 1 - Reset database (⚠️ sletter all data):**
```bash
supabase db reset
```

**Metode 2 - Manuell cleanup:**
1. Gå til SQL Editor i Supabase
2. Kjør:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```
3. Kjør migrations på nytt

---

### Problem: RLS (Row Level Security) errors

**Årsak:** Supabase har Row Level Security aktivert som standard

**Løsning:**

Migrations har allerede deaktivert RLS for admin-operasjoner, men hvis du får problemer:

1. Gå til "Authentication" → "Policies" i Supabase
2. For hver tabell, klikk "New Policy"
3. Velg template: "Enable read access for all users"
4. Eller kjør i SQL Editor:
   ```sql
   ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Service role has full access" ON organizations
   FOR ALL USING (true);
   ```

---

### Problem: "Too many connections" error

**Årsak:** Free tier har begrenset antall connections

**Løsning:**

1. Upgrade til Pro plan ($25/måned) for flere connections
2. Eller implementer connection pooling (allerede gjort i `src/lib/supabase.ts`)

---

### Problem: Seed data vises ikke

**Årsak:** Seed-migration (`20251221_009_seed_data.sql`) ble ikke kjørt

**Løsning:**

Kjør seed-filen manuelt:
```bash
supabase db push --include-seed
```

Eller i SQL Editor:
1. Åpne `supabase/migrations/20251221_009_seed_data.sql`
2. Kopier og kjør innholdet

---

## 📚 Neste Steg

Etter Supabase er satt opp:

1. **Deploy til Vercel:**
   - Legg til environment variables i Vercel
   - Redeploy prosjektet

2. **Integrer Stripe (fremtidig):**
   - For betalingshåndtering av subscriptions

3. **Sett opp Email-varsling (fremtidig):**
   - Via Supabase Edge Functions eller SendGrid

4. **Implementer Admin Dashboard Frontend:**
   - CRUD-operasjoner for organizations
   - API key generering
   - Usage analytics visualisering

---

## 🔗 Nyttige Lenker

- **Supabase Docs:** https://supabase.com/docs
- **Supabase CLI Docs:** https://supabase.com/docs/guides/cli
- **Aurora WebApp Repo:** https://github.com/FPVE-Webdev/aurora-webapp
- **Deployment Guide:** [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)

---

**Lykke til! 🚀**

*Hvis du støter på problemer som ikke er dekket her, sjekk Supabase Discord eller dokumentasjon.*
