'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuroraData } from './useAuroraData';
import { useChaseRegions } from './useChaseRegions';
import { CHASE_REGIONS } from './map.config';
import AIInterpretation from './AIInterpretation';
import VisualModeCanvas from './components/VisualModeCanvas';
import VisualModeToggle from './components/VisualModeToggle';
import { useVisualMode } from './hooks/useVisualMode';
import VisualModeErrorBoundary from './components/VisualModeErrorBoundary';
import { generateTromsoCityLights } from './utils/cityLights';

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const hasInitialized = useRef(false); // Task 3: Map Init Guard
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const isSnapshottingRef = useRef(false); // Task 1: Snapshot Debounce Lock
  const [visualModeError, setVisualModeError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, error } = useAuroraData();
  const chaseState = useChaseRegions();
  const visualMode = useVisualMode();

  // Fixed "scene" camera: Tromsø viewpoint (not a navigable world map)
  const SCENE_CENTER: [number, number] = [18.95, 69.65];
  const SCENE_ZOOM = 8.0;
  // Side-view (cinematic horizon). User rotates horizontally to "look around".
  const SCENE_PITCH = 60;
  // User should feel they are in Tromsø looking north
  const SCENE_BEARING = 0;

  // Manual zoom + expand presets (still locked to Tromsø)
  const ZOOM_STEP = 0.1;
  const ZOOM_SCENE_MIN = 7.8;
  const ZOOM_SCENE_MAX = 8.0;
  const ZOOM_EXPANDED_TARGET = 5.4;
  const ZOOM_EXPANDED_MIN = 5.2;
  const ZOOM_EXPANDED_MAX = 8.0;

  const getZoomBounds = () => (isExpanded
    ? { min: ZOOM_EXPANDED_MIN, max: ZOOM_EXPANDED_MAX }
    : { min: ZOOM_SCENE_MIN, max: ZOOM_SCENE_MAX }
  );

  const clampZoom = (z: number) => {
    const b = getZoomBounds();
    return Math.min(b.max, Math.max(b.min, z));
  };

  const easeToZoom = (targetZoom: number) => {
    if (!mapRef.current) return;
    const currentBearing = mapRef.current.getBearing?.() ?? SCENE_BEARING;
    mapRef.current.easeTo({
      center: SCENE_CENTER,
      zoom: clampZoom(targetZoom),
      pitch: SCENE_PITCH,
      // Preserve user's current bearing (horizontal look-around)
      bearing: currentBearing,
      duration: 650,
      easing: (t: number) => t * t * (3 - 2 * t),
      essential: true,
    });
  };

  const zoomIn = () => {
    if (!mapRef.current) return;
    const next = (mapRef.current.getZoom?.() ?? SCENE_ZOOM) + ZOOM_STEP;
    easeToZoom(next);
  };

  const zoomOut = () => {
    if (!mapRef.current) return;
    const next = (mapRef.current.getZoom?.() ?? SCENE_ZOOM) - ZOOM_STEP;
    easeToZoom(next);
  };

  const rotateBy = (deltaDeg: number) => {
    if (!mapRef.current) return;
    const currentBearing = mapRef.current.getBearing?.() ?? SCENE_BEARING;
    const currentZoom = mapRef.current.getZoom?.() ?? SCENE_ZOOM;
    mapRef.current.easeTo({
      center: SCENE_CENTER,
      zoom: clampZoom(currentZoom),
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
        // Allow horizontal look-around via rotation (bearing). Zoom is constrained by min/max.
        map.dragRotate.enable();
        map.touchZoomRotate.enable();
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
            dim: 0.10,
            medium: 0.14,
            bright: 0.20,
          };

          const addLightsLayer = (id: string, tier: 'dim' | 'medium' | 'bright', color: string) => {
            if (map.getLayer(id)) return;
            map.addLayer({
              id,
              type: 'circle',
              source: 'tromso-city-lights',
              filter: ['==', ['get', 'tier'], tier],
              paint: {
                // Microscopic radii, zoom-responsive up to 8
                'circle-radius': [
                  'interpolate', ['linear'], ['zoom'],
                  5.2, tier === 'bright' ? 0.9 : tier === 'medium' ? 0.75 : 0.6,
                  8.0, tier === 'bright' ? 1.6 : tier === 'medium' ? 1.3 : 1.0,
                ],
                'circle-color': color,
                'circle-blur': 0.0,
                'circle-opacity': CITY_LIGHTS_BASE_OPACITY[tier],
                'circle-stroke-width': 0,
                // Anchor to ground plane in pitched view
                'circle-pitch-alignment': 'map',
                'circle-pitch-scale': 'map',
              }
            });
          };

          addLightsLayer('tromso-lights-dim', 'dim', '#ffcc66');
          addLightsLayer('tromso-lights-medium', 'medium', '#ffdd88');
          addLightsLayer('tromso-lights-bright', 'bright', '#ffeeaa');

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
        });

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

            // Reduce water brightness
            if (map.getLayer('water')) {
              map.setPaintProperty(
                'water',
                'fill-opacity',
                isDimmed ? 0.3 : 0.5
              );
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
              ['tromso-lights-dim', 0.10],
              ['tromso-lights-medium', 0.14],
              ['tromso-lights-bright', 0.20],
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

        // Store reference on map object for cleanup
        (map as any).dimMapForVisualMode = dimMapForVisualMode;

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

        // --- Subtle cinematic drift (no user navigation) ---
        // Gentle alternating easeTo (no per-frame JS).
        const drift = {
          t: 0,
          timer: null as null | ReturnType<typeof setInterval>,
          lastUserInteraction: 0,
          isUserRotating: false,
        };
        const markUserInteraction = () => {
          drift.lastUserInteraction = Date.now();
        };
        // Pause drift while user is actively rotating / shortly after
        map.on('rotatestart', () => {
          drift.isUserRotating = true;
          markUserInteraction();
        });
        map.on('rotate', markUserInteraction);
        map.on('rotateend', () => {
          drift.isUserRotating = false;
          markUserInteraction();
        });

        const applyDrift = () => {
          if (!mapRef.current) return;
          // Don't fight the user; wait a bit after interaction.
          if (drift.isUserRotating) return;
          if (Date.now() - drift.lastUserInteraction < 4500) return;

          drift.t = (drift.t + 1) % 2;
          const sign = drift.t === 0 ? 1 : -1;
          const currentBearing = mapRef.current.getBearing?.() ?? SCENE_BEARING;
          mapRef.current.easeTo({
            center: [SCENE_CENTER[0] + sign * 0.02, SCENE_CENTER[1] + sign * 0.01],
            // Preserve user's current bearing (look-around)
            bearing: currentBearing,
            pitch: SCENE_PITCH,
            duration: 11000,
            easing: (t: number) => t * t * (3 - 2 * t), // smoothstep
            essential: true,
          });
        };
        map.once('idle', () => {
          applyDrift();
          drift.timer = setInterval(applyDrift, 12000);
        });
        (map as any).__kart2_drift = drift;
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
      }
    };
  }, []);

  // Expand toggle: widen zoom range + ease to expanded target, still locked center/bounds.
  useEffect(() => {
    if (!mapRef.current) return;
    const b = getZoomBounds();
    mapRef.current.setMinZoom?.(b.min);
    mapRef.current.setMaxZoom?.(b.max);

    if (isExpanded) {
      easeToZoom(ZOOM_EXPANDED_TARGET);
    } else {
      easeToZoom(SCENE_ZOOM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  // Watch visual mode toggle and dim/restore map accordingly
  useEffect(() => {
    if (!mapRef.current || !(mapRef.current as any).dimMapForVisualMode) return;

    // Dim map when visual mode is enabled
    (mapRef.current as any).dimMapForVisualMode(visualMode.isEnabled);
  }, [visualMode.isEnabled]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Mapbox container - base layer */}
      <div className="absolute inset-0" style={{ zIndex: 0 }}>
        <div ref={mapContainerRef} className="w-full h-full" />

      </div>

      {/* Visual Mode Canvas Overlay - wrapped for proper z-index stacking */}
      {data && visualMode.isClient && mapRef.current && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <VisualModeErrorBoundary
            resetKey={`${visualMode.isEnabled}-${data.timestamp}`}
            onError={() => setVisualModeError('Nordlysanimasjon (Visual Mode) feilet')}
          >
            <VisualModeCanvas
              isEnabled={visualMode.isEnabled}
              kpIndex={data.kp}
              auroraProbability={data.probability}
              cloudCoverage={chaseState.tromsoCloudCoverage}
              timestamp={data.timestamp}
              tromsoCoords={[18.95, 69.65]}
              mapInstance={mapRef.current}
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
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={zoomIn}
                className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
                title="Zoom inn"
              >
                <span className="text-lg">+</span>
              </button>
              <button
                onClick={zoomOut}
                className="bg-gray-900/90 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-black transition-colors text-gray-200 flex items-center justify-center w-10 h-10"
                title="Zoom ut"
              >
                <span className="text-lg">−</span>
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
            <div className="bg-black/80 backdrop-blur-sm text-white p-4 rounded shadow-lg">
              <h2 className="font-bold text-lg mb-3">Nordlys Status</h2>

              <div className="space-y-2">
                <div>
                  <p className="text-xs text-white/60">Kp-indeks</p>
                  <p className="text-3xl font-bold text-primary">{data.kp.toFixed(1)}</p>
                </div>

                <div>
                  <p className="text-xs text-white/60">Sannsynlighet</p>
                  <p className="text-2xl font-bold">{data.probability}%</p>
                </div>

                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs text-white/40">
                    Oppdatert: {new Date(data.timestamp).toLocaleTimeString('no-NO')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs text-gray-300">
            <p className="font-semibold">Tromsø, Norge</p>
            <p>Eksperimentelt kart</p>
          </div>

          {/* Legend - Map Explanation */}
          <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs text-gray-200 max-w-[220px]">
            <p className="font-semibold mb-2 text-gray-100">Kart forklaring</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/30 border-2 border-green-500/50"></div>
                <span>Mulige observasjonssteder</span>
              </div>
              {chaseState.bestRegion && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400/40 border-2 border-emerald-400"></div>
                  <span className="font-medium">Best synlighet</span>
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2 pt-2 border-t border-gray-700">
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

          {/* Visual Mode Toggle */}
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

          {/* Tromsø Cloud Notice */}
          {chaseState.shouldExpandMap && (
            <div className="bg-orange-500/90 text-white p-3 rounded shadow text-xs">
              <p className="font-semibold">Høyt skydekke over Tromsø</p>
              <p className="text-[10px] mt-1 opacity-90">Alternative steder markert på kart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
