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
 *
 * NEXT STEPS (FASE 1):
 * - TODO: Implement real aurora data integration
 * - TODO: Add Mapbox layers with aurora oval
 * - TODO: Optimize for mobile/public users
 */

import { Metadata } from 'next';
import MapView from './MapView';

export const metadata: Metadata = {
  title: 'Nordlyskart (Eksperimentelt) | Aurora Tromsø',
  description: 'Eksperimentelt offentlig nordlyskart',
};

export default function Kart2Page() {
  return (
    <div className="fixed inset-0 bg-arctic-900">
      <MapView />
    </div>
  );
}
