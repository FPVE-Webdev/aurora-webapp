'use client';

import { RegionalForecast } from '@/types/regions';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { Cloud, Thermometer, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProbabilityLevel } from '@/lib/calculations/regionalForecast';

interface RegionalViewProps {
  regionalForecasts: RegionalForecast[];
  onSelectRegion: (regionId: string) => void;
}

export function RegionalView({ regionalForecasts, onSelectRegion }: RegionalViewProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-bold text-white mb-2">
          Velg region
        </h2>
        <p className="text-white/60">
          Klikk på en region for å se detaljerte prognoser
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {regionalForecasts.map((rf) => {
          const level = getProbabilityLevel(rf.maxProbability);

          return (
            <button
              key={rf.region.id}
              onClick={() => onSelectRegion(rf.region.id)}
              className={cn(
                'card-aurora rounded-2xl p-6 transition-all duration-300',
                'hover:scale-105 hover:shadow-2xl',
                'bg-arctic-800/50 border border-white/5',
                'hover:border-white/20',
                'group relative overflow-hidden'
              )}
            >
              {/* Aurora glow effect based on probability */}
              <div
                className={cn(
                  'absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-2xl',
                  level === 'excellent' && 'bg-green-400',
                  level === 'good' && 'bg-purple-400',
                  level === 'moderate' && 'bg-orange-400',
                  level === 'poor' && 'bg-slate-400'
                )}
              />

              <div className="relative z-10">
                {/* Region name */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">
                    {rf.region.name}
                  </h3>
                  <MapPin className="w-5 h-5 text-primary" />
                </div>

                {/* Probability gauge */}
                <div className="flex justify-center my-6">
                  <ProbabilityGauge
                    probability={rf.maxProbability}
                    size="lg"
                  />
                </div>

                {/* Best spot info */}
                {rf.bestSpot && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-white/50 mb-1">Beste sted</p>
                    <p className="text-white font-medium">
                      {rf.bestSpot.name}
                    </p>
                    <p className="text-primary text-sm font-bold">
                      {rf.maxProbability}% sjanse
                    </p>
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-white/60">
                      <Cloud className="w-4 h-4" />
                      Skydekke
                    </span>
                    <span className="text-white font-semibold">
                      {rf.avgCloudCoverage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-white/60">
                      <Thermometer className="w-4 h-4" />
                      Temperatur
                    </span>
                    <span className="text-white font-semibold">
                      {rf.avgTemperature}°C
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Steder</span>
                    <span className="text-white font-semibold">
                      {rf.spotCount}
                    </span>
                  </div>
                </div>

                {/* Call to action */}
                <div className="mt-4 text-center">
                  <span className="text-sm text-primary group-hover:text-primary/80 transition-colors">
                    Klikk for detaljer →
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info card */}
      <div className="card-aurora bg-primary/10 rounded-lg border border-primary/20 p-4 mt-8">
        <h3 className="text-sm font-semibold text-primary mb-2">
          Om regional visning
        </h3>
        <p className="text-xs text-white/70 leading-relaxed">
          Regional visning viser beste prognose innenfor hver region. Klikk på en region
          for å se detaljerte prognoser for individuelle observasjonssteder.
        </p>
      </div>
    </div>
  );
}
