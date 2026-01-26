# Site-AI Decision Layer Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Aurora Decision Score (ADS) Formula](#aurora-decision-score-ads-formula)
3. [Global Forecast State Logic](#global-forecast-state-logic)
4. [Decision Rules for UI Behavior](#decision-rules-for-ui-behavior)
5. [Limiting Factor Detection](#limiting-factor-detection)
6. [Deterministic Copy System](#deterministic-copy-system)
7. [Output Contract](#output-contract)
8. [Testing & Validation](#testing--validation)
9. [Future Enhancements](#future-enhancements)

---

## Architecture Overview

### What is Site-AI?

Site-AI is a **deterministic, rule-based decision layer** that converts raw aurora forecast data into clear, actionable UI decisions. It is **NOT** generative AI or probabilistic reasoning—it is a scoring system with explicit logic that produces reproducible outputs.

### Why Deterministic?

Determinism is critical for:
- **Trust**: Users know decisions are based on explicit rules, not black boxes
- **Auditability**: Every decision can be traced back to specific inputs and rules
- **Reproducibility**: Same inputs always produce identical outputs
- **Explainability**: Each decision can be explained in human terms

### Data Flow

```
Hourly Forecasts (raw API data)
    ↓
  Site-AI Module
    ├─ Compute ADS for each window
    ├─ Determine global state
    ├─ Detect limiting factors
    ├─ Generate UI directives
    └─ Produce explanation
    ↓
SiteAIDecision JSON (single source of truth)
    ↓
Frontend Components (render only from directives)
```

### Key Principle

**The frontend must NEVER implement decision logic.** All decisions are computed by Site-AI and delivered as a JSON object. The frontend reads `uiDirectives` and renders accordingly. This ensures:

- No duplicate logic between backend and frontend
- Consistent behavior across devices and browsers
- Easy to audit decision changes (they're all in one place)
- Frontend complexity reduced (simpler, faster rendering)

---

## Aurora Decision Score (ADS) Formula

The ADS is a 0-100 score for each forecast window that quantifies aurora viewing potential.

### Components

**ADS = (KP * 0.35) + ((100 - CloudCover) * 0.35) + (Darkness * 0.25) + TrendBonus**

Where:

| Component | Weight | Range | Rationale |
|-----------|--------|-------|-----------|
| **KP Index** | 35% | 0-9 normalized to 0-100 | Geomagnetic activity is the primary driver; higher KP = stronger aurora |
| **Cloud Cover** | 35% | Inverted: (100 - cloudCover) | Visibility is equally important; clouds block the view entirely |
| **Darkness** | 25% | 0-100 (twilight conversion) | Aurora only visible in darkness; temporal constraint |
| **KP Trend** | ±5 | Bonus/penalty applied to raw score | Stability matters; increasing/stable trends indicate better conditions |

### Darkness Conversion (Solar Elevation → 0-100)

Darkness is derived from solar elevation angle using twilight phases:

```
Solar Elevation       Twilight Phase         Darkness Factor
──────────────────────────────────────────────────────────────
 > 0°                Day                         0
 0° to -6°           Civil Twilight              0-10 (linear)
-6° to -12°          Nautical Twilight         10-40 (linear)
-12° to -18°         Astronomical Twilight     40-80 (linear)
≤ -18°               Astronomical Night       100
```

Linear interpolation is used within each band for smooth gradation.

**Example:**
- Solar elevation at -15° (astronomical twilight)
  - Position within -12° to -18° band: 3° from -12°
  - Darkness factor: 40 + (40 * 3/6) = 40 + 20 = **60**

### KP Trend Bonus/Penalty

The trend modifier acknowledges that KP stability matters:

- **Increasing or stable trend**: +5 points (conditions improving or holding)
- **Decreasing trend**: -5 points (conditions deteriorating)

This bonus/penalty is applied to the raw score before normalization.

### Normalization

After summing all components, the raw score is clamped to [0, 100]:

```typescript
score = Math.max(0, Math.min(100, rawScore))
```

Theoretical range without clamping:
- Maximum: 0.35*100 + 0.35*100 + 0.25*100 + 5 = 105
- Minimum: 0 + 0 + 0 - 5 = -5

Clamping ensures consistent 0-100 output.

### ADS Classification

ADS scores are classified into four categories:

| ADS Range | Classification | Meaning |
|-----------|----------------|---------|
| ≥ 70 | **Excellent** | Strong aurora potential; worth going out |
| 50-69 | **Good** | Decent potential; check weather before committing |
| 30-49 | **Moderate** | Limited potential; marginal effort |
| < 30 | **Poor** | Very unlikely to see aurora |

### Example Calculations

**Scenario 1: Clear skies, strong aurora**
- KP = 6, Cloud cover = 10%, Solar elevation = -20°, Trend = stable
- ADS = (6/9 * 0.35 * 100) + (90 * 0.35) + (100 * 0.25) + 5
- ADS = 23.33 + 31.5 + 25 + 5 = **84.83** → **EXCELLENT**

**Scenario 2: Cloudy night, weak aurora**
- KP = 2, Cloud cover = 80%, Solar elevation = -20°, Trend = decreasing
- ADS = (2/9 * 0.35 * 100) + (20 * 0.35) + (100 * 0.25) - 5
- ADS = 7.78 + 7 + 25 - 5 = **34.78** → **MODERATE**

**Scenario 3: Twilight, moderate aurora**
- KP = 4, Cloud cover = 40%, Solar elevation = -8°, Trend = increasing
- ADS = (4/9 * 0.35 * 100) + (60 * 0.35) + (25 * 0.25) + 5
- ADS = 15.56 + 21 + 6.25 + 5 = **47.81** → **GOOD**

### Weight Rationale

- **KP (35%) and Cloud Cover (35%)**: Equal weight because both are equally binary—you can't see aurora without both.
- **Darkness (25%)**: Slightly less weight because there's no workaround; it's purely temporal. Users can always wait.
- **Trend (±5)**: Small modifier because it's informational, not decisive. Even declining KP can produce good aurora if it remains high.

---

## Global Forecast State Logic

The global state is determined by finding the **maximum ADS** across all 48-hour windows.

### State Determination

```
if max(ADS) ≥ 70:
    state = EXCELLENT
elif max(ADS) ≥ 30:
    state = POSSIBLE
else:
    state = UNLIKELY
```

### State Semantics

| State | Definition | User Message |
|-------|-----------|--------------|
| **EXCELLENT** | At least one window has ADS ≥ 70 | Strong aurora expected; go out |
| **POSSIBLE** | Best window ADS is 30-69 | Aurora might be visible; check conditions |
| **UNLIKELY** | All windows have ADS < 30 | Don't expect to see aurora |

### Example

- 48-hour forecast: [15, 22, 18, 65, 72, 55, 40, ...]
- Max ADS = 72 (≥ 70)
- **State = EXCELLENT** (despite many poor windows)

---

## Decision Rules for UI Behavior

All UI rendering logic is encapsulated in the `uiDirectives` object. The frontend reads these directives and renders accordingly.

### Rule 1: Hidden Grid (ADS < 20)

**Trigger:** All windows have ADS < 20

**Directive:**
```json
{
  "show48Grid": false,
  "highlightTop": 0,
  "showBestBanner": false
}
```

**Frontend behavior:**
- Hide the 48-hour grid entirely
- Show a simple message: "Aurora unlikely in the next 48 hours."
- No best time banner

**Rationale:** Don't clutter UI with useless data when conditions are dire.

### Rule 2: Full Grid with Top 3 Highlighted (Any ADS ≥ 50)

**Trigger:** At least one window has ADS ≥ 50

**Directive:**
```json
{
  "show48Grid": true,
  "highlightTop": 3,
  "showBestBanner": true
}
```

**Frontend behavior:**
- Show all 48 windows
- Highlight (bold, color, badge) the top 3 windows by ADS
- Show "Best Viewing Time" banner with the best window's time

**Rationale:** Excellent conditions warrant full visibility; users can plan around the top options.

### Rule 3: Filtered Grid, Top 1 Highlighted (1-3 Windows with ADS ≥ 30)

**Trigger:** 1-3 windows have ADS ≥ 30, but none exceed 50

**Directive:**
```json
{
  "show48Grid": true,
  "highlightTop": 1,
  "showBestBanner": true
}
```

**Frontend behavior:**
- Show the full 48-hour grid (but only render windows with ADS ≥ 30)
- Highlight the single best window
- Show "Best Viewing Time" banner

**Rationale:** Limited options, but worth showing them to help users plan.

### Rule 4: Banner Visibility (ADS ≥ 30)

**Always:** Show "Best Viewing Time" banner if max ADS ≥ 30

**Rationale:** Only show the banner when there's actually a reasonable time to view aurora.

---

## Limiting Factor Detection

For the best window, Site-AI identifies the **primary limiting factor** preventing even better conditions. This explains to users "why can't I see aurora better?"

### Decision Hierarchy

Limiting factors are detected using a **first-match hierarchy**:

```
if CloudCover > 60%:
    limitingFactor = "cloud_cover"
elif KP < 3:
    limitingFactor = "low_kp"
elif Darkness < 50:
    limitingFactor = "too_bright"
else:
    limitingFactor = "mixed_conditions"
```

### Rationale

1. **Cloud Cover (60% threshold):** Clouds are the most visible and immediate problem. Also the hardest to predict. At >60%, they become the dominant issue.

2. **Low KP (< 3):** After eliminating clouds, weak geomagnetic activity is the next limiting factor. KP < 3 rarely produces visible aurora regardless of other conditions.

3. **Darkness (< 50):** If we've ruled out clouds and KP, twilight is the constraint. Darkness < 50 indicates civil/nautical twilight, where visibility is compromised.

4. **Mixed Conditions:** If none of the above dominate, multiple factors are equally limiting.

### Factor Descriptions

| Factor | User-Friendly Description |
|--------|---------------------------|
| `cloud_cover` | Too many clouds are blocking the view. Clear skies are needed. |
| `low_kp` | Geomagnetic activity is too weak. Stronger solar wind is needed. |
| `too_bright` | The sky is not dark enough. Wait for it to get darker. |
| `mixed_conditions` | Multiple factors are preventing ideal conditions. |

### Example

Best window: KP=2, Cloud=65%, Solar elevation=-15°
- Rule 1: Cloud cover (65%) > 60% → **limitingFactor = "cloud_cover"** ✓

User sees: "Main limitation: too many clouds"

---

## Deterministic Copy System

Explanations are generated from **pre-defined templates**. No free-form text generation. Every explanation is fully deterministic.

### Templates

#### EXCELLENT State
```
"Strong aurora conditions expected. Best viewing time: {{time}}. Confidence: {{ADS}}/100."
```

**Example:** "Strong aurora conditions expected. Best viewing time: 23:45. Confidence: 85/100."

#### POSSIBLE State
```
"Limited aurora potential detected. Best window: {{time}}. Confidence: {{ADS}}/100. Main limitation: {{factor}}."
```

**Example:** "Limited aurora potential detected. Best window: 01:30. Confidence: 55/100. Main limitation: too many clouds."

#### UNLIKELY State
```
"Aurora unlikely in the next 48 hours. Limiting factor: {{factor}}. Next possible window: {{time}} (low confidence)."
```

**Example:** "Aurora unlikely in the next 48 hours. Limiting factor: weak geomagnetic activity. Next possible window: (low confidence)."

### Variable Substitution

| Variable | Source | Format |
|----------|--------|--------|
| `{{time}}` | `bestWindow.start` (ISO timestamp) | HH:MM local time |
| `{{ADS}}` | `bestWindow.ads` | Rounded integer 0-100 |
| `{{factor}}` | `limitingFactor` | User-friendly string |

### No Free-Form Text

- No adjectives beyond what's in the templates
- No speculation or hedging
- No conditional phrases not in the template
- Every explanation is reproducible from the same inputs

---

## Output Contract

The frontend receives a `SiteAIDecision` JSON object with this schema:

```typescript
interface SiteAIDecision {
  // Global state
  state: 'excellent' | 'possible' | 'unlikely';

  // Best window details
  bestWindow: {
    start: string;         // ISO 8601 timestamp
    end: string;           // ISO 8601 timestamp (start + 1 hour)
    ads: number;           // 0-100
    classification: string; // 'excellent' | 'good' | 'moderate' | 'poor'
    limitingFactor: string; // 'cloud_cover' | 'low_kp' | 'too_bright' | 'mixed_conditions'
  };

  // Next viable window (if state === 'unlikely', else undefined)
  nextWindow?: {
    start: string;         // ISO 8601 timestamp
    ads: number;           // 0-100
  };

  // All 48-hour windows
  windows: Array<{
    time: string;          // ISO 8601 timestamp
    ads: number;           // 0-100
    classification: string; // 'excellent' | 'good' | 'moderate' | 'poor'
  }>;

  // UI rendering directives (MUST be read by frontend)
  uiDirectives: {
    show48Grid: boolean;   // Show full 48h grid?
    highlightTop: 0|1|2|3; // Number of windows to highlight
    showBestBanner: boolean; // Show "Best Time" banner?
  };

  // Human-readable explanation (template-based)
  explanation: string;

  // Timestamp when decision was computed
  computedAt: string;     // ISO 8601
}
```

### Example Response (EXCELLENT)

```json
{
  "state": "excellent",
  "bestWindow": {
    "start": "2026-01-27T23:00:00Z",
    "end": "2026-01-28T00:00:00Z",
    "ads": 82,
    "classification": "excellent",
    "limitingFactor": "mixed_conditions"
  },
  "nextWindow": null,
  "windows": [
    { "time": "2026-01-27T18:00:00Z", "ads": 15, "classification": "poor" },
    { "time": "2026-01-27T19:00:00Z", "ads": 22, "classification": "poor" },
    { "time": "2026-01-27T20:00:00Z", "ads": 35, "classification": "moderate" },
    { "time": "2026-01-27T21:00:00Z", "ads": 55, "classification": "good" },
    { "time": "2026-01-27T22:00:00Z", "ads": 72, "classification": "excellent" },
    { "time": "2026-01-27T23:00:00Z", "ads": 82, "classification": "excellent" }
  ],
  "uiDirectives": {
    "show48Grid": true,
    "highlightTop": 3,
    "showBestBanner": true
  },
  "explanation": "Strong aurora conditions expected. Best viewing time: 23:00. Confidence: 82/100.",
  "computedAt": "2026-01-27T12:30:45Z"
}
```

---

## Testing & Validation

### Determinism Testing

**Goal:** Verify same inputs always produce same outputs.

```typescript
const input: SiteAIInput = {
  hourlyForecasts: [
    { time: "2026-01-27T20:00:00Z", cloudCover: 30, solarElevation: -10, kpIndex: 5 },
    { time: "2026-01-27T21:00:00Z", cloudCover: 25, solarElevation: -15, kpIndex: 6 },
    // ... 46 more windows
  ],
  globalKp: 5,
  kpTrend: 'stable'
};

const result1 = computeSiteAIDecision(input);
const result2 = computeSiteAIDecision(input);

assert(JSON.stringify(result1) === JSON.stringify(result2)); // Must be true
```

### Boundary Condition Tests

**ADS = 70 (excellent threshold):**
- Verify: state transitions from 'good' to 'excellent'
- Verify: highlightTop changes from 1 to 3
- Verify: showBestBanner remains true

**ADS = 50 (good threshold):**
- Verify: classification transitions from 'good' to 'moderate'
- Verify: UI grid behavior changes

**ADS = 30 (viable threshold):**
- Verify: windows below 30 are marked poor
- Verify: windows at 30 appear in filtered grid

**ADS = 20 (hidden grid threshold):**
- Verify: if all windows < 20, grid is hidden
- Verify: banner is not shown

### Test Scenarios

**Scenario A: Clear night, strong aurora**
```
KP=7, Clouds=10%, Solar=-20°, Trend=increasing
Expected: EXCELLENT state, banner visible, full grid
```

**Scenario B: Cloudy twilight, weak aurora**
```
KP=2, Clouds=70%, Solar=-10°, Trend=decreasing
Expected: UNLIKELY state, limiting factor=cloud_cover, grid hidden
```

**Scenario C: One decent window in otherwise poor forecast**
```
Max ADS in best window = 65, rest < 30
Expected: POSSIBLE state, banner visible, some windows highlighted
```

---

## Future Enhancements

### 1. Magnetometer Integration
Include real-time magnetometer noise as a fourth component:
- Sudden bay disturbances reduce predicted aurora
- Rapid substorm recovery increases confidence
- Weight: 5-10%

### 2. Solar Wind Bz Factor
Include southward/northward solar wind (Bz):
- Southward Bz (negative) strengthens aurora
- Northward Bz (positive) suppresses aurora
- Potential weight: 5-10%

### 3. Weight Calibration
Periodically review ADS weights based on:
- Historical aurora observations
- User feedback ("I went out at ADS=50 and saw nothing")
- Regional calibration (weights may vary by latitude)

### 4. User Feedback Loop
Track outcomes:
- When user reports "I went out and saw aurora" → refine upward
- When user reports "I went out at high ADS and saw nothing" → refine downward
- Build confidence intervals around predictions

### 5. Machine Learning Integration
Once sufficient historical data is collected:
- Train a model to learn optimal weights
- Detect complex interactions between factors
- Personalize predictions per user location/telescope setup

### 6. Seasonal Adjustments
Account for seasonal variations:
- Summer twilight "never gets fully dark" in northern latitudes
- Winter "gets dark much earlier"
- Adjust darkness thresholds seasonally

---

## References

- **NOAA SWPC**: [Geomagnetic Storm Forecasts](https://www.swpc.noaa.gov/)
- **Met.no**: [Weather API](https://www.met.no/en/about-us/about-met-norway/the-weather-forecast-and-api-services)
- **Aurora Forecasting**: Trondheim Geophysical Observatory resources

---

**Document Version:** 1.0
**Last Updated:** 2026-01-26
**Status:** Production
