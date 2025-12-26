# Kart2 – Visual Mode (Live Aurora Rendering)
## Full teknisk spesifikasjon for autonom implementering (v2)

Dette dokumentet er en **fullstendig, autonom spesifikasjon** for implementering av *Kart2 – Visual Mode*.
Målet er at et utviklingsteam (eller AI-basert kodeagent) skal kunne bygge løsningen **uten ytterligere avklaringer**.

---

## 1. Formål og avgrensning

### 1.1 Formål
Visual Mode skal gi en **emosjonell, levende og intuitiv forståelse** av nordlysforholdene rundt Tromsø ved å:
- visualisere live-forhold med atmosfæriske effekter
- bevare full faglig integritet
- aldri gi anbefalinger eller presise lokasjoner

### 1.2 Avgrensning (viktig)
Visual Mode skal **ikke**:
- beregne nye data
- forutsi nordlys
- gi råd om reise eller tidspunkt
- endre eksisterende Kart2-logikk

Visual Mode er **presentasjon, ikke analyse**.

---

## 2. Overordnet arkitektur

### 2.1 Lagdeling
```
[ Mapbox GL JS (dark-v11) ]
        ↓
[ Kart2 v1 – Data & logikk (låst, uendret) ]
        ↓
[ Visual Mode Render Layer (WebGL Canvas) ]
        ↓
[ UI / Snapshot / OG-image ]
```

### 2.2 Arkitekturprinsipper
- Read-only tilgang til Kart2-state
- Full isolasjon (kan fjernes uten sideeffekter)
- Ingen backend-endringer
- Ingen nye datakilder

---

## 3. Teknologi og rammeverk

### 3.1 Klient
- React / Next.js App Router
- Mapbox GL JS (eksisterende)
- WebGL 1.0 (kompatibilitet > WebGL 2)

### 3.2 Rendering
- Ett `<canvas>`-element
- GPU-akselerert
- Full viewport overlay

### 3.3 Hvorfor WebGL
- Shader-basert lys og volum
- Stabil ytelse på mobil
- Presis kontroll over animasjon og intensitet

---

## 4. Canvas-integrasjon

### 4.1 DOM-plassering
```html
<div id="map-container">
  <canvas id="visual-mode-canvas"></canvas>
</div>
```

### 4.2 CSS-krav
```css
#visual-mode-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}
```

### 4.3 Lifecycle
- Initialiseres når Visual Mode = ON
- Full destruksjon ved OFF
- Reinitialiseres ved:
  - resize
  - map zoom threshold change

---

## 5. Data Interface (låst)

Visual Mode mottar **kun** følgende data:

```ts
interface VisualInput {
  kpIndex: number;            // 0–9
  auroraProbability: number;  // 0–100
  cloudCoverage: number;      // 0–100
  timestamp: number;          // Unix ms
  tromsøCoords: [number, number]; // [lng, lat]
}
```

Ingen annen state tillatt.

---

## 6. Aurora-rendering (kjerne)

### 6.1 Konsept
Aurora representeres som et **volumetrisk lysfelt**:
- ikke presist
- ikke lokalisert
- ikke garanterende

### 6.2 Shader-teknikk
- Vertex shader: fullskjerm quad
- Fragment shader:
  - Simplex noise (2D + time)
  - Vertikal gradient
  - Alpha blending

### 6.3 Intensitetsmapping
```ts
const auroraIntensity =
  clamp01(kpIndex / 9) * 0.6 +
  clamp01(auroraProbability / 100) * 0.4;
```

### 6.4 Fargepalett
- Primær: grønn → cyan
- Sekundær: svak lilla
- Lav metning (<= 0.6)

---

## 7. Tromsø som emosjonelt sentrum

### 7.1 Effekt
- Radial glow rundt Tromsø
- Myk puls (3–4 sek)

### 7.2 Teknisk implementasjon
- Screen-space radial gradient
- Radius justeres etter zoom
- Intensitet = auroraIntensity * 0.8

---

## 8. Værvisualisering

### 8.1 Skydekke
- Representert som volum-dis
- Alpha = cloudCoverage / 100
- Langsom noise-drevet bevegelse

### 8.2 Klarvær
- Reduserer dis
- Øker kontrast i aurora

Ingen ikoner. Ingen presis lokasjon.

---

## 9. Tidsdimensjon

- Bruk `timestamp` kun for:
  - rolig bevegelse
  - puls
- Ingen tidslinje
- Ingen fremtid/prediksjon

---

## 10. UX og kontroller

### 10.1 Visual Mode Toggle
- Label: "Visual mode"
- Default: OFF
- Persist per session (localStorage)

### 10.2 Forklaring (obligatorisk)
Synlig tekst:
> Visual representation of live conditions. Not a prediction or exact location.

Kan ikke skjules.

---

## 11. Snapshot-integrasjon

### 11.1 Når Visual Mode = ON
- Canvas-frame fryses
- Inkluderes i snapshot
- UI beholdes

### 11.2 Når OFF
- Snapshot = Kart2 v1

---

## 12. OG-image (server-side)

- Statisk aurora-glød
- Tromsø-markør
- Mørk himmel
- Ingen kart

---

## 13. Ytelse og fallback

### 13.1 FPS-mål
- Desktop: 60
- Mobil: 30

### 13.2 Automatisk deaktivert ved
- prefers-reduced-motion
- lav ytelse (heuristikk)

Fallback = Kart2 v1.

---

## 14. Sikkerhet, tillit og etterlevelse

- Ingen anbefalinger
- Ingen eksakte lokasjoner
- All visualisering merket
- Ingen juridisk risiko

---

## 15. Akseptansekriterier

Visual Mode er ferdig når:
- UX matcher demobildets følelse
- Kan slås av uten spor
- Snapshot gir delbare wow-bilder
- Ingen forvirring hos brukere
- Kart2 v1 forblir uendret

---

## 16. Endelig konklusjon

Kart2 v1 er sannheten.  
Kart2 Visual Mode er følelsen av sannheten.

Denne spesifikasjonen er tilstrekkelig for autonom implementering uten ytterligere produktbeslutninger.
