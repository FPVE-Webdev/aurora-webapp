'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SpotInfo } from '@/lib/constants/spotDatabase';
import { MapIcon, CloudIcon, Navigation, Clock, ParkingCircle, Info, Sparkles } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

interface SpotPageViewProps {
  spot: SpotInfo;
}

interface LiveData {
  cloudCoverage: number;
  kpIndex: number;
  temperature: number;
  probability: number;
  status: 'GO' | 'WAIT' | 'NO';
}

export default function SpotPageView({ spot }: SpotPageViewProps) {
  const { isPremium } = usePremium();
  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        // Fetch weather for this spot
        const weatherRes = await fetch(`/api/weather/${spot.latitude}/${spot.longitude}`);
        const weather = weatherRes.ok ? await weatherRes.json() : null;

        // Fetch aurora data
        const auroraRes = await fetch('/api/aurora/now?lang=no');
        const aurora = auroraRes.ok ? await auroraRes.json() : null;

        if (weather && aurora) {
          const cloudCoverage = weather.cloudCoverage || 50;
          const kpIndex = aurora.kp || 3;
          const probability = aurora.probability || 50;

          let status: 'GO' | 'WAIT' | 'NO' = 'NO';
          if (probability > 60 && cloudCoverage < 40) {
            status = 'GO';
          } else if (probability > 40 || cloudCoverage < 60) {
            status = 'WAIT';
          }

          setLiveData({
            cloudCoverage,
            kpIndex,
            temperature: weather.temperature || -5,
            probability,
            status,
          });
        }
      } catch (error) {
        console.error('Failed to fetch live data for spot:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveData();
  }, [spot.latitude, spot.longitude]);

  const statusColor = {
    GO: 'bg-green-500/20 text-green-400 border-green-500/30',
    WAIT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    NO: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const statusEmoji = {
    GO: '🟢',
    WAIT: '🟡',
    NO: '🔴',
  };

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-arctic-800 to-arctic-900 border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white">
              {spot.name}
            </h1>
            <p className="text-xl text-white/70 max-w-3xl mx-auto">
              {spot.description}
            </p>

            {/* Live Status */}
            {!loading && liveData && (
              <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-lg border ${statusColor[liveData.status]}`}>
                <span className="text-3xl">{statusEmoji[liveData.status]}</span>
                <div className="text-left">
                  <div className="font-bold text-lg">Status: {liveData.status}</div>
                  <div className="text-sm opacity-80">
                    {liveData.cloudCoverage}% clouds · KP {liveData.kpIndex.toFixed(1)} · {liveData.probability}% probability
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Live Data Card */}
          <div className="bg-arctic-800/50 border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <CloudIcon className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-white">Current Conditions</h2>
            </div>

            {loading ? (
              <div className="text-white/60 py-8 text-center">Loading live data...</div>
            ) : liveData ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Cloud Coverage</span>
                  <span className="text-white font-semibold">{liveData.cloudCoverage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">KP Index</span>
                  <span className="text-white font-semibold">{liveData.kpIndex.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Temperature</span>
                  <span className="text-white font-semibold">{liveData.temperature}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Aurora Probability</span>
                  <span className="text-white font-semibold">{liveData.probability}%</span>
                </div>
              </div>
            ) : (
              <div className="text-white/60 py-8 text-center">Data temporarily unavailable</div>
            )}

            <Link
              href="/live"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-colors"
            >
              <MapIcon className="w-5 h-5" />
              View on Live Map
            </Link>
          </div>

          {/* Location Info Card */}
          <div className="bg-arctic-800/50 border border-white/10 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-white">Location Details</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Navigation className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white/70 text-sm">Driving Time from Tromsø</div>
                  <div className="text-white font-semibold">{spot.drivingTime}</div>
                  <div className="text-white/60 text-sm">{spot.drivingDistance}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <ParkingCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white/70 text-sm">Parking</div>
                  <div className="text-white">{spot.parking}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white/70 text-sm">Best Seasons</div>
                  <div className="text-white">{spot.bestSeasons.join(', ')}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-white/70 text-sm">Light Pollution</div>
                  <div className="text-white capitalize">{spot.lightPollution.replace('-', ' ')}</div>
                </div>
              </div>
            </div>

            <a
              href={spot.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors border border-white/20"
            >
              Open in Google Maps
            </a>
          </div>
        </div>

        {/* Accessibility & Facilities */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="bg-arctic-800/50 border border-white/10 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4">Accessibility</h3>
            <p className="text-white/80">{spot.accessibility}</p>
          </div>

          {spot.facilities.length > 0 && (
            <div className="bg-arctic-800/50 border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Facilities</h3>
              <ul className="space-y-2">
                {spot.facilities.map((facility, index) => (
                  <li key={index} className="text-white/80 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                    {facility}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Premium CTA */}
        {!isPremium && spot.tier !== 'free' && (
          <div className="bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-3">
              🔒 Unlock GPS Route & Full Guide
            </h3>
            <p className="text-white/80 mb-6 max-w-2xl mx-auto">
              Get turn-by-turn directions, real-time cloud gaps, and exclusive aurora photography tips for {spot.name} with Premium access.
            </p>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}

        {/* Back to Map */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white/70 hover:text-primary transition-colors"
          >
            ← Back to Aurora Forecast
          </Link>
        </div>
      </div>
    </div>
  );
}
