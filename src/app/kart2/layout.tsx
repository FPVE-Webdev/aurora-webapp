'use client';

import { useEffect } from 'react';

export default function Kart2Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically load Mapbox GL CSS on client-side only
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return <>{children}</>;
}
