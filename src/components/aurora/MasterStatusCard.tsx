'use client';

import { useState } from 'react';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { getStatusColor } from '@/lib/calculations/masterStatus';
import { cn } from '@/lib/utils';
import { ChevronDown, RefreshCw, Info } from 'lucide-react';

interface MasterStatusCardProps {
  className?: string;
  showDetails?: boolean;
}

export function MasterStatusCard({ className, showDetails = false }: MasterStatusCardProps) {
  const { result, isLoading, refresh, lastUpdated } = useMasterStatus();
  const [expanded, setExpanded] = useState(showDetails);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!result) {
    return (
      <div className={cn("w-full p-6 rounded-2xl bg-slate-800/50 animate-pulse", className)}>
        <div className="h-12 bg-slate-700 rounded-lg w-1/3 mx-auto" />
      </div>
    );
  }

  const colors = getStatusColor(result.status);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const statusEmoji = result.status === 'GO' ? '🌌' : result.status === 'WAIT' ? '⏳' : '😴';

  return (
    <div
      className={cn(
        "w-full rounded-2xl overflow-hidden transition-all duration-300",
        `bg-gradient-to-r ${colors.gradient}`,
        "shadow-lg",
        result.status === 'GO' && "animate-pulse-slow",
        className
      )}
    >
      {/* Main Content */}
      <div className="p-5 text-white">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{statusEmoji}</span>
            <div>
              <h2 className={cn(
                "text-3xl font-bold tracking-tight",
                result.status === 'GO' && "drop-shadow-lg"
              )}>
                {result.status === 'GO' ? 'UT OG SE!' : 
                 result.status === 'WAIT' ? 'VENT LITT' : 
                 'LITE TROLIG'}
              </h2>
              <p className="text-white/80 text-sm font-medium">
                {result.message}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isLoading || isRefreshing}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Oppdater status"
            aria-label="Oppdater status"
          >
            <RefreshCw className={cn(
              "w-5 h-5",
              (isLoading || isRefreshing) && "animate-spin"
            )} />
          </button>
        </div>

        {/* Subtext */}
        <p className="text-white/90 text-sm mb-3">
          {result.subtext}
        </p>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-white/60 hover:text-white/90 text-xs transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Tekniske detaljer</span>
          <ChevronDown className={cn(
            "w-3.5 h-3.5 transition-transform",
            expanded && "rotate-180"
          )} />
        </button>
      </div>

      {/* Expandable Details */}
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-5 pb-4 pt-2 border-t border-white/10">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Mørkt</p>
              <p className="text-white font-semibold">
                {result.factors.isDark ? '✓' : '✗'}
              </p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Skyer</p>
              <p className="text-white font-semibold">
                {result.factors.cloudCoverage}%
              </p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">Sjanse</p>
              <p className="text-white font-semibold">
                {result.factors.probability}%
              </p>
            </div>
            <div>
              <p className="text-white/50 text-[10px] uppercase tracking-wide">KP</p>
              <p className="text-white font-semibold">
                {result.factors.kpIndex.toFixed(1)}
              </p>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-white/40 text-[10px] text-center mt-3">
              Oppdatert: {lastUpdated.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
