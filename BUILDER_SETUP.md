# Builder.io Setup Guide

Dette prosjektet bruker [Builder.io](https://builder.io) for visuell redigering av sider og innhold.

## 🚀 Kom i gang

### 1. Opprett Builder.io-konto

1. Gå til [builder.io/signup](https://www.builder.io/signup)
2. Opprett en gratis konto
3. Lag en ny "Space" for dette prosjektet

### 2. Hent API-nøkkel

1. Gå til [builder.io/account/space](https://builder.io/account/space)
2. Kopier din **Public API Key**
3. Legg til i `.env.local`:

```bash
NEXT_PUBLIC_BUILDER_API_KEY=din_api_nøkkel_her
```

### 3. Registrer komponenter

Komponentene er allerede registrert i `src/builder-registry.tsx`. Når du starter dev-serveren, vil Builder.io automatisk oppdage disse.

### 4. Test i Builder.io Editor

1. Gå til [builder.io](https://builder.io)
2. Klikk **"+ New"** → **"Page"**
3. Velg URL path (f.eks. `/about`)
4. Dra inn komponenter fra sidepanelet under **"Aurora Components"**

## 📦 Tilgjengelige komponenter

Følgende komponenter kan brukes i Builder.io:

### Aurora Components
- **Aurora Status Card** - Viser nåværende nordlysstatus
- **Probability Gauge** - Visuell måler for nordlyssannsynlighet
- **Quick Stats** - Kompakt statistikk-visning
- **Hourly Forecast** - Time-for-time prognose
- **Best Time Window** - Fremhever beste tidspunkt for nordlys
- **Dark Hours Info** - Viser når det er mørkt nok

### Utility Components
- **Go Now Alert** - Varsel når nordlys er synlig akkurat nå
- **Premium CTA** - Call-to-action for premium-funksjoner

## 🛠️ Hvordan det fungerer

### Catch-All Route
Filen `src/app/[...page]/page.tsx` håndterer alle dynamiske sider fra Builder.io:

- `/about` → Henter Builder.io-side med path `/about`
- `/blog/post-1` → Henter Builder.io-side med path `/blog/post-1`

### Komponent-registrering
`src/builder-registry.tsx` eksporterer alle custom komponenter til Builder.io's visual editor.

### Client-side rendering
`src/components/builder/render-builder-content.tsx` håndterer client-side rendering av Builder.io-innhold.

## 🎨 Lage nye sider i Builder.io

1. Gå til Builder.io dashboard
2. Klikk **"+ New"** → **"Page"**
3. Sett URL path (f.eks. `/pricing`)
4. Dra inn komponenter fra **"Aurora Components"**
5. Klikk **"Publish"**
6. Besøk `http://localhost:3000/pricing` i browseren

## 🔄 Live Preview

Builder.io har innebygd live preview:

1. Åpne en side i Builder.io editor
2. Klikk **"Preview"**-knappen
3. Endringer vises i sanntid

## 🌐 Deploy til produksjon

Builder.io-innhold deployes automatisk:

1. Publish en side i Builder.io
2. Deploy applikasjonen til Vercel/Netlify
3. Siden vil være tilgjengelig på produksjons-URL

### Env-variabler i produksjon

Sørg for at `NEXT_PUBLIC_BUILDER_API_KEY` er satt i deploy-miljøet:

**Vercel:**
```bash
vercel env add NEXT_PUBLIC_BUILDER_API_KEY
```

**Netlify:**
Legg til i **Site settings** → **Environment variables**

## 📚 Ressurser

- [Builder.io Docs](https://www.builder.io/c/docs/developers)
- [Next.js Integration](https://www.builder.io/c/docs/developers/frameworks/nextjs)
- [Component Examples](https://github.com/BuilderIO/builder/tree/main/examples/next-js-app-router)

## 🐛 Feilsøking

### "Page not found" i Builder.io
- Sjekk at `NEXT_PUBLIC_BUILDER_API_KEY` er satt
- Verifiser at siden er **published** i Builder.io
- Sjekk at URL path matcher (f.eks. `/about` vs `about`)

### Komponenter vises ikke i Builder.io editor
- Restart dev-serveren (`npm run dev`)
- Clear Builder.io cache: **Settings** → **Clear Cache**
- Sjekk console for feilmeldinger

### Preview fungerer ikke
- Sjekk at `builder-registry.tsx` importeres i catch-all route
- Verifiser at komponenten er eksportert som default

## 🔒 Sikkerhet

- API-nøkkel er **public** (NEXT_PUBLIC_*) - dette er trygt
- Builder.io har innebygd access control
- Kun published innhold vises i produksjon
