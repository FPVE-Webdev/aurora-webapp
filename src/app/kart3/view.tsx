'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Kart3VideoOverlay from './components/Kart3VideoOverlay';

type Kart3WeatherData = {
  windSpeed: number;
  windDirection: number;
  weatherType: number;
  precipitation: number;
};

type NowResponse = {
  kp: number;
  probability: number;
  weather?: {
    cloudCoverage?: number;
    windSpeed?: number;
  };
};

function classifyWeatherType(cloudCoverage: number): number {
  // 0=clear, 1=fair, 2=cloudy, 3=rain, 4=snow, 5=fog (same convention as Kart2 shaders)
  if (cloudCoverage < 15) return 0;
  if (cloudCoverage < 40) return 1;
  return 2;
}

export default function Kart3View() {
  const [kpIndex, setKpIndex] = useState(3.2);
  const [auroraProbability, setAuroraProbability] = useState(45);
  const [cloudCoverage, setCloudCoverage] = useState(75);
  const [weatherData, setWeatherData] = useState<Kart3WeatherData>({
    windSpeed: 6,
    windDirection: 270,
    weatherType: 2,
    precipitation: 0,
  });

  const intensity01 = useMemo(() => {
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    return clamp01((kpIndex / 9) * 0.65 + (auroraProbability / 100) * 0.55);
  }, [kpIndex, auroraProbability]);

  const cloud01 = useMemo(() => Math.max(0, Math.min(1, cloudCoverage / 100)), [cloudCoverage]);

  const backgroundStyle = useMemo(() => {
    // If the image is not present in `public/`, the gradient still renders.
    return {
      backgroundImage: "url('/background.png')",
      backgroundSize: 'cover',
      // Favor the “city + fjord” area (image is tall; keep the city in-frame on wide screens)
      backgroundPosition: 'center 72%',
      backgroundRepeat: 'no-repeat',
    } as const;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

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
          setWeatherData((prev) => ({
            ...prev,
            weatherType: classifyWeatherType(clouds),
          }));
        }

        const windSpeed = typeof json.weather?.windSpeed === 'number' ? json.weather.windSpeed : undefined;
        if (typeof windSpeed === 'number') {
          setWeatherData((prev) => ({
            ...prev,
            windSpeed,
          }));
        }
      } catch {
        // ignore; keep last values
      }
    };

    fetchNow();
    timer = window.setInterval(fetchNow, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-black" style={backgroundStyle}>
      {/* Aurora overlay (Video-based) */}
      <div className="absolute inset-0 pointer-events-none">
        <Kart3VideoOverlay intensity01={intensity01} cloud01={cloud01} weatherEnabled />
      </div>



      {/* Minimal UI */}
      <div className="absolute inset-0 flex items-end justify-center p-6">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-black/45 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-white/60">Tromsø nå</div>
                <div className="text-white text-lg font-semibold">
                  KP {kpIndex.toFixed(1)} · {Math.round(auroraProbability)}%
                </div>
              </div>
              <Link
                href="/home"
                className="inline-flex items-center justify-center rounded-xl bg-white text-black px-4 py-2 text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Gå til dagens hjem
              </Link>
            </div>
            <div className="mt-3 text-[11px] text-white/55">
              Visual representation of live conditions. Not a prediction.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


