'use client';

import { useState, useEffect, useMemo } from 'react';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
import { useAuroraData } from '@/hooks/useAuroraData';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { AuroraStatusCard } from '@/components/aurora/AuroraStatusCard';
import { QuickStats } from '@/components/aurora/QuickStats';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { DarkHoursInfo } from '@/components/aurora/DarkHoursInfo';
import { FunfactPanel } from '@/components/aurora/FunfactPanel';
import { GoNowAlert } from '@/components/home/GoNowAlert';
import { PremiumCTA } from '@/components/shared/PremiumCTA';
import { ExtendedMetrics } from '@/components/aurora/ExtendedMetrics';
import { Loader2, MapIcon } from 'lucide-react';
import Link from 'next/link';
import { FUNFACTS } from '@/lib/funfactEngine';
import { shouldShowGoNow } from '@/lib/auroraCalculations';
import { usePremium } from '@/contexts/PremiumContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import { ExtendedMetrics as ExtendedMetricsType } from '@/types/tromsoAI';
import IntroOverlay from '@/components/intro/IntroOverlay';
import { MasterStatusCard } from '@/components/aurora/MasterStatusCard';
import Kart3VideoOverlay from '@/app/kart3/components/Kart3VideoOverlay';
import { shareStoryImage } from '@/lib/shareStory';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { SightingsWidget } from '@/components/retention/SightingsWidget';
import { AlertSettings } from '@/components/retention/AlertSettings';

export default function HomePage() {
  const {
    currentKp,
    spotForecasts,
    selectedSpot,
    isLoading,
    lastUpdate,
    error,
    selectSpot // Need ability to force-reset spot
  } = useAuroraData();
  const { isPremium } = usePremium();
  const { status: masterStatus } = useMasterStatus();
  
  // Enforce Lite Mode: Lock to Tromsø
  useEffect(() => {
    if (!isPremium && selectedSpot.id !== 'troms') {
      const tromsoArg = { id: 'troms', name: 'Tromsø', latitude: 69.6492, longitude: 18.9553, region: 'troms' }; 
      // Note: Ideal would be importing FREE_OBSERVATION_SPOTS or finding 'troms' from list, but hardcoding safe default avoids dependency cycles or extra lookups here for now.
      // Actually, let's just assume selectSpot handles the ID update, passed object needs to match shape.
      // Better: find it in spotForecasts or just construct minimal object if useAuroraData handles ID selection.
      // Simplest safe approach:
      selectSpot({ 
           id: 'troms', 
           name: 'Tromsø', 
           latitude: 69.6492, 
           longitude: 18.9553, 
           region: 'troms',
      });
    }
  }, [isPremium, selectedSpot, selectSpot]);
  const { settings } = useAppSettings();
  const [extendedMetrics, setExtendedMetrics] = useState<ExtendedMetricsType | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Get current spot forecast - moved before useMemo
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];

  const intensity01 = useMemo(() => {
    const kpPart = (currentKp || 3) / 9;
    const probPart = currentForecast ? currentForecast.currentProbability / 100 : 0.45;
    return Math.max(0, Math.min(1, kpPart * 0.5 + probPart * 0.6));
  }, [currentKp, currentForecast]);

  const cloud01 = useMemo(() => {
    const clouds = currentForecast ? currentForecast.weather.cloudCoverage : 60;
    return Math.max(0, Math.min(1, clouds / 100));
  }, [currentForecast]);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      await shareStoryImage({
        status: masterStatus,
        location: selectedSpot.name,
        spot: currentForecast?.spot.name,
      });
      console.info('[share-story] home_success', { status: masterStatus, spot: currentForecast?.spot.name });
    } catch (err) {
      alert('Kunne ikke lage delingsbilde. Prøv igjen.');
    } finally {
      setIsSharing(false);
    }
  };

  // Fetch extended metrics (Phase 2 feature)
  useEffect(() => {
    let isMounted = true;
    let controller: AbortController | null = null;

    async function fetchExtendedMetrics() {
      try {
        // Cancel any in-flight request before starting a new one.
        controller?.abort();
        controller = new AbortController();

        const response = await fetch('/api/aurora/tonight?lang=no', {
          signal: controller.signal,
        });

        if (!response.ok) return;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) return;

        const text = await response.text();
        if (!text || !text.trim()) return;

        try {
          const data = JSON.parse(text) as { extended_metrics?: ExtendedMetricsType };
          if (isMounted && data.extended_metrics) {
            setExtendedMetrics(data.extended_metrics);
          }
        } catch (parseError) {
          // Invalid JSON response - silently ignore
          if (!IS_PRODUCTION) {
            console.warn('Failed to parse extended metrics JSON:', parseError);
          }
          return;
        }
      } catch (error) {
        // Ignore expected transient failures (navigation, aborted requests, offline).
        if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Failed to fetch')) {
          return;
        }

        console.warn('Failed to fetch extended metrics');
      }
    }

    fetchExtendedMetrics();
    const interval = setInterval(fetchExtendedMetrics, 30 * 60 * 1000); // Update every 30 minutes

    return () => {
      isMounted = false;
      controller?.abort();
      clearInterval(interval);
    };
  }, []);

  // Check if we should show "Go Now" alert
  const showGoNow = currentForecast && shouldShowGoNow(currentForecast.currentProbability, selectedSpot.latitude);

  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Laster nordlysdata...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Kunne ikke laste nordlysdata</h2>
          <p className="text-white/60">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {showIntro && <IntroOverlay onClose={() => setShowIntro(false)} />}
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Kart3-inspired background - fixed */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "url('/background.png')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 72%',
              backgroundAttachment: 'fixed',
              opacity: 0.35,
            }}
          />
          <div className="absolute inset-0 pointer-events-none">
            <Kart3VideoOverlay intensity01={intensity01} cloud01={cloud01} weatherEnabled cinematic />
          </div>
        </div>
        {/* Aurora glow effect with animation - fixed */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
          <div className="absolute top-40 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Master Status - THE Decision */}
          <div className="mb-8">
            <MasterStatusCard />
          </div>

          {/* Header */}
          <div className="text-center mb-12 space-y-6">
            <div className="flex items-center justify-center gap-4">
              <h1 className="text-5xl md:text-7xl font-display font-black text-white drop-shadow-2xl">
                🌌 Nordlys i Tromsø
              </h1>
              {settings.showBetaBadge && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  BETA
                </span>
              )}
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
              Live nordlysvarsel for Nord-Norge basert på solaktivitet, værmeldinger og geografisk plassering
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">21</div>
                <div className="text-xs text-white/60">Observasjonspunkter</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">48t</div>
                <div className="text-xs text-white/60">Værprognose</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Live</div>
                <div className="text-xs text-white/60">Sanntidsdata</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-xs text-white/50">
                  Oppdatert: {new Date(lastUpdate).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Probability Gauge */}
          <div className="flex justify-center mb-8">
            {currentForecast && (
              <ProbabilityGauge
                probability={currentForecast.currentProbability}
                size="lg"
              />
            )}
          </div>

          {/* Go Now Alert */}
          {showGoNow && currentForecast && (
            <div className="max-w-4xl mx-auto mb-8">
              <GoNowAlert 
                probability={currentForecast.currentProbability} 
                locationName={selectedSpot.name} 
              />
            </div>
          )}

          {/* Aurora Status Card */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && (
              <AuroraStatusCard data={currentForecast} />
            )}
          </div>

          {/* Quick Stats */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && (
              <QuickStats
                kpIndex={currentKp}
                cloudCoverage={currentForecast.weather.cloudCoverage}
                temperature={currentForecast.weather.temperature}
                bestViewingTime={currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0
                  ? currentForecast.hourlyForecast.reduce((best, forecast) =>
                      forecast.probability > best.probability ? forecast : best
                    ).hour
                  : null
                }
              />
            )}
          </div>

          {/* Extended Metrics (Hidden by default for Tourist-First UX) */}
          {extendedMetrics && (
            <div className="max-w-4xl mx-auto mb-8">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-arctic-800/50 rounded-lg border border-white/10 hover:bg-arctic-800/70 transition-colors">
                  <span className="text-white/70 text-sm font-medium">📊 Avanserte data (for entusiaster)</span>
                  <span className="text-white/50 text-xs group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="mt-2">
                  <ExtendedMetrics data={extendedMetrics} lang="no" />
                </div>
              </details>
            </div>
          )}

          {/* Hourly Forecast */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 && (
              <HourlyForecast
                forecasts={isPremium ? currentForecast.hourlyForecast : currentForecast.hourlyForecast.slice(0, 4)}
                locationName={currentForecast.spot.name}
              />
            )}
          </div>

          {/* Two-column layout for Dark Hours and Fun Facts */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-8">
            {/* Dark Hours Info */}
            {currentForecast && (
              <DarkHoursInfo
                latitude={currentForecast.spot.latitude}
                locationName={currentForecast.spot.name}
              />
            )}

            {/* Fun Facts */}
            <FunfactPanel funfacts={FUNFACTS.slice(0, 3)} />
          </div>

          {/* Retention Features - Sightings & Alerts */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 mb-8">
            <SightingsWidget />
            <AlertSettings />
          </div>

          {/* Premium CTA (only for free users) */}
          {!isPremium && (
            <div className="max-w-4xl mx-auto mb-8">
              <PremiumCTA />
            </div>
          )}

          {/* CTA to Live Map */}
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/live"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all shadow-lg hover:shadow-primary/50"
            >
              <MapIcon className="w-5 h-5" />
              Se live kart
            </Link>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="ml-3 inline-flex items-center gap-2 px-8 py-4 bg-white/90 text-black font-semibold rounded-lg transition-all shadow-lg hover:bg-white disabled:opacity-60"
            >
              {isSharing ? 'Lager bilde...' : 'Del status'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
