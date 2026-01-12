'use client';

import { useAuroraDataContext } from '@/contexts/AuroraDataContext';

export function TestConsistency() {
  const data = useAuroraDataContext();

  console.log('=== DATA CONSISTENCY CHECK ===');
  console.log('KP Index:', data.currentKp);
  console.log('Global Probability:', data.globalProbability);
  console.log('Timestamp:', data.dataTimestamp);
  console.log('Spots:', data.spotForecasts.length);

  // Verify all spots share the same derived KP (first hourly value as proxy)
  const uniqueKPs = [
    ...new Set(
      data.spotForecasts.map(
        (sf) => sf.hourlyForecast?.[0]?.kpIndex ?? data.currentKp
      )
    ),
  ];
  console.log('✓ All spots synchronized:', uniqueKPs.length === 1);

  return null;
}
