/**
 * Quick Stats Component
 *
 * Compact grid displaying key aurora metrics: KP index, cloud cover, temperature, best viewing time
 */

'use client';

import { Zap, Cloud, Thermometer, Clock } from 'lucide-react';
import { getActivityLevel } from '@/lib/auroraCalculations';
import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';

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
      subtext: activity.emoji,
      highlight: kpIndex >= 5,
      tooltip: (
        <div className="space-y-2">
          <p className="font-semibold text-primary">KP-indeks (0-9)</p>
          <p>Måler geomagnetisk aktivitet. Jo høyere verdi, desto større sjanse for nordlys!</p>
          <ul className="text-xs space-y-1 mt-2 border-t border-white/20 pt-2">
            <li>• KP 0-2: Lav aktivitet</li>
            <li>• KP 3-4: Moderat (synlig i nord)</li>
            <li>• KP 5-6: Høy (godt synlig)</li>
            <li>• KP 7-9: Meget høy (spektakulært!)</li>
          </ul>
        </div>
      )
    },
    {
      icon: Cloud,
      label: 'Skydekke',
      value: `${Math.round(cloudCoverage)}%`,
      subtext: cloudCoverage < 30 ? '☀️' : cloudCoverage < 70 ? '⛅' : '☁️',
      highlight: cloudCoverage < 30,
      tooltip: (
        <div className="space-y-2">
          <p className="font-semibold text-primary">Skydekke (%)</p>
          <p>Hvor mye av himmelen som er dekket av skyer. Klart vær er best!</p>
          <ul className="text-xs space-y-1 mt-2 border-t border-white/20 pt-2">
            <li>• 0-30%: Utmerket (klart)</li>
            <li>• 30-70%: Delvis skyet</li>
            <li>• 70-100%: Overskyet (vanskelig å se)</li>
          </ul>
        </div>
      )
    },
    {
      icon: Thermometer,
      label: 'Temperatur',
      value: `${Math.round(temperature)}°`,
      subtext: null,
      highlight: false,
      tooltip: "Nåværende temperatur. Kle deg varmt når du går ut for å se nordlys!"
    },
    // Only show best viewing time if there's any chance of aurora
    ...(bestViewingTime ? [{
      icon: Clock,
      label: 'Beste tid',
      value: bestViewingTime.split('-')[0],
      subtext: '⭐',
      highlight: true,
      tooltip: "Det beste tidsvinduet for å se nordlys i kveld, basert på prognosen."
    }] : [])
  ];

  return (
    <div className={`grid gap-3 ${stats.length === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "card-aurora flex flex-col items-center py-4 px-3 animate-fade-in rounded-lg border transition-all duration-300 hover:scale-105 relative",
            stat.highlight
              ? "bg-primary/10 border-primary/30 shadow-lg shadow-primary/20"
              : "bg-arctic-800/50 border-white/5"
          )}
        >
          {/* Tooltip icon in top-right corner */}
          <div className="absolute top-2 right-2">
            <Tooltip content={stat.tooltip} position="top" />
          </div>

          <stat.icon className={cn(
            "w-5 h-5 mb-2",
            stat.highlight ? "text-primary" : "text-white/60"
          )} />
          <span className="text-xs text-white/60 mb-1">{stat.label}</span>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-xl font-display font-bold",
              stat.highlight ? "text-primary" : "text-white"
            )}>
              {stat.value}
            </span>
            {stat.subtext && <span className="text-lg">{stat.subtext}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
