'use client';

import { useAuroraData } from '@/hooks/useAuroraData';
import { ProbabilityGauge } from '@/components/aurora/ProbabilityGauge';
import { HourlyForecast } from '@/components/aurora/HourlyForecast';
import { SpotSelector } from '@/components/map/SpotSelector';
import { Loader2, ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

export default function ForecastPage() {
  const {
    spotForecasts,
    selectedSpot,
    selectSpot,
    currentKp,
    isLoading,
    lastUpdate,
    error
  } = useAuroraData();

  // Get forecast for selected spot
  const currentForecast = spotForecasts.find(f => f.spot.id === selectedSpot.id) || spotForecasts[0];

  if (isLoading && spotForecasts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-arctic-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
          <p className="text-white/70">Laster prognoser...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-arctic-900">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-400 text-5xl">⚠️</div>
          <h2 className="text-xl font-semibold text-white">Kunne ikke laste prognoser</h2>
          <p className="text-white/60">{error}</p>
          <Link href="/" className="text-primary hover:text-primary/80">
            Tilbake til forsiden
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-arctic-900">
      {/* Aurora glow effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-b from-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Tilbake
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-display font-bold text-white flex items-center gap-3">
              <Calendar className="w-8 h-8 text-primary" />
              Nordlysprognose
            </h1>
            <p className="text-white/60 mt-2">
              12-timers prognose for {currentForecast?.spot.name}
            </p>
            <div className="text-sm text-white/50 mt-1">
              Sist oppdatert: {format(new Date(lastUpdate), 'dd. MMM yyyy HH:mm', { locale: nb })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Current conditions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Location selector */}
            {currentForecast && (
              <SpotSelector
                selectedSpot={currentForecast.spot}
                onSelectSpot={selectSpot}
              />
            )}

            {/* Current probability gauge */}
            {currentForecast && (
              <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-6">
                <h3 className="text-sm font-medium text-white/70 mb-4">Nå</h3>
                <div className="flex justify-center">
                  <ProbabilityGauge
                    probability={currentForecast.currentProbability}
                    size="lg"
                  />
                </div>
                <div className="mt-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">KP-indeks</span>
                    <span className="text-white font-semibold">{currentKp.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Skydekke</span>
                    <span className="text-white font-semibold">{Math.round(currentForecast.weather.cloudCoverage)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Temperatur</span>
                    <span className="text-white font-semibold">{Math.round(currentForecast.weather.temperature)}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">Vindstyrke</span>
                    <span className="text-white font-semibold">{Math.round(currentForecast.weather.windSpeed)} m/s</span>
                  </div>
                </div>
              </div>
            )}

            {/* Info card */}
            <div className="card-aurora bg-primary/10 rounded-lg border border-primary/20 p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">Om prognosen</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Prognosen baseres på NOAA KP-indeks, værmeldinger fra MET.no, og geografisk plassering.
                Jo høyere KP-indeks og jo mindre skydekke, desto større sjanse for nordlys.
              </p>
            </div>
          </div>

          {/* Right column: Hourly forecast */}
          <div className="lg:col-span-2">
            {currentForecast && currentForecast.hourlyForecast && currentForecast.hourlyForecast.length > 0 ? (
              <HourlyForecast
                forecasts={currentForecast.hourlyForecast}
                locationName={currentForecast.spot.name}
              />
            ) : (
              <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-8 text-center">
                <p className="text-white/60">Ingen timesprognose tilgjengelig</p>
              </div>
            )}

            {/* Probability legend */}
            <div className="mt-6 card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
              <h3 className="text-sm font-medium text-white/70 mb-4">Forklaring</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="w-full h-3 rounded bg-gradient-to-r from-green-400 to-green-600"></div>
                  <div className="text-xs">
                    <div className="text-white font-medium">Utmerket (70%+)</div>
                    <div className="text-white/60">Svært gode forhold</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 rounded bg-gradient-to-r from-purple-400 to-purple-600"></div>
                  <div className="text-xs">
                    <div className="text-white font-medium">Gode (50-69%)</div>
                    <div className="text-white/60">Gode muligheter</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 rounded bg-gradient-to-r from-orange-400 to-orange-600"></div>
                  <div className="text-xs">
                    <div className="text-white font-medium">Moderate (30-49%)</div>
                    <div className="text-white/60">Noe mulighet</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 rounded bg-gradient-to-r from-slate-400 to-slate-600"></div>
                  <div className="text-xs">
                    <div className="text-white font-medium">Dårlige (&lt;30%)</div>
                    <div className="text-white/60">Liten sjanse</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
