/**
 * AuraRoot Component
 * Global mount point for Aura system
 *
 * Mounts once, sends INIT on mount, updates context on route change
 * Context-awareness only - no automatic state transitions
 */

'use client';

import { useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AuraView } from './AuraView';
import { useAuraMachine } from './useAuraMachine';
import { AuraState, AuraEvent } from './auraStates';
import { createStubMapController } from './mapController';
import { UserIntent } from './aiService';

export function AuraRoot() {
  const pathname = usePathname();

  // Create stable map controller instance
  const mapController = useMemo(() => createStubMapController(), []);

  const { state, sendEvent } = useAuraMachine({
    initialState: AuraState.IDLE_DOCKED, // Start visible instead of HIDDEN
    plan: 'free', // Default to free plan
    page: {
      path: pathname || '/',
    },
    geoScope: {
      // Static initial geoScope (Tromsø coordinates)
      latitude: 69.6492,
      longitude: 18.9553,
      region: 'Tromsø',
    },
  });

  // Send INIT event once on mount
  useEffect(() => {
    sendEvent(AuraEvent.INIT);
  }, []); // Empty deps - run once on mount

  // Update page context on route change
  // Does NOT trigger state transitions - just updates context
  useEffect(() => {
    if (pathname) {
      sendEvent(AuraEvent.CONTEXT_CHANGED, {
        page: {
          path: pathname,
        },
      });
    }
  }, [pathname, sendEvent]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
      }}
    >
      <AuraView
        config={{ plan: 'free' }}
        mapController={mapController}
        userIntent={UserIntent.AURORA_VISIBILITY}
      />
    </div>
  );
}
