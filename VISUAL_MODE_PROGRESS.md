# Kart2 Visual Mode – Implementeringsprosess

**Opprettet**: 2025-12-26
**Basert på**: `Kart2_Visual_Mode_Autonom_Teknisk_Spesifikasjon.md`
**Status**: 🟡 Pågående

---

## Overordnet Plan

| Fase | Beskrivelse | Status |
|------|-------------|--------|
| **Fase 1** | Grunnstruktur (Canvas + Toggle + Disclaimer) | 🟡 Pågår |
| **Fase 2** | WebGL Shader Pipeline | ⚪ Ikke startet |
| **Fase 3** | Data-integrasjon | ⚪ Ikke startet |
| **Fase 4** | Væreffekter | ⚪ Ikke startet |
| **Fase 5** | Snapshot-integrasjon | ⚪ Ikke startet |
| **Fase 6** | Ytelse & fallback | ⚪ Ikke startet |

---

## Fase 1: Grunnstruktur
**Startet**: 2025-12-26
**Status**: ✅ Fullført

### Mål
- Canvas-element med korrekt CSS-lag ✅
- Visual Mode toggle UI ✅
- Obligatorisk disclaimer (alltid synlig) ✅
- localStorage persist ✅

### Tekniske krav
```tsx
// Canvas CSS
position: absolute
inset: 0
pointer-events: none
z-index: 20

// Toggle state
localStorage.getItem('visualModeEnabled')
```

### Filer som skal endres/opprettes
- [x] `src/app/kart2/components/VisualModeCanvas.tsx` (ny)
- [x] `src/app/kart2/components/VisualModeToggle.tsx` (ny)
- [x] `src/app/kart2/hooks/useVisualMode.ts` (ny)
- [x] Integrasjon i `MapView.tsx`

### Implementeringsdetaljer

#### 1. `useVisualMode.ts`
- State management med localStorage persist
- Hydration-safe (SSR kompatibel)
- Key: `kart2-visual-mode-enabled`

#### 2. `VisualModeToggle.tsx`
- Toggle switch UI
- **Permanent disclaimer**: "Visual representation of live conditions. Not a prediction or exact location."
- Disclaimer kan ALDRI skjules

#### 3. `VisualModeCanvas.tsx`
- WebGL 1.0 context initialization
- Full lifecycle management (init/cleanup)
- Resize handling
- Read-only data props:
  - kpIndex
  - auroraProbability
  - cloudCoverage
  - timestamp
  - tromsoCoords

#### 4. MapView Integration
- Canvas overlay med z-index 20
- Toggle plassert i left sidebar
- Conditional rendering basert på `visualMode.isEnabled`

### Test-status
- [ ] Toggle switch fungerer
- [ ] localStorage persist fungerer
- [ ] Canvas initialiseres korrekt
- [ ] Disclaimer alltid synlig
- [ ] Ingen konflikter med snapshot-funksjon

### Commits
*Klar for første commit*

---

## Logg

### 2025-12-26 – Oppstart
- Opprettet VISUAL_MODE_PROGRESS.md
- Startet Fase 1

---

## Neste steg
1. Undersøk eksisterende Kart2-struktur
2. Opprett VisualModeCanvas komponent
3. Opprett Toggle UI
4. Integrer i map view
