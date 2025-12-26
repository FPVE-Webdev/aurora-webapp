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

    // Aurora wave pattern (single layer for performance)
    float time = u_time * 0.0003;
    vec2 noiseCoord = uv * vec2(2.0, 1.5) + vec2(time, time * 0.5);

    // Use fast hash noise
    float noise = fastNoise(floor(noiseCoord * 8.0) / 8.0);

    // Smooth interpolation
    vec2 f = fract(noiseCoord * 8.0);
    f = f * f * (3.0 - 2.0 * f);
    noise = mix(noise, fastNoise(floor(noiseCoord * 8.0 + 1.0) / 8.0), f.x);

    // Normalize to [0,1]
    float auroraPattern = noise;

    // Vertical gradient (stronger at top/north)
    float verticalGradient = smoothstep(0.3, 1.0, uv.y);

    // Aurora intensity
    float auroraValue = auroraPattern * verticalGradient * u_auroraIntensity;

    // Color mapping: green → cyan
    vec3 auroraColor = mix(
      vec3(0.2, 0.8, 0.4),  // Green
      vec3(0.3, 0.9, 0.9),  // Cyan
      auroraPattern
    );

    // Tromsø radial glow (simplified for performance)
    vec2 toTromso = uv - u_tromsoCenter;
    float distToTromso = length(toTromso);
    float tromsoGlow = max(0.0, 1.0 - distToTromso * 3.0) * u_auroraIntensity;

    // Simple pulsing (cheaper than exp)
    tromsoGlow *= (sin(u_time * 0.002) * 0.2 + 0.8);

    // Yellow glow color for Tromsø
    vec3 tromsoColor = vec3(1.0, 0.9, 0.3);

    // Combine aurora + Tromsø glow
    vec3 finalColor = auroraColor * auroraValue + tromsoColor * tromsoGlow;

    // Cloud coverage dims the effect (simplified)
    finalColor *= (1.0 - u_cloudCoverage * 0.6);

    // Simple alpha (avoid expensive clamp)
    float alpha = min(auroraValue * 0.4 + tromsoGlow * 0.6, 0.5);

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
