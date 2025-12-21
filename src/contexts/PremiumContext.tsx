'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface PremiumContextType {
  // State
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setIsPremium: (value: boolean) => void;
  checkSubscriptionStatus: () => Promise<void>;
  
  // Subscription info (for web)
  subscriptionType: 'free' | 'premium' | 'trial';
  trialDaysRemaining: number | null;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  // For now, use localStorage for dev/testing
  // In production, this would check against Stripe/backend
  const [isPremium, setIsPremiumState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dev_premium_mode') === 'true';
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionType, setSubscriptionType] = useState<'free' | 'premium' | 'trial'>('free');
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);

  // Check subscription status (placeholder for future backend integration)
  const checkSubscriptionStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Integrate with backend API to check subscription
      // For now, just read from localStorage
      const devPremium = localStorage.getItem('dev_premium_mode') === 'true';
      setIsPremiumState(devPremium);
      setSubscriptionType(devPremium ? 'premium' : 'free');
      
      console.log('✅ Premium status checked:', devPremium ? 'Premium' : 'Free');
    } catch (err) {
      console.error('❌ Failed to check subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to check subscription');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  // Listen for storage changes (for dev mode toggle)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dev_premium_mode') {
        const newValue = e.newValue === 'true';
        setIsPremiumState(newValue);
        setSubscriptionType(newValue ? 'premium' : 'free');
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  // Manually set premium (for dev/testing)
  const setIsPremium = useCallback((value: boolean) => {
    setIsPremiumState(value);
    setSubscriptionType(value ? 'premium' : 'free');
    if (typeof window !== 'undefined') {
      localStorage.setItem('dev_premium_mode', value.toString());
    }
  }, []);

  return (
    <PremiumContext.Provider 
      value={{ 
        isPremium, 
        isLoading,
        error,
        setIsPremium,
        checkSubscriptionStatus,
        subscriptionType,
        trialDaysRemaining,
      }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

