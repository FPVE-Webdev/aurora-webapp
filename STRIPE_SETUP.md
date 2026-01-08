# Stripe Setup Guide – Nordlys Tromsø

Komplett guide for å sette opp Stripe-betalinger i Aurora-appen.

---

## 📋 Oversikt

Stripe-integrasjonen håndterer engangskjøp for premium-tilgang:
- **24 timer**: 49 NOK
- **96 timer (4 dager)**: 149 NOK

### Arkitektur
- **Backend**: Next.js API Routes (`/api/payments/*`)
- **Database**: Supabase (`stripe_customers` tabell)
- **Frontend**: Premium-lock med direkte Stripe Checkout
- **Verifisering**: Server-side webhook + localStorage backup

---

## 🚀 Steg 1: Opprett Stripe-konto

1. Gå til [https://stripe.com](https://stripe.com)
2. Registrer deg med e-post
3. Bekreft e-postadressen din
4. Logg inn på Stripe Dashboard

---

## 🔑 Steg 2: Hent API-nøkler

### For testing (test mode):

1. Gå til [https://dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
2. Kopier:
   - **Publishable key** (starter med `pk_test_...`)
   - **Secret key** (starter med `sk_test_...`)

### Legg til i `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxx...
STRIPE_SECRET_KEY=sk_test_51xxx...
```

---

## 🪝 Steg 3: Sett opp Webhook

Webhooks trengs for å bekrefte betalinger i backend.

### Lokal testing med Stripe CLI:

1. **Installer Stripe CLI**:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. **Logg inn**:
   ```bash
   stripe login
   ```

3. **Start webhook-lytter**:
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```

4. **Kopier webhook signing secret** (starter med `whsec_...`):
   ```bash
   # Output: Ready! Your webhook signing secret is whsec_xxx...
   ```

5. **Legg til i `.env.local`**:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxx...
   ```

### Produksjon (Vercel):

1. Gå til [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Klikk **Add endpoint**
3. URL: `https://nordlystromso.no/api/payments/webhook`
4. Velg events:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Kopier **Signing secret** og legg til i Vercel environment variables

---

## 🗄️ Steg 4: Opprett Supabase-tabell

Kjør SQL-migrasjonen i Supabase:

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/project/yoooexmshwfpsrhzisgu)
2. Gå til **SQL Editor**
3. Kjør SQL-filen: `/supabase/migrations/20260108_stripe_customers.sql`

Alternativt, kjør direkte:

```sql
CREATE TABLE IF NOT EXISTS stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  subscription_status TEXT NOT NULL CHECK (subscription_status IN ('active', 'expired', 'cancelled')),
  current_tier TEXT NOT NULL CHECK (current_tier IN ('premium_24h', 'premium_7d')),
  expires_at TIMESTAMPTZ NOT NULL,
  payment_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stripe_customers_email ON stripe_customers(user_email);
CREATE INDEX idx_stripe_customers_expires_at ON stripe_customers(expires_at);
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
```

---

## 🧪 Steg 5: Test betalingsflyten

### Start dev server:

```bash
npm run dev
```

### Test med Stripe test-kort:

1. Åpne appen i nettleseren: `http://localhost:3000`
2. Klikk på en premium-låst feature (f.eks. chatbot eller kart)
3. Velg et kjøpsalternativ (24h eller 96h)
4. Skriv inn en test-e-post (f.eks. `test@example.com`)
5. Bruk Stripe test-kort:
   - **Kortnummer**: `4242 4242 4242 4242`
   - **Utløpsdato**: Hvilket som helst fremtidig dato (f.eks. `12/34`)
   - **CVC**: Hvilket som helst 3-sifret nummer (f.eks. `123`)
   - **Postnummer**: Hvilket som helst (f.eks. `12345`)

### Verifiser:

1. Etter vellykket betaling → Redirect til `/payment/success`
2. Sjekk at premium-features er låst opp
3. Sjekk Stripe Dashboard → **Payments** for å se transaksjonen
4. Sjekk Supabase → `stripe_customers` tabell for å se oppføringen

---

## 📁 Filstruktur

```
/src
├── /lib
│   └── stripe.ts                       ← Stripe client & product config
├── /app
│   ├── /api/payments
│   │   ├── /create-checkout/route.ts  ← POST: Opprett Stripe Checkout
│   │   ├── /webhook/route.ts          ← POST: Stripe webhook handler
│   │   └── /verify-subscription/route.ts ← POST: Verifiser premium-status
│   └── /payment
│       ├── /success/page.tsx          ← Success-side
│       └── /cancelled/page.tsx        ← Cancelled-side
├── /contexts
│   └── PremiumContext.tsx             ← Premium state med backend-verifisering
├── /components/premium
│   └── PremiumLock.tsx                ← Paywall-komponent
└── /supabase/migrations
    └── 20260108_stripe_customers.sql  ← Database migration
```

---

## 🔄 Betalingsflyt

1. **Bruker klikker "Kjøp"** → `PremiumLock.tsx`
2. **Frontend kaller** → `POST /api/payments/create-checkout`
3. **Backend oppretter** → Stripe Checkout Session
4. **Bruker redirectes** → Stripe Checkout (hosted by Stripe)
5. **Bruker betaler** → Stripe håndterer betalingen
6. **Stripe sender webhook** → `POST /api/payments/webhook`
7. **Backend lagrer** → `stripe_customers` i Supabase
8. **Bruker redirectes** → `/payment/success`
9. **Frontend verifiserer** → `POST /api/payments/verify-subscription`
10. **Premium aktiveres** → `PremiumContext` oppdateres

---

## 🔒 Sikkerhet

- ✅ Secret key er **server-side only** (ikke eksponert til frontend)
- ✅ Webhook signature verification (forhindrer falske webhooks)
- ✅ Supabase Row Level Security (RLS) aktivert
- ✅ Email validering før checkout
- ✅ Backend-verifisering av premium-status

---

## 🐛 Feilsøking

### Problem: "Missing stripe-signature header"
- **Løsning**: Sjekk at webhook-URLen er riktig og at Stripe CLI kjører

### Problem: "Invalid signature"
- **Løsning**: Sjekk at `STRIPE_WEBHOOK_SECRET` matcher Stripe CLI output

### Problem: Premium-status aktiveres ikke
- **Løsning**: Sjekk console logs i webhook + Supabase for feilmeldinger

### Problem: Redirect til success-siden, men ingen premium
- **Løsning**: Sjekk at e-postadressen er lagret i `localStorage.getItem('user_email')`

---

## 📊 Monitoring

### Stripe Dashboard:
- **Payments**: Se alle transaksjoner
- **Customers**: Se alle kunder
- **Logs**: Se webhook-events

### Supabase:
```sql
-- Se alle aktive premium-brukere
SELECT * FROM stripe_customers
WHERE subscription_status = 'active'
  AND expires_at > now();

-- Se utløpte subscriptions
SELECT * FROM stripe_customers
WHERE subscription_status = 'active'
  AND expires_at < now();

-- Manuelt utløp gamle subscriptions
UPDATE stripe_customers
SET subscription_status = 'expired'
WHERE expires_at < now()
  AND subscription_status = 'active';
```

---

## 🚀 Produksjon

### Før deploy til Vercel:

1. **Bytt til live mode** i Stripe Dashboard
2. **Hent live keys** fra [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
3. **Opprett produksjons-webhook** → `https://nordlystromso.no/api/payments/webhook`
4. **Oppdater Vercel environment variables**:
   ```bash
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Test produksjon:
- Bruk **ekte kort** (små beløp først!)
- Verifiser at webhook mottas i Vercel logs
- Sjekk at premium aktiveres korrekt

---

## 📞 Support

- **Stripe Docs**: [https://stripe.com/docs](https://stripe.com/docs)
- **Stripe CLI Docs**: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)

---

## ✅ Sjekkliste før live

- [ ] Stripe test mode fungerer lokalt
- [ ] Webhook mottas og lagrer i Supabase
- [ ] Premium-status aktiveres etter betaling
- [ ] Success/cancelled sider vises korrekt
- [ ] Live keys er lagt til i Vercel
- [ ] Produksjons-webhook er konfigurert
- [ ] Teste med ekte kort (små beløp)
- [ ] Monitoring satt opp (Stripe Dashboard + Supabase)

---

**Implementert**: 2026-01-08
**Status**: Klar for testing
