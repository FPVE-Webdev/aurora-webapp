import Kart3VideoOverlay from '@/app/kart3/components/Kart3VideoOverlay';

type Props = {
  intensity01: number;
  cloud01: number;
  enabled?: boolean;
};

/**
 * Shared aurora + cloud overlay used on /live (and reusable for /kart3).
 * Uses the Kart3 video overlay but drives opacity/dim by live KP + cloud data.
 */
export function AuroraOverlay({ intensity01, cloud01, enabled = true }: Props) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <Kart3VideoOverlay intensity01={intensity01} cloud01={cloud01} weatherEnabled />
    </div>
  );
}

export default AuroraOverlay;
