'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface KpDataPoint {
  time: string;
  kp: number;
}

interface KpIndexContextType {
  currentKp: number;
  kpHistory: KpDataPoint[];
  activityLevel: string;
  trend: string;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
}

const KpIndexContext = createContext<KpIndexContextType | undefined>(undefined);

export function KpIndexProvider({ children }: { children: ReactNode }) {
  const [currentKp, setCurrentKp] = useState<number>(0);
  const [kpHistory, setKpHistory] = useState<KpDataPoint[]>([]);
  const [activityLevel, setActivityLevel] = useState<string>('quiet');
  const [trend, setTrend] = useState<string>('stable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpIndex = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/noaa/kp-index');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch KP index`);
        }

        const data = await response.json();

        // Validate KP value (API returns 'current' field)
        const kp = typeof data.current === 'number' ? data.current : 0;
        if (kp < 0 || kp > 9) {
          console.warn(`⚠️ Invalid KP value received: ${kp}, clamping to 0-9 range`);
        }

        setCurrentKp(Math.max(0, Math.min(9, kp)));
        setKpHistory(data.history || []);
        setActivityLevel(data.activityLevel || 'quiet');
        setTrend(data.trend || 'stable');
        setLastUpdated(new Date());
      } catch (err) {
        console.error('❌ Failed to fetch KP index:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch KP index');

        // Keep existing KP value on error (graceful degradation)
        if (currentKp === 0 && kpHistory.length === 0) {
          // First fetch failed, set minimal default
          setCurrentKp(2); // Default to quiet conditions
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchKpIndex();

    // Refresh every 5 minutes (aligned with aurora data refresh)
    const interval = setInterval(fetchKpIndex, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []); // Only run on mount

  return (
    <KpIndexContext.Provider
      value={{
        currentKp,
        kpHistory,
        activityLevel,
        trend,
        lastUpdated,
        isLoading,
        error,
      }}
    >
      {children}
    </KpIndexContext.Provider>
  );
}

export function useKpIndex() {
  const context = useContext(KpIndexContext);
  if (context === undefined) {
    throw new Error('useKpIndex must be used within a KpIndexProvider');
  }
  return context;
}
