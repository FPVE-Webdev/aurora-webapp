import { ObservationSpot } from "@/types/aurora";

// Main regional observation spots available to all users (free tier)
// Free users only see Tromsø
export const FREE_OBSERVATION_SPOTS: ObservationSpot[] = [
  { id: 'tromso', name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, region: 'troms', tier: 'free', travelTimeMinutes: 0 },
];

// Premium/Pro observation spots (available to premium_24h, premium_7d, and enterprise)
// Coordinates slightly adjusted to prevent marker overlap on map
export const PRO_OBSERVATION_SPOTS: ObservationSpot[] = [
  // Troms detailed locations - adjusted for better map visibility
  { id: 'tromso', name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, region: 'troms', tier: 'free', travelTimeMinutes: 0 },
  { id: 'sommaroy', name: 'Sommarøy', latitude: 69.58, longitude: 17.85, region: 'troms', tier: 'pro', travelTimeMinutes: 60 },
  { id: 'grotfjord', name: 'Grøtfjord', latitude: 69.80, longitude: 18.45, region: 'troms', tier: 'pro', travelTimeMinutes: 25 },
  { id: 'grunnfjord', name: 'Grunnfjord', latitude: 70.05, longitude: 18.95, region: 'troms', tier: 'pro', travelTimeMinutes: 40 },
  { id: 'svensby', name: 'Svensby', latitude: 69.70, longitude: 19.95, region: 'troms', tier: 'pro', travelTimeMinutes: 50 },
  { id: 'lakselvbukt', name: 'Lakselvbukt', latitude: 69.43, longitude: 19.65, region: 'troms', tier: 'pro', travelTimeMinutes: 45 },
  { id: 'skibotn', name: 'Skibotn', latitude: 69.38, longitude: 20.35, region: 'troms', tier: 'pro', travelTimeMinutes: 90 },
  { id: 'lyngen', name: 'Lyngen', latitude: 69.57, longitude: 20.30, region: 'troms', tier: 'pro', travelTimeMinutes: 90 },
  { id: 'storslett', name: 'Storslett', latitude: 69.77, longitude: 21.05, region: 'troms', tier: 'pro', travelTimeMinutes: 75 },
  { id: 'skjervoy', name: 'Skjervøy', latitude: 70.08, longitude: 21.00, region: 'troms', tier: 'pro', travelTimeMinutes: 70 },
  { id: 'bardufoss', name: 'Bardufoss', latitude: 69.06, longitude: 18.52, region: 'troms', tier: 'pro', travelTimeMinutes: 30 },
  { id: 'setermoen', name: 'Setermoen', latitude: 68.82, longitude: 18.25, region: 'troms', tier: 'pro', travelTimeMinutes: 50 },
  { id: 'senja-ytterside', name: 'Senja (ytterside)', latitude: 69.35, longitude: 16.95, region: 'troms', tier: 'pro', travelTimeMinutes: 100 },
  { id: 'senja', name: 'Senja', latitude: 69.00, longitude: 17.80, region: 'troms', tier: 'pro', travelTimeMinutes: 110 },
];

// Enterprise-only observation spots (Nordland, Finnmark, and Nordic/Arctic regions)
export const ENTERPRISE_OBSERVATION_SPOTS: ObservationSpot[] = [
  // Nordland detailed locations (enterprise only)
  { id: 'narvik', name: 'Narvik', latitude: 68.4385, longitude: 17.4272, region: 'nordland', tier: 'enterprise', travelTimeMinutes: 180 },
  { id: 'lofoten', name: 'Lofoten', latitude: 68.1543, longitude: 13.6090, region: 'nordland', tier: 'enterprise', travelTimeMinutes: 240 },
  { id: 'svolvaer', name: 'Svolvær', latitude: 68.2340, longitude: 14.5680, region: 'nordland', tier: 'enterprise', travelTimeMinutes: 230 },
  // Finnmark detailed locations (enterprise only)
  { id: 'alta', name: 'Alta', latitude: 69.9689, longitude: 23.2717, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 150 },
  { id: 'lakselv', name: 'Lakselv', latitude: 70.0500, longitude: 24.9667, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 160 },
  { id: 'karasjok', name: 'Karasjok', latitude: 69.4667, longitude: 25.5000, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 170 },
  { id: 'kautokeino', name: 'Kautokeino', latitude: 69.0167, longitude: 23.0333, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 160 },
  { id: 'nordkapp', name: 'Nordkapp', latitude: 71.1725, longitude: 25.7844, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 190 },
  { id: 'vadso', name: 'Vadsø', latitude: 70.0742, longitude: 29.7500, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 210 },
  { id: 'kirkenes', name: 'Kirkenes', latitude: 69.7267, longitude: 30.0453, region: 'finnmark', tier: 'enterprise', travelTimeMinutes: 200 },
];

// All observation spots combined
export const OBSERVATION_SPOTS: ObservationSpot[] = [
  ...FREE_OBSERVATION_SPOTS,
  ...PRO_OBSERVATION_SPOTS.filter(s => s.tier !== 'free'), // Avoid duplicate Tromsø
  ...ENTERPRISE_OBSERVATION_SPOTS,
];

// Backwards compatibility
export const PREMIUM_OBSERVATION_SPOTS = PRO_OBSERVATION_SPOTS;

export const STATUS_LABELS = {
  excellent: { no: 'Utmerket!', en: 'Excellent!' },
  good: { no: 'Gode forhold!', en: 'Good conditions!' },
  moderate: { no: 'Moderat', en: 'Moderate' },
  poor: { no: 'Dårlige forhold', en: 'Poor conditions' },
};

export const CACHE_DURATIONS = {
  NOAA_KP: 15 * 60 * 1000,      // 15 minutes
  NOAA_SOLAR: 5 * 60 * 1000,    // 5 minutes
  WEATHER: 60 * 60 * 1000,      // 1 hour
  RADAR: 5 * 60 * 1000          // 5 minutes
};
