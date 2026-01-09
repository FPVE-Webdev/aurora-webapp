type Props = {
  intensity01: number;
  cloud01: number;
  enabled?: boolean;
  isPlaying?: boolean;
  progress01?: number; // 0-1 mapped from animationProgress/12
};

/**
 * Live overlay: dark sky + aurora band only. Uses Aurorakp1_3 video,
 * masked to keep above horizon. Visibility tied to playing state and
 * intensity/progress.
 */
export function AuroraOverlay({
  intensity01,
  cloud01,
  enabled = true,
  isPlaying = false,
  progress01 = 0,
}: Props) {
  if (!enabled) return null;

  // Opacity scaled by KP/probability proxy (intensity01) and timeline progress
  const progressScaled = Math.max(0, Math.min(1, progress01));
  const base = Math.max(0, Math.min(1, 0.25 + intensity01 * 0.75));
  const auroraOpacity = isPlaying ? base * (0.3 + progressScaled * 0.7) : 0;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Dark night sky limited to upper field; fade before horizon */}
      <div
        className="absolute inset-x-0 top-0 w-full h-[60%] bg-gradient-to-b from-[#05070d] via-[#05070d] to-transparent"
        style={{
          maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 90%)',
        }}
      />

      {/* Aurora band kept above horizon */}
      <div
        className="absolute inset-x-0 top-0 w-full h-[52%]"
        style={{
          // Keep aurora above horizon: stronger cut near lower third
          maskImage: 'linear-gradient(to bottom, black 0%, black 48%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 48%, transparent 70%)',
          opacity: auroraOpacity,
          mixBlendMode: 'screen',
        }}
      >
        <video
          className="w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src="/AuroraKP1_3.mp4"
        />
      </div>
    </div>
  );
}

export default AuroraOverlay;
