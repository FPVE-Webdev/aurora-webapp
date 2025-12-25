# Aurora.Tromso.ai - NOAA Data Integration Implementation Roadmap

**Prosjekt:** Integrer NOAA Space Weather data for å forbedre aurora-prognoser
**Målgruppe:** aurora.tromso.ai development team
**Sist oppdatert:** 2025-12-25
**Versjon:** 1.0

---

## TABLE OF CONTENTS

1. [Overview](#overview)
2. [Phase 1: Foundation (1-2 months)](#phase-1-foundation)
3. [Phase 2: Advanced Analytics (2-3 months)](#phase-2-advanced-analytics)
4. [Phase 3: Market Differentiation (1-2 months)](#phase-3-market-differentiation)
5. [Technical Architecture](#technical-architecture)
6. [API Specifications](#api-specifications)
7. [Testing & Deployment](#testing--deployment)
8. [Revenue Model](#revenue-model)
9. [Competitive Analysis](#competitive-analysis)

---

## OVERVIEW

### Problem Statement
- aurora.tromso.ai currently displays only basic Kp-index
- Lacks real-time solar wind data
- No 3-day geomagnetic forecast
- No aurora probability heatmap (unlike NOAA OVATION)
- Missing B2B features for enterprise customers

### Solution
Integrate NOAA SWPC (Space Weather Prediction Center) public data feeds to create a comprehensive space weather platform that outcompetes Polarforecast.com.

### Key Benefits
- ✅ 100% free NOAA data (public domain, no licensing needed)
- ✅ Real-time updates (every 30 minutes to 1 hour)
- ✅ No rate limiting for typical usage
- ✅ Legal to use commercially without attribution (but good practice to attribute)
- ✅ Establishes aurora.tromso.ai as "source of truth" for Norwegian aurora forecasts

### Success Metrics
- Feature completeness vs. Polarforecast.com
- User engagement (API calls, alert subscriptions)
- Revenue from premium tiers and enterprise contracts
- System uptime/reliability

---

## PHASE 1: FOUNDATION (1-2 months)

**Timeline:** Weeks 1-8
**Developer Hours:** 40-50 hours
**Team:** 1-2 Frontend + 1 Backend developer

### 1.1 Real-time Kp-Index Dashboard

#### Current State
- Shows single Kp value (e.g., "3.0")
- Updated manually or infrequently

#### New State
- Real-time Kp from NOAA (updated every 1 hour)
- 24-hour historical chart
- Color-coded activity levels
- Trend indicator (rising/falling)

#### Technical Specs

**Component:** `src/components/KpIndexChart.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const KpIndexChart = () => {
  const [kpData, setKpData] = useState([]);
  const [currentKp, setCurrentKp] = useState(null);
  const [trend, setTrend] = useState('stable');

  useEffect(() => {
    // Fetch from your backend (which caches NOAA data)
    fetch('/api/kp-index')
      .then(res => res.json())
      .then(data => {
        setKpData(data.history);
        setCurrentKp(data.current);
        // Calculate trend: compare last 3 values
        if (data.history.length >= 3) {
          const recent = data.history.slice(-3);
          const avg1 = recent[0].value;
          const avg2 = recent[2].value;
          setTrend(avg2 > avg1 ? 'rising' : avg2 < avg1 ? 'falling' : 'stable');
        }
      });
  }, []);

  const getActivityLevel = (kp) => {
    if (kp < 2) return { label: 'Quiet', color: '#003366' };
    if (kp < 4) return { label: 'Unsettled', color: '#0066CC' };
    if (kp < 6) return { label: 'Active', color: '#00CC00' };
    if (kp < 8) return { label: 'Minor Storm', color: '#FFCC00' };
    if (kp < 9) return { label: 'Major Storm', color: '#FF6600' };
    return { label: 'Severe Storm', color: '#CC0000' };
  };

  const activityLevel = getActivityLevel(currentKp || 0);

  return (
    <div className="kp-index-chart">
      <h2>Current Kp Index</h2>

      <div className="kp-display">
        <div className="kp-value" style={{ color: activityLevel.color }}>
          {currentKp?.toFixed(1) || 'Loading...'}
        </div>
        <div className="kp-label">{activityLevel.label}</div>
        <div className="kp-trend">
          Trend: <span className={trend}>{trend.toUpperCase()}</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={kpData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="category"
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 9]} />
          <Tooltip
            formatter={(value) => value.toFixed(1)}
            labelFormatter={(label) => `Time: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={activityLevel.color}
            dot={false}
            name="Kp Index"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="kp-scale">
        <span style={{ color: '#003366' }}>0-2: Quiet</span>
        <span style={{ color: '#0066CC' }}>2-4: Unsettled</span>
        <span style={{ color: '#00CC00' }}>4-6: Active</span>
        <span style={{ color: '#FFCC00' }}>6-8: Minor Storm</span>
        <span style={{ color: '#FF6600' }}>8-9: Major Storm</span>
        <span style={{ color: '#CC0000' }}>9: Severe Storm</span>
      </div>
    </div>
  );
};

export default KpIndexChart;
```

**Backend Endpoint:** `src/routes/kp-index.js`
```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Cache NOAA data for 1 hour
const cache = {
  data: null,
  timestamp: 0,
  TTL: 3600000 // 1 hour
};

router.get('/api/kp-index', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cache.data && (now - cache.timestamp) < cache.TTL) {
      return res.json(cache.data);
    }

    // Fetch from NOAA
    const response = await axios.get(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
    );

    // Transform NOAA format to our format
    const data = response.data.map(entry => ({
      time: entry.time_tag,
      value: parseFloat(entry.kp)
    }));

    // Keep last 24 entries (24 hours)
    const history = data.slice(-24);
    const current = history[history.length - 1]?.value || 0;

    const result = {
      current,
      history,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA SWPC'
    };

    // Cache it
    cache.data = result;
    cache.timestamp = now;

    res.json(result);
  } catch (error) {
    console.error('Error fetching Kp index:', error);

    // Return cached data if available, even if stale
    if (cache.data) {
      return res.json({
        ...cache.data,
        error: 'Using cached data due to fetch error'
      });
    }

    res.status(500).json({ error: 'Failed to fetch Kp index' });
  }
});

module.exports = router;
```

**NOAA Data Source:**
```
GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json

Response format:
[
  {
    "time_tag": "2025-12-25T13:00Z",
    "kp": 3.0
  },
  ...
]
```

**Testing:**
```javascript
// tests/kp-index.test.js
const request = require('supertest');
const app = require('../app');

describe('GET /api/kp-index', () => {
  it('should return current Kp value and history', async () => {
    const res = await request(app).get('/api/kp-index');

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('current');
    expect(res.body).toHaveProperty('history');
    expect(res.body.history.length).toBeLessThanOrEqual(24);
    expect(res.body.current).toBeGreaterThanOrEqual(0);
    expect(res.body.current).toBeLessThanOrEqual(9);
  });

  it('should cache data for 1 hour', async () => {
    const res1 = await request(app).get('/api/kp-index');
    const res2 = await request(app).get('/api/kp-index');

    expect(res1.body.lastUpdated).toBe(res2.body.lastUpdated);
  });
});
```

---

### 1.2 3-Day Geomagnetic Forecast

#### Current State
- No forecast information beyond immediate Kp value

#### New State
- 3-day forecast showing probability of different activity levels per day
- Alerts when severe storms predicted
- Visual forecast bars (quiet/unsettled/active/storm)

#### Technical Specs

**Component:** `src/components/ThreeDayForecast.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import './ThreeDayForecast.css';

const ThreeDayForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/forecast-3day')
      .then(res => res.json())
      .then(data => {
        setForecast(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching forecast:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading forecast...</div>;
  if (!forecast) return <div>Unable to load forecast</div>;

  return (
    <div className="three-day-forecast">
      <h2>3-Day Geomagnetic Forecast</h2>

      <div className="forecast-days">
        {forecast.days.map((day, idx) => (
          <div key={idx} className="forecast-day">
            <h3>{day.date}</h3>

            {/* Probability bars */}
            <div className="probabilities">
              <div className="prob-row">
                <span className="level quiet">Quiet (0-1)</span>
                <div className="bar-container">
                  <div
                    className="bar quiet"
                    style={{ width: `${day.quiet}%` }}
                  >
                    {day.quiet}%
                  </div>
                </div>
              </div>

              <div className="prob-row">
                <span className="level unsettled">Unsettled (2)</span>
                <div className="bar-container">
                  <div
                    className="bar unsettled"
                    style={{ width: `${day.unsettled}%` }}
                  >
                    {day.unsettled}%
                  </div>
                </div>
              </div>

              <div className="prob-row">
                <span className="level active">Active (3)</span>
                <div className="bar-container">
                  <div
                    className="bar active"
                    style={{ width: `${day.active}%` }}
                  >
                    {day.active}%
                  </div>
                </div>
              </div>

              <div className="prob-row">
                <span className="level minor-storm">Minor Storm (4-5)</span>
                <div className="bar-container">
                  <div
                    className="bar minor-storm"
                    style={{ width: `${day.minorStorm}%` }}
                  >
                    {day.minorStorm}%
                  </div>
                </div>
              </div>

              <div className="prob-row">
                <span className="level major-storm">Major+ Storm (6-9)</span>
                <div className="bar-container">
                  <div
                    className="bar major-storm"
                    style={{ width: `${day.majorStorm}%` }}
                  >
                    {day.majorStorm}%
                  </div>
                </div>
              </div>
            </div>

            {/* Alert if storm likely */}
            {day.majorStorm > 20 && (
              <div className="alert alert-warning">
                ⚠️ {day.majorStorm}% chance of STRONG aurora activity
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="forecast-source">
        Data from NOAA Space Weather Prediction Center
      </div>
    </div>
  );
};

export default ThreeDayForecast;
```

**CSS:** `src/components/ThreeDayForecast.css`
```css
.three-day-forecast {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
}

.forecast-days {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.forecast-day {
  background: white;
  padding: 15px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.forecast-day h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  font-weight: bold;
}

.probabilities {
  margin-bottom: 15px;
}

.prob-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  gap: 10px;
}

.level {
  width: 140px;
  font-size: 12px;
  font-weight: 500;
}

.bar-container {
  flex: 1;
  height: 24px;
  background: #eee;
  border-radius: 3px;
  overflow: hidden;
}

.bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  color: white;
  transition: width 0.3s ease;
}

.bar.quiet { background: #003366; }
.bar.unsettled { background: #0066CC; }
.bar.active { background: #00CC00; color: #000; }
.bar.minor-storm { background: #FFCC00; color: #000; }
.bar.major-storm { background: #FF6600; }

.alert {
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  margin-top: 10px;
}

.alert-warning {
  background: #FFE5E5;
  border: 1px solid #FF6600;
  color: #CC0000;
}

.forecast-source {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 20px;
}
```

**Backend Endpoint:** `src/routes/forecast-3day.js`
```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const cache = {
  data: null,
  timestamp: 0,
  TTL: 6 * 3600000 // 6 hours (forecast updated ~4 times per day)
};

router.get('/api/forecast-3day', async (req, res) => {
  try {
    const now = Date.now();

    if (cache.data && (now - cache.timestamp) < cache.TTL) {
      return res.json(cache.data);
    }

    // Fetch NOAA 3-Day Forecast
    // This is text-based, we need to parse it
    const response = await axios.get(
      'https://www.swpc.noaa.gov/products/3-day-geomagnetic-forecast'
    );

    // Alternative: Use direct NOAA API if available
    // For now, we'll use the text format and parse
    const forecast = parseSWPCForecast(response.data);

    cache.data = forecast;
    cache.timestamp = now;

    res.json(forecast);
  } catch (error) {
    console.error('Error fetching 3-day forecast:', error);
    if (cache.data) {
      return res.json({
        ...cache.data,
        error: 'Using cached data'
      });
    }
    res.status(500).json({ error: 'Failed to fetch forecast' });
  }
});

// Parse NOAA text-based forecast into structured data
function parseSWPCForecast(htmlContent) {
  // This is a simplified parser. In production, use cheerio or similar
  const days = [];

  // Extract forecast for next 3 days
  // Format from NOAA includes probability percentages
  // This example shows the structure we want to create

  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    days.push({
      date: date.toISOString().split('T')[0],
      quiet: Math.floor(Math.random() * 100), // Replace with actual parsing
      unsettled: Math.floor(Math.random() * 100),
      active: Math.floor(Math.random() * 100),
      minorStorm: Math.floor(Math.random() * 100),
      majorStorm: Math.floor(Math.random() * 100)
    });
  }

  // Normalize percentages to sum to 100
  days.forEach(day => {
    const total = day.quiet + day.unsettled + day.active + day.minorStorm + day.majorStorm;
    day.quiet = Math.round((day.quiet / total) * 100);
    day.unsettled = Math.round((day.unsettled / total) * 100);
    day.active = Math.round((day.active / total) * 100);
    day.minorStorm = Math.round((day.minorStorm / total) * 100);
    day.majorStorm = 100 - (day.quiet + day.unsettled + day.active + day.minorStorm);
  });

  return {
    days,
    source: 'NOAA SWPC',
    lastUpdated: new Date().toISOString()
  };
}

module.exports = router;
```

---

### 1.3 Solar Wind Speed Display

#### Component: `src/components/SolarWindGauge.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import './SolarWindGauge.css';

const SolarWindGauge = () => {
  const [windSpeed, setWindSpeed] = useState(null);
  const [bz, setBz] = useState(null);
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetch('/api/solar-wind')
      .then(res => res.json())
      .then(data => {
        setWindSpeed(data.speed);
        setBz(data.bz);
        setHistory(data.history);

        // Determine status
        if (data.speed > 600 && data.bz < -5) {
          setStatus('🔴 EXTREME - Perfect aurora conditions');
        } else if (data.speed > 500 && data.bz < -3) {
          setStatus('🟠 STRONG - Good aurora conditions');
        } else if (data.speed > 400 && data.bz < 0) {
          setStatus('🟡 MODERATE - Possible aurora');
        } else {
          setStatus('🟢 QUIET - Low aurora activity expected');
        }
      });
  }, []);

  // Gauge from 0 to 1000 km/s
  const speedPercent = Math.min((windSpeed / 1000) * 100, 100);

  return (
    <div className="solar-wind-gauge">
      <h2>Solar Wind Conditions</h2>

      <div className="gauge-container">
        <div className="speed-display">
          <div className="speed-value">{windSpeed?.toFixed(0) || '--'} km/s</div>
          <div className="speed-label">Solar Wind Speed</div>
        </div>

        <div className="gauge-bar">
          <div
            className="gauge-fill"
            style={{ width: `${speedPercent}%` }}
          />
          <div className="gauge-markers">
            <span>0</span>
            <span>250</span>
            <span>500</span>
            <span>750</span>
            <span>1000</span>
          </div>
        </div>

        <div className="bz-indicator">
          <span className="label">Magnetic Field (Bz):</span>
          <span className={`value ${bz < 0 ? 'negative' : 'positive'}`}>
            {bz?.toFixed(1) || '--'} nT
          </span>
          <span className="note">
            {bz < -5 ? '❌ Negative Bz = Aurora fuel!' : 'ℹ️ Waiting for negative Bz'}
          </span>
        </div>

        <div className="status-indicator">
          {status}
        </div>
      </div>

      <div className="reference">
        <p><strong>Normal range:</strong> 300-500 km/s</p>
        <p><strong>Aurora friendly:</strong> > 500 km/s + negative Bz</p>
        <p><strong>Storm conditions:</strong> > 700 km/s + strong negative Bz</p>
      </div>
    </div>
  );
};

export default SolarWindGauge;
```

**Backend Endpoint:** `src/routes/solar-wind.js`
```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

const cache = {
  data: null,
  timestamp: 0,
  TTL: 300000 // 5 minutes (solar wind updates frequently)
};

router.get('/api/solar-wind', async (req, res) => {
  try {
    const now = Date.now();

    if (cache.data && (now - cache.timestamp) < cache.TTL) {
      return res.json(cache.data);
    }

    // Fetch solar wind speed
    const speedRes = await axios.get(
      'https://services.swpc.noaa.gov/products/solar-wind/speed.json'
    );

    // Fetch magnetic field (Bz)
    const magRes = await axios.get(
      'https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json'
    );

    // Extract latest values
    const speedData = speedRes.data;
    const magData = magRes.data;

    const latestSpeed = parseFloat(speedData[speedData.length - 1][1]);
    const latestBz = parseFloat(magData[magData.length - 1][1]);

    // Keep 24-hour history
    const history = speedData.slice(-144).map(entry => ({
      time: entry[0],
      speed: parseFloat(entry[1])
    }));

    const result = {
      speed: latestSpeed,
      bz: latestBz,
      history,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA ACE Satellite'
    };

    cache.data = result;
    cache.timestamp = now;

    res.json(result);
  } catch (error) {
    console.error('Error fetching solar wind:', error);
    if (cache.data) {
      return res.json({
        ...cache.data,
        error: 'Using cached data'
      });
    }
    res.status(500).json({ error: 'Failed to fetch solar wind data' });
  }
});

module.exports = router;
```

**NOAA Data Sources:**
```
Solar Wind Speed (10-minute averaged):
GET https://services.swpc.noaa.gov/products/solar-wind/speed.json

Format: [["2025-12-25 13:00", 450.2], ...]

Magnetic Field (Bz component, 6-hourly):
GET https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json

Format: [["2025-12-25 12:00", -3.5], ...]
```

---

### 1.4 Aurora Probability Heatmap (OVATION)

#### Component: `src/components/OvationMap.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import L from 'leaflet';
import './OvationMap.css';

const OvationMap = () => {
  const [mapInstance, setMapInstance] = useState(null);
  const [imageLayer, setImageLayer] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Initialize Leaflet map
    const map = L.map('ovation-map').setView([70, 20], 3);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    setMapInstance(map);

    // Load OVATION forecast image
    loadOvationImage(map);

    // Refresh every 30 minutes
    const interval = setInterval(() => loadOvationImage(map), 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const loadOvationImage = async (map) => {
    try {
      const response = await fetch('/api/ovation-forecast');
      const data = await response.json();

      // Remove old layer
      if (imageLayer) {
        map.removeLayer(imageLayer);
      }

      // Add new forecast image as overlay
      const newLayer = L.imageOverlay(
        data.imageUrl,
        [[0, -180], [90, 180]], // Northern hemisphere
        { opacity: 0.7 }
      ).addTo(map);

      setImageLayer(newLayer);
      setLastUpdate(data.lastUpdated);

    } catch (error) {
      console.error('Error loading OVATION forecast:', error);
    }
  };

  return (
    <div className="ovation-container">
      <h2>Aurora Probability Forecast (OVATION)</h2>
      <div className="last-update">
        Last update: {lastUpdate}
      </div>
      <div id="ovation-map" className="ovation-map" />
      <div className="legend">
        <p>Green = 10% probability</p>
        <p>Yellow = 50% probability</p>
        <p>Red = 90% probability</p>
        <p>Data from NOAA/SWPC OVATION Model (updated every 30 min)</p>
      </div>
    </div>
  );
};

export default OvationMap;
```

**Backend Endpoint:** `src/routes/ovation.js`
```javascript
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

router.get('/api/ovation-forecast', async (req, res) => {
  try {
    // NOAA serves OVATION as PNG images updated every 30 minutes
    // Northern Hemisphere forecast
    const noaaUrl = 'https://services.swpc.noaa.gov/json/ovation_30min_forecast.json';

    // For image-based forecast, you can fetch directly from NOAA's image server
    // or parse the JSON data and render it yourself

    // Option 1: Direct image proxy (simplest)
    const imageUrl = 'https://www.swpc.noaa.gov/images/animations/ovation/north/latest.png';

    // In production, you might want to:
    // 1. Cache the image locally
    // 2. Fetch it every 30 minutes
    // 3. Serve from your own CDN for faster loads

    res.json({
      imageUrl: imageUrl,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA SWPC OVATION Model',
      refreshInterval: 1800 // seconds
    });

  } catch (error) {
    console.error('Error fetching OVATION data:', error);
    res.status(500).json({ error: 'Failed to fetch OVATION forecast' });
  }
});

module.exports = router;
```

**CSS:** `src/components/OvationMap.css`
```css
.ovation-container {
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  margin: 20px 0;
}

.ovation-container h2 {
  margin-top: 0;
}

.last-update {
  font-size: 12px;
  color: #666;
  margin-bottom: 10px;
}

.ovation-map {
  width: 100%;
  height: 500px;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 15px;
}

.legend {
  background: white;
  padding: 15px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.8;
  border-left: 4px solid #0066CC;
}

.legend p {
  margin: 5px 0;
}
```

---

### 1.5 Solar Activity Summary Panel

#### Component: `src/components/SolarActivityPanel.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import './SolarActivityPanel.css';

const SolarActivityPanel = () => {
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    fetch('/api/solar-activity-summary')
      .then(res => res.json())
      .then(data => setActivity(data));
  }, []);

  if (!activity) return <div>Loading solar activity...</div>;

  return (
    <div className="solar-activity-panel">
      <h2>Solar Activity Summary</h2>

      <div className="activity-grid">
        <div className="activity-card">
          <h3>Sunspots</h3>
          <div className="value">{activity.sunspots || 'N/A'}</div>
          <div className="label">Active regions</div>
        </div>

        <div className="activity-card">
          <h3>X-ray Flux</h3>
          <div className={`value ${activity.xrayLevel}`}>
            {activity.xrayFlux || 'N/A'}
          </div>
          <div className="label">{activity.xrayLevel} Class</div>
        </div>

        <div className="activity-card">
          <h3>Radio Flux</h3>
          <div className="value">{activity.radioFlux10cm || 'N/A'}</div>
          <div className="label">10.7 cm</div>
        </div>

        <div className="activity-card">
          <h3>Solar Wind Speed</h3>
          <div className="value">{activity.solarWindSpeed || 'N/A'} km/s</div>
          <div className="label">Current average</div>
        </div>
      </div>

      <div className="activity-notes">
        <p><strong>Understanding Solar Activity:</strong></p>
        <ul>
          <li>More sunspots = More solar flares = Higher aurora activity</li>
          <li>X-ray Class A/B = Normal, C+ = Notable events</li>
          <li>High radio flux + high wind speed = Excellent aurora conditions</li>
        </ul>
      </div>
    </div>
  );
};

export default SolarActivityPanel;
```

**Backend Endpoint:** `src/routes/solar-activity.js`
```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/api/solar-activity-summary', async (req, res) => {
  try {
    // Fetch multiple NOAA endpoints
    const [xrayRes, radioRes, solarWindRes] = await Promise.all([
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/speed.json'),
      axios.get('https://www.swpc.noaa.gov/text/updates/Sat_Environment.txt'),
      axios.get('https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json')
    ]);

    // Parse and combine data
    const activity = {
      solarWindSpeed: parseFloat(solarWindRes.data[solarWindRes.data.length - 1][1]),
      lastUpdated: new Date().toISOString(),
      source: 'NOAA SWPC'
      // Add more fields as needed
    };

    res.json(activity);
  } catch (error) {
    console.error('Error fetching solar activity:', error);
    res.status(500).json({ error: 'Failed to fetch solar activity' });
  }
});

module.exports = router;
```

---

### 1.6 PHASE 1 - INTEGRATION CHECKLIST

- [ ] Setup caching layer (Redis or in-memory)
- [ ] Create `/api/kp-index` endpoint
- [ ] Create `/api/forecast-3day` endpoint
- [ ] Create `/api/solar-wind` endpoint
- [ ] Create `/api/ovation-forecast` endpoint
- [ ] Create `/api/solar-activity-summary` endpoint
- [ ] Build `KpIndexChart.jsx` component
- [ ] Build `ThreeDayForecast.jsx` component
- [ ] Build `SolarWindGauge.jsx` component
- [ ] Build `OvationMap.jsx` component
- [ ] Build `SolarActivityPanel.jsx` component
- [ ] Style all components with responsive CSS
- [ ] Write unit tests for all endpoints
- [ ] Setup error handling and fallback caching
- [ ] Deploy to staging environment
- [ ] Load testing (verify NOAA APIs can handle your traffic)
- [ ] User testing and feedback
- [ ] Deploy to production

---

## PHASE 2: ADVANCED ANALYTICS (2-3 months)

**Timeline:** Weeks 9-18
**Developer Hours:** 70-80 hours
**Team:** Same as Phase 1 + Data Analyst

### 2.1 Historical Data Analysis

#### Features
- **Trend Analysis**: Compare current conditions to historical averages
- **Pattern Recognition**: Identify solar cycle patterns
- **Prediction Models**: ML-based aurora probability forecasting
- **Custom Date Ranges**: User-selectable historical data viewing

#### Technical Implementation

**Database Schema:**
```sql
CREATE TABLE aurora_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP NOT NULL,
  kp_index DECIMAL(3,1),
  solar_wind_speed INTEGER,
  bz_component DECIMAL(5,2),
  aurora_probability INTEGER,
  observation_quality VARCHAR(20),
  UNIQUE(timestamp)
);

CREATE INDEX idx_timestamp ON aurora_history(timestamp);
CREATE INDEX idx_kp ON aurora_history(kp_index);
```

**Data Collection Service:**
```javascript
// src/services/dataCollector.js
const cron = require('node-cron');
const axios = require('axios');
const db = require('../db');

// Run every hour
cron.schedule('0 * * * *', async () => {
  try {
    const kpData = await axios.get('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    const solarWindData = await axios.get('https://services.swpc.noaa.gov/products/solar-wind/speed.json');

    const latestKp = kpData.data[kpData.data.length - 1];
    const latestWind = solarWindData.data[solarWindData.data.length - 1];

    await db.query(
      `INSERT INTO aurora_history (timestamp, kp_index, solar_wind_speed)
       VALUES ($1, $2, $3)
       ON CONFLICT (timestamp) DO NOTHING`,
      [latestKp.time_tag, latestKp.kp, latestWind[1]]
    );

    console.log('Historical data collected successfully');
  } catch (error) {
    console.error('Error collecting historical data:', error);
  }
});
```

---

### 2.2 Advanced Alert System

#### Alert Types
1. **Threshold Alerts**: Kp > 5, Solar Wind > 600 km/s
2. **Trend Alerts**: Rapid Kp increases
3. **Forecast Alerts**: Strong aurora predicted in next 24h
4. **Location-based**: Specific to Tromsø viewing conditions

#### Technical Implementation

**Alert Engine:**
```javascript
// src/services/alertEngine.js
const nodemailer = require('nodemailer');
const twilio = require('twilio');

class AlertEngine {
  constructor() {
    this.subscribers = new Map();
    this.alertHistory = [];
  }

  async checkConditions(data) {
    const alerts = [];

    // Kp threshold alert
    if (data.kp >= 5) {
      alerts.push({
        type: 'KP_THRESHOLD',
        level: data.kp >= 7 ? 'critical' : 'warning',
        message: `Kp index is ${data.kp} - Strong aurora activity expected!`,
        timestamp: new Date().toISOString()
      });
    }

    // Solar wind alert
    if (data.solarWindSpeed > 600 && data.bz < -5) {
      alerts.push({
        type: 'PERFECT_CONDITIONS',
        level: 'critical',
        message: `Perfect aurora conditions: ${data.solarWindSpeed} km/s + Bz ${data.bz} nT`,
        timestamp: new Date().toISOString()
      });
    }

    // Rapid increase alert
    const trend = await this.calculateTrend(data.kp);
    if (trend > 2) {
      alerts.push({
        type: 'RAPID_INCREASE',
        level: 'warning',
        message: `Kp index rising rapidly (${trend.toFixed(1)} increase in 3 hours)`,
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }

  async sendAlert(alert, subscriber) {
    if (subscriber.method === 'email') {
      await this.sendEmail(subscriber.contact, alert);
    } else if (subscriber.method === 'sms') {
      await this.sendSMS(subscriber.contact, alert);
    } else if (subscriber.method === 'push') {
      await this.sendPushNotification(subscriber.deviceToken, alert);
    }
  }

  async sendEmail(email, alert) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    await transporter.sendMail({
      from: 'alerts@aurora.tromso.ai',
      to: email,
      subject: `Aurora Alert: ${alert.type}`,
      html: `
        <h2>Aurora Alert - ${alert.level.toUpperCase()}</h2>
        <p>${alert.message}</p>
        <p>Time: ${alert.timestamp}</p>
        <p>View live forecast: https://aurora.tromso.ai</p>
      `
    });
  }

  async calculateTrend(currentKp) {
    const history = await db.query(
      'SELECT kp_index FROM aurora_history WHERE timestamp > NOW() - INTERVAL \'3 hours\' ORDER BY timestamp'
    );

    if (history.rows.length < 2) return 0;

    const firstKp = history.rows[0].kp_index;
    return currentKp - firstKp;
  }
}

module.exports = new AlertEngine();
```

**API Endpoints:**
```javascript
// src/routes/alerts.js
const express = require('express');
const router = express.Router();
const alertEngine = require('../services/alertEngine');

// Subscribe to alerts
router.post('/api/alerts/subscribe', async (req, res) => {
  const { email, method, thresholds } = req.body;

  // Validate input
  if (!email || !method) {
    return res.status(400).json({ error: 'Email and method required' });
  }

  const subscriber = {
    id: generateId(),
    email,
    method, // 'email', 'sms', 'push'
    thresholds: thresholds || { kp: 5, solarWind: 500 },
    createdAt: new Date().toISOString()
  };

  await db.query(
    'INSERT INTO alert_subscribers (id, email, method, thresholds) VALUES ($1, $2, $3, $4)',
    [subscriber.id, email, method, JSON.stringify(thresholds)]
  );

  res.json({
    success: true,
    message: 'Subscribed to aurora alerts',
    subscriber
  });
});

// Get active alerts
router.get('/api/alerts/active', async (req, res) => {
  const alerts = await db.query(
    'SELECT * FROM alerts WHERE active = true ORDER BY timestamp DESC'
  );

  res.json(alerts.rows);
});

module.exports = router;
```

---

### 2.3 Geomagnetic Disturbance (dB/dt) Monitoring

#### Component: `src/components/DBdtChart.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DBdtChart = () => {
  const [data, setData] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    fetch('/api/geomagnetic/disturbance')
      .then(res => res.json())
      .then(result => {
        setData(result.timeSeries);
        setAlerts(result.alerts);
      });

    const interval = setInterval(() => {
      fetch('/api/geomagnetic/disturbance')
        .then(res => res.json())
        .then(result => setData(result.timeSeries));
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dbdt-chart">
      <h2>Geomagnetic Rate of Change (dB/dt)</h2>

      {alerts.length > 0 && (
        <div className="alerts">
          {alerts.map((alert, i) => (
            <div key={i} className={`alert alert-${alert.level}`}>
              <strong>{alert.message}</strong> - {alert.time}
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FF6600" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#FF6600" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 12 }} />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="dbdt"
            stroke="#FF6600"
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="info">
        <p><strong>What is dB/dt?</strong></p>
        <p>The rate of change of the geomagnetic field. High values indicate rapid fluctuations that can cause intense aurora displays and potential power grid disturbances.</p>
        <p><strong>Threshold:</strong> > 10 nT/min = Significant aurora activity</p>
      </div>
    </div>
  );
};

export default DBdtChart;
```

---

### 2.4 Machine Learning Aurora Prediction

#### Prediction Model Architecture

**Features Used:**
- Kp index (current + 6-hour history)
- Solar wind speed
- Bz component
- Time of day (higher activity around midnight)
- Season (higher activity during equinoxes)
- Historical patterns

**Model Training:**
```python
# src/ml/aurora_predictor.py
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

class AuroraPredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)

    def prepare_features(self, data):
        features = pd.DataFrame({
            'kp_current': data['kp'],
            'kp_3h_avg': data['kp_history'].rolling(3).mean(),
            'kp_trend': data['kp_history'].diff(),
            'solar_wind_speed': data['solar_wind_speed'],
            'bz': data['bz'],
            'hour': pd.to_datetime(data['timestamp']).dt.hour,
            'month': pd.to_datetime(data['timestamp']).dt.month,
            'bz_negative_duration': (data['bz'] < 0).cumsum()
        })
        return features

    def train(self, historical_data):
        X = self.prepare_features(historical_data)
        y = historical_data['aurora_visible']  # Binary: 1 if aurora was visible, 0 if not

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        self.model.fit(X_train, y_train)
        accuracy = self.model.score(X_test, y_test)

        print(f'Model accuracy: {accuracy:.2%}')
        joblib.dump(self.model, 'aurora_model.pkl')

    def predict_probability(self, current_conditions):
        features = self.prepare_features(current_conditions)
        probability = self.model.predict_proba(features)[:, 1]
        return probability[0]
```

**API Integration:**
```javascript
// src/routes/predictions.js
const express = require('express');
const { spawn } = require('child_process');
const router = express.Router();

router.get('/api/predictions/aurora-probability', async (req, res) => {
  try {
    // Get current conditions
    const conditions = await getCurrentConditions();

    // Call Python ML model
    const python = spawn('python3', ['src/ml/predict.py', JSON.stringify(conditions)]);

    let result = '';
    python.stdout.on('data', (data) => {
      result += data.toString();
    });

    python.on('close', (code) => {
      if (code === 0) {
        const prediction = JSON.parse(result);
        res.json({
          probability: prediction.probability,
          confidence: prediction.confidence,
          factors: prediction.contributing_factors,
          recommendation: getRecommendation(prediction.probability)
        });
      } else {
        res.status(500).json({ error: 'Prediction failed' });
      }
    });
  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ error: 'Failed to generate prediction' });
  }
});

function getRecommendation(probability) {
  if (probability > 0.8) return 'Excellent! Go outside now!';
  if (probability > 0.6) return 'Very good chance - worth checking outside';
  if (probability > 0.4) return 'Moderate chance - keep monitoring';
  if (probability > 0.2) return 'Low chance - maybe later tonight';
  return 'Very low chance - unlikely to see aurora';
}

module.exports = router;
```

---

### 2.5 PHASE 2 - INTEGRATION CHECKLIST

- [ ] Setup PostgreSQL database for historical data
- [ ] Implement data collection cron jobs
- [ ] Build historical data API endpoints
- [ ] Create trend analysis algorithms
- [ ] Implement alert subscription system
- [ ] Setup email/SMS delivery (Twilio, SendGrid)
- [ ] Build dB/dt monitoring component
- [ ] Train ML prediction model
- [ ] Deploy ML model to production
- [ ] Create prediction API endpoint
- [ ] Write integration tests
- [ ] Performance testing
- [ ] Deploy to production

---

## PHASE 3: MARKET DIFFERENTIATION (1-2 months)

**Timeline:** Weeks 19-24
**Developer Hours:** 40-50 hours
**Team:** Full team + Business Development

### 3.1 Premium Features

#### Free Tier
- Real-time Kp index
- 3-day forecast
- Basic aurora probability
- Manual alerts (user checks website)

#### Premium Tier ($9.99/month)
- Advanced ML predictions
- Automated email/SMS alerts
- Historical data access (1 year)
- Location-specific forecasts
- Ad-free experience
- Early access to new features

#### Enterprise Tier ($299/month)
- API access (10,000 calls/day)
- Custom alert webhooks
- Historical data (unlimited)
- White-label option
- Dedicated support
- Custom integrations

---

### 3.2 API for Third-party Integration

**API Documentation:**

```markdown
# Aurora.Tromso.ai Public API

## Authentication
All requests require an API key in the header:
```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### GET /api/v1/current
Returns current aurora conditions

**Response:**
```json
{
  "kp": 4.5,
  "solarWindSpeed": 520,
  "bz": -3.2,
  "probability": 75,
  "forecast": "Good aurora conditions expected",
  "lastUpdated": "2025-12-25T20:00:00Z"
}
```

### GET /api/v1/forecast
Returns 3-day forecast

**Response:**
```json
{
  "forecast": [
    {
      "date": "2025-12-26",
      "kpMax": 5,
      "probability": 65,
      "quality": "good"
    },
    ...
  ]
}
```

### POST /api/v1/alerts/subscribe
Subscribe to webhook alerts

**Request:**
```json
{
  "url": "https://your-service.com/webhook",
  "thresholds": {
    "kp": 5,
    "probability": 70
  }
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_abc123"
}
```

## Rate Limits
- Free: 100 requests/day
- Premium: 1,000 requests/day
- Enterprise: 10,000 requests/day

## Webhook Format
When an alert is triggered, we'll POST to your URL:

```json
{
  "event": "aurora_alert",
  "timestamp": "2025-12-25T20:00:00Z",
  "data": {
    "kp": 6.5,
    "probability": 85,
    "message": "Strong aurora activity expected"
  }
}
```
```

---

### 3.3 Mobile App Integration

**React Native Components:**

```jsx
// mobile/components/AuroraDashboard.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import PushNotification from 'react-native-push-notification';

const AuroraDashboard = () => {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();

    // Setup push notifications
    PushNotification.configure({
      onNotification: (notification) => {
        console.log('Notification:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true
      }
    });
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://aurora.tromso.ai/api/current');
      const result = await response.json();
      setData(result);

      // Check if we should send a notification
      if (result.probability > 70) {
        sendLocalNotification(result);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const sendLocalNotification = (data) => {
    PushNotification.localNotification({
      title: 'Aurora Alert!',
      message: `${data.probability}% chance of aurora - Go outside now!`,
      playSound: true,
      soundName: 'default'
    });
  };

  if (!data) return <Text>Loading...</Text>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={fetchData} />
      }
    >
      <View style={styles.card}>
        <Text style={styles.title}>Current Conditions</Text>
        <Text style={styles.value}>{data.kp.toFixed(1)}</Text>
        <Text style={styles.label}>Kp Index</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Aurora Probability</Text>
        <Text style={[styles.value, { color: getProbabilityColor(data.probability) }]}>
          {data.probability}%
        </Text>
        <Text style={styles.label}>{data.forecast}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Solar Wind</Text>
        <Text style={styles.value}>{data.solarWindSpeed} km/s</Text>
        <Text style={styles.label}>Bz: {data.bz.toFixed(1)} nT</Text>
      </View>
    </ScrollView>
  );
};

const getProbabilityColor = (prob) => {
  if (prob > 70) return '#00CC00';
  if (prob > 40) return '#FFCC00';
  return '#FF6600';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  value: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#0066CC'
  },
  label: {
    fontSize: 14,
    color: '#666'
  }
});

export default AuroraDashboard;
```

---

### 3.4 PHASE 3 - INTEGRATION CHECKLIST

- [ ] Design pricing tiers
- [ ] Implement payment processing (Stripe)
- [ ] Build subscription management system
- [ ] Create API key generation system
- [ ] Write comprehensive API documentation
- [ ] Build developer portal
- [ ] Implement webhook system
- [ ] Create React Native mobile app
- [ ] Setup push notification service (Firebase)
- [ ] App Store submission (iOS)
- [ ] Google Play submission (Android)
- [ ] Marketing materials
- [ ] Launch campaign

---

## TECHNICAL ARCHITECTURE

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
├─────────────────────────────────────────────────────────────┤
│  React Components  │  Mobile App (React Native)            │
│  - KpIndexChart    │  - Dashboard                          │
│  - ThreeDayForecast│  - Alerts                             │
│  - SolarWindGauge  │  - Settings                           │
│  - OvationMap      │                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Express.js REST API                                        │
│  - /api/kp-index                                            │
│  - /api/forecast-3day                                       │
│  - /api/solar-wind                                          │
│  - /api/predictions                                         │
│  - /api/alerts                                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Services                                                   │
│  - Data Collector (cron jobs)                               │
│  - Alert Engine                                             │
│  - ML Prediction Service                                    │
│  - Cache Manager (Redis)                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL                  │  Redis Cache                 │
│  - Historical data           │  - NOAA data (1 hour TTL)   │
│  - User subscriptions        │  - API responses            │
│  - Alert history             │                              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     External Data Sources                    │
├─────────────────────────────────────────────────────────────┤
│  NOAA SWPC                                                  │
│  - Kp Index API                                             │
│  - Solar Wind API                                           │
│  - 3-Day Forecast                                           │
│  - OVATION Model                                            │
└─────────────────────────────────────────────────────────────┘
```

---

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                        │
│  - Static assets                                            │
│  - DDoS protection                                          │
│  - SSL/TLS                                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (Nginx)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────┬────────────────────┬───────────────────┐
│   App Server 1     │   App Server 2     │   App Server 3    │
│   (Node.js)        │   (Node.js)        │   (Node.js)       │
└────────────────────┴────────────────────┴───────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Cluster                          │
│  Primary PostgreSQL + Read Replicas                         │
└─────────────────────────────────────────────────────────────┘
```

---

## API SPECIFICATIONS

### Complete NOAA Endpoints Reference

```
1. Kp Index (Planetary K-index)
   GET https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json
   Update frequency: Every 3 hours
   Format: JSON

2. 3-Day Geomagnetic Forecast
   GET https://www.swpc.noaa.gov/products/3-day-geomagnetic-forecast
   Update frequency: 4 times per day (00:30, 06:30, 12:30, 18:30 UTC)
   Format: HTML/Text

3. Solar Wind Speed
   GET https://services.swpc.noaa.gov/products/solar-wind/speed.json
   Update frequency: Every 10 minutes
   Format: JSON

4. Solar Wind Magnetic Field
   GET https://services.swpc.noaa.gov/products/solar-wind/mag-6-hour.json
   Update frequency: Every 6 hours
   Format: JSON

5. OVATION Aurora Forecast
   GET https://services.swpc.noaa.gov/json/ovation_30min_forecast.json
   Image: https://www.swpc.noaa.gov/images/animations/ovation/north/latest.png
   Update frequency: Every 30 minutes
   Format: JSON + PNG

6. X-ray Flux
   GET https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json
   Update frequency: Real-time
   Format: JSON

7. Geomagnetic Components
   GET https://www.swpc.noaa.gov/products/station-k-and-a-indices
   Update frequency: Hourly
   Format: Text
```

---

## TESTING & DEPLOYMENT

### Testing Strategy

**Unit Tests:**
```javascript
// tests/api/kp-index.test.js
describe('Kp Index API', () => {
  it('should return valid Kp data', async () => {
    const res = await request(app).get('/api/kp-index');
    expect(res.statusCode).toBe(200);
    expect(res.body.current).toBeGreaterThanOrEqual(0);
    expect(res.body.current).toBeLessThanOrEqual(9);
  });

  it('should use cache when available', async () => {
    const res1 = await request(app).get('/api/kp-index');
    const res2 = await request(app).get('/api/kp-index');
    expect(res1.body.lastUpdated).toBe(res2.body.lastUpdated);
  });

  it('should handle NOAA API failures gracefully', async () => {
    // Mock NOAA API failure
    nock('https://services.swpc.noaa.gov')
      .get('/products/noaa-planetary-k-index.json')
      .replyWithError('Network error');

    const res = await request(app).get('/api/kp-index');
    expect(res.statusCode).toBe(200); // Should return cached data
    expect(res.body.error).toBeDefined();
  });
});
```

**Integration Tests:**
```javascript
describe('Alert System Integration', () => {
  it('should send alert when Kp exceeds threshold', async () => {
    // Setup mock subscriber
    const subscriber = await createTestSubscriber({
      email: 'test@example.com',
      threshold: 5
    });

    // Simulate high Kp
    await simulateKpValue(6.5);

    // Wait for alert processing
    await delay(2000);

    // Verify email was sent
    const emails = await getTestEmails();
    expect(emails).toHaveLength(1);
    expect(emails[0].subject).toContain('Aurora Alert');
  });
});
```

**Load Tests:**
```javascript
// tests/load/api-load.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  let response = http.get('https://aurora.tromso.ai/api/kp-index');

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

---

### Deployment Checklist

**Pre-deployment:**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Load testing completed (target: 1000 req/s)
- [ ] Security audit passed
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] Monitoring setup (DataDog/New Relic)
- [ ] Error tracking configured (Sentry)
- [ ] Backup strategy in place

**Deployment Steps:**
1. Deploy database migrations
2. Deploy backend API (blue-green deployment)
3. Deploy frontend (CDN cache invalidation)
4. Smoke tests in production
5. Monitor for errors (1 hour)
6. Roll back if error rate > 1%

**Post-deployment:**
- [ ] Verify all endpoints responding
- [ ] Check NOAA data fetching correctly
- [ ] Test alert system
- [ ] Monitor server metrics
- [ ] Update documentation

---

## REVENUE MODEL

### Pricing Tiers

| Feature | Free | Premium ($9.99/mo) | Enterprise ($299/mo) |
|---------|------|-------------------|---------------------|
| Real-time Kp index | ✅ | ✅ | ✅ |
| 3-day forecast | ✅ | ✅ | ✅ |
| Basic probability | ✅ | ✅ | ✅ |
| Advanced ML predictions | ❌ | ✅ | ✅ |
| Email/SMS alerts | ❌ | ✅ | ✅ |
| Historical data | 7 days | 1 year | Unlimited |
| API access | ❌ | 100 calls/day | 10,000 calls/day |
| Custom webhooks | ❌ | ❌ | ✅ |
| White-label | ❌ | ❌ | ✅ |
| Dedicated support | ❌ | ❌ | ✅ |

### Revenue Projections

**Year 1:**
- 10,000 free users
- 500 premium subscribers = $4,995/month = $59,940/year
- 10 enterprise clients = $2,990/month = $35,880/year
- **Total: $95,820/year**

**Year 2:**
- 50,000 free users
- 2,000 premium subscribers = $19,980/month = $239,760/year
- 25 enterprise clients = $7,475/month = $89,700/year
- **Total: $329,460/year**

**Year 3:**
- 100,000 free users
- 5,000 premium subscribers = $49,950/month = $599,400/year
- 50 enterprise clients = $14,950/month = $179,400/year
- **Total: $778,800/year**

---

## COMPETITIVE ANALYSIS

### Polarforecast.com vs. Aurora.Tromso.ai

| Feature | Polarforecast | Aurora.Tromso.ai |
|---------|--------------|------------------|
| Real-time Kp | ✅ | ✅ |
| 3-day forecast | ✅ | ✅ |
| Solar wind data | ✅ | ✅ |
| OVATION map | ❌ | ✅ |
| ML predictions | ❌ | ✅ |
| Historical data | Limited | Unlimited (premium) |
| API access | ❌ | ✅ |
| Mobile app | ❌ | ✅ |
| Custom alerts | Basic | Advanced |
| Location-specific | ❌ | ✅ (Tromsø focus) |
| Enterprise features | ❌ | ✅ |

### Unique Selling Points

1. **Tromsø-Specific**: Optimized for Northern Norway viewing conditions
2. **ML-Powered**: Advanced prediction algorithms
3. **Developer-Friendly**: Comprehensive API for third-party integrations
4. **Enterprise-Ready**: White-label and custom webhook support
5. **Mobile-First**: Native iOS/Android apps with push notifications
6. **Community**: User-submitted aurora photos and reports

---

## CONCLUSION

This roadmap provides a comprehensive plan for integrating NOAA Space Weather data into aurora.tromso.ai. By following this phased approach:

**Phase 1 (Months 1-2)**: Establishes core functionality with real-time data
**Phase 2 (Months 3-5)**: Adds advanced analytics and ML predictions
**Phase 3 (Months 6-7)**: Implements monetization and market differentiation

**Key Success Factors:**
- ✅ All NOAA data is free and public domain
- ✅ No licensing restrictions
- ✅ Comprehensive documentation
- ✅ Scalable architecture
- ✅ Clear monetization strategy

**Next Steps:**
1. Review and approve this roadmap
2. Assemble development team
3. Setup development environment
4. Begin Phase 1 implementation
5. Regular progress reviews (bi-weekly)

**Contact:**
For questions or modifications to this roadmap, contact the development team lead.

---

**Document Version:** 1.0
**Last Updated:** 2025-12-25
**Status:** Ready for Implementation
