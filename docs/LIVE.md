# /live View – Design & Architecture

## Executive Summary

The `/live` view is a real-time execution surface that displays **"Should I go outside now?"** guidance using Site-AI decisions with a ±90 minute time horizon. It is a **pure interpretation layer** with zero autonomous decision logic.

**Key Rule:** All decisions originate from Site-AI. `/live` components are purely reactive to `SiteAIDecision` output.

---

## Data Flow

```
Tromsø.AI Forecast Data (hourly forecasts + KP)
  ↓
useAuroraData() hook
  ↓
selectedForecast.hourlyForecast + currentKp
  ↓
useSiteAIDecision() hook (with parameters)
  ↓
POST /api/aurora/forecast-decision
  ↓
[Site-AI Orchestrator]
  - ADS calculation
  - Global state determination
  - Limiting factor detection
  - Deterministic copy generation
  ↓
SiteAIDecision { state, bestWindow, explanation, ... }
  ↓
interpretSiteAIForLive() adapter
  ↓
LiveAdapterOutput { adviceLevel, reason, confidence, ... }
  ↓
/live UI Components (AuroraLiveMap, header chip, messaging)
  ↓
User sees: "Go outside now" OR "Not worth it right now"
```

---

## Component Architecture

### AuroraLiveMap.tsx
**Purpose:** Main /live view container. Orchestrates data fetching and passes Site-AI output to UI.

**Decision Logic Location:** NONE (all from Site-AI)

**Responsibility:**
- Fetch raw aurora data via `useAuroraData()` hook
- Fetch Site-AI decision via `useSiteAIDecision(hourlyForecasts, currentKp)` hook
- Interpret Site-AI decision via `interpretSiteAIForLive(siteAIDecision)` adapter
- Pass adapter output to child components for rendering
- Handle location selection (spot switching)
- No threshold checks, comparisons, or aurora-related inference

**Key Code:**
```typescript
// All decision logic flows from Site-AI, no independent thresholds
const { decision: siteAIDecision, isLoading: isSiteAILoading } = useSiteAIDecision(
  hourlyForecasts,
  currentKp,
  'stable'
);
const liveAdapterOutput = siteAIDecision ? interpretSiteAIForLive(siteAIDecision) : null;

// UI chip uses Site-AI confidence, not independent probability
{liveAdapterOutput && (
  <div className={cn(
    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-auto',
    liveAdapterOutput.adviceLevel === 'go' && 'bg-gradient-to-br from-green-400 to-green-600',
    liveAdapterOutput.adviceLevel === 'not_worth_it' && 'bg-gradient-to-br from-slate-400 to-slate-600'
  )}>
    <span className="text-[14px] font-bold text-white">
      {Math.round(liveAdapterOutput.confidence)}%
    </span>
  </div>
)}
```

---

## Adapter Pattern: liveAdapter.ts

**Purpose:** Interpret `SiteAIDecision` for `/live` context without changing the decision.

**Input:** `SiteAIDecision`
**Output:** `LiveAdapterOutput`

```typescript
interface LiveAdapterOutput {
  isBestNow: boolean;
  adviceLevel: 'go' | 'not_worth_it';
  reason: string;
  nextBestTime?: Date;
  confidence: number;
  limitingFactor: string;
}
```

**Interpretation Rules:**

| State | ADS | Advice | Reason |
|-------|-----|--------|--------|
| **EXCELLENT** | ≥70 | "go" | Ideal conditions now, go outside immediately |
| **POSSIBLE** | 30-69 | "not_worth_it" | Conditions may develop, but conservative guidance: don't go now |
| **UNLIKELY** | <30 | "not_worth_it" | Unfavorable conditions in 48-hour window |

**Implementation Details:**
- No thresholds or comparisons in adapter—purely maps state to advice
- `reason` is a shortened version of Site-AI's deterministic explanation (focused on immediate action)
- `confidence` is the Site-AI ADS score (0-100)
- `nextBestTime` helps user plan when conditions improve (from Site-AI's `nextWindow` field)
- `limitingFactor` is extracted from Site-AI's explanation for context

---

## Arctic Handling (Automatic)

All Arctic-specific handling is inherited directly from Site-AI:

- **Polar Night (Nov 21 – Jan 21):** Darkness model adds +10 to base darkness
- **Midnight Sun (May 19 – Jul 23):** Aurora impossible; Site-AI returns UNLIKELY state
- **Twilight Phases:** Site-AI's darkness model correctly handles civil, nautical, astronomical twilight for 69.7°N
- **Solar Elevation:** Automatically factored into ADS (0% darkness in daytime, 100% in night)

**No separate Arctic logic in /live components.** Site-AI handles it; /live just consumes the result.

---

## Refresh Strategy

- **Cadence:** 15 minutes (configurable via `useSiteAIDecision()` hook)
- **Rationale:** Balances responsiveness (real-time feel) with API stability (no fluttering)
- **Cache:** Site-AI API response cached for 1 hour (deterministic output)
- **Implementation:** `useEffect` in `AuroraLiveMap.tsx` triggers refetch every 15 min

---

## Testing

### What NOT to Test in /live Components
- ❌ Whether cloud cover > 60% leads to "not worth it" (Site-AI's job)
- ❌ Whether KP < 3 affects advice (Site-AI's job)
- ❌ Whether darkness factor is calculated correctly (Site-AI's job)
- ❌ Whether ADS >= 70 = excellent (Site-AI's job)

### What to Test in /live Components
- ✅ `interpretSiteAIForLive()` correctly maps each SiteAIDecision state to correct advice level
- ✅ UI renders correct color chip based on `liveAdapterOutput.adviceLevel`
- ✅ Confidence percentage displays correctly
- ✅ /live fetches Site-AI decision on mount and refetch
- ✅ Spot selection triggers Site-AI refetch with new location's data
- ✅ Same SiteAIDecision state → same advice across `/forecast` and `/live`

### E2E Scenarios

**Scenario 1: EXCELLENT Conditions**
- Site-AI returns `state: 'excellent'`, ADS ≥ 70
- liveAdapter returns `adviceLevel: 'go'`
- /live shows: green chip (100%), message "Strong aurora conditions now"
- /forecast shows: EXCELLENT banner with same explanation

**Scenario 2: UNLIKELY Conditions**
- Site-AI returns `state: 'unlikely'`, ADS < 30
- liveAdapter returns `adviceLevel: 'not_worth_it'`
- /live shows: slate chip (ADS%), message "Not worth it now. [limiting factor]"
- /forecast shows: UNLIKELY banner with same explanation

**Scenario 3: Midnight Sun (May–Jul)**
- Site-AI darkness model forces darkness to 0
- ADS becomes < 30 (darkness weight is 0)
- State returns UNLIKELY
- /live shows: "Not worth it now. Aurora not visible during midnight sun season"

---

## Enforcement Rules

**These rules prevent decision logic from creeping into /live components:**

1. **No Threshold Checks**
   ```typescript
   // ❌ FORBIDDEN
   if (cloudCover > 60) { ... }
   if (kpIndex < 3) { ... }
   if (ads >= 70) { ... }
   ```
   → Use Site-AI's decision state instead.

2. **No Independent Classification**
   ```typescript
   // ❌ FORBIDDEN
   const getProbabilityLevel = (prob) => {
     if (prob >= 50) return 'excellent';
     ...
   }
   ```
   → Site-AI already classifies. Just interpret via adapter.

3. **No Conditional Logic Based on Forecast Values**
   ```typescript
   // ❌ FORBIDDEN
   if (selectedForecast.currentProbability > 30) { ... }
   ```
   → Always consume Site-AI decision first.

4. **All Messages from Site-AI**
   ```typescript
   // ✅ CORRECT
   return liveAdapterOutput.reason; // From deterministic Site-AI templates

   // ❌ FORBIDDEN
   return `Conditions are ${cloudCover}% cloudy`; // Free-form inference
   ```

5. **Comment Every Component**
   ```typescript
   // All decisions from Site-AI, no logic here
   // liveAdapterOutput interprets SiteAIDecision for immediate actionability
   ```

---

## Integration with /forecast

**Both /live and /forecast use the same Site-AI decision.** They differ only in presentation:

| Aspect | /forecast | /live |
|--------|-----------|-------|
| **Data** | Same SiteAIDecision | Same SiteAIDecision |
| **Horizon** | 48-hour detailed breakdown | ±90 min immediate action |
| **Message** | Full Site-AI explanation | Shortened "go/don't" guidance |
| **UI** | Grid of 48 ADS windows, banners | Confidence chip, advice message |
| **Refresh** | 1 hour (forecast stability) | 15 min (real-time feel) |

**Consistency Guarantee:** If /forecast shows EXCELLENT, /live shows "go". If /forecast shows UNLIKELY, /live shows "not worth it".

---

## Future Enhancements

- [ ] Real-time KP trend detection (currently hardcoded to 'stable')
- [ ] User location auto-select based on geolocation
- [ ] Notifications when state transitions (e.g., UNLIKELY → POSSIBLE)
- [ ] Time-based messaging ("Check back in 2 hours")
- [ ] Multi-location comparison ("Better in Alta than Tromsø")

---

## Summary

**The /live view is Site-AI's real-time UI.** It has no decision logic because all decisions come from Site-AI's deterministic orchestrator. Components are thin, reactive, and purely interpretive. Arctic handling is automatic. Messages are deterministic. Consistency with /forecast is guaranteed.

For any changes to /live aurora logic, modify Site-AI instead. For changes to how /live _renders_ Site-AI decisions, modify `liveAdapter.ts` or components, but never add new thresholds or comparisons.
