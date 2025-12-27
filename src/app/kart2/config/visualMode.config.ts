/**
 * Visual Mode 3D Aurora Configuration
 * 
 * Centralized configuration for realistic aurora simulation.
 * All tunable parameters for physics, aesthetics, and performance.
 */

export const VISUAL_MODE_CONFIG = {
  // ===== 3D RENDERING PARAMETERS =====
  
  /** Number of altitude layers to ray-march through (desktop) */
  rayMarchLayers: 6, // Reduced from 8 for clearer band separation
  
  /** Number of altitude layers for mobile devices */
  rayMarchLayersMobile: 3, // Reduced from 4 for performance and clearer bands
  
  /** Minimum aurora altitude in kilometers */
  altitudeMin: 80,
  
  /** Maximum aurora altitude in kilometers */
  altitudeMax: 300,
  
  /** Primary aurora band altitude (brightest green) in kilometers */
  altitudePrimary: 120,
  
  // ===== COLOR PARAMETERS (RGB) =====
  // Based on atmospheric emission wavelengths
  
  /** Low altitude color (80-100km): Blue-purple (427.8nm N2+ emission) */
  colorLow: [0.4, 0.2, 0.8] as [number, number, number],
  
  /** Mid altitude color (100-150km): Bright green (557.7nm O emission) */
  colorMid: [0.2, 1.0, 0.3] as [number, number, number],
  
  /** High altitude color (200-300km): Red (630.0nm O emission) */
  colorHigh: [1.0, 0.2, 0.2] as [number, number, number],
  
  /** Tromsø focal glow color (warm gold) */
  colorTromsoGlow: [1.0, 0.8, 0.0] as [number, number, number],
  
  // ===== CURTAIN STRUCTURE =====
  
  /** Base curtain density (affects spacing between curtain bands) */
  curtainDensityBase: 1.0,
  
  /** Curtain edge sharpness (0.0=soft glow, 1.0=sharp edges) */
  curtainSharpness: 0.6, // Increased from 0.4 for sharper, more defined bands
  
  /** Threshold for curtain visibility (smoothstep lower bound) */
  curtainThresholdLow: 0.3,
  
  /** Threshold for curtain brightness (smoothstep upper bound) */
  curtainThresholdHigh: 0.7,
  
  // ===== NOISE PARAMETERS =====
  
  /** Number of noise octaves for detail (desktop) */
  noiseOctaves: 2, // Reduced from 3 for clearer curtain structure
  
  /** Number of noise octaves for mobile */
  noiseOctavesMobile: 2,
  
  /** Base noise frequency (controls curtain width) */
  noiseFrequency: 3.0,
  
  /** Octave frequency multiplier */
  noiseFrequencyMultiplier: 2.0,
  
  /** Octave amplitude decay */
  noiseAmplitudeDecay: 0.5,
  
  // ===== MOTION PARAMETERS =====
  
  /** Base motion speed multiplier */
  motionSpeedBase: 0.8,
  
  /** Vertical wave frequency (curtain undulation) */
  verticalWaveFreq: 0.0003,
  
  /** Horizontal drift speed (east-west motion) */
  horizontalDriftSpeed: 0.00001,
  
  /** Pulsing frequency (brightness variation) */
  pulseFrequency: 0.0005,
  
  /** Pulse amplitude (0.0-1.0) */
  pulseAmplitude: 0.3,
  
  /** Shimmer frequency (high-frequency flicker at edges) */
  shimmerFrequency: 0.003,
  
  /** Shimmer amplitude */
  shimmerAmplitude: 0.1,
  
  // ===== PARALLAX & DEPTH =====
  
  /** Parallax strength (0.0=flat 2D, 1.0=full 3D depth) */
  parallaxStrength: 0.7,
  
  /** Parallax scale factor (controls depth displacement) */
  parallaxScale: 0.0001,
  
  /** Depth factor for layer blending */
  depthFactor: 0.7,
  
  // ===== MAGNETIC FIELD =====
  
  /** Magnetic north direction (normalized vec2) */
  magneticNorth: [0.0, 1.0] as [number, number],
  
  /** Magnetic field curvature factor */
  magneticCurvature: 0.0001,
  
  /** Field line compression (affects curtain alignment) */
  fieldCompression: 0.3,
  
  // ===== INTENSITY & VISIBILITY =====
  
  /** KP weight in intensity formula */
  intensityKpWeight: 0.7,  // Increased from 0.5 for stronger effect

  /** Probability weight in intensity formula */
  intensityProbabilityWeight: 0.35,  // Increased from 0.25
  
  /** Minimum intensity threshold (below this, aurora not rendered) */
  intensityMinThreshold: 0.05,
  
  /** Alpha tuning multiplier (global transparency) */
  alphaTune: 0.75,  // Increased from 0.55 for more visible colors

  /** Layer alpha contribution */
  layerAlpha: 0.25,  // Increased from 0.15
  
  /** Cloud coverage impact multiplier */
  cloudImpact: 0.2,
  
  // ===== PERFORMANCE =====
  
  /** FPS threshold for quality downgrade */
  lowFpsThreshold: 15,
  
  /** Target FPS for desktop */
  targetFpsDesktop: 60,
  
  /** Target FPS for mobile */
  targetFpsMobile: 30,
  
  /** Device pixel ratio cap */
  maxDevicePixelRatio: 1.5,
  
  /** Map zoom threshold for LOD (below this, reduce quality) */
  lodZoomThreshold: 6.0,
  
  /** Quality scale at minimum zoom */
  lodQualityMin: 0.5,
  
  // ===== CAMERA & OBSERVER =====
  
  /** Observer altitude (ground level) in kilometers */
  cameraAltitude: 0.0,
  
  /** Altitude scale factor (vertical exaggeration for visibility) */
  altitudeScale: 1.0,
  
  /** Ground fade start (screen-space y coordinate) */
  groundFadeStart: 0.05,
  
  /** Ground fade end (screen-space y coordinate) */
  groundFadeEnd: 0.45,
  
  // ===== TROMSØ GLOW (legacy, reduced in 3D mode) =====
  
  /** Tromsø glow radius */
  tromsoGlowRadius: 1.6,
  
  /** Tromsø glow intensity multiplier */
  tromsoGlowIntensity: 4.5,
  
  /** Tromsø glow pulse frequency */
  tromsoGlowPulseFreq: 0.002,
  
} as const;

/**
 * Get quality-adjusted parameters based on device capabilities
 */
export function getQualityConfig(isMobile: boolean, zoom: number) {
  const config = VISUAL_MODE_CONFIG;
  
  // Base quality tier
  const layers = isMobile ? config.rayMarchLayersMobile : config.rayMarchLayers;
  const octaves = isMobile ? config.noiseOctavesMobile : config.noiseOctaves;
  
  // LOD based on zoom level
  const lodScale = zoom < config.lodZoomThreshold 
    ? Math.max(config.lodQualityMin, zoom / config.lodZoomThreshold)
    : 1.0;
  
  return {
    layers: Math.max(2, Math.floor(layers * lodScale)),
    octaves: Math.max(1, Math.floor(octaves * lodScale)),
    qualityScale: lodScale,
  };
}

/**
 * Calculate aurora intensity from KP and probability
 */
export function calculateAuroraIntensity(kpIndex: number, probability: number): number {
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
  const config = VISUAL_MODE_CONFIG;
  
  return (
    clamp01(kpIndex / 9) * config.intensityKpWeight +
    clamp01(probability / 100) * config.intensityProbabilityWeight
  );
}

/**
 * Calculate curtain density based on KP index
 * Higher KP = more dense, active aurora
 */
export function calculateCurtainDensity(kpIndex: number): number {
  const config = VISUAL_MODE_CONFIG;
  // Range: 0.5 at KP=0, to 2.0 at KP=9
  return config.curtainDensityBase * (0.5 + (kpIndex / 9) * 1.5);
}

/**
 * Calculate altitude spread based on KP index
 * Higher KP = taller aurora extending to higher altitudes
 */
export function calculateAltitudeSpread(kpIndex: number): number {
  // Range: 1.0 at low KP, to 1.2 at high KP
  return kpIndex > 5 ? 1.2 : 1.0;
}
