# 🧪 Stripe Testing Guide – Nordlys Tromsø

## ✅ Status

- [x] Stripe test keys lagt til i `.env.local`
- [x] Stripe npm-pakker installert
- [x] Stripe CLI installert via Homebrew
- [ ] Stripe CLI innlogget (gjør dette nå)
- [ ] Webhook-lytter kjører
- [ ] Supabase-tabell opprettet

---

## 📋 Steg-for-steg Testing

### 1. Logg inn på Stripe CLI (i terminal)

```bash
# Åpne en ny terminal-fane
stripe login
```

Dette åpner en nettleser hvor du logger inn på Stripe-kontoen din. Følg instruksjonene og godkjenn tilgangen.

---

### 2. Opprett Supabase-tabell (VIKTIG!)

1. Gå til [Supabase SQL Editor](https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/sql/new)
2. Kopier innholdet fra `supabase/migrations/20260108_stripe_customers.sql`
3. Lim inn i SQL Editor
4. Klikk **Run** (eller Cmd+Enter)
5. Verifiser at tabellen ble opprettet:

```sql
SELECT * FROM stripe_customers LIMIT 1;
```

---

### 3. Start Stripe Webhook-lytter (i egen terminal)

```bash
# I en egen terminal-fane (la denne kjøre i bakgrunnen):
stripe listen --forward-to localhost:3000/api/payments/webhook
```

**Viktig:** Du vil se output som dette:
```
Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

**Kopier webhook secret** og legg til i `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**La denne terminalen kjøre** mens du tester! Ikke lukk den.

---

### 4. Start Next.js dev server (i annen terminal)

```bash
# I en ny terminal-fane:
npm run dev
```

Appen kjører nå på `http://localhost:3000`

---

### 5. Test betalingsflyten

#### A. Åpne appen i nettleseren

```
http://localhost:3000
```

#### B. Naviger til en premium-låst feature

Du kan teste på flere steder:
- `/kart3` – Kart med premium-lock
- Chatbot – Premium routing-feature
- Forecast – 24h+ prognose

#### C. Klikk på en kjøpsknapp

Velg enten:
- **1-Night Pass (24h)** – 49 kr
- **7-Day Pass (96h)** – 149 kr

#### D. Skriv inn test-e-post

Når promptet ber om e-post:
```
test@nordlystromso.no
```

#### E. Du blir redirected til Stripe Checkout

Bruk **Stripe test-kort**:

| Felt | Verdi |
|------|-------|
| **Kortnummer** | `4242 4242 4242 4242` |
| **Utløpsdato** | `12/34` (eller hvilket som helst fremtidig dato) |
| **CVC** | `123` (eller hvilken som helst 3 siffer) |
| **Postnummer** | `12345` |
| **Navn** | `Test Bruker` |

#### F. Klikk "Pay"

Du blir redirected til:
```
http://localhost:3000/payment/success?session_id=cs_test_xxx
```

#### G. Verifiser premium-tilgang

1. **Sjekk success-siden** – Du skal se "Betaling vellykket!"
2. **Gå tilbake til appen** – Premium-features skal nå være ulåst
3. **Sjekk console logs** (DevTools) – Du skal se: `✅ Unlocked premium_24h for 24h`

---

### 6. Verifiser at alt fungerer

#### A. Sjekk Stripe webhook-lytteren

I terminalen hvor `stripe listen` kjører, skal du se:
```
[200] POST /api/payments/webhook [evt_xxx]
✅ checkout.session.completed
```

#### B. Sjekk Supabase-databasen

Gå til [Supabase Table Editor](https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu/editor/public/stripe_customers) og sjekk at det finnes en rad med:
- `user_email`: `test@nordlystromso.no`
- `subscription_status`: `active`
- `current_tier`: `premium_24h` eller `premium_7d`
- `expires_at`: Fremtidig tidspunkt

Alternativt, kjør i SQL Editor:
```sql
SELECT * FROM stripe_customers
WHERE user_email = 'test@nordlystromso.no';
```

#### C. Sjekk Stripe Dashboard

Gå til [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments)

Du skal se en betaling på 49 kr eller 149 kr med status **Succeeded**.

---

## 🔍 Debugging

### Problem 1: "Missing stripe-signature header"

**Årsak:** Webhook-lytteren kjører ikke.

**Løsning:** Start `stripe listen --forward-to localhost:3000/api/payments/webhook` i en egen terminal.

---

### Problem 2: "Invalid signature"

**Årsak:** `STRIPE_WEBHOOK_SECRET` er feil eller mangler i `.env.local`.

**Løsning:** Kopier webhook secret fra `stripe listen` output og legg til i `.env.local`. Restart dev server.

---

### Problem 3: Premium aktiveres ikke

**Årsak 1:** Supabase-tabellen finnes ikke.

**Løsning:** Kjør SQL-migrasjonen i Supabase SQL Editor.

**Årsak 2:** Email er ikke lagret i localStorage.

**Løsning:** Sjekk DevTools → Application → Local Storage → Se etter `user_email`.

---

### Problem 4: API error 500

**Årsak:** Supabase service role key er feil.

**Løsning:** Sjekk at `SUPABASE_SERVICE_ROLE_KEY` i `.env.local` matcher Supabase dashboard.

---

## 📊 Test-scenarioer

### Scenario 1: Kjøp 24-timers pass

1. Velg "1-Night Pass (49 kr)"
2. E-post: `test24h@example.com`
3. Betal med test-kort
4. Verifiser: Premium aktiv i 24 timer

### Scenario 2: Kjøp 96-timers pass

1. Velg "7-Day Pass (149 kr)"
2. E-post: `test96h@example.com`
3. Betal med test-kort
4. Verifiser: Premium aktiv i 96 timer

### Scenario 3: Avbrutt betaling

1. Velg et pass
2. Klikk "← Back" i Stripe Checkout
3. Verifiser: Redirect til `/payment/cancelled`
4. Verifiser: Ingen premium aktivert

### Scenario 4: Backend-verifisering

1. Betal for premium
2. Lukk nettleseren
3. Åpne appen igjen på nytt
4. Verifiser: Premium-status gjenopprettes fra Supabase

---

## 🧹 Cleanup etter testing

### Slett test-data fra Supabase

```sql
DELETE FROM stripe_customers
WHERE user_email LIKE 'test%';
```

### Nullstill localStorage

DevTools → Console:
```javascript
localStorage.clear();
location.reload();
```

---

## ✅ Sjekkliste før testing

- [ ] `.env.local` har riktige Stripe test keys
- [ ] Supabase `stripe_customers` tabell er opprettet
- [ ] Stripe CLI er innlogget (`stripe login`)
- [ ] Webhook-lytter kjører (`stripe listen ...`)
- [ ] Dev server kjører (`npm run dev`)
- [ ] Nettleser åpnet på `localhost:3000`

---

## 🚀 Når alt fungerer

Når lokal testing er vellykket:

1. **Commit endringene** (hvis ikke allerede gjort)
2. **Push til GitHub** → Dette deployer til Vercel
3. **Sett opp produksjons-webhook** i Stripe Dashboard:
   - URL: `https://nordlystromso.no/api/payments/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`
4. **Legg til Stripe keys i Vercel** environment variables

---

## 📞 Hjelp

Hvis du står fast, sjekk:
- [Stripe Testing Docs](https://stripe.com/docs/testing)
- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- `STRIPE_SETUP.md` for komplett setup-guide

---

**Lykke til med testingen! 🎉**
