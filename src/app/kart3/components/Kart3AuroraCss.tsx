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

/**
 * CSS-based aurora overlay tuned to match the reference look for Kart3:
 * - Big green arc high in the sky
 * - Visible vertical "curtain" striations
 * - Subtle shimmer/motion
 *
 * This intentionally avoids WebGL so it works everywhere and stays stable in prod.
 */
export default function Kart3AuroraCss({ intensity01, cloud01, weatherEnabled = true }: Props) {
  const intensity = clamp01(intensity01);
  const clouds = clamp01(cloud01);

  const style = useMemo(() => {
    // Dim aurora when cloud cover is high, but don't kill it entirely.
    const cloudDim = weatherEnabled ? 1 - clouds * 0.45 : 1;
    const opacity = (0.25 + intensity * 0.85) * cloudDim;

    return {
      opacity: Math.max(0, Math.min(1, opacity)),
    } as const;
  }, [clouds, intensity, weatherEnabled]);

  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={style}>
        {/* Aurora arc + glow */}
        <div className="absolute inset-0 auroraArc" />

        {/* Vertical curtains */}
        <div className="absolute inset-0 auroraCurtains" />

        {/* Optional low cloud bank */}
        {weatherEnabled && <div className="absolute inset-0 auroraCloudBank" style={{ opacity: 0.18 + clouds * 0.35 }} />}
      </div>

      <style jsx>{`
        .auroraArc {
          mix-blend-mode: screen;
          filter: blur(10px) saturate(1.15);
          /* Big arc sweep (reference: left->up->right) */
          background:
            conic-gradient(
              from 235deg at 6% 108%,
              rgba(0, 0, 0, 0) 0deg,
              rgba(60, 255, 175, 0.0) 18deg,
              rgba(60, 255, 175, 0.55) 34deg,
              rgba(90, 255, 210, 0.38) 52deg,
              rgba(90, 190, 255, 0.18) 66deg,
              rgba(0, 0, 0, 0) 92deg
            ),
            radial-gradient(900px 520px at 45% 38%, rgba(60, 255, 175, 0.18) 0%, rgba(0, 0, 0, 0) 70%);
          /* Keep aurora high in the sky */
          mask-image: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 58%, rgba(255,255,255,0) 78%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 58%, rgba(255,255,255,0) 78%);
          animation: auroraArcDrift 10s ease-in-out infinite;
        }

        .auroraCurtains {
          mix-blend-mode: screen;
          filter: blur(6px) saturate(1.2);
          /* Curtains: vertical streaks with slight color shift */
          background:
            repeating-linear-gradient(
              90deg,
              rgba(0, 0, 0, 0) 0px,
              rgba(0, 0, 0, 0) 14px,
              rgba(90, 255, 200, 0.14) 14px,
              rgba(90, 255, 200, 0.0) 18px
            ),
            linear-gradient(
              180deg,
              rgba(90, 255, 200, 0.0) 0%,
              rgba(90, 255, 200, 0.18) 22%,
              rgba(90, 255, 200, 0.22) 40%,
              rgba(90, 255, 200, 0.10) 62%,
              rgba(0, 0, 0, 0) 78%
            );
          mask-image: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 58%, rgba(255,255,255,0) 80%);
          -webkit-mask-image: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 58%, rgba(255,255,255,0) 80%);
          opacity: 0.9;
          animation: auroraCurtainsShift 6.5s ease-in-out infinite;
        }

        .auroraCloudBank {
          mix-blend-mode: screen;
          filter: blur(14px);
          background:
            radial-gradient(900px 320px at 50% 78%, rgba(200, 220, 255, 0.22) 0%, rgba(0,0,0,0) 70%),
            linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(255,255,255,0.08) 70%, rgba(0,0,0,0) 82%);
          mask-image: linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%);
          -webkit-mask-image: linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 70%);
          animation: cloudBankDrift 12s ease-in-out infinite;
        }

        @keyframes auroraArcDrift {
          0% {
            transform: translate3d(-1%, -1%, 0) scale(1.02);
          }
          50% {
            transform: translate3d(1.5%, 0.5%, 0) scale(1.03);
          }
          100% {
            transform: translate3d(-1%, -1%, 0) scale(1.02);
          }
        }

        @keyframes auroraCurtainsShift {
          0% {
            background-position: 0% 0%, 0% 0%;
            transform: translate3d(-0.5%, 0%, 0);
          }
          50% {
            background-position: 100% 0%, 0% 0%;
            transform: translate3d(0.8%, 0.2%, 0);
          }
          100% {
            background-position: 0% 0%, 0% 0%;
            transform: translate3d(-0.5%, 0%, 0);
          }
        }

        @keyframes cloudBankDrift {
          0% {
            transform: translate3d(-1.5%, 0%, 0);
          }
          50% {
            transform: translate3d(1.5%, 0%, 0);
          }
          100% {
            transform: translate3d(-1.5%, 0%, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .auroraArc,
          .auroraCurtains,
          .auroraCloudBank {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}


