/**
 * Weather Mode Toggle UI Component
 *
 * Controls visibility of cloud/weather layer (0-12km altitude)
 * Independent from Visual Mode (aurora at 80-300km altitude)
 */

'use client';

interface WeatherModeToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function WeatherModeToggle({ isEnabled, onToggle }: WeatherModeToggleProps) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs max-w-[260px]">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-200 font-medium">Weather mode</span>
        <button
          onClick={onToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isEnabled ? 'bg-sky-500' : 'bg-gray-700'}
          `}
          aria-label="Toggle Weather Mode"
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isEnabled ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* Description */}
      <div className="text-[10px] text-gray-400 border-t border-gray-700 pt-2">
        <p className="leading-tight">
          Cloud layer from MET.no weather data. Shows real-time conditions.
        </p>
      </div>
    </div>
  );
}
