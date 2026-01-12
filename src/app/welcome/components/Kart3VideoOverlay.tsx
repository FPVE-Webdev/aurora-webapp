'use client';

import { useMemo } from 'react';
import { clamp01 } from '@/lib/utils/mathUtils';

type Props = {
  /** 0..1 */
  intensity01: number;
  /** 0..1 */
  cloud01: number;
  weatherEnabled?: boolean;
};

export default function Kart3VideoOverlay({ intensity01, cloud01, weatherEnabled = true, cinematic = false }: Props & { cinematic?: boolean }) {
  const intensity = clamp01(intensity01);
  const clouds = clamp01(cloud01);

  const style = useMemo(() => {
    // If cinematic mode, use animation keyframes instead of props
    if (cinematic) {
       return {
         mixBlendMode: 'screen',
         // Mask the video so it fully clears the city/ground (bottom 35% cleared, sharp transition)
         maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 75%)',
         WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 75%)',
         // Animation: 15s loop
         animation: 'cinematicLoop 15s ease-in-out infinite',
       } as const;
    }

    // Default 'live' mode
    const cloudDim = weatherEnabled ? 1 - clouds * 0.45 : 1;
    const opacity = (0.3 + intensity * 0.7) * cloudDim;

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
      mixBlendMode: 'screen',
      // Mask the video so it fully clears the city/ground (bottom 35% cleared, sharp transition)
      maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 75%)',
      WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 75%)',
    } as const;
  }, [clouds, intensity, weatherEnabled, cinematic]);

  return (
    <div className="absolute inset-0 pointer-events-none">
       {/* Video layer */}
       <div className="absolute inset-0 w-full h-full" style={style}>
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src="/kart3/Nordlysanimasjon1.mov"
        />
      </div>

      {/* Cloud layer (only visible in cinematic phase 3 or if weatherEnabled & high clouds) */}
      <div 
        className="absolute inset-0 auroraCloudBank" 
        style={{ 
          opacity: cinematic ? 0 : (weatherEnabled ? 0.18 + clouds * 0.35 : 0),
          animation: cinematic ? 'cinematicClouds 15s ease-in-out infinite' : undefined 
        }} 
      />

      <style jsx>{`
        @keyframes cinematicLoop {
          /* Seamless loop: Aurora pulsates but never fully disappears */
          0% { opacity: 0.8; }
          50% { opacity: 0.4; } /* Dim slightly when clouds come in */
          100% { opacity: 0.8; }
        }

        @keyframes cinematicClouds {
          /* Seamless loop: Clouds drift in and out */
          0% { opacity: 0; }
          50% { opacity: 0.9; } /* Clouds dominate */
          100% { opacity: 0; }
        }

        /* Cloud bank - Opaque to cover stars */
        .auroraCloudBank {
          mix-blend-mode: normal; 
          filter: blur(40px);
          /* Dark opaque gradient covering the sky */
          background: linear-gradient(to bottom, rgba(15, 20, 30, 0.98) 0%, rgba(20, 25, 35, 0.9) 50%, rgba(0,0,0,0) 80%);
          /* Visible in sky (top), transparent at horizon (bottom) */
          mask-image: linear-gradient(to bottom, white 0%, white 60%, transparent 80%);
          -webkit-mask-image: linear-gradient(to bottom, white 0%, white 60%, transparent 80%);
        }
      `}</style>
    </div>
  );
}
