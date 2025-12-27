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

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Detect if device is mobile based on viewport width and touch support
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
};

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
  const [isPageVisible, setIsPageVisible] = useState(true);
  const isMobileRef = useRef(false);

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

  // Idle pause: pause rendering when tab is inactive (Page Visibility API)
  useEffect(() => {
    if (!isEnabled) return;

    const handleVisibilityChange = () => {
      const isNowVisible = !document.hidden;
      setIsPageVisible(isNowVisible);

      if (!IS_PRODUCTION) {
        console.log('[VisualMode] Page visibility:', isNowVisible ? 'visible' : 'hidden');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isEnabled]);

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
      if (!IS_PRODUCTION) {
        console.error('[VisualMode] WebGL not supported or context unavailable');
      }
      return;
    }

    // Guard against context loss
    if (gl.isContextLost && gl.isContextLost()) {
      if (!IS_PRODUCTION) {
        console.error('[VisualMode] WebGL context is lost');
      }
      return;
    }

    glRef.current = gl;

    // Resize canvas to match display size with proper DPI scaling
    const resize = () => {
      let displayWidth: number;
      let displayHeight: number;
      let cssWidth: number;
      let cssHeight: number;

      // Resolution clamping: cap devicePixelRatio at 1.5 for GPU optimization
      const dpr = Math.min(window.devicePixelRatio, 1.5);

      // Try to get parent dimensions first (preferred)
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          cssWidth = rect.width;
          cssHeight = rect.height;
          displayWidth = cssWidth * dpr;
          displayHeight = cssHeight * dpr;
        } else {
          // Fallback to window dimensions if parent is not visible
          cssWidth = window.innerWidth;
          cssHeight = window.innerHeight;
          displayWidth = cssWidth * dpr;
          displayHeight = cssHeight * dpr;
        }
      } else {
        // Fallback to window dimensions if no parent
        cssWidth = window.innerWidth;
        cssHeight = window.innerHeight;
        displayWidth = cssWidth * dpr;
        displayHeight = cssHeight * dpr;
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

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
      if (!IS_PRODUCTION) {
        console.error('[VisualMode] Failed to create shader program');
      }
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

    // Visual tuning uniform locations
    const alphaTuneLocation = gl.getUniformLocation(program, 'u_alphaTune');
    const glowRadiusLocation = gl.getUniformLocation(program, 'u_glowRadius');
    const edgeBlendLocation = gl.getUniformLocation(program, 'u_edgeBlend');
    const motionSpeedLocation = gl.getUniformLocation(program, 'u_motionSpeed');

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Calculate aurora intensity (spec formula) - increased baseline from 0.6 to 0.8 for more responsive effect
    const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
    const auroraIntensity = clamp01(kpIndex / 9) * 0.8 + clamp01(auroraProbability / 100) * 0.4;

    // Silent initialization - only log if there's an issue

    // Adaptive quality: detect device and set FPS targets
    isMobileRef.current = isMobileDevice();
    let targetDeltaTime = isMobileRef.current ? 33 : 16; // Mobile: 30 FPS, Desktop: 60 FPS
    let lowFpsCount = 0;

    // Render loop with adaptive FPS capping and idle pause support
    const render = () => {
      // Idle pause: skip rendering if page is not visible
      // (but still schedule next frame - browser throttles requestAnimationFrame when hidden)
      if (!isPageVisible) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (!glRef.current || !programRef.current) return;

      // Guard against context loss
      if (glRef.current.isContextLost && glRef.current.isContextLost()) {
        // WebGL context lost - stop rendering
        if (!IS_PRODUCTION) {
          console.warn('[VisualMode] WebGL context lost');
        }
        return;
      }

      const now = Date.now();
      const deltaTime = now - lastFrameTimeRef.current;

      // Adaptive FPS: automatic downgrade if performance drops
      // Desktop target: 60 FPS (16ms), fallback to 30 FPS (33ms)
      // Mobile target: 30 FPS (33ms), fallback further if needed
      const fpsThreshold = isMobileRef.current ? 25 : 50; // Mobile: 25 FPS, Desktop: 50 FPS

      if (fpsCounterRef.current.fps < fpsThreshold) {
        lowFpsCount++;
        if (lowFpsCount > 5) {
          // Downgrade to 30 FPS if not already there
          if (targetDeltaTime !== 33) {
            targetDeltaTime = 33;
            if (!IS_PRODUCTION) {
              console.warn('[VisualMode] Auto-downgrade: FPS dropped to', fpsCounterRef.current.fps.toFixed(1), '- switching to 30 FPS');
            }
          }
          lowFpsCount = 0;
        }
      } else {
        // Reset counter when FPS recovers
        lowFpsCount = 0;
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

        // Warn if FPS is critically low
        if (fps < 15) {
          console.warn('[VisualMode] Low FPS detected:', fps.toFixed(1), '- consider disabling');
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

      // Visual tuning uniforms - for premium look
      gl.uniform1f(alphaTuneLocation, 0.92); // Reduce alpha by ~8% for smoother blend
      gl.uniform1f(glowRadiusLocation, 1.85); // Broader Tromsø glow (+10-15%)
      gl.uniform1f(edgeBlendLocation, 0.65); // Softer edge falloff for smoother transitions
      gl.uniform1f(motionSpeedLocation, 0.8); // Slower motion for premium feel

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
      className="absolute pointer-events-none"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'transparent'
      }}
    />
  );
}
