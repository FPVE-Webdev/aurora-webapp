'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuroraData as useAuroraDataHook } from '@/hooks/useAuroraData';

type AuroraDataContextValue = ReturnType<typeof useAuroraDataHook>;

const AuroraDataContext = createContext<AuroraDataContextValue | null>(null);

export function AuroraDataProvider({ children }: { children: ReactNode }) {
  const value = useAuroraDataHook();
  return (
    <AuroraDataContext.Provider value={value}>
      {children}
    </AuroraDataContext.Provider>
  );
}

export function useAuroraDataContext() {
  const context = useContext(AuroraDataContext);
  if (!context) {
    throw new Error('useAuroraDataContext must be used within AuroraDataProvider');
  }
  return context;
}
