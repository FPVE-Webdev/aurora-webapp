# Site-AI Decision Layer – Technical Documentation

## Executive Summary

**Site-AI** is a deterministic, rule-based decision layer that converts raw aurora and weather data into clear, actionable UI decisions. It is NOT generative AI and contains no autonomous learning, no free-form text generation, and no probabilistic wording outside explicitly defined classifications.

**Core Principles:**
- **Deterministic:** Identical inputs always produce identical outputs
- **Explainable:** Every decision traces to explicit, documented rules
- **Arctic-Aware:** Accounts for polar night, midnight sun, and twilight phases specific to Tromsø, Norway (69.7°N)
- **Frontend-Free:** UI contains no decision logic; all rendering driven by Site-AI directives
- **Auditable:** Complete rule documentation and verification available

---

## Architecture Overview

### Data Flow

```
Raw Forecast Data
  ↓
[Hour-by-hour KP, cloud cover, solar elevation]
  ↓
SiteAIInput (normalized)
  ↓
┌─────────────────────────────────────────────────┐
│         SITE-AI DECISION LAYER                  │
│                                                 │
│  1. Compute ADS for each window                │
│  2. Determine global forecast state            │
│  3. Detect limiting factor for best window    │
│  4. Generate UI directives for frontend        │
│  5. Generate deterministic explanation        │
└─────────────────────────────────────────────────┘
  ↓
SiteAIDecision (complete decision object)
  ↓
Frontend
  ↓
Rendered UI (strictly from directives, no logic)
```

### Five-Step Orchestration Flow

1. **Aurora Decision Score (ADS) Calculation**
   - For each hourly forecast window, compute ADS (0-100)
   - ADS = (KP × 0.35) + ((100 - cloudCover) × 0.35) + (darkness × 0.25) + trendBonus
   - Classify each ADS: excellent (≥70), good (50-69), moderate (30-49), poor (<30)

2. **Global State Determination**
   - Find maximum ADS across 48-hour window
   - Classify overall state: EXCELLENT (≥70), POSSIBLE (30-69), UNLIKELY (<30)
   - Identify best window and (if UNLIKELY) next viable window

3. **Limiting Factor Detection**
   - Analyze best window using hierarchical rules
   - Identify single primary constraint: cloud_cover, low_kp, too_bright, or mixed_conditions
   - Provide actionable feedback to user

4. **UI Directives Generation**
   - Translate decision state and ADS scores to rendering instructions
   - Control grid visibility, highlighting, banner display
   - No logic in frontend; directives fully define rendering

5. **Deterministic Copy Generation**
   - Generate human-readable explanation from template
   - Substitute variables: time, ADS, limiting factor, next window
   - No free-form text; all explanations fully deterministic

---

## Data Model

### SiteAIInput

Input structure containing minimal data needed for complete decision computation:

```typescript
{
  hourlyForecasts: Array<{
    time: string;              // ISO 8601 timestamp
    cloudCover: number;        // 0-100 (percentage)
    solarElevation: number;    // Degrees (positive = day, negative = night)
    kpIndex: number;           // 0-9 (NOAA geomagnetic activity scale)
  }>,
  globalKp: number;            // 0-9 (current global KP index)
  kpTrend: 'increasing' | 'stable' | 'decreasing';
}
```

### SiteAIDecision Output

```typescript
{
  state: 'excellent' | 'possible' | 'unlikely';
  bestWindow: {
    start: string;
    end: string;
    ads: number;
    classification: 'excellent' | 'good' | 'moderate' | 'poor';
    limitingFactor: 'cloud_cover' | 'low_kp' | 'too_bright' | 'mixed_conditions';
  },
  nextWindow?: { start: string; ads: number; },
  windows: Array<{ time: string; ads: number; classification: string; }>,
  uiDirectives: {
    show48Grid: boolean;
    highlightTop: 0 | 1 | 2 | 3;
    showBestBanner: boolean;
  },
  explanation: string;
  computedAt: string;
}
```

---

## Aurora Decision Score (ADS) Formula

```
ADS = (KP × 0.35) + ((100 - cloudCover) × 0.35) + (darkness × 0.25) + trendBonus
ADS = clamp(ADS, 0, 100)
```

**Classification:**
- ≥ 70: Excellent
- 50-69: Good
- 30-49: Moderate
- < 30: Poor

---

## Arctic-Aware Darkness Model

### Standard Twilight Phases

| Solar Elevation | Phase | Darkness |
|---|---|---|
| > 0° | Daytime | 0 |
| -6° to 0° | Civil Twilight | 0-10 |
| -12° to -6° | Nautical Twilight | 10-40 |
| -18° to -12° | Astronomical Twilight | 40-80 |
| < -18° | Astronomical Night | 100 |

### Polar Adjustments (Tromsø-Specific)

**Polar Night (Nov 21 - Jan 21):** Add +10 to base darkness, clamped to 100

**Midnight Sun (May 19 - Jul 23):** Force darkness to 0 (aurora impossible to see)

---

## Global Forecast State

```
if maxADS ≥ 70:   EXCELLENT
else if maxADS ≥ 30:  POSSIBLE
else:            UNLIKELY
```

---

## Limiting Factor Hierarchy

First match wins (never multiple factors):

1. Cloud Cover > 60% → cloud_cover
2. KP < 3 → low_kp
3. Darkness < 50 → too_bright
4. Otherwise → mixed_conditions

---

## UI Directive Rules

| Condition | show48Grid | highlightTop | showBestBanner |
|---|---|---|---|
| All ADS < 20 | false | 0 | false |
| Any ADS ≥ 50 | true | min(3, count) | maxADS ≥ 30 |
| 1-3 windows ≥ 30 | true | 1 | maxADS ≥ 30 |

---

## Deterministic Copy Templates

**EXCELLENT:**
"Strong aurora conditions expected. Best viewing time: {{time}}. Confidence: {{ADS}}/100."

**POSSIBLE:**
"Limited aurora potential detected. Best window: {{time}}. Confidence: {{ADS}}/100. Main limitation: {{factor}}."

**UNLIKELY:**
"Aurora unlikely in the next 48 hours. Limiting factor: {{factor}}. Next possible window: {{nextTime}} (low confidence)."

---

## Verification & Auditing

✅ No self-learning
✅ No free-form text generation
✅ No probabilistic wording outside classifications
✅ No hidden logic
✅ No frontend decision logic
✅ Deterministic: same inputs → same outputs

---

## Implementation Status

- ✅ ADS calculation
- ✅ Darkness model with Tromsø polar adjustments
- ✅ Global state logic
- ✅ Limiting factor detection
- ✅ UI directives
- ✅ Deterministic copy
- ✅ Main orchestrator
- ✅ API endpoint
- ✅ Type definitions

