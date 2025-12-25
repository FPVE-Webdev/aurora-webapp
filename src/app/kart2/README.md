# /kart2 - Experimental Public Aurora Map

## Status: FASE 0 - SCAFFOLDING COMPLETE ✅

Arkitektonisk forberedelse for et nytt, offentlig eksperimentelt nordlyskart.

---

## 📋 Positioning

### Existing Map (`/live`)
- **Brukere**: Guides, turoperatører, chase coordinators (profesjonelle)
- **Funksjon**: Profesjonelt verktøy med avanserte features
- **Status**: PRODUCTION - må ikke endres

### Kart2 (`/kart2`)
- **Brukere**: Offentligheten (turister, nordlys-entusiaster)
- **Funksjon**: Forenklet, eksperimentell versjon
- **Status**: EXPERIMENTAL - kan fjernes uten konsekvenser

---

## 🏗️ Architecture

```
app/kart2/
├── page.tsx           // Server component wrapper (metadata, layout)
├── MapView.tsx        // Client component (Mapbox map)
├── useAuroraData.ts   // Data hook (isolated from pro map)
├── map.config.ts      // Map settings (bounds, zoom, tokens)
└── README.md          // This file
```

### Isolation Guarantees
- ✅ No imports from existing pro map components
- ✅ No shared state with `/live`
- ✅ Can be deleted without breaking changes
- ✅ Independent data fetching layer

---

## 🚀 Implementation Phases

### FASE 0: Scaffolding ✅ COMPLETE
- [x] Create route structure
- [x] Set up TypeScript types
- [x] Configure map settings
- [x] Add placeholder components
- [x] Verify build succeeds

### FASE 1: Mapbox Integration (TODO)
- [ ] Initialize Mapbox GL JS
- [ ] Render base dark map
- [ ] Add aurora oval layer (GeoJSON from `/api/aurora/oval`)
- [ ] Add observation spot markers
- [ ] Implement useAuroraData hook with real API calls
- [ ] Add loading/error states

### FASE 2: Interactive Features (TODO)
- [ ] Timeline scrubber (12-hour forecast)
- [ ] Location selector
- [ ] User geolocation
- [ ] Aurora probability legend
- [ ] Mobile-optimized controls

### FASE 3: Public Release (TODO)
- [ ] Performance optimization
- [ ] Analytics tracking
- [ ] Link from main navigation
- [ ] A/B testing vs existing map
- [ ] Decision: Replace `/live` or keep separate?

---

## 🔧 Configuration

### Environment Variables Required
```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx...  # Required for Mapbox
```

### Map Settings (map.config.ts)
- **Initial view**: Tromsø (69.65°N, 18.95°E)
- **Bounds**: Northern Scandinavia (67.5-71.5°N, 15-32°E)
- **Zoom**: 4-12
- **Style**: `mapbox://styles/mapbox/dark-v11`

---

## 📊 Data Flow

```
┌─────────────┐
│ useAuroraData│ (isolated hook)
└──────┬──────┘
       │
       ├──> /api/aurora/now      (current conditions)
       ├──> /api/aurora/hourly   (12h forecast)
       └──> /api/aurora/oval     (aurora belt GeoJSON)
       │
       ▼
┌─────────────┐
│   MapView   │ (Mapbox rendering)
└─────────────┘
```

**Important**: This data layer is completely separate from `/live` data hooks.

---

## 🧪 Testing

### Local Development
```bash
npm run dev
# Visit: http://localhost:3000/kart2
```

### Build Verification
```bash
npm run build
# Verify /kart2 appears in route list
# Verify /live is unchanged
```

### Route Independence Test
```bash
# Delete kart2 directory
rm -rf src/app/kart2

# Build should still succeed
npm run build

# /live should be unaffected
```

---

## 🚨 Constraints & Rules

### DO ✅
- Keep kart2 completely isolated
- Use only public APIs (`/api/aurora/*`)
- Mark all code with `TODO (FASE X)` comments
- Add clear architectural documentation
- Test that deletion doesn't break builds

### DON'T ❌
- Import components from `/live` or `/components/aurora/AuroraLiveMap.tsx`
- Modify professional user workflows
- Share state between kart2 and existing map
- Link from main navigation (yet)
- Remove placeholder TODOs until implemented

---

## 📝 TODO Comments Guide

All unimplemented features are marked with phase-specific TODOs:

```typescript
// TODO (FASE 1): Implement Mapbox initialization
// TODO (FASE 2): Add timeline scrubber
// TODO (FASE 3): Link from navigation
```

Search for `TODO (FASE` to find next implementation tasks.

---

## 🔄 Migration Strategy

### Scenario A: kart2 replaces /live (public users)
1. Migrate public traffic to `/kart2`
2. Keep `/live` for professional users only
3. Add auth requirement to `/live`

### Scenario B: kart2 becomes main public map
1. Rename `/live` → `/pro` or `/operator`
2. Rename `/kart2` → `/map` or `/live`
3. Update all navigation links

### Scenario C: Keep both permanently
1. `/live` = professional tool (with auth)
2. `/kart2` = public simplified map (no auth)
3. Maintain both codebases separately

**Decision point**: After FASE 2 completion + user testing

---

## 📞 Contact

For questions about kart2 architecture or implementation:
- Check this README first
- Review TODO comments in code
- Consult with team before modifying `/live` map

---

**Last updated**: 2025-12-25 (FASE 0 scaffolding)
