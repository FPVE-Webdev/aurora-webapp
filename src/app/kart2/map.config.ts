/**
 * Map Configuration for /kart2
 *
 * EXPERIMENTAL PUBLIC MAP SETTINGS
 * - Mapbox GL JS configuration
 * - Focused on Northern Norway / Tromsø area
 * - Public-facing, simplified settings
 *
 * ISOLATION: Independent from /live map configuration.
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
  } as const,

  // Geographic bounds - Northern Scandinavia
  // Prevents users from panning too far from aurora zone
  bounds: {
    north: 71.5,  // Northern limit (Nordkapp area)
    south: 67.5,  // Southern limit (Bodø area)
    west: 15.0,   // Western limit (Norwegian Sea)
    east: 32.0,   // Eastern limit (Finnish border)
  } as const,

  // Zoom limits
  minZoom: 4,   // Show full Northern Norway
  maxZoom: 12,  // Street-level detail

  // Animation settings for smooth transitions
  animation: {
    duration: 1000,              // ms
    easing: 'ease-in-out' as const,
  } as const,

  // FASE 2: Chase Region auto-fit thresholds
  chaseMode: {
    // Trigger auto-expand when Tromsø cloud coverage exceeds this %
    cloudThreshold: 70,
    // Minimum visibility score to consider a zone "chase-worthy"
    minVisibilityScore: 40,
  } as const,
} as const;

// Type-safe config type
export type MapConfig = typeof MAP_CONFIG;

// FASE 2: Chase Region zones (static configuration)
// These are alternative viewing locations when Tromsø is clouded
export const CHASE_REGIONS = [
  {
    id: 'lyngen',
    name: 'Lyngen Alps',
    coordinates: [69.57, 20.22] as [number, number],
    radius: 25, // km from center
    priority: 1, // Higher = check first
  },
  {
    id: 'skibotn',
    name: 'Skibotn',
    coordinates: [69.39, 20.28] as [number, number],
    radius: 20,
    priority: 2,
  },
  {
    id: 'senja',
    name: 'Senja',
    coordinates: [69.35, 17.85] as [number, number],
    radius: 30,
    priority: 3,
  },
  {
    id: 'nordreisa',
    name: 'Nordreisa',
    coordinates: [69.73, 21.00] as [number, number],
    radius: 25,
    priority: 4,
  },
  {
    id: 'kvænangen',
    name: 'Kvænangen',
    coordinates: [69.95, 21.98] as [number, number],
    radius: 20,
    priority: 5,
  },
] as const;

export type ChaseRegion = typeof CHASE_REGIONS[number];

// TODO (FASE 1): Add aurora layer configuration
// export const AURORA_LAYER_CONFIG = {
//   sourceId: 'aurora-oval',
//   layerId: 'aurora-oval-fill',
//   fillColor: '#22c55e',
//   fillOpacity: 0.3,
//   strokeColor: '#34f5c5',
//   strokeWidth: 2,
// } as const;

// TODO (FASE 1): Add observation spot marker configuration
// export const MARKER_CONFIG = {
//   colors: {
//     excellent: '#34f5c5',  // >=70%
//     good: '#22c55e',       // >=50%
//     moderate: '#8b5cf6',   // >=30%
//     fair: '#f97316',       // >=15%
//     poor: '#64748b',       // <15%
//   },
//   size: 32,
//   fontSize: 12,
// } as const;

// TODO (FASE 2): Add timeline scrubber configuration
// export const TIMELINE_CONFIG = {
//   hours: 12,
//   stepMinutes: 60,
//   autoPlaySpeed: 2000, // ms per hour
// } as const;

// TODO (FASE 3): Add cloud overlay configuration
// export const CLOUD_LAYER_CONFIG = {
//   sourceId: 'cloud-coverage',
//   layerId: 'cloud-fill',
//   opacityScale: [0, 0.7], // 0% = transparent, 100% = 70% opacity
//   updateInterval: 15 * 60 * 1000, // 15 minutes
// } as const;
