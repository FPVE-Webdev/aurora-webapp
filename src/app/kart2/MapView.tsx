'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuroraData } from './useAuroraData';
import { useChaseRegions } from './useChaseRegions';
import { CHASE_REGIONS } from './map.config';
import AIInterpretation from './AIInterpretation';
import VisualModeCanvas from './components/VisualModeCanvas';
import VisualModeToggle from './components/VisualModeToggle';
import WeatherModeToggle from './components/WeatherModeToggle';
import { useVisualMode } from './hooks/useVisualMode';
import { useWeatherMode } from './hooks/useWeatherMode';
import VisualModeErrorBoundary from './components/VisualModeErrorBoundary';
import { generateTromsoCityLights } from './utils/cityLights';
import { createAurora3DLayer } from './components/aurora3dLayer';
import { createClouds3DLayer } from './components/clouds3dLayer';

/**
 * Encode MET.no weather symbol code to shader weather type
 * 0=clear, 1=fair, 2=cloudy, 3=rain, 4=snow, 5=fog
 */
function encodeWeatherType(symbolCode: string): number {
  const code = symbolCode.toLowerCase();
  if (code.includes('clearsky')) return 0;
  if (code.includes('fair') || code.includes('partlycloudy')) return 1;
  if (code.includes('cloudy')) return 2;
  if (code.includes('rain') || code.includes('sleet') || code.includes('lightrain') || code.includes('heavyrain')) return 3;
  if (code.includes('snow') || code.includes('lightsnow') || code.includes('heavysnow')) return 4;
  if (code.includes('fog')) return 5;
  return 2; // Default to cloudy
}

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const hasInitialized = useRef(false); // Task 3: Map Init Guard
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const isSnapshottingRef = useRef(false); // Task 1: Snapshot Debounce Lock
  const [visualModeError, setVisualModeError] = useState<string | null>(null);
  const [aurora3DActive, setAurora3DActive] = useState(false);
  const [clouds3DActive, setClouds3DActive] = useState(false);
  const [aurora3DRendered, setAurora3DRendered] = useState(false);
  const [clouds3DRendered, setClouds3DRendered] = useState(false);
  const [aurora3DFallbackGracePassed, setAurora3DFallbackGracePassed] = useState(false);
  const [clouds3DFallbackGracePassed, setClouds3DFallbackGracePassed] = useState(false);
  const clouds3DLayerRef = useRef<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, error } = useAuroraData();
  const chaseState = useChaseRegions();
  const visualMode = useVisualMode();
  const weatherMode = useWeatherMode();

  // Feature flags (production defaults ON - disable only via env = 0)
  const aurora3DFeatureEnabled = process.env.NEXT_PUBLIC_KART2_AURORA3D !== '0';
  const clouds3DFeatureEnabled = process.env.NEXT_PUBLIC_KART2_CLOUDS3D !== '0';

  const showDebugBadge = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_KART2_DEBUG === '1';

  const shouldShow2DVisualModeOverlay =
    !!data &&
    visualMode.isClient &&
    !!mapRef.current &&
    visualMode.isEnabled &&
    (!aurora3DFeatureEnabled || (aurora3DFallbackGracePassed && !aurora3DRendered));

  const shouldEnable2DShaderClouds =
    weatherMode.isEnabled &&
    (!clouds3DFeatureEnabled || (clouds3DFallbackGracePassed && !clouds3DRendered));

  // Weather test mode state
  const [weatherTestMode, setWeatherTestMode] = useState<'real' | 'snow' | 'clear'>('snow');

  // Weather data for cloud layer rendering (REAL MET.NO DATA)
  const [weatherData, setWeatherData] = useState({
    windSpeed: 15.0,         // TEST: Strong wind for snow squalls
    windDirection: 270.0,    // Default: Westerly (from west)
    weatherType: 4.0,        // TEST: Snow (4.0 = snow in encodeWeatherType)
    precipitation: 5.0,      // TEST: Heavy precipitation
  });

  // Set initial cloud coverage override
  useEffect(() => {
    if (typeof window !== 'undefined' && weatherTestMode === 'snow') {
      (window as any).__WEATHER_TEST_CLOUD_OVERRIDE = 100;
    }
  }, []);

  // Aurora 3D prototype: render aurora inside Mapbox 3D scene at high altitude.
  // This gives true world-space "height" separate from terrain/buildings.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const layerId = 'aurora-3d';
    let cancelled = false;
    let idleHandler: (() => void) | null = null;

    const removeLayer = () => {
      try {
        if (idleHandler) {
          try {
            map.off?.('idle', idleHandler);
          } catch {}
          idleHandler = null;
        }
        if (map.getLayer?.(layerId)) {
          map.removeLayer(layerId);
        }
      } catch {
        // ignore
      } finally {
        setAurora3DActive(false);
        setAurora3DRendered(false);
      }
    };

    if (!aurora3DFeatureEnabled) {
      removeLayer();
      return;
    }

    if (!visualMode.isEnabled) {
      removeLayer();
      return;
    }

    // Add only once per enable-cycle.
    if (map.getLayer?.(layerId)) {
      setAurora3DActive(true);
      return;
    }

    const tryAddLayer = () => {
      if (cancelled) return;
      // If already added meanwhile, just mark active.
      if (map.getLayer?.(layerId)) {
        setAurora3DActive(true);
        return;
      }

      // Guard: Mapbox throws if style isn't loaded yet.
      if (map.isStyleLoaded && !map.isStyleLoaded()) {
        // Wait for idle (style + resources ready), then try again.
        if (!idleHandler) {
          idleHandler = () => {
            idleHandler = null;
            tryAddLayer();
          };
          try {
            map.once?.('idle', idleHandler);
          } catch {
            // Fallback: if once() doesn't exist, use on() and self-remove.
            try {
              map.on?.('idle', idleHandler);
            } catch {}
          }
        }
        return;
      }

      try {
        import('mapbox-gl')
          .then((mapboxgl) => {
            if (cancelled) return;
            try {
              if (!map.getLayer?.(layerId)) {
                const auroraLayer = createAurora3DLayer(mapboxgl, {
                  id: layerId,
                  centerLngLat: [18.95, 69.65],
                  // Aurora is physically MUCH higher than clouds (80–300km).
                  // This uses true altitude in meters.
                  // Lower than before to avoid camera far-plane clipping on some setups.
                  altitudeMeters: 120_000,
                  // Keep the curtain reasonably wide but not enormous.
                  latSpanDeg: 0.25,
                  lonSpanDeg: 4.5,
                  // Sanity: place near center so it's guaranteed in view; we can push back to horizon later.
                  northOffsetDeg: 0.0,
                  intensity: 1.0,
                  onFirstRender: () => setAurora3DRendered(true),
                  onError: () => {
                    // Silent fallback in production.
                    try {
                      if (map.getLayer?.(layerId)) map.removeLayer(layerId);
                    } catch {}
                    setAurora3DActive(false);
                    setAurora3DRendered(false);
                  }
                });

                // Render late so terrain/buildings are in depth buffer (for occlusion).
                map.addLayer(auroraLayer);
              }
              setAurora3DActive(true);
            } catch (err) {
              setAurora3DActive(false);
              setAurora3DRendered(false);
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.warn('[Aurora3D] Failed to add custom layer:', err);
              }
            }
          })
          .catch(() => {
            setAurora3DActive(false);
            setAurora3DRendered(false);
          });
      } catch {
        setAurora3DActive(false);
        setAurora3DRendered(false);
      }
    };

    tryAddLayer();

    return () => {
      cancelled = true;
      removeLayer();
    };
  }, [visualMode.isEnabled, isMapReady, aurora3DFeatureEnabled]);

  // If 3D aurora hasn't rendered shortly after enabling, allow 2D fallback to kick in.
  useEffect(() => {
    if (!visualMode.isEnabled || !isMapReady || !aurora3DFeatureEnabled) {
      setAurora3DFallbackGracePassed(false);
      return;
    }
    if (aurora3DRendered) {
      setAurora3DFallbackGracePassed(false);
      return;
    }
    setAurora3DFallbackGracePassed(false);
    const t = window.setTimeout(() => setAurora3DFallbackGracePassed(true), 1200);
    return () => window.clearTimeout(t);
  }, [visualMode.isEnabled, isMapReady, aurora3DFeatureEnabled, aurora3DRendered]);

  // Clouds 3D: separate cloud deck layer, driven by tromsoCloudCoverage, sits above aurora-3d.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const layerId = 'clouds-3d';
    let cancelled = false;
    let idleHandler: (() => void) | null = null;

    const removeLayer = () => {
      try {
        if (idleHandler) {
          try {
            map.off?.('idle', idleHandler);
          } catch {}
          idleHandler = null;
        }
        if (map.getLayer?.(layerId)) {
          map.removeLayer(layerId);
        }
      } catch {
        // ignore
      } finally {
        clouds3DLayerRef.current = null;
        setClouds3DActive(false);
        setClouds3DRendered(false);
      }
    };

    // Cloud deck for the 3D pipeline:
    // - Controlled by Weather toggle
    // - Independent of aurora-3d so we can replace the old 2D cloud shader in production.
    const shouldShowClouds3D = visualMode.isEnabled && weatherMode.isEnabled;

    if (!clouds3DFeatureEnabled || !shouldShowClouds3D) {
      removeLayer();
      return;
    }

    const updateUniforms = () => {
      const layer = clouds3DLayerRef.current;
      if (!layer) return;
      try {
        layer.setCloudCoverage?.(chaseState.tromsoCloudCoverage ?? 0);
        layer.setWind?.(weatherData.windDirection ?? 270, weatherData.windSpeed ?? 5);
        map.triggerRepaint?.();
      } catch {
        // ignore
      }
    };

    const tryAddLayer = () => {
      if (cancelled) return;

      // Update if already exists
      if (map.getLayer?.(layerId)) {
        setClouds3DActive(true);
        updateUniforms();
        // Ensure clouds are above aurora
        try {
          map.moveLayer?.(layerId);
        } catch {}
        return;
      }

      if (map.isStyleLoaded && !map.isStyleLoaded()) {
        if (!idleHandler) {
          idleHandler = () => {
            idleHandler = null;
            tryAddLayer();
          };
          try {
            map.once?.('idle', idleHandler);
          } catch {
            try {
              map.on?.('idle', idleHandler);
            } catch {}
          }
        }
        return;
      }

      import('mapbox-gl')
        .then((mapboxgl) => {
          if (cancelled) return;
          try {
            if (!map.getLayer?.(layerId)) {
              const cloudsLayer = createClouds3DLayer(mapboxgl, {
                id: layerId,
                centerLngLat: [18.95, 69.65],
                altitudeMeters: 4_000,
                latSpanDeg: 0.25,
                lonSpanDeg: 5.0,
                // Place the deck on the horizon line (far enough to read as “horizon clouds”)
                // Sanity: place near center so it's guaranteed in view; we can push back to horizon later.
                northOffsetDeg: 0.0,
                cloudCoverage: chaseState.tromsoCloudCoverage ?? 0,
                windSpeed: weatherData.windSpeed ?? 5,
                windDirection: weatherData.windDirection ?? 270,
                onFirstRender: () => setClouds3DRendered(true),
                onError: () => {
                  try {
                    if (map.getLayer?.(layerId)) map.removeLayer(layerId);
                  } catch {}
                  clouds3DLayerRef.current = null;
                  setClouds3DActive(false);
                  setClouds3DRendered(false);
                }
              });
              clouds3DLayerRef.current = cloudsLayer;
              map.addLayer(cloudsLayer);
                if (process.env.NODE_ENV !== 'production') {
                  // eslint-disable-next-line no-console
                  console.log('[Clouds3D] added');
                  try {
                    (window as any).__CLOUDS3D_ADDED = true;
                  } catch {}
                }
            }
            setClouds3DActive(true);
            // Keep clouds above aurora in stack.
            try {
              map.moveLayer?.(layerId);
            } catch {}
          } catch (err) {
            setClouds3DActive(false);
            setClouds3DRendered(false);
            clouds3DLayerRef.current = null;
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[Clouds3D] Failed to add custom layer:', err);
            }
          }
        })
        .catch(() => {
          setClouds3DActive(false);
          setClouds3DRendered(false);
          clouds3DLayerRef.current = null;
        });
    };

    tryAddLayer();

    // Keep uniforms in sync while enabled.
    updateUniforms();

    return () => {
      cancelled = true;
      removeLayer();
    };
  }, [
    isMapReady,
    visualMode.isEnabled,
    weatherMode.isEnabled,
    clouds3DFeatureEnabled,
    chaseState.tromsoCloudCoverage,
    weatherData.windSpeed,
    weatherData.windDirection
  ]);

  // If 3D clouds haven't rendered shortly after enabling, allow 2D shader-clouds fallback to kick in.
  useEffect(() => {
    if (!visualMode.isEnabled || !isMapReady || !clouds3DFeatureEnabled || !weatherMode.isEnabled) {
      setClouds3DFallbackGracePassed(false);
      return;
    }
    if (clouds3DRendered) {
      setClouds3DFallbackGracePassed(false);
      return;
    }
    setClouds3DFallbackGracePassed(false);
    const t = window.setTimeout(() => setClouds3DFallbackGracePassed(true), 1200);
    return () => window.clearTimeout(t);
  }, [visualMode.isEnabled, isMapReady, clouds3DFeatureEnabled, weatherMode.isEnabled, clouds3DRendered]);

  // Toggle weather test scenarios
  const cycleWeatherTest = () => {
    const modes: Array<'real' | 'snow' | 'clear'> = ['real', 'snow', 'clear'];
    const currentIndex = modes.indexOf(weatherTestMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setWeatherTestMode(nextMode);

    // Update weather data and cloud coverage based on mode
    if (nextMode === 'snow') {
      setWeatherData({
        windSpeed: 15.0,
        windDirection: 270.0,
        weatherType: 4.0,  // Snow
        precipitation: 5.0,
      });
      // Set 100% cloud coverage for snow
      if (typeof window !== 'undefined') {
        (window as any).__WEATHER_TEST_CLOUD_OVERRIDE = 100;
      }
    } else if (nextMode === 'clear') {
      setWeatherData({
        windSpeed: 3.0,
        windDirection: 270.0,
        weatherType: 0.0,  // Clear sky
        precipitation: 0.0,
      });
      // Set 0% cloud coverage for clear
      if (typeof window !== 'undefined') {
        (window as any).__WEATHER_TEST_CLOUD_OVERRIDE = 0;
      }
    } else {
      // Real mode: remove override
      if (typeof window !== 'undefined') {
        delete (window as any).__WEATHER_TEST_CLOUD_OVERRIDE;
      }
    }

    // Force re-fetch of chase regions
    window.location.reload();
  };

  // Fetch real weather data from MET.no API
  useEffect(() => {
    // Skip API fetch if in test mode
    if (weatherTestMode !== 'real') return;

    const fetchWeather = async () => {
      try {
        const res = await fetch('/api/weather/69.65/18.95'); // Tromsø coordinates
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        setWeatherData({
          windSpeed: data.windSpeed ?? 5.0,
          windDirection: 270.0,  // Default westerly (MET.no doesn't provide direction in simple API)
          weatherType: encodeWeatherType(data.symbolCode ?? 'cloudy'),
          precipitation: data.precipitation ?? 0.0,
        });

        // eslint-disable-next-line no-console
        console.log('[Weather] Updated:', {
          windSpeed: data.windSpeed,
          symbolCode: data.symbolCode,
          weatherType: encodeWeatherType(data.symbolCode ?? 'cloudy'),
          cloudCoverage: data.cloudCoverage,
        });
      } catch (err) {
        // Silent fallback to defaults on error
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.warn('[Weather] Failed to fetch, using defaults:', err);
        }
      }
    };

    // Initial fetch
    fetchWeather();

    // Refresh every 15 minutes (MET.no update frequency)
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherTestMode]);

  // Fixed "scene" camera: Tromsø viewpoint (not a navigable world map)
  const SCENE_CENTER: [number, number] = [18.95, 69.65];
  // LOCKED ZOOM: Fixed at 12.0 for closer city view and 3D buildings
  const SCENE_ZOOM = 12.0;
  // Side-view (cinematic horizon) - MAX TILT. User rotates horizontally to "look around".
  const SCENE_PITCH = 85; // Mapbox maximum pitch for full side-view
  // User should feel they are in Tromsø looking north
  const SCENE_BEARING = 0;

  // Zoom locked at 12.0 for optimal city view
  const ZOOM_SCENE_MIN = 12.0;  // Locked zoom
  const ZOOM_SCENE_MAX = 12.0;  // Locked zoom
  const ZOOM_EXPANDED_TARGET = 5.4;
  const ZOOM_EXPANDED_MIN = 5.2;
  const ZOOM_EXPANDED_MAX = 8.0;

  // Zoom is locked at 12.0 - no zoom functions needed

  const rotateBy = (deltaDeg: number) => {
    if (!mapRef.current) return;
    const currentBearing = mapRef.current.getBearing?.() ?? SCENE_BEARING;
    mapRef.current.easeTo({
      center: SCENE_CENTER,
      zoom: SCENE_ZOOM, // Locked at 12.0
      pitch: SCENE_PITCH,
      bearing: currentBearing + deltaDeg,
      duration: 650,
      easing: (t: number) => t * t * (3 - 2 * t),
      essential: true,
    });
  };

  // Task 2: Memoization Guards
  const aiInput = useMemo(() => {
    if (!data) return null;
    return {
      kp: data.kp,
      probability: data.probability,
      tromsoCloud: chaseState.tromsoCloudCoverage,
      bestRegion: chaseState.bestRegion ? {
        name: chaseState.bestRegion.region.name,
        visibilityScore: chaseState.bestRegion.visibilityScore
      } : null
    };
  }, [data, chaseState.tromsoCloudCoverage, chaseState.bestRegion]);

  // Signal Refs
  const hasLoggedSnapshot = useRef(false);

  // Snapshot Handler
  const handleSnapshot = async () => {
    // Task 1: Check ref lock
    if (!mapContainerRef.current || isSnapshottingRef.current) return;

    try {
      isSnapshottingRef.current = true;
      setIsSnapshotting(true);

      // Dynamically import html-to-image only when snapshot is used
      const { toPng } = await import('html-to-image');

      // Target the parent div to capture overlay + map
      const element = mapContainerRef.current.parentElement as HTMLElement;

      // Create a clone to avoid modifying the original
      const clonedElement = element.cloneNode(true) as HTMLElement;

      // Remove the snapshot button from the clone
      const snapshotButtonContainer = clonedElement.querySelector('#snapshot-button-container');
      if (snapshotButtonContainer) {
        snapshotButtonContainer.remove();
      }

      const dataUrl = await toPng(clonedElement, {
        cacheBust: true,
        pixelRatio: 3, // High-DPI capture (Task 1)
        filter: (node) => {
          // Skip snapshot button in case cloning didn't catch it
          const nodeElement = node as HTMLElement;
          return nodeElement.id !== 'snapshot-button-container';
        },
        style: {
          // Task 2: Font smoothing
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        } as any // Cast to allow custom properties
      });

      // Try clipboard first
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        alert('📷 Snapshot kopiert til utklippstavlen!');
      } catch (clipboardErr) {
        // Fallback to download
        const link = document.createElement('a');
        link.download = `nordlys-snapshot-${new Date().toISOString().slice(0,16)}.png`;
        link.href = dataUrl;
        link.click();
      }

      // Signal: Snapshot Used (Task 1)
      if (!hasLoggedSnapshot.current) {
        console.info('[kart2][signal] snapshot_used');
        hasLoggedSnapshot.current = true;
      }

    } catch (err) {
      console.error('[kart2] Snapshot failed:', err);
      alert('📷 Snapshot kunne ikke genereres. Vennligst prøv igjen eller refresh siden.');
    } finally {
      setIsSnapshotting(false);
      isSnapshottingRef.current = false;
    }
  };

  useEffect(() => {
    // Task 3: Enhanced guard
    if (!mapContainerRef.current || mapRef.current || hasInitialized.current) return;
    hasInitialized.current = true;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      const errorMsg = 'No Mapbox token found';
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error('[MapView]', errorMsg);
      }
      setMapError(errorMsg);
      return;
    }

    // Scene camera is fixed (no saved view)
    const initialView = {
      center: SCENE_CENTER,
      zoom: SCENE_ZOOM,
      bearing: SCENE_BEARING,
      pitch: SCENE_PITCH,
    };

    // Dynamically import mapbox-gl to avoid SSR issues
    import('mapbox-gl')
      .then((mapboxgl) => {
        // Load Mapbox CSS dynamically (client-side only)
        if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css';
          document.head.appendChild(link);
        }

        mapboxgl.default.accessToken = token;

        const map = new mapboxgl.default.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: initialView.center,
          zoom: initialView.zoom,
          bearing: initialView.bearing,
          pitch: initialView.pitch,
          attributionControl: false,
        });

        // --- Tromsø Scene Lock ---
        // Disable free navigation: this is a cinematic scene, not a tool.
        map.dragPan.disable();
        map.scrollZoom.disable();
        map.doubleClickZoom.disable();
        // ZOOM LOCKED: Disable all zoom controls (zoom fixed at 11.16)
        map.touchZoomRotate.disable(); // Disable pinch-zoom and touch rotation
        // Allow horizontal look-around via rotation (bearing)
        map.dragRotate.enable();
        map.keyboard.disable();
        map.boxZoom.disable();
        map.touchPitch.disable();

        // Bounds: Tromsø + ~50km radius
        // ~50km ≈ 0.45° lat, ≈ 1.30° lon at this latitude
        const TROMSO_BOUNDS: [[number, number], [number, number]] = [
          [SCENE_CENTER[0] - 1.3, SCENE_CENTER[1] - 0.45], // SW
          [SCENE_CENTER[0] + 1.3, SCENE_CENTER[1] + 0.45], // NE
        ];

        // Lock map movement to Tromsø region
        map.setMaxBounds(TROMSO_BOUNDS);

        // Lock zoom levels tightly around the scene
        map.setMinZoom(ZOOM_SCENE_MIN);
        map.setMaxZoom(ZOOM_SCENE_MAX);

        map.on('load', () => {
          // Enforce scene camera on load (in case style defaults override)
          map.jumpTo({
            center: SCENE_CENTER,
            zoom: SCENE_ZOOM,
            pitch: SCENE_PITCH,
            bearing: SCENE_BEARING,
          });

          // ===== MAPBOX TERRAIN + HILLSHADE =====
          // Terrain provides elevation data; hillshade makes it visible even in flat (pitch=0) view.
          if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            } as any);
          }

          // Separate DEM for hillshade to avoid Mapbox warning + preserve resolution.
          if (!map.getSource('mapbox-dem-hillshade')) {
            map.addSource('mapbox-dem-hillshade', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14,
            } as any);
          }

          // Enable terrain (safe even if pitch=0; helps when pitch is increased later)
          try {
            map.setTerrain?.({ source: 'mapbox-dem', exaggeration: 1.15 } as any);
          } catch {}

          // Subtle hillshade for terrain readability
          if (!map.getLayer('tromso-hillshade')) {
            const styleLayers = map.getStyle?.()?.layers || [];
            const firstSymbolLayerId =
              styleLayers.find((l: any) => l?.type === 'symbol')?.id || undefined;
            const beforeId = map.getLayer('road-label') ? 'road-label' : firstSymbolLayerId;

            const hillshadeLayer = {
              id: 'tromso-hillshade',
              type: 'hillshade',
              source: 'mapbox-dem-hillshade',
              paint: {
                'hillshade-exaggeration': 0.45,
                'hillshade-illumination-direction': 335,
                'hillshade-shadow-color': '#000000',
                'hillshade-highlight-color': '#7dd3fc',
                'hillshade-accent-color': '#1d4ed8',
              },
            } as any;

            // Insert below labels when possible; otherwise append safely.
            if (beforeId) {
              map.addLayer(hillshadeLayer, beforeId);
            } else {
              map.addLayer(hillshadeLayer);
            }
          }

          // ===== SNOW-COVERED LANDSCAPE (SURFACE PALETTE) =====
          // We override key land/landcover/landuse layers to read as winter snow.
          // Must be safe across style variations (only set if layer exists).
          const configureSnowLandscape = () => {
            try {
              // Mapbox typings for setPaintProperty are strict (prop is a large string-literal union).
              // We intentionally pass dynamic paint properties across multiple styles, so use `any`.
              const set = (layerId: string, prop: any, value: any) => {
                if (map.getLayer(layerId)) (map as any).setPaintProperty(layerId, prop, value);
              };

              // Base land surface: cold snow-blue gradient
              // (kept slightly dark to preserve night mood, but clearly "snow")
              set('land', 'background-color', 'rgba(0,0,0,0)'); // harmless if land is background
              set('land', 'fill-color', [
                'interpolate', ['linear'], ['zoom'],
                6, '#2b3a4a',   // far: cold dark blue
                9, '#5f7b93',   // mid: steel blue
                12, '#b7c7d6'   // near: snow-blue
              ]);
              set('land', 'fill-opacity', 0.95);

              // Landcover (forests, grass, etc.) – shift toward snow.
              const snowCover = [
                'match',
                ['get', 'class'],
                'wood', '#7f8f9a',          // frosty forest
                'scrub', '#98a7b1',
                'grass', '#aabac6',
                'tundra', '#b7c7d6',
                'snow', '#dfe9f2',
                'glacier', '#d8e6f3',
                /* default */ '#aabac6'
              ];
              set('landcover', 'fill-color', snowCover);
              set('landcover', 'fill-opacity', 0.65);

              // Landuse (parks, residential, etc.) – de-saturate and lift.
              const snowUse = [
                'match',
                ['get', 'class'],
                'park', '#93a6b3',
                'national_park', '#93a6b3',
                'cemetery', '#98aab7',
                'pitch', '#9fb1bd',
                'school', '#9fb1bd',
                'hospital', '#9fb1bd',
                'residential', '#a8b9c6',
                'industrial', '#8799a6',
                /* default */ '#9fb1bd'
              ];
              set('landuse', 'fill-color', snowUse);
              set('landuse', 'fill-opacity', 0.45);

              // Buildings: add a subtle "snowy" cold tint while keeping emissive warmth.
              if (map.getLayer('3d-buildings')) {
                map.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
                  'interpolate',
                  ['linear'],
                  ['get', 'height'],
                  0, '#2b3340',
                  8, '#4a5563',
                  15, '#7a6a55', // keep warm midtones
                  30, '#b8935a',
                  100, '#FFD700'
                ]);
                map.setPaintProperty('3d-buildings', 'fill-extrusion-opacity', 0.90);
              }

              // Hillshade accent: colder highlights to read as snow ridges.
              if (map.getLayer('tromso-hillshade')) {
                map.setPaintProperty('tromso-hillshade', 'hillshade-exaggeration', 0.55);
                map.setPaintProperty('tromso-hillshade', 'hillshade-highlight-color', '#e2f2ff');
                map.setPaintProperty('tromso-hillshade', 'hillshade-accent-color', '#7dd3fc');
                map.setPaintProperty('tromso-hillshade', 'hillshade-shadow-color', '#020617');
              }
            } catch (err) {
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.warn('[MapView] Failed to apply snow palette:', err);
              }
            }
          };

          configureSnowLandscape();

          // ===== CITY LIGHTS – AIRPLANE VIEW =====
          // Deterministic point lights (no per-frame JS)
          const cityLights = generateTromsoCityLights(1337);
          if (!map.getSource('tromso-city-lights')) {
            map.addSource('tromso-city-lights', {
              type: 'geojson',
              data: cityLights as any,
            });
          }

          // Base opacities (OFF = fully visible, ON = *0.8 in dimMapForVisualMode)
          // Microscopic airplane lights: no glow, no halo — just tiny light sources.
          const CITY_LIGHTS_BASE_OPACITY: Record<'dim' | 'medium' | 'bright', number> = {
            dim: 0.14,
            medium: 0.18,
            bright: 0.26,
          };

          const addLightsLayer = (id: string, tier: 'dim' | 'medium' | 'bright', color: string) => {
            if (map.getLayer(id)) return;
            const styleLayers = map.getStyle?.()?.layers || [];
            const firstSymbolLayerId =
              styleLayers.find((l: any) => l?.type === 'symbol')?.id || undefined;
            const beforeId = map.getLayer('road-label') ? 'road-label' : firstSymbolLayerId;

            const layer: any = {
              id,
              type: 'circle',
              source: 'tromso-city-lights',
              filter: ['==', ['get', 'tier'], tier],
              paint: {
                // Small light sources, tuned for locked zoom=12
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  5.2, tier === 'bright' ? 0.9 : tier === 'medium' ? 0.75 : 0.6,
                  8.0, tier === 'bright' ? 1.6 : tier === 'medium' ? 1.3 : 1.0,
                  12.0, tier === 'bright' ? 2.6 : tier === 'medium' ? 2.2 : 1.8,
                ],
                'circle-color': color,
                'circle-blur': 0.0,
                'circle-opacity': CITY_LIGHTS_BASE_OPACITY[tier],
                'circle-stroke-width': 0,
                // Anchor to ground plane in pitched view
                'circle-pitch-alignment': 'map',
                'circle-pitch-scale': 'map',
              }
            };

            // Insert below labels when possible; otherwise append safely.
            if (beforeId) map.addLayer(layer, beforeId);
            else map.addLayer(layer);
          };

          // Subtle glow layer (very faint) to make lights read at high pitch without looking like halos.
          const addGlowLayer = (id: string, tier: 'dim' | 'medium' | 'bright', color: string) => {
            if (map.getLayer(id)) return;
            const styleLayers = map.getStyle?.()?.layers || [];
            const firstSymbolLayerId =
              styleLayers.find((l: any) => l?.type === 'symbol')?.id || undefined;
            const beforeId = map.getLayer('road-label') ? 'road-label' : firstSymbolLayerId;

            const layer: any = {
              id,
              type: 'circle',
              source: 'tromso-city-lights',
              filter: ['==', ['get', 'tier'], tier],
              paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  5.2, tier === 'bright' ? 2.2 : tier === 'medium' ? 1.9 : 1.6,
                  8.0, tier === 'bright' ? 4.0 : tier === 'medium' ? 3.2 : 2.7,
                  12.0, tier === 'bright' ? 7.0 : tier === 'medium' ? 6.0 : 5.0,
                ],
                'circle-color': color,
                'circle-blur': 0.85,
                'circle-opacity': tier === 'bright' ? 0.10 : tier === 'medium' ? 0.08 : 0.06,
                'circle-stroke-width': 0,
                'circle-pitch-alignment': 'map',
                'circle-pitch-scale': 'map',
              }
            };

            if (beforeId) map.addLayer(layer, beforeId);
            else map.addLayer(layer);
          };

          addGlowLayer('tromso-lights-dim-glow', 'dim', '#ffcc66');
          addGlowLayer('tromso-lights-medium-glow', 'medium', '#ffdd88');
          addGlowLayer('tromso-lights-bright-glow', 'bright', '#ffeeaa');

          addLightsLayer('tromso-lights-dim', 'dim', '#ffcc66');
          addLightsLayer('tromso-lights-medium', 'medium', '#ffdd88');
          addLightsLayer('tromso-lights-bright', 'bright', '#ffeeaa');

          // Very subtle "city haze" to ensure Tromsø reads as inhabited at zoom=12 + high pitch.
          // This is intentionally faint to avoid a cartoon glow.
          if (!map.getLayer('tromso-lights-haze')) {
            const styleLayers = map.getStyle?.()?.layers || [];
            const firstSymbolLayerId =
              styleLayers.find((l: any) => l?.type === 'symbol')?.id || undefined;
            const beforeId = map.getLayer('road-label') ? 'road-label' : firstSymbolLayerId;

            const layer: any = {
              id: 'tromso-lights-haze',
              type: 'circle',
              source: 'tromso-city-lights',
              // Only the brightest points contribute to haze
              filter: ['==', ['get', 'tier'], 'bright'],
              paint: {
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  8.0, 10,
                  12.0, 18,
                ],
                'circle-color': '#ffefbf',
                'circle-blur': 1.0,
                'circle-opacity': 0.035,
                'circle-stroke-width': 0,
                'circle-pitch-alignment': 'map',
                'circle-pitch-scale': 'map',
              },
            };

            if (beforeId) map.addLayer(layer, beforeId);
            else map.addLayer(layer);
          }

          // ===== STARRY NIGHT ATMOSPHERE (FOG) =====
          // Cinematic fog with stars visible in clear sky
          try {
            map.setFog({
              color: 'rgb(10, 15, 25)', // Dark blue-black night sky
              'high-color': 'rgb(5, 10, 20)', // Even darker at horizon
              'horizon-blend': 0.05, // Sharp horizon transition
              'space-color': 'rgb(2, 5, 12)', // Deep space color
              'star-intensity': 0.65, // Visible stars (0-1)
              range: [2, 12], // Fog distance range
              'vertical-range': [0.5, 2] // Vertical fog distribution
            } as any);
          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[MapView] Fog not supported:', err);
            }
          }

          // ===== 3D EMISSIVE BUILDINGS (WINTER NIGHT CITY LIGHTS) =====
          // Realistic building lighting: warm glow from windows and streetlights
          if (!map.getLayer('3d-buildings')) {
            const layers = map.getStyle?.()?.layers || [];
            const labelLayerId = layers.find(
              (layer: any) => layer.type === 'symbol' && layer.layout?.['text-field']
            )?.id;

            map.addLayer({
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 10,
              paint: {
                // Height-based emissive lighting
                'fill-extrusion-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'height'],
                  0, '#2a2833',    // Ground level: dark blue-gray
                  5, '#3a3540',    // Low residential: subtle purple-gray
                  10, '#5a4a3a',   // Medium: warm brown (inhabited)
                  20, '#8b7355',   // Commercial: warmer brown
                  30, '#b8935a',   // Tall: golden brown
                  50, '#d4a860',   // High-rise: bright gold
                  100, '#FFD700'   // Skyscrapers: pure gold (emissive glow)
                ],
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 0,
                  10.5, ['get', 'height']
                ],
                'fill-extrusion-base': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 0,
                  10.5, ['get', 'min_height']
                ],
                // Brighter opacity for visible glow
                'fill-extrusion-opacity': 0.92,
                // Stronger ambient occlusion for depth
                'fill-extrusion-ambient-occlusion-intensity': 0.6,
                'fill-extrusion-ambient-occlusion-radius': 6,
                // Emissive strength (non-standard but works in some contexts)
                'fill-extrusion-vertical-gradient': false
              }
            } as any, labelLayerId);
          }

          // Initialize ocean appearance on load
          const initialPitch = map.getPitch?.() ?? SCENE_PITCH;
          configureOcean(false, initialPitch); // Visual mode is off by default

          // === AURORA WATER REFLECTION ===
          // Subtle green-cyan glow on water surface (aurora reflection effect)
          if (!map.getLayer('aurora-water-reflection')) {
            map.addLayer({
              id: 'aurora-water-reflection',
              type: 'fill',
              source: 'composite',
              'source-layer': 'water',
              paint: {
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  7, 'rgba(80,255,210,0.015)',
                  10, 'rgba(90,255,220,0.025)',
                  12, 'rgba(110,255,230,0.035)'
                ],
                'fill-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  7, 0.10,
                  10, 0.22,
                  12, 0.30
                ]
              }
            });
          }

          // Add Tromsø dimming overlay (shown when shouldExpandMap is true)
          map.addSource('tromso-dim', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: SCENE_CENTER
              },
              properties: {}
            }
          });
          
          map.addLayer({
            id: 'tromso-dim-circle',
            type: 'circle',
            source: 'tromso-dim',
            paint: {
              'circle-radius': 60,
              'circle-color': '#000000',
              'circle-opacity': chaseState.shouldExpandMap ? 0.4 : 0
            }
          });
          
          // Add chase region circles
          CHASE_REGIONS.forEach((region) => {
            try {
              const circleLngLat: [number, number] = [region.coordinates[1], region.coordinates[0]];
              const sourceId = `chase-region-${region.id}`;
              const isBestRegion = chaseState.bestRegion?.region.id === region.id;
              
              // Skip if source already exists
              if (map.getSource(sourceId)) {
                return;
              }
              
              // Create circle source
              map.addSource(sourceId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: circleLngLat
                  },
                  properties: {
                    name: region.name,
                    radius: region.radius
                  }
                }
              });
              
              // Add circle layer with conditional styling for best region
              map.addLayer({
                id: `${sourceId}-circle`,
                type: 'circle',
                source: sourceId,
                paint: {
                  'circle-radius': isBestRegion ? 50 : 40,
                  'circle-color': isBestRegion ? '#34d399' : '#22c55e',
                  'circle-opacity': isBestRegion ? 0.4 : 0.2,
                  'circle-stroke-width': isBestRegion ? 3 : 2,
                  'circle-stroke-color': isBestRegion ? '#34d399' : '#22c55e',
                  'circle-stroke-opacity': isBestRegion ? 0.9 : 0.6
                }
              });
              
              // Add label
              map.addLayer({
                id: `${sourceId}-label`,
                type: 'symbol',
                source: sourceId,
                layout: {
                  'text-field': region.name,
                  'text-size': isBestRegion ? 14 : 12,
                  'text-offset': [0, 0]
                },
                paint: {
                  'text-color': '#ffffff',
                  'text-halo-color': '#000000',
                  'text-halo-width': isBestRegion ? 2 : 1
                }
              });
            } catch (err) {
              if (process.env.NODE_ENV !== 'production') {
                // eslint-disable-next-line no-console
                console.error(`[MapView] Failed to add chase region ${region.id}:`, err);
              }
            }
          });

          // Mark map as ready for custom 3D layers (clouds/aurora).
          setIsMapReady(true);
        });

        // Helper function to configure ocean appearance (cold, deep Arctic aesthetic)
        const configureOcean = (isVisualMode: boolean, currentPitch: number) => {
          if (!map) return;

          try {
            // Check if water layer exists
            if (!map.getLayer('water')) {
              // Water layer not loaded yet - will be applied when dimMapForVisualMode is called
              return;
            }

            // === OCEAN CONTRAST ENHANCEMENT ===
            // Zoom-responsive color gradient for depth perception.
            // In Visual Mode (aurora ON) we keep the ocean MUCH darker to preserve night contrast at zoom=12.
            map.setPaintProperty('water', 'fill-color', [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, isVisualMode ? '#010509' : '#06121a', // near-black in aurora mode
              9, isVisualMode ? '#021018' : '#0b2733',
              12, isVisualMode ? '#03202b' : '#123a4b' // still a hint of teal to separate from land
            ]);

            // Opacity: slightly lower in Visual Mode to avoid the sea reading "flat bright".
            map.setPaintProperty('water', 'fill-opacity', [
              'interpolate',
              ['linear'],
              ['zoom'],
              6, isVisualMode ? 0.48 : 0.60,
              9, isVisualMode ? 0.58 : 0.78,
              12, isVisualMode ? 0.72 : 0.92
            ]);

              // Coastline / shore glow (if present)
              const shoreLayers = ['water-shadow', 'waterway', 'waterway-shadow', 'waterline', 'waterway-label'];
              shoreLayers.forEach((layerId) => {
                if (!map.getLayer(layerId)) return;
                // Keep subtle: we only want a hint of shoreline readability.
                if (layerId.includes('waterway')) {
                  try {
                    map.setPaintProperty(layerId, 'line-color', isVisualMode ? '#3dd6ff' : '#2aa5c8');
                    map.setPaintProperty(layerId, 'line-opacity', isVisualMode ? 0.20 : 0.25);
                    map.setPaintProperty(layerId, 'line-width', [
                      'interpolate', ['linear'], ['zoom'],
                      6, 0.2,
                      12, 0.8
                    ]);
                  } catch {}
                } else {
                  try {
                    map.setPaintProperty(layerId, 'fill-color', isVisualMode ? 'rgba(80,220,255,0.12)' : 'rgba(40,170,200,0.18)');
                    map.setPaintProperty(layerId, 'fill-opacity', isVisualMode ? 0.28 : 0.35);
                  } catch {}
                }
              });

          } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[MapView] Failed to configure ocean:', err);
            }
          }
        };

        // Helper function to dim map layers when visual mode is active
        const dimMapForVisualMode = (isDimmed: boolean) => {
          if (!map) return;

          try {
            // Dim road layers
            const roadLayers = [
              'road-primary', 'road-secondary-tertiary', 'road-street',
              'road-motorway-trunk', 'road-minor', 'road-path'
            ];
            roadLayers.forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(
                  layerId,
                  'line-opacity',
                  isDimmed ? 0.15 : 0.5 // Dimmed vs normal
                );
              }
            });

            // Dim label layers (POI, place names)
            const labelLayers = [
              'place-city-label', 'place-town-label', 'place-village-label',
              'poi-label', 'road-label'
            ];
            labelLayers.forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(
                  layerId,
                  'text-opacity',
                  isDimmed ? 0.2 : 0.8
                );
              }
            });

            // Ocean configuration is now handled by configureOcean()
            // Apply ocean settings based on current state
            const currentPitch = map.getPitch?.() ?? SCENE_PITCH;
            configureOcean(isDimmed, currentPitch);

            // NOTE:
            // Mapbox fog + stars can visually cover custom WebGL layers (post-processing).
            // For Visual Mode we disable fog so 3D aurora/cloud layers are guaranteed visible.
            // When Visual Mode is off, restore cinematic starry fog.
            try {
              if (isDimmed) {
                map.setFog(null as any);
              } else {
                map.setFog({
                  color: 'rgb(10, 15, 25)', // Dark blue-black night sky
                  'high-color': 'rgb(5, 10, 20)', // Even darker at horizon
                  'horizon-blend': 0.05, // Sharp horizon transition
                  'space-color': 'rgb(2, 5, 12)', // Deep space color
                  'star-intensity': 0.65, // Visible stars (0-1)
                  range: [2, 12], // Fog distance range
                  'vertical-range': [0.5, 2] // Vertical fog distribution
                } as any);
              }
            } catch {}

            // Also dim aurora reflection on water when Visual Mode is active,
            // otherwise the reflection can make the sea read too bright at zoom=12.
            if (map.getLayer('aurora-water-reflection')) {
              map.setPaintProperty('aurora-water-reflection', 'fill-opacity', [
                'interpolate',
                ['linear'],
                ['zoom'],
                7, isDimmed ? 0.06 : 0.10,
                10, isDimmed ? 0.12 : 0.22,
                12, isDimmed ? 0.18 : 0.30
              ]);
            }

            // Dim landuse layers (parks, industrial, etc.)
            const landuseLayers = ['landuse', 'landcover'];
            landuseLayers.forEach(layerId => {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(
                  layerId,
                  'fill-opacity',
                  isDimmed ? 0.2 : 0.4
                );
              }
            });

            // ===== CITY LIGHTS VISUAL MODE ADJUSTMENTS =====
            // Dim city lights slightly when Visual Mode is ON (no flicker: fixed values).
            const cityLayers: Array<[string, number]> = [
              ['tromso-lights-dim-glow', 0.06],
              ['tromso-lights-medium-glow', 0.08],
              ['tromso-lights-bright-glow', 0.10],
              ['tromso-lights-haze', 0.035],
              ['tromso-lights-dim', 0.14],
              ['tromso-lights-medium', 0.18],
              ['tromso-lights-bright', 0.26],
            ];
            const scale = isDimmed ? 0.8 : 1.0;
            cityLayers.forEach(([layerId, base]) => {
              if (map.getLayer(layerId)) {
                map.setPaintProperty(layerId, 'circle-opacity', base * scale);
              }
            });
          } catch (err) {
            // Silently fail if layer doesn't exist (style may vary)
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.warn('[MapView] Failed to dim layer:', err);
            }
          }
        };

        // Store references on map object for cleanup and external access
        (map as any).dimMapForVisualMode = dimMapForVisualMode;
        (map as any).configureOcean = configureOcean;

        map.on('error', (e) => {
          const error = (e as any)?.error;

          if (!error) return;

          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('[MapView] Critical map error:', error);
          }
          setMapError('Map failed to load');
        });

        mapRef.current = map;

        // Map is completely static - no automatic drift or animation
        // User controls view manually via rotation/zoom buttons only
      })
      .catch((err) => {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.error('[MapView] Failed to load mapbox-gl:', err);
        }
        setMapError('Failed to load map library');
      });

    return () => {
      if (mapRef.current) {
        const drift = (mapRef.current as any).__kart2_drift;
        if (drift?.timer) clearInterval(drift.timer);
        // Restore map before removing
        if ((mapRef.current as any).dimMapForVisualMode) {
          (mapRef.current as any).dimMapForVisualMode(false);
        }
        mapRef.current.remove();
        mapRef.current = null;
        setIsMapReady(false);
      }
    };
  }, []);

  // Expand toggle: widen zoom range + ease to expanded target, still locked center/bounds.
  // Zoom is locked - no expand/collapse zoom changes needed

  // Watch visual mode toggle and dim/restore map accordingly
  useEffect(() => {
    if (!mapRef.current || !(mapRef.current as any).dimMapForVisualMode) return;

    // Dim map when visual mode is enabled
    (mapRef.current as any).dimMapForVisualMode(visualMode.isEnabled);
  }, [visualMode.isEnabled, isMapReady]);

  // Zoom is locked at 11.16 - keyboard zoom testing removed

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Mapbox container - base layer */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

      </div>

      {/* Visual Mode Canvas Overlay - wrapped for proper z-index stacking */}
      {/* 2D overlay is a fallback only: show it if 3D aurora fails to actually render shortly after enabling. */}
      {shouldShow2DVisualModeOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <VisualModeErrorBoundary
            resetKey={`${visualMode.isEnabled}-${data.timestamp}`}
            onError={() => setVisualModeError('Nordlysanimasjon (Visual Mode) feilet')}
          >
            <VisualModeCanvas
              isEnabled={visualMode.isEnabled}
              // If 3D clouds are actually rendering, disable shader-clouds to avoid the old "screen-space" cloud band.
              // Otherwise allow shader-clouds as fallback.
              weatherModeEnabled={shouldEnable2DShaderClouds}
              kpIndex={data.kp}
              auroraProbability={data.probability}
              cloudCoverage={chaseState.tromsoCloudCoverage}
              timestamp={data.timestamp}
              tromsoCoords={[18.95, 69.65]}
              mapInstance={mapRef.current}
              weatherData={weatherData}
              onFatalError={() => setVisualModeError('Nordlysanimasjon (Visual Mode) feilet')}
            />
          </VisualModeErrorBoundary>
        </div>
      )}

      {/* Gradient overlay to dim upper screen area (sky) when visual mode is active */}
      {visualMode.isEnabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 5, // Between map (0) and VisualModeCanvas (10)
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0) 60%)',
          }}
        />
      )}

      {/* UI Overlay (always top-most). pointer-events-none so map remains interactive,
          but interactive UI elements use pointer-events-auto. */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {/* Debug badge (dev by default, or enable in prod with NEXT_PUBLIC_KART2_DEBUG=1) */}
        {showDebugBadge && (
          <div className="pointer-events-auto absolute top-4 right-4">
            <div className="bg-black/80 backdrop-blur-md text-white rounded-lg px-3 py-2 text-[11px] leading-snug border border-white/10 shadow-xl min-w-[240px]">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="font-semibold text-white/90">Kart2 Debug</span>
                <span className="text-[10px] text-white/60">
                  {process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                <div>
                  <div className="text-white/60">Visual</div>
                  <div className="font-mono">
                    {visualMode.isEnabled ? 'ON' : 'OFF'} / {weatherMode.isEnabled ? 'WxON' : 'WxOFF'}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Renderer</div>
                  <div className="font-mono">
                    {aurora3DFeatureEnabled && aurora3DRendered ? '3D' : shouldShow2DVisualModeOverlay ? '2D' : '—'}
                  </div>
                </div>

                <div className="col-span-2 mt-1 border-t border-white/10 pt-1" />

                <div>
                  <div className="text-white/60">Aurora3D</div>
                  <div className="font-mono">
                    {aurora3DFeatureEnabled ? 'EN' : 'DIS'} / {aurora3DActive ? 'A' : '-'} /{' '}
                    {aurora3DRendered ? 'R' : '-'} / {aurora3DFallbackGracePassed ? 'G' : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-white/60">Clouds3D</div>
                  <div className="font-mono">
                    {clouds3DFeatureEnabled ? 'EN' : 'DIS'} / {clouds3DActive ? 'A' : '-'} /{' '}
                    {clouds3DRendered ? 'R' : '-'} / {clouds3DFallbackGracePassed ? 'G' : '-'}
                  </div>
                </div>

                <div>
                  <div className="text-white/60">2D overlay</div>
                  <div className="font-mono">{shouldShow2DVisualModeOverlay ? 'ON' : 'OFF'}</div>
                </div>
                <div>
                  <div className="text-white/60">2D clouds</div>
                  <div className="font-mono">{shouldEnable2DShaderClouds ? 'ON' : 'OFF'}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Snapshot Button */}
        <div
          id="snapshot-button-container"
          className="pointer-events-auto absolute bottom-24 right-4 flex flex-col gap-2"
        >
          {/* Manual Zoom + Expand */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
              title={isExpanded ? 'Komprimer utsikt' : 'Utvid utsikt'}
            >
              <span className="text-base">{isExpanded ? '⤡' : '⤢'}</span>
            </button>
            {/* Look-around (horizontal rotation) */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => rotateBy(-15)}
                className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
                title="Se mot venstre"
              >
                <span className="text-base">↺</span>
              </button>
              <button
                onClick={() => rotateBy(15)}
                className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
                title="Se mot høyre"
              >
                <span className="text-base">↻</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleSnapshot}
              disabled={isSnapshotting}
              className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
              title={visualMode.isEnabled ? 'Share this moment' : 'Ta bilde av kartet'}
            >
              {isSnapshotting ? (
                <span className="animate-pulse text-xs">⏳</span>
              ) : (
                <span className="text-lg">📷</span>
              )}
            </button>
            {/* Visual Mode context label */}
            {visualMode.isEnabled && (
              <span className="text-[9px] text-emerald-300/70 font-medium">Share</span>
            )}
          </div>
        </div>

        {/* Aurora Data Overlay */}
        <div className="pointer-events-auto absolute top-4 left-4 space-y-3 max-w-[280px]">
          {(error || mapError) && (
            <div className="bg-red-500/90 text-white p-4 rounded shadow">
              <p className="font-bold">Feil</p>
              <p className="text-sm">{error || mapError}</p>
            </div>
          )}

          {visualModeError && (
            <div className="bg-yellow-500/90 text-black p-3 rounded shadow text-xs">
              <p className="font-semibold">Visual Mode utilgjengelig</p>
              <p className="text-[10px] opacity-90">{visualModeError}</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white/90 p-4 rounded shadow">
              <p className="text-sm text-gray-600">Laster nordlysdata...</p>
            </div>
          )}

          {data && (
            <div
              className="text-white p-5 shadow-2xl"
              style={{
                background: 'rgba(20, 25, 35, 0.6)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
              }}
            >
              {/* KP Index Visual Gauge */}
              <div className="mb-4">
                <p className="text-xs text-white/70 mb-2">Kp-indeks Aktivitet</p>
                <div className="relative h-3 rounded-full overflow-hidden bg-white/10">
                  <div
                    className="h-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(data.kp / 9) * 100}%`,
                      background: `linear-gradient(90deg,
                        ${data.kp < 3 ? '#22c55e' : data.kp < 5 ? '#eab308' : data.kp < 7 ? '#f97316' : '#ef4444'} 0%,
                        ${data.kp < 3 ? '#16a34a' : data.kp < 5 ? '#ca8a04' : data.kp < 7 ? '#ea580c' : '#dc2626'} 100%
                      )`,
                      boxShadow: `0 0 12px ${data.kp < 3 ? '#22c55e' : data.kp < 5 ? '#eab308' : data.kp < 7 ? '#f97316' : '#ef4444'}80`
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-2xl font-bold">{data.kp.toFixed(1)}</span>
                  <span className="text-xs text-white/50">Max: 9.0</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/70">Sannsynlighet</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold">{data.probability}%</p>
                    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                        style={{ width: `${data.probability}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10">
                  <p className="text-xs text-white/50">
                    Oppdatert: {new Date(data.timestamp).toLocaleTimeString('no-NO')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div
            className="p-3 text-xs text-gray-200"
            style={{
              background: 'rgba(20, 25, 35, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            <p className="font-semibold text-white">Tromsø, Norge</p>
            <p className="text-white/60">Eksperimentelt kart</p>
          </div>

          {/* Legend - Map Explanation */}
          <div
            className="p-3 text-xs text-gray-200 max-w-[220px]"
            style={{
              background: 'rgba(20, 25, 35, 0.6)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
            }}
          >
            <p className="font-semibold mb-2 text-white">Kart forklaring</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/30 border-2 border-green-500/50"></div>
                <span className="text-white/80">Mulige observasjonssteder</span>
              </div>
              {chaseState.bestRegion && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400/40 border-2 border-emerald-400"></div>
                  <span className="font-medium text-white/90">Best synlighet</span>
                </div>
              )}
              <p className="text-[10px] text-white/50 mt-2 pt-2 border-t border-white/10">
                Synlighet basert på skydekke. Nordlysaktivitet antas lik i hele regionen.
              </p>
            </div>
          </div>

          {/* AI Interpretation Layer */}
          {aiInput && (
            <AIInterpretation
              kp={aiInput.kp}
              probability={aiInput.probability}
              tromsoCloud={aiInput.tromsoCloud}
              bestRegion={aiInput.bestRegion}
            />
          )}

          {/* Visual Mode Toggle (Aurora) */}
          {visualMode.isClient && (
            <VisualModeToggle
              isEnabled={visualMode.isEnabled}
              onToggle={() => {
                // If the user toggles, allow the VisualModeErrorBoundary to reset.
                setVisualModeError(null);
                visualMode.toggle();
              }}
            />
          )}

          {/* Weather Mode Toggle (Clouds) */}
          {visualMode.isClient && (
            <WeatherModeToggle
              isEnabled={weatherMode.isEnabled}
              onToggle={weatherMode.toggle}
            />
          )}

          {/* Weather Test Toggle (DEV MODE ONLY) */}
          {process.env.NODE_ENV !== 'production' && (
            <button
              onClick={cycleWeatherTest}
              className="bg-purple-600/90 backdrop-blur-md text-white p-3 rounded shadow-lg hover:bg-purple-700 transition-colors text-xs font-medium"
            >
              <div className="flex flex-col items-start gap-1">
                <span className="font-bold">🌦️ Weather Test</span>
                <span className="text-[10px] opacity-90">
                  Mode: {weatherTestMode === 'snow' ? '❄️ Snow' : weatherTestMode === 'clear' ? '☀️ Clear' : '🌐 Real'}
                </span>
              </div>
            </button>
          )}

          {/* Tromsø Cloud Notice */}
          {chaseState.shouldExpandMap && (
            <div className="bg-orange-500/90 text-white p-3 rounded shadow text-xs">
              <p className="font-semibold">Høyt skydekke over Tromsø</p>
              <p className="text-[10px] mt-1 opacity-90">Alternative steder markert på kart</p>
            </div>
          )}

          {/* Zoom level indicator (DEV MODE ONLY) */}
          {process.env.NODE_ENV !== 'production' && mapRef.current && (
            <div className="bg-gray-900/90 backdrop-blur-md text-white text-xs p-2 rounded shadow-lg">
              <p className="font-mono">
                Zoom: {mapRef.current.getZoom?.()?.toFixed(2) ?? 'N/A'} (locked)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
