'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DataMode = 'demo' | 'live';

interface DataModeContextType {
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  isDemoMode: boolean;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

const STORAGE_KEY = 'aurora_data_mode';

export function DataModeProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataModeState] = useState<DataMode>('demo');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'live' || stored === 'demo') {
      setDataModeState(stored);
    }
    setIsHydrated(true);
  }, []);

  const setDataMode = (mode: DataMode) => {
    setDataModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    window.location.reload();
  };

  const isDemoMode = dataMode === 'demo';

  if (!isHydrated) {
    return null;
  }

  return (
    <DataModeContext.Provider value={{ dataMode, setDataMode, isDemoMode }}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
}
