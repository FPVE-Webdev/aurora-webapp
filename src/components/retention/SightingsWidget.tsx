'use client';

import { useState } from 'react';
import { Eye, CheckCircle2 } from 'lucide-react';
import { useRetention } from '@/contexts/RetentionContext';

export function SightingsWidget() {
  const { reportSighting, getRecentSightings } = useRetention();
  const [justReported, setJustReported] = useState(false);

  const handleReport = () => {
    reportSighting();
    setJustReported(true);

    setTimeout(() => {
      setJustReported(false);
    }, 3000);
  };

  const recentSightings = getRecentSightings();

  return (
    <div className="bg-gradient-to-br from-arctic-800/50 to-arctic-900/50 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Eye className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Live Observasjoner</h3>
            <p className="text-white/60 text-sm">Siste 30 minutter</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">{recentSightings}</div>
          <div className="text-xs text-white/60">rapporter</div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-white/70 text-sm">
          Ser du nordlys nå? Hjelp andre ved å rapportere!
        </p>

        <button
          onClick={handleReport}
          disabled={justReported}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
            justReported
              ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
              : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
          }`}
        >
          {justReported ? (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Rapportert!
            </span>
          ) : (
            'Jeg ser nordlys nå!'
          )}
        </button>

        {recentSightings > 5 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <p className="text-sm text-green-400 font-medium">
              Høy aktivitet! {recentSightings} personer ser nordlys akkurat nå
            </p>
          </div>
        )}

        {recentSightings === 0 && (
          <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <p className="text-sm text-white/60 text-center">
              Ingen rapporter ennå. Vær den første!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
