'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DevModeState {
  enabled: boolean;
  kpOverride: number;
  cloudOverride: number;
}

interface DevModeContextType {
  devMode: DevModeState;
  setDevMode: (state: Partial<DevModeState>) => void;
  isDevMode: boolean;
  // Helper to get actual value (override if dev mode, otherwise real value)
  getKp: (realValue: number) => number;
  getCloud: (realValue: number) => number;
}

const STORAGE_KEY = 'aurora-dev-mode';

const DEFAULT_STATE: DevModeState = {
  enabled: false,
  kpOverride: 5,
  cloudOverride: 20,
};

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [devMode, setDevModeState] = useState<DevModeState>(() => {
    // Load from localStorage on init
    if (typeof window === 'undefined') return DEFAULT_STATE;
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load dev mode settings:', e);
    }
    return DEFAULT_STATE;
  });

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(devMode));
    } catch (e) {
      console.warn('Failed to save dev mode settings:', e);
    }
  }, [devMode]);

  const setDevMode = (partial: Partial<DevModeState>) => {
    setDevModeState(prev => ({ ...prev, ...partial }));
  };

  const getKp = (realValue: number) => {
    return devMode.enabled ? devMode.kpOverride : realValue;
  };

  const getCloud = (realValue: number) => {
    return devMode.enabled ? devMode.cloudOverride : realValue;
  };

  return (
    <DevModeContext.Provider value={{ 
      devMode, 
      setDevMode, 
      isDevMode: devMode.enabled,
      getKp,
      getCloud
    }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within DevModeProvider');
  }
  return context;
}

