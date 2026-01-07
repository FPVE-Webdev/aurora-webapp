'use client';

import { useEffect, useMemo, useState } from 'react';
import { XIcon } from 'lucide-react';
import Kart3VideoOverlay from '@/app/kart3/components/Kart3VideoOverlay';

type NowResponse = {
  kp: number;
  probability: number;
  weather?: {
    cloudCoverage?: number;
    windSpeed?: number;
  };
};

type Props = {
  onClose: () => void;
};

export default function IntroOverlay({ onClose }: Props) {
  const [kpIndex, setKpIndex] = useState(3.2);
  const [auroraProbability, setAuroraProbability] = useState(45);
  const [cloudCoverage, setCloudCoverage] = useState(75);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const intensity01 = useMemo(() => {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    return clamp01((kpIndex / 9) * 0.65 + (auroraProbability / 100) * 0.55);
  }, [kpIndex, auroraProbability]);

  const cloud01 = useMemo(() => Math.max(0, Math.min(1, cloudCoverage / 100)), [cloudCoverage]);

  useEffect(() => {
    let cancelled = false;

    const fetchNow = async () => {
      try {
        const res = await fetch('/api/aurora/now?lang=no', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as NowResponse;

        if (cancelled) return;

        if (typeof json.kp === 'number') setKpIndex(json.kp);
        if (typeof json.probability === 'number') setAuroraProbability(json.probability);

        const clouds = typeof json.weather?.cloudCoverage === 'number' ? json.weather.cloudCoverage : undefined;
        if (typeof clouds === 'number') {
          setCloudCoverage(clouds);
        }
      } catch {
        // ignore
      }
    };

    fetchNow();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-black transition-opacity duration-1000 ease-in-out ${isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Background Image (matched to Kart3 view) */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.png')",
          backgroundPosition: 'center 72%', 
        }} 
      />

      {/* Aurora Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <Kart3VideoOverlay intensity01={intensity01} cloud01={cloud01} weatherEnabled cinematic />
      </div>



      {/* Close Button */}
      <button
        onClick={handleClose}
        className="absolute top-6 right-6 z-50 p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all hover:scale-105 active:scale-95 group border border-white/10"
        aria-label="Lukk intro"
      >
        <XIcon className="w-8 h-8 text-white/80 group-hover:text-white" />
      </button>

      {/* Info Card */}
      <div className="absolute inset-0 flex items-end justify-center p-6 pb-20 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex flex-col gap-4 text-center items-center">
              <div>
                <h1 className="text-3xl font-display font-bold text-white mb-1">Velkommen til Tromsø</h1>
                <p className="text-white/60">Sjekker forholdene for nordlys...</p>
              </div>
              
              <div className="grid grid-cols-2 gap-8 w-full py-4 border-t border-white/10 border-b">
                 <div className="flex flex-col">
                    <span className="text-sm text-white/50">KP-Indeks</span>
                    <span className="text-2xl font-bold text-primary">{kpIndex.toFixed(1)}</span>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm text-white/50">Sjanse</span>
                    <span className="text-2xl font-bold text-primary">{Math.round(auroraProbability)}%</span>
                 </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors"
              >
                Gå til oversikten
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
