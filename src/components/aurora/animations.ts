import { clamp01 } from '@/lib/utils/mathUtils';
import { SpotForecast, HourlyForecast } from '@/types/aurora';

type OverlayState = {
  intensity01: number;
  cloud01: number;
  kpIndex: number;
  probability: number;
};

function getHourlyData(
  forecast: SpotForecast | undefined,
  animationHour: number | undefined
): HourlyForecast | null {
  if (!forecast?.hourlyForecast || forecast.hourlyForecast.length === 0) return null;
  if (animationHour === undefined) return forecast.hourlyForecast[0] || null;

  const idx = Math.min(
    forecast.hourlyForecast.length - 1,
    Math.max(0, Math.floor(animationHour))
  );
  return forecast.hourlyForecast[idx] || null;
}

/**
 * Derive overlay inputs (aurora intensity and cloud level) from forecast data.
 * Uses KP + probability for aurora and cloudCoverage for clouds. Safe fallbacks included.
 */
export function deriveOverlayState(
  forecast: SpotForecast | undefined,
  animationHour?: number
): OverlayState {
  if (!forecast) {
    return {
      intensity01: 0.25,
      cloud01: 0.5,
      kpIndex: 0,
      probability: 0,
    };
  }

  const hourData = getHourlyData(forecast, animationHour);

  const probability =
    hourData?.probability ??
    (hourData?.canSeeAurora === false ? 0 : forecast.currentProbability ?? 0) ??
    0;

  const kpIndex =
    (hourData as any)?.kp ??
    (hourData as any)?.kpIndex ??
    forecast.kp ??
    0;

  const cloudCoverage =
    hourData?.weather?.cloudCoverage ??
    hourData?.cloudCoverage ??
    forecast.weather?.cloudCoverage ??
    50;

  const intensity01 = clamp01((kpIndex / 9) * 0.65 + (probability / 100) * 0.55);
  const cloud01 = clamp01(cloudCoverage / 100);

  return {
    intensity01,
    cloud01,
    kpIndex,
    probability,
  };
}
