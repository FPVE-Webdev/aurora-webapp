# Apple Pay og Google Pay Setup – aurora.tromso.ai

Guide for å aktivere Apple Pay og Google Pay i Stripe Checkout.

---

## ✅ Status: Klar for aktivering

Du bruker allerede **Stripe Checkout**, som automatisk viser Apple Pay og Google Pay når:
1. Betalingsmetodene er aktivert i Stripe Dashboard
2. Domenet er verifisert (Apple Pay)
3. Brukerens enhet støtter metoden

**Ingen kodeendringer nødvendig** – Stripe håndterer alt automatisk.

---

## 📋 Steg 1: Aktiver i Stripe Dashboard

### Test Mode (for testing på staging):

1. Gå til: https://dashboard.stripe.com/test/settings/payment_methods
2. Scroll ned til **Wallets**
3. Aktiver:
   - ✅ **Apple Pay**
   - ✅ **Google Pay**
4. Klikk **Save**

### Live Mode (produksjon):

1. Bytt til **Live mode** i Stripe Dashboard (toggle øverst til høyre)
2. Gå til: https://dashboard.stripe.com/settings/payment_methods
3. Under **Wallets**, aktiver:
   - ✅ **Apple Pay**
   - ✅ **Google Pay**
4. Klikk **Save**

---

## 🍎 Steg 2: Verifiser domenet for Apple Pay

Apple Pay krever domeneverifisering for HTTPS-domener.

### 2.1 Last ned verifiseringsfil

1. Gå til: https://dashboard.stripe.com/settings/apple_pay
2. Klikk **Add domain**
3. Skriv inn: **`aurora.tromso.ai`**
4. Stripe viser en verifiseringsfil du må laste ned

### 2.2 Plasser verifiseringsfilen i prosjektet

Apple forventer filen på denne URLen:
```
https://aurora.tromso.ai/.well-known/apple-developer-merchantid-domain-association
```

**Plasser filen her i prosjektet:**
```
/public/.well-known/apple-developer-merchantid-domain-association
```

**Opprett mappen hvis den ikke finnes:**
```bash
mkdir -p public/.well-known
```

**Last ned filen fra Stripe og plasser den:**
```bash
# Stripe gir deg filen - last ned og kopier til:
cp ~/Downloads/apple-developer-merchantid-domain-association public/.well-known/
```

### 2.3 Commit og deploy

```bash
git add public/.well-known/apple-developer-merchantid-domain-association
git commit -m "feat: add Apple Pay domain verification file"
git push origin main
```

Vercel vil automatisk deploye til `aurora.tromso.ai`.

### 2.4 Verifiser domenet i Stripe

1. Gå tilbake til: https://dashboard.stripe.com/settings/apple_pay
2. Du ser **aurora.tromso.ai** i listen
3. Klikk **Verify**
4. Stripe sjekker om filen er tilgjengelig på:
   ```
   https://aurora.tromso.ai/.well-known/apple-developer-merchantid-domain-association
   ```
5. ✅ Når verifisert: Domenet viser "Verified" i Stripe Dashboard

---

## 🤖 Steg 3: Google Pay (ingen ekstra steg)

Google Pay krever **ikke** domeneverifisering!

Så lenge du:
- ✅ Aktiverte Google Pay i Stripe Dashboard (Steg 1)
- ✅ Bruker HTTPS (Vercel gir automatisk)

...så fungerer Google Pay automatisk.

---

## 🧪 Testing

### ⚠️ Localhost fungerer IKKE

Apple Pay og Google Pay krever **HTTPS**:
- ❌ `http://localhost:3000` → Ingen wallets vises
- ✅ `https://aurora.tromso.ai` → Wallets vises

### Test i produksjon

**På iOS (Safari):**
1. Åpne https://aurora.tromso.ai på iPhone/iPad
2. Gå til en premium-feature → Klikk kjøp
3. Stripe Checkout viser:
   ```
   [Kort] [Apple Pay] [Klarna]
   ```
4. Klikk **Apple Pay**
5. Bruk Face ID/Touch ID/PIN
6. Betalingen går gjennom

**På Android (Chrome):**
1. Åpne https://aurora.tromso.ai på Android
2. Gå til en premium-feature → Klikk kjøp
3. Stripe Checkout viser:
   ```
   [Kort] [Google Pay] [Klarna]
   ```
4. Klikk **Google Pay**
5. Bekreft med fingeravtrykk/PIN
6. Betalingen går gjennom

**På Mac (Safari med Apple Pay setup):**
1. Åpne https://aurora.tromso.ai i Safari på Mac
2. Mac må ha Apple Pay konfigurert (System Preferences → Wallet & Apple Pay)
3. Stripe Checkout viser:
   ```
   [Kort] [Apple Pay] [Klarna]
   ```
4. Klikk **Apple Pay**
5. Bekreft med Touch ID/Apple Watch
6. Betalingen går gjennom

---

## 🔍 Feilsøking

### Apple Pay vises ikke på iOS

**Sjekk:**
1. Er domenet verifisert i Stripe Dashboard?
   - Gå til: https://dashboard.stripe.com/settings/apple_pay
   - Sjekk at `aurora.tromso.ai` viser "Verified"
2. Er Apple Pay aktivert på enheten?
   - Settings → Wallet & Apple Pay → Sjekk at kort er lagt til
3. Bruker du Safari? (Apple Pay fungerer bare i Safari på iOS)
4. Er du i test mode eller live mode?
   - Test mode fungerer ikke alltid med Apple Pay
   - Deploy til live mode for best resultater

### Google Pay vises ikke på Android

**Sjekk:**
1. Er Google Pay aktivert i Stripe Dashboard?
   - https://dashboard.stripe.com/settings/payment_methods
2. Bruker du Chrome? (Google Pay fungerer best i Chrome)
3. Er Google Pay konfigurert på enheten?
   - Settings → Google → Payments → Sjekk at kort er lagt til

### Verifiseringsfilen ikke funnet (404)

**Sjekk:**
1. Er filen riktig plassert?
   ```bash
   ls -la public/.well-known/apple-developer-merchantid-domain-association
   ```
2. Er filen committet og pushet til main?
   ```bash
   git log --oneline -1 -- public/.well-known/
   ```
3. Er Vercel-deployet fullført?
   - Sjekk: https://vercel.com/fpve-webdev/aurora-webapp
4. Test direkte i nettleser:
   ```
   https://aurora.tromso.ai/.well-known/apple-developer-merchantid-domain-association
   ```
   - Skal returnere Apple's verifiseringstekst (ikke 404)

---

## 📱 Hvordan det ser ut for brukere

### iPhone (Safari):
```
┌─────────────────────────────────┐
│  Betaling                       │
├─────────────────────────────────┤
│  [💳 Kort]  [🍎 Pay]  [K Klarna]│
├─────────────────────────────────┤
│  19,00 kr                       │
│  Nordlys Tromsø - 24h          │
└─────────────────────────────────┘
```

### Android (Chrome):
```
┌─────────────────────────────────┐
│  Betaling                       │
├─────────────────────────────────┤
│  [💳 Kort]  [G Pay]  [K Klarna] │
├─────────────────────────────────┤
│  19,00 kr                       │
│  Nordlys Tromsø - 24h          │
└─────────────────────────────────┘
```

### Desktop (kun hvis Apple Pay er setup på Mac):
```
┌─────────────────────────────────┐
│  Betaling                       │
├─────────────────────────────────┤
│  [💳 Kort]  [🍎 Pay]  [K Klarna]│
├─────────────────────────────────┤
│  19,00 kr                       │
│  Nordlys Tromsø - 24h          │
└─────────────────────────────────┘
```

---

## ✅ Sjekkliste før produksjon

- [ ] **Steg 1:** Apple Pay aktivert i Stripe Dashboard (live mode)
- [ ] **Steg 1:** Google Pay aktivert i Stripe Dashboard (live mode)
- [ ] **Steg 2:** Verifiseringsfil lastet ned fra Stripe
- [ ] **Steg 2:** Verifiseringsfil plassert i `public/.well-known/`
- [ ] **Steg 2:** Verifiseringsfil committet og pushet til main
- [ ] **Steg 2:** Vercel-deploy fullført
- [ ] **Steg 2:** Domenet verifisert i Stripe Dashboard (viser "Verified")
- [ ] **Steg 3:** Testet Apple Pay på iPhone (Safari)
- [ ] **Steg 3:** Testet Google Pay på Android (Chrome)

---

## 🎯 Oppsummering

| Krav | Status |
|------|--------|
| **Stripe Checkout** | ✅ Allerede i bruk |
| **HTTPS** | ✅ Vercel gir automatisk (aurora.tromso.ai) |
| **Aktiver i Dashboard** | ⚠️ Gjør dette nå (Steg 1) |
| **Domeneverifisering (Apple)** | ⚠️ Gjør dette før prod (Steg 2) |
| **Google Pay** | ⚠️ Kun Steg 1 (ingen verifisering) |
| **Localhost-testing** | ❌ Ikke mulig (krever HTTPS) |

---

## 🚀 Quick Start (for produksjon):

```bash
# 1. Aktiver i Stripe Dashboard (live mode)
# → https://dashboard.stripe.com/settings/payment_methods
# → Aktiver Apple Pay og Google Pay

# 2. Last ned Apple Pay-verifiseringsfil
# → https://dashboard.stripe.com/settings/apple_pay
# → Add domain: aurora.tromso.ai

# 3. Plasser filen i prosjektet
mkdir -p public/.well-known
cp ~/Downloads/apple-developer-merchantid-domain-association public/.well-known/

# 4. Commit og deploy
git add public/.well-known/apple-developer-merchantid-domain-association
git commit -m "feat: add Apple Pay domain verification"
git push origin main

# 5. Verifiser i Stripe Dashboard
# → https://dashboard.stripe.com/settings/apple_pay
# → Klikk "Verify" for aurora.tromso.ai

# 6. Test på ekte enheter
# → iPhone: https://aurora.tromso.ai (Safari)
# → Android: https://aurora.tromso.ai (Chrome)
```

---

**Ferdig!** Apple Pay og Google Pay vil nå vises automatisk for brukere på støttede enheter. 🎉
