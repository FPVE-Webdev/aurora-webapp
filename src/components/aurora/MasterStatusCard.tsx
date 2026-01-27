'use client';

import { useState } from 'react';
import { useMasterStatus } from '@/contexts/MasterStatusContext';
import { useRetention } from '@/contexts/RetentionContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStatusColor } from '@/lib/calculations/masterStatus';
import { cn } from '@/lib/utils';
import { ChevronDown, RefreshCw, Info } from 'lucide-react';

interface MasterStatusCardProps {
  className?: string;
  showDetails?: boolean;
}

export function MasterStatusCard({ className, showDetails = false }: MasterStatusCardProps) {
  const { result, isLoading, refresh, lastUpdated } = useMasterStatus();
  const { userMode } = useRetention();
  const { t } = useLanguage();
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
                {result.status === 'GO' ? t('goOutAndSee2') :
                 result.status === 'WAIT' ? t('waitABit') :
                 t('unlikely')}
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
            title={t('refreshStatus')}
            aria-label={t('refreshStatus')}
          >
            <RefreshCw className={cn(
              "w-5 h-5",
              (isLoading || isRefreshing) && "animate-spin"
            )} />
          </button>
        </div>

        {/* Subtext - Tourist vs Geek Mode */}
        {userMode === 'tourist' ? (
          <p className="text-white/90 text-sm mb-3">
            {result.status === 'GO' && t('perfectNow')}
            {result.status === 'WAIT' && t('stayUpdated')}
            {result.status === 'NO' && 'Aurora unlikely to be visible in Tromsø tonight'}
          </p>
        ) : (
          <p className="text-white/90 text-sm mb-3">
            {result.subtext}
          </p>
        )}

        {/* Expand Toggle - Only in Geek Mode */}
        {userMode === 'geek' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-white/60 hover:text-white/90 text-xs transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{t('technicalDetails')}</span>
            <ChevronDown className={cn(
              "w-3.5 h-3.5 transition-transform",
              expanded && "rotate-180"
            )} />
          </button>
        )}
      </div>

      {/* Expandable Details - Only in Geek Mode */}
      {userMode === 'geek' && (
        <div className={cn(
          "overflow-hidden transition-all duration-300",
          expanded ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
        )}>
          <div className="px-5 pb-4 pt-2 border-t border-white/10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-sm text-white/60">Solar Activity</div>
                <div className="text-2xl font-bold">KP {result.factors.kpIndex.toFixed(1)}</div>
              </div>

              <div className="mt-2 sm:mt-0">
                <div className="text-sm text-white/60">Viewing Chance</div>
                <div className="text-4xl font-bold">{result.factors.probability}%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-wide">{t('dark')}</p>
                <p className="text-white font-semibold">
                  {result.factors.isDark ? '✓' : '✗'}
                </p>
              </div>
              <div>
                <p className="text-white/50 text-[10px] uppercase tracking-wide">{t('clouds')}</p>
                <p className="text-white font-semibold">
                  {result.factors.cloudCoverage}%
                </p>
              </div>
            </div>
            {lastUpdated && (
              <p className="text-white/40 text-[10px] text-center mt-3">
                {t('updated2')} {lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
