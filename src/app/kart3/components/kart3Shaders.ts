/**
 * Kart3 shaders
 *
 * Goal: match the reference look for the welcome screen:
 * - Large aurora high in the sky
 * - Visible vertical "curtain" striations
 * - Starry night background
 * - Optional soft horizon cloud bank driven by cloudCoverage
 *
 * WebGL 1.0 compatible.
 */

export const KART3_VERTEX_SHADER = `
  precision mediump float;
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

export const KART3_FRAGMENT_SHADER = `
  precision mediump float;
  varying vec2 v_uv;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intensity;   // 0..1 (derived from kp/prob)
  uniform float u_cloud01;     // 0..1
  uniform float u_weatherOn;   // 0..1

  // --- Small hash/noise helpers (fast) ---
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 34.345);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.6;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  // Star field (cheap): thresholded noise + subtle twinkle
  float stars(vec2 uv, float t) {
    // more stars at top of the sky
    float skyMask = smoothstep(0.35, 0.92, uv.y);
    vec2 p = uv * vec2(520.0, 920.0);
    float n = noise(p);
    float s = smoothstep(0.985, 1.0, n);
    float tw = 0.75 + 0.25 * sin(t * 0.0009 + n * 60.0);
    return s * tw * skyMask;
  }

  void main() {
    vec2 uv = v_uv;
    float t = u_time;

    // Base sky (very dark)
    vec3 col = vec3(0.01, 0.02, 0.04);

    // Stars
    float s = stars(uv, t);
    col += vec3(0.9, 0.95, 1.0) * s * 0.65;

    // ===== Aurora shape (high in sky) =====
    // Build an arc-like band by measuring distance to a circle center (off-screen bottom-left),
    // then modulate with vertical curtains and shimmer.
    vec2 arcCenter = vec2(0.08, -0.05);
    float r = length(uv - arcCenter);

    // Arc band: target radius range (tuned for the reference sweep)
    float band = smoothstep(0.78, 0.70, r) * smoothstep(0.52, 0.62, r);

    // Push aurora towards upper sky and keep it off the horizon
    float skyOnly = smoothstep(0.34, 0.62, uv.y);
    band *= skyOnly;

    // Curtains: vertical streaks with wobble
    float x = uv.x;
    float y = uv.y;

    float drift = t * 0.00003;
    float curl = fbm(vec2(x * 2.6 + drift, y * 1.1 - drift));

    // High-frequency vertical striations
    float stripes = sin((x * 28.0) + curl * 6.0 + sin(t * 0.00022) * 1.5);
    stripes = 0.55 + 0.45 * stripes;

    // Secondary finer striations
    float stripes2 = sin((x * 55.0) - curl * 5.0 + t * 0.00035);
    stripes2 = 0.55 + 0.45 * stripes2;

    float curtain = mix(stripes, stripes2, 0.35);

    // Shimmer/flicker at edges
    float shimmer = 0.9 + 0.1 * sin(t * 0.0012 + (x * 12.0) + curl * 8.0);

    // Vertical fade: strongest high, fades downward like real curtains
    float fall = smoothstep(0.25, 0.85, y);
    float fallDown = 1.0 - smoothstep(0.55, 0.98, y);
    float verticalCurtain = fall * (0.75 + 0.25 * fallDown);

    float a = band * curtain * shimmer * verticalCurtain;

    // Intensity scaling: keep visible even at low values but avoid whiteout
    float intensity = clamp(0.25 + u_intensity * 1.15, 0.0, 1.6);
    a *= intensity;

    // Color ramp (green -> cyan highlights)
    vec3 cG = vec3(0.20, 1.00, 0.65);
    vec3 cC = vec3(0.30, 0.90, 1.00);
    float highlight = smoothstep(0.45, 0.95, curtain);
    vec3 aur = mix(cG, cC, highlight * 0.55);

    // Soft glow around band
    float glow = band * (0.35 + 0.65 * fbm(vec2(x * 1.8 + drift, y * 0.9)));
    aur *= 0.85 + glow * 0.45;

    // Clouds (optional): low horizon bank; mainly affects readability, not physically accurate
    float cloud = 0.0;
    if (u_weatherOn > 0.5) {
      float h = smoothstep(0.00, 0.22, y) * (1.0 - smoothstep(0.35, 0.55, y));
      float edge = smoothstep(0.0, 0.08, x) * (1.0 - smoothstep(0.92, 1.0, x));
      float cn = fbm(vec2(x * 3.0 + drift * 0.9, y * 5.0 - drift * 0.6));
      float thresh = mix(0.82, 0.42, u_cloud01);
      cloud = smoothstep(thresh, thresh - 0.22, cn) * h * edge;
    }

    // Apply aurora over base
    col = col + aur * a;

    // Dim aurora by clouds (visual cue)
    col *= (1.0 - cloud * 0.35);

    // Blend clouds in front (soft)
    col = mix(col, col * 0.55, cloud * (0.35 + 0.55 * u_cloud01));

    // Final
    gl_FragColor = vec4(col, 1.0);
  }
`;


