# Implementation Plan: Single Source of Truth for Aurora Data

## Executive Summary
Transform aurora.tromso.ai data architecture from fragmented fetching to a unified Single Source of Truth (SSOT), reducing API calls by ~80% and eliminating data inconsistencies across pages.

---

## Current State Analysis

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────┐
│          CURRENT PROBLEMATIC ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  AuroraDataContext          MasterStatusContext             │
│  (useAuroraData hook)       (independent)                   │
│          │                          │                        │
│          ├─ /api/aurora/tonight     ├─ /api/aurora/now      │
│          ├─ /api/weather/*/         ├─ /api/weather/*/      │
│          └─ /api/aurora/hourly      │                        │
│                                      │                        │
│  ✅ 5 min cache                     ✅ 5 min refresh         │
│  ✅ localStorage caching            ❌ No cache              │
│  ❌ Different KP source             ❌ Different KP source   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Critical Issues Identified

#### 1. **Data Source Fragmentation**
- **AuroraDataContext**: Fetches `/api/aurora/tonight` (15 min cache)
- **MasterStatusContext**: Fetches `/api/aurora/now` (5 min cache) independently
- **Result**: Two separate KP sources → inconsistent values on same page

#### 2. **API Call Redundancy**
Current page load (Home):
- `/api/aurora/tonight` (AuroraDataContext)
- `/api/aurora/now` (MasterStatusContext)
- `/api/weather/{lat}/{lon}` × N spots (AuroraDataContext)
- `/api/aurora/hourly` × N spots (AuroraDataContext)
- **Total**: 3-12+ API calls per page load

#### 3. **Cache Duration Mismatch**
- `/api/aurora/now`: 5 min server cache
- `/api/aurora/tonight`: 15 min server cache
- `/api/aurora/hourly`: 60 min server cache
- **Result**: Hourly forecast can be 1 hour stale while current KP is 5 min fresh

#### 4. **Probability Calculation Inconsistency**
Three different calculation paths:
1. `calculateAuroraProbability()` in probabilityCalculator.ts (used by AuroraData)
2. `calculateMasterStatus()` in masterStatus.ts (uses pre-calculated probability)
3. Old signature in `/api/aurora/tonight` route (5 params vs object)

#### 5. **No Unified Timestamp**
- `AuroraDataContext.lastUpdate`: When hook last fetched
- `AuroraDataContext.dataTimestamp`: When API data was generated
- `MasterStatusContext.lastUpdated`: When status was calculated
- **Result**: No way to know if all data is from same "moment"

---

## Target Architecture

### Single Source of Truth Design
```
┌─────────────────────────────────────────────────────────────┐
│          NEW UNIFIED ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│             AuroraDataContext (MASTER)                       │
│                      │                                       │
│         ┌────────────┴────────────┐                         │
│         │                          │                         │
│   /api/aurora/now          localStorage cache               │
│   (5 min server cache)     (5 min client cache)             │
│         │                          │                         │
│         └──────────┬───────────────┘                         │
│                    │                                         │
│              Unified State                                   │
│        ┌───────────┴───────────┐                            │
│        │                        │                            │
│   currentKp                viewingProbability                │
│   lastUpdated (timestamp)  spotForecasts[]                  │
│   extendedMetrics          weatherData                       │
│                                                              │
│                    ▼                                         │
│          MasterStatusContext                                 │
│          (consumes from AuroraData)                          │
│          - No independent fetching                           │
│          - Recalculates GO/WAIT/NO from shared data          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow
1. **AuroraDataContext** fetches `/api/aurora/now` every 5 minutes
2. **Includes extended metrics** (solar wind, BZ GSM, etc.) from same endpoint
3. **Caches** in localStorage for instant page navigation
4. **MasterStatusContext** subscribes to AuroraDataContext state
5. **All pages** consume same synchronized data

---

## Implementation Tasks

### Phase 1: Refactor useAuroraData Hook (Core Foundation)
**File**: `/src/hooks/useAuroraData.ts`

#### Changes:
1. **Switch primary endpoint** from `/api/aurora/tonight` → `/api/aurora/now`
   - Line 155: `await tromsøAIService.getTonight(language)` → `getAuroraNow(language)`
   - Ensure `/api/aurora/now` includes extended_metrics in response

2. **Consolidate weather fetching**
   - Current: Fetches weather per spot individually (lines 167-175)
   - **New**: Fetch all spot weather in single parallel batch
   - **Optimization**: Use Promise.allSettled to handle failures gracefully

3. **Update cache key and duration**
   - Line 34: Rename `CACHE_KEY` to `'aurora-data-unified-cache'`
   - Ensure 5-minute consistency with server cache

4. **Add unified timestamp tracking**
   ```typescript
   interface AuroraState {
     currentKp: number;
     globalProbability: number;
     bzGsm: number | undefined;      // From extended_metrics
     solarSpeed: number | undefined; // From extended_metrics
     spotForecasts: SpotForecast[];
     selectedSpot: ObservationSpot;
     isLoading: boolean;
     lastUpdate: Date;               // When context fetched
     dataTimestamp: Date;            // When API data was generated
     serverCacheAge: number;         // Age of server cache in ms
     error: string | null;
     predictiveHint: string | null;
     extendedMetrics: ExtendedMetrics | null;
   }
   ```

5. **Remove hourly forecast redundant fetching**
   - Lines 178-183: Currently fetches `/api/aurora/hourly` per spot
   - **Decision**: Keep or remove?
   - **Recommendation**: Keep but optimize with batch endpoint

#### Testing Checklist:
- [ ] Verify `/api/aurora/now` returns extended_metrics
- [ ] Test cache invalidation after 5 minutes
- [ ] Verify all spots get weather data
- [ ] Test error handling with fallback to cache
- [ ] Verify KP index consistency across all consumers

---

### Phase 2: Refactor MasterStatusContext (Remove Independence)
**File**: `/src/contexts/MasterStatusContext.tsx`

#### Changes:
1. **Remove independent fetching** (lines 74-80)
   - Delete `fetch('/api/aurora/now')` call
   - Delete `fetch('/api/weather/')` call

2. **Subscribe to AuroraDataContext**
   ```typescript
   import { useAuroraDataContext } from './AuroraDataContext';

   export function MasterStatusProvider({ children, latitude, longitude }: Props) {
     const auroraData = useAuroraDataContext();

     // Use data from context instead of fetching
     const kpIndex = auroraData.currentKp;
     const selectedForecast = auroraData.selectedSpotForecast;
     const cloudCoverage = selectedForecast?.weather.cloudCoverage ?? 50;
     const probability = selectedForecast?.currentProbability ?? 0;

     // Calculate master status using shared data
     const statusResult = calculateMasterStatus({
       probability,
       cloudCoverage,
       kpIndex,
       sunElevation: calculateSunElevation(latitude, longitude, new Date()),
       latitude,
       longitude,
     });
   }
   ```

3. **Synchronize refresh timing**
   - Remove `useEffect` interval (lines 137-140)
   - Recalculate when `auroraData.lastUpdate` changes
   - Use `useMemo` for performance

4. **Update lastUpdated tracking**
   - Use `auroraData.dataTimestamp` as source of truth

#### Testing Checklist:
- [ ] Verify GO/WAIT/NO decision matches manual calculation
- [ ] Test that status updates when aurora data refreshes
- [ ] Verify no independent API calls from MasterStatus
- [ ] Test with stale aurora data (should show loading/error state)

---

### Phase 3: Cleanup Redundant Fetching in Pages
**Files**:
- `/src/app/page.tsx` (Home)
- `/src/app/forecast/page.tsx`
- `/src/app/live/page.tsx`

#### Changes for Home (`/src/app/page.tsx`):
1. **Remove fetchExtendedMetrics()** if it exists (lines ~96-149)
   - **Status**: Already removed ✅

2. **Use extendedMetrics from context**
   ```typescript
   const { extendedMetrics, currentKp, selectedSpotForecast } = useAuroraDataContext();
   ```

3. **Verify MasterStatusCard uses context data**

#### Changes for Forecast (`/src/app/forecast/page.tsx`):
1. **Verify no independent fetching**
2. **Use AuroraDataContext for all regional forecasts**

#### Changes for Live (`/src/app/live/page.tsx`):
1. **Keep useAuroraLive hook** (for aurora oval polygon)
2. **Use AuroraDataContext for spot forecasts and KP**

#### Testing Checklist:
- [ ] Home page loads with single API call
- [ ] Forecast page shows consistent KP with Home
- [ ] Live map shows synchronized data
- [ ] Navigation between pages uses cached data (no re-fetch)

---

### Phase 4: API Route Consolidation
**File**: `/src/app/api/aurora/now/route.ts`

#### Changes:
1. **Ensure extended_metrics is included** in response
   - Lines 86-106 already provide it ✅
   - Verify structure matches ExtendedMetrics type

2. **Standardize cache headers**
   ```typescript
   export const revalidate = 300; // 5 minutes
   ```

3. **Add data freshness indicators**
   ```typescript
   return NextResponse.json({
     ...auroraData,
     serverTimestamp: new Date().toISOString(),
     cacheAge: cacheAgeInSeconds,
   });
   ```

#### Optional: Consider deprecating `/api/aurora/tonight`
- If all consumers migrate to `/api/aurora/now`
- Add deprecation warning in response
- Remove after migration is complete

---

### Phase 5: UI Data Standardization
**Files**:
- `/src/components/aurora/AuroraStatusCard.tsx`
- `/src/components/aurora/MasterStatusCard.tsx`
- `/src/components/aurora/DataConsistencyIndicator.tsx`

#### Changes:

1. **Separate "Space Metrics" from "Local Viewing"**
   - **Current**: "KP 3.0 · 0%" (ambiguous)
   - **New**:
     ```
     ┌─────────────────────────────┐
     │ Space Activity: KP 3.0 🌌   │
     │ Local Viewing: 72% 🟢      │
     └─────────────────────────────┘
     ```

2. **Add unified timestamp display**
   ```typescript
   // Show single timestamp for all data
   Updated: {formatDistance(auroraData.dataTimestamp, new Date())} ago
   ```

3. **DataConsistencyIndicator improvements**
   - Show server cache age
   - Show last successful fetch
   - Warning if data >10 minutes old
   ```typescript
   <div className="text-xs text-white/50">
     Data age: {Math.round(serverCacheAge / 1000 / 60)} min
     {serverCacheAge > 10 * 60 * 1000 && (
       <span className="text-yellow-500"> ⚠️ Stale</span>
     )}
   </div>
   ```

---

### Phase 6: Performance Optimizations

#### 1. **Implement React Query for Better Caching**
**File**: `/src/hooks/useAuroraData.ts`

Current implementation uses custom localStorage cache. Consider migrating to React Query:
```typescript
import { useQuery } from '@tanstack/react-query';

export function useAuroraData() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['aurora-data'],
    queryFn: async () => {
      const response = await fetch('/api/aurora/now');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh
  });

  // Transform data for compatibility
  return transformAuroraData(data);
}
```

**Benefits**:
- Automatic background refetching
- Shared cache across all components
- Built-in loading/error states
- Deduplication of requests

#### 2. **Batch Weather Fetching**
Instead of fetching weather per spot:
```typescript
// Current (N requests):
for (const spot of spots) {
  await fetch(`/api/weather/${spot.lat}/${spot.lon}`);
}

// New (1 request):
const coords = spots.map(s => `${s.lat},${s.lon}`).join('|');
await fetch(`/api/weather/batch?coords=${coords}`);
```

**Requires**: New `/api/weather/batch` endpoint

#### 3. **Lazy Load Non-Critical Data**
- Load extended metrics only when user views Home page
- Load hourly forecast only when user expands timeline
- Implement "load more" for spot forecasts

---

## Migration Strategy

### Step 1: Feature Flag (Safe Rollout)
Add feature flag to toggle between old and new architecture:
```typescript
// /src/lib/features/dataArchitecture.ts
export const USE_UNIFIED_DATA_SOURCE = process.env.NEXT_PUBLIC_UNIFIED_DATA === 'true';

// In useAuroraData.ts
const endpoint = USE_UNIFIED_DATA_SOURCE
  ? '/api/aurora/now'
  : '/api/aurora/tonight';
```

### Step 2: Parallel Running (Verification)
Run both systems in parallel for 24 hours:
- Log discrepancies to Sentry
- Compare KP values, probabilities, timestamps
- Identify edge cases

### Step 3: Gradual Rollout
1. **Day 1**: 10% of traffic
2. **Day 2**: 50% of traffic
3. **Day 3**: 100% of traffic
4. **Day 4**: Remove old code

### Step 4: Cleanup
After successful migration:
- Delete `/api/aurora/tonight` route
- Remove old cache keys from localStorage
- Update documentation

---

## Testing Plan

### Unit Tests
- [ ] `useAuroraData` hook returns consistent data structure
- [ ] Cache invalidation works correctly (5 min expiry)
- [ ] Fallback to cache on error
- [ ] Spot selection persists to localStorage

### Integration Tests
- [ ] Home page shows consistent KP and probability
- [ ] Forecast page uses same data source
- [ ] Live map synchronizes with forecast
- [ ] Navigation preserves cached data
- [ ] Refresh button updates all components

### E2E Tests (Playwright)
```typescript
test('Data consistency across pages', async ({ page }) => {
  await page.goto('/');
  const homeKp = await page.locator('[data-testid="kp-value"]').textContent();

  await page.goto('/forecast');
  const forecastKp = await page.locator('[data-testid="kp-value"]').textContent();

  expect(homeKp).toBe(forecastKp);
});

test('Cache works on navigation', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const apiCallsBefore = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/aurora')).length);

  await page.goto('/forecast');
  await page.waitForLoadState('networkidle');

  const apiCallsAfter = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/aurora')).length);

  expect(apiCallsAfter - apiCallsBefore).toBe(0); // Should use cache
});
```

### Performance Benchmarks
**Metrics to track**:
- API calls per page load: Target <2 (vs current 3-12)
- Time to interactive: Target <2s
- Cache hit rate: Target >80%
- Data freshness: Always <5 min old

---

## Rollback Plan

If issues are detected:
1. **Immediate**: Set `USE_UNIFIED_DATA_SOURCE=false` in env
2. **Deploy**: Redeploy with feature flag off
3. **Investigate**: Review Sentry logs for errors
4. **Fix**: Address root cause
5. **Retry**: Gradual rollout again

---

## Success Metrics

### Technical Metrics
- ✅ API calls reduced from 3-12 to 1-2 per page load (~80% reduction)
- ✅ Data consistency: 0 KP mismatches between pages
- ✅ Cache hit rate >80%
- ✅ All data <5 minutes old

### User Experience Metrics
- ✅ Reduced page load time by >30%
- ✅ Faster navigation (instant from cache)
- ✅ Clear data presentation (Space vs Local metrics)
- ✅ Visible timestamp on all data

---

## Files to Modify

### Core Changes (Required)
1. ✅ `/src/hooks/useAuroraData.ts` - Switch to /api/aurora/now
2. ✅ `/src/contexts/MasterStatusContext.tsx` - Subscribe to AuroraData
3. ⚠️ `/src/app/page.tsx` - Remove redundant fetching (already done)
4. ⚠️ `/src/app/forecast/page.tsx` - Verify no independent fetching
5. ⚠️ `/src/app/live/page.tsx` - Use context for KP/forecasts

### API Changes (Required)
6. ✅ `/src/app/api/aurora/now/route.ts` - Ensure extended_metrics
7. ⚠️ `/src/app/api/aurora/tonight/route.ts` - Deprecate (optional)

### UI Changes (Required)
8. ⚠️ `/src/components/aurora/AuroraStatusCard.tsx` - Separate metrics
9. ⚠️ `/src/components/aurora/MasterStatusCard.tsx` - Use context data
10. ⚠️ `/src/components/aurora/DataConsistencyIndicator.tsx` - Show cache age

### Optimizations (Optional)
11. ⚠️ `/src/app/api/weather/batch/route.ts` - Batch weather endpoint (new file)
12. ⚠️ `/src/lib/features/dataArchitecture.ts` - Feature flag (new file)

---

## Timeline Estimate

### Phase 1: Foundation (Day 1-2)
- Refactor useAuroraData hook
- Update MasterStatusContext
- Add feature flag

### Phase 2: Integration (Day 3)
- Update page components
- Add unified timestamps
- Cleanup redundant code

### Phase 3: Testing (Day 4)
- Unit tests
- Integration tests
- E2E tests

### Phase 4: Rollout (Day 5-7)
- 10% traffic (Day 5)
- 50% traffic (Day 6)
- 100% traffic (Day 7)

### Phase 5: Cleanup (Day 8)
- Remove old code
- Update documentation
- Monitor metrics

**Total**: 8 days

---

## Dependencies & Risks

### Dependencies
- ✅ `/api/aurora/now` must include extended_metrics
- ✅ React Query already configured in client-layout.tsx
- ⚠️ Supabase may need schema updates if storing timestamps

### Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data inconsistency during migration | Medium | High | Feature flag + parallel running |
| Cache invalidation bugs | Low | Medium | Extensive testing + manual refresh button |
| Performance regression | Low | Medium | Performance benchmarks + rollback plan |
| User confusion from UI changes | Low | Low | A/B testing + user feedback |

---

## Post-Migration Optimizations

After successful migration, consider:
1. **Server-Side Rendering**: Pre-fetch aurora data at build time
2. **Edge Caching**: Move from client to edge cache (Vercel/Cloudflare)
3. **WebSocket Real-time Updates**: Push updates instead of polling
4. **GraphQL Migration**: Single query for all related data

---

## Appendix: API Response Comparison

### Current `/api/aurora/tonight` Response
```json
{
  "score": 75,
  "updated": "2026-01-14T12:00:00Z",
  "extended_metrics": null
}
```

### Target `/api/aurora/now` Response
```json
{
  "score": 75,
  "updated": "2026-01-14T12:00:00Z",
  "serverTimestamp": "2026-01-14T12:05:00Z",
  "cacheAge": 300,
  "extended_metrics": {
    "solarWind": {
      "speed": 450,
      "density": 5.2,
      "bzGsm": -8.3
    },
    "geomagneticActivity": {
      "kp": 3.0,
      "dst": -15
    }
  }
}
```

---

## Questions for Stakeholders

Before implementation:
1. ✅ Can we deprecate `/api/aurora/tonight` or must we maintain backwards compatibility?
2. ⚠️ Should we implement batch weather endpoint or optimize client-side?
3. ⚠️ Do we need React Query migration or keep custom cache?
4. ⚠️ Should hourly forecast be lazy-loaded or pre-fetched?

---

**End of Implementation Plan**
