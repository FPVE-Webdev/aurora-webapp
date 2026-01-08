/**
 * Chase Regions Configuration
 * Defines regions around Tromsø for aurora hunting when local weather is poor
 */

export type ChaseRegion = {
  id: string;
  name: string;
  coordinates: [number, number]; // [lat, lon]
  priority: number; // Lower = higher priority
};

export const CHASE_REGIONS: ChaseRegion[] = [
  {
    id: 'telegrafbukta',
    name: 'Telegrafbukta',
    coordinates: [69.6408, 18.9817],
    priority: 1,
  },
  {
    id: 'ersfjordbotn',
    name: 'Ersfjordbotn',
    coordinates: [69.5828, 19.0247],
    priority: 2,
  },
  {
    id: 'kvaloya-west',
    name: 'Kvaløya Vest',
    coordinates: [69.75, 18.65],
    priority: 3,
  },
  {
    id: 'sommaroy',
    name: 'Sommarøy',
    coordinates: [69.6377, 17.9689],
    priority: 4,
  },
  {
    id: 'skibotn',
    name: 'Skibotn',
    coordinates: [69.3847, 20.2797],
    priority: 5,
  },
];

export const MAP_CONFIG = {
  chaseMode: {
    cloudThreshold: 60, // Activate chase mode when Tromsø cloud coverage exceeds this
    minVisibilityScore: 40, // Minimum visibility score for a region to be considered "good"
  },
};
