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
    // Reset on each effect run (for StrictMode safety)
    isMountedRef.current = true;

    // Only fetch once per component lifecycle
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Create a fresh controller for this effect run (prevents StrictMode double-invoke issues)
    const controller = new AbortController();

    const fetchInterpretation = async () => {
      try {
        // Create a timeout signal that aborts after 8 seconds
        const timeoutSignal = AbortSignal.timeout(8000);

        // Race the user's abort with the timeout abort
        const abortController = AbortController.prototype.constructor;
        const composedController = new (abortController as any)();

        controller.signal.addEventListener('abort', () => {
          try {
            composedController.abort();
          } catch {
            // Ignore errors
          }
        });

        timeoutSignal.addEventListener('abort', () => {
          try {
            composedController.abort();
          } catch {
            // Ignore errors
          }
        });

        const res = await fetch('/api/ai-interpretation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kp, probability, tromsoCloud, bestRegion }),
          signal: composedController.signal,
        });

        if (!res.ok) return;

        const responseText = await res.text();
        if (!responseText || !responseText.trim()) return;

        const data = JSON.parse(responseText) as { interpretation?: string };
        if (data.interpretation && isMountedRef.current) {
          setText(data.interpretation);
          if (!IS_PRODUCTION) {
            console.info('[kart2][signal] ai_displayed');
          }
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
      // Abort the fetch request on cleanup (safe to call multiple times with check)
      if (!controller.signal.aborted) {
        try {
          controller.abort();
        } catch {
          // Ignore abort errors (may occur due to race conditions)
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
