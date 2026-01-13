/**
 * Map Controller Interface
 * Simple map actions for Aura guidance
 *
 * No complex logic, just basic pan/zoom/highlight
 */

export interface MapLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly zoom?: number;
}

export interface MapController {
  /**
   * Pan and zoom to a location
   * Returns a promise that resolves when animation completes
   */
  panTo: (location: MapLocation) => Promise<void>;

  /**
   * Highlight a specific location
   * Returns a promise that resolves when highlight is shown
   */
  highlight: (location: MapLocation) => Promise<void>;
}

/**
 * Static test location (Tromsø center)
 */
export const TEST_LOCATION: MapLocation = {
  latitude: 69.6492,
  longitude: 18.9553,
  zoom: 12,
};

/**
 * Simple map controller stub for testing
 * Simulates map actions with delays
 */
export function createStubMapController(): MapController {
  return {
    panTo: async (location: MapLocation) => {
      console.log('[MapController] Pan to:', location);
      // Simulate pan/zoom animation
      await new Promise((resolve) => setTimeout(resolve, 500));
    },

    highlight: async (location: MapLocation) => {
      console.log('[MapController] Highlight:', location);
      // Simulate highlight rendering
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
  };
}
