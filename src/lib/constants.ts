import { ObservationSpot } from "@/types/aurora";

// Main regional observation spots available to all users (free tier)
// These are the 2 main regions with multiple detailed spots
export const FREE_OBSERVATION_SPOTS: ObservationSpot[] = [
  { id: 'troms', name: 'Troms', latitude: 69.6492, longitude: 18.9553, region: 'troms' },
  { id: 'nordland', name: 'Nordland', latitude: 68.4385, longitude: 15.5, region: 'nordland' },
];

// Premium observation spots (detailed locations within each region)
// Coordinates slightly adjusted to prevent marker overlap on map
export const PREMIUM_OBSERVATION_SPOTS: ObservationSpot[] = [
  // Troms detailed locations - adjusted for better map visibility
  { id: 'tromso', name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, region: 'troms' },
  { id: 'sommaroy', name: 'Sommarøy', latitude: 69.58, longitude: 17.85, region: 'troms' },
  { id: 'grotfjord', name: 'Grøtfjord', latitude: 69.80, longitude: 18.45, region: 'troms' },
  { id: 'grunnfjord', name: 'Grunnfjord', latitude: 70.05, longitude: 18.95, region: 'troms' },
  { id: 'svensby', name: 'Svensby', latitude: 69.70, longitude: 19.95, region: 'troms' },
  { id: 'lakselvbukt', name: 'Lakselvbukt', latitude: 69.43, longitude: 19.65, region: 'troms' },
  { id: 'skibotn', name: 'Skibotn', latitude: 69.38, longitude: 20.35, region: 'troms' },
  { id: 'lyngen', name: 'Lyngen', latitude: 69.57, longitude: 20.30, region: 'troms' },
  { id: 'storslett', name: 'Storslett', latitude: 69.77, longitude: 21.05, region: 'troms' },
  { id: 'skjervoy', name: 'Skjervøy', latitude: 70.08, longitude: 21.00, region: 'troms' },
  { id: 'bardufoss', name: 'Bardufoss', latitude: 69.06, longitude: 18.52, region: 'troms' },
  { id: 'setermoen', name: 'Setermoen', latitude: 68.82, longitude: 18.25, region: 'troms' },
  { id: 'senja-ytterside', name: 'Senja (ytterside)', latitude: 69.35, longitude: 16.95, region: 'troms' },
  { id: 'senja', name: 'Senja', latitude: 69.00, longitude: 17.80, region: 'troms' },
  // Nordland detailed locations
  { id: 'narvik', name: 'Narvik', latitude: 68.4385, longitude: 17.4272, region: 'nordland' },
  { id: 'lofoten', name: 'Lofoten', latitude: 68.1543, longitude: 13.6090, region: 'nordland' },
  { id: 'svolvaer', name: 'Svolvær', latitude: 68.2340, longitude: 14.5680, region: 'nordland' },
  // Finnmark detailed locations
  { id: 'alta', name: 'Alta', latitude: 69.9689, longitude: 23.2717, region: 'finnmark' },
  { id: 'lakselv', name: 'Lakselv', latitude: 70.0500, longitude: 24.9667, region: 'finnmark' },
  { id: 'karasjok', name: 'Karasjok', latitude: 69.4667, longitude: 25.5000, region: 'finnmark' },
  { id: 'kautokeino', name: 'Kautokeino', latitude: 69.0167, longitude: 23.0333, region: 'finnmark' },
  { id: 'nordkapp', name: 'Nordkapp', latitude: 71.1725, longitude: 25.7844, region: 'finnmark' },
  { id: 'vadso', name: 'Vadsø', latitude: 70.0742, longitude: 29.7500, region: 'finnmark' },
  { id: 'kirkenes', name: 'Kirkenes', latitude: 69.7267, longitude: 30.0453, region: 'finnmark' },
];

// All observation spots (for premium users and backwards compatibility)
export const OBSERVATION_SPOTS: ObservationSpot[] = [
  ...FREE_OBSERVATION_SPOTS,
  ...PREMIUM_OBSERVATION_SPOTS,
];

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
