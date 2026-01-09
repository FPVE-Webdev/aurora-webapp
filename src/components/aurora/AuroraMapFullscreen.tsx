'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { SubscriptionTier } from '@/contexts/PremiumContext';
import AuroraOverlay from '@/components/aurora/AuroraOverlay';
import { deriveOverlayState } from '@/components/aurora/animations';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface HourlyData {
  time: string;
  hour: number;
  probability: number;
  kp: number;
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    conditions: string;
  };
  visibility: string;
  canSeeAurora?: boolean;
}

interface SpotForecast {
  spot: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  currentProbability: number;
  kp: number;
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    symbolCode: string;
  };
  hourlyForecast?: HourlyData[];
}

interface AuroraPoint {
  lat: number;
  lon: number;
  probability: number;
}

interface Props {
  forecasts: SpotForecast[];
  selectedSpotId: string;
  onSelectSpot: (spotId: string) => void;
  kpIndex: number;
  animationHour?: number; // Current hour in animation (0-12)
  subscriptionTier: SubscriptionTier;
}

// Tromsø area bounds for Free/Pro users
const TROMSO_BOUNDS: [[number, number], [number, number]] = [
  [18.6, 69.5],  // Southwest [lng, lat]
  [19.2, 69.8]   // Northeast [lng, lat]
];

function getMarkerColor(probability: number): string {
  if (probability >= 70) return '#34f5c5'; // Primary cyan - Excellent
  if (probability >= 50) return '#22c55e'; // Green - Good
  if (probability >= 30) return '#8b5cf6'; // Purple - Moderate
  if (probability >= 15) return '#f97316'; // Orange - Fair
  return '#64748b'; // Gray - Poor
}

function getWeatherEmoji(symbolCode: string): string {
  const code = symbolCode.toLowerCase();
  if (code.includes('clearsky') || code.includes('fair')) return '🌅';
  if (code.includes('partlycloudy')) return '⛅';
  if (code.includes('cloudy')) return '☁️';
  if (code.includes('snow')) return '🌨️';
  if (code.includes('rain')) return '🌧️';
  return '☁️';
}

function calculateProbabilityFromOvalPosition(
  latitude: number,
  longitude: number,
  kpIndex: number
): number {
  const { probability, canView } = calculateAuroraProbability({
    kpIndex,
    cloudCoverage: 30,
    temperature: -10,
    latitude,
    longitude,
  });
  return canView ? probability : 0;
}

export default function AuroraMapFullscreen({
  forecasts,
  selectedSpotId,
  onSelectSpot,
  kpIndex,
  animationHour = 0,
  subscriptionTier
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [auroraData, setAuroraData] = useState<AuroraPoint[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showAnimation, setShowAnimation] = useState(true);
  const [hoveredMarker, setHoveredMarker] = useState<{
    name: string;
    temp: number;
    emoji: string;
    x: number;
    y: number;
  } | null>(null);

  // Determine if user has unrestricted map access (Enterprise only)
  const hasUnrestrictedAccess = subscriptionTier === 'enterprise';
  const activeForecast =
    forecasts.find((f) => f.spot.id === selectedSpotId) || forecasts[0];
  const overlayState = deriveOverlayState(activeForecast as any, animationHour);

  useEffect(() => {
    // #region agent log
    const tokenPresent = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    console.log('[debug-live] AuroraMapFullscreen mount', {
      tokenPresent,
      forecastCount: forecasts?.length ?? 0,
      selectedSpotId,
      animationHour,
    });
    fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraMapFullscreen.tsx:126',message:'map fullscreen mount',data:{tokenPresent,forecastCount:forecasts?.length??0,selectedSpotId,animationHour},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  }, [animationHour, forecasts?.length, selectedSpotId]);

  // Fetch aurora oval data
  const fetchAuroraData = useCallback(async () => {
    try {
      const url = '/api/aurora/oval?resolution=medium';
      console.log('📡 Fetching aurora oval from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Invalid content-type:', contentType);
        console.error('Response text:', text.substring(0, 200));
        throw new Error(`Invalid content-type: ${contentType}. Expected JSON.`);
      }

      const data = await response.json();
      console.log('✅ Aurora oval data loaded:', data);

      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        if (feature.geometry && feature.geometry.coordinates) {
          const coordinates = feature.geometry.coordinates[0];
          const auroraPoints: AuroraPoint[] = coordinates.map(([lon, lat]: [number, number]) => ({
            lat,
            lon,
            probability: 70
          }));
          setAuroraData(auroraPoints);
        }
      } else if (data && data.coordinates && data.coordinates.length > 0) {
        setAuroraData(data.coordinates);
      }
    } catch (error) {
      console.error('❌ Failed to fetch aurora oval:', error);
      setAuroraData([]);
    }
  }, []);

  useEffect(() => {
    fetchAuroraData();
    const interval = setInterval(fetchAuroraData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAuroraData]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up existing map
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Create map with restrictions for Free/Pro users
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [18.9, 69.65], // Tromsø center
      zoom: hasUnrestrictedAccess ? 6 : 8.5,
      pitch: 65, // 3D angle view
      bearing: -20, // Slight rotation for dramatic effect
      attributionControl: false,
      ...(hasUnrestrictedAccess ? {
        // Enterprise: Full map access
        minZoom: 5,
        maxZoom: 14,
      } : {
        // Free/Pro: Restricted to Tromsø
        maxBounds: TROMSO_BOUNDS,
        minZoom: 7,
        maxZoom: 12,
      })
    });

    // Add zoom controls
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      console.log('🗺️ Mapbox map loaded');

      // Add 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14
      });

      map.setTerrain({
        source: 'mapbox-dem',
        exaggeration: 1.8 // Dramatic terrain
      });

      // Add snow-covered land styling
      map.setPaintProperty('land-structure-polygon', 'fill-color', '#f0f4f8');
      map.setPaintProperty('land-structure-line', 'line-color', '#d0dce5');

      // Override water to ice-blue
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#b8d4e8');
      }

      // Add hillshade for dramatic snow-covered mountains
      map.addSource('hillshade-source', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512
      });

      map.addLayer({
        id: 'hillshade',
        type: 'hillshade',
        source: 'hillshade-source',
        paint: {
          'hillshade-exaggeration': 0.8,
          'hillshade-shadow-color': '#4a5568',
          'hillshade-highlight-color': '#ffffff',
          'hillshade-accent-color': '#e2e8f0'
        }
      }, 'waterway-label');

      // Add winter sky layer
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 5,
          'sky-atmosphere-color': '#c5d9e8',
          'sky-atmosphere-halo-color': '#e8f1f7'
        }
      });

      console.log('✅ 3D terrain and snow styling applied');
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hasUnrestrictedAccess]);

  // Render aurora oval polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showOverlay || auroraData.length === 0) return;

    const beltPoints = auroraData
      .filter(p => p.probability >= 10)
      .sort((a, b) => a.lon - b.lon);

    if (beltPoints.length < 5) {
      console.log('⚠️ Not enough aurora oval points:', beltPoints.length);
      return;
    }

    console.log(`✅ Rendering aurora oval with ${beltPoints.length} points`);

    // Create GeoJSON for aurora oval
    const ovalGeoJSON: GeoJSON.Feature<GeoJSON.Polygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [beltPoints.map(p => [p.lon, p.lat])]
      }
    };

    const avgProbability = beltPoints.reduce((sum, p) => sum + p.probability, 0) / beltPoints.length;
    const ovalColor = avgProbability >= 70 ? '#22c55e' : avgProbability >= 50 ? '#34d399' : '#10b981';
    const ovalOpacity = Math.min(0.6, avgProbability / 100);

    // Add source if it doesn't exist
    if (!map.getSource('aurora-oval')) {
      map.addSource('aurora-oval', {
        type: 'geojson',
        data: ovalGeoJSON
      });

      // Fill layer
      map.addLayer({
        id: 'aurora-oval-fill',
        type: 'fill',
        source: 'aurora-oval',
        paint: {
          'fill-color': ovalColor,
          'fill-opacity': ovalOpacity * 0.3
        }
      });

      // Outline layer
      map.addLayer({
        id: 'aurora-oval-line',
        type: 'line',
        source: 'aurora-oval',
        paint: {
          'line-color': ovalColor,
          'line-width': 3,
          'line-opacity': ovalOpacity,
          'line-blur': 2
        }
      });
    } else {
      // Update existing source
      const source = map.getSource('aurora-oval') as mapboxgl.GeoJSONSource;
      source.setData(ovalGeoJSON);

      // Update colors
      map.setPaintProperty('aurora-oval-fill', 'fill-color', ovalColor);
      map.setPaintProperty('aurora-oval-fill', 'fill-opacity', ovalOpacity * 0.3);
      map.setPaintProperty('aurora-oval-line', 'line-color', ovalColor);
      map.setPaintProperty('aurora-oval-line', 'line-opacity', ovalOpacity);
    }
  }, [auroraData, showOverlay]);

  // Add forecast markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || forecasts.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each forecast
    forecasts.forEach((forecast) => {
      let displayProbability = forecast.currentProbability;
      let displayKp = forecast.kp;
      let displayWeather = forecast.weather;

      if (forecast.hourlyForecast && forecast.hourlyForecast.length > 0) {
        const hourIndex = Math.floor(animationHour);
        const hourData = forecast.hourlyForecast[hourIndex];

        if (hourData) {
          // #region agent log
          const hd: any = hourData as any;
          const hasWeatherObj = !!hd?.weather;
          const hdKeys = hd ? Object.keys(hd) : [];
          console.log('[debug-live] hourly shape', {
            spotId: forecast.spot.id,
            hourIndex,
            hasWeatherObj,
            hdKeys: hdKeys.slice(0, 20),
          });
          fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraMapFullscreen.tsx:381',message:'hourly shape',data:{spotId:forecast.spot.id,hourIndex,hasWeatherObj,hdKeys:hdKeys.slice(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion

          displayProbability = (hourData.canSeeAurora !== false)
            ? hourData.probability
            : 0;
          // NOTE: The following access is the suspected crash point when hourly data is flat (no hourData.weather)
          try {
            displayKp = (hourData as any).kp;
            displayWeather = {
              cloudCoverage: (hourData as any).weather.cloudCoverage,
              temperature: (hourData as any).weather.temperature,
              windSpeed: (hourData as any).weather.windSpeed,
              symbolCode: (hourData as any).weather.conditions
            };
          } catch (err) {
            // #region agent log
            console.error('[debug-live] crash reading hourData.weather', {
              spotId: forecast.spot.id,
              hourIndex,
            }, err);
            fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraMapFullscreen.tsx:399',message:'crash reading hourData.weather',data:{spotId:forecast.spot.id,hourIndex},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
            // #endregion
            throw err;
          }
        }
      }

      const color = getMarkerColor(displayProbability);

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'aurora-marker';
      el.style.cssText = `
        background: ${color};
        color: white;
        padding: 4px 10px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 13px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.5);
        border: 2px solid white;
        white-space: nowrap;
        font-family: system-ui, sans-serif;
        cursor: pointer;
        transition: transform 0.2s;
        transform-origin: center center;
      `;
      el.textContent = `${displayProbability}%`;

      // Hover: show tooltip
      el.addEventListener('mouseenter', (e) => {
        el.style.transform = 'scale(1.15)';
        const rect = el.getBoundingClientRect();
        setHoveredMarker({
          name: forecast.spot.name,
          temp: displayWeather.temperature,
          emoji: getWeatherEmoji(displayWeather.symbolCode),
          x: rect.left + rect.width / 2,
          y: rect.top
        });
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        setHoveredMarker(null);
      });

      // Click: select location
      el.addEventListener('click', () => {
        onSelectSpot(forecast.spot.id);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([forecast.spot.longitude, forecast.spot.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [forecasts, onSelectSpot, animationHour]);

  // Add aurora oval halo badges
  useEffect(() => {
    const map = mapRef.current;
    if (!map || auroraData.length === 0 || !showOverlay) return;

    console.log('🎯 Rendering aurora halo badges along oval');

    const badgePoints = auroraData.filter((_, i) => i % 5 === 0);

    badgePoints.forEach((point) => {
      const probability = calculateProbabilityFromOvalPosition(point.lat, point.lon, kpIndex);
      const color = getMarkerColor(probability);

      const el = document.createElement('div');
      el.style.cssText = `
        background: ${color};
        color: white;
        padding: 3px 9px;
        border-radius: 11px;
        font-size: 11px;
        font-weight: bold;
        white-space: nowrap;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        border: 1.5px solid rgba(255,255,255,0.9);
        font-family: system-ui;
      `;
      el.textContent = `${Math.round(probability)}%`;

      const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(`
        <div style="text-align: center; padding: 5px; font-family: system-ui;">
          <p style="font-weight: bold; margin: 0 0 4px 0; font-size: 13px; color: #1a202c;">Aurora Oval</p>
          <p style="font-size: 18px; font-weight: bold; margin: 0; color: ${color};">${Math.round(probability)}%</p>
          <p style="font-size: 11px; color: #666; margin: 4px 0 0 0;">Lat: ${point.lat.toFixed(2)}°</p>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([point.lon, point.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    console.log(`✅ Rendered ${badgePoints.length} halo badges along aurora oval`);
  }, [auroraData, showOverlay, kpIndex]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Aurora + cloud overlay */}
      {showAnimation && (
        <AuroraOverlay
          intensity01={overlayState.intensity01}
          cloud01={overlayState.cloud01}
        />
      )}

      {/* Aurora Oval Toggle */}
      <button
        onClick={() => setShowOverlay(!showOverlay)}
        className={`absolute top-2 right-2 z-[1000] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showOverlay
            ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
            : 'bg-black/50 text-white/70 hover:bg-black/70'
        }`}
      >
        🌌 Nordlysbelte
      </button>

      {/* Animation toggle */}
      <button
        onClick={() => setShowAnimation(!showAnimation)}
        className={`absolute top-2 left-2 z-[1000] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showAnimation
            ? 'bg-gradient-to-br from-emerald-400 to-cyan-600 text-white'
            : 'bg-black/50 text-white/70 hover:bg-black/70'
        }`}
      >
        ✨ Animasjon
      </button>

      {/* Map info badge */}
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs z-[1000]">
        <span className="text-white/90">
          KP {kpIndex.toFixed(1)} • {forecasts.length} lokasjoner
          {!hasUnrestrictedAccess && ' • Tromsø-området'}
        </span>
      </div>

      {/* NOAA overlay indicator */}
      {showOverlay && auroraData.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-xs z-[1000] flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="text-white/90">NOAA OVATION</span>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredMarker && (
        <div
          className="fixed z-[2000] pointer-events-none animate-in fade-in duration-150"
          style={{
            left: hoveredMarker.x,
            top: hoveredMarker.y - 45,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="bg-black/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white whitespace-nowrap shadow-xl border border-white/10">
            {hoveredMarker.emoji} {hoveredMarker.name} · {Math.round(hoveredMarker.temp)}°C
          </div>
        </div>
      )}
    </div>
  );
}
