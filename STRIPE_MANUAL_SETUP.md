# 🔧 Stripe Manual Setup - Nordlys Tromsø

**Status:** Kode er implementert ✅ | Priser oppdatert til lanseringspriser ✅

Denne guiden tar deg gjennom de **manuelle stegene** som må gjøres for at Stripe-betalingen skal fungere på localhost.

---

## ✅ Allerede gjort (automatisk via kode)

- ✅ Stripe SDK installert (`npm install stripe @stripe/stripe-js`)
- ✅ API-routes opprettet (`/api/payments/*`)
- ✅ Frontend-komponenter implementert (`PremiumLock`, `upgrade/page`)
- ✅ Priser satt til lanseringspriser:
  - 24-timers: **19 kr**
  - 7-dagers: **49 kr**
- ✅ Test-nøkler konfigurert i `.env.local`

---

## 📋 Manuelle steg (må gjøres nå)

### Steg 1: Opprett Supabase-tabell

**Hvorfor:** Stripe webhook lagrer betalingsdata i `stripe_customers`-tabellen.

**Gjør dette:**

1. Åpne [Supabase SQL Editor](https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new)
2. Kopier **hele innholdet** fra filen:
   ```
   supabase/migrations/20260108_stripe_customers.sql
   ```
3. Lim inn i SQL Editor
4. Klikk **Run** (eller `Cmd+Enter`)

**Verifiser at det fungerte:**

Kjør denne SQL-spørringen:
```sql
SELECT * FROM stripe_customers LIMIT 1;
```

✅ Hvis du **ikke** får feilmelding → Tabellen er opprettet!

---

### Steg 2: Start Stripe Webhook Lytter

**Hvorfor:** Når brukeren betaler på Stripe Checkout, sender Stripe en webhook til appen din. Stripe CLI lytter på webhooks og sender dem til localhost.

**Gjør dette:**

1. **Åpne en ny terminal** (la denne stå åpen!)
2. Kjør:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

**Output du vil se:**
```
Ready! Your webhook signing secret is whsec_1a2b3c4d5e...
```

3. **Kopier webhook secret** (starter med `whsec_...`)
4. Oppdater `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e...
   ```
5. **Restart dev server** (i annen terminal):
   ```bash
   npm run dev
   ```

⚠️ **VIKTIG:** La `stripe listen` kjøre i bakgrunnen mens du tester!

---

### Steg 3: Test betalingsflyten (localhost)

**Nå er du klar til å teste!**

1. **Åpne nettleser:** http://localhost:3000
2. **Gå til en premium-feature:**
   - `/chat` (AI Guide)
   - `/live` (Live kart)
   - `/forecast` (24-timers prognose)
3. **Klikk på en kjøpsknapp** (19 kr eller 49 kr)
4. **Skriv inn test-e-post:** `test@nordlystromso.no`
5. **Stripe Checkout åpnes** → Betal med test-kort:
   - **Kort:** `4242 4242 4242 4242`
   - **Utløp:** `12/34`
   - **CVC:** `123`
   - **Postnummer:** `12345`
6. **Klikk "Pay"**

**Hva skal skje:**

✅ Du redirectes til `/payment/success`
✅ Premium-features er ulåst
✅ Terminal med `stripe listen` viser:
```
2026-01-17 12:34:56   --> checkout.session.completed
```
✅ Supabase → `stripe_customers` får ny rad:
```sql
SELECT * FROM stripe_customers ORDER BY created_at DESC LIMIT 1;
```

---

## 🐛 Feilsøking

### Problem: "Missing stripe-signature header"

**Årsak:** `stripe listen` kjører ikke.

**Løsning:**
1. Sjekk at `stripe listen` kjører i en separat terminal
2. Restart kommandoen hvis den stoppet

---

### Problem: "Invalid signature"

**Årsak:** `STRIPE_WEBHOOK_SECRET` er feil eller gammel.

**Løsning:**
1. Stop `stripe listen` (Ctrl+C)
2. Start på nytt: `stripe listen --forward-to localhost:3000/api/payments/webhook`
3. Kopier **ny** webhook secret
4. Oppdater `.env.local`
5. Restart `npm run dev`

---

### Problem: "Database error" / "Supabase error"

**Årsak:** Tabell `stripe_customers` finnes ikke.

**Løsning:**
1. Gå til Supabase SQL Editor
2. Kjør migrasjonen på nytt (`20260108_stripe_customers.sql`)
3. Verifiser: `SELECT * FROM stripe_customers LIMIT 1;`

---

### Problem: Premium aktiveres ikke etter betaling

**Årsak:** E-postadressen er ikke lagret i `localStorage`.

**Løsning:**
1. Åpne DevTools → Application → Local Storage
2. Sjekk om `user_email` finnes
3. Hvis ikke: Prøv betalingen på nytt og skriv inn e-post

---

## 🚀 Neste steg: Produksjon (Vercel)

Når lokal testing fungerer, må du:

1. **Bytt til Stripe live mode:**
   - Gå til [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
   - Bytt til **Live mode** (toggle øverst til høyre)
   - Kopier **live keys** (`pk_live_...` og `sk_live_...`)

2. **Opprett produksjons-webhook:**
   - Gå til [Webhooks](https://dashboard.stripe.com/webhooks)
   - Klikk **Add endpoint**
   - URL: `https://nordlystromso.no/api/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`
   - Kopier **Signing secret**

3. **Legg til i Vercel environment variables:**
   - [Vercel → Settings → Environment Variables](https://vercel.com/fpve-webdev/aurora-webapp/settings/environment-variables)
   - Legg til:
     ```
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
     STRIPE_SECRET_KEY=sk_live_...
     STRIPE_WEBHOOK_SECRET=whsec_...
     ```
   - Velg **Production** environment
   - **Redeploy** appen

4. **Test i prod med ekte kort** (små beløp først!)

---

## 📊 Monitoring (etter prod-deploy)

### Stripe Dashboard
- **Payments:** https://dashboard.stripe.com/payments
- **Customers:** https://dashboard.stripe.com/customers
- **Webhooks:** https://dashboard.stripe.com/webhooks (sjekk webhook logs)

### Vercel Logs
- https://vercel.com/fpve-webdev/aurora-webapp/logs
- Søk etter "Payment successful" eller "Webhook"

### Supabase
```sql
-- Se alle aktive premium-brukere
SELECT
  user_email,
  current_tier,
  expires_at,
  created_at
FROM stripe_customers
WHERE subscription_status = 'active'
  AND expires_at > now()
ORDER BY created_at DESC;

-- Se alle transaksjoner (siste 24 timer)
SELECT * FROM stripe_customers
WHERE created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

---

## 📞 Hjelp

**Dokumentasjon:**
- `STRIPE_TODO.md` - Oversikt over hva som er gjort
- `STRIPE_SETUP.md` - Komplett setup-guide
- `STRIPE_TESTING_GUIDE.md` - Detaljert testing-guide

**Stripe Docs:**
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhooks](https://stripe.com/docs/webhooks)
- [Testing](https://stripe.com/docs/testing)

---

**Status:** Klar for testing på localhost ✅
**Neste:** Kjør Steg 1 og 2 ovenfor, deretter test!
