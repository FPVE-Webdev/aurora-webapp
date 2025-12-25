/**
 * Map Configuration for /kart2
 *
 * EXPERIMENTAL PUBLIC MAP SETTINGS
 * - Mapbox-based configuration
 * - Focused on Northern Norway / Tromsø area
 * - Public-facing, simplified settings
 */

export const MAP_CONFIG = {
  // Mapbox settings
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '',
  style: 'mapbox://styles/mapbox/dark-v11', // Dark theme for aurora visibility

  // Initial view - centered on Tromsø
  initialView: {
    latitude: 69.65,
    longitude: 18.95,
    zoom: 6,
  },

  // Geographic bounds - Northern Scandinavia
  bounds: {
    north: 71.5,
    south: 67.5,
    west: 15.0,
    east: 32.0,
  },

  // Zoom limits
  minZoom: 4,
  maxZoom: 12,

  // Animation settings
  animation: {
    duration: 1000, // ms
    easing: 'ease-in-out' as const,
  },
} as const;

// TODO (FASE 1): Add aurora layer configuration
// TODO (FASE 1): Add observation spot markers
// TODO (FASE 1): Add cloud coverage overlay settings
