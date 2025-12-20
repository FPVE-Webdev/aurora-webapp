/**
 * Quick Stats Component
 *
 * Compact grid displaying key aurora metrics: KP index, cloud cover, temperature, best viewing time
 */

'use client';

import { Zap, Cloud, Thermometer, Clock } from 'lucide-react';
import { getActivityLevel } from '@/lib/auroraCalculations';

interface QuickStatsProps {
  kpIndex: number;
  cloudCoverage: number;
  temperature: number;
  bestViewingTime: string | null;
}

export function QuickStats({ kpIndex, cloudCoverage, temperature, bestViewingTime }: QuickStatsProps) {
  const activity = getActivityLevel(kpIndex);

  const stats = [
    {
      icon: Zap,
      label: 'KP Index',
      value: kpIndex.toFixed(1),
      subtext: activity.emoji
    },
    {
      icon: Cloud,
      label: 'Skydekke',
      value: `${Math.round(cloudCoverage)}%`,
      subtext: cloudCoverage < 30 ? '☀️' : cloudCoverage < 70 ? '⛅' : '☁️'
    },
    {
      icon: Thermometer,
      label: 'Temperatur',
      value: `${Math.round(temperature)}°`,
      subtext: null
    },
    // Only show best viewing time if there's any chance of aurora
    ...(bestViewingTime ? [{
      icon: Clock,
      label: 'Beste tid',
      value: bestViewingTime.split('-')[0],
      subtext: ''
    }] : [])
  ];

  return (
    <div className={`grid gap-2 ${stats.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="card-aurora flex flex-col items-center py-3 px-2 animate-fade-in bg-arctic-800/50 rounded-lg border border-white/5"
        >
          <stat.icon className="w-4 h-4 text-white/60 mb-1" />
          <span className="text-xs text-white/60">{stat.label}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-display font-semibold text-white">
              {stat.value}
            </span>
            {stat.subtext && <span className="text-sm">{stat.subtext}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
