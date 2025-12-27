const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * WebGL Shaders for Visual Mode
 *
 * ARCHITECTURE:
 * - Vertex shader: fullscreen quad
 * - Fragment shader: aurora + Tromsø glow
 *
 * RENDERING:
 * - Simplex noise for organic aurora movement
 * - Radial gradient for Tromsø center
 * - Color mapping: green → cyan
 * - Alpha blending with map
 */

export const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_auroraIntensity;
  uniform vec2 u_tromsoCenter; // Screen-space coords [0-1]
  uniform float u_cloudCoverage; // 0-1

  // Visual tuning uniforms (runtime adjustable)
  uniform float u_alphaTune; // Global alpha multiplier (0.9-1.0, default 0.92)
  uniform float u_glowRadius; // Tromsø glow radius tuning (1.5-2.5, default 1.85)
  uniform float u_edgeBlend; // Edge falloff softness (0.3-0.8, default 0.65)
  uniform float u_motionSpeed; // Motion multiplier (0.6-1.0, default 0.8)
  uniform float u_mapPitch; // Map pitch normalized (0-1, where 1 = 45 degrees)

  // Ultra-simple hash-based noise (optimized for speed)
  float fastNoise(vec2 v) {
    return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // --- Map-aware screen-space sky projection ---
    // Map pitch (0-1, normalized from 0-45 degrees)
    float pitchFactor = clamp(u_mapPitch, 0.0, 1.0);

    // Screen-space vertical bias (sky is higher on screen)
    float skyFactor = smoothstep(0.25, 0.85, uv.y);

    // Combine map pitch with screen-space sky
    float auroraLift = mix(skyFactor, skyFactor * 1.4, pitchFactor);

    // Distance from Tromsø (screen-space anchored)
    vec2 toTromso = uv - u_tromsoCenter;
    float distToTromso = length(toTromso);

    // Aurora wave pattern (centered around Tromsø) - depth-based motion (sky moves slower, ground faster)
    float depthTime = u_time * mix(0.00015, 0.00035, skyFactor);
    vec2 noiseCoord = vec2(uv.x * 3.0, uv.y * 2.0 + depthTime);
    float noise1 = fastNoise(noiseCoord);
    float noise2 = fastNoise(noiseCoord * 2.0 + vec2(depthTime * 0.5, 0.0));

    // Combine noise layers with shimmer effect for organic wavering
    float shimmer = sin(u_time * 0.003 * u_motionSpeed + noiseCoord.x * 5.0) * 0.1 + 0.9;
    float auroraPattern = ((noise1 * 0.6 + noise2 * 0.4) * 0.5 + 0.5) * shimmer;

    // Vertical stretch for sky projection (Tromsø glow projects upward, not flat)
    float verticalStretch = mix(0.6, 1.2, skyFactor);
    float stretchedDist = distToTromso * verticalStretch;

    // Radial expansion waves - creates moving bands radiating from Tromsø
    float waves = sin((stretchedDist * 10.0 - u_time * 0.0005 * u_motionSpeed)) * 0.1 + 0.9;

    // Radial falloff from Tromsø center - tuned edge blending with vertical stretch
    float radialFalloff = smoothstep(u_edgeBlend, 0.0, stretchedDist) * waves;
    // Minimum visibility guarantee near center
    radialFalloff = max(radialFalloff, 0.12);

    // Aurora strength: combines pattern with radial falloff
    float baseAuroraStrength = auroraPattern * radialFalloff;

    // Aurora intensity - scaled by map-aware sky perspective (stronger high, weaker low)
    float auroraValue = baseAuroraStrength * u_auroraIntensity * 4.0;
    auroraValue *= auroraLift;

    // VIVID AURORA COLORS - deeper, more saturated green and pure cyan
    vec3 auroraColor = mix(
      vec3(0.2, 1.0, 0.3),  // Deeper, more intense green
      vec3(0.0, 1.0, 1.0),  // Pure bright cyan
      auroraPattern
    );

    // Tromsø radial glow - optimized with pow() instead of exp() for cheaper computation
    // Creates a smooth, cheap focal point glow - tuned radius
    float tromsoGlow = pow(1.0 - clamp(distToTromso, 0.0, 1.0), u_glowRadius) * u_auroraIntensity * 4.5;

    // Pulsing effect (3-4 sec cycle)
    float pulse = sin(u_time * 0.002) * 0.15 + 0.85;
    tromsoGlow *= pulse;

    // WARMER TROMSØ GOLD - pure, warm focal point
    vec3 tromsoColor = vec3(1.0, 0.8, 0.0);

    // Combine aurora + Tromsø glow
    vec3 finalColor = auroraColor * auroraValue + tromsoColor * tromsoGlow;

    // Reduced cloud coverage penalty - aurora still visible even with high cloud cover
    float cloudDim = 1.0 - (u_cloudCoverage * 0.2);
    finalColor *= cloudDim;

    // Suppress aurora naturally toward ground with map-pitch awareness
    // Higher pitch = softer ground fade (aurora lifts into sky)
    float groundFade = smoothstep(0.05, 0.45, uv.y);
    finalColor *= mix(groundFade, groundFade * 0.6, pitchFactor);

    // Alpha based on combined effects - tuned with global alpha multiplier
    float alpha = clamp(
      auroraValue * 0.8 + tromsoGlow * 1.5,
      0.0,
      0.95
    ) * u_alphaTune;

    gl_FragColor = vec4(finalColor, alpha);
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
