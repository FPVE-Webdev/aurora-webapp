/**
 * Spot Selector Component
 *
 * Two-step location selector: Region → Specific location
 * Shows 30+ observation spots grouped by region
 */

'use client';

import { useState, useMemo } from 'react';
import { ObservationSpot } from '@/types/aurora';
import { OBSERVATION_SPOTS } from '@/lib/constants';
import { MapPin, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auroraShadows } from '@/lib/auroraTheme';
import { usePremium } from '@/contexts/PremiumContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { filterSpotsByTier } from '@/lib/utils/spotFiltering';

interface SpotSelectorProps {
  selectedSpot: ObservationSpot;
  onSelectSpot: (spot: ObservationSpot) => void;
}

// Region definitions
const REGIONS = [
  { id: 'troms', name: 'Troms' },
  { id: 'finnmark', name: 'Finnmark' },
  { id: 'nordland', name: 'Nordland' },
  { id: 'nordic', name: 'Arktis' },
];

// Get spots for a specific region
const getSpotsByRegion = (regionId: string, spots: ObservationSpot[]): ObservationSpot[] => {
  return spots.filter(s => s.region === regionId);
};

export function SpotSelector({ selectedSpot, onSelectSpot }: SpotSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>('troms');
  const { subscriptionTier } = usePremium();
  const { t } = useLanguage();

  // Filter all spots based on user's subscription tier
  const availableSpots = useMemo(() => {
    return filterSpotsByTier(OBSERVATION_SPOTS, subscriptionTier);
  }, [subscriptionTier]);

  // Get unique regions from available spots
  const visibleRegions = useMemo(() => {
    const regionIds = new Set(availableSpots.map(s => s.region));
    return REGIONS.filter(r => regionIds.has(r.id as any));
  }, [availableSpots]);

  // Get current region's spots (filtered by tier)
  const regionSpots = selectedRegion ? getSpotsByRegion(selectedRegion, availableSpots) : [];

  // Get region name
  const currentRegionName = REGIONS.find(r => r.id === selectedRegion)?.name || '';

  const handleRegionSelect = (regionId: string) => {
    const spots = getSpotsByRegion(regionId, availableSpots);

    // If only one spot in region, select it directly
    if (spots.length === 1) {
      onSelectSpot(spots[0]);
      setSelectedRegion(null);
    } else if (spots.length > 0) {
      setSelectedRegion(regionId);
    }
  };

  const handleSpotSelect = (spot: ObservationSpot) => {
    onSelectSpot(spot);
    setSelectedRegion(null);
  };

  const handleBack = () => {
    setSelectedRegion(null);
  };

  return (
    <div className="card-aurora bg-arctic-800/50 rounded-lg border border-white/5 p-4">
      <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
        <MapPin className="w-4 h-4" />
        {selectedRegion ? (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('selectObservationPoint')}
            </button>
            <span className="text-white">/ {currentRegionName}</span>
          </>
        ) : (
          'Velg observasjonspunkt'
        )}
      </h3>

      <div className="flex flex-wrap gap-2">
        {!selectedRegion ? (
          // Step 1: Show regions (filtered by tier)
          <>
            {visibleRegions.map((region, index) => {
              const isCurrentRegion = selectedSpot.region === region.id || selectedSpot.id === region.id;
              const spotCount = getSpotsByRegion(region.id, availableSpots).length;

              return (
                <div
                  key={region.id}
                  className="card-glow card-animate"
                  style={{
                    animationDelay: `${index * 0.04}s`,
                  }}
                >
                  <button
                    onClick={() => handleRegionSelect(region.id)}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-all flex flex-col items-center gap-1 min-w-[80px] w-full text-white/90 rounded-xl',
                      isCurrentRegion
                        ? 'bg-primary text-white'
                        : 'bg-white/10 hover:bg-white/20'
                    )}
                    style={{
                      boxShadow: auroraShadows.card,
                    }}
                  >
                    <span>{region.name}</span>
                    {spotCount > 1 && (
                      <span className="text-xs opacity-70">{spotCount} steder</span>
                    )}
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          // Step 2: Show spots in selected region
          <>
            {regionSpots.map((spot, index) => (
              <div
                key={spot.id}
                className="card-glow card-animate"
                style={{
                  animationDelay: `${index * 0.04}s`,
                }}
              >
                <button
                  onClick={() => handleSpotSelect(spot)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium transition-all text-white/90 w-full rounded-xl',
                    selectedSpot.id === spot.id
                      ? 'bg-primary text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  )}
                  style={{
                    boxShadow: auroraShadows.card,
                  }}
                >
                  {spot.name}
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
