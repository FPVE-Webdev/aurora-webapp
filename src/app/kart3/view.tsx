'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { shareStoryImage } from '@/lib/shareStory';
import Kart3VideoOverlay from './components/Kart3VideoOverlay';

type Kart3WeatherData = {
  windSpeed: number;
  windDirection: number;
  weatherType: number;
  precipitation: number;
};

type NowResponse = {
  kp: number;
  probability: number;
  weather?: {
    cloudCoverage?: number;
    windSpeed?: number;
  };
};

type BestSpotRegion = {
  name: string;
  cloudCoverage: number;
  visibilityScore: number;
  driveMinutes: number;
  googleMapsUrl: string;
};

type BestSpotResponse = {
  tromsoCloudCoverage: number;
  shouldChase: boolean;
  bestRegion: BestSpotRegion | null;
};

function classifyWeatherType(cloudCoverage: number): number {
  // 0=clear, 1=fair, 2=cloudy, 3=rain, 4=snow, 5=fog (same convention as Kart2 shaders)
  if (cloudCoverage < 15) return 0;
  if (cloudCoverage < 40) return 1;
  return 2;
}

export default function Kart3View() {
  const [kpIndex, setKpIndex] = useState(3.2);
  const [auroraProbability, setAuroraProbability] = useState(45);
  const [cloudCoverage, setCloudCoverage] = useState(75);
  const [weatherData, setWeatherData] = useState<Kart3WeatherData>({
    windSpeed: 6,
    windDirection: 270,
    weatherType: 2,
    precipitation: 0,
  });
  const [bestSpot, setBestSpot] = useState<BestSpotResponse | null>(null);
  const [bestSpotError, setBestSpotError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const intensity01 = useMemo(() => {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    return clamp01((kpIndex / 9) * 0.65 + (auroraProbability / 100) * 0.55);
  }, [kpIndex, auroraProbability]);

  const cloud01 = useMemo(() => Math.max(0, Math.min(1, cloudCoverage / 100)), [cloudCoverage]);

  const backgroundStyle = useMemo(() => {
    // If the image is not present in `public/`, the gradient still renders.
    return {
      backgroundImage: "url('/background.png')",
      backgroundSize: 'cover',
      // Favor the “city + fjord” area (image is tall; keep the city in-frame on wide screens)
      backgroundPosition: 'center 72%',
      backgroundRepeat: 'no-repeat',
    } as const;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const fetchBestSpot = async () => {
      try {
        const res = await fetch('/api/best-spot', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as BestSpotResponse;
        if (cancelled) return;
        setBestSpot(json);
        setBestSpotError(null);
      } catch (err) {
        if (cancelled) return;
        setBestSpotError('Kunne ikke hente beste sted nå.');
      }
    };

    fetchBestSpot();
    timer = window.setInterval(fetchBestSpot, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  const cloudCategory = (value?: number) => {
    if (value === undefined) return { label: 'Ukjent', color: 'text-white/70 bg-white/10 border-white/15' };
    if (value < 30) return { label: 'Lav sky', color: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/40' };
    if (value < 60) return { label: 'Middels sky', color: 'text-amber-200 bg-amber-500/10 border-amber-500/40' };
    return { label: 'Høy sky', color: 'text-rose-200 bg-rose-500/10 border-rose-500/40' };
  };

  const handleShare = async () => {
    if (!bestSpot) return;
    try {
      setIsSharing(true);
      await shareStoryImage({
        spot: bestSpot.bestRegion?.name || 'Tromsø',
      });
      console.info('[share-story] kart3_success', { spot: bestSpot.bestRegion?.name || 'Tromsø' });
    } catch (err) {
      alert('Kunne ikke lage delingsbilde. Prøv igjen.');
    } finally {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const fetchNow = async () => {
      try {
        const res = await fetch('/api/aurora/now?lang=no', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as NowResponse;

        if (cancelled) return;

        if (typeof json.kp === 'number') setKpIndex(json.kp);
        if (typeof json.probability === 'number') setAuroraProbability(json.probability);

        const clouds = typeof json.weather?.cloudCoverage === 'number' ? json.weather.cloudCoverage : undefined;
        if (typeof clouds === 'number') {
          setCloudCoverage(clouds);
          setWeatherData((prev) => ({
            ...prev,
            weatherType: classifyWeatherType(clouds),
          }));
        }

        const windSpeed = typeof json.weather?.windSpeed === 'number' ? json.weather.windSpeed : undefined;
        if (typeof windSpeed === 'number') {
          setWeatherData((prev) => ({
            ...prev,
            windSpeed,
          }));
        }
      } catch {
        // ignore; keep last values
      }
    };

    fetchNow();
    timer = window.setInterval(fetchNow, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-black" style={backgroundStyle}>
      {/* Aurora overlay (Video-based) */}
      <div className="absolute inset-0 pointer-events-none">
        <Kart3VideoOverlay intensity01={intensity01} cloud01={cloud01} weatherEnabled />
      </div>



      {/* Minimal UI */}
      <div className="absolute inset-0 flex items-end justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-white/60">Tromsø nå</div>
                <div className="text-white text-lg font-semibold">
                  KP {kpIndex.toFixed(1)} · {Math.round(auroraProbability)}%
                </div>
              </div>
              <Link
                href="/home"
                className="inline-flex items-center justify-center rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Gå til dagens hjem
              </Link>
            </div>
            <div className="mt-3 text-[11px] text-white/55">
              Visual representation of live conditions. Not a prediction.
            </div>
            <div className="mt-3 space-y-2">
              {bestSpotError && (
                <div className="text-xs text-rose-200 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                  {bestSpotError}
                </div>
              )}
              {bestSpot && (
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white font-semibold text-sm">
                      <span className="text-lg">🔥</span>
                      Best spot nå
                    </div>
                    <div
                      className={cn(
                        'text-[11px] px-2 py-1 rounded-full border',
                        cloudCategory(bestSpot.bestRegion?.cloudCoverage || bestSpot.tromsoCloudCoverage).color
                      )}
                    >
                      {cloudCategory(bestSpot.bestRegion?.cloudCoverage || bestSpot.tromsoCloudCoverage).label}
                    </div>
                  </div>
                  <div className="text-sm text-white/85">
                    {bestSpot.bestRegion
                      ? `Kjør mot ${bestSpot.bestRegion.name} (~${bestSpot.bestRegion.driveMinutes} min). Skydekke ca ${bestSpot.bestRegion.cloudCoverage}%`
                      : 'Tromsø er det beste valget nå – bli i byen.'}
                  </div>
                  <div className="flex items-center gap-2">
                    {bestSpot.bestRegion && (
                      <Link
                        href={bestSpot.bestRegion.googleMapsUrl}
                        target="_blank"
                        onClick={() => console.info('[best-spot] open_maps', { spot: bestSpot.bestRegion?.name })}
                        className="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-md bg-white text-black hover:bg-white/90 transition-colors"
                      >
                        Åpne i Google Maps
                      </Link>
                    )}
                    <Link
                      href="/home"
                      className="text-xs text-white/60 hover:text-white underline underline-offset-4"
                    >
                      Se hele kartet i appen
                    </Link>
                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className="text-xs font-semibold px-3 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {isSharing ? 'Lager...' : 'Del status'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


