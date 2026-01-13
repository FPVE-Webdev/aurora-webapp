'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Cloud, Thermometer, Wind, ChevronDown, Play, Pause, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePremium } from '@/contexts/PremiumContext';
import { useAuroraData } from '@/hooks/useAuroraData';
import { TierGate } from '@/components/live/TierGate';
import { hasFeature } from '@/lib/features/liveTierConfig';

const debugLive =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_DEBUG_LIVE === 'true';

// Dynamically import map to avoid SSR issues with Leaflet
const AuroraMapFullscreen = dynamic(
  () => import('@/components/aurora/AuroraMapFullscreen'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-arctic-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }
);

export function AuroraLiveMap() {
  const { subscriptionTier } = usePremium();
  
  // Use shared aurora data hook (same as /home, /forecast, /kart3)
  const {
    spotForecasts,
    currentKp,
    isLoading,
    selectedSpot,
    selectSpot
  } = useAuroraData();

  const [selectedSpotId, setSelectedSpotId] = useState(selectedSpot.id);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Sync selectedSpotId with hook's selectedSpot
  useEffect(() => {
    setSelectedSpotId(selectedSpot.id);
  }, [selectedSpot.id]);

  // Ensure the live view does not inherit the global background.png
  useEffect(() => {
    const body = typeof document !== 'undefined' ? document.body : null;
    if (!body) return;
    const prevImage = body.style.backgroundImage;
    const prevColor = body.style.backgroundColor;
    body.style.backgroundImage = 'none';
    body.style.backgroundColor = 'rgb(5,7,13)';

    return () => {
      body.style.backgroundImage = prevImage;
      body.style.backgroundColor = prevColor;
    };
  }, []);

  useEffect(() => {
    if (debugLive) {
      // #region agent log
      const first = spotForecasts?.[0];
      const firstHour = first?.hourlyForecast?.[0] as any;
      const hourlyKeys = firstHour ? Object.keys(firstHour) : [];
      console.log('[debug-live] AuroraLiveMap state', {
        spotCount: spotForecasts?.length ?? 0,
        selectedSpotId: selectedSpot?.id,
        hasFirst: !!first,
        firstHourlyKeys: hourlyKeys.slice(0, 20),
      });
      fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraLiveMap.tsx:54',message:'live map state snapshot',data:{spotCount:spotForecasts?.length??0,selectedSpotId:selectedSpot?.id,firstHourlyKeys:hourlyKeys.slice(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion
    }
  }, [spotForecasts, selectedSpot?.id]);

  // Map spotForecasts to the format expected by the map component
  const forecasts = spotForecasts
    .filter(Boolean)
    .map((sf) => {
      const cloudCoverage = sf.weather?.cloudCoverage ?? 50;
      const temperature = sf.weather?.temperature ?? 0;
      const windSpeed = sf.weather?.windSpeed ?? 0;
      const symbolCode = sf.weather?.symbolCode ?? 'cloudy';

      return {
        spot: sf.spot,
        currentProbability: sf.currentProbability ?? 0,
        kp: currentKp,
        weather: {
          cloudCoverage,
          temperature,
          windSpeed,
          symbolCode,
        },
        hourlyForecast: sf.hourlyForecast ?? [],
      };
    });

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const speed = 0.33 / 1000; // 0.33 hours per second

      setAnimationProgress((prev) => {
        const next = prev + deltaTime * speed;
        if (next >= 12) {
          return 0; // Loop back
        }
        return next;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const selectedForecast =
    forecasts.find((f) => f.spot.id === selectedSpotId) || forecasts[0];

  const canUseAnimation = hasFeature(subscriptionTier, 'animation');

  const toggleAnimation = () => {
    // Locked features are blocked by TierGate overlay, but add safeguard
    if (!canUseAnimation) return;

    if (isPlaying) {
      if (debugLive) {
        // #region agent log
        console.log('[debug-live] toggleAnimation', { next: false, prev: true, animationProgress });
        fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraLiveMap.tsx:111',message:'toggleAnimation stop',data:{animationProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
      }
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      if (debugLive) {
        // #region agent log
        console.log('[debug-live] toggleAnimation', { next: true, prev: false, animationProgress });
        fetch('http://127.0.0.1:7243/ingest/42efd832-76ad-40c5-b002-3c507686850a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/components/aurora/AuroraLiveMap.tsx:121',message:'toggleAnimation start',data:{animationProgress},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H7'})}).catch(()=>{});
        // #endregion
      }
      setIsPlaying(true);
      setAnimationProgress(0);
      lastTimeRef.current = performance.now();
    }
  };

  const getProbabilityLevel = (probability: number): 'excellent' | 'good' | 'moderate' | 'poor' => {
    if (probability >= 50) return 'excellent';
    if (probability >= 30) return 'good';
    if (probability >= 15) return 'moderate';
    return 'poor';
  };

  const level = selectedForecast ? getProbabilityLevel(selectedForecast.currentProbability) : 'poor';

  const getWeatherIcon = () => {
    if (!selectedForecast) return '☁️';
    const code = selectedForecast.weather.symbolCode.toLowerCase();
    if (code.includes('clearsky') || code.includes('fair')) return '🌅';
    if (code.includes('partlycloudy')) return '⛅';
    if (code.includes('cloudy')) return '☁️';
    if (code.includes('snow')) return '🌨️';
    if (code.includes('rain')) return '🌧️';
    return '☁️';
  };

  const getAnimationTimeLabel = () => {
    if (animationProgress === 0) return 'Nå';
    const hours = Math.floor(animationProgress);
    return `+${hours}t`;
  };

  if (isLoading && forecasts.length === 0) {
    return (
      <div className="fixed inset-0 bg-arctic-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Laster nordlysdata...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-16 bg-arctic-900 overflow-hidden">
      {/* Aurora glow effect */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative h-full w-full overflow-hidden">
        {/* Top header strip */}
        {selectedForecast && (
          <div className="absolute top-3 left-3 right-3 z-[1000]" style={{ pointerEvents: 'auto' }}>
            <div
              className="rounded-full px-4 backdrop-blur-md flex items-center gap-3"
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                height: '48px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}
            >
              {/* Location dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors"
                >
                  <span className="text-xl">{getWeatherIcon()}</span>
                  <span className="font-semibold text-[16px] max-w-[120px] truncate">
                    {selectedForecast.spot.name}
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-white/50 transition-transform",
                    showLocationDropdown && "rotate-180"
                  )} />
                </button>

                {/* Dropdown menu */}
                {showLocationDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-[999]"
                      onClick={() => setShowLocationDropdown(false)}
                    />
                    <div
                      className="absolute top-full left-0 mt-2 w-56 rounded-xl backdrop-blur-xl overflow-hidden z-[1001]"
                      style={{
                        background: 'rgba(3, 10, 24, 0.95)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div className="py-1">
                        {spotForecasts.map((sf) => (
                          <button
                            key={sf.spot.id}
                            onClick={() => {
                              setSelectedSpotId(sf.spot.id);
                              selectSpot(sf.spot);
                              setShowLocationDropdown(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-[13px] hover:bg-white/10 transition-colors",
                              selectedSpotId === sf.spot.id ? "text-primary font-medium" : "text-white/80"
                            )}
                          >
                            {sf.spot.name}
                          </button>
                        ))}
                      </div>

                      {/* Link to full forecast */}
                      <div className="border-t border-white/10 p-2">
                        <Link
                          href={`/forecast?location=${selectedSpotId}`}
                          className="flex items-center justify-between w-full px-2 py-1.5 text-[12px] text-primary hover:bg-primary/10 rounded transition-colors"
                          onClick={() => setShowLocationDropdown(false)}
                        >
                          <span>Se full 48t prognose</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-white/15" />

              {/* Weather stats */}
              <div className="flex items-center gap-2.5 text-[13px] text-white/70">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(selectedForecast.weather.cloudCoverage)}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(selectedForecast.weather.temperature)}°C</span>
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(selectedForecast.weather.windSpeed)}</span>
                </span>
              </div>

              {/* Probability chip */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-auto',
                  level === 'excellent' && 'bg-gradient-to-br from-green-400 to-green-600',
                  level === 'good' && 'bg-gradient-to-br from-purple-400 to-purple-600',
                  level === 'moderate' && 'bg-gradient-to-br from-orange-400 to-orange-600',
                  level === 'poor' && 'bg-gradient-to-br from-slate-400 to-slate-600'
                )}
              >
                <span className="text-[14px] font-bold text-white">
                  {selectedForecast.currentProbability}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Map - full screen */}
        <div className="h-full w-full">
          {forecasts.length > 0 && (
            <AuroraMapFullscreen
              forecasts={forecasts as any}
              selectedSpotId={selectedSpotId}
              onSelectSpot={setSelectedSpotId}
              kpIndex={currentKp}
              animationHour={animationProgress}
              subscriptionTier={subscriptionTier}
            />
          )}
        </div>

        {/* Floating forecast bubble */}
        <div
          className="absolute left-4 right-4 z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{
            pointerEvents: 'auto',
            bottom: '1.5rem'
          }}
        >
          <TierGate
            currentTier={subscriptionTier}
            feature="animation"
            featureTitle="Tidslinje-animasjon"
            featureDescription="Se nordlysprognoser frem i tid med interaktiv tidslinje (0-12 timer)"
            onUpgrade={() => {
              // TODO: Navigate to upgrade page
              console.log('Navigate to upgrade page');
            }}
          >
            <div
              className="rounded-2xl backdrop-blur-xl max-w-md mx-auto p-3"
              style={{
                background: level === 'excellent'
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(3,10,24,0.9) 100%)'
                  : level === 'good'
                  ? 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(3,10,24,0.9) 100%)'
                  : level === 'moderate'
                  ? 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(3,10,24,0.9) 100%)'
                  : 'linear-gradient(135deg, rgba(52,245,197,0.08) 0%, rgba(3,10,24,0.85) 100%)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)'
              }}
            >
              {/* Animation controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleAnimation}
                  disabled={!canUseAnimation}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    !canUseAnimation && 'opacity-50 cursor-not-allowed',
                    isPlaying
                      ? 'bg-primary/30 ring-2 ring-primary/50'
                      : 'bg-white/10 hover:bg-white/20'
                  )}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" />
                  ) : (
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  )}
                </button>

                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {getAnimationTimeLabel()}
                  </div>
                  <div className="text-xs text-white/60">
                    KP {currentKp.toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </TierGate>
        </div>
      </div>
    </div>
  );
}
