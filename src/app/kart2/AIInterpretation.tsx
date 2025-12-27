'use client';

import { useEffect, useState, useRef } from 'react';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
    // AI is opt-in for /kart2. Avoid noisy 500s when OpenAI isn't configured locally.
    // Enable by setting: NEXT_PUBLIC_KART2_AI=1
    if (process.env.NEXT_PUBLIC_KART2_AI !== '1') return;

    // Only fetch once per component lifecycle
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const fetchInterpretation = async () => {
      try {
        const controller = new AbortController();

        // Timeout after 8 seconds
        timeoutId = setTimeout(() => {
          if (isMountedRef.current) {
            controller.abort();
          }
        }, 8000);

        const res = await fetch('/api/ai-interpretation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kp, probability, tromsoCloud, bestRegion }),
          signal: controller.signal,
        });

        // Clear timeout if request completed
        if (timeoutId) clearTimeout(timeoutId);

        if (!res.ok) return;

        const responseText = await res.text();
        if (!responseText || !responseText.trim()) return;

        const data = JSON.parse(responseText) as { interpretation?: string };
        // Only update state if component is still mounted
        if (data.interpretation && isMountedRef.current) {
          setText(data.interpretation);
        }
      } catch (err) {
        // Clear timeout on error
        if (timeoutId) clearTimeout(timeoutId);

        // Gracefully ignore network errors and abort errors
        if (err instanceof Error) {
          if (err.name === 'AbortError' || err.message === 'Failed to fetch') {
            // Request was aborted or network error - silently ignore
            return;
          }
        }
        // Suppress warnings for expected failures during development
      }
    };

    fetchInterpretation();

    return () => {
      isMountedRef.current = false;
      // Clear timeout on unmount
      if (timeoutId) clearTimeout(timeoutId);
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
