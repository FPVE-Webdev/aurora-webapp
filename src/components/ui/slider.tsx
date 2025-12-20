/**
 * Slider Component (Simplified)
 *
 * Basic range slider for timeline scrubbing
 * Styled with Tailwind CSS
 */

'use client';

import { cn } from '@/lib/utils';

interface SliderProps {
  value: number[];
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number[]) => void;
  className?: string;
}

export function Slider({ value, min, max, step, onValueChange, className }: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([parseFloat(e.target.value)]);
  };

  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0]}
      onChange={handleChange}
      className={cn(
        'w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer',
        '[&::-webkit-slider-thumb]:appearance-none',
        '[&::-webkit-slider-thumb]:w-4',
        '[&::-webkit-slider-thumb]:h-4',
        '[&::-webkit-slider-thumb]:rounded-full',
        '[&::-webkit-slider-thumb]:bg-primary',
        '[&::-webkit-slider-thumb]:cursor-pointer',
        '[&::-webkit-slider-thumb]:shadow-lg',
        '[&::-moz-range-thumb]:w-4',
        '[&::-moz-range-thumb]:h-4',
        '[&::-moz-range-thumb]:rounded-full',
        '[&::-moz-range-thumb]:bg-primary',
        '[&::-moz-range-thumb]:cursor-pointer',
        '[&::-moz-range-thumb]:border-0',
        className
      )}
    />
  );
}
