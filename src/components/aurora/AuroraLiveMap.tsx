'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Cloud, Thermometer, Wind, ChevronDown, Play, Pause, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePremium } from '@/contexts/PremiumContext';
import { useAuroraData } from '@/hooks/useAuroraData';
import { useSiteAIDecision } from '@/hooks/useSiteAIDecision';
import { TierGate } from '@/components/live/TierGate';
import { hasFeature, filterSpotsByTier } from '@/lib/features/liveTierConfig';
import { navigateToUpgrade } from '@/lib/utils/upgradeHandler';
import { MapScrubber } from '@/components/map/MapScrubber';
import { LiveLoadingSkeleton } from '@/components/aurora/LiveLoadingSkeleton';
import { interpretSiteAIForLive } from '@/lib/liveAdapter';

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

  // Initialize state first
  const [selectedSpotId, setSelectedSpotId] = useState(selectedSpot?.id || '');

  // Get hourly forecasts from selected spot for Site-AI decision
  // Safe check: ensure spotForecasts is populated before searching
  const selectedForecast = spotForecasts.length > 0 && selectedSpotId
    ? spotForecasts.find((sf) => sf.spot.id === selectedSpotId)
    : null;
  const hourlyForecasts = selectedForecast?.hourlyForecast || null;

  // Fetch Site-AI decision for /live guidance
  // All decision logic flows from here (no independent thresholds in this component)
  // KP trend is auto-detected from hourly forecast data
  const { decision: siteAIDecision, isLoading: isSiteAILoading } = useSiteAIDecision(
    hourlyForecasts,
    currentKp
  );
  const liveAdapterOutput = siteAIDecision ? interpretSiteAIForLive(siteAIDecision) : null;
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [cloudOverlayReady, setCloudOverlayReady] = useState(false);

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

    // Hide Mapbox attribution to prevent overlap with floating controls
    const hideMapboxAttribution = () => {
      const mapboxBottomLeft = document.querySelector('.mapboxgl-ctrl-bottom-left') as HTMLElement;
      const mapboxBottomRight = document.querySelector('.mapboxgl-ctrl-bottom-right') as HTMLElement;
      if (mapboxBottomLeft) mapboxBottomLeft.style.display = 'none';
      if (mapboxBottomRight) mapboxBottomRight.style.display = 'none';
    };

    // Initial hide
    hideMapboxAttribution();

    // Set up interval to hide attribution if it appears later
    const interval = setInterval(hideMapboxAttribution, 500);

    return () => {
      body.style.backgroundImage = prevImage;
      body.style.backgroundColor = prevColor;
      clearInterval(interval);
      const mapboxBottomLeft = document.querySelector('.mapboxgl-ctrl-bottom-left') as HTMLElement;
      const mapboxBottomRight = document.querySelector('.mapboxgl-ctrl-bottom-right') as HTMLElement;
      if (mapboxBottomLeft) mapboxBottomLeft.style.display = '';
      if (mapboxBottomRight) mapboxBottomRight.style.display = '';
    };
  }, []);

  useEffect(() => {
    if (debugLive) {
      const first = spotForecasts?.[0];
      const firstHour = first?.hourlyForecast?.[0] as any;
      const hourlyKeys = firstHour ? Object.keys(firstHour) : [];
      console.log('[debug-live] AuroraLiveMap state', {
        spotCount: spotForecasts?.length ?? 0,
        selectedSpotId: selectedSpot?.id,
        hasFirst: !!first,
        firstHourlyKeys: hourlyKeys.slice(0, 20),
      });
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

      // Always use global KP - KP is a planetary index, not location-specific
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

  const canUseAnimation = hasFeature(subscriptionTier, 'animation');

  // Filter spots based on tier (free users only see Tromsø area)
  const allowedSpots = filterSpotsByTier(spotForecasts, subscriptionTier);

  const toggleAnimation = () => {
    // Locked features are blocked by TierGate overlay, but add safeguard
    if (!canUseAnimation) return;

    if (isPlaying) {
      if (debugLive) {
        console.log('[debug-live] toggleAnimation', { next: false, prev: true, animationProgress });
      }
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
      if (debugLive) {
        console.log('[debug-live] toggleAnimation', { next: true, prev: false, animationProgress });
      }
      setIsPlaying(true);
      setAnimationProgress(0);
      lastTimeRef.current = performance.now();
    }
  };

  const stepBackward = () => {
    if (!canUseAnimation) return;
    setAnimationProgress((prev) => Math.max(0, prev - 1));
    stopAnimation();
  };

  const stepForward = () => {
    if (!canUseAnimation) return;
    setAnimationProgress((prev) => Math.min(12, prev + 1));
    stopAnimation();
  };

  const stopAnimation = () => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const getKpForHour = useCallback((hour: number) => {
    return currentKp; // Global KP is same for all hours
  }, [currentKp]);

  // Extract hourly weather for timeline from selected spot
  const timelineWeather = useMemo(() => {
    if (debugLive) {
      console.log('[debug-live] timelineWeather useMemo', {
        hasSelectedForecast: !!selectedForecast,
        hasHourlyForecast: !!selectedForecast?.hourlyForecast,
        hourlyForecastLength: selectedForecast?.hourlyForecast?.length,
        firstHour: selectedForecast?.hourlyForecast?.[0]
      });
    }

    if (!selectedForecast?.hourlyForecast) return [];

    const mapped = selectedForecast.hourlyForecast.map(hf => {
      // Parse hour from "HH:00" format to number (e.g., "15:00" → 15)
      const hourNum = parseInt(hf.hour.split(':')[0], 10);

      return {
        hour: hourNum,
        symbolCode: hf.symbolCode || 'cloudy',
        temperature: hf.temperature || 0,
        cloudCoverage: hf.cloudCoverage || 50,
      };
    });

    if (debugLive) {
      console.log('[debug-live] timelineWeather mapped result', {
        length: mapped.length,
        first3: mapped.slice(0, 3)
      });
    }

    return mapped;
  }, [selectedForecast]);

  // All decisions from Site-AI, no logic here
  // liveAdapterOutput interprets SiteAIDecision for immediate actionability

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

  // Get weather data for current animation hour
  const getWeatherForHour = (hourProgress: number) => {
    if (!selectedForecast?.hourlyForecast || selectedForecast.hourlyForecast.length === 0) {
      return selectedForecast?.weather || { cloudCoverage: 50, temperature: 0, windSpeed: 0, symbolCode: 'cloudy' };
    }

    const hourIndex = Math.floor(hourProgress);
    const hourData = selectedForecast.hourlyForecast[hourIndex];

    if (!hourData) {
      return selectedForecast.weather;
    }

    // Extract weather from hourly data, handling nested structure
    const hd: any = hourData;
    return {
      cloudCoverage: hd.cloudCoverage ?? hd.weather?.cloudCoverage ?? selectedForecast.weather.cloudCoverage ?? 50,
      temperature: hd.temperature ?? hd.weather?.temperature ?? selectedForecast.weather.temperature ?? 0,
      windSpeed: hd.windSpeed ?? hd.weather?.windSpeed ?? selectedForecast.weather.windSpeed ?? 0,
      symbolCode: hd.symbolCode ?? hd.weather?.symbolCode ?? selectedForecast.weather.symbolCode ?? 'cloudy',
    };
  };

  const animationWeather = useMemo(
    () => getWeatherForHour(animationProgress),
    [animationProgress, selectedForecast]
  );

  const showLoadingOverlay = (isLoading && forecasts.length === 0) || !cloudOverlayReady;

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
                        {allowedSpots.map((sf) => (
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

              {/* Weather stats - dynamically update based on animation progress */}
              <div className="flex items-center gap-2.5 text-[13px] text-white/70">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(animationWeather.cloudCoverage)}%</span>
                </span>
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(animationWeather.temperature)}°C</span>
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5" />
                  <span className="font-medium text-[15px]">{Math.round(animationWeather.windSpeed)}</span>
                </span>
              </div>

              {/* Confidence chip from Site-AI decision */}
              {liveAdapterOutput && (
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-auto',
                    liveAdapterOutput.adviceLevel === 'go' && 'bg-gradient-to-br from-green-400 to-green-600',
                    liveAdapterOutput.adviceLevel === 'not_worth_it' && 'bg-gradient-to-br from-slate-400 to-slate-600'
                  )}
                >
                  <span className="text-[14px] font-bold text-white">
                    {Math.round(liveAdapterOutput.confidence)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Map - full screen */}
        <div className="h-full w-full">
          <AuroraMapFullscreen
            forecasts={forecasts as any}
            selectedSpotId={selectedSpotId}
            onSelectSpot={setSelectedSpotId}
            kpIndex={currentKp}
            animationHour={animationProgress}
            subscriptionTier={subscriptionTier}
            onCloudsReady={() => setCloudOverlayReady(true)}
          />
        </div>

        {showLoadingOverlay && <LiveLoadingSkeleton />}

        {/* Timeline Scrubber with weather icons */}
        <div
          className="absolute left-0 right-0 z-[1000] animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{
            pointerEvents: 'auto',
            bottom: '1rem'
          }}
        >
          <TierGate
            currentTier={subscriptionTier}
            feature="animation"
            featureTitle="Tidslinje-animasjon"
            featureDescription="Se nordlysprognoser frem i tid med interaktiv tidslinje (0-12 timer) og værikon per time"
            onUpgrade={() => {
              navigateToUpgrade({
                from: subscriptionTier,
                feature: 'animation',
                source: 'tier-gate',
              });
            }}
          >
            <MapScrubber
              isPlaying={isPlaying}
              animationProgress={animationProgress}
              animationHour={animationProgress}
              maxHours={12}
              setAnimationProgress={setAnimationProgress}
              toggleAnimation={toggleAnimation}
              stepBackward={stepBackward}
              stepForward={stepForward}
              stopAnimation={stopAnimation}
              getAnimationTimeLabel={getAnimationTimeLabel}
              getKpForHour={getKpForHour}
              hourlyWeather={timelineWeather}
            />
          </TierGate>
        </div>
      </div>
    </div>
  );
}
