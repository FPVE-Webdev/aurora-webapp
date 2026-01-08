'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Cloud, Thermometer, Wind, ChevronDown, Play, Pause, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OBSERVATION_SPOTS, FREE_OBSERVATION_SPOTS, PREMIUM_OBSERVATION_SPOTS } from '@/lib/constants';
import { ObservationSpot } from '@/types/aurora';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';
import { usePremium } from '@/contexts/PremiumContext';

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

interface HourlyData {
  time: string;
  hour: number;
  probability: number;
  kp: number;
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    conditions: string;
  };
  visibility: string;
}

interface SpotForecast {
  spot: ObservationSpot;
  currentProbability: number;
  kp: number;
  weather: {
    cloudCoverage: number;
    temperature: number;
    windSpeed: number;
    symbolCode: string;
  };
  hourlyForecast?: HourlyData[];
}

export function AuroraLiveMap() {
  const { isPremium } = usePremium();
  const [forecasts, setForecasts] = useState<SpotForecast[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState('troms');
  const [currentKp, setCurrentKp] = useState(3);
  const [isLoading, setIsLoading] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Use appropriate spots based on premium status
  // Free: 3 regions only, Premium: all detailed spots
  const spots = isPremium ? PREMIUM_OBSERVATION_SPOTS : FREE_OBSERVATION_SPOTS;

  // Fetch aurora data from Tromsø.AI API
  const fetchAuroraData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch current aurora conditions from main API
      const response = await fetch('/api/aurora/now?lang=no');
      const data = await response.json();

      const kpIndex = scoreToKpIndex(data.score || 50);
      setCurrentKp(kpIndex);



      // Fetch weather data for visible spots in parallel
      const spotForecastsPromises = spots.map(async (spot) => {
        try {
          // Fetch hourly forecast for this spot specifically
          const hourlyRes = await fetch(`/api/aurora/hourly?hours=12&location=${spot.id}`);
          const hourlyData = hourlyRes.ok ? await hourlyRes.json() : null;
          const spotHourlyForecast = hourlyData?.hourly_forecast || [];


          // Use hourly forecast data for the current hour if available
          const currentHourData = spotHourlyForecast.find((h: HourlyData) => h.hour === new Date().getHours());

          // Fetch real weather for this spot
          const weatherRes = await fetch(`/api/weather/${spot.latitude}/${spot.longitude}`);
          const weatherData = weatherRes.ok ? await weatherRes.json() : null;

          // Use real weather if available, otherwise use location-specific fallback
          const locationSeed = spot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const cloudCoverage = weatherData?.cloudCoverage ?? (10 + (locationSeed % 60)); // 10-70%
          const temperature = weatherData?.temperature ?? (-15 + (locationSeed % 25)); // -15 to +10
          const windSpeed = weatherData?.windSpeed ?? (2 + (locationSeed % 12)); // 2-14 m/s

          // Calculate probability based on real conditions (with daylight check)
          const { probability, canView } = calculateAuroraProbability({
            kpIndex,
            cloudCoverage,
            temperature,
            latitude: spot.latitude,
            longitude: spot.longitude,
          });

          // If it's daylight, force probability to 0
          const actualProbability = canView ? probability : 0;

          // Debug logging for daylight check
          if (!canView) {
            console.log(`🌞 Daylight at ${spot.name}: probability forced to 0% (was ${probability}%)`);
          }

          return {
            spot,
            currentProbability: actualProbability,
            kp: kpIndex,
            weather: {
              cloudCoverage: Math.round(cloudCoverage),
              temperature: Math.round(temperature),
              windSpeed: Math.round(windSpeed),
              symbolCode: cloudCoverage > 50 ? 'cloudy' : 'clearsky_night'
            },
            // Add hourly forecast for animation
            hourlyForecast: spotHourlyForecast
          };
        } catch (error) {
          console.warn(`Failed to fetch weather for ${spot.name}, using fallback`);
          const locationSeed = spot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const cloudCoverage = 10 + (locationSeed % 60); // 10-70%
          const temperature = -15 + (locationSeed % 25); // -15 to +10
          const windSpeed = 2 + (locationSeed % 12); // 2-14 m/s

          const { probability, canView } = calculateAuroraProbability({
            kpIndex,
            cloudCoverage,
            temperature,
            latitude: spot.latitude,
            longitude: spot.longitude,
          });

          // If it's daylight, force probability to 0
          const actualProbability = canView ? probability : 0;

          return {
            spot,
            currentProbability: actualProbability,
            kp: kpIndex,
            weather: {
              cloudCoverage: Math.round(cloudCoverage),
              temperature: Math.round(temperature),
              windSpeed: Math.round(windSpeed),
              symbolCode: cloudCoverage > 50 ? 'cloudy' : 'clearsky_night'
            }
          };
        }
      });

      const spotForecasts = await Promise.all(spotForecastsPromises);

      setForecasts(spotForecasts);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch aurora data:', error);
      setIsLoading(false);
    }
  }, [spots]);

  useEffect(() => {
    fetchAuroraData();
    const interval = setInterval(fetchAuroraData, 30 * 60 * 1000); // Refresh every 30 min
    return () => clearInterval(interval);
  }, [fetchAuroraData]);

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

  const selectedForecast = forecasts.find(f => f.spot.id === selectedSpotId) || forecasts[0];

  const toggleAnimation = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    } else {
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
    <div className="fixed inset-0 bg-arctic-900 overflow-hidden">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
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
                        {OBSERVATION_SPOTS.map((spot) => (
                          <button
                            key={spot.id}
                            onClick={() => {
                              setSelectedSpotId(spot.id);
                              setShowLocationDropdown(false);
                            }}
                            className={cn(
                              "w-full px-3 py-2 text-left text-[13px] hover:bg-white/10 transition-colors",
                              selectedSpotId === spot.id ? "text-primary font-medium" : "text-white/80"
                            )}
                          >
                            {spot.name}
                          </button>
                        ))}
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
              forecasts={forecasts}
              selectedSpotId={selectedSpotId}
              onSelectSpot={setSelectedSpotId}
              kpIndex={currentKp}
              animationHour={animationProgress}
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
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
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
        </div>
      </div>
    </div>
  );
}
