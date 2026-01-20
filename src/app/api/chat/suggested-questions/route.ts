/**
 * Suggested Questions API
 * Returns popular user questions based on aggregated anonymized chat history
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Hardcoded fallback questions (context-aware)
const FALLBACK_QUESTIONS = {
  GO: [
    { text: 'Where should I go right now?', language: 'en' },
    { text: 'What time is best tonight?', language: 'en' },
    { text: 'How long should I stay out?', language: 'en' },
    { text: 'Hvor skal jeg dra nå?', language: 'no' },
    { text: 'Hva er beste tidspunkt i kveld?', language: 'no' },
  ],
  WAIT: [
    { text: 'When should I check back?', language: 'en' },
    { text: 'Will conditions improve tonight?', language: 'en' },
    { text: 'What time should I go out?', language: 'en' },
    { text: 'Når bør jeg sjekke igjen?', language: 'no' },
    { text: 'Blir forholdene bedre i kveld?', language: 'no' },
  ],
  NO: [
    { text: 'When will conditions improve?', language: 'en' },
    { text: 'Is it worth going out later?', language: 'en' },
    { text: 'What are tomorrow\'s chances?', language: 'en' },
    { text: 'Når blir forholdene bedre?', language: 'no' },
    { text: 'Er det verdt å dra ut senere?', language: 'no' },
  ],
  DEFAULT: [
    { text: 'Should I go out now?', language: 'en' },
    { text: 'Where should I go?', language: 'en' },
    { text: 'What time is best?', language: 'en' },
    { text: 'Skal jeg dra ut nå?', language: 'no' },
    { text: 'Hvor skal jeg dra?', language: 'no' },
  ],
};

// Cache for 1 hour
let cache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('lang') || 'en';
    const masterStatus = searchParams.get('status') as 'GO' | 'WAIT' | 'NO' | null;

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      const filtered = filterByContext(cache.data, language, masterStatus);
      return NextResponse.json({
        suggestions: filtered,
        source: 'cache',
        cached_at: new Date(cache.timestamp).toISOString(),
      });
    }

    // Try to get popular questions from database
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

      // Get top queries from last 7 days, grouped by query_text
      const { data, error } = await supabase
        .from('chat_queries')
        .select('query_text, language, master_status, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        // Count frequency of each question
        const frequencyMap = new Map<string, { count: number; language: string; master_status: string | null }>();

        data.forEach((item) => {
          const key = item.query_text.toLowerCase().trim();
          const existing = frequencyMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            frequencyMap.set(key, {
              count: 1,
              language: item.language,
              master_status: item.master_status,
            });
          }
        });

        // Convert to array and sort by frequency
        const suggestions = Array.from(frequencyMap.entries())
          .map(([text, info]) => ({
            text,
            language: info.language,
            master_status: info.master_status,
            count: info.count,
          }))
          .sort((a, b) => b.count - a.count);

        // Cache the results
        cache = {
          data: suggestions,
          timestamp: Date.now(),
        };

        const filtered = filterByContext(suggestions, language, masterStatus);

        return NextResponse.json({
          suggestions: filtered,
          source: 'database',
          total_queries: data.length,
        });
      }
    }

    // Fallback to hardcoded suggestions
    const contextKey = masterStatus || 'DEFAULT';
    const fallback = FALLBACK_QUESTIONS[contextKey] || FALLBACK_QUESTIONS.DEFAULT;
    const filtered = fallback.filter((q) => q.language === language).slice(0, 5);

    return NextResponse.json({
      suggestions: filtered.map((q) => ({ text: q.text, language: q.language })),
      source: 'fallback',
      reason: 'No database data available yet',
    });
  } catch (error) {
    console.error('[suggested-questions] Error:', error);

    // Return fallback on error
    return NextResponse.json({
      suggestions: FALLBACK_QUESTIONS.DEFAULT.filter((q) => q.language === 'en').slice(0, 5),
      source: 'fallback',
      reason: 'Error fetching from database',
    });
  }
}

/**
 * Filter suggestions by language and context (master status)
 */
function filterByContext(
  suggestions: Array<{ text: string; language: string; master_status?: string | null }>,
  language: string,
  masterStatus: string | null
): Array<{ text: string; language: string }> {
  let filtered = suggestions.filter((s) => s.language === language);

  // Prefer context-relevant suggestions if status provided
  if (masterStatus) {
    const contextFiltered = filtered.filter((s) => s.master_status === masterStatus);
    if (contextFiltered.length >= 3) {
      filtered = contextFiltered;
    }
  }

  // Return top 5
  return filtered.slice(0, 5).map((s) => ({ text: s.text, language: s.language }));
}
