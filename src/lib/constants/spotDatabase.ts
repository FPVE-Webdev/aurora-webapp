/**
 * Spot Database for SEO Pages
 * Comprehensive information about aurora viewing spots in Northern Norway
 */

import { ObservationSpot } from '@/types/aurora';

export interface SpotInfo extends ObservationSpot {
  slug: string;
  description: string;
  drivingTime: string;
  drivingDistance: string;
  parking: string;
  accessibility: string;
  lightPollution: 'very low' | 'low' | 'moderate' | 'high';
  facilities: string[];
  bestSeasons: string[];
  googleMapsUrl: string;
}

export const SPOT_DATABASE: Record<string, SpotInfo> = {
  'tromso': {
    id: 'tromso',
    slug: 'tromso',
    name: 'Tromsø City',
    latitude: 69.6492,
    longitude: 18.9553,
    region: 'troms',
    tier: 'free',
    description: 'The capital of Northern Norway and gateway to Arctic adventures. While city lights reduce aurora visibility, clear nights can still offer stunning displays.',
    drivingTime: 'Starting point',
    drivingDistance: '0 km',
    parking: 'Public parking available throughout the city',
    accessibility: 'Fully accessible, urban environment',
    lightPollution: 'high',
    facilities: ['Restaurants', 'Hotels', 'Shops', 'Public transport'],
    bestSeasons: ['October to March'],
    googleMapsUrl: 'https://maps.google.com/?q=69.6492,18.9553'
  },
  'telegrafbukta': {
    id: 'telegrafbukta',
    slug: 'telegrafbukta',
    name: 'Telegrafbukta',
    latitude: 69.6408,
    longitude: 18.9817,
    region: 'troms',
    tier: 'free',
    description: 'Just 30 minutes walk from Tromsø city center, this coastal spot offers darker skies with easy accessibility. Popular among locals.',
    drivingTime: '30 min walk / 10 min drive',
    drivingDistance: '3 km',
    parking: 'Limited roadside parking',
    accessibility: 'Moderate - coastal path, some uneven terrain',
    lightPollution: 'moderate',
    facilities: ['Nearby bus stop', 'Coastal path'],
    bestSeasons: ['October to March'],
    googleMapsUrl: 'https://maps.google.com/?q=69.6408,18.9817'
  },
  'ersfjordbotn': {
    id: 'ersfjordbotn',
    slug: 'ersfjordbotn',
    name: 'Ersfjordbotn',
    latitude: 69.5828,
    longitude: 19.0247,
    region: 'troms',
    tier: 'free',
    description: 'One of the most popular aurora spots near Tromsø. Surrounded by dramatic mountains and offering excellent dark skies. Easy access via Route 862.',
    drivingTime: '25 min',
    drivingDistance: '23 km',
    parking: 'Large parking area available',
    accessibility: 'Good - paved road access, flat viewing areas',
    lightPollution: 'very low',
    facilities: ['Parking area', 'Mountain backdrop'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.5828,19.0247'
  },
  'kvaloya-west': {
    id: 'kvaloya-west',
    slug: 'kvaloya-vest',
    name: 'Kvaløya Vest',
    latitude: 69.75,
    longitude: 18.65,
    region: 'troms',
    tier: 'pro',
    description: 'Western coast of Kvaløya island offers dramatic coastal landscapes and very dark skies. Multiple beach spots ideal for aurora photography.',
    drivingTime: '35-45 min',
    drivingDistance: '40 km',
    parking: 'Various beach parking areas',
    accessibility: 'Variable - some beaches easier than others',
    lightPollution: 'very low',
    facilities: ['Beaches', 'Coastal views', 'Photography spots'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.75,18.65'
  },
  'sommaroy': {
    id: 'sommaroy',
    slug: 'sommaroy',
    name: 'Sommarøy',
    latitude: 69.6377,
    longitude: 17.9689,
    region: 'troms',
    tier: 'free',
    description: 'Picturesque fishing village with white sandy beaches. One of the darkest spots easily accessible from Tromsø. Stunning 360° mountain and ocean views.',
    drivingTime: '1 hour',
    drivingDistance: '70 km',
    parking: 'Multiple parking areas near beaches',
    accessibility: 'Good - well-maintained roads, beach access',
    lightPollution: 'very low',
    facilities: ['Hotels', 'Restaurant', 'Beaches', 'Bridge views'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.6377,17.9689'
  },
  'skibotn': {
    id: 'skibotn',
    slug: 'skibotn',
    name: 'Skibotn',
    latitude: 69.3847,
    longitude: 20.2797,
    region: 'troms',
    tier: 'pro',
    description: 'Inland location southeast of Tromsø, known for clearer skies when the coast is cloudy. Gateway to Finland with excellent aurora visibility.',
    drivingTime: '1.5 hours',
    drivingDistance: '130 km',
    parking: 'Roadside parking available',
    accessibility: 'Good - E8 highway access',
    lightPollution: 'very low',
    facilities: ['Gas station', 'Small village'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.3847,20.2797'
  },
  'lyngen': {
    id: 'lyngen',
    slug: 'lyngen',
    name: 'Lyngen Alps',
    latitude: 69.5789,
    longitude: 20.2167,
    region: 'troms',
    tier: 'pro',
    description: 'Spectacular Alpine setting with some of Norway\'s highest peaks. Lyngenfjord provides stunning backdrops for aurora photography.',
    drivingTime: '1.5 hours',
    drivingDistance: '120 km',
    parking: 'Various spots along the fjord',
    accessibility: 'Moderate - mountain roads in winter',
    lightPollution: 'very low',
    facilities: ['Fjord views', 'Mountain backdrop', 'Hiking trails'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.5789,20.2167'
  },
  'senja': {
    id: 'senja',
    slug: 'senja',
    name: 'Senja',
    latitude: 69.3,
    longitude: 17.9,
    region: 'troms',
    tier: 'pro',
    description: 'Norway\'s second largest island with dramatic coastal scenery. Multiple world-class aurora viewing locations with minimal light pollution.',
    drivingTime: '2 hours',
    drivingDistance: '150 km',
    parking: 'Multiple scenic stops with parking',
    accessibility: 'Good roads, various viewing points',
    lightPollution: 'very low',
    facilities: ['Scenic routes', 'Beaches', 'Mountain views'],
    bestSeasons: ['September to April'],
    googleMapsUrl: 'https://maps.google.com/?q=69.3,17.9'
  }
};

export const SPOT_SLUGS = Object.keys(SPOT_DATABASE);

export function getSpotBySlug(slug: string): SpotInfo | null {
  return SPOT_DATABASE[slug] || null;
}

export function getAllSpots(): SpotInfo[] {
  return Object.values(SPOT_DATABASE);
}
