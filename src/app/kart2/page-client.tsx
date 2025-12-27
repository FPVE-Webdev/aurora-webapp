'use client';

import MapView from './MapView';
import { useKart2Exposure } from './useKart2Exposure';

export default function Kart2PageClient() {
  useKart2Exposure();

  return (
    <div className="w-screen h-screen overflow-hidden">
      <MapView />
    </div>
  );
}
