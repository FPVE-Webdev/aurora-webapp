/**
 * /kart2 - EXPERIMENTAL PUBLIC AURORA MAP
 *
 * POSITIONING:
 * - This is a temporary, experimental public-facing map
 * - Existing /live map = professional tool for guides, operators, chase coordinators
 * - /kart2 = simplified, public-facing experimental map
 *
 * STATUS: SCAFFOLDING ONLY
 * - Can be deleted later without side effects
 * - Not linked from main navigation yet
 * - No auth required (public access)
 * - Redeploy trigger: Vercel env var added
 *
 * NEXT STEPS (FASE 1):
 * - TODO: Implement real aurora data integration
 * - TODO: Add Mapbox layers with aurora oval
 * - TODO: Optimize for mobile/public users
 */

'use client';

import MapView from './MapView';
import { useKart2Exposure } from './useKart2Exposure';

// PRODUCTION LOCK:
// This module is considered production-stable.
// No new features or refactors should be introduced without an explicit new phase.
// Critical bugfixes only.
export default function Kart2Page() {
  useKart2Exposure();

  return (
    <div className="w-screen h-screen overflow-hidden">
      <MapView />
    </div>
  );
}
