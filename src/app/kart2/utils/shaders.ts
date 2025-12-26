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

  // Ultra-simple hash-based noise (optimized for speed)
  float fastNoise(vec2 v) {
    return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;

    // Distance from Tromsø (screen-space anchored)
    vec2 toTromso = uv - u_tromsoCenter;
    float distToTromso = length(toTromso);

    // Aurora wave pattern (centered around Tromsø)
    float time = u_time * 0.0003;
    vec2 noiseCoord = vec2(uv.x * 3.0, uv.y * 2.0 + time);
    float noise1 = fastNoise(noiseCoord);
    float noise2 = fastNoise(noiseCoord * 2.0 + vec2(time * 0.5, 0.0));

    // Combine noise layers
    float auroraPattern = (noise1 * 0.6 + noise2 * 0.4) * 0.5 + 0.5;

    // Radial falloff from Tromsø center
    float radialFalloff = smoothstep(0.8, 0.0, distToTromso);

    // Aurora strength: combines pattern with radial falloff
    float baseAuroraStrength = auroraPattern * radialFalloff;

    // Aurora intensity
    float auroraValue = baseAuroraStrength * u_auroraIntensity * 3.5;

    // VERY BRIGHT GREEN-CYAN COLORS (not dark)
    vec3 auroraColor = mix(
      vec3(0.5, 1.0, 0.6),  // Bright green
      vec3(0.3, 1.0, 1.0),  // Bright cyan
      auroraPattern
    );

    // Tromsø radial glow (focal point)
    float tromsoGlow = exp(-distToTromso * 8.0) * u_auroraIntensity * 3.0;

    // Pulsing effect (3-4 sec cycle)
    float pulse = sin(u_time * 0.002) * 0.15 + 0.85;
    tromsoGlow *= pulse;

    // BRIGHT YELLOW (pure, not dark)
    vec3 tromsoColor = vec3(1.0, 1.0, 0.2);

    // Combine aurora + Tromsø glow
    vec3 finalColor = auroraColor * auroraValue + tromsoColor * tromsoGlow;

    // Cloud coverage dims the effect (but doesn't kill it)
    float cloudDim = 1.0 - (u_cloudCoverage * 0.4);
    finalColor *= cloudDim;

    // Alpha based on combined effects
    float alpha = clamp(
      auroraValue * 0.8 + tromsoGlow * 1.5,
      0.0,
      1.0
    );

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
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader);
    const shaderType = type === gl.VERTEX_SHADER ? 'VERTEX' : 'FRAGMENT';
    console.error(`[Shader] ${shaderType} Compilation Error:`, error);
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
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('[Shader] Link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}
