# iOS App Integration Guide

**Aurora Watcher → Aurora.tromso.ai Backend**

Complete guide for integrating the Aurora Watcher iOS app with the new aurora.tromso.ai backend API.

---

## 📋 Overview

The aurora-webapp now serves as the production backend for the Aurora Watcher iOS app, providing:

- ✅ **5 API endpoints** with real-time aurora data
- ✅ **API key authentication** (iOS app has dedicated key)
- ✅ **Rate limiting** (10,000 requests/hour for iOS app)
- ✅ **CORS support** for cross-origin requests
- ✅ **Error monitoring** with Sentry
- ✅ **Structured logging** for debugging
- ✅ **Health checks** for monitoring

---

## 🔑 API Authentication

### iOS App API Key

```
tro_app_aurora_watcher_v1
```

**Tier:** iOS App (High Priority)
**Rate Limit:** 10,000 requests/hour
**Status:** Active

### How to Use

All API requests must include the API key in the `X-API-Key` header:

```swift
var request = URLRequest(url: url)
request.setValue("tro_app_aurora_watcher_v1", forHTTPHeaderField: "X-API-Key")
```

---

## 🌐 API Endpoints

### Base URL

**Development:** `http://localhost:3002/api/aurora`
**Production:** `https://aurora.tromso.ai/api/aurora`

### 1. Current Aurora Conditions

```
GET /api/aurora/now
```

**Response:**
```json
{
  "score": 68,
  "level": "good",
  "confidence": "high",
  "headline": "Gode sjanser for nordlys nå",
  "location": {
    "name": "Tromsø",
    "lat": 69.6492,
    "lon": 18.9553
  },
  "solar_wind": {
    "speed": 520,
    "density": 8.2,
    "bz": -5.3
  },
  "kp_index": 4.7,
  "cloud_coverage": 25,
  "visibility": "good",
  "recommendation": "Gå ut og se!",
  "updated": "2025-12-21T11:00:00.000Z"
}
```

**Cache:** 5 minutes
**Use Case:** Home screen, real-time alerts

---

### 2. Tonight's Forecast

```
GET /api/aurora/tonight
```

**Response:**
```json
{
  "score": 72,
  "level": "good",
  "confidence": "high",
  "headline": "Gode sjanser for nordlys i kveld",
  "summary": "Sterk solvind og lav skydekke...",
  "best_time": "Mellom 21:00 og 02:00",
  "tips": [
    "Finn et sted med lite lys",
    "Kle deg varmt",
    "Ha tålmodighet"
  ],
  "updated": "2025-12-21T11:00:00.000Z"
}
```

**Cache:** 15 minutes
**Use Case:** Tonight view, push notification timing

---

### 3. Hourly Forecast (24h)

```
GET /api/aurora/hourly
```

**Response:**
```json
{
  "status": "success",
  "location": "tromso",
  "hours": 24,
  "hourly_forecast": [
    {
      "time": "2025-12-21T12:00:00.000Z",
      "hour": 12,
      "probability": 45,
      "kp": 5.5,
      "weather": {
        "cloudCoverage": 38,
        "temperature": 4,
        "windSpeed": 8,
        "conditions": "partly_cloudy"
      },
      "visibility": "good"
    }
    // ... 23 more hours
  ],
  "generated_at": "2025-12-21T11:00:00.000Z",
  "meta": {
    "cached": false,
    "fallback": false,
    "timestamp": "2025-12-21T11:00:00.000Z"
  }
}
```

**Cache:** 15 minutes
**Use Case:** Hourly chart view

---

### 4. Multi-Day Forecast

```
GET /api/aurora/forecast?days=7
```

**Query Parameters:**
- `days` (optional): Number of days (default: 3, max: 7)

**Response:**
```json
{
  "status": "success",
  "location": "tromso",
  "days_count": 3,
  "days": [
    {
      "date": "2025-12-21",
      "probability": 65,
      "peak_time": "22:00",
      "kp_forecast": [4.5, 5.2, 6.1],
      "weather": {
        "cloudCoverage": 35,
        "conditions": "partly_cloudy"
      },
      "rating": "good"
    }
    // ... more days
  ],
  "generated_at": "2025-12-21T11:00:00.000Z"
}
```

**Cache:** 30 minutes
**Use Case:** Week view, planning

---

### 5. Aurora Oval (Live Map Data)

```
GET /api/aurora/oval
```

**Response:**
```json
{
  "timestamp": "2025-12-21T11:00:00.000Z",
  "coordinates": [
    {
      "lat": 67.5,
      "lon": 15.2,
      "intensity": 0.75
    }
    // ... ~100 points forming the oval
  ],
  "kp_index": 4.7,
  "oval_position": "south",
  "tromsø_visibility": true
}
```

**Cache:** 5 minutes
**Use Case:** Live map visualization

---

## 📊 Rate Limiting

### Response Headers

All successful requests include rate limit information:

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9876
X-RateLimit-Reset: 1703163600000
```

### Rate Limit Exceeded (429)

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "limit": 10000,
  "reset": "2025-12-21T12:00:00.000Z"
}
```

**Recommendation:** Implement exponential backoff and respect reset time.

---

## 🚨 Error Handling

### Authentication Errors

**401 Unauthorized** - Missing API key:
```json
{
  "error": "Unauthorized",
  "message": "API key is required. Please provide X-API-Key header.",
  "documentation": "https://aurora.tromso.ai/docs/authentication"
}
```

**403 Forbidden** - Invalid API key:
```json
{
  "error": "Forbidden",
  "message": "Invalid API key.",
  "documentation": "https://aurora.tromso.ai/docs/authentication"
}
```

### Server Errors

**500 Internal Server Error:**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

**503 Service Unavailable:**
```json
{
  "error": "Service Unavailable",
  "message": "Backend service temporarily unavailable"
}
```

---

## 🔧 iOS Implementation Example

### Swift URLSession Implementation

```swift
import Foundation

class AuroraAPIClient {
    private let baseURL = "https://aurora.tromso.ai/api/aurora"
    private let apiKey = "tro_app_aurora_watcher_v1"

    func getCurrentConditions() async throws -> AuroraConditions {
        let url = URL(string: "\(baseURL)/now")!
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuroraError.invalidResponse
        }

        // Check rate limit headers
        if let remaining = httpResponse.value(forHTTPHeaderField: "X-RateLimit-Remaining"),
           let limit = httpResponse.value(forHTTPHeaderField: "X-RateLimit-Limit") {
            print("Rate limit: \(remaining)/\(limit)")
        }

        guard httpResponse.statusCode == 200 else {
            if httpResponse.statusCode == 429 {
                throw AuroraError.rateLimitExceeded
            }
            throw AuroraError.httpError(httpResponse.statusCode)
        }

        return try JSONDecoder().decode(AuroraConditions.self, from: data)
    }

    func getTonightForecast() async throws -> TonightForecast {
        let url = URL(string: "\(baseURL)/tonight")!
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(TonightForecast.self, from: data)
    }

    func getHourlyForecast() async throws -> HourlyForecast {
        let url = URL(string: "\(baseURL)/hourly")!
        var request = URLRequest(url: url)
        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")

        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(HourlyForecast.self, from: data)
    }
}

enum AuroraError: Error {
    case invalidResponse
    case rateLimitExceeded
    case httpError(Int)
    case decodingError
}
```

---

## 📱 Recommended Caching Strategy

### Client-Side Caching

To minimize API calls and respect rate limits:

```swift
class AuroraCacheManager {
    private let cache = NSCache<NSString, CacheEntry>()

    func getCached<T>(key: String, maxAge: TimeInterval) -> T? {
        guard let entry = cache.object(forKey: key as NSString),
              Date().timeIntervalSince(entry.timestamp) < maxAge else {
            return nil
        }
        return entry.data as? T
    }

    func setCached<T>(key: String, data: T) {
        let entry = CacheEntry(data: data, timestamp: Date())
        cache.setObject(entry, forKey: key as NSString)
    }
}
```

**Recommended Max Ages:**
- `/now`: 5 minutes
- `/tonight`: 15 minutes
- `/hourly`: 15 minutes
- `/forecast`: 30 minutes
- `/oval`: 5 minutes

---

## 🔔 Push Notifications

### Triggering Notifications

Use `/now` endpoint to check current conditions:

```swift
func checkForHighProbability() async {
    do {
        let conditions = try await apiClient.getCurrentConditions()

        if conditions.score >= 70 && conditions.level == "excellent" {
            sendPushNotification(
                title: "Nordlys alarm!",
                body: conditions.headline,
                score: conditions.score
            )
        }
    } catch {
        print("Failed to check conditions: \(error)")
    }
}
```

**Recommended Check Interval:** Every 10 minutes (600 req/hour max)

---

## 🧪 Testing

### Health Check

Before making actual requests, verify backend health:

```
GET /api/health
```

```swift
func checkBackendHealth() async -> Bool {
    let url = URL(string: "https://aurora.tromso.ai/api/health")!

    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        let health = try JSONDecoder().decode(HealthStatus.self, from: data)
        return health.status == "healthy"
    } catch {
        return false
    }
}
```

---

## 🚀 Migration Checklist

- [ ] Update API base URL to `aurora.tromso.ai`
- [ ] Add `X-API-Key` header to all requests
- [ ] Update data models to match new response schemas
- [ ] Implement rate limit header parsing
- [ ] Add client-side caching with recommended max ages
- [ ] Handle 401/403/429 errors gracefully
- [ ] Test all 5 endpoints with production API key
- [ ] Verify push notification logic works with new data
- [ ] Update app settings/about screen with new backend info
- [ ] Submit updated app to App Store

---

## 📞 Support

**Issues:** https://github.com/FPVE-Webdev/aurora-webapp/issues
**Documentation:** https://aurora.tromso.ai/docs
**Backend Status:** https://aurora.tromso.ai/api/health

---

**Last Updated:** 21. desember 2025
**Backend Version:** 1.0.0
**iOS App Tier:** High Priority (10K req/hour)
