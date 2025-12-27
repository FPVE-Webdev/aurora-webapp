# /kart2 – Nordlys Tromsø (Cursor Context)

Dette dokumentet er et **støtteverktøy/oppslagsverk** for alle agenter som jobber i prosjektet. Hold det oppdatert når du gjør endringer som påvirker funksjon, UX, eller rammer.

## Kontekst
- **Produkt**: Live, visuell demoprodukt for nordlys i Tromsø.
- **Mål**: Maksimal **wow-opplevelse** – ikke vitenskapelig presisjon.
- **Mentalt bilde**: «Jeg står i Tromsø og ser nordlyset danse over landskapet.»
- **Kartet**: En **scene**, ikke et navigasjonsverktøy.

## Teknisk stack
- Next.js App Router
- Mapbox GL JS
- WebGL shader (`VisualModeCanvas`)
- **Ingen nye biblioteker**
- All kode ligger i: `src/app/kart2`

## Faste rammer (IKKE BRYT)
- **❌ Ikke refaktorer arkitektur**
- **❌ Ikke fjern eksisterende features**
- **❌ Ikke introduser nye libs**
- **❌ Ikke gjør kartet fritt navigerbart globalt**
- **✅ Bruk Mapbox native layers**
- **✅ `VisualModeCanvas` skal ligge over kartet**
- **✅ Produksjonssikker kode (ingen console errors i production)**

## Nåværende status
- Tromsø er visuelt sentrum
- Kartet er pitched (airplane / horizon view)
- Aurora-overlay fungerer
- City lights er under utvikling (skal være “airplane view” med punktlys)
- Visual Mode toggle er aktiv

## Designprinsipper
- Kart = bakgrunn / scene
- Tromsø = epicenter
- Nordlys = hovedattraksjon
- City lights = kontekst, ikke støy
- Bevegelse skal være subtil og filmatisk
- Alt skal oppleves umiddelbart imponerende

## Arbeidsform
- Implementer presist etter instruks
- Still **ingen spørsmål** med mindre noe er teknisk blokkert
- Forklar kun hvis eksplisitt bedt om det
- Lever konkrete patcher, ikke teorier

## Praktiske føringer (for robuste overlays)
- **UI/controls skal alltid være synlige**, selv om nordlysanimasjon/WebGL feiler.
- **Aurora WebGL kan feile** (WebGL context, shader compile, GPU/driver). UI må derfor ligge i et eget “top-most” lag med høy z-index og gjerne være beskyttet av ErrorBoundary.


