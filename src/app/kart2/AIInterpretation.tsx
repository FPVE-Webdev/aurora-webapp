'use client';

import { useEffect, useState } from 'react';

interface AIProps {
  kp: number;
  probability: number;
  tromsoCloud: number;
  bestRegion: { name: string; visibilityScore: number } | null;
}

export default function AIInterpretation({ kp, probability, tromsoCloud, bestRegion }: AIProps) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInterpretation() {
      try {
        const res = await fetch('/api/ai-interpretation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kp, probability, tromsoCloud, bestRegion }),
        });
        
        if (!res.ok) return;
        
        const data = await res.json();
        if (data.interpretation) {
          setText(data.interpretation);
        }
      } catch (err) {
        // Silently fail
        console.warn('AI layer skipped');
      } finally {
        setLoading(false);
      }
    }

    // Only fetch once on mount (or when significant data changes, but keeping it simple for now)
    fetchInterpretation();
  }, []); // Empty dependency array for "once per session" feel, or add props if we want live updates

  if (!text) return null;

  return (
    <div className="bg-white/90 p-3 rounded shadow text-xs text-gray-700 mt-2 border-l-4 border-purple-400">
      <p className="font-semibold mb-1 text-purple-900 u-flex u-items-center u-gap-1">
        <span>🤖</span>
        <span>AI Oppsummering</span>
      </p>
      <p className="italic opacity-90 leading-snug">
        "{text}"
      </p>
    </div>
  );
}
