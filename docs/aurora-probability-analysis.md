# Aurora Probability Calculation - Technical Analysis & Findings

## Executive Summary

This document details the aurora probability calculation system, identified inconsistencies between `/live` and `/forecast` pages, implemented fixes, and recommendations for future improvements.

**Date:** 2026-01-15
**Version:** 1.0
**Status:** Issues Resolved

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Probability Calculation Formula](#probability-calculation-formula)
3. [Critical Findings](#critical-findings)
4. [Implemented Solutions](#implemented-solutions)
5. [Current Weaknesses](#current-weaknesses)
6. [Alternative Solutions](#alternative-solutions)
7. [Testing & Verification](#testing--verification)

---

## System Architecture

### Data Flow Overview

```
API Layer (/api/aurora/hourly)
    ↓
Data Mapping (tromsoAIMapper.ts)
    ↓
Probability Calculator (probabilityCalculator.ts)
    ↓
Frontend Hooks (useAuroraData.ts)
    ↓
UI Components (/live, /forecast)
```

### Key Components

#### 1. API Endpoints

**`/api/aurora/hourly`**
- Returns 48-hour forecast per location
- Includes weather data (cloud coverage, temperature, wind)
- Contains location-specific KP index
- Caches data per location per hour

**Location-specific cache key format:**
```typescript
`${year}-${month}-${date}-${hour}-${hours}-${location}`
```

#### 2. Data Mapping Layer

**File:** `src/lib/tromsoAIMapper.ts`

**Purpose:** Converts API data into `SpotForecast` format

**Key Function:** `mapTromsøForecastToSpotForecast()`

**Inputs:**
- `forecast` - Global aurora forecast
- `spot` - Observation location
- `weatherData` - Optional weather override
- `hourlyApiData` - 48-hour detailed forecast

**Outputs:**
```typescript
{
  spot: ObservationSpot,
  currentProbability: number,  // Calculated for "now"
  weather: WeatherData,
  hourlyForecast: HourlyForecast[],  // 48 hours
  bestViewingTime: string,
  canView: boolean
}
```

#### 3. Probability Calculator

**File:** `src/lib/calculations/probabilityCalculator.ts`

**Function:** `calculateAuroraProbability()`

**Weighted Scoring System:**

```typescript
Total = (KP × 40%) + (Cloud × 35%) + (Temp × 10%) + (Lat × 10%) + (Moon × 5%)
```

**Component Details:**

| Factor | Weight | Scoring Logic |
|--------|--------|---------------|
| **KP Index** | 40% | `(kp / 9) × 100` |
| **Cloud Coverage** | 35% | <30%: 100, <50%: 80, <70%: 40, <90%: 15, ≥90%: 0 |
| **Temperature** | 10% | <-10°C: 100, <0°C: 80, <10°C: 50, ≥10°C: 20 |
| **Latitude** | 10% | >68°: 100, >66°: 80, >64°: 60, ≤64°: 40 |
| **Moon Phase** | 5% | `(1 - |phase - 0.5| × 2) × 100` |

**Critical Notes:**
- Cloud coverage has aggressive penalty above 70%
- Temperature scoring favors colder conditions
- Daylight hours return 0% probability automatically

---

## Probability Calculation Formula

### Mathematical Model

```
probability = ROUND(
  (kpScore × 0.40) +
  (cloudScore × 0.35) +
  (tempScore × 0.10) +
  (latScore × 0.10) +
  (moonScore × 0.05)
)
```

### Example Calculation: Grunnfjord

**Input Data:**
- Location: Grunnfjord (70.05°N, 18.95°E)
- KP Index: 6.0
- Cloud Coverage: 21%
- Temperature: 4°C
- Moon Phase: 0.5 (default)

**Step-by-Step:**

1. **KP Score:** `(6 / 9) × 100 = 66.67`
2. **Cloud Score:** `21% < 30% = 100`
3. **Temp Score:** `4°C < 10°C = 50`
4. **Latitude Score:** `70.05° > 68° = 100`
5. **Moon Score:** `(1 - |0.5 - 0.5| × 2) × 100 = 50`

**Weighted Sum:**
```
(66.67 × 0.40) + (100 × 0.35) + (50 × 0.10) + (100 × 0.10) + (50 × 0.05)
= 26.67 + 35 + 5 + 10 + 2.5
= 79.17
≈ 79%
```

### Sensitivity Analysis

**Impact of KP Changes (with Grunnfjord conditions):**

| KP | Probability | Change |
|----|-------------|--------|
| 3.5 | 68% | baseline |
| 4.0 | 70% | +2% |
| 4.5 | 73% | +5% |
| 5.0 | 75% | +7% |
| 6.0 | 79% | +11% |
| 7.0 | 83% | +15% |

**Observation:** 1 KP unit ≈ 4.4% probability change (40% weight / 9 KP range)

---

## Critical Findings

### Issue 1: KP Index Inconsistency (RESOLVED)

#### Problem Description

Different pages showed different probability values for the same location at the same time.

**Example: Grunnfjord at 18:30**

| Source | Probability | KP Used | Data Source |
|--------|-------------|---------|-------------|
| `/live` | 79% | 6.0 | `hourlyForecast[0].kpIndex` |
| `/forecast` | 68% | 3.5 | `forecast.kp` (global) |
| API response | 57% | 6.0 | Supabase pre-calculated |

#### Root Cause

**File:** `src/lib/tromsoAIMapper.ts:44` (before fix)

```typescript
// BEFORE (INCORRECT):
const kpIndex = forecast.kp ?? scoreToKpIndex(forecast.score);
// Used GLOBAL KP for all locations

// Extract current weather from hour 0
const hour0Weather = hourlyApiData?.[0]?.weather;

// Calculate currentProbability with GLOBAL KP
const { probability } = calculateAuroraProbability({
  kpIndex,  // ❌ Global value
  cloudCoverage,
  temperature,
  ...
});
```

**Meanwhile, hourly forecast used location-specific KP:**

```typescript
// Later in same file (line 68-83)
hourlyForecast = hourlyApiData.map((apiHour) => {
  const calculatedProb = calculateAuroraProbability({
    kpIndex: apiHour.kp,  // ✅ Location-specific
    cloudCoverage: apiHour.weather.cloudCoverage,
    ...
  });
  return { probability: calculatedProb.probability, ... };
});
```

**Result:** `currentProbability` ≠ `hourlyForecast[0].probability`

#### Impact

- `/live` badges showed `hourlyForecast[0].probability` (79%)
- `/forecast` regional view showed `currentProbability` (68%)
- Timeline animation at +0t showed different value than static badges
- User confusion when comparing pages

---

### Issue 2: Regional Weather Aggregation (RESOLVED)

#### Problem Description

`/forecast` regional view displayed misleading weather data.

**Example: Troms Region**

```
Displayed:
  Best Location: Grunnfjord (66%)
  Cloud Coverage: 21%
  Temperature: 4°C

User Expectation:
  Weather data FROM Grunnfjord

Actual Reality (before fix):
  Weather data = AVERAGE of all Troms locations
  (Tromsø, Sommarøy, Grøtfjord, Grunnfjord, Svensby, etc.)
```

#### Root Cause

**File:** `src/lib/calculations/regionalForecast.ts:46-49` (before fix)

```typescript
// BEFORE (INCORRECT):
const maxProb = Math.max(...regionSpots.map(sf => sf.currentProbability));
const bestSpot = regionSpots.find(sf => sf.currentProbability === maxProb)?.spot;

// ❌ Used regional AVERAGE weather
const avgCloud = regionSpots.reduce(
  (sum, sf) => sum + sf.weather.cloudCoverage, 0
) / regionSpots.length;

const avgTemp = regionSpots.reduce(
  (sum, sf) => sum + sf.weather.temperature, 0
) / regionSpots.length;
```

#### Impact

- Best location probability came from one spot (e.g., Grunnfjord 66%)
- Weather data came from averaging ALL spots in region
- Mismatch confused users comparing `/forecast` to `/live`
- Inaccurate representation of conditions at recommended location

---

## Implemented Solutions

### Solution 1: Location-Specific KP for currentProbability

**File:** `src/lib/tromsoAIMapper.ts:44`

**Commit:** `92e5276`

```typescript
// AFTER (CORRECT):
// Extract current weather from hour 0 if hourly data available
const hour0Weather = hourlyApiData?.[0]?.weather;

// Use location-specific KP from hourly data if available
// This ensures consistency between currentProbability and hourlyForecast[0]
const kpIndex = hourlyApiData?.[0]?.kp
  ?? forecast.kp
  ?? scoreToKpIndex(forecast.score);

// Now currentProbability uses location-specific KP
const { probability } = calculateAuroraProbability({
  kpIndex,  // ✅ Location-specific
  cloudCoverage,
  temperature,
  ...
});
```

**Result:**
- `currentProbability` now matches `hourlyForecast[0].probability`
- `/live` and `/forecast` show identical values for same location
- Consistency across all pages

---

### Solution 2: Best Spot Weather in Regional View

**File:** `src/lib/calculations/regionalForecast.ts:46-49`

**Commit:** `92e5276`

```typescript
// AFTER (CORRECT):
const maxProb = Math.max(...regionSpots.map(sf => sf.currentProbability));

// Find the best spot forecast (not just the spot)
const bestSpotForecast = regionSpots.find(
  sf => sf.currentProbability === maxProb
);
const bestSpot = bestSpotForecast?.spot || null;

// ✅ Use weather data from the BEST SPOT (not regional average)
// This ensures weather shown matches the location being recommended
const avgCloud = bestSpotForecast?.weather.cloudCoverage ?? 50;
const avgTemp = bestSpotForecast?.weather.temperature ?? -5;
```

**Result:**
- Regional view now shows actual weather from recommended location
- `/forecast` regional cards match individual location data
- Honest representation of conditions at "best spot"

---

### Solution 3: Timeline Animation Data Consistency

**File:** `src/components/aurora/AuroraMapFullscreen.tsx:573`

**Previous commit:** Part of timeline animation fix

```typescript
// Prioritize API's pre-calculated probability
const apiProbability = (hourData as any).probability;

if (apiProbability !== undefined && apiProbability !== null) {
  // ✅ Use pre-calculated probability from API (preferred)
  displayProbability = apiProbability;
} else if (hourIndex === 0) {
  // Fallback: use current probability for time 0
  displayProbability = forecast.currentProbability;
} else {
  // Fallback: calculate if API value missing
  const calculatedProb = calculateAuroraProbability({...});
  displayProbability = calculatedProb.probability;
}
```

**Result:**
- Timeline uses API's hourly probabilities with location-specific KP
- No fallback to uniform 45% at +1t
- Smooth variations throughout 12-hour animation

---

## Current Weaknesses

### 1. API Pre-Calculation Mismatch

**Issue:** Supabase Edge Function returns pre-calculated probabilities (e.g., 57%) that differ from frontend calculations (e.g., 79%)

**Why It Happens:**
- Backend uses different calculation method or parameters
- Frontend recalculates using same inputs but gets different result
- Currently, frontend **ignores** API probability and recalculates

**Impact:**
- Wasted API bandwidth sending unused probability values
- Potential for divergence if backend formula changes
- Confusion when debugging (API says 57%, UI shows 79%)

**Risk Level:** Medium

---

### 2. Type System Inconsistency

**Issue:** Mixed use of `kp` vs `kpIndex` across codebase

**Examples:**
```typescript
// HourlyForecast type uses kpIndex
interface HourlyForecast {
  kpIndex: number;  // ✅
}

// But API data uses kp
hourlyApiData[0].kp  // ✅

// And forecast object uses kp
forecast.kp  // ✅
```

**Recent Fix:**
```typescript
// src/components/aurora/AuroraLiveMap.tsx:114
// BEFORE: const locationKp = sf.hourlyForecast?.[0]?.kp ?? currentKp;
// AFTER:  const locationKp = sf.hourlyForecast?.[0]?.kpIndex ?? currentKp;
```

**Impact:**
- TypeScript errors during build
- Requires manual fixes when accessing properties
- Developer confusion

**Risk Level:** Low (caught by TypeScript)

---

### 3. Regional KP Still Uses First Spot

**Issue:** Regional forecasts use KP from first spot arbitrarily

**File:** `src/lib/calculations/regionalForecast.ts:52`

```typescript
// Takes KP from first spot in region (arbitrary)
const kpIndex = regionSpots[0]?.hourlyForecast?.[0]?.kpIndex || 3;
```

**Why This Is Wrong:**
- KP varies by location (as we discovered)
- First spot may not be the best spot
- Inconsistent with using "best spot" for other data

**Impact:**
- Regional KP display may not match best spot's actual KP
- Minor UX inconsistency
- Not critical since KP is shown per-location in detail views

**Risk Level:** Low

---

### 4. Hardcoded Fallback Values

**Issue:** Multiple hardcoded defaults scattered throughout codebase

**Examples:**
```typescript
// regionalForecast.ts:48-49
const avgCloud = bestSpotForecast?.weather.cloudCoverage ?? 50;
const avgTemp = bestSpotForecast?.weather.temperature ?? -5;

// regionalForecast.ts:52
const kpIndex = regionSpots[0]?.hourlyForecast?.[0]?.kpIndex || 3;

// tromsoAIMapper.ts:47-49
const cloudCoverage = hour0Weather?.cloudCoverage ?? 50;
const temperature = hour0Weather?.temperature ?? 0;
const windSpeed = hour0Weather?.windSpeed ?? 5;
```

**Problems:**
- No centralized configuration
- Magic numbers reduce maintainability
- Unclear why specific values chosen (why 50% clouds? why -5°C?)

**Impact:**
- Harder to tune default behavior
- Risk of inconsistent defaults across codebase

**Risk Level:** Low

---

### 5. No Validation of Calculation Inputs

**Issue:** `calculateAuroraProbability()` doesn't validate input ranges

**Examples of potential issues:**
```typescript
// What if KP > 9 or KP < 0?
kpScore = (inputs.kpIndex / 9) * 100;  // Could exceed 100

// What if cloudCoverage > 100 or < 0?
// What if temperature is extreme (e.g., +50°C or -100°C)?
// What if latitude is invalid?
```

**Impact:**
- Potentially invalid probability calculations
- No warnings when data quality is poor
- Difficult to debug calculation errors

**Risk Level:** Medium

---

### 6. Moon Phase Ignored in Most Cases

**Issue:** Moon phase has 5% weight but is rarely provided

**Code:**
```typescript
// probabilityCalculator.ts:92-94
const moonScore = inputs.moonPhase
  ? (1 - Math.abs(inputs.moonPhase - 0.5) * 2) * 100
  : 50;  // ← Always defaults to 50 (neutral)
```

**Impact:**
- Missing 5% of potential accuracy
- Moon phase is relevant for aurora visibility (brightness contrast)
- Easy to implement but not prioritized

**Risk Level:** Low (small weight)

---

## Alternative Solutions

### Alternative 1: Backend-Driven Probabilities

**Concept:** Trust backend calculations instead of recalculating on frontend

**Advantages:**
- Single source of truth
- Consistent across all clients (web, mobile, API users)
- Can use more sophisticated models on backend
- Reduced frontend computation

**Disadvantages:**
- Less transparency (users can't see formula)
- Harder to debug discrepancies
- Backend changes affect all clients immediately
- Network dependency for calculations

**Implementation:**
```typescript
// tromsoAIMapper.ts
export function mapTromsøForecastToSpotForecast(...) {
  // Use API's pre-calculated probability directly
  const probability = hourlyApiData?.[0]?.probability
    ?? calculateAuroraProbability({...}).probability;

  return {
    currentProbability: probability,  // ✅ Trust backend
    hourlyForecast: hourlyApiData.map(hour => ({
      probability: hour.probability,  // ✅ All from backend
      ...
    }))
  };
}
```

**Recommendation:** Consider for future if backend calculation is validated

---

### Alternative 2: Separate Regional vs Individual Calculations

**Concept:** Use different formulas for regional overview vs individual locations

**Regional Formula (broader view):**
```typescript
// Emphasize KP more (regional aurora activity)
const regionalProb =
  (kpScore × 0.50) +    // KP: 50% weight
  (cloudScore × 0.30) + // Clouds: 30% weight
  (latScore × 0.15) +   // Latitude: 15% weight
  (moonScore × 0.05);   // Moon: 5% weight
```

**Individual Formula (current):**
```typescript
// Emphasize local weather more
const individualProb =
  (kpScore × 0.40) +    // KP: 40% weight
  (cloudScore × 0.35) + // Clouds: 35% weight
  (tempScore × 0.10) +  // Temp: 10% weight
  (latScore × 0.10) +   // Latitude: 10% weight
  (moonScore × 0.05);   // Moon: 5% weight
```

**Advantages:**
- Regional view shows broader aurora activity trends
- Individual view shows precise local viewing conditions
- Clearer differentiation between pages

**Disadvantages:**
- More complex to maintain
- Users might be confused by different values
- Harder to explain methodology

**Recommendation:** Not recommended - adds complexity without clear benefit

---

### Alternative 3: Time-Decay Weighting

**Concept:** Reduce confidence in forecasts further into the future

**Current State:**
- All 48 hours weighted equally
- Hour 1 and Hour 48 calculated with same confidence

**Proposed:**
```typescript
function calculateAuroraProbability(inputs, hoursAhead = 0) {
  // Base calculation
  const baseProb = calculateWeightedScore(inputs);

  // Apply time decay
  const decayFactor = Math.max(0.7, 1 - (hoursAhead * 0.01));
  const adjustedProb = baseProb * decayFactor;

  return {
    probability: Math.round(adjustedProb),
    confidence: decayFactor,
    ...
  };
}
```

**Example:**
- Hour 0: 79% × 1.00 = 79% (high confidence)
- Hour 12: 79% × 0.88 = 70% (good confidence)
- Hour 24: 79% × 0.76 = 60% (moderate confidence)
- Hour 48: 79% × 0.70 = 55% (lower confidence)

**Advantages:**
- More realistic representation of forecast uncertainty
- Encourages users to check closer to viewing time
- Matches meteorological best practices

**Disadvantages:**
- May confuse users ("Why did probability drop?")
- Backend already provides accurate hourly forecasts
- Adds complexity

**Recommendation:** Consider if user feedback indicates over-reliance on distant forecasts

---

### Alternative 4: Machine Learning Model

**Concept:** Replace formula-based calculation with ML model

**Training Data:**
- Historical KP values
- Historical weather conditions
- Actual aurora sightings (user reports)
- Location data

**Model Output:**
- Probability of visible aurora
- Confidence interval
- Contributing factors

**Advantages:**
- Can learn complex non-linear relationships
- Improves over time with more data
- May capture factors formula misses

**Disadvantages:**
- Requires significant historical data
- "Black box" - harder to explain to users
- More complex infrastructure
- Needs ongoing training and validation

**Recommendation:** Future consideration if user reporting system is implemented

---

### Alternative 5: Hybrid Approach (RECOMMENDED)

**Concept:** Combine backend calculations with frontend overrides for special cases

**Implementation:**
```typescript
export function mapTromsøForecastToSpotForecast(...) {
  // Start with backend calculation
  const backendProb = hourlyApiData?.[0]?.probability;

  // Check for known edge cases
  const isSunlight = isDaylight(spot.latitude, spot.longitude, new Date());
  const hasThickClouds = hourlyApiData?.[0]?.weather?.cloudCoverage > 90;

  let finalProbability = backendProb;

  // Override for daylight (always 0)
  if (isSunlight) {
    finalProbability = 0;
  }
  // Override for very thick clouds (significant reduction)
  else if (hasThickClouds) {
    finalProbability = Math.min(backendProb ?? 0, 15);
  }
  // Otherwise trust backend
  else if (backendProb !== undefined) {
    finalProbability = backendProb;
  }
  // Fallback to frontend calculation
  else {
    finalProbability = calculateAuroraProbability({...}).probability;
  }

  return {
    currentProbability: finalProbability,
    ...
  };
}
```

**Advantages:**
- Trust backend for most cases (single source of truth)
- Frontend can handle critical edge cases
- Clear logic for when frontend overrides
- Best of both worlds

**Recommendation:** Implement this approach once backend calculation is validated

---

## Testing & Verification

### Manual Test Cases

#### Test 1: Cross-Page Consistency

**Objective:** Verify `/live` and `/forecast` show identical probabilities

**Steps:**
1. Navigate to `/forecast`
2. Note timestamp (e.g., "Last updated: 15. jan. 2026 18:40")
3. Note "Best Location" and probability (e.g., "Grøtfjord 82%")
4. Navigate to `/live`
5. Find same location badge on map
6. Compare probability value

**Expected Result:**
- ✅ Probabilities match exactly
- ✅ Timestamps are within same hour
- ✅ Weather data matches (cloud %, temperature)

**Status:** ✅ PASSING (after fixes)

---

#### Test 2: Timeline Animation Variations

**Objective:** Verify timeline maintains location-specific variations

**Steps:**
1. Navigate to `/live`
2. Note initial probabilities (e.g., Grunnfjord: 79%, Tromsø: 54%)
3. Click play button for timeline animation
4. Observe probabilities at +1t, +2t, +3t
5. Verify each location shows different values

**Expected Result:**
- ✅ Each location maintains unique probability
- ✅ No uniform fallback to ~45%
- ✅ Smooth variations over time

**Status:** ✅ PASSING (after fixes)

---

#### Test 3: Regional Weather Accuracy

**Objective:** Verify regional view shows best spot's actual weather

**Steps:**
1. Navigate to `/forecast`
2. Note "Best Location" for a region (e.g., Troms: Grøtfjord)
3. Note displayed weather (e.g., Cloud: 48%, Temp: -1°C)
4. Click region to enter detail view
5. Select the best location from dropdown
6. Compare weather data

**Expected Result:**
- ✅ Regional card weather matches detail view weather
- ✅ No averaging from other locations
- ✅ Honest representation

**Status:** ✅ PASSING (after fixes)

---

### API Verification Commands

#### Get location-specific data:
```bash
curl -s "http://localhost:3000/api/aurora/hourly?location=grunnfjord&hours=48" | \
  jq '.hourly_forecast[0] | {
    time,
    probability,
    kp,
    cloudCoverage: .weather.cloudCoverage,
    temperature: .weather.temperature
  }'
```

#### Compare multiple locations:
```bash
for loc in grunnfjord tromso narvik; do
  echo "=== $loc ==="
  curl -s "http://localhost:3000/api/aurora/hourly?location=$loc&hours=1" | \
    jq '.hourly_forecast[0] | {probability, kp, clouds: .weather.cloudCoverage}'
done
```

---

### Automated Test Scenarios (Future)

```typescript
describe('Aurora Probability Consistency', () => {
  test('currentProbability matches hourlyForecast[0]', () => {
    const spotForecast = mapTromsøForecastToSpotForecast(
      mockForecast,
      mockSpot,
      mockWeather,
      mockHourlyData
    );

    expect(spotForecast.currentProbability)
      .toBe(spotForecast.hourlyForecast[0].probability);
  });

  test('regional view uses best spot weather', () => {
    const regional = getRegionalForecast(mockRegion, mockSpotForecasts);
    const bestSpot = mockSpotForecasts.find(
      sf => sf.currentProbability === regional.maxProbability
    );

    expect(regional.avgCloudCoverage)
      .toBe(Math.round(bestSpot.weather.cloudCoverage));
    expect(regional.avgTemperature)
      .toBe(Math.round(bestSpot.weather.temperature));
  });

  test('KP index consistency across calculations', () => {
    // Ensure all calculations use same KP for same location/time
  });
});
```

---

## Recommendations

### Immediate Actions (Completed ✅)

1. ✅ Use location-specific KP for `currentProbability`
2. ✅ Use best spot weather in regional view
3. ✅ Ensure timeline uses API probabilities
4. ✅ Fix TypeScript type inconsistencies

### Short-term Improvements (1-2 weeks)

1. **Centralize Configuration**
   - Create `src/lib/config/probabilityDefaults.ts`
   - Move all magic numbers to constants
   - Document why each default was chosen

2. **Add Input Validation**
   - Validate KP range (0-9)
   - Validate cloud coverage (0-100%)
   - Validate temperature reasonableness
   - Add warnings for suspicious data

3. **Implement Moon Phase**
   - Add moon phase calculation
   - Pass to probability calculator
   - Verify 5% weight impact

4. **Fix Regional KP Source**
   - Use best spot's KP instead of first spot's KP
   - Ensure consistency with weather data source

### Medium-term Enhancements (1-2 months)

1. **Backend Validation**
   - Compare backend vs frontend calculations
   - Investigate 57% vs 79% discrepancy
   - Decide: trust backend or document why frontend differs

2. **Add Unit Tests**
   - Test probability calculation edge cases
   - Test data mapping consistency
   - Test regional aggregation logic

3. **Performance Monitoring**
   - Track calculation times
   - Monitor cache hit rates
   - Identify optimization opportunities

### Long-term Considerations (3+ months)

1. **Consider Hybrid Approach**
   - Trust backend for standard cases
   - Frontend handles critical overrides
   - Clear documentation of when each is used

2. **Explore ML Model**
   - If user reporting system is implemented
   - Train on actual sighting data
   - Compare to formula-based approach

3. **User Feedback Integration**
   - Collect accuracy feedback
   - Compare predicted vs actual sightings
   - Iteratively improve weights

---

## Appendix

### File Reference Guide

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/lib/calculations/probabilityCalculator.ts` | Core calculation engine | `calculateAuroraProbability()` |
| `src/lib/tromsoAIMapper.ts` | API → SpotForecast mapping | `mapTromsøForecastToSpotForecast()` |
| `src/lib/calculations/regionalForecast.ts` | Regional aggregation | `getRegionalForecast()`, `getAllRegionalForecasts()` |
| `src/hooks/useAuroraData.ts` | Data fetching hook | `useAuroraData()` |
| `src/components/aurora/AuroraLiveMap.tsx` | Live map rendering | N/A (component) |
| `src/components/aurora/AuroraMapFullscreen.tsx` | Timeline animation | N/A (component) |
| `src/app/forecast/page.tsx` | Forecast page | N/A (page) |

### Type Definitions

```typescript
// Core types
interface HourlyForecast {
  time: string;
  hour: string;
  probability: number;
  cloudCoverage: number;
  temperature: number;
  kpIndex: number;  // Note: not 'kp'
  symbolCode?: string;
  twilightPhase?: TwilightPhase;
  canSeeAurora?: boolean;
}

interface SpotForecast {
  spot: ObservationSpot;
  currentProbability: number;
  weather: WeatherData;
  hourlyForecast: HourlyForecast[];
  bestViewingTime: string;
  canView?: boolean;
  nextViewableTime?: Date;
  bestTimeTonight?: Date;
}

interface RegionalForecast {
  region: Region;
  maxProbability: number;
  avgProbability: number;
  bestSpot: ObservationSpot | null;
  spotCount: number;
  avgCloudCoverage: number;
  avgTemperature: number;
  kpIndex: number;
}
```

### Git Commit History

**Relevant commits:**

```
01f5cd4 - fix: use kpIndex instead of kp in HourlyForecast type
92e5276 - fix: sync probability values between /live and /forecast
6524544 - fix: location-specific cache for hourly API
50f86a8 - fix: use single source of truth for weather data
c6ba809 - fix: standardize probability calculations
```

---

## Conclusion

The aurora probability system is now consistent across `/live` and `/forecast` pages. The primary issues were:

1. **Mixed KP sources** - Fixed by using location-specific KP from hourly data
2. **Regional weather averaging** - Fixed by using best spot's actual weather
3. **Timeline inconsistencies** - Fixed by prioritizing API probabilities

Current weaknesses are documented with severity levels and recommendations. The system is production-ready with room for iterative improvements based on user feedback and data analysis.

---

**Document Version:** 1.0
**Last Updated:** 2026-01-15
**Authors:** Technical Analysis Team
**Status:** Complete
