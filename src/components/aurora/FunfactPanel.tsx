/**
 * Funfact Panel Component
 *
 * Displays interesting aurora facts in a numbered list format
 * Shows educational content about northern lights
 */

'use client';

import { Lightbulb } from 'lucide-react';
import { auroraShadows, auroraSpacing } from '@/lib/auroraTheme';

interface FunfactPanelProps {
  funfacts: string[];
}

export function FunfactPanel({ funfacts }: FunfactPanelProps) {
  if (!funfacts || funfacts.length === 0) {
    return null;
  }

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
          Did you know?
        </h3>
      </div>

      <div className="space-y-3">
        {funfacts.map((fact, index) => (
          <div
            key={index}
            className="flex gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors"
          >
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center">
              {index + 1}
            </span>
            <p className="text-sm text-white/70 leading-relaxed flex-1">
              {fact}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
