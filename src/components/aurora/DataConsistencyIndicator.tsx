'use client';

import { useAuroraDataContext } from '@/contexts/AuroraDataContext';

export function DataConsistencyIndicator() {
  const { dataTimestamp, lastUpdate } = useAuroraDataContext();

  const ageSeconds = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);

  return (
    <div className="fixed bottom-4 left-4 text-xs text-white/40 bg-black/30 px-2 py-1 rounded">
      Data: {ageSeconds}s old | {new Date(dataTimestamp).toLocaleTimeString()}
    </div>
  );
}
