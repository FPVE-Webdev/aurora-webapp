'use client';

import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useAuroraData } from './useAuroraData';
import { useChaseRegions } from './useChaseRegions';
import { CHASE_REGIONS } from './map.config';
import AIInterpretation from './AIInterpretation';
import 'mapbox-gl/dist/mapbox-gl.css';

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const { data, isLoading, error } = useAuroraData();
  const chaseState = useChaseRegions();

  // Snapshot Handler
  const handleSnapshot = async () => {
    if (!mapContainerRef.current) return;
    
    try {
      setIsSnapshotting(true);
      
      // Target the parent div to capture overlay + map
      const element = mapContainerRef.current.parentElement as HTMLElement;
      
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2, // Check this doesn't crash mobile
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
      
    } catch (err) {
      console.error('Snapshot failed:', err);
    } finally {
      setIsSnapshotting(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    console.log('[MapView] Token:', token ? 'SET' : 'MISSING');

    if (!token) {
      const errorMsg = 'No Mapbox token found';
      console.error('[MapView]', errorMsg);
      setMapError(errorMsg);
      return;
    }

    // Dynamically import mapbox-gl to avoid SSR issues
    import('mapbox-gl')
      .then((mapboxgl) => {
        mapboxgl.default.accessToken = token;

        const map = new mapboxgl.default.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/dark-v11',
          center: [18.95, 69.65], // Tromsø
          zoom: 6,
          attributionControl: false,
        });
        console.log('[MapView] Map created');

        map.on('load', () => {
          console.log('[MapView] ✅ Map loaded!');
          
          // Add Tromsø dimming overlay (shown when shouldExpandMap is true)
          map.addSource('tromso-dim', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [18.95, 69.65]
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
                console.log(`[MapView] Source ${sourceId} already exists, skipping`);
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
                  'circle-opacity': isBestRegion ? 0.25 : 0.15,
                  'circle-stroke-width': isBestRegion ? 3 : 2,
                  'circle-stroke-color': isBestRegion ? '#34d399' : '#22c55e',
                  'circle-stroke-opacity': isBestRegion ? 0.8 : 0.5
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
              console.error(`[MapView] Failed to add chase region ${region.id}:`, err);
            }
          });
        });

        map.on('error', (e) => {
          const error = (e as any)?.error;

          if (!error) return;

          console.error('[MapView] Critical map error:', error);
          setMapError('Map failed to load');
        });

        mapRef.current = map;
      })
      .catch((err) => {
        console.error('[MapView] Failed to load mapbox-gl:', err);
        setMapError('Failed to load map library');
      });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Snapshot Button */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={handleSnapshot}
          disabled={isSnapshotting}
          className="bg-white/90 p-3 rounded-full shadow hover:bg-white transition-colors text-gray-700 flex items-center justify-center w-10 h-10"
          title="Ta bilde av kartet"
        >
          {isSnapshotting ? (
            <span className="animate-pulse text-xs">⏳</span>
          ) : (
            <span className="text-lg">📷</span>
          )}
        </button>
      </div>

      {/* Aurora Data Overlay */}
      <div className="absolute top-4 left-4 space-y-3 max-w-[280px]">
        {(error || mapError) && (
          <div className="bg-red-500/90 text-white p-4 rounded shadow">
            <p className="font-bold">Feil</p>
            <p className="text-sm">{error || mapError}</p>
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

        <div className="bg-white/90 p-3 rounded shadow text-xs text-gray-600">
          <p className="font-semibold">Tromsø, Norge</p>
          <p>Eksperimentelt kart</p>
        </div>

        {/* Legend - Map Explanation */}
        <div className="bg-white/90 p-3 rounded shadow text-xs text-gray-700 max-w-[220px]">
          <p className="font-semibold mb-2 text-gray-800">Kart forklaring</p>
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
            <p className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-300">
              Synlighet basert på skydekke. Nordlysaktivitet antas lik i hele regionen.
            </p>
          </div>
        </div>

        {/* AI Interpretation Layer */}
        {data && (
          <AIInterpretation 
            kp={data.kp} 
            probability={data.probability}
            tromsoCloud={chaseState.tromsoCloudCoverage}
            bestRegion={chaseState.bestRegion ? {
              name: chaseState.bestRegion.region.name,
              visibilityScore: chaseState.bestRegion.visibilityScore
            } : null}
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
  );
}
