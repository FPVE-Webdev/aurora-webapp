'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SpotlightProps {
  targetElement: HTMLElement | null;
  message?: string;
  onDismiss: () => void;
  pulseColor?: string;
}

export function Spotlight({ targetElement, message, onDismiss, pulseColor = 'rgb(52, 245, 197)' }: SpotlightProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetElement) return;

    // Get element position
    const updateRect = () => {
      const elementRect = targetElement.getBoundingClientRect();
      setRect(elementRect);
    };

    updateRect();

    // Update on scroll/resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [targetElement]);

  if (!rect) return null;

  const padding = 8; // Padding around element
  const highlightRect = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Dark overlay with hole for highlighted element */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ zIndex: 9998 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={highlightRect.left}
              y={highlightRect.top}
              width={highlightRect.width}
              height={highlightRect.height}
              rx="12"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          onClick={onDismiss}
        />
      </svg>

      {/* Pulsing border around element */}
      <div
        className="absolute pointer-events-none animate-pulse"
        style={{
          top: `${highlightRect.top}px`,
          left: `${highlightRect.left}px`,
          width: `${highlightRect.width}px`,
          height: `${highlightRect.height}px`,
          border: `3px solid ${pulseColor}`,
          borderRadius: '12px',
          boxShadow: `0 0 20px ${pulseColor}, inset 0 0 20px ${pulseColor}`,
          zIndex: 9999,
        }}
      />

      {/* Message tooltip */}
      {message && (
        <div
          className="absolute pointer-events-auto z-[10000] animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            top: `${highlightRect.top + highlightRect.height + 16}px`,
            left: `${Math.max(16, Math.min(window.innerWidth - 316, highlightRect.left + highlightRect.width / 2 - 150))}px`,
            width: '300px',
          }}
        >
          <div className="bg-slate-900/95 backdrop-blur-xl border border-primary/30 rounded-xl p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-xs font-bold">💡</span>
              </div>
              <button
                onClick={onDismiss}
                className="text-white/50 hover:text-white transition-colors flex-shrink-0"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">{message}</p>
            <button
              onClick={onDismiss}
              className="mt-3 w-full px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
