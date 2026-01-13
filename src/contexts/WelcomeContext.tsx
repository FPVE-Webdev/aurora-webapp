'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface WelcomeContextType {
  hasSeenWelcome: boolean;
  setHasSeenWelcome: (value: boolean) => void;
}

const WelcomeContext = createContext<WelcomeContextType | undefined>(undefined);

export function WelcomeProvider({ children }: { children: ReactNode }) {
  const [hasSeenWelcome, setHasSeenWelcomeState] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load welcome state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aurora-has-seen-welcome');
      if (saved === 'true') {
        setHasSeenWelcomeState(true);
      }
      setIsInitialized(true);
    }
  }, []);

  // Save welcome state to localStorage when it changes
  const setHasSeenWelcome = (value: boolean) => {
    setHasSeenWelcomeState(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-has-seen-welcome', String(value));
    }
  };

  return (
    <WelcomeContext.Provider value={{ hasSeenWelcome, setHasSeenWelcome }}>
      {isInitialized && children}
    </WelcomeContext.Provider>
  );
}

export function useWelcome() {
  const context = useContext(WelcomeContext);
  if (context === undefined) {
    throw new Error('useWelcome must be used within a WelcomeProvider');
  }
  return context;
}
