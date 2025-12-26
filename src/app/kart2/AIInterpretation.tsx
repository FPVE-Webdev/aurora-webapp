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
  // Signal Ref
  const [hasLoggedAI, setHasLoggedAI] = useState(false); // Using state cause logic is inside effect

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
          
          // Signal: AI Displayed (Task 2)
          if (!hasLoggedAI) {
            console.info('[kart2][signal] ai_displayed');
            setHasLoggedAI(true);
          }
        }
      } catch (err) {
        // Silently fail
        console.warn('AI layer skipped');
      }
    }

    // Only fetch once on mount (or when significant data changes, but keeping it simple for now)
    fetchInterpretation();
  }, []); // Empty dependency array for "once per session" feel, or add props if we want live updates

  if (!text) return null;

  return (
    <div className="bg-gray-900/90 backdrop-blur-md p-3 rounded shadow-lg text-xs text-gray-200 mt-2 border-l-4 border-purple-500">
      <p className="font-semibold mb-1 text-purple-300 u-flex u-items-center u-gap-1">
        <span>🤖</span>
        <span>AI Oppsummering</span>
      </p>
      <p className="italic opacity-90 leading-snug text-gray-100">
        "{text}"
      </p>
    </div>
  );
}
