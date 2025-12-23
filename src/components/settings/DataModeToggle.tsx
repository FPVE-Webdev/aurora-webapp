'use client';

import { useDataMode } from '@/contexts/DataModeContext';
import { Cloud, Zap } from 'lucide-react';
import { toast } from 'sonner';

export function DataModeToggle() {
  const { dataMode, setDataMode } = useDataMode();

  const handleModeChange = (newMode: 'demo' | 'live') => {
    if (newMode === dataMode) return;

    toast.success(
      newMode === 'demo'
        ? 'Bytter til Demo-modus...'
        : 'Bytter til Live-modus...'
    );

    setTimeout(() => {
      setDataMode(newMode);
    }, 500);
  };

  return (
    <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/20">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Data Mode</h2>
          <p className="text-sm text-white/60">Velg mellom demo- eller live-data</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleModeChange('demo')}
          className={`p-4 rounded-lg border-2 transition-all ${
            dataMode === 'demo'
              ? 'border-primary bg-primary/10 text-white'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Cloud className={`w-6 h-6 ${dataMode === 'demo' ? 'text-primary' : 'text-white/50'}`} />
            <div className="font-semibold">Demo</div>
            <div className="text-xs text-white/60">Testdata</div>
          </div>
        </button>

        <button
          onClick={() => handleModeChange('live')}
          className={`p-4 rounded-lg border-2 transition-all ${
            dataMode === 'live'
              ? 'border-primary bg-primary/10 text-white'
              : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <Zap className={`w-6 h-6 ${dataMode === 'live' ? 'text-primary' : 'text-white/50'}`} />
            <div className="font-semibold">Live</div>
            <div className="text-xs text-white/60">Ekte data</div>
          </div>
        </button>
      </div>

      {dataMode === 'demo' && (
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-300">
            ℹ️ Demo-modus: Viser testdata for utvikling og testing
          </p>
        </div>
      )}

      {dataMode === 'live' && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-sm text-yellow-300">
            ⚡ Live-modus: Viser ekte nordlysdata fra API
          </p>
        </div>
      )}
    </div>
  );
}
