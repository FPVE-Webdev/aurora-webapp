/**
 * Aurora Status Card Component
 *
 * Main display card showing aurora probability, KP index, cloud cover, temperature
 * Includes dynamic gradient glow based on probability level
 */

'use client';

import { Zap, Cloud, Thermometer, Clock } from 'lucide-react';
import { SpotForecast } from '@/types/aurora';
import {
  auroraGlows,
  auroraTiming,
  auroraShadows,
  auroraSpacing
} from '@/lib/auroraTheme';

interface AuroraStatusCardProps {
  data: SpotForecast;
}

export function AuroraStatusCard({ data }: AuroraStatusCardProps) {
  const { currentProbability, weather, bestViewingTime } = data;
  const kpIndex = data.hourlyForecast[0]?.kpIndex || 3;

  const getProbabilityColor = (probability: number): string => {
    if (probability >= 70) return 'text-green-500';
    if (probability >= 50) return 'text-purple-400';
    if (probability >= 30) return 'text-orange-500';
    return 'text-slate-400';
  };

  const getProbabilityLabel = (probability: number): string => {
    if (probability >= 70) return 'Utmerket';
    if (probability >= 50) return 'Gode forhold';
    if (probability >= 30) return 'Moderate';
    return 'Dårlige forhold';
  };

  const getProbabilityEmoji = (probability: number): string => {
    if (probability >= 70) return '🌟';
    if (probability >= 50) return '🟢';
    if (probability >= 30) return '🟡';
    return '❄️';
  };

  // Dynamic glow strength based on probability
  const glowStrength =
    currentProbability >= 80 ? auroraGlows.strong :
    currentProbability >= 60 ? auroraGlows.medium :
    auroraGlows.soft;

  // Dynamic gradient based on probability
  const getGradient = (probability: number): string => {
    if (probability >= 80) {
      return "linear-gradient(160deg, #34f5c5 0%, #3a86ff 70%)";
    } else if (probability >= 60) {
      return "linear-gradient(160deg, rgba(52,245,197,0.4), rgba(58,134,255,0.35))";
    } else if (probability >= 40) {
      return "linear-gradient(160deg, rgba(58,134,255,0.25), rgba(157,78,221,0.25))";
    } else {
      return "linear-gradient(160deg, #0a0f1f 0%, #101c34 70%)";
    }
  };

  return (
    <div
      className="relative rounded-3xl transition-all"
      style={{
        boxShadow: `${glowStrength}, ${auroraShadows.card}`,
        animation: `auroraPulse ${auroraTiming.pulse} infinite`,
      }}
    >
      <div
        className="card-aurora animate-fade-in rounded-3xl"
        style={{
          padding: auroraSpacing.normal,
          background: getGradient(currentProbability),
          transition: "background 1.8s ease-in-out",
        }}
      >
        {/* Main probability display */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-6 h-6 text-primary animate-pulse" />
            <h2 className="text-lg font-display font-semibold text-white">Nordlyssannsynlighet</h2>
          </div>

          {/* Emoji Indicator */}
          <div className="text-5xl mb-2 animate-bounce" style={{ animationDuration: '2s' }}>
            {getProbabilityEmoji(currentProbability)}
          </div>

          <div className={`text-7xl font-display font-black ${getProbabilityColor(currentProbability)} mb-2`}>
            {currentProbability}%
          </div>
          <p className="text-base font-semibold text-white/90 bg-white/10 px-4 py-2 rounded-full inline-block">
            {getProbabilityLabel(currentProbability)} i kveld
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div className="flex flex-col items-center">
            <Zap className="w-5 h-5 text-white/60 mb-1" />
            <span className="text-xs text-white/60">KP Index</span>
            <span className="text-xl font-display font-semibold text-white">
              {kpIndex.toFixed(1)}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Cloud className="w-5 h-5 text-white/60 mb-1" />
            <span className="text-xs text-white/60">Skydekke</span>
            <span className="text-xl font-display font-semibold text-white">
              {weather.cloudCoverage}%
            </span>
          </div>

          <div className="flex flex-col items-center">
            <Thermometer className="w-5 h-5 text-white/60 mb-1" />
            <span className="text-xs text-white/60">Temperatur</span>
            <span className="text-xl font-display font-semibold text-white">
              {weather.temperature}°
            </span>
          </div>
        </div>

        {/* Best viewing time */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-sm text-white/70">Beste tid:</span>
          <span className="text-sm font-semibold text-white">{bestViewingTime}</span>
        </div>
      </div>
    </div>
  );
}
