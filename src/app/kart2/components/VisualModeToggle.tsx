/**
 * Visual Mode Toggle UI Component
 *
 * Simple toggle switch with permanent disclaimer and subtle first-load tooltip.
 *
 * CRITICAL: Disclaimer must NEVER be hidden or removed.
 */

'use client';

import { useState, useEffect, useRef } from 'react';

const TOOLTIP_SEEN_KEY = 'kart2-visual-mode-tooltip-seen';

interface VisualModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function VisualModeToggle({ isEnabled, onToggle }: VisualModeToggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show tooltip on first load (first time seeing this component)
  useEffect(() => {
    const hasSeenTooltip = localStorage.getItem(TOOLTIP_SEEN_KEY);
    if (!hasSeenTooltip && typeof window !== 'undefined') {
      // Show tooltip after a brief delay
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
        localStorage.setItem(TOOLTIP_SEEN_KEY, 'true');
      }, 800);
    }

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Dismiss tooltip on toggle interaction
  const handleToggle = () => {
    setShowTooltip(false);
    onToggle();
  };

  return (
    <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs max-w-[260px]">
      {/* First-Load Tooltip */}
      {showTooltip && (
        <div className="mb-2 p-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-[11px] text-emerald-200 animate-pulse">
          <p>Toggle Visual Mode for live atmosphere</p>
        </div>
      )}

      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-200 font-medium">Visual mode</span>
        <button
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isEnabled ? 'bg-emerald-500' : 'bg-gray-700'}
          `}
          aria-label="Toggle Visual Mode"
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Permanent Disclaimer - NEVER HIDDEN */}
      <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-2">
        <p className="leading-tight">
          Visual representation of live conditions. Not a prediction.
        </p>
      </div>
    </div>
  );
}
