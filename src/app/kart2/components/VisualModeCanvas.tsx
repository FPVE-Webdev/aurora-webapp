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
}

export default function VisualModeCanvas({
  isEnabled,
  kpIndex,
  auroraProbability,
  cloudCoverage,
  timestamp,
  tromsoCoords
}: VisualModeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now(), fps: 60 });
  const [shouldRender, setShouldRender] = useState(true);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = () => {
      if (mediaQuery.matches) {
        console.log('[VisualMode] Disabled due to prefers-reduced-motion');
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

    // Resize canvas to match display size
    const resize = () => {
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    resize();
    window.addEventListener('resize', resize);

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

    // Calculate aurora intensity (spec formula)
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const auroraIntensity = clamp01(kpIndex / 9) * 0.6 + clamp01(auroraProbability / 100) * 0.4;

    console.log('[VisualMode] Initialized', {
      kpIndex,
      auroraProbability,
      auroraIntensity,
      cloudCoverage
    });

    // Render loop with FPS monitoring
    const render = () => {
      if (!glRef.current || !programRef.current) return;

      const currentTime = Date.now() - startTimeRef.current;

      // FPS monitoring (every 60 frames)
      fpsCounterRef.current.frames++;
      if (fpsCounterRef.current.frames >= 60) {
        const now = Date.now();
        const delta = now - fpsCounterRef.current.lastTime;
        const fps = (60 * 1000) / delta;
        fpsCounterRef.current.fps = fps;
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;

        // Auto-disable if consistently below 15 FPS
        if (fps < 15) {
          console.warn('[VisualMode] Low FPS detected:', fps.toFixed(1), '- consider disabling');
          // Note: We don't auto-disable here to respect user choice
          // User can manually toggle off if performance is poor
        }
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Set uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, currentTime);
      gl.uniform1f(auroraIntensityLocation, auroraIntensity);
      gl.uniform2f(tromsoCenterLocation, 0.5, 0.65); // Center-ish, slightly north
      gl.uniform1f(cloudCoverageLocation, cloudCoverage / 100);

      // Draw fullscreen quad
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
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
  }, [isEnabled, kpIndex, auroraProbability, cloudCoverage, timestamp, tromsoCoords, shouldRender]);

  // Don't render if disabled or reduced-motion
  if (!isEnabled || !shouldRender) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    />
  );
}
