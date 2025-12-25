/**
 * Extended Metrics Component
 *
 * Displays advanced aurora metrics: Solar wind speed, Bz factor, particle density
 * Premium feature - shows real-time solar wind conditions from NOAA ACE satellite
 */

'use client';

import { Wind, Magnet, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';

interface ExtendedMetricsData {
  solar_wind: {
    speed: number;
    unit: string;
    status: string;
    favorable: boolean;
  };
  bz_factor: {
    value: number;
    unit: string;
    status: string;
    favorable: boolean;
  };
  particle_density: {
    value: number;
    unit: string;
    status: string;
  };
  updated: string;
}

interface ExtendedMetricsProps {
  data: ExtendedMetricsData | null;
  lang?: 'no' | 'en';
}

export function ExtendedMetrics({ data, lang = 'no' }: ExtendedMetricsProps) {
  if (!data) {
    return null;
  }

  const metrics = [
    {
      icon: Wind,
      label: lang === 'no' ? 'Solvind' : 'Solar Wind',
      value: `${data.solar_wind.speed}`,
      unit: data.solar_wind.unit,
      status: data.solar_wind.status,
      favorable: data.solar_wind.favorable,
      tooltip: lang === 'no'
        ? 'Hastighet på solpartikler. Høyere hastighet gir sterkere nordlys.'
        : 'Speed of solar particles. Higher speed creates stronger aurora.'
    },
    {
      icon: Magnet,
      label: lang === 'no' ? 'Bz Faktor' : 'Bz Factor',
      value: `${data.bz_factor.value > 0 ? '+' : ''}${data.bz_factor.value}`,
      unit: data.bz_factor.unit,
      status: data.bz_factor.status,
      favorable: data.bz_factor.favorable,
      tooltip: lang === 'no'
        ? 'Magnetfelt-retning. Negativ Bz gir best nordlys.'
        : 'Magnetic field direction. Negative Bz creates best aurora.'
    },
    {
      icon: Sparkles,
      label: lang === 'no' ? 'Partikkeltetthet' : 'Particle Density',
      value: `${data.particle_density.value}`,
      unit: data.particle_density.unit,
      status: data.particle_density.status,
      favorable: null,
      tooltip: lang === 'no'
        ? 'Konsentrasjon av solpartikler.'
        : 'Concentration of solar particles.'
    }
  ];

  const getStatusColor = (status: string, favorable: boolean | null) => {
    if (favorable === true) return 'text-green-400';
    if (favorable === false) return 'text-yellow-400';

    // Fallback to status-based colors
    if (status === 'Excellent' || status === 'Very High') return 'text-green-400';
    if (status === 'Very Good' || status === 'High') return 'text-emerald-400';
    if (status === 'Good' || status === 'Normal') return 'text-blue-400';
    if (status === 'Neutral') return 'text-gray-400';
    return 'text-orange-400';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">
          {lang === 'no' ? 'Avanserte Målinger' : 'Advanced Metrics'}
        </h3>
        <span className="text-xs text-white/40">
          {lang === 'no' ? 'Live fra NOAA ACE' : 'Live from NOAA ACE'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="card-aurora flex flex-col items-center py-3 px-2 animate-fade-in bg-arctic-800/50 rounded-lg border border-white/5 hover:border-white/10 transition-colors group relative"
            title={metric.tooltip}
          >
            {/* Favorable indicator */}
            {metric.favorable !== null && (
              <div className="absolute top-2 right-2">
                {metric.favorable ? (
                  <TrendingUp className="w-3 h-3 text-green-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-yellow-400" />
                )}
              </div>
            )}

            <metric.icon className="w-4 h-4 text-white/60 mb-1" />
            <span className="text-xs text-white/60 text-center">{metric.label}</span>

            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-lg font-display font-semibold ${getStatusColor(metric.status, metric.favorable)}`}>
                {metric.value}
              </span>
              <span className="text-xs text-white/40">{metric.unit}</span>
            </div>

            <span className="text-[10px] text-white/50 mt-0.5">
              {metric.status}
            </span>

            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-arctic-900 border border-white/10 rounded text-[10px] text-white/80 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              {metric.tooltip}
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-white/40 text-center">
        {lang === 'no'
          ? `Oppdatert: ${new Date(data.updated).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`
          : `Updated: ${new Date(data.updated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
        }
      </p>
    </div>
  );
}
