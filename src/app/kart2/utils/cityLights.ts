'use client';

type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Point, { tier: 'dim' | 'medium' | 'bright' }>;

/**
 * Deterministic RNG (Mulberry32) - no external deps.
 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>) {
  // Ray-casting algorithm. point/polygon are [lon, lat].
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Box–Muller transform to approximate gaussian noise.
 */
function gaussian(rng: () => number) {
  // Avoid log(0)
  const u1 = clamp(rng(), 1e-9, 1);
  const u2 = clamp(rng(), 1e-9, 1);
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

function samplePointInPolygon(
  rng: () => number,
  polygon: Array<[number, number]>,
  spreadLon: number,
  spreadLat: number,
  center: readonly [number, number],
  maxAttempts = 40
): [number, number] {
  for (let a = 0; a < maxAttempts; a++) {
    const gx = gaussian(rng);
    const gy = gaussian(rng);
    const lon = center[0] + gx * spreadLon;
    const lat = center[1] + gy * spreadLat;
    const p: [number, number] = [lon, lat];
    if (pointInPolygon(p, polygon)) return p;
  }
  return [center[0], center[1]];
}

/**
 * Generates ~120-150 deterministic point lights clustered around Tromsø.
 * No per-frame JS. Stable between reloads.
 *
 * Tiers:
 * - bright: city core (dense)
 * - medium: surrounding neighborhoods/secondary clusters
 * - dim: sparse outskirts
 */
export function generateTromsoCityLights(seed = 1337): FeatureCollection {
  const rng = mulberry32(seed);

  // Approximate land polygons around Tromsø (lon/lat) to keep lights off the sea.
  // Intentionally simple silhouettes for cinematic "airplane view".
  const TROMSOYA: Array<[number, number]> = [
    [18.885, 69.695],
    [18.945, 69.710],
    [19.020, 69.700],
    [19.045, 69.670],
    [19.020, 69.625],
    [18.950, 69.600],
    [18.900, 69.620],
    [18.875, 69.655],
  ];
  const KVALOYA: Array<[number, number]> = [
    [18.620, 69.770],
    [18.800, 69.800],
    [19.010, 69.770],
    [19.060, 69.700],
    [18.980, 69.620],
    [18.800, 69.590],
    [18.650, 69.610],
    [18.560, 69.680],
  ];
  const FASTLAND_TROMSDALEN: Array<[number, number]> = [
    [19.000, 69.740],
    [19.220, 69.720],
    [19.280, 69.660],
    [19.260, 69.570],
    [19.130, 69.520],
    [18.980, 69.550],
    [18.960, 69.640],
  ];

  // Tromsø-centric clusters (lon, lat)
  const clusters = [
    // Tromsøya coverage (multiple sub-centers to cover most of the island)
    { center: [18.955, 69.649] as const, polygon: TROMSOYA, count: 110, spreadLon: 0.020, spreadLat: 0.012, tierBias: 'bright' as const }, // sentrum
    { center: [18.940, 69.690] as const, polygon: TROMSOYA, count: 55, spreadLon: 0.020, spreadLat: 0.012, tierBias: 'medium' as const }, // north
    { center: [18.980, 69.670] as const, polygon: TROMSOYA, count: 45, spreadLon: 0.020, spreadLat: 0.012, tierBias: 'medium' as const }, // east
    { center: [18.920, 69.635] as const, polygon: TROMSOYA, count: 45, spreadLon: 0.020, spreadLat: 0.012, tierBias: 'dim' as const },    // south-west
    // Tromsdalen (east)
    { center: [19.060, 69.655] as const, polygon: FASTLAND_TROMSDALEN, count: 55, spreadLon: 0.032, spreadLat: 0.018, tierBias: 'medium' as const },
    // Kvaløya (west)
    { center: [18.780, 69.675] as const, polygon: KVALOYA, count: 50, spreadLon: 0.045, spreadLat: 0.024, tierBias: 'medium' as const },
    // Fastlandet (south-east-ish)
    { center: [19.140, 69.595] as const, polygon: FASTLAND_TROMSDALEN, count: 25, spreadLon: 0.050, spreadLat: 0.028, tierBias: 'dim' as const },
    // Outer scattered points (still constrained to land polygons)
    { center: [18.900, 69.680] as const, polygon: KVALOYA, count: 25, spreadLon: 0.080, spreadLat: 0.050, tierBias: 'dim' as const },
    { center: [19.080, 69.640] as const, polygon: FASTLAND_TROMSDALEN, count: 25, spreadLon: 0.070, spreadLat: 0.045, tierBias: 'dim' as const },
  ];

  const features: FeatureCollection['features'] = [];

  const pickTier = (bias: 'bright' | 'medium' | 'dim', distNorm: number) => {
    // distNorm ~ 0..1 where 0 is cluster center
    // Bias pushes distribution but distance still matters.
    const r = rng();

    // Stronger tier near center
    const near = clamp(1.0 - distNorm, 0, 1);
    const brightChanceBase = bias === 'bright' ? 0.55 : bias === 'medium' ? 0.25 : 0.12;
    const mediumChanceBase = bias === 'bright' ? 0.35 : bias === 'medium' ? 0.55 : 0.40;
    const dimChanceBase = 1.0 - (brightChanceBase + mediumChanceBase);

    const brightChance = clamp(brightChanceBase * (0.6 + 0.9 * near), 0.05, 0.75);
    const mediumChance = clamp(mediumChanceBase * (0.7 + 0.6 * near), 0.10, 0.80);
    const dimChance = clamp(dimChanceBase + (1.0 - near) * 0.35, 0.10, 0.95);

    const sum = brightChance + mediumChance + dimChance;
    const b = brightChance / sum;
    const m = mediumChance / sum;

    if (r < b) return 'bright' as const;
    if (r < b + m) return 'medium' as const;
    return 'dim' as const;
  };

  for (const c of clusters) {
    for (let i = 0; i < c.count; i++) {
      const [lon, lat] = samplePointInPolygon(rng, c.polygon, c.spreadLon, c.spreadLat, c.center);

      // Normalized distance used for tier selection (approx, based on local spread)
      const dx = (lon - c.center[0]) / (c.spreadLon || 1);
      const dy = (lat - c.center[1]) / (c.spreadLat || 1);
      const distNorm = clamp(Math.sqrt(dx * dx + dy * dy) / 3.0, 0, 1);
      const tier = pickTier(c.tierBias, distNorm);

      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lon, lat],
        },
        properties: { tier },
      });
    }
  }

  // Keep count in spec range (~120-150)
  // clusters total: 110 + 55 + 45 + 45 + 55 + 50 + 25 + 25 + 25 = 415
  return {
    type: 'FeatureCollection',
    features,
  };
}


