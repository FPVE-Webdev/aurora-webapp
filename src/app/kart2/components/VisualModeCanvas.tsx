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
import { generateSubdividedPlane, getRecommendedResolution, validateMeshData } from '../utils/geometry';
import {
  VISUAL_MODE_CONFIG,
  getQualityConfig,
  calculateAuroraIntensity,
  calculateCurtainDensity
} from '../config/visualMode.config';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Detect if device is mobile based on viewport width and touch support
 */
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768 || 'ontouchstart' in window;
};

interface WeatherData {
  windSpeed: number;        // m/s
  windDirection: number;    // degrees (default 270 = westerly)
  weatherType: number;      // encoded: 0-5
  precipitation: number;    // mm
}

interface VisualModeCanvasProps {
  isEnabled: boolean;
  weatherModeEnabled: boolean; // Controls cloud/weather layer visibility
  kpIndex: number;
  auroraProbability: number;
  cloudCoverage: number;
  timestamp: string; // ISO 8601 timestamp
  tromsoCoords: [number, number];
  mapInstance: any; // Mapbox map instance
  weatherData?: WeatherData; // Optional weather data for cloud rendering
  /** Called if the visual mode renderer hits an unrecoverable runtime error. */
  onFatalError?: (error: unknown) => void;
}

export default function VisualModeCanvas({
  isEnabled,
  weatherModeEnabled,
  kpIndex,
  auroraProbability,
  cloudCoverage,
  timestamp,
  tromsoCoords,
  mapInstance,
  weatherData,
  onFatalError
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
  const fatalErrorReportedRef = useRef(false);

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
        // keep dev console clean unless explicitly debugging
        if (process.env.NEXT_PUBLIC_KART2_DEBUG === '1') {
          // eslint-disable-next-line no-console
          console.log('[VisualMode] Page visibility:', isNowVisible ? 'visible' : 'hidden');
        }
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
    let positionBuffer: WebGLBuffer | null = null;
    let indexBuffer: WebGLBuffer | null = null;
    let meshIndexCount = 0;

    const reportFatal = (err: unknown) => {
      if (fatalErrorReportedRef.current) return;
      fatalErrorReportedRef.current = true;

      // Production must be clean (no console errors). Log only in dev.
      if (!IS_PRODUCTION) {
        // eslint-disable-next-line no-console
        console.error('[VisualMode] Fatal error:', err);
      }

      try {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } catch {}

      try {
        setShouldRender(false);
      } catch {}

      try {
        onFatalError?.(err);
      } catch {}

      try {
        if (programRef.current && glRef.current) {
          glRef.current.deleteProgram(programRef.current);
          programRef.current = null;
        }
        if (positionBuffer && glRef.current) {
          glRef.current.deleteBuffer(positionBuffer);
        }
        if (indexBuffer && glRef.current) {
          glRef.current.deleteBuffer(indexBuffer);
        }
        if (glRef.current) {
          glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
          glRef.current = null;
        }
      } catch {}
    };

    // Define no-op placeholders so catch blocks can safely reference them.
    let cleanupEventListeners = () => {};
    let resize = () => {};
    let updateOnMapChange = () => {};

    try {
      // Initialize WebGL
      const gl = canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false
      });

      if (!gl) {
        // Not a crash; just disable Visual Mode rendering.
        reportFatal(new Error('WebGL not supported or context unavailable'));
        return;
      }

      // Guard against context loss
      if (gl.isContextLost?.()) {
        if (!IS_PRODUCTION) {
          console.warn('[VisualMode] WebGL context is lost - attempting recovery');
        }
        // Attempt to recover by clearing the ref and requesting a new context on next frame
        glRef.current = null;
        return;
      }

      glRef.current = gl;

      // Handle context loss events
      const handleContextLoss = (event: Event) => {
        event.preventDefault();
        if (!IS_PRODUCTION) {
          console.warn('[VisualMode] WebGL context lost event - pausing rendering');
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };

      const handleContextRestore = () => {
        if (!IS_PRODUCTION) {
          console.log('[VisualMode] WebGL context restored - resuming rendering');
        }
        // Context restoration is handled by reinitializing the effect
      };

      canvas.addEventListener('webglcontextlost', handleContextLoss);
      canvas.addEventListener('webglcontextrestored', handleContextRestore);

      // Cleanup event listeners in the return function
      cleanupEventListeners = () => {
        canvas.removeEventListener('webglcontextlost', handleContextLoss);
        canvas.removeEventListener('webglcontextrestored', handleContextRestore);
      };

      // Resize canvas to match display size with proper DPI scaling
      resize = () => {
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
      updateOnMapChange = () => {
        // Render loop handles projection updates automatically
      };
      mapInstance.on('move', updateOnMapChange);
      mapInstance.on('zoom', updateOnMapChange);

    // Compile shaders
      const program = createShaderProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
      if (!program) {
        reportFatal(new Error('Failed to create shader program'));
        return;
      }

    programRef.current = program;
    gl.useProgram(program);

      // ===== GENERATE SUBDIVIDED MESH FOR VERTEX DISPLACEMENT =====
      // High-poly geometry required for smooth sine-wave curtain animation
      const meshResolution = getRecommendedResolution(isMobileRef.current);
      const mesh = generateSubdividedPlane(meshResolution);

      // Validate mesh data
      if (!validateMeshData(mesh)) {
        reportFatal(new Error('Invalid mesh data generated'));
        return;
      }

      meshIndexCount = mesh.indexCount;

      // Log mesh stats in dev mode
      if (!IS_PRODUCTION) {
        console.log('[VisualMode] Mesh generated:', {
          resolution: meshResolution,
          vertices: mesh.vertexCount,
          triangles: mesh.indexCount / 3,
          isMobile: isMobileRef.current
        });
      }

      // Create vertex buffer
      positionBuffer = gl.createBuffer();
      if (!positionBuffer) {
        reportFatal(new Error('Failed to create vertex buffer'));
        return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

      // Create index buffer
      indexBuffer = gl.createBuffer();
      if (!indexBuffer) {
        reportFatal(new Error('Failed to create index buffer'));
        return;
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    // Setup vertex attribute
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations - Core
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const auroraIntensityLocation = gl.getUniformLocation(program, 'u_auroraIntensity');
    const kpIndexLocation = gl.getUniformLocation(program, 'u_kpIndex');
    const tromsoCenterLocation = gl.getUniformLocation(program, 'u_tromsoCenter');
    const cloudCoverageLocation = gl.getUniformLocation(program, 'u_cloudCoverage');
    const mapPitchLocation = gl.getUniformLocation(program, 'u_mapPitch');

    // Vertex shader uniforms (curtain wave effect)
    const curtainWaveAmplitudeLocation = gl.getUniformLocation(program, 'u_curtainWaveAmplitude');
    const curtainWaveFrequencyLocation = gl.getUniformLocation(program, 'u_curtainWaveFrequency');

    // 3D Rendering uniform locations
    const cameraAltitudeLocation = gl.getUniformLocation(program, 'u_cameraAltitude');
    const magneticNorthLocation = gl.getUniformLocation(program, 'u_magneticNorth');
    const curtainDensityLocation = gl.getUniformLocation(program, 'u_curtainDensity');
    const altitudeScaleLocation = gl.getUniformLocation(program, 'u_altitudeScale');
    const depthFactorLocation = gl.getUniformLocation(program, 'u_depthFactor');

    // Visual tuning uniform locations
    const alphaTuneLocation = gl.getUniformLocation(program, 'u_alphaTune');
    const glowRadiusLocation = gl.getUniformLocation(program, 'u_glowRadius');
    const edgeBlendLocation = gl.getUniformLocation(program, 'u_edgeBlend');
    const motionSpeedLocation = gl.getUniformLocation(program, 'u_motionSpeed');
    const qualityScaleLocation = gl.getUniformLocation(program, 'u_qualityScale');

    // Cloud layer uniform locations
    const windSpeedLocation = gl.getUniformLocation(program, 'u_windSpeed');
    const windDirectionLocation = gl.getUniformLocation(program, 'u_windDirection');
    const weatherTypeLocation = gl.getUniformLocation(program, 'u_weatherType');
    const precipitationLocation = gl.getUniformLocation(program, 'u_precipitation');

    // Toggle control uniform locations
    const auroraEnabledLocation = gl.getUniformLocation(program, 'u_auroraEnabled');
    const weatherEnabledLocation = gl.getUniformLocation(program, 'u_weatherEnabled');

    // Enable alpha blending
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Calculate aurora intensity from config
    const auroraIntensity = calculateAuroraIntensity(kpIndex, auroraProbability);

    // Calculate curtain density based on KP index
    const curtainDensity = calculateCurtainDensity(kpIndex);

    // Log aurora data in dev mode (after calculation)
    if (!IS_PRODUCTION) {
      console.log('[VisualMode] Aurora data:', {
        kpIndex,
        auroraProbability,
        auroraIntensity,
        curtainDensity
      });
      console.log('[VisualMode] Weather data:', {
        weatherModeEnabled,
        cloudCoverage,
        cloudImpact: VISUAL_MODE_CONFIG.cloudImpact
      });
    }

    // Adaptive quality: detect device and set FPS targets
    isMobileRef.current = isMobileDevice();
    let targetDeltaTime = isMobileRef.current ? 33 : 16; // Mobile: 30 FPS, Desktop: 60 FPS
    let lowFpsCount = 0;

      // Render loop with adaptive FPS capping and idle pause support
      const render = () => {
        try {
      // Idle pause: skip rendering if page is not visible
      // (but still schedule next frame - browser throttles requestAnimationFrame when hidden)
      if (!isPageVisible) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (!glRef.current || !programRef.current) return;

      // Guard against context loss
      if (glRef.current.isContextLost?.()) {
        // WebGL context lost - stop rendering and wait for restoration
        if (!IS_PRODUCTION) {
          console.warn('[VisualMode] WebGL context lost during render - pausing');
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

        // Warn if FPS is critically low (dev only)
        if (!IS_PRODUCTION && fps < 15) {
          console.warn('[VisualMode] Low FPS detected:', fps.toFixed(1), '- consider disabling');
        }
      }

      // Early exit optimization: skip rendering if both toggles are off
      if (!isEnabled && !weatherModeEnabled) {
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

      // Get quality config based on zoom level for LOD
      const zoom = mapInstance.getZoom();
      const qualityConfig = getQualityConfig(isMobileRef.current, zoom);

      // Set core uniforms
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, currentTime);
      // Aurora intensity: always pass real value (toggle handled in shader)
      gl.uniform1f(auroraIntensityLocation, auroraIntensity);
      // KP Index: pass raw value for color shift (0-9 range)
      gl.uniform1f(kpIndexLocation, kpIndex);
      gl.uniform2f(tromsoCenterLocation, screenX, screenY);
      // Cloud coverage: always pass real value (toggle handled in shader)
      gl.uniform1f(cloudCoverageLocation, cloudCoverage / 100);

      // Vertex shader uniforms for curtain wave effect
      gl.uniform1f(curtainWaveAmplitudeLocation, VISUAL_MODE_CONFIG.curtainWaveAmplitude);
      gl.uniform1f(curtainWaveFrequencyLocation, VISUAL_MODE_CONFIG.curtainWaveFrequency);

      // Map pitch for aurora tilt alignment
      const pitch = mapInstance.getPitch(); // 0-85 degrees (Mapbox maximum)
      gl.uniform1f(mapPitchLocation, Math.max(0, Math.min(1, pitch / 85.0)));

      // 3D Rendering uniforms
      gl.uniform1f(cameraAltitudeLocation, VISUAL_MODE_CONFIG.cameraAltitude);
      gl.uniform2f(magneticNorthLocation,
        VISUAL_MODE_CONFIG.magneticNorth[0],
        VISUAL_MODE_CONFIG.magneticNorth[1]
      );
      gl.uniform1f(curtainDensityLocation, curtainDensity);
      gl.uniform1f(altitudeScaleLocation, VISUAL_MODE_CONFIG.altitudeScale);
      gl.uniform1f(depthFactorLocation, VISUAL_MODE_CONFIG.depthFactor);

      // Visual tuning uniforms from config
      gl.uniform1f(alphaTuneLocation, VISUAL_MODE_CONFIG.alphaTune);
      gl.uniform1f(glowRadiusLocation, VISUAL_MODE_CONFIG.tromsoGlowRadius);
      gl.uniform1f(edgeBlendLocation, VISUAL_MODE_CONFIG.groundFadeEnd);
      gl.uniform1f(motionSpeedLocation, VISUAL_MODE_CONFIG.motionSpeedBase);
      gl.uniform1f(qualityScaleLocation, qualityConfig.qualityScale);

      // Cloud layer uniforms (with defaults if weatherData not provided)
      gl.uniform1f(windSpeedLocation, weatherData?.windSpeed ?? 5.0);
      gl.uniform1f(windDirectionLocation, weatherData?.windDirection ?? 270.0);
      gl.uniform1f(weatherTypeLocation, weatherData?.weatherType ?? 2.0);
      gl.uniform1f(precipitationLocation, weatherData?.precipitation ?? 0.0);

      // Toggle controls - send to shader
      gl.uniform1f(auroraEnabledLocation, isEnabled ? 1.0 : 0.0);
      gl.uniform1f(weatherEnabledLocation, weatherModeEnabled ? 1.0 : 0.0);

      // Draw subdivided mesh (indexed triangles)
      gl.drawElements(gl.TRIANGLES, meshIndexCount, gl.UNSIGNED_SHORT, 0);

      animationFrameRef.current = requestAnimationFrame(render);
        } catch (err) {
          reportFatal(err);
        }
    };

      render();

      return () => {
        cleanupEventListeners();
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
        if (indexBuffer && glRef.current) {
          glRef.current.deleteBuffer(indexBuffer);
        }
        if (glRef.current) {
          glRef.current.getExtension('WEBGL_lose_context')?.loseContext();
          glRef.current = null;
        }
      };
    } catch (err) {
      // Best-effort cleanup if init crashes mid-way.
      try {
        cleanupEventListeners();
      } catch {}
      try {
        window.removeEventListener('resize', resize);
      } catch {}
      try {
        mapInstance.off('move', updateOnMapChange);
        mapInstance.off('zoom', updateOnMapChange);
      } catch {}
      reportFatal(err);
      return;
    }
  }, [isEnabled, kpIndex, auroraProbability, cloudCoverage, timestamp, tromsoCoords, mapInstance, shouldRender, isPageVisible, onFatalError]);

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
