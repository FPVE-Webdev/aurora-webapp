/**
 * Regional Definitions
 * Groups observation spots into regions for free tier users
 */

import { Region } from '@/types/regions';

export const REGIONS: Record<string, Region> = {
  nordland: {
    id: 'nordland',
    name: 'Nordland',
    center: {
      lat: 68.2,
      lng: 15.5
    },
    bounds: {
      north: 69.0,
      south: 67.0,
      east: 18.0,
      west: 11.0
    },
    spots: ['nordland', 'narvik', 'lofoten', 'svolvaer'],
    description: 'Lofoten og Narvik-regionen',
    isPremium: false
  },
  troms: {
    id: 'troms',
    name: 'Troms',
    center: {
      lat: 69.65,
      lng: 18.96
    },
    bounds: {
      north: 70.3,
      south: 68.8,
      east: 22.0,
      west: 16.5
    },
    spots: [
      'troms',
      'tromso',
      'sommaroy',
      'grotfjord',
      'grunnfjord',
      'svensby',
      'lakselvbukt',
      'skibotn',
      'lyngen',
      'storslett',
      'skjervoy',
      'bardufoss',
      'setermoen',
      'senja-ytterside',
      'senja'
    ],
    description: 'Tromsø og omegn',
    isPremium: false
  },
  finnmark: {
    id: 'finnmark',
    name: 'Finnmark',
    center: {
      lat: 70.0,
      lng: 26.0
    },
    bounds: {
      north: 71.5,
      south: 69.0,
      east: 31.0,
      west: 22.5
    },
    spots: [
      'finnmark', // Region-level spot for free users
      'alta',
      'lakselv',
      'karasjok',
      'kautokeino',
      'nordkapp',
      'vadso',
      'kirkenes'
    ],
    description: 'Finnmark og Nordkapp',
    isPremium: false
  }
};

export const REGION_ORDER = ['nordland', 'troms', 'finnmark'];

/**
 * Get Norway-wide map bounds that include all regions
 */
export function getNorwayBounds() {
  return {
    north: 71.5,
    south: 67.0,
    east: 31.0,
    west: 11.0
  };
}

/**
 * Find which region a spot belongs to
 */
export function getSpotRegion(spotId: string): Region | null {
  return Object.values(REGIONS).find(region =>
    region.spots.includes(spotId)
  ) || null;
}
