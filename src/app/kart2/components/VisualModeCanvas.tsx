/**
 * Visual Mode Canvas Component
 *
 * WebGL-based aurora visualization overlay.
 *
 * ARCHITECTURE:
 * - Fullscreen canvas overlay (z-index: 20)
 * - pointer-events: none (clicks pass through to map)
 * - Completely isolated from Kart2 logic
 * - Read-only data access
 *
 * RENDERING:
 * - WebGL 1.0 for max compatibility
 * - Shader-based aurora effects
 * - GPU-accelerated
 *
 * LIFECYCLE:
 * - Initializes when isEnabled = true
 * - Full cleanup when isEnabled = false
 * - Reinitializes on resize
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { createShaderProgram, VERTEX_SHADER, FRAGMENT_SHADER } from '../utils/shaders';

interface VisualModeCanvasProps {
  isEnabled: boolean;
  kpIndex: number;
  auroraProbability: number;
  cloudCoverage: number;
  timestamp: string; // ISO 8601 timestamp
  tromsoCoords: [number, number];
  mapInstance: any; // Mapbox map instance
}

export default function VisualModeCanvas({
  isEnabled,
  kpIndex,
  auroraProbability,
  cloudCoverage,
  timestamp,
  tromsoCoords,
  mapInstance
}: VisualModeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now(), fps: 60 });
  const lastFrameTimeRef = useRef<number>(Date.now());
  const [shouldRender, setShouldRender] = useState(true);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      if (mediaQuery.matches) {
        setShouldRender(false);
      } else {
        setShouldRender(true);
      }
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isEnabled || !canvasRef.current || !shouldRender) {
      // Cleanup when disabled or reduced-motion
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (glRef.current) {
        const gl = glRef.current;
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        glRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;

    // Initialize WebGL
    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false
    });

    if (!gl) {
      console.error('[VisualMode] WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Resize canvas to match display size with proper DPI scaling
    const resize = () => {
      if (!canvas.parentElement) return;

      const rect = canvas.parentElement.getBoundingClientRect();

      // Guard against zero or invalid dimensions
      if (rect.width <= 0 || rect.height <= 0) return;

      const displayWidth = rect.width * window.devicePixelRatio;
      const displayHeight = rect.height * window.devicePixelRatio;

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    // Update on map move/zoom
    const updateOnMapChange = () => {
      // Render loop handles projection updates automatically
    };
    mapInstance.on('move', updateOnMapChange);
    mapInstance.on('zoom', updateOnMapChange);

    // Compile shaders
    const program = createShaderProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
    if (!program) {
      console.error('[VisualMode] Failed to create shader program');
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Create fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Setup vertex attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const auroraIntensityLocation = gl.getUniformLocation(program, 'u_auroraIntensity');
    const tromsoCenterLocation = gl.getUniformLocation(program, 'u_tromsoCenter');
    const cloudCoverageLocation = gl.getUniformLocation(program, 'u_cloudCoverage');

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Calculate aurora intensity (spec formula) - increased baseline from 0.6 to 0.8 for more responsive effect
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const auroraIntensity = clamp01(kpIndex / 9) * 0.8 + clamp01(auroraProbability / 100) * 0.4;

    // Silent initialization - only log if there's an issue

    // Render loop with adaptive FPS capping (default 60 FPS, fallback to 30 FPS) and monitoring
    let targetDeltaTime = 16; // 60 FPS default
    let lowFpsCount = 0;

    const render = () => {
      if (!glRef.current || !programRef.current) return;

      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;

      // Adaptive FPS: fallback to 30 FPS if performance is poor
      if (fpsCounterRef.current.fps < 20) {
        lowFpsCount++;
        if (lowFpsCount > 5) {
          targetDeltaTime = 33; // Switch to 30 FPS
          console.warn('[VisualMode] Switched to adaptive 30 FPS mode');
          lowFpsCount = 0;
        }
      }

      // FPS cap: only render every ~16ms (60 FPS default) or ~33ms (30 FPS fallback)
      if (deltaTime < targetDeltaTime) {
        // Too soon, skip this frame
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      lastFrameTimeRef.current = now;
      const currentTime = now - startTimeRef.current;

      // FPS monitoring (every 60 frames)
      fpsCounterRef.current.frames++;
      if (fpsCounterRef.current.frames >= 60) {
        const delta = now - fpsCounterRef.current.lastTime;
        const fps = (60 * 1000) / delta;
        fpsCounterRef.current.fps = fps;
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;

        // Warn if below 15 FPS
        if (fps < 15) {
          console.warn('[VisualMode] Low FPS detected:', fps.toFixed(1));
        }
      }

      // Early exit optimization: skip rendering if aurora is too dim to be visible
      if (auroraIntensity < 0.05) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // PROJECT TROMSØ TO SCREEN SPACE using Mapbox
      const projected = mapInstance.project(tromsoCoords);
      let screenX = projected.x / canvas.width;
      let screenY = 1.0 - (projected.y / canvas.height); // Invert Y for WebGL

      // Guard against NaN/out-of-range
      screenX = Number.isFinite(screenX) ? Math.min(1, Math.max(0, screenX)) : 0.5;
      screenY = Number.isFinite(screenY) ? Math.min(1, Math.max(0, screenY)) : 0.5;

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, currentTime);
      gl.uniform1f(auroraIntensityLocation, auroraIntensity);
      gl.uniform2f(tromsoCenterLocation, screenX, screenY); // DYNAMIC screen-space position
      gl.uniform1f(cloudCoverageLocation, cloudCoverage / 100);

      // Draw fullscreen quad
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      mapInstance.off('move', updateOnMapChange);
      mapInstance.off('zoom', updateOnMapChange);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (programRef.current && glRef.current) {
        glRef.current.deleteProgram(programRef.current);
        programRef.current = null;
      }
      if (positionBuffer && glRef.current) {
        glRef.current.deleteBuffer(positionBuffer);
      }
      if (glRef.current) {
        glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
        glRef.current = null;
      }
    };
  }, [isEnabled, kpIndex, auroraProbability, cloudCoverage, timestamp, tromsoCoords, mapInstance, shouldRender]);

  // Don't render if disabled or reduced-motion
  if (!isEnabled || !shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        background: 'transparent'
      }}
    />
  );
}
