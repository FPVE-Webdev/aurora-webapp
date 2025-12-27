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
    // Color bands (in kilometers)
    // 80-100km:  Blue-purple (N2+ 427.8nm)
    // 100-150km: Bright green (O 557.7nm) - primary band
    // 200-300km: Red (O 630.0nm) - high altitude

    vec3 colorLow = vec3(0.6, 0.3, 1.0);     // Vibrant blue-purple (stronger)
    vec3 colorMid = vec3(0.3, 1.0, 0.4);     // Bright vivid green (more saturated)
    vec3 colorHigh = vec3(1.0, 0.3, 0.3);    // Bright red (more visible)

    // Smooth transitions between color bands
    if (altitude < 120.0) {
      // Transition from blue to green (80-120km)
      float t = (altitude - 80.0) / 40.0;
      return mix(colorLow, colorMid, smoothstep(0.0, 1.0, t));
    } else {
      // Transition from green to red (120-300km)
      float t = (altitude - 120.0) / 180.0;
      return mix(colorMid, colorHigh, smoothstep(0.0, 1.0, t));
    }
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
    
    // Time-based motion along magnetic field
    // Different altitudes drift at different speeds (higher = slower)
    float altitudeFactor = 1.0 - (altitude / 300.0) * 0.5;
    float timeOffset = time * 0.00005 * u_motionSpeed * altitudeFactor;
    pos.z += timeOffset;
    
    // Horizontal drift (east-west)
    pos.x += time * 0.00001 * u_motionSpeed;
    
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
    
    // Vertical wave motion (curtains undulate)
    float wave = sin(time * 0.0003 * u_motionSpeed + uv.x * 5.0) * 0.5;
    n += wave * 0.2;
    
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
    // Aurora cycle: ~40 second period with distinct phases
    // Returns: phase multiplier (0.2 calm → 1.0 peak)
    float cycleDuration = 40000.0; // 40 seconds
    float cycleTime = mod(time, cycleDuration);
    float t = cycleTime / cycleDuration; // 0.0 to 1.0

    // Phase timing:
    // 0.0 - 0.4: Calm (0.2 intensity)
    // 0.4 - 0.5: Build-up (0.2 → 1.0)
    // 0.5 - 0.7: Peak (1.0 intensity, 8 seconds)
    // 0.7 - 1.0: Return to calm (1.0 → 0.2)

    float intensity;
    if (t < 0.4) {
      // Calm phase with subtle variation
      intensity = 0.2 + sin(t * 15.708) * 0.05;
    } else if (t < 0.5) {
      // Build-up phase
      float buildT = (t - 0.4) / 0.1;
      intensity = mix(0.2, 1.0, smoothstep(0.0, 1.0, buildT));
    } else if (t < 0.7) {
      // Peak phase with micro-variations
      float peakT = (t - 0.5) / 0.2;
      intensity = 1.0 + sin(peakT * 31.416) * 0.1; // 1.0 ± 0.1
    } else {
      // Return to calm
      float returnT = (t - 0.7) / 0.3;
      intensity = mix(1.0, 0.2, smoothstep(0.0, 1.0, returnT));
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
    float minAltitude = 80.0;  // km
    float maxAltitude = 300.0; // km
    
    // Ray-march through altitude layers
    vec3 finalColor = vec3(0.0);
    float finalAlpha = 0.0;
    
    // Quality-based layer count (6 for desktop, 3 for mobile - clearer band separation)
    int layers = int(6.0 * u_qualityScale);
    if (layers < 2) layers = 2;
    
    // Aurora cycle phase (40s cycle: calm → build → peak → return)
    float cyclePhase = getAuroraCyclePhase(u_time);
    // Soft baseline pulse for subtle variation
    float baselinePulse = getPulse(u_time) * 0.5 + 0.5; // Softer: 0.5-1.0 range
    
    // Ray-march loop
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
      float verticalBoost = smoothstep(0.2, 0.9, uv.y); // Weak at horizon, strong at zenith
      verticalBoost = mix(1.0, verticalBoost * 1.8, pitchFactor); // More dramatic when tilted
      curtainValue *= verticalBoost;
      
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
    
    // ===== TROMSØ FOCAL GLOW (legacy, subtle in 3D mode) =====
    
    vec2 toTromso = uv - u_tromsoCenter;
    float distToTromso = length(toTromso);
    
    // Subtle ground-level glow with slow pulse
    float tromsoGlow = pow(1.0 - clamp(distToTromso, 0.0, 1.0), u_glowRadius);
    float tromsoPulse = getTromsoPulse(u_time); // Dedicated 7s pulse cycle
    tromsoGlow *= u_auroraIntensity * 1.5; // Reduced base for subtlety
    tromsoGlow *= tromsoPulse;
    
    vec3 tromsoColor = vec3(1.0, 0.8, 0.0); // Warm gold
    finalColor += tromsoColor * tromsoGlow * 0.3; // Reduced contribution
    finalAlpha += tromsoGlow * 0.2;
    
    // ===== ATMOSPHERIC EFFECTS =====
    
    // Cloud coverage dimming
    float cloudDim = 1.0 - (u_cloudCoverage * 0.2);
    finalColor *= cloudDim;
    
    // Ground fade (suppress aurora near horizon)
    // When tilted, ground takes up less screen space
    float groundStart = mix(0.05, 0.0, pitchFactor * 0.8);
    float groundEnd = mix(0.45, 0.30, pitchFactor * 0.6);
    float groundFade = smoothstep(groundStart, groundEnd, uv.y);
    finalColor *= groundFade;
    
    // Sky lift and depth visibility boost
    // When pitched, aurora becomes more visible due to better viewing angle
    float auroraLift = mix(skyFactor * 0.8, skyFactor * 1.6, pitchFactor);

    // Boost overall visibility when viewing from side
    float sideViewBoost = 1.0 + (pitchFactor * 0.8);
    finalColor *= auroraLift * sideViewBoost;
    
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
