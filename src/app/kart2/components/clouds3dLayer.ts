/* eslint-disable @typescript-eslint/no-explicit-any */

type Clouds3DLayerOptions = {
  id?: string;
  centerLngLat: [number, number];
  /** Cloud deck altitude (meters). */
  altitudeMeters?: number;
  /** Cloud deck "depth" (degrees latitude). */
  latSpanDeg?: number;
  lonSpanDeg?: number;
  /** How far north the cloud deck is placed (degrees latitude). */
  northOffsetDeg?: number;
  cloudCoverage?: number; // 0..100
  windSpeed?: number; // m/s
  windDirection?: number; // degrees
};

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('createShader failed');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) || 'unknown';
    gl.deleteShader(shader);
    throw new Error(info);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  if (!program) throw new Error('createProgram failed');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) || 'unknown';
    gl.deleteProgram(program);
    throw new Error(info);
  }
  return program;
}

function isWebGL2(gl: WebGLRenderingContext): boolean {
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  return !!(w?.WebGL2RenderingContext && gl instanceof w.WebGL2RenderingContext);
}

export function createClouds3DLayer(mapboxgl: any, opts: Clouds3DLayerOptions) {
  const id = opts.id ?? 'clouds-3d';
  // Cloud deck: a horizontal sheet placed near the horizon (far north of Tromsø).
  // This makes the “cloud cover line” read as a flat deck aligned with the horizon.
  const cloudAlt = opts.altitudeMeters ?? 7_000;
  const latSpanDeg = opts.latSpanDeg ?? 0.18;
  const lonSpanDeg = opts.lonSpanDeg ?? 4.8;
  const northOffsetDeg = opts.northOffsetDeg ?? 0.35;
  // IMPORTANT: For a readable effect:
  // - Clouds should sit “on the horizon” (flat deck)
  // - Aurora should be clearly above (handled by aurora-3d)

  let program: WebGLProgram | null = null;
  let posBuffer: WebGLBuffer | null = null;
  let uvBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;

  let uMatrix: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uCoverage: WebGLUniformLocation | null = null;
  let uWind: WebGLUniformLocation | null = null; // vec2: dir(rad), speed

  let aPos = -1;
  let aUv = -1;

  // Mutable uniforms (updated from MapView)
  let coverage01 = Math.max(0, Math.min(1, (opts.cloudCoverage ?? 0) / 100));
  let windDirRad = ((opts.windDirection ?? 270) * Math.PI) / 180;
  let windSpeed = Math.max(0, Math.min(35, opts.windSpeed ?? 5));

  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const layer: any = {
    id,
    type: 'custom',
    renderingMode: '3d',
    // Allow MapView to update uniforms without recreating the layer.
    setCloudCoverage(v: number) {
      coverage01 = Math.max(0, Math.min(1, v / 100));
    },
    setWind(dirDeg: number, spd: number) {
      windDirRad = (dirDeg * Math.PI) / 180;
      windSpeed = Math.max(0, Math.min(35, spd));
    },
    onAdd(_map: any, gl: WebGLRenderingContext) {
      const webgl2 = isWebGL2(gl);

      const vs1 = `
        precision highp float;
        attribute vec3 a_pos;
        attribute vec2 a_uv;
        uniform mat4 u_matrix;
        varying vec2 v_uv;
        void main() {
          v_uv = a_uv;
          gl_Position = u_matrix * vec4(a_pos, 1.0);
        }
      `;

      // Simple value-noise (fast) for cloud texture
      const fs1 = `
        precision highp float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform float u_coverage; // 0..1
        uniform vec2 u_wind; // x = dir rad, y = speed m/s

        float hash(vec2 p) {
          // deterministic hash
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

        void main() {
      // Cloud deck edge shaping (v_uv.y = near->far across the deck)
      float y = v_uv.y;
      float band = smoothstep(0.00, 0.20, y) * (1.0 - smoothstep(0.85, 1.00, y));

          // Wind drift (very subtle)
          vec2 windVec = vec2(sin(u_wind.x), cos(u_wind.x));
          float t = u_time * 0.00002 * (0.35 + u_wind.y * 0.03);

          // Texture coords
          vec2 uv = v_uv;
          uv.x *= 2.2;
          uv.y *= 1.2;
          uv += windVec * t;

          float n = fbm(uv * 3.0);
          float n2 = fbm(uv * 6.0 + 10.0);
          float density = mix(n, n2, 0.35);

          // Coverage drives threshold: higher coverage -> more opaque / filled.
          float thresh = mix(0.78, 0.40, u_coverage);
          float cloud = smoothstep(thresh, thresh - 0.18, density);

      // Soft edges + subtle depth fade
      float edge = smoothstep(0.0, 0.18, v_uv.x) * (1.0 - smoothstep(0.82, 1.0, v_uv.x));
      float alpha = cloud * band * edge;

      // Always show some deck haze at higher coverage (visibility-first).
      float haze = band * edge * (u_coverage * u_coverage) * 0.24;
          alpha = max(alpha, haze);

      // Scale alpha by coverage and keep it clearly visible at high coverage.
      alpha *= (0.22 + u_coverage * 1.15);
          alpha = clamp(alpha, 0.0, 0.92);

      // Cloud color (night) - slightly brighter for readability
          vec3 cDark = vec3(0.10, 0.12, 0.16);
          vec3 cLight = vec3(0.78, 0.82, 0.86);
          vec3 col = mix(cDark, cLight, cloud);

          gl_FragColor = vec4(col, alpha);
        }
      `;

      const vs2 = `#version 300 es
        precision highp float;
        in vec3 a_pos;
        in vec2 a_uv;
        uniform mat4 u_matrix;
        out vec2 v_uv;
        void main() {
          v_uv = a_uv;
          gl_Position = u_matrix * vec4(a_pos, 1.0);
        }
      `;

      const fs2 = `#version 300 es
        precision highp float;
        in vec2 v_uv;
        uniform float u_time;
        uniform float u_coverage;
        uniform vec2 u_wind;
        out vec4 outColor;

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

        void main() {
          float y = v_uv.y;
          float band = smoothstep(0.00, 0.06, y) * (1.0 - smoothstep(0.92, 1.00, y));
          vec2 windVec = vec2(sin(u_wind.x), cos(u_wind.x));
          float t = u_time * 0.00002 * (0.35 + u_wind.y * 0.03);
          vec2 uv = v_uv;
          uv.x *= 2.2;
          uv.y *= 1.2;
          uv += windVec * t;
          float n = fbm(uv * 3.0);
          float n2 = fbm(uv * 6.0 + 10.0);
          float density = mix(n, n2, 0.35);
          float thresh = mix(0.78, 0.40, u_coverage);
          float cloud = smoothstep(thresh, thresh - 0.18, density);
          float edge = smoothstep(0.0, 0.18, v_uv.x) * (1.0 - smoothstep(0.82, 1.0, v_uv.x));
          float alpha = cloud * band * edge;
          float haze = band * edge * (u_coverage * u_coverage) * 0.22;
          alpha = max(alpha, haze);
          alpha *= (0.25 + u_coverage * 1.10);
          alpha = clamp(alpha, 0.0, 0.92);
          vec3 cDark = vec3(0.10, 0.12, 0.16);
          vec3 cLight = vec3(0.78, 0.82, 0.86);
          vec3 col = mix(cDark, cLight, cloud);
          outColor = vec4(col, alpha);
        }
      `;

      program = createProgram(gl, webgl2 ? vs2 : vs1, webgl2 ? fs2 : fs1);

      aPos = gl.getAttribLocation(program, 'a_pos');
      aUv = gl.getAttribLocation(program, 'a_uv');
      uMatrix = gl.getUniformLocation(program, 'u_matrix');
      uTime = gl.getUniformLocation(program, 'u_time');
      uCoverage = gl.getUniformLocation(program, 'u_coverage');
      uWind = gl.getUniformLocation(program, 'u_wind');

      const [lng0, lat0] = opts.centerLngLat;
      const latCenter = lat0 + northOffsetDeg;
      const latMin = latCenter - latSpanDeg * 0.5;
      const latMax = latCenter + latSpanDeg * 0.5;
      const lonMin = lng0 - lonSpanDeg * 0.5;
      const lonMax = lng0 + lonSpanDeg * 0.5;

      // Horizontal deck: 4 corners at a single altitude.
      const p00 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMin, latMin], cloudAlt);
      const p10 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMax, latMin], cloudAlt);
      const p01 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMin, latMax], cloudAlt);
      const p11 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMax, latMax], cloudAlt);

      const positions = new Float32Array([
        p00.x, p00.y, p00.z,
        p10.x, p10.y, p10.z,
        p01.x, p01.y, p01.z,
        p11.x, p11.y, p11.z
      ]);

      const uvs = new Float32Array([
        0, 0,
        1, 0,
        0, 1,
        1, 1
      ]);

      const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

      posBuffer = gl.createBuffer();
      uvBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();
      if (!posBuffer || !uvBuffer || !indexBuffer) throw new Error('Failed to create buffers');

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    },
    render(gl: WebGLRenderingContext, matrix: number[]) {
      if (!program || !posBuffer || !uvBuffer || !indexBuffer) return;

      gl.useProgram(program);

      // Visibility-first: clouds should be obvious. We disable depth testing so the cloud deck
      // overlays the horizon even if terrain depth would otherwise occlude it.
      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix as any);
      if (uTime) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        gl.uniform1f(uTime, now - start);
      }
      if (uCoverage) gl.uniform1f(uCoverage, coverage01);
      if (uWind) gl.uniform2f(uWind, windDirRad, windSpeed);

      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      gl.depthMask(true);
    },
    onRemove(_map: any, gl: WebGLRenderingContext) {
      try {
        if (posBuffer) gl.deleteBuffer(posBuffer);
        if (uvBuffer) gl.deleteBuffer(uvBuffer);
        if (indexBuffer) gl.deleteBuffer(indexBuffer);
        if (program) gl.deleteProgram(program);
      } catch {
        // ignore
      } finally {
        program = null;
        posBuffer = null;
        uvBuffer = null;
        indexBuffer = null;
      }
    },
  };

  return layer;
}


