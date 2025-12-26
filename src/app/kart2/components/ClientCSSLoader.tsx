'use client';

import { useEffect } from 'react';

/**
 * Client-only component that injects Mapbox GL CSS into the document.
 * Isolated to minimal 'use client' component to reduce bundle impact.
 */
export function ClientCSSLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return null;
}
