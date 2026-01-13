'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuroraData } from '@/hooks/useAuroraData';
import { clamp01 } from '@/lib/utils/mathUtils';
import { AuroraStatusCard } from '@/components/aurora/AuroraStatusCard';
import { useWelcome } from '@/contexts/WelcomeContext';
// QuickStats removed - data now consolidated in AuroraStatusCard
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { DarkHoursInfo } from '@/components/aurora/DarkHoursInfo';
import { FunfactPanel } from '@/components/aurora/FunfactPanel';
// GoNowAlert removed - MasterStatusCard now handles GO state
import { PremiumCTA } from '@/components/shared/PremiumCTA';
import { ExtendedMetrics } from '@/components/aurora/ExtendedMetrics';
import { Loader2, MapIcon } from 'lucide-react';
import Link from 'next/link';
import { getRandomFunfacts } from '@/lib/funfactEngine';
// shouldShowGoNow removed - MasterStatusCard handles GO state
import { usePremium } from '@/contexts/PremiumContext';
import { useAppSettings } from '@/hooks/useAppSettings';
import IntroOverlay from '@/components/intro/IntroOverlay';
import { MasterStatusCard } from '@/components/aurora/MasterStatusCard';
import Kart3VideoOverlay from '@/app/kart3/components/Kart3VideoOverlay';
import { shareStoryImage } from '@/lib/shareStory';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { SightingsWidget } from '@/components/retention/SightingsWidget';
import { useLanguage } from '@/contexts/LanguageContext';

export default function HomePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { hasSeenWelcome } = useWelcome();
  const {
    currentKp,
    spotForecasts,
    selectedSpot,
    isLoading,
    lastUpdate,
    error,
    selectSpot, // Need ability to force-reset spot
    extendedMetrics
  } = useAuroraData();
  const { isPremium } = usePremium();
  const { status: masterStatus } = useMasterStatus();

  // Redirect first-time users to welcome page
  useEffect(() => {
    if (!hasSeenWelcome) {
      router.push('/welcome');
    }
  }, [hasSeenWelcome, router]);

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
  const [showIntro, setShowIntro] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Get current spot forecast - moved before useMemo
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];

  const intensity01 = useMemo(() => {
    const kpPart = (currentKp || 3) / 9;
    const probPart = currentForecast ? currentForecast.currentProbability / 100 : 0.45;
    return clamp01(kpPart * 0.5 + probPart * 0.6);
  }, [currentKp, currentForecast]);

  const cloud01 = useMemo(() => {
    const clouds = currentForecast ? currentForecast.weather.cloudCoverage : 60;
    return clamp01(clouds / 100);
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
      alert(t('couldNotShareImage'));
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">{t('loadingAuroraData')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">{t('couldNotLoadAuroraData')}</h2>
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
                {t('auroraInTromso')}
              </h1>
              {settings.showBetaBadge && (
                <span className="px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  BETA
                </span>
              )}
            </div>
            <p className="text-xl text-white/80 max-w-2xl mx-auto font-medium">
              {t('liveAuroraForecastSubtitle')}
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-6 border-t border-white/10 max-w-3xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">3</div>
                <div className="text-xs text-white/60">Regions</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">48t</div>
                <div className="text-xs text-white/60">{t('weatherForecast')}</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">Live</div>
                <div className="text-xs text-white/60">{t('realtimeData')}</div>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <div className="text-xs text-white/50">
                  {t('updated')} {new Date(lastUpdate).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>

          {/* Aurora Status Card - Primary data display (removed GoNowAlert and QuickStats to reduce duplication) */}
          <div className="max-w-4xl mx-auto mb-8">
            {currentForecast && (
              <AuroraStatusCard data={currentForecast} />
            )}
          </div>

          {/* Extended Metrics (Hidden by default for Tourist-First UX) */}
          {extendedMetrics && (
            <div className="max-w-4xl mx-auto mb-8">
              <details className="group">
                <summary className="flex items-center justify-between cursor-pointer p-4 bg-arctic-800/50 rounded-lg border border-white/10 hover:bg-arctic-800/70 transition-colors">
                  <span className="text-white/70 text-sm font-medium">{t('advancedDataForEnthusiasts')}</span>
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
            <FunfactPanel funfacts={getRandomFunfacts(3, 'en')} />
          </div>

          {/* Retention Features - Sightings */}
          <div className="max-w-4xl mx-auto mb-8">
            <SightingsWidget />
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
              {t('seeLiveMap')}
            </Link>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="ml-3 inline-flex items-center gap-2 px-8 py-4 bg-white/90 text-black font-semibold rounded-lg transition-all shadow-lg hover:bg-white disabled:opacity-60"
            >
              {isSharing ? t('creatingImage') : t('shareStatus')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
