'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clamp01 } from '@/lib/utils/mathUtils';
import { shareStoryImage } from '@/lib/shareStory';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuroraDataContext } from '@/contexts/AuroraDataContext';
import { Tooltip } from '@/components/ui/Tooltip';
import Kart3VideoOverlay from './components/Kart3VideoOverlay';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';

type Kart3WeatherData = {
  windSpeed: number;
  windDirection: number;
  weatherType: number;
  precipitation: number;
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

export default function WelcomeView() {
  const { t } = useLanguage();

  // Use unified aurora data context
  const { currentKp, selectedSpotForecast } = useAuroraDataContext();
  const auroraProbability = selectedSpotForecast?.currentProbability || 0;
  const cloudCoverage = selectedSpotForecast?.weather.cloudCoverage || 0;
  const kpIndex = currentKp;

  const [weatherData, setWeatherData] = useState<Kart3WeatherData>({
    windSpeed: selectedSpotForecast?.weather.windSpeed || 6,
    windDirection: 270,
    weatherType: 2,
    precipitation: 0,
  });
  const [bestSpot, setBestSpot] = useState<BestSpotResponse | null>(null);
  const [bestSpotError, setBestSpotError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  // Use current probability (synchronized with all other views)
  const displayProbability = auroraProbability;

  const intensity01 = useMemo(() => {
    return clamp01((kpIndex / 9) * 0.65 + (auroraProbability / 100) * 0.55);
  }, [kpIndex, auroraProbability]);

  const cloud01 = useMemo(() => clamp01(cloudCoverage / 100), [cloudCoverage]);

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
        setBestSpotError(t('couldNotFetchBestSpot'));
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
    if (value === undefined) return { label: t('cloudUnknown'), color: 'text-white/70 bg-white/10 border-white/15' };
    if (value < 30) return { label: t('cloudLow'), color: 'text-emerald-200 bg-emerald-500/10 border-emerald-500/40' };
    if (value < 60) return { label: t('cloudMedium'), color: 'text-amber-200 bg-amber-500/10 border-amber-500/40' };
    return { label: t('cloudHigh'), color: 'text-rose-200 bg-rose-500/10 border-rose-500/40' };
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
      alert(t('couldNotShareImage'));
    } finally {
      setIsSharing(false);
    }
  };

  // Update weather data when selected spot changes
  useEffect(() => {
    if (selectedSpotForecast) {
      setWeatherData((prev) => ({
        ...prev,
        windSpeed: selectedSpotForecast.weather.windSpeed || prev.windSpeed,
        weatherType: classifyWeatherType(selectedSpotForecast.weather.cloudCoverage),
      }));
    }
  }, [selectedSpotForecast]);

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
            {/* Aurora Visibility Gauge */}
            <div className="mb-4">
              {selectedSpotForecast && (
                <ProbabilityGauge
                  probability={selectedSpotForecast.currentProbability}
                  size="md"
                  canView={selectedSpotForecast.canView}
                  nextViewableTime={selectedSpotForecast.nextViewableTime}
                  bestTimeTonight={selectedSpotForecast.bestTimeTonight}
                />
              )}
            </div>

            {/* Show me more button */}
            <div className="flex justify-center mb-4">
              <Link
                href="/home"
                className="inline-flex items-center justify-center rounded-xl bg-white text-black px-6 py-3 text-base font-semibold hover:bg-white/90 transition-colors"
              >
                Show me more!
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
                      {t('bestSpotNow')}
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
                      ? t('driveToSpot')
                          .replace('{name}', bestSpot.bestRegion.name)
                          .replace('{minutes}', String(bestSpot.bestRegion.driveMinutes))
                          .replace('{cloudCoverage}', String(bestSpot.bestRegion.cloudCoverage))
                      : t('stayInTromso')}
                  </div>
                  <div className="flex items-center gap-2">
                    {bestSpot.bestRegion && (
                      <Link
                        href={bestSpot.bestRegion.googleMapsUrl}
                        target="_blank"
                        onClick={() => console.info('[best-spot] open_maps', { spot: bestSpot.bestRegion?.name })}
                        className="inline-flex items-center justify-center text-xs font-semibold px-3 py-2 rounded-md bg-white text-black hover:bg-white/90 transition-colors"
                      >
                        {t('openInGoogleMaps')}
                      </Link>
                    )}
                    <Link
                      href="/live"
                      className="text-xs text-white/60 hover:text-white underline underline-offset-4"
                    >
                      {t('seeLiveMap')}
                    </Link>
                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className="text-xs font-semibold px-3 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      {isSharing ? t('creatingShare') : t('shareStatus')}
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


