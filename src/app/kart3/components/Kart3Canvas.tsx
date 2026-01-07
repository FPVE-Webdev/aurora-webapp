'use client';

import { useEffect, useRef, useState } from 'react';
import { createShaderProgram, VERTEX_SHADER } from '@/app/kart2/utils/shaders';
import { KART3_VERTEX_SHADER, KART3_FRAGMENT_SHADER } from './kart3Shaders';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

type WeatherData = {
  windSpeed: number;
  windDirection: number;
  weatherType: number;
  precipitation: number;
};

type Props = {
  isEnabled: boolean;
  weatherModeEnabled: boolean;
  kpIndex: number;
  auroraProbability: number;
  cloudCoverage: number;
  weatherData?: WeatherData;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export default function Kart3Canvas({
  isEnabled,
  weatherModeEnabled,
  kpIndex,
  auroraProbability,
  cloudCoverage,
  weatherData,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const lastFrameTimeRef = useRef<number>(Date.now());

  const [shouldRender, setShouldRender] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [fallbackCss, setFallbackCss] = useState(false);
  const fatalErrorReportedRef = useRef(false);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setShouldRender(!mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Page visibility pause
  useEffect(() => {
    if (!isEnabled) return;
    const onVis = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [isEnabled]);

  // Reset fatal flags when disabled (so toggling can retry)
  useEffect(() => {
    if (!isEnabled) {
      fatalErrorReportedRef.current = false;
      setFallbackCss(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled || !canvasRef.current || !shouldRender) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (glRef.current) {
        glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
        glRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    let positionBuffer: WebGLBuffer | null = null;
    let indexBuffer: WebGLBuffer | null = null;
    const indexCount = 6;

    const reportFatal = (err: unknown) => {
      if (fatalErrorReportedRef.current) return;
      fatalErrorReportedRef.current = true;
      setFallbackCss(true);
      if (!IS_PRODUCTION) {
        // eslint-disable-next-line no-console
        console.error('[Kart3Canvas] Fatal error:', err);
      }
      try {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } catch {}
    };

    try {
      const gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
      });
      if (!gl) {
        reportFatal(new Error('WebGL not supported'));
        return;
      }
      glRef.current = gl;

      // DPI aware resize
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
        }
      };
      resize();
      window.addEventListener('resize', resize);

      // Compile shaders
      // Use Kart2's vertex shader for maximum driver compatibility (it effectively becomes a pass-through
      // when its uniforms stay at 0). Keep Kart3 fragment shader for the desired look.
      const program = createShaderProgram(gl, VERTEX_SHADER, KART3_FRAGMENT_SHADER);
      if (!program) {
        reportFatal(new Error('Failed to create shader program'));
        return;
      }
      programRef.current = program;
      gl.useProgram(program);

      // Fullscreen quad (2 triangles)
      const vertices = new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1,
      ]);
      const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);

      positionBuffer = gl.createBuffer();
      indexBuffer = gl.createBuffer();
      if (!positionBuffer || !indexBuffer) {
        reportFatal(new Error('Failed to create buffers'));
        return;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      // Attributes
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      // Uniforms
      const uRes = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');
      const uIntensity = gl.getUniformLocation(program, 'u_intensity');
      const uCloud01 = gl.getUniformLocation(program, 'u_cloud01');
      const uWeatherOn = gl.getUniformLocation(program, 'u_weatherOn');

      gl.disable(gl.DEPTH_TEST);
      gl.depthMask(false);
      gl.disable(gl.CULL_FACE);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      const render = () => {
        try {
          if (!isPageVisible) {
            animationFrameRef.current = requestAnimationFrame(render);
            return;
          }
          if (!glRef.current || !programRef.current) return;

          const now = Date.now();
          const dt = now - lastFrameTimeRef.current;
          if (dt < 16) {
            animationFrameRef.current = requestAnimationFrame(render);
            return;
          }
          lastFrameTimeRef.current = now;

          resize();

          gl.viewport(0, 0, canvas.width, canvas.height);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);

          const currentTime = now - startTimeRef.current;
          const intensity01 = clamp01((kpIndex / 9) * 0.65 + (auroraProbability / 100) * 0.55);
          const cloud01 = clamp01(cloudCoverage / 100);

          gl.uniform2f(uRes, canvas.width, canvas.height);
          gl.uniform1f(uTime, currentTime);
          gl.uniform1f(uIntensity, isEnabled ? intensity01 : 0.0);
          gl.uniform1f(uCloud01, cloud01);
          gl.uniform1f(uWeatherOn, weatherModeEnabled ? 1.0 : 0.0);

          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
          gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);

          animationFrameRef.current = requestAnimationFrame(render);
        } catch (err) {
          reportFatal(err);
        }
      };

      render();

      return () => {
        window.removeEventListener('resize', resize);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (programRef.current && glRef.current) glRef.current.deleteProgram(programRef.current);
        if (positionBuffer && glRef.current) glRef.current.deleteBuffer(positionBuffer);
        if (indexBuffer && glRef.current) glRef.current.deleteBuffer(indexBuffer);
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        glRef.current = null;
      };
    } catch (err) {
      reportFatal(err);
      return;
    }
  }, [isEnabled, shouldRender, isPageVisible, kpIndex, auroraProbability, cloudCoverage, weatherModeEnabled, weatherData]);

  if (!isEnabled || !shouldRender) return null;

  if (fallbackCss) {
    return (
      <>
        <div
          className="absolute inset-0 pointer-events-none auroraFallback"
          style={{
            backgroundImage:
              'radial-gradient(1200px 600px at 50% 70%, rgba(16, 255, 210, 0.28) 0%, rgba(16, 255, 210, 0.05) 35%, rgba(0,0,0,0) 70%), linear-gradient(115deg, rgba(60, 255, 190, 0.06) 0%, rgba(64, 180, 255, 0.08) 35%, rgba(168, 85, 247, 0.06) 70%, rgba(0,0,0,0) 100%)',
            backgroundSize: '220% 220%',
            opacity: 0.9,
            mixBlendMode: 'screen',
          }}
        />
        <style jsx>{`
          .auroraFallback {
            animation: auroraFallbackShift 10s ease-in-out infinite;
          }
          @keyframes auroraFallbackShift {
            0% {
              background-position: 0% 60%;
              filter: saturate(1.05) brightness(1);
            }
            50% {
              background-position: 100% 40%;
              filter: saturate(1.15) brightness(1.08);
            }
            100% {
              background-position: 0% 60%;
              filter: saturate(1.05) brightness(1);
            }
          }
        `}</style>
      </>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: 'none' }}
    />
  );
}


