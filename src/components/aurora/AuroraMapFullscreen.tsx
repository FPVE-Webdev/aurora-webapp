'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { SubscriptionTier } from '@/contexts/PremiumContext';
import AuroraOverlay from '@/components/aurora/AuroraOverlay';
import { deriveOverlayState } from '@/components/aurora/animations';
import { getTierConfig, filterSpotsByTier, hasFeature } from '@/lib/features/liveTierConfig';
import { LockedBadge } from '@/components/live/TierGate';
import { toast } from 'sonner';
import { trackZoomLimit, trackLockedFeatureClick } from '@/lib/analytics/tierEvents';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Debug logging flag: enabled in dev or when explicitly toggled via env
const debugLive =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DEBUG_LIVE === 'true';

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

// Free tier preset spot IDs (city center only)
const FREE_SPOT_IDS = ['tromso', 'telegrafbukta', 'prestvannet'];

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

// Disable Mapbox telemetry globally to prevent ERR_NAME_NOT_RESOLVED errors
if (typeof window !== 'undefined' && typeof mapboxgl !== 'undefined') {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
  // Disable telemetry collection
  (mapboxgl as any).setRTLTextPlugin = () => {};
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
  const [showAnimation, setShowAnimation] = useState(false); // Default AV - bruker må aktivere manuelt
  const [hoveredMarker, setHoveredMarker] = useState<{
    name: string;
    temp: number;
    emoji: string;
    x: number;
    y: number;
  } | null>(null);

  // Weather layer state
  const [showWeatherLayers, setShowWeatherLayers] = useState(false);
  const [weatherLayerType] = useState<'clouds' | 'precipitation' | 'both'>('both'); // Start med begge layers

  // Get tier configuration
  const tierConfig = getTierConfig(subscriptionTier);
  const mapRestrictions = tierConfig.map;
  const canUseWeatherLayers = hasFeature(subscriptionTier, 'weatherLayers');

  // Filter forecasts by tier (Free users only see 3 city spots)
  // Memoize to prevent re-render loop
  const allowedForecasts = useMemo(
    () => filterSpotsByTier(forecasts, subscriptionTier, FREE_SPOT_IDS),
    [forecasts, subscriptionTier]
  );

  const activeForecast =
    allowedForecasts.find((f) => f.spot.id === selectedSpotId) || allowedForecasts[0];
  const overlayState = deriveOverlayState(activeForecast as any, animationHour);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const tokenPresent = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      console.log('[debug-live] AuroraMapFullscreen mount', {
        tokenPresent,
        forecastCount: forecasts?.length ?? 0,
        selectedSpotId,
        animationHour,
      });
    }
  }, [animationHour, forecasts?.length, selectedSpotId]);

  // Fetch aurora oval data
  const fetchAuroraData = useCallback(async () => {
    try {
      const url = '/api/aurora/oval?resolution=medium';
      if (process.env.NODE_ENV === 'development') {
        console.log('📡 Fetching aurora oval from:', url);
      }

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
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Aurora oval data loaded:', data);
      }

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

    // Create map with tier-based restrictions
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [18.9, 69.65], // Tromsø center
      zoom: mapRestrictions.initialZoom,
      pitch: 65, // 3D angle view
      bearing: -20, // Slight rotation for dramatic effect
      attributionControl: false,
      minZoom: mapRestrictions.minZoom,
      maxZoom: mapRestrictions.maxZoom,
      trackResize: false, // Disable telemetry
      ...(mapRestrictions.bounds ? { maxBounds: mapRestrictions.bounds } : {})
    });

    // Match manual canvas offset from design preview
    const canvas = map.getCanvas();
    canvas.style.left = '-2px';
    canvas.style.top = '63px';

    // Add zoom controls and place them below the overlay toggle
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const ctrlTopRight = map.getContainer().querySelector<HTMLElement>('.mapboxgl-ctrl-top-right');
    if (ctrlTopRight) {
      ctrlTopRight.style.top = '116px';
      ctrlTopRight.style.right = '16px';
    }

    const onMapError = (e: any) => {
      if (process.env.NODE_ENV === 'development') {
        const msg = e?.error?.message || e?.error?.toString?.() || 'unknown_mapbox_error';
        const status = e?.error?.status;
        const url = e?.error?.url;
        console.error('[debug-live] mapbox error event', { msg, status, url });
      }
    };
    map.on('error', onMapError);

    // Zoom limit reached toast for free tier
    let zoomLimitToastShown = false;
    map.on('zoom', () => {
      const currentZoom = map.getZoom();
      const isAtLimit =
        (currentZoom <= mapRestrictions.minZoom + 0.1) ||
        (currentZoom >= mapRestrictions.maxZoom - 0.1);

      if (isAtLimit && !zoomLimitToastShown && mapRestrictions.bounds) {
        zoomLimitToastShown = true;

        // Track zoom limit event
        trackZoomLimit(subscriptionTier, currentZoom);

        toast.info('Zoom-grense nådd', {
          description: 'Oppgrader til Premium for full kartvisning',
          duration: 3000,
        });
        // Reset after 5 seconds to allow showing again
        setTimeout(() => { zoomLimitToastShown = false; }, 5000);
      }
    });

    map.on('load', () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🗺️ Mapbox map loaded');
      }

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

      // Override water to darker blue for better cloud contrast
      if (map.getLayer('water')) {
        map.setPaintProperty('water', 'fill-color', '#5a8fb0');
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

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ 3D terrain and snow styling applied');
      }

      // Weather layers are now created dynamically by useEffect with smooth animation
      // (see "Smooth weather tile animation" effect below)

      // Handle weather tile errors gracefully
      map.on('error', (e: any) => {
        if (e?.sourceId?.startsWith('owm-')) {
          console.error('Weather tile load failed:', e);
        }
      });
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        // #region agent log
        mapRef.current.off('error', onMapError);
        // #endregion
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapRestrictions.minZoom, mapRestrictions.maxZoom, mapRestrictions.initialZoom, mapRestrictions.bounds]);

  // Render aurora oval polygon
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showOverlay || auroraData.length === 0) return;

    const beltPoints = auroraData
      .filter(p => p.probability >= 10)
      .sort((a, b) => a.lon - b.lon);

    if (beltPoints.length < 5) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ Not enough aurora oval points:', beltPoints.length);
      }
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Rendering aurora oval with ${beltPoints.length} points`);
    }

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

      // Fill layer (with opacity boost when weather layers active)
      map.addLayer({
        id: 'aurora-oval-fill',
        type: 'fill',
        source: 'aurora-oval',
        paint: {
          'fill-color': ovalColor,
          'fill-opacity': showWeatherLayers ? ovalOpacity * 0.5 : ovalOpacity * 0.3
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

      // Update colors (with opacity boost when weather layers active)
      const adjustedOpacity = showWeatherLayers ? ovalOpacity * 0.5 : ovalOpacity * 0.3;
      map.setPaintProperty('aurora-oval-fill', 'fill-color', ovalColor);
      map.setPaintProperty('aurora-oval-fill', 'fill-opacity', adjustedOpacity);
      map.setPaintProperty('aurora-oval-line', 'line-color', ovalColor);
      map.setPaintProperty('aurora-oval-line', 'line-opacity', ovalOpacity);
    }
  }, [auroraData, showOverlay, showWeatherLayers]);

  // Add forecast markers (filtered by tier)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || allowedForecasts.length === 0) return;

    if (debugLive && process.env.NODE_ENV === 'development') {
      console.log('[debug-live] markers effect', {
        forecastCount: allowedForecasts.length,
        totalForecasts: forecasts.length,
        tier: subscriptionTier,
        animationHour,
        hourIndex: Math.floor(animationHour),
      });
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each forecast
    const computedSummaries: Record<string, {
      name: string;
      probability: number;
      kp: number;
      cloudCoverage: number;
      temperature: number;
      windSpeed: number;
    }> = {};

    allowedForecasts.forEach((forecast) => {
      try {
        let displayProbability = forecast.currentProbability;
        let displayKp = (forecast as any).kp;
        let displayWeather = forecast.weather;

        if (forecast.hourlyForecast && forecast.hourlyForecast.length > 0) {
          const hourIndex = Math.floor(animationHour);
          const hourData = forecast.hourlyForecast[hourIndex];

          if (hourData) {
            if (debugLive && process.env.NODE_ENV === 'development') {
              const hdLog: any = hourData as any;
              const hasWeatherObj = !!hdLog?.weather;
              const hdKeys = hdLog ? Object.keys(hdLog) : [];
              console.log('[debug-live] hourly shape', {
                spotId: forecast.spot.id,
                hourIndex,
                hasWeatherObj,
                hdKeys: hdKeys.slice(0, 20),
              });
            }

            displayProbability = (hourData.canSeeAurora !== false)
              ? hourData.probability
              : 0;

            // Hourly data shape differs between sources (sometimes flat, sometimes nested under `weather`).
            // Prefer nested if present; otherwise fall back to flat fields; finally fall back to base forecast.
            const hd: any = hourData as any;
            displayKp = hd.kp ?? hd.kpIndex ?? displayKp;

            const cloudCoverage =
              hd.weather?.cloudCoverage ??
              hd.cloudCoverage ??
              forecast.weather?.cloudCoverage ??
              50;

            const temperature =
              hd.weather?.temperature ??
              hd.temperature ??
              forecast.weather?.temperature ??
              0;

            const windSpeed =
              hd.weather?.windSpeed ??
              hd.windSpeed ??
              forecast.weather?.windSpeed ??
              0;

            const symbolCode =
              hd.weather?.conditions ??
              hd.weather?.symbolCode ??
              hd.symbolCode ??
              forecast.weather?.symbolCode ??
              'cloudy';

            displayWeather = {
              cloudCoverage,
              temperature,
              windSpeed,
              symbolCode,
            };
          }
        }

        computedSummaries[forecast.spot.id] = {
          name: forecast.spot.name,
          probability: displayProbability,
          kp: displayKp ?? kpIndex,
          cloudCoverage: displayWeather.cloudCoverage,
          temperature: displayWeather.temperature,
          windSpeed: displayWeather.windSpeed,
        };

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
          if (typeof window !== 'undefined') {
            const current = computedSummaries[forecast.spot.id];
            const bestAlternative = Object.values(computedSummaries)
              .filter((s) => s.name !== forecast.spot.name)
              .reduce<{ name: string | null; probability: number }>(
                (acc, s) => (s.probability > acc.probability ? { name: s.name, probability: s.probability } : acc),
                { name: null, probability: 0 }
              );

            window.dispatchEvent(
              new CustomEvent('aura-location-selected', {
                detail: {
                  name: forecast.spot.name,
                  probability: current?.probability ?? displayProbability,
                  kp: current?.kp ?? kpIndex,
                  cloudCoverage: current?.cloudCoverage ?? displayWeather.cloudCoverage,
                  temperature: current?.temperature ?? displayWeather.temperature,
                  windSpeed: current?.windSpeed ?? displayWeather.windSpeed,
                  bestAlternative: bestAlternative.name
                    ? { name: bestAlternative.name, probability: bestAlternative.probability }
                    : null,
                },
              })
            );
          }
        });

        const popup = new mapboxgl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div style="min-width: 160px; font-family: system-ui; padding: 6px 8px;">
            <div style="font-weight: 700; margin-bottom: 4px;">${forecast.spot.name}</div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Prob:</span><span>${Math.round(displayProbability)}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Kp:</span><span>${(displayKp ?? kpIndex).toFixed(1)}</span>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([forecast.spot.longitude, forecast.spot.latitude])
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      } catch (err) {
        if (debugLive && process.env.NODE_ENV === 'development') {
          console.error('[debug-live] marker build failed', { spotId: forecast?.spot?.id }, err);
        }
      }
    });
  }, [allowedForecasts, subscriptionTier, onSelectSpot, animationHour, kpIndex]);

  // Add aurora oval halo badges
  useEffect(() => {
    const map = mapRef.current;
    if (!map || auroraData.length === 0 || !showOverlay) return;

    if (debugLive) {
      console.log('🎯 Rendering aurora halo badges along oval');
    }

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

    if (debugLive) {
      console.log(`✅ Rendered ${badgePoints.length} halo badges along aurora oval`);
    }
  }, [auroraData, showOverlay, kpIndex]);

  // Create/recreate weather layers when hour changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showWeatherLayers || !canUseWeatherLayers) return;

    const owmApiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
    if (!owmApiKey) return;

    const now = Date.now();
    const roundedNow = Math.floor(now / (3600 * 1000)) * 3600 * 1000;
    const currentHour = showAnimation ? Math.floor(animationHour) : 0;
    const nextHour = currentHour + 1;

    const currentTimestamp = Math.floor(roundedNow / 1000) + (currentHour * 3600);
    const nextTimestamp = Math.floor(roundedNow / 1000) + (nextHour * 3600);

    // Helper to safely remove layers/sources
    const removeLayerIfExists = (id: string) => { if (map.getLayer(id)) map.removeLayer(id); };
    const removeSourceIfExists = (id: string) => { if (map.getSource(id)) map.removeSource(id); };

    // Clean up existing layers
    ['weather-precipitation-next', 'weather-clouds-next', 'weather-precipitation-current', 'weather-clouds-current'].forEach(removeLayerIfExists);
    ['owm-precipitation-next', 'owm-clouds-next', 'owm-precipitation-current', 'owm-clouds-current'].forEach(removeSourceIfExists);

    // Create sources with timestamps
    const sources = {
      'owm-clouds-current': `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${currentTimestamp}`,
      'owm-precipitation-current': `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${currentTimestamp}`,
      'owm-clouds-next': `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${nextTimestamp}`,
      'owm-precipitation-next': `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${nextTimestamp}`
    };

    Object.entries(sources).forEach(([id, url]) => {
      map.addSource(id, { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 18, scheme: 'xyz' });
    });

    // Create layers with initial opacity
    const beforeLayer = map.getLayer('aurora-oval-fill') ? 'aurora-oval-fill' : undefined;

    map.addLayer({
      id: 'weather-clouds-current',
      type: 'raster',
      source: 'owm-clouds-current',
      paint: { 'raster-opacity': 0.65, 'raster-opacity-transition': { duration: 300 }, 'raster-resampling': 'linear' },
      layout: { 'visibility': 'visible' }
    }, beforeLayer);

    map.addLayer({
      id: 'weather-precipitation-current',
      type: 'raster',
      source: 'owm-precipitation-current',
      paint: { 'raster-opacity': 0.75, 'raster-opacity-transition': { duration: 300 }, 'raster-resampling': 'linear' },
      layout: { 'visibility': 'visible' }
    }, 'weather-clouds-current');

    map.addLayer({
      id: 'weather-clouds-next',
      type: 'raster',
      source: 'owm-clouds-next',
      paint: { 'raster-opacity': 0, 'raster-opacity-transition': { duration: 300 }, 'raster-resampling': 'linear' },
      layout: { 'visibility': 'visible' }
    }, 'weather-precipitation-current');

    map.addLayer({
      id: 'weather-precipitation-next',
      type: 'raster',
      source: 'owm-precipitation-next',
      paint: { 'raster-opacity': 0, 'raster-opacity-transition': { duration: 300 }, 'raster-resampling': 'linear' },
      layout: { 'visibility': 'visible' }
    }, 'weather-clouds-next');

  }, [Math.floor(animationHour), showAnimation, showWeatherLayers, canUseWeatherLayers]);

  // Update layer opacity for smooth crossfade animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !showWeatherLayers || !canUseWeatherLayers || !showAnimation) return;

    // Calculate crossfade progress
    const currentHour = Math.floor(animationHour);
    const progress = animationHour - currentHour; // 0.0 to 1.0 within the hour

    const currentOpacity = 1.0 - progress; // Fades out: 1.0 → 0.0
    const nextOpacity = progress; // Fades in: 0.0 → 1.0

    // Update opacity smoothly
    const baseCloudOpacity = 0.65;
    const basePrecipOpacity = 0.75;

    if (map.getLayer('weather-clouds-current')) {
      map.setPaintProperty('weather-clouds-current', 'raster-opacity', baseCloudOpacity * currentOpacity);
    }
    if (map.getLayer('weather-precipitation-current')) {
      map.setPaintProperty('weather-precipitation-current', 'raster-opacity', basePrecipOpacity * currentOpacity);
    }
    if (map.getLayer('weather-clouds-next')) {
      map.setPaintProperty('weather-clouds-next', 'raster-opacity', baseCloudOpacity * nextOpacity);
    }
    if (map.getLayer('weather-precipitation-next')) {
      map.setPaintProperty('weather-precipitation-next', 'raster-opacity', basePrecipOpacity * nextOpacity);
    }
  }, [animationHour, showWeatherLayers, canUseWeatherLayers, showAnimation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Aurora overlay (video only), visible when animation is playing */}
      {showAnimation && (
        <AuroraOverlay
          intensity01={overlayState.intensity01}
          cloud01={overlayState.cloud01}
          isPlaying={showAnimation}
          progress01={Math.max(0, Math.min(1, animationHour / 12))}
        />
      )}

      {/* Overlay + animation + weather toggles under top info bar */}
      <div className="absolute top-16 left-0 right-0 z-[1000] px-4 flex items-center justify-between pointer-events-none">
        <button
          onClick={() => {
            if (!canUseWeatherLayers) {
              trackLockedFeatureClick(subscriptionTier, 'animation_toggle', 'toolbar');
              return;
            }
            setShowAnimation(!showAnimation);
          }}
          disabled={!canUseWeatherLayers}
          className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all pointer-events-auto ${
            !canUseWeatherLayers
              ? 'bg-black/50 text-white/40 cursor-not-allowed'
              : showAnimation
              ? 'bg-gradient-to-br from-emerald-400 to-cyan-600 text-white'
              : 'bg-black/50 text-white/70 hover:bg-black/70'
          }`}
        >
          {showAnimation ? '✨ Animasjon på' : '✨ Animasjon av'}
          {!canUseWeatherLayers && <LockedBadge />}
        </button>

        <div className="flex gap-2 pointer-events-none">
          {/* Weather layers toggle (Premium only) */}
          <button
            onClick={() => {
              if (!canUseWeatherLayers) {
                trackLockedFeatureClick(subscriptionTier, 'weather_layers', 'toolbar');
                return;
              }
              setShowWeatherLayers(!showWeatherLayers);
            }}
            disabled={!canUseWeatherLayers}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all pointer-events-auto ${
              !canUseWeatherLayers
                ? 'bg-black/50 text-white/40 cursor-not-allowed'
                : showWeatherLayers
                ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
                : 'bg-black/50 text-white/70 hover:bg-black/70'
            }`}
          >
            {showWeatherLayers ? '🌧️ Vær på' : '🌧️ Vær av'}
            {!canUseWeatherLayers && <LockedBadge />}
          </button>

          <button
            onClick={() => {
              if (!canUseWeatherLayers) {
                trackLockedFeatureClick(subscriptionTier, 'overlay_toggle', 'toolbar');
                return;
              }
              setShowOverlay(!showOverlay);
            }}
            disabled={!canUseWeatherLayers}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all pointer-events-auto ${
              !canUseWeatherLayers
                ? 'bg-black/50 text-white/40 cursor-not-allowed'
                : showOverlay
                ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
                : 'bg-black/50 text-white/70 hover:bg-black/70'
            }`}
          >
            {showOverlay ? '🌌 Nordlysbelte på' : '🌌 Nordlysbelte av'}
            {!canUseWeatherLayers && <LockedBadge />}
          </button>
        </div>
      </div>

      {/* Map info badge */}
      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs z-[1000]">
        <span className="text-white/90">
          KP {kpIndex.toFixed(1)} • {allowedForecasts.length} lokasjoner
          {mapRestrictions.bounds && ' • Tromsø-området'}
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
