# Vercel Environment Variables Setup

## Required Environment Variables for Web Push

Du må legge til følgende environment variables i Vercel Dashboard:

### 1. Gå til Vercel Dashboard
```
https://vercel.com/your-project/settings/environment-variables
```

### 2. Legg til følgende variabler:

#### Web Push (VAPID Keys)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BL1ypo-PKcvCdj80TLEazMpCfjSSfHV-nKNVG_XiQGKGE8lZqlDUm4j-c0TqQcrnDuzohR-MCnhAvqKne1eAOi8"
```
- **Type:** Plain Text
- **Environments:** Production, Preview, Development

```
VAPID_PRIVATE_KEY="AKWEEzJcufCorAL6ZoK_1eWPfKbn9DjEp8cS3QXER9Q"
```
- **Type:** Secret (sensitive)
- **Environments:** Production, Preview, Development

#### Cron Job Security
```
CRON_SECRET="aurora-cron-secret-2026"
```
- **Type:** Secret (sensitive)
- **Environments:** Production, Preview, Development

---

## Eksisterende variabler (verifiser at disse er på plass)

✅ **NEXT_PUBLIC_SUPABASE_URL**
✅ **NEXT_PUBLIC_SUPABASE_ANON_KEY**
✅ **SUPABASE_SERVICE_ROLE_KEY**
✅ **NEXT_PUBLIC_MAPBOX_TOKEN**
✅ **ADMIN_PASSWORD**
✅ **ADMIN_JWT_SECRET**
✅ **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**
✅ **STRIPE_SECRET_KEY**
✅ **STRIPE_WEBHOOK_SECRET**
✅ **OPENAI_API_KEY**
✅ **NEXT_PUBLIC_OPENWEATHERMAP_API_KEY**
✅ **TROMSO_AI_API_KEY**

---

## Etter du har lagt til variablene:

1. **Trigger en ny deployment** (eller vent på automatic deploy fra push)
2. **Verifiser at Cron Jobs er aktive:**
   - Gå til: Project → Settings → Cron Jobs
   - Du skal se:
     - `/api/cron/collect-noaa` (kjører hver time)
     - `/api/cron/check-aurora-alerts` (kjører hvert 15. minutt)

3. **Test Web Push lokalt:**
   - Gå til `/settings`
   - Klikk "Enable Alerts"
   - Gi browser tillatelse til notifications
   - Velg "Strict" eller "Eager" mode

---

## Trinn-for-trinn i Vercel Dashboard:

1. Åpne prosjektet i Vercel
2. Klikk på **Settings** (øverst)
3. Klikk på **Environment Variables** (venstre meny)
4. For hver variabel:
   - Klikk **Add New**
   - Fyll inn **Key** (navn på variabelen)
   - Fyll inn **Value** (verdien)
   - Velg **Plain Text** eller **Secret**
   - Huk av **Production**, **Preview**, **Development**
   - Klikk **Save**

5. Når alle er lagt til, klikk **Redeploy** på siste deployment

---

## Database Migration

Husk også å kjøre database migration i Supabase:

```sql
-- Gå til Supabase Dashboard → SQL Editor
-- Kjør filen: supabase/migrations/20260117_create_push_subscriptions.sql
```

Eller bruk Supabase CLI:
```bash
supabase db push
```

---

## Verify Push Notifications

Etter deployment:

1. Besøk https://your-domain.vercel.app/settings
2. Scroll til "Smart Alerts"
3. Klikk "Enable Alerts"
4. Gi tillatelse i browser
5. Sjekk at status viser "✓ Enabled"

For å teste manuelt:
```bash
# Trigger cron job manuelt
curl -X POST https://your-domain.vercel.app/api/cron/check-aurora-alerts \
  -H "Authorization: Bearer aurora-cron-secret-2026"
```

---

## Troubleshooting

**Push ikke fungerer?**
- Sjekk browser console for errors
- Verifiser at Service Worker er registrert
- Kontroller at VAPID keys er riktig satt
- Se at notification permission er "granted"

**Cron job kjører ikke?**
- Verifiser at vercel.json er i prosjektroten
- Sjekk Vercel Dashboard → Deployments → Function Logs
- Cron jobs kjører kun i Production (ikke Preview)

**Database errors?**
- Kjør migration i Supabase
- Sjekk at push_subscriptions tabell eksisterer
- Verifiser RLS policies er aktive
