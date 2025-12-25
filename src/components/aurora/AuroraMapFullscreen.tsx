'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';

interface SpotForecast {
  spot: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  currentProbability: number;
  kp: number;
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    symbolCode: string;
  };
}

interface AuroraPoint {
  lat: number;
  lon: number;
  probability: number;
}

interface Props {
  forecasts: SpotForecast[];
  selectedSpotId: string;
  onSelectSpot: (spotId: string) => void;
  kpIndex: number;
}

function getMarkerColor(probability: number): string {
  if (probability >= 70) return '#34f5c5'; // Primary cyan - Excellent
  if (probability >= 50) return '#22c55e'; // Green - Good
  if (probability >= 30) return '#8b5cf6'; // Purple - Moderate
  if (probability >= 15) return '#f97316'; // Orange - Fair
  return '#64748b'; // Gray - Poor
}

function calculateProbabilityFromOvalPosition(latitude: number, kpIndex: number): number {
  // Use real calculation based on latitude and KP index
  // Assume moderate cloud coverage for aurora oval positions
  const { probability } = calculateAuroraProbability({
    kpIndex,
    cloudCoverage: 30, // Assume good conditions along aurora oval
    temperature: -10, // Typical northern temperature
    latitude,
  });
  return probability;
}

export default function AuroraMapFullscreen({ forecasts, selectedSpotId, onSelectSpot, kpIndex }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const ovalLayerRef = useRef<L.LayerGroup | null>(null);
  const [auroraData, setAuroraData] = useState<AuroraPoint[]>([]);
  const [showOverlay, setShowOverlay] = useState(true);

  // Fetch aurora oval data from Tromsø.AI
  const fetchAuroraData = useCallback(async () => {
    try {
      // Use local API endpoint which will route correctly based on data mode
      const url = '/api/aurora/oval?resolution=medium';

      console.log('📡 Fetching aurora oval from:', url);

      const response = await fetch(url);

      // Check HTTP status
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check that response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Invalid content-type:', contentType);
        console.error('Response text:', text.substring(0, 200));
        throw new Error(`Invalid content-type: ${contentType}. Expected JSON.`);
      }

      const data = await response.json();

      console.log('✅ Aurora oval data loaded:', data);

      // Handle GeoJSON format from API
      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        if (feature.geometry && feature.geometry.coordinates) {
          // Convert GeoJSON polygon coordinates to AuroraPoint format
          const coordinates = feature.geometry.coordinates[0];
          const auroraPoints: AuroraPoint[] = coordinates.map(([lon, lat]: [number, number]) => ({
            lat,
            lon,
            probability: 70 // Use default or extract from properties if available
          }));
          setAuroraData(auroraPoints);
        }
      } else if (data && data.coordinates && data.coordinates.length > 0) {
        // Fallback: handle old format if API returns it
        setAuroraData(data.coordinates);
      }
    } catch (error) {
      console.error('❌ Failed to fetch aurora oval:', error);
      // Don't throw error - let component work without aurora oval
      setAuroraData([]);
    }
  }, []);

  useEffect(() => {
    fetchAuroraData();
    const interval = setInterval(fetchAuroraData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAuroraData]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    // Clean up existing map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [69.5, 20.0],
      zoom: 5,
      attributionControl: false,
      zoomControl: true
    });

    // Use dark theme map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Create aurora oval layer group
    const ovalLayer = L.layerGroup().addTo(map);
    ovalLayerRef.current = ovalLayer;

    mapInstanceRef.current = map;

    // Force resize after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render aurora oval
  useEffect(() => {
    if (!ovalLayerRef.current) return;

    // Always clear first
    ovalLayerRef.current.clearLayers();

    if (!showOverlay || auroraData.length === 0) {
      return;
    }

    // Find the aurora belt
    const beltPoints = auroraData
      .filter(p => p.probability >= 2 && p.lat >= 55 && p.lat <= 85)
      .sort((a, b) => a.lon - b.lon);

    if (beltPoints.length < 10) return;

    // Group by longitude
    const lonGroups = new Map<number, AuroraPoint[]>();
    beltPoints.forEach(p => {
      const lonBucket = Math.floor(p.lon / 10) * 10;
      const group = lonGroups.get(lonBucket) || [];
      group.push(p);
      lonGroups.set(lonBucket, group);
    });

    // Create centerline
    const centerlinePoints: L.LatLngExpression[] = [];
    const sortedLons = Array.from(lonGroups.keys()).sort((a, b) => a - b);

    sortedLons.forEach(lon => {
      const group = lonGroups.get(lon);
      if (group && group.length > 0) {
        const maxPoint = group.reduce((max, p) => p.probability > max.probability ? p : max);
        centerlinePoints.push([maxPoint.lat, maxPoint.lon]);
      }
    });

    if (centerlinePoints.length > 3) {
      // Draw aurora belt
      const belt = L.polyline(centerlinePoints, {
        color: 'rgba(34, 197, 94, 0.4)',
        weight: 80,
        opacity: 0.3,
        smoothFactor: 3,
        lineCap: 'round',
        lineJoin: 'round',
        interactive: false
      });
      ovalLayerRef.current.addLayer(belt);

      // Add centerline
      const centerline = L.polyline(centerlinePoints, {
        color: '#22c55e',
        weight: 2,
        opacity: 0.6,
        smoothFactor: 3,
        interactive: false
      });
      ovalLayerRef.current.addLayer(centerline);
    }
  }, [auroraData, showOverlay]);

  // Add markers for forecasts
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || forecasts.length === 0) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add markers for each forecast
    forecasts.forEach((forecast, index) => {
      const color = getMarkerColor(forecast.currentProbability);

      const icon = L.divIcon({
        className: 'aurora-marker',
        html: `
          <div style="
            background: ${color};
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-weight: 600;
            font-size: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            border: 2px solid white;
            white-space: nowrap;
            font-family: system-ui, sans-serif;
            cursor: pointer;
          "
          >
            ${forecast.currentProbability}%
          </div>
        `,
        iconSize: [50, 24],
        iconAnchor: [25, 12]
      });

      const marker = L.marker([forecast.spot.latitude, forecast.spot.longitude], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 4px; min-width: 120px;">
            <p style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px;">${forecast.spot.name}</p>
            <p style="font-size: 20px; font-weight: bold; margin: 0 0 4px 0; color: ${color};">${forecast.currentProbability}%</p>
            <p style="font-size: 11px; color: #666; margin: 0;">
              ☁️ ${Math.round(forecast.weather.cloudCoverage)}% • ${Math.round(forecast.weather.temperature)}°C
            </p>
          </div>
        `);

      marker.on('click', () => {
        onSelectSpot(forecast.spot.id);
      });

      markersRef.current.push(marker);
    });
  }, [forecasts, onSelectSpot]);

  // Add dynamic halo badges along aurora oval
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || auroraData.length === 0 || !showOverlay) return;

    console.log('🎯 Rendering aurora halo badges along oval');

    // Sample every 5th point from aurora oval for badges
    const badgePoints = auroraData.filter((_, i) => i % 5 === 0);

    badgePoints.forEach((point, index) => {
      const probability = calculateProbabilityFromOvalPosition(point.lat, kpIndex);
      const color = getMarkerColor(probability);

      const badge = L.divIcon({
        className: 'aurora-halo-badge',
        html: `
          <div style="
            background: ${color};
            color: white;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 1.5px solid rgba(255,255,255,0.8);
          ">
            ${Math.round(probability)}%
          </div>
        `,
        iconSize: [40, 20],
        iconAnchor: [20, 10],
      });

      const marker = L.marker([point.lat, point.lon], { icon: badge })
        .addTo(map)
        .bindPopup(`
          <div style="text-align: center; padding: 4px;">
            <p style="font-weight: bold; margin: 0 0 4px 0;">Aurora Oval</p>
            <p style="font-size: 16px; font-weight: bold; margin: 0; color: ${color};">${Math.round(probability)}%</p>
            <p style="font-size: 10px; color: #666; margin: 4px 0 0 0;">Lat: ${point.lat.toFixed(2)}°</p>
          </div>
        `);

      markersRef.current.push(marker);
    });

    console.log(`✅ Rendered ${badgePoints.length} halo badges along aurora oval`);
  }, [auroraData, showOverlay, kpIndex]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Aurora Oval Toggle */}
      <button
        onClick={() => setShowOverlay(!showOverlay)}
        className={`absolute top-2 right-2 z-[1000] px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          showOverlay
            ? 'bg-gradient-to-br from-green-400 to-green-600 text-white'
            : 'bg-black/50 text-white/70 hover:bg-black/70'
        }`}
      >
        🌌 Nordlysbelte
      </button>

      <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 text-xs z-[1000]">
        <span className="text-white/90">KP {kpIndex.toFixed(1)} • {forecasts.length} lokasjoner</span>
      </div>

      {showOverlay && auroraData.length > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1 text-xs z-[1000] flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
          <span className="text-white/90">NOAA OVATION</span>
        </div>
      )}
    </div>
  );
}
