/* eslint-disable @typescript-eslint/no-explicit-any */

type Aurora3DLayerOptions = {
  id?: string;
  centerLngLat: [number, number];
  altitudeMeters?: number;
  // Rectangle placement in degrees (simple prototype).
  // Use something that spans the horizon in the current Tromsø scene.
  latSpanDeg?: number;
  lonSpanDeg?: number;
  northOffsetDeg?: number;
  intensity?: number; // 0..1
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
  // Avoid importing WebGL2 types at compile time in environments without DOM.
  const w = typeof window !== 'undefined' ? (window as any) : undefined;
  return !!(w?.WebGL2RenderingContext && gl instanceof w.WebGL2RenderingContext);
}

export function createAurora3DLayer(mapboxgl: any, opts: Aurora3DLayerOptions) {
  const id = opts.id ?? 'aurora-3d';
  const altitudeMeters = opts.altitudeMeters ?? 110_000;
  const latSpanDeg = opts.latSpanDeg ?? 1.0;
  const lonSpanDeg = opts.lonSpanDeg ?? 3.2;
  const northOffsetDeg = opts.northOffsetDeg ?? 0.55;
  const intensity = Math.max(0, Math.min(1, opts.intensity ?? 0.85));

  let program: WebGLProgram | null = null;
  let posBuffer: WebGLBuffer | null = null;
  let uvBuffer: WebGLBuffer | null = null;
  let indexBuffer: WebGLBuffer | null = null;

  let uMatrix: WebGLUniformLocation | null = null;
  let uTime: WebGLUniformLocation | null = null;
  let uIntensity: WebGLUniformLocation | null = null;

  let aPos = -1;
  let aUv = -1;

  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const layer: any = {
    id,
    type: 'custom',
    renderingMode: '3d',
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

      const fs1 = `
        precision highp float;
        varying vec2 v_uv;
        uniform float u_time;
        uniform float u_intensity;
        void main() {
          // Prototype aurora: soft band + animated noise, tuned for "wow".
          float y = v_uv.y;
          float band = smoothstep(0.12, 0.35, y) * (1.0 - smoothstep(0.55, 0.95, y));
          float t = u_time * 0.00025;
          float wave = sin((v_uv.x * 6.0) + t * 2.2) * 0.25
                     + sin((v_uv.x * 13.0) - t * 3.1) * 0.12;
          float shimmer = sin((v_uv.x * 28.0) + (y * 9.0) + t * 6.0) * 0.08;
          float n = 0.55 + wave + shimmer;
          float alpha = band * smoothstep(0.30, 0.92, n) * u_intensity * 1.6;

          // Color ramp: teal -> cyan -> violet hint
          vec3 c1 = vec3(0.10, 0.95, 0.75);
          vec3 c2 = vec3(0.20, 0.95, 1.00);
          vec3 c3 = vec3(0.70, 0.45, 1.00);
          vec3 col = mix(c1, c2, smoothstep(0.15, 0.55, y));
          col = mix(col, c3, smoothstep(0.70, 0.95, y) * 0.25);

          // Subtle glow falloff
          float glow = smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.80, 1.0, y));
          col *= 0.85 + glow * 0.35;

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
        uniform float u_intensity;
        out vec4 outColor;
        void main() {
          float y = v_uv.y;
          float band = smoothstep(0.12, 0.35, y) * (1.0 - smoothstep(0.55, 0.95, y));
          float t = u_time * 0.00025;
          float wave = sin((v_uv.x * 6.0) + t * 2.2) * 0.25
                     + sin((v_uv.x * 13.0) - t * 3.1) * 0.12;
          float shimmer = sin((v_uv.x * 28.0) + (y * 9.0) + t * 6.0) * 0.08;
          float n = 0.55 + wave + shimmer;
          float alpha = band * smoothstep(0.30, 0.92, n) * u_intensity * 1.6;

          vec3 c1 = vec3(0.10, 0.95, 0.75);
          vec3 c2 = vec3(0.20, 0.95, 1.00);
          vec3 c3 = vec3(0.70, 0.45, 1.00);
          vec3 col = mix(c1, c2, smoothstep(0.15, 0.55, y));
          col = mix(col, c3, smoothstep(0.70, 0.95, y) * 0.25);

          float glow = smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.80, 1.0, y));
          col *= 0.85 + glow * 0.35;

          outColor = vec4(col, alpha);
        }
      `;

      program = createProgram(gl, webgl2 ? vs2 : vs1, webgl2 ? fs2 : fs1);

      // Look up locations (WebGL1 vs WebGL2 attribute APIs differ only by naming here).
      aPos = gl.getAttribLocation(program, 'a_pos');
      aUv = gl.getAttribLocation(program, 'a_uv');
      uMatrix = gl.getUniformLocation(program, 'u_matrix');
      uTime = gl.getUniformLocation(program, 'u_time');
      uIntensity = gl.getUniformLocation(program, 'u_intensity');

      // Build a simple rectangle "curtain" north of Tromsø, at high altitude.
      const [lng0, lat0] = opts.centerLngLat;
      const latCenter = lat0 + northOffsetDeg;
      const latMin = latCenter - latSpanDeg * 0.5;
      const latMax = latCenter + latSpanDeg * 0.5;
      const lonMin = lng0 - lonSpanDeg * 0.5;
      const lonMax = lng0 + lonSpanDeg * 0.5;

      // MercatorCoordinate gives world-space units Mapbox expects for u_matrix.
      const p00 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMin, latMin], altitudeMeters);
      const p10 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMax, latMin], altitudeMeters);
      const p01 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMin, latMax], altitudeMeters);
      const p11 = mapboxgl.default.MercatorCoordinate.fromLngLat([lonMax, latMax], altitudeMeters);

      // Positions: 4 corners (two triangles), UV mapped.
      const positions = new Float32Array([
        p00.x, p00.y, p00.z, // 0
        p10.x, p10.y, p10.z, // 1
        p01.x, p01.y, p01.z, // 2
        p11.x, p11.y, p11.z  // 3
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

      // Depth test enabled so terrain/buildings can occlude the aurora.
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(false); // Don't write depth (transparent layer).

      gl.enable(gl.BLEND);
      // Additive blending sells "light in the sky" much better than alpha-over.
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

      // Bind uniforms
      if (uMatrix) gl.uniformMatrix4fv(uMatrix, false, matrix as any);
      if (uTime) {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        gl.uniform1f(uTime, now - start);
      }
      if (uIntensity) gl.uniform1f(uIntensity, intensity);

      // Bind attributes
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.enableVertexAttribArray(aUv);
      gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

      // Restore state Mapbox expects (best-effort).
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


