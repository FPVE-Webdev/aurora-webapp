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
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision mediump float;

  // ===== CORE UNIFORMS =====
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_auroraIntensity;
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

  // ===== ALTITUDE-BASED COLOR MAPPING =====
  // Scientific aurora colors based on atmospheric emission wavelengths

  vec3 getAuroraColor(float altitude, float intensity) {
    // NATURAL POLAR PALETTE (cinematic, non-neon colors)
    // 80-100km:  Subtle violet hints (low alpha)
    // 100-150km: Deep green → cyan (primary band) - #3cff9e / #4ddcff
    // 200-300km: Cyan tones (high altitude)

    vec3 colorLow = vec3(0.48, 0.36, 1.0);   // Subtle violet #7a5cff (hint only)
    vec3 colorMid = vec3(0.24, 1.0, 0.62);   // Deep green-cyan #3cff9e (primary)
    vec3 colorHigh = vec3(0.30, 0.86, 1.0);  // Cyan #4ddcff (high altitude)

    // Smooth, natural transitions between color bands
    if (altitude < 120.0) {
      // Transition from subtle violet to deep green (80-120km)
      float t = (altitude - 80.0) / 40.0;
      return mix(colorLow, colorMid, smoothstep(0.0, 1.0, t));
    } else {
      // Transition from deep green to cyan (120-300km)
      float t = (altitude - 120.0) / 180.0;
      return mix(colorMid, colorHigh, smoothstep(0.0, 1.0, t));
    }
  }

  // ===== CLOUD LAYER SAMPLING =====
  // Clouds exist at 0-12km altitude (beneath aurora at 80-300km)
  // Uses layered noise for realistic cumulus/stratus formations

  float sampleCloudLayer(vec2 uv, float altitude, float time) {
    // Wind-driven drift (default 270° = westerly)
    vec2 windVector = vec2(
      sin(u_windDirection * 0.01745),  // degrees to radians
      cos(u_windDirection * 0.01745)
    );
    vec2 drift = windVector * u_windSpeed * time * 0.0001;

    // 3D position (clouds are low altitude)
    vec3 pos = vec3(
      (uv.x + drift.x) * 2.0,
      (uv.y + drift.y) * 2.0,
      altitude * 0.1
    );

    // Multi-octave noise for cloud texture
    float cloud = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;

    // Weather-type dependent octaves (more complex for storm clouds)
    int octaves = int(mix(2.0, 4.0, u_weatherType / 5.0));

    for (int i = 0; i < 4; i++) {
      if (i >= octaves) break;
      cloud += snoise(pos * frequency) * amplitude;
      frequency *= 2.0;
      amplitude *= 0.5;
    }

    // Shape into cloud formations
    float cloudDensity = smoothstep(0.3, 0.7, cloud * 0.5 + 0.5);

    // Weather-type modulation
    if (u_weatherType >= 3.0) {
      // Rain/snow: darker, denser clouds
      cloudDensity *= 1.3;
    } else if (u_weatherType >= 2.0) {
      // Cloudy: medium density
      cloudDensity *= 1.1;
    } else if (u_weatherType <= 1.0) {
      // Clear/fair: sparse, wispy clouds
      cloudDensity *= 0.6;
    }

    // NON-LINEAR cloud coverage scaling (per user requirement)
    // <40% coverage: thin, aurora visible through clouds
    // 40-70%: gradual increase
    // >70%: thick, blocks aurora completely
    float coverageFactor;
    if (u_cloudCoverage < 0.4) {
      // Thin clouds - subtle
      coverageFactor = u_cloudCoverage * 0.6;  // Max 24% opacity
    } else if (u_cloudCoverage < 0.7) {
      // Moderate clouds - linear ramp
      float t = (u_cloudCoverage - 0.4) / 0.3;
      coverageFactor = mix(0.24, 0.8, t);
    } else {
      // Thick clouds - exponential cutoff blocks aurora
      float excess = (u_cloudCoverage - 0.7) / 0.3;
      coverageFactor = 0.8 + (excess * excess * 0.2);  // 0.8 → 1.0 (exponential)
    }

    cloudDensity *= coverageFactor;

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

  // ===== PARALLAX COMPUTATION =====

  vec2 computeParallax(vec2 uv, float altitude, float pitch) {
    // Virtual camera at ground level looking up
    float heightDiff = altitude - u_cameraAltitude;

    // Convert pitch to radians (0-60 degrees range for better visibility)
    float pitchRadians = pitch * 1.0472; // 60° = π/3 ≈ 1.0472

    // Calculate viewing angle effects
    float viewAngle = tan(pitchRadians);

    // Vertical displacement: higher altitudes appear higher in screen space
    float verticalShift = viewAngle * heightDiff * 0.00015;

    // Horizontal depth: when tilted, we see "into" the aurora volume
    // Objects at higher altitude appear to recede horizontally from center
    vec2 toCenter = uv - u_tromsoCenter;
    float horizontalDepth = length(toCenter) * viewAngle * heightDiff * 0.00008;

    // Combine vertical lift with horizontal depth perspective
    vec2 parallaxOffset = vec2(
      toCenter.x * horizontalDepth * 0.5, // Perspective compression toward horizon
      verticalShift // Vertical lift
    );

    return parallaxOffset * u_depthFactor;
  }

  // ===== CURTAIN SAMPLING WITH 3D NOISE =====

  float sampleCurtain(vec2 uv, float altitude, float time, float pitch) {
    // 3D position for noise sampling
    // When viewing from side, adjust sampling to show curtain depth
    float depthFactor = mix(1.0, 1.5, pitch); // Stretch curtains when tilted

    vec3 pos = vec3(
      uv.x * 3.0 * u_curtainDensity,
      uv.y * 2.0 * depthFactor,
      altitude * 0.01
    );
    
    // CINEMATIC motion: slow, fluid drift along magnetic field
    // Different altitudes drift at different speeds (higher = slower, more majestic)
    float altitudeFactor = 1.0 - (altitude / 300.0) * 0.6; // More variation by altitude
    float timeOffset = time * 0.00003 * u_motionSpeed * altitudeFactor; // Slower base speed
    pos.z += timeOffset;

    // Gentle horizontal drift (east-west) - smooth, continuous
    pos.x += time * 0.000008 * u_motionSpeed; // Slightly slower for fluidity
    
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
    float wave = sin(time * 0.00018 * u_motionSpeed + uv.x * 4.0) * 0.5; // Slower frequency
    n += wave * 0.15; // Reduced amplitude for smoothness
    
    // Shape into vertical curtains with sharp edges
    float curtain = smoothstep(0.4, 0.65, n * 0.5 + 0.5); // Sharper thresholds for clearer bands
    
    return curtain;
  }

  // ===== MOVEMENT & ANIMATION =====

  float getPulse(float time) {
    // Slow pulsing brightness (3-5 second cycle)
    return sin(time * 0.0005) * 0.3 + 0.7;
  }

  float getShimmer(float time, vec2 uv) {
    // High-frequency shimmer at curtain edges
    return sin(time * 0.003 * u_motionSpeed + uv.x * 5.0) * 0.1 + 0.9;
  }

  float getTromsoPulse(float time) {
    // Slow 6-8 second pulse (7s average)
    // Baseline: 0.3, Peak: 1.0
    float cycle = sin(time * 0.00014286) * 0.35 + 0.65; // 7000ms period ≈ 7s
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

    // ===== CLOUD LAYER RENDERING (0-12km) - LOWER SCREEN ZONE =====
    // VERTICAL MASK: Clouds appear in lower 65% of screen (land/weather zone)
    vec3 cloudColor = vec3(0.0);
    float cloudAlpha = 0.0;

    // Only render clouds if coverage > 5%
    if (u_cloudCoverage > 0.05) {
      // Vertical mask: clouds in lower screen (land/horizon zone)
      // Full strength y < 0.45, fade 0.45-0.65, gone y > 0.65
      float cloudVerticalMask = 1.0 - smoothstep(0.45, 0.65, uv.y);

      if (cloudVerticalMask > 0.01) {
        int cloudLayers = int(4.0 * u_qualityScale);  // 4 layers desktop, 2 mobile
        if (cloudLayers < 2) cloudLayers = 2;

        for (int i = 0; i < 4; i++) {
          if (i >= cloudLayers) break;

          float t = float(i) / float(cloudLayers - 1);
          float altitude = mix(0.5, 12.0, t);  // Cloud altitude range 0.5-12km

          // Parallax for cloud layer (much closer than aurora)
          vec2 cloudParallax = computeParallax(uv, altitude, pitchFactor);
          vec2 cloudSamplePos = uv + cloudParallax;

          // Guard against out-of-bounds
          if (cloudSamplePos.x < 0.0 || cloudSamplePos.x > 1.0 ||
              cloudSamplePos.y < 0.0 || cloudSamplePos.y > 1.0) {
            continue;
          }

          // Sample cloud density
          float cloudDensity = sampleCloudLayer(cloudSamplePos, altitude, u_time);

          // Get cloud color
          vec3 layerColor = getCloudColor(altitude, cloudDensity);

          // Layer alpha (clouds are more opaque than aurora)
          float layerAlpha = cloudDensity * 0.4;  // 40% max opacity per layer

          // Accumulate (front-to-back)
          cloudColor += layerColor * layerAlpha * (1.0 - cloudAlpha);
          cloudAlpha += layerAlpha * (1.0 - cloudAlpha);

          if (cloudAlpha >= 0.95) break;
        }

        // Apply vertical mask to keep clouds in lower zone
        cloudColor *= cloudVerticalMask;
        cloudAlpha *= cloudVerticalMask;

        // Ground fade for clouds (bottom edge softness)
        float cloudGroundFade = smoothstep(0.0, 0.25, uv.y);
        cloudColor *= cloudGroundFade;
        cloudAlpha *= cloudGroundFade;
      }
    }

    // ===== AURORA RENDERING (80-300km) - UPPER SCREEN ZONE =====
    // VERTICAL MASK: Aurora appears in upper 55% of screen (sky zone)
    float minAltitude = 80.0;  // km
    float maxAltitude = 300.0; // km

    // Start with cloud base
    vec3 finalColor = cloudColor;
    float finalAlpha = cloudAlpha;

    // CINEMATIC VERTICAL MASK: Aurora strictly in upper 50-55% of screen (sky zone)
    // Fade in 0.45-0.50, full strength y > 0.50
    // This ensures aurora feels like it's above the viewer, never competing with land/UI
    float auroraVerticalMask = smoothstep(0.45, 0.50, uv.y);

    // Quality-based layer count (6 for desktop, 3 for mobile - clearer band separation)
    int layers = int(6.0 * u_qualityScale);
    if (layers < 2) layers = 2;

    // Aurora ray-march loop (cyclePhase and baselinePulse declared earlier)
    for (int i = 0; i < 6; i++) {
      if (i >= layers) break;

      float t = float(i) / float(layers - 1);
      float altitude = mix(minAltitude, maxAltitude, t);

      // Parallax offset for this altitude layer
      vec2 parallaxOffset = computeParallax(uv, altitude, pitchFactor);
      vec2 samplePos = uv + parallaxOffset;

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

      // Screen-space vertical strength: aurora strengthens toward top of screen
      float verticalBoost = smoothstep(0.5, 0.95, uv.y); // Starts at mid-screen, strong at zenith
      verticalBoost = mix(1.0, verticalBoost * 1.8, pitchFactor); // More dramatic when tilted
      curtainValue *= verticalBoost;

      // Apply vertical mask to keep aurora in upper zone
      curtainValue *= auroraVerticalMask;

      // Get color for this altitude
      vec3 layerColor = getAuroraColor(altitude, curtainValue);

      // Depth-based alpha (layers blend together)
      float layerAlpha = curtainValue * 0.25; // Increased from 0.15 to 0.25 for more opacity

      // Accumulate color with depth blending (front-to-back)
      finalColor += layerColor * layerAlpha * (1.0 - finalAlpha);
      finalAlpha += layerAlpha * (1.0 - finalAlpha);

      // Early exit if fully opaque
      if (finalAlpha >= 0.95) break;
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
    finalColor += tromsoColor * tromsoGlow * 0.15; // Very subtle contribution
    finalAlpha += tromsoGlow * 0.1;
    
    // ===== ATMOSPHERIC EFFECTS =====

    // Cloud coverage dimming (subtle, aurora still visible through clouds)
    // Never fully block aurora - clouds drift below, aurora above
    float cloudDim = 1.0 - (u_cloudCoverage * 0.15); // Reduced from 0.2 for subtlety
    // Apply cloud dimming only to aurora portion (not cloud colors)
    vec3 auroraPortion = finalColor - cloudColor;
    auroraPortion *= cloudDim;
    finalColor = cloudColor + auroraPortion;

    // Sky visibility boost when pitched (aurora in upper zone)
    // When pitched, aurora becomes more visible due to better viewing angle
    float auroraLift = mix(skyFactor * 0.8, skyFactor * 1.6, pitchFactor);

    // Boost overall visibility when viewing from side (only in aurora zone y > 0.45)
    float sideViewBoost = 1.0 + (pitchFactor * 0.8);
    float skyBoostMask = smoothstep(0.35, 0.50, uv.y); // Only boost upper half
    finalColor *= mix(1.0, auroraLift * sideViewBoost, skyBoostMask);
    
    // ===== TOGGLE MASKING =====
    // Apply toggle masks to separate aurora and weather layers
    vec3 auroraOnlyColor = finalColor - cloudColor;  // Extract aurora portion

    // Mask aurora based on u_auroraEnabled
    auroraOnlyColor *= u_auroraEnabled;

    // Mask clouds based on u_weatherEnabled
    vec3 maskedCloudColor = cloudColor * u_weatherEnabled;

    // Recombine masked layers
    finalColor = maskedCloudColor + auroraOnlyColor;

    // Adjust alpha based on what's actually visible
    float auroraAlphaContribution = (finalAlpha - cloudAlpha) * u_auroraEnabled;
    float cloudAlphaContribution = cloudAlpha * u_weatherEnabled;
    finalAlpha = cloudAlphaContribution + auroraAlphaContribution;

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
