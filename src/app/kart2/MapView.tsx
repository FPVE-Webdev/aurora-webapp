'use client';

import { useEffect, useRef } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';

const mapboxgl = typeof window !== 'undefined' ? require('mapbox-gl') : null;

export default function MapView() {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapboxgl || !mapContainerRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    console.log('[MapView] Token:', token ? 'SET' : 'MISSING');

    if (!token) {
      console.error('[MapView] No Mapbox token');
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [18.95, 69.65], // Tromsø
      zoom: 6,
    });

    console.log('[MapView] Map created');

    map.on('load', () => {
      console.log('[MapView] ✅ Map loaded!');
    });

    return () => map.remove();
  }, []);

  return (
    <div className="fixed inset-0 bg-gray-900">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white/90 p-4 rounded shadow">
        <h2 className="font-bold">Nordlyskart Test</h2>
        <p className="text-sm text-gray-600">Tromsø, Norge</p>
      </div>
    </div>
  );
}
