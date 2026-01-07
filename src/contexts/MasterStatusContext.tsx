'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  MasterStatus, 
  MasterStatusResult, 
  calculateMasterStatus, 
  calculateSunElevation 
} from '@/lib/calculations/masterStatus';
import { calculateAuroraProbability } from '@/lib/calculations/probabilityCalculator';
import { scoreToKpIndex } from '@/lib/tromsoAIMapper';

interface MasterStatusContextType {
  status: MasterStatus;
  result: MasterStatusResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

const defaultResult: MasterStatusResult = {
  status: 'NO',
  message: 'Laster...',
  subtext: 'Henter data...',
  confidence: 0,
  factors: {
    isDark: true,
    cloudCoverage: 50,
    probability: 0,
    kpIndex: 0,
  },
};

const MasterStatusContext = createContext<MasterStatusContextType>({
  status: 'NO',
  result: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
  lastUpdated: null,
});

export function useMasterStatus() {
  const context = useContext(MasterStatusContext);
  if (!context) {
    throw new Error('useMasterStatus must be used within MasterStatusProvider');
  }
  return context;
}

interface MasterStatusProviderProps {
  children: ReactNode;
  // Default location: Tromsø
  latitude?: number;
  longitude?: number;
}

export function MasterStatusProvider({ 
  children, 
  latitude = 69.6496, 
  longitude = 18.9560 
}: MasterStatusProviderProps) {
  const [result, setResult] = useState<MasterStatusResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAndCalculateStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch aurora data from API
      const auroraResponse = await fetch('/api/aurora/now?lang=no');
      const auroraData = auroraResponse.ok ? await auroraResponse.json() : null;

      // Fetch weather data for location
      const weatherResponse = await fetch(`/api/weather/${latitude}/${longitude}`);
      const weatherData = weatherResponse.ok ? await weatherResponse.json() : null;

      // Extract values
      const kpIndex = auroraData ? scoreToKpIndex(auroraData.score || 50) : 3;
      const cloudCoverage = weatherData?.cloudCoverage ?? 50;
      const temperature = weatherData?.temperature ?? -5;

      // Calculate probability using existing calculator
      const { probability } = calculateAuroraProbability({
        kpIndex,
        cloudCoverage,
        temperature,
        latitude,
      });

      // Calculate sun elevation
      const sunElevation = calculateSunElevation(latitude, longitude, new Date());

      // Calculate master status
      const statusResult = calculateMasterStatus({
        probability,
        cloudCoverage,
        kpIndex,
        sunElevation,
        latitude,
        longitude,
      });

      setResult(statusResult);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to calculate master status:', err);
      setError('Kunne ikke hente status');
      // Set fallback status
      setResult({
        status: 'NO',
        message: 'Feil ved henting',
        subtext: 'Kunne ikke hente data. Prøv igjen.',
        confidence: 0,
        factors: {
          isDark: true,
          cloudCoverage: 50,
          probability: 0,
          kpIndex: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Initial fetch
  useEffect(() => {
    fetchAndCalculateStatus();
  }, [fetchAndCalculateStatus]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(fetchAndCalculateStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAndCalculateStatus]);

  const value: MasterStatusContextType = {
    status: result?.status ?? 'NO',
    result,
    isLoading,
    error,
    refresh: fetchAndCalculateStatus,
    lastUpdated,
  };

  return (
    <MasterStatusContext.Provider value={value}>
      {children}
    </MasterStatusContext.Provider>
  );
}
