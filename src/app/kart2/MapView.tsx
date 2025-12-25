/**
 * MapView Component for /kart2
 *
 * EXPERIMENTAL PUBLIC AURORA MAP
 * - Mapbox-based interactive map
 * - Client component (uses hooks and browser APIs)
 * - Isolated from professional map logic
 *
 * STATUS: FASE 0 - SCAFFOLDING
 * - Placeholder UI only
 * - No map initialization yet
 *
 * ISOLATION: This component is completely independent from /live map.
 * Can be deleted without affecting professional users.
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuroraData } from './useAuroraData';
import { useChaseRegions } from './useChaseRegions';
import { MAP_CONFIG } from './map.config';
import 'mapbox-gl/dist/mapbox-gl.css';

// Dynamically import mapbox to avoid SSR issues
const mapboxgl = typeof window !== 'undefined' ? require('mapbox-gl') : null;

export default function MapView() {
  const { data, isLoading, error } = useAuroraData();
  const chaseState = useChaseRegions();
  const [mapReady, setMapReady] = useState(false);
  const mapInitializedRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (mapInitializedRef.current || !mapboxgl || !mapContainerRef.current) return;
    mapInitializedRef.current = true;

    // Check if Mapbox token is configured
    if (!MAP_CONFIG.mapboxToken) {
      console.error('NEXT_PUBLIC_MAPBOX_TOKEN is not configured');
      setMapReady(true); // Allow render to show error state
      return;
    }

    // Initialize Mapbox GL JS
    mapboxgl.accessToken = MAP_CONFIG.mapboxToken;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_CONFIG.style,
      center: [MAP_CONFIG.initialView.longitude, MAP_CONFIG.initialView.latitude],
      zoom: MAP_CONFIG.initialView.zoom,
      minZoom: MAP_CONFIG.minZoom,
      maxZoom: MAP_CONFIG.maxZoom,
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      setMapReady(true);
    });

    // TODO (FASE 1): Add aurora oval GeoJSON layer
    // TODO (FASE 1): Add observation spot markers
    // TODO (FASE 2): Add timeline scrubber
    // TODO (FASE 2): Add user geolocation
    // TODO (FASE 2): Implement chase region auto-fit
    // TODO (FASE 2): Add chase region markers
    // TODO (FASE 3): Add cloud coverage overlay
    // TODO (FASE 3): Add AI-based chase recommendations
    // TODO (FASE 3): Add chase route planning

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Loading state
  if (isLoading || !mapReady) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Laster nordlyskart...</p>
          <p className="text-xs text-white/50">Eksperimentell versjon</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">Kunne ikke laste nordlysdata</p>
          <p className="text-xs text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  // Check if Mapbox token is missing
  if (mapReady && !MAP_CONFIG.mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-arctic-900">
        <div className="text-center space-y-4 max-w-md px-4">
          <p className="text-red-400">Mapbox token mangler</p>
          <p className="text-xs text-white/50">
            Sett NEXT_PUBLIC_MAPBOX_TOKEN i .env.local
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-arctic-900">
      {/* Mapbox map container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Header overlay - floating on top of map */}
      <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
        <div className="p-4 space-y-3 pointer-events-auto">
          {/* Aurora data card */}
          {data && (
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 inline-block">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">Kp-indeks</p>
                  <p className="text-2xl font-bold text-primary">
                    {data.kp.toFixed(1)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-white/60 mb-1">Sannsynlighet</p>
                  <p className="text-xl font-bold text-white">
                    {data.probability}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* FASE 2: Chase Region indicator */}
          {chaseState.shouldExpandMap && chaseState.bestRegion && (
            <div className="bg-orange-500/20 backdrop-blur-sm border border-orange-500/40 rounded-lg p-3 inline-block">
              <p className="text-xs text-orange-200">
                Tromsø: {chaseState.tromsoCloudCoverage}% sky → Best: {chaseState.bestRegion.region.name}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* TODO (FASE 1): Aurora overlay controls */}
      {/* TODO (FASE 1): Location selector */}
      {/* TODO (FASE 1): Timeline scrubber */}
      {/* TODO (FASE 1): Legend */}
    </div>
  );
}
