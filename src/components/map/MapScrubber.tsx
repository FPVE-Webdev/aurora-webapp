/**
 * Map Scrubber Component
 *
 * Timeline control for 12-hour aurora animation
 * Includes play/pause, step controls, and hour markers
 */

'use client';

import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

/**
 * Map symbolCode from Met.no to weather emoji icon
 */
function getWeatherIcon(symbolCode: string): string {
  const code = symbolCode?.toLowerCase() || '';
  if (code.includes('clearsky') || code.includes('fair')) return '☀️';
  if (code.includes('partlycloudy')) return '⛅';
  if (code.includes('cloudy')) return '☁️';
  if (code.includes('snow')) return '❄️';
  if (code.includes('sleet')) return '🌨️';
  if (code.includes('rain')) return '🌧️';
  if (code.includes('fog')) return '🌫️';
  return '☁️'; // Default to cloudy
}

interface MapScrubberProps {
  isPlaying: boolean;
  animationProgress: number;
  animationHour: number;
  maxHours: number;
  setAnimationProgress: (value: number) => void;
  toggleAnimation: () => void;
  stepBackward: () => void;
  stepForward: () => void;
  stopAnimation: () => void;
  getAnimationTimeLabel: () => string;
  getKpForHour: (hour: number) => number;
  hourlyWeather?: Array<{
    hour: number;
    symbolCode: string;
    temperature: number;
    cloudCoverage: number;
  }>;
}

export function MapScrubber({
  isPlaying,
  animationProgress,
  animationHour,
  maxHours,
  setAnimationProgress,
  toggleAnimation,
  stepBackward,
  stepForward,
  stopAnimation,
  getAnimationTimeLabel,
  getKpForHour,
  hourlyWeather
}: MapScrubberProps) {
  return (
    <div className="px-4 max-w-md mx-auto mt-[20px] mb-[12px]">
      <div
        className="backdrop-blur-sm rounded-lg p-1.5"
        style={{
          background: 'rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Top row: Play controls and info */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            {/* Step backward */}
            <button
              onClick={stepBackward}
              disabled={animationHour === 0}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/10',
                animationHour === 0 ? 'opacity-40' : 'hover:bg-white/20'
              )}
            >
              <SkipBack className="w-3.5 h-3.5 text-white" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={toggleAnimation}
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                isPlaying
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-primary text-white hover:opacity-90'
              )}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Step forward */}
            <button
              onClick={stepForward}
              disabled={animationHour === maxHours}
              className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/10',
                animationHour === maxHours ? 'opacity-40' : 'hover:bg-white/20'
              )}
            >
              <SkipForward className="w-3.5 h-3.5 text-white" />
            </button>

            <div className="text-xs ml-0.5">
              <div className="font-medium text-white flex items-center gap-1.5">
                {hourlyWeather && (
                  <span className="text-sm">
                    {getWeatherIcon(hourlyWeather[Math.floor(animationProgress)]?.symbolCode || '')}
                  </span>
                )}
                <span className="text-[11px]">12t</span>
              </div>
              <div className="text-[10px] text-white/60 flex items-center gap-1.5">
                <span>{getAnimationTimeLabel()}</span>
                <span className={cn(
                  "font-medium text-primary",
                  isPlaying && "animate-pulse"
                )}>
                  Kp {getKpForHour(animationProgress).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Slider row */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/60 w-6">Nå</span>
          <Slider
            value={[animationProgress]}
            min={0}
            max={maxHours}
            step={0.1}
            onValueChange={(value) => {
              setAnimationProgress(value[0]);
              if (isPlaying) stopAnimation();
            }}
            className="flex-1"
          />
          <span className="text-[10px] text-white/60 w-8 text-right">+{maxHours}t</span>
        </div>

        {/* Hour markers below slider with weather icons */}
        <div className="flex justify-between mt-1.5 px-7">
          {[0, 3, 6, 9, 12].map((hour) => {
            const weatherData = hourlyWeather?.find(h => h.hour === hour);
            const icon = weatherData ? getWeatherIcon(weatherData.symbolCode) : null;

            return (
              <button
                key={hour}
                onClick={() => {
                  setAnimationProgress(hour);
                  if (isPlaying) stopAnimation();
                }}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1 py-0.5 rounded transition-all',
                  'hover:bg-white/10',
                  animationHour === hour && 'bg-white/5'
                )}
              >
                {icon && <span className="text-xs leading-none">{icon}</span>}
                <span className={cn(
                  'text-[9px] leading-tight',
                  animationHour === hour
                    ? 'text-primary font-medium'
                    : 'text-white/40'
                )}>
                  {hour === 0 ? 'Nå' : `+${hour}t`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Probability Legend */}
      <div className="flex items-center justify-center gap-3 mt-2 px-2">
        <div className="flex items-center gap-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500"></div>
          <span className="text-[8px] text-white/50">80+</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-500"></div>
          <span className="text-[8px] text-white/50">60</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-orange-500"></div>
          <span className="text-[8px] text-white/50">40</span>
        </div>
        <div className="flex items-center gap-0.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-slate-500"></div>
          <span className="text-[8px] text-white/50">&lt;40%</span>
        </div>
      </div>
    </div>
  );
}
