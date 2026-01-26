'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { Cloud, Wind, Thermometer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConditionsSummaryRowProps {
  kpIndex: number;
  cloudCover: number;
  temperature: number;
  windSpeed: number;
  className?: string;
}

export function ConditionsSummaryRow({
  kpIndex,
  cloudCover,
  temperature,
  windSpeed,
  className
}: ConditionsSummaryRowProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        'card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4',
        className
      )}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KP Index */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Zap className="w-4 h-4" />
            <span>{t('kpIndex')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{kpIndex.toFixed(1)}</div>
        </div>

        {/* Cloud Cover */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Cloud className="w-4 h-4" />
            <span>{t('cloudCover')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{Math.round(cloudCover)}%</div>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Thermometer className="w-4 h-4" />
            <span>{t('temperature')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{Math.round(temperature)}°C</div>
        </div>

        {/* Wind Speed */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-white/60 text-sm">
            <Wind className="w-4 h-4" />
            <span>{t('windSpeed')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{Math.round(windSpeed)} m/s</div>
        </div>
      </div>
    </div>
  );
}
