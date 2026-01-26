/**
 * Forecast Message Component
 *
 * Displays the Site-AI explanation text from deterministic templates.
 * Renders exactly as provided—no interpretation or modification.
 */

'use client';

import { SiteAIDecision } from '@/types/siteAI';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ForecastMessageProps {
  /** Site-AI decision containing the explanation */
  decision: SiteAIDecision;
}

export function ForecastMessage({ decision }: ForecastMessageProps) {
  // Select icon and styling based on state
  const getStateIcon = () => {
    switch (decision.state) {
      case 'excellent':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'possible':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'unlikely':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
    }
  };

  const getStateColor = () => {
    switch (decision.state) {
      case 'excellent':
        return 'bg-green-500/10 border-green-500/30 text-green-100';
      case 'possible':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-100';
      case 'unlikely':
        return 'bg-red-500/10 border-red-500/30 text-red-100';
    }
  };

  return (
    <div
      className={`rounded-lg border p-4 flex gap-3 items-start ${getStateColor()}`}
      role="status"
      aria-label={`Aurora forecast: ${decision.state}`}
    >
      <div className="flex-shrink-0 mt-0.5">{getStateIcon()}</div>
      <div className="flex-grow">
        <p className="text-sm leading-relaxed font-medium">{decision.explanation}</p>
        <p className="text-xs mt-2 opacity-70">
          {new Date(decision.computedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
