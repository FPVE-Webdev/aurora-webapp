'use client';

import { useEffect, useState, useRef } from 'react';

interface AIProps {
  kp: number;
  probability: number;
  tromsoCloud: number;
  bestRegion: { name: string; visibilityScore: number } | null;
}

export default function AIInterpretation({ kp, probability, tromsoCloud, bestRegion }: AIProps) {
  const [text, setText] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let controller: AbortController | null = null;

    const fetchInterpretation = async () => {
      // Prevent duplicate requests from StrictMode double-invoke
      if (hasFetchedRef.current) return;
      hasFetchedRef.current = true;

      try {
        controller = new AbortController();
        const timeoutId = setTimeout(() => controller?.abort(), 8000);

        const res = await fetch('/api/ai-interpretation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kp, probability, tromsoCloud, bestRegion }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) return;

        const text = await res.text();
        if (!text || !text.trim()) return;

        const data = JSON.parse(text) as { interpretation?: string };
        if (data.interpretation && isMountedRef.current) {
          setText(data.interpretation);
          console.info('[kart2][signal] ai_displayed');
        }
      } catch (err) {
        // Gracefully ignore network errors (endpoint may not exist yet)
        if (err instanceof Error && err.name === 'AbortError') {
          // Timeout - silently ignore
          return;
        }
        if (err instanceof TypeError && err.message === 'Failed to fetch') {
          // Network error - silently ignore (endpoint may not exist)
          return;
        }
        // Log unexpected errors only
        if (!(err instanceof Error && err.name === 'AbortError')) {
          console.warn('[kart2] AI interpretation unavailable');
        }
      }
    };

    fetchInterpretation();

    return () => {
      isMountedRef.current = false;
      controller?.abort();
    };
  }, []);

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
