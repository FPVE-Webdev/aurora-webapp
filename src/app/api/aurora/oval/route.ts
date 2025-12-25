/**
 * Aurora API - Aurora Oval Endpoint
 * REAL NOAA aurora oval data for map visualization
 * NO MOCK DATA in production
 */

import { NextResponse } from 'next/server';
import { fetchAuroraOval, fetchCurrentKp } from '@/lib/fetchers/noaa';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (live data)

let cache: { data: any; timestamp: number } | null = null;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resolution = searchParams.get('resolution') || 'medium';

  // Check cache
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    return NextResponse.json({
      ...cache.data,
      meta: {
        cached: true,
        cache_age: Math.floor((Date.now() - cache.timestamp) / 1000)
      }
    });
  }

  try {
    // Fetch real NOAA Ovation aurora oval data
    const [ovalData, currentKp] = await Promise.all([
      fetchAuroraOval(),
      fetchCurrentKp(),
    ]);

    // Filter coordinates based on resolution
    const step = resolution === 'high' ? 1 : resolution === 'low' ? 4 : 2;
    const filteredCoords = ovalData.coordinates.filter((_, i) => i % step === 0);

    // Convert NOAA coordinates to GeoJSON polygon
    // Group by latitude bands to create aurora oval ring
    const latBands: { [key: number]: typeof filteredCoords } = {};

    filteredCoords.forEach((coord) => {
      // Coord format: [lon, lat, aurora]
      const [lon, lat, aurora] = coord;
      // Aurora visibility threshold: only include points with significant aurora
      if (aurora >= 10) {
        // 10% threshold
        const latBand = Math.round(lat / 2) * 2; // Group by 2-degree bands
        if (!latBands[latBand]) {
          latBands[latBand] = [];
        }
        latBands[latBand].push(coord);
      }
    });

    // Create oval polygon from lat bands (simplified oval ring)
    const ovalPoints: [number, number][] = [];

    // Sort bands from north to south
    const sortedBands = Object.keys(latBands)
      .map(Number)
      .sort((a, b) => b - a);

    if (sortedBands.length > 0) {
      // Northern arc (west to east)
      const northBand = latBands[sortedBands[0]];
      northBand
        .sort((a, b) => a[0] - b[0]) // sort by lon
        .forEach((c) => ovalPoints.push([c[0], c[1]])); // [lon, lat]

      // Southern arc (east to west) - close the oval
      if (sortedBands.length > 1) {
        const southBand = latBands[sortedBands[sortedBands.length - 1]];
        southBand
          .sort((a, b) => b[0] - a[0]) // sort by lon reverse
          .forEach((c) => ovalPoints.push([c[0], c[1]])); // [lon, lat]
      }

      // Close the polygon
      if (ovalPoints.length > 0) {
        ovalPoints.push(ovalPoints[0]);
      }
    }

    // Determine intensity based on KP
    const intensity = currentKp >= 7 ? 'high' : currentKp >= 5 ? 'moderate' : 'low';

    const response = {
      status: 'success',
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            name: 'Aurora Oval',
            kp: Math.round(currentKp * 10) / 10,
            intensity,
            timestamp: ovalData['Forecast Time'] || new Date().toISOString(),
            observation_time: ovalData['Observation Time'],
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ovalPoints],
          },
        },
      ],
      current_kp: Math.round(currentKp * 10) / 10,
      forecast_time: ovalData['Forecast Time'] || new Date().toISOString(),
      observation_time: ovalData['Observation Time'],
      coordinate_count: filteredCoords.length,
    };

    cache = {
      data: response,
      timestamp: Date.now()
    };

    console.log(`✅ Real NOAA aurora oval: KP ${currentKp.toFixed(1)}, ${filteredCoords.length} coords`);

    return NextResponse.json({
      ...response,
      meta: {
        cached: false,
        source: 'NOAA SWPC Ovation Model',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Failed to fetch NOAA aurora oval:', error);

    // CRITICAL: In production, return error instead of mock data
    return NextResponse.json(
      {
        error: 'Aurora oval data temporarily unavailable',
        message: error instanceof Error ? error.message : 'Unknown error',
        retry_after: 60,
      },
      {
        status: 503,
        headers: {
          'Retry-After': '60',
        },
      }
    );
  }
}
