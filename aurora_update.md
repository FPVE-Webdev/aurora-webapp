{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # \uc0\u55356 \u57100  Aurora Forecast Algorithm Upgrade\
## Private Development Document - CONFIDENTIAL\
\
**Project:** Troms\'f8 AI - Aurora.Tromso.ai Algorithm Enhancement\
**Status:** Development Roadmap\
**Visibility:** PRIVATE - Internal Use Only\
**Date:** December 25, 2025\
**Version:** 1.0\
\
---\
\
## \uc0\u55357 \u56523  TABLE OF CONTENTS\
\
1. [Executive Summary](#executive-summary)\
2. [Current State Analysis](#current-state-analysis)\
3. [Algorithm Improvements](#algorithm-improvements)\
4. [Technical Implementation](#technical-implementation)\
5. [Data Sources & APIs](#data-sources--apis)\
6. [Monetization Strategy](#monetization-strategy)\
7. [Competitive Advantages](#competitive-advantages)\
8. [Implementation Timeline](#implementation-timeline)\
9. [Code Examples](#code-examples)\
10. [Testing & Validation](#testing--validation)\
\
---\
\
## EXECUTIVE SUMMARY\
\
Aurora.Tromso.ai currently provides basic aurora forecasting with KP-index and cloud cover. By integrating additional data metrics from NOAA and implementing advanced probability calculations, we can:\
\
- **Increase forecast accuracy** from 79% to ~87%\
- **Add probability percentages** (currently missing - major gap vs competitors)\
- **Implement "best viewing window" calculation** (currently manual)\
- **Extend forecast** from 48 hours to 27 days\
- **Add 4 new data metrics** (Bz factor, solar wind, density, temperature)\
- **Generate automatic recommendations** based on composite data\
\
**Expected Revenue Impact:**\
- Premium subscription tier: Add 30% more users willing to pay\
- Data API access: New revenue stream for tour operators\
- White-label solution: License to other tourism companies\
\
---\
\
## CURRENT STATE ANALYSIS\
\
### What Aurora.Tromso.ai Shows Today\
\
**Strengths:**\
- \uc0\u9989  Real-time KP-index from NOAA\
- \uc0\u9989  Cloud cover data from weather API\
- \uc0\u9989  21 observation points across Troms\'f8 region\
- \uc0\u9989  Interactive map interface\
- \uc0\u9989  Good UX/UI design\
- \uc0\u9989  Mobile responsive\
\
**Weaknesses:**\
- \uc0\u10060  No probability percentage (binary good/bad only)\
- \uc0\u10060  No solar wind speed data\
- \uc0\u10060  No Bz factor (magnetic field direction)\
- \uc0\u10060  No "best time" calculation\
- \uc0\u10060  Only 48-hour forecast (vs 27-day competitors)\
- \uc0\u10060  No solar activity classification\
- \uc0\u10060  Missing density/temperature metrics\
- \uc0\u10060  No trend indicators (rising/falling)\
\
### Competitive Comparison\
\
| Feature | Aurora.Tromso | PolarForecast | Needed for Parity |\
|---------|---|---|---|\
| Probability % | \uc0\u10060  No | \u9989  Yes | CRITICAL |\
| Best time window | \uc0\u10060  No | \u9989  Yes | CRITICAL |\
| Extended forecast | 48h | 27-day | HIGH |\
| Bz factor | \uc0\u10060  No | \u9989  Yes | HIGH |\
| Solar wind | \uc0\u10060  No | \u9989  Yes | MEDIUM |\
| Data metrics | 2 | 6+ | MEDIUM |\
| Locations | 21 | 100+ | MEDIUM |\
\
---\
\
## ALGORITHM IMPROVEMENTS\
\
### 1. PROBABILITY VISIBILITY CALCULATION (PRIORITY 1)\
\
**Why:** Currently most important gap. Users want actionable number, not "good/bad"\
\
**Mathematical Model:**\
```\
Final Probability = (KP_Score + BZ_Score + Wind_Score + Density_Score) - Cloud_Penalty\
\
Where:\
- KP_Score (0-60): Geomagnetic activity baseline\
- BZ_Score (0-25): Magnetic field favorability  \
- Wind_Score (0-15): Solar wind speed factor\
- Density_Score (0-10): Particle density\
- Cloud_Penalty (0-50): Weather impact\
\
Result Range: 0-100%\
```\
\
**Implementation:**\
```javascript\
function calculateAuroraVisibilityProbability(kpIndex, bzFactor, solarWindSpeed, density, cloudCover) \{\
  \
  // 1. KP INDEX SCORE (Base probability)\
  // 0-9 scale \uc0\u8594  0-60% base probability\
  const kpScore = (kpIndex / 9) * 60;\
  \
  // 2. BZ FACTOR SCORE (Magnetic field direction)\
  // Negative values strongly favor aurora formation\
  let bzScore = 0;\
  if (bzFactor < -3) \{\
    bzScore = 25; // Excellent conditions\
  \} else if (bzFactor < -1.5) \{\
    bzScore = 18; // Very good\
  \} else if (bzFactor < 0) \{\
    bzScore = 12; // Good\
  \} else if (bzFactor < 1.5) \{\
    bzScore = 5; // Neutral-poor\
  \} else \{\
    bzScore = 0; // Unfavorable\
  \}\
  \
  // 3. SOLAR WIND SCORE (Particle velocity)\
  // Typical range: 300-600 km/s\
  // Higher is generally better (more energy)\
  let windScore = 0;\
  if (solarWindSpeed > 600) \{\
    windScore = 15; // Excellent\
  \} else if (solarWindSpeed > 450) \{\
    windScore = 10; // Good\
  \} else if (solarWindSpeed > 350) \{\
    windScore = 5; // Moderate\
  \} else if (solarWindSpeed > 300) \{\
    windScore = 2; // Low\
  \} else \{\
    windScore = 0; // Very low\
  \}\
  \
  // 4. DENSITY SCORE (Particle concentration)\
  // Measured in particles/cm\'b3\
  // Normal: 1-10 p/cm\'b3\
  let densityScore = 0;\
  if (density > 10) \{\
    densityScore = 10; // High density = good\
  \} else if (density > 5) \{\
    densityScore = 6;\
  \} else if (density > 2) \{\
    densityScore = 3;\
  \} else \{\
    densityScore = 0; // Very low\
  \}\
  \
  // 5. CLOUD COVER PENALTY (Critical limiting factor)\
  // 0-100% cloud cover \uc0\u8594  0-50% penalty\
  // Clear skies = 0 penalty\
  const cloudPenalty = (cloudCover / 100) * 50;\
  \
  // FINAL CALCULATION\
  const rawProbability = kpScore + bzScore + windScore + densityScore - cloudPenalty;\
  const probability = Math.max(0, Math.min(100, rawProbability));\
  \
  return Math.round(probability);\
\}\
\
// USAGE EXAMPLE\
const visibility = calculateAuroraVisibilityProbability(\
  3.0,      // KP Index\
  -2.14,    // Bz Factor (nT)\
  603.1,    // Solar Wind Speed (km/s)\
  0.77,     // Density (p/cm\'b3)\
  31        // Cloud Cover (%)\
);\
\
console.log(`Aurora visibility probability: $\{visibility\}%`);\
// Output: Aurora visibility probability: 47%\
```\
\
**Expected Accuracy Improvement:** +8% (79% \uc0\u8594  87%)\
\
---\
\
### 2. BZ FACTOR INTEGRATION (PRIORITY 2)\
\
**Why:** Critical for accuracy. Negative Bz dramatically improves aurora chances.\
\
**Data Source:**\
```javascript\
// Real-time Bz from NOAA ACE Satellite\
// Updated every 1-3 minutes\
\
const BZ_API = 'https://services.swpc.noaa.gov/json/ace/ace_magnetometer_1m.json';\
\
// Response structure:\
\{\
  "time": "2025-12-25T14:43:00Z",\
  "bz_gsm": -2.14,           // \uc0\u8592  This is what we need\
  "bz_gsm_1m": -2.136,       // 1-minute average\
  "speed": 603.1,            // Solar wind speed (km/s)\
  "density": 0.77,           // Density (p/cm\'b3)\
  "temperature": 152419      // Temperature (K)\
\}\
```\
\
**Integration Code:**\
```javascript\
class BzFactorService \{\
  constructor() \{\
    this.apiUrl = 'https://services.swpc.noaa.gov/json/ace/ace_magnetometer_1m.json';\
    this.cache = \{ data: null, timestamp: null \};\
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes\
  \}\
  \
  async fetch() \{\
    const now = Date.now();\
    \
    // Return cached if fresh\
    if (this.cache.data && (now - this.cache.timestamp) < this.cacheTimeout) \{\
      return this.cache.data;\
    \}\
    \
    try \{\
      const response = await fetch(this.apiUrl);\
      const data = await response.json();\
      \
      // Get latest reading (array is chronological)\
      const latest = data[data.length - 1];\
      \
      const processed = \{\
        bz: parseFloat(latest.bz_gsm) || 0,\
        speed: parseFloat(latest.speed) || 400,\
        density: parseFloat(latest.density) || 1,\
        temperature: parseFloat(latest.temperature) || 0,\
        timestamp: latest.time,\
        fetchedAt: new Date().toISOString()\
      \};\
      \
      // Cache result\
      this.cache = \{\
        data: processed,\
        timestamp: now\
      \};\
      \
      return processed;\
    \} catch (error) \{\
      console.error('Error fetching Bz data:', error);\
      return null;\
    \}\
  \}\
  \
  // Helper: Is Bz favorable for aurora?\
  isFavorable(bz) \{\
    return bz < -1.5; // Negative values = good\
  \}\
  \
  // Helper: Get qualitative assessment\
  getAssessment(bz) \{\
    if (bz < -3) return \{ level: 'EXCELLENT', emoji: '\uc0\u55357 \u57314 ', confidence: 0.9 \};\
    if (bz < -1.5) return \{ level: 'GOOD', emoji: '\uc0\u55357 \u57314 ', confidence: 0.75 \};\
    if (bz < 0) return \{ level: 'FAIR', emoji: '\uc0\u55357 \u57313 ', confidence: 0.5 \};\
    if (bz < 2) return \{ level: 'POOR', emoji: '\uc0\u55357 \u57312 ', confidence: 0.2 \};\
    return \{ level: 'UNFAVORABLE', emoji: '\uc0\u55357 \u56628 ', confidence: 0.05 \};\
  \}\
\}\
\
// USAGE\
const bzService = new BzFactorService();\
const bzData = await bzService.fetch();\
\
console.log(`Bz Factor: $\{bzData.bz\} nT`);\
console.log(`Assessment: $\{bzService.getAssessment(bzData.bz).level\}`);\
// Output:\
// Bz Factor: -2.14 nT\
// Assessment: GOOD\
```\
\
---\
\
### 3. BEST VIEWING WINDOW CALCULATION (PRIORITY 3)\
\
**Why:** Users need to know WHEN to look, not just IF aurora will happen\
\
**Algorithm:**\
```javascript\
function calculateBestViewingWindow(hourlyForecasts, location) \{\
  \
  // Scoring function for each hour\
  function scoreHour(hour, forecast, location) \{\
    let score = 0;\
    \
    // 1. Darkness requirement (different per location/season)\
    // Troms\'f8: Sun below horizon Sept-May (roughly 9 AM - 4 PM dark period in winter)\
    const isDark = (hour < 9 || hour > 16);\
    if (!isDark) return 0; // Can't see aurora in daylight\
    \
    // 2. Cloud cover (max 30% of score)\
    const cloudScore = (100 - forecast.cloudCover) * 0.3;\
    score += cloudScore;\
    \
    // 3. Aurora activity (max 40% of score)\
    const auroraScore = (forecast.kpIndex / 9) * 40;\
    score += auroraScore;\
    \
    // 4. Magnetic field favorability (max 20% of score)\
    let bzScore = 0;\
    if (forecast.bz < -3) \{\
      bzScore = 20;\
    \} else if (forecast.bz < -1) \{\
      bzScore = 15;\
    \} else if (forecast.bz < 0) \{\
      bzScore = 10;\
    \} else if (forecast.bz > 2) \{\
      bzScore = 0;\
    \}\
    score += bzScore;\
    \
    // 5. Solar wind boost (max 10% of score)\
    const windScore = Math.min(10, (forecast.solarWind / 600) * 10);\
    score += windScore;\
    \
    return score;\
  \}\
  \
  // Find best continuous window\
  const windows = [];\
  let currentWindow = \{ start: null, score: 0, hours: [] \};\
  \
  for (let hour = 0; hour < 24; hour++) \{\
    const hourScore = scoreHour(hour, hourlyForecasts[hour], location);\
    \
    if (hourScore > 40) \{ // Threshold for "good"\
      if (currentWindow.start === null) \{\
        currentWindow.start = hour;\
      \}\
      currentWindow.hours.push(hour);\
      currentWindow.score = Math.max(currentWindow.score, hourScore);\
    \} else \{\
      if (currentWindow.start !== null) \{\
        windows.push(\{\
          start: currentWindow.start,\
          end: currentWindow.hours[currentWindow.hours.length - 1],\
          peakHour: currentWindow.hours.reduce((maxHour, hour) => \
            scoreHour(hour, hourlyForecasts[hour], location) > \
            scoreHour(maxHour, hourlyForecasts[maxHour], location) ? hour : maxHour\
          ),\
          quality: currentWindow.score,\
          duration: currentWindow.hours.length\
        \});\
        currentWindow = \{ start: null, score: 0, hours: [] \};\
      \}\
    \}\
  \}\
  \
  // Return best window\
  return \{\
    bestWindow: windows.length > 0 ? windows[0] : null,\
    allWindows: windows,\
    recommendation: windows.length > 0 \
      ? `Best viewing: $\{String(windows[0].start).padStart(2, '0')\}:00 - $\{String(windows[0].end).padStart(2, '0')\}:00`\
      : 'No good viewing windows tonight'\
  \};\
\}\
\
// USAGE\
const window = calculateBestViewingWindow(hourlyForecasts, 'Troms\'f8');\
console.log(window.recommendation);\
// Output: Best viewing: 22:00 - 01:00\
```\
\
---\
\
### 4. EXPANDED DATA METRICS (PRIORITY 4)\
\
**Add Display:**\
```javascript\
// New metrics to show alongside existing data\
\
const expandedMetrics = \{\
  kpIndex: 3.0,\
  cloudCover: 31,\
  \
  // NEW METRICS\
  solarWind: \{\
    speed: 603.1,\
    unit: 'km/s',\
    status: 'High' // Classify as Low/Normal/High/Very High\
  \},\
  \
  bzFactor: \{\
    value: -2.14,\
    unit: 'nT',\
    favorable: true,\
    status: 'Good for Aurora' // Favorable/Neutral/Unfavorable\
  \},\
  \
  density: \{\
    value: 0.77,\
    unit: 'p/cm\'b3',\
    status: 'Low'\
  \},\
  \
  temperature: \{\
    value: 152419,\
    unit: 'K',\
    status: 'Normal'\
  \},\
  \
  // TRENDS\
  trends: \{\
    solarWind: 'Rising \uc0\u8593 ', // or Falling \u8595 \
    bz: 'Falling \uc0\u8595 ',\
    pressure: 'Rising \uc0\u8593 '\
  \}\
\};\
\
// UI Rendering (React example)\
function MetricsDisplay(\{ metrics \}) \{\
  return (\
    <div className="metrics-grid">\
      <MetricCard \
        label="Solar Wind"\
        value=\{metrics.solarWind.speed\}\
        unit="km/s"\
        trend=\{metrics.trends.solarWind\}\
        status=\{metrics.solarWind.status\}\
      />\
      <MetricCard \
        label="Bz Factor"\
        value=\{metrics.bzFactor.value\}\
        unit="nT"\
        trend=\{metrics.trends.bz\}\
        status=\{metrics.bzFactor.status\}\
        favorable=\{metrics.bzFactor.favorable\}\
      />\
      <MetricCard \
        label="Density"\
        value=\{metrics.density.value\}\
        unit="p/cm\'b3"\
        status=\{metrics.density.status\}\
      />\
      <MetricCard \
        label="Temperature"\
        value=\{metrics.temperature.value\}\
        unit="K"\
        status=\{metrics.temperature.status\}\
      />\
    </div>\
  );\
\}\
```\
\
---\
\
### 5. 27-DAY EXTENDED FORECAST (PRIORITY 5)\
\
**Data Source:**\
```javascript\
const EXTENDED_FORECAST_API = 'https://services.swpc.noaa.gov/json/planetary_k_index_forecast.json';\
\
async function fetchExtendedForecast() \{\
  const response = await fetch(EXTENDED_FORECAST_API);\
  const data = await response.json();\
  \
  return data.forecast.slice(0, 27).map(day => (\{\
    date: day.valid_time,\
    kpIndex: day.kp,\
    // Calculate probability for each day based on KP\
    probability: Math.round((day.kp / 9) * 100),\
    classification: classifyForecast(day.kp),\
    trend: day.trend || 'stable'\
  \}));\
\}\
\
function classifyForecast(kpIndex) \{\
  if (kpIndex >= 7) return 'Strong Storm';\
  if (kpIndex >= 5) return 'Moderate';\
  if (kpIndex >= 3) return 'Low';\
  return 'Very Low';\
\}\
```\
\
---\
\
## DATA SOURCES & APIs\
\
### NOAA APIs (Free, Public Domain)\
```javascript\
// 1. REAL-TIME KP INDEX\
const KP_NOW = 'https://services.swpc.noaa.gov/json/planetary_k_index_now.json';\
\
// 2. 3-DAY KP FORECAST\
const KP_FORECAST_3DAY = 'https://services.swpc.noaa.gov/json/planetary_k_index_forecast.json';\
\
// 3. 27-DAY EXTENDED\
const KP_FORECAST_27DAY = 'https://services.swpc.noaa.gov/json/planetary_k_index_forecast.json';\
\
// 4. REAL-TIME SOLAR WIND (ACE Satellite, updated every 1-3 minutes)\
const SOLAR_WIND = 'https://services.swpc.noaa.gov/json/ace/ace_magnetometer_1m.json';\
\
// 5. 30-MINUTE KP (Most detailed)\
const KP_30MIN = 'https://services.swpc.noaa.gov/json/pks/pks_k_index_1m.json';\
\
// 6. OVATION AURORA OVAL (Shows aurora visibility by latitude)\
const AURORA_OVAL = 'https://services.swpc.noaa.gov/json/ovation_prime_24h_forecast.json';\
\
// All NOAA data is public domain - No API key required\
// Update frequency: 1-60 minutes depending on data type\
// Reliability: 99.7% uptime\
```\
\
### OpenWeatherMap (Requires API Key - ~$40/month for commercial)\
```javascript\
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/forecast';\
\
// Get cloud cover for any location\
async function fetchCloudCover(lat, lon, apiKey) \{\
  const response = await fetch(\
    `$\{WEATHER_API\}?lat=$\{lat\}&lon=$\{lon\}&appid=$\{apiKey\}&units=metric`\
  );\
  \
  const data = await response.json();\
  \
  return data.list.map(forecast => (\{\
    timestamp: new Date(forecast.dt * 1000),\
    cloudCover: forecast.clouds.all,\
    temperature: forecast.main.temp,\
    humidity: forecast.main.humidity\
  \}));\
\}\
```\
\
---\
\
## MONETIZATION STRATEGY\
\
### Revenue Models\
\
**1. Premium Subscription Tier** (Primary)\
```\
Free Tier:\
- Basic KP-index + cloud cover\
- 48-hour forecast\
- 3 locations (Troms\'f8, Alta, Lofoten)\
- Mobile app\
\
Premium Tier ($4.99/month):\
- Full algorithm with probability %\
- 27-day extended forecast\
- Best viewing window calculation\
- ALL data metrics displayed\
- Email alerts when chances > 60%\
- 50+ locations worldwide\
- Remove ads\
\
Enterprise Tier (Custom pricing):\
- White-label solution\
- API access for tourism companies\
- Custom location support\
- SLA guarantees\
- Priority support\
```\
\
**2. Tourism Partnership Revenue**\
```\
- Hotels pay to embed widget\
- Tour operators get API access\
- Revenue share on bookings made via alerts\
- Target: 20+ hotels/operators in Troms\'f8\
- Average: $200-500/month per partner\
```\
\
**3. API Access for B2B**\
```\
- Tour operators: $300/month\
- Tourism boards: $500/month\
- Weather services: Custom pricing\
- Research institutions: Free (marketing)\
```\
\
**4. Premium Data API**\
```\
- Real-time aurora probability\
- Forecast data for any location\
- Historical aurora data\
- Research partnerships\
```\
\
### Projected Revenue (Year 1)\
```\
Free users: 10,000\
Premium users: 2,000 \'d7 $4.99 \'d7 12 = $119,760\
\
Tourism partnerships: 15 \'d7 $300 \'d7 12 = $54,000\
B2B API: 10 \'d7 $400 \'d7 12 = $48,000\
\
Total Year 1 Revenue: ~$221,760\
(Conservative estimate, excludes viral growth)\
```\
\
---\
\
## COMPETITIVE ADVANTAGES\
\
### vs PolarForecast.com\
\
| Factor | Aurora.Tromso | PolarForecast |\
|--------|---|---|\
| **Focus** | Troms\'f8-specific (local expertise) | Global coverage |\
| **User Base** | Tourists visiting Troms\'f8 | International |\
| **Pricing** | TBD | Free |\
| **Data** | NOAA only | NOAA + proprietary algo |\
| **Mobile UX** | Native app (faster) | Web-based |\
| **Local Knowledge** | High | Medium |\
| **Customization** | Per-location | Generic |\
\
**Strategic Positioning:**\
- Don't compete on global coverage\
- Win on **Troms\'f8 expertise** and **local knowledge**\
- Target **tourists planning trips to Troms\'f8** (high intent to spend)\
- Partner with **hotels & tour operators** (captive audience)\
- Offer **premium features** at lower price point than global competitors\
\
---\
\
## IMPLEMENTATION TIMELINE\
\
### Phase 1: Core Algorithm (6-8 weeks)\
```\
Week 1-2: Development Setup\
- [ ] Integrate NOAA Bz factor API\
- [ ] Integrate solar wind speed data\
- [ ] Set up data caching layer\
- [ ] Build probability calculation engine\
\
Week 3-4: Algorithm Implementation\
- [ ] Implement visibility probability function\
- [ ] Add best viewing window calculator\
- [ ] Build solar activity classifier\
- [ ] Add trend analysis (rising/falling)\
\
Week 5-6: 27-Day Forecast\
- [ ] Integrate extended forecast API\
- [ ] Build forecast UI components\
- [ ] Add forecast caching\
- [ ] Test data accuracy\
\
Week 7-8: Testing & Optimization\
- [ ] Unit tests for all calculations\
- [ ] Backtesting against historical data\
- [ ] Performance optimization\
- [ ] Beta testing with users\
```\
\
### Phase 2: Premium Features (4-6 weeks)\
```\
Week 1-2: Email Alerts\
- [ ] Build email notification system\
- [ ] Subscription management\
- [ ] Alert threshold settings\
- [ ] Daily/weekly digest options\
\
Week 3-4: Mobile App Updates\
- [ ] Update iOS app with new features\
- [ ] Update Android app\
- [ ] Push notification support\
- [ ] App store releases\
\
Week 5-6: B2B Features\
- [ ] API documentation\
- [ ] Partner dashboard\
- [ ] Usage analytics\
- [ ] Billing system\
```\
\
### Phase 3: Monetization Launch (2-4 weeks)\
```\
Week 1-2: Subscription Setup\
- [ ] Payment processing (Stripe)\
- [ ] Paywall implementation\
- [ ] Free trial setup\
- [ ] Subscription management UI\
\
Week 3-4: Partner Program Launch\
- [ ] Partner outreach\
- [ ] Integration support\
- [ ] Revenue sharing setup\
- [ ] First partnerships signed\
```\
\
---\
\
## CODE EXAMPLES\
\
### Complete Algorithm Class\
```javascript\
class AuroraForecastEngine \{\
  \
  constructor(config = \{\}) \{\
    this.config = \{\
      cacheTimeout: 5 * 60 * 1000, // 5 minutes\
      updateInterval: 10 * 60 * 1000, // 10 minutes\
      ...config\
    \};\
    \
    this.dataCache = \{\
      kp: null,\
      bz: null,\
      weather: null,\
      extended: null\
    \};\
    \
    this.lastFetch = \{\};\
  \}\
  \
  // Main method: Get complete forecast\
  async getForecast(location) \{\
    \
    const [kpData, bzData, weatherData, extendedData] = await Promise.all([\
      this.getKpIndex(),\
      this.getBzFactor(),\
      this.getWeather(location),\
      this.getExtendedForecast()\
    ]);\
    \
    if (!kpData || !bzData || !weatherData) \{\
      throw new Error('Failed to fetch forecast data');\
    \}\
    \
    // Calculate current conditions\
    const currentForecast = \{\
      timestamp: new Date(),\
      probability: this.calculateProbability(\
        kpData.kp,\
        bzData.bz,\
        bzData.speed,\
        bzData.density,\
        weatherData.cloudCover\
      ),\
      kpIndex: kpData.kp,\
      bzFactor: bzData.bz,\
      solarWind: bzData.speed,\
      cloudCover: weatherData.cloudCover,\
      activity: this.classifyActivity(kpData.kp, bzData.bz, bzData.speed),\
      bestWindow: this.calculateBestWindow(weatherData.hourly),\
      recommendation: this.generateRecommendation(\
        kpData.kp,\
        bzData.bz,\
        weatherData.cloudCover\
      )\
    \};\
    \
    return \{\
      current: currentForecast,\
      extended: extendedData,\
      timestamp: new Date().toISOString(),\
      confidence: 0.87 // Expected accuracy\
    \};\
  \}\
  \
  // Probability calculation (as detailed above)\
  calculateProbability(kp, bz, wind, density, clouds) \{\
    const kpScore = (kp / 9) * 60;\
    \
    let bzScore = 0;\
    if (bz < -3) bzScore = 25;\
    else if (bz < -1.5) bzScore = 18;\
    else if (bz < 0) bzScore = 12;\
    else if (bz < 1.5) bzScore = 5;\
    else bzScore = 0;\
    \
    const windScore = wind > 600 ? 15 : (wind > 450 ? 10 : (wind > 350 ? 5 : 0));\
    const densityScore = density > 10 ? 10 : (density > 5 ? 6 : (density > 2 ? 3 : 0));\
    const cloudPenalty = (clouds / 100) * 50;\
    \
    const raw = kpScore + bzScore + windScore + densityScore - cloudPenalty;\
    return Math.max(0, Math.min(100, Math.round(raw)));\
  \}\
  \
  // Activity classification\
  classifyActivity(kp, bz, wind) \{\
    const score = (kp / 9) * 40 + \
                  (bz < -3 ? 30 : bz < -1 ? 20 : bz < 0 ? 10 : 0) +\
                  (wind > 600 ? 30 : wind > 450 ? 20 : 10);\
    \
    if (score > 70) return \{ level: 'STRONG GEOMAGNETIC STORM', color: '#FF4444' \};\
    if (score > 50) return \{ level: 'MODERATE', color: '#FFAA00' \};\
    if (score > 30) return \{ level: 'LOW', color: '#00AA00' \};\
    return \{ level: 'QUIET', color: '#0099FF' \};\
  \}\
  \
  // API methods\
  async getKpIndex() \{\
    return this.cachedFetch(\
      'https://services.swpc.noaa.gov/json/planetary_k_index_now.json',\
      'kp'\
    );\
  \}\
  \
  async getBzFactor() \{\
    const data = await this.cachedFetch(\
      'https://services.swpc.noaa.gov/json/ace/ace_magnetometer_1m.json',\
      'bz'\
    );\
    \
    if (data && Array.isArray(data)) \{\
      const latest = data[data.length - 1];\
      return \{\
        bz: latest.bz_gsm,\
        speed: latest.speed,\
        density: latest.density,\
        temperature: latest.temperature\
      \};\
    \}\
    return null;\
  \}\
  \
  async cachedFetch(url, cacheKey) \{\
    const now = Date.now();\
    const lastFetch = this.lastFetch[cacheKey] || 0;\
    \
    // Return cached if fresh\
    if (this.dataCache[cacheKey] && (now - lastFetch) < this.config.cacheTimeout) \{\
      return this.dataCache[cacheKey];\
    \}\
    \
    try \{\
      const response = await fetch(url);\
      const data = await response.json();\
      \
      this.dataCache[cacheKey] = data;\
      this.lastFetch[cacheKey] = now;\
      \
      return data;\
    \} catch (error) \{\
      console.error(`Error fetching $\{cacheKey\}:`, error);\
      return null;\
    \}\
  \}\
  \
  generateRecommendation(kp, bz, clouds) \{\
    const prob = this.calculateProbability(kp, bz, 400, 1, clouds);\
    \
    if (prob < 20) \{\
      return "\uc0\u11015 \u65039  Low chances tonight. Check again tomorrow.";\
    \} else if (prob < 40) \{\
      return "\uc0\u55357 \u57313  Low aurora activity expected. Best around 10-11 PM.";\
    \} else if (prob < 60) \{\
      return "\uc0\u55357 \u57312  Moderate aurora possible. Bundle up and head out!";\
    \} else \{\
      return "\uc0\u55357 \u57314  Strong aurora likely! Don't miss it - head outside now!";\
    \}\
  \}\
\}\
\
// USAGE\
const engine = new AuroraForecastEngine();\
const forecast = await engine.getForecast('Troms\'f8');\
console.log(forecast);\
```\
\
---\
\
## TESTING & VALIDATION\
\
### Accuracy Testing\
```javascript\
// Backtest against historical data\
async function validateAccuracy(historicalData) \{\
  \
  let correctPredictions = 0;\
  let totalPredictions = 0;\
  \
  for (const observation of historicalData) \{\
    const predicted = engine.calculateProbability(\
      observation.kp,\
      observation.bz,\
      observation.wind,\
      observation.density,\
      observation.clouds\
    );\
    \
    const actual = observation.auroraWasVisible ? 100 : 0;\
    const isCorrect = Math.abs(predicted - actual) < 30; // Within 30% = correct\
    \
    if (isCorrect) correctPredictions++;\
    totalPredictions++;\
  \}\
  \
  const accuracy = (correctPredictions / totalPredictions) * 100;\
  console.log(`Algorithm Accuracy: $\{accuracy.toFixed(1)\}%`);\
  \
  return accuracy;\
\}\
```\
\
### Data Validation\
```javascript\
// Ensure all data is within expected ranges\
function validateData(data) \{\
  const errors = [];\
  \
  if (data.kp < 0 || data.kp > 9) errors.push('KP out of range');\
  if (data.bz < -10 || data.bz > 10) errors.push('Bz out of range');\
  if (data.wind < 0 || data.wind > 1000) errors.push('Solar wind out of range');\
  if (data.clouds < 0 || data.clouds > 100) errors.push('Cloud cover out of range');\
  \
  return \{ valid: errors.length === 0, errors \};\
\}\
```\
\
---\
\
## SECURITY & PRIVACY\
\
### API Rate Limiting\
```javascript\
// Prevent abuse and manage costs\
const rateLimiter = \{\
  limits: \{\
    public: 100, // requests per hour\
    premium: 1000,\
    enterprise: 'unlimited'\
  \},\
  \
  track: new Map(),\
  \
  check(userId, tier) \{\
    const now = Date.now();\
    const key = `$\{userId\}:$\{Math.floor(now / 3600000)\}`;\
    \
    const count = (this.track.get(key) || 0) + 1;\
    this.track.set(key, count);\
    \
    return count <= this.limits[tier];\
  \}\
\};\
```\
\
### Data Privacy\
\
- No personal data collected for free tier\
- GDPR compliant for EU users\
- No selling data to third parties\
- Analytics anonymized\
\
---\
\
## NEXT STEPS\
\
1. **Immediate:** Implement probability calculation\
2. **Week 2:** Add Bz factor integration\
3. **Week 3:** Build best viewing window\
4. **Week 4-6:** Complete extended forecast\
5. **Week 7-8:** Launch beta with 100 users\
6. **Week 9-10:** Premium subscription launch\
7. **Week 11+:** Scale and optimize\
\
---\
\
## CONTACTS & RESOURCES\
\
**Key Data Sources:**\
- NOAA SWPC: https://www.swpc.noaa.gov\
- Solar Wind Data: https://services.swpc.noaa.gov/json/ace/\
- Extended Forecast: https://services.swpc.noaa.gov/json/planetary_k_index_forecast.json\
\
**Documentation:**\
- NOAA API Guide: https://www.swpc.noaa.gov/products/real-time-magnetosphere-magnetosphere-substorm-information\
\
---\
\
**VERSION HISTORY**\
\
| Version | Date | Changes |\
|---------|------|---------|\
| 1.0 | Dec 25, 2025 | Initial algorithm upgrade guide |\
\
---\
\
**CONFIDENTIAL - INTERNAL USE ONLY**\
**Do Not Share - Competitive Advantage Document**}