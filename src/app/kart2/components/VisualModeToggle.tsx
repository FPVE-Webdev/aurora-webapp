/**
 * Visual Mode Toggle UI Component
 *
 * Simple toggle switch with permanent disclaimer.
 *
 * CRITICAL: Disclaimer must NEVER be hidden or removed.
 */

'use client';

interface VisualModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function VisualModeToggle({ isEnabled, onToggle }: VisualModeToggleProps) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs max-w-[260px]">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-200 font-medium">Visual mode</span>
        <button
          onClick={onToggle}
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
          Visual representation of live conditions. Not a prediction or exact location.
        </p>
      </div>
    </div>
  );
}
