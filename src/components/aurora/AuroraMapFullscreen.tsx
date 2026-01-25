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
  onCloudsReady?: () => void;
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
  subscriptionTier,
  onCloudsReady
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const cloudsReadyRef = useRef(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false); // Default AV - bruker må aktivere manuelt
  const [hoveredMarker, setHoveredMarker] = useState<{
    name: string;
    temp: number;
    emoji: string;
    x: number;
    y: number;
  } | null>(null);


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

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    cloudsReadyRef.current = false;

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

      // OpenWeatherMap Weather Preloading (3-hour batches)
      const owmApiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
      if (owmApiKey && canUseWeatherLayers) {
        const now = Date.now();
        const roundedNow = Math.floor(now / (3600 * 1000)) * 3600 * 1000; // Rundet til nærmeste hele time
        const baseTimestamp = Math.floor(roundedNow / 1000);

        // 3-hour batches: 0, 3, 6, 9, 12
        const batches = [0, 3, 6, 9, 12];
        const beforeLayer = map.getLayer('aurora-oval-fill') ? 'aurora-oval-fill' : undefined;

        batches.forEach((hourOffset) => {
          const timestamp = baseTimestamp + (hourOffset * 3600);

          // Create cloud source
          map.addSource(`owm-clouds-${hourOffset}`, {
            type: 'raster',
            tiles: [
              `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${timestamp}`
            ],
            tileSize: 256,
            maxzoom: 18,
            scheme: 'xyz'
          });

          // Create precipitation source
          map.addSource(`owm-precipitation-${hourOffset}`, {
            type: 'raster',
            tiles: [
              `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${owmApiKey}&date=${timestamp}`
            ],
            tileSize: 256,
            maxzoom: 18,
            scheme: 'xyz'
          });

          // Create cloud layer (initially only batch 0 visible)
          map.addLayer({
            id: `weather-clouds-${hourOffset}`,
            type: 'raster',
            source: `owm-clouds-${hourOffset}`,
            paint: {
              'raster-opacity': hourOffset === 0 ? 0.85 : 0,
              'raster-opacity-transition': { duration: 300 },
              'raster-resampling': 'linear'
            },
            layout: { 'visibility': 'visible' }
          }, beforeLayer);

          // Create precipitation layer (initially only batch 0 visible)
          map.addLayer({
            id: `weather-precipitation-${hourOffset}`,
            type: 'raster',
            source: `owm-precipitation-${hourOffset}`,
            paint: {
              'raster-opacity': hourOffset === 0 ? 0.75 : 0,
              'raster-opacity-transition': { duration: 300 },
              'raster-resampling': 'linear'
            },
            layout: { 'visibility': 'visible' }
          }, `weather-clouds-${hourOffset}`);
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Weather layers preloaded for batches:', batches);
        }

        const onSourceData = (event: mapboxgl.MapSourceDataEvent) => {
          if (event?.sourceId === 'owm-clouds-0') {
            handleCloudsReady();
          }
        };

        const handleCloudsReady = () => {
          if (cloudsReadyRef.current) return;
          const sourceId = 'owm-clouds-0';
          if (map.getSource(sourceId) && map.isSourceLoaded(sourceId)) {
            cloudsReadyRef.current = true;
            onCloudsReady?.();
            map.off('sourcedata', onSourceData);
            map.off('idle', handleCloudsReady);
          }
        };

        map.on('sourcedata', onSourceData);
        map.on('idle', handleCloudsReady);
        handleCloudsReady();
      } else {
        onCloudsReady?.();
      }

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

            // Use pre-calculated probability from API if available
            // This ensures consistency with /forecast and respects location-specific calculations
            const apiProbability = (hourData as any).probability;

            if (apiProbability !== undefined && apiProbability !== null) {
              // Use pre-calculated probability from API (preferred)
              displayProbability = apiProbability;
            } else if (hourIndex === 0) {
              // Fallback: use current probability for time 0
              displayProbability = forecast.currentProbability;
            } else {
              // Fallback: calculate probability using System A for future hours
              const calculatedProb = calculateAuroraProbability({
                kpIndex: hourData.kp ?? displayKp ?? 0,
                cloudCoverage: hourData.weather?.cloudCoverage ?? 50,
                temperature: hourData.weather?.temperature ?? 0,
                latitude: forecast.spot.latitude,
                longitude: forecast.spot.longitude,
                date: new Date(hourData.time)
              });
              displayProbability = calculatedProb.probability;
            }

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
        const isSelected = forecast.spot.id === selectedSpotId;

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
        border: ${isSelected ? '3px solid #FFD700' : '2px solid white'};
        white-space: nowrap;
        font-family: system-ui, sans-serif;
        cursor: pointer;
        transition: transform 0.2s, border-color 0.3s;
        transform-origin: center center;
        ${isSelected ? 'transform: scale(1.2);' : ''}
      `;
        el.innerHTML = isSelected
          ? `<div style="display: flex; align-items: center; gap: 4px;"><span style="font-size: 14px;">📍</span><span>${displayProbability}%</span></div>`
          : `${displayProbability}%`;

        // Hover: show tooltip with glow effect (no transform to avoid affecting map 3D perspective)
        el.addEventListener('mouseenter', (e) => {
          el.style.boxShadow = '0 0 24px rgba(255, 255, 255, 0.8), 0 2px 12px rgba(0,0,0,0.5)';
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
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.5)';
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
  }, [allowedForecasts, subscriptionTier, onSelectSpot, animationHour, kpIndex, selectedSpotId]);

  // Listen for Aura guide events (map guidance from chatbot)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleAuraGuide = (event: Event) => {
      const custom = event as CustomEvent<{
        spotId: string;
        coordinates?: [number, number]; // [lat, lon]
        zoom?: number;
        highlight?: boolean;
      }>;
      const detail = custom.detail;
      if (!detail) return;

      const map = mapRef.current;
      if (!map) return;

      // Find spot by ID in forecasts
      const targetSpot = allowedForecasts.find(f => f.spot.id === detail.spotId);
      if (!targetSpot) {
        console.warn('[aura-guide] Spot not found:', detail.spotId);
        return;
      }

      // Use provided coordinates or spot's coordinates
      const [lat, lon] = detail.coordinates || [targetSpot.spot.latitude, targetSpot.spot.longitude];
      const targetZoom = detail.zoom || 10;

      if (debugLive) {
        console.log('[aura-guide] Flying to spot:', {
          spotId: detail.spotId,
          name: targetSpot.spot.name,
          coordinates: [lat, lon],
          zoom: targetZoom
        });
      }

      // Fly to the spot location
      map.flyTo({
        center: [lon, lat],
        zoom: targetZoom,
        pitch: 65,
        duration: 2000,
        essential: true
      });

      // Select the spot (updates marker styling)
      onSelectSpot(detail.spotId);
    };

    window.addEventListener('aura-guide-spot', handleAuraGuide as EventListener);
    return () => {
      window.removeEventListener('aura-guide-spot', handleAuraGuide as EventListener);
    };
  }, [allowedForecasts, onSelectSpot]);

  // Weather layer - animate through batches (0, 3, 6, 9, 12) based on timeline
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !canUseWeatherLayers) return;

    // Determine which batch to show based on animationHour (0-12 range)
    // Batches: 0h→batch0, 3h→batch3, 6h→batch6, 9h→batch9, 12h→batch12
    const batches = [0, 3, 6, 9, 12];
    const currentHour = Math.floor(animationHour);

    // Find the closest batch for the current animation hour
    // Hours 0-2 → batch 0, hours 3-5 → batch 3, hours 6-8 → batch 6, etc.
    let activeBatch = 0;
    if (currentHour >= 9) activeBatch = 12;
    else if (currentHour >= 6) activeBatch = 9;
    else if (currentHour >= 3) activeBatch = 6;
    else if (currentHour >= 1.5) activeBatch = 3;
    else activeBatch = 0;

    batches.forEach((batch) => {
      const baseCloudOpacity = 0.85;
      const basePrecipOpacity = 0.75;

      // Only the active batch is visible, others are hidden
      const targetCloudOpacity = batch === activeBatch ? baseCloudOpacity : 0;
      const targetPrecipOpacity = batch === activeBatch ? basePrecipOpacity : 0;

      if (map.getLayer(`weather-clouds-${batch}`)) {
        map.setPaintProperty(`weather-clouds-${batch}`, 'raster-opacity', targetCloudOpacity);
      }
      if (map.getLayer(`weather-precipitation-${batch}`)) {
        map.setPaintProperty(`weather-precipitation-${batch}`, 'raster-opacity', targetPrecipOpacity);
      }
    });
  }, [canUseWeatherLayers, animationHour]);

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
          {showAnimation ? '✨ Nordlys på' : '✨ Nordlys av'}
          {!canUseWeatherLayers && <LockedBadge />}
        </button>

        <div className="flex gap-2 pointer-events-none">
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
