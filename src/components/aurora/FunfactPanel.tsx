/**
 * Funfact Panel Component
 *
 * Displays interesting aurora facts in a carousel format
 * Auto-rotates every 8 seconds with manual navigation
 * Timer resets when user manually navigates
 */

'use client';

import { useState, useEffect } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { auroraShadows, auroraSpacing } from '@/lib/auroraTheme';
import { useLanguage } from '@/contexts/LanguageContext';

interface FunfactPanelProps {
  funfacts: string[];
}

export function FunfactPanel({ funfacts }: FunfactPanelProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  if (!funfacts || funfacts.length === 0) {
    return null;
  }

  // Auto-rotation effect
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext(true); // true = auto-navigation
    }, 8000);

    return () => clearInterval(timer);
  }, [currentIndex, funfacts.length]);

  const handleNext = (isAuto = false) => {
    if (!isAuto) setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % funfacts.length);
    if (!isAuto) {
      setTimeout(() => setIsTransitioning(false), 300);
    }
  };

  const handlePrev = () => {
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + funfacts.length) % funfacts.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div
      className="card-aurora animate-fade-in bg-arctic-800/50 rounded-lg border border-white/5"
      style={{
        padding: auroraSpacing.normal,
        boxShadow: auroraShadows.card,
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-display font-semibold text-white">
          {t('didYouKnow')}
        </h3>
      </div>

      {/* Carousel content */}
      <div className="relative min-h-[80px]">
        <div
          className={`p-4 rounded-lg bg-primary/5 border border-primary/10 transition-all duration-300 ${
            isTransitioning ? 'opacity-0 translate-x-2' : 'opacity-100 translate-x-0'
          }`}
        >
          <p className="text-base text-white/80 leading-relaxed">
            {funfacts[currentIndex]}
          </p>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handlePrev}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Previous fact"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-2">
          {funfacts.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsTransitioning(true);
                setCurrentIndex(index);
                setTimeout(() => setIsTransitioning(false), 300);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary w-6'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to fact ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={() => handleNext(false)}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
          aria-label="Next fact"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
