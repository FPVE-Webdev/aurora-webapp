const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * WebGL Shaders for Visual Mode - 3D Aurora Simulation
 *
 * ARCHITECTURE:
 * - Vertex shader: fullscreen quad
 * - Fragment shader: 3D ray-marched aurora with altitude-based colors
 *
 * RENDERING TECHNIQUE:
 * - Ray-marching through 8 altitude layers (80-300km)
 * - 3D Simplex noise for organic curtain structures
 * - Vertical curtain geometry aligned with magnetic field
 * - Altitude-based color mapping (blue→green→red)
 * - Parallax depth responding to camera pitch
 *
 * PERFORMANCE:
 * - WebGL 1.0 compatible
 * - Adaptive quality (desktop: 8 layers, mobile: 4 layers)
 * - Early exit optimizations
 */

export const VERTEX_SHADER = `
  precision mediump float;

  attribute vec2 a_position;
  varying vec2 v_uv;

  uniform float u_time;
  uniform float u_auroraIntensity;
  uniform float u_curtainWaveAmplitude;
  uniform float u_curtainWaveFrequency;

  void main() {
    // Convert NDC (-1,1) to UV (0,1) for fragment shader
    v_uv = a_position * 0.5 + 0.5;

    // === AURORA CURTAIN WAVE DISPLACEMENT ===
    // Creates the signature "ribbon" structure of real aurora
    // Multiple sine waves at different frequencies simulate magnetic field lines

    // Primary wave: Main curtain structure (slow, majestic)
    float wave1 = sin(a_position.x * u_curtainWaveFrequency + u_time * 0.00018) * u_curtainWaveAmplitude;

    // Secondary wave: Adds organic complexity (faster, smaller amplitude)
    float wave2 = sin(a_position.x * u_curtainWaveFrequency * 1.7 + u_time * 0.00027) * (u_curtainWaveAmplitude * 0.5);

    // Tertiary wave: Fine detail ripples (highest frequency)
    float wave3 = sin(a_position.x * u_curtainWaveFrequency * 3.2 + u_time * 0.00036) * (u_curtainWaveAmplitude * 0.25);

    // Vertical modulation: curtains strongest in upper atmosphere (where aurora exists)
    // Fade out near bottom (ground) and very top (space)
    float verticalMask = smoothstep(0.4, 0.55, v_uv.y) * smoothstep(0.95, 0.85, v_uv.y);

    // Combine waves with intensity scaling and vertical mask
    float totalDisplacement = (wave1 + wave2 + wave3) * verticalMask * u_auroraIntensity * 1.5;

    // Apply displacement in BOTH X and Y for realistic curtain "flutter"
    vec2 displaced = a_position + vec2(
      totalDisplacement * 0.3,  // Horizontal flutter (curtains sway left/right)
      totalDisplacement         // Vertical ripple (curtains rise/fall)
    );

    gl_Position = vec4(displaced, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision mediump float;

  // ===== VARYING FROM VERTEX SHADER =====
  varying vec2 v_uv;

  // ===== CORE UNIFORMS =====
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_auroraIntensity;
  uniform float u_kpIndex;            // Raw KP index (0-9) for color shift
  uniform vec2 u_tromsoCenter;        // Screen-space coords [0-1]
  uniform float u_cloudCoverage;      // 0-1
  uniform float u_mapPitch;           // Map pitch normalized (0-1)

  // ===== 3D RENDERING UNIFORMS =====
  uniform float u_cameraAltitude;     // Observer altitude (always 0.0 for ground)
  uniform vec2 u_magneticNorth;       // Magnetic field direction (normalized)
  uniform float u_curtainDensity;     // Curtain spacing (0.5-2.0)
  uniform float u_altitudeScale;      // Vertical exaggeration
  uniform float u_depthFactor;        // 3D depth strength (0-1)

  // ===== VISUAL TUNING UNIFORMS =====
  uniform float u_alphaTune;          // Global alpha multiplier
  uniform float u_glowRadius;         // Tromsø glow radius
  uniform float u_edgeBlend;          // Edge falloff softness
  uniform float u_motionSpeed;        // Motion speed multiplier
  uniform float u_qualityScale;       // LOD quality (0.5-1.0)

  // ===== CLOUD LAYER UNIFORMS =====
  uniform float u_windSpeed;          // m/s (0-30 typical)
  uniform float u_windDirection;      // Degrees (0=N, 90=E, 180=S, 270=W)
  uniform float u_weatherType;        // Encoded: 0=clear, 1=fair, 2=cloudy, 3=rain, 4=snow, 5=fog
  uniform float u_precipitation;      // 0-10mm

  // ===== TOGGLE CONTROLS =====
  uniform float u_auroraEnabled;      // 1.0 = aurora on, 0.0 = aurora off
  uniform float u_weatherEnabled;     // 1.0 = weather on, 0.0 = weather off

  // ===== VERTICAL ZONE BOUNDARIES =====
  // CLOUD LAYER PLACEMENT – AT HORIZON LINE (above mountains)
  // Assumptions: uv.y = 0.0 (near user), uv.y = 1.0 (far horizon/sky)
  const float CLOUD_BOTTOM  = 0.40; // Cloud layer starts (above mountains)
  const float CLOUD_TOP     = 0.60; // Cloud layer ends (at horizon line)
  const float AURORA_BOTTOM = 0.60; // Aurora ABOVE cloud layer (in sky)
  const float AURORA_TOP    = 0.92; // Aurora band top (higher in sky)

  // ===== 3D SIMPLEX NOISE IMPLEMENTATION =====
  // Based on Stefan Gustavson's implementation
  // https://github.com/ashima/webgl-noise

  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x * 34.0) + 1.0) * x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    float n_ = 0.142857142857; // 1.0 / 7.0
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalize gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }

  // ===== ALTITUDE-BASED COLOR MAPPING WITH KP-DRIVEN SHIFT =====
  // Scientific aurora colors based on atmospheric emission wavelengths
  // KP INDEX INFLUENCE: Low KP = Green dominant, High KP = Purple/Red dominant

  vec3 getAuroraColor(float altitude, float intensity) {
    // KP-driven base color shift
    // Low KP (0-3): Green dominant (common aurora)
    // Mid KP (4-6): Green-Cyan mix (moderate activity)
    // High KP (7-9): Purple-Red dominant (storm aurora)

    float kpFactor = clamp(u_kpIndex / 9.0, 0.0, 1.0);

    // LOW KP PALETTE (Teal/Cyan aurora - matching reference image)
    vec3 colorLowKP_Low = vec3(0.20, 1.0, 0.75);    // Teal #33ffbf
    vec3 colorLowKP_Mid = vec3(0.25, 0.95, 1.0);    // Bright cyan #40f2ff
    vec3 colorLowKP_High = vec3(0.30, 0.85, 0.98);  // Light cyan

    // HIGH KP PALETTE (Purple-Red aurora - geomagnetic storm)
    vec3 colorHighKP_Low = vec3(0.78, 0.36, 1.0);   // Purple #c75cff
    vec3 colorHighKP_Mid = vec3(1.0, 0.24, 0.62);   // Magenta-Red #ff3d9e
    vec3 colorHighKP_High = vec3(1.0, 0.50, 0.70);  // Pink

    // Interpolate palettes based on KP index
    vec3 colorLow = mix(colorLowKP_Low, colorHighKP_Low, kpFactor);
    vec3 colorMid = mix(colorLowKP_Mid, colorHighKP_Mid, kpFactor);
    vec3 colorHigh = mix(colorLowKP_High, colorHighKP_High, kpFactor);

    // Altitude-based color transitions (same structure, KP-shifted colors)
    if (altitude < 120.0) {
      // Transition from low to mid altitude colors (80-120km)
      float t = (altitude - 80.0) / 40.0;
      return mix(colorLow, colorMid, smoothstep(0.0, 1.0, t));
    } else {
      // Transition from mid to high altitude colors (120-300km)
      float t = (altitude - 120.0) / 180.0;
      return mix(colorMid, colorHigh, smoothstep(0.0, 1.0, t));
    }
  }

  // ===== CLOUD LAYER RENDERING =====
  // Realistic static cloud bank at horizon
  // Uses simple layered noise for natural cloud formations

  float sampleCloudLayer(vec2 uv, float time) {
    // Very slow drift for nearly static cloud cover
    vec2 windVector = vec2(
      sin(u_windDirection * 0.01745),  // degrees to radians
      cos(u_windDirection * 0.01745)
    );
    vec2 drift = windVector * u_windSpeed * time * 0.00000015; // Minimal drift

    // Cloud sampling UV
    vec2 cloudUV = uv + drift;

    // Large-scale cloud formations (scale=2.5 for realistic cloud sizes)
    vec3 pos1 = vec3(cloudUV * 2.5, time * 0.00001);
    float cloud1 = snoise(pos1) * 0.5 + 0.5;

    // Medium detail layer
    vec3 pos2 = vec3(cloudUV * 5.5, time * 0.000015);
    float cloud2 = snoise(pos2) * 0.3 + 0.5;

    // Combine layers
    float cloudDensity = cloud1 * 0.7 + cloud2 * 0.3;

    // Shape into realistic formations
    cloudDensity = smoothstep(0.3, 0.7, cloudDensity);

    // Weather type modulation
    if (u_weatherType >= 3.0) {
      cloudDensity *= 1.3; // Denser for rain/snow
    } else if (u_weatherType >= 2.0) {
      cloudDensity *= 1.1; // Medium for cloudy
    } else {
      cloudDensity *= 0.6; // Lighter for clear/fair
    }

    return cloudDensity;
  }

  // ===== CLOUD COLOR =====
  vec3 getCloudColor(float altitude, float density) {
    // Base cloud colors
    vec3 cloudWhite = vec3(0.95, 0.95, 0.98);     // High white
    vec3 cloudGray = vec3(0.6, 0.62, 0.65);       // Mid gray
    vec3 cloudDark = vec3(0.25, 0.27, 0.30);      // Dark storm

    // Weather-dependent color
    vec3 baseColor;
    if (u_weatherType >= 3.0) {
      // Rain/snow: dark storm clouds
      baseColor = mix(cloudDark, cloudGray, density * 0.5);
    } else if (u_weatherType >= 2.0) {
      // Cloudy: gray clouds
      baseColor = mix(cloudGray, cloudWhite, density * 0.7);
    } else {
      // Clear/fair: white wispy clouds
      baseColor = cloudWhite;
    }

    // Altitude-based shading (lower = darker due to aurora glow above)
    float altitudeFactor = altitude / 12.0;
    vec3 auroraGlow = vec3(0.3, 0.9, 0.4) * 0.15;  // Subtle green tint from aurora above
    baseColor = mix(baseColor - auroraGlow, baseColor, altitudeFactor);

    return baseColor;
  }

  // ===== MAGNETIC FIELD COMPUTATION =====

  vec2 getMagneticFieldOffset(vec2 basePos, float altitude) {
    // Simplified magnetic field: vertical curtains with slight curvature
    vec2 toTromso = u_tromsoCenter - basePos;
    
    // Field lines converge slightly toward magnetic pole
    float fieldCurvature = altitude * 0.0001;
    
    // Align primarily north-south with subtle east-west curve
    vec2 fieldDirection = normalize(u_magneticNorth + toTromso * fieldCurvature);
    
    return fieldDirection * 0.3; // Field compression factor
  }

  // ===== WORLD-SPACE TO SCREEN-SPACE PROJECTION =====
  // Projects 3D altitude to screen Y coordinate based on camera pitch

  float projectAltitudeToScreenY(float altitude, float pitch) {
    // Camera at ground level (0km) looking at horizon
    float heightAboveGround = altitude; // km

    // Pitch normalized (0-1) where 1 = 85° (max tilt)
    float pitchRadians = pitch * 1.48353; // 85° in radians

    // Viewing angle: tan(pitch) gives vertical "reach" of view
    float viewAngle = tan(pitchRadians);

    // Distance to horizon at sea level ≈ 4.7km at Tromsø latitude
    // At max tilt (85°), we see ~200km ahead
    float horizonDistance = 4.7 + (viewAngle * 50.0);

    // Altitude projection: higher altitude = higher on screen
    // Uses atmospheric perspective formula
    float apparentHeight = heightAboveGround / (horizonDistance + heightAboveGround * 0.01);

    // Map to screen space: 0.0 (horizon) to 1.0 (zenith)
    // Horizon starts at ~40% screen height when pitched
    float screenY = 0.40 + (apparentHeight * 0.55);

    return clamp(screenY, 0.0, 1.0);
  }

  // ===== PARALLAX COMPUTATION =====

  vec2 computeParallax(vec2 uv, float altitude, float pitch) {
    // Virtual camera at ground level looking up
    float heightDiff = altitude - u_cameraAltitude;

    // Convert pitch to radians (0-85 degrees)
    float pitchRadians = pitch * 1.48353; // 85° in radians

    // Calculate viewing angle effects
    float viewAngle = tan(pitchRadians);

    // Vertical displacement: higher altitudes appear higher in screen space
    float verticalShift = viewAngle * heightDiff * 0.0002; // Increased from 0.00015

    // Horizontal depth: when tilted, we see "into" the aurora volume
    // Objects at higher altitude appear to recede horizontally from center
    vec2 toCenter = uv - u_tromsoCenter;
    float horizontalDepth = length(toCenter) * viewAngle * heightDiff * 0.0001; // Increased

    // Combine vertical lift with horizontal depth perspective
    vec2 parallaxOffset = vec2(
      toCenter.x * horizontalDepth * 0.5, // Perspective compression toward horizon
      verticalShift // Vertical lift
    );

    return parallaxOffset * u_depthFactor;
  }

  // ===== CURTAIN SAMPLING WITH 3D NOISE =====

  float sampleCurtain(vec2 uv, float altitude, float time, float pitch) {
    // Center aurora sampling around Tromsø (offset from center for geographic accuracy)
    // Use a small offset rather than direct subtraction to keep aurora visible
    vec2 offset = (u_tromsoCenter - vec2(0.5, 0.5)) * 0.3; // 30% influence
    vec2 centeredUV = uv - offset;

    // 3D position for noise sampling
    // When viewing from side, adjust sampling to show curtain depth
    float depthFactor = mix(1.0, 1.5, pitch); // Stretch curtains when tilted

    vec3 pos = vec3(
      centeredUV.x * 3.0 * u_curtainDensity,
      centeredUV.y * 2.0 * depthFactor,
      altitude * 0.01
    );
    
    // CINEMATIC motion: slow, fluid drift along magnetic field
    // Different altitudes drift at different speeds (higher = slower, more majestic)
    float altitudeFactor = 1.0 - (altitude / 300.0) * 0.6; // More variation by altitude
    float timeOffset = time * 0.000009 * u_motionSpeed * altitudeFactor; // 30% speed reduction
    pos.z += timeOffset;

    // Gentle horizontal drift (east-west) - smooth, continuous
    pos.x += time * 0.0000024 * u_motionSpeed; // 30% speed reduction
    
    // Multi-octave noise for detail
    float n = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    
    // Quality-based octave count (2 for desktop, 1-2 for mobile - clearer band structure)
    int octaves = int(2.0 * u_qualityScale);
    if (octaves < 1) octaves = 1;
    
    for (int i = 0; i < 3; i++) {
      if (i >= octaves) break;
      n += snoise(pos * frequency) * amplitude;
      frequency *= 2.0;
      amplitude *= 0.5;
    }
    
    // Gentle vertical wave motion (elegant curtain undulation)
    // Slow, smooth waves - no jitter
    float wave = sin(time * 0.000054 * u_motionSpeed + uv.x * 4.0) * 0.5; // 30% speed reduction
    n += wave * 0.15; // Reduced amplitude for smoothness
    
    // Shape into vertical curtains with sharp edges
    float curtain = smoothstep(0.4, 0.65, n * 0.5 + 0.5); // Sharper thresholds for clearer bands
    
    return curtain;
  }

  // ===== MOVEMENT & ANIMATION =====

  float getPulse(float time) {
    // Slow pulsing brightness (3-5 second cycle)
    return sin(time * 0.00015) * 0.3 + 0.7; // 30% speed reduction
  }

  float getShimmer(float time, vec2 uv) {
    // High-frequency shimmer at curtain edges
    return sin(time * 0.0009 * u_motionSpeed + uv.x * 5.0) * 0.1 + 0.9; // 30% speed reduction
  }

  float getTromsoPulse(float time) {
    // Slow 6-8 second pulse (7s average)
    // Baseline: 0.3, Peak: 1.0
    float cycle = sin(time * 0.000042858) * 0.35 + 0.65; // 30% speed reduction
    return cycle;
  }

  float getAuroraCyclePhase(float time) {
    // CINEMATIC aurora cycle: 35 second period with smooth, natural rhythm
    // Returns: phase multiplier (0.3 calm → 1.0 peak)
    float cycleDuration = 35000.0; // 35 seconds (natural, slow)
    float cycleTime = mod(time, cycleDuration);
    float t = cycleTime / cycleDuration; // 0.0 to 1.0

    // Phase timing (smooth, cinematic):
    // 0.0 - 0.5: Calm phase (0.3 intensity, gentle breathing)
    // 0.5 - 0.6: Build-up (0.3 → 1.0, gradual increase)
    // 0.6 - 0.75: Peak (1.0 intensity, sustained glow)
    // 0.75 - 1.0: Return to calm (1.0 → 0.3, gentle fade)

    float intensity;
    if (t < 0.5) {
      // Long calm phase with gentle breathing
      float breathCycle = sin(t * 12.566) * 0.08; // Subtle ±8% variation
      intensity = 0.3 + breathCycle;
    } else if (t < 0.6) {
      // Smooth build-up phase (10% of cycle)
      float buildT = (t - 0.5) / 0.1;
      intensity = mix(0.3, 1.0, smoothstep(0.0, 1.0, buildT));
    } else if (t < 0.75) {
      // Peak phase with shimmer (±10% variation)
      float peakT = (t - 0.6) / 0.15;
      float shimmer = sin(peakT * 25.132) * 0.1; // Subtle shimmer
      intensity = 1.0 + shimmer;
    } else {
      // Gentle return to calm
      float returnT = (t - 0.75) / 0.25;
      intensity = mix(1.0, 0.3, smoothstep(0.0, 1.0, returnT));
    }

    return intensity;
  }

  // ===== MAIN RAY-MARCHING RENDERER =====

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Early exit: skip rendering if intensity too low or below ground
    if (u_auroraIntensity < 0.05 || uv.y < 0.15) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }

    // Map-aware screen-space sky projection
    float pitchFactor = clamp(u_mapPitch, 0.0, 1.0);

    // Adjust sky visibility based on pitch
    // When tilted, more of the screen shows sky
    float skyStart = mix(0.25, 0.10, pitchFactor * 0.7);
    float skyEnd = mix(0.85, 0.95, pitchFactor * 0.5);
    float skyFactor = smoothstep(skyStart, skyEnd, uv.y);
    
    // Virtual camera setup
    float cameraAltitude = u_cameraAltitude; // 0.0 km (ground observer)

    // Aurora cycle phase (40s cycle: calm → build → peak → return) - DECLARE EARLY FOR GLOBAL USE
    float cyclePhase = getAuroraCyclePhase(u_time);
    // Soft baseline pulse for subtle variation
    float baselinePulse = getPulse(u_time) * 0.5 + 0.5; // Softer: 0.5-1.0 range

    // ===== CLOUD LAYER RENDERING – HORIZON CLOUD BANK =====
    vec3 cloudColor = vec3(0.0);
    float cloudAlpha = 0.0;

    // Only render clouds if coverage > 5%
    if (u_cloudCoverage > 0.05 && u_weatherEnabled > 0.5) {
      // Vertical mask - clouds only in their zone (CLOUD_BOTTOM to CLOUD_TOP)
      float cloudMask = smoothstep(CLOUD_BOTTOM - 0.05, CLOUD_BOTTOM + 0.05, uv.y) *
                        smoothstep(CLOUD_TOP + 0.05, CLOUD_TOP - 0.05, uv.y);

      if (cloudMask > 0.01) {
        // Sample cloud density
        float cloudDensity = sampleCloudLayer(uv, u_time);

        // Distance fade (darker towards horizon)
        float distanceFade = smoothstep(CLOUD_BOTTOM, CLOUD_TOP, uv.y);

        // Cloud colors - realistic gray/white gradient
        vec3 cloudNearColor = vec3(0.50, 0.52, 0.55); // Light gray (near)
        vec3 cloudFarColor = vec3(0.15, 0.17, 0.20);  // Dark gray (horizon)

        cloudColor = mix(cloudNearColor, cloudFarColor, distanceFade);

        // Apply cloud coverage from data
        float cloudOpacity = cloudDensity * u_cloudCoverage * cloudMask;

        // Darken distant clouds
        cloudOpacity *= mix(1.0, 0.5, distanceFade);

        cloudAlpha = cloudOpacity * 3.5; // Moderate opacity boost
      }
    }

    // ===== AURORA RENDERING (80-300km) - UPPER SCREEN =====
    // VERTICAL MASK: Aurora above cloud layer
    float minAltitude = 80.0;  // km
    float maxAltitude = 300.0; // km

    // Render aurora SEPARATELY from clouds (proper Z-ordering)
    vec3 auroraColor = vec3(0.0);
    float auroraAlpha = 0.0;

    // === WORLD-SPACE AURORA POSITIONING ===
    // Project 3D altitude (80-300km) to screen Y based on camera pitch
    // This makes aurora stay at correct height regardless of viewing angle

    float auroraBottomScreen = projectAltitudeToScreenY(minAltitude, pitchFactor);
    float auroraTopScreen = projectAltitudeToScreenY(maxAltitude, pitchFactor);

    // Fade in at bottom (80km altitude), fade out at top (300km altitude)
    float auroraVerticalMask = smoothstep(auroraBottomScreen - 0.05, auroraBottomScreen + 0.10, uv.y) *
                               smoothstep(auroraTopScreen + 0.05, auroraTopScreen - 0.15, uv.y);

    // --------------------------------------------------
    // AURORA VIEW MODEL (REVISED)
    // User looks north at aurora over horizon.
    // Aurora moves HORIZONTALLY toward user (right to left drift).
    // No vertical "rising" motion - stays flat above horizon.
    // --------------------------------------------------

    // Horizontal drift direction (toward user from right)
    vec2 auroraTowardUserDir = normalize(vec2(-1.0, 0.0));

    // Motion speed - very slow horizontal drift
    // 85% slower for majestic, slow-moving aurora
    float approachSpeed =
        0.000027 *  // Reduced by 85% (was 0.00018)
        mix(0.7, 1.4, clamp(u_auroraIntensity * 1.5, 0.0, 1.0)) *
        mix(0.8, 1.2, pitchFactor);

    // Quality-based layer count (6 for desktop, 3 for mobile - clearer band separation)
    int layers = int(6.0 * u_qualityScale);
    if (layers < 2) layers = 2;

    // Aurora ray-march loop (cyclePhase and baselinePulse declared earlier)
    for (int i = 0; i < 6; i++) {
      if (i >= layers) break;

      float t = float(i) / float(layers - 1);
      float altitude = mix(minAltitude, maxAltitude, t);

      // Vertical curtain progression: lower bands appear first, upper later
      float bandPhase = float(i) / float(layers - 1);

      // Parallax offset for this altitude layer
      vec2 parallaxOffset = computeParallax(uv, altitude, pitchFactor);

      // --------------------------------------------------
      // Standing aurora curtains moving toward observer
      // --------------------------------------------------

      // Curtains originate slightly LOWER in aurora field
      float verticalOffset = mix(0.18, 0.0, bandPhase);

      vec2 curtainBaseUV = uv + vec2(0.0, verticalOffset);

      // Forward motion toward user (screen-up) - CYCLICAL
      // Use mod() to create infinite loop: curtain approaches, then resets
      float motionCycle = 45000.0; // 45 second cycle (slow, majestic)
      float cyclicTime = mod(u_time, motionCycle);

      vec2 forwardMotion =
          auroraTowardUserDir *
          cyclicTime *
          approachSpeed *
          mix(0.6, 1.3, bandPhase);

      vec2 samplePos =
          curtainBaseUV +
          parallaxOffset +
          forwardMotion;

      // Guard against out-of-bounds sampling
      if (samplePos.x < 0.0 || samplePos.x > 1.0 ||
          samplePos.y < 0.0 || samplePos.y > 1.0) {
        continue;
      }

      // Sample curtain density at this altitude
      float curtainValue = sampleCurtain(samplePos, altitude, u_time, pitchFactor);

      // Apply intensity with dramatic cycle and subtle baseline pulse
      curtainValue *= u_auroraIntensity * 5.0 * cyclePhase; // Cycle modulates base intensity
      curtainValue *= baselinePulse; // Subtle baseline variation

      // Altitude-based intensity falloff (stronger at primary band ~120km)
      float altitudeFalloff = 1.0 - abs(altitude - 120.0) / 180.0;
      altitudeFalloff = max(0.2, altitudeFalloff);
      curtainValue *= altitudeFalloff;

      // === AURORA HORIZONTAL DRIFT (slow, majestic movement) ===
      // Use dynamic world-space projection (not static constants)
      float auroraY = smoothstep(auroraBottomScreen, auroraTopScreen, uv.y);
      float driftSpeed = u_time * 0.0000081; // 85% slower (was 0.000054)
      float driftPhase = uv.x * 14.0 - driftSpeed;

      // Standing vertical curtains with slow horizontal drift
      float verticalBands = sin(driftPhase);
      verticalBands = smoothstep(-0.4, 0.6, verticalBands);

      // Perspective: stronger closer to viewer
      float perspectiveBoost = mix(0.6, 1.35, auroraY);

      curtainValue *= verticalBands * perspectiveBoost;

      // Apply vertical mask to keep aurora in upper zone
      curtainValue *= auroraVerticalMask;

      // Get color for this altitude
      vec3 layerColor = getAuroraColor(altitude, curtainValue);

      // VERTICAL ALPHA GRADIENT - Fade at top/bottom, bright in center
      // Creates the classic "curtain" appearance with natural falloff
      float verticalGradient = smoothstep(0.0, 0.25, v_uv.y) *   // Fade in from bottom
                               smoothstep(1.0, 0.75, v_uv.y);    // Fade out at top

      // Depth-based alpha (layers blend together)
      float layerAlpha = curtainValue * 0.25 * verticalGradient; // Apply vertical gradient

      // Accumulate aurora layers (depth blending)
      auroraColor += layerColor * layerAlpha * (1.0 - auroraAlpha);
      auroraAlpha += layerAlpha * (1.0 - auroraAlpha);

      // Early exit if fully opaque
      if (auroraAlpha >= 0.95) break;
    }

    // ===== TROMSØ FOCAL GLOW (subtle, warm epicenter) =====

    vec2 toTromso = uv - u_tromsoCenter;
    float distToTromso = length(toTromso);

    // VERY subtle warm glow - no hard halo, just gentle warmth
    // Only visible when aurora is active, scales with intensity
    float tromsoGlow = pow(1.0 - clamp(distToTromso, 0.0, 1.0), u_glowRadius * 1.2);
    float tromsoPulse = getTromsoPulse(u_time); // Dedicated 7s pulse cycle
    tromsoGlow *= u_auroraIntensity * 0.8; // Very subtle base
    tromsoGlow *= tromsoPulse * 0.7; // Gentle pulsing
    tromsoGlow *= mix(0.3, 1.0, cyclePhase); // Sync with aurora cycle

    // Warm, natural gold (not harsh yellow)
    vec3 tromsoColor = vec3(1.0, 0.85, 0.5);
    auroraColor += tromsoColor * tromsoGlow * 0.15; // Very subtle contribution
    auroraAlpha += tromsoGlow * 0.1;
    
    // ===== LAYER COMPOSITING (Z-ORDER: Aurora OVER Clouds) =====

    // Apply toggle masks
    vec3 maskedAuroraColor = auroraColor * u_auroraEnabled;
    float maskedAuroraAlpha = auroraAlpha * u_auroraEnabled;

    vec3 maskedCloudColor = cloudColor * u_weatherEnabled;
    float maskedCloudAlpha = cloudAlpha * u_weatherEnabled;

    // === PROPER Z-ORDER COMPOSITING ===
    // Aurora (80-300km) renders OVER clouds (0-12km)
    // Standard alpha blending: Over compositing operator

    // Start with background (transparent black)
    vec3 finalColor = vec3(0.0);
    float finalAlpha = 0.0;

    // 1. Composite clouds first (back layer)
    finalColor = maskedCloudColor;
    finalAlpha = maskedCloudAlpha;

    // 2. Composite aurora OVER clouds (front layer)
    // Standard "over" operator: C_out = C_a + C_b * (1 - alpha_a)
    finalColor = maskedAuroraColor + finalColor * (1.0 - maskedAuroraAlpha);
    finalAlpha = maskedAuroraAlpha + finalAlpha * (1.0 - maskedAuroraAlpha);

    // === ATMOSPHERIC EFFECTS ===

    // Sky visibility boost when pitched (aurora in upper zone)
    float auroraLift = mix(skyFactor * 0.8, skyFactor * 1.6, pitchFactor);
    float sideViewBoost = 1.0 + (pitchFactor * 0.8);
    float skyBoostMask = smoothstep(0.35, 0.50, uv.y); // Only boost upper half
    finalColor *= mix(1.0, auroraLift * sideViewBoost, skyBoostMask);

    // ===== FINAL OUTPUT =====

    finalAlpha = clamp(finalAlpha, 0.0, 0.95) * u_alphaTune;

    gl_FragColor = vec4(finalColor, finalAlpha);
  }
`;

/**
 * Compile a shader
 */
export function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader | null {
  // Validate WebGL context
  if (!gl) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] WebGL context is invalid');
    }
    return null;
  }

  const shader = gl.createShader(type);
  if (!shader) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] Failed to create shader');
    }
    return null;
  }

  // Validate source
  if (!source || typeof source !== 'string') {
    if (!IS_PRODUCTION) {
      console.error('[Shader] Invalid shader source');
    }
    gl.deleteShader(shader);
    return null;
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    const shaderType = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
    const errorMsg = error || 'Unknown compilation error (no details available)';
    if (!IS_PRODUCTION) {
      console.error(`[Shader] ${shaderType} Compilation Error:`, errorMsg);
      console.error(`[Shader] Source length: ${source.length} characters`);
    }
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

/**
 * Create shader program
 */
export function createShaderProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram | null {
  // Validate inputs
  if (!gl) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] WebGL context is invalid');
    }
    return null;
  }

  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  if (!vertexShader) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] Failed to compile vertex shader');
    }
    return null;
  }

  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
  if (!fragmentShader) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] Failed to compile fragment shader');
    }
    gl.deleteShader(vertexShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    if (!IS_PRODUCTION) {
      console.error('[Shader] Failed to create program');
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const linkError = gl.getProgramInfoLog(program);
    if (!IS_PRODUCTION) {
      console.error('[Shader] Link error:', linkError || 'Unknown link error');
    }
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  // Clean up individual shaders after linking (no longer needed)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}
