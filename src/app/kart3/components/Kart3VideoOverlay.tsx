'use client';

import { useMemo } from 'react';

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

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
          /* 15s Total */
          /* Phase 1: Clean (0-2s) */
          0%, 13% { opacity: 0; }
          
          /* Phase 2: Aurora Only (2s-5s) -> Fade in */
          20% { opacity: 1; }
          
          /* Phase 3: Aurora + Clouds (5s-9s) -> Aurora stays */
          60% { opacity: 1; }
          
          /* Phase 4: Clouds Only (9s-13s) -> Aurora fades out */
          66% { opacity: 0; } 

          /* Phase 5: Fade out */
          100% { opacity: 0; }
        }

        @keyframes cinematicClouds {
          /* Phase 1 & 2: No Clouds (0-5s) */
          0%, 33% { opacity: 0; }

          /* Phase 3: Clouds Fade In (5s-6s) */
          40% { opacity: 1; } 

          /* Phase 4: Clouds Only (6s-13s) */
          86% { opacity: 1; }

          /* Phase 5: Clouds Fade Out (13s-15s) */
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
