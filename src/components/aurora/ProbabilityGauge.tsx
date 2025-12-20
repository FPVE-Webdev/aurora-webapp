/**
 * Aurora Probability Gauge Component
 *
 * Circular gauge showing aurora probability percentage with color-coded levels
 */

'use client';

import { getProbabilityLevel } from '@/lib/auroraCalculations';
import { cn } from '@/lib/utils';

interface ProbabilityGaugeProps {
  probability: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ProbabilityGauge({ probability, size = 'lg' }: ProbabilityGaugeProps) {
  const level = getProbabilityLevel(probability);

  // Hardcoded Norwegian labels for now (will add LanguageContext in Day 9-11)
  const statusLabels = {
    excellent: 'Utmerket!',
    good: 'Gode forhold!',
    moderate: 'Moderat',
    poor: 'Dårlige forhold',
  };

  const label = statusLabels[level];

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36'
  };

  const fontSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-5xl'
  };

  return (
    <div
      className={cn(
        'rounded-full flex flex-col items-center justify-center transition-all duration-500 animate-scale-in',
        sizeClasses[size],
        level === 'excellent' && 'gauge-excellent',
        level === 'good' && 'gauge-good',
        level === 'moderate' && 'gauge-moderate',
        level === 'poor' && 'gauge-poor'
      )}
    >
      <span className={cn('font-display font-bold text-white', fontSizes[size])}>
        {probability}%
      </span>
      {size !== 'sm' && (
        <span className="text-white/90 text-sm font-medium mt-1">{label}</span>
      )}
    </div>
  );
}
