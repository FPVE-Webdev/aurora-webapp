/**
 * Tooltip Component
 *
 * Reusable tooltip for displaying helpful information on hover/tap
 */

'use client';

import { useState, ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string | ReactNode;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent'
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <div
        className="cursor-help"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children || <Info className="w-4 h-4 text-primary/70 hover:text-primary transition-colors" />}
      </div>

      {isVisible && (
        <>
          {/* Tooltip content */}
          <div
            className={cn(
              'absolute z-50 px-3 py-2 text-sm text-white bg-arctic-700 rounded-lg shadow-xl border border-primary/30 min-w-[200px] max-w-[300px]',
              'animate-fade-in',
              positionClasses[position]
            )}
          >
            {typeof content === 'string' ? (
              <p className="text-white/90 leading-relaxed">{content}</p>
            ) : (
              content
            )}

            {/* Arrow */}
            <div
              className={cn(
                'absolute w-0 h-0 border-4 border-arctic-700',
                arrowClasses[position]
              )}
            />
          </div>

          {/* Backdrop for mobile (to close on tap outside) */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsVisible(false)}
          />
        </>
      )}
    </div>
  );
}

interface MetricWithTooltipProps {
  label: string;
  value: string | number;
  explanation: string | ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function MetricWithTooltip({
  label,
  value,
  explanation,
  icon,
  className
}: MetricWithTooltipProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-2">
        <span className="text-white/70 text-sm font-medium">{label}</span>
        <Tooltip content={explanation} position="top" />
      </div>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-white font-semibold">{value}</span>
      </div>
    </div>
  );
}
