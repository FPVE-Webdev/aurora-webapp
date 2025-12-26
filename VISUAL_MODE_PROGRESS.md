# Kart2 Visual Mode – Implementeringsprosess

**Opprettet**: 2025-12-26
**Basert på**: `Kart2_Visual_Mode_Autonom_Teknisk_Spesifikasjon.md`
**Status**: 🟡 Pågående

---

## Overordnet Plan

| Fase | Beskrivelse | Status |
|------|-------------|--------|
| **Fase 1** | Grunnstruktur (Canvas + Toggle + Disclaimer) | ✅ Fullført |
| **Fase 2** | WebGL Shader Pipeline | ✅ Fullført |
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
- ✅ `c1a3407` - feat(kart2): Visual Mode Fase 1 - Grunnstruktur

---

## Fase 2: WebGL Shader Pipeline
**Startet**: 2025-12-26
**Status**: ✅ Fullført

### Mål
- Vertex shader (fullskjerm quad) ✅
- Fragment shader (aurora rendering) ✅
- Simplex noise implementation ✅
- Aurora intensitet mapping ✅
- Tromsø radial glow ✅
- Animation loop ✅

### Tekniske krav
```glsl
// Vertex Shader: Fullscreen quad
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}

// Fragment Shader: Aurora + Glow
uniform float u_time;
uniform float u_auroraIntensity;
uniform vec2 u_tromsoPosition;
```

### Aurora Intensity Formula
```ts
const auroraIntensity =
  clamp01(kpIndex / 9) * 0.6 +
  clamp01(auroraProbability / 100) * 0.4;
```

### Filer som skal endres/opprettes
- [x] `src/app/kart2/utils/shaders.ts` (ny)
- [x] `src/app/kart2/utils/noise.ts` (ny - simplex noise)
- [x] Oppdater `VisualModeCanvas.tsx` med shader pipeline

### Implementeringsdetaljer

#### 1. `shaders.ts`
- Vertex shader: Fullscreen quad rendering
- Fragment shader:
  - GLSL simplex noise (GPU-optimized)
  - Aurora wave pattern (2 noise layers)
  - Vertical gradient (stronger at top/north)
  - Tromsø radial glow med pulsing (3-4 sek)
  - Color mapping: green → cyan
  - Cloud coverage dimming
  - Max alpha: 0.5 (prevent oversaturation)
- Shader compilation + linking functions

#### 2. `noise.ts`
- 2D Simplex noise (Stefan Gustavson implementation)
- CPU-side noise (for potential future use)
- Permutation table + gradient vectors

#### 3. `VisualModeCanvas.tsx` Updates
- Shader program initialization
- Fullscreen quad geometry
- Uniform location binding
- Alpha blending setup (SRC_ALPHA, ONE_MINUS_SRC_ALPHA)
- Render loop med requestAnimationFrame
- Aurora intensity calculation per spec
- Tromsø center: screen-space [0.5, 0.65]
- Full cleanup on unmount

### Visual Effects Implementert
1. **Aurora Pattern**: 2-layer noise, vertical gradient
2. **Tromsø Glow**: Exponential radial falloff, yellow-green
3. **Pulsing**: Sin wave animation (3-4 sec cycle)
4. **Cloud Dimming**: Reduces intensity by up to 60%
5. **Color Mapping**: Green base → cyan highlights

### Test-status
- [ ] Visual rendering fungerer
- [ ] Animation smooth (30-60 FPS)
- [ ] Intensity mapping korrekt
- [ ] Tromsø glow synlig
- [ ] Cloud coverage påvirker rendering

### Commits
*Klar for commit*

---

## Logg

### 2025-12-26 – Fase 1 fullført
- ✅ Grunnstruktur implementert
- ✅ Commit c1a3407
- 🟡 Starter Fase 2

---

## Neste steg
1. Implementer simplex noise
2. Skriv vertex + fragment shaders
3. Kompiler shaders i WebGL context
4. Implementer render loop
