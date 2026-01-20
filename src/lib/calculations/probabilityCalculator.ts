/**
 * Beregner nordlyssannsynlighet basert på værdata og solaktivitet
 */

import { canSeeAurora, getNextAuroraTime, getBestAuroraTimeTonight } from './sunCalculations';

export interface AuroraInputs {
  kpIndex: number;           // 0-9 (NOAA KP Index)
  cloudCoverage: number;     // 0-100 (%)
  fogCoverage?: number;      // 0-100 (%) - fog impacts visibility like clouds
  temperature: number;       // Celsius
  latitude: number;          // 60-70 for Norge
  longitude?: number;        // Required for daylight check
  date?: Date;               // Timestamp for calculation (default: now)
  moonPhase?: number;        // 0-1 (0=new, 0.5=full)
  humidity?: number;         // 0-100 (%)
}

export interface ProbabilityResult {
  probability: number;       // 0-100 (%)
  score: number;            // Debugging: breakdown av beregningen
  canView: boolean;         // Can aurora be seen (daylight check)
  reason?: string;          // Why not viewable (e.g., 'daylight')
  nextViewableTime?: Date;  // Next time aurora is visible
  bestTimeTonight?: Date;   // Best viewing time tonight
  factors: {
    kpIndex: number;        // 0-100 score
    clouds: number;         // 0-100 score (inverted: less clouds = higher)
    temperature: number;    // 0-100 score
    latitude: number;       // 0-100 score
    moonFactor: number;     // 0-100 score
  };
}

/**
 * Hovedfunksjon for sannsynlighetsberegning
 */
export function calculateAuroraProbability(inputs: AuroraInputs): ProbabilityResult {
  const date = inputs.date || new Date();

  // Calculate best time tonight ALWAYS (not just during daylight)
  const bestTime = inputs.longitude !== undefined
    ? getBestAuroraTimeTonight(inputs.latitude, inputs.longitude, date)
    : undefined;

  // Check daylight conditions first (if longitude provided)
  if (inputs.longitude !== undefined) {
    const isDark = canSeeAurora(inputs.latitude, inputs.longitude, date);

    if (!isDark) {
      // Too bright to see aurora
      const nextTime = getNextAuroraTime(inputs.latitude, inputs.longitude, date);

      return {
        probability: 0,
        score: 0,
        canView: false,
        reason: 'daylight',
        nextViewableTime: nextTime || undefined,
        bestTimeTonight: bestTime || undefined,
        factors: {
          kpIndex: 0,
          clouds: 0,
          temperature: 0,
          latitude: 0,
          moonFactor: 0,
        },
      };
    }
  }

  // 1. KP-Index faktor (40% vekt)
  const kpScore = Math.min(100, (inputs.kpIndex / 9) * 100);

  // 2. Sky/Cloud + Fog cover faktor (35% vekt)
  // Combine cloud and fog coverage - take worst case since both block aurora visibility
  const totalObstruction = Math.max(inputs.cloudCoverage, inputs.fogCoverage ?? 0);

  // Mer aggressiv straff for obstructions siden det er avgjørende for å se nordlys
  const cloudScore = totalObstruction < 30 ? 100 :
                     totalObstruction < 50 ? 80 :
                     totalObstruction < 70 ? 40 :
                     totalObstruction < 90 ? 15 : 0;

  // 3. Temperatur faktor (10% vekt) - kaldere = bedre (less atmospheric activity)
  const tempScore = inputs.temperature < -10 ? 100 :
                    inputs.temperature < 0 ? 80 :
                    inputs.temperature < 10 ? 50 : 20;

  // 4. Breddegrad faktor (10% vekt) - nordligere = bedre
  const latScore = inputs.latitude > 68 ? 100 :
                   inputs.latitude > 66 ? 80 :
                   inputs.latitude > 64 ? 60 : 40;

  // 5. Månelysfaktor (5% vekt) - ny måne = bedre
  const moonScore = inputs.moonPhase
    ? (1 - Math.abs(inputs.moonPhase - 0.5) * 2) * 100
    : 50;

  // Vektet gjennomsnitt (oppdatert: skyer viktigere)
  const weightedScore =
    (kpScore * 0.40) +
    (cloudScore * 0.35) +
    (tempScore * 0.10) +
    (latScore * 0.10) +
    (moonScore * 0.05);

  // BLOCKING FACTOR: Sky/tåke blokkerer nordlys fullstendig
  // Uavhengig av KP, breddegrad osv - umulig å se nordlys gjennom tette skyer eller tåke
  let finalScore = weightedScore;
  if (totalObstruction >= 98) {
    // Nesten 100% obstruksjon = ingen mulighet
    finalScore = 0;
  } else if (totalObstruction >= 95) {
    // 95-97% obstruksjon = maksimalt 2% sjanse (ekstremt lite gap)
    finalScore = Math.min(finalScore, 2);
  } else if (totalObstruction >= 85) {
    // 85-94% obstruksjon = maksimalt 5% sjanse (lite gap)
    finalScore = Math.min(finalScore, 5);
  } else if (totalObstruction >= 70) {
    // 70-84% obstruksjon = maksimalt 15% sjanse
    finalScore = Math.min(finalScore, 15);
  }

  // Normaliser til 0-100
  const probability = Math.round(Math.max(0, Math.min(100, finalScore)));

  return {
    probability,
    score: Math.round(weightedScore * 100) / 100,
    canView: true,
    bestTimeTonight: bestTime || undefined,
    factors: {
      kpIndex: Math.round(kpScore),
      clouds: Math.round(cloudScore),
      temperature: Math.round(tempScore),
      latitude: Math.round(latScore),
      moonFactor: Math.round(moonScore),
    },
  };
}

/**
 * Enkel versjon hvis du bare har KP-index
 */
export function calculateSimpleProbability(kpIndex: number): number {
  // KP 0-3: 5-20%
  // KP 4-5: 30-50%
  // KP 6-7: 60-80%
  // KP 8-9: 85-100%

  if (kpIndex <= 3) return 10 + (kpIndex * 3);
  if (kpIndex <= 5) return 20 + ((kpIndex - 3) * 10);
  if (kpIndex <= 7) return 40 + ((kpIndex - 5) * 10);
  return 60 + ((kpIndex - 7) * 15);
}

export function getProbabilityDescription(probability: number): string {
  if (probability >= 80) return 'Utmerket';
  if (probability >= 60) return 'Gode forhold';
  if (probability >= 40) return 'Moderate';
  if (probability >= 20) return 'Dårlige';
  return 'Svak sjanse';
}

/**
 * Get activity level description based on KP index
 */
export function getActivityLevel(kp: number): { emoji: string; description: string } {
  if (kp >= 7) return { emoji: '🔴', description: 'Ekstrem aktivitet' };
  if (kp >= 6) return { emoji: '🟠', description: 'Høy aktivitet' };
  if (kp >= 5) return { emoji: '🟡', description: 'Moderat aktivitet' };
  if (kp >= 3) return { emoji: '🟢', description: 'Lav aktivitet' };
  return { emoji: '⚪', description: 'Svært lav aktivitet' };
}

