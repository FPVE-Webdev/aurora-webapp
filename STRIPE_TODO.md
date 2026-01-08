# ✅ Stripe TODO – Neste Steg

## 🎉 Fullført

- ✅ Stripe-kode implementert og pushet til `main`
- ✅ Test-nøkler lagt til i `.env.local`
- ✅ Stripe CLI installert
- ✅ Dokumentasjon skrevet

**Commits:**
```
2fc1213 docs: add comprehensive Stripe testing guide
371a094 feat: implement Stripe payment integration for premium purchases
```

**Deploy status:** Koden er nå på Vercel (trigger automatisk deploy)

---

## 📋 Gjør nå (lokal testing)

### 1. Logg inn på Stripe CLI

```bash
stripe login
```

Følg instruksjonene i nettleseren for å godkjenne.

---

### 2. Opprett Supabase-tabell

**Alternativ A: Via SQL Editor (anbefalt)**

1. Gå til: https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new
2. Åpne filen: `supabase/migrations/20260108_stripe_customers.sql`
3. Kopier alt innhold
4. Lim inn i SQL Editor
5. Klikk **Run** (eller Cmd+Enter)

**Alternativ B: Via Supabase CLI**

```bash
supabase link --project-ref yoooexmshwfpsrhzisgu
supabase db push
```

**Verifiser at tabellen ble opprettet:**

```sql
SELECT * FROM stripe_customers LIMIT 1;
```

---

### 3. Start webhook-lytter (terminal 1)

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

**Viktig:** La denne terminalen kjøre i bakgrunnen!

Du vil se output:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Kopier webhook secret** og oppdater `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

---

### 4. Start dev server (terminal 2)

```bash
npm run dev
```

Appen kjører på: http://localhost:3000

---

### 5. Test betaling

1. **Åpne nettleser:** http://localhost:3000
2. **Gå til premium-feature** (kart/chatbot/forecast)
3. **Klikk kjøpsknapp** (24h eller 96h)
4. **Skriv e-post:** `test@nordlystromso.no`
5. **Betal med test-kort:**
   - Kort: `4242 4242 4242 4242`
   - Utløp: `12/34`
   - CVC: `123`
6. **Verifiser:**
   - ✅ Redirect til `/payment/success`
   - ✅ Premium-features ulåst
   - ✅ Webhook mottatt (sjekk terminal 1)
   - ✅ Data lagret i Supabase

---

## 🔍 Debugging

### Problem: Webhook error
- Sjekk at `stripe listen` kjører
- Sjekk at `STRIPE_WEBHOOK_SECRET` er riktig i `.env.local`
- Restart dev server etter å ha oppdatert `.env.local`

### Problem: Database error
- Sjekk at `stripe_customers` tabell finnes i Supabase
- Sjekk at `SUPABASE_SERVICE_ROLE_KEY` er riktig

### Problem: Premium aktiveres ikke
- Sjekk DevTools → Application → Local Storage → `user_email`
- Sjekk Supabase → `stripe_customers` tabell for oppføring

---

## 🚀 Produksjon (etter lokal testing OK)

### 1. Bytt til Stripe live mode

1. Gå til: https://dashboard.stripe.com/apikeys
2. Bytt til **Live mode** (toggle øverst til høyre)
3. Kopier live keys:
   - **Publishable key:** `pk_live_...`
   - **Secret key:** `sk_live_...`

---

### 2. Sett opp produksjons-webhook

1. Gå til: https://dashboard.stripe.com/webhooks
2. Klikk **Add endpoint**
3. URL: `https://nordlystromso.no/api/payments/webhook`
4. Events: Velg:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Klikk **Add endpoint**
6. Kopier **Signing secret:** `whsec_...`

---

### 3. Legg til keys i Vercel

1. Gå til: https://vercel.com/fpve-webdev/aurora-webapp/settings/environment-variables
2. Legg til disse variablene:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Production |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` (fra produksjons-webhook) | Production |

3. **Redeploy** appen:
   - Gå til: https://vercel.com/fpve-webdev/aurora-webapp
   - Klikk **Deployments**
   - Klikk på siste deployment → **Redeploy**

---

### 4. Test i produksjon

**⚠️ VIKTIG: Bruk ekte kort (små beløp først!)**

1. Gå til: https://nordlystromso.no
2. Test betalingsflyt med **ekte kort**
3. Verifiser:
   - ✅ Betaling går gjennom
   - ✅ Webhook mottas (sjekk Vercel logs)
   - ✅ Premium aktiveres
   - ✅ Data lagres i Supabase

---

## 📊 Monitoring

### Stripe Dashboard
- **Payments:** https://dashboard.stripe.com/payments
- **Customers:** https://dashboard.stripe.com/customers
- **Webhooks:** https://dashboard.stripe.com/webhooks

### Vercel Logs
- https://vercel.com/fpve-webdev/aurora-webapp/logs

### Supabase
```sql
-- Se aktive premium-brukere
SELECT
  user_email,
  current_tier,
  expires_at,
  created_at
FROM stripe_customers
WHERE subscription_status = 'active'
  AND expires_at > now()
ORDER BY created_at DESC;

-- Se alle transaksjoner (siste 7 dager)
SELECT * FROM stripe_customers
WHERE created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

---

## 📞 Dokumentasjon

- `STRIPE_SETUP.md` – Komplett setup-guide
- `STRIPE_TESTING_GUIDE.md` – Detaljert testing-instruksjoner

---

**Status:** Klar for lokal testing ✅
**Neste:** Logg inn på Stripe CLI og test lokalt
