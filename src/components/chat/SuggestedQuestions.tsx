/**
 * Suggested Questions Component
 * Displays popular questions based on anonymized user history
 */

'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface SuggestedQuestion {
  text: string;
  language: string;
}

interface SuggestedQuestionsProps {
  masterStatus?: 'GO' | 'WAIT' | 'NO';
  onSelect: (question: string) => void;
  className?: string;
}

export function SuggestedQuestions({ masterStatus, onSelect, className = '' }: SuggestedQuestionsProps) {
  const { currentLanguage } = useLanguage();
  const [suggestions, setSuggestions] = useState<SuggestedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const params = new URLSearchParams({
          lang: currentLanguage,
        });

        if (masterStatus) {
          params.append('status', masterStatus);
        }

        const response = await fetch(`/api/chat/suggested-questions?${params}`);
        const data = await response.json();

        if (data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions.slice(0, 5));
        }
      } catch (error) {
        console.error('[SuggestedQuestions] Failed to fetch:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, [currentLanguage, masterStatus]);

  if (isLoading || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-xs text-white/50 px-1">
        <Sparkles className="w-3 h-3" />
        <span>Suggested questions</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion.text)}
            className="px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 hover:text-white transition-all duration-200 hover:scale-105"
          >
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
}
