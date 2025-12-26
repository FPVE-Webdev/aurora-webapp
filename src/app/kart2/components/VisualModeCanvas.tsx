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

import { useEffect, useRef } from 'react';

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
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isEnabled || !canvasRef.current) {
      // Cleanup when disabled
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

    // TODO: Shader compilation and rendering loop will be added in Phase 2
    // For now, just render a simple test pattern
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    console.log('[VisualMode] Canvas initialized', {
      kpIndex,
      auroraProbability,
      cloudCoverage,
      tromsoCoords
    });

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (glRef.current) {
        glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
      }
    };
  }, [isEnabled, kpIndex, auroraProbability, cloudCoverage, timestamp, tromsoCoords]);

  if (!isEnabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    />
  );
}
