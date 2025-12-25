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
**Team:** Same as Phase 1

### 2.1 Geomagnetic Disturbance Tracking

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

    // Refresh every 5 minutes
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
          <Area type="monotone" dataKey="dbdt" stroke="#FF6600" fillOpacity={1} fill="url
