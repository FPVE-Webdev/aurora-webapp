'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type TemperatureUnit = 'C' | 'F';

interface TemperatureContextType {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  convertTemperature: (celsius: number) => number;
  formatTemperature: (celsius: number) => string;
}

const TemperatureContext = createContext<TemperatureContextType | undefined>(undefined);

export function TemperatureProvider({ children }: { children: ReactNode }) {
  const [unit, setUnitState] = useState<TemperatureUnit>('C');

  // Load unit from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aurora-temperature-unit') as TemperatureUnit;
      if (saved && (saved === 'C' || saved === 'F')) {
        setUnitState(saved);
      }
    }
  }, []);

  // Save unit to localStorage when it changes
  const setUnit = (newUnit: TemperatureUnit) => {
    setUnitState(newUnit);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aurora-temperature-unit', newUnit);
    }
  };

  // Convert Celsius to current unit
  const convertTemperature = (celsius: number): number => {
    if (unit === 'F') {
      return (celsius * 9/5) + 32;
    }
    return celsius;
  };

  // Format temperature with unit symbol
  const formatTemperature = (celsius: number): string => {
    const converted = convertTemperature(celsius);
    return `${Math.round(converted)}°${unit}`;
  };

  return (
    <TemperatureContext.Provider value={{ unit, setUnit, convertTemperature, formatTemperature }}>
      {children}
    </TemperatureContext.Provider>
  );
}

export function useTemperature() {
  const context = useContext(TemperatureContext);
  if (context === undefined) {
    throw new Error('useTemperature must be used within a TemperatureProvider');
  }
  return context;
}
