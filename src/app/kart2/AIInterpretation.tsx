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
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Reset on each effect run (for StrictMode safety)
    isMountedRef.current = true;

    // Only fetch once per component lifecycle
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchInterpretation = async () => {
      try {
        // Only create controller if we haven't already (prevent double-invoke issues)
        if (!controllerRef.current) {
          controllerRef.current = new AbortController();
        }

        const timeoutId = setTimeout(() => {
          if (controllerRef.current && isMountedRef.current) {
            controllerRef.current.abort();
          }
        }, 8000);

        const res = await fetch('/api/ai-interpretation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kp, probability, tromsoCloud, bestRegion }),
          signal: controllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) return;

        const responseText = await res.text();
        if (!responseText || !responseText.trim()) return;

        const data = JSON.parse(responseText) as { interpretation?: string };
        if (data.interpretation && isMountedRef.current) {
          setText(data.interpretation);
          console.info('[kart2][signal] ai_displayed');
        }
      } catch (err) {
        // Gracefully ignore network errors and abort errors
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            // Request was aborted (timeout or cleanup) - silently ignore
            return;
          }
          if (err.message === 'Failed to fetch') {
            // Network error - silently ignore (endpoint may not exist)
            return;
          }
        }
        // Suppress warnings for expected failures during development
      }
    };

    fetchInterpretation();

    return () => {
      isMountedRef.current = false;
      // Only abort if component is still mounted and controller exists
      if (controllerRef.current && !controllerRef.current.signal.aborted) {
        try {
          controllerRef.current.abort();
        } catch {
          // Suppress any errors from abort
        }
      }
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
