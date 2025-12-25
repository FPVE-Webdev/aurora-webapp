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
import { MAP_CONFIG } from './map.config';

export default function MapView() {
  const { data, isLoading, error } = useAuroraData();
  const [mapReady, setMapReady] = useState(false);
  const mapInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (mapInitializedRef.current) return;
    mapInitializedRef.current = true;

    // TODO (FASE 1): Initialize Mapbox GL JS
    //   - Import mapboxgl
    //   - Create map instance
    //   - Set initial bounds to Northern Norway
    //   - Add dark style for aurora visibility
    //
    // TODO (FASE 1): Add aurora oval GeoJSON layer
    //   - Fetch from /api/aurora/oval
    //   - Update every 30 minutes
    //   - Render as semi-transparent polygon
    //
    // TODO (FASE 1): Add observation spot markers
    //   - Use OBSERVATION_SPOTS from @/lib/constants
    //   - Show probability % on each marker
    //   - Color-code by probability level
    //
    // TODO (FASE 2): Add timeline scrubber
    //   - 12-hour forecast slider
    //   - Update markers dynamically per hour
    //   - Sync with hourly forecast data
    //
    // TODO (FASE 2): Add user geolocation
    //   - Request browser location permission
    //   - Show user marker on map
    //   - Calculate distance to aurora oval
    //
    // TODO (FASE 3): Add cloud coverage overlay
    //   - Fetch from weather API
    //   - Render as semi-transparent layer
    //   - Update every 15 minutes
    //
    // TODO (FASE 3): Add chase route planning
    //   - Allow users to set waypoints
    //   - Show driving time estimates
    //   - Warn about road conditions

    // PLACEHOLDER: Simulate map loading
    const timer = setTimeout(() => {
      setMapReady(true);
    }, 1000);

    return () => {
      clearTimeout(timer);
      // TODO (FASE 1): Cleanup Mapbox instance
      // if (mapInstance) {
      //   mapInstance.remove();
      //   mapInstance = null;
      // }
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

  return (
    <div className="relative w-full h-full bg-arctic-900">
      {/* PLACEHOLDER: Map container */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white">
              Nordlyskart (Kart2)
            </h1>
            <p className="text-sm text-white/70">
              Eksperimentell offentlig versjon
            </p>
          </div>

          {/* Current aurora data (from hook) */}
          {data && (
            <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 space-y-3">
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">Kp-indeks</p>
                <p className="text-4xl font-bold text-primary">
                  {data.kp.toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-white/60 mb-1">Sannsynlighet</p>
                <p className="text-2xl font-bold text-white">
                  {data.probability}%
                </p>
              </div>
              <p className="text-xs text-white/40 text-center">
                Oppdatert: {new Date(data.timestamp).toLocaleTimeString('no-NO')}
              </p>
            </div>
          )}

          {/* Implementation status */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <p className="text-xs text-yellow-200/90">
              ⚠️ FASE 0: Scaffolding ferdig
            </p>
            <p className="text-xs text-yellow-200/60 mt-2">
              Mapbox-integrasjon kommer i FASE 1
            </p>
          </div>

          {/* Config info (for development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-left bg-black/30 rounded p-3 text-xs font-mono">
              <p className="text-white/50">Debug Info:</p>
              <p className="text-white/40">Center: {MAP_CONFIG.initialView.latitude}, {MAP_CONFIG.initialView.longitude}</p>
              <p className="text-white/40">Zoom: {MAP_CONFIG.initialView.zoom}</p>
              <p className="text-white/40">Token: {MAP_CONFIG.mapboxToken ? '✓ Set' : '✗ Missing'}</p>
            </div>
          )}
        </div>
      </div>

      {/* TODO (FASE 1): Real Mapbox map
      <div ref={mapContainerRef} className="w-full h-full" />
      */}

      {/* TODO (FASE 1): Aurora overlay controls */}
      {/* TODO (FASE 1): Location selector */}
      {/* TODO (FASE 1): Timeline scrubber */}
      {/* TODO (FASE 1): Legend */}
    </div>
  );
}
